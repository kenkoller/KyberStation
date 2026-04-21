// ─── Blade Render Metrics — shared geometry for OV2 ─────────────────────────
//
// Sibling visualization panels (pixel strip, RGB line graph) need to draw
// their per-LED content at the same horizontal extent as the blade rendered
// by `BladeCanvas`. Today each sibling panel stretches its per-LED strip
// across the full container width, while `BladeCanvas` renders the blade
// at a fraction of the container width determined by blade inches. The
// mismatch means a 144-LED / 24" blade renders ~55% of container width in
// the canvas but 100% of container width in the pixel strip underneath —
// LED positions don't visually align between the two surfaces.
//
// This module re-exposes the same design-space geometry that `BladeCanvas`
// uses internally (DESIGN_W=1200, BLADE_START=274, BLADE_LEN=830,
// MAX_BLADE_INCHES=40, auto-fit fill ratio 0.90) so sibling panels can
// compute the **same** blade rect without duplicating the math or lifting
// BladeCanvas's internal state.
//
// Pure functions — no React, no DOM. Node-only vitest covers them.

/** Design-space canvas width used by BladeCanvas. */
export const DESIGN_W = 1200;
/** Design-space X where the blade (not the hilt) starts. */
export const BLADE_START = 274;
/** Design-space width of a full-length (MAX_BLADE_INCHES) blade. */
export const BLADE_LEN = 830;
/** Blade inches that correspond to BLADE_LEN in design space. */
export const MAX_BLADE_INCHES = 40;
/**
 * BladeCanvas's auto-fit zoom targets `cw * AUTO_FIT_FILL` as the visible
 * extent of the hilt+blade run. Matches `computeFitZoom` in BladeCanvas.
 */
export const AUTO_FIT_FILL = 0.9;
/** Tail margin (past blade tip) BladeCanvas reserves in design-space. */
export const BLADE_TAIL_MARGIN_DS = 40;

/**
 * Map an LED count to the blade length in inches that BladeCanvas would
 * render it as. Mirrors the piecewise ladder in `BladeCanvas.tsx:352` and
 * the `BLADE_LENGTH_PRESETS` ranges in `packages/engine/src/types.ts`.
 *
 * Any LED count ≥ 133 falls in the 40" bucket (the maximum-length preset).
 */
export function inferBladeInches(ledCount: number): number {
  if (ledCount <= 73) return 20;
  if (ledCount <= 88) return 24;
  if (ledCount <= 103) return 28;
  if (ledCount <= 117) return 32;
  if (ledCount <= 132) return 36;
  return 40;
}

export interface BladeRenderMetrics {
  /** Pixel X where the blade (not the hilt) begins within the container. */
  bladeLeftPx: number;
  /** Pixel width of the blade content within the container. */
  bladeWidthPx: number;
  /** Pixel X where the blade tip sits = bladeLeftPx + bladeWidthPx. */
  bladeRightPx: number;
  /** Pixel-per-LED pitch for the current LED count. */
  pixelsPerLed: number;
  /** Blade length in inches (20/24/28/32/36/40). */
  bladeInches: number;
  /** The container width the metrics were computed against. */
  containerWidthPx: number;
}

export interface ComputeBladeMetricsInput {
  containerWidthPx: number;
  ledCount: number;
  /**
   * Manual panX offset that BladeCanvas applies on top of its auto-fit.
   * Defaults to 0 (user hasn't scrolled). The sibling panels ignore panX
   * today — passing 0 here keeps them anchored to the canonical centered
   * position, which is what BladeCanvas's auto-fit produces on first load.
   */
  panX?: number;
}

/**
 * Compute the blade's visible pixel rect within a given container width.
 *
 * Matches BladeCanvas's `computeFitZoom` horizontal branch:
 *   scale = (containerWidthPx * AUTO_FIT_FILL) / bladeExtentDS
 *   bladeExtentDS = BLADE_START + scaledBladeLenDS + BLADE_TAIL_MARGIN_DS
 *
 * The extra `(1 - AUTO_FIT_FILL) / 2` left margin reflects the symmetric
 * empty-space ratio that BladeCanvas's auto-fit produces when panX = 0.
 *
 * Pixel-per-LED = bladeWidthPx / ledCount, clamped to at least 0.5 so
 * the downstream `Math.max(cellW - 0.3, 0.5)` render path in the pixel
 * strip stays well-defined even at extreme LED counts.
 */
export function computeBladeRenderMetrics(
  input: ComputeBladeMetricsInput,
): BladeRenderMetrics {
  const { containerWidthPx, ledCount } = input;
  const panX = input.panX ?? 0;

  const bladeInches = inferBladeInches(ledCount);
  const scaledBladeLenDS = BLADE_LEN * (bladeInches / MAX_BLADE_INCHES);
  const bladeExtentDS = BLADE_START + scaledBladeLenDS + BLADE_TAIL_MARGIN_DS;

  const usableWidthPx = containerWidthPx * AUTO_FIT_FILL;
  const leftMarginPx = (containerWidthPx - usableWidthPx) / 2;
  const scale = usableWidthPx / bladeExtentDS;

  const bladeLeftPx = leftMarginPx + (BLADE_START + panX) * scale;
  const bladeWidthPx = scaledBladeLenDS * scale;
  const pixelsPerLed = ledCount > 0 ? bladeWidthPx / ledCount : 0;

  return {
    bladeLeftPx,
    bladeWidthPx,
    bladeRightPx: bladeLeftPx + bladeWidthPx,
    pixelsPerLed,
    bladeInches,
    containerWidthPx,
  };
}
