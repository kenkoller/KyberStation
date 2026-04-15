import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * SparkIgnition — standard extension with leading spark tip.
 *
 * Same as the standard hilt-to-tip fill, but adds a bright spark
 * at the leading edge of the extending blade.
 */
export class SparkIgnition extends BaseIgnition {
  readonly id = 'spark';
  readonly name = 'Spark Tip';

  getMask(position: number, progress: number, context?: IgnitionContext): number {
    const trail = ((context?.config?.sparkTrail as number | undefined) ?? 5) / 100;
    const size = ((context?.config?.sparkSize as number | undefined) ?? 5) / 100;
    const base = position <= progress ? 1 : 0;

    // Spark at the leading edge: bright region around fill position
    if (position > progress - trail && position < progress + size) {
      return 1;
    }

    return base;
  }
}
