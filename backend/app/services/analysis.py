import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from scipy import stats

from backend.app.schemas.analysis import (
    EmbeddingResult,
    EmbeddingPoint,
    ClusterAnalysisResult,
    MarkerGene,
    GeneExpressionLookup,
    CorrelationItem,
    CorrelationResponse
)


def benjamini_hochberg_correction(p_values: np.ndarray) -> np.ndarray:
    """Calculates Benjamini-Hochberg False Discovery Rate (FDR) adjusted q-values."""
    p_values = np.asarray(p_values, dtype=float)
    n = len(p_values)
    if n == 0:
        return np.array([])
    sorted_indices = np.argsort(p_values)
    sorted_p = p_values[sorted_indices]
    ranks = np.arange(1, n + 1)
    q_values = (n / ranks) * sorted_p
    # Enforce backwards monotonicity
    q_values = np.minimum.accumulate(q_values[::-1])[::-1]
    q_values = np.clip(q_values, 0.0, 1.0)
    adjusted_p = np.empty(n, dtype=float)
    adjusted_p[sorted_indices] = q_values
    return adjusted_p


def compute_embeddings(
    df_expr: pd.DataFrame,
    df_meta: Optional[pd.DataFrame] = None,
    method: str = "PCA",
    n_components: int = 3,
    random_state: int = 42
) -> EmbeddingResult:
    """
    Computes 2D or 3D cellular embeddings.
    Supports PCA natively. If UMAP is requested, attempts import from umap-learn;
    if unavailable, gracefully falls back to PCA with full transparent disclosure.
    """
    fallback_used = False
    notes = ""

    X = df_expr.values
    cell_ids = list(df_expr.index)

    if method.upper() == "UMAP":
        try:
            import umap
            reducer = umap.UMAP(n_components=n_components, random_state=random_state)
            coords = reducer.fit_transform(X)
            variance_ratio = None
            notes = f"UMAP computed with n_components={n_components}."
        except ImportError:
            fallback_used = True
            pca = PCA(n_components=n_components, random_state=random_state)
            coords = pca.fit_transform(X)
            variance_ratio = [round(float(v), 4) for v in pca.explained_variance_ratio_]
            notes = "umap-learn package not installed; gracefully fell back to Principal Component Analysis (PCA)."
    else:
        pca = PCA(n_components=n_components, random_state=random_state)
        coords = pca.fit_transform(X)
        variance_ratio = [round(float(v), 4) for v in pca.explained_variance_ratio_]
        notes = f"PCA computed; top {n_components} components explain {sum(pca.explained_variance_ratio_)*100:.1f}% variance."

    # Align metadata if provided
    meta_dict = {}
    if df_meta is not None and not df_meta.empty:
        # Index df_meta by cell_id if present
        if "cell_id" in df_meta.columns:
            meta_indexed = df_meta.set_index("cell_id")
        else:
            meta_indexed = df_meta
        meta_dict = meta_indexed.to_dict(orient="index")

    points: List[EmbeddingPoint] = []
    clusters_set = set()
    cell_types_set = set()
    timepoints_set = set()

    for idx, cell_id in enumerate(cell_ids):
        m = meta_dict.get(cell_id, {})
        c_type = str(m.get("cell_state", m.get("cell_type", "Unknown")))
        clust = str(m.get("cluster", "Cluster 0"))
        timepoint = float(m.get("timepoint_hours", m.get("timepoint", 0.0))) if ("timepoint_hours" in m or "timepoint" in m) else None
        sample = str(m.get("batch", m.get("sample", "Sample 1")))

        if c_type != "Unknown":
            cell_types_set.add(c_type)
        if clust:
            clusters_set.add(clust)
        if timepoint is not None:
            timepoints_set.add(timepoint)

        points.append(EmbeddingPoint(
            cell_id=cell_id,
            x=round(float(coords[idx, 0]), 4),
            y=round(float(coords[idx, 1]), 4),
            z=round(float(coords[idx, 2]), 4) if n_components >= 3 else 0.0,
            cluster=clust,
            cell_type=c_type,
            sample=sample,
            timepoint=timepoint
        ))

    return EmbeddingResult(
        dataset_id="",
        method="PCA" if fallback_used else method.upper(),
        n_components=n_components,
        variance_ratio=variance_ratio,
        points=points,
        clusters=sorted(list(clusters_set)),
        cell_types=sorted(list(cell_types_set)),
        timepoints=sorted(list(timepoints_set)),
        fallback_used=fallback_used,
        notes=notes
    )


def compute_clustering_and_markers(
    df_expr: pd.DataFrame,
    n_clusters: int = 4,
    random_state: int = 42
) -> ClusterAnalysisResult:
    """
    Computes unsupervised K-Means clustering and differential expression marker genes
    comparing each cluster against all other cells (log2 fold change & Welch's t-test).
    """
    kmeans = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
    labels = kmeans.fit_predict(df_expr.values)

    cluster_names = [f"Cluster_{c+1}" for c in labels]
    cell_ids = list(df_expr.index)
    cluster_labels = {cell_ids[i]: cluster_names[i] for i in range(len(cell_ids))}

    # Cluster sizes
    cluster_sizes = {}
    for c_name in set(cluster_names):
        cluster_sizes[c_name] = cluster_names.count(c_name)

    # Compute candidate marker genes for each cluster
    top_markers: List[MarkerGene] = []
    genes = list(df_expr.columns)

    for c_val in range(n_clusters):
        c_name = f"Cluster_{c_val+1}"
        in_mask = (labels == c_val)
        out_mask = (labels != c_val)

        if in_mask.sum() < 2 or out_mask.sum() < 2:
            continue

        in_expr = df_expr.values[in_mask, :]
        out_expr = df_expr.values[out_mask, :]

        mean_in = np.mean(in_expr, axis=0)
        mean_out = np.mean(out_expr, axis=0)

        # Log2 fold change: log2((mean_in + 0.1) / (mean_out + 0.1))
        log2fc = np.log2((mean_in + 0.1) / (mean_out + 0.1))

        # T-test across genes
        t_stat, p_vals = stats.ttest_ind(in_expr, out_expr, axis=0, equal_var=False)
        p_vals = np.nan_to_num(p_vals, nan=1.0)
        t_stat = np.nan_to_num(t_stat, nan=0.0)
        fdr_vals = benjamini_hochberg_correction(p_vals)

        # Rank genes by log2fc * -log10(p_val + 1e-10)
        score = log2fc * (-np.log10(np.clip(p_vals, 1e-10, 1.0)))
        top_indices = np.argsort(score)[::-1][:5]  # top 5 markers per cluster

        for idx in top_indices:
            top_markers.append(MarkerGene(
                gene=genes[idx],
                cluster=c_name,
                mean_in_cluster=round(float(mean_in[idx]), 3),
                mean_outside_cluster=round(float(mean_out[idx]), 3),
                log2_fold_change=round(float(log2fc[idx]), 3),
                score=round(float(score[idx]), 3),
                p_value=float(p_vals[idx]),
                adjusted_p_value=round(float(fdr_vals[idx]), 6)
            ))

    return ClusterAnalysisResult(
        dataset_id="",
        n_clusters=n_clusters,
        method="K-Means",
        cluster_labels=cluster_labels,
        cluster_sizes=cluster_sizes,
        top_markers=top_markers,
        notes="Unsupervised computational clusters do not strictly equate to known biological cell types without orthogonal validation."
    )


def lookup_gene_expression(
    df_expr: pd.DataFrame,
    gene_symbol: str,
    df_meta: Optional[pd.DataFrame] = None
) -> GeneExpressionLookup:
    """Retrieves single-cell expression distribution and group summaries for a given gene."""
    # Case-insensitive match
    matched_col = None
    for c in df_expr.columns:
        if c.upper() == gene_symbol.upper():
            matched_col = c
            break

    if not matched_col:
        return GeneExpressionLookup(gene=gene_symbol, found=False)

    series = df_expr[matched_col]
    expr_per_cell = {str(k): round(float(v), 3) for k, v in series.items()}

    mean_exp = float(series.mean())
    max_exp = float(series.max())
    min_exp = float(series.min())
    pct_exp = float((series > 0).mean() * 100.0)

    by_cluster = {}
    by_cell_type = {}

    if df_meta is not None and not df_meta.empty:
        meta_indexed = df_meta.set_index("cell_id") if "cell_id" in df_meta.columns else df_meta
        if "cluster" in meta_indexed.columns:
            for cl, grp in series.groupby(meta_indexed["cluster"]):
                by_cluster[str(cl)] = round(float(grp.mean()), 3)
        if "cell_state" in meta_indexed.columns:
            for ct, grp in series.groupby(meta_indexed["cell_state"]):
                by_cell_type[str(ct)] = round(float(grp.mean()), 3)

    return GeneExpressionLookup(
        gene=matched_col,
        found=True,
        mean_expression=round(mean_exp, 3),
        percent_expressing=round(pct_exp, 2),
        max_expression=round(max_exp, 3),
        min_expression=round(min_exp, 3),
        expression_per_cell=expr_per_cell,
        expression_by_cluster=by_cluster,
        expression_by_cell_type=by_cell_type
    )


KNOWN_GENE_INFO = {
    "POU5F1": ("Stem / Progenitor Marker", "Pluripotency / Self-renewal"),
    "SOX2": ("Pluripotency Factor", "Lineage Priming / Competence"),
    "NANOG": ("Pluripotency Core Factor", "Embryonic Self-renewal"),
    "MYOD1": ("Myogenic Master Regulator", "Skeletal Myogenesis"),
    "MYOG": ("Myogenic Differentiation Factor", "Myoblast Fusion"),
    "PAX7": ("Satellite Cell Marker", "Muscle Stem State"),
    "TUBB3": ("Neuronal Microtubule", "Neural Differentiation"),
    "MAP2": ("Microtubule-associated Protein", "Dendritic Outgrowth"),
    "TP53": ("Tumor Suppressor Sentinel", "Apoptosis / Stress Response"),
    "BAX": ("Pro-apoptotic Bcl-2 Family", "Mitochondrial Permeabilization"),
    "MT-CO1": ("Mitochondrial Cytochrome", "Metabolic Respiration / Stress"),
    "MT-ND4": ("Mitochondrial Complex I", "Electron Transport Chain"),
    "GAPDH": ("Glycolytic Housekeeping", "Basal Carbon Metabolism"),
    "ACTB": ("Cytoskeletal Actin", "Cytoskeletal Structure"),
}


def compute_gene_correlations(
    df_expr: pd.DataFrame,
    df_meta: Optional[pd.DataFrame] = None,
    dataset_id: str = "",
    target_column: Optional[str] = None
) -> CorrelationResponse:
    """
    Computes genuine Pearson correlation r, p-values, and Benjamini-Hochberg FDR q-values
    for all genes against a target continuous variable in metadata (or the first numeric column).
    """
    if df_meta is None or df_meta.empty:
        raise ValueError("Metadata is required to compute phenotype correlations.")

    meta_indexed = df_meta.set_index("cell_id") if "cell_id" in df_meta.columns else df_meta

    # Determine target column
    if target_column and target_column in meta_indexed.columns:
        chosen_col = target_column
    else:
        candidate_cols = ["phenotype_score", "differentiation_score", "viability", "timepoint_hours", "timepoint"]
        found = [c for c in candidate_cols if c in meta_indexed.columns]
        if found:
            chosen_col = found[0]
        else:
            numeric_cols = [c for c in meta_indexed.columns if pd.api.types.is_numeric_dtype(meta_indexed[c])]
            if not numeric_cols:
                raise ValueError("No numeric phenotype/target column found in metadata for correlation analysis.")
            chosen_col = numeric_cols[0]

    # Align common cells
    common_cells = [c for c in df_expr.index if c in meta_indexed.index]
    if len(common_cells) < 5:
        raise ValueError(f"Insufficient aligned cells for correlation analysis ({len(common_cells)} found, minimum 5 required).")

    y_vals = meta_indexed.loc[common_cells, chosen_col].astype(float).values
    valid_mask = ~np.isnan(y_vals)
    common_cells = [c for i, c in enumerate(common_cells) if valid_mask[i]]
    y_vals = y_vals[valid_mask]

    if np.std(y_vals) == 0:
        raise ValueError(f"Target variable '{chosen_col}' has zero variance across cells.")

    genes = list(df_expr.columns)
    correlations = []
    p_values = []
    means = []
    pct_exprs = []

    for g in genes:
        x_vals = df_expr.loc[common_cells, g].values
        means.append(float(np.mean(x_vals)))
        pct_exprs.append(float((x_vals > 0).mean() * 100.0))

        if np.std(x_vals) == 0:
            correlations.append(0.0)
            p_values.append(1.0)
        else:
            r, p = stats.pearsonr(x_vals, y_vals)
            correlations.append(float(r) if not np.isnan(r) else 0.0)
            p_values.append(float(p) if not np.isnan(p) else 1.0)

    # Benjamini-Hochberg FDR
    fdr_values = benjamini_hochberg_correction(np.array(p_values))

    items: List[CorrelationItem] = []
    for i, g in enumerate(genes):
        r_val = correlations[i]
        p_val = p_values[i]
        fdr_val = fdr_values[i]

        cat, pheno = KNOWN_GENE_INFO.get(
            g.upper(),
            ("Transcriptomic Feature", f"Association with {chosen_col}")
        )

        sig_label = "FDR < 0.01" if fdr_val < 0.01 else ("FDR < 0.05" if fdr_val < 0.05 else "Not Significant")

        items.append(CorrelationItem(
            gene=g,
            category=cat,
            phenotype=pheno,
            correlation=round(r_val, 4),
            p_value=float(p_val),
            fdr=round(float(fdr_val), 6),
            mean_expression=round(means[i], 3),
            percent_expressing=round(pct_exprs[i], 2),
            significance_label=sig_label,
            evidence_label="Observed in Data"
        ))

    items.sort(key=lambda x: abs(x.correlation), reverse=True)

    return CorrelationResponse(
        dataset_id=dataset_id,
        target_column=chosen_col,
        total_genes_analyzed=len(genes),
        correlations=items
    )
