import { BaseIgnition } from './BaseIgnition.js';

/**
 * GlitchIgnition — digital glitch / broken-crystal ignition.
 *
 * Standard fill with random pixel glitches ahead of the fill edge.
 * Creates a malfunctioning, corrupted appearance during ignition.
 */
export class GlitchIgnition extends BaseIgnition {
  readonly id = 'glitch';
  readonly name = 'Glitch';

  /** Deterministic pseudo-random for reproducible glitch pattern. */
  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  getMask(position: number, progress: number): number {
    const base = position <= progress ? 1 : 0;

    // Random glitch pixels — use deterministic noise based on position + progress
    // to avoid true Math.random() non-determinism while keeping the glitch aesthetic
    if (progress < 0.9) {
      const glitchChance = this.pseudoRandom(position * 1000 + progress * 7777);
      if (glitchChance < 0.03) {
        return this.pseudoRandom(position * 3333 + progress * 9999);
      }
    }

    return base;
  }
}
