"""
AI Data Analyst - AI Insights Router
========================================
Endpoints for AI-powered insights, Q&A, and data dictionary.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_service import AIService
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)


class QuestionRequest(BaseModel):
    question: str


@router.get("/ai/{dataset_id}/insights", summary="Generate Auto Insights")
def auto_insights(dataset_id: str):
    """Generate comprehensive AI-powered insights about the dataset."""
    try:
        return AIService.generate_auto_insights(dataset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        logger.error(f"AI insights error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/{dataset_id}/ask", summary="Ask a Question")
def ask_question(dataset_id: str, req: QuestionRequest):
    """Answer a natural language question about the dataset."""
    try:
        return AIService.answer_question(dataset_id, req.question)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ai/{dataset_id}/data-dictionary", summary="Generate Data Dictionary")
def data_dictionary(dataset_id: str):
    """Generate an automatic data dictionary with column descriptions."""
    try:
        return AIService.generate_data_dictionary(dataset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
