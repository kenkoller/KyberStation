import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { lerpColor } from '../LEDArray.js';

/**
 * Double helix pattern spiraling along the blade.
 * Two sinusoidal strands are offset by 180° and scroll from base to tip.
 * The primary strand uses baseColor; the secondary uses accentColor (falls back
 * to a complementary hue shift of baseColor if not supplied).
 */
export class HelixStyle extends BaseStyle {
  readonly id = 'helix';
  readonly name = 'Helix';
  readonly description = 'Double helix strands spiraling along the blade with two interleaved colors.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    // Accent color: use configured accentColor, or fall back to a dimmed
    // complementary derived from base
    const accentCfg = context.config.accentColor as RGB | undefined;
    const accent: RGB = accentCfg ?? {
      r: Math.min(255, base.b + 60),
      g: Math.min(255, base.r + 30),
      b: Math.min(255, base.g + 80),
    };

    const scrollSpeed = (context.config.spatialWaveSpeed as number | undefined) ?? 30;
    const freq = (context.config.spatialWaveFrequency as number | undefined) ?? 5;

    // Normalised scroll speed (0-100 → 0-4 cycles/sec)
    const speed = (scrollSpeed / 100) * 4;

    // Phase of each helix at this position and time.
    // freq controls how many full cycles fit on the blade (higher = tighter spiral).
    const phase1 = position * freq * Math.PI * 2 - time * speed * Math.PI * 2;
    const phase2 = phase1 + Math.PI; // 180° offset

    // Gaussian-shaped brightness for each strand: peak at 0, falls off with width.
    // We map sin(phase) → [0,1] and then apply a soft threshold so only the
    // peak region of each sine wave is bright (simulating a thin strand).
    const strandWidth = (context.config.strandWidth as number | undefined) ?? 0.4; // 0-1; smaller = thinner strand
    const clampedWidth = Math.max(0.05, Math.min(1, strandWidth));

    const sin1 = Math.sin(phase1) * 0.5 + 0.5; // 0-1
    const sin2 = Math.sin(phase2) * 0.5 + 0.5;

    // Apply a power curve to sharpen the strand profile
    const sharpness = 1 + (1 - clampedWidth) * 6; // 1 (wide) → 7 (thin)
    const bright1 = Math.pow(sin1, sharpness);
    const bright2 = Math.pow(sin2, sharpness);

    // Combine: additive blend capped at 1
    const totalBright = Math.min(1, bright1 + bright2);

    // Background: very dim base
    const bg: RGB = { r: base.r * 0.06, g: base.g * 0.06, b: base.b * 0.06 };

    // Mix primary / secondary strands weighted by their relative brightness
    const sum = bright1 + bright2 + 1e-9;
    const mix = bright2 / sum; // 0 = all primary, 1 = all secondary
    const strandColor = lerpColor(base, accent, mix);

    return lerpColor(bg, strandColor, totalBright);
  }
}
