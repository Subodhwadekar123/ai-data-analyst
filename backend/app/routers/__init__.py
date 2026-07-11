"""
AI Data Analyst - Routers Package
====================================
Exports all router modules for clean imports in main.py
"""

from app.routers import (
    upload,
    analysis,
    cleaning,
    statistics,
    visualization,
    ml,
    ai_insights,
    features,
    reports,
    health,
    issues,
    auth,
    admin,
)

__all__ = [
    "upload",
    "analysis",
    "cleaning",
    "statistics",
    "visualization",
    "ml",
    "ai_insights",
    "features",
    "reports",
    "health",
    "issues",
    "auth",
    "admin",
]
