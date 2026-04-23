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

// ─── Horizontal blade body (existing) ────────────────────────

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

  const tipLen = Math.min(length * 0.045, 36);
  const bladeEnd = x + length - tipLen;

  // Outer halo — big soft bloom around the blade
  ctx.globalCompositeOperation = 'lighter';
  const haloGrad = ctx.createLinearGradient(0, cy - halo, 0, cy + halo);
  haloGrad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  haloGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.45)`);
  haloGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = haloGrad;
  ctx.fillRect(x - 10, cy - halo, length + 20, halo * 2);

  // Inner halo — tighter, brighter
  const innerHalo = thickness * 0.9;
  const innerGrad = ctx.createLinearGradient(0, cy - innerHalo, 0, cy + innerHalo);
  innerGrad.addColorStop(0, `rgba(${r},${g},${b},0.2)`);
  innerGrad.addColorStop(
    0.5,
    `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},0.95)`,
  );
  innerGrad.addColorStop(1, `rgba(${r},${g},${b},0.2)`);
  ctx.fillStyle = innerGrad;
  roundBlade(ctx, x, cy - innerHalo, length - tipLen + 6, innerHalo * 2);
  ctx.fill();

  // Core — white-hot
  const coreThickness = thickness * 0.38;
  const coreGrad = ctx.createLinearGradient(0, cy - coreThickness / 2, 0, cy + coreThickness / 2);
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
  coreGrad.addColorStop(0.5, 'rgba(255,255,255,1.0)');
  coreGrad.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = coreGrad;
  roundBlade(ctx, x, cy - coreThickness / 2, length - tipLen + 3, coreThickness);
  ctx.fill();

  // Tip cone — fade core out toward the point
  const tipGrad = ctx.createLinearGradient(bladeEnd, 0, x + length, 0);
  tipGrad.addColorStop(
    0,
    `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},0.95)`,
  );
  tipGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = tipGrad;
  ctx.beginPath();
  ctx.moveTo(bladeEnd, cy - thickness * 0.45);
  ctx.lineTo(x + length, cy);
  ctx.lineTo(bladeEnd, cy + thickness * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ─── Vertical blade body (new) ───────────────────────────────
//
// cx = horizontal center of the blade
// y1 = tip (top), y2 = emitter (bottom, meets hilt)
// thickness = horizontal extent of the core strip

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

  const tipLen = Math.min(length * 0.045, 36);
  const bladeTipStart = y1 + tipLen; // Tip cone occupies [y1, bladeTipStart)

  // Outer halo — horizontal gradient so the glow falls off to either
  // side of the vertical blade axis.
  ctx.globalCompositeOperation = 'lighter';
  const haloGrad = ctx.createLinearGradient(cx - halo, 0, cx + halo, 0);
  haloGrad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  haloGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.45)`);
  haloGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = haloGrad;
  ctx.fillRect(cx - halo, y1 - 10, halo * 2, length + 20);

  // Inner halo — tighter, brighter
  const innerHalo = thickness * 0.9;
  const innerGrad = ctx.createLinearGradient(cx - innerHalo, 0, cx + innerHalo, 0);
  innerGrad.addColorStop(0, `rgba(${r},${g},${b},0.2)`);
  innerGrad.addColorStop(
    0.5,
    `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},0.95)`,
  );
  innerGrad.addColorStop(1, `rgba(${r},${g},${b},0.2)`);
  ctx.fillStyle = innerGrad;
  roundBladeVertical(
    ctx,
    cx - innerHalo,
    bladeTipStart - 6,
    innerHalo * 2,
    length - tipLen + 6,
  );
  ctx.fill();

  // Core — white-hot (vertical core line)
  const coreThickness = thickness * 0.38;
  const coreGrad = ctx.createLinearGradient(cx - coreThickness / 2, 0, cx + coreThickness / 2, 0);
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
  coreGrad.addColorStop(0.5, 'rgba(255,255,255,1.0)');
  coreGrad.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = coreGrad;
  roundBladeVertical(
    ctx,
    cx - coreThickness / 2,
    bladeTipStart - 3,
    coreThickness,
    length - tipLen + 3,
  );
  ctx.fill();

  // Tip cone — fade core out toward the point (upward in vertical)
  const tipGrad = ctx.createLinearGradient(0, bladeTipStart, 0, y1);
  tipGrad.addColorStop(
    0,
    `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},0.95)`,
  );
  tipGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = tipGrad;
  ctx.beginPath();
  ctx.moveTo(cx - thickness * 0.45, bladeTipStart);
  ctx.lineTo(cx, y1);
  ctx.lineTo(cx + thickness * 0.45, bladeTipStart);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Path helper — a rounded horizontal rect for the blade body. */
function roundBlade(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  const r = h / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
}

/** Path helper — a rounded vertical rect (cap at top and bottom). */
function roundBladeVertical(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  const r = w / 2;
  ctx.moveTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h - r);
  ctx.arc(x + r, y + h - r, r, 0, Math.PI);
  ctx.closePath();
}
