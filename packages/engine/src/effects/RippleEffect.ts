import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * RippleEffect — concentric ripple rings expanding from a trigger point.
 *
 * Multiple sine-wave rings radiate outward from the trigger position. Each
 * ring's amplitude decays with distance from the origin, giving a natural
 * water-drop ripple appearance. Rings travel at different speeds so they
 * spread apart over the effect lifetime.
 *
 * Duration ~600 ms.
 */
export class RippleEffect extends BaseEffect {
  readonly id = 'ripple';
  readonly type: EffectType = 'ripple';

  constructor() {
    super();
    this.duration = 600;
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    const fadeOut = this.getFadeOut(context.progress);
    const dist = Math.abs(position - this.position);

    // Three rings, each expanding at a different rate
    const ringCount = 3;
    let rippleStrength = 0;

    for (let i = 0; i < ringCount; i++) {
      // Each ring expands outward: ring 0 is fastest, ring 2 slowest
      const ringSpeed = 1.5 + i * 0.6;
      const ringRadius = context.progress * ringSpeed * 0.5;

      // Narrow sine envelope centered on ringRadius
      const ringWidth = 0.06 + i * 0.02;
      const ringDist = Math.abs(dist - ringRadius);

      if (ringDist < ringWidth) {
        // Sine shape across the ring width
        const t = ringDist / ringWidth;
        const shape = Math.cos(t * Math.PI * 0.5);
        // Amplitude decays with distance from origin
        const decay = Math.exp(-dist * 4);
        rippleStrength = Math.max(rippleStrength, shape * decay);
      }
    }

    const intensity = rippleStrength * fadeOut * 0.75;
    // Ripple color: blend toward clash color with a slight brightening
    const rippleColor: RGB = {
      r: Math.min(255, color.r * 1.3 + context.config.clashColor.r * 0.4),
      g: Math.min(255, color.g * 1.3 + context.config.clashColor.g * 0.4),
      b: Math.min(255, color.b * 1.3 + context.config.clashColor.b * 0.4),
    };

    return lerpColor(color, rippleColor, intensity);
  }
}
