import { describe, expect, it } from 'vitest';

import {
  emptySamplerState,
  sampleModulators,
  _internal,
  type SamplerState,
} from '../../src/modulation/sampler';
import type { EffectType, StyleContext, BladeConfig } from '../../src/types';

// ─── Test helpers ───────────────────────────────────────────────────

function makeTestConfig(): BladeConfig {
  return {
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0.1,
    ledCount: 144,
  };
}

function makeContext(overrides: Partial<StyleContext> = {}): StyleContext {
  return {
    time: 0,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1,
    // T1.3 (2026-04-29): state-progress fields. Default 0; tests can
    // override via the partial argument when exercising preon /
    // ignition / retraction modulator branches.
    preonProgress: 0,
    ignitionProgress: 0,
    retractionProgress: 0,
    config: makeTestConfig(),
    ...overrides,
  };
}

const NO_EFFECTS = new Set<EffectType>();
const CLASH_ACTIVE = new Set<EffectType>(['clash']);
const LOCKUP_ACTIVE = new Set<EffectType>(['lockup']);

// ─── Registry-covered sampling ──────────────────────────────────────

describe('sampleModulators', () => {
  it('populates a value for every built-in modulator', () => {
    const ctx = makeContext();
    const state = sampleModulators(ctx, null, NO_EFFECTS);
    const expectedIds = [
      'swing',
      'angle',
      'twist',
      'sound',
      'battery',
      'time',
      'clash',
      'lockup',
      'preon',
      'ignition',
      'retraction',
    ] as const;
    for (const id of expectedIds) {
      expect(state.values.has(id)).toBe(true);
    }
  });

  it('reads raw inputs off the StyleContext on first frame', () => {
    const ctx = makeContext({
      swingSpeed: 0.7,
      bladeAngle: -0.5,
      twistAngle: 0.2,
      soundLevel: 0.4,
      batteryLevel: 0.9,
      time: 1234,
    });
    const state = sampleModulators(ctx, null, NO_EFFECTS);

    // First-frame values equal raw input (prev defaults to raw, so
    // smoothing is a no-op on frame 0).
    expect(state.values.get('swing')).toBeCloseTo(0.7, 6);
    expect(state.values.get('angle')).toBeCloseTo(-0.5, 6);
    expect(state.values.get('twist')).toBeCloseTo(0.2, 6);
    expect(state.values.get('sound')).toBeCloseTo(0.4, 6);
    expect(state.values.get('battery')).toBeCloseTo(0.9, 6);
    expect(state.values.get('time')).toBe(1234);
  });

  it('returns `lockup=1` when lockup is active and 0 otherwise', () => {
    const ctx = makeContext();
    const off = sampleModulators(ctx, null, NO_EFFECTS);
    expect(off.values.get('lockup')).toBe(0);

    const on = sampleModulators(ctx, null, LOCKUP_ACTIVE);
    expect(on.values.get('lockup')).toBe(1);
  });

  // T1.3 (2026-04-29): preon / ignition / retraction progress fields
  // are now first-class on StyleContext + read by the sampler. Each
  // climbs 0→1 only while its corresponding state is active.

  it('reads preon/ignition/retraction from StyleContext (default zeros)', () => {
    const ctx = makeContext();
    const state = sampleModulators(ctx, null, NO_EFFECTS);
    expect(state.values.get('preon')).toBe(0);
    expect(state.values.get('ignition')).toBe(0);
    expect(state.values.get('retraction')).toBe(0);
  });

  it('preon modulator picks up StyleContext.preonProgress', () => {
    const ctx = makeContext({ preonProgress: 0.4 });
    const state = sampleModulators(ctx, null, NO_EFFECTS);
    expect(state.values.get('preon')).toBeCloseTo(0.4, 6);
  });

  it('ignition modulator picks up StyleContext.ignitionProgress', () => {
    const ctx = makeContext({ ignitionProgress: 0.75 });
    const state = sampleModulators(ctx, null, NO_EFFECTS);
    expect(state.values.get('ignition')).toBeCloseTo(0.75, 6);
  });

  it('retraction modulator picks up StyleContext.retractionProgress', () => {
    const ctx = makeContext({ retractionProgress: 0.6 });
    const state = sampleModulators(ctx, null, NO_EFFECTS);
    expect(state.values.get('retraction')).toBeCloseTo(0.6, 6);
  });

  it('progress fields are mutually exclusive in practice (engine guarantees one-state-at-a-time)', () => {
    // The BladeEngine populates only the one matching the current
    // state — verify the sampler stays sane if the caller violates
    // that invariant by setting multiple non-zero values: each one
    // is read independently, no cross-talk.
    const ctx = makeContext({
      preonProgress: 0.3,
      ignitionProgress: 0.5,
      retractionProgress: 0.7,
    });
    const state = sampleModulators(ctx, null, NO_EFFECTS);
    expect(state.values.get('preon')).toBeCloseTo(0.3, 6);
    expect(state.values.get('ignition')).toBeCloseTo(0.5, 6);
    expect(state.values.get('retraction')).toBeCloseTo(0.7, 6);
  });
});

// ─── Smoothing ──────────────────────────────────────────────────────

describe('one-pole smoothing (§3.1 smoothing coefficients)', () => {
  it('converges toward the raw input over many frames', () => {
    const ctx = makeContext({ swingSpeed: 1 });
    let state: SamplerState | null = null;
    for (let i = 0; i < 200; i++) {
      state = sampleModulators(ctx, state, NO_EFFECTS);
    }
    // After 200 frames of constant raw=1 with smoothing=0.35, output
    // must be essentially 1.
    expect(state!.values.get('swing')).toBeCloseTo(1, 6);
  });

  it('moves monotonically toward the target (no overshoot)', () => {
    const ctx = makeContext({ swingSpeed: 1 });
    let state: SamplerState | null = null;
    const history: number[] = [];
    for (let i = 0; i < 30; i++) {
      state = sampleModulators(ctx, state, NO_EFFECTS);
      history.push(state!.values.get('swing')!);
    }
    // Each subsequent sample is >= the previous (monotone non-decreasing).
    for (let i = 1; i < history.length; i++) {
      expect(history[i]!).toBeGreaterThanOrEqual(history[i - 1]! - 1e-9);
      expect(history[i]!).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('respects zero-smoothing descriptors as direct pass-through', () => {
    // `battery` has smoothing=0 — output equals raw every frame.
    const ctx1 = makeContext({ batteryLevel: 0.5 });
    const state1 = sampleModulators(ctx1, null, NO_EFFECTS);
    expect(state1.values.get('battery')).toBeCloseTo(0.5, 9);

    const ctx2 = makeContext({ batteryLevel: 0.1 });
    const state2 = sampleModulators(ctx2, state1, NO_EFFECTS);
    expect(state2.values.get('battery')).toBeCloseTo(0.1, 9);
  });

  it('smoothes only signals that declare smoothing > 0', () => {
    // `swing` has smoothing=0.35. Start at 0, jump to 1. First frame
    // with prev==0 should NOT reach 1; it should land partway.
    const ctx0 = makeContext({ swingSpeed: 0 });
    const s0 = sampleModulators(ctx0, null, NO_EFFECTS);
    expect(s0.values.get('swing')).toBe(0);

    const ctx1 = makeContext({ swingSpeed: 1 });
    const s1 = sampleModulators(ctx1, s0, NO_EFFECTS);
    const v1 = s1.values.get('swing')!;
    expect(v1).toBeGreaterThan(0);
    expect(v1).toBeLessThan(1);
    // Exact math: out = prev + (raw - prev) * (1 - smoothing)
    //           = 0 + (1 - 0) * (1 - 0.35) = 0.65
    expect(v1).toBeCloseTo(0.65, 6);
  });

  it('matches the exposed _internal.smooth helper', () => {
    const fn = _internal.smooth;
    expect(fn(0, 1, 0)).toBe(1);              // no smoothing
    expect(fn(0, 1, 1)).toBe(0);              // full hold (prev wins)
    expect(fn(0, 1, 0.5)).toBeCloseTo(0.5, 6);
    expect(fn(0.5, 1, 0.5)).toBeCloseTo(0.75, 6);
  });
});

// ─── Clash latching + decay ─────────────────────────────────────────

describe('clash latch + decay', () => {
  it('latches clash to 1 on the trigger frame', () => {
    const ctx = makeContext();
    const s0 = sampleModulators(ctx, null, NO_EFFECTS);
    expect(s0.values.get('clash')).toBe(0);

    const s1 = sampleModulators(ctx, s0, CLASH_ACTIVE);
    expect(s1.values.get('clash')).toBe(1);
    expect(s1.clashIntensity).toBe(1);
  });

  it('decays clash toward zero once the trigger releases', () => {
    const ctx = makeContext();
    let state: SamplerState = sampleModulators(ctx, null, CLASH_ACTIVE);
    expect(state.clashIntensity).toBe(1);

    // Release clash — decay should start.
    state = sampleModulators(ctx, state, NO_EFFECTS);
    expect(state.clashIntensity).toBeCloseTo(
      _internal.DEFAULT_CLASH_DECAY_PER_FRAME,
      6,
    );
    expect(state.clashIntensity).toBeLessThan(1);

    // After many frames it drops below a small epsilon.
    for (let i = 0; i < 200; i++) {
      state = sampleModulators(ctx, state, NO_EFFECTS);
    }
    expect(state.clashIntensity).toBeLessThan(1e-6);
  });

  it('does not re-latch clash if effectsActive stays on without rising edge', () => {
    const ctx = makeContext();
    let state: SamplerState = sampleModulators(ctx, null, CLASH_ACTIVE);
    expect(state.clashIntensity).toBe(1);

    // Even if effectsActive still contains clash, the intensity should
    // decay (no rising edge).
    state = sampleModulators(ctx, state, CLASH_ACTIVE);
    expect(state.clashIntensity).toBeLessThan(1);
    expect(state.clashIntensity).toBeGreaterThan(0);
  });

  it('re-latches clash on a fresh rising edge after decay', () => {
    const ctx = makeContext();
    let state: SamplerState = sampleModulators(ctx, null, CLASH_ACTIVE);

    // Decay enough that prev < 0.5.
    for (let i = 0; i < 20; i++) {
      state = sampleModulators(ctx, state, NO_EFFECTS);
    }
    expect(state.clashIntensity).toBeLessThan(0.5);

    // Re-trigger — rising edge detected, latch to 1.
    state = sampleModulators(ctx, state, CLASH_ACTIVE);
    expect(state.clashIntensity).toBe(1);
  });

  // ─── BladeConfig.clashDecay override ─────────────────────────────
  //
  // The optional 4th parameter overrides the per-frame decay
  // coefficient. BladeEngine threads this from `config.clashDecay`.
  // Out-of-band values (negative, > 1, NaN, undefined) all fall back
  // to the `DEFAULT_CLASH_DECAY_PER_FRAME` constant so the sampler
  // stays robust against legacy configs + glyph round-trip.

  it('honors a caller-provided clashDecayPerFrame override', () => {
    const ctx = makeContext();
    let state: SamplerState = sampleModulators(ctx, null, CLASH_ACTIVE);
    expect(state.clashIntensity).toBe(1);

    // Faster decay than default — 0.5 means the clash modulator
    // halves every frame instead of multiplying by 0.92.
    state = sampleModulators(ctx, state, NO_EFFECTS, 0.5);
    expect(state.clashIntensity).toBeCloseTo(0.5, 6);
    state = sampleModulators(ctx, state, NO_EFFECTS, 0.5);
    expect(state.clashIntensity).toBeCloseTo(0.25, 6);
  });

  it('clashDecayPerFrame=0 makes clash one-frame-only', () => {
    const ctx = makeContext();
    let state: SamplerState = sampleModulators(ctx, null, CLASH_ACTIVE);
    expect(state.clashIntensity).toBe(1);

    // Zero coefficient — next frame after release is fully off.
    state = sampleModulators(ctx, state, NO_EFFECTS, 0);
    expect(state.clashIntensity).toBe(0);
  });

  it('falls back to DEFAULT_CLASH_DECAY_PER_FRAME when override is undefined', () => {
    const ctx = makeContext();
    let state: SamplerState = sampleModulators(ctx, null, CLASH_ACTIVE);
    state = sampleModulators(ctx, state, NO_EFFECTS, undefined);
    expect(state.clashIntensity).toBeCloseTo(
      _internal.DEFAULT_CLASH_DECAY_PER_FRAME,
      6,
    );
  });

  it('rejects out-of-band overrides (< 0, > 1, NaN) and falls back to default', () => {
    const ctx = makeContext();
    const baseline = (() => {
      let s: SamplerState = sampleModulators(ctx, null, CLASH_ACTIVE);
      s = sampleModulators(ctx, s, NO_EFFECTS); // default decay
      return s.clashIntensity;
    })();

    for (const bad of [-0.5, 1.5, Number.NaN]) {
      let s: SamplerState = sampleModulators(ctx, null, CLASH_ACTIVE);
      s = sampleModulators(ctx, s, NO_EFFECTS, bad);
      expect(s.clashIntensity).toBeCloseTo(baseline, 6);
    }
  });
});

// ─── Determinism ────────────────────────────────────────────────────

describe('determinism', () => {
  it('produces identical output for identical input across two runs', () => {
    const seeds: StyleContext[] = [
      makeContext({ swingSpeed: 0.3, time: 0 }),
      makeContext({ swingSpeed: 0.8, time: 16 }),
      makeContext({ swingSpeed: 0.8, time: 32, soundLevel: 0.4 }),
      makeContext({ swingSpeed: 0.5, time: 48, soundLevel: 0.8 }),
      makeContext({ swingSpeed: 0.2, time: 64, soundLevel: 0.1 }),
    ];

    function runAll(): SamplerState {
      let state: SamplerState | null = null;
      for (const ctx of seeds) {
        state = sampleModulators(ctx, state, NO_EFFECTS);
      }
      return state!;
    }

    const a = runAll();
    const b = runAll();
    expect(a.clashIntensity).toBe(b.clashIntensity);
    expect(a.prevTime).toBe(b.prevTime);
    for (const [id, valueA] of a.values) {
      expect(b.values.get(id)).toBe(valueA);
    }
  });

  it('never mutates the previous SamplerState', () => {
    const ctx = makeContext({ swingSpeed: 0.5 });
    const prev = sampleModulators(ctx, null, NO_EFFECTS);
    const snapshot = new Map(prev.values);
    const nextCtx = makeContext({ swingSpeed: 0.9, time: 16 });
    sampleModulators(nextCtx, prev, NO_EFFECTS);
    // `prev` is unchanged.
    for (const [id, value] of snapshot) {
      expect(prev.values.get(id)).toBe(value);
    }
  });
});

// ─── Empty state helper ─────────────────────────────────────────────

describe('emptySamplerState()', () => {
  it('returns a zeroed state for every built-in modulator', () => {
    const s = emptySamplerState();
    expect(s.clashIntensity).toBe(0);
    expect(s.prevTime).toBe(0);
    for (const value of s.values.values()) {
      expect(value).toBe(0);
    }
  });
});
