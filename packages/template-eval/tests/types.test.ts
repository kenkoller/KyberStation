import { describe, it, expect } from 'vitest';
import {
  PROFFIE_MAX, BLACK, WHITE,
  intToFloat, floatToInt, clamp,
  color16to8, color8to16,
  mixColors, alphaBlend,
  isBlack, colorAlpha,
} from '../src/types.js';

describe('constants', () => {
  it('PROFFIE_MAX is 32768', () => {
    expect(PROFFIE_MAX).toBe(32768);
  });

  it('BLACK is (0,0,0)', () => {
    expect(BLACK).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('WHITE is (255,255,255)', () => {
    expect(WHITE).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe('intToFloat / floatToInt', () => {
  it('converts 0 to 0.0', () => {
    expect(intToFloat(0)).toBe(0);
  });

  it('converts PROFFIE_MAX to 1.0', () => {
    expect(intToFloat(PROFFIE_MAX)).toBe(1);
  });

  it('round-trips through floatToInt', () => {
    expect(floatToInt(intToFloat(16384))).toBe(16384);
  });
});

describe('clamp', () => {
  it('passes through in-range values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps below min', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('clamps above max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('color16to8 / color8to16', () => {
  it('converts full white correctly', () => {
    expect(color16to8({ r: 65535, g: 65535, b: 65535 })).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('converts black correctly', () => {
    expect(color16to8({ r: 0, g: 0, b: 0 })).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('round-trips approximately', () => {
    const c8 = { r: 128, g: 64, b: 200 };
    const c16 = color8to16(c8);
    const back = color16to8(c16);
    expect(back.r).toBe(128);
    expect(back.g).toBe(64);
    expect(back.b).toBe(200);
  });
});

describe('mixColors', () => {
  it('f=0 returns first color', () => {
    expect(mixColors({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }, 0))
      .toEqual({ r: 255, g: 0, b: 0 });
  });

  it('f=PROFFIE_MAX returns second color', () => {
    expect(mixColors({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }, PROFFIE_MAX))
      .toEqual({ r: 0, g: 0, b: 255 });
  });

  it('f=16384 blends evenly', () => {
    const mixed = mixColors({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 16384);
    expect(mixed.r).toBeGreaterThan(100);
    expect(mixed.r).toBeLessThan(155);
  });
});

describe('alphaBlend', () => {
  it('alpha=0 returns base', () => {
    expect(alphaBlend({ r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }, 0))
      .toEqual({ r: 255, g: 0, b: 0 });
  });

  it('alpha=255 returns layer', () => {
    expect(alphaBlend({ r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }, 255))
      .toEqual({ r: 0, g: 255, b: 0 });
  });
});

describe('isBlack', () => {
  it('true for BLACK', () => {
    expect(isBlack(BLACK)).toBe(true);
  });

  it('false for non-black', () => {
    expect(isBlack({ r: 1, g: 0, b: 0 })).toBe(false);
  });
});

describe('colorAlpha', () => {
  it('returns max channel', () => {
    expect(colorAlpha({ r: 50, g: 200, b: 100 })).toBe(200);
  });

  it('returns 0 for black', () => {
    expect(colorAlpha(BLACK)).toBe(0);
  });
});
