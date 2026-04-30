// ─── Renderer golden-hash — node-canvas test setup ───────────────────
//
// Bridges the renderer pipelines (which expect browser canvas APIs)
// onto node-canvas's native implementation. The renderers are written
// against the lowest-common-denominator 2D canvas surface — they don't
// reach for `convertToBlob`, `WebGL`, or other browser-only paths in
// the code paths these tests exercise — so node-canvas's
// HTMLCanvasElement-shape return value drops in cleanly.
//
// We polyfill three browser globals that the renderers reach for:
//
//   • `OffscreenCanvas` — `bladeRenderHeadless.ts::createOffscreenCanvas`
//     prefers `document.createElement('canvas')` when `document` is
//     defined and falls back to `OffscreenCanvas`. We provide a
//     polyfill so callers can construct fresh canvases without a DOM.
//
//   • `document` — kept undefined here so the renderers fall through
//     to OffscreenCanvas. (Tests that need a fake document set it
//     explicitly.)
//
//   • Optional `Image` — node-canvas ships with `Image`. Some chrome
//     drawers use it for hilt SVG decode. Tests that don't exercise
//     hilt drawing don't care.
//
// The harness is deliberately unicast: it patches globalThis so any
// transitive import wiring picks it up automatically. No module
// alias required.

import { createCanvas, Canvas, Image } from 'canvas';

/** Create a real node-canvas instance suitable for getImageData / putImageData. */
export function createTestCanvas(width: number, height: number): Canvas {
  return createCanvas(width, height);
}

/**
 * Install canvas-shaped globals on `globalThis` so the renderer
 * pipeline can construct offscreen canvases. Idempotent — call from
 * the test file's `beforeAll` and we'll wire things up exactly once.
 *
 * Returns a `restore()` callback for tests that need to clean up.
 */
export function installCanvasGlobals(): () => void {
  // Save what was there before so we can restore in test teardown.
  const prev = {
    OffscreenCanvas: (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas,
    Image: (globalThis as { Image?: unknown }).Image,
    document: (globalThis as { document?: unknown }).document,
  };

  // Polyfill OffscreenCanvas as a thin trampoline to node-canvas's
  // `createCanvas`. CRITICAL: must return an ACTUAL node-canvas
  // `Canvas` instance — when the renderer later calls
  // `ctx.drawImage(offscreen, ...)` against another node-canvas
  // context, node-canvas's drawImage checks the prototype chain and
  // requires the source to be a node-canvas Canvas (or Image). A
  // wrapper class that holds a Canvas internally fails that check
  // with "Image or Canvas expected".
  //
  // Using a function rather than a class lets us return whatever we
  // want from `new OffscreenCanvas(w, h)`. JavaScript's `new` returns
  // the explicit object the constructor returns when it's an
  // object — so we hand back a real Canvas.
  function OffscreenCanvasPolyfill(this: unknown, width: number, height: number): Canvas {
    return createCanvas(width, height);
  }
  (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas =
    OffscreenCanvasPolyfill as unknown as typeof OffscreenCanvas;
  (globalThis as { Image?: unknown }).Image = Image;
  // Leave `document` alone — the renderer's createOffscreenCanvas
  // prefers document.createElement('canvas') when document exists,
  // and we explicitly want it to use the OffscreenCanvas polyfill in
  // tests.

  return () => {
    if (prev.OffscreenCanvas === undefined) {
      delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
    } else {
      (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = prev.OffscreenCanvas;
    }
    if (prev.Image === undefined) {
      delete (globalThis as { Image?: unknown }).Image;
    } else {
      (globalThis as { Image?: unknown }).Image = prev.Image;
    }
    if (prev.document === undefined) {
      // Was undefined — nothing to restore.
    } else {
      (globalThis as { document?: unknown }).document = prev.document;
    }
  };
}

