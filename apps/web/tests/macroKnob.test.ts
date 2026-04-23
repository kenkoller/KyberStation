// ─── MacroKnob — pure geometry + drag math regression tests ──
//
// MacroKnob is a thin React shell over a handful of pure helpers:
//
//   valueToAngle      — maps [0, 1] → radians along the 270° sweep
//   svgArcPath        — builds the SVG `d` attribute for an arc
//   computeKnobDelta  — maps pointer dy (pixels) → normalized Δvalue
//   applyKnobDrag     — wires startValue + dy → next clamped value
//
// Pinning these tests is enough to say "if drag feels off, the hook
// wiring is the culprit, not the math." Pairs with performanceStore
// for end-to-end confidence.

import { describe, it, expect } from 'vitest';
import {
  KNOB_START_ANGLE_DEG,
  KNOB_END_ANGLE_DEG,
  DEFAULT_KNOB_SENSITIVITY,
  valueToAngle,
  svgArcPath,
  computeKnobDelta,
  applyKnobDrag,
} from '../components/shared/MacroKnob';

// ─── valueToAngle ────────────────────────────────────────────────────────────

describe('valueToAngle', () => {
  it('maps 0 to the start angle and 1 to the end angle', () => {
    const start = (KNOB_START_ANGLE_DEG * Math.PI) / 180;
    const end = (KNOB_END_ANGLE_DEG * Math.PI) / 180;
    expect(valueToAngle(0)).toBeCloseTo(start, 10);
    expect(valueToAngle(1)).toBeCloseTo(end, 10);
  });

  it('maps the midpoint to the halfway angle', () => {
    const start = (KNOB_START_ANGLE_DEG * Math.PI) / 180;
    const end = (KNOB_END_ANGLE_DEG * Math.PI) / 180;
    const mid = start + (end - start) * 0.5;
    expect(valueToAngle(0.5)).toBeCloseTo(mid, 10);
  });

  it('clamps inputs above 1 and below 0', () => {
    const start = (KNOB_START_ANGLE_DEG * Math.PI) / 180;
    const end = (KNOB_END_ANGLE_DEG * Math.PI) / 180;
    expect(valueToAngle(1.5)).toBeCloseTo(end, 10);
    expect(valueToAngle(-0.1)).toBeCloseTo(start, 10);
  });

  it('produces a monotonic-increasing angle in the valid range', () => {
    // Any two values where a < b should produce angle(a) < angle(b).
    const samples = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
    const angles = samples.map(valueToAngle);
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeGreaterThan(angles[i - 1]);
    }
  });
});

// ─── svgArcPath ──────────────────────────────────────────────────────────────

describe('svgArcPath', () => {
  it('returns an SVG `d` string starting with M and containing an A command', () => {
    const d = svgArcPath(27, 27, 20, 0, Math.PI / 2);
    expect(d).toMatch(/^M /);
    expect(d).toContain(' A ');
  });

  it('emits large-arc-flag = 1 for sweeps larger than π radians', () => {
    const start = (KNOB_START_ANGLE_DEG * Math.PI) / 180;
    const end = (KNOB_END_ANGLE_DEG * Math.PI) / 180;
    // Full knob sweep is 270° > 180° → large arc.
    const d = svgArcPath(27, 27, 20, start, end);
    // Format: M x0 y0 A r r 0 <large> 1 x1 y1
    const parts = d.split(/\s+/);
    // `A r r 0 large 1 x1 y1` → large-arc-flag is the 6th field after A.
    const aIndex = parts.indexOf('A');
    expect(aIndex).toBeGreaterThanOrEqual(0);
    const largeFlag = parts[aIndex + 4];
    expect(largeFlag).toBe('1');
  });

  it('emits large-arc-flag = 0 for sweeps smaller than π radians', () => {
    const d = svgArcPath(27, 27, 20, 0, Math.PI / 3);
    const parts = d.split(/\s+/);
    const aIndex = parts.indexOf('A');
    expect(parts[aIndex + 4]).toBe('0');
  });
});

// ─── computeKnobDelta ────────────────────────────────────────────────────────

describe('computeKnobDelta', () => {
  it('maps upward pointer motion (deltaY negative) to positive value change', () => {
    // -100px up → +0.6 (with default sens = 0.006)
    expect(computeKnobDelta(-100)).toBeCloseTo(0.6, 10);
  });

  it('maps downward pointer motion (deltaY positive) to negative value change', () => {
    expect(computeKnobDelta(100)).toBeCloseTo(-0.6, 10);
  });

  it('respects an explicit sensitivity argument', () => {
    // 2× sensitivity → 2× delta for the same pixel travel.
    expect(computeKnobDelta(-50, 0.012)).toBeCloseTo(0.6, 10);
  });

  it('returns 0 for zero motion', () => {
    // `computeKnobDelta` normalizes -0 → +0 internally so callers and
    // snapshot diffs see a canonical zero.
    expect(computeKnobDelta(0)).toBe(0);
    expect(Object.is(computeKnobDelta(0), -0)).toBe(false);
  });
});

// ─── applyKnobDrag ───────────────────────────────────────────────────────────

describe('applyKnobDrag', () => {
  it('increments the start value by the upward delta', () => {
    // Start at 0.5, drag up 50px → 0.5 + 0.3 = 0.8
    expect(applyKnobDrag(0.5, -50)).toBeCloseTo(0.8, 10);
  });

  it('clamps the next value to [0, 1]', () => {
    // Upward travel far exceeds the 0→1 range.
    expect(applyKnobDrag(0.9, -10000)).toBe(1);
    expect(applyKnobDrag(0.1, 10000)).toBe(0);
  });

  it('a full 0 → 1 sweep requires ~167px of upward drag at default sensitivity', () => {
    // 1 / 0.006 ≈ 166.67
    const pixelsForFullSweep = 1 / DEFAULT_KNOB_SENSITIVITY;
    const next = applyKnobDrag(0, -pixelsForFullSweep);
    expect(next).toBeCloseTo(1, 6);
  });

  it('maps NaN propagation to 0 rather than undefined', () => {
    // applyKnobDrag protects against NaN → 0 (rare, but a dropped event
    // with undefined deltas shouldn't corrupt the store).
    expect(applyKnobDrag(Number.NaN, 0)).toBe(0);
  });
});

// ─── Module contract ─────────────────────────────────────────────────────────

describe('MacroKnob module constants', () => {
  it('exports the canonical 270° sweep bounds', () => {
    expect(KNOB_START_ANGLE_DEG).toBe(-225);
    expect(KNOB_END_ANGLE_DEG).toBe(45);
    // 45 - (-225) = 270° sweep.
    expect(KNOB_END_ANGLE_DEG - KNOB_START_ANGLE_DEG).toBe(270);
  });

  it('default sensitivity matches the reference (0.006)', () => {
    expect(DEFAULT_KNOB_SENSITIVITY).toBeCloseTo(0.006, 10);
  });
});
