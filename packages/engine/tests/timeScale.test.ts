// ─── Time-scale — engine-level tests ─────────────────────────────────────
//
// Tests:
//   1. Default timeScale is 1.0
//   2. Setting timeScale to 0.5 halves the effective deltaMs
//   3. Setting timeScale to 2.0 doubles the effective deltaMs
//   4. timeScale clamps to minimum 0.1
//   5. timeScale clamps to maximum 4.0
//   6. timeScale of 0.25 produces quarter-speed animation progress
//   7. reset() restores timeScale to 1.0
//   8. timeScale does not affect the update() call frequency (only delta)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BladeEngine } from '../src/BladeEngine.js';
import { BladeState } from '../src/types.js';
import type { BladeConfig } from '../src/types.js';

function makeTestConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
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
    ...overrides,
  };
}

describe('BladeEngine timeScale', () => {
  let engine: BladeEngine;
  const config = makeTestConfig();

  beforeEach(() => {
    engine = new BladeEngine();
    vi.spyOn(performance, 'now').mockImplementation(() => 0);
  });

  it('default timeScale is 1.0', () => {
    expect(engine.timeScale).toBe(1.0);
  });

  it('setter updates the timeScale value', () => {
    engine.timeScale = 0.5;
    expect(engine.timeScale).toBe(0.5);

    engine.timeScale = 2.0;
    expect(engine.timeScale).toBe(2.0);
  });

  it('timeScale clamps to minimum 0.1', () => {
    engine.timeScale = 0;
    expect(engine.timeScale).toBe(0.1);

    engine.timeScale = -5;
    expect(engine.timeScale).toBe(0.1);

    engine.timeScale = 0.05;
    expect(engine.timeScale).toBe(0.1);
  });

  it('timeScale clamps to maximum 4.0', () => {
    engine.timeScale = 5;
    expect(engine.timeScale).toBe(4.0);

    engine.timeScale = 100;
    expect(engine.timeScale).toBe(4.0);

    engine.timeScale = 4.5;
    expect(engine.timeScale).toBe(4.0);
  });

  it('reset() restores timeScale to 1.0', () => {
    engine.timeScale = 0.25;
    expect(engine.timeScale).toBe(0.25);
    engine.reset();
    expect(engine.timeScale).toBe(1.0);
  });

  // ─── Behavioral tests: timeScale affects animation progress ───

  it('timeScale 0.5 halves the ignition progress per frame', () => {
    // At 1.0x: 300ms ignition, 16ms frame → progress += 16/300 ≈ 0.0533
    // At 0.5x: effective delta = 8ms → progress += 8/300 ≈ 0.0267
    engine.ignite(config);
    engine.timeScale = 1.0;
    engine.update(16, config);
    const progress1x = engine.extendProgress;

    // Reset and try at 0.5x
    const engine2 = new BladeEngine();
    engine2.ignite(config);
    engine2.timeScale = 0.5;
    engine2.update(16, config);
    const progress05x = engine2.extendProgress;

    // 0.5x should produce roughly half the progress of 1.0x
    expect(progress05x).toBeCloseTo(progress1x * 0.5, 4);
  });

  it('timeScale 2.0 doubles the ignition progress per frame', () => {
    engine.ignite(config);
    engine.timeScale = 1.0;
    engine.update(16, config);
    const progress1x = engine.extendProgress;

    const engine2 = new BladeEngine();
    engine2.ignite(config);
    engine2.timeScale = 2.0;
    engine2.update(16, config);
    const progress2x = engine2.extendProgress;

    // 2.0x should produce roughly double the progress of 1.0x
    expect(progress2x).toBeCloseTo(progress1x * 2.0, 4);
  });

  it('timeScale 0.25 produces quarter-speed animation progress', () => {
    engine.ignite(config);
    engine.timeScale = 1.0;
    engine.update(16, config);
    const progress1x = engine.extendProgress;

    const engine2 = new BladeEngine();
    engine2.ignite(config);
    engine2.timeScale = 0.25;
    engine2.update(16, config);
    const progress025x = engine2.extendProgress;

    expect(progress025x).toBeCloseTo(progress1x * 0.25, 4);
  });

  it('timeScale 0.5 takes twice as many frames to complete ignition', () => {
    // At 1.0x with 300ms ignition and 16ms frames: ~19 frames
    // At 0.5x: ~38 frames
    const engine1 = new BladeEngine();
    engine1.ignite(config);
    engine1.timeScale = 1.0;
    let frames1 = 0;
    while (engine1.state === BladeState.IGNITING && frames1 < 200) {
      engine1.update(16, config);
      frames1++;
    }

    const engine2 = new BladeEngine();
    engine2.ignite(config);
    engine2.timeScale = 0.5;
    let frames2 = 0;
    while (engine2.state === BladeState.IGNITING && frames2 < 400) {
      engine2.update(16, config);
      frames2++;
    }

    // Both should have completed ignition
    expect(engine1.state).toBe(BladeState.ON);
    expect(engine2.state).toBe(BladeState.ON);

    // 0.5x should take approximately twice as many frames
    expect(frames2).toBeCloseTo(frames1 * 2, 0);
  });
});
