"""
AI Data Analyst - Machine Learning Service
============================================
Auto-detects problem type and trains/evaluates ML models.
Supports:
  Regression: Linear, Ridge, Lasso, RF, XGBoost, GradientBoosting, SVR
  Classification: Logistic, RF, DT, SVM, NaiveBayes, KNN, XGBoost, LightGBM
  Clustering: KMeans, DBSCAN, Hierarchical, GaussianMixture
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
import uuid
import json

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    mean_squared_error, mean_absolute_error, r2_score,
    silhouette_score,
)

# Regression models
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR

# Classification models
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier

# Clustering models
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.mixture import GaussianMixture

# Optional: XGBoost / LightGBM
try:
    from xgboost import XGBRegressor, XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

try:
    from lightgbm import LGBMClassifier, LGBMRegressor
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False

from app.services.data_service import DataService
from app.utils.cache import analysis_cache
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class MLService:
    """Machine Learning service with auto-detection and full model training pipeline."""

    # ── Auto-Detect Problem Type ──────────────────────────────────────────────

    @staticmethod
    def detect_problem_type(dataset_id: str, target_column: str) -> Dict[str, Any]:
        """
        Automatically detect whether the problem is regression, classification, or clustering.
        """
        df = DataService.get_dataframe(dataset_id)
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found")

        target = df[target_column].dropna()
        n_unique = target.nunique()
        dtype = target.dtype

        if pd.api.types.is_numeric_dtype(dtype):
            if n_unique <= 10 and set(target.unique()).issubset({0, 1, 2, 3, 4, 5, 6, 7, 8, 9}):
                problem_type = "classification"
                reason = f"Numeric target with only {n_unique} unique integer values"
            else:
                problem_type = "regression"
                reason = f"Numeric target with {n_unique} unique values (continuous)"
        else:
            problem_type = "classification"
            reason = f"Categorical target with {n_unique} unique classes"

        algorithms = MLService._recommend_algorithms(problem_type)

        return {
            "problem_type": problem_type,
            "reason": reason,
            "target_column": target_column,
            "n_unique_targets": int(n_unique),
            "target_dtype": str(dtype),
            "recommended_algorithms": algorithms,
        }

    @staticmethod
    def _recommend_algorithms(problem_type: str) -> List[Dict[str, str]]:
        """Return recommended algorithms for a problem type."""
        if problem_type == "regression":
            algos = [
                {"id": "linear_regression", "name": "Linear Regression", "description": "Fast, interpretable baseline"},
                {"id": "ridge", "name": "Ridge Regression", "description": "Linear with L2 regularization"},
                {"id": "lasso", "name": "Lasso Regression", "description": "Linear with L1 regularization & feature selection"},
                {"id": "random_forest_regressor", "name": "Random Forest", "description": "Ensemble of decision trees, robust"},
                {"id": "gradient_boosting_regressor", "name": "Gradient Boosting", "description": "Sequential boosting, often best accuracy"},
                {"id": "svr", "name": "SVR", "description": "Support Vector Regression"},
            ]
            if XGBOOST_AVAILABLE:
                algos.append({"id": "xgboost_regressor", "name": "XGBoost", "description": "Fast gradient boosting, competition winner"})
        elif problem_type == "classification":
            algos = [
                {"id": "logistic_regression", "name": "Logistic Regression", "description": "Fast, interpretable baseline"},
                {"id": "random_forest_classifier", "name": "Random Forest", "description": "Robust ensemble, handles non-linearity"},
                {"id": "decision_tree", "name": "Decision Tree", "description": "Visual, interpretable tree"},
                {"id": "naive_bayes", "name": "Naive Bayes", "description": "Probabilistic, fast for text/categoricals"},
                {"id": "knn", "name": "K-Nearest Neighbors", "description": "Instance-based learner"},
                {"id": "gradient_boosting_classifier", "name": "Gradient Boosting", "description": "Sequential boosting"},
            ]
            if XGBOOST_AVAILABLE:
                algos.append({"id": "xgboost_classifier", "name": "XGBoost", "description": "High-performance gradient boosting"})
            if LIGHTGBM_AVAILABLE:
                algos.append({"id": "lightgbm_classifier", "name": "LightGBM", "description": "Fast, memory-efficient boosting"})
        else:  # clustering
            algos = [
                {"id": "kmeans", "name": "K-Means", "description": "Fast, partition-based clustering"},
                {"id": "dbscan", "name": "DBSCAN", "description": "Density-based, handles outliers"},
                {"id": "agglomerative", "name": "Hierarchical (Agglomerative)", "description": "Builds dendogram, no K needed"},
                {"id": "gaussian_mixture", "name": "Gaussian Mixture", "description": "Probabilistic cluster assignment"},
            ]
        return algos

    # ── Train Model ───────────────────────────────────────────────────────────

    @staticmethod
    def train_model(
        dataset_id: str,
        target_column: str,
        algorithm: str,
        feature_columns: Optional[List[str]] = None,
        test_size: float = 0.2,
        n_clusters: int = 3,
    ) -> Dict[str, Any]:
        """
        Train an ML model and evaluate it.
        
        Returns comprehensive metrics, feature importances, and predictions.
        """
        df = DataService.get_dataframe(dataset_id).copy()
        
        # Select features
        if feature_columns:
            X_cols = [c for c in feature_columns if c in df.columns and c != target_column]
        else:
            # Auto-select: numeric columns only
            X_cols = [
                c for c in df.select_dtypes(include=[np.number]).columns
                if c != target_column
            ]

        if not X_cols:
            raise ValueError("No numeric feature columns available for training")

        # Detect problem type
        problem_type_info = MLService.detect_problem_type(dataset_id, target_column)
        problem_type = problem_type_info["problem_type"]

        X = df[X_cols].copy()
        
        # Handle clustering (no target)
        if algorithm in ("kmeans", "dbscan", "agglomerative", "gaussian_mixture"):
            return MLService._train_clustering(dataset_id, X, X_cols, algorithm, n_clusters)

        y = df[target_column].copy()

        # Drop rows with missing values
        mask = X.notna().all(axis=1) & y.notna()
        X, y = X[mask], y[mask]

        if len(X) < 20:
            raise ValueError("Not enough data to train a model (need at least 20 rows)")

        # Encode target if classification
        le = None
        label_mapping = {}
        if problem_type == "classification" and not pd.api.types.is_numeric_dtype(y):
            le = LabelEncoder()
            y_encoded = pd.Series(le.fit_transform(y), index=y.index)
            label_mapping = {int(v): str(k) for k, v in zip(le.classes_, le.transform(le.classes_))}
        else:
            y_encoded = y

        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=test_size, random_state=42
        )

        # Get model
        model = MLService._get_model(algorithm)

        # Fit
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        # Compute metrics
        if problem_type == "regression":
            metrics = MLService._regression_metrics(y_test, y_pred)
        else:
            metrics = MLService._classification_metrics(y_test, y_pred, model, X_test)

        # Feature importances
        importances = MLService._get_feature_importances(model, X_cols)

        # Cross-validation score
        cv_scores = []
        try:
            scoring = "r2" if problem_type == "regression" else "f1_weighted"
            cv_scores = cross_val_score(model, X, y_encoded, cv=5, scoring=scoring).tolist()
        except Exception as e:
            logger.warning(f"CV failed: {e}")

        experiment_id = str(uuid.uuid4())

        return {
            "experiment_id": experiment_id,
            "algorithm": algorithm,
            "problem_type": problem_type,
            "target_column": target_column,
            "feature_columns": X_cols,
            "n_samples_train": int(len(X_train)),
            "n_samples_test": int(len(X_test)),
            "metrics": metrics,
            "feature_importances": importances,
            "cross_validation": {
                "scores": [round(s, 4) for s in cv_scores],
                "mean": round(float(np.mean(cv_scores)), 4) if cv_scores else None,
                "std": round(float(np.std(cv_scores)), 4) if cv_scores else None,
            },
            "label_mapping": label_mapping,
        }

    @staticmethod
    def _get_model(algorithm: str):
        """Return a scikit-learn model instance for the given algorithm ID."""
        models = {
            # Regression
            "linear_regression": LinearRegression(),
            "ridge": Ridge(alpha=1.0),
            "lasso": Lasso(alpha=0.01, max_iter=10000),
            "elastic_net": ElasticNet(max_iter=10000),
            "random_forest_regressor": RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
            "gradient_boosting_regressor": GradientBoostingRegressor(n_estimators=100, random_state=42),
            "svr": SVR(kernel="rbf"),
            # Classification
            "logistic_regression": LogisticRegression(max_iter=1000, random_state=42),
            "random_forest_classifier": RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
            "decision_tree": DecisionTreeClassifier(max_depth=10, random_state=42),
            "svm": SVC(probability=True, random_state=42),
            "naive_bayes": GaussianNB(),
            "knn": KNeighborsClassifier(n_neighbors=5),
            "gradient_boosting_classifier": GradientBoostingClassifier(n_estimators=100, random_state=42),
        }

        if XGBOOST_AVAILABLE:
            models["xgboost_regressor"] = XGBRegressor(n_estimators=100, random_state=42, verbosity=0)
            models["xgboost_classifier"] = XGBClassifier(n_estimators=100, random_state=42, verbosity=0, eval_metric="logloss")

        if LIGHTGBM_AVAILABLE:
            models["lightgbm_classifier"] = LGBMClassifier(n_estimators=100, random_state=42, verbose=-1)
            models["lightgbm_regressor"] = LGBMRegressor(n_estimators=100, random_state=42, verbose=-1)

        if algorithm not in models:
            raise ValueError(f"Unknown algorithm: {algorithm}")

        return models[algorithm]

    @staticmethod
    def _regression_metrics(y_true, y_pred) -> Dict[str, Any]:
        """Compute regression metrics."""
        mse = float(mean_squared_error(y_true, y_pred))
        return {
            "rmse": round(float(np.sqrt(mse)), 4),
            "mse": round(mse, 4),
            "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
            "r2_score": round(float(r2_score(y_true, y_pred)), 4),
            "explained_variance": round(float(1 - np.var(y_true - y_pred) / np.var(y_true)), 4),
        }

    @staticmethod
    def _classification_metrics(y_true, y_pred, model, X_test) -> Dict[str, Any]:
        """Compute classification metrics including confusion matrix and ROC data."""
        n_classes = len(np.unique(y_true))
        avg = "binary" if n_classes == 2 else "weighted"

        cm = confusion_matrix(y_true, y_pred).tolist()

        metrics = {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "precision": round(float(precision_score(y_true, y_pred, average=avg, zero_division=0)), 4),
            "recall": round(float(recall_score(y_true, y_pred, average=avg, zero_division=0)), 4),
            "f1_score": round(float(f1_score(y_true, y_pred, average=avg, zero_division=0)), 4),
            "confusion_matrix": cm,
        }

        # ROC AUC (binary only for simplicity)
        try:
            if n_classes == 2 and hasattr(model, "predict_proba"):
                proba = model.predict_proba(X_test)[:, 1]
                metrics["roc_auc"] = round(float(roc_auc_score(y_true, proba)), 4)
                # ROC curve points
                from sklearn.metrics import roc_curve
                fpr, tpr, _ = roc_curve(y_true, proba)
                metrics["roc_curve"] = {
                    "fpr": [round(float(x), 4) for x in fpr[:100]],
                    "tpr": [round(float(x), 4) for x in tpr[:100]],
                }
        except Exception as e:
            logger.warning(f"ROC AUC failed: {e}")

        return metrics

    @staticmethod
    def _train_clustering(
        dataset_id: str, X: pd.DataFrame, X_cols: List[str], algorithm: str, n_clusters: int
    ) -> Dict[str, Any]:
        """Train a clustering model."""
        # Scale features for clustering
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X.dropna())

        if algorithm == "kmeans":
            model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = model.fit_predict(X_scaled)
        elif algorithm == "dbscan":
            model = DBSCAN(eps=0.5, min_samples=5)
            labels = model.fit_predict(X_scaled)
        elif algorithm == "agglomerative":
            model = AgglomerativeClustering(n_clusters=n_clusters)
            labels = model.fit_predict(X_scaled)
        elif algorithm == "gaussian_mixture":
            model = GaussianMixture(n_components=n_clusters, random_state=42)
            labels = model.fit_predict(X_scaled)
        else:
            raise ValueError(f"Unknown clustering algorithm: {algorithm}")

        # Silhouette score
        sil_score = None
        try:
            unique_labels = np.unique(labels)
            if len(unique_labels) > 1 and -1 not in unique_labels:
                sil_score = round(float(silhouette_score(X_scaled, labels)), 4)
        except Exception:
            pass

        cluster_counts = pd.Series(labels).value_counts().sort_index().to_dict()

        return {
            "experiment_id": str(uuid.uuid4()),
            "algorithm": algorithm,
            "problem_type": "clustering",
            "feature_columns": X_cols,
            "n_clusters": int(len(np.unique(labels))),
            "metrics": {
                "silhouette_score": sil_score,
                "cluster_sizes": {str(k): int(v) for k, v in cluster_counts.items()},
            },
            "n_samples": len(labels),
        }

    @staticmethod
    def _get_feature_importances(model, columns: List[str]) -> List[Dict[str, Any]]:
        """Extract feature importances from the trained model."""
        importances = []
        try:
            if hasattr(model, "feature_importances_"):
                imps = model.feature_importances_
            elif hasattr(model, "coef_"):
                imps = np.abs(model.coef_.flatten())
            else:
                return []

            for col, imp in zip(columns, imps):
                importances.append({"feature": col, "importance": round(float(imp), 6)})
            importances.sort(key=lambda x: x["importance"], reverse=True)
        except Exception as e:
            logger.warning(f"Could not extract feature importances: {e}")

        return importances

    # ── Compare Multiple Models ────────────────────────────────────────────────

    @staticmethod
    def compare_models(
        dataset_id: str,
        target_column: str,
        algorithms: List[str],
        test_size: float = 0.2,
    ) -> Dict[str, Any]:
        """Train multiple models and compare their performance."""
        results = []
        for algo in algorithms:
            try:
                result = MLService.train_model(dataset_id, target_column, algo, test_size=test_size)
                results.append({
                    "algorithm": algo,
                    "metrics": result["metrics"],
                    "cv_mean": result["cross_validation"]["mean"],
                })
            except Exception as e:
                results.append({"algorithm": algo, "error": str(e)})

        return {
            "comparison": results,
            "target_column": target_column,
            "n_models_trained": len([r for r in results if "error" not in r]),
        }
