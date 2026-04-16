import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * EvaporateRetraction — random clusters of LEDs boil away to white then vanish.
 *
 * The blade is divided into clusters of 3-5 adjacent LEDs with randomised
 * boundaries.  Each cluster is assigned a random evaporation time, biased
 * toward later in the retraction (power curve: t = random^0.6 * duration).
 * Early evaporations are sparse; the finale is a rapid cascade.
 *
 * When a cluster evaporates it briefly overbrighten to white (~50 ms), then
 * fades to black (~50 ms).  Surviving LEDs develop increasing flicker as
 * more neighbours vanish, selling the "boiling away" feel.
 *
 * Progress convention:
 *   progress = 1 → start of retraction (fully lit)
 *   progress = 0 → end of retraction (fully off)
 *
 * Internally we work with retract = 1 - progress (0 → 1).
 */
export class EvaporateRetraction extends BaseIgnition {
  readonly id = 'evaporate';
  readonly name = 'Evaporate';

  /** Cluster boundaries and evaporation times. Rebuilt when ledCount changes. */
  private clusters: { start: number; end: number; evapTime: number }[] = [];

  /** LED count the current cluster layout was built for. */
  private builtForLedCount: number = 0;

  /** Duration (in retract-progress units) of each cluster's evaporation flash. */
  private readonly EVAP_WINDOW = 0.07; // ~100 ms equivalent in normalised progress

  /**
   * Deterministic pseudo-random based on a seed value.
   * Returns a value in [0, 1).
   */
  private hash(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /**
   * Build clusters of 3-5 adjacent LEDs with random evaporation times.
   */
  private buildClusters(ledCount: number): void {
    this.clusters = [];
    let pos = 0;
    let clusterIndex = 0;

    while (pos < ledCount) {
      // Cluster size: 3-5 LEDs, deterministic based on index
      const sizeRand = this.hash(clusterIndex * 73.13 + 17.9);
      const size = Math.min(3 + Math.floor(sizeRand * 3), ledCount - pos); // 3, 4, or 5
      const end = pos + size;

      // Evaporation time: power curve biased toward later times
      // t = random^0.6 so early evaporations are sparse, late ones dense
      const rawRand = this.hash(clusterIndex * 41.37 + 229.5);
      const evapTime = Math.pow(rawRand, 0.6);

      this.clusters.push({ start: pos, end, evapTime });
      pos = end;
      clusterIndex++;
    }

    this.builtForLedCount = ledCount;
  }

  /**
   * Find which cluster a given LED index belongs to.
   * Uses binary-ish scan since clusters are ordered by start position.
   */
  private findCluster(ledIndex: number): { start: number; end: number; evapTime: number } | undefined {
    for (const cluster of this.clusters) {
      if (ledIndex >= cluster.start && ledIndex < cluster.end) {
        return cluster;
      }
    }
    return this.clusters[this.clusters.length - 1];
  }

  getMask(position: number, progress: number, context?: IgnitionContext): number {
    const ledCount = (context?.config?.ledCount as number | undefined) ?? 144;

    // Rebuild clusters whenever LED count changes
    if (this.builtForLedCount !== ledCount) {
      this.buildClusters(ledCount);
    }

    // Convert retraction convention: progress 1→0 becomes retract 0→1
    const retract = 1 - progress;

    // Map position [0,1] to LED index
    const ledIndex = Math.min(ledCount - 1, Math.floor(position * ledCount));

    // Find which cluster this LED belongs to
    const cluster = this.findCluster(ledIndex);
    if (!cluster) return 0;

    const evapStart = cluster.evapTime;
    const evapEnd = evapStart + this.EVAP_WINDOW;
    const halfWindow = this.EVAP_WINDOW / 2;

    // --- Before evaporation: alive with increasing flicker ---
    if (retract < evapStart) {
      // Flicker intensifies as more of the blade has evaporated
      // Use a deterministic noise based on LED index and a time-like factor
      const flickerSeed = ledIndex * 13.7 + retract * 997.3;
      const noise = this.hash(flickerSeed);
      // Flicker range: starts at 1.0 (no flicker), increases to 0.85-1.0
      const flickerIntensity = retract; // 0 at start, approaches evapStart
      const flickerMin = 1.0 - 0.15 * flickerIntensity;
      return flickerMin + noise * (1.0 - flickerMin);
    }

    // --- During evaporation window ---
    if (retract < evapEnd) {
      const elapsed = retract - evapStart;

      if (elapsed < halfWindow) {
        // First half: brighten to white (mask ramps up to ~1.5)
        const phase = elapsed / halfWindow; // 0 → 1
        return 1.0 + phase * 0.5; // 1.0 → 1.5
      } else {
        // Second half: fade from bright to black
        const phase = (elapsed - halfWindow) / halfWindow; // 0 → 1
        return 1.5 * (1.0 - phase); // 1.5 → 0
      }
    }

    // --- After evaporation: dead ---
    return 0;
  }
}
