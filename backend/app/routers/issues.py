"""
AI Data Analyst - Issues Router
========================================
Handles user feedback and issue reporting, storing records in SQLite.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import io
import csv

from app.database import get_db, IssueRecord
from app.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

# ── Pydantic Validation Models ───────────────────────────────────────────────
class IssueCreate(BaseModel):
    title: str
    category: str
    description: str
    email: Optional[EmailStr] = None

class IssueResponse(BaseModel):
    id: int
    title: str
    category: str
    description: str
    email: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/issues", response_model=IssueResponse, summary="Report an Issue")
async def report_issue(issue_in: IssueCreate, db: Session = Depends(get_db)):
    """Stores a user-submitted issue in the database."""
    try:
        new_issue = IssueRecord(
            title=issue_in.title,
            category=issue_in.category,
            description=issue_in.description,
            email=issue_in.email,
        )
        db.add(new_issue)
        db.commit()
        db.refresh(new_issue)
        logger.info(f"🐛 New issue reported: #{new_issue.id} - {new_issue.title}")
        return new_issue
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to record issue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save issue report to the database.")

@router.get("/issues", response_model=List[IssueResponse], summary="List Reported Issues")
async def list_issues(db: Session = Depends(get_db)):
    """Retrieves all reported issues, sorted by newest first."""
    try:
        issues = db.query(IssueRecord).order_by(IssueRecord.created_at.desc()).all()
        return issues
    except Exception as e:
        logger.error(f"Failed to query issues: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve issue reports.")

@router.get("/issues/download", summary="Download Issues CSV")
async def download_issues(db: Session = Depends(get_db)):
    """Exports all reported issues into a downloadable CSV file."""
    try:
        issues = db.query(IssueRecord).order_by(IssueRecord.created_at.desc()).all()
        
        # Create CSV in-memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow(["ID", "Title", "Category", "Description", "Email", "Reported At"])
        
        # Write rows
        for issue in issues:
            writer.writerow([
                issue.id,
                issue.title,
                issue.category,
                issue.description,
                issue.email or "N/A",
                issue.created_at.isoformat()
            ])
            
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=reported_issues.csv"}
        )
    except Exception as e:
        logger.error(f"Failed to export issues CSV: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to export CSV report.")
