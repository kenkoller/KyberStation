// ─── colorHsl — RGB ↔ HSL round-trip + adjust contract ─────────────────
//
// Phase 4.3 (2026-04-30). Pins the math used by the mobile
// QuickControls' Hue + Sat sliders.
//
// Coverage:
//   1. hslToRgb maps the canonical six hues correctly (0/60/120/...).
//   2. RGB → HSL → RGB round-trips lose at most 1 channel-unit (math
//      precision floor).
//   3. adjustColorHsl preserves the unspecified channels.

import { describe, it, expect } from 'vitest';
import { rgbToHsl, hslToRgb, adjustColorHsl } from '../lib/colorHsl';

describe('hslToRgb — canonical hue cycle', () => {
  const cases: Array<[number, { r: number; g: number; b: number }]> = [
    [0, { r: 255, g: 0, b: 0 }],
    [60, { r: 255, g: 255, b: 0 }],
    [120, { r: 0, g: 255, b: 0 }],
    [180, { r: 0, g: 255, b: 255 }],
    [240, { r: 0, g: 0, b: 255 }],
    [300, { r: 255, g: 0, b: 255 }],
  ];

  for (const [h, expected] of cases) {
    it(`hue ${h}° at full sat/50% light yields the canonical primary`, () => {
      expect(hslToRgb(h, 100, 50)).toEqual(expected);
    });
  }
});

describe('rgbToHsl ↔ hslToRgb round-trip', () => {
  const samples: Array<{ r: number; g: number; b: number }> = [
    { r: 74, g: 158, b: 255 }, // Jedi Blue
    { r: 255, g: 91, b: 91 }, // Sith Red
    { r: 34, g: 197, b: 94 }, // Jedi Green
    { r: 167, g: 139, b: 250 }, // Amethyst
    { r: 251, g: 191, b: 36 }, // Amber
    { r: 0, g: 140, b: 255 }, // Obi-Wan Blue
  ];

  for (const sample of samples) {
    it(`round-trips ${JSON.stringify(sample)} within 1 channel-unit`, () => {
      const hsl = rgbToHsl(sample.r, sample.g, sample.b);
      const back = hslToRgb(hsl.h, hsl.s, hsl.l);
      expect(Math.abs(back.r - sample.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - sample.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - sample.b)).toBeLessThanOrEqual(1);
    });
  }
});

describe('adjustColorHsl — partial-channel mutation', () => {
  it('changing only hue preserves saturation + lightness within tolerance', () => {
    const start = { r: 74, g: 158, b: 255 }; // Jedi Blue
    const startHsl = rgbToHsl(start.r, start.g, start.b);
    const next = adjustColorHsl(start, { h: 0 });
    const nextHsl = rgbToHsl(next.r, next.g, next.b);
    // Saturation + lightness should be near-identical.
    expect(Math.abs(nextHsl.s - startHsl.s)).toBeLessThanOrEqual(2);
    expect(Math.abs(nextHsl.l - startHsl.l)).toBeLessThanOrEqual(2);
    // Hue should be the new value.
    expect(Math.round(nextHsl.h)).toBe(0);
  });

  it('changing only saturation preserves hue + lightness within tolerance', () => {
    const start = { r: 74, g: 158, b: 255 }; // Jedi Blue
    const startHsl = rgbToHsl(start.r, start.g, start.b);
    const next = adjustColorHsl(start, { s: 50 });
    const nextHsl = rgbToHsl(next.r, next.g, next.b);
    expect(Math.abs(nextHsl.h - startHsl.h)).toBeLessThanOrEqual(2);
    expect(Math.abs(nextHsl.l - startHsl.l)).toBeLessThanOrEqual(2);
    expect(Math.round(nextHsl.s)).toBe(50);
  });

  it('zero saturation yields a grey scale (R = G = B)', () => {
    const next = adjustColorHsl({ r: 100, g: 50, b: 200 }, { s: 0 });
    expect(next.r).toBe(next.g);
    expect(next.g).toBe(next.b);
  });
});
