import { BaseStyle } from '../BaseStyle.js';
import type { RGB, StyleContext } from '../../types.js';
import { noise } from '../../noise.js';

/**
 * Xenopixel Blade Effect ID 5 — Crack.
 *
 * Base color displayed at ~60% brightness with bright white "cracks"
 * that appear at irregular positions along the blade. ~3-5
 * simultaneous crack points, each lasting ~100-200ms. Maps to
 * `kyberStyle: 'crystalShatter'` in the board profile.
 */
export class XenoCrackStyle extends BaseStyle {
  readonly id = 'xeno-crack';
  readonly name = 'Xeno Crack';
  readonly description = 'Dimmed blade with bright white crack flashes at random positions.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Generate ~4 crack positions using time-shifted noise seeds.
    // Each crack lives for ~150ms (0.15 s) then moves.
    const crackSlot = Math.floor(time / 0.15);
    let crackIntensity = 0;

    for (let i = 0; i < 4; i++) {
      // Each crack has a pseudo-random position derived from its
      // time slot and its index.
      const crackPos = noise(crackSlot * 3.7 + i * 17.3);
      const dist = Math.abs(position - crackPos);

      // Crack width: ~3% of blade length.
      if (dist < 0.03) {
        // Fade within the crack width so edges aren't perfectly hard.
        const fade = 1 - dist / 0.03;
        crackIntensity = Math.max(crackIntensity, fade);
      }
    }

    // Base at ~60% brightness; cracks push toward white.
    const dimBase = 0.6;
    if (crackIntensity > 0) {
      // Lerp from dimmed base toward white based on crack intensity.
      const r = base.r * dimBase + (255 - base.r * dimBase) * crackIntensity;
      const g = base.g * dimBase + (255 - base.g * dimBase) * crackIntensity;
      const b = base.b * dimBase + (255 - base.b * dimBase) * crackIntensity;
      return { r, g, b };
    }

    return {
      r: base.r * dimBase,
      g: base.g * dimBase,
      b: base.b * dimBase,
    };
  }
}
