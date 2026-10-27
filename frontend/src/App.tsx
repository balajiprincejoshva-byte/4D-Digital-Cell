import React, { useState, useEffect } from 'react';
import { DatasetInfo, TrainedModelInfo, PerturbationResult } from './types';
import { api } from './lib/api';
import { Header } from './components/Header';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { Navigation, NavTab } from './components/Navigation';
import { PresentationMode } from './components/PresentationMode';
import { Tv } from 'lucide-react';

// Features
import { Overview } from './features/Overview';
import { DataLab } from './features/DataLab';
import { CellAtlas } from './features/CellAtlas';
import { StatePredictor } from './features/StatePredictor';
import { DigitalCell4D } from './features/DigitalCell4D';
import { PerturbationLab } from './features/PerturbationLab';
import { GenePhenotype } from './features/GenePhenotype';
import { ValidationReports } from './features/ValidationReports';
import { LiteratureMethodology } from './features/LiteratureMethodology';

import { soundFX } from './lib/sound';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<DatasetInfo | null>(null);
  const [selectedModel, setSelectedModel] = useState<TrainedModelInfo | null>(null);
  const [activePerturbation, setActivePerturbation] = useState<PerturbationResult | null>(null);
  const [activeGene, setActiveGene] = useState<string>('POU5F1');
  const [backendHealthy, setBackendHealthy] = useState<boolean>(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(soundFX.getMuted());

  // Initialize application data
  const loadInitialData = async () => {
    try {
      const health = await api.getHealth();
      setBackendHealthy(health.status === 'healthy');

      // Fetch datasets
      const dsList = await api.listDatasets();
      if (dsList.length > 0) {
        setDatasets(dsList);
        setSelectedDataset(dsList[0]);
      } else {
        // Auto-initialize demo if none exists
        handleLoadDemo();
      }
    } catch (err) {
      console.warn("Backend not reachable yet, operating in local client mode:", err);
      setBackendHealthy(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      const demo = await api.initDemoDataset();
      setDatasets(prev => {
        const existing = prev.filter(d => d.id !== demo.id);
        return [demo, ...existing];
      });
      setSelectedDataset(demo);
    } catch (err: any) {
      console.error("Failed to initialize synthetic demo:", err);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleLoadRealData = async () => {
    setIsLoadingDemo(true);
    try {
      const realDs = await api.initRealDataset();
      setDatasets(prev => {
        const existing = prev.filter(d => d.id !== realDs.id);
        return [realDs, ...existing];
      });
      setSelectedDataset(realDs);
      setActiveGene('CD3D');
    } catch (err: any) {
      console.error("Failed to load real PBMC dataset:", err);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleToggleSound = () => {
    const muted = soundFX.toggleMute();
    setIsSoundMuted(muted);
  };

  const handleTogglePresentation = async (nextState?: boolean) => {
    const target = nextState !== undefined ? nextState : !isPresentationOpen;
    if (target) {
      soundFX.playEnterPresentation();
      setIsPresentationOpen(true);
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen request requires user interaction or permission:", err);
      }
    } else {
      soundFX.playExitPresentation();
      setIsPresentationOpen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (err) {
        // ignore
      }
    }
  };

  // Global keyboard shortcut ('P' to toggle presentation mode)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleTogglePresentation();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isPresentationOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-app-bg text-ink font-sans selection:bg-brand-soft selection:text-ink">
      {/* Workstation Header (Visible when not in Presentation Mode) */}
      {!isPresentationOpen && (
        <Header
          datasets={datasets}
          selectedDataset={selectedDataset}
          onSelectDataset={ds => setSelectedDataset(ds)}
          onLoadDemo={handleLoadDemo}
          onLoadRealData={handleLoadRealData}
          isPresentationActive={isPresentationOpen}
          onTogglePresentation={() => handleTogglePresentation()}
          isSoundMuted={isSoundMuted}
          onToggleSound={handleToggleSound}
          isLoading={isLoadingDemo}
          backendHealthy={backendHealthy}
        />
      )}

      {/* Conditionally Render Seamless Integrated Presentation Mode Stage or Standard Workstation */}
      {isPresentationOpen ? (
        <PresentationMode
          onClose={() => handleTogglePresentation(false)}
          onNavigateToModule={tab => {
            setActiveTab(tab);
            handleTogglePresentation(false);
          }}
          activeDatasetName={selectedDataset?.name}
        />
      ) : (
        <>
          {/* Regulatory & Scientific Integrity Banner */}
          <DisclaimerBanner />

          {/* Primary 9-Module Navigation */}
          <Navigation
            activeTab={activeTab}
            onTabChange={tab => setActiveTab(tab)}
            datasetSelected={!!selectedDataset}
          />

          {/* Main Content Workspace */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {activeTab === 'overview' && (
              <Overview
                dataset={selectedDataset}
                onNavigate={tab => setActiveTab(tab)}
                onLoadDemo={handleLoadDemo}
                isLoading={isLoadingDemo}
              />
            )}

            {activeTab === 'data-lab' && (
              <DataLab
                dataset={selectedDataset}
                onDatasetUpdated={ds => {
                  setDatasets(prev => [ds, ...prev.filter(d => d.id !== ds.id)]);
                  setSelectedDataset(ds);
                }}
              />
            )}

            {activeTab === 'cell-atlas' && (
              <CellAtlas
                dataset={selectedDataset}
                activeGene={activeGene}
                onActiveGeneChange={g => setActiveGene(g)}
              />
            )}

            {activeTab === 'state-predictor' && (
              <StatePredictor
                dataset={selectedDataset}
                onModelSelected={m => setSelectedModel(m)}
                selectedModel={selectedModel}
              />
            )}

            {activeTab === 'digital-cell' && (
              <DigitalCell4D
                dataset={selectedDataset}
                activeGene={activeGene}
                onActiveGeneChange={g => setActiveGene(g)}
                activePerturbation={activePerturbation}
              />
            )}

            {activeTab === 'perturbation-lab' && (
              <PerturbationLab
                dataset={selectedDataset}
                selectedModel={selectedModel}
                onNavigate={tab => setActiveTab(tab)}
                onPerturbationExecuted={p => setActivePerturbation(p)}
                activePerturbation={activePerturbation}
              />
            )}

            {activeTab === 'gene-phenotype' && (
              <GenePhenotype
                dataset={selectedDataset}
                selectedModel={selectedModel}
                activePerturbation={activePerturbation}
                activeGene={activeGene}
                onSelectGene={g => setActiveGene(g)}
                onNavigate={tab => setActiveTab(tab)}
              />
            )}

            {activeTab === 'validation-reports' && (
              <ValidationReports
                dataset={selectedDataset}
                selectedModel={selectedModel}
                activePerturbation={activePerturbation}
              />
            )}

            {activeTab === 'methodology' && (
              <LiteratureMethodology />
            )}
          </main>

          {/* Scientific Workstation Footer */}
          <footer className="border-t-2 border-ink bg-surface-recessed px-6 py-4 text-xs text-ink-secondary mt-8 shadow-neo-sm">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-ink tracking-tight uppercase">AI-Driven 4D Digital Cell</span>
                <span className="text-ink-muted">|</span>
                <span className="font-medium text-ink-secondary">Computational Biology Research Platform v1.0.0</span>
              </div>

              <div className="text-[11px] font-mono font-bold text-ink-muted">
                Research & Education Prototype &bull; Not for Diagnostic or Clinical Use
              </div>
            </div>
          </footer>

          {/* Floating Presentation Deck Dock Pill for Rapid Re-Entry During Demos */}
          <div className="fixed bottom-5 right-5 z-40 animate-in fade-in duration-300">
            <button
              onClick={() => handleTogglePresentation(true)}
              className="neo-primary flex items-center space-x-2 px-3.5 py-2 text-xs font-black bg-brand hover:bg-[#FF8128] text-ink border-2 border-ink shadow-neo-md transition-all group"
              title="Open Project Defense Presentation Deck (Press 'P')"
            >
              <Tv className="w-4 h-4 stroke-[2.5] text-ink group-hover:scale-110 transition-transform" />
              <span>Slide Deck (13 Slides)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-recessed border border-ink shadow-[0.5px_0.5px_0_#2B211B]">
                P
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
