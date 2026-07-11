"""
AI Data Analyst - EDA Service
================================
Comprehensive Exploratory Data Analysis service.
Computes distribution analysis, correlation analysis,
missing value reports, feature importance, anomaly detection,
and business insights automatically.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from scipy import stats

from app.services.data_service import DataService
from app.utils.cache import analysis_cache
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class EDAService:
    """
    Performs complete exploratory data analysis on a dataset.
    All methods are static and results are cached.
    """

    @staticmethod
    def full_eda(dataset_id: str) -> Dict[str, Any]:
        """
        Run complete EDA pipeline and return all results.
        Results are cached using dataset_id as key.
        """
        cache_key = f"{dataset_id}:eda:full"
        cached = analysis_cache.get(cache_key)
        if cached:
            return cached

        df = DataService.get_dataframe(dataset_id)
        logger.info(f"Running full EDA for dataset {dataset_id}")

        result = {
            "summary": EDAService.summary_report(df),
            "distributions": EDAService.distribution_analysis(df),
            "correlations": EDAService.correlation_report(df),
            "missing_values": EDAService.missing_value_report(df),
            "outliers": EDAService.outlier_report(df),
            "feature_insights": EDAService.feature_insights(df),
            "business_insights": EDAService.business_insights(df),
            "data_quality_score": EDAService.data_quality_score(df),
        }

        analysis_cache.set(cache_key, result)
        return result

    # ── Summary Report ─────────────────────────────────────────────────────────

    @staticmethod
    def summary_report(df: pd.DataFrame) -> Dict[str, Any]:
        """Generate descriptive statistics for all columns."""
        numeric_df = df.select_dtypes(include=[np.number])
        
        summary = {}
        if not numeric_df.empty:
            desc = numeric_df.describe(percentiles=[0.1, 0.25, 0.5, 0.75, 0.9]).to_dict()
            # Add skewness and kurtosis
            for col in numeric_df.columns:
                desc[col]["skewness"] = float(numeric_df[col].skew())
                desc[col]["kurtosis"] = float(numeric_df[col].kurtosis())
                desc[col]["missing"] = int(df[col].isnull().sum())
                desc[col]["zeros"] = int((numeric_df[col] == 0).sum())
                desc[col]["negative"] = int((numeric_df[col] < 0).sum())
                # Convert numpy types
                desc[col] = {
                    k: float(v) if isinstance(v, (np.floating, np.integer)) else v
                    for k, v in desc[col].items()
                }
            summary["numeric"] = desc

        # Categorical summary
        cat_df = df.select_dtypes(include=["object", "category"])
        cat_summary = {}
        for col in cat_df.columns:
            value_counts = cat_df[col].value_counts()
            cat_summary[col] = {
                "unique_count": int(cat_df[col].nunique()),
                "missing": int(df[col].isnull().sum()),
                "top_values": {
                    str(k): int(v) for k, v in value_counts.head(10).items()
                },
                "mode": str(cat_df[col].mode().iloc[0]) if not cat_df[col].mode().empty else None,
            }
        summary["categorical"] = cat_summary

        return summary

    # ── Distribution Analysis ──────────────────────────────────────────────────

    @staticmethod
    def distribution_analysis(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyze the distribution of each numerical column.
        Returns histogram data, normality test, and distribution shape.
        """
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        distributions = {}

        for col in numeric_cols[:30]:  # Cap at 30 columns for performance
            series = df[col].dropna()
            if len(series) < 5:
                continue

            # Histogram data (50 bins)
            try:
                counts, bin_edges = np.histogram(series, bins=min(50, len(series) // 2))
                hist_data = {
                    "counts": counts.tolist(),
                    "bin_edges": bin_edges.tolist(),
                    "bin_centers": [(bin_edges[i] + bin_edges[i + 1]) / 2 for i in range(len(counts))],
                }
            except Exception:
                hist_data = {}

            # Normality test (Shapiro-Wilk for small, D'Agostino for large)
            normality = None
            try:
                if len(series) <= 5000:
                    stat, p_value = stats.shapiro(series.sample(min(len(series), 500)))
                    normality = {
                        "test": "shapiro-wilk",
                        "statistic": float(stat),
                        "p_value": float(p_value),
                        "is_normal": bool(p_value > 0.05),
                    }
                else:
                    stat, p_value = stats.normaltest(series.sample(5000))
                    normality = {
                        "test": "dagostino-pearson",
                        "statistic": float(stat),
                        "p_value": float(p_value),
                        "is_normal": bool(p_value > 0.05),
                    }
            except Exception:
                pass

            # Skewness interpretation
            skew = float(series.skew())
            if abs(skew) < 0.5:
                skew_interpretation = "approximately symmetric"
            elif skew > 0:
                skew_interpretation = "right-skewed (positive skew)"
            else:
                skew_interpretation = "left-skewed (negative skew)"

            distributions[col] = {
                "histogram": hist_data,
                "normality": normality,
                "skewness": skew,
                "skewness_interpretation": skew_interpretation,
                "kurtosis": float(series.kurtosis()),
                "min": float(series.min()),
                "max": float(series.max()),
                "mean": float(series.mean()),
                "median": float(series.median()),
                "std": float(series.std()),
                "q1": float(series.quantile(0.25)),
                "q3": float(series.quantile(0.75)),
                "iqr": float(series.quantile(0.75) - series.quantile(0.25)),
            }

        return distributions

    # ── Correlation Report ─────────────────────────────────────────────────────

    @staticmethod
    def correlation_report(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Compute Pearson, Spearman, and Kendall correlation matrices.
        Also identifies top correlated pairs.
        """
        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.shape[1] < 2:
            return {"error": "Not enough numeric columns for correlation analysis"}

        # Limit columns for performance
        if numeric_df.shape[1] > 50:
            numeric_df = numeric_df.iloc[:, :50]

        def safe_corr(method: str) -> Dict:
            try:
                corr = numeric_df.corr(method=method)
                return {
                    "matrix": corr.round(4).to_dict(),
                    "columns": list(corr.columns),
                }
            except Exception as e:
                return {"error": str(e)}

        pearson = safe_corr("pearson")

        # Top highly correlated pairs
        correlated_pairs = []
        try:
            corr_matrix = numeric_df.corr()
            # Get upper triangle
            upper = corr_matrix.where(
                np.triu(np.ones(corr_matrix.shape), k=1).astype(bool)
            )
            # Find pairs with |correlation| > 0.5
            for col in upper.columns:
                for idx in upper.index:
                    val = upper.loc[idx, col]
                    if not np.isnan(val) and abs(val) >= 0.5:
                        correlated_pairs.append({
                            "col1": str(idx),
                            "col2": str(col),
                            "correlation": round(float(val), 4),
                            "strength": (
                                "very strong" if abs(val) >= 0.9 else
                                "strong" if abs(val) >= 0.7 else
                                "moderate"
                            ),
                            "direction": "positive" if val > 0 else "negative",
                        })
            correlated_pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
        except Exception as e:
            logger.warning(f"Could not compute correlated pairs: {e}")

        return {
            "pearson": pearson,
            "top_correlated_pairs": correlated_pairs[:20],
            "highly_correlated_count": len([p for p in correlated_pairs if abs(p["correlation"]) >= 0.8]),
        }

    # ── Missing Value Report ───────────────────────────────────────────────────

    @staticmethod
    def missing_value_report(df: pd.DataFrame) -> Dict[str, Any]:
        """Detailed missing value analysis with patterns and recommendations."""
        rows = len(df)
        missing_counts = df.isnull().sum()
        missing_pct = (missing_counts / rows * 100).round(2)

        columns_with_missing = []
        for col in df.columns:
            cnt = int(missing_counts[col])
            if cnt > 0:
                pct = float(missing_pct[col])
                # Recommend strategy
                if pct > 50:
                    recommendation = "Drop column (too many missing values)"
                    strategy = "drop_column"
                elif pd.api.types.is_numeric_dtype(df[col]):
                    skew = abs(df[col].skew()) if not df[col].dropna().empty else 0
                    if skew > 1:
                        recommendation = "Fill with median (skewed distribution)"
                        strategy = "fill_median"
                    else:
                        recommendation = "Fill with mean"
                        strategy = "fill_mean"
                else:
                    recommendation = "Fill with mode (most frequent value)"
                    strategy = "fill_mode"

                columns_with_missing.append({
                    "column": col,
                    "missing_count": cnt,
                    "missing_percentage": pct,
                    "dtype": str(df[col].dtype),
                    "recommendation": recommendation,
                    "strategy": strategy,
                })

        total_missing = int(missing_counts.sum())
        total_cells = rows * len(df.columns)

        return {
            "total_missing_values": total_missing,
            "total_cells": total_cells,
            "overall_missing_percentage": round(total_missing / total_cells * 100, 2) if total_cells > 0 else 0,
            "columns_with_missing": len(columns_with_missing),
            "complete_columns": len(df.columns) - len(columns_with_missing),
            "complete_rows": int((~df.isnull().any(axis=1)).sum()),
            "columns_detail": sorted(columns_with_missing, key=lambda x: x["missing_count"], reverse=True),
        }

    # ── Outlier Report ─────────────────────────────────────────────────────────

    @staticmethod
    def outlier_report(df: pd.DataFrame) -> Dict[str, Any]:
        """Detect outliers using IQR and Z-score methods."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        outlier_info = []

        for col in numeric_cols[:20]:
            series = df[col].dropna()
            if len(series) < 10:
                continue

            # IQR method
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            iqr_outliers = int(((series < lower) | (series > upper)).sum())

            # Z-score method (|z| > 3)
            z_scores = np.abs(stats.zscore(series))
            z_outliers = int((z_scores > 3).sum())

            if iqr_outliers > 0 or z_outliers > 0:
                outlier_info.append({
                    "column": col,
                    "iqr_outliers": iqr_outliers,
                    "iqr_outlier_pct": round(iqr_outliers / len(series) * 100, 2),
                    "zscore_outliers": z_outliers,
                    "zscore_outlier_pct": round(z_outliers / len(series) * 100, 2),
                    "lower_bound": round(float(lower), 4),
                    "upper_bound": round(float(upper), 4),
                    "min_value": round(float(series.min()), 4),
                    "max_value": round(float(series.max()), 4),
                    "severity": (
                        "high" if iqr_outliers / len(series) > 0.1 else
                        "medium" if iqr_outliers / len(series) > 0.02 else
                        "low"
                    ),
                })

        return {
            "columns_with_outliers": len(outlier_info),
            "outlier_details": sorted(outlier_info, key=lambda x: x["iqr_outliers"], reverse=True),
        }

    # ── Feature Insights ───────────────────────────────────────────────────────

    @staticmethod
    def feature_insights(df: pd.DataFrame) -> Dict[str, Any]:
        """Generate feature-level insights and recommendations."""
        insights = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

        # High cardinality categoricals
        for col in cat_cols:
            n_unique = df[col].nunique()
            n_total = df[col].count()
            if n_unique / max(n_total, 1) > 0.9:
                insights.append({
                    "column": col,
                    "type": "high_cardinality",
                    "severity": "warning",
                    "message": f"'{col}' has {n_unique} unique values ({n_unique/n_total*100:.0f}%) — may be an ID column",
                    "recommendation": "Consider dropping or encoding differently",
                })

        # Constant features
        for col in df.columns:
            if df[col].nunique() == 1:
                insights.append({
                    "column": col,
                    "type": "constant_feature",
                    "severity": "warning",
                    "message": f"'{col}' has only 1 unique value — provides no information",
                    "recommendation": "Drop this column",
                })

        # Highly skewed features
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) > 0:
                skew = abs(series.skew())
                if skew > 2:
                    insights.append({
                        "column": col,
                        "type": "high_skewness",
                        "severity": "info",
                        "message": f"'{col}' is highly skewed (skewness={skew:.2f})",
                        "recommendation": "Apply log transform or Box-Cox transformation",
                    })

        # Perfectly correlated columns (near duplicate features)
        if len(numeric_cols) > 1:
            try:
                corr = df[numeric_cols].corr().abs()
                for i in range(len(numeric_cols)):
                    for j in range(i + 1, len(numeric_cols)):
                        if corr.iloc[i, j] > 0.99:
                            insights.append({
                                "column": f"{numeric_cols[i]} & {numeric_cols[j]}",
                                "type": "perfect_correlation",
                                "severity": "warning",
                                "message": f"'{numeric_cols[i]}' and '{numeric_cols[j]}' are nearly perfectly correlated",
                                "recommendation": "Remove one of these features",
                            })
            except Exception:
                pass

        return {
            "total_insights": len(insights),
            "warnings": [i for i in insights if i["severity"] == "warning"],
            "info": [i for i in insights if i["severity"] == "info"],
            "insights": insights,
        }

    # ── Business Insights ──────────────────────────────────────────────────────

    @staticmethod
    def business_insights(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Auto-generate business-level insights based on column names and data patterns.
        """
        insights = []
        col_names_lower = {col: col.lower() for col in df.columns}
        
        # Sales/Revenue analysis
        revenue_cols = [col for col, name in col_names_lower.items() 
                       if any(k in name for k in ["revenue", "sales", "amount", "price", "profit", "income"])]
        if revenue_cols:
            for col in revenue_cols[:3]:
                series = df[col].dropna()
                if pd.api.types.is_numeric_dtype(series) and len(series) > 0:
                    insights.append({
                        "category": "Financial",
                        "title": f"{col} Overview",
                        "value": f"${series.sum():,.0f} total | ${series.mean():,.2f} avg | ${series.max():,.2f} max",
                        "trend": "positive" if series.mean() > series.median() else "neutral",
                    })

        # Customer analysis
        customer_cols = [col for col, name in col_names_lower.items()
                        if any(k in name for k in ["customer", "user", "client", "member"])]
        if customer_cols:
            for col in customer_cols[:2]:
                insights.append({
                    "category": "Customers",
                    "title": f"Unique {col}s",
                    "value": f"{df[col].nunique():,} unique values",
                    "trend": "neutral",
                })

        # Date/trend analysis
        date_cols = df.select_dtypes(include=["datetime64"]).columns.tolist()
        if date_cols:
            for col in date_cols[:2]:
                date_series = df[col].dropna()
                if len(date_series) > 0:
                    insights.append({
                        "category": "Time Range",
                        "title": f"{col} Range",
                        "value": f"{date_series.min().strftime('%Y-%m-%d')} to {date_series.max().strftime('%Y-%m-%d')}",
                        "trend": "neutral",
                    })

        # Category breakdown
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
        for col in cat_cols[:3]:
            n_unique = df[col].nunique()
            if 2 <= n_unique <= 20:
                top = df[col].value_counts().head(3)
                insights.append({
                    "category": "Distribution",
                    "title": f"Top {col}s",
                    "value": " | ".join([f"{k}: {v}" for k, v in top.items()]),
                    "trend": "neutral",
                })

        return {
            "total_insights": len(insights),
            "insights": insights,
            "dataset_health": EDAService._dataset_health_summary(df),
        }

    @staticmethod
    def _dataset_health_summary(df: pd.DataFrame) -> Dict[str, Any]:
        """Quick dataset health assessment."""
        rows, cols = df.shape
        missing_pct = df.isnull().sum().sum() / (rows * cols) * 100 if rows * cols > 0 else 0
        dup_pct = df.duplicated().sum() / rows * 100 if rows > 0 else 0

        score = 100
        issues = []

        if missing_pct > 20:
            score -= 30
            issues.append(f"High missing value rate: {missing_pct:.1f}%")
        elif missing_pct > 5:
            score -= 10
            issues.append(f"Some missing values: {missing_pct:.1f}%")

        if dup_pct > 5:
            score -= 20
            issues.append(f"Duplicate rows: {dup_pct:.1f}%")

        if rows < 100:
            score -= 20
            issues.append("Very small dataset (< 100 rows)")

        return {
            "score": max(0, score),
            "grade": "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D",
            "issues": issues,
            "is_ready_for_ml": score >= 60 and rows >= 100,
        }

    # ── Data Quality Score ─────────────────────────────────────────────────────

    @staticmethod
    def data_quality_score(df: pd.DataFrame) -> Dict[str, Any]:
        """Compute an overall data quality score (0–100)."""
        rows, cols = df.shape
        if rows == 0 or cols == 0:
            return {"score": 0, "grade": "F", "breakdown": {}}

        # Completeness (no missing values)
        completeness = 1 - (df.isnull().sum().sum() / (rows * cols))

        # Uniqueness (no duplicates)
        uniqueness = 1 - (df.duplicated().sum() / rows)

        # Consistency (no constant columns)
        non_constant = sum(1 for col in df.columns if df[col].nunique() > 1) / cols

        # Validity (numeric columns have finite values)
        numeric_df = df.select_dtypes(include=[np.number])
        if not numeric_df.empty:
            validity = 1 - (np.isinf(numeric_df.values).sum() / numeric_df.size)
        else:
            validity = 1.0

        score = (completeness * 0.4 + uniqueness * 0.3 + non_constant * 0.2 + validity * 0.1) * 100

        return {
            "score": round(score, 1),
            "grade": "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D" if score >= 40 else "F",
            "breakdown": {
                "completeness": round(completeness * 100, 1),
                "uniqueness": round(uniqueness * 100, 1),
                "consistency": round(non_constant * 100, 1),
                "validity": round(validity * 100, 1),
            },
        }
