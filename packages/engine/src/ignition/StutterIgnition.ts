import { BaseIgnition } from './BaseIgnition.js';

/**
 * StutterIgnition — unstable ignition that jitters as it extends.
 *
 * The fill edge oscillates around the expected position, creating a
 * stuttering, unstable-crystal look as the blade ignites.
 */
export class StutterIgnition extends BaseIgnition {
  readonly id = 'stutter';
  readonly name = 'Stutter';

  getMask(position: number, progress: number): number {
    const stutter = Math.sin(progress * 30) * 0.1;
    return position <= progress + stutter ? 1 : 0;
  }
}
