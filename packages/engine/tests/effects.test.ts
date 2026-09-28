import { describe, it, expect, vi } from 'vitest';
import { createEffect } from '../src/effects/index';
import type { BladeConfig, EffectContext, EffectType, RGB } from '../src/types';

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

function makeEffectContext(overrides?: Partial<EffectContext>): EffectContext {
  return {
    time: 1000,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1.0,
    config: makeTestConfig(),
    elapsed: 0,
    progress: 0,
    ...overrides,
  };
}

const ALL_EFFECTS: EffectType[] = [
  'clash',
  'lockup',
  'blast',
  'drag',
  'melt',
  'lightning',
  'stab',
  'force',
  'fragment',
  'bifurcate',
  'ghostEcho',
  'splinter',
  'coronary',
  'glitchMatrix',
  'siphon',
  'unstableKylo',
];

// Sustained effects stay active until release() is called
const SUSTAINED_EFFECTS: EffectType[] = ['lockup', 'drag', 'melt', 'lightning'];

// Non-sustained effects auto-deactivate after their duration
const NON_SUSTAINED_EFFECTS: EffectType[] = ['clash', 'blast', 'stab', 'force'];

describe('createEffect', () => {
  it('throws for unknown effect type', () => {
    expect(() => createEffect('nonexistent' as EffectType)).toThrow();
  });
});

describe.each(ALL_EFFECTS)('Effect: %s', (effectType) => {
  it('never reads the wall clock (timing lives on the simulated clock)', () => {
    const spy = vi.spyOn(performance, 'now').mockImplementation(() => {
      throw new Error('effect read performance.now()');
    });
    try {
      const effect = createEffect(effectType);
      effect.trigger({ position: 0.5, triggerTime: 1000 });
      const { elapsed, progress } = effect.timing(1100);
      expect(elapsed).toBe(100);
      expect(progress).toBeGreaterThan(0);
      effect.apply({ r: 100, g: 100, b: 100 }, 0.5, makeEffectContext({ elapsed, progress }));
      effect.release(1200);
    } finally {
      spy.mockRestore();
    }
  });

  it('creates successfully', () => {
    const effect = createEffect(effectType);
    expect(effect).toBeDefined();
    expect(effect.id).toBe(effectType);
    expect(effect.type).toBe(effectType);
  });

  it('starts inactive', () => {
    const effect = createEffect(effectType);
    expect(effect.isActive()).toBe(false);
  });

  it('becomes active after trigger()', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5 });
    expect(effect.isActive()).toBe(true);
  });

  it('apply() returns an RGB object', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5 });

    const inputColor: RGB = { r: 100, g: 100, b: 100 };
    const context = makeEffectContext({ elapsed: 50, progress: 0.1 });
    const result = effect.apply(inputColor, 0.5, context);

    expect(result).toBeDefined();
    expect(typeof result.r).toBe('number');
    expect(typeof result.g).toBe('number');
    expect(typeof result.b).toBe('number');
    expect(Number.isFinite(result.r)).toBe(true);
    expect(Number.isFinite(result.g)).toBe(true);
    expect(Number.isFinite(result.b)).toBe(true);
  });

  it('apply() returns input color when inactive', () => {
    const effect = createEffect(effectType);
    const inputColor: RGB = { r: 42, g: 84, b: 126 };
    const context = makeEffectContext();
    const result = effect.apply(inputColor, 0.5, context);
    expect(result).toEqual(inputColor);
  });

  it('reset() deactivates the effect', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5 });
    expect(effect.isActive()).toBe(true);
    effect.reset();
    expect(effect.isActive()).toBe(false);
  });

  it('can be re-triggered after reset', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5 });
    effect.reset();
    effect.trigger({ position: 0.3 });
    expect(effect.isActive()).toBe(true);
  });
});

describe.each(SUSTAINED_EFFECTS)('Sustained effect: %s', (effectType) => {
  it('stays active after duration elapses (sustained)', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5 });

    // apply() with progress past 1 must not deactivate a held effect.
    const context = makeEffectContext({ elapsed: 2000, progress: 2.0 });
    effect.apply({ r: 100, g: 100, b: 100 }, 0.5, context);

    // Should still be active because it's sustained
    expect(effect.isActive()).toBe(true);
    expect(effect.isHeld()).toBe(true);
  });

  it('holds at full strength for as long as it is held', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5, triggerTime: 0 });
    // Long past its nominal 1000 ms duration, a held effect parks at the
    // fade-out knee (0.7) — getFadeOut() is still 1 there.
    expect(effect.timing(5000).progress).toBeCloseTo(0.7, 5);
    expect(effect.timing(60_000).progress).toBeCloseTo(0.7, 5);
  });

  it('fades out from the release, not from the trigger', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5, triggerTime: 0 });
    effect.release(5000);
    expect(effect.isHeld()).toBe(false);
    expect(effect.isActive()).toBe(true);
    // 1000 ms duration → the 0.7 → 1 fade takes 300 ms after release.
    expect(effect.timing(5000).progress).toBeCloseTo(0.7, 5);
    expect(effect.timing(5150).progress).toBeCloseTo(0.85, 5);
    expect(effect.timing(5300).progress).toBe(1);
    expect(effect.timing(9000).progress).toBe(1);
  });

  it('re-triggering during the fade holds it again', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5, triggerTime: 0 });
    effect.release(1000);
    effect.trigger({ position: 0.5, triggerTime: 1100 });
    expect(effect.isHeld()).toBe(true);
    expect(effect.timing(4000).progress).toBeCloseTo(0.7, 5);
  });

  it('reset() deactivates a held effect', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5 });
    effect.reset();
    expect(effect.isActive()).toBe(false);
    expect(effect.isHeld()).toBe(false);
  });

  it('release() does not throw when not active', () => {
    const effect = createEffect(effectType);
    // Should not throw even when not active
    expect(() => effect.release()).not.toThrow();
  });
});

describe.each(NON_SUSTAINED_EFFECTS)('Non-sustained effect: %s', (effectType) => {
  it('progresses on the simulated clock from its trigger time', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5, triggerTime: 5000 });
    expect(effect.isHeld()).toBe(false);
    expect(effect.timing(5000)).toEqual({ elapsed: 0, progress: 0 });
    const later = effect.timing(5100);
    expect(later.elapsed).toBe(100);
    expect(later.progress).toBeGreaterThan(0);
    expect(later.progress).toBeLessThan(1);
    expect(effect.timing(50_000).progress).toBe(1);
    // A timestamp before the trigger never yields negative elapsed time.
    expect(effect.timing(0)).toEqual({ elapsed: 0, progress: 0 });
  });

  it('becomes inactive after progress reaches 1', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5 });
    expect(effect.isActive()).toBe(true);

    // Apply with progress >= 1 to simulate completion
    const context = makeEffectContext({ elapsed: 1000, progress: 1.0 });
    effect.apply({ r: 100, g: 100, b: 100 }, 0.5, context);

    // The apply methods for non-sustained effects check context.progress >= 1
    // and set this.active = false
    expect(effect.isActive()).toBe(false);
  });

  it('stays active during animation (progress < 0.7)', () => {
    const effect = createEffect(effectType);
    effect.trigger({ position: 0.5 });

    const context = makeEffectContext({ elapsed: 100, progress: 0.3 });
    effect.apply({ r: 100, g: 100, b: 100 }, 0.5, context);

    expect(effect.isActive()).toBe(true);
  });
});
