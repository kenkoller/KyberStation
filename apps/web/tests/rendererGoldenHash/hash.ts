// ─── Renderer golden-hash — pixel-buffer hash helpers ───────────────
//
// FNV-1a 32-bit, same hash function as the engine-level golden test
// (`apps/web/tests/bladeEngineGoldenHash.test.ts`). Stable across
// platforms + node versions per FNV spec; cheap to compute on a
// canvas-sized RGBA buffer (1200×675 × 4 = ~3.2 MB → ~30 ms on M1).
//
// Two flavors:
//   • hashCanvas       — full-fidelity hash of every pixel + α channel.
//                        Sensitive to platform AA differences; preferred
//                        when CI runs on the same OS as authoring.
//   • hashCanvasCoarse — quantize to 16 luminance buckets in 4×4 tiles
//                        before hashing. Robust against subpixel AA
//                        drift between Mac authoring + Linux CI; trades
//                        precision for portability. Documented as the
//                        escape hatch in the per-test files; full-
//                        fidelity ships first, fall back if CI flakes.

import type { Canvas } from 'canvas';

// ─── Browser-canvas-shape (subset used by getImageData) ──────────────
interface MinimalCanvas {
  width: number;
  height: number;
  getContext(type: '2d'): {
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

/**
 * Hash every pixel of a canvas. Returns 8-char hex.
 *
 * Uses the canvas's full pixel buffer — RGBA. Platform-sensitive; if
 * CI flakes on AA differences, fall back to `hashCanvasCoarse`.
 */
export function hashCanvas(canvas: Canvas | MinimalCanvas): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('hashCanvas: no 2D context');
  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  // node-canvas typings give Uint8ClampedArray; the FNV hash treats
  // both the same since it reads byte-by-byte.
  return fnv1aBytes(imgData.data);
}

/**
 * Coarse hash — quantize to 16 luminance buckets in 4×4 pixel tiles
 * before hashing. Robust against platform AA drift. Use as the
 * escape hatch when full-fidelity hashes flake on Linux CI.
 *
 * Tile size is 4×4 → 1200×675 → 300×169 luma cells → 50,700 bytes.
 * 16-level quantization (>>4) folds AA edges into the same bucket
 * unless they cross the bucket boundary.
 */
export function hashCanvasCoarse(canvas: Canvas | MinimalCanvas): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('hashCanvasCoarse: no 2D context');
  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const tileSize = 4;
  const tilesX = Math.ceil(width / tileSize);
  const tilesY = Math.ceil(height / tileSize);
  const quantized = new Uint8Array(tilesX * tilesY);
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      let sum = 0;
      let count = 0;
      const xMax = Math.min((tx + 1) * tileSize, width);
      const yMax = Math.min((ty + 1) * tileSize, height);
      for (let y = ty * tileSize; y < yMax; y++) {
        for (let x = tx * tileSize; x < xMax; x++) {
          const idx = (y * width + x) * 4;
          // ITU-R BT.601 luminance; α-multiplied to avoid transparent
          // pixels carrying weight. The α channel is read but not
          // used independently.
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const luma = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
          sum += luma;
          count++;
        }
      }
      quantized[ty * tilesX + tx] = (Math.round(sum / count) >> 4) & 0x0f;
    }
  }
  return fnv1aBytes(quantized);
}
