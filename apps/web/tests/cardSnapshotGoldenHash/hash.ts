// ─── Card-snapshot golden-hash — region-masked pixel hashing ────────
//
// FNV-1a 32-bit, same hash function as the engine + renderer golden-
// hash files. The cross-platform challenge here is text rendering:
// Cairo (Linux CI, FreeType + Pango) and Core Graphics (macOS authoring,
// Core Text) rasterize the same glyphs differently — different
// hinting, different sub-pixel positioning, different α curves on the
// edges of strokes. PR #147's first attempt (8 card-snapshot tests
// with coarse 4×4 + 16-level luma quantization) still drifted enough
// to flake CI.
//
// === Approach A — region masking ===
//
// Solution shipped here: zero out every text-bearing region in the
// rendered card BEFORE hashing. A flat mask color (chosen to match
// the theme's metadata band so the masked regions don't introduce
// hash sensitivity to the mask color itself) is painted over each
// known text rect:
//
//   • Header band (full top headerH stripe — title + accent both)
//   • Footer band (full bottom footerH stripe — repo url + date)
//   • Metadata column (title/spec/glyph label/glyph text/chips)
//   • Archive stamp ("◢ CLASSIFIED: BLADE-A" — drawBackdrop)
//   • QR "SCAN TO OPEN" label (just below the QR panel)
//
// What's left after masking:
//
//   • Backdrop gradients + grid dots + HUD brackets + crosshairs +
//     vignette + scanlines + watermark glyph (Orbitron `◈`).
//   • The blade pipeline itself (capsule + bloom + tip cone).
//   • The hilt (canvas-primitive).
//   • The QR code modules (pixel-aligned squares).
//
// All of those are pixel-aligned arithmetic with no font hinting — the
// same path that makes the renderer-level golden-hash work cross-
// platform. We trade text-region regression coverage for cross-OS
// stability; text drift is better caught by component-level tests
// (`drawMetadata.test.ts` etc.) than by image hashes.
//
// NOTE: the watermark glyph IS still text, but it's rendered ONCE per
// theme via `ctx.fillText('◈', ...)` at a single 320px size. Modern
// Cairo and Core Graphics agree closely enough on a single isolated
// large glyph at 7% alpha that the resulting hash is stable across
// platforms (verified empirically — the renderer-level hash for
// Darksaber, which has no text but does have similar low-α pixel
// math, is byte-stable across local + CI). If a future Cairo update
// shifts that glyph's rasterization, this is the first hash that will
// flip. Mask the watermark band too if it becomes a problem.

import type { Canvas } from 'canvas';
import type { CardLayout } from '@/lib/sharePack/card/cardTypes';

// ─── Browser-canvas-shape (subset used by getImageData) ──────────────
interface MinimalCanvas {
  width: number;
  height: number;
  getContext(type: '2d'): {
    fillStyle: string | CanvasGradient | CanvasPattern;
    fillRect(x: number, y: number, w: number, h: number): void;
    getImageData(x: number, y: number, w: number, h: number): {
      data: Uint8ClampedArray | Uint8Array;
    };
  } | null;
}

function fnv1aBytes(buffer: Uint8Array | Uint8ClampedArray): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < buffer.length; i++) {
    hash ^= buffer[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Hash every pixel of a canvas. Returns 8-char hex. Sensitive to AA;
 *  used by the FNV drift sentinel only. */
export function hashCanvas(canvas: Canvas | MinimalCanvas): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('hashCanvas: no 2D context');
  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  return fnv1aBytes(imgData.data);
}

/**
 * Region-masked hash — zeros out text-bearing rects, then hashes the
 * remaining pixel buffer. This is the load-bearing hash for the card
 * snapshot suite.
 *
 * Mutates the canvas in place (paints solid mask rectangles over the
 * text regions). Test code creates a fresh canvas per case anyway,
 * so the mutation is harmless.
 *
 * Mask color: solid black (0, 0, 0, 255). Chosen so any accidental
 * sub-pixel bleed at the mask edges quantizes the same way on both
 * platforms — the alternative (transparent mask) would expose the
 * underlying text drift. Black is a deterministic constant that both
 * Cairo and Core Graphics agree on.
 */
export function hashCanvasWithMasks(
  canvas: Canvas | MinimalCanvas,
  layout: CardLayout,
): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('hashCanvasWithMasks: no 2D context');
  const { width, height } = canvas;

  // Black mask — see header comment for rationale.
  ctx.fillStyle = '#000000';

  // Region 1: full header band (drawHeader text "◈ KYBERSTATION" +
  // "ARCHIVE DATA CARD · v1"). The band height includes the 1px
  // separator beneath, but extending the mask one extra pixel
  // ensures the separator's anti-aliased pixels don't drift either.
  ctx.fillRect(0, 0, width, layout.headerH + 1);

  // Region 2: full footer band (drawFooter text — repo url + date).
  // Same one-pixel slop on the upper edge to swallow the separator.
  ctx.fillRect(0, height - layout.footerH - 1, width, layout.footerH + 1);

  // Region 3: metadata column. drawMetadata writes from
  // `metadataTopY` (title baseline, +Y is downward, so subtract a few
  // px to cover anything that sits above the baseline) down through
  // the chip row at `metadataTopY + 108`. Chips themselves are
  // CHIP_HEIGHT (24-30px); allow ~80px of vertical headroom so the
  // chip row's wraparound + future additions stay covered. Width:
  // mask the full `metadataMaxWidth` (which is what the drawer truncates
  // text against) starting at `metadataLeftX`.
  const metadataMaskTop = Math.max(layout.metadataTopY - 30, layout.headerH);
  const metadataMaskBottom = Math.min(
    layout.metadataTopY + 200,
    height - layout.footerH,
  );
  ctx.fillRect(
    layout.metadataLeftX - 4,
    metadataMaskTop,
    layout.metadataMaxWidth + 8,
    metadataMaskBottom - metadataMaskTop,
  );

  // Region 4: archive stamp on backdrop. Position is fixed in
  // drawBackdrop at `(32, headerH + 16)` with size ~180×30. Mask a
  // generous box.
  ctx.fillRect(20, layout.headerH + 4, 200, 36);

  // Region 5: QR "SCAN TO OPEN" label. drawQr writes the label
  // BELOW the QR panel at `qrY + qrSize + qrLabelGap`. The text is
  // ~10-13px tall; mask 24px to cover the label rect with margin.
  const qrLabelTop = layout.qrY + layout.qrSize + Math.max(0, layout.qrLabelGap - 4);
  const qrLabelHeight = 24;
  ctx.fillRect(
    layout.qrX - 4,
    qrLabelTop,
    layout.qrSize + 8,
    qrLabelHeight,
  );

  // Hash the masked image.
  const imgData = ctx.getImageData(0, 0, width, height);
  return fnv1aBytes(imgData.data);
}
