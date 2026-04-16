import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * OverchargeEffect — blade overloads, ramps bright, flickers, then resets.
 *
 * Phase 1 (0–65%): Blade brightens progressively up to 1.5x normal.
 * Phase 2 (65–90%): Rapid high-frequency flicker at peak brightness.
 * Phase 3 (90–100%): Brief dim-dip snap back to normal.
 *
 * Duration 600 ms total (400 ms ramp + 200 ms flicker + reset snap).
 */
export class OverchargeEffect extends BaseEffect {
  readonly id = 'overcharge';
  readonly type: EffectType = 'overcharge';

  /** Deterministic flicker noise — position-independent for whole-blade flicker. */
  private flickerNoise(elapsed: number, seed: number): number {
    const x = Math.sin(elapsed * 0.07 + seed * 17.3) * 43758.5453;
    return x - Math.floor(x);
  }

  constructor() {
    super();
    this.duration = 600;
  }

  apply(color: RGB, _position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    const p = context.progress;
    let brightnessMultiplier: number;
    let whiteBlend = 0;

    if (p < 0.65) {
      // Phase 1: linear ramp from 1x to 1.5x brightness
      const rampProgress = p / 0.65;
      brightnessMultiplier = 1 + rampProgress * 0.5;
      whiteBlend = rampProgress * 0.15;
    } else if (p < 0.9) {
      // Phase 2: flicker at peak — rapid noise-driven brightness variation
      const flickerT = (p - 0.65) / 0.25;
      // High-frequency flicker using elapsed time for speed, position for variety
      const flicker1 = this.flickerNoise(context.elapsed, 1);
      const flicker2 = this.flickerNoise(context.elapsed, 2.7);
      // Mix two noise harmonics for irregular flicker
      const rawFlicker = flicker1 * 0.6 + flicker2 * 0.4;
      brightnessMultiplier = 1.2 + rawFlicker * 0.7; // 1.2x to 1.9x
      whiteBlend = 0.25 + rawFlicker * 0.25;
      void flickerT; // used for phasing, keep ref
    } else {
      // Phase 3: dim-dip snap back (brief under-bright then return)
      const snapProgress = (p - 0.9) / 0.1;
      // Dip below 1.0 briefly before snapping back
      brightnessMultiplier = snapProgress < 0.5
        ? 1 - (0.5 - snapProgress) * 0.6 // dip
        : 1 - (snapProgress - 0.5) * 0.2; // recover
      whiteBlend = 0;
    }

    // Apply brightness multiplier to base color
    const overchargedColor: RGB = {
      r: Math.min(255, color.r * brightnessMultiplier),
      g: Math.min(255, color.g * brightnessMultiplier),
      b: Math.min(255, color.b * brightnessMultiplier),
    };

    // Blend toward white during peak
    const white: RGB = { r: 255, g: 255, b: 255 };
    return lerpColor(overchargedColor, white, whiteBlend);
  }
}
