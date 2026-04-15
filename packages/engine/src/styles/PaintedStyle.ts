import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { noise } from '../noise.js';

/**
 * Painted style — user-defined color at specific blade positions with
 * smooth interpolation between painted regions.
 *
 * Reads `config.colorPositions: Array<{position, color, width}>`.
 * Falls back to baseColor if no positions are defined.
 */
export class PaintedStyle extends BaseStyle {
  readonly id = 'painted';
  readonly name = 'Painted';
  readonly description = 'Hand-painted colors at specific blade positions with smooth blending.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const positions = context.config.colorPositions;
    const shimmer = context.config.shimmer;

    let c: RGB;
    if (!positions || positions.length === 0) {
      c = context.config.baseColor;
    } else if (positions.length === 1) {
      c = positions[0].color;
    } else {
      c = this.samplePainted(position, positions);
    }

    // Apply shimmer
    const fl = 1 - shimmer * noise(position * 10 + time * 3);
    return {
      r: c.r * fl,
      g: c.g * fl,
      b: c.b * fl,
    };
  }

  private samplePainted(
    position: number,
    regions: Array<{ position: number; color: RGB; width: number }>,
  ): RGB {
    // Sort by position
    const sorted = [...regions].sort((a, b) => a.position - b.position);

    // Find the two closest regions
    let totalWeight = 0;
    let r = 0, g = 0, b = 0;

    for (const region of sorted) {
      const halfW = region.width / 2;
      const dist = Math.abs(position - region.position);
      if (dist <= halfW) {
        // Fully inside this region
        const weight = 1 - (dist / halfW);
        r += region.color.r * weight;
        g += region.color.g * weight;
        b += region.color.b * weight;
        totalWeight += weight;
      } else {
        // Smooth falloff beyond the region edge
        const falloff = Math.max(0, 1 - (dist - halfW) * 4);
        if (falloff > 0) {
          r += region.color.r * falloff;
          g += region.color.g * falloff;
          b += region.color.b * falloff;
          totalWeight += falloff;
        }
      }
    }

    if (totalWeight > 0) {
      return {
        r: Math.min(255, r / totalWeight),
        g: Math.min(255, g / totalWeight),
        b: Math.min(255, b / totalWeight),
      };
    }

    // Fall back to lerp between nearest regions
    if (position <= sorted[0].position) return sorted[0].color;
    if (position >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].color;

    for (let i = 0; i < sorted.length - 1; i++) {
      if (position >= sorted[i].position && position <= sorted[i + 1].position) {
        const range = sorted[i + 1].position - sorted[i].position;
        const t = range > 0 ? (position - sorted[i].position) / range : 0;
        return lerpColor(sorted[i].color, sorted[i + 1].color, t);
      }
    }

    return sorted[0].color;
  }
}
