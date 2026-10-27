import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { CellSceneData, SceneParticle } from '../types';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Eye,
  Info,
  Maximize2,
  Sparkles,
  Layers,
  AlertTriangle,
  Sliders,
  CheckSquare,
  Square,
  HelpCircle,
  X,
  Compass,
  Cpu,
  Activity
} from 'lucide-react';

export type CellModelType = 'lymphocyte' | 'eukaryotic' | 'macrophage' | 'stem_cell' | 'manifold';
export type CutawayMode = 'cutaway_3_4' | 'cutaway_half' | 'intact' | 'ghost' | 'wireframe';

interface ThreeDCellViewerProps {
  sceneData: CellSceneData | null;
  activeGene?: string;
  overlayMode: 'cell_state' | 'gene_expression' | 'perturbation';
  onSelectParticle?: (particle: SceneParticle | null) => void;
  selectedParticle?: SceneParticle | null;
  initialModelType?: CellModelType;
}

// Biological Organelle Metadata Catalog
export interface OrganelleInfo {
  id: string;
  name: string;
  subtitle: string;
  functionDesc: string;
  volumeFraction: string;
  markerGenes: string[];
  keyMolecules: string[];
  color: string;
}

export const ORGANELLE_CATALOG: Record<string, OrganelleInfo> = {
  nucleus: {
    id: 'nucleus',
    name: 'Nucleus & Nucleolus',
    subtitle: 'Genomic Regulation & Transcriptional Center',
    functionDesc: 'Houses chromatin, orchestrates gene transcription, and assembles ribosomal subunits in the dense nucleolus. Occupies ~70-80% of cell volume in mature circulating lymphocytes.',
    volumeFraction: '65-80% (Immune) / 10-15% (Somatic)',
    markerGenes: ['HIST1H1E', 'TOP2A', 'MKI67', 'NCL', 'FBL'],
    keyMolecules: ['Chromatin', 'RNA Polymerase II', 'Histone octamers', 'Pre-rRNA'],
    color: '#9F3800'
  },
  mitochondria: {
    id: 'mitochondria',
    name: 'Mitochondria (Chondriome)',
    subtitle: 'Cellular Respiration & Metabolic Signaling',
    functionDesc: 'Double-membrane powerhouse generating ATP via oxidative phosphorylation; regulates metabolic reprogramming during immune activation and apoptosis.',
    volumeFraction: '5-10% of cytoplasmic volume',
    markerGenes: ['MT-CO1', 'MT-ND4', 'MT-ATP6', 'PPARGC1A', 'TFAM'],
    keyMolecules: ['ATP Synthase', 'Cytochrome c', 'mtDNA', 'Cardiolipin'],
    color: '#D97706'
  },
  endoplasmic_reticulum: {
    id: 'endoplasmic_reticulum',
    name: 'Endoplasmic Reticulum (Rough & Smooth ER)',
    subtitle: 'Protein Synthesis, Folding & Calcium Dynamics',
    functionDesc: 'Continuous membrane network: Rough ER ribosomes synthesize membrane & secretory proteins (immunoglobulins, cytokines); Smooth ER synthesizes lipids and stores Ca2+.',
    volumeFraction: '8-12% of cytoplasmic volume',
    markerGenes: ['CANX', 'HSPA5', 'CALR', 'PDIA3', 'SEC61A1'],
    keyMolecules: ['BiP Chaperone', 'Translocon', 'Calreticulin', 'Ribosomes'],
    color: '#0284C7'
  },
  golgi: {
    id: 'golgi',
    name: 'Golgi Apparatus & Secretory Vesicles',
    subtitle: 'Post-Translational Sorting & Glycosylation',
    functionDesc: 'Curved stacked cisternal lamellae that modify, sort, and package proteins from the ER into secretory vesicles for exocytosis or membrane delivery.',
    volumeFraction: '3-6% of cytoplasmic volume',
    markerGenes: ['GOLGA2', 'B4GALT1', 'MAN2A1', 'ST6GAL1', 'RAB1A'],
    keyMolecules: ['Glycosyltransferases', 'COP vesicles', 'Syntaxin', 'SNAREs'],
    color: '#9333EA'
  },
  membrane: {
    id: 'membrane',
    name: 'Plasma Membrane & Surface Receptors',
    subtitle: 'Lipid Bilayer Boundary & Immune Signaling Cortex',
    functionDesc: 'Amphipathic phospholipid bilayer studded with cell-type defining surface markers (CD3, CD4, CD8, CD14, CD19, HLA-DR) and microvillar sensory protrusions.',
    volumeFraction: 'Cellular Boundary Surface (~300 µm²)',
    markerGenes: ['CD4', 'CD8A', 'CD14', 'MS4A1', 'B2M', 'HLA-DRA'],
    keyMolecules: ['Phosphatidylcholine', 'Cholesterol', 'TCR/BCR complexes', 'Integrins'],
    color: '#FF6A00'
  },
  cytoskeleton: {
    id: 'cytoskeleton',
    name: 'Cytoskeleton & Centrosome MTOC',
    subtitle: 'Microtubule Radial Network & Cortical Actin Ring',
    functionDesc: 'Dynamic filamentous polymer network providing structural integrity, immunological synapse polarization, and motor-protein intracellular transport.',
    volumeFraction: 'Structural cytoplasmic scaffold',
    markerGenes: ['ACTB', 'TUBA1A', 'TUBB', 'TUBG1', 'VIM'],
    keyMolecules: ['Alpha/Beta Tubulin', 'F-Actin', 'Dynein', 'Kinesin'],
    color: '#16A34A'
  },
  transcripts: {
    id: 'transcripts',
    name: 'Cytosolic & Nuclear Transcripts (mRNA)',
    subtitle: 'Single-Cell Transcriptomic Molecular Density',
    functionDesc: 'Individual mRNA transcript molecules and ribonucleoprotein particles localized in nucleus and cytoplasm, scaled to observed gene expression levels.',
    volumeFraction: 'Molecular distribution',
    markerGenes: ['GAPDH', 'ACTB', 'RPS18', 'Selected Active Gene'],
    keyMolecules: ['Poly(A) mRNA', 'mRNP Complexes', 'miRNA'],
    color: '#FF8128'
  }
};

// Rich, colorblind-conscious neobrutalist state palette supporting both PBMC real data and synthetic demo
export const STATE_COLORS: Record<string, number> = {
  // Real PBMC Immune Cell Types
  CD4_T_Cell: 0xFF6A00,    // Saturated Brand Orange
  CD8_T_Cell: 0x0284C7,    // Sky Blue
  B_Cell: 0x16A34A,        // Emerald Leaf Green
  NK_Cell: 0x9333EA,        // Royal Purple
  CD14_Monocyte: 0xD97706,  // Warm Amber
  Platelet: 0xC026D3,       // Vivid Magenta
  Other_Immune: 0x475569,   // Slate Ink
  T_Cell: 0xFF6A00,         // Saturated Brand Orange
  Monocyte: 0xD97706,       // Warm Amber
  Dendritic_Cell: 0x0D9488, // Teal
  Megakaryocyte: 0xBE185D,  // Rose
  // Synthetic Demo States
  Progenitor: 0xFF6A00,
  Myogenic: 0x16A34A,
  Neural: 0x6D28D9,
  Stressed: 0xDC2626,
  Default: 0xEA580C
};

export function getCleanStateKey(rawState: string): string {
  if (!rawState) return 'Default';
  const clean = rawState.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  if (STATE_COLORS[clean] !== undefined) return clean;
  // Substring checks
  const lower = rawState.toLowerCase();
  if (lower.includes('cd4')) return 'CD4_T_Cell';
  if (lower.includes('cd8')) return 'CD8_T_Cell';
  if (lower.includes('b_cell') || lower.includes('b cell')) return 'B_Cell';
  if (lower.includes('nk')) return 'NK_Cell';
  if (lower.includes('mono')) return 'CD14_Monocyte';
  if (lower.includes('platelet')) return 'Platelet';
  if (lower.includes('progenitor')) return 'Progenitor';
  if (lower.includes('myogenic')) return 'Myogenic';
  if (lower.includes('neural')) return 'Neural';
  if (lower.includes('stress')) return 'Stressed';
  return 'Default';
}

export const ThreeDCellViewer: React.FC<ThreeDCellViewerProps> = ({
  sceneData,
  activeGene,
  overlayMode,
  onSelectParticle,
  selectedParticle,
  initialModelType = 'lymphocyte'
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hoveredParticle, setHoveredParticle] = useState<SceneParticle | null>(null);

  // Biological 3D Architecture & Cutaway Controls
  const [cellModel, setCellModel] = useState<CellModelType>(initialModelType);
  const [cutawayMode, setCutawayMode] = useState<CutawayMode>('cutaway_3_4');
  const [selectedOrganelle, setSelectedOrganelle] = useState<OrganelleInfo | null>(null);
  const [showOrganelleTray, setShowOrganelleTray] = useState(false);

  // Organelle Layer Visibility Toggles
  const [layers, setLayers] = useState({
    membrane: true,
    receptors: true,
    nucleus: true,
    mitochondria: true,
    er: true,
    golgi: true,
    cytoskeleton: true,
    transcripts: true
  });

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const timepoints = sceneData?.available_timepoints || [0.0, 12.0, 24.0, 48.0];
  const activeTimepoint = timepoints[currentTimeIndex] ?? timepoints[0];

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cellGroupRef = useRef<THREE.Group | null>(null);
  const particlesMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const clickableOrganellesRef = useRef<THREE.Object3D[]>([]);

  // Camera Orbit State
  const orbitRef = useRef({
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0,
    theta: Math.PI / 3.5,
    phi: Math.PI / 3.2,
    radius: 36
  });

  // Automatic playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeIndex((prev) => (prev + 1) % timepoints.length);
    }, 1400 / playbackSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, timepoints.length]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene with warm ivory canvas
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFF8EF);
    scene.fog = new THREE.FogExp2(0xFFF8EF, 0.009);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer with antialiasing and tone mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio Lighting setup with warm editorial science atmosphere
    const ambientLight = new THREE.AmbientLight(0xFFEBD4, 1.35);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xFFFAF0, 1.8);
    mainKeyLight.position.set(22, 28, 20);
    scene.add(mainKeyLight);

    const rimLight = new THREE.DirectionalLight(0xFFB066, 1.1);
    rimLight.position.set(-20, -15, -20);
    scene.add(rimLight);

    const softFillLight = new THREE.PointLight(0xFFD2A8, 0.8, 80);
    softFillLight.position.set(-10, 20, -10);
    scene.add(softFillLight);

    // Root Cell Container Group
    const cellGroup = new THREE.Group();
    scene.add(cellGroup);
    cellGroupRef.current = cellGroup;

    // Render loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Gentle organic cellular breathing & idle rotation
      if (cellGroupRef.current) {
        cellGroupRef.current.rotation.y = elapsedTime * 0.04;
        const breath = 1.0 + Math.sin(elapsedTime * 1.2) * 0.008;
        cellGroupRef.current.scale.set(breath, breath, breath);
      }

      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  function updateCameraPosition() {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = orbitRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 0, 0);
  }

  // Build Procedural 3D Cell Architecture
  useEffect(() => {
    const cellGroup = cellGroupRef.current;
    if (!cellGroup) return;

    // Clear previous cell contents
    while (cellGroup.children.length > 0) {
      const obj = cellGroup.children[0];
      cellGroup.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((m: any) => m.dispose());
        } else {
          (obj as any).material.dispose();
        }
      }
    }
    clickableOrganellesRef.current = [];

    // If Manifold mode, we render population coordinate box & trajectories instead of cell anatomy
    if (cellModel === 'manifold') {
      buildTranscriptomicManifold(cellGroup);
      return;
    }

    // Determine cutaway angles for sphere geometry
    let phiLength = Math.PI * 2;
    let isCutaway = false;
    if (cutawayMode === 'cutaway_3_4') {
      phiLength = Math.PI * 1.5;
      isCutaway = true;
    } else if (cutawayMode === 'cutaway_half') {
      phiLength = Math.PI * 1.0;
      isCutaway = true;
    }

    // Model specific biological parameters
    const isLymphocyte = cellModel === 'lymphocyte';
    const isMacrophage = cellModel === 'macrophage';
    const isStemCell = cellModel === 'stem_cell';

    const cellRadius = isMacrophage ? 15.5 : isLymphocyte ? 13.0 : isStemCell ? 13.5 : 14.5;
    const nucleusRadius = isLymphocyte ? 9.2 : isStemCell ? 9.5 : isMacrophage ? 6.2 : 5.8;

    // ==========================================
    // 1. PLASMA MEMBRANE & RECEPTOR SURFACE
    // ==========================================
    if (layers.membrane) {
      const isWire = cutawayMode === 'wireframe';
      const isGhost = cutawayMode === 'ghost';

      const membraneGeo = new THREE.SphereGeometry(cellRadius, 48, 36, 0, phiLength, 0, Math.PI);
      const membraneMat = new THREE.MeshPhysicalMaterial({
        color: isMacrophage ? 0xFFA048 : isLymphocyte ? 0xFF8822 : 0xFFA855,
        transparent: true,
        opacity: isGhost ? 0.08 : isCutaway ? 0.28 : 0.42,
        roughness: 0.25,
        metalness: 0.05,
        transmission: isGhost ? 0.8 : 0.35,
        thickness: 1.2,
        side: THREE.DoubleSide,
        wireframe: isWire
      });
      const membraneMesh = new THREE.Mesh(membraneGeo, membraneMat);
      membraneMesh.userData = { organelleId: 'membrane' };
      cellGroup.add(membraneMesh);
      clickableOrganellesRef.current.push(membraneMesh);

      // Distinct Neobrutalist Boundary Lip
      if (isCutaway) {
        const rimGeo = new THREE.RingGeometry(nucleusRadius + 0.5, cellRadius, 32);
        const rimMat = new THREE.MeshStandardMaterial({
          color: 0xFFE1C4,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.35,
          roughness: 0.5
        });
        const cutFace1 = new THREE.Mesh(rimGeo, rimMat);
        cutFace1.rotation.y = Math.PI / 2;
        cellGroup.add(cutFace1);

        if (cutawayMode === 'cutaway_3_4') {
          const cutFace2 = new THREE.Mesh(rimGeo, rimMat);
          cutFace2.rotation.y = 0;
          cellGroup.add(cutFace2);
        }
      }

      // Surface Microvilli & Receptor Complexes (Characteristic of mature human lymphocytes & monocytes)
      if (layers.receptors && !isWire && !isGhost) {
        const receptorCount = isMacrophage ? 160 : 120;
        const microvillusGeo = new THREE.CapsuleGeometry(0.18, 0.75, 4, 8);
        const microvillusMat = new THREE.MeshStandardMaterial({
          color: isLymphocyte ? 0xFF6A00 : 0xD97706,
          roughness: 0.3,
          metalness: 0.1
        });
        const receptorMesh = new THREE.InstancedMesh(microvillusGeo, microvillusMat, receptorCount);
        const dummy = new THREE.Object3D();

        let placed = 0;
        for (let i = 0; i < receptorCount * 2 && placed < receptorCount; i++) {
          const u = Math.random();
          const v = Math.random();
          const theta = u * phiLength;
          const phi = Math.acos(2 * v - 1);

          const r = cellRadius + 0.1;
          const x = r * Math.sin(phi) * Math.cos(theta);
          const y = r * Math.sin(phi) * Math.sin(theta);
          const z = r * Math.cos(phi);

          dummy.position.set(x, y, z);
          dummy.lookAt(x * 2, y * 2, z * 2);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          receptorMesh.setMatrixAt(placed, dummy.matrix);
          placed++;
        }
        receptorMesh.instanceMatrix.needsUpdate = true;
        cellGroup.add(receptorMesh);
      }
    }

    // ==========================================
    // 2. NUCLEUS & NUCLEOLUS
    // ==========================================
    if (layers.nucleus) {
      const nucleusPhi = isCutaway ? phiLength : Math.PI * 2;
      const nucleusGeo = new THREE.SphereGeometry(nucleusRadius, 36, 28, 0, nucleusPhi, 0, Math.PI);
      const nucleusMat = new THREE.MeshStandardMaterial({
        color: 0x8A3205, // Rich terracotta brown
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0x4D1B02,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide
      });
      const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
      nucleusMesh.position.set(isMacrophage ? -1.8 : 0, 0, 0);
      nucleusMesh.userData = { organelleId: 'nucleus' };
      cellGroup.add(nucleusMesh);
      clickableOrganellesRef.current.push(nucleusMesh);

      // Dense Nucleolus (Ribosome biogenesis hub)
      const nucleolusGeo = new THREE.SphereGeometry(isStemCell ? 2.4 : 1.8, 20, 16);
      const nucleolusMat = new THREE.MeshStandardMaterial({
        color: 0x3D1100,
        roughness: 0.2,
        metalness: 0.2,
        emissive: 0x240A00,
        emissiveIntensity: 0.4
      });
      const nucleolusMesh = new THREE.Mesh(nucleolusGeo, nucleolusMat);
      nucleolusMesh.position.set(isMacrophage ? -0.8 : 1.2, 0.8, -0.6);
      nucleolusMesh.userData = { organelleId: 'nucleus' };
      cellGroup.add(nucleolusMesh);
    }

    // ==========================================
    // 3. MITOCHONDRIA (Capsule Powerhouses)
    // ==========================================
    if (layers.mitochondria) {
      const mitoCount = isLymphocyte ? 6 : isStemCell ? 5 : 10;
      const mitoGroup = new THREE.Group();
      mitoGroup.userData = { organelleId: 'mitochondria' };

      const mitoMat = new THREE.MeshStandardMaterial({
        color: 0xD97706, // Amber gold
        roughness: 0.25,
        metalness: 0.15,
        emissive: 0x864000,
        emissiveIntensity: 0.35
      });

      for (let i = 0; i < mitoCount; i++) {
        const mitoGeo = new THREE.CapsuleGeometry(0.65, 1.6, 6, 12);
        const mito = new THREE.Mesh(mitoGeo, mitoMat);

        // Distribute within cytoplasmic crescent
        const angle = (i / mitoCount) * (isCutaway ? phiLength * 0.9 : Math.PI * 2);
        const dist = nucleusRadius + 2.0 + (i % 2) * 1.2;
        const elev = ((i % 3) - 1) * 2.8;

        mito.position.set(
          Math.cos(angle) * dist,
          elev,
          Math.sin(angle) * dist
        );
        mito.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        mito.userData = { organelleId: 'mitochondria' };
        mitoGroup.add(mito);
        clickableOrganellesRef.current.push(mito);
      }
      cellGroup.add(mitoGroup);
    }

    // ==========================================
    // 4. ENDOPLASMIC RETICULUM (Folded Cisternae)
    // ==========================================
    if (layers.er && !isLymphocyte) {
      // Extensive in Eukaryotic & Macrophage models
      const erGroup = new THREE.Group();
      erGroup.userData = { organelleId: 'endoplasmic_reticulum' };

      const erMat = new THREE.MeshStandardMaterial({
        color: 0x0284C7, // Vibrant Sky Blue
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      });

      for (let fold = 0; fold < 4; fold++) {
        const erRadius = nucleusRadius + 0.8 + fold * 0.7;
        const erGeo = new THREE.TorusGeometry(erRadius, 0.22, 10, 24, Math.PI * 0.65);
        const erMesh = new THREE.Mesh(erGeo, erMat);
        erMesh.rotation.x = Math.PI / 2 + (fold * 0.15);
        erMesh.rotation.z = fold * 0.4;
        erMesh.position.set(0, -1.0 + fold * 0.6, 0);
        erMesh.userData = { organelleId: 'endoplasmic_reticulum' };
        erGroup.add(erMesh);
        clickableOrganellesRef.current.push(erMesh);
      }
      cellGroup.add(erGroup);
    }

    // ==========================================
    // 5. GOLGI APPARATUS & SECRETORY VESICLES
    // ==========================================
    if (layers.golgi) {
      const golgiGroup = new THREE.Group();
      golgiGroup.userData = { organelleId: 'golgi' };

      const golgiMat = new THREE.MeshStandardMaterial({
        color: 0x9333EA, // Royal Violet
        roughness: 0.28,
        metalness: 0.12,
        side: THREE.DoubleSide
      });

      const baseDist = nucleusRadius + 1.8;
      for (let stack = 0; stack < 4; stack++) {
        const torusRadius = 2.4 - stack * 0.3;
        const golgiGeo = new THREE.TorusGeometry(torusRadius, 0.25, 8, 20, Math.PI * 0.5);
        const golgiMesh = new THREE.Mesh(golgiGeo, golgiMat);
        golgiMesh.position.set(-baseDist - stack * 0.45, 1.2 + stack * 0.2, 1.0);
        golgiMesh.rotation.set(0.4, 0.8 + stack * 0.05, 0.2);
        golgiMesh.userData = { organelleId: 'golgi' };
        golgiGroup.add(golgiMesh);
        clickableOrganellesRef.current.push(golgiMesh);
      }

      // Budding secretory vesicles
      const vesicleGeo = new THREE.SphereGeometry(0.32, 12, 12);
      for (let v = 0; v < 6; v++) {
        const vMesh = new THREE.Mesh(vesicleGeo, golgiMat);
        vMesh.position.set(
          -baseDist - 1.8 - Math.random() * 1.5,
          0.8 + Math.random() * 2.0,
          0.5 + Math.random() * 2.0
        );
        vMesh.userData = { organelleId: 'golgi' };
        golgiGroup.add(vMesh);
      }
      cellGroup.add(golgiGroup);
    }

    // ==========================================
    // 6. CYTOSKELETON & CENTROSOME MTOC
    // ==========================================
    if (layers.cytoskeleton) {
      const cytoMat = new THREE.LineBasicMaterial({
        color: 0x16A34A,
        transparent: true,
        opacity: 0.45
      });
      const points: THREE.Vector3[] = [];
      const mtocPos = new THREE.Vector3(0, nucleusRadius + 1.0, 0);

      for (let ray = 0; ray < 24; ray++) {
        const angle1 = (ray / 24) * Math.PI * 2;
        const angle2 = ((ray % 6) / 6) * Math.PI - Math.PI / 2;
        const target = new THREE.Vector3(
          Math.cos(angle1) * Math.cos(angle2) * (cellRadius - 0.5),
          Math.sin(angle2) * (cellRadius - 0.5),
          Math.sin(angle1) * Math.cos(angle2) * (cellRadius - 0.5)
        );
        points.push(mtocPos, target);
      }

      const cytoGeo = new THREE.BufferGeometry().setFromPoints(points);
      const cytoLines = new THREE.LineSegments(cytoGeo, cytoMat);
      cytoLines.userData = { organelleId: 'cytoskeleton' };
      cellGroup.add(cytoLines);
    }

  }, [cellModel, cutawayMode, layers]);

  // Build Manifold Population Space (for viewing the 3D PCA embedding without a fake cell shell)
  function buildTranscriptomicManifold(group: THREE.Group) {
    // 3D Bounding coordinate box
    const boxGeo = new THREE.BoxGeometry(24, 24, 24);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxMat = new THREE.LineBasicMaterial({ color: 0x2B211B, transparent: true, opacity: 0.25 });
    const box = new THREE.LineSegments(boxEdges, boxMat);
    group.add(box);

    // Ground plane grid
    const grid = new THREE.GridHelper(24, 12, 0xFF6A00, 0xD4C0AA);
    grid.position.y = -12;
    group.add(grid);

    // Coordinate axis indicator arrows
    const dirX = new THREE.Vector3(1, 0, 0);
    const dirY = new THREE.Vector3(0, 1, 0);
    const dirZ = new THREE.Vector3(0, 0, 1);
    const origin = new THREE.Vector3(-12, -12, -12);

    group.add(new THREE.ArrowHelper(dirX, origin, 5, 0xFF6A00, 1.2, 0.8));
    group.add(new THREE.ArrowHelper(dirY, origin, 5, 0x16A34A, 1.2, 0.8));
    group.add(new THREE.ArrowHelper(dirZ, origin, 5, 0x0284C7, 1.2, 0.8));
  }

  // Update Particles (Single-Cell Bodies or Transcripts)
  useEffect(() => {
    const scene = sceneRef.current;
    const cellGroup = cellGroupRef.current;
    if (!scene || !cellGroup || !sceneData || sceneData.particles.length === 0) return;

    if (particlesMeshRef.current) {
      cellGroup.remove(particlesMeshRef.current);
      particlesMeshRef.current.geometry.dispose();
      particlesMeshRef.current = null;
    }

    if (!layers.transcripts) return;

    const particles = sceneData.particles;
    const count = particles.length;

    // Rich, specular sphere geometry for single cells / transcripts
    const particleRadius = cellModel === 'manifold' ? 0.45 : 0.32;
    const sphereGeo = new THREE.SphereGeometry(particleRadius, 14, 14);
    const instancedMat = new THREE.MeshStandardMaterial({
      roughness: 0.25,
      metalness: 0.15
    });

    const instancedMesh = new THREE.InstancedMesh(sphereGeo, instancedMat, count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    const isLongitudinal = (sceneData.is_longitudinal ?? false) && timepoints.length > 1;

    // In cell models, we scale coordinates to fit cleanly within cellular compartments
    const coordScale = cellModel === 'manifold' ? 1.0 : 0.85;

    particles.forEach((p, idx) => {
      let scaleMultiplier = 1.0;
      if (isLongitudinal) {
        const timeDiff = Math.abs(p.timepoint - activeTimepoint);
        const isVisible = timeDiff < 14.0;
        scaleMultiplier = isVisible ? (1.0 - timeDiff * 0.03) : 0.05;
      }

      dummy.position.set(p.x * coordScale, p.y * coordScale, p.z * coordScale);
      dummy.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(idx, dummy.matrix);

      // Robust color resolution
      if (overlayMode === 'perturbation' && p.state_changed_by_perturbation) {
        color.setHex(0xC026D3); // Vivid Magenta for transitioned cells
      } else if (overlayMode === 'gene_expression') {
        const val = Math.min(Math.max(p.active_gene_expr || 0, 0), 1);
        // Peach to Saturated Brand Orange gradient
        color.setRGB(1.0, 0.85 - val * 0.45, 0.70 - val * 0.70);
      } else {
        const cleanKey = getCleanStateKey(p.cell_state);
        const hex = STATE_COLORS[cleanKey] || STATE_COLORS.Default;
        color.setHex(hex);
      }

      instancedMesh.setColorAt(idx, color);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

    cellGroup.add(instancedMesh);
    particlesMeshRef.current = instancedMesh;
  }, [sceneData, overlayMode, activeTimepoint, cellModel, layers.transcripts]);

  // Orbit Mouse & Click Events
  const clickStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    orbitRef.current.isDragging = true;
    orbitRef.current.prevMouseX = e.clientX;
    orbitRef.current.prevMouseY = e.clientY;
    clickStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!orbitRef.current.isDragging) return;
    const deltaX = e.clientX - orbitRef.current.prevMouseX;
    const deltaY = e.clientY - orbitRef.current.prevMouseY;
    orbitRef.current.prevMouseX = e.clientX;
    orbitRef.current.prevMouseY = e.clientY;

    orbitRef.current.theta -= deltaX * 0.008;
    orbitRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitRef.current.phi - deltaY * 0.008));
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    orbitRef.current.isDragging = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    const dist = Math.hypot(e.clientX - clickStartPos.current.x, e.clientY - clickStartPos.current.y);
    if (dist > 5) return;

    const container = mountRef.current;
    if (!container || !cameraRef.current) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    // 1. Check if clicked a cell particle
    if (particlesMeshRef.current && sceneData) {
      const intersects = raycaster.intersectObject(particlesMeshRef.current);
      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const idx = intersects[0].instanceId;
        const particle = sceneData.particles[idx];
        if (particle && onSelectParticle) {
          onSelectParticle(particle);
          setHoveredParticle(particle);
          return;
        }
      }
    }

    // 2. Check if clicked an organelle
    if (clickableOrganellesRef.current.length > 0) {
      const organelleIntersects = raycaster.intersectObjects(clickableOrganellesRef.current, false);
      if (organelleIntersects.length > 0) {
        const hit = organelleIntersects[0].object;
        const oId = hit.userData?.organelleId;
        if (oId && ORGANELLE_CATALOG[oId]) {
          setSelectedOrganelle(ORGANELLE_CATALOG[oId]);
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.05;
    orbitRef.current.radius = Math.max(14, Math.min(85, orbitRef.current.radius + e.deltaY * zoomSpeed));
    updateCameraPosition();
  };

  const handleResetCamera = () => {
    orbitRef.current.theta = Math.PI / 3.5;
    orbitRef.current.phi = Math.PI / 3.2;
    orbitRef.current.radius = 36;
    updateCameraPosition();
  };

  // Dynamic legend extraction from current dataset
  const dynamicStates = useMemo(() => {
    if (!sceneData?.particles) return [];
    const unique = new Set<string>();
    sceneData.particles.forEach(p => unique.add(p.cell_state));
    return Array.from(unique);
  }, [sceneData]);

  return (
    <div className="relative w-full h-[620px] bg-surface rounded-xl border-2 border-ink shadow-neo-lg overflow-hidden select-none flex flex-col">
      {/* 3D Top Architectural Control Bar */}
      <div className="bg-surface-raised border-b-2 border-ink px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20">
        {/* Cell Architecture Switcher */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
          <span className="text-[11px] font-mono font-bold text-ink uppercase tracking-wider flex items-center gap-1 mr-1">
            <Compass className="w-3.5 h-3.5 text-brand stroke-[2.5]" />
            Cell Model:
          </span>
          <button
            onClick={() => setCellModel('lymphocyte')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition border ${
              cellModel === 'lymphocyte'
                ? 'bg-brand text-ink border-ink shadow-[1px_1px_0_#2B211B] font-black'
                : 'bg-surface text-ink-secondary border-ink hover:bg-surface-peach'
            }`}
          >
            🔬 Lymphocyte (PBMC)
          </button>
          <button
            onClick={() => setCellModel('eukaryotic')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition border ${
              cellModel === 'eukaryotic'
                ? 'bg-brand text-ink border-ink shadow-[1px_1px_0_#2B211B] font-black'
                : 'bg-surface text-ink-secondary border-ink hover:bg-surface-peach'
            }`}
          >
            🧬 Eukaryotic Atlas
          </button>
          <button
            onClick={() => setCellModel('macrophage')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition border ${
              cellModel === 'macrophage'
                ? 'bg-brand text-ink border-ink shadow-[1px_1px_0_#2B211B] font-black'
                : 'bg-surface text-ink-secondary border-ink hover:bg-surface-peach'
            }`}
          >
            🦠 Macrophage
          </button>
          <button
            onClick={() => setCellModel('stem_cell')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition border ${
              cellModel === 'stem_cell'
                ? 'bg-brand text-ink border-ink shadow-[1px_1px_0_#2B211B] font-black'
                : 'bg-surface text-ink-secondary border-ink hover:bg-surface-peach'
            }`}
          >
            🧪 Stem Cell
          </button>
          <button
            onClick={() => setCellModel('manifold')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition border ${
              cellModel === 'manifold'
                ? 'bg-brand text-ink border-ink shadow-[1px_1px_0_#2B211B] font-black'
                : 'bg-surface text-ink-secondary border-ink hover:bg-surface-peach'
            }`}
          >
            🌐 3D Manifold
          </button>
        </div>

        {/* Interior Cutaway Selector & Organelle Tray Toggle */}
        <div className="flex items-center space-x-2 text-xs">
          {cellModel !== 'manifold' && (
            <div className="flex items-center space-x-1 bg-surface-recessed border border-ink p-0.5 rounded-md">
              <button
                onClick={() => setCutawayMode('cutaway_3_4')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  cutawayMode === 'cutaway_3_4' ? 'bg-brand text-ink font-black shadow-[1px_1px_0_#2B211B]' : 'text-ink-secondary hover:text-ink'
                }`}
                title="3/4 Interior Cutaway"
              >
                🌗 3/4 Cutaway
              </button>
              <button
                onClick={() => setCutawayMode('cutaway_half')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  cutawayMode === 'cutaway_half' ? 'bg-brand text-ink font-black shadow-[1px_1px_0_#2B211B]' : 'text-ink-secondary hover:text-ink'
                }`}
                title="Sagittal Hemisection"
              >
                🌓 Hemisection
              </button>
              <button
                onClick={() => setCutawayMode('intact')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  cutawayMode === 'intact' ? 'bg-brand text-ink font-black shadow-[1px_1px_0_#2B211B]' : 'text-ink-secondary hover:text-ink'
                }`}
                title="Intact Membrane Surface"
              >
                🌕 Intact
              </button>
              <button
                onClick={() => setCutawayMode('ghost')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  cutawayMode === 'ghost' ? 'bg-brand text-ink font-black shadow-[1px_1px_0_#2B211B]' : 'text-ink-secondary hover:text-ink'
                }`}
                title="Ghost Translucent Shell"
              >
                👻 Ghost
              </button>
            </div>
          )}

          {/* Organelle Layers Toggle */}
          <button
            onClick={() => setShowOrganelleTray(!showOrganelleTray)}
            className={`px-2.5 py-1 rounded font-bold border-2 border-ink transition shadow-[1px_1px_0_#2B211B] flex items-center gap-1.5 ${
              showOrganelleTray ? 'bg-highlight-yellow text-ink font-black' : 'bg-surface-raised text-ink hover:bg-surface-peach'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 stroke-[2.5]" />
            Organelles ({Object.values(layers).filter(Boolean).length}/8)
          </button>

          {/* Reset Camera */}
          <button
            onClick={handleResetCamera}
            className="p-1.5 text-ink bg-surface-raised hover:bg-surface-peach rounded border border-ink transition shadow-[1px_1px_0_#2B211B]"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Subcellular Organelle Layers Slideout Tray */}
      {showOrganelleTray && cellModel !== 'manifold' && (
        <div className="bg-highlight-cream border-b-2 border-ink px-4 py-2 flex flex-wrap items-center gap-3 text-xs z-15 shadow-inner">
          <span className="font-mono text-[10px] uppercase font-bold text-ink flex items-center gap-1">
            <Layers className="w-3 h-3 text-brand stroke-[2.5]" />
            Toggle Layers:
          </span>
          {[
            { key: 'membrane', label: 'Plasma Membrane' },
            { key: 'receptors', label: 'Surface Receptors' },
            { key: 'nucleus', label: 'Nucleus & Nucleolus' },
            { key: 'mitochondria', label: 'Mitochondria' },
            { key: 'er', label: 'Endoplasmic Reticulum' },
            { key: 'golgi', label: 'Golgi Apparatus' },
            { key: 'cytoskeleton', label: 'Cytoskeleton' },
            { key: 'transcripts', label: 'mRNA Transcripts' }
          ].map(({ key, label }) => {
            const active = layers[key as keyof typeof layers];
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key as keyof typeof layers)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold border transition ${
                  active
                    ? 'bg-surface-raised text-ink border-ink shadow-[1px_1px_0_#2B211B]'
                    : 'bg-surface-recessed text-ink-muted border-dashed border-ink line-through opacity-60'
                }`}
              >
                {active ? <CheckSquare className="w-3 h-3 text-brand stroke-[2.5]" /> : <Square className="w-3 h-3" />}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3D Canvas Mount Viewport */}
      <div className="relative flex-1 w-full overflow-hidden">
        <div
          ref={mountRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Top Left: Provenance and Mode Badges */}
        <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10 pointer-events-none">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-sans font-bold px-2.5 py-1 rounded bg-surface-raised text-ink border-2 border-ink shadow-[2px_2px_0_#2B211B]">
              {cellModel === 'manifold' ? '3D Transcriptomic Manifold' : `Organelle Architecture: ${cellModel.toUpperCase()}`}
            </span>
            <span className="text-[11px] font-sans font-bold px-2.5 py-1 rounded bg-surface-orange-wash text-brand-strong border-2 border-ink shadow-[2px_2px_0_#2B211B]">
              {sceneData?.temporal_mode || 'Temporal: 4D Trajectory'}
            </span>
          </div>
          <div className="text-[11px] text-ink-secondary font-sans font-semibold flex items-center gap-2">
            <span className="bg-surface-raised px-2 py-0.5 rounded border border-ink shadow-[1px_1px_0_#2B211B]">
              Cells / Transcripts: <strong className="text-ink font-black">{sceneData?.dataset_n_cells || 0}</strong>
            </span>
            {selectedParticle && (
              <span className="text-ink bg-brand px-2 py-0.5 rounded border border-ink font-black shadow-[2px_2px_0_#2B211B]">
                Particle {selectedParticle.cell_id} ({selectedParticle.cell_state})
              </span>
            )}
          </div>
        </div>

        {/* Interactive Organelle Inspector Modal Card */}
        {selectedOrganelle && (
          <div className="absolute top-4 right-4 bg-surface-raised border-2 border-ink p-4 rounded-xl shadow-neo-lg z-25 max-w-sm text-ink animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-2 mb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded-full border border-ink shadow-[1px_1px_0_#2B211B]" style={{ backgroundColor: selectedOrganelle.color }} />
                <div>
                  <h4 className="text-xs font-black text-ink">{selectedOrganelle.name}</h4>
                  <p className="text-[10px] font-bold text-ink-secondary">{selectedOrganelle.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrganelle(null)}
                className="p-1 hover:bg-surface-peach rounded border border-ink text-ink"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <p className="text-[11px] text-ink-secondary leading-relaxed font-medium mb-3">
              {selectedOrganelle.functionDesc}
            </p>

            <div className="space-y-1.5 text-[10px] font-mono border-t border-ink pt-2">
              <div className="flex justify-between">
                <span className="text-ink-secondary font-bold">Volume Fraction:</span>
                <span className="text-brand-strong font-black">{selectedOrganelle.volumeFraction}</span>
              </div>
              <div>
                <span className="text-ink-secondary font-bold block mb-1">Key Biological Markers:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedOrganelle.markerGenes.map(g => (
                    <span key={g} className="px-1.5 py-0.5 bg-surface-recessed text-ink border border-ink rounded font-bold">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Center: 4D Time Controls */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-surface-raised border-2 border-ink px-4 py-2 rounded-xl shadow-neo-md z-10 text-xs font-sans text-ink">
          {(sceneData?.is_longitudinal ?? false) && timepoints.length > 1 ? (
            <>
              <button
                onClick={() => setCurrentTimeIndex((prev) => (prev > 0 ? prev - 1 : timepoints.length - 1))}
                className="p-1 text-ink hover:text-brand-strong transition font-bold"
                title="Previous Timepoint"
              >
                <SkipBack className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-brand text-ink border-2 border-ink rounded-full hover:-translate-y-0.5 active:translate-y-0.5 transition shadow-[2px_2px_0_#2B211B] font-bold"
                title={isPlaying ? 'Pause 4D Trajectory' : 'Play 4D Trajectory'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current stroke-[2.5]" /> : <Play className="w-4 h-4 fill-current ml-0.5 stroke-[2.5]" />}
              </button>

              <button
                onClick={() => setCurrentTimeIndex((prev) => (prev + 1) % timepoints.length)}
                className="p-1 text-ink hover:text-brand-strong transition font-bold"
                title="Next Timepoint"
              >
                <SkipForward className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="flex items-center space-x-3 pl-2 border-l-2 border-ink">
                <span className="text-xs font-mono font-extrabold text-brand-strong min-w-[55px]">
                  {activeTimepoint.toFixed(1)}h
                </span>
                <input
                  type="range"
                  min={0}
                  max={timepoints.length - 1}
                  step={1}
                  value={currentTimeIndex}
                  onChange={(e) => setCurrentTimeIndex(Number(e.target.value))}
                  className="w-32 accent-brand cursor-pointer"
                />
              </div>

              <button
                onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : 1))}
                className="text-[11px] font-bold px-2 py-0.5 rounded bg-surface-recessed border border-ink text-ink hover:bg-surface-peach transition shadow-[1px_1px_0_#2B211B]"
              >
                {playbackSpeed}x
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2 text-ink-secondary text-[11px] px-2 py-0.5 font-sans font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-brand border border-ink" />
              <span>Snapshot Observation ({activeTimepoint.toFixed(1)}h) &mdash; Longitudinal progression unavailable for this dataset</span>
            </div>
          )}
        </div>

        {/* Bottom Left: Visual Legend with Dynamic State Matching */}
        <div className="absolute bottom-5 left-4 bg-surface-raised/95 border-2 border-ink p-2.5 rounded-lg shadow-neo-sm z-10 text-xs space-y-1.5 max-w-[240px] text-ink">
          <div className="font-mono text-[10px] uppercase text-ink-secondary font-bold flex items-center justify-between">
            <span>Overlay: {overlayMode.replace('_', ' ')}</span>
            <Layers className="w-3.5 h-3.5 text-brand stroke-[2.5]" />
          </div>
          {overlayMode === 'perturbation' ? (
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-sm border border-ink bg-[#C026D3] shadow-[1px_1px_0_#2B211B]" />
                <span className="text-[11px] text-[#A21CAF] font-bold">Transitioned Cell</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-sm border border-ink bg-brand shadow-[1px_1px_0_#2B211B]" />
                <span className="text-[11px] text-ink font-semibold">Baseline Unchanged</span>
              </div>
            </div>
          ) : overlayMode === 'gene_expression' ? (
            <div className="space-y-1">
              <div className="text-[11px] text-ink font-bold">{activeGene || 'Selected Gene'} Expression:</div>
              <div className="h-2.5 rounded-full border border-ink bg-gradient-to-r from-[#FFD2A8] via-[#FF8128] to-[#9F3800]" />
              <div className="flex justify-between text-[10px] font-mono text-ink-secondary font-bold">
                <span>0.0 (Low)</span>
                <span>1.0 (High)</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {(dynamicStates.length > 0 ? dynamicStates : ['CD4_T_Cell', 'CD8_T_Cell', 'B_Cell', 'CD14_Monocyte']).slice(0, 6).map((state) => {
                const clean = getCleanStateKey(state);
                const hex = STATE_COLORS[clean] || STATE_COLORS.Default;
                return (
                  <div key={state} className="flex items-center space-x-1.5 truncate">
                    <div
                      className="w-2.5 h-2.5 rounded-sm border border-ink shrink-0"
                      style={{ backgroundColor: `#${hex.toString(16).padStart(6, '0')}` }}
                    />
                    <span className="text-ink text-[10px] font-bold truncate">{state.replace(/_/g, ' ')}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subcellular Geometry Annotation Note */}
        <div className="absolute bottom-5 right-4 bg-surface-raised/95 border-2 border-ink px-3 py-1.5 rounded-lg shadow-neo-sm z-10 text-[11px] text-ink font-bold hidden md:block">
          {cellModel === 'manifold' ? (
            <span>3D Dimensional Space &bull; <span className="text-brand-strong">PCA Trajectory</span></span>
          ) : (
            <span>Click any organelle to inspect biological details</span>
          )}
        </div>
      </div>
    </div>
  );
};
