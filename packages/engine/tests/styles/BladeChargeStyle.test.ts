import { describe, it, expect } from 'vitest';
import { createStyle, BladeChargeStyle } from '../../src/styles/index';
import { bladeChargeWeight } from '../../src/styles/BladeChargeStyle';
import type { BladeConfig, StyleContext } from '../../src/types';

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 100, g: 100, b: 100 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'bladeCharge',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 400,
    shimmer: 0.0,
    ledCount: 144,
    ...overrides,
  };
}

function makeCtx(swingSpeed: number, overrides: Partial<BladeConfig> = {}): StyleContext {
  return {
    time: 0,
    swingSpeed,
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

describe('BladeChargeStyle', () => {
  it('is registered in the style registry under id "bladeCharge"', () => {
    const style = createStyle('bladeCharge');
    expect(style).toBeInstanceOf(BladeChargeStyle);
    expect(style.id).toBe('bladeCharge');
  });

  describe('bladeChargeWeight — pure function', () => {
    it('idle (swing=0): returns ~1.0 everywhere along the blade', () => {
      const samples = [0, 0.25, 0.5, 0.75, 1.0];
      for (const p of samples) {
        const w = bladeChargeWeight(p, 0, 1.5, 0.6);
        expect(w).toBeCloseTo(1.0, 5);
      }
    });

    it('full swing: tip is brighter than hilt (energy pools to tip)', () => {
      const hilt = bladeChargeWeight(0, 1, 1.5, 0.6);
      const tip = bladeChargeWeight(1, 1, 1.5, 0.6);
      expect(tip).toBeGreaterThan(hilt);
    });

    it('full swing: tip weight = 1 + boost * (1 - lift)', () => {
      // boost=0.6, lift=0.4 (internal): tip = 1 + 0.6 * (1 - 0.4) = 1 + 0.36 = 1.36
      const tip = bladeChargeWeight(1, 1, 1.5, 0.6);
      expect(tip).toBeCloseTo(1.36, 5);
    });

    it('full swing: hilt weight = 1 - boost * lift (slightly under 1.0)', () => {
      // boost=0.6, lift=0.4: hilt = 1 + 0.6 * (0 - 0.4) = 1 - 0.24 = 0.76
      const hilt = bladeChargeWeight(0, 1, 1.5, 0.6);
      expect(hilt).toBeCloseTo(0.76, 5);
    });

    it('clamps swingSpeed to [0, 1]', () => {
      // Negative swing should clamp to 0 → idle
      expect(bladeChargeWeight(0.5, -1, 1.5, 0.6)).toBeCloseTo(1.0, 5);
      // swing > 1 should clamp to 1
      expect(bladeChargeWeight(1, 5, 1.5, 0.6)).toBeCloseTo(1.36, 5);
    });

    it('higher exponent makes pooling sharper (tip dominates more)', () => {
      // At pos 0.5, exponent=1 gives 0.5^1 = 0.5; exponent=3 gives 0.5^3 = 0.125
      const linear = bladeChargeWeight(0.5, 1, 1, 0.6);
      const sharp = bladeChargeWeight(0.5, 1, 3, 0.6);
      // Both contributions to weight: linear has more brightness at midblade
      // because the curve hasn't dipped yet
      expect(linear).toBeGreaterThan(sharp);
    });

    it('weight stays >= 0 even at hilt with extreme boost', () => {
      // boost = 2 (clamped to 2 internally), pos=0, swing=1: 1 + 2 * (0 - 0.4) = 0.2
      // Should be >= 0.
      const w = bladeChargeWeight(0, 1, 1.5, 2);
      expect(w).toBeGreaterThanOrEqual(0);
    });

    it('pure function — deterministic', () => {
      const a = bladeChargeWeight(0.7, 0.5, 1.8, 0.55);
      const b = bladeChargeWeight(0.7, 0.5, 1.8, 0.55);
      expect(a).toBe(b);
    });
  });

  describe('BladeChargeStyle.getColor', () => {
    it('idle: returns baseColor everywhere (within rounding)', () => {
      const style = new BladeChargeStyle();
      const samples = [0, 0.25, 0.5, 0.75, 1.0];
      for (const p of samples) {
        const c = style.getColor(p, 0, makeCtx(0));
        expect(c.r).toBeCloseTo(100, 0);
        expect(c.g).toBeCloseTo(100, 0);
        expect(c.b).toBeCloseTo(100, 0);
      }
    });

    it('full swing: tip color is brighter than hilt color', () => {
      const style = new BladeChargeStyle();
      const hilt = style.getColor(0, 0, makeCtx(1));
      const tip = style.getColor(1, 0, makeCtx(1));
      expect(tip.r).toBeGreaterThan(hilt.r);
    });

    it('clamps output to <= 255 per channel', () => {
      const style = new BladeChargeStyle();
      // Bright base + full swing + max boost should not blow past 255
      const c = style.getColor(1, 0, makeCtx(1, {
        baseColor: { r: 255, g: 255, b: 255 },
        chargeBoost: 1,
      }));
      expect(c.r).toBeLessThanOrEqual(255);
      expect(c.g).toBeLessThanOrEqual(255);
      expect(c.b).toBeLessThanOrEqual(255);
    });
  });
});
