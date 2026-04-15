import type { RGB } from './types.js';

// ─── RGB ↔ HSL Conversion ───

export function rgbToHsl(color: RGB): { h: number; s: number; l: number } {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// ─── Color Harmony Functions ───

/** Shift hue by degrees, keeping S and L constant */
function shiftHue(color: RGB, degrees: number): RGB {
  const hsl = rgbToHsl(color);
  return hslToRgb(((hsl.h + degrees) % 360 + 360) % 360, hsl.s, hsl.l);
}

/** Complementary color — hue + 180° */
export function complementary(color: RGB): RGB {
  return shiftHue(color, 180);
}

/** Analogous pair — hue ± angle (default 30°) */
export function analogous(color: RGB, angle: number = 30): [RGB, RGB] {
  return [shiftHue(color, -angle), shiftHue(color, angle)];
}

/** Triadic pair — hue ± 120° */
export function triadic(color: RGB): [RGB, RGB] {
  return [shiftHue(color, 120), shiftHue(color, 240)];
}

/** Split-complementary — hue + 150° and + 210° */
export function splitComplementary(color: RGB): [RGB, RGB] {
  return [shiftHue(color, 150), shiftHue(color, 210)];
}

/** Tetradic (rectangular) — four evenly-spaced colors */
export function tetradic(color: RGB): [RGB, RGB, RGB] {
  return [shiftHue(color, 90), shiftHue(color, 180), shiftHue(color, 270)];
}

// ─── Utility ───

/** Clamp RGB values to 0-255 range */
export function clampRGB(color: RGB): RGB {
  return {
    r: Math.max(0, Math.min(255, Math.round(color.r))),
    g: Math.max(0, Math.min(255, Math.round(color.g))),
    b: Math.max(0, Math.min(255, Math.round(color.b))),
  };
}

/** Mix two colors by ratio (0 = all a, 1 = all b) */
export function mixColors(a: RGB, b: RGB, ratio: number): RGB {
  const t = Math.max(0, Math.min(1, ratio));
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

/** Get all harmony colors for a given type */
export type HarmonyType = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic';

export function getHarmonyColors(color: RGB, type: HarmonyType): RGB[] {
  switch (type) {
    case 'complementary':
      return [complementary(color)];
    case 'analogous':
      return [...analogous(color)];
    case 'triadic':
      return [...triadic(color)];
    case 'split-complementary':
      return [...splitComplementary(color)];
    case 'tetradic':
      return [...tetradic(color)];
  }
}
