import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Ignition Mode 4 — Ghost.
 *
 * Fade-in ignition where the entire blade fades in simultaneously
 * rather than wiping from one end. All positions light at the same
 * time, with brightness ramping from 0 to 1 over the ignition
 * duration. Uses an ease-in-out curve for a smooth appearance.
 */
export class XenoGhostIgnition extends BaseIgnition {
  readonly id = 'xeno-ghost';
  readonly name = 'Xeno Ghost';

  getMask(_position: number, progress: number): number {
    // Smooth ease-in-out fade for the entire blade simultaneously
    // Ease-in-out: slow start, accelerate, slow end
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    return eased;
  }
}
