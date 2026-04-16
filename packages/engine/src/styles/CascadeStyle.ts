import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { lerpColor } from '../LEDArray.js';

/**
 * CascadeStyle — waterfall of light bands flowing down the blade (tip to hilt).
 *
 * Horizontal bands of brightness travel from the tip toward the hilt,
 * simulating a gravity-like cascade. Each band has soft Gaussian edges and
 * varying widths. Bands spawn at the tip at pseudo-random intervals and
 * accelerate slightly as they "fall" (quadratic easing).
 */
export class CascadeStyle extends BaseStyle {
  readonly id = 'cascade';
  readonly name = 'Cascade';
  readonly description =
    'Waterfall of light bands flowing from tip to hilt, with soft edges and gravity-like acceleration.';

  /** Number of concurrent bands tracked. */
  private static readonly BAND_COUNT = 8;

  /** Deterministic pseudo-random seeded by a float. */
  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Dim background: 10% of base color
    const bg: RGB = { r: base.r * 0.10, g: base.g * 0.10, b: base.b * 0.10 };

    let brightest = 0;

    for (let i = 0; i < CascadeStyle.BAND_COUNT; i++) {
      // Each band has a unique cycle period and spawn offset
      const cyclePeriod = 1.5 + this.pseudoRandom(i * 17.3) * 1.5; // 1.5-3s per cycle
      const spawnOffset = this.pseudoRandom(i * 9.41 + 200);

      // Time within this band's current cycle [0, 1]
      const cycleT = ((time / cyclePeriod + spawnOffset) % 1.0);

      // Gravity easing: quadratic acceleration (bands speed up as they fall)
      // position 1 (tip) -> 0 (hilt), so bandCenter starts at 1 and moves to 0
      const gravityT = cycleT * cycleT; // quadratic ease-in
      const bandCenter = 1.0 - gravityT;

      // Band width varies per band: 0.04 - 0.10 blade-lengths
      const bandWidth = 0.04 + this.pseudoRandom(i * 5.13) * 0.06;

      // Gaussian brightness around band center
      const dist = (position - bandCenter) / bandWidth;
      const brightness = Math.exp(-0.5 * dist * dist);

      // Fade out as band approaches the hilt
      const fadeFactor = Math.max(0, bandCenter);

      if (brightness * fadeFactor > brightest) {
        brightest = brightness * fadeFactor;
      }
    }

    return lerpColor(bg, base, Math.min(1, brightest));
  }
}
