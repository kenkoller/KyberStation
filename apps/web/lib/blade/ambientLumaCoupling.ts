// ─── Ambient mip-2 luma coupling ─────────────────────────────────────
//
// Sample the bloom mip-2 buffer's average green-channel value as a
// luma proxy. Mip 2 is the widest ambient-wash bloom mip, so its
// average green tracks the blade's overall brightness automatically —
// ignitions pulse it, clash flashes spike it, retraction fades it.
// Callers wire this into:
//
//   • Background ambient tint α (full-canvas color wash that pulls the
//     dark surroundings toward the blade hue).
//   • Floor / ceiling wash α (Layer 18 — currently dormant in
//     BladeCanvas's v0.14.x pipeline but the value is still computed
//     for re-enable readiness).
//   • Hilt illumination wash α (Layer 20 — also dormant in v0.14.x).
//
// Originally inlined in `apps/web/components/editor/BladeCanvas.tsx`
// (Phase 4 ambient coupling, Layer 19). Extracted as part of the
// renderer-level golden-hash full-coverage push (post-launch backlog
// "Renderer-level golden-hash full coverage", v0.22.x).
//
// === Cost ===
// Sampling mip 2 is cheap: at canvas 980×295 dim, mip 2 is
// ~123×37 = 4500 pixels. `getImageData` reads ~18 KB/frame.
//
// === Cross-origin safety ===
// `getImageData` on a cross-origin-tainted canvas throws. The sample
// function swallows the exception and returns 0 so the workbench's
// fallback static-formula codepath kicks in (per the original inline).
//
// === Renderer-level golden-hash coverage ===
// `apps/web/tests/rendererGoldenHash/inlineRenderPaths.test.ts` pins
// the rasterized output of `paintAmbientTint` at 3 luma levels (low /
// mid / high). Any drift in the α formula or the saturation floor
// will fail the snapshot.

/** Below this average-luma threshold, the tint is still painted but
 *  uses the saturation floor (0.003). Documented for the test harness. */
export const AMBIENT_TINT_ALPHA_FLOOR = 0.003;
/** Mip-2 luma → ambient-tint α coefficient. */
export const AMBIENT_TINT_LUMA_COEFFICIENT = 0.04;
/** Mip-2 luma → wash α coefficient (Layer 18 — dormant in v0.14.x). */
export const AMBIENT_WASH_LUMA_COEFFICIENT = 0.18;
/** Saturation floor for the dormant wash α. */
export const AMBIENT_WASH_ALPHA_FLOOR = 0.005;
/** Reduce-bloom (a11y) multiplier — matches BladeCanvas's `reduceBloom ? 0.4 : 1`. */
export const REDUCE_BLOOM_ALPHA_SCALE = 0.4;

/**
 * Sample the average green-channel value of a bloom mip-2 buffer,
 * returning a 0–1 luma proxy.
 *
 * Returns 0 when:
 *   • The mip canvas has zero width or height.
 *   • `getImageData` throws (cross-origin-tainted canvas).
 *   • The canvas has no 2D context.
 *
 * The green channel is used as a luma proxy — for the workbench's
 * post-bloom buffers this is close enough to BT.601 luma, and it's
 * O(N) cheaper than the 0.299R + 0.587G + 0.114B sum.
 */
export function sampleMip2Luma(
  mip2: HTMLCanvasElement | OffscreenCanvas | null,
): number {
  if (!mip2 || mip2.width <= 0 || mip2.height <= 0) return 0;
  const m2Ctx = mip2.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!m2Ctx) return 0;
  try {
    const data = m2Ctx.getImageData(0, 0, mip2.width, mip2.height).data;
    let sum = 0;
    const count = data.length / 4;
    if (count === 0) return 0;
    for (let i = 0; i < data.length; i += 4) sum += data[i + 1];
    return sum / (count * 255);
  } catch {
    return 0;
  }
}

/**
 * Compute the ambient-tint α from a mip-2 luma value.
 *
 *   α = max(AMBIENT_TINT_ALPHA_FLOOR, avgLuma × AMBIENT_TINT_LUMA_COEFFICIENT) × reduceBloomScale
 *
 * `reduceBloom = true` scales α by 0.4 — matches the a11y knob in the
 * live workbench.
 */
export function ambientTintAlpha(
  avgBloomLum: number,
  reduceBloom: boolean = false,
): number {
  const reduceScale = reduceBloom ? REDUCE_BLOOM_ALPHA_SCALE : 1;
  return Math.max(AMBIENT_TINT_ALPHA_FLOOR, avgBloomLum * AMBIENT_TINT_LUMA_COEFFICIENT) * reduceScale;
}

/**
 * Compute the dormant Layer-18 wash α from a mip-2 luma value.
 *
 *   α = max(AMBIENT_WASH_ALPHA_FLOOR, avgLuma × AMBIENT_WASH_LUMA_COEFFICIENT) × reduceBloomScale
 *
 * Exposed for any future re-enable of the floor / ceiling / hilt
 * washes. BladeCanvas currently reads it into a `void` so the formula
 * stays alive against the eventual re-enable.
 */
export function ambientWashAlpha(
  avgBloomLum: number,
  reduceBloom: boolean = false,
): number {
  const reduceScale = reduceBloom ? REDUCE_BLOOM_ALPHA_SCALE : 1;
  return Math.max(AMBIENT_WASH_ALPHA_FLOOR, avgBloomLum * AMBIENT_WASH_LUMA_COEFFICIENT) * reduceScale;
}

/** Parameters for `paintAmbientTint`. */
export interface AmbientTintParams {
  /** Mip-2 luma proxy (0–1). From `sampleMip2Luma`. */
  avgBloomLum: number;
  /** Number of lit LEDs (skip the paint when 0 — saves the alloc). */
  activeCount: number;
  /** Pre-saturated blade color used for the tint. */
  bladeColor: { r: number; g: number; b: number };
  /** Canvas width (px). */
  cw: number;
  /** Canvas height (px). */
  ch: number;
  /** a11y reduce-bloom flag — scales α by 0.4 when true. */
  reduceBloom?: boolean;
}

/**
 * Paint a full-canvas color tint that pulls the dark surroundings
 * toward the blade hue. No-op when no LEDs are lit.
 *
 * Does NOT save/restore the context — sets `fillStyle` only, no
 * composite-mode or transform changes.
 */
export function paintAmbientTint(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  params: AmbientTintParams,
): void {
  const { avgBloomLum, activeCount, bladeColor, cw, ch } = params;
  const reduceBloom = params.reduceBloom ?? false;
  if (activeCount <= 0) return;
  const alpha = ambientTintAlpha(avgBloomLum, reduceBloom);
  ctx.fillStyle = `rgba(${bladeColor.r | 0},${bladeColor.g | 0},${bladeColor.b | 0},${alpha})`;
  ctx.fillRect(0, 0, cw, ch);
}
