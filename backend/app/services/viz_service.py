"""
AI Data Analyst - Visualization Service
==========================================
Generates chart data for all 20+ chart types.
Returns JSON-serializable data ready for Recharts/Plotly on the frontend.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

from app.services.data_service import DataService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class VizService:
    """Generates chart-ready data for all visualization types."""

    @staticmethod
    def _safe_val(v) -> Any:
        """Convert numpy types to JSON-safe Python types."""
        if pd.isna(v) if not isinstance(v, (list, dict)) else False:
            return None
        if isinstance(v, (np.integer,)):
            return int(v)
        if isinstance(v, (np.floating,)):
            return None if np.isinf(v) else float(v)
        if isinstance(v, (np.bool_,)):
            return bool(v)
        if hasattr(v, "isoformat"):
            return v.isoformat()
        return v

    # ── Histogram ──────────────────────────────────────────────────────────────

    @staticmethod
    def histogram(dataset_id: str, column: str, bins: int = 30) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found")
        series = df[column].dropna()
        counts, edges = np.histogram(series, bins=min(bins, 50))
        centers = [(edges[i] + edges[i + 1]) / 2 for i in range(len(counts))]
        return {
            "chart_type": "histogram",
            "column": column,
            "data": [{"x": round(float(c), 4), "count": int(cnt)} for c, cnt in zip(centers, counts)],
            "mean": float(series.mean()),
            "median": float(series.median()),
            "std": float(series.std()),
        }

    # ── Bar Chart ─────────────────────────────────────────────────────────────

    @staticmethod
    def bar_chart(dataset_id: str, x_col: str, y_col: Optional[str] = None, top_n: int = 20) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        if y_col and y_col in df.columns:
            data = df.groupby(x_col)[y_col].mean().reset_index().head(top_n)
            records = [{"x": str(row[x_col]), "y": VizService._safe_val(row[y_col])} for _, row in data.iterrows()]
        else:
            counts = df[x_col].value_counts().head(top_n)
            records = [{"x": str(k), "y": int(v)} for k, v in counts.items()]
        return {"chart_type": "bar", "x_col": x_col, "y_col": y_col or "count", "data": records}

    # ── Line Chart ────────────────────────────────────────────────────────────

    @staticmethod
    def line_chart(dataset_id: str, x_col: str, y_col: str) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        data = df[[x_col, y_col]].dropna().head(1000)
        records = [{"x": VizService._safe_val(row[x_col]), "y": VizService._safe_val(row[y_col])} for _, row in data.iterrows()]
        return {"chart_type": "line", "x_col": x_col, "y_col": y_col, "data": records}

    # ── Scatter Plot ──────────────────────────────────────────────────────────

    @staticmethod
    def scatter_plot(dataset_id: str, x_col: str, y_col: str, color_col: Optional[str] = None) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        cols = [x_col, y_col] + ([color_col] if color_col else [])
        data = df[cols].dropna().head(2000)
        records = []
        for _, row in data.iterrows():
            rec = {"x": VizService._safe_val(row[x_col]), "y": VizService._safe_val(row[y_col])}
            if color_col:
                rec["color"] = str(row[color_col])
            records.append(rec)
        return {"chart_type": "scatter", "x_col": x_col, "y_col": y_col, "color_col": color_col, "data": records}

    # ── Box Plot ──────────────────────────────────────────────────────────────

    @staticmethod
    def box_plot(dataset_id: str, column: str, group_col: Optional[str] = None) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        series = df[column].dropna()

        def box_stats(s: pd.Series, label: str = "") -> Dict:
            return {
                "label": label,
                "min": float(s.min()),
                "q1": float(s.quantile(0.25)),
                "median": float(s.median()),
                "q3": float(s.quantile(0.75)),
                "max": float(s.max()),
                "mean": float(s.mean()),
                "outliers": [float(v) for v in s[(s < s.quantile(0.25) - 1.5 * (s.quantile(0.75) - s.quantile(0.25))) | (s > s.quantile(0.75) + 1.5 * (s.quantile(0.75) - s.quantile(0.25)))][:50].tolist()],
            }

        if group_col and group_col in df.columns:
            groups = df[group_col].dropna().unique()[:10]
            boxes = [box_stats(df[df[group_col] == g][column].dropna(), str(g)) for g in groups]
        else:
            boxes = [box_stats(series, column)]

        return {"chart_type": "box", "column": column, "group_col": group_col, "data": boxes}

    # ── Pie Chart ─────────────────────────────────────────────────────────────

    @staticmethod
    def pie_chart(dataset_id: str, column: str, top_n: int = 10) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        counts = df[column].value_counts().head(top_n)
        total = counts.sum()
        data = [{"name": str(k), "value": int(v), "percentage": round(v / total * 100, 2)} for k, v in counts.items()]
        return {"chart_type": "pie", "column": column, "data": data}

    # ── Heatmap / Correlation Heatmap ─────────────────────────────────────────

    @staticmethod
    def correlation_heatmap(dataset_id: str) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.shape[1] < 2:
            raise ValueError("Need at least 2 numeric columns")
        if numeric_df.shape[1] > 25:
            numeric_df = numeric_df.iloc[:, :25]
        corr = numeric_df.corr().round(4)
        data = []
        cols = list(corr.columns)
        for i, row_label in enumerate(cols):
            for j, col_label in enumerate(cols):
                val = corr.iloc[i, j]
                data.append({"x": col_label, "y": row_label, "value": None if np.isnan(val) else float(val)})
        return {"chart_type": "heatmap", "columns": cols, "data": data}

    # ── Area Chart ───────────────────────────────────────────────────────────

    @staticmethod
    def area_chart(dataset_id: str, x_col: str, y_col: str) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        data = df[[x_col, y_col]].dropna().head(1000)
        records = [{"x": VizService._safe_val(row[x_col]), "y": VizService._safe_val(row[y_col])} for _, row in data.iterrows()]
        return {"chart_type": "area", "x_col": x_col, "y_col": y_col, "data": records}

    # ── Violin Plot ───────────────────────────────────────────────────────────

    @staticmethod
    def violin_plot(dataset_id: str, column: str, group_col: Optional[str] = None) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        series = df[column].dropna()

        def violin_data(s: pd.Series, label: str = "") -> Dict:
            sorted_s = sorted(s.tolist())
            return {
                "label": label,
                "values": [float(v) for v in sorted_s[:500]],
                "q1": float(s.quantile(0.25)),
                "median": float(s.median()),
                "q3": float(s.quantile(0.75)),
                "min": float(s.min()),
                "max": float(s.max()),
            }

        if group_col and group_col in df.columns:
            groups = df[group_col].dropna().unique()[:8]
            result = [violin_data(df[df[group_col] == g][column].dropna(), str(g)) for g in groups]
        else:
            result = [violin_data(series, column)]

        return {"chart_type": "violin", "column": column, "data": result}

    # ── Count Plot ────────────────────────────────────────────────────────────

    @staticmethod
    def count_plot(dataset_id: str, column: str, hue_col: Optional[str] = None) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        if hue_col and hue_col in df.columns:
            grouped = df.groupby([column, hue_col]).size().reset_index(name="count")
            data = [{"x": str(row[column]), "hue": str(row[hue_col]), "count": int(row["count"])} for _, row in grouped.iterrows()]
        else:
            counts = df[column].value_counts().head(20)
            data = [{"x": str(k), "count": int(v)} for k, v in counts.items()]
        return {"chart_type": "count", "column": column, "data": data}

    # ── Time Series Plot ──────────────────────────────────────────────────────

    @staticmethod
    def time_series(dataset_id: str, date_col: str, value_col: str) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        ts = df[[date_col, value_col]].dropna().copy()
        ts[date_col] = pd.to_datetime(ts[date_col], errors="coerce")
        ts = ts.dropna().sort_values(date_col)

        # Compute rolling average
        ts["rolling_avg"] = ts[value_col].rolling(window=7, min_periods=1).mean()

        records = [
            {
                "date": row[date_col].isoformat() if hasattr(row[date_col], "isoformat") else str(row[date_col]),
                "value": VizService._safe_val(row[value_col]),
                "rolling_avg": VizService._safe_val(row["rolling_avg"]),
            }
            for _, row in ts.head(2000).iterrows()
        ]
        return {"chart_type": "time_series", "date_col": date_col, "value_col": value_col, "data": records}

    # ── Bubble Chart ──────────────────────────────────────────────────────────

    @staticmethod
    def bubble_chart(dataset_id: str, x_col: str, y_col: str, size_col: str, color_col: Optional[str] = None) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        cols = [c for c in [x_col, y_col, size_col, color_col] if c]
        data = df[cols].dropna().head(500)

        # Normalize size
        size_series = data[size_col]
        size_min, size_max = size_series.min(), size_series.max()
        size_range = size_max - size_min if size_max != size_min else 1

        records = []
        for _, row in data.iterrows():
            rec = {
                "x": VizService._safe_val(row[x_col]),
                "y": VizService._safe_val(row[y_col]),
                "size": float(5 + 40 * (row[size_col] - size_min) / size_range),
            }
            if color_col:
                rec["color"] = str(row[color_col])
            records.append(rec)

        return {"chart_type": "bubble", "x_col": x_col, "y_col": y_col, "size_col": size_col, "data": records}

    # ── Treemap Data ──────────────────────────────────────────────────────────

    @staticmethod
    def treemap(dataset_id: str, label_col: str, value_col: str) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        grouped = df.groupby(label_col)[value_col].sum().reset_index().head(30)
        data = [{"name": str(row[label_col]), "value": VizService._safe_val(row[value_col])} for _, row in grouped.iterrows()]
        data.sort(key=lambda x: x["value"] or 0, reverse=True)
        return {"chart_type": "treemap", "label_col": label_col, "value_col": value_col, "data": data}

    # ── Funnel Chart ──────────────────────────────────────────────────────────

    @staticmethod
    def funnel(dataset_id: str, stage_col: str, value_col: str) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        grouped = df.groupby(stage_col)[value_col].sum().reset_index()
        grouped = grouped.sort_values(value_col, ascending=False).head(10)
        data = [{"stage": str(row[stage_col]), "value": VizService._safe_val(row[value_col])} for _, row in grouped.iterrows()]
        return {"chart_type": "funnel", "stage_col": stage_col, "value_col": value_col, "data": data}

    # ── 3D Scatter ────────────────────────────────────────────────────────────

    @staticmethod
    def scatter_3d(dataset_id: str, x_col: str, y_col: str, z_col: str, color_col: Optional[str] = None) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        cols = [x_col, y_col, z_col] + ([color_col] if color_col else [])
        data = df[cols].dropna().head(1000)
        records = []
        for _, row in data.iterrows():
            rec = {
                "x": VizService._safe_val(row[x_col]),
                "y": VizService._safe_val(row[y_col]),
                "z": VizService._safe_val(row[z_col]),
            }
            if color_col:
                rec["color"] = str(row[color_col])
            records.append(rec)
        return {"chart_type": "scatter_3d", "x_col": x_col, "y_col": y_col, "z_col": z_col, "data": records}

    # ── Pair Plot Data ────────────────────────────────────────────────────────

    @staticmethod
    def pair_plot(dataset_id: str, columns: Optional[List[str]] = None, max_cols: int = 5) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cols = columns or numeric_cols[:max_cols]
        cols = [c for c in cols if c in df.columns][:max_cols]

        pairs = []
        sample = df[cols].dropna().sample(min(500, len(df)), random_state=42)

        for i, col1 in enumerate(cols):
            for j, col2 in enumerate(cols):
                if i != j:
                    data = [{"x": VizService._safe_val(row[col1]), "y": VizService._safe_val(row[col2])} for _, row in sample.iterrows()]
                    pairs.append({"x_col": col1, "y_col": col2, "data": data})

        return {"chart_type": "pair_plot", "columns": cols, "pairs": pairs}

    # ── Bubble Map ────────────────────────────────────────────────────────────

    @staticmethod
    def bubble_map(dataset_id: str, location_col: str, size_col: str) -> Dict[str, Any]:
        df = DataService.get_dataframe(dataset_id)
        if location_col not in df.columns or size_col not in df.columns:
            raise ValueError(f"Columns '{location_col}' and/or '{size_col}' not found")
        
        # Group by location and sum the size
        data = df.groupby(location_col)[size_col].sum().reset_index()
        data = data.dropna(subset=[location_col])
        
        records = [{"location": str(row[location_col]), "size": VizService._safe_val(row[size_col])} for _, row in data.iterrows()]
        
        return {"chart_type": "bubblemap", "location_col": location_col, "size_col": size_col, "data": records}
