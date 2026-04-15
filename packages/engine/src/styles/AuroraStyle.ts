import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { lerpColor, hslToRgb } from '../LEDArray.js';

export class AuroraStyle extends BaseStyle {
  readonly id = 'aurora';
  readonly name = 'Aurora';
  readonly description = 'Shimmering aurora borealis waves with hue-shifting color bands.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const pos = position;
    const t = time;
    const waveCount = (context.config.waveCount as number | undefined) ?? 3;
    const driftSpeed = (context.config.driftSpeed as number | undefined) ?? 0.5;

    const wave1 = Math.sin(pos * (waveCount * 2) + t * (driftSpeed * 3)) * 0.5 + 0.5;
    const wave2 = Math.sin(pos * (waveCount * 3.3) - t * (driftSpeed * 4.4)) * 0.5 + 0.5;
    const hue = (wave1 * 60 + wave2 * 40) % 360;
    const auroraC = hslToRgb((hue + base.r) % 360, 80, 55);
    const c = lerpColor(base, auroraC, 0.5);

    return { r: c.r, g: c.g, b: c.b };
  }
}
