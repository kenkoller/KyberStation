import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Special Preon 2 — Word.
 *
 * Segments light up in a typewriter/word-reveal pattern. Rather than
 * filling smoothly or in strict order, segments appear sequentially
 * with a brief pause between each — like characters being typed.
 * Each segment snaps on at full brightness. This is a Xenopixel
 * special preon ignition mode.
 */
export class XenoWordIgnition extends BaseIgnition {
  readonly id = 'xeno-word';
  readonly name = 'Xeno Word';

  getMask(position: number, progress: number): number {
    // 16 segments revealed in base-to-tip order with inter-segment gaps
    const segments = 16;
    const segIndex = Math.floor(position * segments);

    // Each segment gets an equal share of the total duration
    // with a brief hold between reveals
    const revealTime = (segIndex + 1) / (segments + 1);

    if (progress >= revealTime) {
      return 1;
    }

    // Cursor blink at the active segment: the segment about to appear
    // flickers briefly before snapping on
    const activeSegment = Math.floor(progress * (segments + 1));
    if (segIndex === activeSegment) {
      // Quick blink/flash before the segment commits
      const localProgress = (progress * (segments + 1)) - activeSegment;
      // Blink on the latter half of the segment's time window
      if (localProgress > 0.6) {
        return (localProgress - 0.6) / 0.4;
      }
    }

    return 0;
  }
}
