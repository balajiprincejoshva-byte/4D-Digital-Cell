import React, { useState, useEffect } from 'react';
import { DatasetInfo, TrainedModelInfo, TrainModelRequest, PredictionItem } from '../types';
import { api } from '../lib/api';
import {
  Cpu,
  Play,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Dna,
  RefreshCw,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface StatePredictorProps {
  dataset: DatasetInfo | null;
  onModelSelected: (model: TrainedModelInfo) => void;
  selectedModel: TrainedModelInfo | null;
}

export const StatePredictor: React.FC<StatePredictorProps> = ({
  dataset,
  onModelSelected,
  selectedModel
}) => {
  const [targetColumn, setTargetColumn] = useState<string>('cell_state');
  const [modelType, setModelType] = useState<string>('random_forest');
  const [testSplit, setTestSplit] = useState<number>(0.25);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [nEstimators, setNEstimators] = useState<number>(100);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [pastModels, setPastModels] = useState<TrainedModelInfo[]>([]);
  const [predictionsSample, setPredictionsSample] = useState<PredictionItem[]>([]);

  // Load existing models for dataset
  useEffect(() => {
    if (!dataset) return;
    api.listModels(dataset.id)
      .then(models => {
        setPastModels(models);
        if (models.length > 0 && !selectedModel) {
          onModelSelected(models[0]);
        }
      })
      .catch(err => console.error("Error loading models:", err));
  }, [dataset?.id]);

  // Load sample predictions when a model is selected
  useEffect(() => {
    if (!dataset || !selectedModel) return;
    api.predictCells(selectedModel.model_id, dataset.id)
      .then(preds => setPredictionsSample(preds.slice(0, 20)))
      .catch(err => console.error("Error fetching predictions:", err));
  }, [selectedModel?.model_id, dataset?.id]);

  const handleTrainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataset) return;
    setIsTraining(true);
    setTrainError(null);

    try {
      const req: TrainModelRequest = {
        dataset_id: dataset.id,
        target_column: targetColumn,
        model_type: modelType,
        test_size: testSplit,
        random_seed: randomSeed,
        n_estimators: nEstimators
      };
      const model = await api.trainModel(req);
      onModelSelected(model);
      setPastModels(prev => [model, ...prev]);
    } catch (err: any) {
      setTrainError(err.message || "Failed to train model.");
    } finally {
      setIsTraining(false);
    }
  };

  const metrics = selectedModel?.metrics;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner / Config Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration Form */}
        <div className="neo-panel p-6 space-y-4">
          <div className="flex items-center space-x-2 text-ink font-black text-sm border-b-2 border-ink pb-3">
            <Cpu className="w-4 h-4 text-brand stroke-[2.5]" />
            <span>Train Predictive Cellular Model</span>
          </div>

          <form onSubmit={handleTrainSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-ink font-bold mb-1">Target Metadata Feature</label>
              <select
                value={targetColumn}
                onChange={e => setTargetColumn(e.target.value)}
                className="w-full bg-surface-raised border-2 border-ink px-3 py-2 rounded-md text-ink font-black focus:outline-none focus:ring-2 focus:ring-brand shadow-[1px_1px_0_#2B211B]"
              >
                {dataset?.metadata_columns && dataset.metadata_columns.length > 0 ? (
                  dataset.metadata_columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))
                ) : (
                  <>
                    <option value="cell_state">cell_state (Classification)</option>
                    <option value="phenotype_score">phenotype_score (Regression)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-ink font-bold mb-1">Model Architecture</label>
              <select
                value={modelType}
                onChange={e => setModelType(e.target.value)}
                className="w-full bg-surface-raised border-2 border-ink px-3 py-2 rounded-md text-ink font-black focus:outline-none focus:ring-2 focus:ring-brand shadow-[1px_1px_0_#2B211B]"
              >
                <option value="random_forest">Random Forest Classifier / Regressor</option>
                <option value="logistic_regression">Regularized Linear / Logistic Model</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-ink-secondary font-bold mb-1">Held-out Split: {testSplit * 100}%</label>
                <input
                  type="range"
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  value={testSplit}
                  onChange={e => setTestSplit(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-ink-secondary font-bold mb-1">Random Seed</label>
                <input
                  type="number"
                  value={randomSeed}
                  onChange={e => setRandomSeed(Number(e.target.value))}
                  className="w-full bg-surface-raised border-2 border-ink px-2 py-1 rounded-md text-ink font-mono font-bold shadow-[1px_1px_0_#2B211B]"
                />
              </div>
            </div>

            {trainError && (
              <div className="p-3 rounded-md bg-danger-soft border-2 border-ink text-danger text-xs font-bold shadow-[2px_2px_0_#2B211B]">
                {trainError}
              </div>
            )}

            <button
              type="submit"
              disabled={isTraining || !dataset}
              className="neo-primary w-full py-2.5 px-4 font-black flex items-center justify-center space-x-2 disabled:opacity-50 text-xs"
            >
              {isTraining ? <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5]" /> : <Play className="w-4 h-4 fill-current stroke-[2.5]" />}
              <span>{isTraining ? 'Training Model...' : 'Train & Evaluate Model'}</span>
            </button>
          </form>

          {/* Past Model Select */}
          {pastModels.length > 0 && (
            <div className="pt-3 border-t-2 border-ink/30 space-y-2 text-xs">
              <span className="text-ink font-extrabold">Select Trained Model:</span>
              <div className="space-y-1.5">
                {pastModels.map(m => (
                  <button
                    key={m.model_id}
                    onClick={() => onModelSelected(m)}
                    className={`w-full text-left p-2.5 rounded-md text-xs font-mono transition border-2 border-ink ${
                      selectedModel?.model_id === m.model_id
                        ? 'bg-brand text-ink shadow-[2px_2px_0_#2B211B] font-black'
                        : 'bg-surface-raised hover:bg-surface-peach text-ink shadow-[1px_1px_0_#2B211B]'
                    }`}
                  >
                    <div className="font-bold">{m.model_name}</div>
                    <div className="text-[10px] text-ink-secondary font-semibold">ID: {m.model_id} | Test Score: {m.metrics.test_score}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 2 cols: Held-out Metrics & Evaluation Summary */}
        <div className="lg:col-span-2 space-y-4">
          {selectedModel && metrics ? (
            <div className="neo-panel p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-black text-ink">{selectedModel.model_name}</span>
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-surface-recessed text-brand-strong border border-ink shadow-[1px_1px_0_#2B211B]">
                    {metrics.task_type.toUpperCase()}
                  </span>
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border border-ink shadow-[1px_1px_0_#2B211B] ${
                    (selectedModel.circular_evaluation_risk || metrics.circular_evaluation_risk)
                      ? 'bg-warning-soft text-warning'
                      : metrics.annotation_provenance === 'synthetic'
                      ? 'bg-highlight-cream text-ink'
                      : metrics.is_independent_ground_truth
                      ? 'bg-success-soft text-success'
                      : 'bg-surface-raised text-ink'
                  }`}>
                    {selectedModel.evaluation_label || metrics.evaluation_label || 'Exploratory Model Fit'}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-ink-secondary">
                  Features: {selectedModel.features_count} genes
                </span>
              </div>

              {/* Scientific Integrity Disclosure Banner */}
              {(selectedModel.circular_evaluation_risk || metrics.circular_evaluation_risk) && (
                <div className="p-3.5 rounded-lg bg-warning-soft border-2 border-ink text-ink text-xs flex items-start space-x-2.5 shadow-[2px_2px_0_#2B211B]">
                  <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5 stroke-[2.5]" />
                  <div>
                    <div className="font-black text-warning">Circular Evaluation Disclosure (Weak-Label Agreement)</div>
                    <div className="text-[11px] text-ink-secondary mt-0.5 leading-relaxed font-semibold">
                      Target cell-state labels were generated using marker gene rules that overlap with model features ({metrics.overlapping_marker_features?.join(', ') || 'marker genes'}). 
                      Reported held-out metrics quantify internal algorithmic concordance with heuristic classification rules, <strong>not independent biological validation</strong>.
                    </div>
                  </div>
                </div>
              )}

              {metrics.annotation_provenance === 'synthetic' && (
                <div className="p-3.5 rounded-lg bg-highlight-cream border-2 border-ink text-ink text-xs flex items-start space-x-2.5 shadow-[2px_2px_0_#2B211B]">
                  <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5 stroke-[2.5]" />
                  <div>
                    <div className="font-black text-ink">Synthetic Benchmark Evaluation</div>
                    <div className="text-[11px] text-ink-secondary mt-0.5 leading-relaxed font-semibold">
                      Cell states and expression features were generated synthetically for pipeline verification. Performance measures software correctness rather than biological prediction.
                    </div>
                  </div>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {metrics.task_type === 'classification' ? (
                  <>
                    <div className="bg-surface-raised p-3.5 rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                      <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">
                        {(selectedModel.circular_evaluation_risk || metrics.circular_evaluation_risk)
                          ? 'Weak-Label Concordance'
                          : 'Held-Out Accuracy'}
                      </span>
                      <span className="text-xl font-black text-success font-mono">
                        {((metrics.accuracy || 0) * 100).toFixed(1)}%
                      </span>
                      {(selectedModel.circular_evaluation_risk || metrics.circular_evaluation_risk) && (
                        <span className="text-[9px] text-warning font-bold block font-mono">vs heuristic rules</span>
                      )}
                    </div>
                    <div className="bg-surface-raised p-3.5 rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                      <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">Macro-F1 Score</span>
                      <span className="text-xl font-black text-brand font-mono">
                        {metrics.macro_f1?.toFixed(3)}
                      </span>
                    </div>
                    <div className="bg-surface-raised p-3.5 rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                      <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">Balanced Accuracy</span>
                      <span className="text-xl font-black text-brand-strong font-mono">
                        {((metrics.balanced_accuracy || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-surface-raised p-3.5 rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                      <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">Train vs Test Score</span>
                      <span className="text-sm font-black text-ink font-mono">
                        {metrics.train_score} / {metrics.test_score}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-surface-raised p-3.5 rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                      <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">R² Score</span>
                      <span className="text-xl font-black text-success font-mono">
                        {metrics.r2_score?.toFixed(3)}
                      </span>
                    </div>
                    <div className="bg-surface-raised p-3.5 rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                      <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">RMSE</span>
                      <span className="text-xl font-black text-brand font-mono">
                        {metrics.rmse?.toFixed(3)}
                      </span>
                    </div>
                    <div className="bg-surface-raised p-3.5 rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                      <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">MAE</span>
                      <span className="text-xl font-black text-brand-strong font-mono">
                        {metrics.mae?.toFixed(3)}
                      </span>
                    </div>
                    <div className="bg-surface-raised p-3.5 rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
                      <span className="text-ink-secondary text-[10px] uppercase font-mono font-bold block">Train vs Test R²</span>
                      <span className="text-sm font-black text-ink font-mono">
                        {metrics.train_score} / {metrics.test_score}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Confusion Matrix (if classification) */}
              {metrics.confusion_matrix && metrics.class_labels && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-black text-ink">
                    <span>Held-Out Confusion Matrix</span>
                    <span className="text-[10px] font-mono text-ink-secondary font-bold">Rows: True Label | Columns: Predicted Label</span>
                  </div>
                  <div className="overflow-x-auto border-2 border-ink rounded-lg shadow-neo-sm">
                    <table className="w-full text-xs text-center font-mono">
                      <thead className="bg-surface-recessed text-ink font-black text-[11px] border-b-2 border-ink">
                        <tr>
                          <th className="py-2 px-3 text-left">True \ Pred</th>
                          {metrics.class_labels.map(l => (
                            <th key={l} className="py-2 px-3">{l}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-ink/20 bg-surface text-ink">
                        {metrics.confusion_matrix.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td className="py-2 px-3 text-left font-black text-ink bg-surface-recessed/40">
                              {metrics.class_labels![rIdx]}
                            </td>
                            {row.map((val, cIdx) => (
                              <td
                                key={cIdx}
                                className={`py-2 px-3 font-bold ${rIdx === cIdx ? 'text-success font-black bg-success-soft' : 'text-ink-secondary'}`}
                              >
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Feature Importance Table */}
              {selectedModel.top_features.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-black text-ink">
                    <span>Top Predictive Features (Gini / Weight Importance)</span>
                    <span className="text-[10px] text-brand-strong font-mono font-bold">Statistical, Not Causal</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                    {selectedModel.top_features.slice(0, 10).map(f => (
                      <div key={f.feature} className="flex items-center justify-between bg-surface-raised p-2.5 rounded-md border-2 border-ink shadow-[1px_1px_0_#2B211B]">
                        <span className="text-ink font-black">#{f.rank} {f.feature}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-surface-recessed h-2 rounded-full overflow-hidden border border-ink">
                            <div className="bg-brand h-full" style={{ width: `${Math.min(f.importance * 300, 100)}%` }} />
                          </div>
                          <span className="text-ink font-bold">{f.importance.toFixed(3)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-ink bg-surface-recessed p-3 rounded-md border-2 border-ink flex items-start space-x-2 font-medium">
                    <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5 stroke-[2.5]" />
                    <span>{selectedModel.caveat}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="neo-panel p-12 text-center text-xs text-ink-secondary space-y-2">
              <Cpu className="w-8 h-8 text-brand mx-auto stroke-[2.5]" />
              <p className="font-bold">Configure model settings on the left and click "Train & Evaluate Model" to view validation metrics.</p>
            </div>
          )}
        </div>
      </div>

      {/* Per-Cell Predictions Inspector Table */}
      {predictionsSample.length > 0 && (
        <div className="neo-panel p-6 space-y-3">
          <div className="flex items-center justify-between border-b-2 border-ink pb-2">
            <div className="flex items-center space-x-2 text-ink font-black text-sm">
              <BarChart3 className="w-4 h-4 text-brand stroke-[2.5]" />
              <span>Per-Cell Predictions & Probability Distributions (Sample)</span>
            </div>
            <span className="text-xs font-mono text-ink-secondary font-bold">Exportable Table</span>
          </div>

          <div className="overflow-x-auto border-2 border-ink rounded-lg shadow-neo-sm">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-surface-recessed text-ink border-b-2 border-ink text-[11px] font-black">
                <tr>
                  <th className="py-2.5 px-3">Cell ID</th>
                  <th className="py-2.5 px-3">True Label</th>
                  <th className="py-2.5 px-3">Predicted Label</th>
                  <th className="py-2.5 px-3">Match Status</th>
                  <th className="py-2.5 px-3">Class Probabilities</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/20 bg-surface text-[11px]">
                {predictionsSample.map(p => {
                  const isMatch = p.true_label === p.predicted_label;
                  return (
                    <tr key={p.cell_id} className="hover:bg-surface-peach transition">
                      <td className="py-2 px-3 font-bold text-brand-strong">{p.cell_id}</td>
                      <td className="py-2 px-3 text-ink font-semibold">{p.true_label || p.true_numeric || 'N/A'}</td>
                      <td className="py-2 px-3 font-black text-ink">{p.predicted_label}</td>
                      <td className="py-2 px-3">
                        {p.true_label ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border-2 border-ink shadow-[1px_1px_0_#2B211B] ${
                            isMatch ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
                          }`}>
                            {isMatch ? 'CONCORDANT' : 'DISCORDANT'}
                          </span>
                        ) : (
                          <span className="text-ink-muted">Unlabelled</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-ink-secondary">
                        {p.probabilities ? (
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            {Object.entries(p.probabilities).map(([c, prob]) => (
                              <span key={c}>
                                {c}: <strong className="text-ink font-bold">{(prob * 100).toFixed(0)}%</strong>
                              </span>
                            ))}
                          </div>
                        ) : 'Regression output'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

