import re
import uuid
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import pandas as pd

from backend.app.core.config import DEMO_DIR, UPLOAD_DIR
from backend.app.core.database import get_db_connection
from backend.app.schemas.dataset import IngestionValidationResult, DatasetInfo, DatasetPreview

KNOWN_MARKER_GENES = [
    "OCT4", "SOX2", "NANOG", "POU5F1", "MYOD1", "MYOG", "DES",
    "TUBB3", "MAP2", "RBFOX3", "GAPDH", "ACTB", "TP53", "BAX",
    "CDKN1A", "MT-CO1", "MT-CO2", "MT-ND1", "MKI67", "PCNA"
]


def generate_synthetic_demo_dataset() -> Tuple[Path, Path, str]:
    """
    Generates a reproducible, high-fidelity synthetic single-cell gene expression matrix
    with 4 biological states, 60 genes, 400 cells, batch effects, and 4 longitudinal timepoints.
    Fixed seed = 42 for complete reproducibility.
    """
    np.random.seed(42)
    n_cells = 400
    
    # 4 distinct cell states across a developmental/stress trajectory
    states = ["Progenitor", "Myogenic", "Neural", "Stressed"]
    state_probs = [0.30, 0.25, 0.25, 0.20]
    cell_states = np.random.choice(states, size=n_cells, p=state_probs)
    
    timepoints_map = {
        "Progenitor": [0.0, 12.0],
        "Myogenic": [12.0, 24.0, 48.0],
        "Neural": [12.0, 24.0, 48.0],
        "Stressed": [24.0, 48.0]
    }
    cell_timepoints = [float(np.random.choice(timepoints_map[s])) for s in cell_states]
    cell_batches = [f"Batch_{np.random.choice([1, 2], p=[0.55, 0.45])}" for _ in range(n_cells)]
    cell_ids = [f"CELL_{i+1:04d}" for i in range(n_cells)]

    # Gene list (Stem, Muscle, Neuron, Stress, Mito, Housekeeping)
    gene_groups = {
        "Stem": ["POU5F1", "SOX2", "NANOG", "KLF4", "MYC", "LIN28A", "DPPA2", "ZFP42", "TDGF1", "SALL4"],
        "Myo": ["MYOD1", "MYOG", "MYH1", "DES", "TNNT1", "ACTA1", "MEF2C", "CKM", "MYF5", "TNNC1"],
        "Neuro": ["TUBB3", "MAP2", "RBFOX3", "SYP", "SNAP25", "NES", "NEUROD1", "DCX", "GAP43", "NCAM1"],
        "Stress": ["TP53", "BAX", "CDKN1A", "HSPA1A", "GADD45A", "CASP3", "ATF4", "DDIT3", "BBC3", "PMAIP1"],
        "Mito": ["MT-CO1", "MT-CO2", "MT-CO3", "MT-ND1", "MT-ND2", "MT-ND4", "MT-ATP6", "MT-CYB"],
        "Housekeeping": ["GAPDH", "ACTB", "TUBB", "B2M", "RPL13A", "RPLP0", "HPRT1", "TBP", "PPIA", "YWHAZ", "UBC", "LDHA"]
    }

    all_genes = []
    for g_list in gene_groups.values():
        all_genes.extend(g_list)

    # Expression generation per state
    expr_matrix = np.zeros((n_cells, len(all_genes)), dtype=float)

    for i, state in enumerate(cell_states):
        # Baseline noise (log-normal counts)
        base = np.random.exponential(scale=1.2, size=len(all_genes))
        
        # State-specific up-regulation
        if state == "Progenitor":
            for g in gene_groups["Stem"]:
                idx = all_genes.index(g)
                base[idx] += np.random.gamma(shape=5.0, scale=3.0)
        elif state == "Myogenic":
            for g in gene_groups["Myo"]:
                idx = all_genes.index(g)
                base[idx] += np.random.gamma(shape=5.5, scale=3.2)
        elif state == "Neural":
            for g in gene_groups["Neuro"]:
                idx = all_genes.index(g)
                base[idx] += np.random.gamma(shape=5.2, scale=3.1)
        elif state == "Stressed":
            for g in gene_groups["Stress"]:
                idx = all_genes.index(g)
                base[idx] += np.random.gamma(shape=4.8, scale=2.8)
            for g in gene_groups["Mito"]:
                idx = all_genes.index(g)
                base[idx] += np.random.gamma(shape=3.5, scale=2.0)
        
        # Batch effect modifier
        if cell_batches[i] == "Batch_2":
            base *= np.random.uniform(0.85, 1.15)
            
        # Simulating discrete sequencing read counts (Poisson sampled from rate)
        counts = np.random.poisson(lam=np.clip(base, 0.05, 500.0))
        # Zero inflation typical in scRNA-seq
        dropouts = np.random.binomial(n=1, p=0.18, size=len(all_genes))
        counts[dropouts == 1] = 0
        expr_matrix[i, :] = counts

    # Synthesize 3D spatial cellular coordinates (x, y, z) inside a stylized ellipsoidal cell boundary
    # Nucleus centered at (0,0,0) with radius 5, Cytoplasm radius 15
    spatial_coords = []
    for state in cell_states:
        if state == "Progenitor":
            r = np.random.uniform(1.0, 5.0)
        elif state == "Stressed":
            r = np.random.uniform(9.0, 14.5)
        else:
            r = np.random.uniform(4.5, 12.0)
        
        theta = np.random.uniform(0, 2 * np.pi)
        phi = np.random.uniform(0, np.pi)
        x = r * np.sin(phi) * np.cos(theta)
        y = r * np.sin(phi) * np.sin(theta)
        z = r * np.cos(phi) * 0.7  # flattened ellipsoid
        spatial_coords.append((round(float(x), 3), round(float(y), 3), round(float(z), 3)))

    # Save expression matrix (cells by genes CSV)
    expr_df = pd.DataFrame(expr_matrix, index=cell_ids, columns=all_genes)
    expr_file = DEMO_DIR / "synthetic_4d_cell_counts.csv"
    expr_df.to_csv(expr_file, index_label="cell_id")

    # Save cell metadata
    meta_df = pd.DataFrame({
        "cell_id": cell_ids,
        "cell_state": cell_states,
        "timepoint_hours": cell_timepoints,
        "batch": cell_batches,
        "spatial_x": [c[0] for c in spatial_coords],
        "spatial_y": [c[1] for c in spatial_coords],
        "spatial_z": [c[2] for c in spatial_coords],
        "phenotype_score": [round(float(np.random.normal(50 if s == "Progenitor" else 75, 8)), 2) for s in cell_states]
    })
    meta_file = DEMO_DIR / "synthetic_4d_cell_metadata.csv"
    meta_df.to_csv(meta_file, index=False)

    dataset_id = "demo_synthetic_4d_cell"
    return expr_file, meta_file, dataset_id


def detect_matrix_orientation(df: pd.DataFrame) -> Tuple[str, float, List[str]]:
    """
    Detects whether the DataFrame is cells_by_genes or genes_by_cells.
    Checks column names and index against known biological gene symbols, Ensembl patterns, and cell barcode patterns.
    """
    reasons = []
    col_names = [str(c) for c in df.columns]
    idx_names = [str(i) for i in df.index]

    # Gene symbol matching
    known_col_genes = sum(1 for c in col_names if c.upper() in KNOWN_MARKER_GENES or re.match(r'^[A-Z0-9\-]{2,10}$', c))
    known_idx_genes = sum(1 for i in idx_names if i.upper() in KNOWN_MARKER_GENES or re.match(r'^[A-Z0-9\-]{2,10}$', i))

    col_gene_ratio = known_col_genes / max(len(col_names), 1)
    idx_gene_ratio = known_idx_genes / max(len(idx_names), 1)

    # Cell barcode matching (e.g., CELL_0001, AAACCTG..., barcode_...)
    cell_barcode_idx = sum(1 for i in idx_names if "CELL" in i.upper() or re.match(r'^[ACGT]{10,24}', i))
    cell_barcode_col = sum(1 for c in col_names if "CELL" in c.upper() or re.match(r'^[ACGT]{10,24}', c))

    if col_gene_ratio > idx_gene_ratio or cell_barcode_idx > cell_barcode_col:
        confidence = min(0.99, max(0.60, col_gene_ratio * 1.5 + (cell_barcode_idx / max(len(idx_names), 1))))
        reasons.append(f"Columns match gene identifier patterns ({known_col_genes} detected); Index matches cell identifiers.")
        return "cells_by_genes", round(confidence, 2), reasons
    elif idx_gene_ratio > col_gene_ratio or cell_barcode_col > cell_barcode_idx:
        confidence = min(0.99, max(0.60, idx_gene_ratio * 1.5 + (cell_barcode_col / max(len(col_names), 1))))
        reasons.append(f"Index matches gene identifier patterns ({known_idx_genes} detected); Columns match cell identifiers.")
        return "genes_by_cells", round(confidence, 2), reasons
    else:
        # Default fallback heuristic: in scRNA-seq matrices often genes > cells or vice-versa
        return "cells_by_genes", 0.50, ["Orientation ambiguous; default to cells_by_genes. User confirmation recommended."]


def validate_expression_file(file_path: Path, forced_orientation: Optional[str] = None) -> Tuple[IngestionValidationResult, pd.DataFrame]:
    """
    Validates CSV or TSV expression matrix. Identifies duplicates, missing values, empty cells, non-numeric values.
    """
    sep = "\t" if file_path.suffix.lower() == ".tsv" else ","
    # Read sample first to check headers
    try:
        df = pd.read_csv(file_path, sep=sep, index_col=0)
    except Exception as e:
        return IngestionValidationResult(
            valid=False,
            detected_orientation="unknown",
            confidence=0.0,
            n_cells=0,
            n_genes=0,
            errors=[f"Failed to parse file: {str(e)}"]
        ), pd.DataFrame()

    warnings = []
    errors = []

    # Check duplicates in index and columns
    dup_cols = int(df.columns.duplicated().sum())
    dup_idx = int(df.index.duplicated().sum())
    if dup_cols > 0:
        warnings.append(f"Found {dup_cols} duplicate column identifiers. Duplicates will be disambiguated.")
    if dup_idx > 0:
        warnings.append(f"Found {dup_idx} duplicate row identifiers. Duplicates will be disambiguated.")

    # Determine orientation
    detected_orientation, confidence, reasons = detect_matrix_orientation(df)
    orientation = forced_orientation if forced_orientation in ["cells_by_genes", "genes_by_cells"] else detected_orientation

    if orientation == "genes_by_cells":
        # Transpose so internally we always work with cells x genes
        df = df.T
        duplicate_cells = dup_cols
        duplicate_genes = dup_idx
    else:
        duplicate_cells = dup_idx
        duplicate_genes = dup_cols

    # Ensure uniqueness of index and columns
    if df.index.duplicated().any():
        df.index = [f"{idx}_{i}" if is_dup else idx for i, (idx, is_dup) in enumerate(zip(df.index, df.index.duplicated()))]
    if df.columns.duplicated().any():
        df.columns = [f"{col}_{i}" if is_dup else col for i, (col, is_dup) in enumerate(zip(df.columns, df.columns.duplicated()))]

    # Non-numeric checks
    non_numeric_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    non_numeric_entries = 0
    if non_numeric_cols:
        for c in non_numeric_cols:
            coerced = pd.to_numeric(df[c], errors='coerce')
            non_numeric_entries += int(coerced.isna().sum())
            df[c] = coerced.fillna(0.0)
        warnings.append(f"Detected and coerced non-numeric values to 0.0 in {len(non_numeric_cols)} feature columns.")

    # Missing values
    missing_count = int(df.isna().sum().sum())
    if missing_count > 0:
        warnings.append(f"Found {missing_count} missing expression values. Replaced with 0.0.")
        df = df.fillna(0.0)

    # Check for negative values (inappropriate for raw count matrices)
    numeric_df = df.select_dtypes(include=[np.number])
    negative_mask = numeric_df < 0
    negative_count = int(negative_mask.sum().sum())
    if negative_count > 0:
        warnings.append(
            f"Detected {negative_count} negative expression values in raw matrix. "
            f"Raw single-cell read counts must be non-negative; presence of negative numbers indicates "
            f"pre-centered, standardized, or background-subtracted data."
        )

    # Check data representation (raw integer counts vs normalized continuous)
    sample_numeric = numeric_df.iloc[:min(50, len(df)), :min(50, df.shape[1])].values
    is_integer_counts = bool(np.all(np.mod(sample_numeric, 1) == 0))
    max_val = float(numeric_df.max().max()) if not numeric_df.empty else 0.0
    if not is_integer_counts and max_val <= 25.0:
        warnings.append(
            f"Input values appear to be continuous and bounded (max={max_val:.2f}). "
            f"The matrix may already be log-normalized. Additional library-size normalization may not be necessary."
        )

    # Empty cells and genes
    empty_cells = int((df.sum(axis=1) == 0).sum())
    empty_genes = int((df.sum(axis=0) == 0).sum())
    if empty_cells > 0:
        warnings.append(f"{empty_cells} cells have zero total counts across all measured genes.")
    if empty_genes > 0:
        warnings.append(f"{empty_genes} genes have zero total counts across all measured cells.")

    n_cells, n_genes = df.shape
    valid = (n_cells >= 5 and n_genes >= 5)
    if not valid:
        errors.append(f"Insufficient matrix dimensions ({n_cells} cells x {n_genes} genes). Minimum required is 5x5.")

    result = IngestionValidationResult(
        valid=valid,
        detected_orientation=detected_orientation,
        confidence=confidence,
        n_cells=n_cells,
        n_genes=n_genes,
        cell_id_col="index",
        gene_id_col="columns",
        duplicate_cell_ids=duplicate_cells,
        duplicate_gene_ids=duplicate_genes,
        missing_values_count=missing_count,
        non_numeric_entries=non_numeric_entries,
        empty_cells=empty_cells,
        empty_genes=empty_genes,
        warnings=warnings,
        errors=errors
    )
    return result, df


def register_dataset(
    dataset_id: str,
    name: str,
    filename: str,
    file_path: Path,
    metadata_path: Optional[Path],
    n_cells: int,
    n_genes: int,
    is_synthetic: bool,
    orientation: str,
    qc_summary: Optional[Dict[str, Any]] = None,
    provenance: Optional[Dict[str, Any]] = None
) -> DatasetInfo:
    """Registers or updates dataset in SQLite database"""
    conn = get_db_connection()
    cursor = conn.cursor()

    created_at = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT OR REPLACE INTO datasets 
        (id, name, filename, file_path, format, n_cells, n_genes, is_synthetic, orientation, created_at, metadata_path, qc_summary_json, provenance_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dataset_id,
        name,
        filename,
        str(file_path),
        file_path.suffix.replace(".", "").upper(),
        n_cells,
        n_genes,
        1 if is_synthetic else 0,
        orientation,
        created_at,
        str(metadata_path) if metadata_path else None,
        json.dumps(qc_summary) if qc_summary else None,
        json.dumps(provenance) if provenance else None
    ))
    conn.commit()
    conn.close()

    meta_cols = []
    if metadata_path and metadata_path.exists():
        try:
            m_df = pd.read_csv(metadata_path, nrows=2)
            meta_cols = list(m_df.columns)
        except Exception:
            pass

    ann_prov = (
        provenance.get("annotation_provenance", "synthetic" if is_synthetic else "computational_heuristic")
        if provenance else ("synthetic" if is_synthetic else "computational_heuristic")
    )
    is_ground = bool(provenance.get("is_independent_ground_truth", False)) if provenance else False
    markers_used = list(provenance.get("marker_genes_used_for_annotation", [])) if provenance else []
    scope = (
        qc_summary.get("qc_scope", provenance.get("qc_scope", "whole_transcriptome" if n_genes >= 1000 else "reduced_panel"))
        if (qc_summary or provenance) else ("whole_transcriptome" if n_genes >= 1000 else "reduced_panel")
    )

    return DatasetInfo(
        id=dataset_id,
        name=name,
        filename=filename,
        format=file_path.suffix.replace(".", "").upper(),
        n_cells=n_cells,
        n_genes=n_genes,
        is_synthetic=is_synthetic,
        orientation=orientation,
        created_at=created_at,
        metadata_columns=meta_cols,
        qc_summary=qc_summary,
        provenance=provenance,
        annotation_provenance=ann_prov,
        is_independent_ground_truth=is_ground,
        marker_genes_used_for_annotation=markers_used,
        qc_scope=scope
    )
