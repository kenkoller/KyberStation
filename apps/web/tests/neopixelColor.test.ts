// ─── Neopixel Colour Preview Tests ───
//
// Pure-function tests for the sRGB → on-blade preview conversion. These
// aren't colour-accuracy assertions (the conversion is a perceptual
// approximation, not a spectrally-correct model); they're contract tests
// that catch regressions in the expected direction of each correction.

import { describe, it, expect } from 'vitest';
import {
  srgbToNeopixelPreview,
  dimLinear,
  rgbToHex,
} from '../lib/neopixelColor';

describe('rgbToHex', () => {
  it('formats zero-padded lowercase hex', () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
    expect(rgbToHex({ r: 10, g: 20, b: 255 })).toBe('#0a14ff');
  });

  it('clamps out-of-range inputs', () => {
    expect(rgbToHex({ r: -10, g: 0, b: 0 })).toBe('#000000');
    expect(rgbToHex({ r: 300, g: 0, b: 0 })).toBe('#ff0000');
  });
});

describe('srgbToNeopixelPreview', () => {
  it('pure black → pure black (no correction applies at zero)', () => {
    expect(srgbToNeopixelPreview({ r: 0, g: 0, b: 0 })).toEqual({
      r: 0,
      g: 0,
      b: 0,
    });
  });

  it('pure white stays near-white but shifts slightly warmer', () => {
    const out = srgbToNeopixelPreview({ r: 255, g: 255, b: 255 });
    // Red should survive the warm-bias matrix.
    expect(out.r).toBeGreaterThanOrEqual(240);
    // Blue should be slightly reduced (emission bias + diffusion blend).
    expect(out.b).toBeLessThan(out.r);
  });

  it('pure red stays recognisably red', () => {
    const out = srgbToNeopixelPreview({ r: 255, g: 0, b: 0 });
    // Red channel dominates; subtle warming bleeds 25% of max green (that's
    // the characteristic "WS2812b red is a bit orange" effect users see).
    expect(out.r).toBeGreaterThan(200);
    expect(out.g).toBeLessThan(90);
    expect(out.g).toBeLessThan(out.r / 2);
    expect(out.b).toBeLessThan(50);
  });

  it('pure blue is shortened but still blue-dominant', () => {
    const out = srgbToNeopixelPreview({ r: 0, g: 0, b: 255 });
    // Blue channel gets reduced by the 0.92 matrix coefficient and diffusion.
    expect(out.b).toBeGreaterThan(170);
    expect(out.b).toBeLessThan(255);
    expect(out.r).toBeLessThan(out.b);
  });

  it('mid-grey demonstrates gamma-induced darkening relative to linear scale', () => {
    // sRGB #808080 is gamma-encoded; its linear intensity is ~21%. We don't
    // assert exact numbers, just that the on-blade preview isn't brighter
    // than the picker swatch (common user surprise).
    const src = { r: 128, g: 128, b: 128 };
    const out = srgbToNeopixelPreview(src);
    // Small diffusion blend keeps the value close; never brighter.
    expect(out.r).toBeLessThanOrEqual(src.r + 2);
  });
});

describe('dimLinear', () => {
  it('dimming pure white by 0.5 gives linear-correct mid-value', () => {
    // Linear 0.5 sRGB-encoded → ~188, not 128.
    const out = dimLinear({ r: 255, g: 255, b: 255 }, 0.5);
    expect(out.r).toBeGreaterThan(180);
    expect(out.r).toBeLessThan(195);
  });

  it('dimming by 0 returns black', () => {
    expect(dimLinear({ r: 255, g: 128, b: 64 }, 0)).toEqual({
      r: 0,
      g: 0,
      b: 0,
    });
  });

  it('dimming by 1 is near-identity', () => {
    const src = { r: 200, g: 100, b: 50 };
    const out = dimLinear(src, 1);
    // sRGB → linear → sRGB round-trip is exact for 8-bit inputs.
    expect(out).toEqual(src);
  });
});
