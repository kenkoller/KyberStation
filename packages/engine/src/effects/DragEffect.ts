import type { EffectType, EffectParams, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { noise } from '../noise.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * DragEffect — sparking effect at the tip of the blade.
 *
 * Sustained effect: stays active until release() is called. Simulates
 * dragging the blade tip along the ground with hot orange/yellow sparks.
 */
export class DragEffect extends BaseEffect {
  readonly id = 'drag';
  readonly type: EffectType = 'drag';

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

    if (position > 0.85) {
      const dragStrength = ((position - 0.85) / 0.15) * fadeOut;
      const spark = noise(position * 50 + context.time * 0.015);
      const dragColor: RGB = context.config.dragColor ?? {
        r: 255,
        g: 100 + spark * 155,
        b: spark * 50,
      };

      // When using config dragColor, still modulate with spark for variation
      if (context.config.dragColor) {
        return lerpColor(color, dragColor, dragStrength * 0.8);
      }

      return lerpColor(color, dragColor, dragStrength * 0.8);
    }

    return color;
  }
}
