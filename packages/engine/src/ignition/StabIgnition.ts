import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * StabIgnition — rapid center-out burst ignition.
 *
 * Inspired by the stab-on gesture. The blade ignites from the center
 * outward in a rapid burst, with a bright flash at the center point.
 */
export class StabIgnition extends BaseIgnition {
  readonly id = 'stab';
  readonly name = 'Stab Ignite';

  getMask(position: number, progress: number, _context?: IgnitionContext): number {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    // Center point of the burst (midpoint of blade)
    const center = 0.5;
    const distFromCenter = Math.abs(position - center);
    // Max distance from center is 0.5
    const normalizedDist = distFromCenter / 0.5;

    // Burst expands outward from center
    // progress 0→0.3: rapid center flash
    // progress 0.3→1: expanding fill
    if (progress < 0.3) {
      // Initial flash: bright core, quick expansion
      const coreProgress = progress / 0.3;
      const coreRadius = coreProgress * 0.2;
      if (normalizedDist <= coreRadius) {
        return 1;
      }
      // Glow around core
      if (normalizedDist <= coreRadius + 0.1) {
        return (1 - (normalizedDist - coreRadius) / 0.1) * coreProgress;
      }
      return 0;
    }

    // Main expansion phase
    const expandProgress = (progress - 0.3) / 0.7;
    const expandRadius = 0.2 + expandProgress * 0.8;
    if (normalizedDist <= expandRadius) {
      const edgeDist = expandRadius - normalizedDist;
      return edgeDist > 0.05 ? 1 : edgeDist / 0.05;
    }

    return 0;
  }
}
