import type { EffectType, EffectParams, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { noise } from '../noise.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * LockupEffect — localized flickering glow at the point of contact.
 *
 * Sustained effect: stays active until release() is called. A flickering
 * lockup color radiates within a radius of the trigger position.
 */
export class LockupEffect extends BaseEffect {
  readonly id = 'lockup';
  readonly type: EffectType = 'lockup';

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
    const dist = Math.abs(position - this.position);
    const radius = 0.12;

    if (dist < radius) {
      const strength = (1 - dist / radius) * fadeOut;
      const flicker = noise(position * 30 + context.time * 0.02) * 0.4 + 0.6;
      const lockupColor = context.config.lockupColor;

      return lerpColor(color, lockupColor, strength * flicker);
    }

    return color;
  }
}
