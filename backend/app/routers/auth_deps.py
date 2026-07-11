"""
AI Data Analyst - Authentication Dependencies
==============================================
FastAPI request dependencies for extracting, decoding, and authorizing user sessions.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session

from app.database import get_db, UserRecord
from app.services.security import verify_access_token

# Extracts the Authorization header directly
auth_header = APIKeyHeader(name="Authorization", auto_error=False)


async def get_current_user(auth: str = Depends(auth_header), db: Session = Depends(get_db)) -> UserRecord:
    """Decodes and validates Authorization JWT token headers to fetch the active user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session invalid or expired. Please login again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not auth:
        raise credentials_exception
    
    # Handle optional Bearer prefix token extraction
    token = auth
    if auth.startswith("Bearer "):
        parts = auth.split(" ")
        if len(parts) == 2:
            token = parts[1]
        else:
            raise credentials_exception

    payload = verify_access_token(token)
    if payload is None:
        raise credentials_exception
        
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if user is None:
        raise credentials_exception
        
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your user account is suspended.")
        
    return user


async def get_current_admin(current_user: UserRecord = Depends(get_current_user)) -> UserRecord:
    """Verifies that the logged-in user possesses system administrative privileges."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Access is restricted to system administrators only."
        )
    return current_user
