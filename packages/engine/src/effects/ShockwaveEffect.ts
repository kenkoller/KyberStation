import type { EffectType, EffectParams, EffectContext, RGB } from '../types.js';
import { blendAdd } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * ShockwaveEffect — a bright ring that expands outward from the impact point
 * in both directions, dimming as it travels, then extinguishes once both
 * wavefronts have exited the blade.
 *
 * Optimized for a 144-LED strip at 60 fps.
 *
 * Timeline:
 *   - On trigger, record impact position (params.position, default 0.5).
 *   - Two wavefronts travel toward hilt (position 0) and tip (position 1)
 *     at ~120 LEDs/s, i.e. ~0.83 blade-lengths per second.
 *   - Each wavefront is a Gaussian pulse ~2-3% of blade-length wide.
 *   - Intensity fades with distance travelled (inverse-square-ish).
 *   - Effect ends when both wavefronts have cleared the blade.
 *
 * The effect is additively blended onto the base color so it always
 * brightens and never darkens.
 */
export class ShockwaveEffect extends BaseEffect {
  readonly id = 'shockwave';
  readonly type: EffectType = 'shockwave';

  /** Blade-lengths per second the ring travels. 144 LEDs ≈ 0.83/s → full
   *  blade transit ≈ 1.2 s, feels snappy at most impact positions. */
  private readonly SPEED = 0.83;

  /** Sigma of the Gaussian pulse in blade-length units (~2.5 LEDs @ 144). */
  private readonly SIGMA = 0.018;

  /** Peak brightness of the ring (0-255). */
  private readonly PEAK_BRIGHTNESS = 255;

  constructor() {
    super();
    // Duration is generous — getProgress() will deactivate once the wave
    // has fully exited the blade regardless of this cap.
    this.duration = 2000;
  }

  override trigger(params: EffectParams): void {
    super.trigger(params);
    // position is inherited from BaseEffect (defaults to 0.5)
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    const elapsed = context.elapsed / 1000; // convert to seconds
    const impact = this.position;

    // Distance each wavefront has travelled from impact point
    const dist = elapsed * this.SPEED;

    // Two wavefronts: one toward hilt (position decreases) and one toward tip
    const hiltFront = impact - dist;   // centre of hilt-bound wave
    const tipFront = impact + dist;    // centre of tip-bound wave

    // Deactivate once both waves have exited [0, 1]
    if (hiltFront < -this.SIGMA * 4 && tipFront > 1 + this.SIGMA * 4) {
      this.active = false;
      return color;
    }

    // Inverse-square brightness falloff as wave expands: starts at 1, dims quickly
    // Clamp so early frames don't over-dim.
    const falloff = Math.max(0, 1 - dist * dist * 1.5);

    // Evaluate Gaussian contribution from each wavefront
    const gaussHilt = ShockwaveEffect.gaussian(position, hiltFront, this.SIGMA);
    const gaussTip  = ShockwaveEffect.gaussian(position, tipFront,  this.SIGMA);
    const combined  = Math.min(1, gaussHilt + gaussTip);

    const intensity = combined * falloff * this.PEAK_BRIGHTNESS;

    // Additive blend so the ring never darkens the underlying style
    const ring: RGB = { r: intensity, g: intensity, b: intensity };
    return blendAdd(color, ring, 1);
  }

  /** Evaluate a unit Gaussian centred at `mu` with std-dev `sigma`. */
  private static gaussian(x: number, mu: number, sigma: number): number {
    const d = (x - mu) / sigma;
    return Math.exp(-0.5 * d * d);
  }
}
