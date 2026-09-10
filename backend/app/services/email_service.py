"""
AI Data Analyst - Email Service
==================================
Async email service using aiosmtplib for sending transactional emails.
All emails use responsive Jinja2 HTML templates.
"""

import asyncio
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional
from datetime import datetime

# pyrefly: ignore [missing-import]
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

# ── Template Engine ───────────────────────────────────────────────────────────
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def _render_template(template_name: str, context: dict) -> str:
    """Render a Jinja2 HTML email template."""
    template = _jinja_env.get_template(template_name)
    return template.render(**context, frontend_url=settings.FRONTEND_URL)


async def _send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    """
    Core async email sender.
    Returns True on success, False on failure (non-blocking for the caller).
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
        msg["To"] = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        # pyrefly: ignore [missing-import]
        import aiosmtplib

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            use_tls=settings.SMTP_USE_SSL,
            start_tls=settings.SMTP_USE_TLS,
        )

        # ASCII-safe so Windows cp1252 consoles don't raise UnicodeEncodeError
        # on emoji-bearing subjects (logging failure is post-send, but noisy).
        safe_subject = subject.encode("ascii", errors="replace").decode("ascii")
        logger.info(f"[EMAIL] Email sent to {to_email}: {safe_subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}", exc_info=True)
        return False


def _fire_and_forget(coro):
    """Schedule an async coroutine without blocking (best-effort email)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(coro)
        else:
            asyncio.run(coro)
    except Exception as e:
        logger.error(f"Email fire-and-forget error: {e}")


# ── Public Email Functions ─────────────────────────────────────────────────────

async def send_verification_email(
    to_email: str,
    full_name: str,
    verification_url: str,
) -> bool:
    """Send email address verification link."""
    logger.info(f"\n=======================================================\n>>> [EMAIL VERIFICATION LINK for {to_email}]:\n{verification_url}\n=======================================================\n")
    html = _render_template("verification_email.html", {
        "full_name": full_name or to_email.split("@")[0],
        "verification_url": verification_url,
        "expire_hours": settings.EMAIL_VERIFICATION_EXPIRE_HOURS,
    })
    return await _send_email(
        to_email=to_email,
        subject="Verify Your Email Address - AI Data Analyst",
        html_body=html,
        text_body=f"Hi {full_name},\n\nVerify your email: {verification_url}\n\nExpires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.",
    )


async def send_password_reset_email(
    to_email: str,
    full_name: str,
    reset_url: str,
    ip_address: str = "Unknown",
) -> bool:
    """Send password reset link."""
    logger.info(f"\n=======================================================\n>>> [PASSWORD RESET LINK for {to_email}]:\n{reset_url}\n=======================================================\n")
    html = _render_template("password_reset.html", {
        "full_name": full_name or to_email.split("@")[0],
        "reset_url": reset_url,
        "expire_hours": settings.PASSWORD_RESET_EXPIRE_HOURS,
        "request_time": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "ip_address": ip_address,
    })
    return await _send_email(
        to_email=to_email,
        subject="🔐 Password Reset Request — AI Data Analyst",
        html_body=html,
        text_body=f"Reset your password: {reset_url}\nExpires in {settings.PASSWORD_RESET_EXPIRE_HOURS} hour(s).",
    )


async def send_password_changed_alert(
    to_email: str,
    full_name: str,
    ip_address: str = "Unknown",
    device: str = "Unknown",
) -> bool:
    """Send security alert when password is changed."""
    reset_url = f"{settings.FRONTEND_URL}/forgot-password"
    html = _render_template("password_changed.html", {
        "full_name": full_name or to_email.split("@")[0],
        "changed_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "ip_address": ip_address,
        "device": device,
        "reset_url": reset_url,
    })
    return await _send_email(
        to_email=to_email,
        subject="🔒 Your Password Was Changed — AI Data Analyst",
        html_body=html,
    )


async def send_new_device_login_alert(
    to_email: str,
    full_name: str,
    ip_address: str,
    browser: str,
    device: str,
    location: str = "Unknown",
) -> bool:
    """Send security alert when login occurs from a new device."""
    reset_url = f"{settings.FRONTEND_URL}/forgot-password"
    html = _render_template("new_device_login.html", {
        "full_name": full_name or to_email.split("@")[0],
        "login_time": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "ip_address": ip_address,
        "browser": browser,
        "device": device,
        "location": location,
        "reset_url": reset_url,
    })
    return await _send_email(
        to_email=to_email,
        subject="⚠️ New Device Login Detected — AI Data Analyst",
        html_body=html,
    )


async def send_account_locked_email(
    to_email: str,
    full_name: str,
    attempts: int,
    lockout_minutes: int,
    ip_address: str = "Unknown",
) -> bool:
    """Send account lockout notification."""
    from datetime import timedelta
    locked_at = datetime.utcnow()
    unlock_at = locked_at + timedelta(minutes=lockout_minutes)
    reset_url = f"{settings.FRONTEND_URL}/forgot-password"
    html = _render_template("account_locked.html", {
        "full_name": full_name or to_email.split("@")[0],
        "attempts": attempts,
        "locked_at": locked_at.strftime("%Y-%m-%d %H:%M UTC"),
        "unlock_at": unlock_at.strftime("%Y-%m-%d %H:%M UTC"),
        "ip_address": ip_address,
        "reset_url": reset_url,
    })
    return await _send_email(
        to_email=to_email,
        subject="🚫 Account Temporarily Locked — AI Data Analyst",
        html_body=html,
    )


async def send_otp_email(
    to_email: str,
    full_name: str,
    otp_code: str,
    expire_minutes: int = 10,
) -> bool:
    """Send a 6-digit OTP verification code email (registration verification)."""
    logger.info(
        f"\n=======================================================\n"
        f">>> [OTP CODE for {to_email}]: {otp_code}\n"
        f"=======================================================\n"
    )
    html = _render_template("otp_email.html", {
        "full_name": full_name or to_email.split("@")[0],
        "otp_code": otp_code,
        "expire_minutes": expire_minutes,
    })
    return await _send_email(
        to_email=to_email,
        subject="🔐 Your Verification Code — AI Data Analyst",
        html_body=html,
        text_body=(
            f"Hi {full_name or to_email.split('@')[0]},\n\n"
            f"Your AI Data Analyst verification code is: {otp_code}\n\n"
            f"It expires in {expire_minutes} minutes.\n"
            f"If you didn't request this code, you can safely ignore this email."
        ),
    )


# ── Fire-and-Forget Wrappers (non-blocking) ───────────────────────────────────

def send_verification_email_bg(to_email: str, full_name: str, verification_url: str):
    _fire_and_forget(send_verification_email(to_email, full_name, verification_url))

def send_password_reset_bg(to_email: str, full_name: str, reset_url: str, ip: str = "Unknown"):
    _fire_and_forget(send_password_reset_email(to_email, full_name, reset_url, ip))

def send_password_changed_bg(to_email: str, full_name: str, ip: str = "Unknown", device: str = "Unknown"):
    _fire_and_forget(send_password_changed_alert(to_email, full_name, ip, device))

def send_new_device_login_bg(to_email: str, full_name: str, ip: str, browser: str, device: str, location: str = "Unknown"):
    _fire_and_forget(send_new_device_login_alert(to_email, full_name, ip, browser, device, location))

def send_account_locked_bg(to_email: str, full_name: str, attempts: int, lockout_min: int, ip: str = "Unknown"):
    _fire_and_forget(send_account_locked_email(to_email, full_name, attempts, lockout_min, ip))

def send_otp_email_bg(to_email: str, full_name: str, otp_code: str, expire_minutes: int = 10):
    _fire_and_forget(send_otp_email(to_email, full_name, otp_code, expire_minutes))
