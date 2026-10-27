from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class TrainModelRequest(BaseModel):
    dataset_id: str
    target_column: str
    model_type: str = "random_forest"  # "logistic_regression", "random_forest", "ridge_regression"
    test_size: float = 0.25
    random_seed: int = 42
    n_estimators: int = 100
    max_depth: Optional[int] = 12


class EvaluationMetrics(BaseModel):
    task_type: str  # "classification" or "regression"
    accuracy: Optional[float] = None
    macro_f1: Optional[float] = None
    balanced_accuracy: Optional[float] = None
    confusion_matrix: Optional[List[List[int]]] = None
    class_labels: Optional[List[str]] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    r2_score: Optional[float] = None
    roc_auc: Optional[float] = None
    train_score: float
    test_score: float
    is_valid_evaluation: bool = True
    warnings: List[str] = []
    evaluation_label: str = "Exploratory Model Fit"  # "Independent Biological Validation", "Weak-Label Concordance (Computational Heuristic)", "Algorithmic Synthetic Benchmark"
    annotation_provenance: str = "unknown"
    is_independent_ground_truth: bool = False
    circular_evaluation_risk: bool = False
    overlapping_marker_features: List[str] = []


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float
    rank: int


class TrainedModelInfo(BaseModel):
    model_id: str
    dataset_id: str
    model_name: str
    model_type: str
    target_column: str
    target_type: str
    metrics: EvaluationMetrics
    top_features: List[FeatureImportanceItem]
    features_count: int
    created_at: str
    evaluation_label: str = "Exploratory Model Fit"
    circular_evaluation_risk: bool = False
    is_independent_ground_truth: bool = False
    caveat: str = (
        "Statistical feature importance represents model predictive utility, "
        "not proven biological causality or direct biochemical interaction."
    )


class PredictionItem(BaseModel):
    cell_id: str
    true_label: Optional[str] = None
    predicted_label: str
    probabilities: Optional[Dict[str, float]] = None
    predicted_numeric: Optional[float] = None
    true_numeric: Optional[float] = None
