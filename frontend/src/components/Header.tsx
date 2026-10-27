import React from 'react';
import { DatasetInfo } from '../types';
import { Dna, Database, AlertTriangle, ShieldCheck, RefreshCw, Sparkles, Tv, Volume2, VolumeX } from 'lucide-react';

interface HeaderProps {
  datasets: DatasetInfo[];
  selectedDataset: DatasetInfo | null;
  onSelectDataset: (dataset: DatasetInfo) => void;
  onLoadDemo: () => void;
  onLoadRealData?: () => void;
  isPresentationActive?: boolean;
  onTogglePresentation?: () => void;
  isSoundMuted?: boolean;
  onToggleSound?: () => void;
  isLoading: boolean;
  backendHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  onLoadDemo,
  onLoadRealData,
  isPresentationActive = false,
  onTogglePresentation,
  isSoundMuted = false,
  onToggleSound,
  isLoading,
  backendHealthy
}) => {
  return (
    <header className="bg-surface-raised border-b-2 border-ink px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50 shadow-neo-sm">
      {/* Branding */}
      <div className="flex items-center space-x-3.5">
        <div className="w-10 h-10 rounded-md bg-brand-orange border-2 border-ink shadow-neo-sm flex items-center justify-center shrink-0">
          <Dna className="w-6 h-6 text-ink" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-black tracking-tight text-ink flex items-center gap-2">
              AI-DRIVEN 4D DIGITAL CELL
              <span className="text-[10px] font-mono uppercase bg-surface-peach text-ink border-2 border-ink px-2 py-0.5 rounded shadow-[1.5px_1.5px_0_#2B211B] font-bold tracking-wider">
                Research Workstation
              </span>
            </h1>
          </div>
          <p className="text-xs text-ink-secondary font-medium">
            Multiscale Genome-to-Phenotype Simulation & In-Silico Genetic Perturbation
          </p>
        </div>
      </div>

      {/* Dataset Selection & Quick Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Backend health status indicator */}
        <div className="flex items-center space-x-2 text-xs px-2.5 py-1.5 rounded-md bg-surface-recessed border-2 border-ink shadow-neo-sm">
          <div
            className={`w-2.5 h-2.5 rounded-full border border-ink ${
              backendHealthy ? 'bg-semantic-success' : 'bg-highlight-yellow'
            }`}
          />
          <span className="text-ink font-mono text-[11px] font-bold">
            {backendHealthy ? 'API ONLINE' : 'STANDALONE'}
          </span>
        </div>

        {/* Dataset selector */}
        <div className="flex items-center space-x-2 bg-surface border-2 border-ink px-3 py-1.5 rounded-md shadow-neo-sm">
          <Database className="w-4 h-4 text-brand-strong shrink-0" />
          <label htmlFor="active-dataset-select" className="sr-only">Active Biological Dataset</label>
          <select
            id="active-dataset-select"
            aria-label="Active Biological Dataset"
            value={selectedDataset?.id || ''}
            onChange={(e) => {
              const found = datasets.find(d => d.id === e.target.value);
              if (found) onSelectDataset(found);
            }}
            className="bg-transparent text-xs text-ink font-bold focus:outline-none cursor-pointer max-w-[210px] truncate"
          >
            {datasets.length === 0 && <option value="">No Datasets Loaded</option>}
            {datasets.map(d => (
              <option key={d.id} value={d.id} className="bg-surface text-ink font-medium">
                {d.name} ({d.n_cells} cells)
              </option>
            ))}
          </select>
        </div>

        {/* Real Data Button */}
        {onLoadRealData && (
          <button
            onClick={onLoadRealData}
            disabled={isLoading}
            className="neo-primary flex items-center space-x-1.5 text-xs px-3 py-1.5"
            title="Load 10x Genomics PBMC 3k Real scRNA-seq Benchmark"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-ink" />
            <span>Load Real PBMC</span>
          </button>
        )}

        {/* Synthetic Demo Button */}
        <button
          onClick={onLoadDemo}
          disabled={isLoading}
          className="neo-secondary flex items-center space-x-1.5 text-xs px-3 py-1.5"
        >
          {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-ink" /> : <Sparkles className="w-3.5 h-3.5 text-brand-strong" />}
          <span>Synthetic Demo</span>
        </button>

        {/* Sound FX Toggle Button */}
        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-md border-2 border-ink transition shadow-[1.5px_1.5px_0_#2B211B] ${
              isSoundMuted ? 'bg-surface-recessed text-ink-muted' : 'bg-surface-raised text-ink hover:bg-surface-peach'
            }`}
            title={isSoundMuted ? 'Sound Effects Muted (Click to Unmute)' : 'Sound Effects Active (Click to Mute)'}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-ink-muted" /> : <Volume2 className="w-4 h-4 text-brand-strong stroke-[2.5]" />}
          </button>
        )}

        {/* Presentation Mode Toggle Button (ON / OFF) */}
        {onTogglePresentation && (
          <button
            onClick={onTogglePresentation}
            className={`flex items-center space-x-2 text-xs px-3.5 py-1.5 rounded-md border-2 border-ink transition-all font-black ${
              isPresentationActive
                ? 'bg-brand text-ink shadow-[3px_3px_0_#2B211B] ring-2 ring-brand-deep -translate-y-0.5'
                : 'bg-surface text-ink hover:bg-surface-peach shadow-neo-sm'
            }`}
            title={isPresentationActive ? 'Exit Presentation Mode (Press P or Esc)' : 'Enter Integrated Fullscreen Presentation Mode (Press P)'}
          >
            <Tv className={`w-3.5 h-3.5 stroke-[2.5] ${isPresentationActive ? 'text-ink animate-bounce' : 'text-brand-strong'}`} />
            <span>Presentation Mode</span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border border-ink font-black ${
                isPresentationActive ? 'bg-ink text-surface-raised' : 'bg-surface-recessed text-ink-secondary'
              }`}
            >
              {isPresentationActive ? 'ON' : 'OFF'}
            </span>
          </button>
        )}

        {/* Status Badge: Synthetic vs Real */}
        {selectedDataset && (
          selectedDataset.is_synthetic ? (
            <div className="flex items-center space-x-1.5 text-xs bg-highlight-yellow text-ink border-2 border-ink px-2.5 py-1.5 rounded-md font-mono text-[11px] font-extrabold shadow-[2px_2px_0_#2B211B]">
              <AlertTriangle className="w-3.5 h-3.5 text-ink shrink-0" />
              <span>SYNTHETIC DEMO</span>
            </div>
          ) : (
            <div
              className="flex items-center space-x-1.5 text-xs bg-semantic-success-soft text-semantic-success border-2 border-ink px-2.5 py-1.5 rounded-md font-mono text-[11px] font-extrabold shadow-[2px_2px_0_#2B211B]"
              title={selectedDataset.provenance?.citation || 'Experimental Biological scRNA-seq'}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-semantic-success shrink-0" />
              <span>REAL DATA (10x PBMC)</span>
            </div>
          )
        )}
      </div>
    </header>
  );
};
