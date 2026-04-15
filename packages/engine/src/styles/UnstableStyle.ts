import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise, directionalPosition } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

export class UnstableStyle extends BaseStyle {
  readonly id = 'unstable';
  readonly name = 'Unstable';
  readonly description = 'Crackling, volatile blade with white-hot spikes — Kylo Ren style.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const shimmer = context.config.shimmer;
    const dir = context.config.spatialDirection ?? 'hilt-to-tip';
    const pos = directionalPosition(position, dir);
    const t = time;

    const flicker = (context.config.flicker as number | undefined) ?? 0.5;

    const crack = noise(pos * (20 + flicker * 20) + t * (6 + flicker * 4), t * 2);
    const spike = crack > 0.7 ? (crack - 0.7) * 3.33 : 0;
    const jitter = noise(pos * 50 + t * 12) * shimmer * flicker * 4;
    const bright = Math.min(1, 1 - shimmer * flicker + jitter);

    let c: RGB = {
      r: Math.min(255, base.r * bright),
      g: Math.min(255, base.g * bright),
      b: Math.min(255, base.b * bright),
    };

    if (spike > 0) {
      c = lerpColor(c, { r: 255, g: 255, b: 255 }, spike * 0.6);
    }

    return c;
  }
}
