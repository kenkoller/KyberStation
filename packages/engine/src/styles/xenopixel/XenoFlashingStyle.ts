import { BaseStyle } from '../BaseStyle.js';
import type { RGB, StyleContext } from '../../types.js';

/**
 * Xenopixel Blade Effect ID 7 — Flashing.
 *
 * Strobe/flash effect alternating between full brightness and
 * near-off. ~4.5 Hz (approximately 50/50 duty cycle). When "off"
 * the blade drops to ~5% brightness, not fully black.
 */
export class XenoFlashingStyle extends BaseStyle {
  readonly id = 'xeno-flashing';
  readonly name = 'Xeno Flashing';
  readonly description = 'Fast strobe — alternates between full and near-off brightness.';

  /** Flash frequency in Hz. */
  private static readonly FREQ_HZ = 4.5;
  /** Brightness during the "off" phase (5%). */
  private static readonly DIM_LEVEL = 0.05;

  getColor(_position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Square wave via sine sign: positive half = ON, negative = DIM.
    const phase = time * XenoFlashingStyle.FREQ_HZ * Math.PI * 2;
    const isOn = Math.sin(phase) >= 0;
    const bright = isOn ? 1.0 : XenoFlashingStyle.DIM_LEVEL;

    return {
      r: base.r * bright,
      g: base.g * bright,
      b: base.b * bright,
    };
  }
}
