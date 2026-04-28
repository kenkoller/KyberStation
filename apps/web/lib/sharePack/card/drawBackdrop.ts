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
import type { CardContext, CardLayout, Ctx } from './cardTypes';

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

  // 3. Blueprint / engineering-drawing details — replaces the former
  //    large watermark glyph with measurement grammar (dimension line
  //    spanning the blade length, edge tick rails, angle marker).
  //    All low-alpha so the saber hero still wins.
  drawBlueprintDetails(ctx, layout, options.config.ledCount ?? 144, theme.hudBracketColor);

  // 4. Scanline texture — subtle archive feel.
  ctx.save();
  ctx.globalAlpha = theme.scanlineAlpha;
  ctx.fillStyle = theme.scanlineColor;
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();

  // 5. Edge vignette — tightens the corners.
  drawEdgeVignette(ctx, width, height, theme.vignetteColor);

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

// ─── Blueprint / engineering-drawing backdrop detail ───
//
// Replaces the large ◈ watermark glyph with a quieter engineering
// grammar: a blade-length dimension line, tick rails along the long
// edges, and a small angle marker in one corner. Low-alpha so the
// saber hero reads first; the grammar only emerges on close read.
function drawBlueprintDetails(
  ctx: Ctx,
  layout: CardLayout,
  ledCount: number,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;

  // — Blade-length dimension line —
  // Silent engineering grammar below the hero. No text label to fight
  // the metadata title typography; shaft + end-ticks + triangle arrows
  // read as a dimension annotation without needing a number printed.
  // (inches computed but unused — intentional, keeps the signal clean;
  // can add a corner legend later if we want the number surfaced.)
  const dimY = layout.heroY + layout.heroH + 10;
  const dimX1 = layout.bladeStartX;
  const dimX2 = layout.bladeEndX;
  ctx.globalAlpha = 0.22;
  // Horizontal shaft
  ctx.beginPath();
  ctx.moveTo(dimX1, dimY);
  ctx.lineTo(dimX2, dimY);
  ctx.stroke();
  // End ticks
  ctx.beginPath();
  ctx.moveTo(dimX1, dimY - 4);
  ctx.lineTo(dimX1, dimY + 4);
  ctx.moveTo(dimX2, dimY - 4);
  ctx.lineTo(dimX2, dimY + 4);
  ctx.stroke();
  // Arrow triangles
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.moveTo(dimX1 + 6, dimY - 3);
  ctx.lineTo(dimX1, dimY);
  ctx.lineTo(dimX1 + 6, dimY + 3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(dimX2 - 6, dimY - 3);
  ctx.lineTo(dimX2, dimY);
  ctx.lineTo(dimX2 - 6, dimY + 3);
  ctx.fill();
  // Used-only local (keeps TS happy — inches is consumed by the note
  // format string inside the if branch if we ever re-enable it).
  void Math.round(ledCount / 3.66);

  // — Vertical tick rail along the left edge —
  // Engineering-ruler look; 10px step, every 5th tick longer.
  ctx.globalAlpha = 0.2;
  const railX = 14;
  const railTop = layout.headerH + 30;
  const railBottom = layout.height - layout.footerH - 30;
  ctx.beginPath();
  for (let y = railTop, i = 0; y <= railBottom; y += 10, i++) {
    const long = i % 5 === 0;
    ctx.moveTo(railX, y);
    ctx.lineTo(railX + (long ? 8 : 4), y);
  }
  ctx.stroke();

  // — Small angle marker in the bottom-right corner —
  // Quadrant arc + degree marks. Pure chrome; no text.
  const cx = layout.width - 70;
  const cy = layout.height - layout.footerH - 70;
  const rad = 40;
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, -Math.PI / 2, 0, false);
  ctx.stroke();
  // Degree ticks every 15°
  ctx.beginPath();
  for (let deg = 0; deg <= 90; deg += 15) {
    const a = -Math.PI / 2 + (deg * Math.PI) / 180;
    const long = deg % 45 === 0;
    const ri = rad - (long ? 7 : 3);
    ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    ctx.lineTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri);
  }
  ctx.stroke();
  // Axis lines
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + rad, cy);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - rad);
  ctx.stroke();

  ctx.restore();
}

function drawEdgeVignette(
  ctx: Ctx,
  width: number,
  height: number,
  outerColor: string,
): void {
  const cx = width / 2;
  const cy = height / 2;
  const inner = Math.min(width, height) * 0.45;
  const outer = Math.hypot(cx, cy);
  const vignette = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  // Inner stop derives from the outer color but at 0 alpha — works for
  // any rgba/hsla value the theme passes; the radial fade reads cleanly
  // across all five themes.
  vignette.addColorStop(0, transparentize(outerColor));
  vignette.addColorStop(1, outerColor);
  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Replace the alpha component of an `rgba(...)` / `hsla(...)` color
 *  with 0. Used by the vignette inner stop so the radial fade always
 *  starts fully transparent regardless of theme. Falls back to the
 *  input string for non-rgba/hsla colors (the gradient still works
 *  but the inner stop won't necessarily be transparent — author the
 *  theme value with rgba). */
function transparentize(color: string): string {
  // Match rgba(r,g,b,a) and hsla(h,s%,l%,a)
  return color.replace(/(rgba?|hsla?)\(([^)]+)\)/, (_, fn, args) => {
    const parts = args.split(',').map((p: string) => p.trim());
    if (parts.length === 4) {
      parts[3] = '0';
    } else if (parts.length === 3) {
      parts.push('0');
    }
    const fnWithAlpha = fn.endsWith('a') ? fn : `${fn}a`;
    return `${fnWithAlpha}(${parts.join(', ')})`;
  });
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
