// ─── Severance-inverted drag curve (shared by every editor scrub field) ───
//
// Pins the shape of the piecewise cubic scrub curve so a future edit
// doesn't silently regress the haptic "feels right" tuning from
// NEXT_SESSIONS.md §12. Originally lived inside ColorPanel; the curve now
// powers the shared `useDragToScrub` hook so the same pins guarantee
// consistent tactile behaviour across every slider that uses it.
//
// Zones, in CSS pixels of horizontal drag distance from pointerdown:
//   |dx| < 4  → fine-step  (slope 0.25×)
//   4 ≤ |dx| < 16 → smooth ramp from 0.25× → 1×
//   |dx| ≥ 16 → smooth ramp from 1× → 1.5× (saturates at 64)

import { describe, it, expect } from 'vitest';
import {
  FINE_ZONE_PX,
  NORMAL_ZONE_PX,
  scrubZoneFor,
  severanceDragCurve,
} from '../lib/severanceDragCurve';

describe('severanceDragCurve', () => {
  it('returns 0 for zero delta', () => {
    expect(severanceDragCurve(0)).toBe(0);
  });

  it('is odd-symmetric around zero', () => {
    for (const dx of [1, 2, 4, 8, 16, 32, 64, 100]) {
      expect(severanceDragCurve(-dx)).toBeCloseTo(-severanceDragCurve(dx), 6);
    }
  });

  it('applies fine-step scaling (0.25×) inside the precision zone', () => {
    // At 2px the curve must multiply by exactly 0.25 — the fine zone is
    // pure linear so small tremor doesn't amplify.
    expect(severanceDragCurve(2)).toBeCloseTo(0.5, 6);
    expect(severanceDragCurve(FINE_ZONE_PX)).toBeCloseTo(1.0, 6);
  });

  it('sits between fine and full-speed at the normal-zone midpoint', () => {
    // At 8px the blended multiplier is mid-smoothstep. Exact value is
    // implementation-defined but MUST be greater than pure fine-step
    // (8 × 0.25 = 2) and less than pure full-speed (8 × 1 = 8).
    const out = severanceDragCurve(8);
    expect(out).toBeGreaterThan(2);
    expect(out).toBeLessThan(8);
  });

  it('matches precise piecewise value at the normal-zone end', () => {
    // At 16px: fineEnd (1) + 12 × smoothstep-mean of 0.25 → 1.
    // The mean of a symmetric smoothstep-blended quantity over its
    // parametric range equals the midpoint: (0.25 + 1) / 2 = 0.625.
    // → 1 + 12 × 0.625 = 8.5.
    expect(severanceDragCurve(NORMAL_ZONE_PX)).toBeCloseTo(8.5, 6);
  });

  it('accelerates past the normal zone boundary', () => {
    // At 32px we're inside zone 3 — slope should be > 1× average so
    // the value gain over the 16px → 32px interval exceeds 16.
    const atNormalEnd = severanceDragCurve(NORMAL_ZONE_PX); // 8.5
    const at32 = severanceDragCurve(32);
    const gainedInZone3 = at32 - atNormalEnd;
    expect(gainedInZone3).toBeGreaterThan(16); // more than 1× linear travel
    expect(gainedInZone3).toBeLessThan(24); // but capped below 1.5× linear
  });

  it('is monotonic across the zone boundaries', () => {
    let prev = -Infinity;
    for (let dx = 0; dx <= 100; dx += 0.5) {
      const out = severanceDragCurve(dx);
      expect(out).toBeGreaterThanOrEqual(prev);
      prev = out;
    }
  });

  it('is continuous at zone boundaries (no jumps)', () => {
    // Step ±0.01 across each boundary; the gap must be tiny.
    for (const boundary of [FINE_ZONE_PX, NORMAL_ZONE_PX]) {
      const below = severanceDragCurve(boundary - 0.01);
      const above = severanceDragCurve(boundary + 0.01);
      expect(Math.abs(above - below)).toBeLessThan(0.05);
    }
  });
});

describe('scrubZoneFor', () => {
  it('classifies the 2/8/32px zones correctly', () => {
    expect(scrubZoneFor(2)).toBe('fine');
    expect(scrubZoneFor(8)).toBe('normal');
    expect(scrubZoneFor(32)).toBe('accel');
  });

  it('classifies negative deltas by magnitude', () => {
    expect(scrubZoneFor(-2)).toBe('fine');
    expect(scrubZoneFor(-8)).toBe('normal');
    expect(scrubZoneFor(-32)).toBe('accel');
  });

  it('picks the upper zone exactly at boundaries', () => {
    expect(scrubZoneFor(FINE_ZONE_PX)).toBe('normal');
    expect(scrubZoneFor(NORMAL_ZONE_PX)).toBe('accel');
  });
});
