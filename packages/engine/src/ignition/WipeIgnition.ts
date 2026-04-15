import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * WipeIgnition — smooth-edged wipe from hilt to tip.
 *
 * Unlike the hard cutoff of StandardIgnition, this produces a soft
 * gradient at the leading edge using a smoothstep-like transition.
 */
export class WipeIgnition extends BaseIgnition {
  readonly id = 'wipe';
  readonly name = 'Wipe';

  getMask(position: number, progress: number, context?: IgnitionContext): number {
    const edge = progress;
    const softness = ((context?.config?.wipeSoftness as number | undefined) ?? 3) / 100;
    return Math.max(0, Math.min(1, (edge - position) / softness));
  }
}
