from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class EmbeddingPoint(BaseModel):
    cell_id: str
    x: float
    y: float
    z: Optional[float] = None
    cluster: Optional[str] = None
    cell_type: Optional[str] = None
    sample: Optional[str] = None
    timepoint: Optional[float] = None
    expression_val: Optional[float] = None


class EmbeddingResult(BaseModel):
    dataset_id: str
    method: str  # "PCA" or "UMAP"
    n_components: int
    variance_ratio: Optional[List[float]] = None
    points: List[EmbeddingPoint]
    clusters: List[str] = []
    cell_types: List[str] = []
    timepoints: List[float] = []
    fallback_used: bool = False
    notes: str


class MarkerGene(BaseModel):
    gene: str
    cluster: str
    mean_in_cluster: float
    mean_outside_cluster: float
    log2_fold_change: float
    score: float
    p_value: float
    adjusted_p_value: Optional[float] = None


class ClusterAnalysisResult(BaseModel):
    dataset_id: str
    n_clusters: int
    method: str
    cluster_labels: Dict[str, str]  # cell_id -> cluster
    cluster_sizes: Dict[str, int]
    top_markers: List[MarkerGene]
    notes: str


class GeneExpressionLookup(BaseModel):
    gene: str
    found: bool
    mean_expression: float = 0.0
    percent_expressing: float = 0.0
    max_expression: float = 0.0
    min_expression: float = 0.0
    expression_per_cell: Dict[str, float] = {}
    expression_by_cluster: Dict[str, float] = {}
    expression_by_cell_type: Dict[str, float] = {}


class CorrelationItem(BaseModel):
    gene: str
    category: str
    phenotype: str
    correlation: float
    p_value: float
    fdr: float
    mean_expression: float
    percent_expressing: float
    significance_label: str
    evidence_label: str


class CorrelationResponse(BaseModel):
    dataset_id: str
    target_column: str
    total_genes_analyzed: int
    correlations: List[CorrelationItem]
    caveat: str = (
        "Statistical correlation and FDR significance reflect mathematical association "
        "with the phenotype variable in this dataset. They do not constitute proof of "
        "causal biological regulation or biochemical mechanism."
    )
