import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.services.ingestion import generate_synthetic_demo_dataset
from backend.app.api import (
    health,
    datasets,
    preprocessing,
    analysis,
    prediction,
    perturbation,
    visualization,
    reports,
    methodology
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("digital_cell")


# Initialize database tables on load
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and demo dataset
    logger.info("Initializing SQLite database tables...")
    init_db()
    try:
        logger.info("Ensuring synthetic demo dataset exists...")
        datasets.initialize_demo()
    except Exception as e:
        logger.warning(f"Could not initialize demo dataset on startup: {e}")
    yield
    logger.info("Shutting down application...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Computational biology research workstation for multiscale genome-to-phenotype simulation, "
        "cellular state prediction, in-silico genetic perturbation, and 4D spatio-temporal visualization."
    ),
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(datasets.router, prefix="/api", tags=["Datasets"])
app.include_router(preprocessing.router, prefix="/api", tags=["Preprocessing"])
app.include_router(analysis.router, prefix="/api", tags=["Cell Atlas Analysis"])
app.include_router(prediction.router, prefix="/api", tags=["Cellular State Prediction"])
app.include_router(perturbation.router, prefix="/api", tags=["In-Silico Genetic Perturbation"])
app.include_router(visualization.router, prefix="/api", tags=["4D Visualization"])
app.include_router(reports.router, prefix="/api", tags=["Validation & Reports"])
app.include_router(methodology.router, prefix="/api", tags=["Literature & Methodology"])


@app.get("/")
def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "docs_url": "/docs",
        "health_check": "/api/health",
        "disclaimer": settings.disclaimer
    }
