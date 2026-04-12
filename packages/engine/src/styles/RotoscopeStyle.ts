import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

export class RotoscopeStyle extends BaseStyle {
  readonly id = 'rotoscope';
  readonly name = 'Rotoscope';
  readonly description = 'Original-trilogy rotoscope look with core brightening and shimmer.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const shimmer = context.config.shimmer;
    const pos = position;
    const t = time;

    const roto = Math.sin(pos * Math.PI * 2 + t * 2) * 0.5 + 0.5;
    const shimmerVal = noise(pos * 4 + t * 2) * shimmer;
    const core: RGB = {
      r: Math.min(255, base.r + 80),
      g: Math.min(255, base.g + 80),
      b: Math.min(255, base.b + 80),
    };
    const c = lerpColor(base, core, roto * 0.4 + shimmerVal);
    const bright = 0.85 + roto * 0.15;

    return {
      r: c.r * bright,
      g: c.g * bright,
      b: c.b * bright,
    };
  }
}
