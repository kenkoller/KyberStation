import { describe, it, expect } from 'vitest';
import {
  XENO_STYLE_REGISTRY,
  createXenoStyle,
  xenoEffectIdToStyleId,
  XenoSteadyStyle,
  XenoRainbowStyle,
  XenoPulseStyle,
  XenoFlashingStyle,
} from '../src/styles/xenopixel/index';
import type { BladeConfig, StyleContext, RGB } from '../src/types';

// ─── Test helpers ───

function makeTestConfig(overrides?: Partial<BladeConfig>): BladeConfig {
  return {
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'xeno-steady',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0,
    ledCount: 144,
    ...overrides,
  };
}

function makeContext(overrides?: Partial<StyleContext>): StyleContext {
  return {
    time: 0,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1.0,
    preonProgress: 0,
    ignitionProgress: 0,
    retractionProgress: 0,
    config: makeTestConfig(),
    ...overrides,
  };
}

function isValidRGB(color: RGB): boolean {
  return (
    typeof color.r === 'number' &&
    typeof color.g === 'number' &&
    typeof color.b === 'number' &&
    Number.isFinite(color.r) &&
    Number.isFinite(color.g) &&
    Number.isFinite(color.b)
  );
}

function isInRange(color: RGB): boolean {
  return (
    color.r >= -1 && color.r <= 256 &&
    color.g >= -1 && color.g <= 256 &&
    color.b >= -1 && color.b <= 256
  );
}

// ─── Registry tests ───

describe('XENO_STYLE_REGISTRY', () => {
  it('has exactly 8 entries', () => {
    expect(Object.keys(XENO_STYLE_REGISTRY)).toHaveLength(8);
  });

  it('contains all expected style IDs', () => {
    const expectedIds = [
      'xeno-fire',
      'xeno-steady',
      'xeno-unstable',
      'xeno-rainbow',
      'xeno-candy',
      'xeno-crack',
      'xeno-pulse',
      'xeno-flashing',
    ];
    for (const id of expectedIds) {
      expect(XENO_STYLE_REGISTRY).toHaveProperty(id);
    }
  });

  it('each factory produces a style with matching id', () => {
    for (const [key, factory] of Object.entries(XENO_STYLE_REGISTRY)) {
      const style = factory();
      expect(style.id).toBe(key);
    }
  });
});

// ─── createXenoStyle tests ───

describe('createXenoStyle', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('creates a style for effect ID %i', (id) => {
    const style = createXenoStyle(id);
    expect(style).toBeDefined();
    expect(style.id).toBeTruthy();
  });

  it('throws for negative effect ID', () => {
    expect(() => createXenoStyle(-1)).toThrow();
  });

  it('throws for effect ID 8 (out of range)', () => {
    expect(() => createXenoStyle(8)).toThrow();
  });

  it('throws for non-integer effect ID', () => {
    expect(() => createXenoStyle(1.5)).toThrow();
  });
});

// ─── xenoEffectIdToStyleId tests ───

describe('xenoEffectIdToStyleId', () => {
  const expectedMap: [number, string][] = [
    [0, 'xeno-fire'],
    [1, 'xeno-steady'],
    [2, 'xeno-unstable'],
    [3, 'xeno-rainbow'],
    [4, 'xeno-candy'],
    [5, 'xeno-crack'],
    [6, 'xeno-pulse'],
    [7, 'xeno-flashing'],
  ];

  it.each(expectedMap)('maps effect ID %i to "%s"', (id, expected) => {
    expect(xenoEffectIdToStyleId(id)).toBe(expected);
  });

  it('throws for out-of-range ID', () => {
    expect(() => xenoEffectIdToStyleId(8)).toThrow();
    expect(() => xenoEffectIdToStyleId(-1)).toThrow();
  });
});

// ─── Per-style output validity ───

const TEST_POSITIONS = [0, 0.25, 0.5, 0.75, 1.0];
const TEST_TIMES = [0, 0.5, 1.0, 2.5, 5.0];

describe.each(Object.keys(XENO_STYLE_REGISTRY))('Xeno style: %s', (styleId) => {
  const style = XENO_STYLE_REGISTRY[styleId]();

  it('has non-empty id, name, and description', () => {
    expect(style.id).toBeTruthy();
    expect(style.name).toBeTruthy();
    expect(style.description).toBeTruthy();
  });

  it.each(TEST_POSITIONS)('returns valid RGB at position %f', (pos) => {
    for (const t of TEST_TIMES) {
      const ctx = makeContext({ time: t });
      const color = style.getColor(pos, t, ctx);
      expect(isValidRGB(color)).toBe(true);
      expect(isInRange(color)).toBe(true);
    }
  });
});

// ─── XenoSteadyStyle specifics ───

describe('XenoSteadyStyle', () => {
  it('returns exact baseColor for any position and time', () => {
    const base = { r: 120, g: 50, b: 200 };
    const style = new XenoSteadyStyle();
    const ctx = makeContext({ config: makeTestConfig({ baseColor: base }) });

    for (const pos of TEST_POSITIONS) {
      for (const t of TEST_TIMES) {
        const color = style.getColor(pos, t, ctx);
        expect(color.r).toBe(base.r);
        expect(color.g).toBe(base.g);
        expect(color.b).toBe(base.b);
      }
    }
  });
});

// ─── XenoRainbowStyle specifics ───

describe('XenoRainbowStyle', () => {
  it('ignores baseColor — same output regardless of base', () => {
    const style = new XenoRainbowStyle();
    const ctx1 = makeContext({
      time: 1.0,
      config: makeTestConfig({ baseColor: { r: 255, g: 0, b: 0 } }),
    });
    const ctx2 = makeContext({
      time: 1.0,
      config: makeTestConfig({ baseColor: { r: 0, g: 0, b: 255 } }),
    });

    for (const pos of TEST_POSITIONS) {
      const c1 = style.getColor(pos, 1.0, ctx1);
      const c2 = style.getColor(pos, 1.0, ctx2);
      expect(c1.r).toBeCloseTo(c2.r, 5);
      expect(c1.g).toBeCloseTo(c2.g, 5);
      expect(c1.b).toBeCloseTo(c2.b, 5);
    }
  });

  it('produces a full-spectrum range across positions', () => {
    const style = new XenoRainbowStyle();
    const ctx = makeContext({ time: 0 });
    const colors: RGB[] = [];
    for (let p = 0; p <= 1; p += 0.1) {
      colors.push(style.getColor(p, 0, ctx));
    }

    // Should have colors where different channels dominate — not
    // all the same hue.
    const hasHighR = colors.some((c) => c.r > 200);
    const hasHighG = colors.some((c) => c.g > 200);
    const hasHighB = colors.some((c) => c.b > 200);
    expect(hasHighR && hasHighG && hasHighB).toBe(true);
  });
});

// ─── XenoPulseStyle specifics ───

describe('XenoPulseStyle', () => {
  it('brightness varies over time (t=0 vs t=0.45 of period)', () => {
    const style = new XenoPulseStyle();
    const base = { r: 200, g: 200, b: 200 };
    const ctx = makeContext({ config: makeTestConfig({ baseColor: base }) });

    // At t=0, sin(0)=0 → wave=0.5 → mid brightness.
    const c0 = style.getColor(0.5, 0, ctx);
    // At t=0.45 s, sin(2*pi*0.45/1.8) = sin(pi/2) = 1 → wave=1 → max brightness.
    const c1 = style.getColor(0.5, 0.45, ctx);
    // At t=0.9 s, sin(pi) = 0 → wave=0.5 → mid brightness (same as t=0).
    const c2 = style.getColor(0.5, 0.9, ctx);

    // Peak should be brighter than trough.
    expect(c1.r).toBeGreaterThan(c0.r);
    // Minimum should be dimmer than peak.
    expect(c2.r).toBeLessThan(c1.r);
  });

  it('minimum brightness is approximately 40%', () => {
    const style = new XenoPulseStyle();
    const base = { r: 200, g: 200, b: 200 };
    const ctx = makeContext({ config: makeTestConfig({ baseColor: base }) });

    // At t = 1.35 s, sin(2*pi*1.35/1.8) = sin(3*pi/2) = -1 → wave=0 → min brightness.
    const cMin = style.getColor(0.5, 1.35, ctx);
    // Min bright is 0.4, so r should be ~80.
    expect(cMin.r).toBeCloseTo(base.r * 0.4, 0);
  });

  it('whole blade pulses uniformly (same brightness at all positions)', () => {
    const style = new XenoPulseStyle();
    const ctx = makeContext();
    const t = 0.7;

    const c0 = style.getColor(0, t, ctx);
    const cMid = style.getColor(0.5, t, ctx);
    const cEnd = style.getColor(1.0, t, ctx);

    expect(c0.r).toBeCloseTo(cMid.r, 5);
    expect(c0.r).toBeCloseTo(cEnd.r, 5);
  });
});

// ─── XenoFlashingStyle specifics ───

describe('XenoFlashingStyle', () => {
  it('alternates between bright and dim phases', () => {
    const style = new XenoFlashingStyle();
    const base = { r: 200, g: 100, b: 50 };
    const ctx = makeContext({ config: makeTestConfig({ baseColor: base }) });

    // Sample at many time points across one full cycle (~0.222 s at 4.5 Hz).
    const period = 1 / 4.5;
    const brightnesses: number[] = [];
    for (let t = 0; t < period; t += period / 20) {
      const c = style.getColor(0.5, t, ctx);
      brightnesses.push(c.r);
    }

    const maxBright = Math.max(...brightnesses);
    const minBright = Math.min(...brightnesses);

    // Max should be at full base color.
    expect(maxBright).toBeCloseTo(base.r, 0);
    // Min should be ~5% of base.
    expect(minBright).toBeCloseTo(base.r * 0.05, 1);
  });

  it('dim phase is not fully black', () => {
    const style = new XenoFlashingStyle();
    const base = { r: 200, g: 200, b: 200 };
    const ctx = makeContext({ config: makeTestConfig({ baseColor: base }) });

    // At any time during the dim phase the LED should be slightly visible.
    // sin(pi * 3/2) = -1 → "off" phase.
    const tDim = 3 / (4 * 4.5); // 3/(4*freq) puts us at the -1 peak of the sine.
    const c = style.getColor(0.5, tDim, ctx);
    expect(c.r).toBeGreaterThan(0);
    expect(c.g).toBeGreaterThan(0);
    expect(c.b).toBeGreaterThan(0);
  });
});
