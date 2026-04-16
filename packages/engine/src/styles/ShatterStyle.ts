import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

/**
 * Broken crystal segment effect.
 *
 * The blade is divided into 8-12 segments of varying size.  Each segment
 * pulses independently at its own rate and phase.  Segment boundaries
 * glow as bright "crack" lines (1-2 pixels of white/near-white).
 */
export class ShatterStyle extends BaseStyle {
  readonly id = 'shatter';
  readonly name = 'Shatter';
  readonly description = 'Blade split into crystal segments each pulsing independently, with bright crack lines at boundaries.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const t = time;
    const ledCount = Math.max(1, context.config.ledCount ?? 132);

    // ── Generate segment boundaries deterministically ─────────────────────
    // We need the same boundaries for every pixel call within a frame.
    // Segment count: 8-12 random segments.
    const numSegments = 8 + Math.floor(noise(0.5, 13) * 5); // 8-12, constant

    // Build segment boundary positions (0-1) deterministically
    // Use fixed seeds per segment index so boundaries never change.
    const boundaries: number[] = [0];
    // Distribute boundaries unevenly: each gets a random fraction of remaining space
    let remaining = 1.0;
    for (let i = 0; i < numSegments - 1; i++) {
      const fraction = 0.05 + noise(i * 2.71, 19) * 0.2; // 5-25% of total
      const boundary = boundaries[i] + Math.min(remaining - 0.05 * (numSegments - 1 - i), fraction);
      boundaries.push(boundary);
      remaining -= (boundary - boundaries[i]);
    }
    boundaries.push(1.0);

    // ── Find which segment this position belongs to ───────────────────────
    const crackWidth = 1.5 / ledCount; // ~1.5 pixels

    let segmentIndex = -1;
    let distToBoundary = 1.0;

    for (let i = 0; i < boundaries.length - 1; i++) {
      const lo = boundaries[i];
      const hi = boundaries[i + 1];
      if (position >= lo && position < hi) {
        segmentIndex = i;
        // Distance to nearest boundary (normalised 0-1)
        const distLo = position - lo;
        const distHi = hi - position;
        distToBoundary = Math.min(distLo, distHi);
        break;
      }
    }

    // Handle edge case (position == 1.0)
    if (segmentIndex === -1) {
      segmentIndex = numSegments - 1;
      distToBoundary = position - boundaries[numSegments - 1];
    }

    // ── Crack detection ───────────────────────────────────────────────────
    if (distToBoundary < crackWidth) {
      // Crack line: blend toward white, brighter at the very edge
      const crackT = 1 - distToBoundary / crackWidth;
      const white: RGB = { r: 255, g: 255, b: 255 };
      const crackColor = lerpColor(base, white, crackT * 0.85);
      return crackColor;
    }

    // ── Segment pulsing ───────────────────────────────────────────────────
    // Each segment has its own pulse rate (0.3-1.5 Hz) and phase.
    const pulseRate = 0.3 + noise(segmentIndex * 1.618, 5) * 1.2;
    const pulsePhase = noise(segmentIndex * 2.39, 11) * Math.PI * 2;
    const pulse = Math.sin(t * pulseRate * Math.PI * 2 + pulsePhase) * 0.5 + 0.5;

    // Brightness oscillates between dimFactor and fullBright
    const dimFactor = 0.25;
    const fullBright = 0.95;
    const bright = dimFactor + pulse * (fullBright - dimFactor);

    // ── Per-segment subtle hue tint ───────────────────────────────────────
    // Vary the color slightly between segments using a small tint offset
    const tintShift = (noise(segmentIndex * 3.14, 23) - 0.5) * 0.2;
    const tinted: RGB = {
      r: Math.min(255, base.r * (1 + tintShift * (base.r < 128 ? 1 : -0.5))),
      g: Math.min(255, base.g * (1 - tintShift * 0.3)),
      b: Math.min(255, base.b * (1 + tintShift * 0.5)),
    };

    return {
      r: tinted.r * bright,
      g: tinted.g * bright,
      b: tinted.b * bright,
    };
  }
}
