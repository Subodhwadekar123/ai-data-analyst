"""
AI Data Analyst - System Administration Router
===============================================
Endpoints for querying system usage logs, registered users, and audit files.
Protected exclusively for Admin accounts.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import uuid
import pandas as pd

from app.database import get_db, UserRecord, DatasetRecord, MLExperiment, IssueRecord
from app.routers.auth_deps import get_current_admin
from app.services.data_service import DataService
from app.services.stats_service import StatisticsService
from app.config import settings
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
    is_admin: bool
    is_online: bool
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
        # Add is_online property based on session_token
        result = []
        for u in users:
            result.append({
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "is_admin": u.is_admin,
                "is_online": u.session_token is not None,
                "created_at": u.created_at
            })
        return result
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


# ── New Admin Endpoints ──────────────────────────────────────────────────────

@router.delete("/issues/{issue_id}", summary="Delete System Issue")
async def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin)
):
    """Deletes a reported issue from the system."""
    issue = db.query(IssueRecord).filter(IssueRecord.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found."
        )
    db.delete(issue)
    db.commit()
    return {"message": "Issue deleted successfully."}

@router.put("/users/{user_id}/force-logout", summary="Force Logout User")
async def force_logout_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin)
):
    """Forces an active user session to terminate."""
    target_user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
        
    if admin.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot force logout yourself from this panel."
        )

    if target_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot force logout other administrators."
        )

    target_user.session_token = None
    db.commit()
    
    return {
        "message": f"Successfully forced logout for {target_user.email}",
        "user_id": target_user.id,
        "is_online": False
    }


@router.get("/users/{user_id}/datasets", response_model=List[AdminDatasetOut], summary="User Datasets")
async def get_user_datasets(
    user_id: str,
    db: Session = Depends(get_db),
    admin: UserRecord = Depends(get_current_admin)
):
    """Retrieves all datasets uploaded by a specific user."""
    records = (
        db.query(DatasetRecord)
        .filter(DatasetRecord.user_id == user_id)
        .order_by(DatasetRecord.created_at.desc())
        .all()
    )

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
            "owner_email": owner_email or "Global/Anonymous",
        })

    return results


@router.get("/reports/{dataset_id}/pdf", summary="Admin PDF Report")
def admin_generate_pdf_report(
    dataset_id: str,
    admin: UserRecord = Depends(get_current_admin)
):
    """Admin endpoint to generate and download a PDF report for any dataset."""
    try:
        # Import here to avoid circular import between routers
        from app.routers.reports import _generate_pdf_report

        report_id = str(uuid.uuid4())[:8]
        filename = f"admin_report_{dataset_id[:8]}_{report_id}.pdf"
        file_path = os.path.join(settings.REPORTS_DIR, filename)

        _generate_pdf_report(dataset_id, file_path)

        return FileResponse(
            file_path,
            media_type="application/pdf",
            filename="ai_data_analyst_report.pdf",
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    except Exception as e:
        logger.error(f"Admin PDF report generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{dataset_id}/excel", summary="Admin Excel Report")
def admin_generate_excel_report(
    dataset_id: str,
    admin: UserRecord = Depends(get_current_admin)
):
    """Admin endpoint to generate and download an Excel report for any dataset."""
    try:
        df = DataService.get_dataframe(dataset_id)
        info = DataService.get_dataset_info(dataset_id)
        stats = StatisticsService.descriptive_stats(df)

        report_id = str(uuid.uuid4())[:8]
        filename = f"admin_report_{dataset_id[:8]}_{report_id}.xlsx"
        file_path = os.path.join(settings.REPORTS_DIR, filename)

        with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
            # Sheet 1: Dataset preview
            df.head(100).to_excel(writer, sheet_name="Preview (First 100)", index=False)

            # Sheet 2: Descriptive statistics
            if stats:
                stats_df = pd.DataFrame(stats).T
                stats_df.to_excel(writer, sheet_name="Descriptive Statistics")

            # Sheet 3: Column info
            col_info_df = pd.DataFrame(info["column_details"])
            col_info_df.to_excel(writer, sheet_name="Column Information", index=False)

            # Sheet 4: Missing values
            if info["missing_info"]:
                missing_df = pd.DataFrame([
                    {"Column": k, "Missing Count": v["count"], "Missing %": v["percentage"]}
                    for k, v in info["missing_info"].items()
                ])
                missing_df.to_excel(writer, sheet_name="Missing Values", index=False)

        return FileResponse(
            file_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename="ai_data_analyst_report.xlsx",
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    except Exception as e:
        logger.error(f"Admin Excel report generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
