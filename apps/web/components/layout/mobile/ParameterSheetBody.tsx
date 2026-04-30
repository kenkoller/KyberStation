'use client';

// ─── ParameterSheetBody — Phase 4.4 (2026-04-30) ────────────────────────────
//
// The default body content for ParameterSheet when used to deep-edit a
// single parameter. Renders:
//   - Large value readout (top, monospace tabular-nums)
//   - Full-width slider with min/max range labels
//   - Optional unit hint
//   - Modulation routing placeholder (Phase 4.4.x will wire bindings)
//
// At peek (168px) the body shows just the readout + slider — no scroll.
// At full (~720px) the modulation section is in scroll view below.
//
// Hosts thread the same callbacks they pass to MiniSlider, so editing
// in the sheet stays in sync with the surface slider behind it.

import { useId, type ReactNode } from 'react';
import type { MiniSliderColor } from '@/components/layout/mobile/MiniSlider';

const COLOR_CSS: Record<MiniSliderColor, string> = {
  accent: 'rgb(var(--accent))',
  warm: 'rgb(var(--accent-warm))',
  info: 'rgb(var(--status-info))',
  ok: 'rgb(var(--status-ok))',
  muted: 'rgb(var(--text-muted))',
};

interface ParameterSheetBodyProps {
  /** Numeric value the slider should reflect. */
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Format the headline value display (e.g. round to int + add unit). */
  formatDisplay: (v: number) => string;
  onChange: (next: number) => void;
  color?: MiniSliderColor;
  /** Optional extra content rendered below the slider — modulation
   *  routing, presets, etc. Visible mostly when sheet is at `full`. */
  extra?: ReactNode;
}

export function ParameterSheetBody({
  value,
  min,
  max,
  step = 1,
  unit,
  formatDisplay,
  onChange,
  color = 'accent',
  extra,
}: ParameterSheetBodyProps) {
  const inputId = useId();
  const range = max - min;
  const norm = range > 0 ? (value - min) / range : 0;
  const pct = Math.max(0, Math.min(1, norm)) * 100;
  const fillColor = COLOR_CSS[color];

  return (
    <div
      className="flex flex-col gap-4"
      data-parameter-sheet-body-content
    >
      {/* ── Headline value display ─────────────────────────────── */}
      <div
        className="flex items-baseline justify-between gap-2"
        data-parameter-sheet-headline
      >
        <label
          htmlFor={inputId}
          className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary"
        >
          Value
        </label>
        <span
          className="font-mono tabular-nums text-text-primary"
          style={{ fontSize: 24, lineHeight: 1, fontWeight: 600 }}
        >
          {formatDisplay(value)}
          {unit && (
            <span
              className="text-text-muted"
              style={{ fontSize: 14, marginLeft: 4 }}
            >
              {unit}
            </span>
          )}
        </span>
      </div>

      {/* ── Slider track ────────────────────────────────────────
          Larger than the MiniSlider's track for fat-finger comfort. */}
      <div className="relative" style={{ paddingTop: 8, paddingBottom: 8 }}>
        <div
          className="relative rounded-full bg-bg-deep border border-border-subtle/60"
          style={{ height: 8 }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${pct}%`,
              background: fillColor,
              boxShadow: `0 0 8px ${fillColor}`,
            }}
          />
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${pct}%`,
              width: 22,
              height: 22,
              background: fillColor,
              boxShadow: `0 0 12px ${fillColor}, 0 0 0 2px rgb(var(--bg-primary))`,
            }}
          />
        </div>

        {/* Native range input layered over the visual track. */}
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label="Edit parameter value"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ touchAction: 'pan-y' }}
        />
      </div>

      {/* ── Range readouts ──────────────────────────────────── */}
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted">
        <span>
          Min ·{' '}
          <span className="text-text-secondary">
            {formatDisplay(min)}
            {unit ?? ''}
          </span>
        </span>
        <span>
          Max ·{' '}
          <span className="text-text-secondary">
            {formatDisplay(max)}
            {unit ?? ''}
          </span>
        </span>
      </div>

      {/* ── Modulation placeholder (visible mostly at full) ──── */}
      <section
        className="rounded-interactive border border-border-subtle/60 bg-bg-surface/30 p-3"
        data-parameter-sheet-modulation
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary">
            Modulation
          </span>
          <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-text-muted">
            v1.1
          </span>
        </div>
        <p className="text-[11px] text-text-muted leading-relaxed">
          Bind a modulator (Swing · Sound · Time · Battery · Clash) to drive
          this parameter automatically. Available in v1.1 once the routing
          surface migrates to the mobile shell.
        </p>
      </section>

      {extra}
    </div>
  );
}
