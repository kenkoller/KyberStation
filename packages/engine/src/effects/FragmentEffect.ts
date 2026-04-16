import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * FragmentEffect — blade visually breaks into separating segments.
 *
 * On trigger, the blade splits into 5-8 segments. Dark gaps expand at each
 * segment boundary while the segments themselves fade/dim as they drift apart.
 * The effect reassembles over 800ms.
 */
export class FragmentEffect extends BaseEffect {
  readonly id = 'fragment';
  readonly type: EffectType = 'fragment';

  /** Boundary positions for this trigger (0-1). */
  private boundaries: number[] = [];
  /** Gap expansion speed per boundary. */
  private gapSpeeds: number[] = [];

  constructor() {
    super();
    this.duration = 800;
  }

  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  trigger(params: import('../types.js').EffectParams): void {
    super.trigger(params);

    const count = 5 + Math.floor(this.pseudoRandom(this.startTime * 0.0013) * 4); // 5-8 segments → count-1 boundaries
    this.boundaries = [];
    this.gapSpeeds = [];

    // Evenly space boundaries with a bit of jitter
    for (let i = 1; i < count; i++) {
      const base = i / count;
      const jitter = (this.pseudoRandom(i * 19.7 + 2.3) - 0.5) * 0.06;
      this.boundaries.push(Math.max(0.05, Math.min(0.95, base + jitter)));
      // Gap expansion speed 0.05 – 0.12 blade-lengths over the full duration
      this.gapSpeeds.push(0.05 + this.pseudoRandom(i * 31.3) * 0.07);
    }
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    // Parabolic envelope: expand 0→peak at 40%, collapse back to normal at 100%
    const phase = context.progress;
    const envelope = phase < 0.4 ? phase / 0.4 : 1 - (phase - 0.4) / 0.6;

    const dark: RGB = { r: 0, g: 0, b: 0 };

    for (let i = 0; i < this.boundaries.length; i++) {
      const center = this.boundaries[i];
      const halfGap = this.gapSpeeds[i] * envelope;
      const dist = Math.abs(position - center);

      if (dist < halfGap) {
        // Inside the gap: dark, with a slight soft edge
        const gapStrength = 1 - (dist / halfGap) * 0.2;
        color = lerpColor(color, dark, gapStrength);
      }
    }

    // Dim segments globally as they separate
    const dimFactor = 1 - envelope * 0.35;
    return {
      r: color.r * dimFactor,
      g: color.g * dimFactor,
      b: color.b * dimFactor,
    };
  }
}
