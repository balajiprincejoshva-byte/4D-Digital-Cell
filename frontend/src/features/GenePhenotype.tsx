import React, { useState, useEffect } from 'react';
import { DatasetInfo, TrainedModelInfo, PerturbationResult, CorrelationItem } from '../types';
import { api } from '../lib/api';
import {
  Network,
  Search,
  Dna,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
  Sparkles,
  BarChart2,
  Loader2
} from 'lucide-react';
import { NavTab } from '../components/Navigation';

interface GenePhenotypeProps {
  dataset: DatasetInfo | null;
  selectedModel: TrainedModelInfo | null;
  activePerturbation: PerturbationResult | null;
  activeGene: string;
  onSelectGene: (gene: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const GenePhenotype: React.FC<GenePhenotypeProps> = ({
  dataset,
  selectedModel,
  activePerturbation,
  activeGene,
  onSelectGene,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [correlations, setCorrelations] = useState<CorrelationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [targetColumnUsed, setTargetColumnUsed] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) return;
    setIsLoading(true);
    setLoadError(null);
    api.getCorrelations(dataset.id, selectedModel?.target_column)
      .then((res) => {
        setCorrelations(res.correlations);
        setTargetColumnUsed(res.target_column);
      })
      .catch((err) => {
        console.warn("Could not load dynamic correlations:", err);
        setLoadError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [dataset?.id, selectedModel?.target_column]);

  const filteredGenes = correlations.filter(g =>
    g.gene.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.phenotype.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="neo-panel p-5 space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand text-ink rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
            <Network className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-ink flex items-center gap-2">
              Gene-to-Phenotype Multi-Scale Association Explorer
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-surface-recessed text-brand-strong border border-ink shadow-[1px_1px_0_#2B211B]">
                Evidence Synthesis
              </span>
            </h2>
            <p className="text-xs font-semibold text-ink-secondary">
              Integrate measured transcriptomic abundance, predictive feature importances, and counterfactual perturbation shifts
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Scale Relationship Diagram / Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="neo-panel p-4 space-y-1.5">
          <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">Active Feature</span>
          <span className="text-xl font-black text-brand font-mono">{activeGene || 'None'}</span>
          <span className="text-[11px] text-ink-secondary block font-semibold">Selected across workstation</span>
        </div>

        <div className="neo-panel p-4 space-y-1.5">
          <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">Predictive Importance</span>
          <span className="text-xl font-black text-ink font-mono">
            {selectedModel?.top_features.find(f => f.feature.toUpperCase() === activeGene.toUpperCase())?.importance.toFixed(3) || 'Unranked'}
          </span>
          <span className="text-[11px] text-ink-secondary block font-semibold">Model: {selectedModel?.model_type || 'No Model'}</span>
        </div>

        <div className="neo-panel p-4 space-y-1.5">
          <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">In-Silico Perturbation Shift</span>
          <span className="text-xl font-black text-brand-strong font-mono">
            {activePerturbation && activePerturbation.gene_name.toUpperCase() === activeGene.toUpperCase()
              ? `${activePerturbation.transition_percentage}% Shift`
              : 'Not Perturbed'}
          </span>
          <span className="text-[11px] text-ink-secondary block font-semibold">Simulated state transition</span>
        </div>

        <div className="neo-panel p-4 space-y-1.5">
          <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">Dataset Classification</span>
          <span className={`text-xl font-black font-mono ${dataset?.is_synthetic ? 'text-warning' : 'text-success'}`}>
            {dataset?.is_synthetic ? 'SYNTHETIC' : 'EXPERIMENTAL'}
          </span>
          <span className="text-[11px] text-ink-secondary block font-semibold">Provenance verified</span>
        </div>
      </div>

      {/* Gene-to-Phenotype Evidence Table */}
      <div className="neo-panel p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
          <div className="flex items-center space-x-2 text-ink font-black text-sm">
            <Dna className="w-4 h-4 text-brand stroke-[2.5]" />
            <span>Gene-to-Phenotype Multi-Scale Associations</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2 stroke-[2.5]" />
              <input
                type="text"
                placeholder="Filter genes or phenotypes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-surface-raised border-2 border-ink pl-8 pr-3 py-1.5 rounded-md text-ink text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand w-60 shadow-[1px_1px_0_#2B211B]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border-2 border-ink rounded-lg shadow-neo-sm">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3 text-ink-secondary">
              <Loader2 className="w-6 h-6 animate-spin text-brand stroke-[2.5]" />
              <span className="text-xs font-mono font-bold">Computing dataset-wide Pearson correlations & FDR q-values...</span>
            </div>
          ) : loadError ? (
            <div className="p-8 text-center text-xs text-danger font-mono font-bold">
              Unable to compute correlations: {loadError}
            </div>
          ) : filteredGenes.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-secondary font-mono font-bold">
              No matching genes found in active dataset ({targetColumnUsed ? `correlated with ${targetColumnUsed}` : 'no target'}).
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-recessed text-ink font-mono font-black text-[11px] border-b-2 border-ink">
                <tr>
                  <th className="py-2.5 px-3">Gene Symbol</th>
                  <th className="py-2.5 px-3">Molecular Category</th>
                  <th className="py-2.5 px-3">Associated Cellular Phenotype</th>
                  <th className="py-2.5 px-3">Correlation (r)</th>
                  <th className="py-2.5 px-3">FDR / Significance</th>
                  <th className="py-2.5 px-3">Evidence Category</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/20 font-mono text-[11px] bg-surface text-ink">
                {filteredGenes.map((item) => (
                  <tr key={item.gene} className={`hover:bg-surface-peach transition ${activeGene.toUpperCase() === item.gene.toUpperCase() ? 'bg-surface-orange-wash' : ''}`}>
                    <td className="py-2 px-3 font-black text-brand-strong">{item.gene}</td>
                    <td className="py-2 px-3 text-ink font-sans font-semibold">{item.category}</td>
                    <td className="py-2 px-3 text-ink font-sans font-bold">{item.phenotype}</td>
                    <td className={`py-2 px-3 font-black ${item.correlation > 0 ? 'text-success' : 'text-warning'}`}>
                      {item.correlation > 0 ? `+${item.correlation.toFixed(3)}` : item.correlation.toFixed(3)}
                    </td>
                    <td className="py-2 px-3 text-ink-secondary">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border border-ink shadow-[1px_1px_0_#2B211B] ${item.fdr < 0.05 ? 'bg-highlight-yellow text-ink' : 'bg-surface-raised text-ink-muted'}`}>
                          {item.significance_label}
                        </span>
                        <span className="text-[10px] text-ink-muted font-bold">
                          (q={item.fdr < 0.001 ? item.fdr.toExponential(1) : item.fdr.toFixed(3)})
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black border border-ink shadow-[1px_1px_0_#2B211B] bg-surface-raised text-ink">
                        {dataset?.is_synthetic ? 'Synthetic Demo' : item.evidence_label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => { onSelectGene(item.gene); onNavigate('digital-cell'); }}
                        className="text-[11px] text-brand-strong hover:text-brand font-black underline"
                      >
                        View in 4D
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Scientific Evidence Caveat */}
        <div className="p-4 rounded-xl bg-surface-recessed border-2 border-ink text-ink text-xs flex items-start space-x-3 shadow-neo-sm font-medium">
          <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5 stroke-[2.5]" />
          <p className="leading-relaxed font-mono text-[11px] font-semibold">
            <strong className="text-ink font-black uppercase">CRITICAL SCIENTIFIC INTEGRITY REQUIREMENT:</strong>{' '}
            Statistical associations and machine-learning feature importance weights represent mathematical predictive correlations
            within the dataset. They must not be conflated with proven in-vivo biochemical causality or enzymatic kinetics.
          </p>
        </div>
      </div>
    </div>
  );
};
