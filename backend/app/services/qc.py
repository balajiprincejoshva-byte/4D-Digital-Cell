import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List, Optional


def calculate_qc_metrics(
    df_expr: pd.DataFrame,
    qc_scope: Optional[str] = None,
    total_genes_in_assay: Optional[int] = None
) -> Dict[str, Any]:
    """
    Computes single-cell quality control metrics:
    - Library size (total counts per cell)
    - Number of detected genes (counts > 0) per cell
    - Number of cells expressing each gene
    - Mitochondrial gene percentage (genes with prefix MT- or mt-)
    - Explicit tracking of whole-transcriptome vs reduced-panel QC scope
    """
    total_counts = df_expr.sum(axis=1)
    detected_genes = (df_expr > 0).sum(axis=1)

    # Determine QC scope
    n_genes = int(df_expr.shape[1])
    if qc_scope is None:
        effective_scope = "whole_transcriptome" if n_genes >= 1000 else "reduced_panel"
    else:
        effective_scope = qc_scope

    if effective_scope == "reduced_panel":
        scope_note = (
            f"Reduced feature panel QC: Metrics calculated on a targeted panel of {n_genes} genes, "
            f"not the whole transcriptome. Mitochondrial fraction reflects proportion of panel features, "
            f"not total cellular mRNA."
        )
    else:
        scope_note = (
            f"Whole-transcriptome QC: Calculated across all assayed genomic features "
            f"({total_genes_in_assay or n_genes} genes)."
        )

    # Detect mitochondrial genes
    mito_cols = [c for c in df_expr.columns if c.upper().startswith("MT-") or c.upper().startswith("MT_")]
    if mito_cols:
        mito_counts = df_expr[mito_cols].sum(axis=1)
        mito_fraction = (mito_counts / np.clip(total_counts, 1e-6, None)) * 100.0
        mito_summary = {
            "available": True,
            "mean": round(float(mito_fraction.mean()), 2),
            "median": round(float(mito_fraction.median()), 2),
            "max": round(float(mito_fraction.max()), 2),
            "detected_mito_genes_count": len(mito_cols),
            "qc_scope": effective_scope,
            "is_whole_transcriptome": (effective_scope == "whole_transcriptome"),
            "note": scope_note
        }
    else:
        mito_fraction = None
        mito_summary = {
            "available": False,
            "mean": None,
            "median": None,
            "max": None,
            "detected_mito_genes_count": 0,
            "qc_scope": effective_scope,
            "is_whole_transcriptome": (effective_scope == "whole_transcriptome"),
            "note": "No mitochondrial genes (MT- or MT_ prefix) identified in dataset."
        }

    qc_summary = {
        "n_cells": int(len(df_expr)),
        "n_genes": n_genes,
        "total_genes_in_assay": total_genes_in_assay or n_genes,
        "qc_scope": effective_scope,
        "qc_scope_note": scope_note,
        "scope_note": scope_note,
        "is_whole_transcriptome": (effective_scope == "whole_transcriptome"),
        "total_counts": {
            "mean": round(float(total_counts.mean()), 2),
            "median": round(float(total_counts.median()), 2),
            "min": round(float(total_counts.min()), 2),
            "max": round(float(total_counts.max()), 2),
            "std": round(float(total_counts.std()), 2)
        },
        "detected_genes_per_cell": {
            "mean": round(float(detected_genes.mean()), 2),
            "median": round(float(detected_genes.median()), 2),
            "min": int(detected_genes.min()),
            "max": int(detected_genes.max())
        },
        "mitochondrial_percent": mito_summary,
        "per_cell_qc": [
            {
                "cell_id": str(cell_id),
                "total_counts": round(float(total_counts[cell_id]), 2),
                "n_detected_genes": int(detected_genes[cell_id]),
                "mito_percent": round(float(mito_fraction[cell_id]), 2) if mito_fraction is not None else None
            }
            for cell_id in df_expr.index[:100]  # preview first 100 cells
        ]
    }
    return qc_summary


def filter_cells_and_genes(
    df_expr: pd.DataFrame,
    min_genes: int = 10,
    max_genes: int = None,
    min_cells_per_gene: int = 3,
    max_mito_percent: float = 20.0
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Applies quality control threshold filters to remove low-quality cells, doublets,
    damaged/dying cells (high mitochondrial ratio), and uninformative genes.
    """
    orig_cells, orig_genes = df_expr.shape
    
    # 1. Detected genes filter
    detected_genes = (df_expr > 0).sum(axis=1)
    cell_mask = detected_genes >= min_genes
    if max_genes:
        cell_mask &= (detected_genes <= max_genes)

    mito_cols = [c for c in df_expr.columns if c.upper().startswith("MT-") or c.upper().startswith("MT_")]
    mito_filtering_applied = False
    if mito_cols:
        mito_filtering_applied = True
        total_counts = df_expr.sum(axis=1)
        mito_counts = df_expr[mito_cols].sum(axis=1)
        mito_percent = (mito_counts / np.clip(total_counts, 1e-6, None)) * 100.0
        cell_mask &= (mito_percent <= max_mito_percent)

    df_filtered = df_expr[cell_mask].copy()

    # 3. Filter genes expressed in fewer than min_cells_per_gene
    cells_per_gene = (df_filtered > 0).sum(axis=0)
    gene_mask = cells_per_gene >= min_cells_per_gene
    df_filtered = df_filtered.loc[:, gene_mask]

    filtered_cells, filtered_genes = df_filtered.shape

    filtering_summary = {
        "original_cells": orig_cells,
        "original_genes": orig_genes,
        "filtered_cells": filtered_cells,
        "filtered_genes": filtered_genes,
        "cells_removed": orig_cells - filtered_cells,
        "genes_removed": orig_genes - filtered_genes,
        "mitochondrial_filtering_active": mito_filtering_applied,
        "thresholds_applied": {
            "min_genes": min_genes,
            "max_genes": max_genes,
            "min_cells_per_gene": min_cells_per_gene,
            "max_mito_percent": max_mito_percent if mito_filtering_applied else None
        }
    }
    return df_filtered, filtering_summary
