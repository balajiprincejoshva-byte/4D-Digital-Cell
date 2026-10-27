import pytest
import numpy as np
import pandas as pd

from backend.app.core.database import init_db
from backend.app.schemas.prediction import TrainModelRequest
from backend.app.schemas.perturbation import PerturbationRequest
from backend.app.services.prediction import train_predictive_model, predict_dataset_states
from backend.app.services.perturbation import run_in_silico_perturbation


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.fixture
def sample_data():
    np.random.seed(42)
    n_cells = 60
    genes = ["OCT4", "SOX2", "MYOD1", "TUBB3", "GAPDH", "ACTB"]
    
    # Gene expression
    X = np.random.exponential(1.5, (n_cells, len(genes)))
    states = ["Stem"] * 20 + ["Myo"] * 20 + ["Neuro"] * 20
    # Add signal
    X[:20, 0] += 5.0  # OCT4 in Stem
    X[20:40, 2] += 5.0  # MYOD1 in Myo
    X[40:, 3] += 5.0  # TUBB3 in Neuro

    cell_ids = [f"CELL_{i:03d}" for i in range(n_cells)]
    df_expr = pd.DataFrame(X, index=cell_ids, columns=genes)
    df_meta = pd.DataFrame({
        "cell_id": cell_ids,
        "cell_state": states,
        "phenotype_score": [50.0 if s == "Stem" else (70.0 if s == "Myo" else 90.0) for s in states]
    })
    return df_expr, df_meta


def test_classification_training_and_evaluation(sample_data):
    df_expr, df_meta = sample_data
    req = TrainModelRequest(
        dataset_id="test_ds",
        target_column="cell_state",
        model_type="random_forest",
        test_size=0.25,
        random_seed=42,
        n_estimators=30
    )
    model_info, model = train_predictive_model(df_expr, df_meta, req)

    assert model_info.target_type == "classification"
    assert model_info.metrics.accuracy is not None
    assert model_info.metrics.accuracy >= 0.70  # Should learn the distinct marker signals easily
    assert model_info.metrics.macro_f1 is not None
    assert len(model_info.top_features) > 0
    # Top features should include OCT4, MYOD1, or TUBB3
    top_gene_names = [f.feature for f in model_info.top_features[:3]]
    assert any(g in top_gene_names for g in ["OCT4", "MYOD1", "TUBB3"])


def test_regression_training_and_evaluation(sample_data):
    df_expr, df_meta = sample_data
    req = TrainModelRequest(
        dataset_id="test_ds",
        target_column="phenotype_score",
        model_type="random_forest",
        test_size=0.25,
        random_seed=42,
        n_estimators=30
    )
    model_info, model = train_predictive_model(df_expr, df_meta, req)

    assert model_info.target_type == "regression"
    assert model_info.metrics.r2_score is not None
    assert model_info.metrics.mae is not None


def test_in_silico_perturbation_knockout(sample_data):
    df_expr, df_meta = sample_data
    # Train model first
    req_train = TrainModelRequest(
        dataset_id="test_ds",
        target_column="cell_state",
        model_type="random_forest",
        test_size=0.25,
        random_seed=42,
        n_estimators=30
    )
    model_info, _ = train_predictive_model(df_expr, df_meta, req_train)

    # Knockout OCT4
    pert_req = PerturbationRequest(
        model_id=model_info.model_id,
        dataset_id="test_ds",
        gene_name="OCT4",
        intervention_type="knockout",
        parameter=0.0
    )
    pert_res = run_in_silico_perturbation(df_expr, pert_req)

    assert pert_res.gene_name == "OCT4"
    assert pert_res.intervention_type == "knockout"
    assert pert_res.cells_evaluated == len(df_expr)
    assert len(pert_res.state_distributions) > 0
    assert len(pert_res.cell_deltas_sample) > 0


def test_perturbation_invalid_gene_handling(sample_data):
    df_expr, df_meta = sample_data
    req_train = TrainModelRequest(
        dataset_id="test_ds",
        target_column="cell_state",
        model_type="random_forest",
        test_size=0.25,
        random_seed=42
    )
    model_info, _ = train_predictive_model(df_expr, df_meta, req_train)

    # Non-existent gene should fail with an honest, actionable error
    pert_req = PerturbationRequest(
        model_id=model_info.model_id,
        dataset_id="test_ds",
        gene_name="NON_EXISTENT_GENE_123",
        intervention_type="knockout",
        parameter=0.0
    )
    with pytest.raises(ValueError, match="does not exist in the model's feature set"):
        run_in_silico_perturbation(df_expr, pert_req)
