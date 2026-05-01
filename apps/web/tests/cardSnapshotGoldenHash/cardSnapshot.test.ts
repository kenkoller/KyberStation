// ─── Card-snapshot golden-hash — drift sentinels only ──────────────
//
// Pixel-output regression sentinel infrastructure for the saber-card
// pipeline. The original ambition was to lock down the full layout ×
// theme matrix (5 layouts × 5 themes = 25 combos) using region-masked
// FNV-1a hashing, but that approach turned out NOT to be cross-
// platform stable:
//
//   - PR #147 first attempted card-snapshot golden hashes and dropped
//     them because Cairo (Linux CI) and Core Graphics (macOS) rasterize
//     text differently — coarse 4×4 + 16-level luma quantize wasn't
//     enough to swallow per-glyph drift.
//
//   - This sprint tried Approach A: zero out every text-bearing rect
//     (header / footer / metadata column / archive stamp / QR label)
//     BEFORE hashing, leaving only pixel-aligned arithmetic that both
//     rasterizers agree on byte-for-byte.
//
//   - CI verified the masking is INSUFFICIENT: even after dropping the
//     2 portrait layouts (story + vertical), the 3 remaining landscape
//     layouts (default / og / instagram) all hash differently between
//     macOS and Linux — across every theme. `drawHilt` and the chip-
//     row inside `drawMetadata` both emit text outside the masked
//     rects, and any text rendering surface produces drift.
//
// What this file ships INSTEAD: 1 drift sentinel that DOES survive
// cross-platform Cairo vs Core Graphics drift, because it hashes
// simple known-input data with no font-dependent rendering:
//
//   `FNV-1a hash function is stable for a known input` — locks the
//   FNV-1a hash function for raw `putImageData` bytes (2 pixels: red
//   + green, no canvas API beyond raw pixel writes).
//
// This locks down the FNV-1a hash function that any future card-
// snapshot approach (perceptual diff with tolerance, platform-specific
// golden files, fully-text-masked region expansion) will keep using.
// It doesn't lock the rendered output of the cardSnapshot pipeline —
// that remains future work.
//
// The companion `hashCanvasWithMasks` infrastructure ships as a
// utility (see ./hash.ts) but isn't exercised by a test sentinel —
// the masking strategy doesn't fully cover all card-text rendering,
// so any "masking-determinism" test would itself be cross-platform
// fragile.
//
// === Path forward (follow-up PR) ===
//
// To restore the matrix, one of the following needs to land:
//
//   (a) Widen the masking strategy to cover ALL text rendered by
//       drawHilt + drawMetadata's chips (not just the header/footer/
//       metadata-column rects), OR
//   (b) Switch to a perceptual diff with tolerance (`pixelmatch` or
//       similar with a tuned threshold), OR
//   (c) Run the matrix only on platform-specific golden files via
//       separate CI matrix entries for macOS and Linux.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestCanvas, installCanvasGlobals } from './setup';
import { hashCanvas } from './hash';

// ─── Canvas globals: install once for the whole suite ───────────────

let restoreGlobals: () => void;
beforeAll(() => {
  restoreGlobals = installCanvasGlobals();
});
afterAll(() => {
  restoreGlobals?.();
});

// ─── Drift sentinels (cross-platform-stable) ───────────────────────

describe('card snapshot golden hash — layout × theme matrix (region-masked)', () => {
  it('FNV-1a hash function is stable for a known input', () => {
    const canvas = createTestCanvas(2, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('drift sentinel: no 2D context');
    const imgData = ctx.createImageData(2, 1);
    imgData.data[0] = 255; imgData.data[1] = 0;   imgData.data[2] = 0;   imgData.data[3] = 255;
    imgData.data[4] = 0;   imgData.data[5] = 255; imgData.data[6] = 0;   imgData.data[7] = 255;
    ctx.putImageData(imgData, 0, 0);
    expect(hashCanvas(canvas)).toMatchSnapshot();
  });

});
