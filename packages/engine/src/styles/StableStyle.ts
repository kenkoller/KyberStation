import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise } from '../noise.js';

export class StableStyle extends BaseStyle {
  readonly id = 'stable';
  readonly name = 'Stable';
  readonly description = 'Classic solid blade with optional shimmer flicker.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const shimmer = context.config.shimmer;
    const pos = position;
    const t = time;

    const flicker =
      1 -
      shimmer *
        (noise(pos * 8 + t * 3) * 0.5 + noise(pos * 15 + t * 5) * 0.5);

    return {
      r: base.r * flicker,
      g: base.g * flicker,
      b: base.b * flicker,
    };
  }
}
