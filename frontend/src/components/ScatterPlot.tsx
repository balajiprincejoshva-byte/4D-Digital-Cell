import React, { useRef, useEffect, useState } from 'react';
import { EmbeddingPoint } from '../types';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ScatterPlotProps {
  points: EmbeddingPoint[];
  colorBy: 'cell_type' | 'cluster' | 'timepoint' | 'expression';
  activeGeneSymbol?: string;
  onSelectCell?: (point: EmbeddingPoint) => void;
  selectedCellId?: string;
}

const CATEGORICAL_PALETTE = [
  '#FF6A00', // Brand Orange
  '#1D4E89', // Navy Blue
  '#1B7340', // Forest Green
  '#D97706', // Warm Ochre
  '#9333EA', // Purple
  '#C026D3', // Magenta
  '#0284C7', // Sky Blue
  '#B91C1C', // Brick Red
];

export const ScatterPlot: React.FC<ScatterPlotProps> = ({
  points,
  colorBy,
  activeGeneSymbol,
  onSelectCell,
  selectedCellId
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<EmbeddingPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Map distinct categories to colors
  const categoryColorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    const categories = new Set<string>();

    points.forEach(p => {
      if (colorBy === 'cell_type' && p.cell_type) categories.add(p.cell_type);
      else if (colorBy === 'cluster' && p.cluster) categories.add(p.cluster);
      else if (colorBy === 'timepoint' && p.timepoint !== undefined) categories.add(`${p.timepoint}h`);
    });

    Array.from(categories).forEach((cat, idx) => {
      map.set(cat, CATEGORICAL_PALETTE[idx % CATEGORICAL_PALETTE.length]);
    });

    return map;
  }, [points, colorBy]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear with warm ivory surface
    ctx.fillStyle = '#FFF8EF';
    ctx.fillRect(0, 0, width, height);

    // Draw subtle warm ink grid
    ctx.strokeStyle = '#EBD5BF';
    ctx.lineWidth = 1;
    const gridSize = 40 * scale;
    const offsetX = (pan.x * scale + width / 2) % gridSize;
    const offsetY = (pan.y * scale + height / 2) % gridSize;

    for (let x = offsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (points.length === 0) return;

    // Compute bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const rangeX = Math.max(maxX - minX, 1e-4);
    const rangeY = Math.max(maxY - minY, 1e-4);
    const margin = 50;
    const plotWidth = width - margin * 2;
    const plotHeight = height - margin * 2;

    // Draw points
    points.forEach(p => {
      // Normalize to canvas coordinates
      const normX = (p.x - minX) / rangeX;
      const normY = (p.y - minY) / rangeY;

      const screenX = (margin + normX * plotWidth - width / 2) * scale + width / 2 + pan.x * scale;
      const screenY = (height - margin - normY * plotHeight - height / 2) * scale + height / 2 + pan.y * scale;

      // Color selection
      let color = '#FF6A00';
      if (colorBy === 'expression') {
        const val = p.expression_val || 0;
        const intensity = Math.min(Math.max(val, 0), 1);
        color = intensity > 0.5 ? '#FF6A00' : '#E8A87C';
      } else if (colorBy === 'cell_type') {
        color = categoryColorMap.get(p.cell_type || '') || '#806653';
      } else if (colorBy === 'cluster') {
        color = categoryColorMap.get(p.cluster || '') || '#806653';
      } else if (colorBy === 'timepoint') {
        color = categoryColorMap.get(`${p.timepoint}h`) || '#806653';
      }

      const isSelected = selectedCellId === p.cell_id;
      const isHovered = hoveredPoint?.cell_id === p.cell_id;

      ctx.beginPath();
      ctx.arc(screenX, screenY, isSelected ? 7 : (isHovered ? 6 : 4), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Neobrutalist outline on points
      ctx.strokeStyle = isSelected || isHovered ? '#2B211B' : 'rgba(43, 33, 27, 0.35)';
      ctx.lineWidth = isSelected || isHovered ? 2.5 : 0.75;
      ctx.stroke();
    });

  }, [points, colorBy, scale, pan, categoryColorMap, selectedCellId, hoveredPoint]);

  // Mouse interaction: Pan & Zoom
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    // Hit-testing for tooltip
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const rangeX = Math.max(maxX - minX, 1e-4);
    const rangeY = Math.max(maxY - minY, 1e-4);
    const margin = 50;
    const plotWidth = canvas.clientWidth - margin * 2;
    const plotHeight = canvas.clientHeight - margin * 2;

    let closest: EmbeddingPoint | null = null;
    let closestDist = 12; // pixel radius

    points.forEach(p => {
      const normX = (p.x - minX) / rangeX;
      const normY = (p.y - minY) / rangeY;
      const screenX = (margin + normX * plotWidth - canvas.clientWidth / 2) * scale + canvas.clientWidth / 2 + pan.x * scale;
      const screenY = (canvas.clientHeight - margin - normY * plotHeight - canvas.clientHeight / 2) * scale + canvas.clientHeight / 2 + pan.y * scale;

      const dist = Math.hypot(mouseX - screenX, mouseY - screenY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = p;
      }
    });

    setHoveredPoint(closest);
    if (closest) {
      setTooltipPos({ x: mouseX + 12, y: mouseY - 25 });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (hoveredPoint && onSelectCell) {
      onSelectCell(hoveredPoint);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setScale(prev => Math.min(Math.max(prev * zoomFactor, 0.4), 8.0));
  };

  return (
    <div className="relative w-full h-[460px] bg-surface rounded-xl border-2 border-ink shadow-neo overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Floating Toolbar */}
      <div className="absolute top-3 right-3 flex items-center space-x-1.5 bg-surface-raised border-2 border-ink p-1 rounded-md shadow-neo-sm">
        <button
          onClick={() => setScale(s => Math.min(s * 1.25, 8))}
          className="p-1.5 text-ink hover:text-brand-strong rounded hover:bg-surface-peach transition font-bold"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 stroke-[2.5]" />
        </button>
        <button
          onClick={() => setScale(s => Math.max(s * 0.8, 0.4))}
          className="p-1.5 text-ink hover:text-brand-strong rounded hover:bg-surface-peach transition font-bold"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 stroke-[2.5]" />
        </button>
        <button
          onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
          className="p-1.5 text-ink hover:text-brand-strong rounded hover:bg-surface-peach transition font-bold"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute pointer-events-none bg-surface-raised border-2 border-ink text-xs text-ink px-3 py-2 rounded-md shadow-neo-md z-20 font-sans"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="font-extrabold text-brand-strong">{hoveredPoint.cell_id}</div>
          <div className="text-ink-secondary text-[11px] mt-0.5">State: <span className="text-ink font-bold">{hoveredPoint.cell_type || 'N/A'}</span></div>
          <div className="text-ink-secondary text-[11px]">Cluster: <span className="text-ink font-bold">{hoveredPoint.cluster || 'N/A'}</span></div>
          {hoveredPoint.timepoint !== undefined && (
            <div className="text-ink-secondary text-[11px]">Timepoint: <span className="text-ink font-bold">{hoveredPoint.timepoint}h</span></div>
          )}
          {hoveredPoint.expression_val !== undefined && (
            <div className="text-ink-secondary text-[11px]">{activeGeneSymbol || 'Gene'}: <span className="text-brand font-black">{hoveredPoint.expression_val}</span></div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-surface-raised/95 border-2 border-ink px-3 py-1.5 rounded-md shadow-neo-sm flex flex-wrap items-center gap-3 text-xs max-w-[85%] font-medium">
        <span className="text-ink-secondary font-mono text-[10px] uppercase font-bold tracking-wider">
          Color: {colorBy.replace('_', ' ')}
        </span>
        {Array.from(categoryColorMap.entries()).slice(0, 6).map(([cat, col]) => (
          <div key={cat} className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-sm border border-ink shadow-[1px_1px_0_#2B211B]" style={{ backgroundColor: col }} />
            <span className="text-ink text-[11px] font-bold">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
