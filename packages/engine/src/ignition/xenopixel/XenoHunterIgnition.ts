import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Special Preon 6 — Hunter.
 *
 * A stalking/tracking pattern — a bright leading edge sweeps
 * base-to-tip at 1.5x the normal ignition speed, leaving a
 * dimmer trail behind that gradually fills to full brightness.
 * The leading edge pulses slightly (like a heartbeat) as it
 * advances.
 * This is a Xenopixel special preon ignition mode (ID 10).
 */
export class XenoHunterIgnition extends BaseIgnition {
  readonly id = 'xeno-hunter';
  readonly name = 'Xeno Hunter';

  getMask(position: number, progress: number): number {
    // Leading edge moves faster than standard — reaches tip at progress 0.65
    const edgePos = progress * 1.54;

    if (position > edgePos) return 0;

    // Distance behind the leading edge
    const behind = edgePos - position;

    // Leading-edge pulse zone (the "hunter's eye")
    if (behind < 0.08) {
      // Pulse at the frontier — slight brightness variation
      const pulse = 0.85 + 0.15 * Math.sin(progress * 20);
      return pulse;
    }

    // Trail zone — gradually fills from dim to full
    // Segments close to the base fill in first
    const trailFill = Math.min(1, progress / (1 - position + 0.01));
    const dimBase = 0.4;
    return dimBase + (1 - dimBase) * Math.min(1, trailFill);
  }
}
