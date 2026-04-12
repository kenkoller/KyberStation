import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

export class FireStyle extends BaseStyle {
  readonly id = 'fire';
  readonly name = 'Fire';
  readonly description = 'Flickering fire effect with yellow-hot core modulation.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const pos = position;
    const t = time;

    const n1 = noise(pos * 6 + t * 4);
    const n2 = noise(pos * 12 + t * 7, 3);
    const heat = n1 * 0.6 + n2 * 0.4;
    const yellow: RGB = { r: 255, g: 200, b: 50 };
    const core = lerpColor(base, yellow, heat * 0.5);
    const bright = 0.7 + heat * 0.3;

    return {
      r: core.r * bright,
      g: core.g * bright,
      b: core.b * bright,
    };
  }
}
