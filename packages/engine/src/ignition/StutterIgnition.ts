import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * StutterIgnition — unstable ignition that jitters as it extends.
 *
 * The fill edge oscillates around the expected position, creating a
 * stuttering, unstable-crystal look as the blade ignites.
 *
 * When `stutterFullExtend` is true (default), the blade always reaches
 * full extension. When false, the stutter can pull the edge below the
 * true progress for a "struggling" partial-extend effect.
 */
export class StutterIgnition extends BaseIgnition {
  readonly id = 'stutter';
  readonly name = 'Stutter';

  getMask(position: number, progress: number, context?: IgnitionContext): number {
    const fullExtend = (context?.config?.stutterFullExtend as boolean | undefined) ?? true;
    const count = (context?.config?.stutterCount as number | undefined) ?? 30;
    const amplitude = ((context?.config?.stutterAmplitude as number | undefined) ?? 10) / 100;
    const stutter = Math.sin(progress * count) * amplitude;
    const threshold = fullExtend
      ? Math.max(progress, progress + stutter)
      : Math.max(0, progress + stutter);
    return position <= threshold ? 1 : 0;
  }
}
