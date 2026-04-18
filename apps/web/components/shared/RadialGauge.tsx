// ─── RadialGauge — Returnal-style Integrity Gauge ───
//
// Circular arc sweeping 270° (with a 90° gap at the bottom) that fills
// proportionally with `value / max`. The stroke color shifts through
// ok / warn / critical tiers using the global `--status-*` tokens, and
// the gauge respects the `criticalStateChange` motion primitive from
// UX_NORTH_STAR §7 by optionally pulsing when the tier escalates.
//
// Pure presentation. The panel owns the data + threshold logic; this
// component just renders + animates. That keeps it reusable between
// StorageBudgetPanel, PowerDrawPanel, and any future gauge-style panel
// (e.g. runtime, sensor, SmoothSwing EQ).
//
// Implementation notes:
//   - SVG, not canvas. Crisp at any zoom, easy to export for the Saber
//     Card renderer later, and CSS `transition` on `stroke-dashoffset`
//     gives us smooth value animation with zero RAF bookkeeping.
//   - `viewBox="0 0 100 100"` regardless of the `size` prop — so the
//     caller-facing size is just a diameter in px, and the tick/stroke
//     math stays resolution-independent.
//   - Tick marks render as individual `<line>` elements so a consumer
//     can match the Maschine-style perimeter rhythm without hacking
//     dash patterns.

'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

// ─── Types ───────────────────────────────────────────────────────────

export interface RadialGaugeTiers {
  /** Values at or above `warn` render in the warn token. */
  warn: number;
  /** Values at or above `critical` render in the error token. */
  critical: number;
}

export interface RadialGaugeProps {
  /** Current value. Clamped to `[0, max]` for display. */
  value: number;
  /** Full-scale value. When zero or negative the gauge renders empty. */
  max: number;
  /** Central readout label, e.g. "FLASH" or "POWER". */
  label?: string;
  /**
   * Suffix for the central numeric readout. When the unit is `"%"` the
   * readout shows a percentage; otherwise it shows the raw `value`.
   */
  unit?: string;
  /**
   * Tier thresholds expressed in the same units as `value` / `max`.
   * Defaults to percentage thresholds (75 / 90) which assumes you're
   * using `unit="%"`. Override for absolute-unit gauges.
   */
  tiers?: RadialGaugeTiers;
  /** Show ⚠ / ✕ glyph alongside the readout when tier is warn/critical. */
  glyphPairing?: boolean;
  /** Overall diameter in px. Default 120. */
  size?: number;
  /** Trigger a `criticalStateChange` pulse on tier escalation. Default true. */
  pulseOnThresholdCrossing?: boolean;
  /** Additional classes for the outer wrapper. */
  className?: string;
}

// ─── Geometry ────────────────────────────────────────────────────────

/** SVG-space constants. viewBox is 100×100 regardless of render size. */
const CENTER = 50;
const RADIUS = 42;
const STROKE_WIDTH = 6;
const TRACK_WIDTH = 4;
const ARC_SWEEP_DEG = 270; // 90° gap at the bottom
const ARC_START_DEG = 135; // start at the 7-o'clock position
const TICK_COUNT = 10;
const TICK_INNER = 33;
const TICK_OUTER = 38;

/** Full arc length used for stroke-dasharray. */
const ARC_LENGTH = (ARC_SWEEP_DEG / 360) * 2 * Math.PI * RADIUS;

/** Point on the circle at `angleDeg` (0° = 3 o'clock, CCW positive). */
function polar(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER - r * Math.sin(rad) };
}

/**
 * Build the SVG arc path for the gauge background track. The path sweeps
 * clockwise from ARC_START_DEG for ARC_SWEEP_DEG total — 270° with a
 * 90° gap at the bottom, matching the Returnal integrity gauge.
 */
function buildTrackPath(): string {
  const start = polar(ARC_START_DEG, RADIUS);
  const end = polar(ARC_START_DEG - ARC_SWEEP_DEG, RADIUS);
  const largeArc = ARC_SWEEP_DEG > 180 ? 1 : 0;
  // sweep-flag=0 → clockwise in SVG coords (y-axis flipped vs. math).
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

const TRACK_PATH = buildTrackPath();

// ─── Tier / readout helpers ──────────────────────────────────────────

export type GaugeTier = 'ok' | 'warn' | 'critical';

function tierOf(value: number, tiers: RadialGaugeTiers): GaugeTier {
  if (value >= tiers.critical) return 'critical';
  if (value >= tiers.warn) return 'warn';
  return 'ok';
}

function tokenVarFor(tier: GaugeTier): string {
  return tier === 'critical'
    ? '--status-error'
    : tier === 'warn'
      ? '--status-warn'
      : '--status-ok';
}

function glyphFor(tier: GaugeTier): string | null {
  if (tier === 'critical') return '\u2715'; // ✕
  if (tier === 'warn') return '\u26A0';     // ⚠
  return null;
}

// ─── Component ───────────────────────────────────────────────────────

/**
 * Returnal-style radial integrity gauge.
 *
 *   <RadialGauge value={usedBytes} max={totalBytes} unit="%" label="FLASH" />
 *   <RadialGauge value={drawAmps}  max={budgetAmps} unit="A" label="POWER" />
 *
 * The central readout renders a percentage when `unit === "%"` and the
 * raw `value` otherwise. Readout typography is JetBrains Mono tabular-
 * nums so the number doesn't jitter as it updates.
 */
export function RadialGauge({
  value,
  max,
  label,
  unit = '%',
  tiers = { warn: 75, critical: 90 },
  glyphPairing = true,
  size = 120,
  pulseOnThresholdCrossing = true,
  className = '',
}: RadialGaugeProps): JSX.Element {
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  // Guard against NaN / zero-max / negative values — the gauge still
  // renders, just empty.
  const safeMax = max > 0 && Number.isFinite(max) ? max : 0;
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(value, safeMax)) : 0;
  const fillRatio = safeMax > 0 ? safeValue / safeMax : 0;

  // The tier is measured in the same units the caller supplied the
  // thresholds in. When `unit === "%"` the default thresholds (75 / 90)
  // are percentages of `max`, so we compare against the percent value.
  const tierValue = unit === '%' && safeMax > 0 ? (safeValue / safeMax) * 100 : safeValue;
  const tier = tierOf(tierValue, tiers);
  const tokenVar = tokenVarFor(tier);
  const glyph = glyphPairing ? glyphFor(tier) : null;

  // criticalStateChange pulse — fire once per tier escalation.
  // Skip entirely when reducedMotion is set so we don't trigger any
  // scale/glow animation for users who opted out.
  const prevTierRef = useRef<GaugeTier>(tier);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    const prev = prevTierRef.current;
    const escalated =
      (prev === 'ok' && tier !== 'ok') ||
      (prev === 'warn' && tier === 'critical');
    if (escalated && pulseOnThresholdCrossing && !reducedMotion) {
      setPulseKey((k) => k + 1);
    }
    prevTierRef.current = tier;
  }, [tier, pulseOnThresholdCrossing, reducedMotion]);

  // Numeric readout — percentage for `%`, raw value otherwise.
  const readoutNumber =
    unit === '%' ? (fillRatio * 100).toFixed(fillRatio * 100 >= 10 ? 0 : 1) : formatReadoutValue(safeValue);
  const readoutUnit = unit;

  // Dash offset = length of the unfilled portion. CSS transition
  // handles the sweep animation — zero RAF bookkeeping.
  const dashOffset = ARC_LENGTH * (1 - fillRatio);

  // Accessibility: describe the gauge via ARIA progressbar semantics.
  const ariaLabel = label ? `${label} gauge` : 'integrity gauge';
  const ariaValueText =
    unit === '%'
      ? `${readoutNumber} percent`
      : `${readoutNumber}${unit ? ' ' + unit : ''}`;

  return (
    <div
      className={`rg-root ${className}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-block',
        ['--rg-token' as string]: `rgb(var(${tokenVar}))`,
        ['--rg-token-glow' as string]: `rgb(var(${tokenVar}) / 0.35)`,
      }}
    >
      <style>{`
        @keyframes rg-threshold-pulse {
          0%   { transform: scale(1); filter: drop-shadow(0 0 0 transparent); }
          25%  { transform: scale(1.03); filter: drop-shadow(0 0 6px var(--rg-token-glow)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0 transparent); }
        }
        .rg-pulse { animation: rg-threshold-pulse 780ms ease-out; }
        .rg-arc-fill { transition: stroke-dashoffset 260ms ease-out, stroke 240ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .rg-pulse { animation: none; }
          .rg-arc-fill { transition: stroke 240ms ease-out; }
        }
      `}</style>
      <svg
        key={`rg-pulse-${pulseKey}`}
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={pulseKey > 0 ? 'rg-pulse' : ''}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={Math.round(tierValue)}
        aria-valuemin={0}
        aria-valuemax={unit === '%' ? 100 : safeMax}
        aria-valuetext={ariaValueText}
      >
        {/* Background track */}
        <path
          d={TRACK_PATH}
          fill="none"
          stroke="rgb(var(--border-subtle))"
          strokeWidth={TRACK_WIDTH}
          strokeLinecap="round"
          opacity={0.6}
        />
        {/* Filled arc */}
        <path
          className="rg-arc-fill"
          d={TRACK_PATH}
          fill="none"
          stroke="var(--rg-token)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={dashOffset}
        />
        {/* Perimeter ticks — 10 marks spanning the 270° sweep. */}
        {Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
          const t = i / TICK_COUNT;
          const angle = ARC_START_DEG - ARC_SWEEP_DEG * t;
          const inner = polar(angle, TICK_INNER);
          const outer = polar(angle, TICK_OUTER);
          const tickFilled = t <= fillRatio + 0.001;
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={tickFilled ? 'var(--rg-token)' : 'rgb(var(--text-muted))'}
              strokeWidth={0.8}
              strokeLinecap="round"
              opacity={tickFilled ? 0.9 : 0.45}
            />
          );
        })}
        {/* Central numeric readout */}
        <text
          x={CENTER}
          y={CENTER - 2}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
            fontSize: 16,
            fontWeight: 600,
            fill: 'var(--rg-token)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {readoutNumber}
          <tspan
            style={{ fontSize: 8, fontWeight: 500 }}
            dx={1}
            dy={-4}
            fill="rgb(var(--text-muted))"
          >
            {readoutUnit}
          </tspan>
        </text>
        {/* Label — tiny uppercase below the readout */}
        {label && (
          <text
            x={CENTER}
            y={CENTER + 12}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
              fontSize: 6,
              fontWeight: 500,
              letterSpacing: '0.15em',
              fill: 'rgb(var(--text-muted))',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </text>
        )}
        {/* Threshold glyph — only when paired and tier is warn/critical. */}
        {glyph && (
          <text
            x={CENTER}
            y={CENTER + 21}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
              fontSize: 7,
              fill: 'var(--rg-token)',
            }}
            aria-hidden="true"
          >
            {glyph}
          </text>
        )}
      </svg>
    </div>
  );
}

// ─── Helpers (exported for tests) ────────────────────────────────────

/**
 * Formats a raw-value readout for non-percentage gauges. Compact enough
 * to stay under the label but keeps one decimal below 10 for amp gauges
 * where small fractional draws matter.
 */
export function formatReadoutValue(v: number): string {
  if (!Number.isFinite(v)) return '0';
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

/** Exposed for unit tests — classifies a value against thresholds. */
export function classifyTier(value: number, tiers: RadialGaugeTiers): GaugeTier {
  return tierOf(value, tiers);
}
