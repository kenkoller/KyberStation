// ─── Severance-inverted drag curve ───
//
// Maps a signed horizontal pointer delta (CSS pixels) to a scaled delta that
// is later multiplied by `step` to produce the value change applied to a
// numeric field. Piecewise cubic curve tuned against NEXT_SESSIONS.md §12:
//   |dx| < 4   → fine-step   (slope 0.25×)
//   4 ≤ |dx| < 16  → smooth ramp from 0.25× → 1×
//   16 ≤ |dx| < 64 → smooth ramp from 1×    → 1.5× (saturates at 64)
//   |dx| ≥ 64  → saturated linear at 1.5×
//
// By construction the curve is C⁰- and C¹-continuous across zone boundaries
// (smoothstep has zero derivatives at its endpoints) and odd-symmetric
// around zero — so (curve(dx) === -curve(-dx)).
//
// Originally lived inside apps/web/components/editor/ColorPanel.tsx. Extracted
// here so every editor panel can share the exact same haptic "feels right"
// scrub behaviour via the useDragToScrub hook.

export const FINE_ZONE_PX = 4;
export const NORMAL_ZONE_PX = 16;
const FINE_MULT = 0.25;
const NORMAL_MULT = 1;
const ACCEL_MULT = 1.5;
const ACCEL_SATURATION_PX = 64;

// Definite integral of smoothstep s(t) = 3t² - 2t³ from 0 to t, clamped.
//   S(t) = t³ - t⁴/2
// Mean of smoothstep over [0,1] is S(1) = 0.5 — so blending linearly
// between two multiplier values via a smoothstep-weighted integral gives
// the same total travel as using the midpoint as an average. That's the
// analytic identity that keeps the piecewise curve continuous.
function smoothstepIntegral(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 0.5;
  return t * t * t - (t * t * t * t) / 2;
}

export function severanceDragCurve(dx: number): number {
  const sign = dx < 0 ? -1 : 1;
  const abs = Math.abs(dx);

  if (abs <= FINE_ZONE_PX) {
    return sign * abs * FINE_MULT;
  }
  const zone1EndValue = FINE_ZONE_PX * FINE_MULT; // = 1.0

  const zone2Span = NORMAL_ZONE_PX - FINE_ZONE_PX; // 12
  if (abs <= NORMAL_ZONE_PX) {
    const travel = abs - FINE_ZONE_PX;
    const t = travel / zone2Span;
    const blendedIntegral =
      FINE_MULT * travel +
      (NORMAL_MULT - FINE_MULT) * zone2Span * smoothstepIntegral(t);
    return sign * (zone1EndValue + blendedIntegral);
  }
  const zone2EndValue =
    zone1EndValue +
    FINE_MULT * zone2Span +
    (NORMAL_MULT - FINE_MULT) * zone2Span * 0.5;
  // = 1 + 3 + 4.5 = 8.5

  const zone3Span = ACCEL_SATURATION_PX - NORMAL_ZONE_PX; // 48
  if (abs <= ACCEL_SATURATION_PX) {
    const travel = abs - NORMAL_ZONE_PX;
    const t = travel / zone3Span;
    const blendedIntegral =
      NORMAL_MULT * travel +
      (ACCEL_MULT - NORMAL_MULT) * zone3Span * smoothstepIntegral(t);
    return sign * (zone2EndValue + blendedIntegral);
  }
  const zone3EndValue =
    zone2EndValue +
    NORMAL_MULT * zone3Span +
    (ACCEL_MULT - NORMAL_MULT) * zone3Span * 0.5;
  // = 8.5 + 48 + 12 = 68.5

  return sign * (zone3EndValue + (abs - ACCEL_SATURATION_PX) * ACCEL_MULT);
}

export type ScrubZone = 'fine' | 'normal' | 'accel';

export function scrubZoneFor(dx: number): ScrubZone {
  const abs = Math.abs(dx);
  if (abs < FINE_ZONE_PX) return 'fine';
  if (abs < NORMAL_ZONE_PX) return 'normal';
  return 'accel';
}
