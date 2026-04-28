// ─── drawHilt — saber hilt ─────────────────────────────────────
//
// Horizontal path renders the workbench's canvas-primitive hilt via
// `lib/blade/canvasHilt.ts::drawCanvasHilt`. Same pipeline the editor
// uses for the default 9 hilt styles (classic / graflex / thin-neck /
// maul / dooku / kylo / ahsoka / cal / minimal). Recipients of a
// shared card see the same hilt the user sees in the workbench.
//
// Vertical path still uses HiltRenderer SVG overlay because there's
// no canvas-primitive vertical pipeline yet (vertical layout is
// hidden in CrystalPanel's UI today; revisit when re-enabled).
//
// Custom modular SVG hilts (graflex-svg / mpp-svg / etc.) are
// deferred — the workbench has the SVG path but the saber card
// always uses the canvas-primitive default for share-artifact
// consistency. Custom hilt support on the card is a future
// enhancement once the editor's hilt picker UX stabilizes.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { HiltRenderer } from '@/components/hilt/HiltRenderer';
import {
  drawCanvasHilt,
  CANVAS_HILT_STYLES,
  DEFAULT_CANVAS_HILT_STYLE_ID,
} from '@/lib/blade/canvasHilt';

import type { CardContext, Ctx } from './cardTypes';
import { fillRoundRect, svgStringToImage } from './canvasUtils';

/** Emitter/blade overlap in logical px — keeps the blade flush against the hilt. */
const EMITTER_OVERLAP = 4;

/** Default assembly when the config doesn't declare one (vertical fallback only). */
const DEFAULT_ASSEMBLY_ID = 'graflex';

/** Accent color for the hilt SVG — neutral chrome (vertical fallback only). */
// Default hilt accent — used as a fallback if the theme doesn't override.
// Most themes do override via theme.hiltAccent.
const HILT_ACCENT_DEFAULT = 'rgb(178,182,192)';

/** Default canvas hilt style for share artifacts. Matches the editor. */
const DEFAULT_HILT_STYLE_ID = DEFAULT_CANVAS_HILT_STYLE_ID;

export async function drawHilt(card: CardContext): Promise<void> {
  const { layout } = card;
  if (layout.saberOrientation === 'vertical') {
    await drawHiltVertical(card);
  } else {
    drawHiltHorizontal(card);
  }
}

// ─── Horizontal hilt — workbench canvas-primitive pipeline ───

function drawHiltHorizontal(card: CardContext): void {
  const { ctx, layout, options } = card;
  const { config } = options;

  const heroCenterY = layout.heroY + layout.heroH / 2;

  // Style selection: read config.hiltId if present + map to a canvas
  // style; otherwise use the workbench default. Custom SVG-modular
  // hilts (e.g. 'graflex-svg', 'mpp-svg') are resolved to their
  // closest canvas equivalent for the share artifact — full SVG
  // hilt parity on the card is a deferred enhancement.
  const hiltId = config.hiltId;
  const styleId = resolveCanvasHiltStyle(hiltId);

  // Render at workbench's natural 1.0× scale so the hilt the recipient
  // sees on a shared card is byte-identical to what the user composed
  // in the editor. The layout's `hiltW` field is now a layout HINT
  // (used to reserve horizontal space for chrome alignment) rather
  // than a strict size — the hilt's actual rendered width is the
  // sum of its part widths.
  const scale = 1.0;

  // Right-align: hilt's right edge sits at bladeStartX - emitter overlap
  // so the blade hugs the emitter cap. drawCanvasHilt naturally extends
  // leftward from the bladeStartX it's given.
  const bladeStartForHilt = layout.bladeStartX - EMITTER_OVERLAP;

  drawCanvasHilt(ctx, {
    styleId,
    bladeStartX: bladeStartForHilt,
    centerY: heroCenterY,
    scale,
    bladeColor: config.baseColor,
  });
}

/** Map a hilt id (config.hiltId, possibly an SVG-modular id) to the
 *  closest canvas-primitive style. Today this is a thin defaulting
 *  layer; when full SVG-modular support lands on the card, this
 *  becomes the fallback path for older / unrecognised ids. */
function resolveCanvasHiltStyle(hiltId: string | undefined): string {
  if (!hiltId) return DEFAULT_HILT_STYLE_ID;
  // Any direct match against a canvas style → use it.
  if (CANVAS_HILT_STYLES.some((h) => h.id === hiltId)) return hiltId;
  // Common SVG-modular id mapping. Extend as needed.
  if (hiltId === 'graflex-svg' || hiltId === 'graflex') return 'graflex';
  if (hiltId === 'mpp-svg' || hiltId === 'mpp') return 'classic';
  if (hiltId === 'count-svg' || hiltId === 'count' || hiltId === 'dooku-canon') return 'dooku';
  if (hiltId === 'ren-vent-svg' || hiltId === 'ren-vent') return 'kylo';
  if (hiltId === 'fulcrum-pair-svg' || hiltId === 'fulcrum-pair' || hiltId === 'ahsoka-clone-wars') return 'ahsoka';
  if (hiltId === 'shoto-sage-svg' || hiltId === 'shoto-sage') return 'minimal';
  if (hiltId === 'zabrak-staff-svg' || hiltId === 'zabrak-staff') return 'maul';
  return DEFAULT_HILT_STYLE_ID;
}

// ─── Vertical hilt ───────────────────────────────────────────

async function drawHiltVertical(card: CardContext): Promise<void> {
  const { ctx, layout, options, theme } = card;
  const { config } = options;

  // For vertical, hiltW is the long-axis dimension (top-to-bottom of
  // grip); the short axis (horizontal width) derives from the SVG's
  // natural aspect. HiltRenderer with orientation='vertical' emits
  // emitter-at-top natural SVG, which suits a blade-pointing-up layout.
  const longAxisSize = layout.hiltW;
  const hiltTopY = layout.hiltY ?? (layout.heroY + layout.heroH - layout.hiltW);
  const hiltCenterX = layout.hiltX + layout.hiltH / 2;

  try {
    const hiltId = config.hiltId ?? DEFAULT_ASSEMBLY_ID;

    const svgMarkup = renderToStaticMarkup(
      createElement(HiltRenderer, {
        assemblyId: hiltId,
        orientation: 'vertical',
        longAxisSize,
        accentOverride: theme.hiltAccent ?? HILT_ACCENT_DEFAULT,
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

// ─── Stylized canvas-draw hilt (vertical fallback) ──────────
//
// `drawStylizedHilt` (horizontal) was retired when the horizontal path
// switched to `drawCanvasHilt` from `lib/blade/canvasHilt.ts`. The
// vertical fallback below is still alive for the dormant
// vertical-orientation path.

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
