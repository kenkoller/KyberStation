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
  CardLayout,
  CardSnapshotOptions,
  CardTheme,
  Ctx,
} from './card/cardTypes';

// ─── Font-loading gate ───────────────────────────────────────────────
//
// Card chrome (drawHeader / drawMetadata / drawFooter / drawBackdrop's
// archive stamp + watermark) all draw with the Orbitron face declared
// via @font-face in `globals.css`. If `renderCardSnapshot` /
// `renderCardGif` is invoked before the browser has finished loading
// Orbitron, canvas falls back to a system serif/sans and the typography
// reads wrong on cold-cache renders ("Save share card" clicked
// immediately after page load).
//
// `document.fonts.load(spec)` returns a Promise that resolves once the
// browser has the matching font face available for canvas rendering.
// We target a single representative spec (the title size used in
// drawMetadata) — once that's loaded, every other Orbitron weight/size
// is loaded too because they're declared as part of the same family.
//
// Defensive: skip the wait entirely if the FontFaceSet API isn't
// available (Node tests, jsdom, older browsers). Production browsers
// all support it. The catch block handles the rare case where the
// Promise rejects (e.g. font URL 404'd) — we don't want to fail the
// render just because a shared utility couldn't preload a face.
async function waitForCardFonts(): Promise<void> {
  if (typeof document === 'undefined') return;
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts || typeof fonts.load !== 'function') return;
  try {
    await fonts.load('700 28px Orbitron');
  } catch {
    // Best-effort — never fail the render if the load Promise rejects.
  }
}

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
  // Wait for Orbitron to be available before drawing chrome — otherwise
  // canvas falls back to a system face on cold-cache renders.
  await waitForCardFonts();

  const layout = options.layout ?? DEFAULT_LAYOUT;
  const theme = options.theme ?? DEFAULT_THEME;
  const outputWidth = options.width ?? layout.width;
  const outputHeight = options.height ?? layout.height;
  const scale = outputWidth / layout.width;

  // QR surface — flat canvas stamped onto the card. Use a tighter 2-module
  // quiet zone than the 3D crystal surface (default 4) because the card
  // draws a white-card border around the QR itself — we don't need the
  // library's margin too. Tighter margin → denser modules at the same
  // display size → more legible at small on-screen renders.
  const qr = await createQrSurface(options.glyph, {
    canvasSize: 512,
    errorCorrectionLevel: 'Q',
    margin: 2,
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

  // Z-order matters: backdrop → header → hilt → blade (halo spills over
  // the hilt's emitter end, so the saber reads as a light source with
  // the hilt tucked behind) → metadata → QR → footer.
  drawBackdrop(card);
  drawHeader(card);
  await drawHiltIndirect(card);
  drawBlade(card);
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
//
// Sprint 1 variants:
//   • 'idle'      — 1s loop of the steady-state ON shimmer.
//   • 'ignition'  — full 2.5s PREON → IGNITING → ON → RETRACTING → OFF.
//
// Sprint 4 (Tier 3 effect-specific) variants:
//   • 'blast-deflect'  — ON-idle → blast at mid-blade → return. ~600ms.
//   • 'stab-tip-flash' — ON-idle → stab → return. ~500ms.
//   • 'swing-response' — ON-idle, sinusoidal swing-speed modulation. ~2s.
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
//     2. redraw chrome + the workbench blade
//     3. composite the pre-rendered hilt buffer (cached once, see below)
//     4. push the canvas into the encoder via gif.js's `copy: true`
//        (which snapshots pixel data immediately, freeing the canvas
//        for the next frame)
//
//   Hilt is rendered ONCE before the frame loop into a buffer the same
//   size as the output canvas, then `drawImage`-blitted per frame at
//   1:1 transform. Pixel-identical to per-frame draw; eliminates the
//   SVG decode (vertical layouts) and ~30 canvas state ops (horizontal
//   layouts) that would otherwise repeat N times. See `prerenderHilt`
//   below.

export type GifVariant =
  | 'idle'
  | 'ignition'
  | 'blast-deflect'
  | 'stab-tip-flash'
  | 'swing-response';

/** Map a GifVariant to the underlying captureSequence mode. */
const GIF_VARIANT_TO_CAPTURE_MODE = {
  idle: 'idle-loop',
  ignition: 'ignition-cycle',
  'blast-deflect': 'blast-deflect',
  'stab-tip-flash': 'stab-tip-flash',
  'swing-response': 'swing-response',
} as const satisfies Record<
  GifVariant,
  'idle-loop' | 'ignition-cycle' | 'blast-deflect' | 'stab-tip-flash' | 'swing-response'
>;

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
  // Sprint 4 effect-specific variants — short clips, 30 fps for smoother
  // motion. Sizes verified well under the 5MB brief.
  'blast-deflect': { fps: 30, durationMs: 600 },
  'stab-tip-flash': { fps: 30, durationMs: 500 },
  'swing-response': { fps: 30, durationMs: 2000 },
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
  /**
   * Pre-rendered hilt raster, sized to the output canvas (same physical
   * pixel dimensions). When present, the default frame renderer
   * composites this image instead of re-running the full
   * `drawHilt` pipeline (which decodes an SVG via `renderToStaticMarkup`
   * → `svgStringToImage` for vertical layouts, or paints a multi-stop
   * gradient hilt via canvas primitives for horizontal layouts).
   *
   * The hilt is invariant across the GIF's frame loop — config doesn't
   * change between frames — so this is safe to cache once and replay.
   * Output is byte-identical to the per-frame draw.
   *
   * `null` for `renderCardSnapshot` (single-frame, no benefit from
   * caching). `null` for tests that don't exercise the buffer path.
   */
  hiltBuffer?: HTMLCanvasElement | null;
}

export type CardFrameRenderer = (
  frame: CardFrameContext,
) => void | Promise<void>;

const defaultCardFrameRenderer: CardFrameRenderer = async (frame) => {
  const { card, ledBuffer, scale, hiltBuffer } = frame;
  drawBackdrop(card);
  drawHeader(card);
  drawWorkbenchBladeOntoCard(card, ledBuffer, scale);
  if (hiltBuffer) {
    // Cache hit — composite the pre-rendered hilt at the same physical
    // pixel coordinates we drew it at. We momentarily reset the layout
    // transform because the buffer is sized in OUTPUT pixels, not
    // layout units; restoring after.
    const { ctx } = card;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(hiltBuffer, 0, 0);
    ctx.restore();
  } else {
    await drawHiltIndirect(card);
  }
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
  const { ctx, layout, theme } = card;
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
      // Theme declares the composite — keeps GIF + PNG visually
      // identical for any given theme.
      bladeComposite: theme.bladeComposite,
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

// ─── drawHilt seam — lets tests count how many times the hilt is
//   actually painted, so they can verify the GIF render-loop cache
//   invariant (hilt rendered ONCE per N-frame render). ───────────────

type DrawHiltFn = typeof drawHilt;
let drawHiltOverride: DrawHiltFn | null = null;

/** @internal — test seam. Pass `null` to restore the production drawer. */
export function __setDrawHiltForTesting(fn: DrawHiltFn | null): void {
  drawHiltOverride = fn;
}

/** Indirected drawHilt — tests substitute via __setDrawHiltForTesting. */
async function drawHiltIndirect(card: CardContext): Promise<void> {
  const fn = drawHiltOverride ?? drawHilt;
  await fn(card);
}

// ─── Main: renderCardGif ──────────────────────────────────────────────

export async function renderCardGif(options: RenderCardGifOptions): Promise<Blob> {
  // Wait for Orbitron to be available before drawing chrome — otherwise
  // canvas falls back to a system face on cold-cache renders. Same gate
  // as renderCardSnapshot so PNG and GIF have identical typography.
  await waitForCardFonts();

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
    mode: GIF_VARIANT_TO_CAPTURE_MODE[options.variant],
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

  // Pre-render the hilt ONCE before the frame loop. The hilt is invariant
  // across the GIF's frame loop (config doesn't change between frames),
  // and `drawHilt` for vertical layouts decodes an SVG via
  // `renderToStaticMarkup` → `svgStringToImage` per call — repeating
  // that work N times for an N-frame GIF is pure waste.
  //
  // We run the pre-render unconditionally (even when a test override
  // is set) so the cache-once invariant is observable from any
  // injected frame renderer via the `frame.hiltBuffer` channel.
  // Tests that don't care about chrome can stub `drawHilt` itself via
  // `__setDrawHiltForTesting` to keep the prerender cheap.
  const hiltBuffer: HTMLCanvasElement | null = await prerenderHilt({
    options,
    layout,
    theme,
    qrCanvas: qr.canvas,
    outputWidth,
    outputHeight,
    scale,
  });

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

          await renderFrame({ card, ledBuffer, scale, hiltBuffer });

          ctx.restore();
          gif.addFrame(canvas);
        }
      },
    );
  } finally {
    qr.texture.dispose();
  }
}

// ─── Hilt prerender (GIF render-loop optimization) ────────────────────
//
// Renders the hilt ONCE into a buffer canvas the same physical-pixel
// size as the output canvas, with the same scale + coordinate system
// applied. The buffer can then be `drawImage`-blitted onto each frame
// at 1:1 transform, producing pixel-identical output without re-running
// the SVG decode (vertical layouts) or canvas-primitive painter
// (horizontal layouts) per frame.
//
// Per-frame cost reduction:
//   • Vertical: skips renderToStaticMarkup + svgStringToImage + the
//     async Image decode (~5-15ms per frame on cold cache).
//   • Horizontal: skips ~30 canvas state ops (gradients / paths / ribs).
//
// For a 60-frame swing-response GIF this is a 60× → 1× reduction.

interface PrerenderHiltOptions {
  options: RenderCardGifOptions;
  layout: CardLayout;
  theme: CardTheme;
  qrCanvas: HTMLCanvasElement;
  outputWidth: number;
  outputHeight: number;
  scale: number;
}

async function prerenderHilt(opts: PrerenderHiltOptions): Promise<HTMLCanvasElement | null> {
  const { options, layout, theme, qrCanvas, outputWidth, outputHeight, scale } = opts;

  // Same canvas type as the output canvas so blitting is a fast path
  // (no cross-type conversion). createGifOutputCanvas dispatches on
  // `typeof document` for environment portability.
  const buffer = createGifOutputCanvas(outputWidth, outputHeight);
  const bctx = buffer.getContext('2d') as Ctx | null;
  if (!bctx) return null;

  // Apply the same layout-units transform as the main canvas, so
  // drawHilt's coordinate math lands at the same physical pixels.
  bctx.scale(scale, scale);

  const card: CardContext = {
    ctx: bctx,
    options,
    layout,
    theme,
    qrCanvas,
  };

  try {
    await drawHiltIndirect(card);
    return buffer;
  } catch {
    // If prerender fails for any reason (e.g. SVG decode rejected),
    // fall back to per-frame drawHilt by returning null. The frame
    // loop's defaultCardFrameRenderer handles the null case.
    return null;
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
