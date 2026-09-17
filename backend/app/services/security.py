"""
AI Data Analyst - Cryptography & JWT Security Services
=====================================================
Comprehensive security utilities:
  - Argon2id password hashing (OWASP recommended)
  - bcrypt fallback for legacy passwords
  - JWT access token creation/verification
  - Refresh token generation/verification
  - Secure token generation
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt, JWTError
from app.config import settings

# ── Algorithm Constants ───────────────────────────────────────────────────────
ALGORITHM = settings.ALGORITHM


# ── Password Hashing ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """
    Hash a password using Argon2id (OWASP recommended).
    Falls back to bcrypt if argon2-cffi is not installed or raises HashingError.
    """
    try:
        from argon2 import PasswordHasher
        ph = PasswordHasher(
            time_cost=3,         # Iterations
            memory_cost=65536,   # 64 MB
            parallelism=4,       # Threads
            hash_len=32,
            salt_len=16,
        )
        return ph.hash(password)
    except Exception as e:
        # Fallback to bcrypt
        import bcrypt
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against its hash.
    Supports both Argon2id and bcrypt hashes (auto-detection).
    """
    if not plain_password or not hashed_password:
        return False

    # Detect Argon2 hash (starts with $argon2)
    if hashed_password.startswith("$argon2"):
        try:
            from argon2 import PasswordHasher
            from argon2.exceptions import VerifyMismatchError, VerificationError
            ph = PasswordHasher()
            try:
                return ph.verify(hashed_password, plain_password)
            except (VerifyMismatchError, VerificationError):
                return False
        except ImportError:
            pass

    # Fallback to bcrypt
    try:
        import bcrypt
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def check_password_needs_rehash(hashed_password: str) -> bool:
    """Check if a stored password hash needs to be upgraded to a newer algorithm."""
    if hashed_password.startswith("$argon2"):
        try:
            from argon2 import PasswordHasher
            ph = PasswordHasher()
            return ph.check_needs_rehash(hashed_password)
        except ImportError:
            pass
    return False


# ── JWT Access Token ──────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a signed JWT access token.
    Default expiry: ACCESS_TOKEN_EXPIRE_MINUTES from config.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.utcnow(), "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.
    Returns the payload dict if valid, None otherwise.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


# ── Refresh Token ─────────────────────────────────────────────────────────────

def generate_refresh_token() -> str:
    """Generate a cryptographically secure opaque refresh token."""
    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    """Hash a refresh token for safe database storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def verify_refresh_token_hash(plain_token: str, stored_hash: str) -> bool:
    """Verify a refresh token against its stored hash."""
    return hashlib.sha256(plain_token.encode()).hexdigest() == stored_hash


# ── Secure Token Generation ───────────────────────────────────────────────────

def generate_secure_token(length: int = 32) -> str:
    """Generate a URL-safe cryptographically secure random token."""
    return secrets.token_urlsafe(length)


# ── Password Strength Validation ──────────────────────────────────────────────

def validate_password_strength(password: str) -> tuple[bool, list[str]]:
    """
    Validate password against OWASP requirements.
    Returns (is_valid, list_of_failed_requirements).
    """
    errors = []

    if len(password) < 8:
        errors.append("Must be at least 8 characters long")

    if not any(c.isupper() for c in password):
        errors.append("Must contain at least one uppercase letter")

    if not any(c.islower() for c in password):
        errors.append("Must contain at least one lowercase letter")

    if not any(c.isdigit() for c in password):
        errors.append("Must contain at least one number")

    special_chars = set("!@#$%^&*()_+-=[]{}|;':\",./<>?")
    if not any(c in special_chars for c in password):
        errors.append("Must contain at least one special character (!@#$%^&*...)")

    return len(errors) == 0, errors
