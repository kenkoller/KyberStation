// ─── Neopixel Colour Preview ───
//
// Approximates what a WS2812b / SK6812 LED actually looks like when driven
// with a given sRGB colour value. The user picks a colour on their monitor
// (which is gamma-encoded sRGB) and ProffieOS writes that value directly to
// the LED's 8-bit PWM channel — which is linear. Combined with the LED's
// inherent spectral characteristics and diffusion through a polycarbonate
// blade tube, the on-blade appearance is NOT the same as the picker swatch.
//
// This module converts a source sRGB colour into an "as-on-blade" preview
// colour for display only. It deliberately uses a perceptual approximation
// rather than a spectrally-correct model — accurate enough that users can
// anticipate the on-blade look when tuning colours, without requiring
// display calibration.
//
// The correction layers (applied in order):
//
//   1. sRGB → linear (gamma 2.2)
//      Monitors encode mid-grey (~#808080) at ~22% linear intensity.
//      Neopixels display it AT ~22% — which looks much darker to the eye
//      than the picker swatch suggests. Inverse-gamma-re-encoding surfaces
//      this mismatch.
//
//   2. Neopixel emission bias
//      WS2812b red is slightly warmer than sRGB red; blue is slightly
//      shorter-wavelength than sRGB blue. Net effect on a mixed colour is
//      subtle warming. Approximated as a 3x3 colour matrix.
//
//   3. Diffusion desaturation (polycarbonate tube)
//      Standard blade tubing scatters light ~8-12% off its pure path,
//      which desaturates the perceived colour. Modelled as a simple blend
//      toward luminance-weighted grey.

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const clamp255 = (n: number): number =>
  Math.max(0, Math.min(255, Math.round(n)));

/** sRGB → linear (inverse gamma). Input 0..255, output 0..1. */
function srgbToLinear(c8: number): number {
  const c = c8 / 255;
  // IEC 61966-2-1 sRGB EOTF — the accurate curve near black.
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Linear → sRGB. Input 0..1, output 0..255. */
function linearToSrgb(lin: number): number {
  const l = Math.max(0, Math.min(1, lin));
  const c =
    l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  return clamp255(c * 255);
}

/**
 * Convert a source sRGB colour (as picked in a colour picker) into the
 * colour it will appear as on a real Neopixel blade.
 *
 * Use this for PREVIEW ONLY — do not persist the result to config or
 * round-trip through codegen. The raw sRGB value is always what we send
 * to the LED firmware.
 */
export function srgbToNeopixelPreview(rgb: RGB): RGB {
  // 1. sRGB → linear
  const lr = srgbToLinear(rgb.r);
  const lg = srgbToLinear(rgb.g);
  const lb = srgbToLinear(rgb.b);

  // 2. Neopixel emission bias — subtle warm shift.
  //    Values tuned empirically against WS2812b reference photos; not a
  //    rigorous spectral model. Keeps hue mostly intact with a gentle
  //    yellowing that matches what users report seeing on real blades.
  const r2 = lr * 1.00 + lg * 0.00 + lb * 0.00;
  const g2 = lr * 0.04 + lg * 0.96 + lb * 0.00;
  const b2 = lr * 0.00 + lg * 0.00 + lb * 0.92;

  // 3. Diffusion desaturation through polycarbonate.
  //    Blend 8% toward luminance-weighted grey (Rec. 709 coefficients).
  const lum = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
  const DIFFUSE = 0.08;
  const r3 = r2 * (1 - DIFFUSE) + lum * DIFFUSE;
  const g3 = g2 * (1 - DIFFUSE) + lum * DIFFUSE;
  const b3 = b2 * (1 - DIFFUSE) + lum * DIFFUSE;

  // 4. Linear → sRGB for display
  return {
    r: linearToSrgb(r3),
    g: linearToSrgb(g3),
    b: linearToSrgb(b3),
  };
}

/** Convenience: format an RGB as an #rrggbb hex string. */
export function rgbToHex(rgb: RGB): string {
  return (
    '#' +
    [rgb.r, rgb.g, rgb.b]
      .map((n) => clamp255(n).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Scale an RGB by a 0..1 brightness factor using linear-space math so the
 * perceived dimming is physically correct. Useful for previewing "idle
 * blade" appearance alongside "full brightness".
 */
export function dimLinear(rgb: RGB, factor: number): RGB {
  const f = Math.max(0, Math.min(1, factor));
  return {
    r: linearToSrgb(srgbToLinear(rgb.r) * f),
    g: linearToSrgb(srgbToLinear(rgb.g) * f),
    b: linearToSrgb(srgbToLinear(rgb.b) * f),
  };
}
