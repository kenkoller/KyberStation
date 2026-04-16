import type { EffectType, EffectParams, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * GhostEchoEffect — a fading afterimage of the blade's previous state trails
 * behind movement.
 *
 * On trigger, captures a snapshot of the current blade state (conceptual — we
 * store a frozen time reference). Over 800ms the ghost image is overlaid at
 * decreasing opacity while the live blade continues updating. The ghost shifts
 * slightly (2-3 LEDs worth of position offset) in the swing direction for a
 * motion-blur / "force ghost" feel.
 *
 * Because the effect system processes per-pixel without direct access to a
 * full LED buffer, we simulate the snapshot by tinting toward a desaturated,
 * slightly brightened version of the current color — creating the "double
 * vision" afterimage look. The position shift creates the trailing ghost.
 */
export class GhostEchoEffect extends BaseEffect {
  readonly id = 'ghostEcho';
  readonly type: EffectType = 'ghostEcho';

  /** Ghost offset in blade-length units (~2-3 LEDs on a 144-LED strip). */
  private static readonly GHOST_OFFSET = 0.02;

  /** Snapshot color storage: maps quantized position to RGB. */
  private snapshot: Map<number, RGB> = new Map();

  /** Direction of the ghost shift: +1 toward tip, -1 toward hilt. */
  private shiftDirection: number = 1;

  constructor() {
    super();
    this.duration = 800;
  }

  override trigger(params: EffectParams): void {
    super.trigger(params);
    // Clear any previous snapshot
    this.snapshot.clear();
    // Swing direction determines ghost shift: position > 0.5 means tip-ward impact
    this.shiftDirection = (params.position ?? 0.5) > 0.5 ? -1 : 1;
  }

  override reset(): void {
    super.reset();
    this.snapshot.clear();
  }

  apply(color: RGB, position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    if (context.progress >= 1) {
      this.active = false;
      this.snapshot.clear();
      return color;
    }

    // Quantize position to ~144 buckets for snapshot storage
    const bucket = Math.round(position * 143);

    // On the first few frames, build up the snapshot from live colors
    if (context.elapsed < 33) {
      // Capture the current color as the "frozen" state
      this.snapshot.set(bucket, { r: color.r, g: color.g, b: color.b });
      return color;
    }

    // Ghost opacity fades out over the effect duration (after capture phase)
    const fadeProgress = (context.elapsed - 33) / (this.duration - 33);
    const ghostOpacity = Math.max(0, 1 - fadeProgress);

    // Offset position to sample the ghost from a shifted location
    const shiftAmount =
      GhostEchoEffect.GHOST_OFFSET * this.shiftDirection * fadeProgress;
    const shiftedBucket = Math.round((position + shiftAmount) * 143);
    const clampedBucket = Math.max(0, Math.min(143, shiftedBucket));

    // Retrieve snapshot color, or derive a ghost from the current color
    const snapshotColor = this.snapshot.get(clampedBucket);

    if (snapshotColor) {
      // Desaturate the snapshot slightly for a ghostly appearance
      const avg =
        (snapshotColor.r + snapshotColor.g + snapshotColor.b) / 3;
      const ghostColor: RGB = {
        r: Math.min(255, snapshotColor.r * 0.6 + avg * 0.4 + 20),
        g: Math.min(255, snapshotColor.g * 0.6 + avg * 0.4 + 20),
        b: Math.min(255, snapshotColor.b * 0.6 + avg * 0.4 + 20),
      };

      return lerpColor(color, ghostColor, ghostOpacity * 0.5);
    }

    // No snapshot data for this position: create a subtle desaturated ghost
    // from the live color to still produce a visible echo
    const avg = (color.r + color.g + color.b) / 3;
    const fallbackGhost: RGB = {
      r: Math.min(255, color.r * 0.5 + avg * 0.5 + 15),
      g: Math.min(255, color.g * 0.5 + avg * 0.5 + 15),
      b: Math.min(255, color.b * 0.5 + avg * 0.5 + 15),
    };

    return lerpColor(color, fallbackGhost, ghostOpacity * 0.3);
  }
}
