"""
AI Data Analyst - Upload Router
==================================
Handles file upload, storage, and initial dataset registration.
Endpoints:
  POST /upload          — Upload a CSV or Excel file
  GET  /datasets        — List all uploaded datasets
  GET  /datasets/{id}   — Get dataset metadata
  GET  /datasets/{id}/preview  — Get first N rows
  DELETE /datasets/{id} — Delete a dataset
"""

import os
import uuid
import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from pydantic import BaseModel
import httpx

from app.database import get_db, DatasetRecord, UserRecord
from app.services.data_service import DataService
from app.utils.validators import validate_upload_file
from app.utils.logger import setup_logger
from app.config import settings
from app.routers.auth_deps import get_current_user

router = APIRouter()
logger = setup_logger(__name__)

class URLUploadRequest(BaseModel):
    url: str

async def _process_dataset(
    file_content: bytes,
    original_filename: str,
    ext: str,
    current_user: UserRecord,
    db: Session
):
    """Core logic for saving, loading, and recording a dataset."""
    file_size = len(file_content)

    # ── Generate unique ID and safe filename ──────────────────────────────────
    dataset_id = str(uuid.uuid4())
    stored_filename = f"{dataset_id}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

    # ── Save to disk ──────────────────────────────────────────────────────────
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_content)
    logger.info(f"Saved file: {stored_filename} ({file_size / 1024:.1f} KB)")

    # ── Load into Pandas ──────────────────────────────────────────────────────
    try:
        df = DataService.load_dataset(file_path, ext, dataset_id)
    except Exception as e:
        # Clean up saved file if loading fails
        os.remove(file_path)
        logger.error(f"Failed to load dataset: {e}")
        raise HTTPException(status_code=422, detail=f"Could not parse file: {str(e)}")

    rows, cols = df.shape
    memory_mb = round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2)

    # ── Save metadata to DB ───────────────────────────────────────────────────
    record = DatasetRecord(
        id=dataset_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_path=file_path,
        file_size_bytes=file_size,
        file_type=ext,
        rows=rows,
        columns=cols,
        memory_usage_mb=memory_mb,
        status="uploaded",
        user_id=current_user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # ── Return response ───────────────────────────────────────────────────────
    dataset_info = DataService.get_dataset_info(dataset_id)
    preview = DataService.get_preview(dataset_id, rows=20)

    logger.info(f"Dataset {dataset_id} uploaded successfully: {rows}×{cols}")
    return {
        "success": True,
        "id": dataset_id,
        "dataset_id": dataset_id,
        "filename": original_filename,
        "file_size_mb": round(file_size / 1024 / 1024, 2),
        "file_type": ext,
        "dataset_info": dataset_info,
        "preview": preview,
    }


@router.post("/upload", summary="Upload Dataset")
async def upload_dataset(
    file: UploadFile = File(..., description="CSV or Excel file to analyze"),
    db: Session = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
):
    """
    Upload a CSV or Excel file for analysis.
    """
    # ── Validate ──────────────────────────────────────────────────────────────
    ext = await validate_upload_file(file)
    file_content = await file.read()
    return await _process_dataset(file_content, file.filename, ext, current_user, db)


@router.post("/upload/url", summary="Upload Dataset from URL")
async def upload_dataset_from_url(
    req: URLUploadRequest,
    db: Session = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
):
    """
    Fetch a CSV or Excel file from a public URL.
    """
    url = req.url
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid URL protocol.")
        
    # Infer extension from URL or assume CSV
    ext = "csv"
    if ".xlsx" in url.lower():
        ext = "xlsx"
    elif ".json" in url.lower():
        ext = "json"
        
    original_filename = url.split("/")[-1].split("?")[0]
    if not original_filename or "." not in original_filename:
        original_filename = f"dataset.{ext}"

    logger.info(f"Fetching dataset from URL: {url}")
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            file_content = response.content
    except httpx.RequestError as e:
        logger.error(f"Error fetching URL {url}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error {e.response.status_code} fetching URL {url}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL, server returned {e.response.status_code}")
        
    # Add a sanity check for file size (e.g. max 50MB)
    if len(file_content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File from URL is too large (max 50MB).")

    return await _process_dataset(file_content, original_filename, ext, current_user, db)

@router.get("/datasets", summary="List All Datasets")
def list_datasets(
    db: Session = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
):
    """Return a list of all uploaded datasets."""
    records = db.query(DatasetRecord).filter(DatasetRecord.user_id == current_user.id).order_by(DatasetRecord.created_at.desc()).all()
    return {
        "datasets": [
            {
                "id": r.id,
                "filename": r.original_filename,
                "file_type": r.file_type,
                "rows": r.rows,
                "columns": r.columns,
                "file_size_mb": round(r.file_size_bytes / 1024 / 1024, 2),
                "memory_mb": r.memory_usage_mb,
                "status": r.status,
                "created_at": r.created_at.isoformat(),
            }
            for r in records
        ],
        "total": len(records),
    }


@router.get("/datasets/{dataset_id}", summary="Get Dataset Info")
def get_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
):
    """Get metadata for a specific dataset."""
    record = db.query(DatasetRecord).filter(
        DatasetRecord.id == dataset_id,
        DatasetRecord.user_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Reload into memory if not cached (e.g., after server restart)
    try:
        DataService.get_dataframe(dataset_id)
    except FileNotFoundError:
        if os.path.exists(record.file_path):
            DataService.load_dataset(record.file_path, record.file_type, dataset_id)
        else:
            raise HTTPException(status_code=404, detail="Dataset file not found on disk")

    info = DataService.get_dataset_info(dataset_id)
    preview = DataService.get_preview(dataset_id, rows=20)
    return {
        "dataset_id": dataset_id,
        "filename": record.original_filename,
        "file_type": record.file_type,
        "status": record.status,
        "created_at": record.created_at.isoformat(),
        "dataset_info": info,
        "preview": preview,
    }


@router.get("/datasets/{dataset_id}/preview", summary="Preview Dataset")
def get_preview(
    dataset_id: str,
    rows: int = 20,
    db: Session = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
):
    """Return first N rows of the dataset as JSON."""
    if rows > 1000:
        rows = 1000  # Safety cap

    # Ensure dataset is in memory
    record = db.query(DatasetRecord).filter(
        DatasetRecord.id == dataset_id,
        DatasetRecord.user_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        DataService.get_dataframe(dataset_id)
    except FileNotFoundError:
        if os.path.exists(record.file_path):
            DataService.load_dataset(record.file_path, record.file_type, dataset_id)
        else:
            raise HTTPException(status_code=404, detail="Dataset file not found on disk")

    return DataService.get_preview(dataset_id, rows=rows)


@router.delete("/datasets/{dataset_id}", summary="Delete Dataset")
def delete_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
):
    """Delete a dataset from disk, memory, and database."""
    record = db.query(DatasetRecord).filter(
        DatasetRecord.id == dataset_id,
        DatasetRecord.user_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Remove from memory
    DataService.remove_dataframe(dataset_id)

    # Remove file from disk
    if os.path.exists(record.file_path):
        os.remove(record.file_path)
        logger.info(f"Deleted file: {record.file_path}")

    # Remove from DB
    db.delete(record)
    db.commit()

    return {"success": True, "message": f"Dataset '{record.original_filename}' deleted successfully"}
