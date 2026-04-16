import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * SummonIgnition — scattered seed pixels grow and merge like Force assembly.
 *
 * 8-12 seed positions are placed via stratified sampling. Each seed starts as
 * a single lit pixel and grows outward in both directions. Growth accelerates
 * as neighboring regions approach (magnetic attraction). Junction pixels flash
 * bright on merge, then settle to solid.
 */
export class SummonIgnition extends BaseIgnition {
  readonly id = 'summon';
  readonly name = 'Summon';

  private readonly SEED_COUNT = 10;

  /** Deterministic pseudo-random from a float seed. Returns 0-1. */
  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /**
   * Generate seed positions via stratified sampling.
   * Divides blade into SEED_COUNT segments, places one seed randomly in each.
   */
  private getSeedPositions(): number[] {
    const seeds: number[] = [];
    const segmentSize = 1.0 / this.SEED_COUNT;

    for (let i = 0; i < this.SEED_COUNT; i++) {
      const segStart = i * segmentSize;
      const jitter = this.pseudoRandom(i * 13.37 + 7.1);
      // Place seed within segment, with small margin from edges
      const margin = segmentSize * 0.1;
      const pos = segStart + margin + jitter * (segmentSize - 2 * margin);
      seeds.push(pos);
    }

    return seeds;
  }

  /**
   * Calculate the growth radius for each seed at the given progress.
   * Seeds grow faster as they approach neighbors (magnetic attraction).
   */
  private getGrowthRadii(seeds: number[], progress: number): number[] {
    const radii: number[] = new Array(seeds.length).fill(0);

    // Base growth: each seed grows proportional to progress
    // By progress=1.0, all gaps must be closed
    for (let i = 0; i < seeds.length; i++) {
      // Find distance to nearest neighbors
      const leftNeighborDist = i > 0 ? seeds[i] - seeds[i - 1] : seeds[i];
      const rightNeighborDist =
        i < seeds.length - 1 ? seeds[i + 1] - seeds[i] : 1 - seeds[i];
      const halfGap = Math.max(leftNeighborDist, rightNeighborDist) / 2;

      // Base linear growth that ensures coverage by progress=1
      let radius = progress * halfGap;

      // Acceleration factor: grows faster as progress increases (quadratic)
      // This creates the "magnetic pull" as regions get closer
      const accelFactor = 1 + progress * progress * 1.5;
      radius *= accelFactor;

      // Clamp so we don't overshoot
      radii[i] = Math.min(radius, halfGap * 1.2);
    }

    return radii;
  }

  getMask(position: number, progress: number, _context?: IgnitionContext): number {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    const seeds = this.getSeedPositions();
    const radii = this.getGrowthRadii(seeds, progress);

    // Check if this position is within any seed's growth region
    let lit = false;
    let inJunction = false;

    for (let i = 0; i < seeds.length; i++) {
      const dist = Math.abs(position - seeds[i]);
      if (dist <= radii[i]) {
        lit = true;

        // Check for junction: position is in the overlap zone between two seeds
        if (i < seeds.length - 1) {
          const nextDist = Math.abs(position - seeds[i + 1]);
          if (nextDist <= radii[i + 1]) {
            inJunction = true;
          }
        }
        if (i > 0) {
          const prevDist = Math.abs(position - seeds[i - 1]);
          if (prevDist <= radii[i - 1]) {
            inJunction = true;
          }
        }
        break;
      }
    }

    if (inJunction) {
      // Junction flash: bright for a narrow progress window around when
      // the regions first touch. Find when this junction formed.
      // Use progress-based flash that decays quickly.
      // The junction is "new" when the overlap is small.
      let minOverlap = Infinity;
      for (let i = 0; i < seeds.length - 1; i++) {
        const gap = seeds[i + 1] - seeds[i];
        const totalReach = radii[i] + radii[i + 1];
        const overlap = totalReach - gap;
        if (overlap > 0 && overlap < minOverlap) {
          const distToI = Math.abs(position - seeds[i]);
          const distToNext = Math.abs(position - seeds[i + 1]);
          if (distToI <= radii[i] && distToNext <= radii[i + 1]) {
            minOverlap = overlap;
          }
        }
      }

      // Flash decays based on overlap amount (small overlap = fresh junction)
      // Flash window: overlap < 0.03 of blade length (~4 pixels on 132 LEDs)
      if (minOverlap < 0.03) {
        const flashIntensity = 1.0 - minOverlap / 0.03;
        return 1.0 + 0.5 * flashIntensity; // up to 1.5
      }

      return 1.0;
    }

    if (lit) {
      return 1.0;
    }

    // Unlit pixels: dim ambient flicker (Force energy gathering)
    const flicker = this.pseudoRandom(position * 997.3 + progress * 443.7);
    return 0.05 + flicker * 0.1; // 0.05-0.15 range
  }
}
