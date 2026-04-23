import { describe, it, expect } from 'vitest';
import { createStyle, DarkSaberStyle } from '../../src/styles/index';
import { darksaberColorAt } from '../../src/styles/DarkSaberStyle';
import type { BladeConfig, StyleContext, RGB } from '../../src/types';

function makeConfig(): BladeConfig {
  return {
    baseColor: { r: 255, g: 255, b: 255 },
    clashColor: { r: 160, g: 180, b: 255 },
    lockupColor: { r: 100, g: 120, b: 200 },
    blastColor: { r: 200, g: 210, b: 255 },
    style: 'darksaber',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 400,
    shimmer: 0.0,
    ledCount: 144,
  };
}

function makeCtx(): StyleContext {
  return {
    time: 0,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1.0,
    config: makeConfig(),
  };
}

function brightness(c: RGB): number {
  return c.r + c.g + c.b;
}

describe('DarkSaberStyle', () => {
  it('is registered in the style registry under id "darksaber"', () => {
    const style = createStyle('darksaber');
    expect(style).toBeInstanceOf(DarkSaberStyle);
    expect(style.id).toBe('darksaber');
  });

  it('position 0.0 returns pure white (emitter flare)', () => {
    const s = new DarkSaberStyle();
    const c = s.getColor(0, 0, makeCtx());
    expect(c.r).toBe(255);
    expect(c.g).toBe(255);
    expect(c.b).toBe(255);
  });

  it('position 0.5 returns near-black body (r,g,b all <= 10)', () => {
    const s = new DarkSaberStyle();
    const c = s.getColor(0.5, 0, makeCtx());
    expect(c.r).toBeLessThanOrEqual(10);
    expect(c.g).toBeLessThanOrEqual(10);
    expect(c.b).toBeLessThanOrEqual(10);
  });

  it('position 1.0 returns pure white (tip flare)', () => {
    const s = new DarkSaberStyle();
    const c = s.getColor(1.0, 0, makeCtx());
    expect(c.r).toBe(255);
    expect(c.g).toBe(255);
    expect(c.b).toBe(255);
  });

  it('transition from 0.03 → 0.08 is monotonically decreasing in brightness', () => {
    const samples = 20;
    let prev = Infinity;
    for (let i = 0; i <= samples; i++) {
      const p = 0.03 + (0.08 - 0.03) * (i / samples);
      const c = darksaberColorAt(p);
      const b = brightness(c);
      // Allow equality at the two clamped endpoints (white plateau / body plateau)
      expect(b).toBeLessThanOrEqual(prev);
      prev = b;
    }
  });

  it('pattern is symmetric: color at p ≈ color at 1 - p', () => {
    const samples = [0, 0.02, 0.05, 0.08, 0.2, 0.4, 0.5];
    for (const p of samples) {
      const forward = darksaberColorAt(p);
      const mirror = darksaberColorAt(1 - p);
      expect(Math.abs(forward.r - mirror.r)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(forward.g - mirror.g)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(forward.b - mirror.b)).toBeLessThanOrEqual(0.01);
    }
  });

  it('body zone (0.08..0.92) is uniformly near-black', () => {
    const samples = [0.08, 0.2, 0.3, 0.5, 0.7, 0.85, 0.92];
    for (const p of samples) {
      const c = darksaberColorAt(p);
      expect(c.r).toBeLessThanOrEqual(10);
      expect(c.g).toBeLessThanOrEqual(10);
      expect(c.b).toBeLessThanOrEqual(10);
    }
  });

  it('output is never pure {0,0,0} — real LEDs need a minimum floor', () => {
    const samples = [0.1, 0.3, 0.5, 0.7, 0.9];
    for (const p of samples) {
      const c = darksaberColorAt(p);
      // At least one channel non-zero so the LED isn't fully off
      expect(c.r + c.g + c.b).toBeGreaterThan(0);
    }
  });
});
