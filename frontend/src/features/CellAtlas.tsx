import React, { useState, useEffect } from 'react';
import { DatasetInfo, EmbeddingResult, EmbeddingPoint, ClusterAnalysisResult, GeneExpressionLookup, MarkerGene } from '../types';
import { api } from '../lib/api';
import { ScatterPlot } from '../components/ScatterPlot';
import {
  Compass,
  Search,
  Sliders,
  RefreshCw,
  Layers,
  Sparkles,
  Info,
  Dna,
  Filter,
  CheckCircle2
} from 'lucide-react';

interface CellAtlasProps {
  dataset: DatasetInfo | null;
  activeGene: string;
  onActiveGeneChange: (gene: string) => void;
}

export const CellAtlas: React.FC<CellAtlasProps> = ({
  dataset,
  activeGene,
  onActiveGeneChange
}) => {
  const [embeddingMethod, setEmbeddingMethod] = useState<'PCA' | 'UMAP'>('PCA');
  const [embeddingData, setEmbeddingData] = useState<EmbeddingResult | null>(null);
  const [clusterData, setClusterData] = useState<ClusterAnalysisResult | null>(null);
  const [geneLookup, setGeneLookup] = useState<GeneExpressionLookup | null>(null);
  const [isLoadingEmbeddings, setIsLoadingEmbeddings] = useState(false);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);
  const [colorBy, setColorBy] = useState<'cell_type' | 'cluster' | 'timepoint' | 'expression'>('cell_type');
  const [nClusters, setNClusters] = useState(4);
  const [selectedCell, setSelectedCell] = useState<EmbeddingPoint | null>(null);
  const [geneSearchInput, setGeneSearchInput] = useState(activeGene || 'OCT4');

  // Load embeddings
  const fetchEmbeddings = async (method: 'PCA' | 'UMAP') => {
    if (!dataset) return;
    setIsLoadingEmbeddings(true);
    try {
      const res = await api.getEmbeddings(dataset.id, method, 3);
      setEmbeddingData(res);
    } catch (err: any) {
      console.error("Embedding calculation failed:", err);
    } finally {
      setIsLoadingEmbeddings(false);
    }
  };

  // Run clustering
  const fetchClusters = async (k: number) => {
    if (!dataset) return;
    setIsLoadingClusters(true);
    try {
      const res = await api.getClusters(dataset.id, k);
      setClusterData(res);
      // Re-map cluster labels onto embedding points if loaded
      if (embeddingData) {
        const updatedPoints = embeddingData.points.map(p => ({
          ...p,
          cluster: res.cluster_labels[p.cell_id] || p.cluster
        }));
        setEmbeddingData({ ...embeddingData, points: updatedPoints, clusters: Object.keys(res.cluster_sizes) });
      }
    } catch (err: any) {
      console.error("Clustering failed:", err);
    } finally {
      setIsLoadingClusters(false);
    }
  };

  // Search gene expression
  const handleSearchGene = async (symbol: string) => {
    if (!dataset || !symbol.trim()) return;
    try {
      const res = await api.lookupGene(dataset.id, symbol.trim());
      setGeneLookup(res);
      onActiveGeneChange(symbol.trim());
      if (res.found && embeddingData) {
        // Map expression values onto points for expression gradient visualization
        const maxExp = res.max_expression || 1.0;
        const updated = embeddingData.points.map(p => ({
          ...p,
          expression_val: (res.expression_per_cell[p.cell_id] || 0) / maxExp
        }));
        setEmbeddingData({ ...embeddingData, points: updated });
        setColorBy('expression');
      }
    } catch (err: any) {
      console.error("Gene lookup failed:", err);
    }
  };

  useEffect(() => {
    if (dataset) {
      fetchEmbeddings(embeddingMethod);
      fetchClusters(nClusters);
      handleSearchGene(geneSearchInput);
    }
  }, [dataset?.id]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Controls Bar */}
      <div className="neo-panel p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand text-ink rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
            <Compass className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-ink">Exploratory Single-Cell Atlas</h2>
            <p className="text-xs font-semibold text-ink-secondary">High-dimensional manifold projection, clusters, and gene expression distributions</p>
          </div>
        </div>

        {/* Method & Color Selectors */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Embedding Method */}
          <div className="flex items-center space-x-1.5 bg-surface-recessed border-2 border-ink p-1 rounded-md shadow-[1px_1px_0_#2B211B]">
            <button
              onClick={() => { setEmbeddingMethod('PCA'); fetchEmbeddings('PCA'); }}
              className={`px-3 py-1 rounded font-mono font-black transition border ${
                embeddingMethod === 'PCA' ? 'bg-brand text-ink border-ink shadow-[1px_1px_0_#2B211B]' : 'bg-surface text-ink border-transparent hover:bg-surface-peach'
              }`}
            >
              PCA
            </button>
            <button
              onClick={() => { setEmbeddingMethod('UMAP'); fetchEmbeddings('UMAP'); }}
              className={`px-3 py-1 rounded font-mono font-black transition border ${
                embeddingMethod === 'UMAP' ? 'bg-brand text-ink border-ink shadow-[1px_1px_0_#2B211B]' : 'bg-surface text-ink border-transparent hover:bg-surface-peach'
              }`}
            >
              UMAP
            </button>
          </div>

          {/* Color By */}
          <div className="flex items-center space-x-2 bg-surface-raised border-2 border-ink px-3 py-1 rounded-md shadow-[1px_1px_0_#2B211B]">
            <span className="text-ink-secondary font-bold">Color:</span>
            <select
              value={colorBy}
              onChange={e => setColorBy(e.target.value as any)}
              className="bg-transparent text-ink focus:outline-none cursor-pointer font-black"
            >
              <option value="cell_type" className="bg-surface">Cell State / Type</option>
              <option value="cluster" className="bg-surface">K-Means Cluster</option>
              <option value="timepoint" className="bg-surface">Timepoint</option>
              <option value="expression" className="bg-surface">{activeGene || 'Gene'} Expression</option>
            </select>
          </div>

          <button
            onClick={() => fetchEmbeddings(embeddingMethod)}
            disabled={isLoadingEmbeddings}
            className="p-2 bg-surface-raised hover:bg-surface-peach text-ink rounded-md border-2 border-ink transition shadow-[2px_2px_0_#2B211B] font-bold"
            title="Recalculate Embeddings"
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isLoadingEmbeddings ? 'animate-spin text-brand' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Scatter Plot + Gene Search & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scatter Plot (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <ScatterPlot
            points={embeddingData?.points || []}
            colorBy={colorBy}
            activeGeneSymbol={activeGene}
            onSelectCell={p => setSelectedCell(p)}
            selectedCellId={selectedCell?.cell_id}
          />

          {embeddingData?.notes && (
            <div className="text-[11px] font-mono text-ink bg-surface-recessed p-2.5 rounded-md border-2 border-ink flex items-center space-x-2 font-bold shadow-[1px_1px_0_#2B211B]">
              <Info className="w-4 h-4 text-brand-strong shrink-0 stroke-[2.5]" />
              <span>{embeddingData.notes}</span>
            </div>
          )}
        </div>

        {/* Right Panel: Gene Search & Cell Inspector */}
        <div className="space-y-4">
          {/* Gene Search Card */}
          <div className="neo-panel p-5 space-y-3">
            <div className="flex items-center space-x-2 text-ink font-black text-xs border-b-2 border-ink pb-2">
              <Dna className="w-4 h-4 text-brand stroke-[2.5]" />
              <span>Gene Expression Lookup</span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="e.g., OCT4, MYOD1, TUBB3"
                value={geneSearchInput}
                onChange={e => setGeneSearchInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleSearchGene(geneSearchInput)}
                className="w-full bg-surface-raised border-2 border-ink px-3 py-1.5 rounded-md text-ink text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand uppercase shadow-[1px_1px_0_#2B211B]"
              />
              <button
                onClick={() => handleSearchGene(geneSearchInput)}
                className="neo-primary px-3 py-1.5 text-xs font-black"
              >
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            {geneLookup && geneLookup.found ? (
              <div className="space-y-2 text-xs bg-surface-recessed p-3 rounded-md border-2 border-ink text-ink">
                <div className="font-black text-brand-strong font-mono flex items-center justify-between">
                  <span>{geneLookup.gene}</span>
                  <span className="text-[10px] text-ink-secondary font-bold">{geneLookup.percent_expressing}% expressing</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-ink font-bold">
                  <div>Mean Expr: <span className="font-mono text-ink font-black">{geneLookup.mean_expression}</span></div>
                  <div>Max Expr: <span className="font-mono text-ink font-black">{geneLookup.max_expression}</span></div>
                </div>

                {/* State breakdown */}
                {Object.keys(geneLookup.expression_by_cell_type).length > 0 && (
                  <div className="pt-2 border-t border-ink/30 space-y-1">
                    <span className="text-[10px] text-ink-secondary uppercase font-mono font-extrabold">Mean By Cell State:</span>
                    {Object.entries(geneLookup.expression_by_cell_type).map(([st, val]) => (
                      <div key={st} className="flex justify-between text-[11px]">
                        <span className="text-ink font-bold">{st}</span>
                        <span className="font-mono text-brand font-black">{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : geneLookup && !geneLookup.found ? (
              <div className="p-2.5 rounded-md bg-surface-recessed text-ink-secondary text-xs text-center font-mono font-bold border border-ink">
                Gene '{geneSearchInput}' not detected in active dataset.
              </div>
            ) : null}
          </div>

          {/* Cell Inspector Drawer */}
          <div className="neo-panel p-5 space-y-2.5">
            <div className="flex items-center space-x-2 text-ink font-black text-xs border-b-2 border-ink pb-2">
              <Info className="w-4 h-4 text-brand-strong stroke-[2.5]" />
              <span>Selected Cell Profile</span>
            </div>

            {selectedCell ? (
              <div className="space-y-1.5 text-xs font-mono bg-surface-recessed p-3 rounded-md border-2 border-ink text-ink font-bold">
                <div className="text-brand-strong font-black">{selectedCell.cell_id}</div>
                <div>Cell State: <span className="text-ink">{selectedCell.cell_type || 'N/A'}</span></div>
                <div>Cluster: <span className="text-ink">{selectedCell.cluster || 'N/A'}</span></div>
                {selectedCell.timepoint !== undefined && (
                  <div>Timepoint: <span className="text-ink">{selectedCell.timepoint}h</span></div>
                )}
                <div>Coordinates: <span className="text-ink-secondary">({selectedCell.x}, {selectedCell.y}, {selectedCell.z})</span></div>
              </div>
            ) : (
              <div className="text-xs text-ink-secondary py-4 text-center font-bold">
                Click any cell in the scatter plot to inspect its single-cell profile.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cluster Analysis & Candidate Markers Table */}
      <div className="neo-panel p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
          <div className="flex items-center space-x-2 text-ink font-black text-sm">
            <Layers className="w-4 h-4 text-brand stroke-[2.5]" />
            <span>Unsupervised K-Means Clusters & Differential Marker Genes</span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-ink-secondary font-bold">Number of clusters (k):</span>
            <input
              type="number"
              min={2}
              max={8}
              value={nClusters}
              onChange={e => setNClusters(Number(e.target.value))}
              className="w-14 bg-surface-raised border-2 border-ink px-2 py-1 rounded-md text-ink text-center font-mono font-black shadow-[1px_1px_0_#2B211B]"
            />
            <button
              onClick={() => fetchClusters(nClusters)}
              disabled={isLoadingClusters}
              className="neo-primary px-3 py-1 font-black text-xs disabled:opacity-50"
            >
              {isLoadingClusters ? 'Clustering...' : 'Recluster'}
            </button>
          </div>
        </div>

        {clusterData?.notes && (
          <div className="text-[11px] text-ink bg-highlight-cream p-3 rounded-md border-2 border-ink font-mono font-bold shadow-[1px_1px_0_#2B211B]">
            <strong>Methodological Note:</strong> {clusterData.notes}
          </div>
        )}

        {clusterData && clusterData.top_markers.length > 0 && (
          <div className="overflow-x-auto border-2 border-ink rounded-lg shadow-neo-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-recessed text-ink font-mono font-black text-[11px] border-b-2 border-ink">
                <tr>
                  <th className="py-2.5 px-3">Cluster</th>
                  <th className="py-2.5 px-3">Marker Gene</th>
                  <th className="py-2.5 px-3">Mean In Cluster</th>
                  <th className="py-2.5 px-3">Mean Out Cluster</th>
                  <th className="py-2.5 px-3">Log2 Fold Change</th>
                  <th className="py-2.5 px-3">Marker Score</th>
                  <th className="py-2.5 px-3">p-value</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/20 font-mono text-[11px] bg-surface text-ink">
                {clusterData.top_markers.map((m, idx) => (
                  <tr key={`${m.cluster}_${m.gene}_${idx}`} className="hover:bg-surface-peach transition">
                    <td className="py-2 px-3 text-brand-strong font-black">{m.cluster}</td>
                    <td className="py-2 px-3 text-ink font-black">{m.gene}</td>
                    <td className="py-2 px-3 text-ink-secondary font-bold">{m.mean_in_cluster}</td>
                    <td className="py-2 px-3 text-ink-muted">{m.mean_outside_cluster}</td>
                    <td className={`py-2 px-3 font-extrabold ${m.log2_fold_change > 0 ? 'text-success' : 'text-danger'}`}>
                      {m.log2_fold_change > 0 ? `+${m.log2_fold_change}` : m.log2_fold_change}
                    </td>
                    <td className="py-2 px-3 text-ink font-bold">{m.score}</td>
                    <td className="py-2 px-3 text-ink-secondary">{m.p_value < 1e-4 ? m.p_value.toExponential(2) : m.p_value.toFixed(4)}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => { setGeneSearchInput(m.gene); handleSearchGene(m.gene); }}
                        className="text-[11px] text-brand-strong hover:text-brand font-black underline"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
