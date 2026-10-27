from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class PerturbationRequest(BaseModel):
    model_id: str
    dataset_id: str
    gene_name: str
    intervention_type: str = "knockout"  # "knockout", "down_regulation", "up_regulation"
    parameter: float = 0.0  # factor: 0.0 for knockout, 0.5 for 50% down-regulation, 2.0 for 2x up-regulation
    notes: Optional[str] = None


class CellPerturbationDelta(BaseModel):
    cell_id: str
    baseline_state: str
    perturbed_state: str
    state_changed: bool
    baseline_probability: Optional[float] = None
    perturbed_probability: Optional[float] = None
    probability_delta: Optional[float] = None
    baseline_numeric: Optional[float] = None
    perturbed_numeric: Optional[float] = None
    numeric_delta: Optional[float] = None


class StateDistributionDelta(BaseModel):
    state: str
    baseline_count: int
    perturbed_count: int
    count_delta: int
    baseline_fraction: float
    perturbed_fraction: float
    fraction_delta: float


class PerturbationResult(BaseModel):
    run_id: str
    model_id: str
    dataset_id: str
    gene_name: str
    intervention_type: str
    parameter: float
    cells_evaluated: int
    cells_transitioned_count: int
    transition_percentage: float
    state_distributions: List[StateDistributionDelta]
    cell_deltas_sample: List[CellPerturbationDelta]
    created_at: str
    disclaimer: str = (
        "MODEL-BASED COUNTERFACTUAL — NOT PROOF OF A CAUSAL BIOLOGICAL EFFECT: "
        "This in-silico perturbation is a computational manipulation of the predictive model's "
        "input features. It does not account for complex downstream feedback loops, post-translational "
        "buffering, or true biochemical kinetics."
    )
