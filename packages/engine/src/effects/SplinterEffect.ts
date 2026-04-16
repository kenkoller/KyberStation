import type { EffectType, EffectParams, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * SplinterEffect -- blade cracks into sharp fragments that slide apart
 * then snap back together.
 *
 * On trigger, 5-7 random split points divide the blade into irregular
 * segments. Each segment slides with a small random velocity while
 * bright white/yellow boundary pixels flash at the crack lines.
 *
 * Timeline:
 *   Phase 1 (0-300ms): segments slide apart, gaps grow as dark bands
 *   Phase 2 (300-600ms): velocities reverse, segments converge and heal
 *   Boundary pixels glow white/yellow throughout, fading as segments rejoin.
 */
export class SplinterEffect extends BaseEffect {
  readonly id = 'splinter';
  readonly type: EffectType = 'splinter';

  /** Sorted split points (0-1) for this trigger. */
  private splitPoints: number[] = [];
  /** Per-segment velocity (blade-length units per second). */
  private segmentVelocities: number[] = [];

  constructor() {
    super();
    this.duration = 600;
  }

  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  override trigger(params: EffectParams): void {
    super.trigger(params);

    // Generate 5-7 split points
    const count = 5 + Math.floor(this.pseudoRandom(this.startTime * 0.0017) * 3);
    this.splitPoints = [];
    this.segmentVelocities = [];

    for (let i = 0; i < count; i++) {
      const pt = 0.08 + this.pseudoRandom(i * 23.7 + this.startTime * 0.003) * 0.84;
      this.splitPoints.push(pt);
    }
    this.splitPoints.sort((a, b) => a - b);

    // Generate velocities for each segment (count+1 segments between splits)
    for (let i = 0; i <= this.splitPoints.length; i++) {
      // Small velocity, +/- direction
      const speed = (this.pseudoRandom(i * 41.3 + 7.1) - 0.5) * 0.12;
      this.segmentVelocities.push(speed);
    }
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    const elapsed = context.elapsed;
    const totalDur = this.duration;
    const halfDur = totalDur * 0.5; // 300ms

    // Phase envelope: expand 0->1 over first half, collapse 1->0 over second half
    let envelope: number;
    if (elapsed < halfDur) {
      envelope = elapsed / halfDur;
    } else {
      envelope = 1 - (elapsed - halfDur) / halfDur;
    }
    envelope = Math.max(0, Math.min(1, envelope));

    // Determine which segment this position falls in
    let segIndex = 0;
    for (let i = 0; i < this.splitPoints.length; i++) {
      if (position > this.splitPoints[i]) {
        segIndex = i + 1;
      }
    }

    // Calculate segment offset due to velocity
    const offset = this.segmentVelocities[segIndex] * envelope;

    // Check if position is near a boundary gap
    const white: RGB = { r: 255, g: 255, b: 220 };
    const dark: RGB = { r: 0, g: 0, b: 0 };

    for (let i = 0; i < this.splitPoints.length; i++) {
      const boundary = this.splitPoints[i];
      const gapWidth = 0.015 * envelope; // gap grows with envelope
      const dist = Math.abs(position - boundary);

      if (dist < gapWidth) {
        // Inside gap: render dark
        const gapStrength = 1 - (dist / gapWidth);
        return lerpColor(color, dark, gapStrength * envelope);
      }

      // Boundary edge glow (bright white/yellow at crack edges)
      const glowWidth = 0.025;
      if (dist < glowWidth) {
        const glowStrength = (1 - dist / glowWidth) * envelope * 0.8;
        return lerpColor(color, white, glowStrength);
      }
    }

    // Shift color based on segment displacement (simulates positional shift)
    // Slight brightness variation per segment to sell the separation
    const brightnessMod = 1 - Math.abs(offset) * 2;
    return {
      r: Math.min(255, Math.max(0, color.r * brightnessMod)),
      g: Math.min(255, Math.max(0, color.g * brightnessMod)),
      b: Math.min(255, Math.max(0, color.b * brightnessMod)),
    };
  }
}
