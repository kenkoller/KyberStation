import type { EffectType, EffectParams, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { noise } from '../noise.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * MeltEffect — glowing hot tip simulating melting through a surface.
 *
 * Sustained effect: stays active until release() is called. Shows a
 * heat-shimmer glow at the very tip of the blade.
 */
export class MeltEffect extends BaseEffect {
  readonly id = 'melt';
  readonly type: EffectType = 'melt';

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

    if (position > 0.9) {
      const meltStr = ((position - 0.9) / 0.1) * fadeOut;
      const heat = noise(position * 40 + context.time * 0.01);
      const meltColor: RGB = context.config.meltColor ?? {
        r: 255,
        g: 80 + heat * 175,
        b: heat * 30,
      };

      return lerpColor(color, meltColor, meltStr);
    }

    return color;
  }
}
