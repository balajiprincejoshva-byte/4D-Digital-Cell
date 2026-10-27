import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  BookOpen,
  ExternalLink,
  ShieldAlert,
  Dna,
  FileText,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';

export const LiteratureMethodology: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getMethodology()
      .then(res => setData(res))
      .catch(err => console.error("Failed to load methodology:", err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="neo-panel p-5 space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand text-ink rounded-lg border-2 border-ink shadow-[2px_2px_0_#2B211B]">
            <BookOpen className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-ink flex items-center gap-2">
              Scientific Literature, Computational Methodology & Assumptions
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-surface-recessed text-brand-strong border border-ink shadow-[1px_1px_0_#2B211B]">
                Peer-Reviewed Foundation
              </span>
            </h2>
            <p className="text-xs font-semibold text-ink-secondary">
              Verified citations, single-cell preprocessing theories, and explicit computational boundaries
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimers Card */}
      <div className="p-5 rounded-xl bg-highlight-cream border-2 border-ink text-ink text-xs flex items-start space-x-3.5 shadow-neo-sm font-medium">
        <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5 stroke-[2.5]" />
        <div className="space-y-1">
          <div className="font-black text-ink uppercase tracking-wide">SCIENTIFIC INTEGRITY & REGULATORY NOTICE</div>
          <p className="leading-relaxed font-semibold text-ink-secondary">
            {data?.disclaimer || "RESEARCH & EDUCATION PROTOTYPE ONLY: This computational biology software must not be used independently for clinical diagnosis, treatment decisions, or patient care."}
          </p>
        </div>
      </div>

      {/* Core Themes & Implementation Assumptions */}
      {data?.themes && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.themes.map((th: any, idx: number) => (
            <div key={idx} className="neo-panel p-6 space-y-3">
              <div className="text-base font-black text-ink flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand border border-ink" />
                <span>{th.topic}</span>
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed font-semibold">
                {th.summary}
              </p>
              <div className="pt-2 border-t-2 border-ink/20 bg-surface-recessed p-3 rounded-lg border border-ink text-xs font-mono text-ink">
                <strong className="text-brand-strong block mb-1 font-black">Prototype Implementation Assumption:</strong>
                <span className="font-semibold">{th.assumptions_in_this_app}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verified Peer-Reviewed Scientific Publications */}
      <div className="neo-panel p-6 space-y-4">
        <div className="flex items-center space-x-2 text-ink font-black text-sm border-b-2 border-ink pb-3">
          <FileText className="w-4 h-4 text-brand stroke-[2.5]" />
          <span>Verified Peer-Reviewed Literature References</span>
        </div>

        {data?.verified_literature_references && (
          <div className="space-y-3.5">
            {data.verified_literature_references.map((ref: any, idx: number) => (
              <div key={idx} className="bg-surface-raised border-2 border-ink p-4 rounded-xl space-y-2.5 shadow-[2px_2px_0_#2B211B] hover:bg-surface-peach transition">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-sm text-ink">
                    {ref.title}
                  </span>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs text-brand-strong hover:text-brand font-mono font-bold underline"
                  >
                    <span>DOI: {ref.doi}</span>
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  </a>
                </div>

                <div className="text-xs text-ink-secondary font-bold">
                  {ref.authors} ({ref.year}) &mdash; <em className="text-ink font-extrabold">{ref.journal}</em>, {ref.volume}:{ref.pages}
                </div>

                <div className="text-[11px] text-ink font-mono bg-surface-recessed p-2.5 rounded-md border border-ink">
                  <strong className="text-brand-strong font-black">Methodological Claim Supported:</strong> {ref.claim_supported} (PMID: {ref.pmid})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
