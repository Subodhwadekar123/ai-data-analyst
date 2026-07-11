"""
AI Data Analyst - Analysis Router
=====================================
Endpoints for EDA and dataset analysis.
"""

from fastapi import APIRouter, HTTPException
from app.services.eda_service import EDAService
from app.services.data_service import DataService
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)


@router.get("/analysis/{dataset_id}/eda", summary="Full EDA")
def full_eda(dataset_id: str):
    """Run complete exploratory data analysis on the dataset."""
    try:
        return EDAService.full_eda(dataset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/{dataset_id}/summary", summary="Summary Report")
def summary_report(dataset_id: str):
    """Get descriptive statistics summary."""
    df = DataService.get_dataframe(dataset_id)
    return EDAService.summary_report(df)


@router.get("/analysis/{dataset_id}/distributions", summary="Distribution Analysis")
def distributions(dataset_id: str):
    """Get distribution analysis for all numeric columns."""
    df = DataService.get_dataframe(dataset_id)
    return EDAService.distribution_analysis(df)


@router.get("/analysis/{dataset_id}/correlations", summary="Correlation Report")
def correlations(dataset_id: str):
    """Get correlation analysis and top correlated pairs."""
    df = DataService.get_dataframe(dataset_id)
    return EDAService.correlation_report(df)


@router.get("/analysis/{dataset_id}/missing-values", summary="Missing Value Report")
def missing_values(dataset_id: str):
    """Get detailed missing value analysis with recommendations."""
    df = DataService.get_dataframe(dataset_id)
    return EDAService.missing_value_report(df)


@router.get("/analysis/{dataset_id}/outliers", summary="Outlier Report")
def outlier_report(dataset_id: str):
    """Get outlier detection results using IQR and Z-score methods."""
    df = DataService.get_dataframe(dataset_id)
    return EDAService.outlier_report(df)


@router.get("/analysis/{dataset_id}/feature-insights", summary="Feature Insights")
def feature_insights(dataset_id: str):
    """Get automated feature-level insights and recommendations."""
    df = DataService.get_dataframe(dataset_id)
    return EDAService.feature_insights(df)


@router.get("/analysis/{dataset_id}/quality-score", summary="Data Quality Score")
def quality_score(dataset_id: str):
    """Get overall data quality score with breakdown."""
    df = DataService.get_dataframe(dataset_id)
    return EDAService.data_quality_score(df)
