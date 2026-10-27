"""
Prepares a curated, high-integrity biological benchmark dataset from the 10x Genomics PBMC 3k archive.
Dataset: 10x Genomics Peripheral Blood Mononuclear Cells (PBMC 3k).
Provenance: Zheng et al., 2017, Nature Communications 8:14049 (DOI: 10.1038/ncomms14049).
Usage Terms: 10x Genomics Open Access / Creative Commons Attribution (CC-BY 4.0).

Scientific Execution Order:
1. Load complete raw expression matrix (32,738 genes x 2,700 cells).
2. Identify all mitochondrial genes across the complete transcriptome (13 MT- genes).
3. Compute whole-transcriptome QC metrics (counts, detected genes, true mito fraction).
4. Apply documented viable cell filtering (detected genes >= 200, mito <= 5.0%, counts >= 500).
5. Preserve cell identifiers, metadata, whole-transcriptome QC metrics, and filtering decisions.
6. Select biologically informative 80-gene panel for downstream demonstration & modeling.
7. Disclose cell-state annotation provenance as computational heuristic weak labels.
"""

import io
import sys
import time
import tarfile
import urllib.request
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
import pandas as pd
import scipy.io

from backend.app.core.config import DEMO_DIR
from backend.app.schemas.dataset import DatasetInfo
from backend.app.services.qc import calculate_qc_metrics
from backend.app.services.ingestion import register_dataset

PBMC_URL = "https://cf.10xgenomics.com/samples/cell-exp/1.1.0/pbmc3k/pbmc3k_filtered_gene_bc_matrices.tar.gz"

IMMUNE_MARKERS = [
    # T cells
    "CD3D", "CD3E", "CD3G", "CD4", "CD8A", "CD8B", "IL7R", "CCR7",
    # B cells
    "MS4A1", "CD79A", "CD79B", "CD19", "BANK1",
    # Monocytes / Macrophages
    "CD14", "LYZ", "FCGR3A", "MS4A7", "CST3", "S100A8", "S100A9", "HLA-DRA",
    # NK cells
    "GNLY", "NKG7", "NCAM1", "PRF1", "GZMB",
    # Dendritic cells & Megakaryocytes
    "PPBP", "PF4", "CLEC4C", "LILRA4",
    # Housekeeping / Structural
    "ACTB", "GAPDH", "B2M", "RPL13A", "RPLP0", "MALAT1",
    # Authentic Mitochondrial genes
    "MT-CO1", "MT-CO2", "MT-CO3", "MT-ND1", "MT-ND2", "MT-ND4", "MT-ND5", "MT-CYB", "MT-ATP6"
]

MARKER_GENES_USED_FOR_ANNOTATION = [
    "CD3D", "CD3E", "CD4", "CD8A", "CD8B", "IL7R",
    "MS4A1", "CD79A", "CD14", "LYZ", "FCGR3A", "MS4A7",
    "GNLY", "NKG7", "PPBP", "PF4"
]


def download_and_extract_pbmc3k(cache_tar_path: Path) -> tarfile.TarFile:
    if not cache_tar_path.exists():
        print(f"Downloading PBMC 3k tarball from {PBMC_URL}...")
        t0 = time.time()
        req = urllib.request.Request(PBMC_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        cache_tar_path.parent.mkdir(parents=True, exist_ok=True)
        cache_tar_path.write_bytes(data)
        print(f"Downloaded {len(data)/(1024*1024):.2f} MB in {time.time()-t0:.2f}s.")
    else:
        print(f"Using cached PBMC archive at {cache_tar_path}")

    return tarfile.open(cache_tar_path, mode="r:gz")


def build_real_pbmc_dataset(sample_cells: int = 250) -> DatasetInfo:
    cache_path = DEMO_DIR / "pbmc3k_raw.tar.gz"
    tar = download_and_extract_pbmc3k(cache_path)

    # 1. Extract genes and barcodes
    genes_f = tar.extractfile("filtered_gene_bc_matrices/hg19/genes.tsv")
    barcodes_f = tar.extractfile("filtered_gene_bc_matrices/hg19/barcodes.tsv")
    matrix_f = tar.extractfile("filtered_gene_bc_matrices/hg19/matrix.mtx")

    gene_lines = [line.decode("utf-8").strip().split("\t") for line in genes_f.readlines()]
    barcodes = [line.decode("utf-8").strip() for line in barcodes_f.readlines()]
    
    gene_symbols = [g[1] for g in gene_lines]
    n_total_genes = len(gene_symbols)
    n_total_cells = len(barcodes)
    print(f"Loaded whole transcriptome: {n_total_genes} genes, {n_total_cells} cells.")

    # 2. Parse complete raw sparse matrix (genes x cells in 10x convention)
    sparse_mat = scipy.io.mmread(matrix_f).tocsr()  # shape: (n_genes, n_cells)

    # 3. Identify ALL mitochondrial genes across the entire genome
    mito_indices = [i for i, g in enumerate(gene_symbols) if g.upper().startswith("MT-") or g.upper().startswith("MT_")]
    detected_mito_names = [gene_symbols[i] for i in mito_indices]
    print(f"Identified {len(mito_indices)} mitochondrial genes in whole transcriptome: {detected_mito_names}")

    # 4. Calculate Whole-Transcriptome QC metrics across ALL 32,738 genes
    full_counts_per_cell = np.array(sparse_mat.sum(axis=0)).flatten()
    full_detected_per_cell = np.array((sparse_mat > 0).sum(axis=0)).flatten()
    full_mito_counts = np.array(sparse_mat[mito_indices, :].sum(axis=0)).flatten()
    full_mito_percent = (full_mito_counts / np.clip(full_counts_per_cell, 1e-6, None)) * 100.0

    print(f"Whole-transcriptome QC across all {n_total_cells} cells:")
    print(f"  Mean Library Size: {full_counts_per_cell.mean():.2f} counts/cell")
    print(f"  Median Detected Genes: {np.median(full_detected_per_cell):.0f} genes/cell")
    print(f"  True Mitochondrial Fraction: {full_mito_percent.mean():.2f}%")

    # 5. Apply standard viable PBMC filtering criteria:
    # - Detected genes >= 200 (standard threshold for viable cells; excludes empty droplets)
    # - Total counts >= 500
    # - Mitochondrial fraction <= 5.0% (strict viable threshold for healthy PBMCs)
    viable_mask = (full_detected_per_cell >= 200) & (full_counts_per_cell >= 500) & (full_mito_percent <= 5.0)
    viable_indices = np.where(viable_mask)[0]
    print(f"Cells passing viable QC criteria: {len(viable_indices)} / {n_total_cells} ({len(viable_indices)/n_total_cells*100:.1f}%)")

    # 6. Select reproducible benchmark sample of cells from viable set
    np.random.seed(42)
    selected_indices = np.random.choice(viable_indices, size=min(sample_cells, len(viable_indices)), replace=False)
    selected_barcodes = [barcodes[i] for i in selected_indices]

    # Whole-transcriptome QC summary for the benchmark dataset
    selected_full_counts = full_counts_per_cell[selected_indices]
    selected_full_detected = full_detected_per_cell[selected_indices]
    selected_full_mito = full_mito_percent[selected_indices]

    whole_transcriptome_qc = {
        "qc_scope": "whole_transcriptome",
        "qc_scope_note": f"Whole-transcriptome QC calculated across all {n_total_genes} GRCh37/hg19 gene features before panel restriction.",
        "scope_note": f"Whole-transcriptome QC calculated across all {n_total_genes} GRCh37/hg19 gene features before panel restriction.",
        "n_cells": len(selected_barcodes),
        "n_genes": n_total_genes,
        "total_genes_in_assay": n_total_genes,
        "is_whole_transcriptome": True,
        "total_counts": {
            "mean": round(float(selected_full_counts.mean()), 2),
            "median": round(float(np.median(selected_full_counts)), 2),
            "min": round(float(selected_full_counts.min()), 2),
            "max": round(float(selected_full_counts.max()), 2),
            "std": round(float(selected_full_counts.std()), 2)
        },
        "detected_genes_per_cell": {
            "mean": round(float(selected_full_detected.mean()), 2),
            "median": round(float(np.median(selected_full_detected)), 2),
            "min": int(selected_full_detected.min()),
            "max": int(selected_full_detected.max())
        },
        "mitochondrial_percent": {
            "available": True,
            "mean": round(float(selected_full_mito.mean()), 2),
            "median": round(float(np.median(selected_full_mito)), 2),
            "max": round(float(selected_full_mito.max()), 2),
            "detected_mito_genes_count": len(mito_indices),
            "qc_scope": "whole_transcriptome",
            "is_whole_transcriptome": True,
            "note": "Calculated as percentage of total cellular UMI counts across all 13 mitochondrial protein-coding genes."
        },
        "per_cell_qc": [
            {
                "cell_id": selected_barcodes[j],
                "total_counts": round(float(selected_full_counts[j]), 2),
                "n_detected_genes": int(selected_full_detected[j]),
                "mito_percent": round(float(selected_full_mito[j]), 2)
            }
            for j in range(min(100, len(selected_barcodes)))
        ]
    }

    # 7. Select 80 biologically informative genes for downstream demonstration:
    symbol_to_idx = {sym: idx for idx, sym in enumerate(gene_symbols)}
    selected_genes = [g for g in IMMUNE_MARKERS if g in symbol_to_idx]
    
    # Fill remaining features with top-variance non-mitochondrial genes
    gene_sums = np.array(sparse_mat.sum(axis=1)).flatten()
    top_expressed_indices = np.argsort(gene_sums)[::-1]
    for idx in top_expressed_indices:
        sym = gene_symbols[idx]
        if sym not in selected_genes and not sym.startswith("RP") and not sym.startswith("MT-") and len(sym) >= 3:
            selected_genes.append(sym)
        if len(selected_genes) >= 80:
            break

    gene_indices = [symbol_to_idx[g] for g in selected_genes]
    sub_mat = sparse_mat[gene_indices, :].tocsc()[:, selected_indices].toarray().T  # shape: (250, 80)
    df_expr = pd.DataFrame(sub_mat, index=selected_barcodes, columns=selected_genes)

    # Calculate reduced-panel QC for comparison
    panel_qc = calculate_qc_metrics(df_expr, qc_scope="reduced_panel", total_genes_in_assay=n_total_genes)
    whole_transcriptome_qc["panel_qc_summary"] = panel_qc

    # 8. Phenotype / cell state identification based on canonical marker profiles
    # Transparently classified as: COMPUTATIONAL HEURISTIC (WEAK LABELS)
    cell_states = []
    for barcode, row in df_expr.iterrows():
        cd3 = row.get("CD3D", 0) + row.get("CD3E", 0)
        cd4 = row.get("CD4", 0) + row.get("IL7R", 0)
        cd8 = row.get("CD8A", 0) + row.get("CD8B", 0)
        b_marker = row.get("MS4A1", 0) + row.get("CD79A", 0)
        mono = row.get("CD14", 0) + row.get("LYZ", 0)
        nk = row.get("GNLY", 0) + row.get("NKG7", 0)
        plat = row.get("PPBP", 0) + row.get("PF4", 0)

        if plat >= 2:
            cell_states.append("Platelet")
        elif b_marker >= 2 and b_marker > cd3:
            cell_states.append("B_Cell")
        elif mono >= 3 and mono > cd3:
            cell_states.append("CD14_Monocyte")
        elif nk >= 4 and cd3 == 0:
            cell_states.append("NK_Cell")
        elif cd3 >= 1:
            if cd8 > cd4:
                cell_states.append("CD8_T_Cell")
            else:
                cell_states.append("CD4_T_Cell")
        elif nk >= 2:
            cell_states.append("NK_Cell")
        elif mono >= 1:
            cell_states.append("CD14_Monocyte")
        else:
            cell_states.append("Other_Mononuclear")

    df_meta = pd.DataFrame({
        "cell_id": selected_barcodes,
        "cell_state": cell_states,
        "cell_type": cell_states,
        "annotation_type": ["computational_heuristic"] * len(selected_barcodes),
        "is_independent_ground_truth": [False] * len(selected_barcodes),
        "whole_transcriptome_total_counts": [round(float(c), 1) for c in selected_full_counts],
        "whole_transcriptome_detected_genes": [int(g) for g in selected_full_detected],
        "whole_transcriptome_mito_percent": [round(float(m), 2) for m in selected_full_mito],
        "tissue": ["Peripheral Blood Mononuclear Cells"] * len(selected_barcodes),
        "donor": ["Healthy Human Donor A"] * len(selected_barcodes),
        "library_preparation": ["10x Chromium 3' v1"] * len(selected_barcodes)
    })

    # Save to disk
    out_expr_path = DEMO_DIR / "pbmc3k_real_sample_expression.csv"
    out_meta_path = DEMO_DIR / "pbmc3k_real_sample_metadata.csv"
    
    df_expr.to_csv(out_expr_path, index_label="cell_id")
    df_meta.to_csv(out_meta_path, index=False)
    print(f"Saved real expression matrix: {out_expr_path} ({df_expr.shape})")
    print(f"Saved real metadata: {out_meta_path} ({df_meta.shape})")

    provenance = {
        "dataset_name": "10x Genomics PBMC 3k (Real Experimental scRNA-seq)",
        "source": "10x Genomics Chromium Demonstration Dataset",
        "stable_url": PBMC_URL,
        "citation": "Zheng et al., 2017. Massively parallel digital transcriptional profiling of single cells. Nature Communications, 8:14049.",
        "doi": "10.1038/ncomms14049",
        "organism": "Homo sapiens",
        "tissue": "Peripheral Blood Mononuclear Cells (PBMC)",
        "technology": "10x Chromium Single Cell 3' RNA-seq (v1 chemistry)",
        "original_dimensions": f"{n_total_cells} cells x {n_total_genes} genes",
        "validation_subset_dimensions": f"{df_expr.shape[0]} cells x {df_expr.shape[1]} genes",
        "is_synthetic": False,
        "license": "Creative Commons Attribution 4.0 / 10x Genomics Dataset Terms",
        "gene_identifiers": "HGNC Official Gene Symbols (mapped from Ensembl GRCh37/hg19)",
        "is_longitudinal": False,
        "experimental_design": "Cross-sectional biological snapshot of peripheral immune cells from a healthy donor",
        "qc_scope": "whole_transcriptome",
        "qc_methodology": f"Whole-transcriptome QC calculated across all {n_total_genes} genes before panel selection. Viable cells filtered at detected genes >= 200, mito <= 5.0%, counts >= 500.",
        "annotation_provenance": "computational_heuristic",
        "annotation_source": "Canonical immune lineage marker rules (CD3D, CD4, CD8A, MS4A1, CD14, GNLY, PPBP) applied to scRNA-seq counts",
        "is_independent_ground_truth": False,
        "marker_genes_used_for_annotation": MARKER_GENES_USED_FOR_ANNOTATION,
        "circular_evaluation_risk": True,
        "annotation_caveat": (
            "Cell state labels are computational heuristic annotations (weak labels). "
            "Model accuracy reflects concordance with rule-based annotations, NOT independent biological ground-truth validation."
        )
    }

    dataset_info = register_dataset(
        dataset_id="pbmc3k_real_sample",
        name="10x Genomics PBMC 3k (Real Experimental scRNA-seq)",
        filename=out_expr_path.name,
        file_path=out_expr_path,
        metadata_path=out_meta_path,
        n_cells=df_expr.shape[0],
        n_genes=df_expr.shape[1],
        is_synthetic=False,
        orientation="cells_by_genes",
        qc_summary=whole_transcriptome_qc,
        provenance=provenance
    )
    print("Successfully registered pbmc3k_real_sample with whole-transcriptome QC and transparent weak-label provenance.")
    return dataset_info


if __name__ == "__main__":
    build_real_pbmc_dataset(sample_cells=250)
