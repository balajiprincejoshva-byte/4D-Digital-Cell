import sqlite3
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from backend.app.core.config import DATABASE_PATH


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        format TEXT NOT NULL,
        n_cells INTEGER NOT NULL,
        n_genes INTEGER NOT NULL,
        is_synthetic BOOLEAN NOT NULL DEFAULT 0,
        orientation TEXT NOT NULL,
        created_at TEXT NOT NULL,
        metadata_path TEXT,
        qc_summary_json TEXT,
        provenance_json TEXT
    );

    CREATE TABLE IF NOT EXISTS preprocessing_runs (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        config_json TEXT NOT NULL,
        summary_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_runs (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        method TEXT NOT NULL,
        config_json TEXT NOT NULL,
        result_summary_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        model_type TEXT NOT NULL,
        target_column TEXT NOT NULL,
        target_type TEXT NOT NULL,
        metrics_json TEXT NOT NULL,
        feature_names_json TEXT NOT NULL,
        model_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS perturbation_runs (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        gene_name TEXT NOT NULL,
        intervention_type TEXT NOT NULL,
        parameter REAL NOT NULL,
        summary_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        dataset_id TEXT,
        content_markdown TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()
