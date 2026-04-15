import { noise } from '../noise.js';
import { BaseIgnition } from './BaseIgnition.js';

/**
 * ShatterRetraction — blade fragments and dissolves like shattering crystal.
 *
 * Noise-driven fragments disappear as progress increases, with an overall
 * dimming effect. Creates a dramatic "crystal shattering" retraction look.
 *
 * Progress 0 = fully lit, progress 1 = fully off.
 */
export class ShatterRetraction extends BaseIgnition {
  readonly id = 'shatter';
  readonly name = 'Shatter';

  getMask(position: number, progress: number): number {
    // During retraction, progress goes 1 → 0. We invert to get a 0 → 1
    // "retract amount" so the blade breaks down as retraction advances.
    const retract = 1 - progress;
    // Noise-based fragmentation: fragments disappear as retraction advances
    const frag = noise(position * 20 + retract * 0.001) > retract ? 1 : 0;
    // Overall dimming as the retraction progresses
    return frag * progress;
  }
}
