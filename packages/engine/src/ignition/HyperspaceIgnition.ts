import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * HyperspaceIgnition — lightspeed jump with starline streaks snapping to solid.
 *
 * Three phases:
 *   1. (0-0.2)   Bright point at hilt with adjacents blooming
 *   2. (0.2-0.7) Accelerating streaks with motion blur tails
 *   3. (0.7-1.0) Fast wipe fills remaining pixels to solid
 */
export class HyperspaceIgnition extends BaseIgnition {
  readonly id = 'hyperspace';
  readonly name = 'Hyperspace';

  /** Cubic-in easing for hyperspace acceleration feel. */
  private cubicIn(t: number): number {
    return t * t * t;
  }

  getMask(position: number, progress: number, _context?: IgnitionContext): number {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    // ── Phase 1 (0 - 0.2): Bright hilt point with bloom ──
    if (progress < 0.2) {
      const phaseT = progress / 0.2; // 0-1 within this phase
      // Core pixel at position 0: full brightness
      // Adjacent pixels bloom outward as phase progresses
      const bloomRadius = 0.015 + phaseT * 0.025; // ~2 pixels expanding to ~4
      if (position <= bloomRadius) {
        const dist = position / bloomRadius;
        if (dist < 0.3) return 1.0; // core pixel
        return 0.3 * (1 - dist); // adjacent bloom at 30% fading out
      }
      return 0;
    }

    // ── Phase 2 (0.2 - 0.7): Streak phase with accelerating leading edge ──
    if (progress < 0.7) {
      const phaseT = (progress - 0.2) / 0.5; // 0-1 within this phase
      const leadingEdge = this.cubicIn(phaseT); // accelerates base to tip

      if (position > leadingEdge) {
        return 0; // ahead of leading edge: dark
      }

      // Bright leading edge (mask > 1.0 for white-hot feel)
      const edgeWidth = 0.03;
      if (position > leadingEdge - edgeWidth) {
        return 1.5;
      }

      // Behind leading edge: fade-in tail proportional to how recently it passed
      // Creates motion blur streaks
      const timeSincePassed = leadingEdge - position;
      const tailLength = 0.4 + phaseT * 0.6; // tail grows as speed increases

      if (timeSincePassed < tailLength) {
        // Exponential falloff from leading edge backward
        const falloff = 1 - timeSincePassed / tailLength;
        return 0.3 + 0.7 * falloff * falloff;
      }

      // Far behind: dim but building baseline
      return 0.15 + 0.15 * phaseT;
    }

    // ── Phase 3 (0.7 - 1.0): Fast base-to-tip wipe to solid ──
    const phaseT = (progress - 0.7) / 0.3; // 0-1 within this phase
    const wipeFront = phaseT; // linear wipe

    if (position <= wipeFront) {
      return 1.0; // settled to solid blade color
    }

    // Pixels not yet wiped retain streak brightness, decaying toward 1.0
    // Transition from streak-bright (~1.5) down to 1.0 as wipe approaches
    const distFromWipe = position - wipeFront;
    const remaining = 1 - wipeFront;
    if (remaining > 0) {
      const streakFade = 1.0 + 0.5 * (distFromWipe / remaining);
      return Math.min(streakFade, 1.5);
    }

    return 1.0;
  }
}
