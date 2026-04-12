import { BaseIgnition } from './BaseIgnition.js';

/**
 * StandardIgnition — simple hilt-to-tip extension.
 *
 * The blade fills from position 0 (hilt) outward. LEDs at positions
 * less than or equal to the current progress are fully lit.
 */
export class StandardIgnition extends BaseIgnition {
  readonly id = 'standard';
  readonly name = 'Standard';

  getMask(position: number, progress: number): number {
    return position <= progress ? 1 : 0;
  }
}
