"""
AI Data Analyst - Health Check Router
========================================
Simple health and status endpoints for monitoring and readiness checks.
"""

from fastapi import APIRouter
from datetime import datetime
from app.config import settings

router = APIRouter()


@router.get("/health", summary="Health Check")
async def health_check():
    """Basic liveness check — returns 200 if the API is running."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/ready", summary="Readiness Check")
async def readiness_check():
    """Readiness probe — verifies dependencies are available."""
    checks = {
        "api": True,
        "uploads_dir": True,
        "reports_dir": True,
    }
    import os
    checks["uploads_dir"] = os.path.exists(settings.UPLOAD_DIR)
    checks["reports_dir"] = os.path.exists(settings.REPORTS_DIR)

    all_ok = all(checks.values())
    return {
        "status": "ready" if all_ok else "degraded",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat(),
    }
