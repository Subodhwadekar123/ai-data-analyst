"""
AI Data Analyst - File Validators
===================================
Validates uploaded files for security and compatibility.
"""

import os
from fastapi import HTTPException, UploadFile
from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

MAGIC_BYTES = {
    "csv": [],  # No magic bytes; validated by extension + content
    "xlsx": [b"PK\x03\x04"],  # ZIP-based format
    "xls": [b"\xd0\xcf\x11\xe0"],  # OLE2 format
}


async def validate_upload_file(file: UploadFile) -> str:
    """
    Validate an uploaded file for extension, size, and basic integrity.
    
    Args:
        file: The UploadFile object from FastAPI
    
    Returns:
        The detected file extension (csv, xlsx, xls)
    
    Raises:
        HTTPException: If validation fails
    """
    # ── Extension Check ───────────────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in settings.allowed_extensions_list:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '.{ext}'. Allowed: {', '.join(settings.allowed_extensions_list)}",
        )

    # ── Size Check (read first chunk) ─────────────────────────────────────────
    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if file_size > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({file_size / 1e6:.1f} MB). Maximum allowed: {settings.MAX_FILE_SIZE_MB} MB.",
        )

    # ── Magic Bytes Check (for binary formats) ─────────────────────────────────
    if ext in MAGIC_BYTES and MAGIC_BYTES[ext]:
        is_valid_magic = any(content.startswith(magic) for magic in MAGIC_BYTES[ext])
        if not is_valid_magic:
            raise HTTPException(
                status_code=400,
                detail=f"File content does not match the expected format for .{ext}",
            )

    # ── Reset file position for subsequent reads ──────────────────────────────
    await file.seek(0)

    logger.info(f"File validated: {file.filename} ({file_size / 1024:.1f} KB)")
    return ext
