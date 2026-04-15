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

    const pulseSpeed = (context.config.pulseSpeed as number | undefined) ?? 1;
    const pulseMinBright = (context.config.pulseMinBright as number | undefined) ?? 0.3;

    const wave = Math.sin(t * (4 * pulseSpeed) - pos * 8) * 0.5 + 0.5;
    const bright = pulseMinBright + wave * (1 - pulseMinBright);

    return {
      r: base.r * bright,
      g: base.g * bright,
      b: base.b * bright,
    };
  }
}
