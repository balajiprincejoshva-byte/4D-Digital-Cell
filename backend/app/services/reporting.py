import uuid
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

from backend.app.core.config import EXPORTS_DIR, settings
from backend.app.core.database import get_db_connection
from backend.app.schemas.report import ReportResponse


def generate_research_report(
    dataset_id: str,
    title: str = "4D Digital Cell Research Report",
    model_id: Optional[str] = None,
    perturbation_run_id: Optional[str] = None
) -> ReportResponse:
    """
    Synthesizes an end-to-end reproducible computational research report
    from actual database records and stored analysis artifacts.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Fetch dataset record
    cursor.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,))
    ds_row = cursor.fetchone()
    if not ds_row:
        conn.close()
        raise ValueError(f"Dataset '{dataset_id}' not found.")

    ds = dict(ds_row)
    qc_summary = json.loads(ds["qc_summary_json"]) if ds["qc_summary_json"] else {}
    provenance = json.loads(ds["provenance_json"]) if ds["provenance_json"] else {}

    # 2. Fetch preprocessing runs
    cursor.execute("SELECT * FROM preprocessing_runs WHERE dataset_id = ? ORDER BY created_at DESC LIMIT 1", (dataset_id,))
    prep_row = cursor.fetchone()
    prep = dict(prep_row) if prep_row else None
    prep_summary = json.loads(prep["summary_json"]) if prep and prep.get("summary_json") else {}

    # 3. Fetch model run
    model_row = None
    if model_id:
        cursor.execute("SELECT * FROM models WHERE id = ?", (model_id,))
        model_row = cursor.fetchone()
    else:
        cursor.execute("SELECT * FROM models WHERE dataset_id = ? ORDER BY created_at DESC LIMIT 1", (dataset_id,))
        model_row = cursor.fetchone()

    m_data = dict(model_row) if model_row else None
    m_metrics = json.loads(m_data["metrics_json"]) if m_data and m_data.get("metrics_json") else {}

    # 4. Fetch perturbation run
    pert_row = None
    if perturbation_run_id:
        cursor.execute("SELECT * FROM perturbation_runs WHERE id = ?", (perturbation_run_id,))
        pert_row = cursor.fetchone()
    else:
        cursor.execute("SELECT * FROM perturbation_runs WHERE dataset_id = ? ORDER BY created_at DESC LIMIT 1", (dataset_id,))
        pert_row = cursor.fetchone()

    p_data = dict(pert_row) if pert_row else None
    p_summary = json.loads(p_data["summary_json"]) if p_data and p_data.get("summary_json") else {}

    report_id = f"rep_{uuid.uuid4().hex[:8]}"
    created_at = datetime.utcnow().isoformat()

    # Build Markdown Document
    md_lines = [
        f"# {title}",
        f"**Report ID**: `{report_id}`  ",
        f"**Generated**: `{created_at}` UTC  ",
        f"**Software Platform**: {settings.app_name} v{settings.app_version}  ",
        "",
        "---",
        "",
        "## 1. Executive Summary & Provenance",
        f"- **Dataset Identifier**: `{ds['id']}`",
        f"- **Dataset Name**: {ds['name']}",
        f"- **Data Origin / Type**: {'SYNTHETIC DEMO DATA' if ds['is_synthetic'] else 'Experimental / Uploaded Data'}",
        f"- **Dimensions**: {ds['n_cells']:,} cells × {ds['n_genes']:,} genes",
        f"- **Matrix Orientation**: `{ds['orientation']}`",
        f"- **Ingestion Timestamp**: `{ds['created_at']}`",
    ]

    if provenance:
        if provenance.get("citation"):
            md_lines.append(f"- **Published Citation**: {provenance['citation']}")
        if provenance.get("doi"):
            md_lines.append(f"- **DOI**: [{provenance['doi']}](https://doi.org/{provenance['doi']})")
        if provenance.get("organism"):
            md_lines.append(f"- **Organism**: *{provenance['organism']}*")
        if provenance.get("tissue"):
            md_lines.append(f"- **Tissue / Sample**: {provenance['tissue']}")
        if provenance.get("technology"):
            md_lines.append(f"- **Assay Technology**: {provenance['technology']}")
        if provenance.get("license"):
            md_lines.append(f"- **License / Terms**: {provenance['license']}")
        
        # Provenance classification
        ann_prov = provenance.get("annotation_provenance", "unknown")
        is_ind_gt = provenance.get("is_independent_ground_truth", False)
        md_lines.append(f"- **Cell Annotation Provenance**: `{ann_prov}`")
        md_lines.append(f"- **Independent Biological Ground Truth**: {'Yes (Orthogonal / Reference)' if is_ind_gt else 'No (Computational Heuristic / Weak Label / Synthetic)'}")
        if provenance.get("marker_genes_used_for_annotation"):
            markers_str = ", ".join(provenance["marker_genes_used_for_annotation"])
            md_lines.append(f"- **Marker Genes Used for Inferred Annotations**: `{markers_str}`")

    # QC Scope
    is_wt = qc_summary.get("is_whole_transcriptome", False) or qc_summary.get("qc_scope") == "whole_transcriptome"
    md_lines.append(f"- **Quality Control Scope**: {'Whole-Transcriptome Assay' if is_wt else 'Reduced Feature Panel'}")
    md_lines.append("")

    if ds['is_synthetic']:
        md_lines.extend([
            "> [!WARNING]",
            "> **SYNTHETIC DEMO DATA — NOT EXPERIMENTAL BIOLOGY**",
            "> This dataset was computationally synthesized with fixed pseudorandom seeds for algorithmic verification.",
            "> It does not represent experimentally observed cellular biology.",
            ""
        ])

    # Section 2: Quality Control
    md_lines.extend([
        "## 2. Quality Control & Preprocessing Audit",
    ])
    if qc_summary:
        qc_scope_label = "Whole-Transcriptome (Unrestricted Assay)" if is_wt else "Reduced Feature Panel"
        md_lines.extend([
            f"- **QC Evaluation Matrix**: {qc_scope_label}",
            f"- **Mean Total Counts / Cell**: {qc_summary.get('total_counts', {}).get('mean', 'N/A')}",
            f"- **Median Detected Genes / Cell**: {qc_summary.get('detected_genes_per_cell', {}).get('median', 'N/A')}",
            f"- **Mean Mitochondrial Fraction**: {qc_summary.get('mitochondrial_percent', {}).get('mean', 'N/A')}%",
        ])
        if qc_summary.get("scope_note"):
            md_lines.append(f"- **QC Note**: *{qc_summary['scope_note']}*")
        md_lines.append("")
    if prep_summary:
        md_lines.extend([
            f"- **Cells Retained After QC Filtering**: {prep_summary.get('filtered_n_cells', 'N/A')} (removed {prep_summary.get('cells_removed_qc', 0)})",
            f"- **Genes Retained After QC Filtering**: {prep_summary.get('filtered_n_genes', 'N/A')} (removed {prep_summary.get('genes_removed_qc', 0)})",
            f"- **Selected Highly Variable Genes**: {len(prep_summary.get('highly_variable_genes', []))} features",
            f"- **Preprocessing Settings**: Normalized total counts to {prep_summary.get('parameters', {}).get('target_sum', 10000)} with log1p transformation.",
            ""
        ])
    else:
        md_lines.append("- *No standalone preprocessing run was executed prior to report generation.*")

    # Section 3: Machine Learning Model Evaluation
    md_lines.extend([
        "## 3. Predictive Model Evaluation & Cellular State Inference",
    ])
    if m_data:
        eval_label = m_metrics.get("evaluation_label", "Exploratory Model Fit")
        circ_risk = m_metrics.get("circular_evaluation_risk", False)
        md_lines.extend([
            f"- **Model Identifier**: `{m_data['id']}`",
            f"- **Model Architecture**: `{m_data['model_type']}`",
            f"- **Target Column**: `{m_data['target_column']}` ({m_data['target_type']})",
            f"- **Evaluation Classification**: **{eval_label}**",
            f"- **Train / Test Strategy**: Stratified 75% Train / 25% Held-Out Test",
            f"- **Training Score**: {m_metrics.get('train_score', 'N/A')}",
            f"- **Held-Out Test Score**: {m_metrics.get('test_score', 'N/A')}",
        ])
        if m_data['target_type'] == "classification":
            md_lines.extend([
                f"- **Held-Out Accuracy**: {m_metrics.get('accuracy', 'N/A')}",
                f"- **Held-Out Macro-F1**: {m_metrics.get('macro_f1', 'N/A')}",
                f"- **Balanced Accuracy**: {m_metrics.get('balanced_accuracy', 'N/A')}",
            ])
        else:
            md_lines.extend([
                f"- **MAE**: {m_metrics.get('mae', 'N/A')}",
                f"- **RMSE**: {m_metrics.get('rmse', 'N/A')}",
                f"- **R²**: {m_metrics.get('r2_score', 'N/A')}",
            ])

        if circ_risk:
            overlap_str = ", ".join(m_metrics.get("overlapping_marker_features", []))
            md_lines.extend([
                "",
                "> [!WARNING]",
                "> **CIRCULAR EVALUATION DISCLOSURE — NOT INDEPENDENT BIOLOGICAL VALIDATION**",
                f"> Target cell-state labels were assigned using marker gene rules ({overlap_str}) that overlap with features used to train this predictive model.",
                "> Reported held-out metrics quantify internal algorithmic concordance with marker-based heuristic classification rules, NOT orthogonal or independent biological validation.",
                ""
            ])
        elif m_metrics.get("annotation_provenance") == "synthetic":
            md_lines.extend([
                "",
                "> [!NOTE]",
                "> **SYNTHETIC BENCHMARK EVALUATION**",
                "> Evaluation metrics reflect model fit on synthetically generated cells and targets, confirming software pipeline integrity rather than biological predictive performance.",
                ""
            ])

        md_lines.extend([
            "",
            "> [!NOTE]",
            "> Statistical feature importance metrics reflect the predictive utility of mathematical inputs in this model.",
            "> They do not prove direct biochemical binding, enzymatic catalysis, or causal regulatory interactions.",
            ""
        ])
    else:
        md_lines.append("- *No predictive model training run found for this dataset.*")

    # Section 4: Genetic Perturbation
    md_lines.extend([
        "## 4. In-Silico Genetic Perturbation Simulation",
    ])
    if p_data:
        md_lines.extend([
            f"- **Perturbation Run ID**: `{p_data['id']}`",
            f"- **Targeted Feature / Gene**: **{p_data['gene_name']}**",
            f"- **Intervention**: `{p_data['intervention_type']}` (parameter: {p_data['parameter']})",
            f"- **Cells Evaluated**: {p_summary.get('cells_evaluated', 'N/A')}",
            f"- **Cells Transitioning State**: {p_summary.get('cells_transitioned_count', 'N/A')} ({p_summary.get('transition_percentage', 'N/A')}%)",
            "",
            "> [!IMPORTANT]",
            "> **MODEL-BASED COUNTERFACTUAL — NOT PROOF OF A CAUSAL BIOLOGICAL EFFECT**",
            "> This in-silico perturbation is a computational manipulation of model feature inputs.",
            "> It does not establish wet-lab therapeutic efficacy or in-vivo biological response.",
            ""
        ])
        if "state_distributions" in p_summary:
            md_lines.extend([
                "| State | Baseline Fraction | Perturbed Fraction | Shift (Delta) |",
                "| :--- | :--- | :--- | :--- |"
            ])
            for sd in p_summary["state_distributions"]:
                md_lines.append(f"| {sd['state']} | {sd['baseline_fraction']*100:.1f}% | {sd['perturbed_fraction']*100:.1f}% | {sd['fraction_delta']*100:+.1f}% |")
            md_lines.append("")
    else:
        md_lines.append("- *No genetic perturbation experiments were performed on this dataset.*")

    # Section 5: Limitations and Disclaimers
    limitations = [
        "Unsupervised computational clusters do not strictly represent verified biological cell types without orthogonal validation.",
        "Model-predicted state transitions represent mathematical input-output counterfactuals, not wet-lab biochemical validation.",
        "Feature importances are statistical correlations within the dataset and do not imply causal biochemical mechanisms.",
        "3D spatial boundaries and particle positions are conceptual visualization representations unless experimental coordinates are explicitly provided.",
        "Synthetic demonstration datasets are strictly illustrative and cannot be used for clinical or biological discovery."
    ]

    md_lines.extend([
        "## 5. Methodological Limitations & Known Assumptions",
    ])
    for lim in limitations:
        md_lines.append(f"- {lim}")

    md_lines.extend([
        "",
        "## 6. Regulatory & Clinical Disclaimer",
        settings.disclaimer,
        "",
        "---",
        f"*End of Research Report `{report_id}`.*"
    ])

    markdown_content = "\n".join(md_lines)

    # Save to disk
    report_file = EXPORTS_DIR / f"{report_id}.md"
    with open(report_file, "w", encoding="utf-8") as f:
        f.write(markdown_content)

    # Persist in DB
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reports (id, title, dataset_id, content_markdown, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (report_id, title, dataset_id, markdown_content, created_at))
    conn.commit()
    conn.close()

    json_summary = {
        "report_id": report_id,
        "dataset_id": dataset_id,
        "dataset_name": ds["name"],
        "is_synthetic": ds["is_synthetic"],
        "provenance": provenance,
        "model_id": m_data["id"] if m_data else None,
        "perturbation_id": p_data["id"] if p_data else None,
        "created_at": created_at
    }

    return ReportResponse(
        report_id=report_id,
        title=title,
        dataset_id=dataset_id,
        created_at=created_at,
        markdown_content=markdown_content,
        json_summary=json_summary,
        limitations=limitations,
        disclaimer=settings.disclaimer
    )
