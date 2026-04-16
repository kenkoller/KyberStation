import { BaseIgnition } from './BaseIgnition.js';

/**
 * DripUpIgnition — color flows upward from the base with fluid, organic motion.
 *
 * The main fill rises from hilt to tip with a slightly uneven leading edge
 * (a "meniscus" ripple). Small drips run ahead of the main fill, land, and
 * wait for the bulk to catch up, giving the sense of liquid with surface
 * tension defying gravity.
 *
 * The leading edge uses a low-frequency sine perturbation so different blade
 * segments light at slightly different times — organic, not mechanical.
 */
export class DripUpIgnition extends BaseIgnition {
  readonly id = 'drip-up';
  readonly name = 'Drip Up';

  /** Deterministic pseudo-random per position — no Math.random(). */
  private hash(v: number): number {
    const x = Math.sin(v * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  getMask(position: number, progress: number): number {
    // --- Main fill front (with eased acceleration) ---
    // Ease-in-out: starts slow, fastest in middle, slows at tip
    const easedProgress = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Leading edge perturbation — uneven, organic
    // Low-frequency ripple so neighboring LEDs have similar but not identical values
    const ripple = Math.sin(position * 18 + progress * 6) * 0.025
                 + Math.sin(position * 7  + progress * 9) * 0.015;

    const fillFront = easedProgress + ripple;

    // --- Drip system: 3 drips that run ahead and wait ---
    // Each drip has a deterministic destination between fillFront and full tip
    const dripCount = 3;
    let dripMask = 0;

    for (let i = 0; i < dripCount; i++) {
      // Drip destination — scattered between 0.15 and 1.0 ahead of main fill
      const dripDest = 0.15 + this.hash(i * 37.1) * 0.7;

      // Launch time: drips launch at different early progress values
      const launchT = 0.05 + this.hash(i * 53.3) * 0.3;

      if (progress < launchT) continue;

      // Drip travel: fast at first, decelerates as it reaches destination
      const dripProgress = Math.min(1, (progress - launchT) / 0.4);
      // Ease-out: fast start, slow end
      const eased = 1 - Math.pow(1 - dripProgress, 3);
      const dripPos = fillFront + eased * (dripDest - fillFront);

      // Drip is a narrow bright patch (width ~0.02)
      const dripWidth = 0.025;
      const dripDist = Math.abs(position - dripPos);
      if (dripDist < dripWidth) {
        const dripStrength = 1 - dripDist / dripWidth;
        dripMask = Math.max(dripMask, dripStrength);
      }
    }

    // Main fill: 1 if below fill front, with soft leading edge
    const softEdge = 0.04;
    const distFromFront = position - fillFront;
    let mainMask: number;
    if (distFromFront <= 0) {
      mainMask = 1;
    } else if (distFromFront < softEdge) {
      mainMask = 1 - distFromFront / softEdge;
    } else {
      mainMask = 0;
    }

    return Math.min(1, Math.max(mainMask, dripMask));
  }
}
