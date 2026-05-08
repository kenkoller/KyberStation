import { BaseStyle } from '../BaseStyle.js';
import type { RGB, StyleContext } from '../../types.js';

/**
 * Xenopixel Blade Effect ID 4 — Candy.
 *
 * Multi-color segment effect unique to Xenopixel. The blade is
 * divided into ~5 segments, each a different color derived from
 * baseColor via hue rotation. Segments slowly pulse but don't
 * dramatically change. No direct ProffieOS equivalent.
 */
export class XenoCandyStyle extends BaseStyle {
  readonly id = 'xeno-candy';
  readonly name = 'Xeno Candy';
  readonly description = 'Multi-color segments with slow pulsing — unique to Xenopixel.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Divide blade into 5 segments.
    const segmentCount = 5;
    const segIndex = Math.min(segmentCount - 1, Math.floor(position * segmentCount));
    // Fractional position within the segment (for soft edges).
    const segFrac = (position * segmentCount) - segIndex;

    // Rotate hue by ~72 degrees per segment (360/5). Use a simple
    // RGB hue-rotation via channel shuffling for speed.
    const hueShift = (segIndex / segmentCount) * 360;
    const rotated = rotateHue(base, hueShift);

    // Slow per-segment brightness pulse — each segment has a
    // slightly offset phase so they don't all pulse in sync.
    const phase = segIndex * 1.3 + time * 0.8;
    const pulse = 0.85 + Math.sin(phase) * 0.15;

    // Soft edge blending at segment boundaries.
    const edgeSoftness = 0.1;
    let edgeFade = 1;
    if (segFrac < edgeSoftness) {
      edgeFade = segFrac / edgeSoftness;
    } else if (segFrac > 1 - edgeSoftness) {
      edgeFade = (1 - segFrac) / edgeSoftness;
    }
    const bright = pulse * (0.85 + edgeFade * 0.15);

    return {
      r: rotated.r * bright,
      g: rotated.g * bright,
      b: rotated.b * bright,
    };
  }
}

/**
 * Rotate the hue of an RGB color by `degrees` using the YIQ-based
 * rotation approximation. Good enough for a visual effect.
 */
function rotateHue(color: RGB, degrees: number): RGB {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;

  // Rotation matrix in RGB space around the grey axis (1,1,1).
  const oneThird = 1 / 3;
  const sqrtThird = Math.sqrt(oneThird);

  const rx = r * (cos + (1 - cos) * oneThird)
           + g * (oneThird * (1 - cos) - sqrtThird * sin)
           + b * (oneThird * (1 - cos) + sqrtThird * sin);
  const gx = r * (oneThird * (1 - cos) + sqrtThird * sin)
           + g * (cos + (1 - cos) * oneThird)
           + b * (oneThird * (1 - cos) - sqrtThird * sin);
  const bx = r * (oneThird * (1 - cos) - sqrtThird * sin)
           + g * (oneThird * (1 - cos) + sqrtThird * sin)
           + b * (cos + (1 - cos) * oneThird);

  return {
    r: Math.max(0, Math.min(255, rx * 255)),
    g: Math.max(0, Math.min(255, gx * 255)),
    b: Math.max(0, Math.min(255, bx * 255)),
  };
}
