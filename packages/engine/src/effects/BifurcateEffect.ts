import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * BifurcateEffect — blade color splits into warm/cool halves at the trigger point.
 *
 * The blade splits at `position` into two halves:
 *   - Hilt side (position < split): shifts toward a warm amber/orange tone.
 *   - Tip side  (position > split): shifts toward a cool cyan/blue tone.
 *
 * Phase 1 (0–25%): Split transitions in — colors diverge.
 * Phase 2 (25–75%): Both halves held at full divergence.
 * Phase 3 (75–100%): Halves gradually merge back to the original color.
 *
 * Duration 800 ms.
 */
export class BifurcateEffect extends BaseEffect {
  readonly id = 'bifurcate';
  readonly type: EffectType = 'bifurcate';

  constructor() {
    super();
    this.duration = 800;
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    const p = context.progress;

    // --- Envelope: how strongly the split is applied ---
    let envelope: number;
    if (p < 0.25) {
      envelope = p / 0.25; // ramp in
    } else if (p < 0.75) {
      envelope = 1; // held
    } else {
      envelope = 1 - (p - 0.75) / 0.25; // fade out
    }

    // The split point travels slightly during the effect for a living feel
    const splitPoint = this.position + Math.sin(p * Math.PI) * 0.04;

    // Soft boundary width — both sides blend smoothly across the split line
    const boundaryWidth = 0.06;
    const distFromSplit = position - splitPoint;

    // How much this LED belongs to warm vs cool side
    // 1 = fully warm (hilt side), -1 = fully cool (tip side)
    const sideFactor = Math.max(-1, Math.min(1, -distFromSplit / boundaryWidth));
    const warmSide = Math.max(0, sideFactor);
    const coolSide = Math.max(0, -sideFactor);

    // Warm color: shift toward amber (boost red, boost green a bit, drop blue)
    const warmColor: RGB = {
      r: Math.min(255, color.r * 1.2 + 60),
      g: Math.min(255, color.g * 1.1 + 20),
      b: Math.max(0, color.b * 0.5 - 20),
    };

    // Cool color: shift toward cyan (drop red, boost green, boost blue)
    const coolColor: RGB = {
      r: Math.max(0, color.r * 0.4 - 20),
      g: Math.min(255, color.g * 1.1 + 20),
      b: Math.min(255, color.b * 1.3 + 60),
    };

    let result = color;
    if (warmSide > 0) {
      result = lerpColor(result, warmColor, warmSide * envelope);
    }
    if (coolSide > 0) {
      result = lerpColor(result, coolColor, coolSide * envelope);
    }

    return result;
  }
}
