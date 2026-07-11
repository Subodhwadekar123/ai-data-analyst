"""
AI Data Analyst - AI Insights Service
========================================
Provides intelligent, natural-language insights about datasets.
Uses rule-based analysis by default, with optional Gemini AI integration
when an API key is provided.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

from app.services.data_service import DataService
from app.services.eda_service import EDAService
from app.config import settings
from app.utils.cache import analysis_cache
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class AIService:
    """
    AI-powered insights service.
    Generates executive summaries, recommendations, and answers NL queries.
    """

    # ── Main Entry Points ─────────────────────────────────────────────────────

    @staticmethod
    def generate_auto_insights(dataset_id: str) -> Dict[str, Any]:
        """
        Generate comprehensive AI insights automatically after upload.
        Falls back to rule-based if Gemini API key is not configured.
        """
        cache_key = f"{dataset_id}:ai:auto_insights"
        cached = analysis_cache.get(cache_key)
        if cached:
            return cached

        df = DataService.get_dataframe(dataset_id)
        info = DataService.get_dataset_info(dataset_id)

        # Build context summary for LLM
        context = AIService._build_context(df, info)

        # Try Gemini first, fall back to rule-based
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
            try:
                result = AIService._gemini_insights(context, df, info)
                analysis_cache.set(cache_key, result)
                return result
            except Exception as e:
                logger.warning(f"Gemini API failed, using rule-based: {e}")

        result = AIService._rule_based_insights(df, info)
        analysis_cache.set(cache_key, result)
        return result

    @staticmethod
    def answer_question(dataset_id: str, question: str) -> Dict[str, Any]:
        """
        Answer a natural language question about the dataset.
        """
        df = DataService.get_dataframe(dataset_id)
        info = DataService.get_dataset_info(dataset_id)
        context = AIService._build_context(df, info)

        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
            try:
                return AIService._gemini_answer(context, question, df)
            except Exception as e:
                logger.warning(f"Gemini answer failed, using rule-based: {e}")

        return AIService._rule_based_answer(question, df, info)

    @staticmethod
    def generate_data_dictionary(dataset_id: str) -> Dict[str, Any]:
        """Generate an automatic data dictionary / column descriptions."""
        df = DataService.get_dataframe(dataset_id)
        
        columns = []
        for col in df.columns:
            series = df[col].dropna()
            dtype = str(df[col].dtype)
            col_type = DataService._classify_column(col, df[col])

            # Build description
            desc = AIService._describe_column(col, series, col_type)

            columns.append({
                "name": col,
                "dtype": dtype,
                "type_category": col_type,
                "description": desc,
                "missing_count": int(df[col].isnull().sum()),
                "missing_pct": round(df[col].isnull().sum() / len(df) * 100, 2),
                "unique_count": int(df[col].nunique()),
                "sample_values": DataService._safe_sample_values(df[col]),
                "statistics": AIService._column_stats(series, col_type),
            })

        return {
            "dataset_name": "Dataset",
            "total_columns": len(columns),
            "columns": columns,
        }

    # ── Context Builder ────────────────────────────────────────────────────────

    @staticmethod
    def _build_context(df: pd.DataFrame, info: Dict[str, Any]) -> str:
        """Build a text context string for the LLM prompt."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

        context = f"""
Dataset Overview:
- Shape: {info['rows']:,} rows × {info['columns']} columns
- Memory: {info['memory_usage_mb']} MB
- Missing values: {info['missing_values_total']:,} ({info.get('completeness_score', 0):.1f}% complete)
- Duplicate rows: {info['duplicate_rows']:,}
- Numeric columns ({len(numeric_cols)}): {', '.join(numeric_cols[:10])}
- Categorical columns ({len(cat_cols)}): {', '.join(cat_cols[:10])}

Numeric Summary:
"""
        for col in numeric_cols[:8]:
            series = df[col].dropna()
            if len(series) > 0:
                context += f"  {col}: mean={series.mean():.2f}, std={series.std():.2f}, min={series.min():.2f}, max={series.max():.2f}\n"

        context += "\nCategorical Summary:\n"
        for col in cat_cols[:5]:
            top = df[col].value_counts().head(3)
            context += f"  {col}: {', '.join([f'{k}({v})' for k, v in top.items()])}\n"

        return context

    # ── Gemini AI Integration ──────────────────────────────────────────────────

    @staticmethod
    def _gemini_insights(context: str, df: pd.DataFrame, info: Dict[str, Any]) -> Dict[str, Any]:
        """Use Gemini API to generate insights."""
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""You are a senior data scientist and business analyst. Analyze this dataset and provide:

{context}

Please provide:
1. Executive Summary (3-4 sentences about the dataset)
2. Key Findings (5 bullet points)
3. Data Quality Issues (problems found)
4. Business Recommendations (3-5 actionable recommendations)
5. ML Readiness Assessment (is data ready for ML? What model would you recommend?)
6. Risk Factors (potential issues or biases)

Format as structured JSON with keys: executive_summary, key_findings, data_quality_issues, recommendations, ml_readiness, risk_factors.
Only return valid JSON, no markdown."""

        response = model.generate_content(prompt)
        text = response.text.strip()

        # Parse JSON response
        import json
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        
        parsed = json.loads(text)
        parsed["source"] = "gemini-ai"
        return parsed

    @staticmethod
    def _gemini_answer(context: str, question: str, df: pd.DataFrame) -> Dict[str, Any]:
        """Use Gemini to answer a specific question about the dataset."""
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""You are a senior data analyst. Based on the following dataset context, answer the question.

Dataset Context:
{context}

Question: {question}

Provide a clear, concise answer. If the question involves computations, make reasonable inferences from the summary statistics.
Format your response as JSON with keys: answer, explanation, suggestions (list of follow-up questions).
Only return valid JSON."""

        response = model.generate_content(prompt)
        text = response.text.strip()

        import json
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        parsed = json.loads(text)
        parsed["source"] = "gemini-ai"
        parsed["question"] = question
        return parsed

    # ── Rule-Based Insights ────────────────────────────────────────────────────

    @staticmethod
    def _rule_based_insights(df: pd.DataFrame, info: Dict[str, Any]) -> Dict[str, Any]:
        """Generate rule-based insights without an LLM."""
        rows, cols = df.shape
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
        datetime_cols = df.select_dtypes(include=["datetime64"]).columns.tolist()
        missing_pct = info.get("completeness_score", 100)
        dup_pct = info.get("duplicate_percentage", 0)

        # Executive Summary
        exec_summary = (
            f"The dataset contains {rows:,} rows and {cols} columns with "
            f"{len(numeric_cols)} numeric and {len(cat_cols)} categorical features. "
            f"Data completeness is {missing_pct:.1f}%, "
            f"{'which is excellent' if missing_pct >= 95 else 'indicating some missing data to address'}. "
            f"{'There are duplicate rows that should be reviewed. ' if dup_pct > 0 else ''}"
            f"{'Time-series analysis is possible given datetime columns.' if datetime_cols else ''}"
        )

        # Key Findings
        key_findings = []
        if numeric_cols:
            top_col = numeric_cols[0]
            series = df[top_col].dropna()
            key_findings.append(f"'{top_col}' has a mean of {series.mean():.2f} and std of {series.std():.2f}")

        if dup_pct > 0:
            key_findings.append(f"{dup_pct:.1f}% of rows are duplicates ({info['duplicate_rows']:,} rows)")

        if info["missing_values_total"] > 0:
            key_findings.append(f"{info['missing_values_total']:,} missing values found across {info['missing_columns']} columns")

        if cat_cols:
            col = cat_cols[0]
            n_unique = df[col].nunique()
            key_findings.append(f"'{col}' has {n_unique} unique categories")

        for col in numeric_cols[:3]:
            skew = df[col].skew()
            if abs(skew) > 2:
                key_findings.append(f"'{col}' is highly skewed (skewness={skew:.2f}) — consider transformation")

        # Data Quality Issues
        dq_issues = []
        if missing_pct < 95:
            dq_issues.append(f"Missing values: {100 - missing_pct:.1f}% of data is incomplete")
        if dup_pct > 0:
            dq_issues.append(f"Duplicate rows: {info['duplicate_rows']:,} duplicates found")
        for col in numeric_cols[:5]:
            if df[col].nunique() == 1:
                dq_issues.append(f"Constant column: '{col}' has only one unique value")

        # Recommendations
        recommendations = []
        if info["missing_values_total"] > 0:
            recommendations.append("Handle missing values using mean/median imputation for numeric columns and mode for categoricals")
        if dup_pct > 0:
            recommendations.append("Remove duplicate rows to prevent data leakage in ML models")
        if len(numeric_cols) > 0:
            high_skew_cols = [c for c in numeric_cols if abs(df[c].skew()) > 2]
            if high_skew_cols:
                recommendations.append(f"Apply log transformation to skewed columns: {', '.join(high_skew_cols[:3])}")
        if cat_cols:
            recommendations.append("Encode categorical variables using appropriate encoding strategies before ML")
        recommendations.append("Split data into train/test sets (80/20) before any ML modeling")

        # ML Readiness
        score = 100
        ml_notes = []
        if rows < 100:
            score -= 40; ml_notes.append("Very small dataset")
        elif rows < 1000:
            score -= 10; ml_notes.append("Small dataset — use cross-validation")
        if missing_pct < 80:
            score -= 20; ml_notes.append("Too many missing values")
        if len(numeric_cols) < 2:
            score -= 20; ml_notes.append("Very few numeric features")

        suggested_models = []
        if rows > 1000 and len(numeric_cols) >= 3:
            suggested_models = ["Random Forest", "XGBoost", "Gradient Boosting"]
        elif rows > 100:
            suggested_models = ["Logistic Regression", "Decision Tree", "KNN"]

        ml_readiness = {
            "score": max(0, score),
            "grade": "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D",
            "is_ready": score >= 60,
            "notes": ml_notes,
            "suggested_models": suggested_models,
        }

        # Risk Factors
        risk_factors = []
        if dup_pct > 5:
            risk_factors.append("High duplicate rate may indicate data collection issues")
        if missing_pct < 70:
            risk_factors.append("Very high missing data rate — model reliability may be compromised")
        if rows < 500:
            risk_factors.append("Small sample size increases risk of overfitting")
        if len(cat_cols) > len(numeric_cols) * 2:
            risk_factors.append("Many categorical columns — ensure proper encoding to avoid dimensionality explosion")

        return {
            "source": "rule-based",
            "executive_summary": exec_summary,
            "key_findings": key_findings[:7],
            "data_quality_issues": dq_issues if dq_issues else ["No major data quality issues detected"],
            "recommendations": recommendations[:6],
            "ml_readiness": ml_readiness,
            "risk_factors": risk_factors if risk_factors else ["No significant risk factors identified"],
        }

    @staticmethod
    def _rule_based_answer(question: str, df: pd.DataFrame, info: Dict[str, Any]) -> Dict[str, Any]:
        """Answer common questions about the dataset using rule-based logic."""
        q_lower = question.lower()

        answer = ""
        suggestions = []

        if any(k in q_lower for k in ["missing", "null", "na"]):
            total_missing = info["missing_values_total"]
            answer = f"The dataset has {total_missing:,} missing values across {info['missing_columns']} columns. "
            if total_missing > 0:
                worst = sorted(info["missing_info"].items(), key=lambda x: x[1]["count"], reverse=True)[:3]
                answer += "Most affected columns: " + ", ".join([f"{c} ({v['percentage']:.1f}%)" for c, v in worst])
            suggestions = ["How should I handle missing values?", "Which columns have the most missing data?"]

        elif any(k in q_lower for k in ["duplicate", "repeat"]):
            dup = info["duplicate_rows"]
            answer = f"There are {dup:,} duplicate rows ({info['duplicate_percentage']:.1f}% of the dataset)."
            suggestions = ["How do I remove duplicates?", "What causes duplicate rows?"]

        elif any(k in q_lower for k in ["correlation", "correlated", "related"]):
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if len(numeric_cols) >= 2:
                corr = df[numeric_cols].corr().abs()
                np.fill_diagonal(corr.values, 0)
                max_corr_idx = corr.unstack().idxmax()
                max_corr_val = corr.unstack().max()
                answer = f"The highest correlation is between '{max_corr_idx[0]}' and '{max_corr_idx[1]}' (r={max_corr_val:.3f})."
            else:
                answer = "Not enough numeric columns to compute correlations."
            suggestions = ["Show the correlation heatmap", "Which features should I drop due to high correlation?"]

        elif any(k in q_lower for k in ["model", "algorithm", "machine learning", "ml"]):
            rows = info["rows"]
            answer = f"Based on your dataset ({rows:,} rows), I recommend: "
            if rows > 5000:
                answer += "Random Forest, XGBoost, or Gradient Boosting for best performance."
            elif rows > 500:
                answer += "Random Forest or Logistic Regression as reliable choices."
            else:
                answer += "Decision Tree or KNN due to the small sample size."
            suggestions = ["What is the target variable?", "Run automated model comparison"]

        elif any(k in q_lower for k in ["rows", "size", "shape", "large"]):
            answer = f"The dataset has {info['rows']:,} rows and {info['columns']} columns ({info['memory_usage_mb']} MB in memory)."
            suggestions = ["Show dataset preview", "What are the column types?"]

        elif any(k in q_lower for k in ["column", "feature", "variable"]):
            answer = f"The dataset has {info['columns']} columns: "
            num_count = len(info["column_types"]["numeric"])
            cat_count = len(info["column_types"]["categorical"])
            answer += f"{num_count} numeric and {cat_count} categorical features."
            suggestions = ["Show column statistics", "Which columns should be removed?"]

        else:
            answer = (
                f"Based on the dataset ({info['rows']:,} rows, {info['columns']} columns), "
                f"I can help you analyze patterns, compute statistics, train ML models, and generate visualizations. "
                f"Try asking about missing values, correlations, distributions, or ML recommendations."
            )
            suggestions = [
                "What are the most important insights?",
                "Which columns have missing data?",
                "What ML model should I use?",
                "Are there any outliers?",
            ]

        return {
            "source": "rule-based",
            "question": question,
            "answer": answer,
            "explanation": "This answer is generated using rule-based analysis of your dataset statistics.",
            "suggestions": suggestions,
        }

    # ── Column Description ─────────────────────────────────────────────────────

    @staticmethod
    def _describe_column(col_name: str, series: pd.Series, col_type: str) -> str:
        """Generate a human-readable description for a column."""
        col_lower = col_name.lower()

        # Semantic descriptions based on name patterns
        name_hints = {
            "id": "Unique identifier for each record",
            "age": "Age of the individual in years",
            "date": "Date/timestamp of the event",
            "price": "Price or monetary value",
            "sales": "Sales quantity or revenue",
            "revenue": "Revenue generated",
            "profit": "Profit amount",
            "category": "Category or classification label",
            "name": "Name of the entity",
            "gender": "Gender of the individual",
            "country": "Country of origin or operation",
            "state": "State or region",
            "city": "City name",
            "email": "Email address",
            "phone": "Phone number",
            "rating": "Rating score",
            "score": "Computed score or metric",
            "count": "Count of occurrences",
            "quantity": "Quantity of items",
        }

        for keyword, description in name_hints.items():
            if keyword in col_lower:
                return description

        # Generic descriptions based on type
        if col_type == "numeric":
            return f"Numeric feature ranging from {series.min():.2f} to {series.max():.2f}"
        elif col_type == "categorical":
            n_unique = series.nunique()
            return f"Categorical feature with {n_unique} unique values"
        elif col_type == "datetime":
            return f"Datetime column spanning {series.min()} to {series.max()}"
        elif col_type == "id_or_text":
            return "High-cardinality text column (possibly an ID or free-text field)"
        elif col_type == "boolean":
            return "Boolean (true/false) flag"
        else:
            return f"Column of type {col_type}"

    @staticmethod
    def _column_stats(series: pd.Series, col_type: str) -> Optional[Dict[str, Any]]:
        """Compute relevant statistics for a column."""
        if col_type in ("numeric", "categorical_numeric"):
            try:
                return {
                    "mean": round(float(series.mean()), 4),
                    "median": round(float(series.median()), 4),
                    "std": round(float(series.std()), 4),
                    "min": round(float(series.min()), 4),
                    "max": round(float(series.max()), 4),
                }
            except Exception:
                return None
        elif col_type in ("categorical", "text"):
            top = series.value_counts().head(5)
            return {"top_values": {str(k): int(v) for k, v in top.items()}}
        return None
