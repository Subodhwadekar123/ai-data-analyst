"""
AI Data Analyst - OTP Service
=============================
Handles creation, verification and resending of short-lived email OTP codes.
Used for registration email verification (and reusable for login step-up later).

Security properties:
  - Codes are generated with `secrets` (cryptographically secure)
  - Only the SHA-256 hash of the code is persisted — never the plain code
  - Challenges are single-use and expire after OTP_EXPIRE_MINUTES
  - Wrong-code attempts are capped at OTP_MAX_ATTEMPTS
  - Comparison is constant-time (hmac.compare_digest)
"""

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.config import settings
from app.database import OTPChallenge
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


def _hash_code(code: str, challenge_id: str) -> str:
    """Hash the OTP code together with the challenge id (salt) using SHA-256."""
    return hashlib.sha256(f"{challenge_id}:{code}".encode("utf-8")).hexdigest()


def _cleanup_expired(db: Session) -> None:
    """Best-effort deletion of expired challenges to keep the table small."""
    try:
        db.query(OTPChallenge).filter(
            OTPChallenge.expires_at < datetime.utcnow()
        ).delete(synchronize_session=False)
    except Exception as e:  # pragma: no cover
        logger.warning(f"OTP cleanup failed: {e}")


def create_otp_challenge(db: Session, user_id: str, purpose: str = "registration") -> tuple:
    """
    Create a new OTP challenge for the user.

    Invalidates any previous unconsumed challenges for the same user + purpose.
    Returns (challenge_id, plain_code, expires_at).
    """
    # Invalidate previous challenges for this user + purpose
    db.query(OTPChallenge).filter(
        OTPChallenge.user_id == user_id,
        OTPChallenge.purpose == purpose,
        OTPChallenge.consumed == False,  # noqa: E712
    ).delete(synchronize_session=False)

    challenge_id = str(uuid.uuid4())
    code = "".join(secrets.choice("0123456789") for _ in range(settings.OTP_CODE_LENGTH))
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    challenge = OTPChallenge(
        id=challenge_id,
        user_id=user_id,
        purpose=purpose,
        code_hash=_hash_code(code, challenge_id),
        attempts=0,
        consumed=False,
        created_at=now,
        expires_at=expires_at,
        last_sent_at=now,
    )
    db.add(challenge)

    _cleanup_expired(db)
    db.commit()

    logger.info(f"[OTP] Challenge created for user {user_id} (purpose={purpose})")
    return challenge_id, code, expires_at


def get_challenge(db: Session, challenge_id: str) -> OTPChallenge:
    """Fetch a challenge by id or raise ValueError with a safe message."""
    challenge = db.query(OTPChallenge).filter(OTPChallenge.id == challenge_id).first()
    if not challenge:
        raise ValueError("Invalid or expired verification session. Please register again.")
    return challenge


def check_resend_allowed(challenge: OTPChallenge) -> None:
    """Raise ValueError if the resend cooldown has not elapsed yet."""
    elapsed = (datetime.utcnow() - (challenge.last_sent_at or challenge.created_at)).total_seconds()
    if elapsed < settings.OTP_RESEND_COOLDOWN_SECONDS:
        wait = int(settings.OTP_RESEND_COOLDOWN_SECONDS - elapsed) + 1
        raise ValueError(f"Please wait {wait}s before requesting a new code.")


def verify_otp_code(
    db: Session,
    challenge_id: str,
    code: str,
) -> OTPChallenge:
    """
    Verify a submitted OTP code.

    Returns the challenge (with .user loaded) on success.
    Raises ValueError with a user-safe message on any failure.
    """
    challenge = get_challenge(db, challenge_id)

    if challenge.consumed:
        raise ValueError("This code has already been used. Please request a new one.")

    if datetime.utcnow() > challenge.expires_at:
        challenge.consumed = True
        db.commit()
        raise ValueError("This code has expired. Please request a new one.")

    if challenge.attempts >= settings.OTP_MAX_ATTEMPTS:
        challenge.consumed = True
        db.commit()
        raise ValueError("Too many incorrect attempts. Please request a new code.")

    submitted = (code or "").strip()
    expected_hash = challenge.code_hash
    submitted_hash = _hash_code(submitted, challenge.id)

    if not hmac.compare_digest(expected_hash, submitted_hash):
        challenge.attempts += 1
        remaining = settings.OTP_MAX_ATTEMPTS - challenge.attempts
        if challenge.attempts >= settings.OTP_MAX_ATTEMPTS:
            challenge.consumed = True
            db.commit()
            raise ValueError("Too many incorrect attempts. Please request a new code.")
        db.commit()
        raise ValueError(
            f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} remaining."
        )

    # Success — consume the challenge
    challenge.consumed = True
    db.commit()
    return challenge
