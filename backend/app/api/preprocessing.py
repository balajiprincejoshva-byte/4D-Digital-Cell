import json
from pathlib import Path
import pandas as pd
from fastapi import APIRouter, HTTPException

from backend.app.core.database import get_db_connection
from backend.app.schemas.dataset import PreprocessingConfig, PreprocessingResult
from backend.app.services.preprocessing import run_preprocessing_pipeline

router = APIRouter()


@router.post("/preprocessing/run", response_model=PreprocessingResult)
def execute_preprocessing(config: PreprocessingConfig):
    """Executes QC filtering, normalization, log1p, HVG selection, and scaling on the dataset."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datasets WHERE id = ?", (config.dataset_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found.")

    ds = dict(row)
    file_path = Path(ds["file_path"])
    sep = "\t" if file_path.suffix.lower() == ".tsv" else ","
    df_raw = pd.read_csv(file_path, sep=sep, index_col=0)

    if ds["orientation"] == "genes_by_cells":
        df_raw = df_raw.T

    # Run pipeline
    df_log, df_scaled, result = run_preprocessing_pipeline(df_raw, config)

    # Save preprocessed matrix to disk
    prep_dir = file_path.parent / "preprocessed"
    prep_dir.mkdir(parents=True, exist_ok=True)
    prep_path = prep_dir / f"{config.dataset_id}_preprocessed.csv"
    df_log.to_csv(prep_path)

    # Persist run in DB
    cursor.execute("""
        INSERT INTO preprocessing_runs (id, dataset_id, config_json, summary_json, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (
        result.run_id,
        config.dataset_id,
        json.dumps(config.model_dump()),
        json.dumps(result.model_dump()),
        result.created_at
    ))
    conn.commit()
    conn.close()

    return result
