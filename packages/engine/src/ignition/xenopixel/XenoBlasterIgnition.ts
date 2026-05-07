import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Ignition Mode 3 — Blaster.
 *
 * Quick pulse/flash ignition where the blade appears in segments.
 * The blade is divided into chunks that light up in rapid succession
 * from base to tip, giving a staccato pulse-fire appearance rather
 * than a smooth wipe.
 */
export class XenoBlasterIgnition extends BaseIgnition {
  readonly id = 'xeno-blaster';
  readonly name = 'Xeno Blaster';

  getMask(position: number, progress: number): number {
    // Divide blade into 8 segments
    const segments = 8;
    const segIndex = Math.floor(position * segments);
    const segThreshold = (segIndex + 1) / segments;

    // Each segment lights up as a whole when progress crosses its threshold
    // Segments light in order from base (0) to tip (7)
    if (progress >= segThreshold) {
      return 1;
    }

    // Current segment: partial flash as progress enters it
    const segStart = segIndex / segments;
    const segProgress = (progress - segStart) / (1 / segments);

    if (segProgress > 0) {
      // Quick flash-on within each segment — not a gradual fill
      return segProgress > 0.5 ? 1 : segProgress * 2;
    }

    return 0;
  }
}
