import { BaseIgnition } from './BaseIgnition.js';

/**
 * DrainRetraction — color drains downward from tip to base, like liquid flowing out.
 *
 * The drain front travels from tip to hilt with slight acceleration (gravity feel).
 * A soft meniscus at the receding edge adds a liquid surface appearance.
 * Small residual drips trail below the main drain line and gradually catch up,
 * simulating liquid droplets falling toward the hilt.
 *
 * Progress 0 = fully lit, progress 1 = fully off (tip drains first).
 */
export class DrainRetraction extends BaseIgnition {
  readonly id = 'drain';
  readonly name = 'Drain';

  /** Deterministic hash — no Math.random(). */
  private hash(v: number): number {
    const x = Math.sin(v * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  getMask(position: number, progress: number): number {
    // --- Drain front: tip (position=1) drains first, hilt (position=0) last ---
    // "retract" is how far the drain has progressed (0 = nothing drained, 1 = all drained)
    const retract = progress; // 0→1 as retraction advances

    // Acceleration: drain accelerates as more liquid weight pulls it
    // Ease-in: slow start, faster end
    const easedRetract = retract * retract * (3 - 2 * retract); // smooth step

    // Drain front position in [0,1] — starts at 1 (tip), falls to 0 (hilt)
    // Drain front = 1 - easedRetract
    const drainFront = 1 - easedRetract;

    // Meniscus perturbation — slightly uneven leading edge
    const meniscus = Math.sin(position * 14 + retract * 5) * 0.015
                   + Math.sin(position * 5  + retract * 8) * 0.010;
    const drainEdge = drainFront + meniscus;

    // --- Residual drips: small blobs that trail below the drain front ---
    const dripCount = 3;
    let dripMask = 0;

    for (let i = 0; i < dripCount; i++) {
      // Each drip starts near where the drain front was when it "broke off"
      const breakOffT = 0.1 + this.hash(i * 41.7) * 0.5; // when this drip detaches
      if (retract < breakOffT) continue;

      // Drip destination — drips fall further below the drain front
      const dripFallDist = 0.04 + this.hash(i * 83.1) * 0.12;
      const dripBase = (1 - breakOffT) - dripFallDist; // final resting position

      // Drip travel: falls from break-off position toward its resting position
      const dripProgress = Math.min(1, (retract - breakOffT) / 0.3);
      const eased = 1 - Math.pow(1 - dripProgress, 2); // ease-out
      const breakOffPos = 1 - breakOffT;
      const dripPos = breakOffPos - eased * (breakOffPos - dripBase);

      // Drip is only visible if it's above the current drain front
      if (dripPos < drainEdge) continue;

      // Narrow drip blob
      const dripWidth = 0.018;
      const dripDist = Math.abs(position - dripPos);
      if (dripDist < dripWidth) {
        const dripStrength = (1 - dripDist / dripWidth) * 0.8;
        dripMask = Math.max(dripMask, dripStrength);
      }
    }

    // Main lit region: fully lit above the drain edge, fades at the edge
    const softEdge = 0.035;
    const distFromEdge = position - drainEdge;

    let mainMask: number;
    if (position > drainEdge) {
      // Above the drain front — still lit, fade near the edge
      if (distFromEdge < softEdge) {
        mainMask = distFromEdge / softEdge; // soft meniscus
      } else {
        mainMask = 1;
      }
    } else {
      mainMask = 0;
    }

    return Math.min(1, Math.max(mainMask, dripMask));
  }
}
