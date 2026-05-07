import { BaseStyle } from '../BaseStyle.js';
import type { RGB, StyleContext } from '../../types.js';
import { noise } from '../../noise.js';
import { lerpColor } from '../../LEDArray.js';

/**
 * Xenopixel Blade Effect ID 0 — Fire.
 *
 * Simplified fire compared to ProffieOS StyleFire — no fireSize /
 * sparkRate / heatSpread parameters. Uses a single noise octave
 * modulated by position (brighter at base, flickering toward tip)
 * with a moderate ~6-8 Hz visual rhythm. More uniform than Proffie
 * fire — less dramatic spatial variation.
 */
export class XenoFireStyle extends BaseStyle {
  readonly id = 'xeno-fire';
  readonly name = 'Xeno Fire';
  readonly description = 'Warm flickering gradient — brighter at base, flickering toward tip.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Single-octave noise at ~7 Hz visual rhythm.
    // Position-scaled so the hilt end is calmer, tip end more turbulent.
    const n = noise(position * 6 + time * 7);

    // Blend toward yellow/white at peak heat — more uniform than Proffie fire.
    const yellow: RGB = { r: 255, g: 200, b: 50 };
    const heat = n * (0.3 + position * 0.3); // tip gets more heat variation
    const core = lerpColor(base, yellow, heat);

    // Overall brightness: base stays at ~80%+, noise adds the remaining 20%
    const bright = 0.8 + n * 0.2 * (1 - position * 0.3);

    return {
      r: core.r * bright,
      g: core.g * bright,
      b: core.b * bright,
    };
  }
}
