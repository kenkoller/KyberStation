import { BaseIgnition } from './BaseIgnition.js';

/**
 * FlashFillIgnition — instant full-blade white flash, then color wipe from base.
 *
 * Phase 1 (progress 0–0.08): entire blade fires at full brightness (white flash).
 * Phase 2 (progress 0.08–1.0): color wipe from hilt to tip, replacing the flash.
 *
 * The returned mask value >1 can be used by the renderer to indicate an
 * override-bright / white flash; values 0–1 are the normal lit range.
 * For renderers that clamp to 1, the flash still appears as a full-on blade.
 */
export class FlashFillIgnition extends BaseIgnition {
  readonly id = 'flash-fill';
  readonly name = 'Flash Fill';

  getMask(position: number, progress: number): number {
    // Flash phase: entire blade on
    const flashDuration = 0.08;
    if (progress < flashDuration) {
      // Return >1 to signal white-flash override to blade renderer
      // (value clamped by renderer to 1 if not supported)
      return 1.5;
    }

    // Wipe phase: remap remaining progress to a hilt-to-tip fill
    const wipeProgress = (progress - flashDuration) / (1 - flashDuration);
    return position <= wipeProgress ? 1 : 0;
  }
}
