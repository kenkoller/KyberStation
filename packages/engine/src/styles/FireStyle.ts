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
    const fireSize = (context.config.fireSize as number | undefined) ?? 0.5;
    const sparkRate = (context.config.sparkRate as number | undefined) ?? 0.3;
    const heatSpread = (context.config.heatSpread as number | undefined) ?? 0.5;

    const spatialScale = 4 + fireSize * 8;     // fireSize 0-1 → scale 4-12
    const timeScale = 2 + sparkRate * 10;       // sparkRate 0-1 → speed 2-12
    const n1 = noise(pos * spatialScale + t * timeScale);
    const n2 = noise(pos * (spatialScale * 2) + t * (timeScale * 1.5), 3);
    const heat = n1 * (0.4 + heatSpread * 0.4) + n2 * (0.6 - heatSpread * 0.4);
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
