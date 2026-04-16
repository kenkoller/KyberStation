import { BaseStyle } from './BaseStyle.js';
import { lerpColor } from '../LEDArray.js';
import type { RGB, StyleContext } from '../types.js';

/**
 * GravityStyle — color pools toward whichever end of the blade points down.
 *
 * The gravity center is derived from context.bladeAngle (-1 to 1):
 *   -1 = tip pointing straight up  → pooling at hilt (position 0)
 *    0 = horizontal               → pooling at centre (position 0.5)
 *   +1 = tip pointing straight down → pooling at tip (position 1)
 *
 * A Gaussian distribution (sigma ~0.21 blade-length, i.e. ~30 LEDs at 144)
 * weights each pixel.  The bright "pool" colour is the configured base color
 * at full intensity; the "ambient" tail uses a heavily dimmed version.
 *
 * The gravity centre position is smoothed with a single-pole exponential
 * moving average (alpha = 0.04 per ~16 ms frame, tau ≈ 256 ms) so rapid
 * blade movements don't cause instantaneous snapping.
 */
export class GravityStyle extends BaseStyle {
  readonly id = 'gravity';
  readonly name = 'Gravity';
  readonly description = 'Color pools toward the end of the blade that points down.';

  /** Smoothed gravity centre, in blade-length units [0, 1]. */
  private smoothedCenter: number = 0.5;

  /** Sigma of the Gaussian pool in blade-length units (~30 LEDs @ 144). */
  private readonly SIGMA = 0.21;

  /** EMA smoothing factor.  Tuned for ~60 fps. */
  private readonly ALPHA = 0.04;

  /** Minimum brightness for the tail (0-1). */
  private readonly TAIL_MIN = 0.08;

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Map bladeAngle (-1 → 1) to gravity centre position (0 → 1)
    // bladeAngle = -1 → blade tip up → gravity at hilt (0)
    // bladeAngle = +1 → blade tip down → gravity at tip (1)
    const targetCenter = (context.bladeAngle + 1) / 2;

    // Update smoothed centre — use time delta approximation at 60 fps
    this.smoothedCenter += this.ALPHA * (targetCenter - this.smoothedCenter);

    // Gaussian weight: 1 at pool centre, decays toward 0 at the far end
    const d = (position - this.smoothedCenter) / this.SIGMA;
    const gaussian = Math.exp(-0.5 * d * d);

    // Map gaussian [0..1] to brightness [TAIL_MIN..1]
    const brightness = this.TAIL_MIN + (1 - this.TAIL_MIN) * gaussian;

    // Subtle shimmer in the tail driven by a slow sine wave
    const shimmerAmp   = (context.config.shimmer ?? 0) * 0.12;
    const shimmerValue = shimmerAmp * Math.sin(time * 1.8 + position * 8.0);
    const finalBrightness = Math.max(0, Math.min(1, brightness + shimmerValue));

    // Slightly warmer/brighter pool colour: lerp toward a brightened version
    const bright: RGB = {
      r: Math.min(255, base.r * 1.25),
      g: Math.min(255, base.g * 1.25),
      b: Math.min(255, base.b * 1.25),
    };

    const pooled = lerpColor(base, bright, gaussian * 0.4);

    return {
      r: pooled.r * finalBrightness,
      g: pooled.g * finalBrightness,
      b: pooled.b * finalBrightness,
    };
  }
}
