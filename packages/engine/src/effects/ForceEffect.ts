import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * ForceEffect — pulsing wave that travels along the blade.
 *
 * A short-lived effect that produces a sinusoidal color wave across
 * the entire blade, simulating a Force push/pull energy pulse.
 */
export class ForceEffect extends BaseEffect {
  readonly id = 'force';
  readonly type: EffectType = 'force';

  constructor() {
    super();
    this.duration = 600;
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    const fadeOut = this.getFadeOut(context.progress);

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    const wave = Math.sin(position * 20 - context.elapsed * 0.015) * 0.5 + 0.5;
    const pulse = wave * fadeOut * 0.4;

    return lerpColor(color, { r: 200, g: 200, b: 255 }, pulse);
  }
}
