"""
AI Data Analyst - Visualization Router
=========================================
Endpoints for all chart types.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.services.viz_service import VizService
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)


def _handle(func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/viz/{dataset_id}/histogram/{column}")
def histogram(dataset_id: str, column: str, bins: int = 30):
    return _handle(VizService.histogram, dataset_id, column, bins)


@router.get("/viz/{dataset_id}/bar/{x_col}")
def bar_chart(dataset_id: str, x_col: str, y_col: Optional[str] = None, top_n: int = 20):
    return _handle(VizService.bar_chart, dataset_id, x_col, y_col, top_n)


@router.get("/viz/{dataset_id}/line/{x_col}/{y_col}")
def line_chart(dataset_id: str, x_col: str, y_col: str):
    return _handle(VizService.line_chart, dataset_id, x_col, y_col)


@router.get("/viz/{dataset_id}/scatter/{x_col}/{y_col}")
def scatter_plot(dataset_id: str, x_col: str, y_col: str, color_col: Optional[str] = None):
    return _handle(VizService.scatter_plot, dataset_id, x_col, y_col, color_col)


@router.get("/viz/{dataset_id}/box/{column}")
def box_plot(dataset_id: str, column: str, group_col: Optional[str] = None):
    return _handle(VizService.box_plot, dataset_id, column, group_col)


@router.get("/viz/{dataset_id}/pie/{column}")
def pie_chart(dataset_id: str, column: str, top_n: int = 10):
    return _handle(VizService.pie_chart, dataset_id, column, top_n)


@router.get("/viz/{dataset_id}/heatmap")
def correlation_heatmap(dataset_id: str):
    return _handle(VizService.correlation_heatmap, dataset_id)


@router.get("/viz/{dataset_id}/area/{x_col}/{y_col}")
def area_chart(dataset_id: str, x_col: str, y_col: str):
    return _handle(VizService.area_chart, dataset_id, x_col, y_col)


@router.get("/viz/{dataset_id}/violin/{column}")
def violin_plot(dataset_id: str, column: str, group_col: Optional[str] = None):
    return _handle(VizService.violin_plot, dataset_id, column, group_col)


@router.get("/viz/{dataset_id}/count/{column}")
def count_plot(dataset_id: str, column: str, hue_col: Optional[str] = None):
    return _handle(VizService.count_plot, dataset_id, column, hue_col)


@router.get("/viz/{dataset_id}/timeseries/{date_col}/{value_col}")
def time_series(dataset_id: str, date_col: str, value_col: str):
    return _handle(VizService.time_series, dataset_id, date_col, value_col)


@router.get("/viz/{dataset_id}/bubble/{x_col}/{y_col}/{size_col}")
def bubble_chart(dataset_id: str, x_col: str, y_col: str, size_col: str, color_col: Optional[str] = None):
    return _handle(VizService.bubble_chart, dataset_id, x_col, y_col, size_col, color_col)


@router.get("/viz/{dataset_id}/treemap/{label_col}/{value_col}")
def treemap(dataset_id: str, label_col: str, value_col: str):
    return _handle(VizService.treemap, dataset_id, label_col, value_col)


@router.get("/viz/{dataset_id}/funnel/{stage_col}/{value_col}")
def funnel(dataset_id: str, stage_col: str, value_col: str):
    return _handle(VizService.funnel, dataset_id, stage_col, value_col)


@router.get("/viz/{dataset_id}/scatter3d/{x_col}/{y_col}/{z_col}")
def scatter_3d(dataset_id: str, x_col: str, y_col: str, z_col: str, color_col: Optional[str] = None):
    return _handle(VizService.scatter_3d, dataset_id, x_col, y_col, z_col, color_col)


@router.get("/viz/{dataset_id}/pairplot")
def pair_plot(dataset_id: str, columns: Optional[str] = None, max_cols: int = 5):
    cols = columns.split(",") if columns else None
    return _handle(VizService.pair_plot, dataset_id, cols, max_cols)


@router.get("/viz/{dataset_id}/bubblemap/{location_col}/{size_col}")
def bubble_map(dataset_id: str, location_col: str, size_col: str):
    return _handle(VizService.bubble_map, dataset_id, location_col, size_col)

