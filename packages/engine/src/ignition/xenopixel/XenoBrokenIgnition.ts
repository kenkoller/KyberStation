import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Special Preon 4 — Broken.
 *
 * Stuttering/broken ignition with random gaps that gradually fill in.
 * The blade attempts to ignite but segments appear and disappear
 * chaotically. As progress increases, more segments stabilize until
 * the blade is fully lit. Simulates a damaged or unstable crystal.
 * This is a Xenopixel special preon ignition mode.
 */
export class XenoBrokenIgnition extends BaseIgnition {
  readonly id = 'xeno-broken';
  readonly name = 'Xeno Broken';

  /** Deterministic pseudo-random for stable flicker pattern. */
  private hash(v: number): number {
    const x = Math.sin(v * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  getMask(position: number, progress: number): number {
    // Divide blade into 20 micro-segments
    const segments = 20;
    const segIndex = Math.floor(position * segments);

    // Each segment has a deterministic "stability threshold" —
    // when progress exceeds this value the segment locks on permanently
    const stabilityThreshold = this.hash(segIndex * 73.7 + 19.3) * 0.85 + 0.1;

    // Once past the threshold, segment is permanently on
    if (progress >= stabilityThreshold) {
      return 1;
    }

    // Below threshold: chaotic flickering
    // Chance of being visible increases as progress approaches the threshold
    const proximityToStable = progress / stabilityThreshold;

    // Hash-based flicker at ~10 Hz visual rate
    const flickerSeed = segIndex * 37.1 + Math.floor(progress * 30) * 13.7;
    const flicker = this.hash(flickerSeed);

    // More likely to be on the closer we are to stabilizing
    if (flicker < proximityToStable * 0.7) {
      // Flickering on — brightness jitters
      return 0.4 + this.hash(flickerSeed + 100) * 0.6;
    }

    return 0;
  }
}
