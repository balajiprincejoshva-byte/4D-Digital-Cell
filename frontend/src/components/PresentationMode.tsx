import React, { useState, useEffect, useRef } from 'react';
import { NavTab } from './Navigation';
import { soundFX } from '../lib/sound';
import simatsLogo from '../assets/simats_logo.png';
import saveethaSeal from '../assets/saveetha_seal.png';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Tv,
  Layers,
  Dna,
  Cpu,
  Activity,
  FileText,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Users,
  Target,
  Compass,
  Zap,
  ShieldCheck,
  Eye,
  Database,
  ExternalLink,
  Sliders,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  GraduationCap
} from 'lucide-react';

export interface PresentationModeProps {
  onClose: () => void;
  onNavigateToModule: (tab: NavTab) => void;
  activeDatasetName?: string;
  initialSlide?: number;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  onClose,
  onNavigateToModule,
  activeDatasetName = '10x PBMC scRNA-seq',
  initialSlide = 0
}) => {
  const [currentSlide, setCurrentSlide] = useState(initialSlide);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [isMuted, setIsMuted] = useState(soundFX.getMuted());
  const totalSlides = 13;

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        soundFX.playExitPresentation();
        onClose();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      soundFX.playSlideTransition();
      setSlideDirection('next');
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      soundFX.playSlideTransition();
      setSlideDirection('prev');
      setCurrentSlide(prev => prev - 1);
    }
  };

  const jumpToSlide = (idx: number) => {
    if (idx !== currentSlide) {
      soundFX.playSlideTransition();
      setSlideDirection(idx > currentSlide ? 'next' : 'prev');
      setCurrentSlide(idx);
    }
  };

  const toggleFullscreen = () => {
    soundFX.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleToggleSound = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  const progressPercent = ((currentSlide + 1) / totalSlides) * 100;

  // Interblend Tool Destination Mapping
  const getInterblendForSlide = (slideIdx: number) => {
    switch (slideIdx) {
      case 0:
        return { tab: 'overview' as NavTab, label: 'Workstation Overview', action: 'Explore Live Digital Cell System' };
      case 1:
        return { tab: 'overview' as NavTab, label: 'Aim & Architecture', action: 'Inspect Overview Architecture' };
      case 4:
        return { tab: 'overview' as NavTab, label: 'Research Objectives', action: 'Inspect Research Pipeline' };
      case 5:
        return { tab: 'data-lab' as NavTab, label: 'Live Data Lab', action: 'Open Live Data Lab [GEO / PBMC]' };
      case 6:
        return { tab: 'state-predictor' as NavTab, label: 'State Predictor & Atlas', action: 'Open Live State Predictor & Cell Atlas' };
      case 7:
        return { tab: 'perturbation-lab' as NavTab, label: 'Perturbation Lab', action: 'Run Live In-Silico Perturbation' };
      case 8:
        return { tab: 'digital-cell' as NavTab, label: '4D Interactive Digital Cell', action: 'Launch Live 4D Digital Cell Viewport' };
      case 9:
        return { tab: 'gene-phenotype' as NavTab, label: 'Gene-to-Phenotype Pipeline', action: 'Inspect Computational Pipeline' };
      case 10:
        return { tab: 'validation-reports' as NavTab, label: 'Validation & Reports', action: 'View Validation Reports & Metrics' };
      case 12:
        return { tab: 'methodology' as NavTab, label: 'Literature & Methodology', action: 'Review Full Literature & Methodology' };
      default:
        return null;
    }
  };

  const interblend = getInterblendForSlide(currentSlide);

  const handleInterblendClick = () => {
    if (interblend) {
      soundFX.playClick();
      onNavigateToModule(interblend.tab);
    }
  };

  // Render individual slide content
  const renderSlideContent = () => {
    switch (currentSlide) {
      case 0: // Slide 1: Title & Team
        return (
          <div className="space-y-6 text-center max-w-5xl mx-auto my-auto py-2">
            <div className="inline-flex items-center space-x-2 bg-surface-peach border-2 border-ink px-4 py-1.5 rounded-full shadow-[2px_2px_0_#2B211B] text-xs font-mono font-black text-ink uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-brand-strong" />
              <span>Computational Genetics Project Defense &bull; Team 4</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-ink tracking-tight leading-tight">
              An AI-Driven 4D Digital Cell for Multiscale Genome-to-Phenotype Simulation, Cellular State Prediction and In-Silico Genetic Perturbation
            </h1>

            <p className="text-sm md:text-base text-ink-secondary font-medium max-w-3xl mx-auto leading-relaxed">
              Connecting high-dimensional transcriptomics to interpretable machine-learning classifiers, counterfactual in-silico perturbations, and interactive spatio-temporal 4D cellular visualization.
            </p>

            {/* Team Members Grid */}
            <div className="pt-4 border-t-2 border-ink grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              {[
                { name: 'R. Sanjay', id: '192422094', role: 'Machine Learning' },
                { name: 'M. Balaji', id: '192422050', role: 'Full-Stack & Systems' },
                { name: 'Sk Khadhir Ahamad', id: '192520045', role: 'Data Analysis' },
                { name: 'I. Mohamed Yaqub', id: '1920260024', role: 'Biological Visualization' }
              ].map((member) => (
                <div key={member.id} className="neo-panel p-4 bg-surface-raised border-2 border-ink shadow-[3px_3px_0_#2B211B]">
                  <div className="text-[10px] font-mono font-bold text-brand-strong uppercase">{member.role}</div>
                  <div className="text-sm md:text-base font-black text-ink">{member.name}</div>
                  <div className="text-xs font-mono text-ink-secondary font-bold">ID: {member.id}</div>
                </div>
              ))}
            </div>

            {/* Faculty Guide */}
            <div className="inline-block bg-highlight-yellow border-2 border-ink px-6 py-2.5 rounded-lg shadow-[2.5px_2.5px_0_#2B211B]">
              <span className="text-xs font-bold text-ink-secondary">Guided by: </span>
              <span className="text-sm md:text-base font-black text-ink">A. Swathi</span>
            </div>
          </div>
        );

      case 1: // Slide 2: Aim of the Project
        return (
          <div className="space-y-6 max-w-5xl mx-auto my-auto py-2">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-2">Research Directive</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-ink tracking-tight">Aim of the Project</h2>
              <p className="text-sm md:text-base text-ink-secondary font-medium mt-1">Core computational biology intentions and research roadmap</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Develop 4D Digital Cell Model', desc: 'To construct an AI-driven 4D digital cell model that bridges spatial geometry with temporal state evolution.', icon: Layers },
                { title: 'Connect Genetics to Functions', desc: 'To connect high-throughput genetic information (scRNA-seq expression) with cellular phenotype functions.', icon: Dna },
                { title: 'Simulate Cellular Changes Over Time', desc: 'To simulate cellular transitions and timepoint progressions in multi-dimensional space.', icon: Activity },
                { title: 'Predict Cellular States with AI', desc: 'To predict complex cellular states using supervised and interpretable machine learning classifiers.', icon: Cpu },
                { title: 'In-Silico Genetic Perturbation', desc: 'To study the downstream phenotypic effects of genetic modifications through computer-based in-silico simulations.', icon: Zap }
              ].map((item, idx) => (
                <div key={idx} className="neo-panel p-4 md:p-5 bg-surface-raised border-2 border-ink shadow-neo-sm flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-surface-recessed text-brand-strong border-2 border-ink shadow-[2px_2px_0_#2B211B] shrink-0 mt-0.5">
                    <item.icon className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-ink">{item.title}</h3>
                    <p className="text-xs md:text-sm text-ink-secondary font-medium mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2: // Slide 3: Introduction
        return (
          <div className="space-y-5 max-w-5xl mx-auto my-auto py-2">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-2">Biological & Computational Context</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-ink tracking-tight">Introduction</h2>
              <p className="text-sm md:text-base text-ink-secondary font-medium mt-1">Foundational principles uniting genetics, artificial intelligence, and cellular simulation</p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm md:text-base text-ink font-medium leading-relaxed">
              <div className="neo-panel p-4 md:p-5 bg-surface-raised border-2 border-ink shadow-neo-sm flex items-start space-x-3.5">
                <span className="w-7 h-7 rounded-full bg-brand text-ink border border-ink flex items-center justify-center font-black text-xs shrink-0 mt-0.5">1</span>
                <p>
                  <strong>The Cell as the Basic Unit of Life:</strong> Every cell contains genes that control its activities, such as growth, energy production, and protein formation. Changes in gene expression directly alter cellular state and can drive pathological conditions.
                </p>
              </div>

              <div className="neo-panel p-4 md:p-5 bg-surface-raised border-2 border-ink shadow-neo-sm flex items-start space-x-3.5">
                <span className="w-7 h-7 rounded-full bg-brand text-ink border border-ink flex items-center justify-center font-black text-xs shrink-0 mt-0.5">2</span>
                <p>
                  <strong>AI & Machine Learning in Biology:</strong> Artificial Intelligence and Machine Learning enable researchers to decipher non-linear gene regulatory networks and predict cell fate decisions from high-dimensional transcriptome vectors.
                </p>
              </div>

              <div className="neo-panel p-4 md:p-5 bg-surface-raised border-2 border-ink shadow-neo-sm flex items-start space-x-3.5">
                <span className="w-7 h-7 rounded-full bg-brand text-ink border border-ink flex items-center justify-center font-black text-xs shrink-0 mt-0.5">3</span>
                <p>
                  <strong>What is a 4D Digital Cell?</strong> A computer-based model representing cellular morphology and transcriptional state changes over time. The 4 dimensions combine <strong>3D spatial cellular geometry</strong> with the <strong>4th temporal dimension</strong> of developmental progression.
                </p>
              </div>

              <div className="neo-panel p-4 md:p-5 bg-surface-raised border-2 border-ink shadow-neo-sm flex items-start space-x-3.5">
                <span className="w-7 h-7 rounded-full bg-brand text-ink border border-ink flex items-center justify-center font-black text-xs shrink-0 mt-0.5">4</span>
                <p>
                  <strong>In-Silico Research Acceleration:</strong> Developing a computational framework to predict cellular responses to genetic modification empowers hypotheses formulation prior to expensive wet-lab experimentation.
                </p>
              </div>
            </div>
          </div>
        );

      case 3: // Slide 4: Scope of the Project
        return (
          <div className="space-y-6 max-w-5xl mx-auto my-auto py-2">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-2">Project Boundaries</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-ink tracking-tight">Scope of the Project</h2>
              <p className="text-sm md:text-base text-ink-secondary font-medium mt-1">Application scope and practical research horizons</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Transcriptome Analysis', desc: 'Systematically process and analyze high-throughput gene-expression matrices from experimental databases to quantify cellular dynamics.', icon: Dna },
                { title: 'Cellular State Prediction', desc: 'Predict cellular differentiation stages, cell types, and pathological phenotypes using supervised Machine Learning algorithms.', icon: Target },
                { title: 'Genome-to-Phenotype Mapping', desc: 'Uncover statistical correlations and predictive linkages between specific transcriptional markers and observable cellular characteristics.', icon: Compass },
                { title: 'Counterfactual Perturbation', desc: 'Simulate the in-silico effects of gene knockouts, down-regulations, and over-expressions on state distribution probabilities.', icon: Zap },
                { title: 'Translational Discovery Support', desc: 'Support early-stage translational research, target prioritization for disease studies, and computational screening.', icon: ShieldCheck }
              ].map((scope, idx) => (
                <div key={idx} className="neo-panel p-4 md:p-5 bg-surface-raised border-2 border-ink shadow-neo-sm flex items-start space-x-3.5">
                  <div className="p-2.5 bg-surface-recessed text-brand-strong rounded-lg border border-ink shadow-[1px_1px_0_#2B211B] shrink-0 mt-0.5">
                    <scope.icon className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-ink">{scope.title}</h3>
                    <p className="text-xs md:text-sm text-ink-secondary font-medium mt-1 leading-relaxed">{scope.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 4: // Slide 5: Objectives
        return (
          <div className="space-y-5 max-w-5xl mx-auto my-auto py-2">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-2">Operational Milestones</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-ink tracking-tight">Project Objectives</h2>
              <p className="text-sm md:text-base text-ink-secondary font-medium mt-1">Six primary scientific objectives accomplished by the platform</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { step: '01', title: 'Collect Biological Data', desc: 'Obtain gene-expression and cell metadata from public repositories (NCBI GEO & 10x Genomics).' },
                { step: '02', title: 'Analyze Gene Activity', desc: 'Employ rigorous QC filters, normalization, and statistical analysis to uncover expression patterns.' },
                { step: '03', title: 'Predict Cellular States', desc: 'Train and validate machine learning classifiers to predict cellular state phenotypes.' },
                { step: '04', title: 'Simulate Perturbations', desc: 'Execute in-silico simulations modifying expression levels of selected target genes.' },
                { step: '05', title: 'Connect Genes to Phenotypes', desc: 'Establish statistical associations and feature importance rankings between genes and phenotypes.' },
                { step: '06', title: 'Visualize in 4D', desc: 'Render 3D cellular compartments, organelles, and temporal trajectories in real-time WebGL.' }
              ].map((obj) => (
                <div key={obj.step} className="neo-panel p-4 md:p-5 bg-surface-raised border-2 border-ink shadow-neo-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-brand-strong px-2 py-0.5 bg-surface-recessed border border-ink rounded">
                      STEP {obj.step}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-brand-strong stroke-[2.5]" />
                  </div>
                  <h3 className="text-sm md:text-base font-black text-ink">{obj.title}</h3>
                  <p className="text-xs md:text-sm text-ink-secondary font-medium leading-relaxed">{obj.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 5: // Slide 6: Module 1 — Biological Data Collection and Preparation
        return (
          <div className="space-y-5 max-w-5xl mx-auto my-auto py-2">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-2">Architecture &bull; Module 1</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-ink tracking-tight">Biological Data Collection & Preparation</h2>
              <p className="text-sm md:text-base text-ink-secondary font-medium mt-1">Acquisition, quality control filtering, and preprocessing pipeline</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="neo-panel p-5 md:p-6 bg-surface-raised border-2 border-ink shadow-neo-md space-y-3">
                <h3 className="text-base font-black text-ink flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-strong" />
                  Implementation Workflow
                </h3>
                <ul className="space-y-2.5 text-xs md:text-sm font-medium text-ink-secondary">
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                    <span>Collect real gene-expression data from NCBI GEO and 10x Genomics benchmark datasets.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                    <span>Download and organize dense expression matrices and metadata annotations using Python.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                    <span>Filter empty droplets, handle missing values, and normalize library sizes with Pandas.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                    <span>Calculate whole-transcriptome QC metrics: library size, detected genes, and mitochondrial percentage.</span>
                  </li>
                </ul>
              </div>

              <div className="neo-panel p-5 md:p-6 bg-surface-orange-wash border-2 border-ink shadow-neo-md space-y-3">
                <h3 className="text-base font-black text-ink flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-strong" />
                  Active Benchmark Data
                </h3>
                <div className="space-y-2.5 text-xs md:text-sm font-mono text-ink">
                  <div className="p-3 bg-surface-raised rounded border border-ink">
                    <span className="text-ink-secondary font-bold block">Dataset:</span>
                    <strong className="text-brand-strong">10x Genomics PBMC 3k Viable scRNA-seq</strong>
                  </div>
                  <div className="p-3 bg-surface-raised rounded border border-ink">
                    <span className="text-ink-secondary font-bold block">QC Standards:</span>
                    <span>Counts &ge; 500, Detected Genes &ge; 200, Mito &le; 5.0%</span>
                  </div>
                  <div className="p-3 bg-surface-raised rounded border border-ink">
                    <span className="text-ink-secondary font-bold block">Features:</span>
                    <span>80 Canonical Informative Marker Genes &bull; 250 Viable Benchmark Cells</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 6: // Slide 7: Module 2 — AI-Based Gene Expression Analysis & State Prediction
        return (
          <div className="space-y-5 max-w-5xl mx-auto my-auto py-2">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-2">Architecture &bull; Module 2</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-ink tracking-tight">AI-Based Gene Expression Analysis & State Prediction</h2>
              <p className="text-sm md:text-base text-ink-secondary font-medium mt-1">Supervised Machine Learning classification and feature importance discovery</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="neo-panel p-5 bg-surface-raised border-2 border-ink shadow-neo-sm space-y-2">
                <span className="font-mono text-[10px] font-bold text-brand-strong uppercase">Step 1 &bull; Exploration</span>
                <h3 className="text-base font-black text-ink">Expression Profiling</h3>
                <p className="text-xs md:text-sm text-ink-secondary leading-relaxed">
                  Analyze expression distributions across genes and clusters. Visualize high-dimensional separation via PCA and UMAP projections.
                </p>
              </div>

              <div className="neo-panel p-5 bg-surface-raised border-2 border-ink shadow-neo-sm space-y-2">
                <span className="font-mono text-[10px] font-bold text-brand-strong uppercase">Step 2 &bull; Model Training</span>
                <h3 className="text-base font-black text-ink">Random Forest Classifier</h3>
                <p className="text-xs md:text-sm text-ink-secondary leading-relaxed">
                  Partition data into 80/20 train/test splits. Train ensemble decision forests to predict cell state phenotypes with cross-validation.
                </p>
              </div>

              <div className="neo-panel p-5 bg-surface-raised border-2 border-ink shadow-neo-sm space-y-2">
                <span className="font-mono text-[10px] font-bold text-brand-strong uppercase">Step 3 &bull; Rigorous Evaluation</span>
                <h3 className="text-base font-black text-ink">Held-Out Metrics</h3>
                <p className="text-xs md:text-sm text-ink-secondary leading-relaxed">
                  Evaluate models using Accuracy, Macro-F1, ROC-AUC, Balanced Accuracy, and Gini feature importance to ensure no data leakage.
                </p>
              </div>
            </div>

            <div className="neo-panel p-4 bg-highlight-cream border-2 border-ink text-xs md:text-sm text-ink flex items-center gap-3 shadow-neo-sm">
              <ShieldCheck className="w-5 h-5 text-brand-deep shrink-0 stroke-[2.5]" />
              <p className="font-mono text-xs md:text-sm font-bold">
                Transparent label provenance: cell states are audited as computational heuristics with documented concordance metrics to prevent circular evaluation.
              </p>
            </div>
          </div>
        );

      case 7: // Slide 8: Module 3 — Genetic Perturbation, Simulation & 4D Visualization
        return (
          <div className="space-y-5 max-w-5xl mx-auto my-auto py-2">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-2">Architecture &bull; Module 3</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-ink tracking-tight">Genetic Perturbation, Simulation & 4D Visualization</h2>
              <p className="text-sm md:text-base text-ink-secondary font-medium mt-1">In-silico counterfactual simulation of genetic interventions</p>
            </div>

            <div className="neo-panel p-5 md:p-6 bg-surface-raised border-2 border-ink shadow-neo-md space-y-4">
              <h3 className="text-base font-black text-ink flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-strong" />
                In-Silico Genetic Perturbation Workflow
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs md:text-sm">
                <div className="p-3.5 bg-surface-recessed rounded-lg border border-ink space-y-1">
                  <span className="font-mono font-bold text-brand-strong block">1. Select Target Gene</span>
                  <p className="text-ink-secondary">Choose any marker (e.g. CD4, CD8A, CD14, POU5F1) from expression matrix.</p>
                </div>
                <div className="p-3.5 bg-surface-recessed rounded-lg border border-ink space-y-1">
                  <span className="font-mono font-bold text-brand-strong block">2. Set Intervention</span>
                  <p className="text-ink-secondary">Simulate Complete Knockout, Down-regulation, or Up-regulation with custom factor.</p>
                </div>
                <div className="p-3.5 bg-surface-recessed rounded-lg border border-ink space-y-1">
                  <span className="font-mono font-bold text-brand-strong block">3. Model Prediction</span>
                  <p className="text-ink-secondary">Pass modified vectors through trained model to compute state transition probabilities.</p>
                </div>
                <div className="p-3.5 bg-surface-recessed rounded-lg border border-ink space-y-1">
                  <span className="font-mono font-bold text-brand-strong block">4. Quantify Impact</span>
                  <p className="text-ink-secondary">Audit cells transitioned, delta distributions, and visualize dynamic shifts in 3D/4D.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface-orange-wash border-2 border-ink rounded-lg text-xs md:text-sm font-mono font-bold text-brand-deep shadow-neo-sm">
              MANDATORY SCIENTIFIC NOTICE: Model-based counterfactual simulation — indicates computational model behavior, not proof of a causal biological effect.
            </div>
          </div>
        );

      case 8: // Slide 9: Module 4 — 4D Cellular Visualization Architecture
        return (
          <div className="space-y-5 max-w-5xl mx-auto my-auto py-2">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-2">Architecture &bull; Module 4</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-ink tracking-tight">4D Cellular Visualization Architecture</h2>
              <p className="text-sm md:text-base text-ink-secondary font-medium mt-1">Interactive WebGL viewport with authentic subcellular biology</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="neo-panel p-5 bg-surface-raised border-2 border-ink shadow-neo-sm space-y-2">
                <h3 className="text-base font-black text-ink flex items-center gap-1.5">
                  <Compass className="w-5 h-5 text-brand-strong" />
                  Multiple Cell Models
                </h3>
                <p className="text-xs md:text-sm text-ink-secondary leading-relaxed">
                  Toggle between <strong>Lymphocyte (PBMC)</strong>, <strong>Eukaryotic Organelle Atlas</strong>, <strong>Macrophage</strong>, and <strong>3D Manifold</strong> modes.
                </p>
              </div>

              <div className="neo-panel p-5 bg-surface-raised border-2 border-ink shadow-neo-sm space-y-2">
                <h3 className="text-base font-black text-ink flex items-center gap-1.5">
                  <Eye className="w-5 h-5 text-brand-strong" />
                  Cutaway & Organelles
                </h3>
                <p className="text-xs md:text-sm text-ink-secondary leading-relaxed">
                  3/4 and sagittal cross-sections reveal internal organelles: Mitochondria, Endoplasmic Reticulum, Golgi complex, and Nucleus with interactive inspector.
                </p>
              </div>

              <div className="neo-panel p-5 bg-surface-raised border-2 border-ink shadow-neo-sm space-y-2">
                <h3 className="text-base font-black text-ink flex items-center gap-1.5">
                  <Activity className="w-5 h-5 text-brand-strong" />
                  Spatio-Temporal Semantics
                </h3>
                <p className="text-xs md:text-sm text-ink-secondary leading-relaxed">
                  Transparent provenance: longitudinal trajectories are enabled only when experimental time series exist; cross-sectional snapshots are explicitly badged.
                </p>
              </div>
            </div>

            <div className="neo-panel p-4 bg-surface-raised border-2 border-ink shadow-neo-sm">
              <h4 className="text-xs md:text-sm font-black text-ink mb-2">Real-time Overlay Modes:</h4>
              <div className="flex flex-wrap gap-2 text-xs md:text-sm font-mono font-bold">
                <span className="px-3 py-1 bg-brand text-ink border border-ink rounded shadow-[1px_1px_0_#2B211B]">Cell State Phenotype</span>
                <span className="px-3 py-1 bg-surface-peach text-ink border border-ink rounded shadow-[1px_1px_0_#2B211B]">Gene Expression Gradient</span>
                <span className="px-3 py-1 bg-[#C026D3] text-white border border-ink rounded shadow-[1px_1px_0_#2B211B]">Perturbation Shift Vector</span>
              </div>
            </div>
          </div>
        );

      case 9: // Slide 10: Methodology
        return (
          <div className="space-y-4 max-w-5xl mx-auto my-auto py-1">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-1">Systematic Workflow</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-ink tracking-tight">Computational Methodology Pipeline</h2>
              <p className="text-xs sm:text-sm md:text-base text-ink-secondary font-medium">10 sequential stages connecting raw biological sequences to interactive 4D outputs</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              {[
                { n: '1', title: 'Data Collection', desc: 'NCBI GEO / 10x Genomics benchmark datasets.' },
                { n: '2', title: 'Data Preparation', desc: 'Quality control, droplet filtering & normalization.' },
                { n: '3', title: 'Expression Analysis', desc: 'Differential expression & PCA/UMAP embedding.' },
                { n: '4', title: 'Model Training', desc: 'Random Forest classifiers on 80/20 train/test splits.' },
                { n: '5', title: 'State Prediction', desc: 'Supervised phenotype state probability inference.' },
                { n: '6', title: 'Genetic Perturbation', desc: 'In-silico knockouts, up/down-regulation shifts.' },
                { n: '7', title: 'Result Comparison', desc: 'Quantify delta distributions and cell transitions.' },
                { n: '8', title: '4D Visualization', desc: 'Interactive Three.js WebGL cellular viewport.' },
                { n: '9', title: 'Model Evaluation', desc: 'Macro-F1, ROC-AUC, Gini importance metrics.' },
                { n: '10', title: 'Conclusion & Audit', desc: 'Formal reports, provenance caveats & JSON exports.' }
              ].map((step) => (
                <div key={step.n} className="neo-panel p-3 bg-surface-raised border-2 border-ink shadow-[2px_2px_0_#2B211B] flex flex-col justify-between">
                  <div>
                    <span className="w-5 h-5 rounded-full bg-brand text-ink border border-ink flex items-center justify-center font-mono font-black text-[10px] mb-1.5">
                      {step.n}
                    </span>
                    <h4 className="text-xs md:text-sm font-black text-ink leading-tight">{step.title}</h4>
                  </div>
                  <p className="text-[10px] md:text-xs text-ink-secondary font-medium mt-1 leading-snug">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 10: // Slide 11: Possible Results and Outcomes
        return (
          <div className="space-y-5 max-w-5xl mx-auto my-auto py-2">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-2">Deliverables & Evidence</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-ink tracking-tight">Possible Results & Outcomes</h2>
              <p className="text-sm md:text-base text-ink-secondary font-medium mt-1">Demonstrated scientific outputs and system verification</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Standardized Clean scRNA-seq Datasets', desc: 'Reproducible benchmark datasets with full whole-transcriptome QC: library sizes, detected genes, and mitochondrial percentages.', badge: 'Data Lab Output' },
                { title: 'Phenotype Expression Mapping', desc: 'Identified canonical marker genes and cluster expressions through interactive high-resolution scatterplots and tables.', badge: 'Cell Atlas Output' },
                { title: 'Validated State Prediction Models', desc: 'Trained Random Forest models providing robust Macro-F1, ROC-AUC, and feature importance without data leakage.', badge: 'State Predictor Output' },
                { title: 'In-Silico Perturbation Audit Trails', desc: 'Computed exact cell transition percentages and shift distributions following in-silico genetic interventions.', badge: 'Perturbation Lab Output' },
                { title: 'Interactive 4D Spatio-Temporal Viewer', desc: 'Real-time WebGL rendering of biological organelles, receptor microvilli, cutaway views, and single-cell particles.', badge: '4D Digital Cell Output' },
                { title: 'Comprehensive Verification Reports', desc: 'Exportable Markdown and JSON research summaries with complete scientific provenance and limitations.', badge: 'Validation Reports Output' }
              ].map((item, idx) => (
                <div key={idx} className="neo-panel p-4 md:p-5 bg-surface-raised border-2 border-ink shadow-neo-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-brand-strong bg-surface-recessed px-2 py-0.5 rounded border border-ink">
                      {item.badge}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-brand-strong stroke-[2.5]" />
                  </div>
                  <h3 className="text-base font-black text-ink">{item.title}</h3>
                  <p className="text-xs md:text-sm text-ink-secondary font-medium leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 11: // Slide 12: Conclusion
        return (
          <div className="space-y-5 max-w-5xl mx-auto my-auto py-2">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-2">Research Synthesis</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-ink tracking-tight">Conclusion</h2>
              <p className="text-sm md:text-base text-ink-secondary font-medium mt-1">Summary of project contributions and responsible computational biology commitments</p>
            </div>

            <div className="neo-panel p-5 md:p-6 bg-surface-raised border-2 border-ink shadow-neo-md space-y-3.5 text-xs sm:text-sm md:text-base text-ink font-medium leading-relaxed">
              <p>
                <strong>Computational Representation of Cellular Behavior:</strong> An AI-driven 4D digital cell represents a powerful, extensible framework to simulate cellular states and study how genetic modifications propagate to cellular phenotypes.
              </p>
              <p>
                <strong>Bridging Genes to Phenotypes:</strong> Machine learning algorithms enable researchers to uncover complex, non-linear relationships across high-dimensional transcriptomic datasets and predict cell fate transitions.
              </p>
              <p>
                <strong>Scientific Integrity & Verification:</strong> Computational predictions—especially in-silico counterfactuals—provide valuable research hypotheses to prioritize wet-lab experiments, but must never be confused with experimental confirmation.
              </p>
              <p>
                <strong>Future Evolution:</strong> Future research will integrate multi-omics data (epigenomics, spatial transcriptomics, proteomics) and biophysical kinetic models to enrich cellular dynamics.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs md:text-sm font-mono font-bold">
              <div className="p-3 bg-surface-recessed border-2 border-ink rounded-lg shadow-[2px_2px_0_#2B211B]">
                <strong className="block text-brand-strong text-xl">100%</strong>
                <span>Open-Source & Local</span>
              </div>
              <div className="p-3 bg-surface-recessed border-2 border-ink rounded-lg shadow-[2px_2px_0_#2B211B]">
                <strong className="block text-brand-strong text-xl">4D</strong>
                <span>Spatio-Temporal Viewport</span>
              </div>
              <div className="p-3 bg-surface-recessed border-2 border-ink rounded-lg shadow-[2px_2px_0_#2B211B]">
                <strong className="block text-brand-strong text-xl">Zero</strong>
                <span>Fabricated Data</span>
              </div>
            </div>
          </div>
        );

      case 12: // Slide 13: Literature Review
        return (
          <div className="space-y-4 max-w-5xl mx-auto my-auto py-1">
            <div>
              <span className="neo-badge bg-surface-peach text-brand-strong mb-1">Theoretical Foundations</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-ink tracking-tight">Literature Review & Research Gap</h2>
              <p className="text-xs sm:text-sm md:text-base text-ink-secondary font-medium">Foundational research underpinning the AI-Driven 4D Digital Cell workstation</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm">
              {[
                { title: 'Digital Cell Modeling', desc: 'Pioneering work in whole-cell computational models (e.g., Karr et al., Cell 2012) demonstrated the feasibility of simulating cellular processes across molecular layers.' },
                { title: 'Artificial Intelligence in Biology', desc: 'Deep learning and tree ensembles (e.g., Jumper et al., Nature 2021; Theodoris et al., Nature 2023) excel at predicting molecular states from genomic sequences and expression profiles.' },
                { title: 'Genome-to-Phenotype Research', desc: 'Studies exploring transcriptional programs show how coordinated gene networks dictate observable cellular behaviors and disease vulnerability.' },
                { title: 'Single-Cell Analysis', desc: 'Droplet scRNA-seq (Zheng et al., Nature Communications 2017) revealed profound cellular heterogeneity that bulk sequencing obscured.' },
                { title: 'In-Silico Perturbation Modeling', desc: 'Tools like scGen, CellOracle, and GEARS demonstrate how models predict out-of-distribution gene knockout outcomes.' },
                { title: 'Identified Research Gap', desc: 'A major challenge remains: unifying statistical expression vectors, machine learning state inference, and authentic 4D cellular anatomical visualization into an open, reproducible workstation.' }
              ].map((lit, idx) => (
                <div key={idx} className="neo-panel p-3.5 bg-surface-raised border-2 border-ink shadow-[2px_2px_0_#2B211B] space-y-1">
                  <h4 className="text-xs md:text-sm font-black text-ink flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-brand-strong stroke-[2.5]" />
                    {lit.title}
                  </h4>
                  <p className="text-[11px] md:text-xs text-ink-secondary font-medium leading-relaxed">{lit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#FFFDF9] text-ink flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
      {/* Slide Top Banner: Embedded College Logos in Corners & Integrated Slide Controls */}
      <div className="w-full px-6 sm:px-10 md:px-14 pt-4 sm:pt-6 pb-2 flex items-center justify-between gap-4 shrink-0 border-b border-ink/10">
        {/* Top-Left: SIMATS Engineering College Logo directly on slide canvas */}
        <div className="flex items-center space-x-3.5 shrink-0">
          <img
            src={simatsLogo}
            alt="SIMATS Engineering Logo"
            className="h-14 sm:h-16 md:h-20 w-auto object-contain select-none filter drop-shadow-sm"
          />
          <div className="hidden sm:flex flex-col">
            <span className="text-xs sm:text-sm font-black text-ink uppercase tracking-wider leading-tight">
              SIMATS Engineering
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-ink-secondary font-bold">
              Saveetha University &bull; Dept. of Genetics
            </span>
          </div>
        </div>

        {/* Center: Slide Category Badge & Interblend Button */}
        <div className="flex flex-col items-center justify-center space-y-1.5 text-center">
          <div className="inline-flex items-center space-x-2 bg-surface-peach border-2 border-ink px-3.5 py-1 rounded-full shadow-[2px_2px_0_#2B211B] text-[10px] sm:text-xs font-mono font-black text-ink uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-brand-strong" />
            <span>Project Defense &bull; Slide {String(currentSlide + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}</span>
          </div>

          {interblend && (
            <button
              onClick={handleInterblendClick}
              className="neo-primary hidden md:flex items-center space-x-1.5 text-xs px-3.5 py-1 font-black bg-brand hover:bg-[#FF8128] text-ink border-2 border-ink shadow-[2px_2px_0_#2B211B] transition hover:translate-x-0.5"
              title={`Jump into live workstation module: ${interblend.label}`}
            >
              <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{interblend.action}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Top-Right: Slide Controls + Saveetha University Seal directly on slide canvas */}
        <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
          {/* Slide Control Bar */}
          <div className="flex items-center space-x-1.5 bg-surface-raised border-2 border-ink p-1 rounded-lg shadow-[2px_2px_0_#2B211B]">
            {/* Sound FX Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-1.5 rounded transition ${
                isMuted ? 'text-ink-muted' : 'text-brand-strong hover:bg-surface-peach'
              }`}
              title={isMuted ? 'Sound Muted (Click to Unmute)' : 'Sound Active (Click to Mute)'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 stroke-[2.5]" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-surface-peach rounded text-ink transition"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 stroke-[2.5]" /> : <Maximize2 className="w-4 h-4 stroke-[2.5]" />}
            </button>

            {/* Presentation Mode Toggle Button (Click to Exit) */}
            <button
              onClick={() => {
                soundFX.playExitPresentation();
                onClose();
              }}
              className="flex items-center space-x-1.5 text-xs px-2.5 py-1 bg-brand hover:bg-[#FF8128] text-ink border border-ink rounded font-black shadow-[1.5px_1.5px_0_#2B211B] transition hover:-translate-y-0.5"
              title="Exit Presentation Mode (Press P or Esc)"
            >
              <Tv className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden lg:inline">Presentation Mode</span>
              <span className="px-1 py-0.2 bg-ink text-surface-raised text-[9px] font-mono rounded font-black">ON</span>
            </button>
          </div>

          {/* Saveetha University Seal */}
          <div className="flex items-center space-x-2.5">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs sm:text-sm font-black text-ink uppercase tracking-wider leading-tight">SAVEETHA</span>
              <span className="text-[10px] font-mono text-ink-secondary font-bold">Institute of Medical & Tech</span>
            </div>
            <img
              src={saveethaSeal}
              alt="Saveetha Institute Seal"
              className="h-14 sm:h-16 md:h-20 w-auto object-contain select-none filter drop-shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Slide Canvas — Seamless Full Viewport, NO nested card window */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 md:px-14 py-4 flex flex-col justify-center overflow-y-auto">
        <div
          key={currentSlide}
          className={`w-full flex-1 flex flex-col justify-center ${
            slideDirection === 'next' ? 'animate-slide-next' : 'animate-slide-prev'
          }`}
        >
          {renderSlideContent()}
        </div>
      </main>

      {/* Slide Footer: Slim Integrated Navigation Bar */}
      <footer className="w-full shrink-0 z-30">
        {/* Slide Progress Line */}
        <div className="w-full h-1.5 bg-surface-recessed border-t-2 border-b-2 border-ink">
          <div
            className="h-full bg-brand transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Bottom Integrated Navigation Strip */}
        <div className="w-full px-6 sm:px-12 py-3 flex items-center justify-between gap-4 bg-surface-raised border-t-2 border-ink shadow-neo-sm">
          {/* Previous Slide Button */}
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="neo-secondary flex items-center space-x-2 text-xs sm:text-sm px-4 py-2 font-bold disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Previous</span>
            <span className="hidden sm:inline text-[10px] font-mono text-ink-muted">(&larr;)</span>
          </button>

          {/* Slide Selector Strip (Pills 1 to 13) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto py-1 max-w-xl">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => jumpToSlide(idx)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md text-xs font-mono font-bold border-2 transition-all flex items-center justify-center shrink-0 ${
                  currentSlide === idx
                    ? 'bg-brand text-ink border-ink font-black shadow-[2px_2px_0_#2B211B] scale-110 -translate-y-0.5'
                    : 'bg-surface text-ink-secondary border-ink hover:bg-surface-peach'
                }`}
                title={`Slide ${idx + 1}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Next Slide Button */}
          <button
            onClick={nextSlide}
            disabled={currentSlide === totalSlides - 1}
            className="neo-primary flex items-center space-x-2 text-xs sm:text-sm px-5 py-2 font-black bg-brand hover:bg-[#FF8128] text-ink disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline text-[10px] font-mono text-ink">(&rarr; / Space)</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

