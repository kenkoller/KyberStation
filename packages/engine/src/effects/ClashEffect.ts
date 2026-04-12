import type { EffectType, EffectParams, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * ClashEffect — full-blade white/clash-color flash with rapid decay.
 *
 * When triggered the entire blade flashes toward the configured clashColor,
 * then fades back over the effect duration (~400 ms default).
 */
export class ClashEffect extends BaseEffect {
  readonly id = 'clash';
  readonly type: EffectType = 'clash';

  constructor() {
    super();
    this.duration = 400;
  }

  trigger(params: EffectParams): void {
    super.trigger(params);
    // Clash is not sustained — it fires and decays
  }

  apply(color: RGB, _position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    const fadeOut = this.getFadeOut(context.progress);

    // If progress has gone past 1, deactivate
    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    // Full-blade flash: intensity decays rapidly from 1 → 0
    const intensity = fadeOut;
    const clashColor = context.config.clashColor;

    return lerpColor(color, clashColor, intensity);
  }
}
