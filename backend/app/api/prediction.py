import json
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from backend.app.core.database import get_db_connection
from backend.app.schemas.prediction import TrainModelRequest, TrainedModelInfo, PredictionItem
from backend.app.services.prediction import train_predictive_model, predict_dataset_states
from backend.app.api.analysis import _load_dataset_matrices

router = APIRouter()


class PredictRequest(BaseModel):
    model_id: str
    dataset_id: str


@router.post("/prediction/train", response_model=TrainedModelInfo)
def train_model(request: TrainModelRequest):
    """Trains a machine learning model on cell features to predict states or phenotypes."""
    df_expr, df_meta = _load_dataset_matrices(request.dataset_id)
    if df_meta is None or df_meta.empty:
        raise HTTPException(
            status_code=400,
            detail="Target metadata table required for supervised training. Upload metadata or use synthetic demo."
        )

    try:
        model_info, _ = train_predictive_model(df_expr, df_meta, request)
        return model_info
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/prediction/models/{dataset_id}", response_model=List[TrainedModelInfo])
def list_models_for_dataset(dataset_id: str):
    """Lists all previously trained models for a dataset."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM models WHERE dataset_id = ? ORDER BY created_at DESC", (dataset_id,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        metrics = json.loads(d["metrics_json"])
        features = json.loads(d["feature_names_json"])
        eval_label = metrics.get("evaluation_label", "Exploratory Model Fit")
        circ_risk = metrics.get("circular_evaluation_risk", False)
        ind_gt = metrics.get("is_independent_ground_truth", False)
        results.append(TrainedModelInfo(
            model_id=d["id"],
            dataset_id=d["dataset_id"],
            model_name=d["model_name"],
            model_type=d["model_type"],
            target_column=d["target_column"],
            target_type=d["target_type"],
            metrics=metrics,
            top_features=[],
            features_count=len(features),
            created_at=d["created_at"],
            evaluation_label=eval_label,
            circular_evaluation_risk=circ_risk,
            is_independent_ground_truth=ind_gt
        ))
    return results


@router.post("/prediction/predict", response_model=List[PredictionItem])
def predict_cells(request: PredictRequest):
    """Applies a trained model to predict cellular states for all cells in the dataset."""
    df_expr, df_meta = _load_dataset_matrices(request.dataset_id)
    try:
        preds = predict_dataset_states(request.model_id, df_expr, df_meta)
        return preds
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/prediction/models/{model_id}/export-predictions-csv")
def export_predictions_csv(model_id: str, dataset_id: str):
    """Exports model predictions for a dataset as a downloadable CSV."""
    from fastapi.responses import Response
    import io
    import csv

    df_expr, df_meta = _load_dataset_matrices(dataset_id)
    try:
        preds = predict_dataset_states(model_id, df_expr, df_meta)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["cell_id", "true_label", "predicted_label", "predicted_numeric", "true_numeric", "probabilities"])
    for p in preds:
        writer.writerow([
            p.cell_id,
            p.true_label or "",
            p.predicted_label,
            p.predicted_numeric if p.predicted_numeric is not None else "",
            p.true_numeric if p.true_numeric is not None else "",
            json.dumps(p.probabilities) if p.probabilities else ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="predictions_{model_id}.csv"'}
    )
