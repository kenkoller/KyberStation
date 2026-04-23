// ─── drawHilt — saber hilt (horizontal, blade exits the right/emitter end) ───
//
// Renders the real hilt SVG (from @/lib/hilts + @/components/hilt/HiltRenderer)
// onto the card canvas. The horizontal orientation places the emitter at the
// right edge of the SVG viewBox, so we right-align the drawn image to
// `layout.bladeStartX` (with a small overlap so the blade visually emerges
// from the emitter). If the SVG pipeline throws, we fall back to the
// stylized canvas-draw hilt so the card still renders.
//
// Aspect ratio: HiltRenderer preserves the assembly's natural aspect, so the
// drawn height is derived from the loaded Image rather than `layout.hiltH`,
// and the image is vertically centered in the hero band.

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

    // Preserve the SVG's natural aspect ratio. Width is driven by layout;
    // height scales so the assembly's pommel-to-emitter proportions hold.
    const drawW = layout.hiltW;
    const aspect = img.width > 0 ? img.height / img.width : layout.hiltH / layout.hiltW;
    const drawH = drawW * aspect;

    // Right-align the image against the blade's start X (with a small
    // overlap so the emitter tucks into the blade root).
    const drawRightX = layout.bladeStartX - EMITTER_OVERLAP;
    const drawX = drawRightX - drawW;
    const drawY = heroCenterY - drawH / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } catch {
    // SVG render failed (server-render error, image decode failure, etc.) —
    // fall back to the stylized canvas-draw path so the card still renders.
    drawStylizedHilt(ctx, layout.hiltX, fallbackY, layout.hiltW, layout.hiltH);
  }
}

// ─── Stylized canvas-draw hilt (fallback) ───

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
