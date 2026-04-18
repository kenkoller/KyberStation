'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useBladeStore } from '@/stores/bladeStore';

interface GradientStop {
  position: number;
  color: { r: number; g: number; b: number };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

const DEFAULT_STOPS: GradientStop[] = [
  { position: 0, color: { r: 0, g: 100, b: 255 } },
  { position: 1, color: { r: 255, g: 50, b: 0 } },
];

const INTERPOLATION_OPTIONS: Array<{ id: 'linear' | 'smooth' | 'step'; label: string; description: string }> = [
  { id: 'linear', label: 'Linear', description: 'Straight-line blending between colors' },
  { id: 'smooth', label: 'Smooth', description: 'Eased transitions (S-curve) between colors' },
  { id: 'step', label: 'Step', description: 'Hard color bands with no blending' },
];

export function GradientBuilder() {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const stops: GradientStop[] =
    (config.gradientStops as GradientStop[] | undefined) ?? DEFAULT_STOPS;
  const interpolation = (config.gradientInterpolation as 'linear' | 'smooth' | 'step' | undefined) ?? 'linear';
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const sortedStops = [...stops].sort((a, b) => a.position - b.position);

  const setStops = useCallback(
    (newStops: GradientStop[]) => {
      updateConfig({ gradientStops: newStops });
    },
    [updateConfig],
  );

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Don't add stops during drag
      if (draggingIndex !== null) return;
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      // Don't add if clicking near an existing stop
      const tooClose = stops.some((s) => Math.abs(s.position - pos) < 0.03);
      if (tooClose) return;

      // Interpolate color at this position
      const sorted = [...stops].sort((a, b) => a.position - b.position);
      let lower = sorted[0];
      let upper = sorted[sorted.length - 1];
      for (let i = 0; i < sorted.length - 1; i++) {
        if (pos >= sorted[i].position && pos <= sorted[i + 1].position) {
          lower = sorted[i];
          upper = sorted[i + 1];
          break;
        }
      }
      const range = upper.position - lower.position;
      const t = range > 0 ? (pos - lower.position) / range : 0;
      const newColor = {
        r: Math.round(lower.color.r + (upper.color.r - lower.color.r) * t),
        g: Math.round(lower.color.g + (upper.color.g - lower.color.g) * t),
        b: Math.round(lower.color.b + (upper.color.b - lower.color.b) * t),
      };

      const newStops = [...stops, { position: pos, color: newColor }];
      setStops(newStops);
      setSelectedIndex(newStops.length - 1);
    },
    [stops, setStops, draggingIndex],
  );

  const handleStopColorChange = useCallback(
    (index: number, hex: string) => {
      const newStops = stops.map((s, i) => (i === index ? { ...s, color: hexToRgb(hex) } : s));
      setStops(newStops);
    },
    [stops, setStops],
  );

  const handleDeleteStop = useCallback(
    (index: number) => {
      if (stops.length <= 2) return;
      const newStops = stops.filter((_, i) => i !== index);
      setStops(newStops);
      setSelectedIndex(null);
    },
    [stops, setStops],
  );

  // Drag-to-reposition stops
  const handleStopPointerDown = useCallback(
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
      if (draggingIndex === null || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const rounded = Math.round(pos * 1000) / 1000;
      const newStops = stops.map((s, i) =>
        i === draggingIndex ? { ...s, position: rounded } : s,
      );
      setStops(newStops);
    },
    [draggingIndex, stops, setStops],
  );

  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const handlePositionInput = useCallback(
    (index: number, value: number) => {
      const clamped = Math.max(0, Math.min(100, value)) / 100;
      const newStops = stops.map((s, i) =>
        i === index ? { ...s, position: Math.round(clamped * 1000) / 1000 } : s,
      );
      setStops(newStops);
    },
    [stops, setStops],
  );

  // Handle keyboard delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIndex !== null) {
        e.preventDefault();
        handleDeleteStop(selectedIndex);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIndex, handleDeleteStop]);

  // Build CSS gradient string
  const gradientCSS = sortedStops
    .map((s) => {
      const hex = rgbToHex(s.color.r, s.color.g, s.color.b);
      const pct = (s.position * 100).toFixed(0);
      if (interpolation === 'step') {
        // For step mode, show hard color bands in the preview
        return `${hex} ${pct}%`;
      }
      return `${hex} ${pct}%`;
    })
    .join(', ');

  return (
    <div
      className="space-y-2"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-ui-sm text-text-muted uppercase tracking-wider">Gradient Stops</h4>
        {/* Interpolation mode */}
        <div className="flex gap-1" role="radiogroup" aria-label="Interpolation mode">
          {INTERPOLATION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              role="radio"
              aria-checked={interpolation === opt.id}
              onClick={() => updateConfig({ gradientInterpolation: opt.id })}
              className={`px-1.5 py-0.5 rounded text-ui-xs border transition-colors ${
                interpolation === opt.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'border-border-subtle text-text-muted hover:text-text-secondary'
              }`}
              title={opt.description}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stop color inputs positioned above the bar */}
      <div className="relative h-8">
        {stops.map((stop, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${stop.position * 100}%` }}
            onPointerDown={(e) => handleStopPointerDown(i, e)}
          >
            <input
              type="color"
              value={rgbToHex(stop.color.r, stop.color.g, stop.color.b)}
              onChange={(e) => handleStopColorChange(i, e.target.value)}
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(i); }}
              aria-label={`Color for gradient stop ${i + 1}`}
              className={`w-5 h-5 rounded cursor-pointer border-2 bg-transparent ${
                selectedIndex === i ? 'border-accent' : 'border-border-subtle'
              }`}
              style={{ width: '20px', height: '20px' }}
              title={`Stop ${i + 1} — drag to reposition`}
            />
          </div>
        ))}
      </div>

      {/* Gradient bar */}
      <div
        ref={barRef}
        onClick={handleBarClick}
        role="application"
        aria-label="Gradient bar — click to add color stops"
        className={`h-6 rounded border border-border-subtle ${draggingIndex !== null ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        style={{ background: `linear-gradient(to right, ${gradientCSS})` }}
      />

      {/* Stop markers below the bar */}
      <div className="relative h-3">
        {stops.map((stop, i) => (
          <div
            key={i}
            role="slider"
            aria-label={`Drag handle for gradient stop ${i + 1}`}
            aria-valuenow={Math.round(stop.position * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            className="absolute -translate-x-1/2 w-0 h-0 cursor-grab"
            style={{
              left: `${stop.position * 100}%`,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderBottom: selectedIndex === i ? '6px solid var(--accent)' : '6px solid var(--text-muted, #888)',
            }}
            onPointerDown={(e) => handleStopPointerDown(i, e)}
          />
        ))}
      </div>

      {/* Selected stop details */}
      {selectedIndex !== null && selectedIndex < stops.length && (
        <div className="flex items-center gap-2 bg-bg-primary rounded p-2 border border-border-subtle">
          <span className="text-ui-xs text-text-muted">Position:</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={Math.round(stops[selectedIndex].position * 100)}
            onChange={(e) => handlePositionInput(selectedIndex, Number(e.target.value))}
            aria-label="Stop position percent"
            className="w-12 px-1 py-0.5 rounded text-ui-sm bg-bg-deep border border-border-subtle text-text-primary text-center"
          />
          <span className="text-ui-xs text-text-muted">%</span>
          <div className="flex-1" />
          <button
            onClick={() => handleDeleteStop(selectedIndex)}
            disabled={stops.length <= 2}
            aria-label="Delete selected gradient stop"
            className="text-ui-xs px-1.5 py-0.5 rounded border border-border-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ color: 'rgb(var(--status-error))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgb(var(--status-error) / 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '';
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Instructions */}
      <p className="text-ui-xs text-text-muted">
        Click bar to add stops. Drag stops to reposition. Select + Delete to remove (min 2).
      </p>
    </div>
  );
}
