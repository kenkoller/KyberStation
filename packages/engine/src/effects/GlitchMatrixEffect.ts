import type { EffectType, EffectParams, EffectContext, RGB } from '../types.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * GlitchMatrixEffect -- digital corruption with channel swaps and
 * hologram glitches.
 *
 * On trigger the blade is divided into 6-10 random segments. Each segment
 * receives a random corruption mode with staggered timing:
 *   - channelSwap: R and B channels swap
 *   - colorOverride: forced to neon green (#00FF00) or magenta (#FF00FF)
 *   - strobe: brightness alternates 100%/20% every 2 frames (~33ms)
 *   - duplicate: pixel mirrors from a nearby offset
 *
 * 1-2 full-blade white flash frames fire during the effect.
 * Total duration: ~400ms.
 */
export class GlitchMatrixEffect extends BaseEffect {
  readonly id = 'glitchMatrix';
  readonly type: EffectType = 'glitchMatrix';

  private static readonly NEON_GREEN: RGB = { r: 0, g: 255, b: 0 };
  private static readonly MAGENTA: RGB = { r: 255, g: 0, b: 255 };

  /** Corruption modes. */
  private static readonly MODES = ['channelSwap', 'colorOverride', 'strobe', 'duplicate'] as const;

  /** Per-segment corruption config generated at trigger time. */
  private segments: Array<{
    start: number;  // 0-1 blade position
    end: number;
    mode: string;
    startDelay: number;  // ms before this segment activates
    segDuration: number; // ms this segment stays corrupted
    overrideColor: RGB;  // for colorOverride mode
    dupOffset: number;   // for duplicate mode
  }> = [];

  /** Timestamps (ms into effect) where full-blade white flash fires. */
  private flashFrames: number[] = [];

  /** Internal frame counter for strobe. */
  private frameCount: number = 0;
  private lastFrameTime: number = 0;

  constructor() {
    super();
    this.duration = 400;
  }

  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  override trigger(params: EffectParams): void {
    super.trigger(params);
    this.frameCount = 0;
    this.lastFrameTime = 0;

    // Generate 6-10 segments
    const count = 6 + Math.floor(this.pseudoRandom(this.startTime * 0.0019) * 5);
    const boundaries: number[] = [];
    for (let i = 1; i < count; i++) {
      boundaries.push(this.pseudoRandom(i * 17.3 + this.startTime * 0.002));
    }
    boundaries.sort((a, b) => a - b);

    this.segments = [];
    const allBounds = [0, ...boundaries, 1];
    for (let i = 0; i < allBounds.length - 1; i++) {
      const modeIdx = Math.floor(this.pseudoRandom(i * 53.1 + 3.7) * 4);
      const mode = GlitchMatrixEffect.MODES[modeIdx];
      const isGreen = this.pseudoRandom(i * 71.9) > 0.5;

      this.segments.push({
        start: allBounds[i],
        end: allBounds[i + 1],
        mode,
        startDelay: this.pseudoRandom(i * 13.3 + 1.1) * 100, // 0-100ms stagger
        segDuration: 150 + this.pseudoRandom(i * 29.7) * 250,  // 150-400ms
        overrideColor: isGreen ? GlitchMatrixEffect.NEON_GREEN : GlitchMatrixEffect.MAGENTA,
        dupOffset: (this.pseudoRandom(i * 37.1) - 0.5) * 0.1,
      });
    }

    // 1-2 flash frames at random times during the effect
    const flashCount = 1 + Math.floor(this.pseudoRandom(this.startTime * 0.0031) * 2);
    this.flashFrames = [];
    for (let i = 0; i < flashCount; i++) {
      this.flashFrames.push(50 + this.pseudoRandom(i * 47.3 + 11.1) * 300);
    }
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    const elapsed = context.elapsed;

    if (elapsed >= this.duration) {
      this.active = false;
      return color;
    }

    // Track frames for strobe (approx 60fps -> ~16.7ms per frame)
    if (elapsed - this.lastFrameTime >= 16) {
      this.frameCount++;
      this.lastFrameTime = elapsed;
    }

    // Check for full-blade white flash frames (within ~16ms window)
    for (const flashTime of this.flashFrames) {
      if (Math.abs(elapsed - flashTime) < 16) {
        return { r: 255, g: 255, b: 255 };
      }
    }

    // Find which segment this position belongs to
    for (const seg of this.segments) {
      if (position >= seg.start && position < seg.end) {
        // Check if this segment is active (within its staggered window)
        const segElapsed = elapsed - seg.startDelay;
        if (segElapsed < 0 || segElapsed > seg.segDuration) {
          return color; // not yet active or already ended
        }

        // Apply corruption mode
        switch (seg.mode) {
          case 'channelSwap':
            return { r: color.b, g: color.g, b: color.r };

          case 'colorOverride':
            return seg.overrideColor;

          case 'strobe': {
            // Alternate 100%/20% every 2 frames
            const strobePhase = Math.floor(this.frameCount / 2) % 2;
            const brightness = strobePhase === 0 ? 1.0 : 0.2;
            return {
              r: color.r * brightness,
              g: color.g * brightness,
              b: color.b * brightness,
            };
          }

          case 'duplicate': {
            // Shift color as if reading from a nearby offset position
            // This creates a visual "echo" / ghosting effect
            const shift = seg.dupOffset;
            const shifted = position + shift;
            // Clamp to blade range and modulate color channels
            const t = Math.abs(Math.sin(shifted * Math.PI * 8));
            return {
              r: Math.min(255, color.r * (0.5 + t * 0.5)),
              g: Math.min(255, color.g * (1 - t * 0.3)),
              b: Math.min(255, color.b * (0.5 + t * 0.5)),
            };
          }

          default:
            return color;
        }
      }
    }

    return color;
  }
}
