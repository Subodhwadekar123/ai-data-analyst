"""
AI Data Analyst - ML Router
==============================
Endpoints for machine learning model training and evaluation.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.ml_service import MLService
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)


class TrainRequest(BaseModel):
    target_column: str
    algorithm: str
    feature_columns: Optional[List[str]] = None
    test_size: float = 0.2
    n_clusters: int = 3


class CompareRequest(BaseModel):
    target_column: str
    algorithms: List[str]
    test_size: float = 0.2


@router.get("/ml/{dataset_id}/detect-problem/{target_column}", summary="Detect Problem Type")
def detect_problem(dataset_id: str, target_column: str):
    """Auto-detect whether the problem is regression, classification, or clustering."""
    try:
        return MLService.detect_problem_type(dataset_id, target_column)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")


@router.post("/ml/{dataset_id}/train", summary="Train Model")
def train_model(dataset_id: str, req: TrainRequest):
    """Train an ML model and return evaluation metrics."""
    try:
        return MLService.train_model(
            dataset_id=dataset_id,
            target_column=req.target_column,
            algorithm=req.algorithm,
            feature_columns=req.feature_columns,
            test_size=req.test_size,
            n_clusters=req.n_clusters,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        logger.error(f"ML training error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.post("/ml/{dataset_id}/compare", summary="Compare Models")
def compare_models(dataset_id: str, req: CompareRequest):
    """Train and compare multiple ML models."""
    try:
        return MLService.compare_models(
            dataset_id=dataset_id,
            target_column=req.target_column,
            algorithms=req.algorithms,
            test_size=req.test_size,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
