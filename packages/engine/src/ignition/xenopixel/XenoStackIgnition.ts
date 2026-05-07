import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Special Preon 0 — Stack.
 *
 * Segments stack up from base to tip one at a time. Each segment
 * fully lights before the next begins, creating a visible stepping
 * effect — like blocks being stacked. This is a Xenopixel "special
 * preon" ignition mode distinct from the standard blade modes.
 */
export class XenoStackIgnition extends BaseIgnition {
  readonly id = 'xeno-stack';
  readonly name = 'Xeno Stack';

  getMask(position: number, progress: number): number {
    // 12 discrete segments stack from base to tip
    const segments = 12;
    const segIndex = Math.floor(position * segments);

    // How many full segments should be lit at this progress
    const litSegments = Math.floor(progress * segments);

    // Segment fully below the current stack level: lit
    if (segIndex < litSegments) {
      return 1;
    }

    // Current stacking segment: quick fill within its window
    if (segIndex === litSegments) {
      const segLocalProgress = (progress * segments) - litSegments;
      // Each segment snaps on quickly once it starts
      return segLocalProgress > 0.3 ? 1 : segLocalProgress / 0.3;
    }

    // Above the stack: dark
    return 0;
  }
}
