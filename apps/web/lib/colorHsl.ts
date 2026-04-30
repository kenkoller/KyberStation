// ─── colorHsl — shared RGB ↔ HSL conversion ─────────────────────────────────
//
// Canonical home for color-space conversions used across the editor.
// `rgbToHsl` re-exports from namingMath where it already lives (the
// preset name generator depends on it). `hslToRgb` is the inverse —
// previously private to Randomizer.tsx; lifted here so the mobile
// QuickControls can read/write Hue + Sat sliders without duplicating
// the math.
//
// Both functions are pure; HSL angles are in degrees [0, 360),
// percentages [0, 100].

import { rgbToHsl } from '@/lib/namingMath';
export { rgbToHsl } from '@/lib/namingMath';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Convert an HSL triple to an 8-bit RGB triple.
 * h: degrees 0..360, s/l: percent 0..100.
 * Output: r/g/b integers 0..255.
 */
export function hslToRgb(h: number, s: number, l: number): RGB {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let rp = 0,
    gp = 0,
    bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
    bp = 0;
  } else if (h < 120) {
    rp = x;
    gp = c;
    bp = 0;
  } else if (h < 180) {
    rp = 0;
    gp = c;
    bp = x;
  } else if (h < 240) {
    rp = 0;
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    gp = 0;
    bp = c;
  } else {
    rp = c;
    gp = 0;
    bp = x;
  }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

/**
 * Round-trip RGB → HSL → RGB convenience for sliders that adjust
 * hue or saturation in isolation. Reading the current color, mutating
 * a single channel, and re-rasterizing is the canonical mobile
 * Quick-Controls flow.
 */
export function adjustColorHsl(
  rgb: RGB,
  patch: Partial<HSL>,
): RGB {
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return hslToRgb(
    patch.h ?? hsl.h,
    patch.s ?? hsl.s,
    patch.l ?? hsl.l,
  );
}
