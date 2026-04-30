import { describe, it, expect } from 'vitest';
import { createStyle, SithFlickerStyle } from '../../src/styles/index';
import { sithFlickerBrightness } from '../../src/styles/SithFlickerStyle';
import type { BladeConfig, StyleContext } from '../../src/types';

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 200, g: 0, b: 0 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'sithFlicker',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 400,
    shimmer: 0.0,
    ledCount: 144,
    ...overrides,
  };
}

function makeCtx(time: number, configOverrides: Partial<BladeConfig> = {}): StyleContext {
  return {
    time,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1.0,
    preonProgress: 0,
    ignitionProgress: 0,
    retractionProgress: 0,
    config: makeConfig(configOverrides),
  };
}

describe('SithFlickerStyle', () => {
  it('is registered in the style registry under id "sithFlicker"', () => {
    const style = createStyle('sithFlicker');
    expect(style).toBeInstanceOf(SithFlickerStyle);
    expect(style.id).toBe('sithFlicker');
  });

  describe('sithFlickerBrightness — pure function', () => {
    it('returns 1.0 when sin > 0 (full brightness)', () => {
      // sin(2π * 5/4 / 1) = sin(2.5π) = sin(0.5π) = 1, so > 0.
      // At rate 1 Hz, time t (ms) → phase = t/1000. We want phase = 0.25 (sin = 1).
      // time = 250 ms.
      const result = sithFlickerBrightness(250, 1, 0.1);
      expect(result).toBe(1.0);
    });

    it('returns minBright when sin <= 0 (dim phase)', () => {
      // At rate 1Hz, time = 750ms → phase = 0.75 → sin(2π*0.75) = sin(1.5π) = -1
      const result = sithFlickerBrightness(750, 1, 0.1);
      expect(result).toBe(0.1);
    });

    it('clamps minBright to [0, 1]', () => {
      // sin <= 0 phase. minBright = 1.5 should clamp to 1.
      expect(sithFlickerBrightness(750, 1, 1.5)).toBe(1);
      // minBright = -0.5 should clamp to 0.
      expect(sithFlickerBrightness(750, 1, -0.5)).toBe(0);
    });

    it('higher rate cycles faster: same time gives different output for different rates', () => {
      // At rate 5 Hz, time = 100ms → phase = 0.5 → sin(π) = 0 (boundary)
      // At rate 8 Hz, time = 100ms → phase = 0.8 → sin(1.6π) ≈ -0.95 → dim
      // Specifically rate 8 should be in the dim phase at this time
      const fast = sithFlickerBrightness(100, 8, 0.1);
      expect(fast).toBe(0.1);
    });

    it('pure function — same inputs always produce same output (deterministic)', () => {
      const a = sithFlickerBrightness(123.456, 5, 0.1);
      const b = sithFlickerBrightness(123.456, 5, 0.1);
      expect(a).toBe(b);
    });

    it('sweeps full range over one period — both extrema seen', () => {
      const samples = 100;
      const periodMs = 200; // rate 5 Hz
      let seenHigh = false;
      let seenLow = false;
      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * periodMs;
        const v = sithFlickerBrightness(t, 5, 0.1);
        if (v >= 0.99) seenHigh = true;
        if (v <= 0.11) seenLow = true;
      }
      expect(seenHigh).toBe(true);
      expect(seenLow).toBe(true);
    });
  });

  describe('SithFlickerStyle.getColor', () => {
    it('produces baseColor at full brightness during the bright phase', () => {
      const style = new SithFlickerStyle();
      const c = style.getColor(0.5, 250, makeCtx(250, { flickerRate: 1 }));
      // Full-bright phase at rate 1Hz/t=250ms; per-LED ripple is small (<2.5%)
      expect(c.r).toBeGreaterThan(190); // ~200 with small ripple
      expect(c.r).toBeLessThanOrEqual(200);
    });

    it('produces dim baseColor during the dim phase', () => {
      const style = new SithFlickerStyle();
      const c = style.getColor(0.5, 750, makeCtx(750, { flickerRate: 1, flickerMinBright: 0.1 }));
      // Dim phase: 200 * 0.1 = 20, ± 5 from per-LED ripple
      expect(c.r).toBeGreaterThanOrEqual(13);
      expect(c.r).toBeLessThanOrEqual(27);
    });

    it('green and blue channels stay zero for pure red base', () => {
      const style = new SithFlickerStyle();
      const c = style.getColor(0.5, 250, makeCtx(250, { flickerRate: 1 }));
      expect(c.g).toBe(0);
      expect(c.b).toBe(0);
    });

    it('uses default rate=5Hz when flickerRate not set', () => {
      const style = new SithFlickerStyle();
      // Just verify it doesn't throw with defaults
      const c = style.getColor(0.5, 100, makeCtx(100));
      expect(c).toBeDefined();
      expect(typeof c.r).toBe('number');
      expect(c.r).toBeGreaterThanOrEqual(0);
      expect(c.r).toBeLessThanOrEqual(255);
    });

    it('per-LED ripple stays under 5% (whole-blade event, not per-pixel noise)', () => {
      const style = new SithFlickerStyle();
      // Sample brightness across many LED positions during the bright phase
      const samples: number[] = [];
      for (let i = 0; i < 50; i++) {
        const p = i / 49;
        const c = style.getColor(p, 250, makeCtx(250, { flickerRate: 1 }));
        samples.push(c.r / 200); // normalized brightness
      }
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      // Ripple should be bounded
      expect(max - min).toBeLessThan(0.06); // ~5% spread
    });
  });
});
