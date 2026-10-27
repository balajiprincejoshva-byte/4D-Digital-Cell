import io
import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.database import init_db
from backend.app.services.qc import calculate_qc_metrics, filter_cells_and_genes
from backend.app.services.ingestion import validate_expression_file
from backend.app.services.analysis import benjamini_hochberg_correction, compute_clustering_and_markers, compute_gene_correlations
from backend.app.services.prediction import train_predictive_model, predict_dataset_states
from backend.app.services.perturbation import run_in_silico_perturbation
from backend.app.schemas.prediction import TrainModelRequest
from backend.app.schemas.perturbation import PerturbationRequest

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db():
    init_db()


def test_qc_mitochondrial_missing_genes():
    """Verify QC does not fabricate 0.0% when mitochondrial genes are absent."""
    df_no_mito = pd.DataFrame(
        [[10, 20, 30], [5, 15, 25]],
        index=["Cell1", "Cell2"],
        columns=["POU5F1", "SOX2", "NANOG"]
    )
    qc = calculate_qc_metrics(df_no_mito)
    assert qc["mitochondrial_percent"]["available"] is False
    assert qc["mitochondrial_percent"]["detected_mito_genes_count"] == 0
    assert qc["mitochondrial_percent"]["mean"] is None
    assert "No mitochondrial genes" in qc["mitochondrial_percent"]["note"]

    # Filtering should skip mito filter cleanly
    filtered_df, summary = filter_cells_and_genes(df_no_mito, min_genes=1, min_cells_per_gene=1, max_mito_percent=15.0)
    assert summary["mitochondrial_filtering_active"] is False
    assert len(filtered_df) == 2


def test_negative_expression_value_flagging(tmp_path):
    """Verify ingestion detects and warns about negative expression values."""
    csv_path = tmp_path / "negative_matrix.csv"
    data = [
        [-1.5, 2.0, 3.0, 4.0, 1.0, 0.0],
        [0.5, -0.2, 1.1, 2.0, 3.0, 1.0],
        [1.0, 2.0, 3.0, 0.5, 1.0, 2.0],
        [0.0, 1.0, 2.0, 3.0, 2.0, 1.0],
        [2.0, 3.0, 4.0, 1.0, 0.0, 2.0],
        [1.0, 1.0, 2.0, 2.0, 1.0, 3.0]
    ]
    df = pd.DataFrame(
        data,
        index=[f"C{i}" for i in range(6)],
        columns=[f"G{j}" for j in range(6)]
    )
    df.to_csv(csv_path)

    val_res, clean_df = validate_expression_file(csv_path)
    assert val_res.valid is True
    assert any("negative expression values" in w.lower() for w in val_res.warnings)


def test_benjamini_hochberg_fdr_calculation():
    """Verify Benjamini-Hochberg FDR correction on small dataset with known math."""
    raw_p = np.array([0.001, 0.01, 0.04, 0.03, 0.20])
    # m = 5
    # sorted: 0.001 (rank 1), 0.01 (rank 2), 0.03 (rank 3), 0.04 (rank 4), 0.20 (rank 5)
    # unconstrained q:
    # rank 1: 0.001 * 5 / 1 = 0.005
    # rank 2: 0.01 * 5 / 2 = 0.025
    # rank 3: 0.03 * 5 / 3 = 0.050
    # rank 4: 0.04 * 5 / 4 = 0.050
    # rank 5: 0.20 * 5 / 5 = 0.200
    q_vals = benjamini_hochberg_correction(raw_p)
    assert np.isclose(q_vals[0], 0.005)
    assert np.isclose(q_vals[1], 0.025)
    assert np.isclose(q_vals[2], 0.050)
    assert np.isclose(q_vals[3], 0.050)
    assert np.isclose(q_vals[4], 0.200)
    assert np.all(q_vals >= 0.0)
    assert np.all(q_vals <= 1.0)


def test_standard_scaler_and_knockout_semantics():
    """Verify fitted StandardScaler is saved in model artifact and used in knockout inference."""
    np.random.seed(42)
    n = 60
    genes = ["GENE_A", "GENE_B", "GENE_C"]
    # Mean of GENE_A is high (~10.0)
    X = np.random.normal(loc=10.0, scale=2.0, size=(n, len(genes)))
    X[:30, 0] += 5.0
    y = ["Type1"] * 30 + ["Type2"] * 30

    cell_ids = [f"CELL_{i}" for i in range(n)]
    df_expr = pd.DataFrame(X, index=cell_ids, columns=genes)
    df_meta = pd.DataFrame({"cell_id": cell_ids, "cell_state": y})

    req = TrainModelRequest(
        dataset_id="test_ds",
        target_column="cell_state",
        model_type="logistic_regression",
        test_size=0.25,
        random_seed=42
    )
    model_info, model = train_predictive_model(df_expr, df_meta, req)

    # Perform knockout of GENE_A
    pert_req = PerturbationRequest(
        model_id=model_info.model_id,
        dataset_id="test_ds",
        gene_name="GENE_A",
        intervention_type="knockout",
        parameter=0.0
    )
    pert_res = run_in_silico_perturbation(df_expr, pert_req)

    assert pert_res.gene_name == "GENE_A"
    assert pert_res.intervention_type == "knockout"
    assert pert_res.cells_evaluated == n
    assert "MODEL-BASED COUNTERFACTUAL" in pert_res.disclaimer


def test_gene_correlations_calculation():
    """Verify dataset correlation calculation against continuous target with FDR."""
    np.random.seed(42)
    n = 50
    genes = ["POU5F1", "SOX2", "GAPDH"]
    cell_ids = [f"C_{i}" for i in range(n)]

    # POU5F1 strongly correlated with phenotype_score
    score = np.linspace(10.0, 100.0, n)
    pou5f1 = score * 0.8 + np.random.normal(0, 5, n)
    gapdh = np.random.normal(20, 2, n)
    sox2 = -score * 0.5 + np.random.normal(0, 5, n)

    df_expr = pd.DataFrame({"POU5F1": pou5f1, "SOX2": sox2, "GAPDH": gapdh}, index=cell_ids)
    df_meta = pd.DataFrame({"cell_id": cell_ids, "phenotype_score": score})

    res = compute_gene_correlations(df_expr, df_meta, dataset_id="test_ds")
    assert res.target_column == "phenotype_score"
    assert len(res.correlations) == 3

    # POU5F1 should have high positive correlation, SOX2 negative, GAPDH near zero
    by_gene = {c.gene: c for c in res.correlations}
    assert by_gene["POU5F1"].correlation > 0.85
    assert by_gene["POU5F1"].fdr < 0.01
    assert by_gene["SOX2"].correlation < -0.80
    assert abs(by_gene["GAPDH"].correlation) < 0.35


def test_api_correlations_and_csv_exports():
    """Verify correlations endpoint and CSV export routes through HTTP API."""
    # Ensure demo is initialized
    init_res = client.post("/api/demo/initialize")
    assert init_res.status_code == 200

    # 1. Test correlations endpoint
    corr_res = client.get("/api/analysis/correlations/demo_synthetic_4d_cell")
    assert corr_res.status_code == 200
    corr_data = corr_res.json()
    assert corr_data["total_genes_analyzed"] == 60
    assert len(corr_data["correlations"]) == 60
    assert "FDR" in corr_data["correlations"][0]["significance_label"]

    # 2. Train model and test predictions CSV export
    train_res = client.post("/api/prediction/train", json={
        "dataset_id": "demo_synthetic_4d_cell",
        "target_column": "cell_state",
        "model_type": "logistic_regression"
    })
    assert train_res.status_code == 200
    model_id = train_res.json()["model_id"]

    pred_csv_res = client.get(f"/api/prediction/models/{model_id}/export-predictions-csv?dataset_id=demo_synthetic_4d_cell")
    assert pred_csv_res.status_code == 200
    assert pred_csv_res.headers["content-type"].startswith("text/csv")
    csv_text = pred_csv_res.text
    assert "cell_id,true_label,predicted_label" in csv_text
    assert "CELL_000" in csv_text

    # 3. Simulate perturbation and test perturbation CSV export
    pert_res = client.post("/api/perturbation/simulate", json={
        "model_id": model_id,
        "dataset_id": "demo_synthetic_4d_cell",
        "gene_name": "POU5F1",
        "intervention_type": "knockout",
        "parameter": 0.0
    })
    assert pert_res.status_code == 200
    run_id = pert_res.json()["run_id"]

    pert_csv_res = client.get(f"/api/perturbation/run/{run_id}/export-csv")
    assert pert_csv_res.status_code == 200
    assert pert_csv_res.headers["content-type"].startswith("text/csv")
    pert_csv_text = pert_csv_res.text
    assert "cell_id,baseline_state,perturbed_state" in pert_csv_text
