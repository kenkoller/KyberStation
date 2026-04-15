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

    // stabDepth: 0-100 config (default 80) — how far from the tip the effect extends.
    // depth 100 = effect starts at blade base (position 0), depth 0 = only the very tip.
    const depth = (context.config.stabDepth ?? 80) / 100;
    const threshold = 1 - depth; // e.g., depth 80 → threshold 0.2, so 0.2-1.0 lights up

    if (position > threshold) {
      const range = 1 - threshold;
      const stabStr = range > 0 ? ((position - threshold) / range) * fadeOut : fadeOut;
      return lerpColor(color, { r: 255, g: 255, b: 255 }, stabStr);
    }

    return color;
  }
}
