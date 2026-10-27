import pytest
import numpy as np
import pandas as pd

from backend.app.services.qc import calculate_qc_metrics, filter_cells_and_genes
from backend.app.services.preprocessing import (
    normalize_total_counts,
    log1p_transform,
    select_highly_variable_genes,
    scale_features,
    run_preprocessing_pipeline
)
from backend.app.schemas.dataset import PreprocessingConfig


def test_qc_metrics_calculation():
    # 5 cells, 4 genes including a mitochondrial gene
    df = pd.DataFrame([
        [10.0, 5.0, 20.0, 5.0],   # cell 1 (sum=40, mito=5 -> 12.5%)
        [0.0, 0.0, 1.0, 9.0],     # cell 2 (sum=10, mito=9 -> 90%)
        [50.0, 30.0, 20.0, 0.0],  # cell 3 (sum=100, mito=0 -> 0%)
        [15.0, 15.0, 10.0, 10.0], # cell 4 (sum=50, mito=10 -> 20%)
        [5.0, 5.0, 5.0, 5.0]      # cell 5 (sum=20, mito=5 -> 25%)
    ], index=[f"C_{i}" for i in range(5)], columns=["GENE_A", "GENE_B", "GENE_C", "MT-CO1"])

    qc = calculate_qc_metrics(df)
    assert qc["n_cells"] == 5
    assert qc["n_genes"] == 4
    assert qc["mitochondrial_percent"]["detected_mito_genes_count"] == 1
    assert qc["total_counts"]["mean"] == (40 + 10 + 100 + 50 + 20) / 5


def test_qc_threshold_filtering():
    df = pd.DataFrame([
        [10.0, 5.0, 20.0, 5.0],   # mito = 12.5% -> keep
        [0.0, 0.0, 1.0, 19.0],    # mito = 95% -> remove (exceeds max_mito=20%)
        [50.0, 30.0, 20.0, 0.0],  # mito = 0% -> keep
    ], index=["C1", "C2", "C3"], columns=["GENE_A", "GENE_B", "GENE_C", "MT-CO1"])

    filtered_df, summary = filter_cells_and_genes(df, min_genes=1, max_mito_percent=20.0, min_cells_per_gene=1)
    assert "C2" not in filtered_df.index
    assert "C1" in filtered_df.index
    assert "C3" in filtered_df.index
    assert summary["cells_removed"] == 1


def test_normalization_and_log1p_fixture():
    # Known fixture: cell sums are 100 and 200
    df = pd.DataFrame([
        [20.0, 80.0],
        [100.0, 100.0]
    ], index=["C1", "C2"], columns=["G1", "G2"])

    # Target sum 10,000
    norm_df = normalize_total_counts(df, target_sum=10000.0)
    assert np.allclose(norm_df.sum(axis=1), [10000.0, 10000.0])

    log_df = log1p_transform(norm_df)
    assert np.allclose(log_df.iloc[0, 0], np.log1p(2000.0))


def test_preprocessing_pipeline_run():
    df = pd.DataFrame(
        np.random.poisson(10, (20, 15)),
        index=[f"CELL_{i}" for i in range(20)],
        columns=[f"GENE_{j}" for j in range(15)]
    )
    config = PreprocessingConfig(
        dataset_id="test_ds",
        min_genes_per_cell=2,
        min_cells_per_gene=1,
        max_mito_percent=50.0,
        target_sum=10000.0,
        apply_log1p=True,
        n_top_variable_genes=10,
        scale_data=True
    )
    df_log, df_scaled, result = run_preprocessing_pipeline(df, config)
    assert result.filtered_n_cells > 0
    assert len(result.highly_variable_genes) <= 10
    assert df_scaled.shape[1] == len(result.highly_variable_genes)
