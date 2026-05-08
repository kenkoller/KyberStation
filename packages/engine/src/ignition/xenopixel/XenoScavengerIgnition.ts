import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Special Preon 5 — Scavenger.
 *
 * Multiple scanning bright spots start at fixed positions along
 * the blade and sweep outward in both directions, leaving lit
 * segments behind. 4 scan points expand as progress increases;
 * when the expanding circles overlap the blade is fully lit.
 * The effect looks like a "searching/scavenging" scan.
 * This is a Xenopixel special preon ignition mode (ID 9).
 */
export class XenoScavengerIgnition extends BaseIgnition {
  readonly id = 'xeno-scavenger';
  readonly name = 'Xeno Scavenger';

  getMask(position: number, progress: number): number {
    // 4 scan points at deterministic positions
    const scanPoints = [0.15, 0.4, 0.65, 0.88];

    // Each point expands a radius as progress increases
    const radius = progress * 0.35;

    for (const center of scanPoints) {
      const dist = Math.abs(position - center);
      if (dist < radius) {
        // Smooth edge falloff at the expanding frontier
        const edge = 1 - (dist / radius);
        if (edge > 0.3) return 1;
        return edge / 0.3;
      }
    }

    return 0;
  }
}
