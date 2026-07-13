"""
AI Data Analyst - Cleaning Router
=====================================
Endpoints for all data cleaning operations.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Any
from app.services.cleaning_service import CleaningService
from app.services.data_service import DataService
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)


class MissingValuesRequest(BaseModel):
    strategy: str  # drop_rows | drop_cols | fill_mean | fill_median | fill_mode | fill_constant | interpolate
    columns: Optional[List[str]] = None
    fill_value: Optional[Any] = None


class RenameRequest(BaseModel):
    rename_map: dict


class DropColumnsRequest(BaseModel):
    columns: List[str]


class ConvertDtypeRequest(BaseModel):
    column: str
    target_dtype: str


class OutlierRequest(BaseModel):
    column: str
    method: str = "iqr"        # iqr | zscore
    strategy: str = "remove"   # remove | cap | replace_mean | replace_median
    threshold: float = 1.5


class NormalizeRequest(BaseModel):
    method: str = "minmax"     # minmax | zscore | robust
    columns: Optional[List[str]] = None


class EncodeRequest(BaseModel):
    column: str
    method: str = "label"      # label | onehot | ordinal
    categories: Optional[List[str]] = None


class SkewnessRequest(BaseModel):
    column: str
    method: str = "log"        # log | sqrt | boxcox | yeo_johnson


@router.post("/cleaning/{dataset_id}/missing-values")
def handle_missing_values(dataset_id: str, req: MissingValuesRequest):
    try:
        res = CleaningService.handle_missing_values(dataset_id, req.strategy, req.columns, req.fill_value)
        DataService.log_action(dataset_id, "missing_values", req.dict())
        return res
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cleaning/{dataset_id}/remove-duplicates")
def remove_duplicates(dataset_id: str, subset: Optional[List[str]] = None):
    res = CleaningService.remove_duplicates(dataset_id, subset)
    DataService.log_action(dataset_id, "remove_duplicates", {"subset": subset})
    return res


@router.post("/cleaning/{dataset_id}/rename-columns")
def rename_columns(dataset_id: str, req: RenameRequest):
    res = CleaningService.rename_columns(dataset_id, req.rename_map)
    DataService.log_action(dataset_id, "rename_columns", req.dict())
    return res


@router.post("/cleaning/{dataset_id}/drop-columns")
def drop_columns(dataset_id: str, req: DropColumnsRequest):
    res = CleaningService.drop_columns(dataset_id, req.columns)
    DataService.log_action(dataset_id, "drop_columns", req.dict())
    return res


@router.post("/cleaning/{dataset_id}/convert-dtype")
def convert_dtype(dataset_id: str, req: ConvertDtypeRequest):
    try:
        res = CleaningService.convert_dtype(dataset_id, req.column, req.target_dtype)
        DataService.log_action(dataset_id, "convert_dtype", req.dict())
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cleaning/{dataset_id}/handle-outliers")
def handle_outliers(dataset_id: str, req: OutlierRequest):
    try:
        res = CleaningService.handle_outliers(dataset_id, req.column, req.method, req.strategy, req.threshold)
        DataService.log_action(dataset_id, "handle_outliers", req.dict())
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cleaning/{dataset_id}/normalize")
def normalize(dataset_id: str, req: NormalizeRequest):
    try:
        res = CleaningService.normalize(dataset_id, req.columns, req.method)
        DataService.log_action(dataset_id, "normalize", req.dict())
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cleaning/{dataset_id}/encode")
def encode_column(dataset_id: str, req: EncodeRequest):
    try:
        res = CleaningService.encode_column(dataset_id, req.column, req.method, req.categories)
        DataService.log_action(dataset_id, "encode_column", req.dict())
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cleaning/{dataset_id}/handle-skewness")
def handle_skewness(dataset_id: str, req: SkewnessRequest):
    try:
        res = CleaningService.handle_skewness(dataset_id, req.column, req.method)
        DataService.log_action(dataset_id, "handle_skewness", req.dict())
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cleaning/{dataset_id}/remove-constants")
def remove_constant_features(dataset_id: str):
    res = CleaningService.remove_constant_features(dataset_id)
    DataService.log_action(dataset_id, "remove_constants", {})
    return res


@router.get("/cleaning/{dataset_id}/export")
def export_cleaned(dataset_id: str, format: str = "csv"):
    """Download the cleaned dataset."""
    try:
        file_path = CleaningService.export_cleaned(dataset_id, format)
        media_types = {"csv": "text/csv", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "json": "application/json"}
        return FileResponse(
            file_path,
            media_type=media_types.get(format, "application/octet-stream"),
            filename=f"cleaned_dataset.{format}",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
