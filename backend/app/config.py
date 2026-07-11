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
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

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

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-this-in-production-please"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

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
