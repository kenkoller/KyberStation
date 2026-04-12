import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';

export class PulseStyle extends BaseStyle {
  readonly id = 'pulse';
  readonly name = 'Pulse';
  readonly description = 'Smooth sine-wave pulsing along the blade length.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const pos = position;
    const t = time;

    const wave = Math.sin(t * 4 - pos * 8) * 0.5 + 0.5;
    const bright = 0.6 + wave * 0.4;

    return {
      r: base.r * bright,
      g: base.g * bright,
      b: base.b * bright,
    };
  }
}
