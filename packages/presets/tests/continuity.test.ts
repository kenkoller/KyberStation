import { describe, it, expect } from 'vitest';
import type { Preset } from '../src/types.js';
import { LEGENDS_PRESETS } from '../src/index.js';

/**
 * Tests for the `continuity` field on the Preset type.
 *
 * Drives gallery filtering for canon-vs-legends-vs-pop-culture. Consumers
 * should read `preset.continuity ?? 'canon'` so existing presets without
 * the field default to canon.
 *
 * Guarantees:
 *   1. The Preset type accepts every valid continuity value (compile-time).
 *   2. The Preset type rejects invalid continuity values (@ts-expect-error).
 *   3. A Preset without `continuity` is still valid (backward compatible).
 *   4. Every preset in LEGENDS_PRESETS carries `continuity: 'legends'`.
 */

function makeMinimalPreset(overrides: Partial<Preset>): Preset {
  return {
    id: 'test-sample',
    name: 'Test Sample',
    character: 'Test',
    era: 'expanded-universe',
    affiliation: 'jedi',
    tier: 'base',
    ...overrides,
    config: {
      name: 'TestSample',
      baseColor: { r: 0, g: 200, b: 50 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 300,
      shimmer: 0.05,
      ledCount: 144,
    },
  };
}

describe('Preset continuity field — type shape', () => {
  it('accepts a Preset with no continuity field (defaults to canon by convention)', () => {
    const sample = makeMinimalPreset({});
    expect(sample.continuity).toBeUndefined();
    // The convention consumers follow:
    expect(sample.continuity ?? 'canon').toBe('canon');
  });

  it("accepts continuity: 'canon'", () => {
    const sample = makeMinimalPreset({ continuity: 'canon' });
    expect(sample.continuity).toBe('canon');
  });

  it("accepts continuity: 'legends'", () => {
    const sample = makeMinimalPreset({ continuity: 'legends' });
    expect(sample.continuity).toBe('legends');
  });

  it("accepts continuity: 'pop-culture'", () => {
    const sample = makeMinimalPreset({ continuity: 'pop-culture' });
    expect(sample.continuity).toBe('pop-culture');
  });

  it("accepts continuity: 'mythology'", () => {
    const sample = makeMinimalPreset({ continuity: 'mythology' });
    expect(sample.continuity).toBe('mythology');
  });

  it('rejects an invalid continuity value at compile time', () => {
    const sample = makeMinimalPreset({
      // @ts-expect-error — 'invalid-value' is not a permitted continuity
      continuity: 'invalid-value',
    });
    // Runtime assertion so the test is observable even though the real
    // check is the `@ts-expect-error` above — typecheck will fail if the
    // type ever widens to accept arbitrary strings.
    expect(sample.continuity).toBe('invalid-value');
  });
});

describe('Legends preset backfill', () => {
  it('tags every preset in LEGENDS_PRESETS with continuity: "legends"', () => {
    expect(LEGENDS_PRESETS.length).toBeGreaterThan(0);
    for (const preset of LEGENDS_PRESETS) {
      expect(
        preset.continuity,
        `Expected ${preset.id} to carry continuity="legends"`,
      ).toBe('legends');
    }
  });

  it('has no stray canon presets in the Legends file', () => {
    const notLegends = LEGENDS_PRESETS.filter((p) => p.continuity !== 'legends');
    expect(notLegends).toHaveLength(0);
  });
});
