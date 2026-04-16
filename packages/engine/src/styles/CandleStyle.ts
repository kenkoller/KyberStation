import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise, noise2d, fbm } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

/**
 * Realistic candle flame flicker effect.
 *
 * Color gradient from base to tip:
 *   base (hilt) → white/bright-yellow → orange → warm red (tip)
 *
 * Brightness is modulated by low-frequency noise that increases toward the tip
 * (the flame "top" flickers more).  Occasional large "gust" events multiply
 * a region of the blade with extra variation.
 */
export class CandleStyle extends BaseStyle {
  readonly id = 'candle';
  readonly name = 'Candle';
  readonly description = 'Realistic candle flame — warm gradient with per-pixel noise flicker that intensifies near the tip.';

  getColor(position: number, time: number, _context: StyleContext): RGB {
    const t = time;
    const pos = position; // 0 = hilt (base of flame), 1 = tip (flame top)

    // ── Base color gradient ────────────────────────────────────────────────
    // hilt end: near-white, hot core → tip: deep orange-red
    const white: RGB = { r: 255, g: 240, b: 180 };
    const orange: RGB = { r: 255, g: 100, b: 10 };
    const red: RGB = { r: 180, g: 20, b: 5 };

    let baseColor: RGB;
    if (pos < 0.4) {
      // Hilt portion: white → orange
      baseColor = lerpColor(white, orange, pos / 0.4);
    } else {
      // Tip portion: orange → deep red
      baseColor = lerpColor(orange, red, (pos - 0.4) / 0.6);
    }

    // ── Per-pixel flicker (low-frequency) ────────────────────────────────
    // Noise varies slowly in both space and time.  The amount of flicker
    // increases toward the tip (flame top is most unstable).
    const flickerAmount = 0.15 + pos * 0.5; // 0.15 at hilt → 0.65 at tip
    const noiseScale = 3.0;
    const timeScale = 1.8;
    const n = fbm(pos * noiseScale + t * timeScale, t * 0.7, 2);
    const flicker = 1.0 - flickerAmount * (1 - n);

    // ── Gust events ────────────────────────────────────────────────────────
    // Occasionally a "gust" sweeps through the upper half.  Determined by
    // a coarse slow noise: when it dips low, apply extra dimming.
    const gustNoise = noise(t * 0.35, 17);     // slow, 0-1
    const gustThreshold = 0.15;               // gust fires when noise < threshold
    let gustFactor = 1.0;
    if (gustNoise < gustThreshold && pos > 0.35) {
      // Strength peaks when gustNoise is near 0
      const gustStrength = 1 - gustNoise / gustThreshold; // 0-1
      // Modulate by another noise layer for spatial variation
      const gustShape = noise2d(pos * 8, t * 3) * 0.5 + 0.5;
      gustFactor = 1.0 - gustStrength * 0.5 * gustShape;
    }

    // ── Overall brightness ─────────────────────────────────────────────────
    // Steady state brightness is highest at hilt (hottest part), fades at tip.
    const steadyBright = 0.85 - pos * 0.3;  // 0.85 at hilt → 0.55 at tip
    const bright = Math.max(0.05, steadyBright * flicker * gustFactor);

    return {
      r: baseColor.r * bright,
      g: baseColor.g * bright,
      b: baseColor.b * bright,
    };
  }
}
