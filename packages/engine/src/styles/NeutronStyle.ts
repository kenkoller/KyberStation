import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { lerpColor } from '../LEDArray.js';

/**
 * Bouncing neutron point with phosphor persistence trail.
 *
 * A single bright point travels along the blade at a speed that depends on
 * swing speed from context.  It bounces at both ends (hilt and tip).  As it
 * bounces, a brief bright flash illuminates the full end region.
 * Behind the point a decaying "phosphor" trail fades over ~20 LEDs.
 */
export class NeutronStyle extends BaseStyle {
  readonly id = 'neutron';
  readonly name = 'Neutron';
  readonly description = 'Fast-moving bright point bouncing along the blade with a phosphor persistence trail.';

  /**
   * Compute the normalised position (0-1) of the bouncing point at time `t`
   * and the bounce phase within the current half-cycle (used for flash).
   *
   * The motion is a triangle wave: the point bounces back and forth.
   * Period = 2 / speed (one full trip = hilt→tip + tip→hilt).
   */
  private static pointPosition(t: number, speed: number): { pos: number; nearEnd: boolean } {
    // Period of a full bounce (hilt→tip→hilt)
    const period = 2.0 / speed;
    // Phase within the period [0, period)
    const phase = ((t % period) + period) % period;
    // Normalised phase [0, 2): 0-1 = hilt→tip, 1-2 = tip→hilt
    const normPhase = (phase / period) * 2;

    let pos: number;
    if (normPhase <= 1) {
      pos = normPhase;          // travelling toward tip
    } else {
      pos = 2 - normPhase;      // travelling back toward hilt
    }

    // "near end" if within 3 % of either end (used for flash)
    const nearEnd = pos < 0.03 || pos > 0.97;

    return { pos, nearEnd };
  }

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const t = time;

    // Speed: base 1.5 blade-lengths/sec, scales up to 4× with swing
    const baseSpeed = (context.config.neutronSpeed as number | undefined) ?? 1.5;
    const swingBoost = 1 + context.swingSpeed * 2.5;
    const speed = baseSpeed * swingBoost;

    // ── Compute current point position ────────────────────────────────────
    const { pos: pointPos, nearEnd } = NeutronStyle.pointPosition(t, speed);

    // ── Trail brightness ───────────────────────────────────────────────────
    // The trail extends behind the point.  "Behind" is determined by the
    // direction of travel (sign of velocity).
    const period = 2.0 / speed;
    const phase = ((t % period) + period) % period;
    const normPhase = (phase / period) * 2;
    const direction = normPhase <= 1 ? 1 : -1; // +1 = hilt→tip, -1 = tip→hilt

    const ledCount = Math.max(1, context.config.ledCount ?? 132);
    const trailLEDs = 20; // ~20 LEDs of trail
    const trailLength = trailLEDs / ledCount; // normalised

    // Distance from this position to the point (signed: positive = behind)
    const signedDist = (pointPos - position) * direction;

    let trailBright = 0;
    if (signedDist >= 0 && signedDist <= trailLength) {
      // Exponential decay: bright at point, dark at tail
      const decay = signedDist / trailLength;
      trailBright = Math.exp(-decay * 5) * (1 - decay);
    }

    // ── Point brightness ──────────────────────────────────────────────────
    // The point itself covers ~1.5 pixels with a tight Gaussian.
    const pointRadius = 1.5 / ledCount;
    const distToPoint = Math.abs(position - pointPos);
    let pointBright = 0;
    if (distToPoint < pointRadius * 3) {
      pointBright = Math.exp(-(distToPoint * distToPoint) / (2 * pointRadius * pointRadius));
    }

    // ── End flash ─────────────────────────────────────────────────────────
    // When near an end, add a brief broad glow.  Intensity fades with
    // distance from the nearest end and with time since bounce.
    let flashBright = 0;
    if (nearEnd) {
      const endPos = pointPos < 0.5 ? 0 : 1;
      const distToEnd = Math.abs(position - endPos);
      const flashRadius = 0.08; // ~10 LEDs
      if (distToEnd < flashRadius) {
        flashBright = (1 - distToEnd / flashRadius) * 0.8;
      }
    }

    // ── Combine ───────────────────────────────────────────────────────────
    const maxBright = Math.min(1, pointBright * 1.0 + trailBright * 0.7 + flashBright);

    // Background: barely visible dark blade
    const bg: RGB = { r: base.r * 0.04, g: base.g * 0.04, b: base.b * 0.04 };

    // Point and flash are near-white; trail takes base color
    const trailColor = lerpColor(bg, base, Math.min(1, trailBright * 0.7 + flashBright));
    const pointColor: RGB = { r: 255, g: 255, b: 240 }; // bright near-white

    // Weighted blend: point dominates when close
    const pointWeight = (pointBright + flashBright * 0.5);
    const trailWeight = trailBright * 0.7;
    const totalWeight = pointWeight + trailWeight + 1e-9;
    const blendedColor = lerpColor(trailColor, pointColor, pointWeight / totalWeight);

    return lerpColor(bg, blendedColor, maxBright);
  }
}
