import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * TwistIgnition — spiral ignition pattern.
 *
 * Pixels illuminate in a rotational sweep pattern. The twist angle
 * from the motion context drives the spiral direction.
 */
export class TwistIgnition extends BaseIgnition {
  readonly id = 'twist';
  readonly name = 'Twist Ignite';

  getMask(position: number, progress: number, context?: IgnitionContext): number {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    const twist = context?.twistAngle ?? 0;
    // Spiral: phase shifts along the blade based on position
    const spiralPhase = position * 3 + twist * 2;
    const spiralOffset = (Math.sin(spiralPhase * Math.PI * 2) * 0.5 + 0.5) * 0.15;

    // Base fill progresses hilt-to-tip with spiral wobble
    const threshold = progress + spiralOffset;
    if (position <= threshold) {
      // Smooth leading edge
      const edgeDist = threshold - position;
      return edgeDist > 0.05 ? 1 : edgeDist / 0.05;
    }
    return 0;
  }
}
