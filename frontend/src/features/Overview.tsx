import React from 'react';
import { DatasetInfo } from '../types';
import {
  Dna,
  Layers,
  Zap,
  Activity,
  ArrowRight,
  Database,
  ShieldAlert,
  BarChart2,
  Cpu,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { NavTab } from '../components/Navigation';

interface OverviewProps {
  dataset: DatasetInfo | null;
  onNavigate: (tab: NavTab) => void;
  onLoadDemo: () => void;
  isLoading: boolean;
}

export const Overview: React.FC<OverviewProps> = ({
  dataset,
  onNavigate,
  onLoadDemo,
  isLoading
}) => {
  const qc = dataset?.qc_summary;

  return (
    <div className="space-y-6 font-sans">
      {/* Editorial Neobrutalist Hero Banner */}
      <div className="neo-panel p-7 sm:p-9 shadow-neo-lg relative overflow-hidden bg-surface-raised">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-highlight-yellow border-2 border-ink text-ink text-xs font-black shadow-[2px_2px_0_#2B211B]">
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>Multiscale Computational Biology Workstation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-ink">
            AI-Driven 4D Digital Cell
          </h2>
          <p className="text-sm sm:text-base text-ink-secondary leading-relaxed font-medium">
            Connect high-dimensional single-cell biological measurements (scRNA-seq expression matrices) to interpretable machine-learning
            cellular state inference, counterfactual gene interventions, and interactive 4D spatio-temporal cell visualization.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate('digital-cell')}
              className="neo-primary flex items-center space-x-2 text-sm px-5 py-2.5"
            >
              <Layers className="w-4 h-4 stroke-[2.5]" />
              <span>Launch 4D Digital Cell</span>
              <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
            </button>
            <button
              onClick={() => onNavigate('data-lab')}
              className="neo-secondary flex items-center space-x-2 text-sm font-bold px-4 py-2.5 hover:bg-surface-peach transition"
            >
              <Database className="w-4 h-4 text-brand-strong stroke-[2.5]" />
              <span>Inspect & Ingest Data</span>
            </button>
            <button
              onClick={() => onNavigate('perturbation-lab')}
              className="neo-secondary flex items-center space-x-2 text-sm font-bold px-4 py-2.5 hover:bg-surface-peach transition"
            >
              <Zap className="w-4 h-4 text-brand-deep stroke-[2.5]" />
              <span>In-Silico Perturbation Lab</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Dataset Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Dataset Card */}
        <div className="neo-panel p-4 space-y-1.5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-ink-secondary flex items-center justify-between">
            <span>Selected Dataset</span>
            <Database className="w-4 h-4 text-brand stroke-[2.5]" />
          </div>
          <div className="text-xl font-black text-ink truncate">
            {dataset ? dataset.name : 'No Dataset Selected'}
          </div>
          <div className="text-xs font-bold text-ink-muted font-mono">
            {dataset ? `${dataset.n_cells.toLocaleString()} cells × ${dataset.n_genes.toLocaleString()} genes` : 'Please load demo or upload'}
          </div>
        </div>

        {/* Quality Metric 1: Mean Reads / Counts */}
        <div className="neo-panel p-4 space-y-1.5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-ink-secondary flex items-center justify-between">
            <span>Mean Total Counts</span>
            <BarChart2 className="w-4 h-4 text-success stroke-[2.5]" />
          </div>
          <div className="text-2xl font-black text-ink font-mono">
            {qc ? qc.total_counts.mean.toLocaleString() : 'N/A'}
          </div>
          <div className="text-xs font-bold text-ink-muted font-mono">
            Median: {qc ? qc.total_counts.median.toLocaleString() : 'N/A'}
          </div>
        </div>

        {/* Quality Metric 2: Detected Genes */}
        <div className="neo-panel p-4 space-y-1.5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-ink-secondary flex items-center justify-between">
            <span>Detected Genes / Cell</span>
            <Activity className="w-4 h-4 text-brand-strong stroke-[2.5]" />
          </div>
          <div className="text-2xl font-black text-ink font-mono">
            {qc ? qc.detected_genes_per_cell.mean.toFixed(0) : 'N/A'}
          </div>
          <div className="text-xs font-bold text-ink-muted font-mono">
            Range: {qc ? `${qc.detected_genes_per_cell.min} - ${qc.detected_genes_per_cell.max}` : 'N/A'}
          </div>
        </div>

        {/* Quality Metric 3: Mitochondrial % */}
        <div className="neo-panel p-4 space-y-1.5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-ink-secondary flex items-center justify-between">
            <span>Mitochondrial Ratio</span>
            <Dna className="w-4 h-4 text-warning stroke-[2.5]" />
          </div>
          <div className="text-2xl font-black text-ink font-mono">
            {qc ? `${qc.mitochondrial_percent.mean}%` : 'N/A'}
          </div>
          <div className="text-xs font-bold text-ink-muted font-mono">
            {qc?.is_whole_transcriptome || dataset?.qc_scope === 'whole_transcriptome'
              ? 'Whole-Transcriptome QC'
              : 'Reduced Panel QC'}
          </div>
        </div>
      </div>

      {/* End-to-End Workflow Pipeline Tracker */}
      <div className="neo-panel p-6 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div>
            <h3 className="text-base font-black text-ink">End-to-End Research Pipeline</h3>
            <p className="text-xs font-semibold text-ink-secondary">Step-by-step progress through data processing, AI prediction, and 4D simulation.</p>
          </div>
          <span className="text-xs font-black text-ink bg-highlight-yellow px-2.5 py-1 rounded border-2 border-ink shadow-[2px_2px_0_#2B211B]">
            Standard Workflow
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { step: '1', title: 'Data Ingestion', desc: 'CSV/TSV Matrix validation', done: !!dataset, tab: 'data-lab' },
            { step: '2', title: 'QC & Preprocessing', desc: 'CPM & Log1p scaling', done: !!dataset, tab: 'data-lab' },
            { step: '3', title: 'Cell Atlas', desc: 'PCA/UMAP & Clustering', done: !!dataset, tab: 'cell-atlas' },
            { step: '4', title: 'State Predictor', desc: 'Random Forest & Logistic', done: false, tab: 'state-predictor' },
            { step: '5', title: 'In-Silico Perturbation', desc: 'Gene knockout & knockdown', done: false, tab: 'perturbation-lab' },
            { step: '6', title: '4D Simulation', desc: 'Spatio-temporal viewport', done: !!dataset, tab: 'digital-cell' }
          ].map((item) => (
            <div
              key={item.step}
              onClick={() => onNavigate(item.tab as NavTab)}
              className="bg-surface-raised border-2 border-ink hover:bg-surface-peach p-3.5 rounded-lg cursor-pointer transition shadow-[2px_2px_0_#2B211B] hover:-translate-y-0.5 hover:shadow-neo-sm flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-brand-strong font-mono">STEP {item.step}</span>
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-success stroke-[2.5]" />
                  ) : (
                    <Clock className="w-4 h-4 text-ink-muted" />
                  )}
                </div>
                <div className="text-xs font-black text-ink">{item.title}</div>
                <div className="text-[11px] text-ink-secondary font-medium leading-snug">{item.desc}</div>
              </div>
              <div className="pt-3 text-[11px] text-brand-strong font-extrabold flex items-center justify-end space-x-1">
                <span>Open View</span>
                <ArrowRight className="w-3 h-3 stroke-[2.5]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Synthetic Origin Notice */}
      {dataset?.is_synthetic && (
        <div className="p-5 rounded-xl bg-highlight-cream border-2 border-ink shadow-neo-md flex items-start space-x-3.5">
          <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5 stroke-[2.5]" />
          <div className="space-y-1 text-xs text-ink leading-relaxed">
            <div className="font-black text-ink uppercase tracking-wide">
              SYNTHETIC DEMO DATA — NOT EXPERIMENTAL BIOLOGY
            </div>
            <p className="font-medium text-ink-secondary">
              The active demonstration dataset was generated computationally with Poisson-sampled sequencing counts,
              dropout events, batch effects, and 4 synthetic cell states (Progenitor, Myogenic, Neural, Stressed).
              It is intended to demonstrate algorithmic functionality and must not be used to claim biological discovery.
            </p>
          </div>
        </div>
      )}

      {/* Real Experimental Dataset Provenance Card */}
      {dataset && !dataset.is_synthetic && (
        <div className="p-5 rounded-xl bg-success-soft border-2 border-ink shadow-neo-md flex items-start space-x-3.5">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5 stroke-[2.5]" />
          <div className="space-y-2 text-xs text-ink leading-relaxed">
            <div className="font-black text-success uppercase tracking-wide">
              DOCUMENTED EXPERIMENTAL DATA — {dataset.provenance?.dataset_name || '10x Genomics PBMC 3k'}
            </div>
            <p className="font-medium text-ink-secondary">
              Source: {dataset.provenance?.citation || 'Zheng et al., 2017 Nature Communications (DOI: 10.1038/ncomms14049)'}.
              Authentic single-cell RNA-seq measurements from primary human peripheral blood mononuclear cells.
              Cross-sectional biological snapshot; not an illustrative simulation.
            </p>
            <div className="pt-1 flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded bg-surface-raised border border-ink text-ink font-bold shadow-[1px_1px_0_#2B211B]">
                Annotation: {dataset.annotation_provenance || dataset.provenance?.annotation_provenance || 'computational_heuristic'}
              </span>
              <span className={`px-2.5 py-1 rounded border border-ink font-bold shadow-[1px_1px_0_#2B211B] ${dataset.is_independent_ground_truth ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>
                {dataset.is_independent_ground_truth ? 'Independent Ground Truth' : 'Heuristic Weak Labels (Not Independent)'}
              </span>
              <span className="px-2.5 py-1 rounded bg-surface-raised border border-ink text-brand-strong font-bold shadow-[1px_1px_0_#2B211B]">
                QC: {qc?.is_whole_transcriptome || dataset.qc_scope === 'whole_transcriptome' ? 'Whole-Transcriptome (32,738 genes)' : 'Reduced Panel'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
