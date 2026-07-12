"""
AI Data Analyst - Authentication Router
========================================
Registers new users, authenticates credentials, and issues JWT sessions.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid

from app.database import get_db, UserRecord
from app.services.security import hash_password, verify_password, create_access_token
from app.routers.auth_deps import get_current_user
from app.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Pydantic Request Models ──────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    force_login: bool = False


# ── Pydantic Response Models ─────────────────────────────────────────────────
class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        orm_mode = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED, summary="Register User")
async def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    """Registers a new platform user and hashes their password."""
    # Check duplicate email
    existing_user = db.query(UserRecord).filter(UserRecord.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    try:
        new_user = UserRecord(
            id=str(uuid.uuid4()),
            email=user_in.email,
            hashed_password=hash_password(user_in.password),
            full_name=user_in.full_name,
            is_active=True,
            is_admin=False
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"👤 Registered user profile: {new_user.email} (ID: {new_user.id})")
        return new_user
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to register user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete user registration."
        )


@router.post("/login", response_model=TokenOut, summary="Authenticate & Access Token")
async def login_user(user_in: UserLogin, db: Session = Depends(get_db)):
    """Verifies credentials and returns a signed JWT access token."""
    user = db.query(UserRecord).filter(UserRecord.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please try again."
        )
    
    # Check active session for concurrent logins
    if user.session_token and not user_in.force_login:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already logged in elsewhere."
        )

    # Invalidate old session and generate new one
    user.session_token = str(uuid.uuid4())
    db.commit()

    # Generate Token with session identifier
    token_data = {"sub": user.id, "email": user.email, "is_admin": user.is_admin, "session_token": user.session_token}
    token = create_access_token(token_data)
    
    logger.info(f"🔑 User logged in: {user.email}")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/logout", summary="Logout User")
async def logout_user(current_user: UserRecord = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logs out the user by clearing their active session token."""
    current_user.session_token = None
    db.commit()
    logger.info(f"🚪 User logged out: {current_user.email}")
    return {"message": "Successfully logged out."}


@router.get("/me", response_model=UserOut, summary="Get Current Profile")
async def get_my_profile(current_user: UserRecord = Depends(get_current_user)):
    """Returns details for the currently logged-in user profile."""
    return current_user
