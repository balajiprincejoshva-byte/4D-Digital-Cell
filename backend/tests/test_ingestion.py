import pytest
import numpy as np
import pandas as pd
from pathlib import Path
import tempfile

from backend.app.services.ingestion import (
    generate_synthetic_demo_dataset,
    detect_matrix_orientation,
    validate_expression_file,
    register_dataset
)
from backend.app.core.database import init_db, get_db_connection


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def test_synthetic_demo_generation():
    expr_file, meta_file, dataset_id = generate_synthetic_demo_dataset()
    assert expr_file.exists()
    assert meta_file.exists()
    assert dataset_id == "demo_synthetic_4d_cell"

    df_expr = pd.read_csv(expr_file, index_col=0)
    df_meta = pd.read_csv(meta_file)

    # 400 cells, 60 genes
    assert df_expr.shape == (400, 60)
    assert len(df_meta) == 400
    assert "cell_state" in df_meta.columns
    assert "timepoint_hours" in df_meta.columns
    assert "spatial_x" in df_meta.columns
    assert set(df_meta["cell_state"]).issubset({"Progenitor", "Myogenic", "Neural", "Stressed"})


def test_orientation_detection():
    # Cells as rows, genes as columns
    cells_x_genes = pd.DataFrame(
        np.random.poisson(5, (10, 5)),
        index=[f"CELL_{i}" for i in range(10)],
        columns=["OCT4", "SOX2", "NANOG", "GAPDH", "ACTB"]
    )
    orient, conf, _ = detect_matrix_orientation(cells_x_genes)
    assert orient == "cells_by_genes"
    assert conf >= 0.60

    # Genes as rows, cells as columns
    genes_x_cells = cells_x_genes.T
    orient_t, conf_t, _ = detect_matrix_orientation(genes_x_cells)
    assert orient_t == "genes_by_cells"
    assert conf_t >= 0.60


def test_file_validation_with_duplicates_and_non_numerics(tmp_path):
    # Create CSV with duplicate rows and columns and non-numeric value
    file_path = tmp_path / "test_dirty_matrix.csv"
    with open(file_path, "w") as f:
        f.write("cell_id,OCT4,OCT4,SOX2,NANOG,GAPDH\n")
        f.write("CELL_1,5,5,10,2,8\n")
        f.write("CELL_1,3,3,7,1,4\n")
        f.write("CELL_2,0,0,1,0,3\n")
        f.write("CELL_3,12,12,NA,4,15\n")
        f.write("CELL_4,1,1,2,0,5\n")
        f.write("CELL_5,8,8,9,3,10\n")

    val_res, clean_df = validate_expression_file(file_path)
    assert val_res.valid is True
    assert val_res.duplicate_cell_ids > 0 or val_res.duplicate_gene_ids > 0
    # Duplicates should be disambiguated
    assert not clean_df.index.duplicated().any()
    assert not clean_df.columns.duplicated().any()
    assert not clean_df.isna().any().any()


def test_invalid_file_rejection(tmp_path):
    # Too small matrix (<5x5)
    file_path = tmp_path / "too_small.csv"
    pd.DataFrame({"A": [1, 2], "B": [3, 4]}).to_csv(file_path)
    val_res, _ = validate_expression_file(file_path)
    assert val_res.valid is False
    assert len(val_res.errors) > 0
