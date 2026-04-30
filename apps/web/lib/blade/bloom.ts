// ─── 3-mip downsampled bright-pass bloom chain ──────────────────────
//
// Shared between the live workbench renderer
// (`apps/web/components/editor/BladeCanvas.tsx`) and the headless GIF
// pipeline (`apps/web/lib/sharePack/bladeRenderHeadless.ts`).
//
// Pipeline:
//   1. Sample the rasterized capsule offscreen (or a softened diffusion
//      copy of it) into 3 progressively smaller buffers (1/2, 1/4, 1/8
//      of canvas dims).
//   2. Apply a CSS `contrast(1.15) brightness(1.05) blur(N)` filter to
//      each buffer's drawImage so a single GPU pass produces a pre-
//      blurred bright-pass.
//   3. Composite the three mips back onto the visible canvas additively
//      (or via the theme-declared composite mode). Bilinear upscaling
//      gives a soft continuous halo wrapping the entire blade.
//
// Cost is ~1/8 the v0.13 14-pass loop's fragment work at DPR 2:
// 3 draws at downsampled sizes vs 14+ at full canvas res.
//
// The renderer-level golden-hash test suite at
// `apps/web/tests/rendererGoldenHash/bladeRenderer.test.ts` pins the
// rendered output for canonical configs. Any drift in the mip alphas /
// blur radii / contrast formula will fail the snapshot.

import type { BaseGlowProfile } from './types';

/** Per-mip composition spec. */
export interface BloomMipDef {
  /** Width of the downsampled buffer. */
  w: number;
  /** Height of the downsampled buffer. */
  h: number;
  /** Blur radius applied via the CSS filter, in mip-buffer pixels. */
  blurPx: number;
  /** Composite alpha for the additive upscale blit. */
  alpha: number;
}

/**
 * Build the 3-mip bloom spec for the current canvas dims + glow tuning.
 *
 * The mip alphas were Ken-tuned during v0.14.0 to compensate for the
 * dropped Layer 18 floor+ceiling wash:
 *   • mip0 — tight near-core glow (0.55 → 0.65)
 *   • mip1 — body-wide halo (0.40 → 0.52)
 *   • mip2 — widest ambient wash (0.28 → 0.45). Also sampled by the
 *     workbench's avgBloomLum coupling for floor/hilt washes.
 */
export function buildBloomMipDefs(
  cw: number,
  ch: number,
  glow: Pick<BaseGlowProfile, 'bloomRadius'>,
): BloomMipDef[] {
  const br = glow.bloomRadius;
  return [
    { w: Math.max(1, Math.ceil(cw / 2)), h: Math.max(1, Math.ceil(ch / 2)), blurPx: 6 * br, alpha: 0.65 },
    { w: Math.max(1, Math.ceil(cw / 4)), h: Math.max(1, Math.ceil(ch / 4)), blurPx: 10 * br, alpha: 0.52 },
    { w: Math.max(1, Math.ceil(cw / 8)), h: Math.max(1, Math.ceil(ch / 8)), blurPx: 14 * br, alpha: 0.45 },
  ];
}

/** Generic 2D-context shape both DOM canvases and OffscreenCanvas use. */
type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type AnyCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Populate a single mip canvas with a bright-pass + blur copy of the
 * source. Uses the chained CSS filter so the small canvas holds a
 * pre-blurred bright-pass image ready for additive compositing.
 *
 * Soft bright-pass: contrast(1.15) + brightness(1.05) gently pushes
 * mid tones toward 0 and highlights toward 1 without crushing the
 * falloff into a near-binary mask. The previous 1.4 contrast produced
 * a hard threshold edge — when blurred, that edge showed through as a
 * visible rectangular cutoff at the bloom outer extent (most obvious
 * on mips 1 + 2). With 1.15 the bright-pass is a smooth gradient, so
 * blurring it produces a smooth halo with natural falloff instead of
 * a box-shaped wash.
 *
 * Trade-offs (intentional, both wins for accuracy):
 *  - bloom now bleeds slightly onto darker adjacent surfaces (hilt, dim
 *    blade areas). This is physically correct — real bright lights
 *    spill onto adjacent matter.
 *  - bloom looks less "snappy" / more diffuse. Closer to what real
 *    cameras + real eyes produce.
 */
export function populateBloomMip(
  mipCanvas: AnyCanvas,
  source: AnyCanvas,
  cw: number,
  ch: number,
  def: BloomMipDef,
): void {
  if (mipCanvas.width !== def.w || mipCanvas.height !== def.h) {
    mipCanvas.width = def.w;
    mipCanvas.height = def.h;
  }
  const mCtx = mipCanvas.getContext('2d') as AnyCtx | null;
  if (!mCtx) return;
  mCtx.clearRect(0, 0, def.w, def.h);
  mCtx.save();
  mCtx.filter = `contrast(1.15) brightness(1.05) blur(${def.blurPx}px)`;
  mCtx.drawImage(
    source as unknown as CanvasImageSource,
    0, 0, cw, ch,
    0, 0, def.w, def.h,
  );
  mCtx.restore();
}

/**
 * Composite the 3 bloom mips onto the destination context using
 * `compositeOp` (defaults to `'lighter'` for additive halo).
 *
 * Each mip's globalAlpha = `def.alpha × bloomIntensity × shimmer ×
 * bloomAlphaScale`. The `bloomAlphaScale` is the workbench's a11y
 * `reduceBloom` knob (0.4 = 40 % halo).
 */
export function compositeBloomMips(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  mipCanvases: AnyCanvas[],
  mipDefs: BloomMipDef[],
  cw: number,
  ch: number,
  bloomIntensity: number,
  shimmer: number,
  bloomAlphaScale: number = 1,
  compositeOp: GlobalCompositeOperation = 'lighter',
  /**
   * Optional per-mip callback fired right after each mip is composited.
   * Workbench passes a debug-capture hook here; headless leaves it
   * undefined.
   */
  onMipComposited?: (
    mipIndex: number,
    def: BloomMipDef,
    appliedAlpha: number,
  ) => void,
): void {
  ctx.save();
  ctx.globalCompositeOperation = compositeOp;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (let i = 0; i < mipCanvases.length; i++) {
    const def = mipDefs[i];
    const appliedAlpha = def.alpha * bloomIntensity * shimmer * bloomAlphaScale;
    ctx.globalAlpha = appliedAlpha;
    ctx.drawImage(
      mipCanvases[i] as unknown as CanvasImageSource,
      0, 0, def.w, def.h,
      0, 0, cw, ch,
    );
    if (onMipComposited) {
      // Restore + capture + re-save so the delta call sees the
      // composited mip without the bloom-loop's globalAlpha bleeding
      // into the diff snapshot.
      ctx.restore();
      onMipComposited(i, def, appliedAlpha);
      ctx.save();
      ctx.globalCompositeOperation = compositeOp;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
  }
  ctx.restore();
}
