import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { lerpColor } from '../LEDArray.js';

/**
 * MoireStyle — interference pattern from two overlapping frequency grids.
 *
 * Two sine-wave patterns at slightly different frequencies (e.g., 7 and 7.5
 * cycles along the blade) are multiplied together to create the characteristic
 * moire interference pattern. Both patterns drift slowly in opposite
 * directions, producing a mesmerizing slow-moving large-scale pattern from
 * fast small-scale waves.
 */
export class MoireStyle extends BaseStyle {
  readonly id = 'moire';
  readonly name = 'Moiré';
  readonly description =
    'Interference pattern from two overlapping frequency grids creating mesmerizing slow-moving waves.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Configurable frequencies via spatialWaveFrequency; default pair: 7 and 7.5
    const freqBase =
      (context.config.spatialWaveFrequency as number | undefined) ?? 7;
    const freq1 = freqBase;
    const freq2 = freqBase + 0.5; // slightly offset for interference

    // Drift speeds: patterns move in opposite directions
    const driftSpeed =
      ((context.config.spatialWaveSpeed as number | undefined) ?? 20) / 100;
    const drift1 = time * driftSpeed * 0.5;
    const drift2 = -time * driftSpeed * 0.4;

    // Two sine patterns mapped to [0, 1]
    const wave1 =
      Math.sin(position * freq1 * Math.PI * 2 + drift1 * Math.PI * 2) * 0.5 +
      0.5;
    const wave2 =
      Math.sin(position * freq2 * Math.PI * 2 + drift2 * Math.PI * 2) * 0.5 +
      0.5;

    // Multiply for moire interference
    const interference = wave1 * wave2;

    // Dim background
    const bg: RGB = { r: base.r * 0.06, g: base.g * 0.06, b: base.b * 0.06 };

    return lerpColor(bg, base, interference);
  }
}
