import type { EffectType, EffectParams, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { noise } from '../noise.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * LightningEffect — chaotic electric arcs along the blade.
 *
 * Sustained effect: stays active until release() is called. Produces
 * noise-driven bright arcs that jump across the blade.
 */
export class LightningEffect extends BaseEffect {
  readonly id = 'lightning';
  readonly type: EffectType = 'lightning';

  constructor() {
    super();
    this.duration = 1000;
  }

  trigger(params: EffectParams): void {
    this.sustained = true;
    super.trigger(params);
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    const fadeOut = this.getFadeOut(context.progress);
    const arc = noise(position * 60 + context.time * 0.03, context.time * 0.005);

    if (arc > 0.75) {
      const strength = (arc - 0.75) * 4 * fadeOut;
      const lightningColor: RGB = context.config.lightningColor ?? {
        r: 200,
        g: 200,
        b: 255,
      };

      return lerpColor(color, lightningColor, strength);
    }

    return color;
  }
}
