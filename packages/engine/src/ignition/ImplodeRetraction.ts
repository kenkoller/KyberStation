import { BaseIgnition } from './BaseIgnition.js';

/**
 * ImplodeRetraction — blade collapses inward from both ends toward the center,
 * then the center point shrinks to nothing.
 *
 * Think of a reverse Center-Out ignition with added visual drama:
 *
 *   Phase 1 (0–70% progress): Both the tip and hilt retract inward toward
 *   the center (position 0.5). The lit region shrinks from [0,1] to a narrow
 *   band around the midpoint. Smooth-step easing keeps the motion organic.
 *   LEDs near the shrinking boundary brighten slightly (mask up to ~1.3) to
 *   simulate energy being compressed into the remaining segment.
 *
 *   Phase 2 (70–100% progress): The remaining center band itself fades out.
 *   A brief bright flash at the very center occurs right at the phase
 *   transition, then the whole blade goes dark.
 *
 * Progress convention (engine sends):
 *   progress = 1 → start of retraction (fully lit)
 *   progress = 0 → end of retraction (fully off)
 *
 * Internally we work with retract = 1 - progress (0 → 1).
 */
export class ImplodeRetraction extends BaseIgnition {
  readonly id = 'implode';
  readonly name = 'Implode';

  /** Width of the compression brightening zone at the boundary edges. */
  private readonly EDGE_GLOW_WIDTH = 0.06;

  /** Peak brightness multiplier for the compression effect. */
  private readonly COMPRESSION_PEAK = 1.3;

  /** Progress split between phase 1 (collapse) and phase 2 (fade). */
  private readonly PHASE_SPLIT = 0.7;

  /** Smooth-step easing: 3t^2 - 2t^3. */
  private smoothStep(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
  }

  getMask(position: number, progress: number): number {
    // Engine sends progress 1→0; convert to internal 0→1 "retract" amount
    const retract = 1 - progress;
    // retract 0 = fully lit, retract 1 = fully off
    if (retract <= 0) return 1;
    if (retract >= 1) return 0;

    // ─── Phase 1: Both ends collapse toward center (retract 0 → 0.7) ───

    if (retract < this.PHASE_SPLIT) {
      // Normalise phase-1 retract to [0, 1]
      const p1 = retract / this.PHASE_SPLIT;

      // Eased collapse amount: how far each edge has moved inward
      const collapse = this.smoothStep(p1) * 0.5; // max 0.5 = edges meet at center

      // Current lit boundaries
      const lowerEdge = collapse;         // rises from 0 toward 0.5
      const upperEdge = 1 - collapse;     // falls from 1 toward 0.5

      // Outside the lit band → fully off
      if (position < lowerEdge || position > upperEdge) {
        return 0;
      }

      // Distance from the nearest collapsing boundary
      const distFromLower = position - lowerEdge;
      const distFromUpper = upperEdge - position;
      const distFromEdge = Math.min(distFromLower, distFromUpper);

      // Compression brightening: LEDs near the boundary glow hotter
      if (distFromEdge < this.EDGE_GLOW_WIDTH) {
        const edgeFactor = 1 - distFromEdge / this.EDGE_GLOW_WIDTH; // 1 at edge, 0 at interior
        const intensity = 1 + (this.COMPRESSION_PEAK - 1) * edgeFactor * p1;
        return Math.min(this.COMPRESSION_PEAK, intensity);
      }

      // Interior of the lit band → normal brightness
      return 1;
    }

    // ─── Phase 2: Center band fades out with a flash (retract 0.7 → 1.0) ───

    // Normalise phase-2 retract to [0, 1]
    const p2 = (retract - this.PHASE_SPLIT) / (1 - this.PHASE_SPLIT);

    // The remaining band is narrow around center (half-width starts at ~0
    // from the end of phase 1 and we give it a small residual width)
    const bandHalfWidth = 0.04 * (1 - this.smoothStep(p2));

    // Outside the residual center band → off
    const distFromCenter = Math.abs(position - 0.5);
    if (distFromCenter > bandHalfWidth + 0.01) {
      return 0;
    }

    // Center flash: brief bright pulse at the start of phase 2
    // Peaks at p2 ~ 0.1, then decays
    const flashEnvelope = Math.exp(-p2 * 8); // fast exponential decay

    // Spatial focus: flash is brightest at dead center
    const centerFocus = Math.max(0, 1 - distFromCenter / Math.max(0.001, bandHalfWidth + 0.01));

    // Combine: flash + fade-out
    const baseFade = 1 - this.smoothStep(p2);
    const flash = flashEnvelope * 0.5 * centerFocus; // adds up to 0.5 extra brightness

    return Math.max(0, Math.min(this.COMPRESSION_PEAK, baseFade * centerFocus + flash));
  }
}
