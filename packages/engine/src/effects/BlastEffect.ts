import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * BlastEffect — localized ring-shaped blast deflection mark(s).
 *
 * A short-lived effect at the trigger position that shows expanding
 * ring patterns in the configured blast color. Supports multiple marks
 * via blastCount and adjustable spread via blastSpread.
 */
export class BlastEffect extends BaseEffect {
  readonly id = 'blast';
  readonly type: EffectType = 'blast';

  /** Deterministic offsets for multi-blast marks, seeded on each trigger */
  private blastOffsets: number[] = [0];

  constructor() {
    super();
    this.duration = 400;
  }

  trigger(params: import('../types.js').EffectParams): void {
    super.trigger(params);
    // Pre-compute deterministic offsets for multi-blast marks.
    // Uses a simple hash-like sequence so marks are reproducible per trigger.
    this.blastOffsets = [0];
    for (let i = 1; i < 5; i++) {
      // Alternating above/below center with increasing distance
      const sign = i % 2 === 0 ? 1 : -1;
      this.blastOffsets.push(sign * Math.ceil(i / 2) * 0.12);
    }
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    const fadeOut = this.getFadeOut(context.progress);

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    const count = context.config.blastCount ?? 1;
    // Spread: 0 = all marks at center, 100 = marks use full offset range
    const spreadFactor = (context.config.blastSpread ?? 50) / 100;
    const radius = 0.08;
    const blastColor = context.config.blastColor;

    let result = color;
    for (let i = 0; i < count; i++) {
      const markCenter = this.position + this.blastOffsets[i] * spreadFactor;
      const clampedCenter = Math.max(0, Math.min(1, markCenter));
      const dist = Math.abs(position - clampedCenter);

      if (dist < radius) {
        const strength = (1 - dist / radius) * fadeOut;
        const ring = Math.sin(dist * 80 - context.elapsed * 0.02) * 0.3 + 0.7;
        result = lerpColor(result, blastColor, strength * ring);
      }
    }

    return result;
  }
}
