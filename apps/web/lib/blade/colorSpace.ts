// ─── Blade color space utilities ───
//
// Gamma-correct compositing requires converting between sRGB (what monitors
// display and picker swatches are authored in) and linear light (what
// physical photons actually add up as). The v0.14.0 bloom rewrite does all
// bloom math in linear space, then tonemaps and converts back to sRGB for
// the final blit to the main canvas.
//
// Two APIs:
//
//   srgbToLinear / linearToSrgb — IEC 61966-2-1 sRGB EOTF. Exact curve,
//   small branch near black. Used by the color picker preview and anywhere
//   else that needs one-shot conversion.
//
//   SRGB_TO_LINEAR_LUT — pre-baked Float32Array(256) for the hot path.
//   The bloom prefilter runs this on ~400k pixels per frame at DPR 2;
//   indexing a LUT is ~3× faster than calling the analytic curve.
//
// Reinhard and ACES filmic tonemapping helpers are included for the bloom
// composite stage. Reinhard is the default (simple, preserves hue); ACES
// is available for A/B testing in Phase 2.
//
// Provenance: `srgbToLinear` / `linearToSrgb` originally lived in
// `apps/web/lib/neopixelColor.ts`. That module now re-exports from here
// so the color picker preview and the blade pipeline share one LUT.

/** sRGB 8-bit integer → linear 0..1. IEC 61966-2-1 sRGB EOTF. */
export function srgbToLinear(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Linear 0..1 → sRGB 8-bit integer. Inverse of srgbToLinear. */
export function linearToSrgb(lin: number): number {
  const l = lin < 0 ? 0 : lin > 1 ? 1 : lin;
  const c = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  const n = Math.round(c * 255);
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

/**
 * Pre-baked LUT: 256 entries mapping sRGB byte → linear 0..1.
 *
 * Hot-path pixel loops should index this directly rather than calling
 * srgbToLinear per pixel. The bloom prefilter ingests ~400k pixels per
 * frame at DPR 2; LUT lookup is measurably faster than Math.pow.
 */
export const SRGB_TO_LINEAR_LUT: Float32Array = (() => {
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) lut[i] = srgbToLinear(i);
  return lut;
})();

/**
 * Reinhard tonemap — `x / (1 + x)`. Keeps the brightest pixels from
 * clipping without crushing saturation. Monotonic, hue-preserving.
 *
 * Input/output: linear 0..∞ (but values >1 compress toward 1).
 */
export function tonemapReinhard(x: number): number {
  return x / (1 + x);
}

/**
 * ACES Filmic tonemap — the curve used by Three.js's `OutputPass`. Richer
 * shoulder roll-off than Reinhard at high luminance. Kept here as an A/B
 * option for the bloom composite; default is Reinhard.
 *
 * Input/output: linear 0..∞ → 0..1.
 */
export function tonemapACES(x: number): number {
  const a = 2.51;
  const b = 0.03;
  const c = 2.43;
  const d = 0.59;
  const e = 0.14;
  const v = (x * (a * x + b)) / (x * (c * x + d) + e);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
