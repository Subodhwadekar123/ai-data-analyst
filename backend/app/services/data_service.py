"""
AI Data Analyst - Core Data Service
=======================================
Central service for loading, caching, and managing datasets in memory.
All analysis services depend on this service to access the raw DataFrame.
"""

import os
import uuid
import hashlib
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.config import settings
from app.utils.cache import analysis_cache
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

# In-memory DataFrame store: {dataset_id: pd.DataFrame}
_dataframe_store: Dict[str, pd.DataFrame] = {}

# In-memory Action Ledger: {dataset_id: [{"action": "drop_columns", "params": {...}}]}
_action_ledger_store: Dict[str, List[Dict[str, Any]]] = {}

class DataService:
    """
    Core service for dataset management.
    Handles loading CSV/Excel files into Pandas DataFrames
    and extracting fundamental dataset metadata.
    """

    # ── Loading ────────────────────────────────────────────────────────────────

    @staticmethod
    def load_dataset(file_path: str, file_type: str, dataset_id: str) -> pd.DataFrame:
        """
        Load a CSV or Excel file into a Pandas DataFrame and cache it.
        
        Args:
            file_path: Absolute path to the stored file
            file_type: 'csv', 'xlsx', or 'xls'
            dataset_id: Unique identifier for the dataset
        
        Returns:
            Loaded DataFrame
        """
        logger.info(f"Loading dataset {dataset_id} from {file_path}")

        if file_type == "csv":
            # Try common encodings in order
            for encoding in ["utf-8", "latin-1", "cp1252", "iso-8859-1"]:
                try:
                    df = pd.read_csv(
                        file_path,
                        encoding=encoding,
                        low_memory=False,
                        na_values=["NA", "N/A", "null", "NULL", "none", "None", "nan", "NaN", ""],
                    )
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise ValueError("Could not decode CSV file with any supported encoding.")
        elif file_type in ("xlsx", "xls"):
            df = pd.read_excel(file_path, na_values=["NA", "N/A", "null", "NULL", "none", "None"])
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        # Auto-detect datetime columns
        df = DataService._auto_detect_datetimes(df)

        # Store in memory
        _dataframe_store[dataset_id] = df
        logger.info(f"Dataset {dataset_id} loaded: {df.shape[0]} rows × {df.shape[1]} cols")
        return df

    @staticmethod
    def get_dataframe(dataset_id: str) -> pd.DataFrame:
        """
        Retrieve a loaded DataFrame by dataset ID.
        Raises FileNotFoundError if not loaded.
        """
        if dataset_id not in _dataframe_store:
            from app.database import SessionLocal, DatasetRecord
            db = SessionLocal()
            try:
                record = db.query(DatasetRecord).filter(DatasetRecord.id == dataset_id).first()
                if record and os.path.exists(record.file_path):
                    logger.info(f"Auto-reloading dataset {dataset_id} from {record.file_path}")
                    DataService.load_dataset(record.file_path, record.file_type, dataset_id)
                else:
                    raise FileNotFoundError(f"Dataset {dataset_id} is not loaded in memory.")
            finally:
                db.close()
        return _dataframe_store[dataset_id]

    @staticmethod
    def update_dataframe(dataset_id: str, df: pd.DataFrame) -> None:
        """Update the in-memory DataFrame after cleaning operations."""
        _dataframe_store[dataset_id] = df
        analysis_cache.clear_dataset(dataset_id)
        logger.info(f"Dataset {dataset_id} updated: {df.shape[0]} rows × {df.shape[1]} cols")

    @staticmethod
    def remove_dataframe(dataset_id: str) -> None:
        """Remove a dataset from memory."""
        _dataframe_store.pop(dataset_id, None)
        _action_ledger_store.pop(dataset_id, None)
        analysis_cache.clear_dataset(dataset_id)

    @staticmethod
    def log_action(dataset_id: str, action_type: str, params: Dict[str, Any]) -> None:
        """Log a data manipulation action to the ledger."""
        if dataset_id not in _action_ledger_store:
            _action_ledger_store[dataset_id] = []
        _action_ledger_store[dataset_id].append({
            "action": action_type,
            "params": params,
            "timestamp": datetime.utcnow().isoformat()
        })

    @staticmethod
    def get_action_ledger(dataset_id: str) -> List[Dict[str, Any]]:
        """Get the full action ledger for a dataset."""
        return _action_ledger_store.get(dataset_id, [])

    # ── Auto-detection ─────────────────────────────────────────────────────────

    @staticmethod
    def _auto_detect_datetimes(df: pd.DataFrame) -> pd.DataFrame:
        """Attempt to parse string columns that look like dates."""
        for col in df.select_dtypes(include=["object"]).columns:
            # Heuristic: column name contains date-related keywords
            col_lower = col.lower()
            date_keywords = ["date", "time", "timestamp", "created", "updated", "at", "on"]
            if any(kw in col_lower for kw in date_keywords):
                try:
                    converted = pd.to_datetime(df[col], infer_datetime_format=True, errors="coerce")
                    # Only convert if at least 70% of non-null values parsed successfully
                    if converted.notna().sum() / max(df[col].notna().sum(), 1) >= 0.7:
                        df[col] = converted
                except Exception:
                    pass
        return df

    # ── Dataset Info ───────────────────────────────────────────────────────────

    @staticmethod
    def get_dataset_info(dataset_id: str) -> Dict[str, Any]:
        """
        Generate comprehensive metadata about the dataset.
        Results are cached to avoid recomputation.
        """
        cache_key = f"{dataset_id}:info"
        cached = analysis_cache.get(cache_key)
        if cached:
            return cached

        df = DataService.get_dataframe(dataset_id)
        info = DataService._compute_dataset_info(df)
        analysis_cache.set(cache_key, info)
        return info

    @staticmethod
    def _compute_dataset_info(df: pd.DataFrame) -> Dict[str, Any]:
        """Compute all dataset metadata from a DataFrame."""
        rows, cols = df.shape
        memory_bytes = df.memory_usage(deep=True).sum()

        # Column type categorization
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
        datetime_cols = df.select_dtypes(include=["datetime64"]).columns.tolist()
        bool_cols = df.select_dtypes(include=["bool"]).columns.tolist()

        # Missing values analysis
        missing_counts = df.isnull().sum()
        missing_pct = (missing_counts / rows * 100).round(2)
        missing_info = {
            col: {"count": int(missing_counts[col]), "percentage": float(missing_pct[col])}
            for col in df.columns
            if missing_counts[col] > 0
        }

        # Unique values per column
        unique_counts = {col: int(df[col].nunique()) for col in df.columns}

        # Column details
        column_details = []
        for col in df.columns:
            dtype = str(df[col].dtype)
            col_type = DataService._classify_column(col, df[col])
            column_details.append({
                "name": col,
                "dtype": dtype,
                "type_category": col_type,
                "missing_count": int(df[col].isnull().sum()),
                "missing_pct": round(df[col].isnull().sum() / rows * 100, 2),
                "unique_count": int(df[col].nunique()),
                "sample_values": DataService._safe_sample_values(df[col]),
            })

        # Target column suggestions (common target column names)
        target_suggestions = DataService._suggest_target_columns(df)

        # Duplicate rows
        duplicate_count = int(df.duplicated().sum())

        return {
            "rows": rows,
            "columns": cols,
            "shape": [rows, cols],
            "memory_usage_bytes": int(memory_bytes),
            "memory_usage_mb": round(memory_bytes / 1024 / 1024, 2),
            "duplicate_rows": duplicate_count,
            "duplicate_percentage": round(duplicate_count / rows * 100, 2) if rows > 0 else 0,
            "missing_values_total": int(missing_counts.sum()),
            "missing_columns": len(missing_info),
            "column_types": {
                "numeric": numeric_cols,
                "categorical": categorical_cols,
                "datetime": datetime_cols,
                "boolean": bool_cols,
            },
            "missing_info": missing_info,
            "unique_counts": unique_counts,
            "column_details": column_details,
            "target_suggestions": target_suggestions,
            "has_datetime": len(datetime_cols) > 0,
            "is_time_series": len(datetime_cols) > 0,
            "completeness_score": round(
                (1 - missing_counts.sum() / (rows * cols)) * 100, 2
            ) if rows * cols > 0 else 100,
        }

    @staticmethod
    def _classify_column(col_name: str, series: pd.Series) -> str:
        """Classify a column into a semantic type category."""
        dtype = series.dtype
        if pd.api.types.is_datetime64_any_dtype(dtype):
            return "datetime"
        elif pd.api.types.is_bool_dtype(dtype):
            return "boolean"
        elif pd.api.types.is_numeric_dtype(dtype):
            n_unique = series.nunique()
            if n_unique <= 10 and n_unique / max(series.count(), 1) < 0.05:
                return "categorical_numeric"
            return "numeric"
        elif pd.api.types.is_object_dtype(dtype):
            n_unique = series.nunique()
            n_total = series.count()
            if n_unique / max(n_total, 1) > 0.9:
                return "id_or_text"
            elif n_unique <= 20:
                return "categorical"
            else:
                return "text"
        return "unknown"

    @staticmethod
    def _safe_sample_values(series: pd.Series, n: int = 5) -> List:
        """Extract sample non-null values from a series."""
        non_null = series.dropna()
        sample = non_null.head(n).tolist()
        # Convert numpy types to Python native for JSON serialization
        return [
            v.isoformat() if hasattr(v, "isoformat") else
            int(v) if isinstance(v, (np.integer,)) else
            float(v) if isinstance(v, (np.floating,)) else
            str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v
            for v in sample
        ]

    @staticmethod
    def _suggest_target_columns(df: pd.DataFrame) -> List[str]:
        """
        Heuristically suggest likely target (label) columns.
        Looks for common naming patterns and low-cardinality numeric columns.
        """
        target_keywords = [
            "target", "label", "class", "output", "result", "predict",
            "churn", "fraud", "default", "survived", "price", "sales",
            "revenue", "profit", "score", "rating", "outcome", "y",
        ]
        suggestions = []
        for col in df.columns:
            col_lower = col.lower()
            if any(kw in col_lower for kw in target_keywords):
                suggestions.append(col)

        # Also suggest last column if it's numeric/binary and not already in list
        last_col = df.columns[-1]
        if last_col not in suggestions and (
            pd.api.types.is_numeric_dtype(df[last_col]) or
            df[last_col].nunique() <= 20
        ):
            suggestions.append(last_col)

        return list(dict.fromkeys(suggestions))[:5]  # Deduplicate, max 5

    # ── Preview ─────────────────────────────────────────────────────────────────

    @staticmethod
    def get_preview(dataset_id: str, rows: int = 20) -> Dict[str, Any]:
        """Return first N rows as JSON-serializable data."""
        df = DataService.get_dataframe(dataset_id)
        preview_df = df.head(rows)

        # Convert to records, handling NaN/Inf
        records = DataService._df_to_records(preview_df)

        return {
            "columns": list(df.columns),
            "dtypes": {col: str(df[col].dtype) for col in df.columns},
            "records": records,
            "total_rows": len(df),
            "preview_rows": len(preview_df),
        }

    @staticmethod
    def _df_to_records(df: pd.DataFrame) -> List[Dict]:
        """Convert DataFrame to JSON-safe list of records."""
        records = []
        for _, row in df.iterrows():
            record = {}
            for col, val in row.items():
                if pd.isna(val) if not isinstance(val, (list, dict)) else False:
                    record[col] = None
                elif isinstance(val, (np.integer,)):
                    record[col] = int(val)
                elif isinstance(val, (np.floating,)):
                    record[col] = None if np.isinf(val) else float(val)
                elif isinstance(val, (np.bool_,)):
                    record[col] = bool(val)
                elif hasattr(val, "isoformat"):
                    record[col] = val.isoformat()
                else:
                    record[col] = val
            records.append(record)
        return records
