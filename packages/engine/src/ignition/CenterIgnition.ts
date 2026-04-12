import { BaseIgnition } from './BaseIgnition.js';

/**
 * CenterIgnition — blade extends outward from the center.
 *
 * The ignition starts at the midpoint (0.5) and expands in both
 * directions simultaneously.
 */
export class CenterIgnition extends BaseIgnition {
  readonly id = 'center';
  readonly name = 'Center Out';

  getMask(position: number, progress: number): number {
    const dist = Math.abs(position - 0.5);
    return dist <= progress * 0.5 ? 1 : 0;
  }
}
