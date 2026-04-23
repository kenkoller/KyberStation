import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';

/**
 * Darksaber — Mandalorian Darksaber approximation on a 1D Neopixel strip.
 *
 * Hardware-fidelity note (see docs/HARDWARE_FIDELITY_PRINCIPLE.md):
 * The canonical Darksaber visual is a flat triangular blade with a bright
 * white outline around a dark interior — but a 1D LED strip cannot render a
 * 2D outline (there are no "edge" LEDs; the LEDs ARE the blade). The closest
 * physically-achievable approximation on real hardware is:
 *   - Bright white at the emitter (~first 5% of LEDs)
 *   - Near-black body across the middle (92%)
 *   - Bright white at the tip (~last 5% of LEDs)
 * with smooth transitions in between. This is the same shape ProffieOS
 * libraries emit via `Gradient<White, Black, Black, White>`.
 *
 * No time-based animation — the Darksaber is not an unstable blade in canon.
 * Shimmer/flicker is deliberately NOT applied here so the style stays faithful
 * to the static-core Darksaber look.
 */
export class DarkSaberStyle extends BaseStyle {
  readonly id = 'darksaber';
  readonly name = 'Darksaber';
  readonly description =
    'Mandalorian Darksaber: bright emitter + tip, near-black body. 1D-hardware-accurate approximation of the 2D outlined blade.';

  getColor(position: number, _time: number, _context: StyleContext): RGB {
    return darksaberColorAt(position);
  }
}

// ─── Pure color function (exported for tests) ───

const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BODY: RGB = { r: 5, g: 5, b: 5 };

/** Hermite smoothstep for smooth interpolation. */
function smoothstep(t: number): number {
  const ct = Math.max(0, Math.min(1, t));
  return ct * ct * (3 - 2 * ct);
}

/** Interpolate between two colors by a 0..1 parameter. */
function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/**
 * Darksaber per-LED color as a pure function of position along the blade.
 * - 0.00–0.03: pure white (emitter flare)
 * - 0.03–0.08: smooth white → body
 * - 0.08–0.92: near-black body
 * - 0.92–0.97: smooth body → white
 * - 0.97–1.00: pure white (tip flare)
 */
export function darksaberColorAt(position: number): RGB {
  // Clamp position to [0, 1] so out-of-range callers get a well-defined answer.
  const p = Math.max(0, Math.min(1, position));

  // Emitter flare (first 3%)
  if (p <= 0.03) return { ...WHITE };

  // Emitter → body transition (3% → 8%)
  if (p <= 0.08) {
    const t = smoothstep((p - 0.03) / 0.05);
    return mix(WHITE, BODY, t);
  }

  // Tip flare (last 3%)
  if (p >= 0.97) return { ...WHITE };

  // Body → tip transition (92% → 97%)
  if (p >= 0.92) {
    const t = smoothstep((p - 0.92) / 0.05);
    return mix(BODY, WHITE, t);
  }

  // Body (8% → 92%)
  return { ...BODY };
}
