import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * BlastEffect — localized ring-shaped blast deflection mark.
 *
 * A short-lived effect at the trigger position that shows an expanding
 * ring pattern in the configured blast color.
 */
export class BlastEffect extends BaseEffect {
  readonly id = 'blast';
  readonly type: EffectType = 'blast';

  constructor() {
    super();
    this.duration = 400;
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    const fadeOut = this.getFadeOut(context.progress);
    const dist = Math.abs(position - this.position);
    const radius = 0.08;

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    if (dist < radius) {
      const strength = (1 - dist / radius) * fadeOut;
      const ring = Math.sin(dist * 80 - context.elapsed * 0.02) * 0.3 + 0.7;
      const blastColor = context.config.blastColor;

      return lerpColor(color, blastColor, strength * ring);
    }

    return color;
  }
}
