import { BaseStyle } from '../BaseStyle.js';
import type { RGB, StyleContext } from '../../types.js';

/**
 * Xenopixel Blade Effect ID 3 — Rainbow.
 *
 * Smooth rainbow gradient cycling along the blade. HSL hue cycles
 * 0-360 degrees over the blade length and the whole pattern scrolls
 * slowly over time. Ignores baseColor — always full rainbow.
 * Cycle speed: ~2-3 seconds per full color cycle.
 */
export class XenoRainbowStyle extends BaseStyle {
  readonly id = 'xeno-rainbow';
  readonly name = 'Xeno Rainbow';
  readonly description = 'Smooth cycling rainbow gradient — ignores base color.';

  getColor(position: number, time: number, _context: StyleContext): RGB {
    // Hue cycles over position (full 360 across the blade) and scrolls
    // over time at ~0.4 Hz for a ~2.5 s full cycle.
    const hue = ((position + time * 0.4) % 1.0 + 1.0) % 1.0;
    return hslToRgb(hue, 1.0, 0.5);
  }
}

/**
 * Convert HSL (h in 0-1, s in 0-1, l in 0-1) to RGB (0-255).
 * Minimal implementation — no external deps.
 */
function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r1: number;
  let g1: number;
  let b1: number;

  const sector = Math.floor(h * 6) % 6;
  switch (sector) {
    case 0: r1 = c; g1 = x; b1 = 0; break;
    case 1: r1 = x; g1 = c; b1 = 0; break;
    case 2: r1 = 0; g1 = c; b1 = x; break;
    case 3: r1 = 0; g1 = x; b1 = c; break;
    case 4: r1 = x; g1 = 0; b1 = c; break;
    default: r1 = c; g1 = 0; b1 = x; break;
  }

  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
  };
}
