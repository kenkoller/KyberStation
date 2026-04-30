import { describe, it, expect } from 'vitest';
import { SithFlickerStyle } from '../src/styles/SithFlickerStyle.js';
import { BladeChargeStyle } from '../src/styles/BladeChargeStyle.js';
import { TempoLockStyle } from '../src/styles/TempoLockStyle.js';
import { UnstableKyloEffect } from '../src/effects/UnstableKyloEffect.js';
import type { StyleContext } from '../src/types.js';

const baseContext = (): StyleContext => ({
  time: 0,
  swingSpeed: 0,
  bladeAngle: 0,
  twistAngle: 0,
  soundLevel: 0,
  batteryLevel: 1,
  preonProgress: 0,
  ignitionProgress: 1,
  retractionProgress: 0,
  config: {
    baseColor: { r: 255, g: 0, b: 0 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 100 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'sithFlicker',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 350,
    retractionMs: 800,
    shimmer: 0,
    ledCount: 144,
  },
});

describe('SithFlickerStyle', () => {
  const style = new SithFlickerStyle();

  it('has the expected id', () => {
    expect(style.id).toBe('sithFlicker');
  });

  it('returns valid RGB output across positions and time', () => {
    const ctx = baseContext();
    for (const t of [0, 100, 500, 1000, 5000]) {
      ctx.time = t;
      for (const pos of [0, 0.5, 1]) {
        const out = style.getColor(pos, t, ctx);
        expect(out.r).toBeGreaterThanOrEqual(0);
        expect(out.r).toBeLessThanOrEqual(255);
        expect(out.g).toBeGreaterThanOrEqual(0);
        expect(out.b).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('produces output that varies over time (flickers)', () => {
    const ctx = baseContext();
    const samples = [];
    for (let t = 0; t < 2000; t += 50) {
      ctx.time = t;
      samples.push(style.getColor(0.5, t, ctx).r);
    }
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    expect(max - min).toBeGreaterThan(20);
  });

  it('is deterministic across repeated calls with the same time', () => {
    const ctx = baseContext();
    ctx.time = 1234;
    const a = style.getColor(0.5, 1234, ctx);
    const b = style.getColor(0.5, 1234, ctx);
    expect(a).toEqual(b);
  });
});

describe('BladeChargeStyle', () => {
  const style = new BladeChargeStyle();

  it('has the expected id', () => {
    expect(style.id).toBe('bladeCharge');
  });

  it('returns valid RGB across positions', () => {
    const ctx = baseContext();
    for (const pos of [0, 0.25, 0.5, 0.75, 1]) {
      const out = style.getColor(pos, 1000, ctx);
      expect(out.r).toBeGreaterThanOrEqual(0);
      expect(out.r).toBeLessThanOrEqual(255);
      expect(out.g).toBeGreaterThanOrEqual(0);
      expect(out.b).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('TempoLockStyle', () => {
  const style = new TempoLockStyle();

  it('has the expected id', () => {
    expect(style.id).toBe('tempoLock');
  });

  it('returns valid RGB across positions and times', () => {
    const ctx = baseContext();
    for (const t of [0, 250, 500, 1000]) {
      const out = style.getColor(0.5, t, ctx);
      expect(out.r).toBeGreaterThanOrEqual(0);
      expect(out.g).toBeGreaterThanOrEqual(0);
      expect(out.b).toBeGreaterThanOrEqual(0);
      expect(Math.max(out.r, out.g, out.b)).toBeLessThanOrEqual(255);
    }
  });
});

describe('UnstableKyloEffect', () => {
  it('exports as a class with an id', () => {
    const effect = new UnstableKyloEffect();
    expect(effect.id).toBeDefined();
    expect(typeof effect.id).toBe('string');
  });
});
