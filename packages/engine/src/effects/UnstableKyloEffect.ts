import type { EffectType, EffectParams, EffectContext, RGB } from '../types.js';
import { blendAdd } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * UnstableKyloEffect — Kylo Ren / crossguard chaos clash variant.
 *
 * Hardware-fidelity note (see docs/HARDWARE_FIDELITY_PRINCIPLE.md):
 * On clash trigger, 6-8 bright white sparks spray from the impact point in
 * both directions along the blade (toward hilt + toward tip). Each spark
 * has its own random velocity, lifespan (100-150 ms), and size. Sparks
 * additive-blend over the existing clash flash, so the effect layers cleanly
 * with the standard ClashEffect rather than replacing it.
 *
 * Real ProffieOS emits this as `SimpleClashL<White, 60>` — a longer-duration
 * clash flash with the white sparkle reading. The 1D LED strip cannot render
 * actual particle motion, so the codegen approximates with the canonical
 * Kylo-style extended white clash. See `packages/codegen/src/ASTBuilder.ts`.
 *
 * Particle math:
 *   - 6-8 sparks (random count per trigger)
 *   - Each spark has: starting position (clash point), direction (±1),
 *     velocity (1-2 blade-lengths/sec), lifespan (100-150 ms), size (~3 LEDs)
 *   - Brightness fades linearly over lifespan
 *   - Sparks render as additive Gaussian-shaped white bumps
 */
export class UnstableKyloEffect extends BaseEffect {
  readonly id = 'unstableKylo';
  readonly type: EffectType = 'unstableKylo';

  /** Pre-computed spark trajectories for this trigger (deterministic). */
  private sparks: Array<{
    /** Starting position 0..1 along blade. */
    origin: number;
    /** Direction +1 (tip) or -1 (hilt). */
    direction: number;
    /** Speed in blade-lengths per second. */
    speed: number;
    /** Lifespan in ms. */
    lifespan: number;
    /** Sigma of the Gaussian glow in blade-length units. */
    sigma: number;
  }> = [];

  constructor() {
    super();
    // Window covers the longest spark lifespan + a little fade tail.
    this.duration = 200;
  }

  /** Deterministic pseudo-random from seed (matches ScatterEffect's pattern). */
  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 91.233 + 47.891) * 43758.5453;
    return x - Math.floor(x);
  }

  override trigger(params: EffectParams): void {
    super.trigger(params);

    // 6-8 sparks per the proposal spec
    const count = 6 + Math.floor(this.pseudoRandom(this.startTime * 0.001) * 3);
    this.sparks = [];

    for (let i = 0; i < count; i++) {
      // Slight randomization of origin around the clash point so sparks
      // don't all emanate from a single sub-LED
      const originJitter = (this.pseudoRandom(i * 31.7 + 11.3) - 0.5) * 0.04;
      // Random direction — proposal note 4 says "random both directions
      // equally" is one option; "preferential hilt-ejection" is the other.
      // Going with equal-bias since Ken's question is open and equal is the
      // simpler default. Future-Claude: flip the bias here if confirmed.
      const direction = this.pseudoRandom(i * 17.3 + 7.7) < 0.5 ? -1 : 1;
      // 1-2 blade-lengths/sec (sparks visibly travel)
      const speed = 1 + this.pseudoRandom(i * 23.1 + 3.3);
      // 100-150 ms lifespan per the proposal spec
      const lifespan = 100 + this.pseudoRandom(i * 41.7 + 13.1) * 50;
      // ~3 LEDs at 144-LED blade ≈ 0.021 blade-lengths sigma
      const sigma = 0.018 + this.pseudoRandom(i * 53.9 + 19.7) * 0.008;

      this.sparks.push({
        origin: this.position + originJitter,
        direction,
        speed,
        lifespan,
        sigma,
      });
    }
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    let result = color;
    const elapsedSec = context.elapsed / 1000;

    for (const spark of this.sparks) {
      // Each spark has its own elapsed/lifespan
      if (context.elapsed > spark.lifespan) continue;

      const sparkProgress = context.elapsed / spark.lifespan;
      // Linear fade from 1 → 0 over lifespan; also envelope-shaped so it
      // peaks just after spawn (matches a real spark's brief flash).
      const envelope =
        sparkProgress < 0.15
          ? sparkProgress / 0.15
          : 1 - (sparkProgress - 0.15) / 0.85;

      // Spark center moves outward from origin
      const center = spark.origin + spark.direction * spark.speed * elapsedSec;

      // Skip sparks that have left the blade
      if (center < -spark.sigma * 4 || center > 1 + spark.sigma * 4) continue;

      // Gaussian glow at spark center
      const d = (position - center) / spark.sigma;
      const gauss = Math.exp(-0.5 * d * d);

      const intensity = envelope * gauss * 255;
      if (intensity < 1) continue;

      // Sparks are bright white per the proposal spec
      const sparkRgb: RGB = {
        r: intensity,
        g: intensity,
        b: intensity,
      };
      result = blendAdd(result, sparkRgb, 1);
    }

    return result;
  }
}
