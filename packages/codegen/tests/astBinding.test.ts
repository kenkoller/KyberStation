// ─── astBinding unit tests (Phase 2) ───
// Pure-function tests for the hit-test math and binding-state transitions.

import { describe, it, expect } from 'vitest';
import {
  clamp01,
  positionToProffie,
  hitToLED,
  makeInitialBindingState,
  syncFromConfig,
  syncFromCode,
  type HitGeometry,
} from '../src/astBinding.js';
import type { BladeConfig } from '../src/index.js';

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 0, g: 0, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 255, b: 0 },
    blastColor: { r: 255, g: 0, b: 0 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 400,
    shimmer: 0,
    ledCount: 144,
    ...overrides,
  };
}

describe('clamp01', () => {
  it('returns input when in range', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });
  it('clamps below 0 to 0', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(-100)).toBe(0);
  });
  it('clamps above 1 to 1', () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(99)).toBe(1);
  });
  it('handles NaN by returning 0', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('positionToProffie', () => {
  it('maps 0 → 0', () => {
    expect(positionToProffie(0)).toBe(0);
  });
  it('maps 0.5 → 16384', () => {
    expect(positionToProffie(0.5)).toBe(16384);
  });
  it('maps 1 → 32768', () => {
    expect(positionToProffie(1)).toBe(32768);
  });
  it('clamps out-of-range inputs', () => {
    expect(positionToProffie(-0.5)).toBe(0);
    expect(positionToProffie(2)).toBe(32768);
  });
  it('rounds to integer', () => {
    // 1/3 → 32768/3 ≈ 10922.666 → 10923
    expect(positionToProffie(1 / 3)).toBe(10923);
  });
});

describe('hitToLED', () => {
  const geom: HitGeometry = {
    bladeStartX: 100,
    bladeLenX: 800,
    bladeY: 300,
    toleranceY: 30,
  };
  const ledCount = 144;

  it('maps the emitter end to LED 0 / position 0', () => {
    const hit = hitToLED(100, 300, geom, ledCount);
    expect(hit).not.toBeNull();
    expect(hit!.ledIndex).toBe(0);
    expect(hit!.position).toBe(0);
    expect(hit!.proffiePos).toBe(0);
  });

  it('maps the tip end to the last LED / position 1', () => {
    const hit = hitToLED(900, 300, geom, ledCount);
    expect(hit).not.toBeNull();
    expect(hit!.ledIndex).toBe(ledCount - 1);
    expect(hit!.position).toBe(1);
    expect(hit!.proffiePos).toBe(32768);
  });

  it('maps mid-blade correctly', () => {
    const hit = hitToLED(500, 300, geom, ledCount);
    expect(hit).not.toBeNull();
    expect(hit!.position).toBeCloseTo(0.5, 3);
    expect(hit!.proffiePos).toBe(16384);
  });

  it('returns null for clicks outside the vertical tolerance', () => {
    expect(hitToLED(500, 100, geom, ledCount)).toBeNull();
    expect(hitToLED(500, 500, geom, ledCount)).toBeNull();
  });

  it('returns null for clicks left of the emitter', () => {
    expect(hitToLED(50, 300, geom, ledCount)).toBeNull();
  });

  it('returns null for clicks past the tip', () => {
    expect(hitToLED(1000, 300, geom, ledCount)).toBeNull();
  });

  it('uses default toleranceY when not provided', () => {
    const geomNoTol: HitGeometry = {
      bladeStartX: 100,
      bladeLenX: 800,
      bladeY: 300,
    };
    // Default is 40; 339 should hit.
    expect(hitToLED(500, 339, geomNoTol, ledCount)).not.toBeNull();
    // 341 should not.
    expect(hitToLED(500, 341, geomNoTol, ledCount)).toBeNull();
  });
});

describe('BindingState transitions', () => {
  it('makeInitialBindingState produces a consistent snapshot', () => {
    const config = makeConfig();
    const state = makeInitialBindingState(config);
    expect(state.config).toBe(config);
    expect(state.dirty).toBe('none');
    expect(state.code.length).toBeGreaterThan(0);
    expect(state.ast.name).toBe('StylePtr');
  });

  it('syncFromConfig regenerates AST and code', () => {
    const a = makeInitialBindingState(makeConfig());
    const b = syncFromConfig(a, makeConfig({ baseColor: { r: 10, g: 20, b: 30 } }));
    expect(b.dirty).toBe('fromConfig');
    expect(b.code).not.toBe(a.code);
    expect(b.code).toContain('Rgb<10,20,30>');
  });

  it('syncFromCode parses code and merges into prior config on success', () => {
    const initial = makeInitialBindingState(makeConfig({ shimmer: 0.42 }));
    // Emit fresh code with a different base color, then sync from it.
    const mutated = syncFromConfig(initial, makeConfig({
      baseColor: { r: 5, g: 6, b: 7 },
      shimmer: 0.42, // unchanged — must survive the sync
    }));
    const { state: synced, errors } = syncFromCode(initial, mutated.code);
    expect(errors).toEqual([]);
    expect(synced.dirty).toBe('fromCode');
    expect(synced.config.baseColor).toEqual({ r: 5, g: 6, b: 7 });
    // `shimmer` is not round-trippable today; the prior value must carry.
    expect(synced.config.shimmer).toBe(0.42);
  });

  it('syncFromCode preserves prior config on fully unparseable input', () => {
    const initial = makeInitialBindingState(makeConfig());
    // Empty string can't parse to an AST; prior config must be preserved.
    const { state } = syncFromCode(initial, '');
    // The base color of the prior config survives even if parse failed.
    expect(state.config.baseColor).toEqual(initial.config.baseColor);
    expect(state.config.style).toBe(initial.config.style);
    expect(state.code).toBe('');
    expect(state.dirty).toBe('fromCode');
  });
});
