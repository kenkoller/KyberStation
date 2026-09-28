// ─── Effects run on the engine's simulated clock ───
//
// Regression cover for the v0.23.x wall-clock bug: BaseEffect.trigger()
// stamped `startTime = performance.now()` while BladeEngine measured
// elapsed time as `_elapsedTime - startTime` on its own simulated
// timeline. An engine created N seconds after page load therefore saw a
// negative elapsed time for N seconds — a 400 ms clash stayed on screen
// for ~N s and the duration of every effect depended on how long the tab
// had been open. Six test files stubbed performance.now() to hide it.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { BladeEngine } from '../src/BladeEngine';
import type { BladeConfig } from '../src/types';

function makeConfig(): BladeConfig {
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
  };
}

/** Parameter-engine blade, fully ignited. */
function ignitedEngine(config: BladeConfig): BladeEngine {
  const engine = new BladeEngine();
  engine.setRenderMode('proffie');
  engine.ignite(config);
  for (let i = 0; i < 30; i++) engine.update(16, config);
  expect(engine.state).toBe('on');
  return engine;
}

function tick(engine: BladeEngine, config: BladeConfig, ms: number, dt = 16): void {
  for (let t = 0; t < ms; t += dt) engine.update(dt, config);
}

function redAt(engine: BladeEngine, led: number): number {
  return engine.getPixels()[led * 3]!;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('effect timing uses simulated time', () => {
  it('a 400 ms clash ends after ~400 ms even when the page has been open for minutes', () => {
    // Pretend the tab has been open for 5 minutes before the engine exists.
    vi.spyOn(performance, 'now').mockReturnValue(300_000);
    const config = makeConfig();
    const engine = ignitedEngine(config);
    const centre = 66;
    const baseRed = redAt(engine, centre);

    engine.triggerEffect('clash', { position: 0.5 });
    tick(engine, config, 48);
    expect(redAt(engine, centre)).toBeGreaterThan(baseRed + 50);

    tick(engine, config, 500);
    expect(redAt(engine, centre)).toBe(baseRed);
  });

  it('a held lockup stays visible while held and fades ~300 ms after release', () => {
    const config = makeConfig();
    const engine = ignitedEngine(config);
    const centre = 66;

    engine.triggerEffect('lockup', { position: 0.5 });
    tick(engine, config, 3000); // held far past the 1000 ms nominal duration
    expect(redAt(engine, centre)).toBeGreaterThan(60);

    engine.releaseEffect('lockup');
    tick(engine, config, 400);
    expect(redAt(engine, centre)).toBe(0);
  });

  it('slowing time stretches an effect on the simulated timeline', () => {
    const config = makeConfig();
    const engine = ignitedEngine(config);
    engine.timeScale = 0.25;
    const centre = 66;
    const baseRed = redAt(engine, centre);

    engine.triggerEffect('clash', { position: 0.5 });
    // 500 ms of wall time at 0.25x = 125 ms simulated → still flashing.
    tick(engine, config, 500);
    expect(redAt(engine, centre)).toBeGreaterThan(baseRed);
    // 2 s of wall time = 500 ms simulated → done.
    tick(engine, config, 1500);
    expect(redAt(engine, centre)).toBe(baseRed);
  });
});
