'use client';
import { useState, useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';

interface GradientStop {
  position: number;
  color: { r: number; g: number; b: number };
}

interface SavedGradient {
  name: string;
  stops: GradientStop[];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function lerpColor(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

const STORAGE_KEY = 'kyberstation-saved-gradients';

function loadSavedGradients(): SavedGradient[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistGradients(gradients: SavedGradient[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gradients));
}

export function GradientMixer() {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const currentStops = (config.gradientStops as GradientStop[] | undefined) ?? [];

  const [savedGradients, setSavedGradients] = useState<SavedGradient[]>(loadSavedGradients);
  const [saveName, setSaveName] = useState('');
  const [mixSlotA, setMixSlotA] = useState<number | null>(null);
  const [mixSlotB, setMixSlotB] = useState<number | null>(null);
  const [mixRatio, setMixRatio] = useState(0.5);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = useCallback(() => {
    if (!saveName.trim() || currentStops.length < 2) return;
    const newGradients = [...savedGradients, { name: saveName.trim(), stops: currentStops }];
    setSavedGradients(newGradients);
    persistGradients(newGradients);
    setSaveName('');
  }, [saveName, currentStops, savedGradients]);

  const handleDelete = useCallback((index: number) => {
    const newGradients = savedGradients.filter((_, i) => i !== index);
    setSavedGradients(newGradients);
    persistGradients(newGradients);
    if (mixSlotA === index) setMixSlotA(null);
    if (mixSlotB === index) setMixSlotB(null);
    if (mixSlotA !== null && mixSlotA > index) setMixSlotA(mixSlotA - 1);
    if (mixSlotB !== null && mixSlotB > index) setMixSlotB(mixSlotB - 1);
  }, [savedGradients, mixSlotA, mixSlotB]);

  const handleLoad = useCallback((index: number) => {
    updateConfig({ gradientStops: savedGradients[index].stops });
  }, [savedGradients, updateConfig]);

  const handleMix = useCallback(() => {
    if (mixSlotA === null || mixSlotB === null) return;
    const stopsA = savedGradients[mixSlotA].stops;
    const stopsB = savedGradients[mixSlotB].stops;

    // Union all stop positions, interpolate colors at the mix ratio
    const allPositions = new Set<number>();
    stopsA.forEach((s) => allPositions.add(s.position));
    stopsB.forEach((s) => allPositions.add(s.position));

    const sortedPositions = [...allPositions].sort((a, b) => a - b);
    const mixed: GradientStop[] = sortedPositions.map((pos) => {
      const colorA = sampleGradient(stopsA, pos);
      const colorB = sampleGradient(stopsB, pos);
      return { position: pos, color: lerpColor(colorA, colorB, mixRatio) };
    });

    updateConfig({ gradientStops: mixed });
  }, [mixSlotA, mixSlotB, mixRatio, savedGradients, updateConfig]);

  const stopsToCSS = (stops: GradientStop[]) => {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    return sorted
      .map((s) => `${rgbToHex(s.color.r, s.color.g, s.color.b)} ${(s.position * 100).toFixed(0)}%`)
      .join(', ');
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-ui-sm text-text-muted hover:text-accent transition-colors flex items-center gap-1"
        aria-expanded={isOpen}
        aria-controls="gradient-mixer-panel"
      >
        <span className="text-ui-xs" aria-hidden="true">{isOpen ? '\u25BC' : '\u25B6'}</span>
        Gradient Mixer
      </button>

      {isOpen && (
        <div id="gradient-mixer-panel" className="mt-2 space-y-2 bg-bg-primary rounded p-2 border border-border-subtle">
          {/* Save current */}
          <div className="flex gap-1">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Name this gradient..."
              aria-label="Gradient name"
              className="flex-1 px-2 py-1 rounded text-ui-sm bg-bg-deep border border-border-subtle text-text-primary placeholder:text-text-muted"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim() || currentStops.length < 2}
              className="px-2 py-1 rounded text-ui-sm border border-border-subtle text-text-muted hover:text-accent hover:border-accent-border/40 disabled:opacity-30 transition-colors"
            >
              Save
            </button>
          </div>

          {/* Saved gradients list */}
          {savedGradients.length > 0 && (
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {savedGradients.map((sg, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div
                    className="flex-1 h-4 rounded border border-border-subtle cursor-pointer hover:border-accent/40 transition-colors"
                    style={{ background: `linear-gradient(to right, ${stopsToCSS(sg.stops)})` }}
                    onClick={() => handleLoad(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                        e.preventDefault();
                        handleLoad(i);
                      }
                    }}
                    title={`Load "${sg.name}"`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Load gradient "${sg.name}"`}
                  />
                  <span className="text-ui-xs text-text-muted truncate w-16" title={sg.name}>{sg.name}</span>
                  <button
                    onClick={() => setMixSlotA(i)}
                    className={`text-ui-xs px-1 py-0.5 rounded border transition-colors ${
                      mixSlotA === i ? 'border-accent text-accent' : 'border-border-subtle text-text-muted'
                    }`}
                    aria-label={`Set "${sg.name}" as mix slot A`}
                    aria-pressed={mixSlotA === i}
                  >
                    A
                  </button>
                  <button
                    onClick={() => setMixSlotB(i)}
                    className={`text-ui-xs px-1 py-0.5 rounded border transition-colors ${
                      mixSlotB === i ? 'border-accent text-accent' : 'border-border-subtle text-text-muted'
                    }`}
                    aria-label={`Set "${sg.name}" as mix slot B`}
                    aria-pressed={mixSlotB === i}
                  >
                    B
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    className="text-ui-xs px-1 py-0.5 rounded border border-border-subtle text-red-400 hover:bg-red-900/20 transition-colors"
                    aria-label={`Delete gradient "${sg.name}"`}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Mix controls */}
          {mixSlotA !== null && mixSlotB !== null && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-ui-xs text-text-muted">A</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={mixRatio}
                  onChange={(e) => setMixRatio(Number(e.target.value))}
                  className="flex-1"
                  aria-label="Gradient mix ratio"
                  aria-valuemin={0}
                  aria-valuemax={1}
                  aria-valuenow={mixRatio}
                />
                <span className="text-ui-xs text-text-muted">B</span>
                <span className="text-ui-xs text-text-muted w-8 text-right">
                  {Math.round(mixRatio * 100)}%
                </span>
              </div>
              <button
                onClick={handleMix}
                className="w-full text-ui-sm py-1 rounded border border-accent-border text-accent hover:bg-accent/10 transition-colors"
              >
                Blend A + B
              </button>
            </div>
          )}

          {savedGradients.length === 0 && (
            <p className="text-ui-xs text-text-muted">Save gradients to mix them. Select A and B slots to blend.</p>
          )}
        </div>
      )}
    </div>
  );
}

function sampleGradient(stops: GradientStop[], position: number): { r: number; g: number; b: number } {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  if (position <= sorted[0].position) return sorted[0].color;
  if (position >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].color;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (position >= sorted[i].position && position <= sorted[i + 1].position) {
      const range = sorted[i + 1].position - sorted[i].position;
      const t = range > 0 ? (position - sorted[i].position) / range : 0;
      return lerpColor(sorted[i].color, sorted[i + 1].color, t);
    }
  }
  return sorted[0].color;
}
