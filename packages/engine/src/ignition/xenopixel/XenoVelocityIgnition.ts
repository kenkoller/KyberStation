import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Ignition Mode 1 — Velocity.
 *
 * Fast forward-scroll ignition where pixels appear to scroll upward
 * quickly from the base. Uses an ease-out curve so the blade lights
 * rapidly at first and decelerates as it reaches the tip, giving the
 * impression of a quick burst of energy.
 */
export class XenoVelocityIgnition extends BaseIgnition {
  readonly id = 'xeno-velocity';
  readonly name = 'Xeno Velocity';

  getMask(position: number, progress: number): number {
    // Ease-out cubic: fast initial burst, decelerating toward tip
    const eased = 1 - Math.pow(1 - progress, 3);
    return position <= eased ? 1 : 0;
  }
}
