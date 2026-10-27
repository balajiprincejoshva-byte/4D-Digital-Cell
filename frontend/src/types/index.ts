export interface DatasetInfo {
  id: string;
  name: string;
  filename: string;
  format: string;
  n_cells: number;
  n_genes: number;
  is_synthetic: boolean;
  orientation: string;
  created_at: string;
  metadata_columns: string[];
  annotation_provenance?: string;
  is_independent_ground_truth?: boolean;
  marker_genes_used_for_annotation?: string[];
  qc_scope?: 'whole_transcriptome' | 'reduced_panel';
  qc_summary?: {
    n_cells: number;
    n_genes: number;
    qc_scope?: string;
    scope_note?: string;
    is_whole_transcriptome?: boolean;
    total_genes_in_assay?: number;
    total_counts: { mean: number; median: number; min: number; max: number; std: number };
    detected_genes_per_cell: { mean: number; median: number; min: number; max: number };
    mitochondrial_percent: { mean: number; median: number; max: number; detected_mito_genes_count: number };
    per_cell_qc?: Array<{ cell_id: string; total_counts: number; n_detected_genes: number; mito_percent: number }>;
  };
  provenance?: {
    source: string;
    generator_seed?: number;
    is_synthetic: boolean;
    organism?: string;
    biological_states?: string[];
    disclaimer?: string;
    dataset_name?: string;
    citation?: string;
    doi?: string;
    tissue?: string;
    technology?: string;
    license?: string;
    [key: string]: any;
  };
}

export interface DatasetPreview {
  id: string;
  name: string;
  n_cells: number;
  n_genes: number;
  cell_ids_sample: string[];
  gene_ids_sample: string[];
  metadata_columns: string[];
  preview_matrix: number[][];
  orientation: string;
  is_synthetic: boolean;
  annotation_provenance?: string;
  is_independent_ground_truth?: boolean;
  marker_genes_used_for_annotation?: string[];
  qc_scope?: string;
  validation_warnings: string[];
}

export interface PreprocessingConfig {
  dataset_id: string;
  min_genes_per_cell: number;
  max_genes_per_cell?: number;
  min_cells_per_gene: number;
  max_mito_percent: number;
  target_sum: number;
  apply_log1p: boolean;
  n_top_variable_genes: number;
  scale_data: boolean;
}

export interface PreprocessingResult {
  run_id: string;
  dataset_id: string;
  original_n_cells: number;
  original_n_genes: number;
  filtered_n_cells: number;
  filtered_n_genes: number;
  cells_removed_qc: number;
  genes_removed_qc: number;
  highly_variable_genes: string[];
  created_at: string;
  parameters: Record<string, any>;
  summary_text: string;
}

export interface EmbeddingPoint {
  cell_id: string;
  x: number;
  y: number;
  z?: number;
  cluster?: string;
  cell_type?: string;
  sample?: string;
  timepoint?: number;
  expression_val?: number;
}

export interface EmbeddingResult {
  dataset_id: string;
  method: string;
  n_components: number;
  variance_ratio?: number[];
  points: EmbeddingPoint[];
  clusters: string[];
  cell_types: string[];
  timepoints: number[];
  fallback_used: boolean;
  notes: string;
}

export interface MarkerGene {
  gene: string;
  cluster: string;
  mean_in_cluster: number;
  mean_outside_cluster: number;
  log2_fold_change: number;
  score: number;
  p_value: number;
  adjusted_p_value?: number;
}

export interface ClusterAnalysisResult {
  dataset_id: string;
  n_clusters: number;
  method: string;
  cluster_labels: Record<string, string>;
  cluster_sizes: Record<string, number>;
  top_markers: MarkerGene[];
  notes: string;
}

export interface GeneExpressionLookup {
  gene: string;
  found: boolean;
  mean_expression: number;
  percent_expressing: number;
  max_expression: number;
  min_expression: number;
  expression_per_cell: Record<string, number>;
  expression_by_cluster: Record<string, number>;
  expression_by_cell_type: Record<string, number>;
}

export interface TrainModelRequest {
  dataset_id: string;
  target_column: string;
  model_type: string;
  test_size: number;
  random_seed: number;
  n_estimators: number;
  max_depth?: number;
}

export interface EvaluationMetrics {
  task_type: string;
  accuracy?: number;
  macro_f1?: number;
  balanced_accuracy?: number;
  roc_auc?: number;
  confusion_matrix?: number[][];
  class_labels?: string[];
  mae?: number;
  rmse?: number;
  r2_score?: number;
  train_score: number;
  test_score: number;
  is_valid_evaluation: boolean;
  warnings: string[];
  evaluation_label?: string;
  annotation_provenance?: string;
  is_independent_ground_truth?: boolean;
  circular_evaluation_risk?: boolean;
  overlapping_marker_features?: string[];
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  rank: number;
}

export interface TrainedModelInfo {
  model_id: string;
  dataset_id: string;
  model_name: string;
  model_type: string;
  target_column: string;
  target_type: string;
  metrics: EvaluationMetrics;
  top_features: FeatureImportanceItem[];
  features_count: number;
  created_at: string;
  caveat: string;
  evaluation_label?: string;
  circular_evaluation_risk?: boolean;
  is_independent_ground_truth?: boolean;
}

export interface PredictionItem {
  cell_id: string;
  true_label?: string;
  predicted_label: string;
  probabilities?: Record<string, number>;
  predicted_numeric?: number;
  true_numeric?: number;
}

export interface PerturbationRequest {
  model_id: string;
  dataset_id: string;
  gene_name: string;
  intervention_type: 'knockout' | 'down_regulation' | 'up_regulation';
  parameter: number;
  notes?: string;
}

export interface StateDistributionDelta {
  state: string;
  baseline_count: number;
  perturbed_count: number;
  count_delta: number;
  baseline_fraction: number;
  perturbed_fraction: number;
  fraction_delta: number;
}

export interface CellPerturbationDelta {
  cell_id: string;
  baseline_state: string;
  perturbed_state: string;
  state_changed: boolean;
  baseline_probability?: number;
  perturbed_probability?: number;
  probability_delta?: number;
  baseline_numeric?: number;
  perturbed_numeric?: number;
  numeric_delta?: number;
}

export interface PerturbationResult {
  run_id: string;
  model_id: string;
  dataset_id: string;
  gene_name: string;
  intervention_type: string;
  parameter: number;
  cells_evaluated: number;
  cells_transitioned_count: number;
  transition_percentage: number;
  state_distributions: StateDistributionDelta[];
  cell_deltas_sample: CellPerturbationDelta[];
  created_at: string;
  disclaimer: string;
}

export interface SceneParticle {
  cell_id: string;
  x: number;
  y: number;
  z: number;
  cell_state: string;
  timepoint: number;
  active_gene_expr: number;
  state_changed_by_perturbation: boolean;
  perturbed_state?: string;
}

export interface CellSceneData {
  dataset_n_cells: number;
  has_temporal_metadata?: boolean;
  is_longitudinal?: boolean;
  spatial_mode: string;
  temporal_mode: string;
  available_timepoints: number[];
  available_states: string[];
  structures: {
    plasma_membrane: { dimensions: { radius_x: number; radius_y: number; radius_z: number }; opacity: number; color: string };
    nucleus: { position: { x: number; y: number; z: number }; radius: number; opacity: number; color: string };
    cytoplasm: { radius_inner: number; radius_outer: number };
  };
  particles: SceneParticle[];
  caveat: string;
}

export interface ReportResponse {
  report_id: string;
  title: string;
  dataset_id: string;
  created_at: string;
  markdown_content: string;
  json_summary: Record<string, any>;
  limitations: string[];
  disclaimer: string;
}

export interface CorrelationItem {
  gene: string;
  category: string;
  phenotype: string;
  correlation: number;
  p_value: number;
  fdr: number;
  mean_expression: number;
  percent_expressing: number;
  significance_label: string;
  evidence_label: string;
}

export interface CorrelationResponse {
  dataset_id: string;
  target_column: string;
  total_genes_analyzed: number;
  correlations: CorrelationItem[];
  caveat: string;
}
