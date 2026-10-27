import React from 'react';
import {
  LayoutDashboard,
  Database,
  Compass,
  Cpu,
  Layers,
  Zap,
  Network,
  FileCheck2,
  BookOpen
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'data-lab'
  | 'cell-atlas'
  | 'state-predictor'
  | 'digital-cell'
  | 'perturbation-lab'
  | 'gene-phenotype'
  | 'validation-reports'
  | 'methodology';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  datasetSelected: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  datasetSelected
}) => {
  const tabs = [
    { id: 'overview', label: '1. Overview', icon: LayoutDashboard },
    { id: 'data-lab', label: '2. Data Lab', icon: Database },
    { id: 'cell-atlas', label: '3. Cell Atlas', icon: Compass },
    { id: 'state-predictor', label: '4. State Predictor', icon: Cpu },
    { id: 'digital-cell', label: '5. 4D Digital Cell', icon: Layers, highlight: true },
    { id: 'perturbation-lab', label: '6. Perturbation Lab', icon: Zap },
    { id: 'gene-phenotype', label: '7. Gene-to-Phenotype', icon: Network },
    { id: 'validation-reports', label: '8. Validation & Reports', icon: FileCheck2 },
    { id: 'methodology', label: '9. Literature & Methods', icon: BookOpen },
  ];

  return (
    <nav className="bg-surface-recessed border-b-2 border-ink px-6 py-2.5 overflow-x-auto shadow-neo-sm">
      <div className="flex items-center space-x-2 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as NavTab)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all duration-150 border-2 border-ink ${
                isActive
                  ? 'bg-brand text-ink shadow-neo-sm -translate-y-0.5'
                  : 'bg-surface text-ink-secondary shadow-[2px_2px_0_#2B211B] hover:bg-surface-peach hover:text-ink hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none'
              } ${tab.highlight && !isActive ? 'bg-surface-orange-wash text-brand-strong' : ''}`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-ink' : 'text-ink-secondary'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

