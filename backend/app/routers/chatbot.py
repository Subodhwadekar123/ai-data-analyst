"""
AI Data Analyst - Chatbot Router
=================================
Endpoints for the real-estate intelligent chatbot assistant.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from app.database import get_db, UserRecord
from app.routers.auth_deps import get_current_user
from app.services.property_service import PropertyService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


class ChatQueryRequest(BaseModel):
    question: str
    history: List[Dict[str, str]] = []


@router.post("/chatbot/query", summary="Query the Real-Estate Chatbot")
def query_properties_chatbot(
    req: ChatQueryRequest,
    current_user: UserRecord = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits a natural-language search query to the property assistant.
    Maintains conversational memory and enforces RBAC contact details restrictions.
    """
    if not req.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    try:
        # Enforce role logic
        user_role = current_user.role or "user"
        logger.info(f"User {current_user.email} (role: {user_role}) asked: {req.question}")

        result = PropertyService.query_chatbot(
            db=db,
            question=req.question,
            history=req.history,
            user_role=user_role
        )
        return result
    except Exception as e:
        logger.error(f"Chatbot query error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chatbot failed to process request: {str(e)}"
        )


@router.get("/properties/metadata", summary="Get Property Dataset Metadata")
def get_user_properties_metadata(
    current_user: UserRecord = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves info on the current properties dataset (like updated timestamp).
    Accessible to all authenticated users.
    """
    meta = PropertyService.get_metadata(db)
    if not meta:
        return {"filename": None, "row_count": 0, "uploaded_by": None, "updated_at": None}
    return meta
