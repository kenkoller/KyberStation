import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * SwingIgnition — speed-reactive ignition.
 *
 * The blade fills faster when swing speed is higher.
 * At rest the fill is smooth; at high swing speed the fill
 * accelerates with a bright leading edge.
 */
export class SwingIgnition extends BaseIgnition {
  readonly id = 'swing';
  readonly name = 'Swing Ignite';

  getMask(position: number, progress: number, context?: IgnitionContext): number {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    const speed = context?.swingSpeed ?? 0;
    // Speed boost: high swing speed pushes the fill further ahead
    const speedBoost = 1 + speed * 0.4;
    const boostedProgress = Math.min(progress * speedBoost, 1);

    if (position <= boostedProgress) {
      // Bright leading edge that intensifies with swing speed
      const edgeDist = boostedProgress - position;
      if (edgeDist < 0.08) {
        // Leading spark scales with speed
        return 0.7 + speed * 0.3;
      }
      return 1;
    }

    // Slight glow ahead of fill when swinging fast
    if (speed > 0.3) {
      const aheadDist = position - boostedProgress;
      if (aheadDist < 0.04 * speed) {
        return 0.3 * speed * (1 - aheadDist / (0.04 * speed));
      }
    }

    return 0;
  }
}
