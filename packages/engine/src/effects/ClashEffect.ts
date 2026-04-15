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

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    const fadeOut = this.getFadeOut(context.progress);

    // If progress has gone past 1, deactivate
    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    // Clash location: 0-100 config maps to 0-1 blade position (default 50 = center)
    const clashLoc = (context.config.clashLocation ?? 50) / 100;
    // Clash intensity: 0-100 config maps to 0-1 strength (default 75)
    const maxIntensity = (context.config.clashIntensity ?? 75) / 100;

    // Distance-based falloff from the clash point — wider radius at higher intensity
    const dist = Math.abs(position - clashLoc);
    const radius = 0.15 + maxIntensity * 0.35; // 0.15 to 0.50 blade-lengths
    const spatial = dist < radius ? 1 - dist / radius : 0;

    const intensity = spatial * maxIntensity * fadeOut;
    const clashColor = context.config.clashColor;

    return lerpColor(color, clashColor, intensity);
  }
}
