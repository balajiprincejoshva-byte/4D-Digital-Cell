from fastapi import APIRouter
from backend.app.core.config import settings

router = APIRouter()


@router.get("/methodology")
def get_methodology_and_literature():
    """Returns authentic scientific literature, computational methodology, and assumptions."""
    return {
        "title": "4D Digital Cell: Literature, Computational Methodology & Assumptions",
        "disclaimer": settings.disclaimer,
        "themes": [
            {
                "topic": "Digital Cell & Whole-Cell Computational Modeling",
                "summary": (
                    "Whole-cell and digital cell modeling seeks to predict observable cellular phenotypes "
                    "directly from molecular and genomic measurements. Initial whole-cell simulations "
                    "(e.g., Mycoplasma genitalium) integrated ODE systems, stochastic simulations, and flux-balance analysis. "
                    "Modern AI-driven approaches represent cells as continuous state manifolds in high-dimensional gene expression space."
                ),
                "assumptions_in_this_app": (
                    "This research prototype utilizes machine learning classifiers and regressors across transcriptomic "
                    "feature vectors. It models cell states as statistical likelihood distributions rather than whole-cell biochemical kinetics."
                )
            },
            {
                "topic": "Single-Cell Quality Control & Preprocessing",
                "summary": (
                    "Single-cell RNA sequencing data exhibits high technical sparsity, library size variation, and potential droplet contamination. "
                    "Standard bioinformatics pipelines filter cells based on minimum detected genes and mitochondrial ratio thresholds, followed by "
                    "total-count normalization (CPM) and variance-stabilizing log1p transformation."
                ),
                "assumptions_in_this_app": (
                    "We implement standard library size scaling to 10,000 counts per cell with log(1 + x) transformation. "
                    "High mitochondrial fraction (>20%) is treated as an indicator of membrane disruption or apoptosis."
                )
            },
            {
                "topic": "In-Silico Genetic Perturbation",
                "summary": (
                    "In-silico genetic perturbation modifies input feature representations to evaluate counterfactual state transitions. "
                    "Experimental perturbation methodologies such as Perturb-seq (Dixit et al., 2016) couple CRISPR knockouts with single-cell readout "
                    "to assess functional outcomes."
                ),
                "assumptions_in_this_app": (
                    "In-silico knockouts in this application set the target gene's input feature to zero (or apply scaled down/up-regulation multipliers). "
                    "This models the predictive model's sensitivity to that feature, but does NOT model compensatory transcriptional feedback or proteomic buffering. "
                    "Prominently flagged as: MODEL-BASED COUNTERFACTUAL — NOT PROOF OF A CAUSAL BIOLOGICAL EFFECT."
                )
            },
            {
                "topic": "4D Spatio-Temporal Visualization",
                "summary": (
                    "Spatiotemporal cellular modeling maps molecular trajectories over time and cellular space. "
                    "When true spatial transcriptomics or longitudinal timepoint data is unavailable, dynamic trajectories "
                    "are illustrative computational projections."
                ),
                "assumptions_in_this_app": (
                    "The 3D viewport renders stylized cellular geometry (plasma membrane, nucleus, cytoplasm). "
                    "Particles represent individual single-cell measurements mapped to either explicit spatial coordinates (when provided) "
                    "or 3D PCA embedding projections."
                )
            }
        ],
        "verified_literature_references": [
            {
                "title": "A whole-cell computational model predicts phenotype from genotype",
                "authors": "Karr JR, Sanghvi JC, Macklin DN, Gutschow MV, Jacobs JM, Bolival B Jr, Assad-Garcia N, Glass JI, Covert MW",
                "journal": "Cell",
                "year": 2012,
                "volume": "150(2)",
                "pages": "389-401",
                "doi": "10.1016/j.cell.2012.05.044",
                "pmid": "22817898",
                "url": "https://doi.org/10.1016/j.cell.2012.05.044",
                "claim_supported": "Establishes foundational methodology for integrative computational modeling of cellular states from genome to phenotype."
            },
            {
                "title": "Scanpy: large-scale single-cell gene expression data analysis",
                "authors": "Wolf FA, Angerer P, Theis FJ",
                "journal": "Genome Biology",
                "year": 2018,
                "volume": "19(1)",
                "pages": "15",
                "doi": "10.1186/s13059-017-1382-0",
                "pmid": "29409532",
                "url": "https://doi.org/10.1186/s13059-017-1382-0",
                "claim_supported": "Provides standard computational workflows for single-cell preprocessing, quality control, normalization, and PCA/UMAP embeddings."
            },
            {
                "title": "Perturb-seq: Dissecting Molecular Circuits with Scalable Single-Cell RNA Profiling of Pooled Genetic Screens",
                "authors": "Dixit A, Parnas O, Li B, Chen J, Fulco CP, Jerby-Arnon L, Marjanovic ND, Dionne D, Burks T, Raychowdhury R, Adamson B, Norman TM, Lander ES, Weissman JS, Friedman N, Regev A",
                "journal": "Cell",
                "year": 2016,
                "volume": "167(7)",
                "pages": "1853-1866",
                "doi": "10.1016/j.cell.2016.11.038",
                "pmid": "27984732",
                "url": "https://doi.org/10.1016/j.cell.2016.11.038",
                "claim_supported": "Experimental benchmark for measuring cellular state responses to pooled genetic perturbations using scRNA-seq."
            },
            {
                "title": "scGen predicts single-cell perturbation responses",
                "authors": "Lotfollahi M, Wolf FA, Theis FJ",
                "journal": "Nature Methods",
                "year": 2019,
                "volume": "16(8)",
                "pages": "715-721",
                "doi": "10.1038/s41592-019-0494-6",
                "pmid": "31363201",
                "url": "https://doi.org/10.1038/s41592-019-0494-6",
                "claim_supported": "Demonstrates machine learning prediction of cellular perturbation responses across discrete cell types and conditions."
            },
            {
                "title": "Comprehensive Integration of Single-Cell Data",
                "authors": "Stuart T, Butler A, Hoffman P, Hafemeister C, Papalexi E, Mauck WM 3rd, Hao Y, Stoeckius M, Smibert P, Satija R",
                "journal": "Cell",
                "year": 2019,
                "volume": "177(7)",
                "pages": "1888-1902",
                "doi": "10.1016/j.cell.2019.05.031",
                "pmid": "31178118",
                "url": "https://doi.org/10.1016/j.cell.2019.05.031",
                "claim_supported": "Standard framework for cross-dataset single-cell integration, batch correction, and cell-state annotation."
            }
        ]
    }
