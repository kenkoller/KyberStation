import { BaseIgnition } from './BaseIgnition.js';

/**
 * FadeoutRetraction — blade fades out with a tip-biased dimming.
 *
 * Rather than retracting with a hard edge, the entire blade dims
 * progressively, with the tip fading faster than the hilt.
 *
 * Progress 0 = fully lit, progress 1 = fully off.
 * (In retraction mode, progress typically goes from 0 → 1.)
 */
export class FadeoutRetraction extends BaseIgnition {
  readonly id = 'fadeout';
  readonly name = 'Fade Out';

  getMask(position: number, progress: number): number {
    // As progress increases toward 1, brightness decreases.
    // Tip (higher position) fades faster due to the position multiplier.
    return (1 - progress) * (1 - position * 0.3);
  }
}
