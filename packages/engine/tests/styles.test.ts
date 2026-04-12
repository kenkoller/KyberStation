import { describe, it, expect } from 'vitest';
import { createStyle } from '../src/styles/index';
import type { BladeConfig, StyleContext, RGB } from '../src/types';

function makeTestConfig(): BladeConfig {
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
  };
}

function makeStyleContext(config?: BladeConfig): StyleContext {
  const cfg = config ?? makeTestConfig();
  return {
    time: 0,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1.0,
    config: cfg,
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

function isReasonableRange(color: RGB): boolean {
  // Allow slight float imprecision; values should be roughly in [0, 255]
  return (
    color.r >= -1 && color.r <= 256 &&
    color.g >= -1 && color.g <= 256 &&
    color.b >= -1 && color.b <= 256
  );
}

const STYLE_IDS = [
  'stable',
  'unstable',
  'fire',
  'pulse',
  'rotoscope',
  'gradient',
  'photon',
  'plasma',
  'crystalShatter',
  'aurora',
  'cinder',
  'prism',
] as const;

const TEST_POSITIONS = [0, 0.5, 1.0];
const TEST_TIMES = [0, 1.0, 5.0];

describe('createStyle', () => {
  it('throws for unknown style ID', () => {
    expect(() => createStyle('nonexistent')).toThrow('Unknown style ID');
  });
});

describe.each(STYLE_IDS)('Style: %s', (styleId) => {
  it('creates successfully', () => {
    const style = createStyle(styleId);
    expect(style).toBeDefined();
    expect(style.id).toBe(styleId);
    expect(typeof style.name).toBe('string');
    expect(typeof style.description).toBe('string');
  });

  it.each(TEST_POSITIONS)('getColor returns valid RGB at position %s', (position) => {
    const style = createStyle(styleId);
    const context = makeStyleContext();
    const color = style.getColor(position, 0, context);

    expect(color).toBeDefined();
    expect(color).toHaveProperty('r');
    expect(color).toHaveProperty('g');
    expect(color).toHaveProperty('b');
    expect(isValidRGB(color)).toBe(true);
  });

  it.each(TEST_TIMES)('getColor returns finite numbers at time %s', (time) => {
    const style = createStyle(styleId);
    const context = makeStyleContext();
    context.time = time;
    const color = style.getColor(0.5, time, context);

    expect(Number.isFinite(color.r)).toBe(true);
    expect(Number.isFinite(color.g)).toBe(true);
    expect(Number.isFinite(color.b)).toBe(true);
  });

  it('values are in reasonable range across positions and times', () => {
    const style = createStyle(styleId);
    const context = makeStyleContext();

    for (const pos of TEST_POSITIONS) {
      for (const time of TEST_TIMES) {
        context.time = time;
        const color = style.getColor(pos, time, context);
        expect(isReasonableRange(color)).toBe(true);
      }
    }
  });

  it('does not produce NaN or Infinity', () => {
    const style = createStyle(styleId);
    const context = makeStyleContext();

    for (const pos of TEST_POSITIONS) {
      for (const time of TEST_TIMES) {
        context.time = time;
        const color = style.getColor(pos, time, context);
        expect(Number.isNaN(color.r)).toBe(false);
        expect(Number.isNaN(color.g)).toBe(false);
        expect(Number.isNaN(color.b)).toBe(false);
        expect(Number.isFinite(color.r)).toBe(true);
        expect(Number.isFinite(color.g)).toBe(true);
        expect(Number.isFinite(color.b)).toBe(true);
      }
    }
  });

  it('works with non-zero swing speed and blade angle', () => {
    const style = createStyle(styleId);
    const context = makeStyleContext();
    context.swingSpeed = 0.8;
    context.bladeAngle = 0.5;
    context.twistAngle = -0.3;
    context.soundLevel = 0.6;

    const color = style.getColor(0.5, 2.0, context);
    expect(isValidRGB(color)).toBe(true);
  });
});
