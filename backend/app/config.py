"""
AI Data Analyst - Application Configuration
============================================
Centralized settings management using Pydantic Settings.
All configuration is loaded from environment variables or .env file.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os
import secrets


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Provides type-safe configuration with validation.
    """

    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "AI Data Analyst"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # ── Server ───────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,https://*.vercel.app"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ── File Upload ───────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "./uploads"
    REPORTS_DIR: str = "./reports"
    MAX_FILE_SIZE_MB: int = 200
    ALLOWED_EXTENSIONS: str = "csv,xlsx,xls"

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [e.strip().lower() for e in self.ALLOWED_EXTENSIONS.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./ai_data_analyst.db"

    # ── AI / LLM ──────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""

    # ── Security & JWT ────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-this-in-production-please"
    REFRESH_SECRET_KEY: str = "change-this-refresh-secret-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15           # Short-lived JWT
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7              # Standard refresh
    REMEMBER_ME_EXPIRE_DAYS: int = 30               # Extended refresh

    # ── Email Verification & Password Reset ───────────────────────────────────
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_EXPIRE_HOURS: int = 1
    AUTO_VERIFY_USERS: bool = True                  # Auto-verify in local dev when no SMTP is configured

    # ── Account Security Policies ─────────────────────────────────────────────
    ENABLE_ACCOUNT_LOCKOUT: bool = False            # Disable lockout timers / restrictions
    MAX_LOGIN_ATTEMPTS: int = 999                   # Max attempts threshold
    LOCKOUT_DURATION_MINUTES: int = 0               # Lockout window (minutes)
    INVALIDATE_SESSIONS_ON_PASSWORD_CHANGE: bool = True

    # ── Frontend URL (for email links) ────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"

    # ── SMTP Email Configuration ──────────────────────────────────────────────
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025                           # MailHog default
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@ai-data-analyst.com"
    SMTP_FROM_NAME: str = "AI Data Analyst"
    SMTP_USE_TLS: bool = False                      # True for production SMTP
    SMTP_USE_SSL: bool = False

    # ── OTP (Email Verification Code) Configuration ──────────────────────────
    OTP_ENABLED: bool = True                        # Require email OTP at registration
    OTP_CODE_LENGTH: int = 6                        # Digits in the code
    OTP_EXPIRE_MINUTES: int = 10                    # Code validity window
    OTP_MAX_ATTEMPTS: int = 5                       # Wrong-code attempts before challenge locks
    OTP_RESEND_COOLDOWN_SECONDS: int = 60           # Minimum gap between resends

    # ── Performance ───────────────────────────────────────────────────────────
    MAX_ROWS_FOR_ML: int = 500000
    CACHE_TTL_SECONDS: int = 3600
    BACKGROUND_WORKERS: int = 4

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Singleton settings instance
settings = Settings()

# Ensure critical directories exist on startup
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
