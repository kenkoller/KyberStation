import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

export class CrystalShatterStyle extends BaseStyle {
  readonly id = 'crystalShatter';
  readonly name = 'Crystal Shatter';
  readonly description = 'Fractured crystal segments with visible cracks and per-segment variation.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const pos = position;
    const t = time;

    const seg = Math.floor(pos * 12);
    const segOffset = noise(seg * 3.7, Math.floor(t * 2));
    const crack = Math.abs(pos * 12 - seg - 0.5) < 0.05 ? 0.3 : 1;
    const bright = (0.7 + segOffset * 0.3) * crack;
    const tint = lerpColor(base, { r: 255, g: 255, b: 255 }, segOffset * 0.2);

    return {
      r: tint.r * bright,
      g: tint.g * bright,
      b: tint.b * bright,
    };
  }
}
