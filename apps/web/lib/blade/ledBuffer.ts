// ─── Uint8Array → LedBufferLike adapter ──────────────────────────────
//
// Engine-side captures (e.g. `BladeEngine.captureStateFrame`) return
// raw RGB byte buffers. The shared rasterizer + pipeline expect the
// `LedBufferLike` random-access interface; this wrapper bridges the
// two without copying.

import type { LedBufferLike } from './types';

/**
 * Wrap a raw RGB Uint8Array (length must be divisible by 3) as an
 * `LedBufferLike`. Read-only — does not copy the underlying buffer.
 */
export function ledBufferFrom(rgbBuffer: Uint8Array): LedBufferLike {
  const count = (rgbBuffer.length / 3) | 0;
  return {
    count,
    getR: (i) => rgbBuffer[i * 3],
    getG: (i) => rgbBuffer[i * 3 + 1],
    getB: (i) => rgbBuffer[i * 3 + 2],
  };
}
