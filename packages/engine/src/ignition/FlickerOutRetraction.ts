import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * FlickerOutRetraction — blade dies like a failing fluorescent tube.
 *
 * Each LED gets 3-5 rapid on/off flickers before going permanently off.
 * The "dead zone" sweeps from tip to base as progress goes 1→0.
 * LEDs near the advancing dead front flicker; LEDs far from it stay solid.
 */
export class FlickerOutRetraction extends BaseIgnition {
  readonly id = 'flickerOut';
  readonly name = 'Flicker Out';

  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 91.233 + 47.891) * 43758.5453;
    return x - Math.floor(x);
  }

  getMask(position: number, progress: number, _context?: IgnitionContext): number {
    if (progress >= 1) return 1;
    if (progress <= 0) return 0;

    // Dead front travels from tip (pos=1) to base (pos=0) as progress drops 1→0.
    // At progress p, everything above p is dead, everything below is transitioning/alive.
    const deadFront = progress; // above this position → dead zone

    if (position > deadFront) {
      // Fully dead region
      return 0;
    }

    // Flicker transition zone: within 15% behind the dead front
    const flickerZoneWidth = 0.15;
    const distFromFront = deadFront - position;

    if (distFromFront < flickerZoneWidth) {
      // How close to the dead front (0 = at front, 1 = back of flicker zone)
      const zoneProgress = distFromFront / flickerZoneWidth;

      // Probability of being "off" increases toward the dead front
      const offProbability = 1 - zoneProgress;

      // Simulate 4 rapid flickers: use a high-frequency noise pattern
      // Each LED has 4 flicker cycles. Cycle frequency ~ 8 flickers per full retraction.
      const flickerPhase = (position * 73.1 + progress * 31.7) % 1.0;
      const flicker = this.pseudoRandom(position * 997 + Math.floor(progress * 40));

      if (flicker < offProbability * 0.7) {
        // Flicker OFF
        return 0;
      }

      // Slight dimming even when on
      return 0.5 + flickerPhase * 0.5;
    }

    // Fully alive region
    return 1;
  }
}
