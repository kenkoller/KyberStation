import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Special Preon 1 — Fold / Tile.
 *
 * Alternating segments fold in from both ends toward the center.
 * Even-indexed segments light from the base end, odd-indexed from
 * the tip end. The visual effect resembles tiles folding into place
 * from alternating directions. This is a Xenopixel special preon
 * ignition mode.
 */
export class XenoFoldTileIgnition extends BaseIgnition {
  readonly id = 'xeno-fold-tile';
  readonly name = 'Xeno Fold Tile';

  getMask(position: number, progress: number): number {
    // 10 segments that alternate fill direction
    const segments = 10;
    const segIndex = Math.floor(position * segments);
    const isEven = segIndex % 2 === 0;

    // Stagger timing: segments closer to their origin light first
    // Even segments fill from base (low index = early), odd from tip (high index = early)
    const normalizedIndex = isEven
      ? segIndex / segments               // base-first ordering
      : (segments - 1 - segIndex) / segments; // tip-first ordering

    // Each segment has a start time based on its ordering
    const segDelay = normalizedIndex * 0.6;
    const segDuration = 0.5;
    const segProgress = Math.max(0, Math.min(1,
      (progress - segDelay) / segDuration,
    ));

    if (segProgress <= 0) {
      return 0;
    }

    // Quick snap-on with slight ease
    return segProgress < 0.4 ? segProgress / 0.4 : 1;
  }
}
