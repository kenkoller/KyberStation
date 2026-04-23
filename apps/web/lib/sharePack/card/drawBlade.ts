// ─── drawBlade — saber blade with bloom halo + tip cone ───
//
// Supports both horizontal (default, hilt-left → tip-right) and vertical
// (hilt-bottom → tip-top) orientations. The vertical path mirrors the
// horizontal geometry along the perpendicular axis so the two share the
// same visual language (outer halo, inner halo, white-hot core, tip cone).

import type { CardContext, Ctx } from './cardTypes';
import type { RGB } from '@kyberstation/engine';

export function drawBlade(card: CardContext): void {
  const { ctx, options, layout } = card;

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
  const bladeY = layout.heroY + layout.heroH / 2 - layout.bladeThickness / 2;

  drawBladeBodyHorizontal(
    ctx,
    layout.bladeStartX,
    bladeY,
    length,
    layout.bladeThickness,
    options.config.baseColor,
  );
}

// ─── Horizontal blade body ────────────────────────────────────
//
// Emitter end (left) is FLAT so the blade sits flush against the
// hilt's emitter without a rounded peek. Tip end (right) is
// semicircular — matches how a Neopixel blade's physical diffuser
// caps actually round off. No triangular tip cone / sharp point.

function drawBladeBodyHorizontal(
  ctx: Ctx,
  x: number,
  y: number,
  length: number,
  thickness: number,
  color: RGB,
): void {
  ctx.save();

  const { r, g, b } = color;
  const cy = y + thickness / 2;
  const halo = thickness * 2.2;

  // Outer halo — big soft bloom around the blade
  ctx.globalCompositeOperation = 'lighter';
  const haloGrad = ctx.createLinearGradient(0, cy - halo, 0, cy + halo);
  haloGrad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  haloGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.45)`);
  haloGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = haloGrad;
  ctx.fillRect(x - 10, cy - halo, length + 20, halo * 2);

  // Inner halo — tighter, brighter. Flat at emitter, rounded at tip.
  const innerHalo = thickness * 0.9;
  const innerGrad = ctx.createLinearGradient(0, cy - innerHalo, 0, cy + innerHalo);
  innerGrad.addColorStop(0, `rgba(${r},${g},${b},0.2)`);
  innerGrad.addColorStop(
    0.5,
    `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},0.95)`,
  );
  innerGrad.addColorStop(1, `rgba(${r},${g},${b},0.2)`);
  ctx.fillStyle = innerGrad;
  flatEmitterRoundTipH(ctx, x, cy - innerHalo, length, innerHalo * 2);
  ctx.fill();

  // Core — white-hot. Flat at emitter, rounded at tip.
  const coreThickness = thickness * 0.38;
  const coreGrad = ctx.createLinearGradient(0, cy - coreThickness / 2, 0, cy + coreThickness / 2);
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
  coreGrad.addColorStop(0.5, 'rgba(255,255,255,1.0)');
  coreGrad.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = coreGrad;
  flatEmitterRoundTipH(ctx, x, cy - coreThickness / 2, length, coreThickness);
  ctx.fill();

  // Tip bloom — radial gradient centered on the tip's hemisphere so
  // the falloff reads as an organic glow rather than a sharp point.
  const tipCx = x + length - thickness / 2;
  const tipRadius = thickness * 1.25;
  const tipGrad = ctx.createRadialGradient(tipCx, cy, 0, tipCx, cy, tipRadius);
  tipGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
  tipGrad.addColorStop(
    0.35,
    `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},0.55)`,
  );
  tipGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = tipGrad;
  ctx.fillRect(tipCx - tipRadius, cy - tipRadius, tipRadius * 2, tipRadius * 2);

  ctx.restore();
}

// ─── Vertical blade body ─────────────────────────────────────
//
// cx = horizontal center of the blade
// y1 = tip (top), y2 = emitter (bottom, meets hilt)
// thickness = horizontal extent of the core strip
//
// Emitter end (bottom) is FLAT so the blade sits flush against the
// vertical hilt's emitter. Tip end (top) is a semicircle matching
// the Neopixel diffuser cap profile — no triangular point.

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

  // Outer halo — horizontal gradient so the glow falls off to either
  // side of the vertical blade axis.
  ctx.globalCompositeOperation = 'lighter';
  const haloGrad = ctx.createLinearGradient(cx - halo, 0, cx + halo, 0);
  haloGrad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  haloGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.45)`);
  haloGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = haloGrad;
  ctx.fillRect(cx - halo, y1 - 10, halo * 2, length + 20);

  // Inner halo — flat emitter (bottom), rounded tip (top).
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

  // Core — white-hot. Flat emitter (bottom), rounded tip (top).
  const coreThickness = thickness * 0.38;
  const coreGrad = ctx.createLinearGradient(cx - coreThickness / 2, 0, cx + coreThickness / 2, 0);
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
  coreGrad.addColorStop(0.5, 'rgba(255,255,255,1.0)');
  coreGrad.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = coreGrad;
  flatEmitterRoundTipV(ctx, cx - coreThickness / 2, y1, coreThickness, length);
  ctx.fill();

  // Tip bloom — radial gradient centered on the tip's hemisphere so
  // the falloff reads as an organic glow rather than a sharp point.
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

/** Path helper — horizontal blade shape: FLAT left edge (emitter),
 *  semicircular right edge (tip). Matches the profile of a real
 *  Neopixel blade diffuser cap. */
function flatEmitterRoundTipH(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  const r = h / 2;
  // Top-left (flat emitter)
  ctx.moveTo(x, y);
  // Top edge up to the tip cap
  ctx.lineTo(x + w - r, y);
  // Semicircular tip cap (right side)
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  // Bottom edge back to the emitter
  ctx.lineTo(x, y + h);
  // Close via flat left edge (no corner rounding)
  ctx.closePath();
}

/** Path helper — vertical blade shape: FLAT bottom edge (emitter),
 *  semicircular top edge (tip). */
function flatEmitterRoundTipV(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  const r = w / 2;
  // Bottom-left (flat emitter)
  ctx.moveTo(x, y + h);
  // Left edge up to the tip cap
  ctx.lineTo(x, y + r);
  // Semicircular tip cap (top)
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  // Right edge down to the emitter
  ctx.lineTo(x + w, y + h);
  // Close via flat bottom edge
  ctx.closePath();
}
