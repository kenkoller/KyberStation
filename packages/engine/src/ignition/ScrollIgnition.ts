import { BaseIgnition } from './BaseIgnition.js';

/**
 * ScrollIgnition — hilt-to-tip extension identical to Standard.
 *
 * Functionally the same as StandardIgnition but semantically distinct —
 * the scroll variant is typically paired with an easing curve to create
 * a smooth scrolling appearance rather than a sharp cutoff.
 */
export class ScrollIgnition extends BaseIgnition {
  readonly id = 'scroll';
  readonly name = 'Scroll';

  getMask(position: number, progress: number): number {
    return position <= progress ? 1 : 0;
  }
}
