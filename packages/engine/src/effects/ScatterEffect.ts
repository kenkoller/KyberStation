import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * ScatterEffect — sparks scattered randomly across the entire blade.
 *
 * On trigger, 20-30 random positions simultaneously flash bright then fade
 * independently over 200-400ms each. Looks like sparks scattered across the
 * full length of the blade.
 */
export class ScatterEffect extends BaseEffect {
  readonly id = 'scatter';
  readonly type: EffectType = 'scatter';

  /** Pre-computed scatter positions (0-1) for this trigger. */
  private positions: number[] = [];
  /** Individual fade durations (ms) per spark. */
  private durations: number[] = [];
  /** Individual start offsets (ms) relative to trigger for each spark. */
  private offsets: number[] = [];

  constructor() {
    super();
    this.duration = 500; // overall window
  }

  /** Deterministic pseudo-random from seed. */
  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 91.233 + 47.891) * 43758.5453;
    return x - Math.floor(x);
  }

  trigger(params: import('../types.js').EffectParams): void {
    super.trigger(params);

    const count = 20 + Math.floor(this.pseudoRandom(this.startTime * 0.001) * 11); // 20-30
    this.positions = [];
    this.durations = [];
    this.offsets = [];

    for (let i = 0; i < count; i++) {
      this.positions.push(this.pseudoRandom(i * 17.3 + this.startTime * 0.0007));
      // Each spark fades over 200-400ms
      this.durations.push(200 + this.pseudoRandom(i * 41.7 + 3.3) * 200);
      // Small stagger: sparks ignite within first 80ms
      this.offsets.push(this.pseudoRandom(i * 23.1 + 7.7) * 80);
    }
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    const blastColor = context.config.blastColor;
    // Proximity threshold: one spark covers ~3 LEDs on a 144-LED blade
    const radius = 0.022;

    let result = color;

    for (let i = 0; i < this.positions.length; i++) {
      const sparkStart = this.offsets[i];
      const sparkDuration = this.durations[i];
      const sparkElapsed = context.elapsed - sparkStart;

      if (sparkElapsed < 0 || sparkElapsed > sparkDuration) continue;

      const dist = Math.abs(position - this.positions[i]);
      if (dist > radius) continue;

      const sparkProgress = sparkElapsed / sparkDuration;
      // Quick flash up, then fade: peak at 20% of lifetime
      const envelope =
        sparkProgress < 0.2
          ? sparkProgress / 0.2
          : 1 - (sparkProgress - 0.2) / 0.8;

      const strength = (1 - dist / radius) * envelope;
      result = lerpColor(result, blastColor, strength * 0.9);
    }

    return result;
  }
}
