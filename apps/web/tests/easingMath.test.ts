// ─── Easing Math Regression Tests ───
//
// Pins the shape of each named easing curve so someone editing the
// sampler doesn't silently warp the visual representation that ends
// up in the timeline UI.

import { describe, it, expect } from 'vitest';
import { easingFn } from '../lib/easingMath';

describe('easingFn', () => {
  it('linear passes through unchanged for [0, 1]', () => {
    expect(easingFn('linear', 0)).toBe(0);
    expect(easingFn('linear', 0.5)).toBe(0.5);
    expect(easingFn('linear', 1)).toBe(1);
  });

  it('clamps out-of-range inputs', () => {
    expect(easingFn('linear', -0.5)).toBe(0);
    expect(easingFn('linear', 2)).toBe(1);
    expect(easingFn('linear', Number.NaN)).toBe(0);
  });

  it('ease-in-quad sits BELOW linear in the first half', () => {
    // t=0.25 → 0.0625 (linear would be 0.25)
    expect(easingFn('ease-in-quad', 0.25)).toBeLessThan(0.25);
    expect(easingFn('ease-in-quad', 0.5)).toBe(0.25);
  });

  it('ease-out-quad sits ABOVE linear in the first half', () => {
    // t=0.25 → 1 - 0.75² = 1 - 0.5625 = 0.4375
    expect(easingFn('ease-out-quad', 0.25)).toBeGreaterThan(0.25);
    expect(easingFn('ease-out-quad', 0.25)).toBeCloseTo(0.4375, 4);
  });

  it('ease-in-out-quad is symmetric around 0.5', () => {
    const pairs: Array<[number, number]> = [
      [0.1, 0.9],
      [0.25, 0.75],
      [0.3, 0.7],
    ];
    for (const [a, b] of pairs) {
      const ya = easingFn('ease-in-out-quad', a);
      const yb = easingFn('ease-in-out-quad', b);
      // Mirror relationship: ya + yb = 1
      expect(ya + yb).toBeCloseTo(1, 4);
    }
  });

  it('ease-in-cubic is even steeper than quad at t=0.5', () => {
    expect(easingFn('ease-in-cubic', 0.5)).toBeLessThan(easingFn('ease-in-quad', 0.5));
  });

  it('ease-out-cubic reaches ~87.5% by t=0.5', () => {
    expect(easingFn('ease-out-cubic', 0.5)).toBeCloseTo(0.875, 4);
  });

  it('bounce ends at exactly 1 and never exceeds 1 in the sweep', () => {
    expect(easingFn('bounce', 1)).toBeCloseTo(1, 4);
    for (let i = 0; i <= 20; i++) {
      const y = easingFn('bounce', i / 20);
      expect(y).toBeLessThanOrEqual(1.0001);
      expect(y).toBeGreaterThanOrEqual(-0.01);
    }
  });

  it('elastic endpoints are locked to 0 and 1', () => {
    expect(easingFn('elastic', 0)).toBe(0);
    expect(easingFn('elastic', 1)).toBe(1);
  });

  it('elastic produces finite values across a sweep', () => {
    for (let i = 0; i <= 50; i++) {
      const y = easingFn('elastic', i / 50);
      expect(Number.isFinite(y)).toBe(true);
    }
  });
});
