// ─── drawHilt — saber hilt ─────────────────────────────────────
//
// Supports both horizontal (blade exits the right/emitter end) and
// vertical (blade exits the top/emitter end, hilt grip at the bottom)
// orientations. Uses the real hilt SVG via HiltRenderer; falls back to
// a stylized canvas-draw hilt if the SVG pipeline throws.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { HiltRenderer } from '@/components/hilt/HiltRenderer';

import type { CardContext, Ctx } from './cardTypes';
import { fillRoundRect, svgStringToImage } from './canvasUtils';

/** Emitter/blade overlap in logical px — keeps the blade flush against the hilt. */
const EMITTER_OVERLAP = 4;

/** Default assembly when the config doesn't declare one. */
const DEFAULT_ASSEMBLY_ID = 'graflex';

/** Accent color for the hilt — neutral chrome to avoid fighting the blade color. */
const HILT_ACCENT = 'rgb(178,182,192)';

export async function drawHilt(card: CardContext): Promise<void> {
  const { layout } = card;
  if (layout.saberOrientation === 'vertical') {
    await drawHiltVertical(card);
  } else {
    await drawHiltHorizontal(card);
  }
}

// ─── Horizontal hilt (existing behavior) ─────────────────────

async function drawHiltHorizontal(card: CardContext): Promise<void> {
  const { ctx, layout, options } = card;
  const { config } = options;

  const heroCenterY = layout.heroY + layout.heroH / 2;
  const fallbackY = heroCenterY - layout.hiltH / 2;

  try {
    const hiltId = (config as unknown as { hiltId?: string }).hiltId ?? DEFAULT_ASSEMBLY_ID;

    const svgMarkup = renderToStaticMarkup(
      createElement(HiltRenderer, {
        assemblyId: hiltId,
        orientation: 'horizontal',
        longAxisSize: layout.hiltW,
        accentOverride: HILT_ACCENT,
      }),
    );

    if (!svgMarkup) {
      throw new Error('HiltRenderer produced empty markup');
    }

    const img = await svgStringToImage(svgMarkup);

    // Preserve the SVG's natural aspect ratio.
    const drawW = layout.hiltW;
    const aspect = img.width > 0 ? img.height / img.width : layout.hiltH / layout.hiltW;
    const drawH = drawW * aspect;

    // Right-align against the blade's start X.
    const drawRightX = layout.bladeStartX - EMITTER_OVERLAP;
    const drawX = drawRightX - drawW;
    const drawY = heroCenterY - drawH / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } catch {
    drawStylizedHilt(ctx, layout.hiltX, fallbackY, layout.hiltW, layout.hiltH);
  }
}

// ─── Vertical hilt ───────────────────────────────────────────

async function drawHiltVertical(card: CardContext): Promise<void> {
  const { ctx, layout, options } = card;
  const { config } = options;

  // For vertical, hiltW is the long-axis dimension (top-to-bottom of
  // grip); the short axis (horizontal width) derives from the SVG's
  // natural aspect. HiltRenderer with orientation='vertical' emits
  // emitter-at-top natural SVG, which suits a blade-pointing-up layout.
  const longAxisSize = layout.hiltW;
  const hiltTopY = layout.hiltY ?? (layout.heroY + layout.heroH - layout.hiltW);
  const hiltCenterX = layout.hiltX + layout.hiltH / 2;

  try {
    const hiltId = (config as unknown as { hiltId?: string }).hiltId ?? DEFAULT_ASSEMBLY_ID;

    const svgMarkup = renderToStaticMarkup(
      createElement(HiltRenderer, {
        assemblyId: hiltId,
        orientation: 'vertical',
        longAxisSize,
        accentOverride: HILT_ACCENT,
      }),
    );

    if (!svgMarkup) {
      throw new Error('HiltRenderer produced empty markup');
    }

    const img = await svgStringToImage(svgMarkup);

    // Long-axis (height) is fixed; compute short-axis (width) from the
    // SVG's natural aspect ratio.
    const drawH = longAxisSize;
    const aspect = img.height > 0 ? img.width / img.height : layout.hiltH / layout.hiltW;
    const drawW = drawH * aspect;

    // Center horizontally on hiltCenterX; top at hiltTopY (so the
    // emitter sits near the blade's bottom).
    const drawX = hiltCenterX - drawW / 2;
    const drawY = hiltTopY - EMITTER_OVERLAP;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } catch {
    // Fallback — stylized vertical hilt.
    drawStylizedHiltVertical(
      ctx,
      hiltCenterX,
      hiltTopY,
      layout.hiltH,
      layout.hiltW,
    );
  }
}

// ─── Stylized canvas-draw hilt (horizontal fallback) ────────

function drawStylizedHilt(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.save();

  // Pommel cap (left)
  ctx.fillStyle = '#3a3e48';
  fillRoundRect(ctx, x - 10, y + 4, 14, h - 8, 2);

  // Main grip — vertical metal gradient
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
  bodyGrad.addColorStop(0, '#c6ccd6');
  bodyGrad.addColorStop(0.35, '#8a90a0');
  bodyGrad.addColorStop(0.65, '#575d6a');
  bodyGrad.addColorStop(1, '#2d313b');
  ctx.fillStyle = bodyGrad;
  fillRoundRect(ctx, x, y, w, h, 3);

  // Grip ribs — 6 vertical lines dividing the grip zones
  ctx.strokeStyle = 'rgba(30, 32, 38, 0.75)';
  ctx.lineWidth = 1;
  const ribCount = 6;
  for (let i = 1; i < ribCount; i++) {
    const rx = x + (w / ribCount) * i;
    ctx.beginPath();
    ctx.moveTo(rx, y + 4);
    ctx.lineTo(rx, y + h - 4);
    ctx.stroke();
  }

  // Switch box (accent band near the emitter)
  ctx.fillStyle = '#4a5060';
  ctx.fillRect(x + w - 64, y + 6, 44, h - 12);
  ctx.fillStyle = '#c8a040';
  ctx.fillRect(x + w - 58, y + h / 2 - 3, 6, 6);
  ctx.fillStyle = '#2a6d4a';
  ctx.fillRect(x + w - 44, y + h / 2 - 3, 6, 6);

  // Emitter (right end)
  const emitterGrad = ctx.createLinearGradient(x + w, y, x + w + 14, y);
  emitterGrad.addColorStop(0, '#2c303a');
  emitterGrad.addColorStop(1, '#5a5f6b');
  ctx.fillStyle = emitterGrad;
  fillRoundRect(ctx, x + w, y, 14, h, 1);

  // Specular highlight along the grip's top edge
  const highlightGrad = ctx.createLinearGradient(x, y, x, y + h * 0.2);
  highlightGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
  highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = highlightGrad;
  fillRoundRect(ctx, x + 2, y + 2, w - 4, h * 0.2, 2);

  ctx.restore();
}

// ─── Stylized canvas-draw hilt (vertical fallback) ──────────

function drawStylizedHiltVertical(
  ctx: Ctx,
  cx: number,
  topY: number,
  width: number,
  height: number,
): void {
  ctx.save();

  const x = cx - width / 2;
  const y = topY;

  // Emitter (top, meets blade)
  const emitterGrad = ctx.createLinearGradient(x, y, x, y + 14);
  emitterGrad.addColorStop(0, '#5a5f6b');
  emitterGrad.addColorStop(1, '#2c303a');
  ctx.fillStyle = emitterGrad;
  fillRoundRect(ctx, x, y - 14, width, 14, 1);

  // Main grip — horizontal metal gradient (side-to-side sheen)
  const bodyGrad = ctx.createLinearGradient(x, y, x + width, y);
  bodyGrad.addColorStop(0, '#c6ccd6');
  bodyGrad.addColorStop(0.35, '#8a90a0');
  bodyGrad.addColorStop(0.65, '#575d6a');
  bodyGrad.addColorStop(1, '#2d313b');
  ctx.fillStyle = bodyGrad;
  fillRoundRect(ctx, x, y, width, height, 3);

  // Grip ribs — horizontal bands on a vertical hilt
  ctx.strokeStyle = 'rgba(30, 32, 38, 0.75)';
  ctx.lineWidth = 1;
  const ribCount = 6;
  for (let i = 1; i < ribCount; i++) {
    const ry = y + (height / ribCount) * i;
    ctx.beginPath();
    ctx.moveTo(x + 4, ry);
    ctx.lineTo(x + width - 4, ry);
    ctx.stroke();
  }

  // Switch box (accent band near the emitter, top of grip)
  ctx.fillStyle = '#4a5060';
  ctx.fillRect(x + 6, y + 12, width - 12, 44);
  ctx.fillStyle = '#c8a040';
  ctx.fillRect(x + width / 2 - 3, y + 18, 6, 6);
  ctx.fillStyle = '#2a6d4a';
  ctx.fillRect(x + width / 2 - 3, y + 32, 6, 6);

  // Pommel cap (bottom)
  ctx.fillStyle = '#3a3e48';
  fillRoundRect(ctx, x + 4, y + height, width - 8, 14, 2);

  // Specular highlight along the left edge
  const highlightGrad = ctx.createLinearGradient(x, y, x + width * 0.2, y);
  highlightGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
  highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = highlightGrad;
  fillRoundRect(ctx, x + 2, y + 2, width * 0.2, height - 4, 2);

  ctx.restore();
}
