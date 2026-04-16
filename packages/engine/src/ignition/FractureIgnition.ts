import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * FractureIgnition — blade ignites in jagged, crystalline fracture bursts.
 *
 * Random "crack points" are seeded along the blade. Light fills outward from
 * each crack point simultaneously, creating a shattered-glass ignition pattern.
 * Gaps between cracks close as overall progress increases.
 */
export class FractureIgnition extends BaseIgnition {
  readonly id = 'fracture';
  readonly name = 'Fracture';

  private readonly CRACK_COUNT = 7;

  /** Deterministic pseudo-random from a float seed. */
  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  getMask(position: number, progress: number, _context?: IgnitionContext): number {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    // Crack point positions are deterministic (seeded by index).
    // The main fill front advances from base at normal pace.
    // Each crack spawns an additional fill radius that grows with progress.

    // Standard fill front ensures the blade is always complete by progress=1
    const baseFront = progress;

    // Each crack point adds local illumination radiating outward
    const crackRadius = progress * 0.35; // max radius per crack = 35% of blade

    let lit = position <= baseFront ? 1 : 0;

    if (lit === 0) {
      for (let i = 0; i < this.CRACK_COUNT; i++) {
        // Crack points are evenly distributed with small jitter, within 0.1-0.9
        const base = (i + 1) / (this.CRACK_COUNT + 1);
        const jitter = (this.pseudoRandom(i * 17.3) - 0.5) * 0.08;
        const crackPos = Math.max(0.05, Math.min(0.95, base + jitter));

        // Crack becomes active when the fill front is within 20% of it, or
        // when progress exceeds a staggered threshold
        const activateAt = crackPos - 0.15;
        if (progress < activateAt) continue;

        const dist = Math.abs(position - crackPos);
        if (dist < crackRadius) {
          // Jagged intensity: use pseudo-random noise to create irregular edges
          const edgeFactor = 1 - dist / crackRadius;
          const noise = this.pseudoRandom(position * 999.7 + i * 17.3);
          const jitterThresh = 0.15 + noise * 0.3;

          if (edgeFactor > jitterThresh) {
            lit = 1;
            break;
          }
        }
      }
    }

    return lit;
  }
}
