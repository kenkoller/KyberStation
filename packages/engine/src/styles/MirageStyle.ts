import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise2d } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

/**
 * MirageStyle -- Desert heat haze with shimmering distortion.
 *
 * The core effect renders the user's base color, then applies a
 * position-displacement function (sinusoidal, low frequency, small
 * amplitude) that increases from hilt to tip, producing a rolling
 * heat-haze look as the displacement scrolls over time.
 *
 * Ghost flickers: every 1.5-3 seconds a random 8-15 LED segment in
 * the upper half briefly flashes a complementary hue at ~40% opacity
 * for exactly 2-3 frames (at 60 fps ~33-50 ms), then snaps back.
 * The brevity makes them feel subliminal.
 *
 * Blade angle modulates distortion intensity -- vertical is calm,
 * horizontal is maximum shimmer.
 */
export class MirageStyle extends BaseStyle {
  readonly id = 'mirage';
  readonly name = 'Mirage';
  readonly description =
    'Desert heat haze with shimmering distortion.';

  /** Next time a ghost flicker is allowed to fire. */
  private nextGhostTime = 0;
  /** Ghost flicker state. */
  private ghostActive = false;
  private ghostStart = 0;
  private ghostEnd = 0;
  private ghostBirth = 0;
  private ghostHueShift = 0;
  /** Duration of the ghost flicker in seconds (~2-3 frames at 60 fps). */
  private readonly ghostDuration = 0.045; // ~2.7 frames at 60 fps
  private lastTime = -1;

  /** Deterministic pseudo-random seeded by a float. */
  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /**
   * Approximate complement: rotate hue by ~180 degrees.
   * Works in RGB space by inverting and adjusting -- not perfect
   * colorimetry but visually effective for the subliminal flash.
   */
  private complementary(c: RGB): RGB {
    // Find min/max to approximate hue rotation
    const max = Math.max(c.r, c.g, c.b);
    const min = Math.min(c.r, c.g, c.b);
    const sum = max + min;
    return {
      r: Math.abs(sum - c.r),
      g: Math.abs(sum - c.g),
      b: Math.abs(sum - c.b),
    };
  }

  /**
   * Update ghost flicker state.  Called once per time step.
   */
  private updateGhost(time: number): void {
    if (time === this.lastTime) return;
    this.lastTime = time;

    // If a ghost is active, check if it has expired
    if (this.ghostActive) {
      if (time - this.ghostBirth > this.ghostDuration) {
        this.ghostActive = false;
      }
      return;
    }

    // Check if it is time to spawn a new ghost
    if (time >= this.nextGhostTime) {
      this.ghostActive = true;
      this.ghostBirth = time;

      const ledCount = 144; // normalise to typical blade
      // Random segment of 8-15 LEDs in the upper half (position 0.5 - 1.0)
      const segmentLEDs = 8 + Math.floor(this.pseudoRandom(time * 91.3) * 8);
      const segmentLen = segmentLEDs / ledCount;
      const startPos = 0.5 + this.pseudoRandom(time * 53.1 + 7) * (0.5 - segmentLen);
      this.ghostStart = startPos;
      this.ghostEnd = startPos + segmentLen;
      this.ghostHueShift = this.pseudoRandom(time * 37.7 + 19) * 0.3 + 0.25; // 25-55% shift

      // Schedule next ghost: 1.5 - 3.0 seconds from now
      this.nextGhostTime = time + 1.5 + this.pseudoRandom(time * 23.9 + 41) * 1.5;
    }
  }

  getColor(position: number, time: number, context: StyleContext): RGB {
    this.updateGhost(time);

    const base = context.config.baseColor;

    // ── Distortion intensity from blade angle ───────────────────────────
    // bladeAngle: -1 (horizontal left) to +1 (horizontal right), 0 = vertical
    // We want horizontal = max shimmer, vertical = calm
    const angleFactor = Math.abs(context.bladeAngle);
    // Distortion ramps from 0.3 (vertical) to 1.0 (horizontal)
    const distortionStrength = 0.3 + angleFactor * 0.7;

    // ── Position displacement (heat haze) ───────────────────────────────
    // Amplitude increases from hilt (0) to tip (1): hilt is anchored,
    // tip shimmers the most.
    const maxAmplitude = 3.0 / Math.max(1, context.config.ledCount ?? 132); // ~3 LEDs
    const amplitude = position * maxAmplitude * distortionStrength;

    // Two sinusoidal displacement layers at different frequencies
    // that scroll at different speeds for organic motion
    const freq1 = 6.0;
    const freq2 = 10.0;
    const speed1 = 0.8;
    const speed2 = 1.3;
    const disp1 = Math.sin(position * freq1 * Math.PI * 2 + time * speed1) * amplitude;
    const disp2 = Math.sin(position * freq2 * Math.PI * 2 - time * speed2) * amplitude * 0.5;
    const displacement = disp1 + disp2;

    // Sample the "displaced" position for color lookup
    const samplePos = Math.max(0, Math.min(1, position + displacement));

    // ── Base color with subtle spatial variation ────────────────────────
    // Add a gentle brightness variation along the blade using noise,
    // sampled at the displaced position for the haze effect
    const brightnessNoise = noise2d(samplePos * 8 + time * 0.4, time * 0.6);
    const brightnessVar = 0.8 + brightnessNoise * 0.2 * distortionStrength;

    let result: RGB = {
      r: base.r * brightnessVar,
      g: base.g * brightnessVar,
      b: base.b * brightnessVar,
    };

    // ── Additional shimmer: fine high-frequency noise modulation ────────
    // This gives the "heat shimmer" texture beyond just displacement
    const shimmerNoise = noise2d(
      position * 20 + time * 2.5,
      time * 1.8 + position * 15,
    );
    const shimmerAmount = 0.08 * distortionStrength * position; // stronger at tip
    result = {
      r: result.r * (1 + (shimmerNoise - 0.5) * shimmerAmount),
      g: result.g * (1 + (shimmerNoise - 0.5) * shimmerAmount),
      b: result.b * (1 + (shimmerNoise - 0.5) * shimmerAmount),
    };

    // ── Ghost flicker ───────────────────────────────────────────────────
    if (
      this.ghostActive &&
      position >= this.ghostStart &&
      position <= this.ghostEnd
    ) {
      const comp = this.complementary(base);
      // Blend complementary hue at ~40% opacity
      result = lerpColor(result, comp, 0.4 * this.ghostHueShift / 0.4);
    }

    return {
      r: Math.max(0, Math.min(255, result.r)),
      g: Math.max(0, Math.min(255, result.g)),
      b: Math.max(0, Math.min(255, result.b)),
    };
  }
}
