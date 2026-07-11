"""
AI Data Analyst - Feature Engineering Router & Service
=========================================================
Endpoints for feature scaling, polynomial features,
feature selection, PCA, and dimensionality reduction.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.decomposition import PCA
from sklearn.feature_selection import SelectKBest, f_classif, f_regression, VarianceThreshold

from app.services.data_service import DataService
from app.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)


class PCARequest(BaseModel):
    n_components: int = 2
    columns: Optional[List[str]] = None


class PolynomialRequest(BaseModel):
    columns: List[str]
    degree: int = 2
    interaction_only: bool = False


class SelectionRequest(BaseModel):
    target_column: str
    k: int = 10
    problem_type: str = "regression"  # regression | classification


@router.post("/features/{dataset_id}/pca", summary="PCA Dimensionality Reduction")
def run_pca(dataset_id: str, req: PCARequest):
    """Apply PCA and return explained variance and transformed data preview."""
    try:
        df = DataService.get_dataframe(dataset_id)
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        target_cols = [c for c in (req.columns or numeric_cols) if c in numeric_cols]

        if len(target_cols) < req.n_components:
            raise ValueError(f"n_components ({req.n_components}) > number of features ({len(target_cols)})")

        X = df[target_cols].dropna()
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        n_comp = min(req.n_components, len(target_cols))
        pca = PCA(n_components=n_comp)
        X_pca = pca.fit_transform(X_scaled)

        return {
            "n_components": n_comp,
            "explained_variance_ratio": [round(float(v), 4) for v in pca.explained_variance_ratio_],
            "cumulative_variance": [round(float(v), 4) for v in np.cumsum(pca.explained_variance_ratio_)],
            "feature_loadings": {
                f"PC{i + 1}": {col: round(float(pca.components_[i][j]), 4) for j, col in enumerate(target_cols)}
                for i in range(n_comp)
            },
            "preview": [{"PC1": float(row[0]), "PC2": float(row[1]) if n_comp > 1 else None} for row in X_pca[:100]],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/features/{dataset_id}/polynomial", summary="Polynomial Features")
def polynomial_features(dataset_id: str, req: PolynomialRequest):
    """Generate polynomial and interaction features."""
    try:
        df = DataService.get_dataframe(dataset_id).copy()
        cols = [c for c in req.columns if c in df.columns]
        if not cols:
            raise ValueError("No valid columns specified")

        X = df[cols].dropna()
        poly = PolynomialFeatures(degree=req.degree, interaction_only=req.interaction_only, include_bias=False)
        X_poly = poly.fit_transform(X)
        feature_names = poly.get_feature_names_out(cols)

        # Add new features to the dataset
        poly_df = pd.DataFrame(X_poly, columns=feature_names, index=X.index)
        new_cols = [n for n in feature_names if n not in df.columns]
        df = pd.concat([df, poly_df[new_cols]], axis=1)
        DataService.update_dataframe(dataset_id, df)

        return {
            "original_features": cols,
            "new_features": new_cols,
            "total_new_features": len(new_cols),
            "degree": req.degree,
            "shape": list(df.shape),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/features/{dataset_id}/select", summary="Feature Selection")
def feature_selection(dataset_id: str, req: SelectionRequest):
    """Select top K most important features using statistical tests."""
    try:
        df = DataService.get_dataframe(dataset_id)
        if req.target_column not in df.columns:
            raise ValueError(f"Target column '{req.target_column}' not found")

        numeric_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != req.target_column]
        X = df[numeric_cols].dropna(axis=0)
        y = df.loc[X.index, req.target_column].dropna()
        common_idx = X.index.intersection(y.index)
        X, y = X.loc[common_idx], y.loc[common_idx]

        k = min(req.k, len(numeric_cols))
        scorer = f_classif if req.problem_type == "classification" else f_regression
        selector = SelectKBest(scorer, k=k)
        selector.fit(X, y)

        scores = [{"feature": col, "score": round(float(s), 4), "p_value": round(float(p), 6), "selected": bool(sel)}
                  for col, s, p, sel in zip(numeric_cols, selector.scores_, selector.pvalues_, selector.get_support())]
        scores.sort(key=lambda x: x["score"], reverse=True)

        return {
            "target_column": req.target_column,
            "k_best": k,
            "problem_type": req.problem_type,
            "selected_features": [s["feature"] for s in scores if s["selected"]],
            "all_scores": scores,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/features/{dataset_id}/variance-threshold")
def variance_threshold(dataset_id: str, threshold: float = 0.01):
    """Remove low-variance features."""
    try:
        df = DataService.get_dataframe(dataset_id).copy()
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        X = df[numeric_cols].dropna()
        selector = VarianceThreshold(threshold=threshold)
        selector.fit(X)
        kept = [col for col, supported in zip(numeric_cols, selector.get_support()) if supported]
        removed = [col for col in numeric_cols if col not in kept]
        return {"threshold": threshold, "kept_features": kept, "removed_features": removed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
