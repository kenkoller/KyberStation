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
    // Noise-based fragmentation: fragments disappear as progress increases
    const frag = noise(position * 20 + progress * 0.001) > progress ? 1 : 0;
    // Overall dimming as the retraction progresses
    return frag * (1 - progress * 0.5);
  }
}
