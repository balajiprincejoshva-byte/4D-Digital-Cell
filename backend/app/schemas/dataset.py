from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class DatasetInfo(BaseModel):
    id: str
    name: str
    filename: str
    format: str
    n_cells: int
    n_genes: int
    is_synthetic: bool = False
    orientation: str  # "cells_by_genes" or "genes_by_cells"
    created_at: str
    metadata_columns: List[str] = []
    qc_summary: Optional[Dict[str, Any]] = None
    provenance: Optional[Dict[str, Any]] = None
    annotation_provenance: str = "computational_heuristic"  # "experimental_reference", "published_curated", "computational_heuristic", "synthetic", "unknown"
    is_independent_ground_truth: bool = False
    marker_genes_used_for_annotation: List[str] = []
    qc_scope: str = "whole_transcriptome"  # "whole_transcriptome" or "reduced_panel"


class DatasetPreview(BaseModel):
    id: str
    name: str
    n_cells: int
    n_genes: int
    cell_ids_sample: List[str]
    gene_ids_sample: List[str]
    metadata_columns: List[str]
    preview_matrix: List[List[float]]
    orientation: str
    is_synthetic: bool
    validation_warnings: List[str] = []
    annotation_provenance: Optional[str] = "computational_heuristic"
    is_independent_ground_truth: Optional[bool] = False
    marker_genes_used_for_annotation: Optional[List[str]] = []
    qc_scope: Optional[str] = "whole_transcriptome"


class IngestionValidationResult(BaseModel):
    valid: bool
    detected_orientation: str
    confidence: float
    n_cells: int
    n_genes: int
    cell_id_col: Optional[str] = None
    gene_id_col: Optional[str] = None
    duplicate_cell_ids: int = 0
    duplicate_gene_ids: int = 0
    missing_values_count: int = 0
    non_numeric_entries: int = 0
    empty_cells: int = 0
    empty_genes: int = 0
    warnings: List[str] = []
    errors: List[str] = []


class PreprocessingConfig(BaseModel):
    dataset_id: str
    min_genes_per_cell: int = 10
    max_genes_per_cell: Optional[int] = None
    min_cells_per_gene: int = 3
    max_mito_percent: float = 20.0
    target_sum: float = 10000.0
    apply_log1p: bool = True
    n_top_variable_genes: int = 500
    scale_data: bool = True


class PreprocessingResult(BaseModel):
    run_id: str
    dataset_id: str
    original_n_cells: int
    original_n_genes: int
    filtered_n_cells: int
    filtered_n_genes: int
    cells_removed_qc: int
    genes_removed_qc: int
    highly_variable_genes: List[str]
    created_at: str
    parameters: Dict[str, Any]
    summary_text: str
