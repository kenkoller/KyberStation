import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise } from '../noise.js';
import { hslToRgb } from '../LEDArray.js';

export class PrismStyle extends BaseStyle {
  readonly id = 'prism';
  readonly name = 'Prism';
  readonly description = 'Full rainbow cycling along the blade with animated hue rotation.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const shimmer = context.config.shimmer;
    const pos = position;
    const t = time;

    const hue = ((pos * 360 + t * 60) % 360 + 360) % 360;
    const c = hslToRgb(hue, 90, 55);
    const fl = 1 - shimmer * noise(pos * 8 + t * 4);

    return {
      r: c.r * fl,
      g: c.g * fl,
      b: c.b * fl,
    };
  }
}
