"""
AI Data Analyst - Cryptography & JWT Security Services
=====================================================
Utility functions for hashing passwords and generating/verifying JWT authorization tokens.
"""

import bcrypt
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional

from app.config import settings

# ── JWT Parameters ────────────────────────────────────────────────────────────
ALGORITHM = "HS256"


# ── Password Operations ───────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    """Computes a secure one-way cryptographic hash of a plaintext password."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies if a plaintext password matches its database cryptographic hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# ── JWT Operations ────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a secure, signed JSON Web Token (JWT) containing credentials."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT token. Returns the payload dictionary if valid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
