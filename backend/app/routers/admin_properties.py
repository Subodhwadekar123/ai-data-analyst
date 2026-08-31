"""
AI Data Analyst - Admin Properties Router
==========================================
Endpoints for administrator actions to upload and process real-estate property spreadsheets.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db, UserRecord
from app.routers.auth_deps import get_current_admin
from app.services.property_service import PropertyService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.post("/admin/properties/upload", summary="Upload Properties Excel File")
async def upload_properties(
    file: UploadFile = File(...),
    current_admin: UserRecord = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Ingests and parses a properties spreadsheet (Excel format).
    Replaces the active dataset. Requires Admin role.
    """
    # Validate extension
    filename = file.filename or "dataset.xlsx"
    ext = filename.split(".")[-1].lower()
    if ext not in ["xlsx", "xls"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload an Excel file (.xlsx or .xls)."
        )

    try:
        content = await file.read()
        # Enforce size limits (e.g. 15MB)
        if len(content) > 15 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Spreadsheet size exceeds the 15MB file size limit."
            )

        logger.info(f"Admin {current_admin.email} is uploading properties file: {filename}")
        result = PropertyService.ingest_properties_excel(
            db=db,
            file_content=content,
            filename=filename,
            uploaded_by=current_admin.full_name or current_admin.email
        )
        return result
    except ValueError as e:
        logger.error(f"Validation error parsing Excel: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Internal error uploading properties Excel: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process properties file: {str(e)}"
        )


@router.get("/admin/properties/metadata", summary="Get Properties Ingestion Metadata")
def get_properties_metadata(
    current_admin: UserRecord = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieves information on the current loaded property spreadsheet.
    Requires Admin role.
    """
    meta = PropertyService.get_metadata(db)
    if not meta:
        return {"filename": None, "row_count": 0, "uploaded_by": None, "updated_at": None}
    return meta
