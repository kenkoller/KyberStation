// ─── Capsule rasterizer — shared blade pipeline ──────────────────────
//
// Per-pixel walker over the blade capsule's bounding box. Single
// source of truth for the blade silhouette in both the live workbench
// (`apps/web/components/editor/BladeCanvas.tsx`) and the headless GIF
// pipeline (`apps/web/lib/sharePack/bladeRenderHeadless.ts`).
//
// What it does:
//   • Rasterizes a capsule (rectangle + rounded ends) covering the
//     FULL configured blade extent, regardless of ignition / retraction
//     progress. Engine-driven per-LED brightness handles state-based
//     visual length — the tube shape stays put while the lit portion
//     shrinks, matching real polycarbonate diffuser behavior.
//   • Linear-interpolates each pixel between adjacent LEDs (axial
//     diffusion); brighter LEDs ramp smoothly into dimmer neighbors
//     instead of producing visible vertical seams.
//   • Applies a Gaussian-shape α profile from radial offset and lerps
//     between the white-shifted plateau (inner 16%) and raw LED color
//     (outer 40%+).
//
// The renderer-level golden-hash test suite at
// `apps/web/tests/rendererGoldenHash/bladeRenderer.test.ts` pins the
// capsule's rasterized output for canonical configs. Any drift in the
// plateau anchors / α profile / linear-interp math will fail the
// snapshot.

import {
  lerpToWhite,
  ledCoreWhiteAmountHeadless as defaultLedCoreWhiteAmount,
} from './colorMath';
import type { LedBufferLike } from './types';

/**
 * Per-LED white-core amount callback. Two variants live in
 * `colorMath.ts`:
 *   • `ledCoreWhiteAmountWorkbench` (smoothstep + exposure boost) —
 *     used by the live workbench, gives blown-out white tube above
 *     mid-brightness.
 *   • `ledCoreWhiteAmountHeadless` (luma-based linear ramp) — used by
 *     the headless GIF / share-card pipeline. The renderer-level
 *     golden-hash tests pin the headless output, so unifying these
 *     two would require regenerating snapshots.
 */
export type LedCoreWhiteAmountFn = (
  r: number,
  g: number,
  b: number,
  coreWhiteout: number,
) => number;

/**
 * Capsule-shape blade rasterizer.
 *
 * Hoists per-row work out of the per-pixel loop:
 *   - LED color + white-shift amount precomputed once per LED
 *     (collapses ~4×ledCount × pixelCount calls down to 4×ledCount).
 *   - Radial alpha + color blend (white-shifted plateau ↔ raw color)
 *     computed per pixel from |dy|/radius (or Euclidean distance in
 *     the end caps).
 *
 * Reference invariants (also documented in the headless port + the
 * BladeCanvas inline notes):
 *   • PLATEAU_END = 0.16, COLOR_END = 0.40 — same plateau-then-lerp.
 *   • α profile: (0.0,1.0) → (0.25,0.95) → (0.5,0.7) → (0.7,0.35) →
 *     (0.85,0.10) → (1.0,0.0).
 *   • tipExtension = 0 — true semicircular end cap. Earlier 0.15×radius
 *     extension produced a visibly pointed tip; with 0 the cap is a
 *     clean semicircle ending exactly at the configured blade length.
 *
 * @param offCtx Offscreen 2D context to write into (also accepts
 *   OffscreenCanvasRenderingContext2D for the headless / GIF case).
 * @param leds Random-access LED color reader.
 * @param bladeStartPx LED-strip start in canvas px (Point A).
 * @param bladeLenPx LED-strip length in canvas px.
 * @param bladeYPx Vertical centerline of the capsule.
 * @param coreH Capsule height (= 2 × radius).
 * @param effectiveBri Pre-multiplier on every LED's RGB.
 * @param shimmer Pre-multiplier on every LED's RGB (separate from
 *   `effectiveBri` so callers can vary it per frame for the "alive"
 *   feel).
 * @param coreWhiteout Per-color asymptote for the white-shift plateau.
 * @param cw Total canvas width (clamps the bounding box).
 * @param ch Total canvas height (clamps the bounding box).
 * @param hiltTuck Distance the capsule's left cap extends behind
 *   `bladeStartPx`. Bloom mips still sample the extended region so
 *   the halo bleeds onto the hilt naturally.
 */
export function rasterizeCapsule(
  offCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  leds: LedBufferLike,
  bladeStartPx: number,
  bladeLenPx: number,
  bladeYPx: number,
  coreH: number,
  effectiveBri: number,
  shimmer: number,
  coreWhiteout: number,
  cw: number,
  ch: number,
  hiltTuck: number = 0,
  /**
   * Per-LED white-core amount function. The two pre-built variants
   * live in `colorMath.ts`; passing a different function here lets a
   * caller swap formulas without forking the rasterizer. Defaults to
   * `ledCoreWhiteAmountHeadless` for backwards compatibility — the
   * renderer-level golden-hash test suite pins THAT formula's output.
   */
  ledCoreWhiteAmount: LedCoreWhiteAmountFn = defaultLedCoreWhiteAmount,
): void {
  const radius = coreH * 0.5;
  if (radius < 1 || bladeLenPx < 1) return;
  const ledCount = leds.count;
  if (ledCount < 1) return;

  // Capsule axes: rectangle middle spans [emitterX + r, tipX - r]; the
  // left + right end caps are half-disks centered at those axis endpoints.
  // `hiltTuck` shifts emitterX leftward so the rounded LEFT cap sits
  // behind the hilt (invisible to the user but bloom mips still see it
  // and produce halo into the hilt area). LED axial mapping stays
  // anchored at bladeStartPx so the leftward-extended pixels read the
  // first LED's color (and the LED strip itself still spans bladeStartPx
  // → bladeStartPx+bladeLenPx exactly).
  //
  // Tip extension removed — the capsule end cap is now a true semicircle
  // ending exactly at the configured blade length. The prior 0.15×radius
  // extension was meant to compensate for the α feather, but in practice
  // it produced a visibly pointed tip shape (the extension shifted the
  // geometry past the LED endpoint, and the feather tapered it to a
  // narrow point rather than a round cap). With tipExtension = 0 the
  // capsule's rightCapAxisX = tipX - radius creates a clean semicircular
  // end cap. Bloom past the rim still extends naturally beyond the
  // configured length as halo.
  const tipExtension = 0;
  const emitterX = bladeStartPx - hiltTuck;
  const tipX = bladeStartPx + bladeLenPx + tipExtension;
  const leftCapAxisX = emitterX + radius;
  const rightCapAxisX = tipX - radius;

  // Bounding box clamped to the offscreen extent.
  const minX = Math.max(0, Math.floor(emitterX));
  const maxX = Math.min(cw, Math.ceil(tipX));
  const minY = Math.max(0, Math.floor(bladeYPx - radius));
  const maxY = Math.min(ch, Math.ceil(bladeYPx + radius));
  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 1 || height < 1) return;

  // Per-LED color + white-shift cache. Function-call overhead inside the
  // pixel loop is meaningful at 60 FPS; precomputing once per LED collapses
  // ~4×ledCount × pixelCount calls down to 4×ledCount.
  const ledR = new Float32Array(ledCount);
  const ledG = new Float32Array(ledCount);
  const ledB = new Float32Array(ledCount);
  const ledWhite = new Float32Array(ledCount);
  for (let i = 0; i < ledCount; i++) {
    const r = leds.getR(i) * effectiveBri * shimmer;
    const g = leds.getG(i) * effectiveBri * shimmer;
    const b = leds.getB(i) * effectiveBri * shimmer;
    ledR[i] = r;
    ledG[i] = g;
    ledB[i] = b;
    ledWhite[i] = ledCoreWhiteAmount(r, g, b, coreWhiteout);
  }

  const imgData = offCtx.getImageData(minX, minY, width, height);
  const data = imgData.data;

  // Plateau / color-transition constants — match the body's earlier
  // GAUSS_BAND_STOPS profile so the visual envelope is preserved.
  const PLATEAU_END = 0.16;
  const COLOR_END = 0.40;
  const COLOR_LERP_DENOM = COLOR_END - PLATEAU_END;
  const radiusInv = 1 / radius;
  const bladeLenInv = 1 / bladeLenPx;

  const ledSpan = ledCount - 1;
  for (let px = minX; px < maxX; px++) {
    // Axial t → fractional LED position. Anchored at bladeStartPx so the
    // LED strip spans bladeStartPx → bladeStartPx+bladeLenPx exactly. Pixels
    // in the hilt-tuck region (px < bladeStartPx) clamp to t=0 (first LED).
    //
    // LINEAR INTERPOLATION between adjacent LEDs replaces the prior hard
    // `floor(t * ledCount)` quantization. Without this, all ~6 pixels
    // within one LED's column share identical color and the next LED's
    // column snaps to a different color — visible as hard vertical seams
    // wherever adjacent LEDs differ in brightness (Stripes, Pulse, Clash
    // hot spots, retraction frontiers). With interp, each pixel samples a
    // weighted blend of its two nearest LEDs proportional to its position
    // — a bright→dim transition spans the full LED-width as a smooth
    // ramp instead of a step. This is the axial component of polycarbonate
    // diffusion: light from each LED bleeds into its neighbors along the
    // tube length (the radial component is already handled by Gaussian-α).
    let t = (px - bladeStartPx) * bladeLenInv;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const f = t * ledSpan; // 0..(ledCount-1)
    let i0 = f | 0;
    if (i0 >= ledSpan) i0 = ledSpan;
    const i1 = i0 < ledSpan ? i0 + 1 : ledSpan;
    const wHi = f - i0;
    const wLo = 1 - wHi;

    const r = ledR[i0] * wLo + ledR[i1] * wHi;
    const g = ledG[i0] * wLo + ledG[i1] * wHi;
    const b = ledB[i0] * wLo + ledB[i1] * wHi;
    if (r + g + b < 0.5) continue; // unlit column → transparent

    const wWhite = ledWhite[i0] * wLo + ledWhite[i1] * wHi;
    const cR = lerpToWhite(r, wWhite);
    const cG = lerpToWhite(g, wWhite);
    const cB = lerpToWhite(b, wWhite);

    // Compute the x-component of the distance-from-axis squared once per
    // column. In the rectangle middle this is 0; in the end caps it's the
    // squared horizontal offset from the cap's axis center.
    let dxAxis: number;
    if (px < leftCapAxisX) dxAxis = px - leftCapAxisX;
    else if (px > rightCapAxisX) dxAxis = px - rightCapAxisX;
    else dxAxis = 0;
    const dxSq = dxAxis * dxAxis;

    for (let py = minY; py < maxY; py++) {
      const dy = py - bladeYPx;
      const distSq = dxSq + dy * dy;
      // Skip pixels outside the capsule shape.
      if (distSq > radius * radius) continue;

      const dist = Math.sqrt(distSq);
      const nr = dist * radiusInv; // ∈ [0, 1]

      // Feathered Gaussian-shape α profile. Replaces the prior wide-
      // plateau-then-sharp-drop curve. With the additive Pass 12 blend
      // mode, a hard α=1.0 plateau created a visible "body sitting on
      // top of halo" seam at the α-decay boundary; this smoother curve
      // has no plateau — α descends gently from peak to 0 — so the body
      // and the bloom halo are continuous expressions of the same
      // emission.
      //
      // Anchors: (0.0, 1.0) → (0.25, 0.95) → (0.5, 0.70) → (0.7, 0.35)
      //          → (0.85, 0.10) → (1.0, 0.00). Visible-bright (α > ~0.5)
      // ends around radial 0.6; combined with the tip-axial extension,
      // visible-bright reaches the LED endpoint position exactly.
      let alpha: number;
      if (nr <= 0.25) alpha = 1.00 - nr * 0.20;                       // → (0.25, 0.95)
      else if (nr <= 0.50) alpha = 0.95 - (nr - 0.25) * 1.00;          // → (0.50, 0.70)
      else if (nr <= 0.70) alpha = 0.70 - (nr - 0.50) * 1.75;          // → (0.70, 0.35)
      else if (nr <= 0.85) alpha = 0.35 - (nr - 0.70) * (5 / 3);       // → (0.85, 0.10)
      else alpha = 0.10 - (nr - 0.85) * (2 / 3);                       // → (1.00, 0.00)

      // Color: pure white-shifted plateau in the inner 16%, raw LED color
      // past the 40% mark, smooth lerp in between. Mirrors the body's
      // 3-stop white plateau + 25%-wide color transition.
      let outR: number, outG: number, outB: number;
      if (nr <= PLATEAU_END) {
        outR = cR; outG = cG; outB = cB;
      } else if (nr >= COLOR_END) {
        outR = r; outG = g; outB = b;
      } else {
        const lt = (nr - PLATEAU_END) / COLOR_LERP_DENOM;
        outR = cR + (r - cR) * lt;
        outG = cG + (g - cG) * lt;
        outB = cB + (b - cB) * lt;
      }

      const idx = ((py - minY) * width + (px - minX)) * 4;
      data[idx] = outR;
      data[idx + 1] = outG;
      data[idx + 2] = outB;
      data[idx + 3] = (alpha * 255) | 0;
    }
  }

  offCtx.putImageData(imgData, minX, minY);
}
