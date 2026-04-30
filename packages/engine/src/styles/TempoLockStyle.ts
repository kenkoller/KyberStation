import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';

/**
 * Tempo Lock — phases blade intensity at user-defined BPM (60-180), creating
 * heartbeat / dance-track pulse for rhythmic presets.
 *
 * Implementation note (interpretation of the v0.15.x effects proposal):
 * The proposal labels Tempo Lock an "effect", but its math has no discrete
 * trigger event — it's a continuous modulator of the base color brightness.
 * That's a STYLE shape in this engine, not a `BladeEffect` (which requires
 * `trigger()` / `release()` / `isActive()`). Implementing as a style means it
 * composes correctly with combat effects (clash flashes still appear over
 * the BPM-driven base) and the codegen pattern stays simple — a single
 * `Mix<Sin<period_ms>, dimRgb, fullRgb>` template.
 *
 * Hardware-fidelity check: ProffieOS emits this as
 *   `Mix<Sin<period_ms>, Mix<Int<minScalar>, Black, baseRgb>, baseRgb>`
 * where `period_ms = 60000 / BPM` (one full sin cycle per beat). See the
 * codegen entry in `packages/codegen/src/ASTBuilder.ts`.
 *
 * Static-BPM only — modulation-driven BPM is deferred to v1.2+ per the
 * proposal's open question 1 (BPM source).
 *
 * Configurable via:
 *   - `tempoBpm` (60..180, default 120) — beats per minute.
 *   - `tempoDepth` (0..1, default 0.5) — pulse depth (1 = full off→on).
 */
export class TempoLockStyle extends BaseStyle {
  readonly id = 'tempoLock';
  readonly name = 'Tempo Lock';
  readonly description =
    'Phases blade intensity at user-defined BPM for heartbeat / dance-track presets. Static-BPM (modulation-driven BPM is v1.2+).';

  getColor(_position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    const bpm = (context.config.tempoBpm as number | undefined) ?? 120;
    const depth = (context.config.tempoDepth as number | undefined) ?? 0.5;

    const bright = tempoLockBrightness(time, bpm, depth);

    return {
      r: Math.min(255, base.r * bright),
      g: Math.min(255, base.g * bright),
      b: Math.min(255, base.b * bright),
    };
  }
}

// ─── Pure brightness function (exported for tests) ───

/**
 * Compute Tempo Lock brightness at a given time.
 *
 * @param time  ms since blade ignition (engine `StyleContext.time`).
 * @param bpm   Beats per minute (60..180 typical).
 * @param depth Pulse depth, 0..1 (0 = no pulse, 1 = full off-to-on).
 *
 * @returns Brightness scalar in [1-depth, 1.0].
 *   - At depth=0: returns 1.0 (no pulse)
 *   - At depth=0.5 (default): brightness oscillates 0.5..1.0 each beat
 *   - At depth=1: brightness oscillates 0..1 each beat
 *
 * The formula matches what ProffieOS `Mix<Sin<period_ms>, ...>` produces:
 * a smooth sine-driven mix between the dim color and full color, one full
 * cycle per beat (period_ms = 60000 / bpm).
 */
export function tempoLockBrightness(
  time: number,
  bpm: number,
  depth: number,
): number {
  const clampedBpm = Math.max(1, Math.min(300, bpm));
  const clampedDepth = Math.max(0, Math.min(1, depth));

  // Period in ms: 60000 / bpm gives one full sin cycle per beat
  const periodMs = 60000 / clampedBpm;

  // Phase: 2π * (time / period)
  const phase = (time / periodMs) * Math.PI * 2;

  // sin maps to [-1, 1]; remap to [1 - depth, 1]
  const sin = Math.sin(phase);
  const normalized = (sin + 1) * 0.5; // [0, 1]
  const bright = 1 - clampedDepth + clampedDepth * normalized; // [1-depth, 1]

  return bright;
}
