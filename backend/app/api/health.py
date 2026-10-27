from fastapi import APIRouter
from backend.app.core.config import settings

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "disclaimer": settings.disclaimer
    }
