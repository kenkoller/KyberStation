// ─── Ignition flash radial burst ─────────────────────────────────────
//
// Bright radial glow centered at the emitter that pulses during the
// ignition transient (first ~15% of `extendProgress`) and decays via an
// exponential ref-managed multiplier in the live workbench. Mimics the
// "WHOOSH" white-hot flash a real lightsaber emits when the blade first
// extends — a brief signal that says "the saber just lit up" before the
// steady-state blade body takes over the visual.
//
// Originally inlined in `apps/web/components/editor/BladeCanvas.tsx`
// (Pass 17 — "Ignition flash burst"). Extracted as part of the
// renderer-level golden-hash full-coverage push (post-launch backlog
// "Renderer-level golden-hash full coverage", v0.22.x).
//
// The function is intentionally state-free: callers (the live
// workbench) manage the per-frame flash intensity in their own ref,
// then pass the current 0–1 value here. This keeps the module
// trivially testable with a node-canvas surface — no React, no refs,
// no per-frame state.
//
// === Visual envelope ===
// At `flashIntensity = 1.0`:
//   • A radial gradient is painted with center at (bladeStartPx, bladeYPx).
//   • Gradient radius = `60 × scale × glow.bloomRadius` (so colors with
//     a wider authored bloom envelope get a wider flash too).
//   • Color stops:
//       0.0 → white at α = `intensity × 0.7`
//       0.3 → saturated blade color at α × 0.5
//       1.0 → transparent
//   • Filled as a full circle via `ctx.arc` + `ctx.fill`.
//
// Below `flashIntensity ≤ 0.01`, the function early-returns to avoid
// paying any per-pixel cost for an effectively-invisible burst.
//
// === Renderer-level golden-hash coverage ===
// `apps/web/tests/rendererGoldenHash/inlineRenderPaths.test.ts` pins
// the rasterized output of this function at 5 progress points (0.0,
// 0.25, 0.5, 0.75, 1.0). Any drift in the gradient stops / radius
// multiplier / α formula will fail the snapshot.

/** Parameters for `drawIgnitionFlash`. */
export interface IgnitionFlashParams {
  /**
   * Current flash intensity, 0–1. The caller's per-frame ref manages
   * the decay envelope; this module just maps it to gradient α + body
   * radius. Values ≤ 0.01 early-return.
   */
  flashIntensity: number;
  /**
   * Emitter X coordinate (canvas px). The radial gradient's center.
   */
  bladeStartPx: number;
  /**
   * Emitter Y coordinate (canvas px). The radial gradient's center.
   * Typically the blade's vertical centerline.
   */
  bladeYPx: number;
  /**
   * Workbench scale factor (design-space → canvas-px). The radial
   * gradient radius scales with this so the flash sizes itself to the
   * visible blade.
   */
  scale: number;
  /**
   * Per-color bloom-radius tuning (from the active glow profile).
   * Colors with a wider authored bloom envelope get a proportionally
   * wider flash so the burst visually fits the steady-state halo.
   */
  bloomRadius: number;
  /**
   * Pre-saturated blade color (R/G/B 0–255). Used for the gradient's
   * middle + outer stops. The center stop is always pure white — the
   * burst is hot enough to wash out per-color hue at its core.
   */
  bladeColor: { r: number; g: number; b: number };
}

/**
 * Paint the ignition-flash radial burst onto the given 2D context.
 *
 * No-op when `flashIntensity ≤ 0.01` — the radial fill below this
 * threshold is imperceptible and not worth the per-pixel cost.
 *
 * Does NOT save/restore the context — callers that mutate
 * `globalCompositeOperation` etc. should wrap the call. The function
 * itself only sets `fillStyle` (a fresh gradient) and `fillStyle` is
 * the only piece of state that escapes — no `globalAlpha`,
 * `globalCompositeOperation`, transform changes, or clip-stack
 * modifications.
 */
export function drawIgnitionFlash(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  params: IgnitionFlashParams,
): void {
  const { flashIntensity, bladeStartPx, bladeYPx, scale, bloomRadius, bladeColor } = params;

  if (flashIntensity <= 0.01) return;

  const flashAlpha = flashIntensity * 0.7;
  const flashR = 60 * scale * bloomRadius;
  const flashGrad = ctx.createRadialGradient(
    bladeStartPx,
    bladeYPx,
    0,
    bladeStartPx,
    bladeYPx,
    flashR,
  );
  flashGrad.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
  flashGrad.addColorStop(
    0.3,
    `rgba(${bladeColor.r | 0},${bladeColor.g | 0},${bladeColor.b | 0},${flashAlpha * 0.5})`,
  );
  flashGrad.addColorStop(
    1,
    `rgba(${bladeColor.r | 0},${bladeColor.g | 0},${bladeColor.b | 0},0)`,
  );
  ctx.fillStyle = flashGrad;
  ctx.beginPath();
  ctx.arc(bladeStartPx, bladeYPx, flashR, 0, Math.PI * 2);
  ctx.fill();
}
