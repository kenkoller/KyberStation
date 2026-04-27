// ─── Share Pack — Card Snapshot Orchestrator ───
//
// Renders the shareable Saber Card as a PNG blob (`renderCardSnapshot`)
// or an animated GIF blob (`renderCardGif`). The actual drawing is
// delegated to modular per-region drawers in `./card/` — this file
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

import { captureSequence } from '@kyberstation/engine';
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
import { encodeGifStreamed } from './gifEncoder';
import {
  drawWorkbenchBlade,
  ledBufferFrom,
} from './bladeRenderHeadless';
import type {
  CardContext,
  CardSnapshotOptions,
  Ctx,
} from './card/cardTypes';

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

// ─── Animated GIF rendering ───────────────────────────────────────────
//
// `renderCardGif` is a sibling of `renderCardSnapshot`: same chrome +
// layout + theme, but the blade is rendered using the v0.14 workbench
// pipeline (`./bladeRenderHeadless.ts`) and animated across N frames.
// Two variants in Sprint 1:
//
//   • 'idle'      — 1s loop of the steady-state ON shimmer.
//   • 'ignition'  — full 2.5s PREON → IGNITING → ON → RETRACTING → OFF.
//
// Per-frame inputs:
//
//   The engine produces a `Uint8Array` of LED RGB triples for every
//   frame. The headless workbench renderer reads each LED's color
//   directly — partial-ignition states render as partial brightness
//   along the LED strip without us scaling `bladeEndX` (the engine
//   already zeros unlit LEDs).
//
// Memory:
//
//   The render loop reuses a single output canvas. Per frame:
//     1. clear the canvas
//     2. redraw all chrome + the workbench blade
//     3. push the canvas into the encoder via gif.js's `copy: true`
//        (which snapshots pixel data immediately, freeing the canvas
//        for the next frame)
//
//   Hilt SVG → HTMLImageElement decode is the largest per-frame cost.
//   Future optimisation: render the hilt to a buffer canvas once, then
//   `drawImage` it per frame. Sprint 1 keeps the simple shape.

export type GifVariant = 'idle' | 'ignition';

export interface RenderCardGifOptions extends CardSnapshotOptions {
  variant: GifVariant;
  /** Override the per-variant default fps. Default: 24. */
  fps?: number;
  /** Override the per-variant default duration in ms. */
  durationMs?: number;
  /** GIF encoder quality: 1 (best) → 30 (worst). Default 10. */
  quality?: number;
  /** GIF worker URL. Default '/gif.worker.js'. */
  workerScript?: string;
}

/** Per-variant defaults — shared with the test seam below.
 *
 *  GIFs are share artifacts, not print-quality cards; we trade a bit
 *  of visual fidelity for file size. The brief targets:
 *    • idle      < 2 MB
 *    • ignition  < 5 MB
 *
 *  At 1200×675 (the default Saber Card size) the workbench-renderer
 *  pipeline (bloom + capsule + plateau-shaded core) produces ~6 MB
 *  per second of clip after gif.js's palette quantisation — the rich
 *  per-pixel colour fights the 256-colour palette harder than the
 *  static stylised gradient does.
 *
 *  640 wide × 16:9 + 18 fps lands idle ≈ 1.7 MB, ignition ≈ 4 MB
 *  while still reading sharp on Discord / Twitter / iMessage previews.
 *  Callers can pass an explicit `width` / `fps` to render at higher
 *  fidelity for hosted use.
 */
export const GIF_VARIANT_DEFAULTS = {
  idle: { fps: 18, durationMs: 1000 },
  ignition: { fps: 18, durationMs: 2500 },
} as const satisfies Record<GifVariant, { fps: number; durationMs: number }>;

/** Default output width for animated GIFs. The blade is wide so we
 *  cap by width and let height fall out of the layout aspect ratio. */
const DEFAULT_GIF_OUTPUT_WIDTH = 640;

// ─── Test seam: per-frame card-frame renderer ─────────────────────────
//
// The default per-frame renderer invokes the full chrome + the
// workbench blade pipeline. Tests inject a stub that's a pure no-op
// so the orchestration can be exercised in node without a real DOM
// canvas / SVG decoder. Set to `null` to restore the default.
// Production code never touches this — it's exported only for test
// wiring.

export interface CardFrameContext {
  /** Composed card-render context (chrome + layout + theme + qr). */
  card: CardContext;
  /** Engine LED buffer for this frame (3 × ledCount RGB triplets). */
  ledBuffer: Uint8Array;
  /** Layout-space scaling — caller has already applied it to `ctx`. */
  scale: number;
}

export type CardFrameRenderer = (
  frame: CardFrameContext,
) => void | Promise<void>;

const defaultCardFrameRenderer: CardFrameRenderer = async (frame) => {
  const { card, ledBuffer, scale } = frame;
  drawBackdrop(card);
  drawHeader(card);
  drawWorkbenchBladeOntoCard(card, ledBuffer, scale);
  await drawHilt(card);
  drawMetadata(card);
  drawQr(card);
  drawFooter(card);
};

/**
 * Bridge between the card layout (in logical layout coordinates) and
 * the workbench blade pipeline (in canvas pixels). Reads the layout's
 * blade box, maps it to physical pixels, then invokes the v0.14
 * workbench rasterizer + bloom. The card's logical-coordinate
 * transform on `card.ctx` has already been applied — we work entirely
 * in layout-space here.
 */
function drawWorkbenchBladeOntoCard(
  card: CardContext,
  ledBuffer: Uint8Array,
  scale: number,
): void {
  const { ctx, layout } = card;
  // Layout-space dims for the renderer. The capsule rasterizer reads
  // canvas-px values, but `ctx` is already scaled to layout-units, so
  // we keep everything in layout coords. The bloom mip canvases are
  // sized to layout dims — that's the SAME logical resolution the
  // capsule writes into, so the mip downsamples are consistent.
  const bladeStartPx = layout.bladeStartX;
  const bladeLenPx = layout.bladeEndX - layout.bladeStartX;
  const bladeYPx = layout.heroY + layout.heroH / 2;
  const coreH = layout.bladeThickness;

  drawWorkbenchBlade(
    ctx as CanvasRenderingContext2D,
    ledBufferFrom(ledBuffer),
    {
      bladeStartPx,
      bladeLenPx,
      bladeYPx,
      coreH,
      cw: layout.width,
      ch: layout.height,
    },
  );
  // `scale` is forwarded so future passes (rim glow / motion blur)
  // can adapt blur radii to the output resolution.
  void scale;
}

let cardFrameRendererOverride: CardFrameRenderer | null = null;

/** @internal — test seam. Pass `null` to restore the production renderer. */
export function __setCardFrameRendererForTesting(
  renderer: CardFrameRenderer | null,
): void {
  cardFrameRendererOverride = renderer;
}

// ─── createQrSurface seam — same pattern, lets tests skip the real
//   canvas + Three.js texture path. ──────────────────────────────────

type CreateQrFn = typeof createQrSurface;
let createQrSurfaceOverride: CreateQrFn | null = null;

/** @internal — test seam. Pass `null` to restore the production loader. */
export function __setCreateQrSurfaceForTesting(fn: CreateQrFn | null): void {
  createQrSurfaceOverride = fn;
}

// ─── Main: renderCardGif ──────────────────────────────────────────────

export async function renderCardGif(options: RenderCardGifOptions): Promise<Blob> {
  const variantDefaults = GIF_VARIANT_DEFAULTS[options.variant];
  const fps = options.fps ?? variantDefaults.fps;
  const durationMs = options.durationMs ?? variantDefaults.durationMs;
  const layout = options.layout ?? DEFAULT_LAYOUT;
  const theme = options.theme ?? DEFAULT_THEME;
  // GIFs default to a smaller output to keep file sizes share-friendly
  // — see GIF_VARIANT_DEFAULTS above. Callers can opt out via explicit
  // width / height to render at the layout's native dimensions.
  const widthCap = Math.min(layout.width, DEFAULT_GIF_OUTPUT_WIDTH);
  const outputWidth = options.width ?? widthCap;
  const outputHeight =
    options.height ?? Math.round((outputWidth / layout.width) * layout.height);
  const scale = outputWidth / layout.width;

  const frames = captureSequence({
    mode: options.variant === 'idle' ? 'idle-loop' : 'ignition-cycle',
    config: options.config,
    fps,
    durationMs,
  });

  // QR is identical across all frames — render once, reuse.
  const qrLoader = createQrSurfaceOverride ?? createQrSurface;
  const qr = await qrLoader(options.glyph, {
    canvasSize: 512,
    errorCorrectionLevel: 'Q',
  });

  // Single reusable output canvas. gif.js's `copy: true` snapshots the
  // pixels per addFrame, so we can repaint between frames safely.
  const canvas = createGifOutputCanvas(outputWidth, outputHeight);
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) {
    qr.texture.dispose();
    throw new Error('renderCardGif: 2D canvas context unavailable');
  }

  const renderFrame = cardFrameRendererOverride ?? defaultCardFrameRenderer;

  try {
    return await encodeGifStreamed(
      {
        width: outputWidth,
        height: outputHeight,
        fps,
        quality: options.quality ?? 10,
        workerScript: options.workerScript,
      },
      async (gif) => {
        for (let i = 0; i < frames.length; i++) {
          const ledBuffer = frames[i];
          const frameOptions: CardSnapshotOptions = {
            ...options,
            layout,
            theme,
          };

          // Reset transform, clear, then re-apply the layout-scale.
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, outputWidth, outputHeight);
          ctx.scale(scale, scale);

          const card: CardContext = {
            ctx,
            options: frameOptions,
            layout,
            theme,
            qrCanvas: qr.canvas,
          };

          await renderFrame({ card, ledBuffer, scale });

          ctx.restore();
          gif.addFrame(canvas);
        }
      },
    );
  } finally {
    qr.texture.dispose();
  }
}

/**
 * Creates a real `<canvas>` element for the GIF render loop.
 *
 * NOTE: gif.js's `addFrame` detects an HTMLCanvasElement via
 * `image.childNodes !== undefined`. OffscreenCanvas has no `childNodes`
 * and falls through to a plain-data fallback that throws "Invalid
 * image". Always use the DOM canvas for GIF output, even though the
 * static-PNG path in `renderCardSnapshot` happily uses OffscreenCanvas
 * via `convertToBlob`.
 *
 * In test / SSR contexts the OffscreenCanvas global is stubbed and
 * production never runs there, so `typeof document` is the better
 * dispatch.
 */
function createGifOutputCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  // SSR / test fallback — exercised by the renderCardGif test suite,
  // which stubs OffscreenCanvas globally to satisfy this branch.
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height) as unknown as HTMLCanvasElement;
  }
  throw new Error('renderCardGif: no canvas implementation available');
}
