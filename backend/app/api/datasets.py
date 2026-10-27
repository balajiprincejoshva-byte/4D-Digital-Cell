import json
import uuid
import shutil
from pathlib import Path
from typing import List, Optional
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from backend.app.core.config import UPLOAD_DIR, DEMO_DIR
from backend.app.core.database import get_db_connection
from backend.app.schemas.dataset import DatasetInfo, DatasetPreview, IngestionValidationResult
from backend.app.services.ingestion import (
    generate_synthetic_demo_dataset,
    validate_expression_file,
    register_dataset
)
from backend.app.services.qc import calculate_qc_metrics

router = APIRouter()


@router.post("/demo/initialize", response_model=DatasetInfo)
def initialize_demo():
    """Generates and registers the synthetic demonstration dataset."""
    expr_file, meta_file, dataset_id = generate_synthetic_demo_dataset()
    
    # Read matrix to calculate QC
    df_expr = pd.read_csv(expr_file, index_col=0)
    qc = calculate_qc_metrics(df_expr)
    
    provenance = {
        "source": "In-silico Synthetic Generator (Poisson read counts with dropout)",
        "generator_seed": 42,
        "is_synthetic": True,
        "annotation_provenance": "synthetic",
        "is_independent_ground_truth": False,
        "marker_genes_used_for_annotation": [],
        "qc_scope": "reduced_panel",
        "organism": "Simulated Human Cell Lineage",
        "biological_states": ["Progenitor", "Myogenic", "Neural", "Stressed"],
        "disclaimer": "SYNTHETIC DEMO DATA — NOT EXPERIMENTAL BIOLOGY"
    }

    info = register_dataset(
        dataset_id=dataset_id,
        name="Synthetic 4D Cellular Lineage (Demo)",
        filename=expr_file.name,
        file_path=expr_file,
        metadata_path=meta_file,
        n_cells=df_expr.shape[0],
        n_genes=df_expr.shape[1],
        is_synthetic=True,
        orientation="cells_by_genes",
        qc_summary=qc,
        provenance=provenance
    )
    return info


@router.post("/real-data/initialize", response_model=DatasetInfo)
def initialize_real_data():
    """Initializes and registers the 10x Genomics PBMC 3k real single-cell RNA-seq benchmark dataset."""
    from backend.scripts.prepare_real_pbmc_dataset import build_real_pbmc_dataset
    info = build_real_pbmc_dataset(sample_cells=250)
    return info


@router.get("/datasets", response_model=List[DatasetInfo])
def list_datasets():
    """Returns all registered datasets."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datasets ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        qc = json.loads(d["qc_summary_json"]) if d["qc_summary_json"] else None
        prov = json.loads(d["provenance_json"]) if d["provenance_json"] else None
        
        meta_cols = []
        if d["metadata_path"] and Path(d["metadata_path"]).exists():
            try:
                m_df = pd.read_csv(d["metadata_path"], nrows=2)
                meta_cols = list(m_df.columns)
            except Exception:
                pass

        ann_prov = (
            prov.get("annotation_provenance", "synthetic" if d["is_synthetic"] else "computational_heuristic")
            if prov else ("synthetic" if d["is_synthetic"] else "computational_heuristic")
        )
        is_ground = bool(prov.get("is_independent_ground_truth", False)) if prov else False
        markers_used = list(prov.get("marker_genes_used_for_annotation", [])) if prov else []
        scope = (
            qc.get("qc_scope", prov.get("qc_scope", "whole_transcriptome" if d["n_genes"] >= 1000 else "reduced_panel"))
            if (qc or prov) else ("whole_transcriptome" if d["n_genes"] >= 1000 else "reduced_panel")
        )

        results.append(DatasetInfo(
            id=d["id"],
            name=d["name"],
            filename=d["filename"],
            format=d["format"],
            n_cells=d["n_cells"],
            n_genes=d["n_genes"],
            is_synthetic=bool(d["is_synthetic"]),
            orientation=d["orientation"],
            created_at=d["created_at"],
            metadata_columns=meta_cols,
            qc_summary=qc,
            provenance=prov,
            annotation_provenance=ann_prov,
            is_independent_ground_truth=is_ground,
            marker_genes_used_for_annotation=markers_used,
            qc_scope=scope
        ))
    return results


@router.get("/datasets/{dataset_id}", response_model=DatasetPreview)
def get_dataset_preview(dataset_id: str):
    """Retrieves dataset preview, dimensions, and sample expression values."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    d = dict(row)
    file_path = Path(d["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dataset expression matrix file missing on disk.")

    sep = "\t" if file_path.suffix.lower() == ".tsv" else ","
    df = pd.read_csv(file_path, sep=sep, index_col=0)

    # Orientation normalization
    if d["orientation"] == "genes_by_cells":
        df = df.T

    meta_cols = []
    if d["metadata_path"] and Path(d["metadata_path"]).exists():
        try:
            m_df = pd.read_csv(d["metadata_path"], nrows=2)
            meta_cols = list(m_df.columns)
        except Exception:
            pass

    # Preview 10 cells x 10 genes
    sample_df = df.iloc[:10, :10]

    prov = json.loads(d["provenance_json"]) if d["provenance_json"] else {}
    qc = json.loads(d["qc_summary_json"]) if d["qc_summary_json"] else {}

    ann_prov = prov.get("annotation_provenance", "synthetic" if d["is_synthetic"] else "computational_heuristic")
    is_ground = bool(prov.get("is_independent_ground_truth", False))
    scope = qc.get("qc_scope", prov.get("qc_scope", "whole_transcriptome" if df.shape[1] >= 1000 else "reduced_panel"))

    return DatasetPreview(
        id=d["id"],
        name=d["name"],
        n_cells=df.shape[0],
        n_genes=df.shape[1],
        cell_ids_sample=list(sample_df.index),
        gene_ids_sample=list(sample_df.columns),
        metadata_columns=meta_cols,
        preview_matrix=sample_df.values.tolist(),
        orientation=d["orientation"],
        is_synthetic=bool(d["is_synthetic"]),
        validation_warnings=[],
        annotation_provenance=ann_prov,
        is_independent_ground_truth=is_ground,
        marker_genes_used_for_annotation=list(prov.get("marker_genes_used_for_annotation", [])),
        qc_scope=scope
    )


@router.post("/datasets/upload", response_model=DatasetInfo)
async def upload_dataset(
    name: str = Form(...),
    forced_orientation: Optional[str] = Form(None),
    expression_file: UploadFile = File(...),
    metadata_file: Optional[UploadFile] = File(None)
):
    """Uploads, validates, and registers a new expression matrix and optional metadata."""
    safe_expr_filename = Path(expression_file.filename).name
    if not (safe_expr_filename.endswith(".csv") or safe_expr_filename.endswith(".tsv")):
        raise HTTPException(status_code=400, detail="Only CSV and TSV expression matrices are currently supported.")

    ds_id = f"ds_{uuid.uuid4().hex[:8]}"
    expr_save_path = UPLOAD_DIR / f"{ds_id}_{safe_expr_filename}"
    
    with open(expr_save_path, "wb") as buffer:
        shutil.copyfileobj(expression_file.file, buffer)

    # Check upload size limit
    if expr_save_path.stat().st_size > 50 * 1024 * 1024:
        expr_save_path.unlink()
        raise HTTPException(status_code=413, detail="Uploaded file exceeds the maximum 50 MB limit.")

    meta_save_path = None
    if metadata_file and metadata_file.filename:
        safe_meta_filename = Path(metadata_file.filename).name
        meta_save_path = UPLOAD_DIR / f"{ds_id}_{safe_meta_filename}"
        with open(meta_save_path, "wb") as buffer:
            shutil.copyfileobj(metadata_file.file, buffer)

    # Validate
    validation, df = validate_expression_file(expr_save_path, forced_orientation=forced_orientation)
    if not validation.valid:
        # Cleanup
        if expr_save_path.exists():
            expr_save_path.unlink()
        if meta_save_path and meta_save_path.exists():
            meta_save_path.unlink()
        raise HTTPException(status_code=422, detail={
            "message": "Dataset validation failed",
            "errors": validation.errors,
            "warnings": validation.warnings
        })

    # Save standardized matrix (cells by genes)
    df.to_csv(expr_save_path)

    # Calculate QC
    qc = calculate_qc_metrics(df)

    provenance = {
        "source": "User Upload",
        "original_filename": expression_file.filename,
        "is_synthetic": False,
        "detected_orientation": validation.detected_orientation,
        "validation_warnings": validation.warnings
    }

    info = register_dataset(
        dataset_id=ds_id,
        name=name,
        filename=expression_file.filename,
        file_path=expr_save_path,
        metadata_path=meta_save_path,
        n_cells=df.shape[0],
        n_genes=df.shape[1],
        is_synthetic=False,
        orientation="cells_by_genes",
        qc_summary=qc,
        provenance=provenance
    )
    return info


@router.delete("/datasets/{dataset_id}")
def delete_dataset(dataset_id: str):
    """Safely deletes dataset records and associated files."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found.")

    d = dict(row)
    if d["file_path"] and Path(d["file_path"]).exists() and "demo" not in d["file_path"]:
        Path(d["file_path"]).unlink()
    if d["metadata_path"] and Path(d["metadata_path"]).exists() and "demo" not in d["metadata_path"]:
        Path(d["metadata_path"]).unlink()

    cursor.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
    cursor.execute("DELETE FROM preprocessing_runs WHERE dataset_id = ?", (dataset_id,))
    cursor.execute("DELETE FROM analysis_runs WHERE dataset_id = ?", (dataset_id,))
    cursor.execute("DELETE FROM models WHERE dataset_id = ?", (dataset_id,))
    cursor.execute("DELETE FROM perturbation_runs WHERE dataset_id = ?", (dataset_id,))
    conn.commit()
    conn.close()

    return {"status": "deleted", "dataset_id": dataset_id}
