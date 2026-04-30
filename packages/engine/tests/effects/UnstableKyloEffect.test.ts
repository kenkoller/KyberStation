import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEffect } from '../../src/effects/index';
import { UnstableKyloEffect } from '../../src/effects/UnstableKyloEffect';
import type { BladeConfig, EffectContext, RGB } from '../../src/types';

function makeTestConfig(): BladeConfig {
  return {
    baseColor: { r: 200, g: 0, b: 0 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'unstable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0.1,
    ledCount: 144,
  };
}

function makeEffectContext(overrides?: Partial<EffectContext>): EffectContext {
  return {
    time: 1000,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1.0,
    preonProgress: 0,
    ignitionProgress: 0,
    retractionProgress: 0,
    config: makeTestConfig(),
    elapsed: 0,
    progress: 0,
    ...overrides,
  };
}

describe('UnstableKyloEffect', () => {
  let perfNowValue: number;

  beforeEach(() => {
    perfNowValue = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => perfNowValue);
  });

  it('is created via the factory under id "unstableKylo"', () => {
    const effect = createEffect('unstableKylo');
    expect(effect).toBeInstanceOf(UnstableKyloEffect);
    expect(effect.id).toBe('unstableKylo');
    expect(effect.type).toBe('unstableKylo');
  });

  it('starts inactive', () => {
    const effect = new UnstableKyloEffect();
    expect(effect.isActive()).toBe(false);
  });

  it('becomes active after trigger()', () => {
    const effect = new UnstableKyloEffect();
    effect.trigger({ position: 0.5 });
    expect(effect.isActive()).toBe(true);
  });

  it('apply() returns input color when inactive', () => {
    const effect = new UnstableKyloEffect();
    const input: RGB = { r: 100, g: 50, b: 25 };
    const result = effect.apply(input, 0.5, makeEffectContext());
    expect(result).toEqual(input);
  });

  it('apply() additively brightens near the clash point during the spark window', () => {
    const effect = new UnstableKyloEffect();
    effect.trigger({ position: 0.5 });

    const input: RGB = { r: 50, g: 0, b: 0 };
    // 30 ms in, mid-spark — most sparks should still be near origin
    const ctx = makeEffectContext({ elapsed: 30, progress: 0.15 });
    const result = effect.apply(input, 0.5, ctx);

    // Additive blend of white sparks should brighten beyond input
    // At least one channel should be brighter than the input
    expect(result.r + result.g + result.b).toBeGreaterThan(50);
  });

  it('apply() returns input color when far from the clash point', () => {
    const effect = new UnstableKyloEffect();
    effect.trigger({ position: 0.5 });

    const input: RGB = { r: 50, g: 0, b: 0 };
    // Right after trigger, sparks haven't traveled far — far end of blade
    // should see no contribution
    const ctx = makeEffectContext({ elapsed: 5, progress: 0.025 });
    const result = effect.apply(input, 0.0, ctx);

    // Should be very close to input — sparks haven't reached this position yet
    expect(Math.abs(result.r - input.r)).toBeLessThan(5);
  });

  it('deactivates when context.progress >= 1', () => {
    const effect = new UnstableKyloEffect();
    effect.trigger({ position: 0.5 });
    expect(effect.isActive()).toBe(true);

    effect.apply({ r: 0, g: 0, b: 0 }, 0.5, makeEffectContext({ elapsed: 200, progress: 1.0 }));
    expect(effect.isActive()).toBe(false);
  });

  it('sparks emanate from the trigger position (not always 0.5)', () => {
    const effect = new UnstableKyloEffect();
    effect.trigger({ position: 0.2 });

    const input: RGB = { r: 0, g: 0, b: 0 };
    // Just after trigger, sparks should be near pos 0.2
    const ctx = makeEffectContext({ elapsed: 20, progress: 0.1 });
    const nearOrigin = effect.apply(input, 0.2, ctx);
    const farFromOrigin = effect.apply(input, 0.8, ctx);

    // Near origin should be brighter than far from it
    const sumNear = nearOrigin.r + nearOrigin.g + nearOrigin.b;
    const sumFar = farFromOrigin.r + farFromOrigin.g + farFromOrigin.b;
    expect(sumNear).toBeGreaterThan(sumFar);
  });

  it('reset() deactivates the effect', () => {
    const effect = new UnstableKyloEffect();
    effect.trigger({ position: 0.5 });
    expect(effect.isActive()).toBe(true);
    effect.reset();
    expect(effect.isActive()).toBe(false);
  });

  it('returns finite RGB values for all positions during the active window', () => {
    const effect = new UnstableKyloEffect();
    effect.trigger({ position: 0.5 });

    for (let i = 0; i < 20; i++) {
      const p = i / 19;
      const ctx = makeEffectContext({ elapsed: 50, progress: 0.25 });
      const result = effect.apply({ r: 80, g: 0, b: 0 }, p, ctx);
      expect(Number.isFinite(result.r)).toBe(true);
      expect(Number.isFinite(result.g)).toBe(true);
      expect(Number.isFinite(result.b)).toBe(true);
    }
  });

  it('sparks fade over their lifespan (later frames are dimmer than earlier)', () => {
    const effect = new UnstableKyloEffect();
    effect.trigger({ position: 0.5 });

    const input: RGB = { r: 0, g: 0, b: 0 };
    const earlyCtx = makeEffectContext({ elapsed: 30, progress: 0.15 });
    const lateCtx = makeEffectContext({ elapsed: 140, progress: 0.7 });
    const earlySum = (() => {
      const c = effect.apply(input, 0.5, earlyCtx);
      return c.r + c.g + c.b;
    })();
    const lateSum = (() => {
      const c = effect.apply(input, 0.5, lateCtx);
      return c.r + c.g + c.b;
    })();

    // Sparks decay — late should be dimmer than early at the same position
    // (Or at least not brighter, since some sparks may have moved away)
    expect(lateSum).toBeLessThanOrEqual(earlySum + 5);
  });
});
