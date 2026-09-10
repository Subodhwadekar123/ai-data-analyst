"""
AI Data Analyst - Authentication Service
==========================================
Core business logic for all authentication operations.
Handles: registration, login, logout, token refresh, email verification,
password reset, session management, and account security.
"""

import uuid
import json
from datetime import datetime, timedelta
from typing import Optional, Tuple
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.config import settings
from app.database import (
    UserRecord, SessionRecord, RefreshTokenRecord,
    EmailVerificationToken, PasswordResetToken, LoginHistory
)
from app.services.security import (
    hash_password, verify_password, create_access_token,
    generate_refresh_token, hash_refresh_token, verify_refresh_token_hash,
    generate_secure_token, validate_password_strength
)
from app.services.audit_service import (
    log_event, log_login_success, log_login_failed, log_logout,
    log_password_changed, log_password_reset, log_account_locked,
    AuditAction, AuditSeverity
)
from app.services.email_service import (
    send_verification_email_bg, send_password_reset_bg,
    send_password_changed_bg, send_new_device_login_bg, send_account_locked_bg,
    send_otp_email, send_otp_email_bg,
)
from app.services.otp_service import (
    create_otp_challenge, verify_otp_code, get_challenge, check_resend_allowed,
)
from app.utils.device_parser import parse_user_agent
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


# ── Registration ──────────────────────────────────────────────────────────────

def register_user(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    username: Optional[str] = None,
    ip_address: str = "Unknown",
) -> UserRecord:
    """
    Register a new user account.
    Sends email verification. Account is inactive until email is verified.
    """
    # Email uniqueness check — soft-deleted accounts do not reserve their email.
    # The DB has a hard UNIQUE constraint on users.email, so when the only row
    # holding the address is soft-deleted, free it in place (rename with a
    # unique tombstone prefix) before inserting the fresh account. This also
    # transparently handles soft-deleted rows created before this change.
    existing = db.query(UserRecord).filter(UserRecord.email == email.lower()).first()
    if existing:
        if existing.is_deleted:
            tombstone = f"deleted_{uuid.uuid4().hex[:8]}"
            existing.email = f"{tombstone}_{existing.email}"
            existing.username = None  # free the username too (NULLs bypass UNIQUE)
            db.commit()
        else:
            # pyrefly: ignore [missing-import]
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )

    # Username uniqueness check (if provided) — same soft-delete exemption
    if username:
        if db.query(UserRecord).filter(
            UserRecord.username == username,
            UserRecord.is_deleted == False,  # noqa: E712
        ).first():
            # pyrefly: ignore [missing-import]
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This username is already taken."
            )

    # Password strength validation
    is_strong, errors = validate_password_strength(password)
    if not is_strong:
        # pyrefly: ignore [missing-import]
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password too weak: {'; '.join(errors)}"
        )

    # Create user
    # Admin email skips OTP; all other emails require OTP verification
    _is_admin_email = email.lower().strip() == "admin@infinitics.ai"
    auto_verify = _is_admin_email or getattr(settings, "AUTO_VERIFY_USERS", False)
    user = UserRecord(
        id=str(uuid.uuid4()),
        email=email.lower().strip(),
        username=username,
        full_name=full_name,
        hashed_password=hash_password(password),
        role="admin" if _is_admin_email else "user",
        is_admin=_is_admin_email,
        is_active=True,
        is_verified=auto_verify,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate verification token & attempt email send
    # When OTP verification is enabled, the 6-digit code email is sent by the
    # router (via send_registration_otp) instead of the magic-link email.
    verification_url = None
    if not getattr(settings, "OTP_ENABLED", False):
        verification_url = _send_verification_email(db, user, ip_address)

    log_event(db, AuditAction.REGISTER, user_id=user.id, user_email=user.email,
              ip_address=ip_address, description="New user registration" + (" (auto-verified)" if auto_verify else ""))

    logger.info(f"[SUCCESS] Registered user: {user.email} (verified={user.is_verified})")
    return user, verification_url


# ── Email Verification ────────────────────────────────────────────────────────

def _send_verification_email(db: Session, user: UserRecord, ip_address: str = "Unknown") -> str:
    """Create a verification token and send the email."""
    # Invalidate old tokens
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id,
        EmailVerificationToken.is_used == False
    ).update({"is_used": True})
    db.commit()

    token = generate_secure_token(32)
    evt = EmailVerificationToken(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS),
    )
    db.add(evt)
    db.commit()

    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    send_verification_email_bg(user.email, user.full_name or user.email, verification_url)
    return verification_url


# ── Registration OTP (6-digit email code verification) ────────────────────────

async def send_registration_otp(db: Session, user: UserRecord) -> Tuple[str, Optional[str], datetime, bool]:
    """
    Create an OTP challenge for a freshly registered user and email the code.

    The email send is awaited (not fire-and-forget) so the caller knows whether
    delivery actually succeeded and can tell the user honestly.
    Returns (challenge_id, plain_code, expires_at, email_sent).
    """
    challenge_id, code, expires_at = create_otp_challenge(db, user.id, purpose="registration")

    email_sent = await send_otp_email(
        user.email,
        user.full_name or user.email,
        code,
        settings.OTP_EXPIRE_MINUTES,
    )
    if not email_sent:
        logger.error(f"[OTP] Failed to email registration code to {user.email} (challenge {challenge_id})")

    log_event(db, AuditAction.EMAIL_VERIFICATION_SENT, user_id=user.id, user_email=user.email,
              description="Registration OTP code sent" if email_sent else "Registration OTP email FAILED to send")
    return challenge_id, code, expires_at, email_sent


async def resend_registration_otp(db: Session, challenge_id: str) -> Tuple[str, Optional[str], datetime, bool]:
    """
    Resend the registration OTP for an existing challenge (cooldown-limited).
    Returns (new_challenge_id, plain_code, expires_at, email_sent).
    """
    challenge = get_challenge(db, challenge_id)
    try:
        check_resend_allowed(challenge)
    except ValueError as e:
        # pyrefly: ignore [missing-import]
        from fastapi import HTTPException
        raise HTTPException(status_code=429, detail=str(e))

    user = challenge.user
    new_challenge_id, _code, expires_at = create_otp_challenge(db, user.id, purpose=challenge.purpose)

    email_sent = await send_otp_email(
        user.email,
        user.full_name or user.email,
        _code,
        settings.OTP_EXPIRE_MINUTES,
    )
    if not email_sent:
        logger.error(f"[OTP] Failed to email resent registration code to {user.email} (challenge {new_challenge_id})")

    log_event(db, AuditAction.RESEND_VERIFICATION, user_id=user.id, user_email=user.email,
              description="Registration OTP code resent" if email_sent else "Registration OTP resend FAILED to send")
    return new_challenge_id, _code, expires_at, email_sent


def verify_registration_otp(
    db: Session,
    challenge_id: str,
    code: str,
    user_agent: str = "",
    ip_address: str = "Unknown",
) -> Tuple[str, str, str, UserRecord]:
    """
    Verify the registration OTP code: mark the user's email as verified,
    then auto-login (create session + tokens) so the user lands in the app.

    Returns (access_token, refresh_token, session_id, user).
    Raises ValueError with a user-safe message on invalid/expired/wrong codes.
    """
    challenge = verify_otp_code(db, challenge_id, code)
    user = challenge.user

    was_verified = user.is_verified
    user.is_verified = True
    db.commit()
    db.refresh(user)

    if not was_verified:
        log_event(db, AuditAction.EMAIL_VERIFIED, user_id=user.id, user_email=user.email,
                  ip_address=ip_address, description="Email verified via OTP code")

    logger.info(f"[SUCCESS] Email verified via OTP for user: {user.email}")

    return issue_session_for_user(
        db=db,
        user=user,
        user_agent=user_agent,
        ip_address=ip_address,
        remember_me=True,  # fresh registrations get a long-lived session
    )


def verify_email_token(db: Session, token: str) -> UserRecord:
    """Verify email using the token from the email link."""
    evt = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token,
        EmailVerificationToken.is_used == False
    ).first()

    # pyrefly: ignore [missing-import]
    from fastapi import HTTPException, status

    if not evt:
        raise HTTPException(status_code=400, detail="Invalid or already used verification link.")

    if datetime.utcnow() > evt.expires_at:
        raise HTTPException(status_code=400, detail="This verification link has expired. Please request a new one.")

    # Mark token used
    evt.is_used = True
    # Verify user
    user = evt.user
    user.is_verified = True
    db.commit()
    db.refresh(user)

    log_event(db, AuditAction.EMAIL_VERIFIED, user_id=user.id, user_email=user.email,
              description="Email address verified successfully")
    return user


def resend_verification_email(db: Session, email: str, ip_address: str = "Unknown") -> Optional[str]:
    """Resend email verification link."""
    user = db.query(UserRecord).filter(UserRecord.email == email.lower()).first()
    verification_url = None
    if user and not user.is_verified and not user.is_deleted:
        verification_url = _send_verification_email(db, user, ip_address)
        log_event(db, AuditAction.RESEND_VERIFICATION, user_id=user.id, user_email=user.email,
                  ip_address=ip_address)
    return verification_url


# ── Login ─────────────────────────────────────────────────────────────────────

def login_user(
    db: Session,
    email: str,
    password: str,
    user_agent: str = "",
    ip_address: str = "Unknown",
    remember_me: bool = False,
) -> Tuple[str, str, str, UserRecord]:
    """
    Authenticate user credentials and create a new session.
    
    Returns:
        (access_token, refresh_token, session_id, user)
    Raises:
        HTTPException on any auth failure
    """
    # pyrefly: ignore [missing-import]
    from fastapi import HTTPException, status

    email = email.lower().strip()
    device_info = parse_user_agent(user_agent)

    # Look up user
    user = db.query(UserRecord).filter(UserRecord.email == email).first()

    # Generic error — never reveal whether email exists
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password. Please try again.",
    )

    if not user:
        _record_failed_login(db, email=email, ip_address=ip_address,
                             device_info=device_info, reason="Email not found")
        log_login_failed(db, email, ip_address, "Email not found",
                         browser=device_info["browser"], device=device_info["device_type"])
        raise auth_error

    # Check if account is deleted
    if user.is_deleted:
        _record_failed_login(db, email=email, ip_address=ip_address,
                             device_info=device_info, reason="Account deleted")
        raise auth_error

    # Check if account is suspended
    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact support.",
        )

    # Check lockout
    if getattr(settings, "ENABLE_ACCOUNT_LOCKOUT", False) and user.lockout_until and datetime.utcnow() < user.lockout_until:
        remaining = int((user.lockout_until - datetime.utcnow()).total_seconds() / 60)
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked due to too many failed attempts. Try again in {remaining} minute(s).",
        )

    # Verify password
    if not verify_password(password, user.hashed_password):
        _handle_failed_attempt(db, user, ip_address, device_info)
        raise auth_error

    # Check email verification (admin@infinitics.ai skips OTP)
    if not user.is_verified and email != "admin@infinitics.ai":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in. Check your inbox.",
        )

    # Check account active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support.",
        )

    # Reset failed attempts on successful login
    return issue_session_for_user(
        db=db,
        user=user,
        user_agent=user_agent,
        ip_address=ip_address,
        remember_me=remember_me,
        device_info=device_info,
    )


def issue_session_for_user(
    db: Session,
    user: UserRecord,
    user_agent: str = "",
    ip_address: str = "Unknown",
    remember_me: bool = False,
    device_info: Optional[dict] = None,
) -> Tuple[str, str, str, UserRecord]:
    """
    Create a full session (session record, refresh token, JWT access token)
    for a user whose identity has already been verified (password or OTP).

    Used by both login and post-registration OTP verification (auto-login).

    Returns:
        (access_token, refresh_token, session_id, user)
    """
    device_info = device_info or parse_user_agent(user_agent)

    # Reset failed attempts on successful login
    user.failed_login_attempts = 0
    user.lockout_until = None
    user.login_count = (user.login_count or 0) + 1
    user.last_login = datetime.utcnow()

    # Create session
    session_id = str(uuid.uuid4())
    session_token = generate_secure_token(32)
    expire_days = settings.REMEMBER_ME_EXPIRE_DAYS if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
    expires_at = datetime.utcnow() + timedelta(days=expire_days)

    session = SessionRecord(
        id=session_id,
        user_id=user.id,
        session_token=session_token,
        browser=device_info["browser"],
        browser_version=device_info["browser_version"],
        os=device_info["os"],
        os_version=device_info["os_version"],
        device_type=device_info["device_type"],
        device_name=device_info["device_name"],
        user_agent=user_agent,
        ip_address=ip_address,
        remember_me=remember_me,
        expires_at=expires_at,
    )
    db.add(session)

    # Create refresh token
    raw_refresh = generate_refresh_token()
    refresh_record = RefreshTokenRecord(
        id=str(uuid.uuid4()),
        user_id=user.id,
        session_id=session_id,
        token_hash=hash_refresh_token(raw_refresh),
        expires_at=expires_at,
    )
    db.add(refresh_record)

    # Also update legacy session_token for backward compat
    user.session_token = session_token

    db.commit()

    # Record login history
    _record_successful_login(db, user, session, ip_address, device_info)

    # Audit log
    log_login_success(db, user.id, user.email, ip_address,
                      device_info["browser"], device_info["device_type"])

    # Create JWT access token
    access_token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "is_admin": user.is_admin,
        "role": user.role,
        "session_id": session_id,
        "session_token": session_token,
    })

    return access_token, raw_refresh, session_id, user


def _handle_failed_attempt(db: Session, user: UserRecord, ip_address: str, device_info: dict):
    """Increment failed login counter and lock account if threshold exceeded."""
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    _record_failed_login(db, email=user.email, ip_address=ip_address,
                         device_info=device_info, reason="Wrong password",
                         user_id=user.id)
    log_login_failed(db, user.email, ip_address, "Wrong password",
                     browser=device_info["browser"], device=device_info["device_type"])

    if getattr(settings, "ENABLE_ACCOUNT_LOCKOUT", False) and user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
        user.lockout_until = datetime.utcnow() + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
        db.commit()

        log_account_locked(db, user.id, user.email, ip_address, user.failed_login_attempts)
        send_account_locked_bg(
            user.email, user.full_name or user.email,
            user.failed_login_attempts, settings.LOCKOUT_DURATION_MINUTES, ip_address
        )
    else:
        db.commit()


def _record_successful_login(db: Session, user: UserRecord, session: SessionRecord,
                              ip_address: str, device_info: dict):
    """Write a login history record for successful login."""
    record = LoginHistory(
        id=str(uuid.uuid4()),
        user_id=user.id,
        session_id=session.id,
        email=user.email,
        login_time=datetime.utcnow(),
        browser=device_info["browser"],
        browser_version=device_info["browser_version"],
        os=device_info["os"],
        os_version=device_info["os_version"],
        device_type=device_info["device_type"],
        device_name=device_info["device_name"],
        user_agent=session.user_agent,
        ip_address=ip_address,
        auth_method="email_password",
        success=True,
    )
    db.add(record)
    db.commit()


def _record_failed_login(db: Session, email: str, ip_address: str,
                          device_info: dict, reason: str, user_id: str = None):
    """Write a failed login attempt to login history."""
    try:
        user = None
        if user_id:
            user = db.query(UserRecord).filter(UserRecord.id == user_id).first()

        record = LoginHistory(
            id=str(uuid.uuid4()),
            user_id=user_id,
            session_id=None,
            email=email,
            login_time=datetime.utcnow(),
            browser=device_info.get("browser"),
            os=device_info.get("os"),
            device_type=device_info.get("device_type"),
            ip_address=ip_address,
            auth_method="email_password",
            success=False,
            failure_reason=reason,
        )
        db.add(record)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to record login failure: {e}")
        db.rollback()


# ── Logout ────────────────────────────────────────────────────────────────────

def logout_user(db: Session, session_id: str, user: UserRecord, ip_address: str = "Unknown"):
    """Logout from the current session (revoke session + refresh token)."""
    session = db.query(SessionRecord).filter(
        SessionRecord.id == session_id,
        SessionRecord.user_id == user.id
    ).first()

    if session:
        session.is_active = False
        # Record logout time in login history
        history = db.query(LoginHistory).filter(
            LoginHistory.session_id == session_id
        ).first()
        if history:
            history.logout_time = datetime.utcnow()
            if history.login_time:
                delta = datetime.utcnow() - history.login_time
                history.session_duration_seconds = int(delta.total_seconds())

    # Revoke refresh token for this session
    db.query(RefreshTokenRecord).filter(
        RefreshTokenRecord.session_id == session_id
    ).update({"is_revoked": True})

    user.last_logout = datetime.utcnow()

    # If this was the only active session, clear legacy session_token
    active_sessions = db.query(SessionRecord).filter(
        SessionRecord.user_id == user.id,
        SessionRecord.is_active == True
    ).count()
    if active_sessions == 0:
        user.session_token = None

    db.commit()
    log_logout(db, user.id, user.email, ip_address)


def logout_all_devices(db: Session, user: UserRecord, ip_address: str = "Unknown"):
    """Logout from ALL sessions (revoke all refresh tokens)."""
    db.query(SessionRecord).filter(
        SessionRecord.user_id == user.id,
        SessionRecord.is_active == True
    ).update({"is_active": False})

    db.query(RefreshTokenRecord).filter(
        RefreshTokenRecord.user_id == user.id,
        RefreshTokenRecord.is_revoked == False
    ).update({"is_revoked": True})

    user.session_token = None
    user.last_logout = datetime.utcnow()
    db.commit()

    log_event(db, AuditAction.LOGOUT_ALL, user_id=user.id, user_email=user.email,
              ip_address=ip_address, description="Logged out from all devices")


# ── Token Refresh ─────────────────────────────────────────────────────────────

def refresh_access_token(
    db: Session,
    raw_refresh_token: str,
    user_agent: str = "",
    ip_address: str = "Unknown",
) -> Tuple[str, str, str]:
    """
    Rotate refresh token and issue a new access token.
    Returns: (new_access_token, new_refresh_token, session_id)
    """
    # pyrefly: ignore [missing-import]
    from fastapi import HTTPException, status

    token_hash = hash_refresh_token(raw_refresh_token)
    rt = db.query(RefreshTokenRecord).filter(
        RefreshTokenRecord.token_hash == token_hash,
        RefreshTokenRecord.is_revoked == False
    ).first()

    if not rt:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")

    if datetime.utcnow() > rt.expires_at:
        rt.is_revoked = True
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired. Please login again.")

    session = rt.session
    if not session or not session.is_active:
        raise HTTPException(status_code=401, detail="Session is no longer active.")

    user = rt.user
    if not user or not user.is_active or user.is_deleted or user.is_suspended:
        raise HTTPException(status_code=401, detail="Account is not accessible.")

    # Rotate: revoke old, create new
    rt.is_revoked = True
    new_raw = generate_refresh_token()
    new_rt = RefreshTokenRecord(
        id=str(uuid.uuid4()),
        user_id=user.id,
        session_id=session.id,
        token_hash=hash_refresh_token(new_raw),
        expires_at=rt.expires_at,
        replaced_by=rt.id,
    )
    db.add(new_rt)

    # Update session last_active
    session.last_active = datetime.utcnow()
    db.commit()

    # New access token
    access_token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "is_admin": user.is_admin,
        "role": user.role,
        "session_id": session.id,
        "session_token": session.session_token,
    })

    log_event(db, AuditAction.TOKEN_REFRESHED, user_id=user.id, user_email=user.email,
              ip_address=ip_address)

    return access_token, new_raw, session.id


# ── Password Operations ───────────────────────────────────────────────────────

def forgot_password(db: Session, email: str, ip_address: str = "Unknown") -> bool:
    """
    Initiate password reset flow.
    Always returns True to prevent email enumeration.
    """
    user = db.query(UserRecord).filter(UserRecord.email == email.lower()).first()

    if user and not user.is_deleted:
        # Invalidate existing reset tokens
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})

        token = generate_secure_token(32)
        prt = PasswordResetToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=settings.PASSWORD_RESET_EXPIRE_HOURS),
            ip_address=ip_address,
        )
        db.add(prt)
        db.commit()

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        send_password_reset_bg(user.email, user.full_name or user.email, reset_url, ip_address)

        log_event(db, AuditAction.FORGOT_PASSWORD, user_id=user.id, user_email=user.email,
                  ip_address=ip_address, description="Password reset requested")

    return True


def reset_password(
    db: Session,
    token: str,
    new_password: str,
    ip_address: str = "Unknown",
) -> UserRecord:
    """Reset password using the token from the email link."""
    # pyrefly: ignore [missing-import]
    from fastapi import HTTPException

    prt = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.is_used == False
    ).first()

    if not prt:
        raise HTTPException(status_code=400, detail="Invalid or already used reset link.")
    if datetime.utcnow() > prt.expires_at:
        raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")

    # Validate new password
    is_strong, errors = validate_password_strength(new_password)
    if not is_strong:
        raise HTTPException(status_code=400, detail=f"Password too weak: {'; '.join(errors)}")

    user = prt.user
    user.hashed_password = hash_password(new_password)
    prt.is_used = True

    # Invalidate all sessions if configured
    if settings.INVALIDATE_SESSIONS_ON_PASSWORD_CHANGE:
        db.query(SessionRecord).filter(
            SessionRecord.user_id == user.id
        ).update({"is_active": False})
        db.query(RefreshTokenRecord).filter(
            RefreshTokenRecord.user_id == user.id
        ).update({"is_revoked": True})
        user.session_token = None

    db.commit()

    log_password_reset(db, user.id, user.email, ip_address)
    send_password_changed_bg(user.email, user.full_name or user.email, ip_address)

    return user


def change_password(
    db: Session,
    user: UserRecord,
    current_password: str,
    new_password: str,
    ip_address: str = "Unknown",
    device: str = "Unknown",
    logout_other_sessions: bool = False,
) -> bool:
    """Change password for authenticated user."""
    from fastapi import HTTPException

    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    is_strong, errors = validate_password_strength(new_password)
    if not is_strong:
        raise HTTPException(status_code=400, detail=f"Password too weak: {'; '.join(errors)}")

    user.hashed_password = hash_password(new_password)

    if logout_other_sessions or settings.INVALIDATE_SESSIONS_ON_PASSWORD_CHANGE:
        db.query(SessionRecord).filter(
            SessionRecord.user_id == user.id
        ).update({"is_active": False})
        db.query(RefreshTokenRecord).filter(
            RefreshTokenRecord.user_id == user.id
        ).update({"is_revoked": True})
        user.session_token = None

    db.commit()

    log_password_changed(db, user.id, user.email, ip_address)
    send_password_changed_bg(user.email, user.full_name or user.email, ip_address, device)
    return True


# ── Session Management ────────────────────────────────────────────────────────

def get_active_sessions(db: Session, user_id: str) -> list:
    """Return all active sessions for a user."""
    return db.query(SessionRecord).filter(
        SessionRecord.user_id == user_id,
        SessionRecord.is_active == True,
    ).order_by(SessionRecord.last_active.desc()).all()


def revoke_session(db: Session, session_id: str, user_id: str, ip_address: str = "Unknown") -> bool:
    """Revoke a specific session by ID."""
    session = db.query(SessionRecord).filter(
        SessionRecord.id == session_id,
        SessionRecord.user_id == user_id,
        SessionRecord.is_active == True,
    ).first()

    if not session:
        return False

    session.is_active = False
    db.query(RefreshTokenRecord).filter(
        RefreshTokenRecord.session_id == session_id
    ).update({"is_revoked": True})
    db.commit()

    log_event(db, AuditAction.SESSION_REVOKED, user_id=user_id, ip_address=ip_address,
              description=f"Session {session_id[:8]}... revoked")
    return True
