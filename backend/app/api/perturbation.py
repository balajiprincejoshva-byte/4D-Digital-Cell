import json
from typing import List
from fastapi import APIRouter, HTTPException

from backend.app.core.database import get_db_connection
from backend.app.schemas.perturbation import PerturbationRequest, PerturbationResult
from backend.app.services.perturbation import run_in_silico_perturbation
from backend.app.api.analysis import _load_dataset_matrices

router = APIRouter()


@router.post("/perturbation/simulate", response_model=PerturbationResult)
def simulate_perturbation(request: PerturbationRequest):
    """Executes an in-silico genetic perturbation (knockout, down-reg, up-reg) using a trained model."""
    df_expr, _ = _load_dataset_matrices(request.dataset_id)
    try:
        result = run_in_silico_perturbation(df_expr, request)
        return result
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/perturbation/runs/{dataset_id}", response_model=List[PerturbationResult])
def list_perturbations(dataset_id: str):
    """Retrieves all past perturbation runs for a dataset."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM perturbation_runs WHERE dataset_id = ? ORDER BY created_at DESC", (dataset_id,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        summary = json.loads(d["summary_json"])
        results.append(PerturbationResult(**summary))
    return results


@router.get("/perturbation/run/{run_id}/export-csv")
def export_perturbation_csv(run_id: str):
    """Exports per-cell perturbation deltas as a downloadable CSV."""
    from fastapi.responses import Response
    import io
    import csv

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM perturbation_runs WHERE id = ?", (run_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail=f"Perturbation run '{run_id}' not found.")

    d = dict(row)
    summary = json.loads(d["summary_json"])
    deltas = summary.get("all_cell_deltas", summary.get("cell_deltas_sample", []))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "cell_id",
        "baseline_state",
        "perturbed_state",
        "state_changed",
        "baseline_probability",
        "perturbed_probability",
        "probability_delta",
        "baseline_numeric",
        "perturbed_numeric",
        "numeric_delta"
    ])
    for cd in deltas:
        writer.writerow([
            cd.get("cell_id", ""),
            cd.get("baseline_state", ""),
            cd.get("perturbed_state", ""),
            cd.get("state_changed", False),
            cd.get("baseline_probability", ""),
            cd.get("perturbed_probability", ""),
            cd.get("probability_delta", ""),
            cd.get("baseline_numeric", ""),
            cd.get("perturbed_numeric", ""),
            cd.get("numeric_delta", "")
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="perturbation_{run_id}.csv"'}
    )
