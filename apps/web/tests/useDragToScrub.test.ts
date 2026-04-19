// ─── useDragToScrub — pure compute-path regression tests ─────────────────
//
// The vitest env for apps/web is node-only (no jsdom), matching the rest
// of apps/web/tests. We pin the hook's wiring logic by exercising the
// pure `computeScrubValue` helper the hook delegates to — pointer delta,
// modifier keys, step multiplication, clamping. The severance curve
// itself is pinned by severanceDragCurve.test.ts.

import { describe, it, expect } from 'vitest';
import {
  computeScrubValue,
  type ComputeScrubValueInput,
} from '../hooks/useDragToScrub';

const base: ComputeScrubValueInput = {
  dx: 0,
  shiftKey: false,
  altKey: false,
  startValue: 50,
  step: 1,
  min: 0,
  max: 100,
};

describe('computeScrubValue', () => {
  it('returns the anchor for a zero-delta move', () => {
    expect(computeScrubValue(base)).toBe(50);
  });

  it('scales shift-modified drags by 10× linearly', () => {
    // dx=5, shift → scaled 50px × step 1 = +50 → 50 + 50 = 100 (clamps)
    const out = computeScrubValue({
      ...base,
      dx: 5,
      shiftKey: true,
      startValue: 0,
      max: 1000,
    });
    expect(out).toBe(50);
  });

  it('scales alt-modified drags by 0.1× linearly', () => {
    // dx=100, alt → scaled 10px × step 1 = +10 → 0 + 10 = 10
    const out = computeScrubValue({
      ...base,
      dx: 100,
      altKey: true,
      startValue: 0,
    });
    expect(out).toBe(10);
  });

  it('applies the severance curve when no modifier is held', () => {
    // dx=2 → severance fine-zone 0.25× → 0.5 px × step 1 = 0.5.
    // Anchor 10 → 10.5.
    const out = computeScrubValue({
      ...base,
      dx: 2,
      startValue: 10,
    });
    expect(out).toBeCloseTo(10.5, 6);
  });

  it('clamps to max', () => {
    const out = computeScrubValue({
      ...base,
      dx: 500,
      shiftKey: true,
      startValue: 95,
    });
    expect(out).toBe(100);
  });

  it('clamps to min', () => {
    const out = computeScrubValue({
      ...base,
      dx: -500,
      shiftKey: true,
      startValue: 5,
    });
    expect(out).toBe(0);
  });

  it('multiplies the scaled pixels by step', () => {
    // dx=1, shift → 10px. step 0.5 → +5. Anchor 0 → 5.
    const out = computeScrubValue({
      ...base,
      dx: 1,
      shiftKey: true,
      startValue: 0,
      step: 0.5,
    });
    expect(out).toBe(5);
  });

  it('honours custom shiftMult / altMult overrides', () => {
    const shiftOut = computeScrubValue({
      ...base,
      dx: 1,
      shiftKey: true,
      startValue: 0,
      shiftMult: 25,
    });
    expect(shiftOut).toBe(25);

    const altOut = computeScrubValue({
      ...base,
      dx: 10,
      altKey: true,
      startValue: 0,
      altMult: 0.2,
    });
    expect(altOut).toBe(2);
  });

  it('is odd-symmetric under modifier paths', () => {
    const plus = computeScrubValue({
      ...base,
      dx: 3,
      shiftKey: true,
      startValue: 50,
    });
    const minus = computeScrubValue({
      ...base,
      dx: -3,
      shiftKey: true,
      startValue: 50,
    });
    expect(plus + minus).toBe(100); // symmetric around startValue 50
  });
});
