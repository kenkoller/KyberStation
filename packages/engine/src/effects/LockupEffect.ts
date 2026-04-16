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

    // When the config carries a spatial `lockupPosition` (placed via the
    // canvas Edit Mode), prefer it over the runtime `trigger({position})`
    // value. `lockupRadius` falls back to the historical 0.12 default so
    // existing presets without a spatial lockup behave exactly as before.
    const lockupPos = context.config.lockupPosition ?? this.position;
    const radius = context.config.lockupRadius ?? 0.12;

    const fadeOut = this.getFadeOut(context.progress);
    const dist = Math.abs(position - lockupPos);

    if (dist < radius) {
      const strength = (1 - dist / radius) * fadeOut;
      const flicker = noise(position * 30 + context.time * 0.02) * 0.4 + 0.6;
      const lockupColor = context.config.lockupColor;

      return lerpColor(color, lockupColor, strength * flicker);
    }

    return color;
  }
}
