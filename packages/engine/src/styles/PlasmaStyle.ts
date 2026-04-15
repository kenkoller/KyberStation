import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

export class PlasmaStyle extends BaseStyle {
  readonly id = 'plasma';
  readonly name = 'Plasma';
  readonly description = 'Roiling plasma arcs with bright edge highlights, swing-responsive.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const pos = position;
    const t = time;
    const swingInfluence = context.swingSpeed;
    const frequency = (context.config.frequency as number | undefined) ?? 1;
    const phaseSpeed = (context.config.phaseSpeed as number | undefined) ?? 1;

    const p1 = noise(pos * (8 * frequency) + t * (5 * phaseSpeed), t);
    const p2 = noise(pos * (15 * frequency) - t * (3 * phaseSpeed), t * 1.5);
    const arc = p1 * p2;
    const isEdge = pos < 0.02 || pos > 0.98;
    const edge: RGB = context.config.edgeColor || { r: 200, g: 200, b: 255 };

    let c = lerpColor(base, edge, arc * 0.6);
    if (isEdge) {
      c = lerpColor(c, edge, 0.8);
    }

    const bright = 0.6 + arc * 0.4 + swingInfluence * 0.2;

    return {
      r: c.r * bright,
      g: c.g * bright,
      b: c.b * bright,
    };
  }
}
