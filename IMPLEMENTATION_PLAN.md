# AI-Driven 4D Digital Cell: Implementation Plan & Progress Tracking

## Project Overview
An AI-Driven 4D Digital Cell computational biology workstation for multiscale genome-to-phenotype simulation, cellular state prediction, in-silico genetic perturbation, and interactive 4D spatio-temporal visualization.

---

## Architecture & Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Three.js WebGL viewport (interactive plasma membrane, nucleus, particles, time controls), Canvas 2D Scatter Plot, typed REST API client.
- **Backend**: Python 3.11 + FastAPI, Pydantic v2, pandas, NumPy, SciPy, scikit-learn, SQLite, pytest.
- **Data & Provenance**: Local dataset store (`data/`), synthetic demo generator, QC engine, full provenance hashes, exportable research reports (Markdown, JSON).

---

## Implementation Phases & Status

### Phase A: Foundation & Architecture Setup
- [x] Environment inspection & initial plan
- [x] Backend foundation: FastAPI application skeleton, health check, CORS, persistence models, database initialization
- [x] Frontend foundation: Vite + React + TypeScript + Tailwind CSS setup, dark scientific UI design system tokens
- [x] Verification: Backend `/api/health` and Frontend dev server operational

### Phase B: Biological Data Ingestion & Quality Control
- [x] Synthetic demonstration generator with 4 cellular states, 60 genes, 400 cells, batch effects, and 4 longitudinal timepoints with fixed seeds
- [x] Data ingestion engine supporting CSV, TSV expression matrices & metadata
- [x] Automatic matrix orientation detection (genes x cells vs. cells x genes) and manual override
- [x] Data validation: duplicate check, non-numeric check, missing value check, dimension mismatch warning
- [x] Quality Control (QC) pipeline: library size, detected genes per cell, mitochondrial ratio estimation, filtering thresholds
- [x] Dataset provenance tracking (hash, origin, synthetic flag, dimensions, timestamps)
- [x] Automated tests for ingestion, QC, and orientation detection (`test_ingestion.py`, `test_preprocessing_qc.py`)

### Phase C: Exploratory Cell Atlas & Dimensionality Reduction
- [x] Preprocessing engine: Library size normalization (CPM/TPM), log1p transformation, highly variable gene selection, feature scaling
- [x] Dimensionality reduction: Real PCA (30 components), UMAP with transparent PCA fallback
- [x] Unsupervised clustering (K-Means) with candidate marker gene extraction (differential expression / log2FC / t-test)
- [x] Cell Atlas frontend: interactive 2D embedding scatter plot, gene expression overlay, cluster coloring, searchable gene list, cell metadata inspection panel

### Phase D: AI-Based Cellular State Prediction & In-Silico Perturbation Lab
- [x] Supervised Machine Learning engine:
  - Categorical target classification (Logistic Regression, Random Forest Classifier)
  - Numeric target regression (Random Forest Regressor, Ridge)
  - Train/Test stratified splitting, class imbalance handling, confusion matrix, ROC-AUC / Macro-F1 / R² metrics
  - Feature importance extraction with explicit biological caveat
- [x] In-Silico Genetic Perturbation Lab:
  - Counterfactual gene modifications: Knockout (value=0), Down-regulation (factor < 1.0), Up-regulation (factor > 1.0)
  - Re-prediction pipeline comparing baseline vs. perturbed state distribution and phenotype shifts
  - Perturbation summary visualizations (class probability delta, impact ranking)
  - Prominent disclaimer: *MODEL-BASED COUNTERFACTUAL — NOT PROOF OF A CAUSAL BIOLOGICAL EFFECT*
- [x] Automated tests for model training, metrics, and perturbation engine (`test_prediction_perturbation.py`)

### Phase E: Interactive 4D Digital Cell Visualization
- [x] Three.js 3D cell model:
  - Stylized cellular structures: plasma membrane (translucent cyan glowing ellipsoid), cytoplasm, and nucleus (deep blue inner sphere)
  - 3D cellular points / organelle-associated states or 3D embedding coordinates
  - Color overlays: Cell State, Cluster, Selected Gene Expression, Perturbation Impact Delta
  - Camera controls: Rotate, zoom, pan, reset view, cell selection & inspector panel
- [x] Time Dimension (4D):
  - Time slider with play/pause, step forward/backward, reset controls, playback speed toggle
  - Dynamic interpolation across longitudinal timepoints (0h, 12h, 24h, 48h)
  - Synchronized state across all tabs (active dataset, active gene, active perturbation)

### Phase F: Gene-to-Phenotype Explorer, Research Reports & Literature
- [x] Gene-to-Phenotype module: statistical correlation, feature importance linkage, counterfactual prediction delta, evidence category labeling (observed vs. derived vs. predicted vs. synthetic)
- [x] Validation & Reproducible Research Reports:
  - Model cross-validation summaries and held-out test evaluations
  - Full report export in Markdown and JSON tables
- [x] Literature and Methodology section with real, verified references (Cell, Nature Methods, Genome Biology) and explicit methodology notes
- [x] Comprehensive test suite execution:
  - Backend: 23 of 23 pytest tests PASSED (0 failures, 100% pass rate in 5.79s)
  - Frontend: `npm run build` compiled cleanly into production bundle in 5.73s
- [x] Complete documentation in `README.md` and user guide

### Phase G: Scientific and Functional Audit Remediations
- [x] **AUD-01 [Critical]**: In-silico genetic perturbation scaling pipeline fixed with `StandardScaler` fitted on `X_train` and saved in model artifact.
- [x] **AUD-02 [Critical]**: Replaced static candidate genes with `GET /api/analysis/correlations/{dataset_id}` computing genuine Pearson $r$, $p$-values, and FDR $q$-values.
- [x] **AUD-03 [High]**: Added Three.js NDC Raycaster on canvas click in `ThreeDCellViewer.tsx` and interactive Single-Cell Inspector drawer in `DigitalCell4D.tsx`.
- [x] **AUD-04 [High]**: Implemented vectorized Benjamini-Hochberg FDR correction on differential marker gene discovery in `analysis.py`.
- [x] **AUD-05 [High]**: Fixed mitochondrial percentage calculation in `qc.py` to return `available: False`, `mean: None` when no `MT-` genes exist.
- [x] **AUD-06 [High]**: Added detection of negative expression values in raw matrices and sanitized upload filenames with `Path(...).name`.
- [x] **AUD-07 [Medium]**: Added clear visual labeling distinguishing longitudinal observations from illustrative snapshot time simulations.
- [x] **AUD-08 [Medium]**: Added CSV export endpoints for per-cell predictions and complete perturbation delta tables.
- [x] **AUD-09 [Medium]**: Added ROC-AUC calculation (One-vs-Rest) and guarded against target column feature leakage.
- [x] Added 6 new regression tests in `backend/tests/test_audit_regressions.py`.
- [x] Exhaustive audit report documented in `docs/SCIENTIFIC_FUNCTIONAL_AUDIT.md`.
