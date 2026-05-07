import { BaseStyle } from '../BaseStyle.js';
import type { RGB, StyleContext } from '../../types.js';

/**
 * Xenopixel Blade Effect ID 1 — Steady.
 *
 * Pure solid color with no shimmer modulation. This is the default
 * Xenopixel blade mode — simpler than ProffieOS StableStyle because
 * Xenopixel firmware applies no per-pixel flicker.
 */
export class XenoSteadyStyle extends BaseStyle {
  readonly id = 'xeno-steady';
  readonly name = 'Xeno Steady';
  readonly description = 'Solid blade color — default Xenopixel mode.';

  getColor(_position: number, _time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    return { r: base.r, g: base.g, b: base.b };
  }
}
