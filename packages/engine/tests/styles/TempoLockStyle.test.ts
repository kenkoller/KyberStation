import { describe, it, expect } from 'vitest';
import { createStyle, TempoLockStyle } from '../../src/styles/index';
import { tempoLockBrightness } from '../../src/styles/TempoLockStyle';
import type { BladeConfig, StyleContext } from '../../src/types';

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 50, g: 100, b: 200 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'tempoLock',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 400,
    shimmer: 0.0,
    ledCount: 144,
    ...overrides,
  };
}

function makeCtx(time: number, overrides: Partial<BladeConfig> = {}): StyleContext {
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
    config: makeConfig(overrides),
  };
}

describe('TempoLockStyle', () => {
  it('is registered in the style registry under id "tempoLock"', () => {
    const style = createStyle('tempoLock');
    expect(style).toBeInstanceOf(TempoLockStyle);
    expect(style.id).toBe('tempoLock');
  });

  describe('tempoLockBrightness — pure function', () => {
    it('depth=0: brightness is constant 1.0 (no pulse)', () => {
      const samples = [0, 100, 250, 500, 1000];
      for (const t of samples) {
        expect(tempoLockBrightness(t, 120, 0)).toBeCloseTo(1.0, 5);
      }
    });

    it('depth=1: brightness oscillates from 0 to 1', () => {
      // At BPM=120, period = 500ms. Sin peaks at 1/4 period (125ms): bright = 1.
      // Sin troughs at 3/4 period (375ms): bright = 0.
      const peak = tempoLockBrightness(125, 120, 1);
      const trough = tempoLockBrightness(375, 120, 1);
      expect(peak).toBeCloseTo(1.0, 3);
      expect(trough).toBeCloseTo(0.0, 3);
    });

    it('depth=0.5: brightness oscillates between 0.5 and 1.0', () => {
      const peak = tempoLockBrightness(125, 120, 0.5);
      const trough = tempoLockBrightness(375, 120, 0.5);
      expect(peak).toBeCloseTo(1.0, 3);
      expect(trough).toBeCloseTo(0.5, 3);
    });

    it('60 BPM cycles once per second', () => {
      // BPM=60 → period = 1000ms. At t=250ms (quarter cycle), sin should be at peak.
      const peak = tempoLockBrightness(250, 60, 1);
      expect(peak).toBeCloseTo(1.0, 3);
    });

    it('180 BPM cycles three times per second', () => {
      // BPM=180 → period = 333.33ms. At t = period/4 ≈ 83.33ms, peak.
      const peak = tempoLockBrightness(60000 / 180 / 4, 180, 1);
      expect(peak).toBeCloseTo(1.0, 3);
    });

    it('clamps BPM to [1, 300]', () => {
      // BPM=0 should clamp to 1, period=60000ms — at t=60000/4=15000ms, peak
      const peak = tempoLockBrightness(15000, 0, 1);
      expect(peak).toBeCloseTo(1.0, 3);
    });

    it('clamps depth to [0, 1]', () => {
      // depth=-1 should clamp to 0 → constant 1.0
      expect(tempoLockBrightness(125, 120, -1)).toBeCloseTo(1.0, 5);
      // depth=2 should clamp to 1 → range [0, 1]
      expect(tempoLockBrightness(125, 120, 2)).toBeCloseTo(1.0, 3);
      expect(tempoLockBrightness(375, 120, 2)).toBeCloseTo(0.0, 3);
    });

    it('pure function — deterministic', () => {
      const a = tempoLockBrightness(317.5, 144, 0.7);
      const b = tempoLockBrightness(317.5, 144, 0.7);
      expect(a).toBe(b);
    });
  });

  describe('TempoLockStyle.getColor', () => {
    it('produces baseColor at peak (depth=0.5, t=125ms, BPM=120)', () => {
      const style = new TempoLockStyle();
      const c = style.getColor(0.5, 125, makeCtx(125));
      // At peak (1.0): full baseColor
      expect(c.r).toBeCloseTo(50, 0);
      expect(c.g).toBeCloseTo(100, 0);
      expect(c.b).toBeCloseTo(200, 0);
    });

    it('produces dimmed baseColor at trough (depth=0.5, t=375ms, BPM=120)', () => {
      const style = new TempoLockStyle();
      const c = style.getColor(0.5, 375, makeCtx(375));
      // At trough (0.5): half baseColor
      expect(c.r).toBeCloseTo(25, 0);
      expect(c.g).toBeCloseTo(50, 0);
      expect(c.b).toBeCloseTo(100, 0);
    });

    it('all positions on the blade pulse identically (whole-blade modulation)', () => {
      const style = new TempoLockStyle();
      const samples = [0, 0.25, 0.5, 0.75, 1.0];
      const baseAtPeak = style.getColor(0, 125, makeCtx(125));
      for (const p of samples) {
        const c = style.getColor(p, 125, makeCtx(125));
        expect(c.r).toBeCloseTo(baseAtPeak.r, 0);
        expect(c.g).toBeCloseTo(baseAtPeak.g, 0);
        expect(c.b).toBeCloseTo(baseAtPeak.b, 0);
      }
    });

    it('uses default BPM=120 when tempoBpm not set', () => {
      const style = new TempoLockStyle();
      const c = style.getColor(0.5, 125, makeCtx(125));
      // Should not throw, should produce valid color
      expect(c).toBeDefined();
      expect(c.r).toBeGreaterThanOrEqual(0);
      expect(c.r).toBeLessThanOrEqual(255);
    });
  });
});
