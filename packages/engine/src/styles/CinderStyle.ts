import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise, directionalPosition } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

export class CinderStyle extends BaseStyle {
  readonly id = 'cinder';
  readonly name = 'Cinder';
  readonly description = 'Smoldering ember effect — dark blade with glowing hot spots.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const dir = context.config.spatialDirection ?? 'hilt-to-tip';
    const pos = directionalPosition(position, dir);
    const t = time;

    const ember = noise(pos * 25 + t * 2, t * 0.5);
    const glow = ember > 0.6 ? (ember - 0.6) * 2.5 : 0;
    const dark = 0.3 + glow * 0.7;
    const orange = lerpColor(base, { r: 255, g: 100, b: 0 }, glow * 0.5);

    return {
      r: orange.r * dark,
      g: orange.g * dark,
      b: orange.b * dark,
    };
  }
}
