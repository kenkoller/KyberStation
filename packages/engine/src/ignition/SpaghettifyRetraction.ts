import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * SpaghettifyRetraction — black hole spaghettification toward the hilt singularity.
 *
 * Models the gravitational stretching effect of a singularity at position 0 (hilt).
 * As retraction progresses, all lit pixels compress non-linearly toward the hilt.
 * The boundary between lit and dark uses a smoothstep to avoid harsh edges.
 * Surviving LEDs grow brighter (energy compression) as the lit region shrinks.
 *
 * The quadratic progress curve gives a slow, eerie start that accelerates
 * terrifyingly fast at the end — selling the gravitational feel.
 *
 * Final collapse (progress > 0.9): remaining pixels narrow to a sliver at the
 * hilt, flash bright white, then snap off.
 *
 * Progress convention:
 *   progress = 1 → start of retraction (fully lit)
 *   progress = 0 → end of retraction (fully off)
 *
 * Internally we work with retract = 1 - progress (0 → 1).
 */
export class SpaghettifyRetraction extends BaseIgnition {
  readonly id = 'spaghettify';
  readonly name = 'Spaghettify';

  /**
   * Attempt to make the lit region appear to compress and stretch
   * slightly beyond the physical boundary during transition.
   */
  private readonly STRETCH_FACTOR = 1.15;

  /** Maximum brightness multiplier for compressed energy. */
  private readonly MAX_BRIGHTNESS = 3.0;

  /** Smoothstep — Hermite interpolation for soft edges. */
  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  getMask(position: number, progress: number, _context?: IgnitionContext): number {
    // Convert retraction convention: progress 1→0 becomes retract 0→1
    const retract = 1 - progress;

    // Nothing to do at start
    if (retract <= 0) return 1;
    // Everything off at end
    if (retract >= 1) return 0;

    // --- Quadratic collapse curve: slow start, fast finish ---
    // surviveFraction is the fraction of the blade that remains lit.
    // It shrinks quadratically: (1 - retract)^2
    const surviveFraction = (1 - retract) * (1 - retract);

    // The lit/dark boundary — positions above this are dark
    const boundary = surviveFraction * this.STRETCH_FACTOR;

    // --- Final collapse phase (retract > 0.9) ---
    if (retract > 0.9) {
      // Map 0.9-1.0 to a collapse phase 0→1
      const collapsePhase = (retract - 0.9) / 0.1;

      // The lit region narrows to just a few pixels at position 0
      // collapsePhase 0→0.7: bright flash at hilt
      // collapsePhase 0.7→1.0: everything off
      if (collapsePhase > 0.7) {
        // Final snap-off
        return 0;
      }

      // Only the very base remains lit during collapse
      const collapseBoundary = boundary * (1 - collapsePhase);
      if (position > collapseBoundary) return 0;

      // Bright white flash for surviving pixels
      const flashIntensity = 1.0 + collapsePhase * 2.0; // up to 3.0
      return Math.min(this.MAX_BRIGHTNESS, flashIntensity);
    }

    // --- Main spaghettification: soft boundary with brightness compression ---

    // Smoothstep transition zone width — grows slightly as boundary shrinks
    // so the edge stays visually soft even when the lit region is small
    const edgeWidth = 0.06 + 0.04 * retract;

    // Positions beyond the boundary are dark (smoothstep from 1 to 0)
    if (position > boundary) return 0;

    // Soft edge near the boundary
    const edgeStart = Math.max(0, boundary - edgeWidth);
    if (position > edgeStart) {
      // Smoothstep fade: 1 at edgeStart → 0 at boundary
      const fade = 1 - this.smoothstep(edgeStart, boundary, position);

      // Apply brightness compression to the fading edge too
      const brightness = Math.min(this.MAX_BRIGHTNESS, 1 / Math.max(0.1, 1 - retract));
      return fade * brightness;
    }

    // --- Interior: fully lit with brightness boost from energy compression ---
    // As the lit region shrinks, brightness increases (energy conservation)
    const brightness = Math.min(this.MAX_BRIGHTNESS, 1 / Math.max(0.1, 1 - retract));
    return brightness;
  }
}
