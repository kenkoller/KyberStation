import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * DissolveRetraction — pixels randomly turn off like analog TV static dying.
 *
 * A random permutation of LED indices is generated once (lazily, on the first
 * call after a new retraction begins).  LEDs are turned off in that random
 * order across the full retraction duration.
 *
 * Each LED gets a brief 2-frame "death flicker" — it brightens for ~33 ms
 * before going dark — then stays off for the rest of the animation.
 *
 * Progress semantics (matching the existing retraction convention):
 *   progress = 1 → start of retraction (fully lit)
 *   progress = 0 → end of retraction (fully off)
 *
 * We convert to retract = 1 - progress (0 → 1) internally so the math
 * mirrors all other retraction implementations in this codebase.
 */
export class DissolveRetraction extends BaseIgnition {
  readonly id = 'dissolve';
  readonly name = 'Dissolve';

  /** The randomised turn-off order.  Rebuilt whenever ledCount changes. */
  private permutation: Uint16Array = new Uint16Array(0);

  /** LED count the current permutation was built for. */
  private permLedCount: number = 0;

  /** Duration of the per-LED death flicker (in retract-progress units). */
  private readonly FLICKER_WINDOW = 0.025; // ~25 ms of the total retraction

  getMask(position: number, progress: number, context?: IgnitionContext): number {
    const ledCount = (context?.config?.ledCount as number | undefined) ?? 144;

    // Rebuild the permutation whenever the LED count changes (or on first call)
    if (this.permLedCount !== ledCount) {
      this.buildPermutation(ledCount);
    }

    // Convert retraction convention: progress 1→0 becomes retract 0→1
    const retract = 1 - progress;

    // Map position to approximate LED index
    const ledIndex = Math.min(ledCount - 1, Math.floor(position * ledCount));

    // Retrieve this LED's turn-off rank from the permutation
    const rank = this.permutation[ledIndex] ?? ledIndex;

    // The progress threshold at which this LED starts dying
    const deathStart = rank / ledCount;

    // Fully lit before this LED's turn
    if (retract < deathStart) return 1;

    // Time since this LED's death began (0 → 1 within its own flicker window)
    const timeSinceDeath = retract - deathStart;

    // Death flicker: brightens briefly then snaps off
    if (timeSinceDeath < this.FLICKER_WINDOW) {
      // Brief super-bright flash (mask > 1 is clamped to 1 by the engine, but
      // values slightly above 1 are fine — they just saturate)
      const flickerPhase = timeSinceDeath / this.FLICKER_WINDOW;
      // Triangle: rise fast, fall at the midpoint
      if (flickerPhase < 0.4) {
        // Rising flash: 1.0 → 1.6
        return 1 + (flickerPhase / 0.4) * 0.6;
      } else {
        // Fast drop to 0
        return Math.max(0, 1.6 * (1 - (flickerPhase - 0.4) / 0.6));
      }
    }

    // Permanently off
    return 0;
  }

  /**
   * Build a Fisher-Yates shuffle of [0, ledCount).
   * The resulting array maps ledIndex → turn-off rank.
   */
  private buildPermutation(ledCount: number): void {
    this.permutation = new Uint16Array(ledCount);
    // Initialise identity
    for (let i = 0; i < ledCount; i++) this.permutation[i] = i;

    // Fisher-Yates using a simple LCG for a deterministic-yet-chaotic order.
    // Using a fixed seed means the same visual every time, which avoids
    // jarring frame-to-frame randomness (the permutation is stable per-
    // retraction, only rebuilt when ledCount changes).
    let rng = 0xdeadbeef;
    for (let i = ledCount - 1; i > 0; i--) {
      rng = Math.imul(rng, 1664525) + 1013904223;
      const j = (rng >>> 0) % (i + 1);
      // Swap
      const tmp = this.permutation[i];
      this.permutation[i] = this.permutation[j] ?? 0;
      this.permutation[j] = tmp ?? 0;
    }

    this.permLedCount = ledCount;
  }
}
