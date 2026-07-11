"""
AI Data Analyst - Data Cleaning Service
==========================================
Provides all data cleaning operations:
- Handle missing values (drop, fill mean/median/mode/interpolation)
- Remove duplicate rows
- Rename / drop columns
- Convert data types
- Outlier detection and removal
- Normalization and standardization
- Encoding (One-Hot, Label, Ordinal)
- Handle skewness (log, sqrt, Box-Cox transforms)
- Handle imbalanced data
"""

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.preprocessing import (
    MinMaxScaler, StandardScaler, RobustScaler,
    LabelEncoder, OrdinalEncoder,
)
from typing import Dict, Any, List, Optional

from app.services.data_service import DataService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class CleaningService:
    """Performs all data cleaning operations on in-memory DataFrames."""

    # ── Missing Value Handling ─────────────────────────────────────────────────

    @staticmethod
    def handle_missing_values(
        dataset_id: str,
        strategy: str,
        columns: Optional[List[str]] = None,
        fill_value: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Handle missing values in the dataset.
        
        Args:
            dataset_id: Dataset identifier
            strategy: 'drop_rows' | 'drop_cols' | 'fill_mean' | 'fill_median' |
                      'fill_mode' | 'fill_constant' | 'interpolate' | 'ffill' | 'bfill'
            columns: Specific columns to apply the operation (None = all)
            fill_value: Value to use when strategy is 'fill_constant'
        
        Returns:
            Operation result with before/after counts
        """
        df = DataService.get_dataframe(dataset_id).copy()
        target_cols = columns if columns else list(df.columns)

        before_missing = int(df[target_cols].isnull().sum().sum())
        before_rows = len(df)

        if strategy == "drop_rows":
            df = df.dropna(subset=target_cols)

        elif strategy == "drop_cols":
            df = df.drop(columns=target_cols)

        elif strategy == "fill_mean":
            for col in target_cols:
                if pd.api.types.is_numeric_dtype(df[col]):
                    df[col] = df[col].fillna(df[col].mean())

        elif strategy == "fill_median":
            for col in target_cols:
                if pd.api.types.is_numeric_dtype(df[col]):
                    df[col] = df[col].fillna(df[col].median())

        elif strategy == "fill_mode":
            for col in target_cols:
                mode_val = df[col].mode()
                if not mode_val.empty:
                    df[col] = df[col].fillna(mode_val.iloc[0])

        elif strategy == "fill_constant":
            for col in target_cols:
                df[col] = df[col].fillna(fill_value)

        elif strategy == "interpolate":
            for col in target_cols:
                if pd.api.types.is_numeric_dtype(df[col]):
                    df[col] = df[col].interpolate(method="linear", limit_direction="both")

        elif strategy == "ffill":
            df[target_cols] = df[target_cols].fillna(method="ffill")

        elif strategy == "bfill":
            df[target_cols] = df[target_cols].fillna(method="bfill")

        else:
            raise ValueError(f"Unknown missing value strategy: {strategy}")

        after_missing = int(df[target_cols].isnull().sum().sum()) if target_cols[0] in df.columns else 0
        after_rows = len(df)

        DataService.update_dataframe(dataset_id, df)
        logger.info(f"Missing values handled ({strategy}) for dataset {dataset_id}")

        return {
            "operation": "handle_missing_values",
            "strategy": strategy,
            "columns_affected": target_cols,
            "before_missing": before_missing,
            "after_missing": after_missing,
            "rows_removed": before_rows - after_rows,
            "shape": list(df.shape),
        }

    # ── Duplicate Rows ────────────────────────────────────────────────────────

    @staticmethod
    def remove_duplicates(dataset_id: str, subset: Optional[List[str]] = None) -> Dict[str, Any]:
        """Remove duplicate rows from the dataset."""
        df = DataService.get_dataframe(dataset_id).copy()
        before = len(df)
        df = df.drop_duplicates(subset=subset)
        after = len(df)
        DataService.update_dataframe(dataset_id, df)
        return {
            "operation": "remove_duplicates",
            "rows_before": before,
            "rows_after": after,
            "rows_removed": before - after,
            "shape": list(df.shape),
        }

    # ── Column Operations ─────────────────────────────────────────────────────

    @staticmethod
    def rename_columns(dataset_id: str, rename_map: Dict[str, str]) -> Dict[str, Any]:
        """Rename specified columns."""
        df = DataService.get_dataframe(dataset_id).copy()
        df = df.rename(columns=rename_map)
        DataService.update_dataframe(dataset_id, df)
        return {
            "operation": "rename_columns",
            "renamed": rename_map,
            "shape": list(df.shape),
        }

    @staticmethod
    def drop_columns(dataset_id: str, columns: List[str]) -> Dict[str, Any]:
        """Drop specified columns."""
        df = DataService.get_dataframe(dataset_id).copy()
        valid_cols = [c for c in columns if c in df.columns]
        df = df.drop(columns=valid_cols)
        DataService.update_dataframe(dataset_id, df)
        return {
            "operation": "drop_columns",
            "dropped": valid_cols,
            "shape": list(df.shape),
        }

    @staticmethod
    def convert_dtype(dataset_id: str, column: str, target_dtype: str) -> Dict[str, Any]:
        """Convert a column to a different data type."""
        df = DataService.get_dataframe(dataset_id).copy()
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found")

        original_dtype = str(df[column].dtype)
        try:
            if target_dtype == "datetime":
                df[column] = pd.to_datetime(df[column], errors="coerce")
            elif target_dtype == "numeric":
                df[column] = pd.to_numeric(df[column], errors="coerce")
            elif target_dtype == "string":
                df[column] = df[column].astype(str)
            elif target_dtype == "category":
                df[column] = df[column].astype("category")
            elif target_dtype == "integer":
                df[column] = pd.to_numeric(df[column], errors="coerce").astype("Int64")
            elif target_dtype == "float":
                df[column] = pd.to_numeric(df[column], errors="coerce").astype(float)
            elif target_dtype == "boolean":
                df[column] = df[column].map({"True": True, "False": False, "1": True, "0": False, True: True, False: False})
            else:
                raise ValueError(f"Unknown target dtype: {target_dtype}")
        except Exception as e:
            raise ValueError(f"Cannot convert '{column}' to {target_dtype}: {e}")

        DataService.update_dataframe(dataset_id, df)
        return {
            "operation": "convert_dtype",
            "column": column,
            "from_dtype": original_dtype,
            "to_dtype": target_dtype,
            "shape": list(df.shape),
        }

    # ── Outlier Handling ──────────────────────────────────────────────────────

    @staticmethod
    def handle_outliers(
        dataset_id: str,
        column: str,
        method: str = "iqr",
        strategy: str = "remove",
        threshold: float = 1.5,
    ) -> Dict[str, Any]:
        """
        Detect and handle outliers.
        
        Args:
            method: 'iqr' | 'zscore'
            strategy: 'remove' | 'cap' | 'replace_mean' | 'replace_median'
            threshold: IQR multiplier (default 1.5) or Z-score threshold (default 3)
        """
        df = DataService.get_dataframe(dataset_id).copy()
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found")

        series = df[column]
        before_rows = len(df)

        # Detect outlier mask
        if method == "iqr":
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lower = q1 - threshold * iqr
            upper = q3 + threshold * iqr
            outlier_mask = (series < lower) | (series > upper)
        elif method == "zscore":
            z_scores = np.abs(stats.zscore(series.dropna()))
            outlier_mask = pd.Series(False, index=series.index)
            non_null_idx = series.dropna().index
            outlier_mask.loc[non_null_idx] = z_scores > threshold
        else:
            raise ValueError(f"Unknown outlier method: {method}")

        n_outliers = int(outlier_mask.sum())

        # Apply strategy
        if strategy == "remove":
            df = df[~outlier_mask]
        elif strategy == "cap":
            df.loc[series < lower, column] = lower if method == "iqr" else series.mean() - threshold * series.std()
            df.loc[series > upper, column] = upper if method == "iqr" else series.mean() + threshold * series.std()
        elif strategy == "replace_mean":
            df.loc[outlier_mask, column] = series.mean()
        elif strategy == "replace_median":
            df.loc[outlier_mask, column] = series.median()
        else:
            raise ValueError(f"Unknown outlier strategy: {strategy}")

        DataService.update_dataframe(dataset_id, df)
        return {
            "operation": "handle_outliers",
            "column": column,
            "method": method,
            "strategy": strategy,
            "outliers_found": n_outliers,
            "rows_before": before_rows,
            "rows_after": len(df),
            "shape": list(df.shape),
        }

    # ── Normalization & Standardization ───────────────────────────────────────

    @staticmethod
    def normalize(
        dataset_id: str,
        columns: Optional[List[str]] = None,
        method: str = "minmax",
    ) -> Dict[str, Any]:
        """
        Normalize/standardize numeric columns.
        
        Args:
            method: 'minmax' (0-1) | 'zscore' (StandardScaler) | 'robust' (RobustScaler)
        """
        df = DataService.get_dataframe(dataset_id).copy()
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        target_cols = [c for c in (columns or numeric_cols) if c in numeric_cols]

        if not target_cols:
            raise ValueError("No numeric columns to normalize")

        if method == "minmax":
            scaler = MinMaxScaler()
        elif method == "zscore":
            scaler = StandardScaler()
        elif method == "robust":
            scaler = RobustScaler()
        else:
            raise ValueError(f"Unknown normalization method: {method}")

        df[target_cols] = scaler.fit_transform(df[target_cols])
        DataService.update_dataframe(dataset_id, df)

        return {
            "operation": "normalize",
            "method": method,
            "columns_normalized": target_cols,
            "shape": list(df.shape),
        }

    # ── Encoding ──────────────────────────────────────────────────────────────

    @staticmethod
    def encode_column(
        dataset_id: str,
        column: str,
        method: str = "label",
        categories: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Encode a categorical column.
        
        Args:
            method: 'label' | 'onehot' | 'ordinal'
            categories: Ordered categories list for ordinal encoding
        """
        df = DataService.get_dataframe(dataset_id).copy()
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found")

        new_columns = []

        if method == "label":
            le = LabelEncoder()
            df[f"{column}_encoded"] = le.fit_transform(df[column].astype(str))
            new_columns = [f"{column}_encoded"]

        elif method == "onehot":
            dummies = pd.get_dummies(df[column], prefix=column, drop_first=False)
            df = pd.concat([df, dummies], axis=1)
            new_columns = list(dummies.columns)

        elif method == "ordinal":
            if not categories:
                raise ValueError("categories list is required for ordinal encoding")
            oe = OrdinalEncoder(categories=[categories], handle_unknown="use_encoded_value", unknown_value=-1)
            df[f"{column}_ordinal"] = oe.fit_transform(df[[column]])
            new_columns = [f"{column}_ordinal"]

        else:
            raise ValueError(f"Unknown encoding method: {method}")

        DataService.update_dataframe(dataset_id, df)
        return {
            "operation": "encode_column",
            "column": column,
            "method": method,
            "new_columns": new_columns,
            "shape": list(df.shape),
        }

    # ── Handle Skewness ────────────────────────────────────────────────────────

    @staticmethod
    def handle_skewness(
        dataset_id: str,
        column: str,
        method: str = "log",
    ) -> Dict[str, Any]:
        """
        Apply transformations to reduce skewness.
        
        Args:
            method: 'log' | 'sqrt' | 'boxcox' | 'yeo_johnson'
        """
        df = DataService.get_dataframe(dataset_id).copy()
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found")

        series = df[column].dropna()
        before_skew = float(series.skew())

        if method == "log":
            if (series <= 0).any():
                # Shift to positive
                df[column] = np.log1p(df[column] - df[column].min() + 1)
            else:
                df[column] = np.log(df[column])

        elif method == "sqrt":
            df[column] = np.sqrt(np.abs(df[column]))

        elif method == "boxcox":
            positive_series = series[series > 0]
            if len(positive_series) < len(series):
                raise ValueError("Box-Cox requires strictly positive values")
            transformed, _ = stats.boxcox(series)
            df.loc[series.index, column] = transformed

        elif method == "yeo_johnson":
            from sklearn.preprocessing import PowerTransformer
            pt = PowerTransformer(method="yeo-johnson")
            df[[column]] = pt.fit_transform(df[[column]])

        else:
            raise ValueError(f"Unknown skewness method: {method}")

        after_skew = float(df[column].dropna().skew())
        DataService.update_dataframe(dataset_id, df)

        return {
            "operation": "handle_skewness",
            "column": column,
            "method": method,
            "before_skewness": before_skew,
            "after_skewness": after_skew,
            "improvement": round(abs(before_skew) - abs(after_skew), 4),
            "shape": list(df.shape),
        }

    # ── Remove Constant Features ──────────────────────────────────────────────

    @staticmethod
    def remove_constant_features(dataset_id: str) -> Dict[str, Any]:
        """Remove columns with only one unique value (no information)."""
        df = DataService.get_dataframe(dataset_id).copy()
        constant_cols = [col for col in df.columns if df[col].nunique() <= 1]
        df = df.drop(columns=constant_cols)
        DataService.update_dataframe(dataset_id, df)
        return {
            "operation": "remove_constant_features",
            "removed_columns": constant_cols,
            "shape": list(df.shape),
        }

    # ── Export Cleaned Dataset ────────────────────────────────────────────────

    @staticmethod
    def export_cleaned(dataset_id: str, format: str = "csv") -> str:
        """Save cleaned dataset to disk and return file path."""
        import os
        from app.config import settings

        df = DataService.get_dataframe(dataset_id)
        filename = f"{dataset_id}_cleaned.{format}"
        file_path = os.path.join(settings.REPORTS_DIR, filename)

        if format == "csv":
            df.to_csv(file_path, index=False)
        elif format == "xlsx":
            df.to_excel(file_path, index=False, engine="openpyxl")
        elif format == "json":
            df.to_json(file_path, orient="records", date_format="iso")
        else:
            raise ValueError(f"Unknown export format: {format}")

        return file_path
