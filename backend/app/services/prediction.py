import uuid
import json
import pickle
from datetime import datetime
from pathlib import Path
from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    balanced_accuracy_score,
    confusion_matrix,
    roc_auc_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

from backend.app.core.config import DATA_DIR
from backend.app.core.database import get_db_connection
from backend.app.schemas.prediction import (
    TrainModelRequest,
    EvaluationMetrics,
    FeatureImportanceItem,
    TrainedModelInfo,
    PredictionItem
)

MODELS_DIR = DATA_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def train_predictive_model(
    df_expr: pd.DataFrame,
    df_meta: pd.DataFrame,
    request: TrainModelRequest
) -> Tuple[TrainedModelInfo, Any]:
    """
    Trains a real machine learning model (Random Forest or Logistic/Ridge) on cellular features.
    Performs stratified train/test split, calculates held-out metrics, and extracts feature importance.
    """
    # Align cells by index
    if "cell_id" in df_meta.columns:
        meta_indexed = df_meta.set_index("cell_id")
    else:
        meta_indexed = df_meta

    common_cells = [c for c in df_expr.index if c in meta_indexed.index]
    if len(common_cells) < 10:
        raise ValueError(f"Insufficient aligned cells between expression matrix and metadata ({len(common_cells)} found, minimum 10 required).")

    X = df_expr.loc[common_cells].copy()
    if request.target_column in X.columns:
        X = X.drop(columns=[request.target_column])
    feature_names = list(X.columns)

    if request.target_column not in meta_indexed.columns:
        raise ValueError(f"Target column '{request.target_column}' not found in metadata. Available: {list(meta_indexed.columns)}")

    y_series = meta_indexed.loc[common_cells, request.target_column]

    # Drop any NaNs in target
    valid_mask = ~y_series.isna()
    X = X[valid_mask]
    y_series = y_series[valid_mask]

    warnings = []

    # Audit dataset provenance and target label origin from database
    annotation_provenance = "unknown"
    is_independent_ground_truth = False
    marker_genes_used: List[str] = []
    is_synthetic = False

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT is_synthetic, provenance_json FROM datasets WHERE id = ?", (request.dataset_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            is_synthetic = bool(row[0])
            if row[1]:
                prov_dict = json.loads(row[1])
                annotation_provenance = prov_dict.get("annotation_provenance", "unknown")
                is_independent_ground_truth = bool(prov_dict.get("is_independent_ground_truth", False))
                marker_genes_used = prov_dict.get("marker_genes_used_for_annotation", [])
                if prov_dict.get("is_synthetic"):
                    is_synthetic = True
    except Exception as e:
        warnings.append(f"Could not verify dataset provenance from DB: {str(e)}")

    if is_synthetic or "synthetic" in annotation_provenance.lower():
        annotation_provenance = "synthetic"
        is_independent_ground_truth = False

    # Detect circular evaluation: check if any marker genes used to derive target labels appear in model features
    overlapping_marker_features = [
        f for f in feature_names
        if any(f.strip().upper() == m.strip().upper() for m in marker_genes_used)
    ]
    circular_evaluation_risk = (len(overlapping_marker_features) > 0) and not is_independent_ground_truth

    # Determine scientifically honest evaluation classification label
    if annotation_provenance == "synthetic":
        evaluation_label = "Algorithmic Synthetic Benchmark"
        warnings.append(
            "SYNTHETIC BENCHMARK NOTICE: Cell labels were generated synthetically. "
            "Metrics evaluate algorithmic pipeline consistency rather than biological predictive power."
        )
    elif circular_evaluation_risk or annotation_provenance == "computational_heuristic":
        evaluation_label = "Weak-Label Concordance (Computational Heuristic)"
        if circular_evaluation_risk:
            overlap_str = ", ".join(overlapping_marker_features)
            warnings.append(
                f"SCIENTIFIC INTEGRITY NOTICE (Circular Evaluation Risk): Cell-state targets were assigned using marker gene rules "
                f"that overlap with model features ({overlap_str}). "
                f"Held-out accuracy measures internal algorithmic concordance with marker-based heuristic annotation rules, "
                f"NOT independent biological ground-truth validation."
            )
        else:
            warnings.append(
                "HEURISTIC ANNOTATION NOTICE: Target cell-state labels were computationally inferred rather than experimentally established. "
                "Metrics reflect concordance with computational heuristics, not independent biological validation."
            )
    elif is_independent_ground_truth and annotation_provenance in ["experimental_reference", "published_curated"]:
        evaluation_label = "Independent Biological Validation"
    else:
        evaluation_label = "Exploratory Model Fit"
        warnings.append(
            "PROVENANCE NOTICE: Cell label provenance is unverified or unknown. Metrics represent exploratory model fit."
        )

    # Detect task type: categorical (classification) or numeric continuous (regression)
    is_numeric = pd.api.types.is_numeric_dtype(y_series)
    unique_vals = y_series.nunique()

    is_regression_target = (
        is_numeric and (
            unique_vals > 5
            or "score" in request.target_column.lower()
            or "phenotype" in request.target_column.lower()
            or not np.all(np.mod(y_series.values, 1) == 0)
        )
    )

    if is_regression_target:
        task_type = "regression"
        y = y_series.astype(float).values
        stratify = None
    else:
        task_type = "classification"
        y = y_series.astype(str).values
        # Check minimum class counts for stratified split
        class_counts = pd.Series(y).value_counts()
        min_class_count = class_counts.min()
        if min_class_count < 2:
            warnings.append(f"At least one class has only {min_class_count} sample(s). Cannot stratify.")
            stratify = None
        else:
            stratify = y

    # Train / Test split
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X.values,
        y,
        test_size=request.test_size,
        random_state=request.random_seed,
        stratify=stratify
    )

    # Scale features strictly on X_train to prevent test leakage
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_raw)
    X_test = scaler.transform(X_test_raw)

    # Initialize model
    if task_type == "classification":
        if request.model_type == "logistic_regression":
            model = LogisticRegression(
                max_iter=1000,
                random_state=request.random_seed,
                class_weight="balanced"
            )
        else:
            model = RandomForestClassifier(
                n_estimators=request.n_estimators,
                max_depth=request.max_depth,
                random_state=request.random_seed,
                class_weight="balanced"
            )
    else:
        if request.model_type == "logistic_regression":
            model = Ridge(random_state=request.random_seed)
        else:
            model = RandomForestRegressor(
                n_estimators=request.n_estimators,
                max_depth=request.max_depth,
                random_state=request.random_seed
            )

    model.fit(X_train, y_train)

    train_preds = model.predict(X_train)
    test_preds = model.predict(X_test)

    # Metrics computation
    if task_type == "classification":
        classes = sorted(list(np.unique(y)))
        acc = float(accuracy_score(y_test, test_preds))
        train_acc = float(accuracy_score(y_train, train_preds))
        macro_f1 = float(f1_score(y_test, test_preds, average="macro", zero_division=0))
        bal_acc = float(balanced_accuracy_score(y_test, test_preds))
        cm = confusion_matrix(y_test, test_preds, labels=classes).tolist()

        roc_auc = None
        if hasattr(model, "predict_proba"):
            try:
                test_probs = model.predict_proba(X_test)
                if len(classes) == 2:
                    roc_auc = float(roc_auc_score(y_test, test_probs[:, 1]))
                elif len(classes) > 2:
                    roc_auc = float(roc_auc_score(y_test, test_probs, multi_class="ovr", average="macro"))
            except Exception as e:
                warnings.append(f"ROC-AUC not evaluated: {str(e)}")

        metrics = EvaluationMetrics(
            task_type="classification",
            accuracy=round(acc, 4),
            macro_f1=round(macro_f1, 4),
            balanced_accuracy=round(bal_acc, 4),
            roc_auc=round(roc_auc, 4) if roc_auc is not None else None,
            confusion_matrix=cm,
            class_labels=classes,
            train_score=round(train_acc, 4),
            test_score=round(acc, 4),
            warnings=warnings,
            evaluation_label=evaluation_label,
            annotation_provenance=annotation_provenance,
            is_independent_ground_truth=is_independent_ground_truth,
            circular_evaluation_risk=circular_evaluation_risk,
            overlapping_marker_features=overlapping_marker_features
        )
    else:
        mae = float(mean_absolute_error(y_test, test_preds))
        rmse = float(np.sqrt(mean_squared_error(y_test, test_preds)))
        r2 = float(r2_score(y_test, test_preds))
        train_r2 = float(r2_score(y_train, train_preds))

        metrics = EvaluationMetrics(
            task_type="regression",
            mae=round(mae, 4),
            rmse=round(rmse, 4),
            r2_score=round(r2, 4),
            train_score=round(train_r2, 4),
            test_score=round(r2, 4),
            warnings=warnings,
            evaluation_label=evaluation_label,
            annotation_provenance=annotation_provenance,
            is_independent_ground_truth=is_independent_ground_truth,
            circular_evaluation_risk=circular_evaluation_risk,
            overlapping_marker_features=overlapping_marker_features
        )

    # Feature importances
    top_features: List[FeatureImportanceItem] = []
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        sorted_idx = np.argsort(importances)[::-1]
        for rank, idx in enumerate(sorted_idx[:20], 1):
            top_features.append(FeatureImportanceItem(
                feature=feature_names[idx],
                importance=round(float(importances[idx]), 4),
                rank=rank
            ))
    elif hasattr(model, "coef_"):
        coef = np.abs(model.coef_)
        if coef.ndim > 1:
            coef = coef.mean(axis=0)
        sorted_idx = np.argsort(coef)[::-1]
        for rank, idx in enumerate(sorted_idx[:20], 1):
            top_features.append(FeatureImportanceItem(
                feature=feature_names[idx],
                importance=round(float(coef[idx]), 4),
                rank=rank
            ))

    model_id = f"model_{uuid.uuid4().hex[:8]}"
    model_path = MODELS_DIR / f"{model_id}.pkl"
    with open(model_path, "wb") as f:
        pickle.dump({
            "model": model,
            "scaler": scaler,
            "feature_names": feature_names,
            "task_type": task_type,
            "target_column": request.target_column,
            "classes": getattr(model, "classes_", None)
        }, f)

    # Persist in DB
    conn = get_db_connection()
    cursor = conn.cursor()
    created_at = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO models (id, dataset_id, model_name, model_type, target_column, target_type, metrics_json, feature_names_json, model_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        model_id,
        request.dataset_id,
        f"{request.model_type} ({request.target_column})",
        request.model_type,
        request.target_column,
        task_type,
        json.dumps(metrics.model_dump()),
        json.dumps(feature_names),
        str(model_path),
        created_at
    ))
    conn.commit()
    conn.close()

    model_info = TrainedModelInfo(
        model_id=model_id,
        dataset_id=request.dataset_id,
        model_name=f"{request.model_type} ({request.target_column})",
        model_type=request.model_type,
        target_column=request.target_column,
        target_type=task_type,
        metrics=metrics,
        top_features=top_features,
        features_count=len(feature_names),
        created_at=created_at,
        evaluation_label=evaluation_label,
        circular_evaluation_risk=circular_evaluation_risk,
        is_independent_ground_truth=is_independent_ground_truth
    )
    return model_info, model


def predict_dataset_states(
    model_id: str,
    df_expr: pd.DataFrame,
    df_meta: Optional[pd.DataFrame] = None
) -> List[PredictionItem]:
    """Generates per-cell state predictions with probabilities or regression estimates."""
    model_path = MODELS_DIR / f"{model_id}.pkl"
    if not model_path.exists():
        raise FileNotFoundError(f"Model file for '{model_id}' not found.")

    with open(model_path, "rb") as f:
        artifact = pickle.load(f)

    model = artifact["model"]
    scaler = artifact.get("scaler", None)
    feature_names = artifact["feature_names"]
    task_type = artifact["task_type"]
    target_col = artifact["target_column"]

    # Align features: fill missing features with 0.0
    X_aligned = pd.DataFrame(0.0, index=df_expr.index, columns=feature_names)
    for col in feature_names:
        if col in df_expr.columns:
            X_aligned[col] = df_expr[col]

    if scaler is not None:
        X_mat = scaler.transform(X_aligned.values)
    else:
        X_mat = X_aligned.values

    preds = model.predict(X_mat)

    probs = None
    if task_type == "classification" and hasattr(model, "predict_proba"):
        probs_matrix = model.predict_proba(X_mat)
        classes = list(model.classes_)
    else:
        probs_matrix = None
        classes = []

    # Metadata true labels if present
    meta_dict = {}
    if df_meta is not None and not df_meta.empty and target_col in df_meta.columns:
        meta_indexed = df_meta.set_index("cell_id") if "cell_id" in df_meta.columns else df_meta
        meta_dict = meta_indexed[target_col].to_dict()

    items: List[PredictionItem] = []
    for idx, cell_id in enumerate(df_expr.index):
        true_val = meta_dict.get(cell_id, None)

        if task_type == "classification":
            prob_dict = {}
            if probs_matrix is not None:
                for c_idx, c_name in enumerate(classes):
                    prob_dict[str(c_name)] = round(float(probs_matrix[idx, c_idx]), 4)

            items.append(PredictionItem(
                cell_id=str(cell_id),
                true_label=str(true_val) if true_val is not None else None,
                predicted_label=str(preds[idx]),
                probabilities=prob_dict
            ))
        else:
            items.append(PredictionItem(
                cell_id=str(cell_id),
                true_numeric=float(true_val) if true_val is not None else None,
                predicted_label=str(round(float(preds[idx]), 3)),
                predicted_numeric=round(float(preds[idx]), 4)
            ))

    return items
