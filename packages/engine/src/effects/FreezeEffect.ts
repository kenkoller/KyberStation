import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * FreezeEffect — blade briefly freezes with an icy blue/white crystal pattern.
 *
 * Phase 1 (0–40%): Ice crystal pattern spreads from the trigger point.
 *   The blade shifts to an icy blue-white tone.
 * Phase 2 (40–80%): Held freeze — the icy pattern is fully developed.
 * Phase 3 (80–100%): Snap-back flash (brief white flare) then fade to normal.
 *
 * Duration 500 ms.
 */
export class FreezeEffect extends BaseEffect {
  readonly id = 'freeze';
  readonly type: EffectType = 'freeze';

  /** Deterministic noise for crystal facet texture. */
  private crystalNoise(position: number, seed: number): number {
    const x = Math.sin(position * 47.3 + seed * 13.7) * 43758.5453;
    return x - Math.floor(x);
  }

  constructor() {
    super();
    this.duration = 500;
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    const p = context.progress;
    const dist = Math.abs(position - this.position);

    // --- Spread radius grows from trigger point (0 → 1 over first 40%) ---
    const spreadProgress = Math.min(1, p / 0.4);
    if (dist > spreadProgress) return color;

    // Crystal facet texture — deterministic based on position
    const facet = this.crystalNoise(position, 42);
    const facetBrightness = 0.85 + facet * 0.3; // 0.85–1.15

    // Icy blue-white color
    const iceColor: RGB = {
      r: Math.min(255, 180 * facetBrightness),
      g: Math.min(255, 215 * facetBrightness),
      b: Math.min(255, 255 * facetBrightness),
    };

    // --- Phase determination ---
    let blendStrength: number;

    if (p < 0.4) {
      // Phase 1: spread in — ramp from 0 to full
      blendStrength = spreadProgress;
    } else if (p < 0.8) {
      // Phase 2: held — fully frozen
      blendStrength = 1;
    } else {
      // Phase 3: snap-back
      // Quick white flash then rapid fade
      const snapProgress = (p - 0.8) / 0.2; // 0→1 in final 20%
      const flashPeak = Math.max(0, 1 - Math.abs(snapProgress - 0.15) / 0.15);
      blendStrength = Math.max(0, 1 - snapProgress) + flashPeak * 0.5;
    }

    // Distance falloff for the frozen region edge
    const edgeFade = dist < spreadProgress
      ? 1 - Math.max(0, (dist - (spreadProgress - 0.08)) / 0.08)
      : 0;

    return lerpColor(color, iceColor, Math.min(1, blendStrength * edgeFade));
  }
}
