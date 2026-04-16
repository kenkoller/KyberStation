import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise2d } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

/** A single traveling wave with position, speed, and width. */
interface TidalWave {
  /** Current leading-edge position along blade (0 = base, 1 = tip). */
  head: number;
  /** Speed in blade-lengths per second. */
  speed: number;
  /** Gaussian sigma (width) in normalised blade units. */
  width: number;
}

/**
 * TidalStyle -- Ocean waves with foam crests washing along the blade.
 *
 * Maintains 2-3 active wave objects traveling base-to-tip at staggered
 * phases.  Each wave has a bright white-blue foam leading edge and a
 * trailing body that fades through cyan to deep blue-green.
 *
 * When a wave exits the tip it recycles to the base with a slight
 * random spawn offset.  Swing speed controls wave spawn rate, speed,
 * and choppiness (narrower, faster, more frequent waves).
 *
 * Trough regions between waves have subtle shimmer noise for an
 * underwater look.  The user's baseColor tints the deep water.
 */
export class TidalStyle extends BaseStyle {
  readonly id = 'tidal';
  readonly name = 'Tidal';
  readonly description =
    'Ocean waves with foam crests washing along the blade.';

  private readonly waves: TidalWave[] = [];
  private lastTime = -1;
  private initialized = false;

  /** Deterministic pseudo-random seeded by a float. */
  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /** Create initial waves with staggered positions. */
  private ensureWaves(): void {
    if (this.initialized) return;
    this.initialized = true;
    const count = 3;
    for (let i = 0; i < count; i++) {
      this.waves.push({
        head: (i / count) * 0.8, // stagger across the blade
        speed: 0.25 + this.pseudoRandom(i * 17.3) * 0.15,
        width: 0.08 + this.pseudoRandom(i * 7.7) * 0.04,
      });
    }
  }

  /**
   * Advance wave positions.  Called once per time step to avoid
   * duplicate updates when getColor is called for many positions.
   */
  private updateWaves(time: number, swingSpeed: number): void {
    if (time === this.lastTime) return;
    const dt = this.lastTime < 0 ? 0 : time - this.lastTime;
    this.lastTime = time;

    // Swing speed modulates wave behavior:
    //   low swing  -> slow, wide, calm waves
    //   high swing -> fast, narrow, choppy waves
    const choppiness = 0.5 + swingSpeed * 1.5; // 0.5 - 2.0 multiplier

    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves[i];

      // Move wave forward
      wave.head += wave.speed * choppiness * dt;

      // If wave has fully exited the tip, recycle it to the base
      if (wave.head > 1.0 + wave.width * 3) {
        wave.head = -wave.width * 2 + this.pseudoRandom(time * 53.7 + i * 11.3) * 0.05;
        wave.speed = 0.2 + this.pseudoRandom(time * 31.9 + i * 23.1) * 0.2;
        wave.width = (0.06 + this.pseudoRandom(time * 19.1 + i * 37.7) * 0.06) / choppiness;
      }
    }
  }

  getColor(position: number, time: number, context: StyleContext): RGB {
    this.ensureWaves();
    this.updateWaves(time, context.swingSpeed);

    const base = context.config.baseColor;

    // ── Deep water color (tinted by user's base color) ──────────────────
    const deepBlue: RGB = { r: 8, g: 30, b: 60 };
    const deepWater = lerpColor(deepBlue, base, 0.3);

    // ── Trough shimmer: subtle noise in the "underwater" regions ────────
    const shimmerNoise = noise2d(position * 12 + time * 0.8, time * 1.5 + 50);
    const shimmerColor: RGB = {
      r: deepWater.r + shimmerNoise * 15,
      g: deepWater.g + shimmerNoise * 25,
      b: deepWater.b + shimmerNoise * 20,
    };

    // Start with trough/shimmer as base
    let result: RGB = { r: shimmerColor.r, g: shimmerColor.g, b: shimmerColor.b };

    // ── Color palette for wave body ─────────────────────────────────────
    const foam: RGB = { r: 220, g: 240, b: 255 };        // bright white-blue
    const crestCyan: RGB = { r: 40, g: 200, b: 220 };    // cyan mid-body
    const bodyBlueGreen: RGB = { r: 15, g: 80, b: 100 }; // deep blue-green tail

    // ── Evaluate each wave's contribution ───────────────────────────────
    for (const wave of this.waves) {
      // Signed distance from query position to wave head (positive = behind wave)
      const distBehind = wave.head - position;

      // Skip if position is ahead of the wave or too far behind
      if (distBehind < -wave.width * 0.5 || distBehind > wave.width * 4) continue;

      // Leading edge foam: narrow Gaussian ahead of and at the head
      if (distBehind < wave.width * 0.8) {
        const foamDist = Math.abs(distBehind) / (wave.width * 0.8);
        // Gaussian brightness for foam crest
        const foamBright = Math.exp(-foamDist * foamDist * 3);
        if (foamBright > 0.05) {
          const foamBlended = lerpColor(crestCyan, foam, foamBright);
          result = lerpColor(result, foamBlended, foamBright * 0.95);
        }
      }

      // Trailing body: fades from cyan through to deep blue-green
      if (distBehind > 0 && distBehind < wave.width * 4) {
        const bodyProgress = distBehind / (wave.width * 4); // 0 near head, 1 at tail
        // Quadratic decay for body brightness
        const bodyBright = (1 - bodyProgress) * (1 - bodyProgress);
        // Color ramp: cyan near head -> blue-green at tail
        const bodyColor = lerpColor(crestCyan, bodyBlueGreen, bodyProgress);
        result = lerpColor(result, bodyColor, bodyBright * 0.7);
      }
    }

    return {
      r: Math.max(0, Math.min(255, result.r)),
      g: Math.max(0, Math.min(255, result.g)),
      b: Math.max(0, Math.min(255, result.b)),
    };
  }
}
