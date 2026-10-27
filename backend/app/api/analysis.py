import json
from pathlib import Path
from typing import Optional
import pandas as pd
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from backend.app.core.database import get_db_connection
from backend.app.schemas.analysis import (
    EmbeddingResult,
    ClusterAnalysisResult,
    GeneExpressionLookup,
    CorrelationResponse
)
from backend.app.services.analysis import (
    compute_embeddings,
    compute_clustering_and_markers,
    lookup_gene_expression,
    compute_gene_correlations
)

router = APIRouter()


class EmbeddingRequest(BaseModel):
    dataset_id: str
    method: str = "PCA"
    n_components: int = 3
    random_state: int = 42


class ClusterRequest(BaseModel):
    dataset_id: str
    n_clusters: int = 4
    random_state: int = 42


def _load_dataset_matrices(dataset_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    ds = dict(row)
    file_path = Path(ds["file_path"])

    # Prefer preprocessed matrix if exists
    prep_path = file_path.parent / "preprocessed" / f"{dataset_id}_preprocessed.csv"
    if prep_path.exists():
        df_expr = pd.read_csv(prep_path, index_col=0)
    else:
        sep = "\t" if file_path.suffix.lower() == ".tsv" else ","
        df_expr = pd.read_csv(file_path, sep=sep, index_col=0)
        if ds["orientation"] == "genes_by_cells":
            df_expr = df_expr.T

    # Load metadata if exists
    df_meta = None
    if ds["metadata_path"] and Path(ds["metadata_path"]).exists():
        df_meta = pd.read_csv(ds["metadata_path"])

    return df_expr, df_meta


@router.post("/analysis/embeddings", response_model=EmbeddingResult)
def get_embeddings(request: EmbeddingRequest):
    """Calculates 2D/3D PCA or UMAP embeddings for all cells in the dataset."""
    df_expr, df_meta = _load_dataset_matrices(request.dataset_id)
    res = compute_embeddings(
        df_expr=df_expr,
        df_meta=df_meta,
        method=request.method,
        n_components=request.n_components,
        random_state=request.random_state
    )
    res.dataset_id = request.dataset_id
    return res


@router.post("/analysis/clusters", response_model=ClusterAnalysisResult)
def get_clusters(request: ClusterRequest):
    """Computes K-Means clustering and differential marker genes across clusters."""
    df_expr, _ = _load_dataset_matrices(request.dataset_id)
    res = compute_clustering_and_markers(
        df_expr=df_expr,
        n_clusters=request.n_clusters,
        random_state=request.random_state
    )
    res.dataset_id = request.dataset_id
    return res


@router.get("/analysis/gene/{dataset_id}/{gene_symbol}", response_model=GeneExpressionLookup)
def get_gene_lookup(dataset_id: str, gene_symbol: str):
    """Retrieves single-cell expression distribution and metadata breakdown for a specific gene."""
    df_expr, df_meta = _load_dataset_matrices(dataset_id)
    return lookup_gene_expression(df_expr, gene_symbol, df_meta)


@router.get("/analysis/correlations/{dataset_id}", response_model=CorrelationResponse)
def get_correlations(dataset_id: str, target_column: Optional[str] = None):
    """Calculates dataset-wide Pearson correlations, p-values, and FDR q-values for all genes."""
    df_expr, df_meta = _load_dataset_matrices(dataset_id)
    try:
        res = compute_gene_correlations(
            df_expr=df_expr,
            df_meta=df_meta,
            dataset_id=dataset_id,
            target_column=target_column
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
