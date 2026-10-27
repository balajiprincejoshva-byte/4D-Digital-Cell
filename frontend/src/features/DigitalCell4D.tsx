import React, { useState, useEffect } from 'react';
import { DatasetInfo, CellSceneData, SceneParticle, PerturbationResult } from '../types';
import { api } from '../lib/api';
import { ThreeDCellViewer } from '../components/ThreeDCellViewer';
import {
  Layers,
  Dna,
  Zap,
  Info,
  Sparkles,
  RefreshCw,
  Search,
  Eye,
  ShieldAlert
} from 'lucide-react';

interface DigitalCell4DProps {
  dataset: DatasetInfo | null;
  activeGene: string;
  onActiveGeneChange: (gene: string) => void;
  activePerturbation: PerturbationResult | null;
}

export const DigitalCell4D: React.FC<DigitalCell4DProps> = ({
  dataset,
  activeGene,
  onActiveGeneChange,
  activePerturbation
}) => {
  const [sceneData, setSceneData] = useState<CellSceneData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [overlayMode, setOverlayMode] = useState<'cell_state' | 'gene_expression' | 'perturbation'>('cell_state');
  const [selectedParticle, setSelectedParticle] = useState<SceneParticle | null>(null);
  const [geneInput, setGeneInput] = useState(activeGene || 'OCT4');

  const fetchScene = async (gene?: string) => {
    if (!dataset) return;
    setIsLoading(true);
    try {
      const pertPayload = activePerturbation ? {
        cell_deltas: activePerturbation.cell_deltas_sample
      } : undefined;

      const data = await api.getScene(dataset.id, gene || activeGene, pertPayload);
      setSceneData(data);
    } catch (err: any) {
      console.error("Failed to load 3D scene data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (dataset) {
      fetchScene(activeGene);
    }
  }, [dataset?.id, activePerturbation?.run_id]);

  const handleApplyGene = (gene: string) => {
    const trimmed = gene.trim().toUpperCase();
    if (!trimmed) return;
    onActiveGeneChange(trimmed);
    setOverlayMode('gene_expression');
    fetchScene(trimmed);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* View Header & Mode Controls */}
      <div className="neo-panel p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand text-ink rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
            <Layers className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-ink flex items-center gap-2">
              4D Interactive Digital Cell
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-surface-recessed text-brand-strong border border-ink shadow-[1px_1px_0_#2B211B]">
                Spatio-Temporal Viewport
              </span>
            </h2>
            <p className="text-xs font-semibold text-ink-secondary">
              Interactive 3D cellular compartments, temporal state trajectories, and expression overlays
            </p>
          </div>
        </div>

        {/* Overlay Mode Switcher & Gene Selector */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Overlay Selector */}
          <div className="flex items-center space-x-1.5 bg-surface-recessed border-2 border-ink p-1 rounded-md shadow-[1px_1px_0_#2B211B]">
            <button
              onClick={() => setOverlayMode('cell_state')}
              className={`px-3 py-1 rounded font-bold transition border ${
                overlayMode === 'cell_state' ? 'bg-brand text-ink border-ink shadow-[1px_1px_0_#2B211B] font-black' : 'bg-surface text-ink border-transparent hover:bg-surface-peach'
              }`}
            >
              Cell State
            </button>
            <button
              onClick={() => setOverlayMode('gene_expression')}
              className={`px-3 py-1 rounded font-bold transition border ${
                overlayMode === 'gene_expression' ? 'bg-brand text-ink border-ink shadow-[1px_1px_0_#2B211B] font-black' : 'bg-surface text-ink border-transparent hover:bg-surface-peach'
              }`}
            >
              Gene Expression
            </button>
            <button
              onClick={() => setOverlayMode('perturbation')}
              className={`px-3 py-1 rounded font-bold transition border ${
                overlayMode === 'perturbation' ? 'bg-[#C026D3] text-white border-ink shadow-[1px_1px_0_#2B211B] font-black' : 'bg-surface text-ink border-transparent hover:bg-surface-peach'
              }`}
            >
              Perturbation Shift
            </button>
          </div>

          {/* Gene search input for expression overlay */}
          <div className="flex items-center space-x-1.5 bg-surface-raised border-2 border-ink px-2.5 py-1 rounded-md shadow-[1px_1px_0_#2B211B]">
            <Dna className="w-3.5 h-3.5 text-brand stroke-[2.5]" />
            <input
              type="text"
              placeholder="Search Gene..."
              value={geneInput}
              onChange={e => setGeneInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleApplyGene(geneInput)}
              className="w-24 bg-transparent text-ink text-xs font-mono font-bold uppercase focus:outline-none"
            />
            <button
              onClick={() => handleApplyGene(geneInput)}
              className="text-brand-strong hover:text-brand font-black text-[11px] underline"
            >
              Apply
            </button>
          </div>

          <button
            onClick={() => fetchScene()}
            disabled={isLoading}
            className="p-2 bg-surface-raised hover:bg-surface-peach text-ink rounded-md border-2 border-ink transition shadow-[2px_2px_0_#2B211B] font-bold"
            title="Reload Scene"
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isLoading ? 'animate-spin text-brand' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main 3D Viewport */}
      <ThreeDCellViewer
        sceneData={sceneData}
        activeGene={activeGene}
        overlayMode={overlayMode}
        onSelectParticle={p => setSelectedParticle(p)}
        selectedParticle={selectedParticle}
      />

      {/* Selected Cell Inspector */}
      {selectedParticle && (
        <div className="neo-panel p-4 flex flex-wrap items-center justify-between gap-4 bg-highlight-cream border-2 border-ink shadow-neo-md text-ink">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-surface-raised text-ink border-2 border-ink shadow-[2px_2px_0_#2B211B]">
              <Eye className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-black text-ink flex items-center gap-2">
                Cell Particle Inspector: <span className="text-brand-strong font-mono">{selectedParticle.cell_id}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-raised border border-ink text-ink font-bold shadow-[1px_1px_0_#2B211B]">
                  State: {selectedParticle.cell_state}
                </span>
              </div>
              <div className="text-[11px] text-ink-secondary font-mono font-bold mt-0.5">
                3D Position: ({selectedParticle.x.toFixed(2)}, {selectedParticle.y.toFixed(2)}, {selectedParticle.z.toFixed(2)}) &bull; Timepoint: {selectedParticle.timepoint.toFixed(1)}h
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div>
              <span className="text-ink-secondary text-[10px] block uppercase font-bold">Gene Expr ({activeGene || 'OCT4'})</span>
              <span className="text-brand-strong font-black">{selectedParticle.active_gene_expr?.toFixed(3) ?? '0.000'}</span>
            </div>
            {selectedParticle.state_changed_by_perturbation && (
              <div className="bg-[#C026D3]/20 border-2 border-[#C026D3] px-2.5 py-1 rounded-md text-[#A21CAF] font-black text-[11px] shadow-[1px_1px_0_#2B211B]">
                Perturbation Transition: &rarr; {selectedParticle.perturbed_state}
              </div>
            )}
            <button
              onClick={() => setSelectedParticle(null)}
              className="text-[11px] text-ink font-bold hover:bg-surface-peach px-2.5 py-1 rounded bg-surface-raised border-2 border-ink shadow-[1px_1px_0_#2B211B]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Subcellular Geometry & Limitations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Card 1: Subcellular Architecture */}
        <div className="neo-panel p-4 space-y-2">
          <div className="font-extrabold text-ink flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand border border-ink" />
            <span>Biological 3D Cell Models</span>
          </div>
          <p className="text-ink-secondary leading-relaxed text-[11px] font-medium">
            Toggle between authentic cellular morphologies: <strong>Lymphocyte (PBMC)</strong> with dense nucleus & surface microvilli, 
            <strong>Eukaryotic Atlas</strong> with full organelle suite, <strong>Macrophage</strong> with amoeboid pseudopodia, 
            or <strong>3D Manifold</strong> to view population embeddings in open coordinate space.
          </p>
        </div>

        {/* Card 2: Interactive Cross-Section & Organelles */}
        <div className="neo-panel p-4 space-y-2">
          <div className="font-extrabold text-ink flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-deep border border-ink" />
            <span>Interactive Cutaway & Organelles</span>
          </div>
          <p className="text-ink-secondary leading-relaxed text-[11px] font-medium">
            Use the <strong>3/4 Cutaway</strong> or <strong>Hemisection</strong> controls to inspect internal compartments: 
            Mitochondria, Endoplasmic Reticulum, Golgi complex, and Nucleus. Click any organelle in the 3D scene to inspect its volume fraction, marker genes, and biological function.
          </p>
        </div>

        {/* Card 3: Temporal Dimension */}
        <div className="neo-panel p-4 space-y-2">
          <div className="font-extrabold text-ink flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full border border-ink ${sceneData?.is_longitudinal ? 'bg-success' : 'bg-warning'}`} />
            <span>{sceneData?.is_longitudinal ? '4D Longitudinal Trajectory' : 'Cross-Sectional Snapshot'}</span>
          </div>
          <p className="text-ink-secondary leading-relaxed text-[11px] font-medium">
            {sceneData?.is_longitudinal
              ? `Dataset contains ${sceneData.available_timepoints.length} observed longitudinal timepoints (${sceneData.available_timepoints.join(', ')}h).`
              : 'Dataset contains cross-sectional snapshot observations. No longitudinal progression is present; all cells represent a single observation point.'}
          </p>
        </div>
      </div>

      {/* Scientific Integrity Disclaimer */}
      {sceneData?.caveat && (
        <div className="p-3.5 rounded-xl bg-surface-recessed border-2 border-ink text-ink text-xs flex items-start space-x-2.5 shadow-neo-sm">
          <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5 stroke-[2.5]" />
          <p className="leading-relaxed font-mono text-[11px] font-bold">
            {sceneData.caveat}
          </p>
        </div>
      )}
    </div>
  );
};
