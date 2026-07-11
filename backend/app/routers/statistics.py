"""
AI Data Analyst - Statistics Router
======================================
Endpoints for statistical analysis and hypothesis testing.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.stats_service import StatisticsService
from app.services.data_service import DataService
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)


class TTestRequest(BaseModel):
    column: str
    group_column: str
    group_a: str
    group_b: str


@router.get("/statistics/{dataset_id}", summary="Full Statistical Analysis")
def full_statistics(dataset_id: str):
    """Run complete statistical analysis including descriptive stats and hypothesis tests."""
    try:
        return StatisticsService.full_statistics(dataset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics/{dataset_id}/descriptive", summary="Descriptive Statistics")
def descriptive_stats(dataset_id: str):
    """Get descriptive statistics for all numeric columns."""
    df = DataService.get_dataframe(dataset_id)
    return StatisticsService.descriptive_stats(df)


@router.get("/statistics/{dataset_id}/correlation-matrix", summary="Correlation Matrix")
def correlation_matrix(dataset_id: str):
    """Get Pearson, Spearman correlation matrices."""
    df = DataService.get_dataframe(dataset_id)
    return StatisticsService.correlation_matrix(df)


@router.get("/statistics/{dataset_id}/normality-tests", summary="Normality Tests")
def normality_tests(dataset_id: str):
    """Run Shapiro-Wilk, D'Agostino, and KS normality tests."""
    df = DataService.get_dataframe(dataset_id)
    return StatisticsService.normality_tests(df)


@router.get("/statistics/{dataset_id}/confidence-intervals", summary="Confidence Intervals")
def confidence_intervals(dataset_id: str, confidence: float = 0.95):
    """Compute confidence intervals for all numeric column means."""
    df = DataService.get_dataframe(dataset_id)
    return StatisticsService.confidence_intervals(df, confidence=confidence)


@router.post("/statistics/{dataset_id}/ttest", summary="T-Test")
def run_ttest(dataset_id: str, request: TTestRequest):
    """Run a two-sample t-test between two groups."""
    try:
        return StatisticsService.run_ttest(
            dataset_id=dataset_id,
            column=request.column,
            group_column=request.group_column,
            group_a=request.group_a,
            group_b=request.group_b,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics/{dataset_id}/hypothesis-tests", summary="Automated Hypothesis Tests")
def hypothesis_tests(dataset_id: str):
    """Run automated T-tests, ANOVA, and Chi-square tests."""
    df = DataService.get_dataframe(dataset_id)
    return StatisticsService.automated_hypothesis_tests(df)
