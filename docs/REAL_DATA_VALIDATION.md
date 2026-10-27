# Real-Data Validation Specification: 10x Genomics PBMC 3k

## 1. Overview and Objective

This document defines the real-data validation protocol for the **AI-Driven 4D Digital Cell** research workstation. The primary objective is to verify that the workstation can ingest, validate, quality-control, preprocess, analyze, and model genuine biological single-cell transcriptomic measurements from a published, openly accessible benchmark dataset, without fabricating observations, confusing experimental data with synthetic simulations, or over-claiming biological causality.

---

## 2. Dataset Provenance and Usage Terms

| Parameter | Specification |
| :--- | :--- |
| **Dataset Name** | 10x Genomics Peripheral Blood Mononuclear Cells (PBMC 3k) |
| **Stable Source URL** | `https://cf.10xgenomics.com/samples/cell-exp/1.1.0/pbmc3k/pbmc3k_filtered_gene_bc_matrices.tar.gz` |
| **Published Citation** | Zheng, G. X. Y., Terry, J. M., Belgrader, P., Ryvkin, P., Bent, Z. W., Wilson, R., ... & Bielas, J. H. (2017). *Massively parallel digital transcriptional profiling of single cells*. **Nature Communications**, 8, 14049. |
| **DOI** | [10.1038/ncomms14049](https://doi.org/10.1038/ncomms14049) |
| **Biological Organism** | *Homo sapiens* (Primary human immune cells from healthy donor peripheral blood) |
| **Assay Technology** | 10x Genomics Chromium Single Cell 3' RNA-seq (v1 chemistry, v1.1.0 Cell Ranger output) |
| **Usage Conditions & License** | 10x Genomics Open Access Demonstration Data / Creative Commons Attribution (CC-BY 4.0) |
| **Data Integrity Flag** | `is_synthetic: false` (strictly tagged in SQLite catalog and UI) |

---

## 3. Dimensions, File Format, and Fixture Selection

### 3.1 Raw Matrix Structure
- **Format**: Matrix Market Exchange Format (`matrix.mtx`), accompanied by `barcodes.tsv` and `genes.tsv` (gzip-compressed tarball, ~7.6 MB).
- **Original Dimensions**: **2,700 cells $\times$ 32,738 gene features**.
- **Genome Build**: GRCh37 / hg19 Ensembl annotation.

### 3.2 Curated Validation Benchmark Fixture
To maintain a lightweight application repository while guaranteeing reproducible computational execution without excessive memory or bandwidth overhead, the default validation fixture is a deliberately curated, representative biological benchmark subset:
- **Fixture Size**: **250 primary cells $\times$ 80 verified genes**.
- **Cells**: Selected across primary immune subsets without replacement from cells passing sequencing depth criteria ($\ge 30$ counts across marker panel).
- **Genes**: 
  - **T Cell Lineage**: `CD3D`, `CD3E`, `CD3G`, `CD4`, `CD8A`, `CD8B`, `IL7R`, `CCR7`
  - **B Cell Lineage**: `MS4A1` (CD20), `CD79A`, `CD79B`, `CD19`, `BANK1`
  - **Monocyte / Macrophage Lineage**: `CD14`, `LYZ`, `FCGR3A` (CD16), `MS4A7`, `CST3`, `S100A8`, `S100A9`, `HLA-DRA`
  - **Natural Killer (NK) Lineage**: `GNLY`, `NKG7`, `NCAM1` (CD56), `PRF1`, `GZMB`
  - **Platelets / Megakaryocytes**: `PPBP`, `PF4`
  - **Constitutive / Housekeeping**: `ACTB`, `GAPDH`, `B2M`, `RPL13A`, `RPLP0`, `MALAT1`
  - **Authentic Mitochondrial Genes**: `MT-CO1`, `MT-CO2`, `MT-CO3`, `MT-ND1`, `MT-ND2`, `MT-ND4`, `MT-ND5`, `MT-CYB`, `MT-ATP6`
  - **Top High-Variance Informative Features**: Identified directly from the 10x expression matrix.

---

## 4. Gene Identifiers and Metadata Conventions

### 4.1 Gene Identifier Mapping
- **Convention**: Official HUGO Gene Nomenclature Committee (HGNC) symbols (e.g., `CD3D`, `MS4A1`, `MT-CO1`).
- **Ensembl Reference**: GRCh37 / hg19 Ensembl IDs (`ENSG...`) from `genes.tsv` column 0 are mapped to HGNC symbols in column 1.

### 4.2 Cell Identifiers and Biological Annotations
- **Cell Barcode**: 16nt 10x Chromium cellular barcodes with gem-group suffix (e.g., `AAACATACAACCAC-1`).
- **Annotation Provenance**: Classified strictly as `computational_heuristic` (`is_independent_ground_truth: false`).
- **Target Label Source**: Inferred via canonical immune marker expression rules:
  - `CD4_T_Cell` (`CD3D`, `IL7R`)
  - `CD8_T_Cell` (`CD3D`, `CD8A`, `CD8B`)
  - `B_Cell` (`MS4A1`, `CD79A`)
  - `CD14_Monocyte` (`CD14`, `LYZ`)
  - `NK_Cell` (`GNLY`, `NKG7`)
  - `Platelet` (`PPBP`, `PF4`)
  - `Other_Mononuclear`
- **Integrity Notice on Supervised Predictions**:
  Because marker genes (`CD3D`, `MS4A1`, etc.) used to assign target labels also appear among the predictive model features, the workstation explicitly detects **Circular Evaluation Risk** (`circular_evaluation_risk: true`). Held-out performance metrics are labeled as **"Weak-Label Concordance (Computational Heuristic)"** and never represented as independent biological validation.

### 4.3 Whole-Transcriptome Quality Control Protocol
Standard single-cell RNA-seq QC metrics must be calculated on the complete raw assay matrix prior to any gene filtering or panel selection:
1. **Load Complete Matrix**: All 32,738 GRCh37/hg19 gene features across 2,700 droplets.
2. **Identify Mitochondrial Genes**: All 13 human mitochondrial protein-coding genes (`MT-ND1`, `MT-ND2`, `MT-CO1`, `MT-CO2`, `MT-ATP8`, `MT-ATP6`, `MT-CO3`, `MT-ND3`, `MT-ND4L`, `MT-ND4`, `MT-ND5`, `MT-ND6`, `MT-CYB`).
3. **Whole-Transcriptome QC Values**:
   - **Mean Library Size**: **2,366.90 counts/cell**
   - **Median Detected Genes**: **817 genes/cell**
   - **Mitochondrial Expression Fraction**: **2.22%** (well within normal physiological range for healthy PBMCs)
   - **Viable Cells Passing Criteria**: **2,643 / 2,700 droplets (97.9%)** pass criteria ($\ge 200$ detected genes, $\le 5.0\%$ mito, $\ge 500$ counts).
4. **Preserve QC in Metadata**: Each cell's whole-transcriptome library size, detected genes count, and mitochondrial percentage are permanently preserved in `df_meta`.
5. **Gene Panel Selection**: The 80-gene demonstration panel is extracted for downstream modeling while the dataset's `qc_scope` remains recorded as `"whole_transcriptome"`. If QC is ever calculated solely on a reduced panel (< 1,000 genes), the system records `qc_scope: "reduced_panel"` with an explicit limitation note.

### 4.3 Temporal and Spatial Semantics
- **Longitudinal Status**: `is_longitudinal: false`. The PBMC 3k dataset is a **cross-sectional snapshot** of peripheral blood taken at a single clinical timepoint.
- **Timepoint Metadata**: `timepoints: [0.0]`. The system strictly reports `Cross-Sectional Snapshot (No Temporal Observations in Dataset)` and **never invents or extrapolates longitudinal kinetics** for this dataset.
- **Spatial Status**: `has_spatial: false`. Cells are dissociated suspension cells. 3D coordinates are explicitly computed and rendered as a **Conceptual 3D Transcriptomic Embedding (PCA)**, never labeled as physical microscopy coordinates.

---

## 5. Preprocessing Operations and Scientific Assumptions

1. **Raw Expression Checks**:
   - Asserts matrix contains non-negative integer read counts (Unique Molecular Identifier counts).
   - Flags missing values (imputed as 0.0) and verifies zero negative expression entries.
2. **Quality Control (QC)**:
   - Calculates per-cell library size ($n_{\text{counts}}$) and number of detected genes ($n_{\text{genes}}$).
   - Calculates true mitochondrial transcript percentage using authentic `MT-` prefix features. Unlike synthetic datasets that omit mitochondrial genes, PBMC 3k yields genuine non-zero mitochondrial percentages (~2% to 10% in healthy cells).
3. **Filtering**:
   - Cell-level filtering thresholding on minimum detected genes and maximum mitochondrial fraction.
   - Gene-level filtering on minimum expressing cells.
4. **Normalization and Log-Transformation**:
   - Depth normalization to 10,000 counts per cell (CPM equivalent).
   - Log-transformation: $y = \ln(1 + x)$ (`log1p`).
5. **Feature Scaling and Model Pipeline Isolation**:
   - `StandardScaler` must fit strictly on the training partition ($X_{\text{train}}$) and transform $X_{\text{train}}$, $X_{\text{test}}$, and subsequent inference inputs without data leakage.

---

## 6. Expected Validation Checks

| Test ID | Operation | Target Criteria |
| :--- | :--- | :--- |
| **VAL-01** | **Ingestion & Metadata** | 250 cells $\times$ 80 genes; valid HGNC symbols; correct non-synthetic provenance flags. |
| **VAL-02** | **Mitochondrial QC** | Authentic `MT-` genes detected ($\ge 5$ mito genes); mean mito % between 1.0% and 12.0%; no missing-feature fallback note. |
| **VAL-03** | **Matrix Representation** | Raw UMI integer counts verified; zero negative values; continuous warning NOT triggered. |
| **VAL-04** | **Unsupervised PCA** | PCA components 1 & 2 capture biological variance across lymphoid and myeloid branches. |
| **VAL-05** | **Supervised State Prediction** | Multi-class logistic regression / random forest trains on biological labels (`cell_state`); test split evaluated without target leakage; held-out accuracy and macro F1 reported. |
| **VAL-06** | **In-Silico Perturbation** | *In-silico* knockout or overexpression applied on log-normalized scale; output explicitly framed as a statistical counterfactual rather than a claim of physical causality. |
| **VAL-07** | **Temporal Safeguard** | Confirms `has_temporal_metadata == False`, `is_longitudinal == False`, scene timepoint is 0.0h, and playback controls are disabled in favor of a snapshot badge. |
| **VAL-08** | **Audit Report & Export** | Comprehensive PDF/JSON report generated with authentic citation (Zheng et al., 2017) and CC-BY 4.0 licensing. |

---

## 7. Reproducible Download and Extraction Procedure

To re-download and re-extract the full 10x PBMC 3k dataset from scratch, execute:

```bash
python backend/scripts/prepare_real_pbmc_dataset.py
```

The script:
1. Downloads `pbmc3k_filtered_gene_bc_matrices.tar.gz` directly from 10x Genomics CloudFront.
2. Extracts and parses `matrix.mtx`, `genes.tsv`, and `barcodes.tsv`.
3. Constructs the curated real benchmark matrix and metadata files in `data/demo/`.
4. Registers `pbmc3k_real_sample` into SQLite database `digital_cell.db`.
