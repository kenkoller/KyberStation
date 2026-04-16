import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise, noise2d } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

/**
 * Glowing embers drifting upward along the blade like a dying fire.
 * Bright orange/red particles spawn near the base and rise toward the tip,
 * dimming as they go. The background is a dark smoldering red/orange.
 */
export class EmberStyle extends BaseStyle {
  readonly id = 'ember';
  readonly name = 'Ember';
  readonly description = 'Glowing embers drifting up the blade like a dying fire.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const t = time;

    // ── Background: dark smoldering base ──────────────────────────────────
    // Dim version of the base color, very low brightness
    const bgBright = 0.08 + noise(position * 5.3 + t * 0.4, 7) * 0.06;
    const bg: RGB = { r: base.r * bgBright, g: base.g * bgBright, b: base.b * bgBright };

    // ── Ember particles ───────────────────────────────────────────────────
    // Simulate N independent ember streams.  Each stream has a unique phase
    // and drift speed.  An ember "exists" at a given time at a certain blade
    // position and contributes brightness when 'position' is near that spot.
    const numEmbers = 12;
    let emberBright = 0.0;

    for (let i = 0; i < numEmbers; i++) {
      // Deterministic per-ember constants derived from index
      const seedA = noise(i * 3.7, 1);      // 0-1 birth offset
      const seedB = noise(i * 3.7, 2);      // 0-1 speed variance
      const seedC = noise(i * 3.7, 3);      // 0-1 horizontal scatter

      // Speed: 0.5–1 blade-lengths per second (slow upward drift)
      const speed = 0.5 + seedB * 0.5;

      // Cycle period for this ember (how often it resets from base)
      const period = 1.0 / speed;

      // Phase the ember's lifecycle: each ember is offset in time
      const phaseOffset = seedA * period;
      const cycleTime = ((t + phaseOffset) % period + period) % period;

      // Current blade position of the ember: 0 (base) → 1 (tip)
      const emberPos = cycleTime * speed;

      // Horizontal scatter — tiny wobble encoded in position offset
      const scatter = (seedC - 0.5) * 0.04;
      const dist = Math.abs(position - (emberPos + scatter));

      // Ember glow radius (~1 LED wide at ledCount=132, position is 0-1)
      const ledCount = context.config.ledCount ?? 132;
      const radius = 1.5 / ledCount;

      if (dist < radius * 4) {
        // Soft falloff using squared distance
        const falloff = Math.max(0, 1 - dist / (radius * 4));
        const softFalloff = falloff * falloff;

        // Ember dims as it rises toward the tip
        const heightFade = Math.max(0, 1 - emberPos * emberPos);

        // Flicker: small high-frequency noise per ember
        const flicker = 0.7 + noise(t * 18 + i * 5.1, 9) * 0.3;

        emberBright += softFalloff * heightFade * flicker;
      }
    }

    emberBright = Math.min(1, emberBright);

    // ── Ember color: bright orange/yellow-white ───────────────────────────
    // At peak, embers glow toward bright orange/yellow
    const ember: RGB = { r: 255, g: 140 + noise2d(position * 8, t * 3) * 60, b: 20 };
    const c = lerpColor(bg, ember, emberBright);

    return c;
  }
}
