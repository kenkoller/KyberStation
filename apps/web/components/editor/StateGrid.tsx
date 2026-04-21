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

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { BladeEngine, EffectType } from '@kyberstation/engine';
import { BladeState } from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
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

  return (
    <div
      className={['flex flex-col h-full overflow-y-auto bg-bg-deep', className ?? ''].join(' ')}
      role="region"
      aria-label="All blade states"
    >
      <div
        className="font-mono uppercase text-text-muted px-3 py-1.5 border-b border-border-subtle shrink-0"
        style={{ fontSize: 10, letterSpacing: '0.1em' }}
      >
        All states · config-driven snapshots · {ledCount} LEDs
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-[2px] p-2">
        {ROWS.map((row, i) => (
          <StateGridRowView
            key={row.id}
            label={row.label}
            frame={frames?.[i] ?? null}
            ledCount={ledCount}
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
}

function StateGridRowView({ label, frame, ledCount }: StateGridRowViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      // Use the shared blade-render-metrics helper so the per-LED
      // content lines up with the same width-scaling the rest of the
      // app uses — consistent visual language across all surfaces.
      const metrics = computeBladeRenderMetrics({
        containerWidthPx: w,
        ledCount,
      });
      const leds = Math.min(ledCount, Math.floor(frame.length / 3));
      const leftPx = metrics.bladeLeftPx * dpr;
      const widthPx = metrics.bladeWidthPx * dpr;
      const cellW = widthPx / leds;
      for (let i = 0; i < leds; i++) {
        const r = frame[i * 3] ?? 0;
        const g = frame[i * 3 + 1] ?? 0;
        const b = frame[i * 3 + 2] ?? 0;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(leftPx + i * cellW, 0, Math.max(cellW + 0.5, 1), canvas.height);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [frame, ledCount]);

  return (
    <div className="flex items-center gap-2 shrink-0" style={{ height: 28 }}>
      <span
        className="font-mono uppercase text-text-secondary shrink-0"
        style={{ fontSize: 9, letterSpacing: '0.08em', width: 110 }}
      >
        {label}
      </span>
      <div
        ref={containerRef}
        className="flex-1 h-full rounded-sm border border-border-subtle overflow-hidden"
        style={{ minWidth: 0 }}
      >
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
      </div>
    </div>
  );
}
