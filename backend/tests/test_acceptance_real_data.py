"""
Acceptance Test Suite: Real-Data Single-Cell RNA-seq Validation (10x Genomics PBMC 3k)
Separates:
1. Software correctness and matrix validation
2. Real-data biological smoke tests (ingestion, counts, QC, preprocessing)
3. Unsupervised clustering and marker discovery
4. Supervised cell-state modeling with held-out metrics
5. In-silico genetic perturbation counterfactuals
6. Temporal / spatial metadata safeguard verification
7. Published provenance and report integrity
"""

import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.database import init_db
from backend.app.schemas.dataset import PreprocessingConfig
from backend.app.schemas.prediction import TrainModelRequest
from backend.app.schemas.perturbation import PerturbationRequest
from backend.app.schemas.report import ReportGenerateRequest
from backend.scripts.prepare_real_pbmc_dataset import build_real_pbmc_dataset

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_real_pbmc():
    init_db()
    # Build or load real PBMC dataset
    build_real_pbmc_dataset(sample_cells=250)


def test_real_pbmc_ingestion_and_metadata():
    """Verify ingestion of authentic 10x PBMC 3k single-cell RNA-seq sample."""
    # 1. Preview endpoint
    resp = client.get("/api/datasets/pbmc3k_real_sample")
    assert resp.status_code == 200
    preview = resp.json()

    assert preview["id"] == "pbmc3k_real_sample"
    assert preview["n_cells"] == 250
    assert preview["n_genes"] == 80
    assert preview["is_synthetic"] is False

    # Check sample cell IDs (10x barcodes) and gene symbols
    preview_cells = preview["cell_ids_sample"]
    assert any("-" in cid for cid in preview_cells)  # e.g., AAACATACAACCAC-1
    preview_genes = preview["gene_ids_sample"]
    assert len(preview_genes) > 0

    # 2. Datasets list info for full provenance
    list_resp = client.get("/api/datasets")
    assert list_resp.status_code == 200
    all_ds = list_resp.json()
    info = next((d for d in all_ds if d["id"] == "pbmc3k_real_sample"), None)
    assert info is not None
    assert info["is_synthetic"] is False

    prov = info["provenance"]
    assert prov is not None
    assert "Zheng et al., 2017" in prov["citation"]
    assert "10.1038/ncomms14049" in prov["doi"]
    assert prov["organism"] == "Homo sapiens"
    assert prov["is_longitudinal"] is False


def test_real_pbmc_authentic_mitochondrial_qc():
    """Verify QC calculations on genuine biological data with authentic MT- genes."""
    list_resp = client.get("/api/datasets")
    assert list_resp.status_code == 200
    all_ds = list_resp.json()
    info = next((d for d in all_ds if d["id"] == "pbmc3k_real_sample"), None)
    assert info is not None
    qc = info["qc_summary"]
    assert qc is not None

    mito = qc["mitochondrial_percent"]
    assert mito["available"] is True
    assert mito["detected_mito_genes_count"] >= 5
    # Normal physiological PBMC mitochondrial fraction is between 2% and 15%
    assert 2.0 <= mito["mean"] <= 15.0

    # Total counts per cell
    reads = qc["total_counts"]
    assert reads["mean"] > 100.0


def test_real_pbmc_preprocessing_pipeline():
    """Verify library size normalization (CPM) and log1p transformation on real UMI counts."""
    config = PreprocessingConfig(
        dataset_id="pbmc3k_real_sample",
        min_genes_per_cell=20,
        min_cells_per_gene=3,
        max_mito_percent=20.0,
        target_sum=10000.0,
        apply_log1p=True,
        n_top_variable_genes=50,
        scale_data=True
    )
    resp = client.post("/api/preprocessing/run", json=config.model_dump())
    assert resp.status_code == 200
    res = resp.json()

    assert res["dataset_id"] == "pbmc3k_real_sample"
    assert res["original_n_cells"] == 250
    assert res["original_n_genes"] == 80
    assert res["filtered_n_cells"] <= res["original_n_cells"]
    assert res["filtered_n_cells"] >= 200  # most cells pass reasonable QC
    assert len(res["highly_variable_genes"]) == 50


def test_real_pbmc_unsupervised_pca_and_clustering():
    """Verify PCA dimensionality reduction and clustering on real immune cell expression."""
    # 1. PCA Embeddings
    emb_resp = client.post("/api/analysis/embeddings", json={
        "dataset_id": "pbmc3k_real_sample",
        "method": "PCA",
        "n_components": 3,
        "random_state": 42
    })
    assert emb_resp.status_code == 200
    emb_data = emb_resp.json()
    assert 240 <= len(emb_data["points"]) <= 250
    for pt in emb_data["points"]:
        assert np.isfinite(pt["x"])
        assert np.isfinite(pt["y"])
        assert np.isfinite(pt["z"])

    # 2. Clusters and differential markers
    clust_resp = client.post("/api/analysis/clusters", json={
        "dataset_id": "pbmc3k_real_sample",
        "n_clusters": 4,
        "random_state": 42
    })
    assert clust_resp.status_code == 200
    clust_data = clust_resp.json()
    assert clust_data["n_clusters"] == 4
    assert len(clust_data["top_markers"]) > 0
    for marker in clust_data["top_markers"]:
        assert 0.0 <= marker["adjusted_p_value"] <= 1.0


def test_real_pbmc_supervised_state_prediction_and_evaluation():
    """Verify multi-class state classification on real PBMC immune types with held-out metrics."""
    req = TrainModelRequest(
        dataset_id="pbmc3k_real_sample",
        target_column="cell_state",
        model_type="logistic_regression",
        test_size=0.25,
        random_seed=42
    )
    resp = client.post("/api/prediction/train", json=req.model_dump())
    assert resp.status_code == 200
    model_data = resp.json()

    assert model_data["target_column"] == "cell_state"
    metrics = model_data["metrics"]
    assert metrics["task_type"] == "classification"
    # Held-out accuracy and F1 must be valid numbers between 0 and 1
    assert 0.40 <= metrics["accuracy"] <= 1.0
    assert 0.30 <= metrics["macro_f1"] <= 1.0
    assert metrics["confusion_matrix"] is not None
    assert model_data["evaluation_label"] == "Weak-Label Concordance (Computational Heuristic)"
    assert model_data["circular_evaluation_risk"] is True

    # Top features should include canonical immune markers like CD3D, MS4A1, CD14, or LYZ
    top_feature_names = [f["feature"] for f in model_data["top_features"]]
    assert any(g in top_feature_names for g in ["CD3D", "MS4A1", "CD14", "GNLY", "PPBP", "LYZ"])


def test_real_pbmc_insilico_perturbation_counterfactual():
    """Verify in-silico knockout of CD3D on real immune cells and counterfactual framing."""
    # 1. Train model first
    req = TrainModelRequest(
        dataset_id="pbmc3k_real_sample",
        target_column="cell_state",
        model_type="logistic_regression",
        test_size=0.25,
        random_seed=42
    )
    train_res = client.post("/api/prediction/train", json=req.model_dump())
    assert train_res.status_code == 200
    model_id = train_res.json()["model_id"]

    # 2. Run in-silico knockout of CD3D (T-cell lineage marker)
    pert_req = PerturbationRequest(
        model_id=model_id,
        dataset_id="pbmc3k_real_sample",
        gene_name="CD3D",
        intervention_type="knockout",
        parameter=0.0
    )
    pert_res = client.post("/api/perturbation/simulate", json=pert_req.model_dump())
    assert pert_res.status_code == 200
    res = pert_res.json()

    assert res["gene_name"] == "CD3D"
    assert res["intervention_type"] == "knockout"
    assert 240 <= res["cells_evaluated"] <= 250
    # Must explicitly frame as mathematical counterfactual
    assert "MODEL-BASED COUNTERFACTUAL" in res["disclaimer"]
    assert "NOT PROOF OF A CAUSAL BIOLOGICAL EFFECT" in res["disclaimer"]


def test_real_pbmc_temporal_and_spatial_semantics():
    """Verify that real cross-sectional PBMC dataset does not fabricate longitudinal kinetics or physical space."""
    resp = client.post("/api/visualization/scene", json={
        "dataset_id": "pbmc3k_real_sample",
        "active_gene": "CD3D"
    })
    assert resp.status_code == 200
    scene = resp.json()

    assert 240 <= scene["dataset_n_cells"] <= 250
    assert scene["has_temporal_metadata"] is False
    assert scene["is_longitudinal"] is False
    assert scene["available_timepoints"] == [0.0]
    assert "Cross-Sectional Snapshot" in scene["temporal_mode"]
    assert "Conceptual 3D Transcriptomic Embedding (PCA)" in scene["spatial_mode"]

    # All cell particles must have timepoint 0.0
    for p in scene["particles"]:
        assert p["timepoint"] == 0.0


def test_real_pbmc_research_report_generation():
    """Verify research validation report generation with genuine provenance and citation."""
    req = ReportGenerateRequest(
        title="10x PBMC 3k Real Data Validation Report",
        dataset_id="pbmc3k_real_sample"
    )
    resp = client.post("/api/reports/generate", json=req.model_dump())
    assert resp.status_code == 200
    report = resp.json()

    assert report["dataset_id"] == "pbmc3k_real_sample"
    markdown = report["markdown_content"]
    assert "Zheng et al., 2017" in markdown
    assert "10.1038/ncomms14049" in markdown
    # Must NOT claim to be synthetic demo data
    assert "SYNTHETIC DEMO DATA" not in markdown
    prov = report["json_summary"].get("provenance", {})
    assert prov.get("is_synthetic") is False
