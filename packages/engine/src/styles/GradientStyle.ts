import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

export class GradientStyle extends BaseStyle {
  readonly id = 'gradient';
  readonly name = 'Gradient';
  readonly description = 'Smooth color gradient from base to end color along the blade.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const shimmer = context.config.shimmer;
    const pos = position;
    const t = time;

    const end: RGB = context.config.gradientEnd || { r: 255, g: 100, b: 0 };
    const c = lerpColor(base, end, pos);
    const fl = 1 - shimmer * noise(pos * 10 + t * 3);

    return {
      r: c.r * fl,
      g: c.g * fl,
      b: c.b * fl,
    };
  }
}
