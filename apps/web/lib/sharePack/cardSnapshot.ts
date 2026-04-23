// ─── Share Pack — Card Snapshot Orchestrator ───
//
// Renders the shareable Saber Card as a PNG blob. The actual drawing
// is delegated to modular per-region drawers in `./card/` — this file
// only composes them in z-order against a layout + theme.
//
// Module split:
//   card/cardTypes.ts      — CardContext, CardLayout, CardTheme, Chip, Ctx
//   card/cardLayout.ts     — DEFAULT_LAYOUT (+ agent D: OG/Instagram/Story)
//   card/cardTheme.ts      — DEFAULT_THEME (+ agent E: Light/Imperial/Jedi/Space)
//   card/drawBackdrop.ts   — background + HUD chrome (agent C)
//   card/drawHeader.ts     — top brand band
//   card/drawBlade.ts      — horizontal blade with bloom + tip cone
//   card/drawHilt.ts       — hilt (agent A: real SVG via HiltRenderer)
//   card/drawMetadata.ts   — title + spec + glyph + chips (agent B)
//   card/chips.ts          — chip drawing helpers (agent B)
//   card/drawQr.ts         — QR corner panel
//   card/drawFooter.ts     — bottom band with repo link + date
//   card/canvasUtils.ts    — shared drawing helpers

import { createQrSurface } from '@/lib/crystal/qrSurface';
import { DEFAULT_LAYOUT } from './card/cardLayout';
import { DEFAULT_THEME } from './card/cardTheme';
import { drawBackdrop } from './card/drawBackdrop';
import { drawHeader } from './card/drawHeader';
import { drawBlade } from './card/drawBlade';
import { drawHilt } from './card/drawHilt';
import { drawMetadata } from './card/drawMetadata';
import { drawQr } from './card/drawQr';
import { drawFooter } from './card/drawFooter';
import type { CardContext, CardSnapshotOptions, Ctx } from './card/cardTypes';

// ─── Public re-exports ───

export type {
  CardSnapshotOptions,
  CardLayout,
  CardTheme,
  Chip,
} from './card/cardTypes';
export {
  DEFAULT_LAYOUT,
  OG_LAYOUT,
  INSTAGRAM_LAYOUT,
  STORY_LAYOUT,
  LAYOUT_CATALOG,
  getLayout,
} from './card/cardLayout';
export {
  DEFAULT_THEME,
  LIGHT_THEME,
  IMPERIAL_THEME,
  JEDI_THEME,
  SPACE_THEME,
  THEME_CATALOG,
  getTheme,
} from './card/cardTheme';

/** Canonical card dimensions. Exposed for callers that need to size
 *  containers before invoking the render (e.g. modal previews). */
export const CARD_WIDTH = DEFAULT_LAYOUT.width;
export const CARD_HEIGHT = DEFAULT_LAYOUT.height;

// ─── Main ───

export async function renderCardSnapshot(options: CardSnapshotOptions): Promise<Blob> {
  const layout = options.layout ?? DEFAULT_LAYOUT;
  const theme = options.theme ?? DEFAULT_THEME;
  const outputWidth = options.width ?? layout.width;
  const outputHeight = options.height ?? layout.height;
  const scale = outputWidth / layout.width;

  // QR surface — flat canvas stamped onto the card
  const qr = await createQrSurface(options.glyph, {
    canvasSize: 512,
    errorCorrectionLevel: 'Q',
  });

  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? (new OffscreenCanvas(outputWidth, outputHeight) as unknown as HTMLCanvasElement)
      : document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) throw new Error('canvas context unavailable');

  ctx.scale(scale, scale);

  const card: CardContext = {
    ctx,
    options,
    layout,
    theme,
    qrCanvas: qr.canvas,
  };

  // Z-order matters: backdrop → header → blade → hilt (covers emitter
  // end of blade) → metadata → QR → footer.
  drawBackdrop(card);
  drawHeader(card);
  drawBlade(card);
  await drawHilt(card);
  drawMetadata(card);
  drawQr(card);
  drawFooter(card);

  qr.texture.dispose();

  // Return as PNG blob (OffscreenCanvas uses convertToBlob, HTMLCanvasElement uses toBlob).
  const maybeOffscreen = canvas as unknown as {
    convertToBlob?: (opts: { type: string }) => Promise<Blob>;
  };
  if (typeof maybeOffscreen.convertToBlob === 'function') {
    return await maybeOffscreen.convertToBlob({ type: 'image/png' });
  }
  return await new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/png',
      1.0,
    );
  });
}
