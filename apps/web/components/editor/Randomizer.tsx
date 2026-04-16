'use client';

import { useState, useCallback, useRef } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import type { BladeConfig } from '@kyberstation/engine';
import { playUISound } from '@/lib/uiSounds';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_STYLES = [
  'stable', 'unstable', 'fire', 'pulse', 'rotoscope', 'gradient',
  'photon', 'plasma', 'crystalShatter', 'aurora', 'cinder', 'prism',
  'dataStream', 'gravity', 'ember', 'automata', 'helix', 'candle',
  'shatter', 'neutron', 'torrent', 'moire', 'cascade', 'vortex',
  'nebula', 'tidal', 'mirage',
] as const;

const ALL_IGNITIONS = [
  'standard', 'scroll', 'spark', 'center', 'wipe', 'stutter', 'glitch',
] as const;

const ALL_RETRACTIONS = [
  'standard', 'scroll', 'center', 'fadeout', 'shatter',
] as const;

const STYLE_LABELS: Record<string, string> = {
  stable: 'Stable',
  unstable: 'Unstable',
  fire: 'Fire',
  pulse: 'Pulse',
  rotoscope: 'Rotoscope',
  gradient: 'Gradient',
  photon: 'Photon',
  plasma: 'Plasma',
  crystalShatter: 'Crystal Shatter',
  aurora: 'Aurora',
  cinder: 'Cinder',
  prism: 'Prism',
};

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

interface ThemeDef {
  label: string;
  hueRanges: [number, number][];   // allowed hue ranges (0-360)
  satRange: [number, number];       // saturation %
  lightRange: [number, number];     // lightness %
  styles: string[];                 // restricted style pool
}

const THEMES: Record<string, ThemeDef> = {
  sith: {
    label: 'Sith',
    hueRanges: [[0, 30], [340, 360]],
    satRange: [70, 100],
    lightRange: [40, 55],
    styles: ['unstable', 'fire', 'plasma', 'cinder', 'ember', 'candle', 'shatter'],
  },
  jedi: {
    label: 'Jedi',
    hueRanges: [[190, 250], [100, 150]],
    satRange: [60, 100],
    lightRange: [45, 60],
    styles: ['stable', 'rotoscope', 'gradient', 'pulse', 'helix', 'cascade'],
  },
  darkSide: {
    label: 'Dark Side',
    hueRanges: [[260, 310], [0, 20], [340, 360]],
    satRange: [50, 90],
    lightRange: [30, 50],
    styles: ['unstable', 'fire', 'plasma', 'crystalShatter', 'cinder', 'shatter', 'vortex', 'torrent'],
  },
  nature: {
    label: 'Nature',
    hueRanges: [[80, 180]],
    satRange: [50, 90],
    lightRange: [40, 60],
    styles: ['aurora', 'cinder', 'gradient', 'stable', 'ember', 'candle', 'tidal'],
  },
  cyberpunk: {
    label: 'Cyberpunk',
    hueRanges: [[170, 200], [280, 330], [50, 70]],
    satRange: [80, 100],
    lightRange: [50, 65],
    styles: ['plasma', 'photon', 'prism', 'crystalShatter', 'dataStream', 'automata', 'moire'],
  },
  cosmic: {
    label: 'Cosmic',
    hueRanges: [[240, 300], [0, 0]],
    satRange: [30, 80],
    lightRange: [50, 75],
    styles: ['prism', 'aurora', 'gradient', 'photon', 'nebula', 'vortex', 'mirage'],
  },
  random: {
    label: 'Random',
    hueRanges: [[0, 360]],
    satRange: [50, 100],
    lightRange: [35, 65],
    styles: [...ALL_STYLES],
  },
};

// ---------------------------------------------------------------------------
// Lock options
// ---------------------------------------------------------------------------

type LockKey = 'colors' | 'style' | 'effects' | 'timing';

const LOCK_OPTIONS: { key: LockKey; label: string }[] = [
  { key: 'colors', label: 'Lock Colors' },
  { key: 'style', label: 'Lock Style' },
  { key: 'effects', label: 'Lock Effects' },
  { key: 'timing', label: 'Lock Timing' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.round(randRange(min, max));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Generate a random color in HSL space then convert to RGB for better aesthetics. */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let rp = 0, gp = 0, bp = 0;
  if (h < 60) { rp = c; gp = x; bp = 0; }
  else if (h < 120) { rp = x; gp = c; bp = 0; }
  else if (h < 180) { rp = 0; gp = c; bp = x; }
  else if (h < 240) { rp = 0; gp = x; bp = c; }
  else if (h < 300) { rp = x; gp = 0; bp = c; }
  else { rp = c; gp = 0; bp = x; }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

/** Minimum brightness: at least one RGB channel must reach this value */
const MIN_BRIGHTNESS = 80;

function randomColorFromTheme(theme: ThemeDef): { r: number; g: number; b: number } {
  const range = pick(theme.hueRanges);
  const h = randRange(range[0], range[1]) % 360;
  const s = randRange(theme.satRange[0], theme.satRange[1]);
  const l = randRange(theme.lightRange[0], theme.lightRange[1]);
  const color = hslToRgb(h, s, l);

  // Enforce minimum brightness so blades are always visible
  const maxChannel = Math.max(color.r, color.g, color.b);
  if (maxChannel < MIN_BRIGHTNESS) {
    const boost = MIN_BRIGHTNESS / Math.max(maxChannel, 1);
    color.r = Math.min(255, Math.round(color.r * boost));
    color.g = Math.min(255, Math.round(color.g * boost));
    color.b = Math.min(255, Math.round(color.b * boost));
  }

  return color;
}

/** Generate a full random BladeConfig for a given theme. */
function generateConfig(theme: ThemeDef): BladeConfig {
  const style = pick(theme.styles);
  const config: BladeConfig = {
    name: 'Randomized',
    baseColor: randomColorFromTheme(theme),
    clashColor: randomColorFromTheme({ ...theme, lightRange: [65, 85] }),
    lockupColor: randomColorFromTheme({ ...theme, lightRange: [55, 75] }),
    blastColor: randomColorFromTheme({ ...theme, lightRange: [70, 90] }),
    style,
    ignition: pick(ALL_IGNITIONS),
    retraction: pick(ALL_RETRACTIONS),
    ignitionMs: randInt(150, 800),
    retractionMs: randInt(200, 900),
    shimmer: Math.round(randRange(0, 0.6) * 100) / 100,
    ledCount: pick([72, 96, 120, 132, 144, 264]),
  };

  // Style-specific extras
  if (style === 'gradient') {
    config.gradientEnd = randomColorFromTheme(theme);
  }
  if (style === 'plasma') {
    config.edgeColor = randomColorFromTheme({ ...theme, lightRange: [70, 90] });
  }

  return config;
}

/** Apply locks: keep locked fields from the current config. */
function applyLocks(
  generated: BladeConfig,
  current: BladeConfig,
  locks: Set<LockKey>,
): BladeConfig {
  const merged = { ...generated };

  if (locks.has('colors')) {
    merged.baseColor = current.baseColor;
    merged.clashColor = current.clashColor;
    merged.lockupColor = current.lockupColor;
    merged.blastColor = current.blastColor;
    if (current.gradientEnd) merged.gradientEnd = current.gradientEnd;
    if (current.edgeColor) merged.edgeColor = current.edgeColor;
  }

  if (locks.has('style')) {
    merged.style = current.style;
    merged.shimmer = current.shimmer;
  }

  if (locks.has('effects')) {
    merged.clashColor = current.clashColor;
    merged.lockupColor = current.lockupColor;
    merged.blastColor = current.blastColor;
  }

  if (locks.has('timing')) {
    merged.ignition = current.ignition;
    merged.retraction = current.retraction;
    merged.ignitionMs = current.ignitionMs;
    merged.retractionMs = current.retractionMs;
  }

  return merged;
}

/** Nudge a color by small random amounts. */
function nudgeColor(
  c: { r: number; g: number; b: number },
  amount: number,
): { r: number; g: number; b: number } {
  return {
    r: clamp(c.r + randInt(-amount, amount), 0, 255),
    g: clamp(c.g + randInt(-amount, amount), 0, 255),
    b: clamp(c.b + randInt(-amount, amount), 0, 255),
  };
}

/** Mutate a config by nudging 2-4 parameters slightly. */
function mutateConfig(config: BladeConfig): BladeConfig {
  const mutated = { ...config };
  const mutations: Array<() => void> = [
    () => { mutated.baseColor = nudgeColor(config.baseColor, 30); },
    () => { mutated.clashColor = nudgeColor(config.clashColor, 40); },
    () => { mutated.lockupColor = nudgeColor(config.lockupColor, 40); },
    () => { mutated.blastColor = nudgeColor(config.blastColor, 40); },
    () => { mutated.shimmer = clamp(config.shimmer + randRange(-0.1, 0.1), 0, 1); },
    () => { mutated.ignitionMs = clamp(config.ignitionMs + randInt(-100, 100), 100, 1000); },
    () => { mutated.retractionMs = clamp(config.retractionMs + randInt(-100, 100), 100, 1000); },
    () => {
      const idx = ALL_STYLES.indexOf(config.style as typeof ALL_STYLES[number]);
      if (idx >= 0) {
        const offset = pick([-1, 1]);
        const newIdx = clamp(idx + offset, 0, ALL_STYLES.length - 1);
        mutated.style = ALL_STYLES[newIdx];
      }
    },
  ];

  // Shuffle and pick 2-4 mutations
  const count = randInt(2, 4);
  const shuffled = mutations.sort(() => Math.random() - 0.5);
  for (let i = 0; i < count && i < shuffled.length; i++) {
    shuffled[i]();
  }

  mutated.name = 'Mutated';
  return mutated;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
      .join('')
  );
}

// ---------------------------------------------------------------------------
// Mini Preview Card
// ---------------------------------------------------------------------------

function MiniPreviewCard({
  config,
  isSelected,
  onSelect,
}: {
  config: BladeConfig;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const baseHex = rgbToHex(config.baseColor.r, config.baseColor.g, config.baseColor.b);
  const clashHex = rgbToHex(config.clashColor.r, config.clashColor.g, config.clashColor.b);
  const lockupHex = rgbToHex(config.lockupColor.r, config.lockupColor.g, config.lockupColor.b);

  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center gap-1.5 p-2 rounded transition-all border ${
        isSelected
          ? 'border-accent bg-accent-dim ring-1 ring-accent/30'
          : 'border-border-subtle bg-bg-surface hover:border-border-light'
      }`}
    >
      {/* Color swatch bar */}
      <div className="flex w-full h-6 rounded overflow-hidden">
        <div className="flex-1" style={{ backgroundColor: baseHex }} />
        <div className="w-3" style={{ backgroundColor: clashHex }} />
        <div className="w-3" style={{ backgroundColor: lockupHex }} />
      </div>
      {/* Style name */}
      <span className="text-ui-sm text-text-secondary truncate w-full text-center">
        {STYLE_LABELS[config.style] ?? config.style}
      </span>
      {/* Timing info */}
      <span className="text-ui-xs text-text-muted font-mono">
        {config.ignitionMs}ms / {config.retractionMs}ms
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function Randomizer() {
  const config = useBladeStore((s) => s.config);
  const setConfig = useBladeStore((s) => s.setConfig);

  // History stack for undo
  const [history, setHistory] = useState<BladeConfig[]>([]);

  // Locks
  const [locks, setLocks] = useState<Set<LockKey>>(new Set());

  // Active theme
  const [activeTheme, setActiveTheme] = useState<string>('random');

  // Batch preview
  const [batchConfigs, setBatchConfigs] = useState<BladeConfig[]>([]);
  const [selectedBatchIdx, setSelectedBatchIdx] = useState<number | null>(null);

  // UI sections
  const [showBatch, setShowBatch] = useState(false);

  // ------ Actions ------

  const pushHistory = useCallback(
    (current: BladeConfig) => {
      setHistory((prev) => [current, ...prev].slice(0, 30));
    },
    [],
  );

  const handleSurpriseMe = useCallback(() => {
    playUISound('button-click');
    pushHistory(config);
    const theme = THEMES[activeTheme] ?? THEMES.random;
    const newConfig = applyLocks(generateConfig(theme), config, locks);
    setConfig(newConfig);
    playUISound('success');
  }, [config, activeTheme, locks, pushHistory, setConfig]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const [prev, ...rest] = history;
    setHistory(rest);
    setConfig(prev);
  }, [history, setConfig]);

  const handleMutate = useCallback(() => {
    playUISound('button-click');
    pushHistory(config);
    setConfig(mutateConfig(config));
    playUISound('success');
  }, [config, pushHistory, setConfig]);

  const handleGenerateBatch = useCallback(() => {
    const theme = THEMES[activeTheme] ?? THEMES.random;
    const batch = Array.from({ length: 6 }, () =>
      applyLocks(generateConfig(theme), config, locks),
    );
    setBatchConfigs(batch);
    setSelectedBatchIdx(null);
    setShowBatch(true);
  }, [activeTheme, config, locks]);

  const handleApplyBatch = useCallback(() => {
    if (selectedBatchIdx === null || !batchConfigs[selectedBatchIdx]) return;
    playUISound('button-click');
    pushHistory(config);
    setConfig(batchConfigs[selectedBatchIdx]);
    setShowBatch(false);
    setBatchConfigs([]);
    setSelectedBatchIdx(null);
    playUISound('success');
  }, [selectedBatchIdx, batchConfigs, config, pushHistory, setConfig]);

  const toggleLock = useCallback((key: LockKey) => {
    setLocks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ------ Render ------

  return (
    <div className="space-y-5">
      {/* Surprise Me */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-3">
          Style Generator
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleSurpriseMe}
            className="relative flex-1 px-4 py-2.5 rounded text-ui-sm font-medium transition-all border border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 hover:border-accent active:scale-[0.97] font-cinematic overflow-hidden group"
          >
            {/* Kyber glow pulse */}
            <span className="absolute inset-0 rounded bg-accent/5 animate-pulse pointer-events-none" />
            <span className="relative z-10">Surprise Me</span>
          </button>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border ${
              history.length > 0
                ? 'border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
                : 'border-border-subtle/50 text-text-muted/50 cursor-not-allowed'
            }`}
            title={history.length > 0 ? `Undo (${history.length} steps)` : 'No history'}
          >
            Undo
          </button>
        </div>
      </div>

      {/* Theme Presets */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-3">
          Theme
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(THEMES).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => setActiveTheme(key)}
              className={`px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border ${
                activeTheme === key
                  ? 'border-accent bg-accent-dim text-accent'
                  : 'border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      {/* Constrained Randomizer Locks */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-3">
          Lock Parameters
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {LOCK_OPTIONS.map(({ key, label }) => {
            const isLocked = locks.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleLock(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-ui-xs transition-colors border ${
                  isLocked
                    ? 'border-accent/60 bg-accent-dim text-accent'
                    : 'border-border-subtle bg-bg-surface text-text-secondary hover:text-text-primary hover:border-border-light'
                }`}
              >
                <span className="text-ui-sm">{isLocked ? '\u{1F512}' : '\u{1F513}'}</span>
                <span className="font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mutation Mode */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-3">
          Mutation Mode
        </h3>
        <button
          onClick={handleMutate}
          className="w-full px-3 py-2 rounded text-ui-xs font-medium transition-colors border border-border-subtle bg-bg-surface text-text-secondary hover:text-text-primary hover:border-border-light"
        >
          Nudge Current Config
        </button>
        <p className="text-ui-sm text-text-muted mt-1.5">
          Randomly tweaks 2-4 parameters by small amounts. Great for iterating.
        </p>
      </div>

      {/* Batch Preview */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-3">
          Batch Preview
        </h3>
        <button
          onClick={handleGenerateBatch}
          className="w-full px-3 py-2 rounded text-ui-xs font-medium transition-colors border border-border-subtle bg-bg-surface text-text-secondary hover:text-text-primary hover:border-border-light mb-3"
        >
          Generate 6 Variations
        </button>

        {showBatch && batchConfigs.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-2">
              {batchConfigs.map((bc, idx) => (
                <MiniPreviewCard
                  key={idx}
                  config={bc}
                  isSelected={selectedBatchIdx === idx}
                  onSelect={() => setSelectedBatchIdx(idx)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplyBatch}
                disabled={selectedBatchIdx === null}
                className={`flex-1 px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border ${
                  selectedBatchIdx !== null
                    ? 'border-accent bg-accent-dim text-accent hover:bg-accent/20'
                    : 'border-border-subtle/50 text-text-muted/50 cursor-not-allowed'
                }`}
              >
                Apply Selected
              </button>
              <button
                onClick={() => {
                  setShowBatch(false);
                  setBatchConfigs([]);
                  setSelectedBatchIdx(null);
                }}
                className="px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Standalone hook — used by DesignPanel for the top-level shortcut button
// ---------------------------------------------------------------------------

/**
 * Provides a single "surprise me" action that generates a random config using
 * the default "random" theme (no locks). Intended for the prominent shortcut
 * button at the top of the Design tab.
 */
export function useSurpriseMe() {
  const config = useBladeStore((s) => s.config);
  const setConfig = useBladeStore((s) => s.setConfig);

  // Keep a small undo stack local to this hook instance so the full
  // Randomizer panel undo still works independently.
  const historyRef = useRef<BladeConfig[]>([]);

  const surprise = useCallback(() => {
    historyRef.current = [config, ...historyRef.current].slice(0, 30);
    const theme = THEMES.random;
    setConfig(generateConfig(theme));
  }, [config, setConfig]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const [prev, ...rest] = historyRef.current;
    historyRef.current = rest;
    setConfig(prev);
  }, [setConfig]);

  return { surprise, undo, canUndo: historyRef.current.length > 0 };
}
