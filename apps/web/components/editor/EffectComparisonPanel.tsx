'use client';
import { useRef, useEffect, useCallback, useMemo } from 'react';
import { BladeEngine } from '@kyberstation/engine';
import type { EffectType } from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { getThemeById } from '@/lib/canvasThemes';

// ─── Effect row definitions ───────────────────────────────────────────────────

interface EffectRowDef {
  type: EffectType;
  label: string;
  /** Sustained effects stay active; transient effects are re-triggered periodically */
  sustained: boolean;
  /** Key in BladeConfig for the color swatch shown at row right */
  configKey: string;
  /** Which color channel to jump to in ColorPanel when clicked */
  colorChannel: string;
}

const EFFECT_ROWS: EffectRowDef[] = [
  { type: 'clash',     label: 'Clash',     sustained: false, configKey: 'clashColor',     colorChannel: 'clashColor'     },
  { type: 'blast',     label: 'Blast',     sustained: false, configKey: 'blastColor',     colorChannel: 'blastColor'     },
  { type: 'stab',      label: 'Stab',      sustained: false, configKey: 'clashColor',     colorChannel: 'clashColor'     },
  { type: 'force',     label: 'Force',     sustained: false, configKey: 'baseColor',      colorChannel: 'baseColor'      },
  { type: 'lockup',    label: 'Lockup',    sustained: true,  configKey: 'lockupColor',    colorChannel: 'lockupColor'    },
  { type: 'lightning', label: 'Lightning', sustained: true,  configKey: 'lightningColor', colorChannel: 'lightningColor' },
  { type: 'drag',      label: 'Drag',      sustained: true,  configKey: 'dragColor',      colorChannel: 'dragColor'      },
  { type: 'melt',      label: 'Melt',      sustained: true,  configKey: 'meltColor',      colorChannel: 'meltColor'      },
];

/** How often to re-trigger transient effects on the snapshot engine (ms) */
const SNAPSHOT_RETRIGGER_MS = 900;

/** How many simulation steps to fast-forward ignition at 60 fps */
const IGNITION_WARMUP_FRAMES = 120;

/** How many extra steps to run after triggering to reach peak brightness */
const PEAK_WARMUP_FRAMES = 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Render a pixel array onto a canvas context at the given height */
function renderStrip(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8Array | Uint8ClampedArray | number[],
  ledCount: number,
  stripBg: string,
  canvasW: number,
  canvasH: number,
) {
  // Background
  ctx.fillStyle = stripBg;
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (pixels.length < ledCount * 3) return;

  const cellW = canvasW / ledCount;
  for (let j = 0; j < ledCount; j++) {
    const r = pixels[j * 3] ?? 0;
    const g = pixels[j * 3 + 1] ?? 0;
    const b = pixels[j * 3 + 2] ?? 0;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(j * cellW, 0, Math.max(cellW, 1), canvasH);
  }
}

/** Build a fully warmed-up BladeEngine at peak effect intensity */
function buildSnapshotEngine(
  rowIndex: number,
  config: ReturnType<typeof useBladeStore.getState>['config'],
): BladeEngine {
  const engine = new BladeEngine();
  engine.ignite();
  // Fast-forward through ignition
  for (let f = 0; f < IGNITION_WARMUP_FRAMES; f++) engine.update(16.67, config);
  // Trigger the effect
  engine.triggerEffect(EFFECT_ROWS[rowIndex].type);
  // Advance a few frames so the effect reaches peak brightness
  for (let f = 0; f < PEAK_WARMUP_FRAMES; f++) engine.update(16.67, config);
  return engine;
}

// ─── EffectRow ────────────────────────────────────────────────────────────────

interface EffectRowProps {
  rowDef: EffectRowDef;
  rowIndex: number;
  config: ReturnType<typeof useBladeStore.getState>['config'];
  stripBg: string;
  isPaused: boolean;
  reducedMotion: boolean;
  onRowClick: (row: EffectRowDef) => void;
}

function EffectRow({
  rowDef,
  rowIndex,
  config,
  stripBg,
  isPaused,
  reducedMotion,
  onRowClick,
}: EffectRowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Snapshot state — built once per config change
  const snapshotEngineRef = useRef<BladeEngine | null>(null);
  const snapshotPixelsRef = useRef<Uint8Array | number[] | null>(null);

  // Hover animation state
  const hoverEngineRef = useRef<BladeEngine | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastRetriggerRef = useRef<number>(0);
  const isHoveringRef = useRef<boolean>(false);

  const configRef = useRef(config);
  configRef.current = config;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const stripBgRef = useRef(stripBg);
  stripBgRef.current = stripBg;

  // ── Build snapshot engine whenever config changes ──
  useEffect(() => {
    const cfg = configRef.current;
    const engine = buildSnapshotEngine(rowIndex, cfg);
    snapshotEngineRef.current = engine;

    // Capture the static pixel array (copy so it isn't mutated by future updates)
    const raw = engine.getPixels();
    snapshotPixelsRef.current = new Uint8Array(raw);

    // Draw the static snapshot immediately (no animation)
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderStrip(ctx, snapshotPixelsRef.current, cfg.ledCount, stripBgRef.current, canvas.width, canvas.height);

    // If we're currently hovering, reset the hover engine so it picks up new config
    if (isHoveringRef.current && hoverEngineRef.current) {
      hoverEngineRef.current = buildHoverEngine(rowIndex, cfg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.baseColor,
    config.clashColor,
    config.lockupColor,
    config.blastColor,
    config.style,
    config.ledCount,
    rowIndex,
  ]);

  // ── Draw static snapshot whenever NOT hovering (also on isPaused toggle) ──
  useEffect(() => {
    if (isPaused || !isHoveringRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pixels = snapshotPixelsRef.current;
      if (pixels) {
        renderStrip(ctx, pixels, configRef.current.ledCount, stripBgRef.current, canvas.width, canvas.height);
      }
    }
  }, [isPaused]);

  // ── Hover animation helpers ──

  function buildHoverEngine(
    idx: number,
    cfg: typeof config,
  ): BladeEngine {
    const eng = new BladeEngine();
    eng.ignite();
    for (let f = 0; f < IGNITION_WARMUP_FRAMES; f++) eng.update(16.67, cfg);
    eng.triggerEffect(EFFECT_ROWS[idx].type);
    return eng;
  }

  const animateHover = useCallback((timestamp: number) => {
    if (!isHoveringRef.current || isPausedRef.current) {
      // Stopped hovering or paused: draw snapshot and bail
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx && snapshotPixelsRef.current) {
          renderStrip(ctx, snapshotPixelsRef.current, configRef.current.ledCount, stripBgRef.current, canvas.width, canvas.height);
        }
      }
      return;
    }

    const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16.67;
    lastTimeRef.current = timestamp;

    const engine = hoverEngineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    const cfg = configRef.current;
    engine.update(delta, cfg);

    // Re-trigger transient effects so they loop visibly
    if (!EFFECT_ROWS[rowIndex].sustained) {
      if (!lastRetriggerRef.current) lastRetriggerRef.current = timestamp;
      if (timestamp - lastRetriggerRef.current > SNAPSHOT_RETRIGGER_MS) {
        engine.triggerEffect(EFFECT_ROWS[rowIndex].type);
        lastRetriggerRef.current = timestamp;
      }
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      renderStrip(ctx, engine.getPixels(), cfg.ledCount, stripBgRef.current, canvas.width, canvas.height);
    }

    rafRef.current = requestAnimationFrame(animateHover);
  }, [rowIndex]);

  const handleMouseEnter = useCallback(() => {
    if (isPausedRef.current || reducedMotion) return;

    isHoveringRef.current = true;
    lastTimeRef.current = 0;
    lastRetriggerRef.current = 0;

    // Build a fresh hover engine each time the user hovers
    hoverEngineRef.current = buildHoverEngine(rowIndex, configRef.current);

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animateHover);
  }, [rowIndex, reducedMotion, animateHover]);

  const handleMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
    cancelAnimationFrame(rafRef.current);

    // Draw the static snapshot immediately on leave
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixels = snapshotPixelsRef.current;
    if (pixels) {
      renderStrip(ctx, pixels, configRef.current.ledCount, stripBgRef.current, canvas.width, canvas.height);
    }
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Color swatch from config ──
  const swatchColor = useMemo(() => {
    const color = (config as Record<string, unknown>)[rowDef.configKey];
    if (color && typeof color === 'object' && color !== null && 'r' in color) {
      return color as { r: number; g: number; b: number };
    }
    return config.clashColor;
  }, [config, rowDef.configKey]);

  return (
    <div
      className="flex items-center gap-2 cursor-pointer group"
      onClick={() => onRowClick(rowDef)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={`Hover to preview ${rowDef.label} effect · Click to edit color`}
    >
      {/* Effect name */}
      <span className="w-14 text-ui-xs text-text-secondary font-medium shrink-0 text-right group-hover:text-accent transition-colors select-none">
        {rowDef.label}
      </span>

      {/* Pixel strip canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 rounded-sm border border-border-subtle"
        style={{ height: 24 }}
        width={800}
        height={24}
      />

      {/* Color swatch */}
      <div
        className="w-3.5 h-3.5 rounded-sm border border-border-subtle shrink-0 ring-0 group-hover:ring-1 group-hover:ring-accent/50 transition-all"
        style={{ backgroundColor: `rgb(${swatchColor.r},${swatchColor.g},${swatchColor.b})` }}
      />
    </div>
  );
}

// ─── EffectComparisonPanel ────────────────────────────────────────────────────

export function EffectComparisonPanel() {
  const config = useBladeStore((s) => s.config);
  const canvasTheme = useUIStore((s) => s.canvasTheme);
  const isPaused = useUIStore((s) => s.isPaused);
  const showEffectComparison = useUIStore((s) => s.showEffectComparison);
  const toggleEffectComparison = useUIStore((s) => s.toggleEffectComparison);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const setActiveColorChannel = useUIStore((s) => s.setActiveColorChannel);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  const theme = useMemo(() => getThemeById(canvasTheme), [canvasTheme]);

  const handleRowClick = useCallback((row: EffectRowDef) => {
    setActiveTab('design');
    setActiveColorChannel(row.colorChannel);
  }, [setActiveTab, setActiveColorChannel]);

  return (
    <div className="shrink-0 border-b border-border-subtle bg-bg-secondary/30">
      {/* ── Collapsible header ── */}
      <button
        type="button"
        onClick={toggleEffectComparison}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-bg-surface/40 transition-colors group"
        aria-expanded={showEffectComparison}
        aria-controls="effect-comparison-body"
      >
        <span className="text-ui-xs text-text-muted font-medium uppercase tracking-widest">
          Effect Comparison
        </span>
        <svg
          className={`w-3 h-3 text-text-muted transition-transform duration-150 ${showEffectComparison ? 'rotate-0' : '-rotate-90'}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="2 4 6 8 10 4" />
        </svg>
      </button>

      {/* ── Strip rows ── */}
      {showEffectComparison && (
        <div
          id="effect-comparison-body"
          className="px-3 pb-2 pt-0.5 grid gap-0.5"
        >
          {/* Hint text */}
          <p className="text-ui-xs text-text-muted mb-1 leading-tight">
            {isPaused
              ? 'Paused — resume to animate on hover'
              : 'Hover a strip to preview · Click to edit color'}
          </p>

          {EFFECT_ROWS.map((row, i) => (
            <EffectRow
              key={row.type}
              rowDef={row}
              rowIndex={i}
              config={config}
              stripBg={theme.stripBg}
              isPaused={isPaused}
              reducedMotion={reducedMotion}
              onRowClick={handleRowClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
