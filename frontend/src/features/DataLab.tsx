import React, { useState, useEffect } from 'react';
import { DatasetInfo, DatasetPreview, PreprocessingConfig, PreprocessingResult } from '../types';
import { api } from '../lib/api';
import {
  Upload,
  Database,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Dna,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DataLabProps {
  dataset: DatasetInfo | null;
  onDatasetUpdated: (dataset: DatasetInfo) => void;
}

export const DataLab: React.FC<DataLabProps> = ({ dataset, onDatasetUpdated }) => {
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepResult, setPrepResult] = useState<PreprocessingResult | null>(null);

  // Upload state
  const [uploadName, setUploadName] = useState('');
  const [exprFile, setExprFile] = useState<File | null>(null);
  const [metaFile, setMetaFile] = useState<File | null>(null);
  const [forcedOrientation, setForcedOrientation] = useState<string>('auto');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Preprocessing config
  const [minGenes, setMinGenes] = useState(10);
  const [maxMito, setMaxMito] = useState(20);
  const [minCellsGene, setMinCellsGene] = useState(3);
  const [targetSum, setTargetSum] = useState(10000);
  const [applyLog, setApplyLog] = useState(true);
  const [nTopGenes, setNTopGenes] = useState(500);
  const [scaleData, setScaleData] = useState(true);

  useEffect(() => {
    if (!dataset) return;
    setLoadingPreview(true);
    api.getDatasetPreview(dataset.id)
      .then(p => setPreview(p))
      .catch(err => console.error("Error loading preview:", err))
      .finally(() => setLoadingPreview(false));
  }, [dataset?.id]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exprFile) {
      setUploadError("Please select a CSV or TSV expression matrix.");
      return;
    }
    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('name', uploadName || exprFile.name.replace(/\.[^/.]+$/, ""));
      formData.append('expression_file', exprFile);
      if (metaFile) formData.append('metadata_file', metaFile);
      if (forcedOrientation !== 'auto') formData.append('forced_orientation', forcedOrientation);

      const newDs = await api.uploadDataset(formData);
      onDatasetUpdated(newDs);
      setExprFile(null);
      setMetaFile(null);
      setUploadName('');
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload dataset.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunPreprocessing = async () => {
    if (!dataset) return;
    setPrepLoading(true);
    try {
      const config: PreprocessingConfig = {
        dataset_id: dataset.id,
        min_genes_per_cell: minGenes,
        min_cells_per_gene: minCellsGene,
        max_mito_percent: maxMito,
        target_sum: targetSum,
        apply_log1p: applyLog,
        n_top_variable_genes: nTopGenes,
        scale_data: scaleData
      };
      const res = await api.runPreprocessing(config);
      setPrepResult(res);
    } catch (err: any) {
      alert(`Preprocessing failed: ${err.message}`);
    } finally {
      setPrepLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner / Ingestion Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Panel */}
        <div className="neo-panel p-6 space-y-4">
          <div className="flex items-center space-x-2 text-ink font-black text-sm border-b-2 border-ink pb-3">
            <Upload className="w-4 h-4 text-brand stroke-[2.5]" />
            <span>Ingest Biological Expression Data</span>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-ink font-bold mb-1">Dataset Display Name</label>
              <input
                type="text"
                placeholder="e.g., Human Cortical Lineage scRNA-seq"
                value={uploadName}
                onChange={e => setUploadName(e.target.value)}
                className="w-full bg-surface-raised border-2 border-ink px-3 py-2 rounded-md text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-brand shadow-[1px_1px_0_#2B211B]"
              />
            </div>

            <div className="p-3 bg-surface-peach/40 border-2 border-dashed border-ink rounded-lg">
              <label className="block text-ink font-extrabold mb-1">Expression Matrix (CSV or TSV) *</label>
              <input
                type="file"
                accept=".csv,.tsv"
                onChange={e => setExprFile(e.target.files?.[0] || null)}
                className="w-full text-ink font-semibold file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-2 file:border-ink file:text-xs file:bg-brand file:text-ink file:font-black hover:file:bg-brand-hover cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-ink font-bold mb-1">Cell / Sample Metadata (Optional CSV)</label>
              <input
                type="file"
                accept=".csv,.tsv"
                onChange={e => setMetaFile(e.target.files?.[0] || null)}
                className="w-full text-ink font-semibold file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-2 file:border-ink file:text-xs file:bg-surface-raised file:text-ink file:font-bold hover:file:bg-surface-peach cursor-pointer"
              />
              <span className="text-[11px] text-ink-muted font-medium mt-0.5 block">Contains cell_id, cell_state, timepoint_hours, spatial_x, spatial_y, spatial_z</span>
            </div>

            <div>
              <label className="block text-ink font-bold mb-1">Matrix Orientation</label>
              <select
                value={forcedOrientation}
                onChange={e => setForcedOrientation(e.target.value)}
                className="w-full bg-surface-raised border-2 border-ink px-3 py-2 rounded-md text-ink font-bold focus:outline-none focus:ring-2 focus:ring-brand shadow-[1px_1px_0_#2B211B]"
              >
                <option value="auto">Auto-detect orientation (Recommended)</option>
                <option value="cells_by_genes">Cells as Rows, Genes as Columns</option>
                <option value="genes_by_cells">Genes as Rows, Cells as Columns</option>
              </select>
            </div>

            {uploadError && (
              <div className="p-3 rounded-md bg-danger-soft border-2 border-ink text-danger text-xs font-bold shadow-[2px_2px_0_#2B211B]">
                {uploadError}
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading || !exprFile}
              className="neo-primary w-full py-2.5 px-4 font-black flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isUploading ? <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5]" /> : <Upload className="w-4 h-4 stroke-[2.5]" />}
              <span>{isUploading ? 'Validating & Uploading...' : 'Validate & Upload Dataset'}</span>
            </button>
          </form>
        </div>

        {/* Dataset Provenance & Metadata Details */}
        <div className="neo-panel p-6 space-y-4">
          <div className="flex items-center space-x-2 text-ink font-black text-sm border-b-2 border-ink pb-3">
            <Database className="w-4 h-4 text-brand-strong stroke-[2.5]" />
            <span>Dataset Provenance & Quality Profile</span>
          </div>

          {dataset ? (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 text-ink">
                <div className="bg-surface-raised p-3 rounded-md border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                  <span className="text-ink-secondary text-[11px] uppercase font-mono font-bold block">Cells Count</span>
                  <span className="text-xl font-black text-ink font-mono">{dataset.n_cells.toLocaleString()}</span>
                </div>
                <div className="bg-surface-raised p-3 rounded-md border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                  <span className="text-ink-secondary text-[11px] uppercase font-mono font-bold block">Features / Genes</span>
                  <span className="text-xl font-black text-ink font-mono">{dataset.n_genes.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2 bg-surface-recessed p-3.5 rounded-md border-2 border-ink font-mono text-[11px] text-ink">
                <div>Dataset ID: <span className="font-bold text-brand-strong">{dataset.id}</span></div>
                <div>Data Origin: <span className="font-bold text-ink">{dataset.provenance?.source || 'Local Repository'}</span></div>
                <div>Classification: <span className={`font-black ${dataset.is_synthetic ? 'text-warning' : 'text-success'}`}>
                  {dataset.is_synthetic ? 'SYNTHETIC DEMO DATA' : 'EXPERIMENTAL DATA'}
                </span></div>
                <div>Annotation Provenance: <span className="font-bold text-ink">
                  {dataset.annotation_provenance || dataset.provenance?.annotation_provenance || (dataset.is_synthetic ? 'synthetic' : 'unknown')}
                </span></div>
                <div>Target Ground Truth: <span className={`font-black ${dataset.is_independent_ground_truth ? 'text-success' : 'text-warning'}`}>
                  {dataset.is_independent_ground_truth ? 'Independent Ground Truth' : 'Weak-Label / Heuristic (Not Independent)'}
                </span></div>
                <div>QC Scope: <span className="font-bold text-brand-strong">
                  {dataset.qc_summary?.is_whole_transcriptome || dataset.qc_scope === 'whole_transcriptome'
                    ? `Whole-Transcriptome Assay (${dataset.qc_summary?.total_genes_in_assay?.toLocaleString() || '32,738'} genes)`
                    : `Reduced Feature Panel (${dataset.n_genes} genes)`}
                </span></div>
                {dataset.qc_summary?.scope_note && (
                  <div className="text-[10px] text-ink-muted italic pt-1 border-t border-ink/30">
                    QC Note: {dataset.qc_summary.scope_note}
                  </div>
                )}
                <div>Orientation: <span className="font-bold text-ink">{dataset.orientation}</span></div>
              </div>

              {dataset.metadata_columns.length > 0 && (
                <div>
                  <div className="text-ink-secondary mb-1.5 font-bold">Joined Metadata Columns:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dataset.metadata_columns.map(col => (
                      <span key={col} className="bg-surface-raised border border-ink text-ink font-bold px-2 py-0.5 rounded text-[11px] font-mono shadow-[1px_1px_0_#2B211B]">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-ink-secondary py-8 text-center font-bold">
              No dataset currently active. Upload a dataset or load the synthetic demo.
            </div>
          )}
        </div>
      </div>

      {/* Preprocessing & QC Filtering Configuration */}
      <div className="neo-panel p-6 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center space-x-2 text-ink font-black text-sm">
            <Sliders className="w-4 h-4 text-brand stroke-[2.5]" />
            <span>Reproducible Preprocessing & QC Thresholds</span>
          </div>
          <span className="text-xs font-mono font-bold text-ink-secondary">Standard CPM + Log1p Pipeline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Filtering */}
          <div className="bg-surface-raised p-4 rounded-md border-2 border-ink shadow-[2px_2px_0_#2B211B] space-y-3">
            <div className="font-extrabold text-ink">1. Cell & Gene Filtering</div>
            <div>
              <label className="block text-ink-secondary font-bold mb-1">Min Genes per Cell: <span className="text-ink font-black">{minGenes}</span></label>
              <input
                type="range"
                min={1}
                max={50}
                value={minGenes}
                onChange={e => setMinGenes(Number(e.target.value))}
                className="w-full accent-brand cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-ink-secondary font-bold mb-1">Max Mito Ratio: <span className="text-ink font-black">{maxMito}%</span></label>
              <input
                type="range"
                min={5}
                max={50}
                value={maxMito}
                onChange={e => setMaxMito(Number(e.target.value))}
                className="w-full accent-brand cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-ink-secondary font-bold mb-1">Min Cells per Gene: <span className="text-ink font-black">{minCellsGene}</span></label>
              <input
                type="range"
                min={1}
                max={20}
                value={minCellsGene}
                onChange={e => setMinCellsGene(Number(e.target.value))}
                className="w-full accent-brand cursor-pointer"
              />
            </div>
          </div>

          {/* Normalization */}
          <div className="bg-surface-raised p-4 rounded-md border-2 border-ink shadow-[2px_2px_0_#2B211B] space-y-3">
            <div className="font-extrabold text-ink">2. Count Normalization</div>
            <div>
              <label className="block text-ink-secondary font-bold mb-1">Target Total Counts (CPM):</label>
              <input
                type="number"
                step={1000}
                value={targetSum}
                onChange={e => setTargetSum(Number(e.target.value))}
                className="w-full bg-surface border-2 border-ink px-2.5 py-1.5 rounded-md text-ink font-black shadow-[1px_1px_0_#2B211B]"
              />
            </div>
            <label className="flex items-center space-x-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={applyLog}
                onChange={e => setApplyLog(e.target.checked)}
                className="accent-brand w-4 h-4 rounded border-2 border-ink"
              />
              <span className="text-ink font-bold">Apply natural log(1 + x) scaling</span>
            </label>
          </div>

          {/* Feature Selection & Scaling */}
          <div className="bg-surface-raised p-4 rounded-md border-2 border-ink shadow-[2px_2px_0_#2B211B] space-y-3">
            <div className="font-extrabold text-ink">3. Feature Selection & Scaling</div>
            <div>
              <label className="block text-ink-secondary font-bold mb-1">Top Variable Genes: <span className="text-ink font-black">{nTopGenes}</span></label>
              <input
                type="range"
                min={50}
                max={2000}
                step={50}
                value={nTopGenes}
                onChange={e => setNTopGenes(Number(e.target.value))}
                className="w-full accent-brand cursor-pointer"
              />
            </div>
            <label className="flex items-center space-x-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={scaleData}
                onChange={e => setScaleData(e.target.checked)}
                className="accent-brand w-4 h-4 rounded border-2 border-ink"
              />
              <span className="text-ink font-bold">Z-score standardize features</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-ink-secondary font-semibold">
            Filtering eliminates damaged droplets, doublets, and uninformative features before ML training.
          </div>
          <button
            onClick={handleRunPreprocessing}
            disabled={prepLoading || !dataset}
            className="neo-primary flex items-center space-x-2 px-5 py-2.5 text-xs font-black disabled:opacity-50"
          >
            {prepLoading ? <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5]" /> : <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
            <span>{prepLoading ? 'Executing Preprocessing...' : 'Run QC & Preprocessing Pipeline'}</span>
          </button>
        </div>

        {prepResult && (
          <div className="p-4 rounded-md bg-success-soft border-2 border-ink text-ink text-xs space-y-1.5 shadow-[2px_2px_0_#2B211B]">
            <div className="font-black flex items-center space-x-1.5 text-success">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Preprocessing Run Successful ({prepResult.run_id})</span>
            </div>
            <div className="font-semibold text-ink-secondary">{prepResult.summary_text}</div>
            <div className="text-[11px] text-ink-muted font-mono font-bold">
              Retained: {prepResult.filtered_n_cells} cells / {prepResult.filtered_n_genes} genes | HVG: {prepResult.highly_variable_genes.slice(0, 10).join(', ')}...
            </div>
          </div>
        )}
      </div>

      {/* Raw Expression Matrix Sample Preview Table */}
      {preview && (
        <div className="neo-panel p-6 space-y-3">
          <div className="flex items-center justify-between border-b-2 border-ink pb-2">
            <div className="flex items-center space-x-2 text-ink font-black text-sm">
              <FileText className="w-4 h-4 text-brand stroke-[2.5]" />
              <span>Expression Matrix Sample Preview (Top 10 × 10)</span>
            </div>
            <span className="text-[11px] font-mono text-ink-secondary font-bold">
              Cell IDs (Rows) × Gene Symbols (Columns)
            </span>
          </div>

          <div className="overflow-x-auto border-2 border-ink rounded-lg shadow-neo-sm">
            <table className="w-full text-[11px] font-mono text-left">
              <thead className="bg-surface-recessed text-ink border-b-2 border-ink font-black">
                <tr>
                  <th className="py-2.5 px-3">cell_id</th>
                  {preview.gene_ids_sample.map(g => (
                    <th key={g} className="py-2.5 px-2.5">{g}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/20 bg-surface">
                {preview.cell_ids_sample.map((cellId, rowIdx) => (
                  <tr key={cellId} className="hover:bg-surface-peach transition">
                    <td className="py-2 px-3 font-bold text-ink">{cellId}</td>
                    {preview.preview_matrix[rowIdx]?.map((val, colIdx) => (
                      <td key={colIdx} className="py-2 px-2.5 text-ink-secondary font-medium">
                        {val.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
