import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor, blendAdd } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * SiphonEffect -- energy drains toward a point, pools, then floods
 * back outward.
 *
 * Timeline:
 *   Phase 1 (0-500ms):   Brightness dims from far ends inward toward siphon
 *                         point (farthest LEDs dim first). Siphon point gets
 *                         brighter and whiter as energy "collects."
 *   Phase 2 (500-600ms): Siphon point pulses with rapid oscillation (2-3
 *                         cycles of brightness flutter).
 *   Phase 3 (600-900ms): Brightness wave expands outward from siphon point,
 *                         restoring original color. Bright leading edge.
 *   Total duration: ~900ms
 */
export class SiphonEffect extends BaseEffect {
  readonly id = 'siphon';
  readonly type: EffectType = 'siphon';

  private static readonly WHITE: RGB = { r: 255, g: 255, b: 255 };

  constructor() {
    super();
    this.duration = 900;
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    const elapsed = context.elapsed;

    if (elapsed >= this.duration) {
      this.active = false;
      return color;
    }

    const siphonPt = this.position;
    // Distance from siphon point, normalized to max possible distance (0 or 1)
    const dist = Math.abs(position - siphonPt);
    const maxDist = Math.max(siphonPt, 1 - siphonPt);
    const normDist = maxDist > 0 ? dist / maxDist : 0; // 0 at siphon, 1 at farthest

    // Phase 1: drain inward (0-500ms)
    if (elapsed < 500) {
      const t = elapsed / 500; // 0-1

      // Threshold expands from far edges inward:
      // at t=0 threshold=1 (only farthest dim), at t=1 threshold=0 (everything dimmed)
      const threshold = 1 - t;

      let brightness: number;
      if (normDist > threshold) {
        // This LED is past the drain threshold -- dim it
        // Dim more the farther past the threshold
        const dimAmount = Math.min(1, (normDist - threshold) / Math.max(0.01, 1 - threshold));
        brightness = 1 - dimAmount * 0.85; // dim to 15% at most
      } else {
        brightness = 1;
      }

      // Siphon point gets brighter and whiter as energy collects
      const siphonGlow = Math.max(0, 1 - normDist * 5); // narrow glow around siphon
      const whiteBlend = siphonGlow * t * 0.8;

      const dimmed: RGB = {
        r: color.r * brightness,
        g: color.g * brightness,
        b: color.b * brightness,
      };

      if (whiteBlend > 0) {
        return lerpColor(dimmed, SiphonEffect.WHITE, whiteBlend);
      }
      return dimmed;
    }

    // Phase 2: siphon point pulse (500-600ms)
    if (elapsed < 600) {
      const t2 = (elapsed - 500) / 100; // 0-1

      // Most of blade is dimmed from phase 1
      const baseBrightness = 0.15 + normDist * 0.05;

      // Siphon point rapid oscillation: 2-3 cycles over 100ms
      const pulseFreq = 2.5; // cycles
      const pulse = 0.5 + 0.5 * Math.sin(t2 * Math.PI * 2 * pulseFreq);

      // Narrow siphon glow
      const siphonGlow = Math.max(0, 1 - normDist * 4);

      if (siphonGlow > 0) {
        const intensity = siphonGlow * (0.6 + pulse * 0.4);
        const dimmed: RGB = {
          r: color.r * baseBrightness,
          g: color.g * baseBrightness,
          b: color.b * baseBrightness,
        };
        return blendAdd(dimmed, SiphonEffect.WHITE, intensity);
      }

      return {
        r: color.r * baseBrightness,
        g: color.g * baseBrightness,
        b: color.b * baseBrightness,
      };
    }

    // Phase 3: brightness wave expands outward, restoring color (600-900ms)
    const t3 = (elapsed - 600) / 300; // 0-1

    // Restoration threshold expands from siphon outward
    // at t3=0 only siphon restored, at t3=1 everything restored
    const restoreRadius = t3; // normalized distance threshold

    let brightness: number;
    if (normDist <= restoreRadius) {
      // Already restored
      brightness = 1;
    } else {
      // Still dimmed
      brightness = 0.15;
    }

    // Bright leading edge at the wavefront
    const edgeDist = Math.abs(normDist - restoreRadius);
    const edgeWidth = 0.08;
    if (edgeDist < edgeWidth && normDist > 0.02) {
      const edgeIntensity = (1 - edgeDist / edgeWidth) * (1 - t3 * 0.5);
      const base: RGB = {
        r: color.r * brightness,
        g: color.g * brightness,
        b: color.b * brightness,
      };
      return blendAdd(base, SiphonEffect.WHITE, edgeIntensity * 0.7);
    }

    return {
      r: color.r * brightness,
      g: color.g * brightness,
      b: color.b * brightness,
    };
  }
}
