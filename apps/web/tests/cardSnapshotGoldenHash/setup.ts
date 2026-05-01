// ─── Card-snapshot golden-hash — node-canvas test setup ─────────────
//
// Bridges `renderCardSnapshot` onto node-canvas. The card pipeline is
// heavier than the blade renderer it sits on top of:
//
//   • `renderCardSnapshot` allocates an OffscreenCanvas (not a DOM
//     canvas) and calls `convertToBlob` to produce its PNG.
//   • `createQrSurface` calls `document.createElement('canvas')` and
//     errors if `document` is undefined (it's the same module the live
//     editor uses for the 3D crystal QR decal).
//
// We polyfill BOTH globals so tests can run end-to-end without a DOM.
// `document.createElement('canvas')` returns a real node-canvas Canvas;
// `OffscreenCanvas` does the same. The two must return the same Canvas
// shape so the mixed-call-site code in cardSnapshot.ts works.
//
// CRITICAL: must return ACTUAL node-canvas `Canvas` instances. When
// drawHilt's `drawCanvasHilt` (or any drawer) calls `ctx.drawImage`
// against a wrapper class that holds a Canvas internally, node-canvas
// rejects with "Image or Canvas expected." Same trap as the renderer
// harness — use a function constructor that returns a Canvas directly.

import { createCanvas, loadImage, Image, type Canvas } from 'canvas';

/** Create a real node-canvas instance suitable for getImageData / putImageData. */
export function createTestCanvas(width: number, height: number): Canvas {
  return createCanvas(width, height);
}

/** Minimal `document.createElement` polyfill that returns node-canvas Canvases.
 *  Card pipeline only ever asks for 'canvas'; everything else is a no-op
 *  best-effort. */
function makeMinimalDocument(): { createElement: (tag: string) => unknown } {
  return {
    createElement(tag: string): unknown {
      if (tag === 'canvas') {
        // Width/height get set by the caller after construction. Start
        // at 1×1 so it's a valid Canvas right away.
        return createCanvas(1, 1);
      }
      // Anything else: return a minimal stub. Card drawers don't reach
      // for non-canvas elements but loadImage / svgStringToImage might
      // — those paths still go through `Image`, not document.
      return { tagName: tag.toUpperCase() };
    },
  };
}

/**
 * Install canvas-shaped globals on `globalThis`. Idempotent — call from
 * `beforeAll` and we'll wire everything up once.
 *
 * Returns a `restore()` callback for clean teardown.
 */
export function installCanvasGlobals(): () => void {
  const prev = {
    OffscreenCanvas: (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas,
    Image: (globalThis as { Image?: unknown }).Image,
    document: (globalThis as { document?: unknown }).document,
  };

  // Polyfill OffscreenCanvas → node-canvas Canvas. Same constructor
  // pattern as the bladeRenderer harness — function form returns a real
  // Canvas so drawImage's prototype check passes.
  function OffscreenCanvasPolyfill(this: unknown, width: number, height: number): Canvas {
    return createCanvas(width, height);
  }
  (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas =
    OffscreenCanvasPolyfill as unknown as typeof OffscreenCanvas;

  (globalThis as { Image?: unknown }).Image = Image;

  // Card pipeline calls `createQrSurface` which uses
  // `document.createElement('canvas')`. The renderer harness leaves
  // `document` undefined; the card harness MUST provide one. Use a
  // minimal stub so the rest of the DOM API surface stays inert.
  if (typeof prev.document === 'undefined') {
    (globalThis as { document?: unknown }).document = makeMinimalDocument();
  }

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
      delete (globalThis as { document?: unknown }).document;
    } else {
      (globalThis as { document?: unknown }).document = prev.document;
    }
  };
}

// `loadImage` re-exported for tests that need to decode raster sources
// directly. Not used in the current suite but kept on the surface for
// future extensions (e.g. a real screenshot regression check).
export { loadImage };
