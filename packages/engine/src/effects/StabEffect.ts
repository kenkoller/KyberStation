import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * StabEffect — bright white flash at the blade tip.
 *
 * A short-lived effect that brightens the tip of the blade to simulate
 * a stabbing impact.
 */
export class StabEffect extends BaseEffect {
  readonly id = 'stab';
  readonly type: EffectType = 'stab';

  constructor() {
    super();
    this.duration = 400;
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    const fadeOut = this.getFadeOut(context.progress);

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    if (position > 0.9) {
      const stabStr = ((position - 0.9) / 0.1) * fadeOut;
      return lerpColor(color, { r: 255, g: 255, b: 255 }, stabStr);
    }

    return color;
  }
}
