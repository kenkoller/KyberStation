import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor, blendAdd } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * CoronaryEffect -- solar corona eruption with expanding prominence
 * and traveling light rings.
 *
 * Timeline:
 *   Phase 1 (0-300ms):  Gaussian peak at trigger position expands rapidly.
 *                        Color goes white-to-gold. Rest of blade dims to ~60%.
 *   Phase 2 (300-500ms): Peak collapses, Gaussian narrows and drops.
 *   Phase 3 (500-800ms): Two thin bright bands (~3-4 LEDs wide, amber/gold)
 *                        travel outward from trigger point. Fade as they travel.
 *                        Blade brightness recovers to 100%.
 *   Total duration: ~800ms
 */
export class CoronaryEffect extends BaseEffect {
  readonly id = 'coronary';
  readonly type: EffectType = 'coronary';

  /** Gold/amber color for the corona bands. */
  private static readonly GOLD: RGB = { r: 255, g: 200, b: 60 };
  private static readonly AMBER: RGB = { r: 255, g: 170, b: 40 };
  private static readonly WHITE: RGB = { r: 255, g: 255, b: 255 };

  constructor() {
    super();
    this.duration = 800;
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    const elapsed = context.elapsed;

    if (elapsed >= this.duration) {
      this.active = false;
      return color;
    }

    const impact = this.position;

    // Phase 1: expanding Gaussian prominence (0-300ms)
    if (elapsed < 300) {
      const t = elapsed / 300; // 0-1 within phase
      // Gaussian width expands over time
      const sigma = 0.02 + t * 0.08;
      const amplitude = 1.0; // full strength
      const gauss = CoronaryEffect.gaussian(position, impact, sigma);
      const intensity = gauss * amplitude;

      // Core color transitions white -> gold
      const coreColor = lerpColor(CoronaryEffect.WHITE, CoronaryEffect.GOLD, t * 0.7);

      // Dim the rest of the blade to ~60%
      const dimFactor = 1 - (1 - gauss) * 0.4;
      const dimmed: RGB = {
        r: color.r * dimFactor,
        g: color.g * dimFactor,
        b: color.b * dimFactor,
      };

      return blendAdd(dimmed, coreColor, intensity);
    }

    // Phase 2: peak collapse (300-500ms)
    if (elapsed < 500) {
      const t = (elapsed - 300) / 200; // 0-1 within phase
      // Gaussian narrows and drops
      const sigma = 0.10 - t * 0.07; // narrows from 0.10 to 0.03
      const amplitude = 1.0 - t * 0.85; // drops to 0.15
      const gauss = CoronaryEffect.gaussian(position, impact, sigma);
      const intensity = gauss * amplitude;

      // Still gold
      const coreColor = CoronaryEffect.GOLD;

      // Dim recovering: 60% -> ~80%
      const dimFactor = 1 - (1 - gauss) * (0.4 - t * 0.2);
      const dimmed: RGB = {
        r: color.r * dimFactor,
        g: color.g * dimFactor,
        b: color.b * dimFactor,
      };

      return blendAdd(dimmed, coreColor, intensity);
    }

    // Phase 3: two thin bright bands travel outward (500-800ms)
    const t3 = (elapsed - 500) / 300; // 0-1 within phase

    // Band travel speed: covers ~0.5 blade-lengths over the phase
    const travelDist = t3 * 0.5;

    // Two band positions moving away from impact
    const bandUp = impact + travelDist;
    const bandDown = impact - travelDist;

    // Band width ~3-4 LEDs on 144 -> ~0.025 blade-length
    const bandSigma = 0.012;

    const gaussUp = CoronaryEffect.gaussian(position, bandUp, bandSigma);
    const gaussDown = CoronaryEffect.gaussian(position, bandDown, bandSigma);
    const bandIntensity = Math.min(1, gaussUp + gaussDown);

    // Fade as they travel
    const bandFade = 1 - t3 * 0.8;
    const finalIntensity = bandIntensity * bandFade;

    // Blade brightness recovering to 100%
    const dimRecovery = 1 - (1 - t3) * 0.2;
    const recovered: RGB = {
      r: color.r * dimRecovery,
      g: color.g * dimRecovery,
      b: color.b * dimRecovery,
    };

    return blendAdd(recovered, CoronaryEffect.AMBER, finalIntensity);
  }

  /** Evaluate a unit Gaussian centred at `mu` with std-dev `sigma`. */
  private static gaussian(x: number, mu: number, sigma: number): number {
    const d = (x - mu) / sigma;
    return Math.exp(-0.5 * d * d);
  }
}
