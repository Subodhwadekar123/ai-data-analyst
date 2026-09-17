"""
AI Data Analyst - Authentication Dependencies
==============================================
FastAPI request dependencies for extracting, decoding, and authorizing user sessions.
Supports both JWT Bearer tokens (for API calls) and session-based validation.
"""

from fastapi import Depends, HTTPException, status, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db, UserRecord, SessionRecord
from app.services.security import verify_access_token
from app.utils.device_parser import get_client_ip

# ── Bearer Token Extractor ────────────────────────────────────────────────────
security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> UserRecord:
    """
    Extract and validate JWT access token from Authorization: Bearer header.
    Validates against the sessions table to ensure session is still active.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session invalid or expired. Please login again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    token = credentials.credentials
    payload = verify_access_token(token)

    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    session_id: str = payload.get("session_id")
    session_token: str = payload.get("session_token")

    if not user_id:
        raise credentials_exception

    # Fetch user
    user = db.query(UserRecord).filter(
        UserRecord.id == user_id,
        UserRecord.is_deleted == False,
    ).first()

    if not user:
        raise credentials_exception

    # Approval is independent of activation/suspension and checked on every request.
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="Your account is awaiting admin approval.")

    if not user.is_active or user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended or deactivated.",
        )

    # Validate session is still active (prevents token reuse after logout)
    if session_id:
        session = db.query(SessionRecord).filter(
            SessionRecord.id == session_id,
            SessionRecord.user_id == user_id,
            SessionRecord.is_active == True,
        ).first()
        if not session:
            raise credentials_exception
    elif session_token:
        # Backward compat: validate via legacy session_token
        if session_token != user.session_token:
            raise credentials_exception

    return user


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Optional[UserRecord]:
    """
    Like get_current_user but returns None instead of raising on missing auth.
    Useful for routes that work both authenticated and unauthenticated.
    """
    try:
        return await get_current_user(request, credentials, db)
    except HTTPException:
        return None


async def get_current_admin(
    current_user: UserRecord = Depends(get_current_user),
) -> UserRecord:
    """Verify the current user is an administrator."""
    if not current_user.is_admin and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Access is restricted to system administrators only.",
        )
    return current_user


def get_session_id_from_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Optional[str]:
    """Extract session_id from JWT payload without full validation."""
    if not credentials:
        return None
    payload = verify_access_token(credentials.credentials)
    if payload:
        return payload.get("session_id")
    return None
