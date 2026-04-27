// ─── captureSequence — multi-frame engine capture for GIF rendering ───
//
// Sibling of `BladeEngine.captureStateFrame`: that helper returns a single
// snapshot at a fixed state, this one returns an N-frame sequence. The
// engine package stays headless — no DOM, no `window`, no
// `requestAnimationFrame`. Callers (apps/web GIF encoder, build scripts,
// future CLI exports) consume the returned `Uint8Array[]` of LED buffers
// and feed them through whatever rendering pipeline they own.
//
// Modes shipped in Sprint 1:
//
//   • 'idle-loop'        — bring the blade up to ON, settle, then capture
//                          a continuous 1s window of the steady-state
//                          shimmer. Works as a near-seamless GIF loop at
//                          typical shimmer frequencies (≤2 Hz).
//
//   • 'ignition-cycle'   — full PREON → IGNITING → ON-hold → RETRACTING →
//                          OFF arc. Uses the public ignite()/retract()
//                          API; the state machine drives the rest.
//
// See `docs/SABER_GIF_ROADMAP.md` for the broader inventory and the
// downstream encoder + UI integration.

import { BladeEngine } from './BladeEngine.js';
import { BladeState } from './types.js';
import type { BladeConfig, BladeTopology } from './types.js';

export type CaptureSequenceMode = 'idle-loop' | 'ignition-cycle';

export interface CaptureSequenceOptions {
  mode: CaptureSequenceMode;
  config: BladeConfig;
  /** Frames per second. Default 24 — small enough to keep GIF size
   *  manageable, fast enough for fluid motion. */
  fps?: number;
  /** Total clip length in milliseconds. Default depends on mode. */
  durationMs?: number;
  /** Optional topology override (defaults to DEFAULT_TOPOLOGY = 132 LEDs). */
  topology?: BladeTopology;
}

const DEFAULT_FPS = 24;

const DEFAULT_DURATION_MS: Record<CaptureSequenceMode, number> = {
  'idle-loop': 1000,
  'ignition-cycle': 2500,
};

/**
 * Number of frames the helper will produce for the given options.
 * Exposed so callers (renderCardGif, tests) can size buffers without
 * actually running the capture.
 */
export function computeFrameCount(opts: {
  mode: CaptureSequenceMode;
  fps?: number;
  durationMs?: number;
}): number {
  const fps = opts.fps ?? DEFAULT_FPS;
  const durationMs = opts.durationMs ?? DEFAULT_DURATION_MS[opts.mode];
  return Math.max(1, Math.round((durationMs / 1000) * fps));
}

/**
 * Capture a multi-frame LED-buffer sequence from a fresh `BladeEngine`.
 *
 * Returns an array of `Uint8Array` LED buffers, one per frame. Each
 * buffer is a fresh copy (NOT a reference to the engine's internal
 * pixel store), so callers can hold onto them across the whole render.
 *
 * Pure data — no DOM, no rendering. The engine instance is created
 * inside this call and discarded when the helper returns.
 */
export function captureSequence(opts: CaptureSequenceOptions): Uint8Array[] {
  if (opts.mode !== 'idle-loop' && opts.mode !== 'ignition-cycle') {
    throw new Error(
      `captureSequence: unknown mode ${(opts as { mode: string }).mode}`,
    );
  }
  const fps = opts.fps ?? DEFAULT_FPS;
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error(`captureSequence: fps must be > 0 (got ${fps})`);
  }
  const durationMs = opts.durationMs ?? DEFAULT_DURATION_MS[opts.mode];
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error(`captureSequence: durationMs must be > 0 (got ${durationMs})`);
  }

  const frameCount = computeFrameCount({ mode: opts.mode, fps, durationMs });
  const deltaMs = 1000 / fps;
  const engine = new BladeEngine(opts.topology);
  const frames: Uint8Array[] = [];

  if (opts.mode === 'idle-loop') {
    // Bring the blade to a settled ON before we start capturing — this
    // keeps the loop's first frame visually identical to its last
    // (modulo the shimmer's per-frame jitter, which is sub-perceptual
    // at typical shimmer frequencies).
    engine.ignite(opts.config);
    const preonMs = opts.config.preonEnabled ? (opts.config.preonMs ?? 300) : 0;
    const ignitionMs = opts.config.ignitionMs ?? 300;
    // +120ms tail so styles + effects converge to their steady state.
    const settleMs = preonMs + ignitionMs + 120;
    advanceEngine(engine, opts.config, settleMs, deltaMs);

    for (let i = 0; i < frameCount; i++) {
      engine.update(deltaMs, opts.config);
      frames.push(new Uint8Array(engine.getPixels()));
    }
    return frames;
  }

  if (opts.mode === 'ignition-cycle') {
    // Full PREON → IGNITING → ON-hold → RETRACTING → OFF arc.
    //
    // We schedule the retract trigger so retraction finishes a few
    // frames before the end of the clip — that gives the clip a clean
    // OFF tail and avoids the GIF cutting off mid-retract.
    const preonMs = opts.config.preonEnabled ? (opts.config.preonMs ?? 300) : 0;
    const ignitionMs = opts.config.ignitionMs ?? 300;
    const retractionMs = opts.config.retractionMs ?? 500;
    // Where we want retract() to fire, in elapsed-since-ignite ms.
    // Floor to "after ignition+50ms hold" so we don't accidentally
    // trigger before the blade is even fully extended.
    const minRetractAt = preonMs + ignitionMs + 50;
    const idealRetractAt = durationMs - retractionMs - deltaMs * 2;
    const retractAtMs = Math.max(minRetractAt, idealRetractAt);

    engine.ignite(opts.config);
    let elapsed = 0;
    let retractFired = false;

    for (let i = 0; i < frameCount; i++) {
      if (!retractFired && elapsed >= retractAtMs) {
        engine.retract();
        retractFired = true;
      }
      engine.update(deltaMs, opts.config);
      frames.push(new Uint8Array(engine.getPixels()));
      elapsed += deltaMs;
    }
    return frames;
  }

  throw new Error(
    `captureSequence: unknown mode ${(opts as { mode: string }).mode}`,
  );
}

// ─── Internal helpers ───

/** Tick the engine forward by `totalMs` worth of `deltaMs` updates. */
function advanceEngine(
  engine: BladeEngine,
  config: BladeConfig,
  totalMs: number,
  deltaMs: number,
): void {
  let t = 0;
  while (t < totalMs) {
    engine.update(deltaMs, config);
    t += deltaMs;
  }
}

/**
 * Convenience: return a per-frame `BladeState` array alongside the LED
 * buffers. Useful for callers (renderCardGif) that want to log /
 * narrate the sequence. Re-runs the same simulation as `captureSequence`
 * — kept separate so the primary helper stays pure-data.
 */
export function captureSequenceWithStates(opts: CaptureSequenceOptions): {
  frames: Uint8Array[];
  states: BladeState[];
  fps: number;
  durationMs: number;
} {
  const fps = opts.fps ?? DEFAULT_FPS;
  const durationMs = opts.durationMs ?? DEFAULT_DURATION_MS[opts.mode];
  const frameCount = computeFrameCount({ mode: opts.mode, fps, durationMs });
  const deltaMs = 1000 / fps;
  const engine = new BladeEngine(opts.topology);
  const frames: Uint8Array[] = [];
  const states: BladeState[] = [];

  if (opts.mode === 'idle-loop') {
    engine.ignite(opts.config);
    const preonMs = opts.config.preonEnabled ? (opts.config.preonMs ?? 300) : 0;
    const ignitionMs = opts.config.ignitionMs ?? 300;
    advanceEngine(engine, opts.config, preonMs + ignitionMs + 120, deltaMs);
    for (let i = 0; i < frameCount; i++) {
      engine.update(deltaMs, opts.config);
      frames.push(new Uint8Array(engine.getPixels()));
      states.push(engine.getState());
    }
  } else {
    const preonMs = opts.config.preonEnabled ? (opts.config.preonMs ?? 300) : 0;
    const ignitionMs = opts.config.ignitionMs ?? 300;
    const retractionMs = opts.config.retractionMs ?? 500;
    const minRetractAt = preonMs + ignitionMs + 50;
    const idealRetractAt = durationMs - retractionMs - deltaMs * 2;
    const retractAtMs = Math.max(minRetractAt, idealRetractAt);
    engine.ignite(opts.config);
    let elapsed = 0;
    let retractFired = false;
    for (let i = 0; i < frameCount; i++) {
      if (!retractFired && elapsed >= retractAtMs) {
        engine.retract();
        retractFired = true;
      }
      engine.update(deltaMs, opts.config);
      frames.push(new Uint8Array(engine.getPixels()));
      states.push(engine.getState());
      elapsed += deltaMs;
    }
  }

  return { frames, states, fps, durationMs };
}
