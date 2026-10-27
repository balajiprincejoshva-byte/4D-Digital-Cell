"""
Regression Test Suite: Cell-State Label Provenance, Circular Evaluation Prevention,
and Whole-Transcriptome Quality Control.

Verifies:
1. Label Provenance Auditing: Classification of targets as computational_heuristic,
   synthetic, experimental_reference, published_curated, or unknown.
2. Prevention of Circular Evaluation: Marker genes used for target assignment that overlap
   with model features trigger circular_evaluation_risk and are labeled as
   "Weak-Label Concordance (Computational Heuristic)", never "Independent Biological Validation".
3. Whole-Transcriptome QC: Calculation across complete assay matrix (32k+ genes, 13 MT- genes)
   vs reduced panel limitations.
4. Incomplete/Unavailable Annotation Safeguards.
5. End-to-End Report Transparency.
"""

import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.database import init_db, get_db_connection
from backend.app.services.qc import calculate_qc_metrics
from backend.app.schemas.prediction import TrainModelRequest
from backend.app.schemas.report import ReportGenerateRequest
from backend.scripts.prepare_real_pbmc_dataset import build_real_pbmc_dataset

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_provenance_test_env():
    init_db()
    build_real_pbmc_dataset(sample_cells=250)


# ============================================================================
# 1. Whole-Transcriptome QC vs Reduced Panel Tests
# ============================================================================

def test_whole_transcriptome_qc_vs_reduced_panel_detection():
    """Verify that calculate_qc_metrics correctly identifies assay scope."""
    # A) Full assay simulation (2,000 genes with mitochondrial genes)
    genes_full = [f"GENE_{i}" for i in range(1987)] + [
        "MT-CO1", "MT-CO2", "MT-CO3", "MT-ND1", "MT-ND2",
        "MT-ND3", "MT-ND4", "MT-ND4L", "MT-ND5", "MT-ND6",
        "MT-ATP6", "MT-ATP8", "MT-CYB"
    ]
    np.random.seed(42)
    mat_full = np.random.poisson(lam=1.5, size=(100, len(genes_full))).astype(float)
    df_full = pd.DataFrame(mat_full, index=[f"C_{i}" for i in range(100)], columns=genes_full)

    qc_full = calculate_qc_metrics(df_full, total_genes_in_assay=32738)
    assert qc_full["is_whole_transcriptome"] is True
    assert qc_full["qc_scope"] == "whole_transcriptome"
    note_text = (qc_full.get("scope_note") or qc_full.get("qc_scope_note") or "").lower()
    assert "whole-transcriptome" in note_text
    assert qc_full["mitochondrial_percent"]["available"] is True
    assert qc_full["mitochondrial_percent"]["detected_mito_genes_count"] == 13

    # B) Reduced panel simulation (60 genes)
    genes_panel = [f"GENE_{i}" for i in range(55)] + ["MT-CO1", "MT-CO2", "MT-ND1", "MT-ND2", "MT-ATP6"]
    mat_panel = np.random.poisson(lam=2.0, size=(100, len(genes_panel))).astype(float)
    df_panel = pd.DataFrame(mat_panel, index=[f"C_{i}" for i in range(100)], columns=genes_panel)

    qc_panel = calculate_qc_metrics(df_panel)
    assert qc_panel["is_whole_transcriptome"] is False
    assert qc_panel["qc_scope"] == "reduced_panel"
    panel_note = (qc_panel.get("scope_note") or qc_panel.get("qc_scope_note") or "").lower()
    assert "reduced feature panel" in panel_note
    assert qc_panel["mitochondrial_percent"]["detected_mito_genes_count"] == 5


def test_real_pbmc_whole_transcriptome_qc_stored():
    """Verify that PBMC 3k stores authentic whole-transcriptome QC computed from complete matrix."""
    resp = client.get("/api/datasets")
    assert resp.status_code == 200
    all_ds = resp.json()
    info = next((d for d in all_ds if d["id"] == "pbmc3k_real_sample"), None)
    assert info is not None

    qc = info["qc_summary"]
    assert qc is not None
    assert qc.get("is_whole_transcriptome") is True
    assert qc.get("qc_scope") == "whole_transcriptome"
    assert qc.get("total_genes_in_assay") == 32738 or qc.get("n_genes") == 32738

    # Human PBMC whole-transcriptome mitochondrial fraction is in normal ~2% range
    mito_mean = qc["mitochondrial_percent"]["mean"]
    assert 1.5 <= mito_mean <= 5.0, f"Expected physiological PBMC mito% ~2.2%, got {mito_mean}%"
    assert qc["mitochondrial_percent"]["detected_mito_genes_count"] == 13

    # Total counts per cell in whole transcriptome is ~2,000 to ~2,500
    counts_mean = qc["total_counts"]["mean"]
    assert 1500.0 <= counts_mean <= 3500.0, f"Expected PBMC 3k mean counts ~2367, got {counts_mean}"


def test_qc_handles_missing_mitochondrial_annotations():
    """Verify QC gracefully handles an assay matrix with zero mitochondrial genes."""
    df_no_mito = pd.DataFrame(
        np.ones((20, 10)),
        index=[f"CELL_{i}" for i in range(20)],
        columns=[f"GENE_{j}" for j in range(10)]
    )
    qc = calculate_qc_metrics(df_no_mito)
    assert qc["mitochondrial_percent"]["available"] is False
    assert qc["mitochondrial_percent"]["detected_mito_genes_count"] == 0
    assert qc["mitochondrial_percent"]["mean"] is None


# ============================================================================
# 2. Label Provenance Auditing Tests
# ============================================================================

def test_pbmc_label_provenance_classification():
    """Verify that PBMC 3k labels are classified as computational_heuristic, NOT experimental ground truth."""
    resp = client.get("/api/datasets/pbmc3k_real_sample")
    assert resp.status_code == 200
    preview = resp.json()

    assert preview["annotation_provenance"] == "computational_heuristic"
    assert preview["is_independent_ground_truth"] is False
    assert len(preview["marker_genes_used_for_annotation"]) > 0
    assert "CD3D" in preview["marker_genes_used_for_annotation"]
    assert "MS4A1" in preview["marker_genes_used_for_annotation"]


def test_synthetic_demo_label_provenance():
    """Verify synthetic demo labels are classified as synthetic, NOT experimental ground truth."""
    resp = client.post("/api/demo/initialize")
    assert resp.status_code == 200
    info = resp.json()

    assert info["is_synthetic"] is True
    prov = info.get("provenance", {})
    assert prov.get("annotation_provenance") == "synthetic"
    assert prov.get("is_independent_ground_truth") is False


# ============================================================================
# 3. Circular Evaluation Prevention Tests
# ============================================================================

def test_circular_evaluation_detection_and_honest_labeling():
    """Verify that training on marker features triggers circularity warning and honest evaluation label."""
    req = TrainModelRequest(
        dataset_id="pbmc3k_real_sample",
        target_column="cell_state",
        model_type="logistic_regression",
        test_size=0.25,
        random_seed=42
    )
    resp = client.post("/api/prediction/train", json=req.model_dump())
    assert resp.status_code == 200
    model = resp.json()

    # Integrity assertions
    assert model["circular_evaluation_risk"] is True
    assert model["is_independent_ground_truth"] is False
    assert model["evaluation_label"] == "Weak-Label Concordance (Computational Heuristic)"

    metrics = model["metrics"]
    assert metrics["circular_evaluation_risk"] is True
    assert metrics["evaluation_label"] == "Weak-Label Concordance (Computational Heuristic)"
    assert len(metrics["overlapping_marker_features"]) > 0
    assert any(m in metrics["overlapping_marker_features"] for m in ["CD3D", "MS4A1", "CD14"])

    # Disclosures in warnings
    warning_text = " ".join(metrics["warnings"])
    assert "CIRCULAR EVALUATION RISK" in warning_text.upper() or "SCIENTIFIC INTEGRITY NOTICE" in warning_text.upper()
    assert "NOT INDEPENDENT BIOLOGICAL" in warning_text.upper()


def test_synthetic_evaluation_labeling():
    """Verify that models trained on synthetic data are labeled as Algorithmic Synthetic Benchmark."""
    # Ensure synthetic demo is loaded
    demo_resp = client.post("/api/demo/initialize")
    demo_id = demo_resp.json()["id"]

    req = TrainModelRequest(
        dataset_id=demo_id,
        target_column="cell_state",
        model_type="random_forest",
        test_size=0.25,
        random_seed=42
    )
    resp = client.post("/api/prediction/train", json=req.model_dump())
    assert resp.status_code == 200
    model = resp.json()

    assert model["evaluation_label"] == "Algorithmic Synthetic Benchmark"
    assert model["is_independent_ground_truth"] is False
    assert any("SYNTHETIC BENCHMARK" in w for w in model["metrics"]["warnings"])


# ============================================================================
# 4. Report Transparency & Disclosures Tests
# ============================================================================

def test_research_report_includes_provenance_and_circularity_disclosures():
    """Verify that generated research reports disclose annotation provenance, QC scope, and circularity."""
    req = ReportGenerateRequest(
        title="Scientific Integrity Audit Report",
        dataset_id="pbmc3k_real_sample"
    )
    resp = client.post("/api/reports/generate", json=req.model_dump())
    assert resp.status_code == 200
    report = resp.json()

    md = report["markdown_content"]
    # 1. Provenance section
    assert "Cell Annotation Provenance" in md
    assert "computational_heuristic" in md
    assert "Independent Biological Ground Truth" in md
    assert "Marker Genes Used for Inferred Annotations" in md

    # 2. QC scope
    assert "Quality Control Scope" in md
    assert "Whole-Transcriptome" in md

    # 3. Model evaluation disclosures
    if "Predictive Model Evaluation" in md and "Evaluation Classification" in md:
        assert "Weak-Label Concordance (Computational Heuristic)" in md
        assert "CIRCULAR EVALUATION DISCLOSURE" in md
        assert "NOT INDEPENDENT BIOLOGICAL VALIDATION" in md
