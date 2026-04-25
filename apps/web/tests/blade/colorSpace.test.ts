// ─── v0.14.0 Phase 1 — colorSpace LUT + tonemap regression tests ──
//
// Pins the gamma + tonemap helpers that the Phase 2 bloom rewrite will
// rely on. Two invariants worth locking in before anything else builds
// on top:
//
//   1. sRGB↔linear roundtrip preserves the input within ±1/255 for every
//      8-bit value. The IEC 61966-2-1 EOTF branches near black (≤ 0.04045
//      and ≤ 0.0031308), so we verify the roundtrip across the full 0..255
//      range, not just the bright half — that's where the bloom prefilter
//      spends most of its per-pixel work.
//
//   2. The pre-baked Float32Array(256) LUT matches the analytic srgbToLinear
//      curve at every index. If they drift the bloom prefilter and the color
//      picker preview end up in different color spaces.
//
// Reinhard + ACES tonemap helpers are sanity-checked on their endpoints
// only — the actual curve shape is validated visually in Phase 2 when
// the bloom composite ships.

import { describe, it, expect } from 'vitest';
import {
  srgbToLinear,
  linearToSrgb,
  SRGB_TO_LINEAR_LUT,
  tonemapReinhard,
  tonemapACES,
} from '@/lib/blade/colorSpace';

describe('colorSpace — sRGB↔linear roundtrip', () => {
  it('is within ±1/255 for every 8-bit sRGB value', () => {
    for (let c = 0; c < 256; c++) {
      const linear = srgbToLinear(c);
      const back = linearToSrgb(linear);
      expect(Math.abs(back - c)).toBeLessThanOrEqual(1);
    }
  });

  it('maps 0 → 0 and 255 → 1 exactly', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(255)).toBeCloseTo(1, 10);
    expect(linearToSrgb(0)).toBe(0);
    expect(linearToSrgb(1)).toBe(255);
  });

  it('clamps negative and >1 linear input on the way back to sRGB', () => {
    expect(linearToSrgb(-0.5)).toBe(0);
    expect(linearToSrgb(2.0)).toBe(255);
  });
});

describe('colorSpace — SRGB_TO_LINEAR_LUT', () => {
  it('has exactly 256 entries', () => {
    expect(SRGB_TO_LINEAR_LUT.length).toBe(256);
  });

  it('matches srgbToLinear at every index', () => {
    // Float32Array stores at ~7 decimal digits precision. The bloom pipeline
    // consumes these values as 0..1 linear-light — a 6-digit match is well
    // within the 1-device-px-brightness tolerance.
    for (let c = 0; c < 256; c++) {
      expect(SRGB_TO_LINEAR_LUT[c]).toBeCloseTo(srgbToLinear(c), 6);
    }
  });

  it('is monotonically increasing', () => {
    for (let c = 1; c < 256; c++) {
      expect(SRGB_TO_LINEAR_LUT[c]).toBeGreaterThan(SRGB_TO_LINEAR_LUT[c - 1]);
    }
  });
});

describe('colorSpace — Reinhard tonemap', () => {
  it('maps 0 → 0', () => {
    expect(tonemapReinhard(0)).toBe(0);
  });

  it('asymptotically approaches 1 as x → ∞', () => {
    expect(tonemapReinhard(1)).toBeCloseTo(0.5, 6);
    expect(tonemapReinhard(9)).toBeCloseTo(0.9, 6);
    expect(tonemapReinhard(1e9)).toBeGreaterThan(0.9999);
    expect(tonemapReinhard(1e9)).toBeLessThan(1.0);
  });

  it('is monotonic for non-negative input', () => {
    const samples = [0, 0.1, 0.5, 1, 2, 5, 10, 100];
    for (let i = 1; i < samples.length; i++) {
      expect(tonemapReinhard(samples[i])).toBeGreaterThan(tonemapReinhard(samples[i - 1]));
    }
  });
});

describe('colorSpace — ACES Filmic tonemap', () => {
  it('maps 0 → 0 and saturates at high luminance within [0, 1]', () => {
    expect(tonemapACES(0)).toBeCloseTo(0, 4);
    expect(tonemapACES(100)).toBeGreaterThan(0.9);
    expect(tonemapACES(100)).toBeLessThanOrEqual(1);
  });

  it('clamps its output into [0, 1] even for extreme input', () => {
    expect(tonemapACES(1e12)).toBeLessThanOrEqual(1);
    expect(tonemapACES(1e12)).toBeGreaterThanOrEqual(0);
  });
});
