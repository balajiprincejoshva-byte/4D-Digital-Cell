import uuid
from datetime import datetime
from typing import Tuple, Dict, Any, List
import numpy as np
import pandas as pd

from backend.app.schemas.dataset import PreprocessingConfig, PreprocessingResult
from backend.app.services.qc import filter_cells_and_genes


def normalize_total_counts(df: pd.DataFrame, target_sum: float = 10000.0) -> pd.DataFrame:
    """Normalizes expression counts in each cell so they sum to target_sum (CPM)."""
    cell_sums = df.sum(axis=1)
    scale_factors = target_sum / np.clip(cell_sums, 1e-6, None)
    return df.multiply(scale_factors, axis=0)


def log1p_transform(df: pd.DataFrame) -> pd.DataFrame:
    """Applies natural log(1 + x) transformation to stabilize variance."""
    return np.log1p(df)


def select_highly_variable_genes(df: pd.DataFrame, n_top: int = 500) -> List[str]:
    """
    Selects highly variable genes by dispersion (variance-to-mean ratio).
    """
    means = df.mean(axis=0)
    vars = df.var(axis=0)
    # Dispersion measure: variance / mean (regularized)
    dispersion = vars / np.clip(means, 1e-4, None)
    
    # Filter out unexpressed genes
    valid_genes = means[means > 0.01].index
    dispersion_valid = dispersion.loc[valid_genes]
    
    top_genes = dispersion_valid.nlargest(min(n_top, len(dispersion_valid))).index.tolist()
    return top_genes


def scale_features(df: pd.DataFrame, max_value: float = 10.0) -> pd.DataFrame:
    """Z-score standardization across cells for each gene, clipped at max_value."""
    means = df.mean(axis=0)
    stds = df.std(axis=0)
    stds[stds == 0] = 1.0
    scaled = (df - means) / stds
    return scaled.clip(-max_value, max_value)


def run_preprocessing_pipeline(
    df_raw: pd.DataFrame,
    config: PreprocessingConfig
) -> Tuple[pd.DataFrame, pd.DataFrame, PreprocessingResult]:
    """
    Executes full quality control and preprocessing pipeline:
    1. QC threshold filtering
    2. Total count normalization (CPM)
    3. Log1p transformation (normalized log expression)
    4. Highly variable genes selection
    5. Feature scaling (z-scored matrix)
    """
    # 1. QC Filter
    df_filtered, qc_summary = filter_cells_and_genes(
        df_raw,
        min_genes=config.min_genes_per_cell,
        max_genes=config.max_genes_per_cell,
        min_cells_per_gene=config.min_cells_per_gene,
        max_mito_percent=config.max_mito_percent
    )

    # 2. Total count normalization
    df_norm = normalize_total_counts(df_filtered, target_sum=config.target_sum)

    # 3. Log1p
    if config.apply_log1p:
        df_log = log1p_transform(df_norm)
    else:
        df_log = df_norm

    # 4. Highly variable genes
    hvg = select_highly_variable_genes(df_log, n_top=config.n_top_variable_genes)
    if not hvg:
        hvg = list(df_log.columns)

    # 5. Scaled data
    if config.scale_data:
        df_scaled = scale_features(df_log[hvg])
    else:
        df_scaled = df_log[hvg].copy()

    run_id = f"prep_{uuid.uuid4().hex[:8]}"
    summary_text = (
        f"Filtered {qc_summary['cells_removed']} cells and {qc_summary['genes_removed']} genes. "
        f"Normalized to {config.target_sum:,.0f} counts/cell with log1p. "
        f"Selected {len(hvg)} highly variable genes."
    )

    result = PreprocessingResult(
        run_id=run_id,
        dataset_id=config.dataset_id,
        original_n_cells=qc_summary["original_cells"],
        original_n_genes=qc_summary["original_genes"],
        filtered_n_cells=qc_summary["filtered_cells"],
        filtered_n_genes=qc_summary["filtered_genes"],
        cells_removed_qc=qc_summary["cells_removed"],
        genes_removed_qc=qc_summary["genes_removed"],
        highly_variable_genes=hvg,
        created_at=datetime.utcnow().isoformat(),
        parameters=config.model_dump(),
        summary_text=summary_text
    )

    return df_log, df_scaled, result
