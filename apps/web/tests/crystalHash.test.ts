import { describe, it, expect } from 'vitest';
import { hashConfig, seedRng, rangeRng, pickRng } from '@/lib/crystal/hash';
import type { BladeConfig } from '@kyberstation/engine';

const BASE: BladeConfig = {
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 80 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 800,
  shimmer: 0.1,
  ledCount: 144,
};

describe('hashConfig', () => {
  it('is deterministic — same config yields same hash', () => {
    expect(hashConfig(BASE)).toBe(hashConfig(BASE));
  });

  it('changes when the base colour changes', () => {
    const h1 = hashConfig(BASE);
    const h2 = hashConfig({ ...BASE, baseColor: { r: 220, g: 30, b: 24 } });
    expect(h1).not.toBe(h2);
  });

  it('changes when style changes', () => {
    const h1 = hashConfig(BASE);
    const h2 = hashConfig({ ...BASE, style: 'unstable' });
    expect(h1).not.toBe(h2);
  });

  it('does NOT change when name changes (name is not a visual discriminator)', () => {
    const h1 = hashConfig(BASE);
    const h2 = hashConfig({ ...BASE, name: 'Something else entirely' });
    expect(h1).toBe(h2);
  });

  it('changes when shimmer changes', () => {
    const h1 = hashConfig(BASE);
    const h2 = hashConfig({ ...BASE, shimmer: 0.9 });
    expect(h1).not.toBe(h2);
  });

  it('changes when ledCount changes (size discriminator)', () => {
    const h1 = hashConfig(BASE);
    const h2 = hashConfig({ ...BASE, ledCount: 72 });
    expect(h1).not.toBe(h2);
  });

  it('changes when spatial lockup position changes', () => {
    const h1 = hashConfig(BASE);
    const h2 = hashConfig({ ...BASE, lockupPosition: 0.5 });
    expect(h1).not.toBe(h2);
  });
});

describe('seedRng (mulberry32)', () => {
  it('produces identical sequences for identical seeds', () => {
    const r1 = seedRng(42);
    const r2 = seedRng(42);
    const seq1 = [r1(), r1(), r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2(), r2(), r2()];
    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const r1 = seedRng(42);
    const r2 = seedRng(43);
    expect(r1()).not.toBe(r2());
  });

  it('outputs values in [0, 1)', () => {
    const r = seedRng(0xdeadbeef);
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('rangeRng / pickRng', () => {
  it('rangeRng respects bounds', () => {
    const r = seedRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rangeRng(r, -2, 5);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
  });

  it('pickRng only returns values from the provided array', () => {
    const r = seedRng(7);
    const choices = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 50; i++) {
      expect(choices).toContain(pickRng(r, choices));
    }
  });
});
