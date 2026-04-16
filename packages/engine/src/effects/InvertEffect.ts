import type { EffectType, EffectContext, RGB } from '../types.js';
import { lerpColor } from '../LEDArray.js';
import { BaseEffect } from './BaseEffect.js';

/**
 * InvertEffect — momentarily inverts all blade colors (RGB -> 255-RGB).
 *
 * Timeline (400ms total):
 *   - 0-50ms:    Ease-in to fully inverted colors.
 *   - 50-350ms:  Hold inverted state.
 *   - 350-400ms: Ease-out back to original colors.
 *
 * Each pixel's RGB is lerped toward (255-r, 255-g, 255-b) based on the
 * current envelope value.
 */
export class InvertEffect extends BaseEffect {
  readonly id = 'invert';
  readonly type: EffectType = 'invert';

  /** Transition durations in ms */
  private static readonly EASE_IN_MS = 50;
  private static readonly HOLD_MS = 300;
  private static readonly EASE_OUT_MS = 50;

  constructor() {
    super();
    this.duration =
      InvertEffect.EASE_IN_MS + InvertEffect.HOLD_MS + InvertEffect.EASE_OUT_MS; // 400ms
  }

  apply(color: RGB, _position: number, context: EffectContext): RGB {
    if (!this.active) return color;

    if (context.progress >= 1) {
      this.active = false;
      return color;
    }

    const elapsed = context.elapsed;

    // Compute envelope: 0 = no inversion, 1 = fully inverted
    let envelope: number;
    if (elapsed < InvertEffect.EASE_IN_MS) {
      // Ease-in: 0 -> 1 over first 50ms
      envelope = elapsed / InvertEffect.EASE_IN_MS;
      // Smooth the ramp with ease-in curve
      envelope = envelope * envelope;
    } else if (
      elapsed <
      InvertEffect.EASE_IN_MS + InvertEffect.HOLD_MS
    ) {
      // Hold at full inversion
      envelope = 1;
    } else {
      // Ease-out: 1 -> 0 over last 50ms
      const fadeElapsed =
        elapsed - InvertEffect.EASE_IN_MS - InvertEffect.HOLD_MS;
      envelope = 1 - fadeElapsed / InvertEffect.EASE_OUT_MS;
      // Smooth the ramp with ease-out curve
      envelope = envelope * envelope;
    }

    envelope = Math.max(0, Math.min(1, envelope));

    // Inverted color
    const inverted: RGB = {
      r: 255 - color.r,
      g: 255 - color.g,
      b: 255 - color.b,
    };

    return lerpColor(color, inverted, envelope);
  }
}
