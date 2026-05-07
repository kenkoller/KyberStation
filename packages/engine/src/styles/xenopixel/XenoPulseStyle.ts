import { BaseStyle } from '../BaseStyle.js';
import type { RGB, StyleContext } from '../../types.js';

/**
 * Xenopixel Blade Effect ID 6 — Pulse.
 *
 * Smooth breathing/pulsing effect — brightness oscillates uniformly
 * across the whole blade via a sine wave. Min ~40%, max 100%.
 * Period: ~1.8 seconds. Simpler than ProffieOS PulseStyle which can
 * have position-variant pulse.
 */
export class XenoPulseStyle extends BaseStyle {
  readonly id = 'xeno-pulse';
  readonly name = 'Xeno Pulse';
  readonly description = 'Uniform breathing pulse — whole blade brightens and dims together.';

  /** Pulse period in seconds. ~1.8 s ≈ 0.556 Hz. */
  private static readonly PERIOD = 1.8;
  private static readonly MIN_BRIGHT = 0.4;

  getColor(_position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Sine wave oscillation: (sin + 1) / 2 maps to 0-1.
    const phase = (time / XenoPulseStyle.PERIOD) * Math.PI * 2;
    const wave = (Math.sin(phase) + 1) * 0.5;
    const bright = XenoPulseStyle.MIN_BRIGHT + wave * (1 - XenoPulseStyle.MIN_BRIGHT);

    return {
      r: base.r * bright,
      g: base.g * bright,
      b: base.b * bright,
    };
  }
}
