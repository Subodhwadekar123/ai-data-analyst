"""
AI Data Analyst - Authentication Router
=========================================
Full enterprise authentication API:
  POST /auth/register          - New user registration
  POST /auth/login             - Email + password login
  POST /auth/logout            - Logout current device
  POST /auth/logout-all        - Logout all devices
  POST /auth/refresh           - Rotate refresh token
  POST /auth/verify-email      - Verify email with token
  POST /auth/resend-verification - Resend verification email
  POST /auth/forgot-password   - Request password reset
  POST /auth/reset-password    - Reset password with token
  GET  /auth/me                - Current user profile
  PUT  /auth/profile           - Update profile
  POST /auth/change-password   - Change password (authenticated)
  GET  /auth/sessions          - List active sessions
  DELETE /auth/sessions/{id}   - Revoke a specific session
  GET  /auth/login-history     - Own login history
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime

from app.database import get_db, UserRecord, LoginHistory
from app.routers.auth_deps import get_current_user, get_session_id_from_token
from app.services.auth_service import (
    register_user, login_user, logout_user, logout_all_devices,
    refresh_access_token, verify_email_token, resend_verification_email,
    forgot_password, reset_password, change_password,
    get_active_sessions, revoke_session,
    send_registration_otp, resend_registration_otp, verify_registration_otp,
)
from app.config import settings
from app.utils.device_parser import get_client_ip
from app.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_COOKIE = "refresh_token"


# ── Request/Response Schemas ──────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    username: Optional[str] = None
    agree_terms: bool = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None  # Can also come from cookie


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    challenge_id: str
    code: str


class ResendOtpRequest(BaseModel):
    challenge_id: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match.")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str
    logout_other_sessions: bool = False

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match.")
        return v


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    profile_picture_url: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    role: str = "user"
    is_admin: bool = False
    is_active: bool = True
    is_verified: bool = False
    last_login: Optional[datetime] = None
    created_at: datetime
    login_count: int = 0

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    id: str
    browser: Optional[str]
    browser_version: Optional[str]
    os: Optional[str]
    device_type: Optional[str]
    device_name: Optional[str]
    ip_address: Optional[str]
    country: Optional[str]
    city: Optional[str]
    remember_me: bool
    created_at: datetime
    last_active: datetime
    is_current: bool = False

    class Config:
        from_attributes = True


class LoginHistoryOut(BaseModel):
    id: str
    email: str
    login_time: datetime
    logout_time: Optional[datetime]
    session_duration_seconds: Optional[int]
    browser: Optional[str]
    os: Optional[str]
    device_type: Optional[str]
    ip_address: Optional[str]
    country: Optional[str]
    auth_method: str
    success: bool
    failure_reason: Optional[str]

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Helper: Set Refresh Token Cookie ─────────────────────────────────────────

def _set_refresh_cookie(response: Response, refresh_token: str, remember_me: bool = False):
    """Set refresh token as HttpOnly, Secure, SameSite cookie."""
    from app.config import settings
    max_age = (
        settings.REMEMBER_ME_EXPIRE_DAYS * 86400 if remember_me
        else settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=max_age,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        path="/api/v1/auth/refresh",
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED,
             summary="Register New User")
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account.

    When OTP verification is enabled (default), a 6-digit code is emailed to the
    user and the response contains `otp_required: true` plus a `challenge_id`.
    The account only becomes fully active after the code is verified via
    POST /auth/verify-otp (which also auto-logs the user in).
    """
    ip = get_client_ip(request)
    user, verification_url = register_user(
        db=db,
        email=body.email,
        password=body.password,
        full_name=body.full_name,
        username=body.username,
        ip_address=ip,
    )

    response: dict = {
        "message": "Account created successfully." if user.is_verified else "Account created successfully. Please verify your email.",
        "user_id": user.id,
        "email": user.email,
        "is_verified": user.is_verified,
        "verification_url": verification_url,
    }

    # OTP email verification flow
    if getattr(settings, "OTP_ENABLED", False) and not user.is_verified:
        challenge_id, code, expires_at, email_sent = await send_registration_otp(db, user)
        response["otp_required"] = True
        response["challenge_id"] = challenge_id
        response["masked_email"] = _mask_email(user.email)
        response["expires_at"] = expires_at.isoformat()
        response["email_sent"] = email_sent
        if email_sent:
            response["message"] = "Account created! We emailed you a 6-digit verification code."
        else:
            response["message"] = "Account created, but the verification email could not be sent. Please use 'Resend code' in a moment."
        # Non-production convenience: echo the code so local testing never blocks
        if settings.ENVIRONMENT != "production":
            response["dev_code"] = code

    return response


# ── Helper: Mask Email for Safe Display ──────────────────────────────────────

def _mask_email(email: str) -> str:
    """Mask an email for display, e.g. 'subodh.wadekar@gmail.com' -> 's***r@gmail.com'."""
    try:
        local, domain = email.split("@", 1)
        if len(local) <= 2:
            masked_local = local[0] + "*"
        else:
            masked_local = local[0] + "*" * (len(local) - 2) + local[-1]
        return f"{masked_local}@{domain}"
    except Exception:
        return email[:2] + "***"


@router.post("/verify-otp", summary="Verify Registration OTP Code (auto-login)")
async def verify_otp(request: Request, body: VerifyOtpRequest, response: Response,
                     db: Session = Depends(get_db)):
    """
    Verify the 6-digit OTP code sent to the user's email during registration.
    On success the account is activated and the user is logged in automatically
    (full token response, identical shape to /auth/login).
    """
    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent", "")

    try:
        access_token, refresh_token, session_id, user = verify_registration_otp(
            db=db,
            challenge_id=body.challenge_id,
            code=body.code,
            user_agent=ua,
            ip_address=ip,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    _set_refresh_cookie(response, refresh_token, remember_me=True)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "session_id": session_id,
        "user": UserOut.model_validate(user).model_dump(),
        "message": "Email verified successfully. Welcome aboard!",
    }


@router.post("/resend-otp", summary="Resend Registration OTP Code")
async def resend_otp(request: Request, body: ResendOtpRequest, db: Session = Depends(get_db)):
    """
    Resend a new 6-digit OTP code for an existing challenge.
    Rate-limited by a resend cooldown (default 30s between sends).
    """
    try:
        new_challenge_id, code, expires_at, email_sent = await resend_registration_otp(db, body.challenge_id)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    result = {
        "message": "A new verification code has been sent to your email." if email_sent
        else "The verification email could not be sent right now. Please try again shortly.",
        "challenge_id": new_challenge_id,
        "expires_at": expires_at.isoformat(),
        "email_sent": email_sent,
    }
    # Non-production convenience: echo the code so local testing never blocks
    if settings.ENVIRONMENT != "production":
        result["dev_code"] = code
    return result


@router.post("/login", summary="Login with Email & Password")
async def login(
    request: Request,
    body: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Authenticate user and issue JWT access token + HttpOnly refresh token cookie.
    """
    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent", "")

    access_token, refresh_token, session_id, user = login_user(
        db=db,
        email=body.email,
        password=body.password,
        user_agent=ua,
        ip_address=ip,
        remember_me=body.remember_me,
    )

    _set_refresh_cookie(response, refresh_token, body.remember_me)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "session_id": session_id,
        "user": UserOut.model_validate(user).model_dump(),
    }


@router.post("/logout", summary="Logout Current Device")
async def logout(
    request: Request,
    response: Response,
    current_user: UserRecord = Depends(get_current_user),
    session_id: Optional[str] = Depends(get_session_id_from_token),
    db: Session = Depends(get_db),
):
    """Logout the current session. Revokes session and refresh token."""
    ip = get_client_ip(request)
    if session_id:
        logout_user(db, session_id, current_user, ip)
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth/refresh")
    return {"message": "Logged out successfully."}


@router.post("/logout-all", summary="Logout All Devices")
async def logout_all(
    request: Request,
    response: Response,
    current_user: UserRecord = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Logout from all active sessions across all devices."""
    ip = get_client_ip(request)
    logout_all_devices(db, current_user, ip)
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth/refresh")
    return {"message": "Logged out from all devices successfully."}


@router.post("/refresh", summary="Rotate Refresh Token")
async def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    body: RefreshRequest = RefreshRequest(),
    cookie_token: Optional[str] = Cookie(None, alias=REFRESH_COOKIE),
):
    """
    Issue a new access token using the refresh token (cookie or body).
    The refresh token is rotated on each use (prevents replay attacks).
    """
    raw_token = body.refresh_token or cookie_token
    if not raw_token:
        raise HTTPException(status_code=401, detail="No refresh token provided.")

    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent", "")
    access_token, new_refresh, session_id = refresh_access_token(db, raw_token, ua, ip)

    _set_refresh_cookie(response, new_refresh)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "session_id": session_id,
    }


@router.post("/verify-email", summary="Verify Email Address")
async def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify email address using the token sent to the user's inbox."""
    user = verify_email_token(db, body.token)
    return {
        "message": "Email verified successfully! You can now log in.",
        "email": user.email,
    }


@router.get("/verify-email", summary="Verify Email Address via Link")
async def verify_email_get(token: str, db: Session = Depends(get_db)):
    """Verify email address via direct URL link click."""
    user = verify_email_token(db, token)
    return {
        "message": "Email verified successfully! You can now log in.",
        "email": user.email,
    }


@router.post("/resend-verification", summary="Resend Verification Email")
async def resend_verification(
    request: Request,
    body: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    """Resend the email verification link."""
    ip = get_client_ip(request)
    verification_url = resend_verification_email(db, body.email, ip)
    return {
        "message": "If this email exists and is unverified, a new verification link has been sent.",
        "verification_url": verification_url,
    }


@router.post("/forgot-password", summary="Request Password Reset")
async def forgot_password_endpoint(
    request: Request,
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Send a password reset link to the provided email."""
    ip = get_client_ip(request)
    forgot_password(db, body.email, ip)
    return {"message": "If an account with this email exists, a password reset link has been sent."}


@router.post("/reset-password", summary="Reset Password")
async def reset_password_endpoint(
    request: Request,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset the user's password using the token from the email."""
    ip = get_client_ip(request)
    user = reset_password(db, body.token, body.new_password, ip)
    return {
        "message": "Password reset successfully. You can now log in with your new password.",
        "email": user.email,
    }


@router.get("/me", response_model=UserOut, summary="Get Current User Profile")
async def get_me(current_user: UserRecord = Depends(get_current_user)):
    """Returns the profile of the currently authenticated user."""
    return current_user


@router.put("/profile", response_model=UserOut, summary="Update Profile")
async def update_profile(
    body: UpdateProfileRequest,
    current_user: UserRecord = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user profile information (name, username, avatar)."""
    if body.full_name is not None:
        current_user.full_name = body.full_name

    if body.username is not None:
        existing = db.query(UserRecord).filter(
            UserRecord.username == body.username,
            UserRecord.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken.")
        current_user.username = body.username

    if body.profile_picture_url is not None:
        current_user.profile_picture_url = body.profile_picture_url

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", summary="Change Password")
async def change_password_endpoint(
    request: Request,
    body: ChangePasswordRequest,
    current_user: UserRecord = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password for the authenticated user."""
    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent", "")
    from app.utils.device_parser import parse_user_agent
    device_info = parse_user_agent(ua)
    device = f"{device_info['browser']} on {device_info['os']}"

    change_password(
        db=db,
        user=current_user,
        current_password=body.current_password,
        new_password=body.new_password,
        ip_address=ip,
        device=device,
        logout_other_sessions=body.logout_other_sessions,
    )
    return {"message": "Password changed successfully."}


@router.get("/sessions", summary="List Active Sessions")
async def list_sessions(
    current_user: UserRecord = Depends(get_current_user),
    session_id: Optional[str] = Depends(get_session_id_from_token),
    db: Session = Depends(get_db),
):
    """Returns all active sessions for the current user."""
    sessions = get_active_sessions(db, current_user.id)
    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "browser": s.browser,
            "browser_version": s.browser_version,
            "os": s.os,
            "os_version": s.os_version,
            "device_type": s.device_type,
            "device_name": s.device_name,
            "ip_address": s.ip_address,
            "country": s.country,
            "city": s.city,
            "remember_me": s.remember_me,
            "created_at": s.created_at.isoformat(),
            "last_active": s.last_active.isoformat(),
            "is_current": s.id == session_id,
        })
    return {"sessions": result, "count": len(result)}


@router.delete("/sessions/{sid}", summary="Revoke a Session")
async def revoke_session_endpoint(
    sid: str,
    request: Request,
    current_user: UserRecord = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a specific session by its ID."""
    ip = get_client_ip(request)
    success = revoke_session(db, sid, current_user.id, ip)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"message": "Session revoked successfully."}


@router.get("/login-history", summary="Own Login History")
async def get_login_history(
    limit: int = 20,
    offset: int = 0,
    current_user: UserRecord = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns paginated login history for the authenticated user."""
    total = db.query(LoginHistory).filter(LoginHistory.user_id == current_user.id).count()
    records = (
        db.query(LoginHistory)
        .filter(LoginHistory.user_id == current_user.id)
        .order_by(LoginHistory.login_time.desc())
        .offset(offset)
        .limit(min(limit, 100))
        .all()
    )

    history = []
    for r in records:
        history.append({
            "id": r.id,
            "email": r.email,
            "login_time": r.login_time.isoformat(),
            "logout_time": r.logout_time.isoformat() if r.logout_time else None,
            "session_duration_seconds": r.session_duration_seconds,
            "browser": f"{r.browser or ''} {r.browser_version or ''}".strip(),
            "os": f"{r.os or ''} {r.os_version or ''}".strip(),
            "device_type": r.device_type,
            "ip_address": r.ip_address,
            "country": r.country,
            "auth_method": r.auth_method,
            "success": r.success,
            "failure_reason": r.failure_reason,
        })

    return {"history": history, "total": total, "limit": limit, "offset": offset}
