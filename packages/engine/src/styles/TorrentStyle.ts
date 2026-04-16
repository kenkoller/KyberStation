import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { lerpColor } from '../LEDArray.js';

/**
 * TorrentStyle — rapid cascading streams of light flowing from hilt to tip,
 * like water rushing through a pipe.
 *
 * Multiple overlapping wave streams (3-5) travel at different speeds along the
 * blade. Each stream has a slightly different wavelength and phase offset.
 * The base color is modulated by the combined stream intensity, with streams
 * blending additively. Swing speed increases stream velocity.
 */
export class TorrentStyle extends BaseStyle {
  readonly id = 'torrent';
  readonly name = 'Torrent';
  readonly description =
    'Rapid cascading streams of light flowing from hilt to tip, like water rushing through a pipe.';

  /** Stream configurations: [speed multiplier, wavelength, phase offset] */
  private static readonly STREAMS: ReadonlyArray<[number, number, number]> = [
    [1.0, 8.0, 0.0],
    [1.4, 6.5, 0.7],
    [0.8, 10.0, 2.3],
    [1.7, 7.2, 4.1],
    [1.2, 9.0, 5.6],
  ];

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Base speed: 0.8 blade-lengths/sec, boosted by swing
    const swingBoost = 1.0 + context.swingSpeed * 2.0;
    const baseSpeed = 0.8 * swingBoost;

    // Dim background: 8% of base color
    const bg: RGB = { r: base.r * 0.08, g: base.g * 0.08, b: base.b * 0.08 };

    let totalIntensity = 0;

    for (const [speedMul, wavelength, phaseOffset] of TorrentStyle.STREAMS) {
      const speed = baseSpeed * speedMul;
      // Each stream is a sin wave traveling from hilt (0) to tip (1)
      const phase =
        position * wavelength * Math.PI * 2 - time * speed * Math.PI * 2 + phaseOffset;
      // Map sin to [0, 1] and sharpen the peaks for distinct stream pulses
      const raw = Math.sin(phase) * 0.5 + 0.5;
      const sharp = raw * raw; // quadratic sharpening
      totalIntensity += sharp;
    }

    // Normalize: divide by stream count and clamp to [0, 1]
    const streamCount = TorrentStyle.STREAMS.length;
    const normalized = Math.min(1, totalIntensity / (streamCount * 0.6));

    return lerpColor(bg, base, normalized);
  }
}
