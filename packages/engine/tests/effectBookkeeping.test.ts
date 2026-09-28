// ─── Effect bookkeeping: modulation sources + end-of-frame cleanup ───
//
// Two pieces of dead plumbing in BladeEngine, fixed together:
//
//   • `_activeEffectTypes` was declared and handed to the modulation
//     sampler every frame but never mutated, so the `clash` and `lockup`
//     modulation sources could never fire from the live engine.
//   • `cleanupEffects()` was an empty method called at the end of both
//     render paths. Effects only deactivated inside their own apply(),
//     which only the parameter engine calls — under template-eval every
//     one-shot and every released lockup stayed "active" forever.

import { describe, it, expect } from 'vitest';
import { BladeEngine } from '../src/BladeEngine';
import type { BladeConfig, BladeEffect } from '../src/types';

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 0, g: 0, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 0, b: 0 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0,
    ledCount: 132,
    ...overrides,
  };
}

/** A config with one binding, so the sampler runs every frame. */
function modulatedConfig(): BladeConfig {
  return makeConfig({
    modulation: {
      version: 1,
      bindings: [
        {
          id: 'clash-to-shimmer',
          source: 'clash',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.2,
        },
      ],
    },
  } as Partial<BladeConfig>);
}

function ignited(config: BladeConfig, mode: 'proffie' | 'template-eval'): BladeEngine {
  const engine = new BladeEngine();
  if (mode === 'proffie') engine.setRenderMode('proffie');
  else engine.setPreviewTemplate('StylePtr<Layers<Rgb<0,0,255>,InOutTrL<TrWipe<300>,TrWipeIn<500>>>>()');
  engine.ignite(config);
  for (let i = 0; i < 30; i++) engine.update(16, config);
  expect(engine.state).toBe('on');
  return engine;
}

function pooled(engine: BladeEngine, type: string): BladeEffect | undefined {
  return (engine as unknown as { effectPool: Map<string, BladeEffect> }).effectPool.get(`_global-${type}`);
}

describe('modulation sources driven by the live engine', () => {
  it('a clash latches the `clash` modulator once, then it decays', () => {
    const config = modulatedConfig();
    const engine = ignited(config, 'proffie');
    expect(engine.getSamplerState().values.get('clash')).toBe(0);

    engine.triggerEffect('clash', { position: 0.5 });
    engine.update(16, config);
    expect(engine.getSamplerState().values.get('clash')).toBe(1);

    // Decays for the rest of the 400 ms clash — and never re-latches, even
    // after the decayed value drops below the sampler's 0.5 re-arm level.
    let previous = 1;
    for (let i = 0; i < 30; i++) {
      engine.update(16, config);
      const value = engine.getSamplerState().values.get('clash')!;
      expect(value).toBeLessThan(previous);
      previous = value;
    }
    expect(previous).toBeLessThan(0.2);
  });

  it('the `lockup` modulator reads 1 while a lockup is held and 0 after release', () => {
    const config = modulatedConfig();
    const engine = ignited(config, 'proffie');
    expect(engine.getSamplerState().values.get('lockup')).toBe(0);

    engine.triggerEffect('lockup', { position: 0.5 });
    for (let i = 0; i < 60; i++) {
      engine.update(16, config);
      expect(engine.getSamplerState().values.get('lockup')).toBe(1);
    }

    engine.releaseEffect('lockup');
    engine.update(16, config);
    expect(engine.getSamplerState().values.get('lockup')).toBe(0);
  });

  it('reset() clears the reported effects', () => {
    const config = modulatedConfig();
    const engine = ignited(config, 'proffie');
    engine.triggerEffect('lockup', { position: 0.5 });
    engine.reset();
    engine.ignite(config);
    for (let i = 0; i < 30; i++) engine.update(16, config);
    expect(engine.getSamplerState().values.get('lockup')).toBe(0);
  });
});

describe('end-of-frame effect cleanup (render-path independent)', () => {
  for (const mode of ['proffie', 'template-eval'] as const) {
    it(`${mode}: a one-shot deactivates once its duration has elapsed`, () => {
      const config = makeConfig();
      const engine = ignited(config, mode);
      engine.triggerEffect('clash', { position: 0.5 });
      engine.update(16, config);
      expect(pooled(engine, 'clash')?.isActive()).toBe(true);
      for (let i = 0; i < 30; i++) engine.update(16, config); // > 400 ms
      expect(pooled(engine, 'clash')?.isActive()).toBe(false);
    });

    it(`${mode}: a held lockup stays active until released, then retires after its fade`, () => {
      const config = makeConfig();
      const engine = ignited(config, mode);
      engine.triggerEffect('lockup', { position: 0.5 });
      for (let i = 0; i < 200; i++) engine.update(16, config); // 3.2 s held
      expect(pooled(engine, 'lockup')?.isHeld()).toBe(true);

      engine.releaseEffect('lockup');
      engine.update(16, config);
      expect(pooled(engine, 'lockup')?.isActive()).toBe(true); // fading
      for (let i = 0; i < 25; i++) engine.update(16, config); // > 300 ms fade
      expect(pooled(engine, 'lockup')?.isActive()).toBe(false);
    });
  }

  it('the no-op `change` effect no longer stays active forever', () => {
    const config = makeConfig();
    const engine = ignited(config, 'proffie');
    engine.triggerEffect('change');
    for (let i = 0; i < 30; i++) engine.update(16, config);
    expect(pooled(engine, 'change')?.isActive()).toBe(false);
  });
});
