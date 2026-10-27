import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface-orange-wash border-b-2 border-ink px-6 py-2 text-xs text-ink font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-ink">
          <ShieldAlert className="w-4 h-4 text-warning-ink shrink-0 stroke-[2.5]" />
          <span className="font-extrabold tracking-wide uppercase text-[11px] bg-highlight-yellow px-1.5 py-0.5 border border-ink rounded-sm shadow-[1px_1px_0_#2B211B]">
            Research Prototype Disclaimer:
          </span>
          <span className="text-ink-secondary hidden sm:inline font-semibold">
            This platform is strictly for computational research and education. It is not a clinically validated digital twin.
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-ink hover:text-brand-strong flex items-center space-x-1 font-bold text-[11px] bg-surface-raised px-2 py-0.5 border border-ink rounded shadow-[1px_1px_0_#2B211B] hover:-translate-y-0.5 transition"
        >
          <span>{expanded ? 'Hide Details' : 'Read Full Disclaimer'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" /> : <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-2.5 pt-2 border-t-2 border-ink/40 text-ink-secondary space-y-1.5 leading-relaxed bg-surface-raised p-3 rounded-md border border-ink mt-2 shadow-neo-sm">
          <p>
            <strong className="text-ink font-extrabold">Regulatory Status:</strong> This application is a computational biology
            software prototype and must not be used independently for clinical diagnosis, patient management, or treatment decisions.
          </p>
          <p>
            <strong className="text-ink font-extrabold">Genetic Perturbation In-Silico:</strong> Simulated gene knockouts or regulatory modifications
            represent mathematical model counterfactuals evaluated on learned feature distributions. They do not constitute biochemical proof
            of in-vivo causal biological response.
          </p>
          <p>
            <strong className="text-ink font-extrabold">Data Integrity:</strong> Synthetic demonstration datasets are clearly flagged and must never be
            represented as empirical wet-lab measurements.
          </p>
        </div>
      )}
    </div>
  );
};

