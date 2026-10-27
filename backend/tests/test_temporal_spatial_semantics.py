import pytest
import numpy as np
import pandas as pd
from backend.app.services.visualization_4d import generate_4d_cell_scene_data


def test_missing_temporal_metadata():
    """Verify that dataset without temporal metadata has has_temporal_metadata=False, is_longitudinal=False, timepoint=0.0."""
    n_cells = 20
    n_genes = 10
    expr = np.random.poisson(lam=5.0, size=(n_cells, n_genes))
    cell_ids = [f"CELL_{i:03d}" for i in range(n_cells)]
    df_expr = pd.DataFrame(expr, index=cell_ids, columns=[f"GENE_{j}" for j in range(n_genes)])
    
    # Metadata without time columns
    df_meta = pd.DataFrame({
        "cell_id": cell_ids,
        "cell_state": ["State_A" if i < 10 else "State_B" for i in range(n_cells)]
    })

    scene = generate_4d_cell_scene_data(df_expr, df_meta)

    assert scene["has_temporal_metadata"] is False
    assert scene["is_longitudinal"] is False
    assert scene["available_timepoints"] == [0.0]
    assert "Cross-Sectional Snapshot" in scene["temporal_mode"]
    assert "No Temporal Observations" in scene["temporal_mode"]

    # All particles should have timepoint 0.0, not fabricated modulo intervals
    for p in scene["particles"]:
        assert p["timepoint"] == 0.0


def test_incomplete_temporal_metadata_with_nans():
    """Verify that incomplete or partially corrupted timepoint metadata drops NaNs safely."""
    n_cells = 15
    n_genes = 8
    expr = np.random.poisson(lam=4.0, size=(n_cells, n_genes))
    cell_ids = [f"CELL_{i:03d}" for i in range(n_cells)]
    df_expr = pd.DataFrame(expr, index=cell_ids, columns=[f"GENE_{j}" for j in range(n_genes)])

    # Timepoints with NaNs and strings
    time_vals = [0.0, np.nan, "invalid", 12.0, 12.0, np.nan, 24.0, 0.0, 12.0, 24.0, np.nan, 0.0, 12.0, 24.0, 0.0]
    df_meta = pd.DataFrame({
        "cell_id": cell_ids,
        "timepoint_hours": time_vals,
        "cell_state": ["Default"] * n_cells
    })

    scene = generate_4d_cell_scene_data(df_expr, df_meta)

    assert scene["has_temporal_metadata"] is True
    assert scene["is_longitudinal"] is True
    assert sorted(scene["available_timepoints"]) == [0.0, 12.0, 24.0]
    
    # Cells with NaN or invalid should fall back to timepoints[0] (0.0) without crash
    for p in scene["particles"]:
        assert p["timepoint"] in [0.0, 12.0, 24.0]


def test_single_timepoint_cross_sectional_metadata():
    """Verify that metadata with a single timepoint is recognized as cross-sectional snapshot, not longitudinal."""
    n_cells = 12
    n_genes = 6
    expr = np.random.poisson(lam=3.0, size=(n_cells, n_genes))
    cell_ids = [f"CELL_{i:03d}" for i in range(n_cells)]
    df_expr = pd.DataFrame(expr, index=cell_ids, columns=[f"GENE_{j}" for j in range(n_genes)])

    df_meta = pd.DataFrame({
        "cell_id": cell_ids,
        "timepoint_hours": [24.0] * n_cells,
        "cell_state": ["Resting"] * n_cells
    })

    scene = generate_4d_cell_scene_data(df_expr, df_meta)

    assert scene["has_temporal_metadata"] is True
    assert scene["is_longitudinal"] is False
    assert scene["available_timepoints"] == [24.0]
    assert "Cross-Sectional Snapshot" in scene["temporal_mode"]
    assert "Single Timepoint" in scene["temporal_mode"]

    for p in scene["particles"]:
        assert p["timepoint"] == 24.0


def test_spatial_mode_distinction():
    """Verify distinct labeling and coordinates for PCA transcriptomic embedding vs physical spatial coordinates."""
    n_cells = 10
    n_genes = 8
    expr = np.random.poisson(lam=5.0, size=(n_cells, n_genes))
    cell_ids = [f"CELL_{i:03d}" for i in range(n_cells)]
    df_expr = pd.DataFrame(expr, index=cell_ids, columns=[f"GENE_{j}" for j in range(n_genes)])

    # Case 1: No spatial metadata -> PCA embedding
    scene_pca = generate_4d_cell_scene_data(df_expr, None)
    assert scene_pca["spatial_mode"] == "Conceptual 3D Transcriptomic Embedding (PCA)"
    # PCA coordinates should be bounded within cell radius (~12)
    for p in scene_pca["particles"]:
        assert abs(p["x"]) <= 12.0
        assert abs(p["y"]) <= 12.0
        assert abs(p["z"]) <= 12.0

    # Case 2: Observed physical spatial coordinates provided
    df_meta_spatial = pd.DataFrame({
        "cell_id": cell_ids,
        "spatial_x": [float(i * 1.5) for i in range(n_cells)],
        "spatial_y": [float(i * -0.5) for i in range(n_cells)],
        "spatial_z": [2.5] * n_cells
    })
    scene_spatial = generate_4d_cell_scene_data(df_expr, df_meta_spatial)
    assert scene_spatial["spatial_mode"] == "Observed Experimental Spatial Coordinates"
    assert scene_spatial["particles"][2]["x"] == 3.0
    assert scene_spatial["particles"][2]["y"] == -1.0
    assert scene_spatial["particles"][2]["z"] == 2.5
