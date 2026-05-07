import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Ignition Mode 2 — Torch.
 *
 * Fire-like ignition spreading from the base upward with flickering
 * edges. The leading edge is uneven, with noise-driven perturbations
 * that simulate flames licking upward. Simpler than ProffieOS fire
 * ignition — single-octave position-seeded sine noise.
 */
export class XenoTorchIgnition extends BaseIgnition {
  readonly id = 'xeno-torch';
  readonly name = 'Xeno Torch';

  /** Deterministic pseudo-random for flicker pattern. */
  private hash(v: number): number {
    const x = Math.sin(v * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  getMask(position: number, progress: number): number {
    // Fire has a soft leading edge with noise-driven perturbation
    const flicker = Math.sin(position * 24 + progress * 12) * 0.04
                  + Math.sin(position * 9 + progress * 18) * 0.03;

    // Small hash-based sparks ahead of the main front
    const sparkChance = this.hash(position * 500 + Math.floor(progress * 20));
    const sparkAhead = sparkChance > 0.92 ? 0.06 : 0;

    const fillFront = progress + flicker + sparkAhead;

    // Soft trailing edge — fire fades rather than hard cuts
    const softEdge = 0.06;
    const dist = position - fillFront;

    if (dist <= 0) {
      return 1;
    } else if (dist < softEdge) {
      return 1 - dist / softEdge;
    }
    return 0;
  }
}
