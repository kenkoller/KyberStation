// ─── Strip-core-scale helper contract tests ──────────────────────────
//
// Pins the contract of `getStripCoreScale(stripType)` — used by
// `BladeCanvas.tsx` to widen the rendered blade core as the user adds
// more LED strips. Two-tier discipline:
//
//   1. Drift sentinels — every strip type id surfaced by HardwarePanel
//      AND by BladeCanvas's STRIP_TYPES catalog must have an entry in
//      STRIP_CORE_SCALES, otherwise the user sees a no-op when the
//      Strip Configuration radio changes.
//   2. Numerical invariants — neopixel curve is monotonic non-
//      decreasing across stripCount 1→5; in-hilt cree curve also
//      monotonic; unknown ids fall back to the explicit default
//      constant; `undefined` is handled.

import { describe, it, expect } from 'vitest';
import {
  getStripCoreScale,
  STRIP_CORE_SCALES,
  DEFAULT_STRIP_CORE_SCALE,
} from '@/lib/blade/stripConfiguration';

const NEOPIXEL_IDS = [
  'single',
  'dual-neo',
  'tri-neo',
  'quad-neo',
  'penta-neo',
] as const;

const IN_HILT_IDS = ['tri-cree', 'quad-cree', 'penta-cree'] as const;

describe('stripConfiguration — drift sentinels', () => {
  it('STRIP_CORE_SCALES has an entry for every neopixel id', () => {
    for (const id of NEOPIXEL_IDS) {
      expect(STRIP_CORE_SCALES[id]).toBeDefined();
    }
  });

  it('STRIP_CORE_SCALES has an entry for every in-hilt cree id', () => {
    for (const id of IN_HILT_IDS) {
      expect(STRIP_CORE_SCALES[id]).toBeDefined();
    }
  });

  it('matches the canonical 8-entry catalog (5 neopixel + 3 cree)', () => {
    const expected = new Set<string>([...NEOPIXEL_IDS, ...IN_HILT_IDS]);
    expect(new Set(Object.keys(STRIP_CORE_SCALES))).toEqual(expected);
  });
});

describe('stripConfiguration — numerical invariants', () => {
  it('neopixel curve is monotonic non-decreasing across 1→5 strips', () => {
    let prev = -Infinity;
    for (const id of NEOPIXEL_IDS) {
      const v = getStripCoreScale(id);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('in-hilt cree curve is monotonic non-decreasing across tri/quad/penta', () => {
    let prev = -Infinity;
    for (const id of IN_HILT_IDS) {
      const v = getStripCoreScale(id);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('single strip is the baseline (1.0)', () => {
    expect(getStripCoreScale('single')).toBe(1.0);
  });

  it('penta-neo (5 strips) is the most-fill neopixel option', () => {
    const single = getStripCoreScale('single');
    const penta = getStripCoreScale('penta-neo');
    expect(penta).toBeGreaterThan(single);
    // Sanity — modest curve, not a 2× blade-up.
    expect(penta).toBeLessThan(1.4);
  });

  it('all multipliers stay within a perceptually modest range [1.0, 1.25]', () => {
    for (const v of Object.values(STRIP_CORE_SCALES)) {
      expect(v).toBeGreaterThanOrEqual(1.0);
      expect(v).toBeLessThanOrEqual(1.25);
    }
  });

  it('cree curve is softer than neopixel curve at equal step counts', () => {
    // tri-cree (3 cree LEDs) < tri-neo (3 strips) — adding cree LEDs
    // mostly adds intensity, not effective fill area.
    expect(getStripCoreScale('tri-cree')).toBeLessThan(
      getStripCoreScale('tri-neo'),
    );
    expect(getStripCoreScale('quad-cree')).toBeLessThan(
      getStripCoreScale('quad-neo'),
    );
    expect(getStripCoreScale('penta-cree')).toBeLessThan(
      getStripCoreScale('penta-neo'),
    );
  });
});

describe('stripConfiguration — fallback behavior', () => {
  it('unknown id falls back to the explicit DEFAULT_STRIP_CORE_SCALE', () => {
    expect(getStripCoreScale('does-not-exist')).toBe(DEFAULT_STRIP_CORE_SCALE);
    expect(DEFAULT_STRIP_CORE_SCALE).toBe(1.0);
  });

  it('undefined falls back to the default (older configs round-trip)', () => {
    expect(getStripCoreScale(undefined)).toBe(DEFAULT_STRIP_CORE_SCALE);
  });

  it('empty string falls back to default (no surprising lookup)', () => {
    expect(getStripCoreScale('')).toBe(DEFAULT_STRIP_CORE_SCALE);
  });
});
