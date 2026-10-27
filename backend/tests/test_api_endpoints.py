import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_api_test_db():
    init_db()


def test_api_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "disclaimer" in data


def test_api_demo_initialization_and_listing():
    # Initialize demo
    res = client.post("/api/demo/initialize")
    assert res.status_code == 200
    ds = res.json()
    assert ds["id"] == "demo_synthetic_4d_cell"
    assert ds["n_cells"] == 400
    assert ds["n_genes"] == 60
    assert ds["is_synthetic"] is True

    # List datasets
    list_res = client.get("/api/datasets")
    assert list_res.status_code == 200
    datasets = list_res.json()
    assert any(d["id"] == "demo_synthetic_4d_cell" for d in datasets)

    # Preview
    prev_res = client.get(f"/api/datasets/{ds['id']}")
    assert prev_res.status_code == 200
    prev = prev_res.json()
    assert len(prev["cell_ids_sample"]) == 10
    assert len(prev["gene_ids_sample"]) == 10


def test_api_analysis_and_embeddings():
    ds_id = "demo_synthetic_4d_cell"
    # Embeddings
    res = client.post("/api/analysis/embeddings", json={
        "dataset_id": ds_id,
        "method": "PCA",
        "n_components": 3
    })
    assert res.status_code == 200
    data = res.json()
    assert data["method"] == "PCA"
    assert len(data["points"]) == 400

    # Clusters
    cl_res = client.post("/api/analysis/clusters", json={
        "dataset_id": ds_id,
        "n_clusters": 4
    })
    assert cl_res.status_code == 200
    cl_data = cl_res.json()
    assert cl_data["n_clusters"] == 4
    assert len(cl_data["top_markers"]) > 0

    # Gene lookup
    gene_res = client.get(f"/api/analysis/gene/{ds_id}/POU5F1")
    assert gene_res.status_code == 200
    g_data = gene_res.json()
    assert g_data["found"] is True
    assert g_data["mean_expression"] > 0


def test_api_end_to_end_train_perturb_and_report():
    ds_id = "demo_synthetic_4d_cell"

    # 1. Train model
    train_res = client.post("/api/prediction/train", json={
        "dataset_id": ds_id,
        "target_column": "cell_state",
        "model_type": "random_forest",
        "test_size": 0.25,
        "random_seed": 42
    })
    assert train_res.status_code == 200
    model = train_res.json()
    model_id = model["model_id"]
    assert model["metrics"]["accuracy"] > 0.70

    # 2. Simulate perturbation
    pert_res = client.post("/api/perturbation/simulate", json={
        "model_id": model_id,
        "dataset_id": ds_id,
        "gene_name": "POU5F1",
        "intervention_type": "knockout",
        "parameter": 0.0
    })
    assert pert_res.status_code == 200
    pert = pert_res.json()
    assert pert["gene_name"] == "POU5F1"
    assert len(pert["state_distributions"]) > 0

    # 3. 4D visualization scene
    scene_res = client.post("/api/visualization/scene", json={
        "dataset_id": ds_id,
        "active_gene": "POU5F1"
    })
    assert scene_res.status_code == 200
    scene = scene_res.json()
    assert scene["dataset_n_cells"] == 400
    assert "plasma_membrane" in scene["structures"]
    assert len(scene["particles"]) == 400

    # 4. Generate Research Report
    rep_res = client.post("/api/reports/generate", json={
        "dataset_id": ds_id,
        "title": "Comprehensive E2E Test Research Report",
        "model_id": model_id,
        "perturbation_run_id": pert["run_id"]
    })
    assert rep_res.status_code == 200
    report = rep_res.json()
    assert "POU5F1" in report["markdown_content"]
    assert "SYNTHETIC DEMO DATA" in report["markdown_content"]


def test_api_methodology():
    res = client.get("/api/methodology")
    assert res.status_code == 200
    data = res.json()
    assert len(data["verified_literature_references"]) >= 4
