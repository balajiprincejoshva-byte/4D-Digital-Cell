from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from backend.app.services.visualization_4d import generate_4d_cell_scene_data
from backend.app.api.analysis import _load_dataset_matrices

router = APIRouter()


class SceneRequest(BaseModel):
    dataset_id: str
    active_gene: Optional[str] = None
    perturbation_deltas: Optional[Dict[str, Any]] = None


@router.post("/visualization/scene")
def get_cell_scene(request: SceneRequest):
    """Generates 3D structural boundaries and cellular particle coordinates for Three.js viewport."""
    df_expr, df_meta = _load_dataset_matrices(request.dataset_id)
    scene_data = generate_4d_cell_scene_data(
        df_expr=df_expr,
        df_meta=df_meta,
        active_gene=request.active_gene,
        perturbation_deltas=request.perturbation_deltas
    )
    return scene_data
