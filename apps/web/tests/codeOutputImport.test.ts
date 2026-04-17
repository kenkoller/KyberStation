// ─── CodeOutput Import Round-Trip Test ───
//
// Regression test for the v0.9.1 data-loss bug: the "Apply to Editor"
// button's inlined loadPreset call only passed the 11 base fields,
// silently dropping spatial lockup, spatial blast, Preon, and extended
// effect colours that reconstructConfig successfully recovers.
//
// The fix lives in `applyReconstructedConfig` in CodeOutput.tsx. This
// test exercises the full round-trip — export → parse → reconstruct →
// apply → compare — and asserts every extended field survives.

import { describe, it, expect } from 'vitest';
import {
  generateStyleCode,
  parseStyleCode,
  reconstructConfig,
} from '@kyberstation/codegen';
import type { BladeConfig } from '@kyberstation/engine';
import { applyReconstructedConfig } from '../components/editor/CodeOutput';

/** Build a maximally-configured BladeConfig that exercises every field
    the reconstructor currently recovers. */
function makeFullConfig(): BladeConfig {
  return {
    name: 'ImportTest',
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 200, b: 100 },
    lockupColor: { r: 255, g: 220, b: 80 },
    blastColor: { r: 255, g: 255, b: 200 },
    dragColor: { r: 255, g: 90, b: 0 },
    lightningColor: { r: 140, g: 180, b: 255 },
    meltColor: { r: 255, g: 60, b: 0 },
    style: 'stable',
    ignition: 'spark',
    retraction: 'fadeout',
    ignitionMs: 450,
    retractionMs: 650,
    shimmer: 0.2,
    ledCount: 144,
    lockupPosition: 0.33,
    lockupRadius: 0.12,
    blastPosition: 0.5,
    blastRadius: 0.45,
    dragPosition: 0.28,
    dragRadius: 0.2,
    meltPosition: 0.72,
    meltRadius: 0.22,
    stabPosition: 0.5,
    stabRadius: 0.25,
    preonEnabled: true,
    preonColor: { r: 200, g: 100, b: 255 },
    preonMs: 400,
  };
}

/** Convenience: run the full export → reconstruct → apply pipeline. */
function roundTripViaApply(source: BladeConfig): BladeConfig {
  const emitted = generateStyleCode(source, { comments: false });
  const parsed = parseStyleCode(emitted);
  if (!parsed.ast) throw new Error(`Parse failed: ${parsed.errors.join(', ')}`);
  const reconstructed = reconstructConfig(parsed.ast);
  return applyReconstructedConfig(reconstructed, source.ledCount);
}

describe('CodeOutput import round-trip (v0.9.1 regression)', () => {
  it('preserves spatial lockup fields through Apply', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    // TOP/BOTTOM/SIZE ↔ position/radius encoding is fixed-point to 1/32768,
    // so tolerate one quantisation step.
    const TOL = 2 / 32768;
    expect(result.lockupPosition).toBeDefined();
    expect(Math.abs((result.lockupPosition ?? 0) - source.lockupPosition!))
      .toBeLessThanOrEqual(TOL);
    expect(result.lockupRadius).toBeDefined();
    expect(Math.abs((result.lockupRadius ?? 0) - source.lockupRadius!))
      .toBeLessThanOrEqual(TOL);
  });

  it('preserves spatial blast fields through Apply', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    const TOL = 2 / 32768;
    expect(result.blastPosition).toBeDefined();
    expect(Math.abs((result.blastPosition ?? 0) - source.blastPosition!))
      .toBeLessThanOrEqual(TOL);
    expect(result.blastRadius).toBeDefined();
    expect(Math.abs((result.blastRadius ?? 0) - source.blastRadius!))
      .toBeLessThanOrEqual(TOL);
  });

  it('preserves spatial drag/melt/stab fields through Apply (v0.10.0)', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    const TOL = 2 / 32768;
    for (const key of [
      'dragPosition',
      'dragRadius',
      'meltPosition',
      'meltRadius',
      'stabPosition',
      'stabRadius',
    ] as const) {
      const actual = result[key];
      const expected = source[key];
      expect(actual, `${key} missing`).toBeDefined();
      expect(Math.abs((actual ?? 0) - (expected ?? 0))).toBeLessThanOrEqual(TOL);
    }
  });

  it('preserves Preon enable + colour + duration through Apply', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    expect(result.preonEnabled).toBe(true);
    expect(result.preonColor).toEqual(source.preonColor);
    expect(result.preonMs).toBe(source.preonMs);
  });

  it('preserves extended effect colours (drag/lightning/melt) through Apply', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    expect(result.dragColor).toEqual(source.dragColor);
    expect(result.lightningColor).toEqual(source.lightningColor);
    expect(result.meltColor).toEqual(source.meltColor);
  });

  it('preserves core fields alongside the extended ones', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    expect(result.baseColor).toEqual(source.baseColor);
    expect(result.blastColor).toEqual(source.blastColor);
    expect(result.clashColor).toEqual(source.clashColor);
    expect(result.lockupColor).toEqual(source.lockupColor);
    expect(result.style).toBe(source.style);
    expect(result.ignition).toBe(source.ignition);
    expect(result.retraction).toBe(source.retraction);
    expect(result.ignitionMs).toBe(source.ignitionMs);
    expect(result.retractionMs).toBe(source.retractionMs);
    expect(result.ledCount).toBe(source.ledCount);
  });

  it('falls back gracefully when cppResult is missing fields', () => {
    // Simulate a minimal reconstruction where only base colours are present.
    const minimal = {
      baseColor: { r: 50, g: 60, b: 70 },
      confidence: 0.5,
      warnings: [],
      rawAST: { type: 'raw' as const, name: 'Rainbow', args: [] },
    };
    const result = applyReconstructedConfig(minimal, 144);
    expect(result.baseColor).toEqual({ r: 50, g: 60, b: 70 });
    expect(result.lockupPosition).toBeUndefined();
    expect(result.preonEnabled).toBeUndefined();
    expect(result.style).toBe('stable');
    expect(result.ignition).toBe('standard');
  });
});
