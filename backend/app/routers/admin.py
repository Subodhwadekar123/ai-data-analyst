"""
AI Data Analyst - System Administration Router
===============================================
Full enterprise admin API for user management, activity monitoring, and audit logs.
ALL endpoints require Admin role.

User Management:
  GET    /admin/stats                    - System statistics
  GET    /admin/users                    - List all users (with filters)
  GET    /admin/users/{id}              - Get user detail
  PUT    /admin/users/{id}              - Edit user
  PUT    /admin/users/{id}/suspend      - Suspend user
  PUT    /admin/users/{id}/activate     - Activate user
  PUT    /admin/users/{id}/lock         - Lock account
  PUT    /admin/users/{id}/unlock       - Unlock account
  DELETE /admin/users/{id}              - Soft delete user
  DELETE /admin/users/{id}/permanent    - Permanent delete (superadmin)
  PUT    /admin/users/{id}/role         - Change user role
  PUT    /admin/users/{id}/verify-email - Manually verify email
  PUT    /admin/users/{id}/force-logout - Force logout user
  POST   /admin/users/{id}/reset-password - Send reset link
  GET    /admin/users/{id}/sessions     - User active sessions

Activity Monitoring:
  GET    /admin/login-activity          - Login history (filtered/paged)
  GET    /admin/sessions                - All active sessions
  DELETE /admin/sessions/{id}           - Force terminate session

Audit Logs:
  GET    /admin/audit-logs              - Security audit logs (filtered)
  GET    /admin/export/login-activity   - Export CSV
"""

import io
import json
import csv
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func
from pydantic import BaseModel, EmailStr

from app.database import (
    get_db, UserRecord, SessionRecord, LoginHistory, AuditLog,
    DatasetRecord, MLExperiment, IssueRecord
)
from app.routers.auth_deps import get_current_admin
from app.services.audit_service import log_admin_action, log_event, AuditAction, AuditSeverity
from app.services.auth_service import logout_all_devices
from app.services.security import hash_password
from app.utils.device_parser import get_client_ip
from app.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/admin", tags=["Administration"])


# ── Response Schemas ──────────────────────────────────────────────────────────

class AdminStatsOut(BaseModel):
    total_users: int
    active_users: int
    verified_users: int
    unverified_users: int
    suspended_users: int
    deleted_users: int
    total_datasets: int
    total_experiments: int
    total_issues: int
    active_sessions: int
    failed_logins_24h: int


class AdminUserOut(BaseModel):
    id: str
    email: str
    username: Optional[str]
    full_name: Optional[str]
    role: str
    is_admin: bool
    is_active: bool
    is_verified: bool
    is_suspended: bool
    is_deleted: bool
    is_online: bool
    created_at: datetime
    last_login: Optional[datetime]
    last_logout: Optional[datetime]
    login_count: int
    failed_login_attempts: int
    account_age_days: int
    suspension_reason: Optional[str]

    class Config:
        from_attributes = True


class AdminLoginHistoryOut(BaseModel):
    id: str
    user_id: Optional[str]
    email: str
    login_time: datetime
    logout_time: Optional[datetime]
    session_duration_seconds: Optional[int]
    browser: Optional[str]
    browser_version: Optional[str]
    os: Optional[str]
    device_type: Optional[str]
    ip_address: Optional[str]
    country: Optional[str]
    city: Optional[str]
    auth_method: str
    success: bool
    failure_reason: Optional[str]
    session_id: Optional[str]

    class Config:
        from_attributes = True


class AdminAuditLogOut(BaseModel):
    id: str
    timestamp: datetime
    user_id: Optional[str]
    user_email: Optional[str]
    admin_id: Optional[str]
    action: str
    description: Optional[str]
    severity: str
    ip_address: Optional[str]
    browser: Optional[str]
    device: Optional[str]

    class Config:
        from_attributes = True


class AdminSessionOut(BaseModel):
    id: str
    user_id: str
    user_email: Optional[str]
    browser: Optional[str]
    os: Optional[str]
    device_type: Optional[str]
    ip_address: Optional[str]
    country: Optional[str]
    is_active: bool
    created_at: datetime
    last_active: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class ChangeRoleRequest(BaseModel):
    role: str  # "user" | "admin"


class SuspendRequest(BaseModel):
    reason: Optional[str] = None


class EditUserRequest(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None


# ── Helper ─────────────────────────────────────────────────────────────────────

def _user_to_dict(u: UserRecord, db: Session) -> dict:
    active_session = db.query(SessionRecord).filter(
        SessionRecord.user_id == u.id,
        SessionRecord.is_active == True,
    ).first()
    age_days = (datetime.utcnow() - u.created_at).days if u.created_at else 0
    return {
        "id": u.id,
        "email": u.email,
        "username": u.username,
        "full_name": u.full_name,
        "role": u.role or "user",
        "is_admin": u.is_admin,
        "is_active": u.is_active,
        "is_verified": u.is_verified or False,
        "is_suspended": u.is_suspended or False,
        "is_deleted": u.is_deleted or False,
        "is_online": active_session is not None,
        "created_at": u.created_at,
        "last_login": u.last_login,
        "last_logout": u.last_logout,
        "login_count": u.login_count or 0,
        "failed_login_attempts": u.failed_login_attempts or 0,
        "account_age_days": age_days,
        "suspension_reason": u.suspension_reason,
    }


# ── Dashboard Stats ───────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStatsOut, summary="System Statistics")
async def get_stats(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Comprehensive system statistics for the admin dashboard."""
    cutoff_24h = datetime.utcnow() - timedelta(hours=24)
    return {
        "total_users": db.query(UserRecord).filter(UserRecord.is_deleted == False).count(),
        "active_users": db.query(UserRecord).filter(UserRecord.is_active == True, UserRecord.is_deleted == False).count(),
        "verified_users": db.query(UserRecord).filter(UserRecord.is_verified == True, UserRecord.is_deleted == False).count(),
        "unverified_users": db.query(UserRecord).filter(UserRecord.is_verified == False, UserRecord.is_deleted == False).count(),
        "suspended_users": db.query(UserRecord).filter(UserRecord.is_suspended == True).count(),
        "deleted_users": db.query(UserRecord).filter(UserRecord.is_deleted == True).count(),
        "total_datasets": db.query(DatasetRecord).count(),
        "total_experiments": db.query(MLExperiment).count(),
        "total_issues": db.query(IssueRecord).count(),
        "active_sessions": db.query(SessionRecord).filter(SessionRecord.is_active == True).count(),
        "failed_logins_24h": db.query(LoginHistory).filter(
            LoginHistory.success == False,
            LoginHistory.login_time >= cutoff_24h,
        ).count(),
    }


# ── User Management ───────────────────────────────────────────────────────────

@router.get("/users", summary="List All Users")
async def list_users(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
    search: Optional[str] = Query(None, description="Search by name/email/username"),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    is_verified: Optional[bool] = Query(None),
    is_suspended: Optional[bool] = Query(None),
    is_deleted: Optional[bool] = Query(None, description="Include deleted users"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    """List all users with filtering and pagination."""
    query = db.query(UserRecord)

    if is_deleted is not True:
        query = query.filter(UserRecord.is_deleted == False)
    else:
        query = query.filter(UserRecord.is_deleted == True)

    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            UserRecord.email.ilike(like),
            UserRecord.full_name.ilike(like),
            UserRecord.username.ilike(like),
        ))
    if role:
        query = query.filter(UserRecord.role == role)
    if is_active is not None:
        query = query.filter(UserRecord.is_active == is_active)
    if is_verified is not None:
        query = query.filter(UserRecord.is_verified == is_verified)
    if is_suspended is not None:
        query = query.filter(UserRecord.is_suspended == is_suspended)

    total = query.count()
    users = query.order_by(desc(UserRecord.created_at)).offset(offset).limit(limit).all()

    return {
        "users": [_user_to_dict(u, db) for u in users],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/users/{user_id}", summary="Get User Detail")
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Get full details for a specific user."""
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return _user_to_dict(user, db)


@router.put("/users/{user_id}", summary="Edit User")
async def edit_user(
    user_id: str,
    body: EditUserRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Edit user profile information."""
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if body.full_name:
        user.full_name = body.full_name
    if body.username:
        existing = db.query(UserRecord).filter(
            UserRecord.username == body.username, UserRecord.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken.")
        user.username = body.username
    if body.email:
        existing = db.query(UserRecord).filter(
            UserRecord.email == str(body.email).lower(), UserRecord.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use.")
        user.email = str(body.email).lower()

    db.commit()
    ip = get_client_ip(request)
    log_admin_action(db, AuditAction.ADMIN_EDIT_USER, admin.id, admin.email,
                     user.id, user.email, "Admin edited user profile", ip)
    return {"message": "User updated.", "user": _user_to_dict(user, db)}


@router.put("/users/{user_id}/suspend", summary="Suspend User")
async def suspend_user(
    user_id: str,
    body: SuspendRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Suspend a user account."""
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Cannot suspend admin accounts.")
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot suspend your own account.")

    user.is_suspended = True
    user.is_active = False
    user.suspended_at = datetime.utcnow()
    user.suspension_reason = body.reason

    # Force logout all sessions
    logout_all_devices(db, user)
    db.commit()

    ip = get_client_ip(request)
    log_admin_action(db, AuditAction.ADMIN_SUSPEND_USER, admin.id, admin.email,
                     user.id, user.email, f"User suspended. Reason: {body.reason}", ip)
    return {"message": f"User {user.email} has been suspended."}


@router.put("/users/{user_id}/activate", summary="Activate User")
async def activate_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Reactivate a suspended or inactive user account."""
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.is_suspended = False
    user.is_active = True
    user.suspension_reason = None
    user.suspended_at = None
    db.commit()

    ip = get_client_ip(request)
    log_admin_action(db, AuditAction.ADMIN_ACTIVATE_USER, admin.id, admin.email,
                     user.id, user.email, "User account activated", ip)
    return {"message": f"User {user.email} has been activated."}


@router.put("/users/{user_id}/lock", summary="Lock Account")
async def lock_account(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Lock a user account (temporary security hold)."""
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Cannot lock admin accounts.")

    user.lockout_until = datetime.utcnow() + timedelta(hours=24)
    db.commit()

    ip = get_client_ip(request)
    log_admin_action(db, AuditAction.ADMIN_LOCK_ACCOUNT, admin.id, admin.email,
                     user.id, user.email, "Account locked by admin for 24h", ip)
    return {"message": f"Account for {user.email} has been locked for 24 hours."}


@router.put("/users/{user_id}/unlock", summary="Unlock Account")
async def unlock_account(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Unlock a locked user account."""
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.lockout_until = None
    user.failed_login_attempts = 0
    db.commit()

    ip = get_client_ip(request)
    log_admin_action(db, AuditAction.ADMIN_UNLOCK_ACCOUNT, admin.id, admin.email,
                     user.id, user.email, "Account unlocked by admin", ip)
    return {"message": f"Account for {user.email} has been unlocked."}


@router.delete("/users/{user_id}", summary="Soft Delete User")
async def soft_delete_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Soft-delete a user (data preserved, account deactivated)."""
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Cannot delete admin accounts.")
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")

    user.is_deleted = True
    user.is_active = False
    user.deleted_at = datetime.utcnow()
    logout_all_devices(db, user)
    db.commit()

    ip = get_client_ip(request)
    log_admin_action(db, AuditAction.ADMIN_DELETE_USER, admin.id, admin.email,
                     user.id, user.email, "User soft-deleted by admin", ip)
    return {"message": f"User {user.email} has been soft-deleted."}


@router.delete("/users/{user_id}/permanent", summary="Permanently Delete User")
async def permanent_delete_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Permanently delete all user data (irreversible)."""
    if not admin.is_admin:
        raise HTTPException(status_code=403, detail="Restricted to super-administrators.")

    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Cannot permanently delete admin accounts.")
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")

    email = user.email
    db.delete(user)
    db.commit()

    # Free the email for fresh registration: any OTHER rows still holding the
    # same address (legacy soft-deleted duplicates that are invisible in the
    # admin list) are tombstone-renamed so the UNIQUE constraint on users.email
    # no longer blocks sign-ups with this address.
    stale_rows = db.query(UserRecord).filter(
        func.lower(UserRecord.email) == email.lower(),
        UserRecord.id != user_id,
    ).all()
    for stale in stale_rows:
        stale.email = f"deleted_{uuid.uuid4().hex[:8]}_{stale.email}"
        stale.username = None
    if stale_rows:
        db.commit()
        logger.info(f"[ADMIN] Freed {len(stale_rows)} stale row(s) holding email {email}")

    ip = get_client_ip(request)
    log_event(db, AuditAction.ADMIN_PERMANENT_DELETE, user_email=email,
              admin_id=admin.id, ip_address=ip,
              description=f"User {email} permanently deleted by admin {admin.email}",
              severity=AuditSeverity.CRITICAL)
    return {"message": f"User {email} has been permanently deleted."}


@router.put("/users/{user_id}/role", summary="Change User Role")
async def change_role(
    user_id: str,
    body: ChangeRoleRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Change user role (user/admin)."""
    if body.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'.")

    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role.")

    old_role = user.role
    user.role = body.role
    user.is_admin = body.role == "admin"
    db.commit()

    ip = get_client_ip(request)
    log_admin_action(db, AuditAction.ADMIN_CHANGE_ROLE, admin.id, admin.email,
                     user.id, user.email,
                     f"Role changed from {old_role} to {body.role}", ip)
    return {"message": f"Role updated to '{body.role}' for {user.email}."}


@router.put("/users/{user_id}/verify-email", summary="Manually Verify Email")
async def manually_verify_email(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Manually mark user's email as verified."""
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.is_verified = True
    db.commit()

    ip = get_client_ip(request)
    log_admin_action(db, AuditAction.ADMIN_VERIFY_EMAIL, admin.id, admin.email,
                     user.id, user.email, "Email manually verified by admin", ip)
    return {"message": f"Email for {user.email} manually verified."}


@router.put("/users/{user_id}/force-logout", summary="Force Logout User")
async def force_logout(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Force logout a user from all devices."""
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot force logout yourself.")

    logout_all_devices(db, user)

    ip = get_client_ip(request)
    log_admin_action(db, AuditAction.ADMIN_FORCE_LOGOUT, admin.id, admin.email,
                     user.id, user.email, "Force logout from all devices by admin", ip)
    return {"message": f"User {user.email} has been logged out from all devices."}


@router.post("/users/{user_id}/reset-password", summary="Admin Reset User Password")
async def admin_reset_password(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Send a password reset link to a specific user."""
    from app.services.auth_service import forgot_password
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    ip = get_client_ip(request)
    forgot_password(db, user.email, ip)
    log_admin_action(db, AuditAction.ADMIN_RESET_PASSWORD, admin.id, admin.email,
                     user.id, user.email, "Password reset link sent by admin", ip)
    return {"message": f"Password reset link sent to {user.email}."}


@router.get("/users/{user_id}/sessions", summary="User Active Sessions")
async def get_user_sessions(
    user_id: str,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Get all active sessions for a specific user."""
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    sessions = db.query(SessionRecord).filter(
        SessionRecord.user_id == user_id,
        SessionRecord.is_active == True,
    ).all()

    return {
        "user_email": user.email,
        "sessions": [{
            "id": s.id,
            "browser": s.browser,
            "os": s.os,
            "device_type": s.device_type,
            "ip_address": s.ip_address,
            "created_at": s.created_at.isoformat(),
            "last_active": s.last_active.isoformat(),
        } for s in sessions],
    }


# ── Login Activity Monitoring ─────────────────────────────────────────────────

@router.get("/login-activity", summary="Login Activity (Filtered)")
async def get_login_activity(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
    search: Optional[str] = Query(None, description="Search by email or IP"),
    user_id: Optional[str] = Query(None),
    success: Optional[bool] = Query(None),
    browser: Optional[str] = Query(None),
    device_type: Optional[str] = Query(None),
    ip_address: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None, description="ISO date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="ISO date (YYYY-MM-DD)"),
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
):
    """Get paginated, filterable login activity for all users."""
    query = db.query(LoginHistory)

    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            LoginHistory.email.ilike(like),
            LoginHistory.ip_address.ilike(like),
        ))
    if user_id:
        query = query.filter(LoginHistory.user_id == user_id)
    if success is not None:
        query = query.filter(LoginHistory.success == success)
    if browser:
        query = query.filter(LoginHistory.browser.ilike(f"%{browser}%"))
    if device_type:
        query = query.filter(LoginHistory.device_type == device_type)
    if ip_address:
        query = query.filter(LoginHistory.ip_address.ilike(f"%{ip_address}%"))
    if country:
        query = query.filter(LoginHistory.country.ilike(f"%{country}%"))
    if date_from:
        query = query.filter(LoginHistory.login_time >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(LoginHistory.login_time <= datetime.fromisoformat(date_to + "T23:59:59"))

    total = query.count()
    records = query.order_by(desc(LoginHistory.login_time)).offset(offset).limit(limit).all()

    return {
        "records": [{
            "id": r.id,
            "user_id": r.user_id,
            "email": r.email,
            "login_time": r.login_time.isoformat() if r.login_time else None,
            "logout_time": r.logout_time.isoformat() if r.logout_time else None,
            "session_duration_seconds": r.session_duration_seconds,
            "browser": f"{r.browser or ''} {r.browser_version or ''}".strip(),
            "os": f"{r.os or ''} {r.os_version or ''}".strip(),
            "device_type": r.device_type,
            "device_name": r.device_name,
            "ip_address": r.ip_address,
            "country": r.country,
            "city": r.city,
            "user_agent": r.user_agent,
            "auth_method": r.auth_method,
            "success": r.success,
            "failure_reason": r.failure_reason,
            "session_id": r.session_id,
        } for r in records],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/export/login-activity", summary="Export Login Activity CSV")
async def export_login_activity_csv(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Export login activity as CSV."""
    query = db.query(LoginHistory)
    if date_from:
        query = query.filter(LoginHistory.login_time >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(LoginHistory.login_time <= datetime.fromisoformat(date_to + "T23:59:59"))

    records = query.order_by(desc(LoginHistory.login_time)).limit(10000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Email", "Login Time", "Logout Time", "Duration (s)",
        "Browser", "OS", "Device", "IP Address", "Country", "City",
        "Auth Method", "Success", "Failure Reason"
    ])
    for r in records:
        writer.writerow([
            r.id, r.email,
            r.login_time.isoformat() if r.login_time else "",
            r.logout_time.isoformat() if r.logout_time else "",
            r.session_duration_seconds or "",
            f"{r.browser or ''} {r.browser_version or ''}".strip(),
            f"{r.os or ''} {r.os_version or ''}".strip(),
            r.device_type or "", r.ip_address or "",
            r.country or "", r.city or "",
            r.auth_method or "", r.success, r.failure_reason or "",
        ])

    output.seek(0)
    filename = f"login_activity_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    log_event(db, AuditAction.ADMIN_EXPORT_LOGS, user_id=admin.id, user_email=admin.email,
              description="Exported login activity CSV")
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── Active Sessions ───────────────────────────────────────────────────────────

@router.get("/sessions", summary="All Active Sessions")
async def get_all_sessions(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    """Get all currently active sessions across all users."""
    total = db.query(SessionRecord).filter(SessionRecord.is_active == True).count()
    sessions = (
        db.query(SessionRecord)
        .filter(SessionRecord.is_active == True)
        .order_by(desc(SessionRecord.last_active))
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []
    for s in sessions:
        user = s.user
        result.append({
            "id": s.id,
            "user_id": s.user_id,
            "user_email": user.email if user else "Unknown",
            "browser": s.browser,
            "os": s.os,
            "device_type": s.device_type,
            "ip_address": s.ip_address,
            "country": s.country,
            "created_at": s.created_at.isoformat(),
            "last_active": s.last_active.isoformat(),
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        })

    return {"sessions": result, "total": total, "limit": limit, "offset": offset}


@router.delete("/sessions/{session_id}", summary="Force Terminate Session")
async def terminate_session(
    session_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Force terminate any specific session."""
    from app.database import RefreshTokenRecord
    session = db.query(SessionRecord).filter(SessionRecord.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    session.is_active = False
    db.query(RefreshTokenRecord).filter(
        RefreshTokenRecord.session_id == session_id
    ).update({"is_revoked": True})
    db.commit()

    ip = get_client_ip(request)
    log_event(db, AuditAction.ADMIN_FORCE_LOGOUT, user_id=admin.id, user_email=admin.email,
              admin_id=admin.id, ip_address=ip,
              description=f"Session {session_id[:8]}... force terminated by admin")
    return {"message": "Session terminated."}


# ── Audit Logs ────────────────────────────────────────────────────────────────

@router.get("/audit-logs", summary="Security Audit Logs")
async def get_audit_logs(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
    search: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
):
    """Get filtered security audit logs."""
    query = db.query(AuditLog)

    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            AuditLog.action.ilike(like),
            AuditLog.user_email.ilike(like),
            AuditLog.description.ilike(like),
        ))
    if action:
        query = query.filter(AuditLog.action == action)
    if severity:
        query = query.filter(AuditLog.severity == severity)
    if user_email:
        query = query.filter(AuditLog.user_email.ilike(f"%{user_email}%"))
    if date_from:
        query = query.filter(AuditLog.timestamp >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(AuditLog.timestamp <= datetime.fromisoformat(date_to + "T23:59:59"))

    total = query.count()
    logs = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()

    return {
        "logs": [{
            "id": r.id,
            "timestamp": r.timestamp.isoformat(),
            "user_id": r.user_id,
            "user_email": r.user_email,
            "admin_id": r.admin_id,
            "action": r.action,
            "description": r.description,
            "severity": r.severity,
            "ip_address": r.ip_address,
            "browser": r.browser,
            "device": r.device,
        } for r in logs],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# ── Legacy Endpoints (backward compat) ───────────────────────────────────────

@router.get("/datasets", summary="System Datasets Audit")
async def list_all_datasets(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Queries details on all uploaded datasets."""
    from app.database import DatasetRecord
    records = db.query(DatasetRecord).order_by(DatasetRecord.created_at.desc()).all()
    results = []
    for r in records:
        owner_email = None
        if r.user_id:
            owner = db.query(UserRecord).filter(UserRecord.id == r.user_id).first()
            if owner:
                owner_email = owner.email
        results.append({
            "id": r.id,
            "original_filename": r.original_filename,
            "file_size_bytes": r.file_size_bytes,
            "rows": r.rows,
            "columns": r.columns,
            "status": r.status,
            "created_at": r.created_at,
            "owner_email": owner_email or "Global/Anonymous",
        })
    return results


@router.get("/issues", summary="List System Issues")
async def list_all_issues(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """Retrieves all reported issues."""
    issues = db.query(IssueRecord).order_by(IssueRecord.created_at.desc()).all()
    return [{"id": i.id, "title": i.title, "category": i.category,
             "description": i.description, "email": i.email,
             "created_at": i.created_at} for i in issues]


@router.delete("/issues/{issue_id}", summary="Delete Issue")
async def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    issue = db.query(IssueRecord).filter(IssueRecord.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")
    db.delete(issue)
    db.commit()
    return {"message": "Issue deleted."}


# ── TEMPORARY: Mark all users as unverified (remove after use) ──────────────

@router.post("/debug/mark-all-unverified", summary="[TEMP] Mark all users unverified")
async def mark_all_unverified(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """TEMPORARY: Marks every user as unverified so OTP flow can be tested.
    Remove this endpoint after use."""
    count = db.query(UserRecord).filter(UserRecord.is_verified == True).update({"is_verified": False})
    db.commit()
    return {"message": f"Marked {count} users as unverified."}


@router.delete("/debug/delete-all-users-except-admin", summary="[TEMP] Delete all non-admin users")
async def delete_all_except_admin(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin),
):
    """TEMPORARY: Deletes all users except admin@infinitics.ai."""
    # Delete related data first
    db.query(OTPChallenge).delete(synchronize_session=False)
    db.query(LoginHistory).filter(LoginHistory.user_id != admin.id).delete(synchronize_session=False)
    db.query(RefreshTokenRecord).filter(RefreshTokenRecord.user_id != admin.id).delete(synchronize_session=False)
    db.query(SessionRecord).filter(SessionRecord.user_id != admin.id).delete(synchronize_session=False)
    deleted = db.query(UserRecord).filter(UserRecord.id != admin.id).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Deleted {deleted} users. Only admin@infinitics.ai remains."}
