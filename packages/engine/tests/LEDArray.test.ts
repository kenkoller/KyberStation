import { describe, it, expect } from 'vitest';
import {
  LEDArray,
  lerpColor,
  blendAdd,
  blendMultiply,
  blendScreen,
  clampColor,
  hslToRgb,
} from '../src/LEDArray';
import type { RGB } from '../src/types';

describe('LEDArray', () => {
  describe('setPixel / getPixel round-trip', () => {
    it('stores and retrieves exact values', () => {
      const leds = new LEDArray(8);
      leds.setPixel(0, 10, 20, 30);
      expect(leds.getPixel(0)).toEqual({ r: 10, g: 20, b: 30 });
    });

    it('stores and retrieves via setPixelRGB', () => {
      const leds = new LEDArray(4);
      const color: RGB = { r: 100, g: 150, b: 200 };
      leds.setPixelRGB(2, color);
      expect(leds.getPixel(2)).toEqual({ r: 100, g: 150, b: 200 });
    });

    it('individual channel accessors match getPixel', () => {
      const leds = new LEDArray(4);
      leds.setPixel(1, 50, 100, 200);
      expect(leds.getR(1)).toBe(50);
      expect(leds.getG(1)).toBe(100);
      expect(leds.getB(1)).toBe(200);
    });

    it('works at last valid index', () => {
      const leds = new LEDArray(10);
      leds.setPixel(9, 255, 128, 0);
      expect(leds.getPixel(9)).toEqual({ r: 255, g: 128, b: 0 });
    });
  });

  describe('fill()', () => {
    it('sets all LEDs to the given color', () => {
      const leds = new LEDArray(16);
      leds.fill(100, 200, 50);
      for (let i = 0; i < 16; i++) {
        expect(leds.getPixel(i)).toEqual({ r: 100, g: 200, b: 50 });
      }
    });
  });

  describe('fillRange()', () => {
    it('only affects the specified range', () => {
      const leds = new LEDArray(10);
      leds.fill(0, 0, 0);
      leds.fillRange(3, 6, 255, 128, 64);

      // Before range: black
      for (let i = 0; i < 3; i++) {
        expect(leds.getPixel(i)).toEqual({ r: 0, g: 0, b: 0 });
      }
      // In range: filled color
      for (let i = 3; i <= 6; i++) {
        expect(leds.getPixel(i)).toEqual({ r: 255, g: 128, b: 64 });
      }
      // After range: black
      for (let i = 7; i < 10; i++) {
        expect(leds.getPixel(i)).toEqual({ r: 0, g: 0, b: 0 });
      }
    });

    it('clamps to array bounds when end exceeds count', () => {
      const leds = new LEDArray(4);
      // Should not throw even if end > count
      leds.fillRange(2, 100, 128, 64, 32);
      expect(leds.getPixel(2)).toEqual({ r: 128, g: 64, b: 32 });
      expect(leds.getPixel(3)).toEqual({ r: 128, g: 64, b: 32 });
    });
  });

  describe('clear()', () => {
    it('zeros the entire buffer', () => {
      const leds = new LEDArray(8);
      leds.fill(255, 255, 255);
      leds.clear();
      for (let i = 0; i < 8; i++) {
        expect(leds.getPixel(i)).toEqual({ r: 0, g: 0, b: 0 });
      }
    });

    it('results in a zero Uint8Array', () => {
      const leds = new LEDArray(4);
      leds.fill(100, 100, 100);
      leds.clear();
      for (let j = 0; j < leds.buffer.length; j++) {
        expect(leds.buffer[j]).toBe(0);
      }
    });
  });

  describe('applyMask()', () => {
    it('scales colors by mask values', () => {
      const leds = new LEDArray(4);
      leds.fill(200, 100, 50);

      const mask = new Float32Array([1.0, 0.5, 0.0, 0.25]);
      leds.applyMask(mask);

      expect(leds.getPixel(0)).toEqual({ r: 200, g: 100, b: 50 }); // 1.0 = unchanged
      expect(leds.getPixel(1)).toEqual({ r: 100, g: 50, b: 25 }); // 0.5 = halved
      expect(leds.getPixel(2)).toEqual({ r: 0, g: 0, b: 0 }); // 0.0 = black
      expect(leds.getPixel(3)).toEqual({ r: 50, g: 25, b: 12 }); // 0.25 = quartered (truncated)
    });
  });

  describe('clamping', () => {
    it('clamps values above 255 to 255', () => {
      const leds = new LEDArray(2);
      leds.setPixel(0, 300, 999, 256);
      expect(leds.getPixel(0)).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('clamps values below 0 to 0', () => {
      const leds = new LEDArray(2);
      leds.setPixel(0, -10, -1, -100);
      expect(leds.getPixel(0)).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('truncates fractional values to integers', () => {
      const leds = new LEDArray(2);
      leds.setPixel(0, 100.7, 50.3, 200.9);
      const pixel = leds.getPixel(0);
      expect(Number.isInteger(pixel.r)).toBe(true);
      expect(Number.isInteger(pixel.g)).toBe(true);
      expect(Number.isInteger(pixel.b)).toBe(true);
    });
  });

  describe('copyFrom()', () => {
    it('copies the buffer from another LEDArray', () => {
      const src = new LEDArray(4);
      src.fill(42, 84, 126);

      const dst = new LEDArray(4);
      dst.copyFrom(src);

      for (let i = 0; i < 4; i++) {
        expect(dst.getPixel(i)).toEqual({ r: 42, g: 84, b: 126 });
      }
    });
  });
});

// ─── Color utility functions ───

describe('lerpColor', () => {
  it('returns first color at t=0', () => {
    const c1: RGB = { r: 0, g: 0, b: 0 };
    const c2: RGB = { r: 255, g: 255, b: 255 };
    const result = lerpColor(c1, c2, 0);
    expect(result.r).toBeCloseTo(0, 1);
    expect(result.g).toBeCloseTo(0, 1);
    expect(result.b).toBeCloseTo(0, 1);
  });

  it('returns second color at t=1', () => {
    const c1: RGB = { r: 0, g: 0, b: 0 };
    const c2: RGB = { r: 255, g: 255, b: 255 };
    const result = lerpColor(c1, c2, 1);
    expect(result.r).toBeCloseTo(255, 1);
    expect(result.g).toBeCloseTo(255, 1);
    expect(result.b).toBeCloseTo(255, 1);
  });

  it('returns midpoint at t=0.5', () => {
    const c1: RGB = { r: 0, g: 100, b: 200 };
    const c2: RGB = { r: 100, g: 200, b: 0 };
    const result = lerpColor(c1, c2, 0.5);
    expect(result.r).toBeCloseTo(50, 1);
    expect(result.g).toBeCloseTo(150, 1);
    expect(result.b).toBeCloseTo(100, 1);
  });

  it('clamps t to [0, 1]', () => {
    const c1: RGB = { r: 100, g: 100, b: 100 };
    const c2: RGB = { r: 200, g: 200, b: 200 };
    const below = lerpColor(c1, c2, -0.5);
    const above = lerpColor(c1, c2, 1.5);
    expect(below).toEqual(lerpColor(c1, c2, 0));
    expect(above).toEqual(lerpColor(c1, c2, 1));
  });
});

describe('blendAdd', () => {
  it('adds colors with strength 1', () => {
    const base: RGB = { r: 100, g: 100, b: 100 };
    const overlay: RGB = { r: 50, g: 80, b: 120 };
    const result = blendAdd(base, overlay);
    expect(result.r).toBeCloseTo(150, 1);
    expect(result.g).toBeCloseTo(180, 1);
    expect(result.b).toBeCloseTo(220, 1);
  });

  it('caps at 255', () => {
    const base: RGB = { r: 200, g: 200, b: 200 };
    const overlay: RGB = { r: 200, g: 200, b: 200 };
    const result = blendAdd(base, overlay);
    expect(result.r).toBe(255);
    expect(result.g).toBe(255);
    expect(result.b).toBe(255);
  });

  it('respects strength parameter', () => {
    const base: RGB = { r: 100, g: 100, b: 100 };
    const overlay: RGB = { r: 100, g: 100, b: 100 };
    const result = blendAdd(base, overlay, 0.5);
    expect(result.r).toBeCloseTo(150, 1);
    expect(result.g).toBeCloseTo(150, 1);
    expect(result.b).toBeCloseTo(150, 1);
  });
});

describe('blendMultiply', () => {
  it('produces expected multiply results', () => {
    const base: RGB = { r: 255, g: 128, b: 0 };
    const overlay: RGB = { r: 255, g: 128, b: 255 };
    const result = blendMultiply(base, overlay);
    expect(result.r).toBeCloseTo(255, 0); // 255*255/255
    expect(result.g).toBeCloseTo(64.25, 0); // 128*128/255
    expect(result.b).toBeCloseTo(0, 0); // 0*255/255
  });

  it('black * anything = black', () => {
    const result = blendMultiply({ r: 0, g: 0, b: 0 }, { r: 255, g: 200, b: 100 });
    expect(result.r).toBeCloseTo(0, 1);
    expect(result.g).toBeCloseTo(0, 1);
    expect(result.b).toBeCloseTo(0, 1);
  });

  it('white * color = color', () => {
    const color: RGB = { r: 100, g: 150, b: 200 };
    const result = blendMultiply({ r: 255, g: 255, b: 255 }, color);
    expect(result.r).toBeCloseTo(100, 0);
    expect(result.g).toBeCloseTo(150, 0);
    expect(result.b).toBeCloseTo(200, 0);
  });
});

describe('blendScreen', () => {
  it('produces expected screen results', () => {
    const base: RGB = { r: 100, g: 100, b: 100 };
    const overlay: RGB = { r: 100, g: 100, b: 100 };
    const result = blendScreen(base, overlay);
    // screen: 255 - (155 * 155) / 255 = 255 - 94.12 = 160.88
    expect(result.r).toBeCloseTo(160.88, 0);
    expect(result.g).toBeCloseTo(160.88, 0);
    expect(result.b).toBeCloseTo(160.88, 0);
  });

  it('screen with black returns base', () => {
    const base: RGB = { r: 100, g: 150, b: 200 };
    const result = blendScreen(base, { r: 0, g: 0, b: 0 });
    expect(result.r).toBeCloseTo(100, 0);
    expect(result.g).toBeCloseTo(150, 0);
    expect(result.b).toBeCloseTo(200, 0);
  });

  it('screen with white returns white', () => {
    const base: RGB = { r: 100, g: 150, b: 200 };
    const result = blendScreen(base, { r: 255, g: 255, b: 255 });
    expect(result.r).toBeCloseTo(255, 0);
    expect(result.g).toBeCloseTo(255, 0);
    expect(result.b).toBeCloseTo(255, 0);
  });
});

describe('clampColor', () => {
  it('clamps values to 0-255 integers', () => {
    const result = clampColor({ r: -10, g: 300, b: 128.7 });
    expect(result).toEqual({ r: 0, g: 255, b: 128 });
  });
});

describe('hslToRgb', () => {
  it('converts red (0, 100, 50) correctly', () => {
    const result = hslToRgb(0, 100, 50);
    expect(result.r).toBe(255);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it('converts green (120, 100, 50) correctly', () => {
    const result = hslToRgb(120, 100, 50);
    expect(result.r).toBe(0);
    expect(result.g).toBe(255);
    expect(result.b).toBe(0);
  });

  it('converts blue (240, 100, 50) correctly', () => {
    const result = hslToRgb(240, 100, 50);
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(255);
  });

  it('converts white (0, 0, 100) correctly', () => {
    const result = hslToRgb(0, 0, 100);
    expect(result.r).toBe(255);
    expect(result.g).toBe(255);
    expect(result.b).toBe(255);
  });

  it('converts black (0, 0, 0) correctly', () => {
    const result = hslToRgb(0, 0, 0);
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it('converts gray (0, 0, 50) correctly', () => {
    const result = hslToRgb(0, 0, 50);
    expect(result.r).toBe(128);
    expect(result.g).toBe(128);
    expect(result.b).toBe(128);
  });
});
