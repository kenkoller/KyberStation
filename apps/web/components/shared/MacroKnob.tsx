'use client';

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

// ─── Pure geometry (exported for tests) ──────────────────────────────────────
//
// The knob arc sweeps ~270° (from 7 o'clock at the bottom-left through
// 12 o'clock up top and down to 5 o'clock at the bottom-right). Picking
// the same start/end angles as the reference atoms.jsx Knob so the shape
// reads identically to the Claude Design mockups.
//
// startA = -225° (7 o'clock, arcing CCW through top)
// endA   =  +45° (5 o'clock)
// sweep  =  270°

export const KNOB_START_ANGLE_DEG = -225;
export const KNOB_END_ANGLE_DEG = 45;

/**
 * Convert a normalized [0, 1] value into the indicator line's angle in
 * radians. Pure + deterministic so the SVG can be rendered server-side
 * without a client round-trip.
 */
export function valueToAngle(normalized: number): number {
  const v = Math.max(0, Math.min(1, normalized));
  const start = (KNOB_START_ANGLE_DEG * Math.PI) / 180;
  const end = (KNOB_END_ANGLE_DEG * Math.PI) / 180;
  return start + (end - start) * v;
}

/**
 * Map a vertical pointer delta (in CSS pixels) to a normalized delta.
 * Up = positive (knob turns clockwise, value increases). The sensitivity
 * matches the reference performance-bar.jsx (0.006 per pixel) — one full
 * 0→1 sweep is ≈167px of drag. Exported so tests can pin the math.
 */
export const DEFAULT_KNOB_SENSITIVITY = 0.006;

export function computeKnobDelta(
  deltaY: number,
  sensitivity: number = DEFAULT_KNOB_SENSITIVITY,
): number {
  // Pointer deltaY is positive-down in browser coords, but "up to increase"
  // is the Maschine / NI convention. Flip the sign.
  // Normalize -0 → +0 so callers can rely on Object.is-based equality.
  const next = -deltaY * sensitivity;
  return next === 0 ? 0 : next;
}

export function applyKnobDrag(
  startValue: number,
  deltaY: number,
  sensitivity: number = DEFAULT_KNOB_SENSITIVITY,
): number {
  const next = startValue + computeKnobDelta(deltaY, sensitivity);
  if (Number.isNaN(next)) return 0;
  if (next < 0) return 0;
  if (next > 1) return 1;
  return next;
}

/**
 * Pure arc-path builder. Centered at (cx, cy) with radius r, sweeping
 * from angle a0 to a1 (radians). Returns an SVG `d` attribute string.
 * Exported so snapshot tests of the generated geometry are stable.
 */
export function svgArcPath(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
): string {
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface MacroKnobProps {
  value: number;
  onChange: (next: number) => void;
  /** UPPERCASE label above the knob (keep ≤10 chars). */
  label: string;
  /** Optional secondary readout shown below the knob. Defaults to % of value. */
  readout?: string;
  /** Stroke color for the value arc + indicator. Defaults to accent. */
  color?: string;
  /** Pixel size of the SVG square. Defaults to 54. */
  size?: number;
  /** Tooltip shown on hover. */
  title?: string;
  /** When true, drag is disabled and the knob visually dims. */
  disabled?: boolean;
  /** Pointer sensitivity in value-units per pixel. Defaults to 0.006. */
  sensitivity?: number;
}

/**
 * Knob primitive for the PerformanceBar macro strip. Vertical drag
 * increases / decreases the value — Maschine / SSL convention. The
 * visual matches the reference atoms.jsx Knob: 270° arc track with a
 * value-tinted overlay, a dark hub, and a 1.5px indicator line.
 *
 * Keeps markup self-contained so PerformanceBar consumers only need to
 * wire `value` + `onChange`. The drag math is split out above and
 * covered by unit tests so the component itself stays a thin shell.
 */
export function MacroKnob({
  value,
  onChange,
  label,
  readout,
  color,
  size = 54,
  title,
  disabled = false,
  sensitivity = DEFAULT_KNOB_SENSITIVITY,
}: MacroKnobProps) {
  const dragState = useRef<{
    pointerId: number;
    startY: number;
    startValue: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (disabled) return;
      if (e.button !== 0) return;
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      dragState.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        startValue: value,
      };
      setIsDragging(true);
    },
    [disabled, value],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const s = dragState.current;
      if (!s || s.pointerId !== e.pointerId) return;
      const dy = e.clientY - s.startY;
      const next = applyKnobDrag(s.startValue, dy, sensitivity);
      onChange(next);
    },
    [onChange, sensitivity],
  );

  const endDrag = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    const s = dragState.current;
    if (s && s.pointerId === e.pointerId) {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      dragState.current = null;
      setIsDragging(false);
    }
  }, []);

  // Double-click to reset to center (0.5). Matches Maschine / Ableton
  // convention where dbl-click restores a control's default.
  const onDoubleClick = useCallback(() => {
    if (disabled) return;
    onChange(0.5);
  }, [disabled, onChange]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;
  const startA = (KNOB_START_ANGLE_DEG * Math.PI) / 180;
  const endA = (KNOB_END_ANGLE_DEG * Math.PI) / 180;
  const valA = valueToAngle(value);

  const trackPath = svgArcPath(cx, cy, r, startA, endA);
  const valuePath = svgArcPath(cx, cy, r, startA, valA);

  const indicator = {
    x1: cx + r * 0.32 * Math.cos(valA),
    y1: cy + r * 0.32 * Math.sin(valA),
    x2: cx + r * 0.92 * Math.cos(valA),
    y2: cy + r * 0.92 * Math.sin(valA),
  };

  const strokeColor = color ?? 'rgb(var(--accent) / 1)';
  const trackColor = 'rgb(var(--border-subtle) / 1)';
  const hubFill = 'rgb(var(--bg-deep) / 1)';
  const hubStroke = 'rgb(var(--border-subtle) / 1)';

  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const readoutText = readout ?? `${percent}%`;

  return (
    <div
      className="flex flex-col items-center select-none"
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <div
        className="font-mono uppercase text-text-muted whitespace-nowrap"
        style={{
          fontSize: 10,
          letterSpacing: '0.05em',
          lineHeight: '11px',
          // W10e (2026-04-22): tightened marginBottom 2 → 0 so the
          // knob column doesn't eat an extra 2px per row. Combined
          // with the wrapping row's py-0 this removes the whole
          // "extra vertical padding" band Ken flagged.
          marginBottom: 0,
        }}
        aria-hidden="true"
      >
        {label}
      </div>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={Math.max(0, Math.min(1, value))}
        aria-valuetext={readoutText}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClick}
        style={{
          cursor: disabled ? 'not-allowed' : isDragging ? 'ns-resize' : 'pointer',
          touchAction: 'none',
          borderRadius: 'var(--r-interactive, 4px)',
          outline: 'none',
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            onChange(Math.min(1, value + (e.shiftKey ? 0.1 : 0.02)));
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            onChange(Math.max(0, value - (e.shiftKey ? 0.1 : 0.02)));
          } else if (e.key === 'Home') {
            e.preventDefault();
            onChange(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            onChange(1);
          }
        }}
      >
        <title>{title ?? `${label}: ${readoutText} — drag up / down to adjust`}</title>
        {/* Track */}
        <path d={trackPath} stroke={trackColor} strokeWidth={2} fill="none" strokeLinecap="butt" />
        {/* Value arc */}
        <path d={valuePath} stroke={strokeColor} strokeWidth={2} fill="none" strokeLinecap="butt" />
        {/* Hub */}
        <circle cx={cx} cy={cy} r={r * 0.62} fill={hubFill} stroke={hubStroke} strokeWidth={1} />
        {/* Indicator line */}
        <line
          x1={indicator.x1}
          y1={indicator.y1}
          x2={indicator.x2}
          y2={indicator.y2}
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="butt"
        />
      </svg>
      <div
        className="font-mono tabular-nums text-text-secondary"
        style={{
          fontSize: 10,
          letterSpacing: '0.02em',
          lineHeight: '11px',
          // W10e: marginTop 2 → 0 (see matching comment on the label
          // above). The readout docks right under the knob.
          marginTop: 0,
        }}
      >
        {readoutText}
      </div>
    </div>
  );
}
