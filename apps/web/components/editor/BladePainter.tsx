'use client';
import { useState, useCallback, useRef } from 'react';
import { useBladeStore } from '@/stores/bladeStore';

interface ColorPosition {
  position: number;
  color: { r: number; g: number; b: number };
  width: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

const DEFAULT_POSITIONS: ColorPosition[] = [
  { position: 0.2, color: { r: 0, g: 100, b: 255 }, width: 0.2 },
  { position: 0.8, color: { r: 255, g: 50, b: 0 }, width: 0.2 },
];

// Quick-start templates
const PAINT_TEMPLATES: Array<{ label: string; positions: ColorPosition[] }> = [
  {
    label: 'Two-Tone',
    positions: [
      { position: 0.3, color: { r: 0, g: 100, b: 255 }, width: 0.3 },
      { position: 0.7, color: { r: 255, g: 50, b: 0 }, width: 0.3 },
    ],
  },
  {
    label: 'Tri-Color',
    positions: [
      { position: 0.15, color: { r: 255, g: 0, b: 0 }, width: 0.2 },
      { position: 0.5, color: { r: 255, g: 255, b: 255 }, width: 0.2 },
      { position: 0.85, color: { r: 0, g: 100, b: 255 }, width: 0.2 },
    ],
  },
  {
    label: 'Fade',
    positions: [
      { position: 0.0, color: { r: 0, g: 200, b: 255 }, width: 0.4 },
      { position: 1.0, color: { r: 0, g: 40, b: 120 }, width: 0.4 },
    ],
  },
  {
    label: 'Fire Tip',
    positions: [
      { position: 0.15, color: { r: 255, g: 60, b: 0 }, width: 0.25 },
      { position: 0.55, color: { r: 255, g: 180, b: 0 }, width: 0.3 },
      { position: 0.9, color: { r: 255, g: 255, b: 80 }, width: 0.2 },
    ],
  },
];

export function BladePainter() {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const positions: ColorPosition[] =
    (config.colorPositions as ColorPosition[] | undefined) ?? DEFAULT_POSITIONS;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [brushColor, setBrushColor] = useState('#0066ff');
  const [brushWidth, setBrushWidth] = useState(0.15);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const setPositions = useCallback(
    (newPositions: ColorPosition[]) => {
      updateConfig({ colorPositions: newPositions });
    },
    [updateConfig],
  );

  // Click to paint a new color region
  const handleStripClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (draggingIndex !== null) return;
      if (!stripRef.current) return;
      const rect = stripRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      const tooClose = positions.some((p) => Math.abs(p.position - pos) < 0.05);
      if (tooClose) return;

      const newPositions = [
        ...positions,
        { position: pos, color: hexToRgb(brushColor), width: brushWidth },
      ];
      setPositions(newPositions);
      setSelectedIndex(newPositions.length - 1);
    },
    [positions, brushColor, brushWidth, setPositions, draggingIndex],
  );

  // Drag to reposition
  const handlePointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingIndex(index);
      setSelectedIndex(index);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex === null || !stripRef.current) return;
      const rect = stripRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newPositions = positions.map((p, i) =>
        i === draggingIndex ? { ...p, position: Math.round(pos * 1000) / 1000 } : p,
      );
      setPositions(newPositions);
    },
    [draggingIndex, positions, setPositions],
  );

  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const handleDelete = useCallback(
    (index: number) => {
      if (positions.length <= 1) return;
      const newPositions = positions.filter((_, i) => i !== index);
      setPositions(newPositions);
      setSelectedIndex(null);
    },
    [positions, setPositions],
  );

  const handleUpdateRegion = useCallback(
    (index: number, updates: Partial<ColorPosition>) => {
      const newPositions = positions.map((p, i) =>
        i === index ? { ...p, ...updates } : p,
      );
      setPositions(newPositions);
    },
    [positions, setPositions],
  );

  // Render the painted blade preview
  const renderBackground = () => {
    if (positions.length === 0) return '#111';
    const sorted = [...positions].sort((a, b) => a.position - b.position);
    const stops: string[] = [];
    for (let x = 0; x <= 100; x += 2) {
      const pos = x / 100;
      let r = 0, g = 0, b = 0, totalWeight = 0;
      for (const region of sorted) {
        const halfW = region.width / 2;
        const dist = Math.abs(pos - region.position);
        let weight = 0;
        if (dist <= halfW) {
          weight = 1 - (dist / halfW);
        } else {
          weight = Math.max(0, 1 - (dist - halfW) * 4);
        }
        if (weight > 0) {
          r += region.color.r * weight;
          g += region.color.g * weight;
          b += region.color.b * weight;
          totalWeight += weight;
        }
      }
      if (totalWeight > 0) {
        r = Math.min(255, r / totalWeight);
        g = Math.min(255, g / totalWeight);
        b = Math.min(255, b / totalWeight);
      }
      stops.push(`rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)}) ${x}%`);
    }
    return `linear-gradient(to right, ${stops.join(', ')})`;
  };

  return (
    <div
      className="space-y-2"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-ui-sm text-text-muted uppercase tracking-wider">Blade Painter</h4>
        <span className="text-ui-xs text-text-muted/60">{positions.length} region{positions.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Quick-start templates */}
      <div className="flex flex-wrap gap-1">
        {PAINT_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.label}
            onClick={() => { setPositions(tmpl.positions); setSelectedIndex(null); }}
            className="px-2 py-0.5 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-primary hover:border-accent/40 transition-colors touch-target"
          >
            {tmpl.label}
          </button>
        ))}
      </div>

      {/* Painted blade strip */}
      <div
        ref={stripRef}
        onClick={handleStripClick}
        role="application"
        aria-label="Blade painter strip — click to add color regions, drag handles to reposition"
        className={`relative h-8 rounded border border-border-subtle ${
          draggingIndex !== null ? 'cursor-grabbing' : 'cursor-crosshair'
        }`}
        style={{ background: renderBackground() }}
      >
        {/* Region markers */}
        {positions.map((region, i) => (
          <div
            key={i}
            className={`absolute top-0 h-full border-x transition-colors ${
              selectedIndex === i ? 'border-accent' : 'border-white/20'
            }`}
            style={{
              left: `${Math.max(0, (region.position - region.width / 2)) * 100}%`,
              width: `${region.width * 100}%`,
            }}
          >
            {/* Center drag handle */}
            <div
              role="slider"
              aria-label={`Drag handle for color region ${i + 1}`}
              aria-valuenow={Math.round(region.position * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              tabIndex={0}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-4 rounded-sm cursor-grab ${
                selectedIndex === i ? 'bg-accent' : 'bg-white/40'
              }`}
              onPointerDown={(e) => handlePointerDown(i, e)}
            />
          </div>
        ))}
      </div>

      {/* Selected region editor — sliders instead of number inputs */}
      {selectedIndex !== null && selectedIndex < positions.length && (
        <div className="bg-bg-primary rounded p-2 border border-border-subtle space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={rgbToHex(
                positions[selectedIndex].color.r,
                positions[selectedIndex].color.g,
                positions[selectedIndex].color.b,
              )}
              onChange={(e) =>
                handleUpdateRegion(selectedIndex, { color: hexToRgb(e.target.value) })
              }
              aria-label="Region color"
              className="w-5 h-5 rounded cursor-pointer border border-border-subtle bg-transparent"
            />
            <span className="text-ui-xs text-text-secondary flex-1">
              Region {selectedIndex + 1}
            </span>
            <button
              onClick={() => handleDelete(selectedIndex)}
              disabled={positions.length <= 1}
              aria-label="Delete selected color region"
              className="text-ui-xs px-1.5 py-0.5 rounded border border-border-subtle text-red-400 hover:bg-red-900/20 disabled:opacity-30 transition-colors"
            >
              Delete
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-ui-xs text-text-muted w-12">Position</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(positions[selectedIndex].position * 100)}
              onChange={(e) =>
                handleUpdateRegion(selectedIndex, {
                  position: Math.max(0, Math.min(1, Number(e.target.value) / 100)),
                })
              }
              aria-label="Region position"
              className="flex-1"
            />
            <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
              {Math.round(positions[selectedIndex].position * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-ui-xs text-text-muted w-12">Blend</span>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={Math.round(positions[selectedIndex].width * 100)}
              onChange={(e) =>
                handleUpdateRegion(selectedIndex, {
                  width: Math.max(0.05, Math.min(0.5, Number(e.target.value) / 100)),
                })
              }
              aria-label="Region blend width"
              className="flex-1"
            />
            <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
              {Math.round(positions[selectedIndex].width * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Brush for adding new regions */}
      <div className="flex items-center gap-2 text-ui-xs text-text-muted">
        <span>New brush:</span>
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
          aria-label="Brush color"
          className="w-4 h-4 rounded cursor-pointer border border-border-subtle bg-transparent"
        />
        <input
          type="range"
          min={5}
          max={50}
          step={1}
          value={Math.round(brushWidth * 100)}
          onChange={(e) => setBrushWidth(Number(e.target.value) / 100)}
          aria-label="Brush blend width"
          className="w-16"
        />
        <span className="font-mono">{Math.round(brushWidth * 100)}%</span>
        <span className="text-text-muted/50 ml-auto">Click strip to paint</span>
      </div>
    </div>
  );
}
