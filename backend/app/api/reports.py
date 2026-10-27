from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from backend.app.schemas.report import ReportGenerateRequest, ReportResponse
from backend.app.services.reporting import generate_research_report
from backend.app.core.database import get_db_connection

router = APIRouter()


@router.post("/reports/generate", response_model=ReportResponse)
def create_report(request: ReportGenerateRequest):
    """Generates a comprehensive reproducible research report from database records."""
    try:
        report = generate_research_report(
            dataset_id=request.dataset_id,
            title=request.title,
            model_id=request.model_id,
            perturbation_run_id=request.perturbation_run_id
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/reports/{report_id}/download", response_class=PlainTextResponse)
def download_report_markdown(report_id: str):
    """Downloads the report in raw Markdown format."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT content_markdown FROM reports WHERE id = ?", (report_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Report not found.")

    return row["content_markdown"]
