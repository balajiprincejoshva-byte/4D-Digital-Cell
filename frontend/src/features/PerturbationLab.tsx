import React, { useState, useEffect } from 'react';
import { DatasetInfo, TrainedModelInfo, PerturbationResult, PerturbationRequest } from '../types';
import { api } from '../lib/api';
import {
  Zap,
  Play,
  ArrowRight,
  ShieldAlert,
  Layers,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  BarChart2
} from 'lucide-react';
import { NavTab } from '../components/Navigation';

interface PerturbationLabProps {
  dataset: DatasetInfo | null;
  selectedModel: TrainedModelInfo | null;
  onNavigate: (tab: NavTab) => void;
  onPerturbationExecuted: (result: PerturbationResult) => void;
  activePerturbation: PerturbationResult | null;
}

export const PerturbationLab: React.FC<PerturbationLabProps> = ({
  dataset,
  selectedModel,
  onNavigate,
  onPerturbationExecuted,
  activePerturbation
}) => {
  const [targetGene, setTargetGene] = useState<string>('POU5F1');
  const [interventionType, setInterventionType] = useState<'knockout' | 'down_regulation' | 'up_regulation'>('knockout');
  const [paramValue, setParamValue] = useState<number>(0.0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [pastPerturbations, setPastPerturbations] = useState<PerturbationResult[]>([]);

  // Load past runs
  useEffect(() => {
    if (!dataset) return;
    api.listPerturbations(dataset.id)
      .then(runs => {
        setPastPerturbations(runs);
        if (runs.length > 0 && !activePerturbation) {
          onPerturbationExecuted(runs[0]);
        }
      })
      .catch(err => console.error("Error loading perturbation runs:", err));
  }, [dataset?.id]);

  const handleInterventionChange = (type: 'knockout' | 'down_regulation' | 'up_regulation') => {
    setInterventionType(type);
    if (type === 'knockout') setParamValue(0.0);
    else if (type === 'down_regulation') setParamValue(0.5);
    else if (type === 'up_regulation') setParamValue(2.0);
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataset || !selectedModel) {
      setSimError("Please ensure a dataset and trained model are selected first.");
      return;
    }
    setIsSimulating(true);
    setSimError(null);

    try {
      const req: PerturbationRequest = {
        model_id: selectedModel.model_id,
        dataset_id: dataset.id,
        gene_name: targetGene.trim(),
        intervention_type: interventionType,
        parameter: paramValue
      };
      const result = await api.simulatePerturbation(req);
      onPerturbationExecuted(result);
      setPastPerturbations(prev => [result, ...prev]);
    } catch (err: any) {
      setSimError(err.message || "Perturbation simulation failed.");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner / Simulator Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration Panel */}
        <div className="neo-panel p-6 space-y-4">
          <div className="flex items-center space-x-2 text-ink font-black text-sm border-b-2 border-ink pb-3">
            <Zap className="w-4 h-4 text-brand stroke-[2.5]" />
            <span>Configure In-Silico Genetic Perturbation</span>
          </div>

          <form onSubmit={handleSimulate} className="space-y-3.5 text-xs">
            {/* Active Model Indicator */}
            <div>
              <label className="block text-ink-secondary font-bold mb-1">Trained Predictive Model</label>
              <div className="bg-surface-recessed border-2 border-ink px-3 py-2 rounded-md text-ink font-mono font-bold text-[11px] truncate shadow-[1px_1px_0_#2B211B]">
                {selectedModel ? `${selectedModel.model_name} (${selectedModel.model_id})` : 'No Model Selected'}
              </div>
            </div>

            {/* Target Gene */}
            <div>
              <label className="block text-ink font-bold mb-1">Target Gene / Feature to Perturb</label>
              <input
                type="text"
                placeholder="e.g. POU5F1, MYOD1, TUBB3, TP53"
                value={targetGene}
                onChange={e => setTargetGene(e.target.value.toUpperCase())}
                className="w-full bg-surface-raised border-2 border-ink px-3 py-2 rounded-md text-ink font-mono font-black uppercase focus:outline-none focus:ring-2 focus:ring-brand shadow-[1px_1px_0_#2B211B]"
              />
            </div>

            {/* Intervention Type */}
            <div>
              <label className="block text-ink font-bold mb-1.5">Intervention Type</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'knockout', label: 'Knockout (0x)' },
                  { id: 'down_regulation', label: 'Down-Reg' },
                  { id: 'up_regulation', label: 'Up-Reg' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleInterventionChange(item.id as any)}
                    className={`py-2 px-1.5 rounded-md text-[11px] font-black transition border-2 border-ink ${
                      interventionType === item.id
                        ? 'bg-brand text-ink shadow-[2px_2px_0_#2B211B]'
                        : 'bg-surface text-ink-secondary hover:bg-surface-peach hover:text-ink shadow-[1px_1px_0_#2B211B]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parameter Slider */}
            {interventionType !== 'knockout' && (
              <div>
                <label className="block text-ink-secondary font-bold mb-1">
                  {interventionType === 'down_regulation' ? `Down-regulation factor: ${(paramValue * 100).toFixed(0)}%` : `Up-regulation multiplier: ${paramValue.toFixed(1)}x`}
                </label>
                <input
                  type="range"
                  min={interventionType === 'down_regulation' ? 0.05 : 1.2}
                  max={interventionType === 'down_regulation' ? 0.95 : 5.0}
                  step={interventionType === 'down_regulation' ? 0.05 : 0.2}
                  value={paramValue}
                  onChange={e => setParamValue(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
              </div>
            )}

            {simError && (
              <div className="p-3 rounded-md bg-danger-soft border-2 border-ink text-danger text-xs font-bold shadow-[2px_2px_0_#2B211B]">
                {simError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSimulating || !selectedModel}
              className="neo-primary w-full py-2.5 px-4 font-black flex items-center justify-center space-x-2 disabled:opacity-50 text-xs"
            >
              {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5]" /> : <Play className="w-4 h-4 fill-current stroke-[2.5]" />}
              <span>{isSimulating ? 'Evaluating Perturbation...' : 'Run In-Silico Perturbation'}</span>
            </button>
          </form>

          {/* Past Runs List */}
          {pastPerturbations.length > 0 && (
            <div className="pt-3 border-t-2 border-ink/30 space-y-2 text-xs">
              <span className="text-ink font-extrabold">Previous Perturbation Runs:</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {pastPerturbations.map(p => (
                  <button
                    key={p.run_id}
                    onClick={() => onPerturbationExecuted(p)}
                    className={`w-full text-left p-2.5 rounded-md text-xs font-mono transition border-2 border-ink ${
                      activePerturbation?.run_id === p.run_id
                        ? 'bg-brand text-ink shadow-[2px_2px_0_#2B211B] font-black'
                        : 'bg-surface-raised hover:bg-surface-peach text-ink shadow-[1px_1px_0_#2B211B]'
                    }`}
                  >
                    <div className="font-bold text-ink">{p.gene_name} ({p.intervention_type})</div>
                    <div className="text-[10px] text-ink-secondary font-semibold">
                      Shift: {p.transition_percentage}% transitioned ({p.cells_transitioned_count} cells)
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 2 cols: Perturbation Comparison & State Shifts */}
        <div className="lg:col-span-2 space-y-4">
          {activePerturbation ? (
            <div className="neo-panel p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-base font-black text-ink">
                    Perturbation Result: {activePerturbation.gene_name} ({activePerturbation.intervention_type})
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-surface-recessed text-brand-strong border border-ink shadow-[1px_1px_0_#2B211B]">
                    {activePerturbation.run_id}
                  </span>
                </div>

                <button
                  onClick={() => onNavigate('digital-cell')}
                  className="neo-secondary flex items-center space-x-1.5 text-xs font-black px-3.5 py-1.5 hover:bg-surface-peach transition"
                >
                  <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Inspect in 4D Cell</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-surface-raised p-3.5 rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                  <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">Transition Rate</span>
                  <span className="text-2xl font-black text-brand font-mono">
                    {activePerturbation.transition_percentage}%
                  </span>
                  <span className="text-[11px] text-ink-secondary block mt-0.5 font-semibold">
                    {activePerturbation.cells_transitioned_count} of {activePerturbation.cells_evaluated} cells shifted
                  </span>
                </div>

                <div className="bg-surface-raised p-3.5 rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                  <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">Target Gene</span>
                  <span className="text-2xl font-black text-ink font-mono">
                    {activePerturbation.gene_name}
                  </span>
                  <span className="text-[11px] text-ink-secondary block mt-0.5 font-semibold">
                    Intervention: {activePerturbation.intervention_type}
                  </span>
                </div>

                <div className="bg-surface-raised p-3.5 rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                  <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">Cells Evaluated</span>
                  <span className="text-2xl font-black text-brand-strong font-mono">
                    {activePerturbation.cells_evaluated}
                  </span>
                  <span className="text-[11px] text-ink-secondary block mt-0.5 font-semibold">
                    Full dataset validation
                  </span>
                </div>
              </div>

              {/* State Distribution Delta Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-black text-ink">
                  <span>Cellular State Shift Distribution (Baseline vs Perturbed)</span>
                  <span className="text-[10px] font-mono text-ink-secondary font-bold">Class Proportions</span>
                </div>

                <div className="overflow-x-auto border-2 border-ink rounded-lg shadow-neo-sm">
                  <table className="w-full text-xs font-mono text-left">
                    <thead className="bg-surface-recessed text-ink text-[11px] font-black border-b-2 border-ink">
                      <tr>
                        <th className="py-2.5 px-3">State / Class</th>
                        <th className="py-2.5 px-3">Baseline Count</th>
                        <th className="py-2.5 px-3">Perturbed Count</th>
                        <th className="py-2.5 px-3">Baseline Fraction</th>
                        <th className="py-2.5 px-3">Perturbed Fraction</th>
                        <th className="py-2.5 px-3 text-right">Fraction Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-ink/20 bg-surface text-[11px] text-ink">
                      {activePerturbation.state_distributions.map(sd => (
                        <tr key={sd.state} className="hover:bg-surface-peach transition">
                          <td className="py-2 px-3 font-black text-ink">{sd.state}</td>
                          <td className="py-2 px-3 text-ink-secondary font-semibold">{sd.baseline_count}</td>
                          <td className="py-2 px-3 text-ink font-black">{sd.perturbed_count}</td>
                          <td className="py-2 px-3 text-ink-secondary">{(sd.baseline_fraction * 100).toFixed(1)}%</td>
                          <td className="py-2 px-3 text-ink font-bold">{(sd.perturbed_fraction * 100).toFixed(1)}%</td>
                          <td className={`py-2 px-3 text-right font-black ${
                            sd.fraction_delta > 0 ? 'text-success' : (sd.fraction_delta < 0 ? 'text-danger' : 'text-ink-secondary')
                          }`}>
                            {sd.fraction_delta > 0 ? `+${(sd.fraction_delta * 100).toFixed(1)}%` : `${(sd.fraction_delta * 100).toFixed(1)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mandatory Counterfactual Warning */}
              <div className="p-4 rounded-xl bg-highlight-cream border-2 border-ink text-ink text-xs flex items-start space-x-3 shadow-neo-md">
                <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5 stroke-[2.5]" />
                <p className="leading-relaxed font-mono text-[11px] font-medium">
                  <strong className="font-black text-ink uppercase">MODEL-BASED COUNTERFACTUAL — NOT PROOF OF A CAUSAL BIOLOGICAL EFFECT:</strong>{' '}
                  {activePerturbation.disclaimer}
                </p>
              </div>
            </div>
          ) : (
            <div className="neo-panel p-12 text-center text-xs text-ink-secondary space-y-2">
              <Zap className="w-8 h-8 text-brand mx-auto stroke-[2.5]" />
              <p className="font-bold">Configure perturbation settings on the left and click "Run In-Silico Perturbation" to compare state shifts.</p>
            </div>
          )}
        </div>
      </div>

      {/* Transitioned Single-Cell Detections Table */}
      {activePerturbation && activePerturbation.cell_deltas_sample.length > 0 && (
        <div className="neo-panel p-6 space-y-3">
          <div className="flex items-center justify-between border-b-2 border-ink pb-2">
            <div className="flex items-center space-x-2 text-ink font-black text-sm">
              <BarChart2 className="w-4 h-4 text-brand stroke-[2.5]" />
              <span>Cell-Level Transitions Audit (Sample of First 50 Cells)</span>
            </div>
            <span className="text-xs font-mono text-ink-secondary font-bold">Baseline vs Perturbed Prediction</span>
          </div>

          <div className="overflow-x-auto border-2 border-ink rounded-lg shadow-neo-sm">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-surface-recessed text-ink border-b-2 border-ink text-[11px] font-black">
                <tr>
                  <th className="py-2.5 px-3">Cell ID</th>
                  <th className="py-2.5 px-3">Baseline State</th>
                  <th className="py-2.5 px-3">Perturbed State</th>
                  <th className="py-2.5 px-3">State Transition?</th>
                  <th className="py-2.5 px-3">Baseline Prob</th>
                  <th className="py-2.5 px-3">Perturbed Prob</th>
                  <th className="py-2.5 px-3 text-right">Probability Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/20 bg-surface text-[11px]">
                {activePerturbation.cell_deltas_sample.map(c => (
                  <tr key={c.cell_id} className={`hover:bg-surface-peach transition ${c.state_changed ? 'bg-surface-orange-wash' : ''}`}>
                    <td className="py-2 px-3 font-bold text-brand-strong">{c.cell_id}</td>
                    <td className="py-2 px-3 text-ink-secondary font-semibold">{c.baseline_state}</td>
                    <td className={`py-2 px-3 font-black ${c.state_changed ? 'text-[#A21CAF]' : 'text-ink'}`}>
                      {c.perturbed_state}
                    </td>
                    <td className="py-2 px-3">
                      {c.state_changed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-brand text-ink border-2 border-ink shadow-[1px_1px_0_#2B211B]">
                          TRANSITIONED
                        </span>
                      ) : (
                        <span className="text-ink-muted">Unchanged</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-ink-secondary">{c.baseline_probability ?? 'N/A'}</td>
                    <td className="py-2 px-3 text-ink-secondary">{c.perturbed_probability ?? 'N/A'}</td>
                    <td className={`py-2 px-3 text-right font-black ${
                      (c.probability_delta || 0) > 0 ? 'text-success' : ((c.probability_delta || 0) < 0 ? 'text-danger' : 'text-ink-secondary')
                    }`}>
                      {c.probability_delta !== null && c.probability_delta !== undefined ? (
                        c.probability_delta > 0 ? `+${c.probability_delta.toFixed(3)}` : c.probability_delta.toFixed(3)
                      ) : 'N/A'}
                    </td>
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
