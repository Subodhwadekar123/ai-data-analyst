"""
AI Data Analyst - System Administration Router
===============================================
Endpoints for querying system usage logs, registered users, and audit files.
Protected exclusively for Admin accounts.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database import get_db, UserRecord, DatasetRecord, MLExperiment, IssueRecord
from app.routers.auth_deps import get_current_admin
from app.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/admin", tags=["Administration"])


# ── Pydantic Response Models ─────────────────────────────────────────────────
class AdminStats(BaseModel):
    total_users: int
    total_datasets: int
    total_experiments: int
    total_issues: int


class AdminUserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        orm_mode = True


class AdminDatasetOut(BaseModel):
    id: str
    original_filename: str
    file_size_bytes: int
    rows: Optional[int]
    columns: Optional[int]
    status: str
    created_at: datetime
    owner_email: Optional[str]

    class Config:
        orm_mode = True


class AdminIssueOut(BaseModel):
    id: int
    title: str
    category: str
    description: str
    email: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats, summary="System Statistics")
async def get_system_stats(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin)
):
    """Retrieves system-wide statistics for activity monitoring."""
    try:
        total_users = db.query(UserRecord).count()
        total_datasets = db.query(DatasetRecord).count()
        total_experiments = db.query(MLExperiment).count()
        total_issues = db.query(IssueRecord).count()

        return {
            "total_users": total_users,
            "total_datasets": total_datasets,
            "total_experiments": total_experiments,
            "total_issues": total_issues,
        }
    except Exception as e:
        logger.error(f"Failed to query admin stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query system dashboard stats."
        )


@router.get("/users", response_model=List[AdminUserOut], summary="List Registered Users")
async def list_all_users(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin)
):
    """Retrieves all registered platform users, ordered by registration date."""
    try:
        users = db.query(UserRecord).order_by(UserRecord.created_at.desc()).all()
        return users
    except Exception as e:
        logger.error(f"Failed to query users: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query user records."
        )


@router.get("/datasets", response_model=List[AdminDatasetOut], summary="System Datasets Audit")
async def list_all_datasets(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin)
):
    """Queries details on all uploaded datasets across the entire platform."""
    try:
        # Fetch datasets and join user info for owner email
        records = db.query(DatasetRecord).order_by(DatasetRecord.created_at.desc()).all()
        
        results = []
        for r in records:
            owner_email = None
            if r.user_id:
                owner = db.query(UserRecord).filter(UserRecord.id == r.user_id).first()
                if owner:
                    owner_email = owner.email
            
            results.append({
                "id": r.id,
                "original_filename": r.original_filename,
                "file_size_bytes": r.file_size_bytes,
                "rows": r.rows,
                "columns": r.columns,
                "status": r.status,
                "created_at": r.created_at,
                "owner_email": owner_email or "Global/Anonymous"
            })
            
        return results
    except Exception as e:
        logger.error(f"Failed to audit datasets: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to audit dataset metadata records."
        )


@router.get("/issues", response_model=List[AdminIssueOut], summary="List System Issues")
async def list_all_issues(
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin)
):
    """Retrieves all reported issues across the system, sorted by newest first."""
    try:
        issues = db.query(IssueRecord).order_by(IssueRecord.created_at.desc()).all()
        return issues
    except Exception as e:
        logger.error(f"Failed to query admin issues: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve feedback issues."
        )
