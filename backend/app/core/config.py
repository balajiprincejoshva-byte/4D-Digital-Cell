import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
WORKSPACE_DIR = BASE_DIR.parent
DATA_DIR = WORKSPACE_DIR / "data"
DATABASE_PATH = BASE_DIR / "digital_cell.db"

# Ensure data storage directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
DEMO_DIR = DATA_DIR / "demo"
DEMO_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR = DATA_DIR / "exports"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseModel):
    app_name: str = "AI-Driven 4D Digital Cell"
    app_version: str = "1.0.0"
    api_prefix: str = "/api"
    disclaimer: str = (
        "RESEARCH & EDUCATION PROTOTYPE ONLY: This computational biology software "
        "must not be used independently for clinical diagnosis, treatment decisions, "
        "or patient care. In-silico perturbations represent model counterfactuals, "
        "not proven causal biological effects."
    )
    max_upload_size_bytes: int = 50 * 1024 * 1024  # 50 MB limit for safety


settings = Settings()
