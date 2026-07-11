"""
AI Data Analyst - FastAPI Application Entry Point
==================================================
Main application factory. Configures:
  - CORS middleware
  - All API routers
  - Startup/shutdown lifecycle
  - Global exception handlers
  - Database initialization
  - Static file serving
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import time
import os

from app.config import settings
from app.database import init_db
from app.utils.logger import setup_logger

# ── Import All Routers ────────────────────────────────────────────────────────
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

# ── Logger Setup ─────────────────────────────────────────────────────────────
logger = setup_logger(__name__)


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"📁 Upload directory: {settings.UPLOAD_DIR}")
    logger.info(f"📊 Reports directory: {settings.REPORTS_DIR}")
    init_db()
    logger.info("✅ Database initialized")
    yield
    # Shutdown
    logger.info("👋 Shutting down AI Data Analyst")


# ── Application Factory ────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="""
        ## AI Data Analyst API
        
        A production-ready AI-powered data analysis platform.
        Upload CSV/Excel files and get professional insights instantly.
        
        ### Features:
        - 📤 **File Upload**: CSV, Excel with validation
        - 🔍 **EDA**: Automatic exploratory data analysis
        - 🧹 **Data Cleaning**: Missing values, outliers, encoding
        - 📊 **Visualization**: 20+ interactive chart types
        - 🤖 **Machine Learning**: Auto-detect and train models
        - 🧠 **AI Insights**: Natural language analysis
        - 📄 **Reports**: PDF, Excel, Word export
        """,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # ── Middleware ────────────────────────────────────────────────────────────

    # CORS - Allow frontend origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],  # For file downloads
    )

    # GZIP compression for large responses
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Request timing middleware
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))
        return response

    # ── Global Exception Handlers ─────────────────────────────────────────────

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        logger.error(f"ValueError: {exc}")
        return JSONResponse(
            status_code=400,
            content={"detail": str(exc), "type": "validation_error"},
        )

    @app.exception_handler(FileNotFoundError)
    async def file_not_found_handler(request: Request, exc: FileNotFoundError):
        logger.error(f"FileNotFoundError: {exc}")
        return JSONResponse(
            status_code=404,
            content={"detail": "Dataset not found. Please re-upload your file.", "type": "not_found"},
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred.", "type": "server_error"},
        )

    # ── API Routers ───────────────────────────────────────────────────────────
    API_PREFIX = "/api/v1"

    app.include_router(health.router, prefix=API_PREFIX, tags=["Health"])
    app.include_router(upload.router, prefix=API_PREFIX, tags=["Upload"])
    app.include_router(analysis.router, prefix=API_PREFIX, tags=["Analysis"])
    app.include_router(cleaning.router, prefix=API_PREFIX, tags=["Cleaning"])
    app.include_router(statistics.router, prefix=API_PREFIX, tags=["Statistics"])
    app.include_router(visualization.router, prefix=API_PREFIX, tags=["Visualization"])
    app.include_router(ml.router, prefix=API_PREFIX, tags=["Machine Learning"])
    app.include_router(ai_insights.router, prefix=API_PREFIX, tags=["AI Insights"])
    app.include_router(features.router, prefix=API_PREFIX, tags=["Feature Engineering"])
    app.include_router(reports.router, prefix=API_PREFIX, tags=["Reports"])
    app.include_router(issues.router, prefix=API_PREFIX, tags=["Issues"])
    app.include_router(auth.router, prefix=API_PREFIX, tags=["Authentication"])
    app.include_router(admin.router, prefix=API_PREFIX, tags=["Administration"])

    # ── Static Files (uploaded data & reports) ────────────────────────────────
    if os.path.exists(settings.UPLOAD_DIR):
        app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
    if os.path.exists(settings.REPORTS_DIR):
        app.mount("/reports", StaticFiles(directory=settings.REPORTS_DIR), name="reports")

    return app


# ── Application Instance ──────────────────────────────────────────────────────
app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else settings.BACKGROUND_WORKERS,
    )
