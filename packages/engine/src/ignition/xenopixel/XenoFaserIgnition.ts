import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Special Preon 3 — Faser (Laser).
 *
 * A thin laser-beam line extends from base to tip, then the blade
 * expands to full width. Phase 1 (progress 0-0.6): a narrow bright
 * line races from base to tip. Phase 2 (progress 0.6-1.0): the line
 * expands and the blade fills to full brightness. This is a Xenopixel
 * special preon ignition mode.
 *
 * The mask value during Phase 1 is reduced (thin line effect),
 * ramping to full brightness in Phase 2.
 */
export class XenoFaserIgnition extends BaseIgnition {
  readonly id = 'xeno-faser';
  readonly name = 'Xeno Faser';

  getMask(position: number, progress: number): number {
    const linePhaseEnd = 0.6;

    if (progress <= linePhaseEnd) {
      // Phase 1: thin line racing from base to tip
      const lineProgress = progress / linePhaseEnd;
      const linePos = lineProgress;

      // The line itself is a narrow bright band
      const lineWidth = 0.04;
      const dist = Math.abs(position - linePos);

      if (dist < lineWidth) {
        // Sharp bright core
        return 0.3 + 0.7 * (1 - dist / lineWidth);
      }

      // Trail: dim glow behind the line
      if (position < linePos) {
        return 0.15;
      }

      return 0;
    }

    // Phase 2: expand from thin line to full blade
    const expandProgress = (progress - linePhaseEnd) / (1 - linePhaseEnd);

    // Ease-out expansion
    const brightness = 0.15 + 0.85 * (1 - Math.pow(1 - expandProgress, 2));
    return brightness;
  }
}
