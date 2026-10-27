import React, { useState } from 'react';
import { DatasetInfo, TrainedModelInfo, PerturbationResult, ReportResponse } from '../types';
import { api } from '../lib/api';
import {
  FileCheck2,
  Download,
  FileText,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';

interface ValidationReportsProps {
  dataset: DatasetInfo | null;
  selectedModel: TrainedModelInfo | null;
  activePerturbation: PerturbationResult | null;
}

export const ValidationReports: React.FC<ValidationReportsProps> = ({
  dataset,
  selectedModel,
  activePerturbation
}) => {
  const [reportTitle, setReportTitle] = useState('AI-Driven 4D Digital Cell Research Report');
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!dataset) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.generateReport(
        dataset.id,
        reportTitle,
        selectedModel?.model_id,
        activePerturbation?.run_id
      );
      setReport(res);
    } catch (err: any) {
      setError(err.message || "Failed to generate research report.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!report) return;
    const blob = new Blob([report.markdown_content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${report.report_id}_research_report.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report.json_summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${report.report_id}_audit.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Configuration & Generator Card */}
      <div className="neo-panel p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand text-ink rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
              <FileCheck2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-ink">Validation Audit & Reproducible Report Generator</h2>
              <p className="text-xs font-semibold text-ink-secondary">Export timestamped research records, provenance hashes, and counterfactual disclaimers</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || !dataset}
              className="neo-primary flex items-center space-x-2 px-5 py-2.5 text-xs font-black disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5]" /> : <FileText className="w-4 h-4 stroke-[2.5]" />}
              <span>{isGenerating ? 'Synthesizing Report...' : 'Generate Research Report'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-ink font-bold mb-1">Report Title</label>
            <input
              type="text"
              value={reportTitle}
              onChange={e => setReportTitle(e.target.value)}
              className="w-full bg-surface-raised border-2 border-ink px-3 py-2 rounded-md text-ink font-bold focus:outline-none focus:ring-2 focus:ring-brand shadow-[1px_1px_0_#2B211B]"
            />
          </div>
          <div>
            <label className="block text-ink-secondary font-bold mb-1">Target Dataset</label>
            <div className="bg-surface-recessed border-2 border-ink px-3 py-2 rounded-md text-ink font-mono font-bold text-[11px] truncate shadow-[1px_1px_0_#2B211B]">
              {dataset ? `${dataset.name} (${dataset.id})` : 'None'}
            </div>
          </div>
          <div>
            <label className="block text-ink-secondary font-bold mb-1">Included Model & Perturbation</label>
            <div className="bg-surface-recessed border-2 border-ink px-3 py-2 rounded-md text-ink font-mono font-bold text-[11px] truncate shadow-[1px_1px_0_#2B211B]">
              {selectedModel ? selectedModel.model_name : 'No Model'} | {activePerturbation ? `${activePerturbation.gene_name} (${activePerturbation.intervention_type})` : 'No Perturbation'}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-danger-soft border-2 border-ink text-danger text-xs font-bold shadow-[2px_2px_0_#2B211B]">
            {error}
          </div>
        )}
      </div>

      {/* Rendered Report View */}
      {report ? (
        <div className="neo-panel p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-base font-black text-ink">{report.title}</span>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-surface-recessed text-brand-strong border border-ink shadow-[1px_1px_0_#2B211B]">
                ID: {report.report_id}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadMarkdown}
                className="neo-secondary flex items-center space-x-1.5 text-xs font-black px-3.5 py-1.5 hover:bg-surface-peach transition"
              >
                <Download className="w-3.5 h-3.5 text-brand stroke-[2.5]" />
                <span>Export Markdown (.md)</span>
              </button>
              <button
                onClick={handleDownloadJSON}
                className="neo-secondary flex items-center space-x-1.5 text-xs font-black px-3.5 py-1.5 hover:bg-surface-peach transition"
              >
                <Download className="w-3.5 h-3.5 text-brand-strong stroke-[2.5]" />
                <span>Export Audit (.json)</span>
              </button>
            </div>
          </div>

          {/* Markdown Content Display */}
          <div className="bg-surface-raised border-2 border-ink p-6 rounded-xl overflow-x-auto max-h-[600px] overflow-y-auto shadow-neo-sm">
            <pre className="text-xs text-ink font-mono whitespace-pre-wrap leading-relaxed font-medium">
              {report.markdown_content}
            </pre>
          </div>
        </div>
      ) : (
        <div className="neo-panel p-12 text-center text-xs text-ink-secondary space-y-2">
          <FileCheck2 className="w-8 h-8 text-brand mx-auto stroke-[2.5]" />
          <p className="font-bold">Click "Generate Research Report" above to compile an audit-ready reproducible scientific report.</p>
        </div>
      )}
    </div>
  );
};
