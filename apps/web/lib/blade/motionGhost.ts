// ─── Motion-ghost swing trail ────────────────────────────────────────
//
// Persistent ghost buffer (mip-0 dims) that integrates the live bloom
// mip 0 across frames with `(1 - swing × 0.3)` persistence. When the
// user's swing is fast, the previous frames bleed visibly behind the
// current bloom, giving the blade a "trailing streak" on screen. At
// rest the ghost fades to nothing so there's zero visual cost. Gated
// upstream on `!reducedMotion` so vestibular-sensitive users don't
// get streaks.
//
// Originally inlined in `apps/web/components/editor/BladeCanvas.tsx`
// (Phase 3 motion blur — Layer 11a / 11b). Extracted as part of the
// renderer-level golden-hash full-coverage push (post-launch backlog
// "Renderer-level golden-hash full coverage", v0.22.x).
//
// === Lifecycle ===
//   1. Caller owns the ghost canvas (persisted across React renders
//      via a ref). On first call the canvas is freshly allocated;
//      this module resizes it to match `mip0Def.{w,h}` if needed.
//   2. The existing ghost contents are faded in-place via
//      `destination-in` + α=`1 - swing × 0.3`, then the current mip 0
//      is composited on top via `lighter`. That's the temporal
//      integration.
//   3. The integrated ghost is then composited back to the main
//      canvas via `lighter` at α=`min(0.5, swing × 0.5) × bloomAlphaScale`.
//
// Below the swing threshold (≤ 2%) the ghost is cleared — `clearGhost`
// handles this case so the next swing starts from a clean buffer, not
// stale last-swing residual.
//
// === Renderer-level golden-hash coverage ===
// `apps/web/tests/rendererGoldenHash/inlineRenderPaths.test.ts` pins
// the rasterized output of this function at 4 swing speeds (0, 0.3,
// 0.7, 1.0). Any drift in the persistence formula / composite ops /
// α math will fail the snapshot.

/** Below this swing fraction, the trail is invisible and skipped. */
export const MOTION_GHOST_SWING_THRESHOLD = 0.02;

/** Mip-0 buffer dimensions — passed in rather than recomputed. */
export interface MipDimensions {
  w: number;
  h: number;
}

/** Parameters for `applyMotionGhost`. */
export interface MotionGhostParams {
  /**
   * Swing speed, 0–1 (clamped). Drives both the ghost-fade persistence
   * and the composite α. The caller is expected to read this from
   * the motion-sim store and divide by 100.
   */
  swing: number;
  /**
   * Current bloom mip 0 buffer. The ghost integrates this across
   * frames.
   */
  mip0Canvas: HTMLCanvasElement | OffscreenCanvas;
  /**
   * Dimensions of `mip0Canvas`. The ghost buffer is resized in place
   * to match if needed.
   */
  mip0Def: MipDimensions;
  /**
   * Bloom-α scale factor — the live workbench's a11y `reduceBloom`
   * knob (0.4 = 40 %). Default 1.0 (no reduction).
   */
  bloomAlphaScale?: number;
  /**
   * Main canvas width (px) — used as the destination size when the
   * upscaled ghost is composited back to main.
   */
  cw: number;
  /**
   * Main canvas height (px) — used as the destination size when the
   * upscaled ghost is composited back to main.
   */
  ch: number;
  /**
   * Pre-allocated persistent ghost canvas. The caller owns the ref;
   * this module mutates it in place each frame.
   */
  ghost: HTMLCanvasElement;
}

/**
 * Integrate the current bloom mip 0 into the persistent ghost buffer
 * and composite the trail back onto the main canvas.
 *
 * No-op when `swing ≤ MOTION_GHOST_SWING_THRESHOLD`. Callers should
 * branch on the threshold themselves (e.g. to call `clearGhost`
 * instead) since `applyMotionGhost` doesn't know whether the ghost
 * is dirty from a prior swing.
 *
 * Mutates the ghost canvas in place and writes to `ctx`. Does not
 * touch the bloom mip 0 — it only reads it as a draw source.
 */
export function applyMotionGhost(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  params: MotionGhostParams,
): void {
  const { swing, mip0Canvas, mip0Def, cw, ch, ghost } = params;
  const bloomAlphaScale = params.bloomAlphaScale ?? 1;

  if (swing <= MOTION_GHOST_SWING_THRESHOLD) return;

  if (ghost.width !== mip0Def.w || ghost.height !== mip0Def.h) {
    ghost.width = mip0Def.w;
    ghost.height = mip0Def.h;
  }
  const gCtx = ghost.getContext('2d');
  if (!gCtx) return;

  // Fade existing ghost by `swing × 0.3` of its opacity, then paint
  // the current mip 0 on top via `lighter` — the temporal integration.
  gCtx.save();
  gCtx.globalCompositeOperation = 'destination-in';
  gCtx.globalAlpha = Math.max(0, 1 - swing * 0.3);
  gCtx.fillStyle = '#fff';
  gCtx.fillRect(0, 0, mip0Def.w, mip0Def.h);
  gCtx.restore();

  gCtx.save();
  gCtx.globalCompositeOperation = 'lighter';
  gCtx.globalAlpha = 1;
  gCtx.drawImage(mip0Canvas as unknown as CanvasImageSource, 0, 0);
  gCtx.restore();

  // Composite the trail back onto main, upscaled bilinearly.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(0.5, swing * 0.5) * bloomAlphaScale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    ghost as unknown as CanvasImageSource,
    0,
    0,
    mip0Def.w,
    mip0Def.h,
    0,
    0,
    cw,
    ch,
  );
  ctx.restore();
}

/**
 * Clear the ghost buffer so the next swing starts from a clean state.
 * Callers should invoke this on the frame after `swing` drops below
 * `MOTION_GHOST_SWING_THRESHOLD` to avoid stale streaks.
 */
export function clearGhost(ghost: HTMLCanvasElement | null): void {
  if (!ghost) return;
  ghost.getContext('2d')?.clearRect(0, 0, ghost.width, ghost.height);
}

/**
 * Compute the final composite α applied to the ghost-to-main draw.
 * Exposed for the workbench's debug-capture labels so the readout
 * shows the exact α the user is seeing.
 */
export function motionGhostCompositeAlpha(
  swing: number,
  bloomAlphaScale: number = 1,
): number {
  return Math.min(0.5, swing * 0.5) * bloomAlphaScale;
}
