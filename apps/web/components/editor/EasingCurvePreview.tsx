'use client';

// ─── Easing Curve Preview ───
//
// Small inline SVG plot of a named easing function. Renders the curve
// from (0, 1) (top-left) to (1, 0) (bottom-right) — progress on X,
// output on Y (flipped so rising curves go up-right, matching how
// users read charts). Purely presentational; no state, no interaction.
//
// Used by TimelinePanel to let users SEE the shape of the easing
// they've picked alongside the dropdown.

import type { EasingCurve } from '@/stores/timelineStore';
import { easingFn } from '@/lib/easingMath';

const SAMPLES = 48;

interface EasingCurvePreviewProps {
  curve: EasingCurve;
  /** CSS colour for the stroke. Defaults to accent. */
  color?: string;
  /** SVG viewBox width in px; height is 60% of this. Default 80. */
  width?: number;
}

export function EasingCurvePreview({
  curve,
  color = 'rgb(var(--accent))',
  width = 80,
}: EasingCurvePreviewProps) {
  const height = Math.round(width * 0.6);

  // Sample the curve, compute SVG path.
  let path = `M 0 ${height}`;
  for (let i = 1; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const y = easingFn(curve, t);
    const px = t * width;
    // Elastic can overshoot slightly — clamp visible range to [-0.2, 1.2].
    const py = height - Math.max(-0.2, Math.min(1.2, y)) * height;
    path += ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      {/* Frame (bottom + left edges to ground the curve visually) */}
      <line
        x1={0}
        y1={height}
        x2={width}
        y2={height}
        stroke="rgb(var(--border-subtle, 255 255 255 / 0.15))"
        strokeWidth={1}
      />
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={height}
        stroke="rgb(var(--border-subtle, 255 255 255 / 0.15))"
        strokeWidth={1}
      />
      {/* Diagonal reference (linear curve) for scale */}
      <line
        x1={0}
        y1={height}
        x2={width}
        y2={0}
        stroke="rgb(var(--text-muted, 127 127 127))"
        strokeWidth={0.5}
        strokeDasharray="2 2"
        opacity={0.35}
      />
      {/* Actual curve */}
      <path
        d={path}
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
