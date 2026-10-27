import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.decomposition import PCA


def generate_4d_cell_scene_data(
    df_expr: pd.DataFrame,
    df_meta: Optional[pd.DataFrame] = None,
    active_gene: Optional[str] = None,
    perturbation_deltas: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Constructs the 3D cell structural coordinate payload and temporal trajectory mappings
    for the Three.js / React Three Fiber interactive viewport.
    """
    n_cells = len(df_expr.index)
    cell_ids = list(df_expr.index)

    # Check for observed spatial coordinates in metadata
    has_spatial = False
    coords = np.zeros((n_cells, 3), dtype=float)

    meta_dict = {}
    if df_meta is not None and not df_meta.empty:
        meta_indexed = df_meta.set_index("cell_id") if "cell_id" in df_meta.columns else df_meta
        meta_dict = meta_indexed.to_dict(orient="index")

        if all(k in meta_indexed.columns for k in ["spatial_x", "spatial_y", "spatial_z"]):
            has_spatial = True
            for i, cid in enumerate(cell_ids):
                if cid in meta_indexed.index:
                    coords[i, 0] = float(meta_indexed.loc[cid, "spatial_x"])
                    coords[i, 1] = float(meta_indexed.loc[cid, "spatial_y"])
                    coords[i, 2] = float(meta_indexed.loc[cid, "spatial_z"])

    spatial_mode = "Observed Experimental Spatial Coordinates" if has_spatial else "Conceptual 3D Transcriptomic Embedding (PCA)"

    if not has_spatial:
        # Compute 3D PCA coordinates and scale to cell radius [-12, 12]
        pca = PCA(n_components=3, random_state=42)
        raw_pca = pca.fit_transform(df_expr.values)
        max_abs = np.max(np.abs(raw_pca)) if np.max(np.abs(raw_pca)) > 0 else 1.0
        coords = (raw_pca / max_abs) * 11.5

    # Check temporal metadata
    has_temporal = False
    is_longitudinal = False
    timepoints = []
    matched_time_col = None

    if df_meta is not None and not df_meta.empty:
        meta_indexed = df_meta.set_index("cell_id") if "cell_id" in df_meta.columns else df_meta
        for time_col in ["timepoint_hours", "timepoint", "time", "day", "hour"]:
            if time_col in meta_indexed.columns:
                t_series = pd.to_numeric(meta_indexed[time_col], errors="coerce").dropna()
                if len(t_series) > 0:
                    matched_time_col = time_col
                    has_temporal = True
                    unique_t = sorted(list(t_series.unique()))
                    timepoints = [float(t) for t in unique_t]
                    is_longitudinal = len(timepoints) > 1
                    break

    if has_temporal and is_longitudinal:
        temporal_mode = f"Observed Longitudinal Observations ({len(timepoints)} Timepoints: {timepoints})"
    elif has_temporal and not is_longitudinal:
        temporal_mode = f"Observed Cross-Sectional Snapshot (Single Timepoint: {timepoints[0]}h)"
    else:
        temporal_mode = "Cross-Sectional Snapshot (No Temporal Observations in Dataset)"
        timepoints = [0.0]

    # Active gene expression values
    gene_expr_map = {}
    if active_gene:
        matched = None
        for c in df_expr.columns:
            if c.upper() == active_gene.upper():
                matched = c
                break
        if matched:
            vals = df_expr[matched].values
            max_val = float(vals.max()) if vals.max() > 0 else 1.0
            for i, cid in enumerate(cell_ids):
                gene_expr_map[cid] = round(float(vals[i] / max_val), 4)

    # Perturbation delta mapping
    pert_map = {}
    if perturbation_deltas and "cell_deltas" in perturbation_deltas:
        for item in perturbation_deltas["cell_deltas"]:
            pert_map[item["cell_id"]] = item

    # Build cell particle list
    particles = []
    cell_states_set = set()

    for i, cid in enumerate(cell_ids):
        m = meta_dict.get(cid, {})
        c_state = str(m.get("cell_state", m.get("cell_type", "Default")))
        cell_states_set.add(c_state)

        # Derive cell timepoint: use real observed metadata when present; never invent fake longitudinal timepoints
        t_val = timepoints[0] if has_temporal and len(timepoints) > 0 else 0.0
        if has_temporal and matched_time_col and matched_time_col in m and pd.notna(m[matched_time_col]):
            try:
                t_val = float(m[matched_time_col])
            except (ValueError, TypeError):
                t_val = timepoints[0] if len(timepoints) > 0 else 0.0

        p_info = pert_map.get(cid, None)

        particles.append({
            "cell_id": cid,
            "x": round(float(coords[i, 0]), 3),
            "y": round(float(coords[i, 1]), 3),
            "z": round(float(coords[i, 2]), 3),
            "cell_state": c_state,
            "timepoint": t_val,
            "active_gene_expr": gene_expr_map.get(cid, 0.0),
            "state_changed_by_perturbation": p_info.get("state_changed", False) if p_info else False,
            "perturbed_state": p_info.get("perturbed_state", None) if p_info else None
        })

    structures = {
        "plasma_membrane": {
            "type": "ellipsoid",
            "dimensions": {"radius_x": 16.0, "radius_y": 16.0, "radius_z": 12.0},
            "opacity": 0.15,
            "color": "#06b6d4"  # cyan accent
        },
        "nucleus": {
            "type": "sphere",
            "position": {"x": 0.0, "y": 0.0, "z": 0.0},
            "radius": 4.5,
            "opacity": 0.35,
            "color": "#3b82f6"  # deep blue
        },
        "cytoplasm": {
            "type": "compartment",
            "radius_inner": 4.5,
            "radius_outer": 15.5
        }
    }

    return {
        "dataset_n_cells": n_cells,
        "has_temporal_metadata": has_temporal,
        "is_longitudinal": is_longitudinal,
        "spatial_mode": spatial_mode,
        "temporal_mode": temporal_mode,
        "available_timepoints": timepoints,
        "available_states": sorted(list(cell_states_set)),
        "structures": structures,
        "particles": particles,
        "caveat": (
            "The 3D cell model provides a conceptual spatio-temporal visualization interface. "
            "Organelle boundaries and particle positions represent computational abstractions, "
            "not measured physical microscopy kinetics."
        )
    }
