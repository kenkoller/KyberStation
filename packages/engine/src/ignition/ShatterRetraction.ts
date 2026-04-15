import { noise } from '../noise.js';
import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

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

  getMask(position: number, progress: number, context?: IgnitionContext): number {
    const scale = (context?.config?.shatterScale as number | undefined) ?? 20;
    const dimSpeed = ((context?.config?.shatterDimSpeed as number | undefined) ?? 100) / 100;
    // During retraction, progress goes 1 → 0. We invert to get a 0 → 1
    // "retract amount" so the blade breaks down as retraction advances.
    const retract = 1 - progress;
    // Noise-based fragmentation: fragments disappear as retraction advances
    const frag = noise(position * scale + retract * 0.001) > retract ? 1 : 0;
    // Overall dimming as the retraction progresses, controlled by dimSpeed
    const dim = 1 - retract * dimSpeed;
    return frag * Math.max(0, dim);
  }
}
