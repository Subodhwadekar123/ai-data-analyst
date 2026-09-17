"""
AI Data Analyst - Audit Logging Service
=========================================
Centralized service for writing security audit events to the audit_logs table.
All significant security actions (login, logout, password changes, admin actions)
must be logged here for compliance and incident response.
"""

import uuid
import json
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.database import AuditLog
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


# ── Audit Action Constants ────────────────────────────────────────────────────
class AuditAction:
    # Auth events
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    LOGOUT_ALL = "LOGOUT_ALL_DEVICES"
    TOKEN_REFRESHED = "TOKEN_REFRESHED"

    # Registration events
    REGISTER = "REGISTER"

    # Password events
    FORGOT_PASSWORD = "FORGOT_PASSWORD_REQUEST"
    PASSWORD_RESET = "PASSWORD_RESET"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"

    # Profile events
    PROFILE_UPDATED = "PROFILE_UPDATED"

    # Session events
    SESSION_REVOKED = "SESSION_REVOKED"
    FORCE_LOGOUT = "FORCE_LOGOUT"

    # Admin events
    ADMIN_VIEW_USER = "ADMIN_VIEW_USER"
    ADMIN_EDIT_USER = "ADMIN_EDIT_USER"
    ADMIN_SUSPEND_USER = "ADMIN_SUSPEND_USER"
    ADMIN_ACTIVATE_USER = "ADMIN_ACTIVATE_USER"
    ADMIN_DELETE_USER = "ADMIN_DELETE_USER"
    ADMIN_PERMANENT_DELETE = "ADMIN_PERMANENT_DELETE"
    ADMIN_CHANGE_ROLE = "ADMIN_CHANGE_ROLE"
    ADMIN_FORCE_LOGOUT = "ADMIN_FORCE_LOGOUT"
    ADMIN_LOCK_ACCOUNT = "ADMIN_LOCK_ACCOUNT"
    ADMIN_UNLOCK_ACCOUNT = "ADMIN_UNLOCK_ACCOUNT"
    ADMIN_APPROVE_USER = "ADMIN_APPROVE_USER"
    ADMIN_RESET_PASSWORD = "ADMIN_RESET_PASSWORD"
    ADMIN_REVOKE_SESSIONS = "ADMIN_REVOKE_SESSIONS"
    ADMIN_EXPORT_LOGS = "ADMIN_EXPORT_LOGS"

    # Security alerts
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED"
    ACCOUNT_SUSPENDED = "ACCOUNT_SUSPENDED"
    SUSPICIOUS_LOGIN = "SUSPICIOUS_LOGIN"
    NEW_DEVICE_LOGIN = "NEW_DEVICE_LOGIN"


# ── Severity Levels ───────────────────────────────────────────────────────────
class AuditSeverity:
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


def log_event(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    description: Optional[str] = None,
    ip_address: Optional[str] = None,
    browser: Optional[str] = None,
    device: Optional[str] = None,
    admin_id: Optional[str] = None,
    severity: str = AuditSeverity.INFO,
    extra_data: Optional[dict] = None,
) -> AuditLog:
    """
    Write a security event to the audit_logs table.
    
    Args:
        db:           Database session
        action:       Event type (use AuditAction constants)
        user_id:      ID of the user the event is about
        user_email:   Email of the user (denormalized for log readability)
        description:  Human-readable description of the event
        ip_address:   Client IP address
        browser:      Browser name + version
        device:       Device type/name
        admin_id:     ID of admin who performed the action (if applicable)
        severity:     INFO | WARNING | CRITICAL
        extra_data:   Additional context as a dict (stored as JSON)
    """
    try:
        log_entry = AuditLog(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            user_id=user_id,
            user_email=user_email,
            admin_id=admin_id,
            action=action,
            description=description,
            severity=severity,
            ip_address=ip_address,
            browser=browser,
            device=device,
            extra_data=json.dumps(extra_data) if extra_data else None,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        # Also write to application log
        log_msg = f"[AUDIT][{severity}] {action}"
        if user_email:
            log_msg += f" | user={user_email}"
        if ip_address:
            log_msg += f" | ip={ip_address}"
        if description:
            log_msg += f" | {description}"

        if severity == AuditSeverity.CRITICAL:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)

        return log_entry
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}", exc_info=True)
        # Don't re-raise — audit logging should never break the main request
        db.rollback()


# ── Convenience Helpers ───────────────────────────────────────────────────────

def log_login_success(db: Session, user_id: str, email: str, ip: str, browser: str, device: str, is_new_device: bool = False):
    extra = {"new_device": is_new_device}
    action = AuditAction.NEW_DEVICE_LOGIN if is_new_device else AuditAction.LOGIN_SUCCESS
    severity = AuditSeverity.WARNING if is_new_device else AuditSeverity.INFO
    log_event(db, action, user_id=user_id, user_email=email, ip_address=ip, browser=browser, device=device,
              description="Successful login" + (" from new device" if is_new_device else ""),
              severity=severity, extra_data=extra)


def log_login_failed(db: Session, email: str, ip: str, reason: str, browser: str = None, device: str = None):
    log_event(db, AuditAction.LOGIN_FAILED, user_email=email, ip_address=ip, browser=browser, device=device,
              description=f"Login failed: {reason}", severity=AuditSeverity.WARNING,
              extra_data={"reason": reason})


def log_logout(db: Session, user_id: str, email: str, ip: str = None):
    log_event(db, AuditAction.LOGOUT, user_id=user_id, user_email=email, ip_address=ip,
              description="User logged out")


def log_password_changed(db: Session, user_id: str, email: str, ip: str = None, by_admin: str = None):
    log_event(db, AuditAction.PASSWORD_CHANGED, user_id=user_id, user_email=email, ip_address=ip,
              admin_id=by_admin, description="Password changed",
              severity=AuditSeverity.WARNING)


def log_password_reset(db: Session, user_id: str, email: str, ip: str = None):
    log_event(db, AuditAction.PASSWORD_RESET, user_id=user_id, user_email=email, ip_address=ip,
              description="Password reset via email link", severity=AuditSeverity.WARNING)


def log_account_locked(db: Session, user_id: str, email: str, ip: str = None, attempts: int = 0):
    log_event(db, AuditAction.ACCOUNT_LOCKED, user_id=user_id, user_email=email, ip_address=ip,
              description=f"Account locked after {attempts} failed login attempts",
              severity=AuditSeverity.CRITICAL, extra_data={"failed_attempts": attempts})


def log_admin_action(db: Session, action: str, admin_id: str, admin_email: str,
                     target_user_id: str, target_email: str, description: str, ip: str = None):
    log_event(db, action, user_id=target_user_id, user_email=target_email,
              admin_id=admin_id, ip_address=ip, description=description,
              severity=AuditSeverity.WARNING,
              extra_data={"admin_email": admin_email, "target_email": target_email})
