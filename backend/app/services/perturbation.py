import uuid
import json
import pickle
from datetime import datetime
from pathlib import Path
from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import pandas as pd

from backend.app.core.config import DATA_DIR
from backend.app.core.database import get_db_connection
from backend.app.schemas.perturbation import (
    PerturbationRequest,
    PerturbationResult,
    CellPerturbationDelta,
    StateDistributionDelta
)

MODELS_DIR = DATA_DIR / "models"


def run_in_silico_perturbation(
    df_expr: pd.DataFrame,
    request: PerturbationRequest
) -> PerturbationResult:
    """
    Simulates in-silico genetic perturbation:
    1. Loads trained model and extracts feature set
    2. Verifies gene exists in feature set (or errors if missing)
    3. Perturbs gene expression:
       - knockout: value = 0.0
       - down_regulation: value = baseline * parameter (parameter in [0.0, 1.0])
       - up_regulation: value = baseline * parameter (parameter > 1.0, e.g. 2.0x)
    4. Evaluates model on baseline vs perturbed feature matrices
    5. Computes transition statistics, state distribution deltas, and probability shifts
    """
    model_path = MODELS_DIR / f"{request.model_id}.pkl"
    if not model_path.exists():
        raise FileNotFoundError(f"Model '{request.model_id}' not found.")

    with open(model_path, "rb") as f:
        artifact = pickle.load(f)

    model = artifact["model"]
    scaler = artifact.get("scaler", None)
    feature_names = artifact["feature_names"]
    task_type = artifact["task_type"]

    # Match gene (case-insensitive)
    matched_gene = None
    for f_gene in feature_names:
        if f_gene.upper() == request.gene_name.upper():
            matched_gene = f_gene
            break

    if not matched_gene:
        raise ValueError(
            f"Gene '{request.gene_name}' does not exist in the model's feature set. "
            f"Available features include: {feature_names[:15]}... ({len(feature_names)} total)"
        )

    # Prepare baseline feature matrix in expression space
    X_baseline_df = pd.DataFrame(0.0, index=df_expr.index, columns=feature_names)
    for col in feature_names:
        if col in df_expr.columns:
            X_baseline_df[col] = df_expr[col]

    # Prepare perturbed feature matrix in expression space
    X_perturbed_df = X_baseline_df.copy()

    if request.intervention_type == "knockout":
        X_perturbed_df[matched_gene] = 0.0
    elif request.intervention_type == "down_regulation":
        factor = float(np.clip(request.parameter, 0.0, 1.0))
        X_perturbed_df[matched_gene] = X_perturbed_df[matched_gene] * factor
    elif request.intervention_type == "up_regulation":
        factor = float(np.clip(request.parameter, 1.0, 10.0))
        X_perturbed_df[matched_gene] = X_perturbed_df[matched_gene] * factor
    else:
        raise ValueError(f"Unknown intervention type '{request.intervention_type}'. Use knockout, down_regulation, or up_regulation.")

    # Apply fitted preprocessing scaler (if present) so that knockout maps from expression 0.0 to proper standardized space
    if scaler is not None:
        X_baseline_mat = scaler.transform(X_baseline_df.values)
        X_perturbed_mat = scaler.transform(X_perturbed_df.values)
    else:
        X_baseline_mat = X_baseline_df.values
        X_perturbed_mat = X_perturbed_df.values

    # Predict baseline vs perturbed using appropriately transformed inputs
    baseline_preds = model.predict(X_baseline_mat)
    perturbed_preds = model.predict(X_perturbed_mat)

    has_proba = (task_type == "classification" and hasattr(model, "predict_proba"))
    if has_proba:
        baseline_probs = model.predict_proba(X_baseline_mat)
        perturbed_probs = model.predict_proba(X_perturbed_mat)
        classes = list(model.classes_)
    else:
        baseline_probs = None
        perturbed_probs = None
        classes = []

    cell_deltas: List[CellPerturbationDelta] = []
    transition_count = 0
    n_cells = len(df_expr.index)

    for i, cell_id in enumerate(df_expr.index):
        b_pred = baseline_preds[i]
        p_pred = perturbed_preds[i]
        changed = (b_pred != p_pred)
        if changed:
            transition_count += 1

        b_prob = None
        p_prob = None
        prob_delta = None

        if has_proba:
            # probability of the perturbed predicted class or baseline predicted class
            pred_class_idx = classes.index(b_pred) if b_pred in classes else 0
            b_prob = round(float(baseline_probs[i, pred_class_idx]), 4)
            p_prob = round(float(perturbed_probs[i, pred_class_idx]), 4)
            prob_delta = round(p_prob - b_prob, 4)

        b_num = round(float(b_pred), 4) if task_type == "regression" else None
        p_num = round(float(p_pred), 4) if task_type == "regression" else None
        num_delta = round(p_num - b_num, 4) if task_type == "regression" else None

        cell_deltas.append(CellPerturbationDelta(
            cell_id=str(cell_id),
            baseline_state=str(b_pred),
            perturbed_state=str(p_pred),
            state_changed=changed,
            baseline_probability=b_prob,
            perturbed_probability=p_prob,
            probability_delta=prob_delta,
            baseline_numeric=b_num,
            perturbed_numeric=p_num,
            numeric_delta=num_delta
        ))

    # State distribution deltas
    all_states = sorted(list(set(list(baseline_preds) + list(perturbed_preds))))
    state_distributions: List[StateDistributionDelta] = []

    for s in all_states:
        b_cnt = int((baseline_preds == s).sum())
        p_cnt = int((perturbed_preds == s).sum())
        b_frac = b_cnt / max(n_cells, 1)
        p_frac = p_cnt / max(n_cells, 1)

        state_distributions.append(StateDistributionDelta(
            state=str(s),
            baseline_count=b_cnt,
            perturbed_count=p_cnt,
            count_delta=p_cnt - b_cnt,
            baseline_fraction=round(float(b_frac), 4),
            perturbed_fraction=round(float(p_frac), 4),
            fraction_delta=round(float(p_frac - b_frac), 4)
        ))

    run_id = f"pert_{uuid.uuid4().hex[:8]}"
    created_at = datetime.utcnow().isoformat()
    pct_trans = round((transition_count / max(n_cells, 1)) * 100.0, 2)

    result = PerturbationResult(
        run_id=run_id,
        model_id=request.model_id,
        dataset_id=request.dataset_id,
        gene_name=matched_gene,
        intervention_type=request.intervention_type,
        parameter=request.parameter,
        cells_evaluated=n_cells,
        cells_transitioned_count=transition_count,
        transition_percentage=pct_trans,
        state_distributions=state_distributions,
        cell_deltas_sample=cell_deltas[:50],
        created_at=created_at
    )

    # Persist in DB
    conn = get_db_connection()
    cursor = conn.cursor()
    summary_dict = result.model_dump()
    summary_dict["all_cell_deltas"] = [cd.model_dump() for cd in cell_deltas]
    cursor.execute("""
        INSERT INTO perturbation_runs (id, model_id, dataset_id, gene_name, intervention_type, parameter, summary_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        run_id,
        request.model_id,
        request.dataset_id,
        matched_gene,
        request.intervention_type,
        request.parameter,
        json.dumps(summary_dict),
        created_at
    ))
    conn.commit()
    conn.close()

    return result
