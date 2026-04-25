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
 *
 * W2 bump (2026-04-22): 0.90 → 0.98. The extra 8% of container width
 * makes the saber fill its frame and pushes the blade tip close to the
 * right edge — the prior margin felt cramped, especially when the panel
 * was narrow.
 */
export const AUTO_FIT_FILL = 0.98;
/** Tail margin (past blade tip) BladeCanvas reserves in design-space. */
export const BLADE_TAIL_MARGIN_DS = 40;
/**
 * Legacy design-space left-pull (pre-1.5f). Phase 1.5f replaced the
 * fixed auto-fit pull with a user-draggable vertical divider —
 * `bladeStartFrac` in uiStore — that defines Point A as a fraction
 * of container width. Left as an export at 0 so external callers
 * that still import the symbol compile, but NEW code should read
 * `bladeStartFrac` from uiStore and feed it into
 * `computeBladeRenderMetrics` via the `bladeStartFrac` option.
 *
 * @deprecated Use `bladeStartFrac` (uiStore) + computeBladeRenderMetrics({ bladeStartFrac }).
 */
export const AUTO_FIT_LEFT_PULL_DS = 0;

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
  /**
   * Phase 1.5f: Point A as fraction-of-container-width × 1000 (e.g. 180 →
   * 0.18). Matches `uiStore.bladeStartFrac`. When omitted we fall back to
   * REGION_LIMITS default so callers that haven't been wired up yet get
   * the right-of-hilt position they used to get from AUTO_FIT_LEFT_PULL_DS.
   */
  bladeStartFrac?: number;
}

/**
 * Default value mirrors `REGION_LIMITS.bladeStartFrac.default` in
 * `uiStore.ts`. Kept here (not imported from the store) so this module
 * stays store-agnostic for headless vitest + non-browser callers.
 */
const DEFAULT_BLADE_START_FRAC = 180;

/**
 * Compute the blade's visible pixel rect within a given container width.
 *
 * Phase 1.5f (v0.14.0):
 *   bladeLeftPx  = containerWidthPx * (bladeStartFrac / 1000)
 *   maxBladePx   = containerWidthPx * AUTO_FIT_FILL - bladeLeftPx
 *   bladeWidthPx = maxBladePx * (bladeInches / MAX_BLADE_INCHES)
 *
 * The user-draggable vertical divider in CanvasLayout drives
 * `bladeStartFrac` via uiStore. A 40" blade fills the entire
 * post-divider space; shorter blades render proportionally shorter
 * from the divider rightward. Same math is shared by all three rails
 * (blade, pixel strip, analysis slot) so they align 1:1 on Point A
 * (the divider) and Point B (the blade tip).
 *
 * Pixel-per-LED = bladeWidthPx / ledCount, clamped to at least 0.5 so
 * the downstream `Math.max(cellW - 0.3, 0.5)` render path in the pixel
 * strip stays well-defined even at extreme LED counts.
 */
export function computeBladeRenderMetrics(
  input: ComputeBladeMetricsInput,
): BladeRenderMetrics {
  const { containerWidthPx, ledCount } = input;
  const bladeStartFrac = input.bladeStartFrac ?? DEFAULT_BLADE_START_FRAC;

  const bladeInches = inferBladeInches(ledCount);

  const bladeLeftPx = containerWidthPx * (bladeStartFrac / 1000);
  // Right end of the usable region (container's AUTO_FIT_FILL margin
  // reserves a sliver of breathing room on the far right).
  const usableRightPx = containerWidthPx * AUTO_FIT_FILL;
  const maxBladePx = Math.max(0, usableRightPx - bladeLeftPx);
  const bladeWidthPx = maxBladePx * (bladeInches / MAX_BLADE_INCHES);
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
