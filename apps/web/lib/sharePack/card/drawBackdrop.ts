// ─── drawBackdrop — card background + HUD chrome ───
//
// OWNER (agent C): this file. Feel free to add HUD brackets, grid, an
// archive stamp, faction watermark glyph, corner index marks, etc. —
// anything that reads as "trading card / archive document" chrome.
//
// Reads from `card.theme` tokens (gridColor, hudBracketColor,
// watermarkColor, archiveStampBg, archiveStampText). If you need
// additional tokens, add them to `cardTheme.ts` DEFAULT_THEME and
// declare them in the CardTheme interface — do NOT modify cardTypes.ts
// from inside this file.

import { fillRoundRect, strokeRoundRect } from './canvasUtils';
import type { CardContext, Ctx } from './cardTypes';

export function drawBackdrop(card: CardContext): void {
  const { ctx, options, layout, theme } = card;
  const { width, height } = layout;
  const { r, g, b } = options.config.baseColor;

  // 1. Deep-space radial gradient with a subtle inner wash in the blade's
  // color so the card visually belongs to *this* saber.
  const grad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    60,
    width * 0.5,
    height * 0.42,
    width * 0.75,
  );
  const wash = theme.backdropBladeWash;
  grad.addColorStop(
    0,
    `rgba(${Math.round(r * wash)}, ${Math.round(g * wash)}, ${Math.round(b * wash)}, 1)`,
  );
  grad.addColorStop(0.35, theme.backdropMid);
  grad.addColorStop(0.75, theme.backdropOuter);
  grad.addColorStop(1, theme.backdropEdge);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Background grid — 1px dots every 40px on a square lattice.
  drawGridDots(ctx, width, height, theme.gridColor, theme.gridAlpha);

  // 3. Large watermark glyph — low-alpha faction seal.
  drawWatermarkGlyph(ctx, width, height, theme.watermarkColor);

  // 4. Scanline texture — subtle archive feel.
  ctx.save();
  ctx.globalAlpha = theme.scanlineAlpha;
  ctx.fillStyle = theme.scanlineColor;
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();

  // 5. Edge vignette — tightens the corners.
  drawEdgeVignette(ctx, width, height);

  // 6. Corner HUD brackets — L-shapes inside the safe zone.
  drawCornerBrackets(ctx, width, height, layout.headerH, layout.footerH, theme.hudBracketColor);

  // 7. Index marks — tiny registration crosshairs on each edge midpoint.
  drawIndexMarks(ctx, width, height, theme.hudBracketColor);

  // 8. Archive stamp — small rounded-rect badge near the top-left.
  drawArchiveStamp(ctx, layout.headerH, theme);
}

// ─── helpers ───────────────────────────────────────────────────────────

function drawGridDots(
  ctx: Ctx,
  width: number,
  height: number,
  color: string,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const step = 40;
  for (let y = step; y < height; y += step) {
    for (let x = step; x < width; x += step) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
}

function drawWatermarkGlyph(ctx: Ctx, width: number, height: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = "900 320px 'Orbitron', ui-sans-serif, serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('◈', width * 0.72, height * 0.55);
  ctx.restore();
}

function drawEdgeVignette(ctx: Ctx, width: number, height: number): void {
  const cx = width / 2;
  const cy = height / 2;
  const inner = Math.min(width, height) * 0.45;
  const outer = Math.hypot(cx, cy);
  const vignette = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawCornerBrackets(
  ctx: Ctx,
  width: number,
  height: number,
  headerH: number,
  footerH: number,
  color: string,
): void {
  const inset = 24;
  const armLen = 18;
  const left = inset;
  const right = width - inset;
  const top = headerH + inset;
  const bottom = height - footerH - inset;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'butt';
  ctx.beginPath();

  // Top-left
  ctx.moveTo(left, top + armLen);
  ctx.lineTo(left, top);
  ctx.lineTo(left + armLen, top);

  // Top-right
  ctx.moveTo(right - armLen, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right, top + armLen);

  // Bottom-left
  ctx.moveTo(left, bottom - armLen);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left + armLen, bottom);

  // Bottom-right
  ctx.moveTo(right - armLen, bottom);
  ctx.lineTo(right, bottom);
  ctx.lineTo(right, bottom - armLen);

  ctx.stroke();
  ctx.restore();
}

function drawIndexMarks(ctx: Ctx, width: number, height: number, color: string): void {
  const inset = 10;
  const half = 5;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.beginPath();

  // Top edge midpoint
  ctx.moveTo(width / 2 - half, inset);
  ctx.lineTo(width / 2 + half, inset);
  ctx.moveTo(width / 2, inset - half);
  ctx.lineTo(width / 2, inset + half);

  // Bottom edge midpoint
  ctx.moveTo(width / 2 - half, height - inset);
  ctx.lineTo(width / 2 + half, height - inset);
  ctx.moveTo(width / 2, height - inset - half);
  ctx.lineTo(width / 2, height - inset + half);

  // Left edge midpoint
  ctx.moveTo(inset - half, height / 2);
  ctx.lineTo(inset + half, height / 2);
  ctx.moveTo(inset, height / 2 - half);
  ctx.lineTo(inset, height / 2 + half);

  // Right edge midpoint
  ctx.moveTo(width - inset - half, height / 2);
  ctx.lineTo(width - inset + half, height / 2);
  ctx.moveTo(width - inset, height / 2 - half);
  ctx.lineTo(width - inset, height / 2 + half);

  ctx.stroke();
  ctx.restore();
}

function drawArchiveStamp(
  ctx: Ctx,
  headerH: number,
  theme: { hudBracketColor: string; archiveStampBg: string; archiveStampText: string },
): void {
  const x = 32;
  const y = headerH + 16;
  const w = 160;
  const h = 28;
  const radius = 4;

  ctx.save();

  // Fill
  ctx.fillStyle = theme.archiveStampBg;
  fillRoundRect(ctx, x, y, w, h, radius);

  // Border at 0.6 alpha of hudBracketColor
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = theme.hudBracketColor;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, w, h, radius);
  ctx.globalAlpha = 1;

  // Label
  ctx.fillStyle = theme.archiveStampText;
  ctx.font = "12px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('◢ CLASSIFIED: BLADE-A', x + w / 2, y + h / 2 + 1);

  ctx.restore();
}
