import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * UnravelRetraction — color unwinds from the blade like thread being pulled.
 *
 * A spiral-like pattern sweeps from tip to base. The leading edge leaves a
 * dim/dark trail, with a soft trailing fade. The motion is smooth and graceful.
 */
export class UnravelRetraction extends BaseIgnition {
  readonly id = 'unravel';
  readonly name = 'Unravel';

  getMask(position: number, progress: number, _context?: IgnitionContext): number {
    if (progress >= 1) return 1;
    if (progress <= 0) return 0;

    // The "unravel front" moves from tip (1) to base (0) as progress decreases 1→0.
    // At retraction progress p, LEDs above p are unraveled (dark/dim).
    const unravelFront = progress;

    if (position <= unravelFront) {
      // Still-lit region: apply a gentle sinusoidal undulation ("thread tension")
      // that gives the remaining blade a slight wave as the energy is pulled out.
      const wave = Math.sin(position * Math.PI * 6 - (1 - progress) * Math.PI * 4) * 0.08;
      return Math.max(0, Math.min(1, 0.85 + wave));
    }

    // Unraveled region: dim trailing fade behind the unravel front
    const trailWidth = 0.12; // trailing fade zone behind the front
    const distBehind = position - unravelFront;

    if (distBehind < trailWidth) {
      // Soft leading edge that dims to black — like thread leaving a dim afterimage
      const t = distBehind / trailWidth;
      // Cosine ease-out for smooth transition
      return (1 - Math.cos(t * Math.PI)) * 0.5 * (1 - t);
    }

    // Fully unraveled — dark
    return 0;
  }
}
