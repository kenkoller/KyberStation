// ─── drawBlade — saber blade with workbench-parity bloom pipeline ───
//
// Horizontal path (the only surfaced orientation today) delegates
// straight to `bladeRenderHeadless.ts::drawWorkbenchBlade` — the
// canonical 1:1 port of `BladeCanvas.tsx`'s v0.14 capsule rasterizer
// + 3-mip downsampled bright-pass bloom chain. This is the same
// pipeline the workbench preview AND the animated saber-card GIF
// use, so the static PNG, animated GIF, and live editor preview all
// produce visually identical blade renders for any given config.
//
// Pre-2026-04-27 versions of this file carried their own
// 14-pass additive-blur bloom + body-gradient + tip-corona overlays
// inline. Those were retired when the workbench unified its render
// behind the v0.14 pipeline; the static-card path was the last
// holdout. See PR description for the unification commit.
//
// The vertical orientation branch is dormant — hidden from the UI
// in CrystalPanel.tsx but the layout + drawer code stay for future
// re-enable. It still uses the Wave 1 synthetic halo stack since it
// has no LED buffer to feed the workbench pipeline.

import type { CardContext, Ctx } from './cardTypes';
import type { RGB } from '@kyberstation/engine';
import { BladeEngine, BladeState } from '@kyberstation/engine';
import { drawWorkbenchBlade, ledBufferFrom } from '../bladeRenderHeadless';

export function drawBlade(card: CardContext): void {
  const { ctx, options, layout, theme } = card;

  if (layout.saberOrientation === 'vertical') {
    const bladeY1 = layout.bladeY1 ?? layout.heroY;
    const bladeY2 = layout.bladeY2 ?? layout.heroY + layout.heroH;
    const cx = layout.hiltX + layout.hiltW / 2;
    drawBladeBodyVertical(
      ctx,
      cx,
      bladeY1,
      bladeY2,
      layout.bladeThickness,
      options.config.baseColor,
    );
    return;
  }

  // Default: horizontal.
  const length = layout.bladeEndX - layout.bladeStartX;
  const cy = layout.heroY + layout.heroH / 2;

  drawBladeHorizontalWorkbench(
    ctx,
    layout.width,
    layout.height,
    layout.bladeStartX,
    cy,
    length,
    layout.bladeThickness,
    options.config,
    theme.id === 'light',
  );
}

// ─── Horizontal blade — delegated to the workbench renderer ───────
//
// The static PNG card uses the SAME blade pipeline as the workbench
// preview and the animated GIF: capture an LED buffer from the engine,
// pipe it through `drawWorkbenchBlade` (capsule rasterizer + 3-mip
// downsampled bright-pass bloom). All three surfaces converge on one
// visual identity, so the design the user composed in the workbench
// is what their share-card recipients see.

function drawBladeHorizontalWorkbench(
  ctx: Ctx,
  canvasW: number,
  canvasH: number,
  bladeStartX: number,
  cy: number,
  length: number,
  thickness: number,
  config: import('@kyberstation/engine').BladeConfig,
  lightBackdrop: boolean,
): void {
  const engine = new BladeEngine();
  const ledRgb = engine.captureStateFrame(BladeState.ON, config);
  const leds = ledBufferFrom(ledRgb);

  // coreH (lit strip thickness) is ~80 % of the layout's blade
  // thickness — matches the workbench's per-LED capsule height
  // relative to its blade container. drawWorkbenchBlade extends
  // the capsule's left cap behind bladeStartX by `hiltTuck` so the
  // bloom bleeds onto the hilt naturally; default is `coreH`.
  const coreH = thickness * 0.8;

  drawWorkbenchBlade(ctx, leds, {
    bladeStartPx: bladeStartX,
    bladeLenPx: length,
    bladeYPx: cy,
    coreH,
    cw: canvasW,
    ch: canvasH,
    // LIGHT_THEME has a paper-white backdrop — additive `lighter`
    // blends saturate to pure white. `screen` clips at 1.0 and
    // preserves the blade's color identity over the bright bg.
    lightBackdrop,
  });
}

// ─── Vertical blade body (dormant — layout dropdown hidden) ─────

function drawBladeBodyVertical(
  ctx: Ctx,
  cx: number,
  y1: number,
  y2: number,
  thickness: number,
  color: RGB,
): void {
  ctx.save();

  const { r, g, b } = color;
  const length = y2 - y1;
  const halo = thickness * 2.2;

  ctx.globalCompositeOperation = 'lighter';
  const haloGrad = ctx.createLinearGradient(cx - halo, 0, cx + halo, 0);
  haloGrad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  haloGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.45)`);
  haloGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = haloGrad;
  ctx.fillRect(cx - halo, y1 - 10, halo * 2, length + 20);

  const innerHalo = thickness * 0.9;
  const innerGrad = ctx.createLinearGradient(cx - innerHalo, 0, cx + innerHalo, 0);
  innerGrad.addColorStop(0, `rgba(${r},${g},${b},0.2)`);
  innerGrad.addColorStop(
    0.5,
    `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},0.95)`,
  );
  innerGrad.addColorStop(1, `rgba(${r},${g},${b},0.2)`);
  ctx.fillStyle = innerGrad;
  flatEmitterRoundTipV(ctx, cx - innerHalo, y1, innerHalo * 2, length);
  ctx.fill();

  const coreThickness = thickness * 0.38;
  const coreGrad = ctx.createLinearGradient(cx - coreThickness / 2, 0, cx + coreThickness / 2, 0);
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
  coreGrad.addColorStop(0.5, 'rgba(255,255,255,1.0)');
  coreGrad.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = coreGrad;
  flatEmitterRoundTipV(ctx, cx - coreThickness / 2, y1, coreThickness, length);
  ctx.fill();

  const tipCy = y1 + thickness / 2;
  const tipRadius = thickness * 1.25;
  const tipGrad = ctx.createRadialGradient(cx, tipCy, 0, cx, tipCy, tipRadius);
  tipGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
  tipGrad.addColorStop(
    0.35,
    `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},0.55)`,
  );
  tipGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = tipGrad;
  ctx.fillRect(cx - tipRadius, tipCy - tipRadius, tipRadius * 2, tipRadius * 2);

  ctx.restore();
}

// ─── Capsule path helpers ─────────────────────────────────────────
//
// `flatEmitterRoundTipH` was retired when the horizontal path
// delegated to `bladeRenderHeadless::drawWorkbenchBlade`, which
// rasterizes its own capsule. Only the vertical helper survives —
// used by the dormant vertical-orientation fallback below.

/** Vertical blade shape: FLAT bottom edge (emitter), semicircular
 *  top edge (tip). */
function flatEmitterRoundTipV(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  const r = w / 2;
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}
