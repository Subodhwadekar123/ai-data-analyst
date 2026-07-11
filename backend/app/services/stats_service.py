"""
AI Data Analyst - Statistical Analysis Service
================================================
Comprehensive statistical analysis including:
- Descriptive statistics
- Hypothesis testing (T-Test, ANOVA, Chi-Square)
- Normality tests
- Confidence intervals
- Correlation and covariance matrices
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, Any, List, Optional

from app.services.data_service import DataService
from app.utils.cache import analysis_cache
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class StatisticsService:
    """Full statistical analysis service."""

    @staticmethod
    def full_statistics(dataset_id: str) -> Dict[str, Any]:
        """Run complete statistical analysis pipeline."""
        cache_key = f"{dataset_id}:statistics:full"
        cached = analysis_cache.get(cache_key)
        if cached:
            return cached

        df = DataService.get_dataframe(dataset_id)
        logger.info(f"Running statistical analysis for dataset {dataset_id}")

        result = {
            "descriptive": StatisticsService.descriptive_stats(df),
            "percentiles": StatisticsService.percentile_analysis(df),
            "correlation_matrix": StatisticsService.correlation_matrix(df),
            "covariance_matrix": StatisticsService.covariance_matrix(df),
            "normality_tests": StatisticsService.normality_tests(df),
            "hypothesis_tests": StatisticsService.automated_hypothesis_tests(df),
            "confidence_intervals": StatisticsService.confidence_intervals(df),
        }

        analysis_cache.set(cache_key, result)
        return result

    # ── Descriptive Statistics ─────────────────────────────────────────────────

    @staticmethod
    def descriptive_stats(df: pd.DataFrame) -> Dict[str, Any]:
        """Compute full descriptive statistics for all numeric columns."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if not numeric_cols:
            return {}

        result = {}
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) == 0:
                continue

            mode_result = stats.mode(series, keepdims=True)
            mode_val = float(mode_result.mode[0]) if len(mode_result.mode) > 0 else None
            mode_count = int(mode_result.count[0]) if len(mode_result.count) > 0 else None

            result[col] = {
                "count": int(series.count()),
                "mean": float(series.mean()),
                "median": float(series.median()),
                "mode": mode_val,
                "mode_count": mode_count,
                "std": float(series.std()),
                "variance": float(series.var()),
                "min": float(series.min()),
                "max": float(series.max()),
                "range": float(series.max() - series.min()),
                "skewness": float(series.skew()),
                "kurtosis": float(series.kurtosis()),
                "iqr": float(series.quantile(0.75) - series.quantile(0.25)),
                "coefficient_of_variation": float(series.std() / series.mean() * 100) if series.mean() != 0 else None,
                "sum": float(series.sum()),
                "missing": int(df[col].isnull().sum()),
                "zeros": int((series == 0).sum()),
            }

        return result

    # ── Percentile Analysis ────────────────────────────────────────────────────

    @staticmethod
    def percentile_analysis(df: pd.DataFrame) -> Dict[str, Any]:
        """Compute detailed percentile analysis for numeric columns."""
        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.empty:
            return {}

        percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99]
        result = {}

        for col in numeric_df.columns:
            series = numeric_df[col].dropna()
            if len(series) == 0:
                continue

            result[col] = {
                f"p{p}": float(series.quantile(p / 100))
                for p in percentiles
            }
            result[col]["quartile_1"] = float(series.quantile(0.25))
            result[col]["quartile_2"] = float(series.quantile(0.50))
            result[col]["quartile_3"] = float(series.quantile(0.75))
            result[col]["iqr"] = result[col]["quartile_3"] - result[col]["quartile_1"]

        return result

    # ── Correlation Matrix ────────────────────────────────────────────────────

    @staticmethod
    def correlation_matrix(df: pd.DataFrame) -> Dict[str, Any]:
        """Compute Pearson, Spearman, and Kendall correlation matrices."""
        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.shape[1] < 2:
            return {"error": "Need at least 2 numeric columns"}

        # Cap at 50 columns for performance
        if numeric_df.shape[1] > 50:
            numeric_df = numeric_df.iloc[:, :50]

        def compute(method: str) -> Dict:
            try:
                corr = numeric_df.corr(method=method).round(4)
                return {
                    "matrix": corr.replace({np.nan: None}).to_dict(),
                    "columns": list(corr.columns),
                }
            except Exception as e:
                return {"error": str(e)}

        return {
            "pearson": compute("pearson"),
            "spearman": compute("spearman"),
            "columns": list(numeric_df.columns),
        }

    # ── Covariance Matrix ─────────────────────────────────────────────────────

    @staticmethod
    def covariance_matrix(df: pd.DataFrame) -> Dict[str, Any]:
        """Compute covariance matrix for numeric columns."""
        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.shape[1] < 2:
            return {"error": "Need at least 2 numeric columns"}

        if numeric_df.shape[1] > 30:
            numeric_df = numeric_df.iloc[:, :30]

        try:
            cov = numeric_df.cov().round(6)
            return {
                "matrix": cov.replace({np.nan: None}).to_dict(),
                "columns": list(cov.columns),
            }
        except Exception as e:
            return {"error": str(e)}

    # ── Normality Tests ────────────────────────────────────────────────────────

    @staticmethod
    def normality_tests(df: pd.DataFrame) -> Dict[str, Any]:
        """Run normality tests on each numeric column."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        results = {}

        for col in numeric_cols[:20]:
            series = df[col].dropna()
            if len(series) < 8:
                continue

            col_result = {}

            # Shapiro-Wilk (best for n < 5000)
            try:
                sample = series.sample(min(len(series), 500), random_state=42)
                stat, p = stats.shapiro(sample)
                col_result["shapiro_wilk"] = {
                    "statistic": float(stat),
                    "p_value": float(p),
                    "is_normal": bool(p > 0.05),
                    "interpretation": "Normal" if p > 0.05 else "Not normal",
                }
            except Exception:
                pass

            # D'Agostino-Pearson
            try:
                stat, p = stats.normaltest(series)
                col_result["dagostino_pearson"] = {
                    "statistic": float(stat),
                    "p_value": float(p),
                    "is_normal": bool(p > 0.05),
                    "interpretation": "Normal" if p > 0.05 else "Not normal",
                }
            except Exception:
                pass

            # Kolmogorov-Smirnov
            try:
                standardized = (series - series.mean()) / series.std()
                stat, p = stats.kstest(standardized, "norm")
                col_result["kolmogorov_smirnov"] = {
                    "statistic": float(stat),
                    "p_value": float(p),
                    "is_normal": bool(p > 0.05),
                    "interpretation": "Normal" if p > 0.05 else "Not normal",
                }
            except Exception:
                pass

            # Overall consensus
            all_tests = [v for v in col_result.values() if "is_normal" in v]
            normal_votes = sum(1 for t in all_tests if t["is_normal"])
            col_result["consensus"] = {
                "is_normal": normal_votes > len(all_tests) / 2,
                "confidence": f"{normal_votes}/{len(all_tests)} tests indicate normality",
            }

            results[col] = col_result

        return results

    # ── Hypothesis Tests ──────────────────────────────────────────────────────

    @staticmethod
    def automated_hypothesis_tests(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Automatically run appropriate hypothesis tests based on data structure.
        """
        results = {
            "t_tests": [],
            "anova_tests": [],
            "chi_square_tests": [],
        }

        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

        # T-Tests: numeric column vs binary categorical columns
        for cat_col in cat_cols[:3]:
            groups = df[cat_col].dropna().unique()
            if len(groups) == 2:
                for num_col in numeric_cols[:5]:
                    try:
                        g1 = df[df[cat_col] == groups[0]][num_col].dropna()
                        g2 = df[df[cat_col] == groups[1]][num_col].dropna()
                        if len(g1) > 5 and len(g2) > 5:
                            stat, p = stats.ttest_ind(g1, g2, equal_var=False)
                            results["t_tests"].append({
                                "numeric_col": num_col,
                                "group_col": cat_col,
                                "group_a": str(groups[0]),
                                "group_b": str(groups[1]),
                                "statistic": float(stat),
                                "p_value": float(p),
                                "significant": bool(p < 0.05),
                                "interpretation": (
                                    f"Significant difference in {num_col} between {groups[0]} and {groups[1]}"
                                    if p < 0.05 else
                                    f"No significant difference in {num_col} between groups"
                                ),
                                "mean_a": float(g1.mean()),
                                "mean_b": float(g2.mean()),
                            })
                    except Exception:
                        pass

        # ANOVA: numeric column vs multi-level categorical columns
        for cat_col in cat_cols[:3]:
            groups = df[cat_col].dropna().unique()
            if 3 <= len(groups) <= 10:
                for num_col in numeric_cols[:3]:
                    try:
                        group_data = [
                            df[df[cat_col] == g][num_col].dropna().values
                            for g in groups
                            if len(df[df[cat_col] == g][num_col].dropna()) > 5
                        ]
                        if len(group_data) >= 3:
                            stat, p = stats.f_oneway(*group_data)
                            results["anova_tests"].append({
                                "numeric_col": num_col,
                                "group_col": cat_col,
                                "n_groups": len(group_data),
                                "f_statistic": float(stat),
                                "p_value": float(p),
                                "significant": bool(p < 0.05),
                                "interpretation": (
                                    f"Significant difference in {num_col} across {cat_col} groups"
                                    if p < 0.05 else
                                    f"No significant difference in {num_col} across groups"
                                ),
                            })
                    except Exception:
                        pass

        # Chi-Square: categorical vs categorical
        for i, cat1 in enumerate(cat_cols[:3]):
            for cat2 in cat_cols[i + 1: i + 4]:
                try:
                    # Only test if both have reasonable cardinality
                    if df[cat1].nunique() <= 20 and df[cat2].nunique() <= 20:
                        contingency = pd.crosstab(df[cat1], df[cat2])
                        chi2, p, dof, expected = stats.chi2_contingency(contingency)
                        results["chi_square_tests"].append({
                            "col1": cat1,
                            "col2": cat2,
                            "chi2_statistic": float(chi2),
                            "p_value": float(p),
                            "degrees_of_freedom": int(dof),
                            "significant": bool(p < 0.05),
                            "interpretation": (
                                f"Significant association between '{cat1}' and '{cat2}'"
                                if p < 0.05 else
                                f"No significant association between '{cat1}' and '{cat2}'"
                            ),
                        })
                except Exception:
                    pass

        return results

    # ── Confidence Intervals ──────────────────────────────────────────────────

    @staticmethod
    def confidence_intervals(df: pd.DataFrame, confidence: float = 0.95) -> Dict[str, Any]:
        """Compute confidence intervals for means of numeric columns."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        results = {}

        alpha = 1 - confidence
        for col in numeric_cols[:20]:
            series = df[col].dropna()
            if len(series) < 2:
                continue

            n = len(series)
            mean = series.mean()
            se = stats.sem(series)
            h = se * stats.t.ppf(1 - alpha / 2, df=n - 1)

            results[col] = {
                "mean": float(mean),
                "lower_bound": float(mean - h),
                "upper_bound": float(mean + h),
                "confidence_level": confidence,
                "sample_size": int(n),
                "standard_error": float(se),
                "margin_of_error": float(h),
            }

        return results

    # ── Run T-Test (manual) ────────────────────────────────────────────────────

    @staticmethod
    def run_ttest(
        dataset_id: str,
        column: str,
        group_column: str,
        group_a: str,
        group_b: str,
    ) -> Dict[str, Any]:
        """Run a two-sample t-test between two groups."""
        df = DataService.get_dataframe(dataset_id)

        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found")
        if group_column not in df.columns:
            raise ValueError(f"Group column '{group_column}' not found")

        g1 = df[df[group_column] == group_a][column].dropna()
        g2 = df[df[group_column] == group_b][column].dropna()

        if len(g1) < 2 or len(g2) < 2:
            raise ValueError("Each group must have at least 2 observations")

        stat, p = stats.ttest_ind(g1, g2, equal_var=False)

        return {
            "test": "Welch's t-test",
            "column": column,
            "group_column": group_column,
            "group_a": {"name": group_a, "n": int(len(g1)), "mean": float(g1.mean()), "std": float(g1.std())},
            "group_b": {"name": group_b, "n": int(len(g2)), "mean": float(g2.mean()), "std": float(g2.std())},
            "t_statistic": float(stat),
            "p_value": float(p),
            "significant": bool(p < 0.05),
            "effect_size_cohens_d": float(abs(g1.mean() - g2.mean()) / np.sqrt((g1.std() ** 2 + g2.std() ** 2) / 2)),
            "interpretation": (
                f"There is a statistically significant difference in '{column}' between '{group_a}' and '{group_b}' (p={p:.4f})"
                if p < 0.05 else
                f"No statistically significant difference found (p={p:.4f})"
            ),
        }
