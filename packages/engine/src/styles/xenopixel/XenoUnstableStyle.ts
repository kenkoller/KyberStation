import { BaseStyle } from '../BaseStyle.js';
import type { RGB, StyleContext } from '../../types.js';
import { noise } from '../../noise.js';

/**
 * Xenopixel Blade Effect ID 2 — Unstable.
 *
 * Random per-pixel brightness flicker. Each LED randomly varies
 * +/-15-25% brightness at a moderate rate. Simpler than ProffieOS
 * unstable — no structured flicker bands. Creates a "crackling
 * kyber crystal" appearance.
 */
export class XenoUnstableStyle extends BaseStyle {
  readonly id = 'xeno-unstable';
  readonly name = 'Xeno Unstable';
  readonly description = 'Per-pixel random brightness flicker — crackling kyber crystal.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Per-pixel flicker: use position as a spatial seed so each LED
    // gets its own flickering pattern. Multiply time by ~8 for a
    // moderate flicker rate.
    const flicker = noise(position * 144 + time * 8);

    // Map noise (0-1) to brightness range: 0.75 to 1.0 (±12.5% around 0.875)
    // which gives the ±15-25% variation described.
    const bright = 0.75 + flicker * 0.25;

    return {
      r: base.r * bright,
      g: base.g * bright,
      b: base.b * bright,
    };
  }
}
