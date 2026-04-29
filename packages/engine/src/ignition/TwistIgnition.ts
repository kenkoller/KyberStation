import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * TwistIgnition — spiral ignition pattern.
 *
 * Hilt-to-tip wipe shaped by a sinusoidal spiral wobble. The blade's
 * `twistAngle` (rotation around the long axis, -1..1) shifts the
 * spiral phase along the blade — twisting the saber moves where the
 * wobble peaks fall during ignition. Does NOT consume `bladeAngle`;
 * the saber's tilt-off-vertical doesn't affect the pattern. Ignition
 * still completes on its own time per `ignitionMs` — twist only
 * shapes visuals, it doesn't trigger or speed up the wipe.
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
