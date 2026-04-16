import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * SeismicIgnition — thick seismic wavefront with damped oscillation ringing.
 *
 * An 8-12 LED wide wavefront travels base to tip. Once the wavefront passes,
 * each pixel enters damped sinusoidal oscillation — the blade "rings" like a
 * struck bell, gradually settling into stillness.
 */
export class SeismicIgnition extends BaseIgnition {
  readonly id = 'seismic';
  readonly name = 'Seismic';

  // Damped oscillation parameters
  private readonly AMPLITUDE = 0.35;
  private readonly OMEGA = 25; // angular frequency for visible vibration
  private readonly DECAY = 6; // decay rate, tuned for ~300ms visible oscillation

  // Wavefront width in normalized blade units (~10 LEDs on a 132-LED blade)
  private readonly WAVEFRONT_WIDTH = 10 / 132;

  /** Slight ease-out for wavefront travel. */
  private easeOut(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  getMask(position: number, progress: number, _context?: IgnitionContext): number {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    // Wavefront center position (slight ease-out for natural deceleration)
    const wavefrontCenter = this.easeOut(progress);
    const wavefrontLeading = wavefrontCenter + this.WAVEFRONT_WIDTH * 0.5;
    const wavefrontTrailing = wavefrontCenter - this.WAVEFRONT_WIDTH * 0.5;

    // ── Ahead of wavefront: dark ──
    if (position > wavefrontLeading) {
      return 0;
    }

    // ── Within wavefront band ──
    if (position >= wavefrontTrailing && position <= wavefrontLeading) {
      const posInBand = (position - wavefrontTrailing) / this.WAVEFRONT_WIDTH;

      // Leading 30-40% of wavefront is extra bright (white-hot leading edge)
      if (posInBand > 0.6) {
        // Leading edge: ramp up to 1.3
        const leadT = (posInBand - 0.6) / 0.4;
        return 1.0 + 0.3 * leadT;
      }

      // Core of wavefront: full brightness
      return 1.0;
    }

    // ── Behind wavefront: damped oscillation ──
    // t_local represents how long ago the wavefront passed this pixel
    // Scaled so that the full blade length maps to a meaningful time range
    const distBehind = wavefrontTrailing - position;
    const tLocal = distBehind * 8; // scale factor for oscillation timing

    // Damped sinusoidal ringing
    const oscillation =
      this.AMPLITUDE *
      Math.sin(this.OMEGA * tLocal) *
      Math.exp(-this.DECAY * tLocal);

    // Mask: 1.0 (settled) plus oscillation ripple
    // Clamp minimum to 0.7 so the blade never goes too dim behind the front
    return Math.max(0.7, 1.0 + oscillation);
  }
}
