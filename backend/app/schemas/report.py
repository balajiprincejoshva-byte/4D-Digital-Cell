from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ReportGenerateRequest(BaseModel):
    title: str = "4D Digital Cell Research Report"
    dataset_id: str
    model_id: Optional[str] = None
    perturbation_run_id: Optional[str] = None
    include_qc: bool = True
    include_preprocessing: bool = True
    include_embeddings: bool = True
    include_predictions: bool = True
    include_perturbations: bool = True
    include_limitations: bool = True


class ReportResponse(BaseModel):
    report_id: str
    title: str
    dataset_id: str
    created_at: str
    markdown_content: str
    json_summary: Dict[str, Any]
    limitations: List[str]
    disclaimer: str
