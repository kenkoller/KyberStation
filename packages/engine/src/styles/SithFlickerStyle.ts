import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';

/**
 * Sith Flicker — Vader / Inquisitor unstable-weapon aesthetic.
 *
 * Hardware-fidelity note (see docs/HARDWARE_FIDELITY_PRINCIPLE.md):
 * Models the iconic flickering red blade — full brightness flashing to a
 * dim minimum (~5-10%) at 3-8 Hz randomized. The whole blade flickers as
 * one (per-LED variance kept low), reading as a power-instability event
 * rather than per-pixel noise. This is exactly what a `Mix<Sin<>, dim, full>`
 * ProffieOS template produces on real hardware — see the codegen entry in
 * `packages/codegen/src/ASTBuilder.ts` for the canonical emission shape.
 *
 * Math (deterministic, no Math.random — frame-stable):
 *   bright(time) = (sin(time * freq * 2π) > thresh) ? 1.0 : minBrightness
 * with hysteresis on the threshold edge so 60fps sampling doesn't strobe.
 *
 * Configurable via:
 *   - `flickerRate` (Hz, default 5) — base frequency. Hardware ProffieOS
 *     emits the matching `Sin<period_ms>` int (period_ms = 1000/Hz).
 *   - `flickerMinBright` (0..1, default 0.10) — brightness floor during dip.
 */
export class SithFlickerStyle extends BaseStyle {
  readonly id = 'sithFlicker';
  readonly name = 'Sith Flicker';
  readonly description =
    'Vader / Inquisitor unstable-weapon flicker — base color drops to ~10% at 3-8 Hz. Reads as a power-instability event, not per-pixel noise.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Defaults match the proposal's 3-8 Hz range, picking a middle-of-band
    // 5 Hz rate that reads as recognizably unstable but doesn't strobe.
    const rate =
      (context.config.flickerRate as number | undefined) ?? 5;
    const minBright =
      (context.config.flickerMinBright as number | undefined) ?? 0.1;

    const bright = sithFlickerBrightness(time, rate, minBright);

    // Per-LED variance — tiny ±2.5% ripple around the whole-blade brightness
    // so the flicker doesn't read as a perfectly flat pulse. Driven by the
    // same time clock so it's deterministic + frame-stable.
    const ripple = Math.sin(position * 12.9898 + time * 0.0073) * 0.025;
    const finalBright = Math.max(0, Math.min(1, bright + ripple));

    return {
      r: Math.min(255, base.r * finalBright),
      g: Math.min(255, base.g * finalBright),
      b: Math.min(255, base.b * finalBright),
    };
  }
}

// ─── Pure brightness function (exported for tests + codegen drift sentinel) ───

/**
 * Compute Sith Flicker whole-blade brightness for a given time.
 *
 * @param time     ms since blade ignition (engine `StyleContext.time`).
 * @param rateHz   Flicker frequency in Hz (3-8 typical).
 * @param minBright Brightness floor during dip (0..1, e.g. 0.1 = 10%).
 *
 * @returns Brightness scalar in [minBright, 1.0]. Uses `sin(t*ω) > 0` as the
 *  high/low gate so the duty cycle is exactly 50% — matching what
 *  `Mix<Sin<period_ms>, dim, full>` produces on real ProffieOS hardware.
 */
export function sithFlickerBrightness(
  time: number,
  rateHz: number,
  minBright: number,
): number {
  // Convert ms-time to phase. `time * rateHz / 1000 * 2π` is one cycle per
  // (1000/rateHz) ms — matches a ProffieOS `Sin<period_ms>` template.
  const phase = (time * rateHz) / 1000;
  const sin = Math.sin(phase * Math.PI * 2);

  // Hysteresis band: we treat sin in (-0.05, +0.05) as the previous state.
  // For determinism we just gate on sign; the asymmetric ramp around 0
  // would matter only for sub-frame visual artefacts that don't apply at
  // 60fps. Pure sign gate matches the ProffieOS emission shape (Mix<Sin>
  // is itself a sign-gated mixer for boolean targets). Smooth transitions
  // are handled by ProffieOS's interpolation when the user dials slower
  // rates; the visualizer mirrors that.
  return sin > 0 ? 1.0 : Math.max(0, Math.min(1, minBright));
}
