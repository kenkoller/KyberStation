import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * CrackleIgnition — random segments flicker on during ignition, like unstable
 * power coursing through the crystal.
 *
 * Algorithm (per LED, per frame):
 *   1. Compute a per-LED probability that linearly ramps from 0% → 100%
 *      over the ignition duration.
 *   2. Below 80% overall progress, lit LEDs can randomly flicker off each
 *      frame, giving an organic crackle feel.
 *   3. Above 80% progress, all LEDs lock on (standard fill) to guarantee
 *      the blade is fully extended by completion.
 *
 * Deterministic hashing is used so the same LED always has the same "seed"
 * — this avoids per-frame RNG calls that would cause strobing artifacts.
 */
export class CrackleIgnition extends BaseIgnition {
  readonly id = 'crackle';
  readonly name = 'Crackle';

  /**
   * Returns a pseudo-random value in [0, 1) that is stable per (led, seed)
   * pair, using a fast integer hash.
   */
  private static hash(index: number, seed: number): number {
    let h = (index * 2654435761) ^ (seed * 2246822519);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  }

  getMask(position: number, progress: number, _context?: IgnitionContext): number {
    // Lock everything on above 80% so the blade is guaranteed solid at the end
    if (progress >= 0.8) return 1;

    // Approximate LED index from position (assume 144 LEDs)
    const ledIndex = Math.floor(position * 144);

    // The base probability of a given LED being lit rises with progress
    const baseProbability = progress;

    // Per-LED "ignition threshold" — varies slightly so some LEDs light
    // earlier or later, creating the crackle staggering effect.
    const perLedThreshold = CrackleIgnition.hash(ledIndex, 0x1a2b3c4d);
    const ignited = baseProbability > perLedThreshold;

    if (!ignited) return 0;

    // Once ignited, the LED can still flicker off with decreasing probability
    // as progress increases.  Use a time-varying seed so flicker looks live.
    // We use Math.floor(performance.now() / 16) as a frame counter proxy
    // (16 ms ≈ 60 fps); this gives a new flicker pattern every frame.
    const frameSeed = Math.floor(performance.now() / 16);
    const flickerChance = 0.45 * (1 - progress / 0.8); // maxes out at 45%, drops to 0 at 80%
    const flickerRoll   = CrackleIgnition.hash(ledIndex, frameSeed);

    return flickerRoll < flickerChance ? 0 : 1;
  }
}
