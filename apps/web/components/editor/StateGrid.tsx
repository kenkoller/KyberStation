'use client';

// ─── StateGrid — OV8 ────────────────────────────────────────────────────────
//
// Full-workbench-width takeover of the blade-preview region on the
// Design tab. Renders 9 vertically-stacked captured blade frames at
// the same width — changing a color / style / parameter reads across
// all states simultaneously.
//
// Activated via the `[ SINGLE BLADE ] · [ ALL STATES ]` toggle chip in
// the editor chrome, or ⌘5 / Ctrl+5. Only visible on Design tab (the
// toggle chip is hidden on other tabs). Uses the same engine
// `captureStateFrame` API that powers Inspector's STATE tab, just with
// a bigger canvas per row.

import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import type { BladeEngine, EffectType } from '@kyberstation/engine';
import { BladeState } from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { computeBladeRenderMetrics } from '@/lib/bladeRenderMetrics';

interface StateGridRow {
  id: string;
  label: string;
  state: BladeState;
  effect?: EffectType;
  progress?: number;
}

const ROWS: readonly StateGridRow[] = [
  { id: 'off',        label: 'OFF',            state: BladeState.OFF },
  { id: 'preon',      label: 'PREON',          state: BladeState.PREON,      progress: 0.5 },
  { id: 'igniting',   label: 'IGNITING 50%',   state: BladeState.IGNITING,   progress: 0.5 },
  { id: 'on',         label: 'IDLE ON',        state: BladeState.ON },
  { id: 'clash',      label: 'CLASH',          state: BladeState.ON, effect: 'clash' },
  { id: 'blast',      label: 'BLAST',          state: BladeState.ON, effect: 'blast' },
  { id: 'lockup',     label: 'LOCKUP',         state: BladeState.ON, effect: 'lockup' },
  { id: 'drag',       label: 'DRAG',           state: BladeState.ON, effect: 'drag' },
  { id: 'retracting', label: 'RETRACTING 50%', state: BladeState.RETRACTING, progress: 0.5 },
] as const;

interface StateGridProps {
  engineRef: RefObject<BladeEngine | null>;
  className?: string;
}

export function StateGrid({ engineRef, className }: StateGridProps) {
  const config = useBladeStore((s) => s.config);
  const ledCount = config.ledCount;
  const bladeStartFrac = useUIStore((s) => s.bladeStartFrac);
  const toggleStateGrid = useUIStore((s) => s.toggleStateGrid);

  const frames = useMemo(() => {
    const engine = engineRef.current;
    if (!engine) return null;
    return ROWS.map((row) => {
      try {
        return engine.captureStateFrame(row.state, config, row.effect, {
          progress: row.progress ?? 1,
        });
      } catch {
        return new Uint8Array(ledCount * 3);
      }
    });
  }, [config, engineRef, ledCount]);

  // Click a state row → set the live engine to that state (or trigger
  // the analogous animation/effect) and switch back to single-blade
  // view so the user sees the result in the main BLADE PREVIEW above.
  const handleRowClick = useCallback(
    (row: StateGridRow) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (row.effect) {
        engine.triggerEffect(row.effect);
      } else if (row.state === BladeState.OFF || row.state === BladeState.RETRACTING) {
        engine.retract();
      } else {
        // PREON / IGNITING / ON all enter via ignite() — preon plays
        // first if configured, then the ignition animation, then ON.
        engine.ignite();
      }
      toggleStateGrid();
    },
    [engineRef, toggleStateGrid],
  );

  return (
    <div
      className={['flex flex-col h-full overflow-y-auto bg-bg-deep', className ?? ''].join(' ')}
      role="region"
      aria-label="All blade states"
    >
      <div className="flex-1 min-h-0 flex flex-col gap-[2px] p-2">
        {ROWS.map((row, i) => (
          <StateGridRowView
            key={row.id}
            label={row.label}
            frame={frames?.[i] ?? null}
            ledCount={ledCount}
            bladeStartFrac={bladeStartFrac}
            onClick={() => handleRowClick(row)}
          />
        ))}
      </div>
    </div>
  );
}

interface StateGridRowViewProps {
  label: string;
  frame: Uint8Array | null;
  ledCount: number;
  bladeStartFrac: number;
  onClick: () => void;
}

function StateGridRowView({ label, frame, ledCount, bladeStartFrac, onClick }: StateGridRowViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w < 1 || h < 1) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#03030a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!frame || ledCount <= 0) return;
      // Phase 1.5x (2026-04-24): rows now align Point A → Point B
      // with the main BLADE PREVIEW canvas above. Each row's LED band
      // starts at `bladeStartFrac/1000 * containerWidth` and ends at
      // the auto-fit bladeWidth — same metrics the pixel strip uses,
      // so all three regions share one anchored coordinate system.
      const metrics = computeBladeRenderMetrics({
        containerWidthPx: w,
        ledCount,
        bladeStartFrac,
      });
      const stripLeft = metrics.bladeLeftPx * dpr;
      const stripW = metrics.bladeWidthPx * dpr;
      const leds = Math.min(ledCount, Math.floor(frame.length / 3));
      const cellW = stripW / leds;
      for (let i = 0; i < leds; i++) {
        const r = frame[i * 3] ?? 0;
        const g = frame[i * 3 + 1] ?? 0;
        const b = frame[i * 3 + 2] ?? 0;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(stripLeft + i * cellW, 0, Math.max(cellW + 0.5, 1), canvas.height);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [frame, ledCount, bladeStartFrac]);

  return (
    <button
      ref={containerRef}
      type="button"
      onClick={onClick}
      title={`Set blade preview to ${label}`}
      aria-label={`Set blade preview to ${label}`}
      className="relative shrink-0 rounded-sm border border-border-subtle overflow-hidden text-left hover:border-accent-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60 transition-colors cursor-pointer"
      style={{ height: 28, minWidth: 0 }}
    >
      <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} className="absolute inset-0" />
      {/* Label is overlaid in the pre-blade hilt area (X < bladeLeftPx)
          so the canvas can span full row width and Point A / Point B
          line up exactly with the main BLADE PREVIEW above. */}
      <span
        className="absolute top-1/2 -translate-y-1/2 left-2 font-mono uppercase text-text-secondary pointer-events-none"
        style={{ fontSize: 9, letterSpacing: '0.08em' }}
      >
        {label}
      </span>
    </button>
  );
}
