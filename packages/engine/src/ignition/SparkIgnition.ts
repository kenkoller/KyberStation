import { BaseIgnition } from './BaseIgnition.js';

/**
 * SparkIgnition — standard extension with leading spark tip.
 *
 * Same as the standard hilt-to-tip fill, but adds a bright spark
 * at the leading edge of the extending blade.
 */
export class SparkIgnition extends BaseIgnition {
  readonly id = 'spark';
  readonly name = 'Spark Tip';

  getMask(position: number, progress: number): number {
    const base = position <= progress ? 1 : 0;

    // Spark at the leading edge: small bright region ahead of fill
    if (position > progress - 0.05 && position < progress + 0.02) {
      return 1;
    }

    return base;
  }
}
