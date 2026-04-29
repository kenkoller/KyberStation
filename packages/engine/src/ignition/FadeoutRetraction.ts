import { BaseIgnition } from './BaseIgnition.js';

/**
 * FadeoutRetraction — blade fades out with a tip-biased dimming.
 *
 * Rather than retracting with a hard edge, the entire blade dims
 * progressively, with the tip fading faster than the hilt.
 *
 * Progress convention (engine sends):
 *   progress = 1 → start of retraction (fully lit)
 *   progress = 0 → end of retraction (fully off)
 */
export class FadeoutRetraction extends BaseIgnition {
  readonly id = 'fadeout';
  readonly name = 'Fade Out';

  getMask(position: number, progress: number): number {
    // progress goes 1→0 during retraction.
    // At progress=1 (start): mask ≈ 1 (fully lit)
    // At progress=0 (end):   mask = 0 (fully off)
    // Tip (higher position) fades faster due to the position multiplier.
    return progress * (1 - position * 0.3);
  }
}
