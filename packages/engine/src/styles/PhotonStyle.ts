import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

export class PhotonStyle extends BaseStyle {
  readonly id = 'photon';
  readonly name = 'Photon';
  readonly description = 'Fast-moving particle stream effect with white-hot highlights.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const pos = position;
    const t = time;

    const particle = Math.sin(pos * 40 + t * 15) * 0.5 + 0.5;
    const stream = noise(pos * 20 + t * 10) * 0.5 + particle * 0.5;
    const bright = 0.5 + stream * 0.5;
    const white = lerpColor(base, { r: 255, g: 255, b: 255 }, stream * 0.3);

    return {
      r: white.r * bright,
      g: white.g * bright,
      b: white.b * bright,
    };
  }
}
