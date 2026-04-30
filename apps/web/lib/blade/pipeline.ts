// ─── drawWorkbenchBlade — headless pipeline orchestrator ────────────
//
// Renders a workbench-style blade onto a 2D context using the shared
// rasterizer + bloom modules. This is the headless / non-React pipeline
// — used by:
//
//   • `apps/web/lib/sharePack/bladeRenderHeadless.ts` (re-export shim)
//   • `apps/web/lib/sharePack/cardSnapshot.ts` (animated GIFs)
//   • Future consumers (MiniSaber upgrade, card/drawBlade.ts upgrade)
//
// The live workbench (`apps/web/components/editor/BladeCanvas.tsx`)
// does NOT call this orchestrator — it has additional concerns the
// orchestrator intentionally omits (motion blur, rim glow, ignition
// flash, ambient wash, debug-layer captures, hilt rendering, theme
// chrome). The workbench uses the same shared modules
// (`rasterizer.ts`, `bloom.ts`, `colorMath.ts`, `glowProfile.ts`) but
// composes them in its own per-frame loop with state-aware extras.
//
// What this orchestrator covers:
//   • per-LED capsule rasterizer (axial linear-interp + Gaussian-α)
//   • 3-mip downsampled bright-pass bloom chain
//   • theme-driven body composite over the bloom
//   • per-color `getGlowProfileHeadless` tuning
//
// What this orchestrator does NOT cover (intentional, sprint-1 scope):
//   • diffusion soft-blur — the capsule is sharp; the bloom mips are
//     the only smoothing. Heavy diffusion tubes are not modelled.
//   • motion blur (`swing` ghost buffer) — there's no motion data per
//     captureSequence frame.
//   • ignition flash radial burst — would need transient per-frame
//     flash state we don't track.
//   • ambient mip-2 luma wash + vignette coupling — cosmetic, not
//     load-bearing for blade identity.
//   • rim glow — the v0.14 thin saturated-stroke top/bottom rim.
//
// The renderer-level golden-hash test suite at
// `apps/web/tests/rendererGoldenHash/bladeRenderer.test.ts` pins the
// rendered output of THIS orchestrator for canonical configs.

import { rasterizeCapsule } from './rasterizer';
import { saturateRGB } from './colorMath';
import { getGlowProfileHeadless } from './glowProfile';
import {
  buildBloomMipDefs,
  populateBloomMip,
  compositeBloomMips,
} from './bloom';
import type { LedBufferLike, BladeRenderOptions } from './types';

// ─── Average lit LED color — drives glow-profile lookup ──────────────

function averageLitColor(
  leds: LedBufferLike,
  effectiveBri: number,
): { r: number; g: number; b: number; count: number } {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < leds.count; i++) {
    const lr = leds.getR(i) * effectiveBri;
    const lg = leds.getG(i) * effectiveBri;
    const lb = leds.getB(i) * effectiveBri;
    if (lr + lg + lb > 1) {
      r += lr;
      g += lg;
      b += lb;
      n++;
    }
  }
  if (n === 0) return { r: 0, g: 0, b: 0, count: 0 };
  return { r: r / n, g: g / n, b: b / n, count: n };
}

// ─── Offscreen canvas helper (test-friendly) ────────────────────────

function createOffscreenCanvas(
  w: number,
  h: number,
): HTMLCanvasElement | OffscreenCanvas {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  throw new Error('blade/pipeline: no canvas implementation available');
}

// ─── Public — main render entry point ───────────────────────────────

/**
 * Render a workbench-style blade onto the given 2D context using the
 * given LED buffer. Allocates short-lived offscreen canvases for the
 * bloom mip chain; nothing is retained between calls.
 *
 * Pre-conditions:
 *   • `ctx` belongs to a real `<canvas>` (gif.js's addFrame can't read
 *     OffscreenCanvas pixels).
 *   • The 2D context has `getImageData` available (no `willReadFrequently`
 *     annotation needed for sprint 1's frame-rate budget).
 */
export function drawWorkbenchBlade(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  leds: LedBufferLike,
  options: BladeRenderOptions,
): void {
  const {
    bladeStartPx,
    bladeLenPx,
    bladeYPx,
    coreH,
    cw,
    ch,
  } = options;
  const effectiveBri = options.effectiveBri ?? 1.0;
  const shimmer = options.shimmer ?? 1.0;
  const hiltTuck = options.hiltTuck ?? coreH;
  const reduceBloom = options.reduceBloom ?? false;
  const additiveComposite: GlobalCompositeOperation = options.bladeComposite ?? 'lighter';

  if (bladeLenPx < 1 || coreH < 1) return;

  // Pick a glow profile from the average lit-LED color.
  const avg = averageLitColor(leds, effectiveBri);
  if (avg.count === 0) {
    // Fully unlit blade — no rasterization, no bloom. Caller's chrome
    // (hilt etc.) is unaffected.
    return;
  }
  const glow = getGlowProfileHeadless(avg.r, avg.g, avg.b);

  // Pre-saturate the per-color profile (used downstream for ignition
  // flash etc. in BladeCanvas; here it's reserved for future passes).
  void saturateRGB;

  // ── Allocate the sharp offscreen + 3 bloom mips ──
  const offscreen = createOffscreenCanvas(cw, ch);
  const offCtx = offscreen.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!offCtx) return;
  offCtx.clearRect(0, 0, cw, ch);

  // ── Pass 01: capsule rasterizer ──
  rasterizeCapsule(
    offCtx,
    leds,
    bladeStartPx,
    bladeLenPx,
    bladeYPx,
    coreH,
    effectiveBri,
    shimmer,
    glow.coreWhiteout,
    cw,
    ch,
    hiltTuck,
  );

  // ── Bloom mip chain (skipped under reduceBloom) ──
  if (!reduceBloom) {
    const mipDefs = buildBloomMipDefs(cw, ch, glow);
    const mipCanvases: Array<HTMLCanvasElement | OffscreenCanvas> = [];

    // Populate each mip with a downsampled bright-pass + blur pass.
    for (const def of mipDefs) {
      const mip = createOffscreenCanvas(def.w, def.h);
      populateBloomMip(mip, offscreen, cw, ch, def);
      mipCanvases.push(mip);
    }

    // Composite mips onto the main canvas using the theme-declared op.
    compositeBloomMips(
      ctx,
      mipCanvases,
      mipDefs,
      cw,
      ch,
      glow.bloomIntensity,
      shimmer,
      1, // no a11y reduce-bloom scaling here — caller handles that via reduceBloom skipping the whole chain
      additiveComposite,
    );
  }

  // ── Pass 12: capsule body composited additively, clipped to x ≥ bladeStartPx ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(bladeStartPx, 0, cw - bladeStartPx, ch);
  ctx.clip();
  ctx.globalCompositeOperation = additiveComposite;
  ctx.drawImage(offscreen as unknown as CanvasImageSource, 0, 0);
  ctx.restore();
}
