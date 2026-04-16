// ─── LockupEffect spatial parameter tests ───
// Verifies that `config.lockupPosition` / `config.lockupRadius` take precedence
// over the runtime `trigger({position})` values set via the effect-bar button.

import { describe, it, expect } from 'vitest';
import { LockupEffect } from '../src/effects/LockupEffect.js';
import type { BladeConfig, EffectContext, RGB } from '../src/types.js';

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 0, g: 0, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0,
    ledCount: 144,
    ...overrides,
  };
}

function makeContext(config: BladeConfig): EffectContext {
  return {
    time: 0,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1,
    config,
    elapsed: 0,
    progress: 0,
  };
}

function isInfluenced(
  effect: LockupEffect,
  position: number,
  ctx: EffectContext,
  base: RGB,
): boolean {
  const out = effect.apply(base, position, ctx);
  return out.r !== base.r || out.g !== base.g || out.b !== base.b;
}

describe('LockupEffect — spatial lockup', () => {
  const base: RGB = { r: 10, g: 10, b: 10 };

  it('uses runtime trigger position when config.lockupPosition is unset', () => {
    const effect = new LockupEffect();
    effect.trigger({ position: 0.2 });
    const ctx = makeContext(makeConfig());
    // Far from runtime position → unaffected
    expect(isInfluenced(effect, 0.9, ctx, base)).toBe(false);
    // Near runtime position → affected
    expect(isInfluenced(effect, 0.2, ctx, base)).toBe(true);
  });

  it('prefers config.lockupPosition over the runtime trigger position', () => {
    const effect = new LockupEffect();
    effect.trigger({ position: 0.2 });
    const ctx = makeContext(makeConfig({ lockupPosition: 0.8 }));
    // The runtime trigger said 0.2, but config places the lockup at 0.8.
    // Config wins: the LED near 0.8 is the one that glows.
    expect(isInfluenced(effect, 0.8, ctx, base)).toBe(true);
    expect(isInfluenced(effect, 0.2, ctx, base)).toBe(false);
  });

  it('applies config.lockupRadius when provided', () => {
    const effect = new LockupEffect();
    effect.trigger({ position: 0.5 });
    // Narrow radius (0.03): only the immediate centre glows.
    const narrowCtx = makeContext(
      makeConfig({ lockupPosition: 0.5, lockupRadius: 0.03 }),
    );
    expect(isInfluenced(effect, 0.5, narrowCtx, base)).toBe(true);
    expect(isInfluenced(effect, 0.56, narrowCtx, base)).toBe(false);

    // Wide radius (0.3): the same 0.56 position now reaches.
    const wideCtx = makeContext(
      makeConfig({ lockupPosition: 0.5, lockupRadius: 0.3 }),
    );
    expect(isInfluenced(effect, 0.56, wideCtx, base)).toBe(true);
  });

  it('falls back to 0.12 radius when lockupRadius is unset', () => {
    const effect = new LockupEffect();
    effect.trigger({ position: 0.5 });
    const ctx = makeContext(makeConfig({ lockupPosition: 0.5 }));
    // 0.11 away → within default 0.12 radius
    expect(isInfluenced(effect, 0.5 + 0.11, ctx, base)).toBe(true);
    // 0.13 away → outside
    expect(isInfluenced(effect, 0.5 + 0.13, ctx, base)).toBe(false);
  });

  it('leaves behaviour unchanged for configs without spatial fields', () => {
    const effect = new LockupEffect();
    effect.trigger({ position: 0.7 });
    const ctx = makeContext(makeConfig());
    // Same behaviour as before the spatial-lockup feature landed.
    expect(isInfluenced(effect, 0.7, ctx, base)).toBe(true);
    expect(isInfluenced(effect, 0.1, ctx, base)).toBe(false);
  });
});
