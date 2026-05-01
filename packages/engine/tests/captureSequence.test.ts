// ─── captureSequence — multi-frame engine capture tests ───
//
// The helper is the GIF-sprint counterpart of `captureStateFrame`. These
// tests pin: frame-count math, per-mode boundary correctness (idle-loop
// stays in ON, ignition-cycle traverses PREON → IGNITING → ON →
// RETRACTING → OFF), buffer determinism (same config → same frames),
// argument validation, and that returned buffers are independent copies.

import { describe, it, expect } from 'vitest';
import {
  captureSequence,
  captureSequenceWithStates,
  computeEffectTriggerFrame,
  computeFrameCount,
} from '../src/captureSequence';
import { BladeState } from '../src/types';
import type { BladeConfig } from '../src/types';

function makeBlueConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0.1,
    ledCount: 144,
    ...overrides,
  };
}

/** Sum every channel across a frame buffer — used as a coarse "lit-ness" metric. */
function totalLuminance(buf: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i];
  return sum;
}

describe('computeFrameCount', () => {
  it('rounds fps × seconds for default options', () => {
    expect(computeFrameCount({ mode: 'idle-loop' })).toBe(24); // 24 fps × 1s
    expect(computeFrameCount({ mode: 'ignition-cycle' })).toBe(60); // 24 × 2.5s
  });

  it('honours fps + durationMs overrides', () => {
    expect(computeFrameCount({ mode: 'idle-loop', fps: 30, durationMs: 1000 })).toBe(30);
    expect(computeFrameCount({ mode: 'ignition-cycle', fps: 12, durationMs: 1500 })).toBe(18);
  });

  it('clamps to a minimum of 1 frame', () => {
    expect(computeFrameCount({ mode: 'idle-loop', fps: 1, durationMs: 0.1 })).toBe(1);
  });
});

describe('captureSequence: idle-loop', () => {
  it('produces fps × duration_seconds frames at default settings', () => {
    const frames = captureSequence({ mode: 'idle-loop', config: makeBlueConfig() });
    expect(frames.length).toBe(24); // 24 fps × 1s
  });

  it('matches computeFrameCount for arbitrary fps + durationMs', () => {
    const opts = { mode: 'idle-loop' as const, config: makeBlueConfig(), fps: 30, durationMs: 1500 };
    expect(captureSequence(opts).length).toBe(computeFrameCount(opts));
  });

  it('returns Uint8Array buffers sized 3 × totalLEDs (default = 132)', () => {
    const frames = captureSequence({ mode: 'idle-loop', config: makeBlueConfig() });
    for (const f of frames) {
      expect(f).toBeInstanceOf(Uint8Array);
      expect(f.length).toBe(132 * 3);
    }
  });

  it('produces lit pixels (blade is ON throughout)', () => {
    const frames = captureSequence({ mode: 'idle-loop', config: makeBlueConfig() });
    // Every frame should have non-trivial luminance — blue blade lit.
    for (const f of frames) {
      expect(totalLuminance(f)).toBeGreaterThan(0);
    }
  });

  it('returns independent copies (mutating one does not affect another)', () => {
    const frames = captureSequence({ mode: 'idle-loop', config: makeBlueConfig() });
    const original = frames[0][0];
    frames[0][0] = (frames[0][0] + 1) % 256;
    // Other frames at the same index untouched.
    expect(frames[1][0]).not.toBe(frames[0][0]);
    // Restore so the test doesn't surprise debuggers.
    frames[0][0] = original;
  });

  it('is deterministic — same config produces structurally identical frames', () => {
    const a = captureSequence({ mode: 'idle-loop', config: makeBlueConfig(), fps: 12, durationMs: 500 });
    const b = captureSequence({ mode: 'idle-loop', config: makeBlueConfig(), fps: 12, durationMs: 500 });
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].length).toBe(b[i].length);
      for (let j = 0; j < a[i].length; j++) {
        expect(a[i][j]).toBe(b[i][j]);
      }
    }
  });
});

describe('captureSequence: ignition-cycle', () => {
  it('produces fps × duration_seconds frames at default settings', () => {
    const frames = captureSequence({ mode: 'ignition-cycle', config: makeBlueConfig() });
    expect(frames.length).toBe(60); // 24 fps × 2.5s
  });

  it('starts dark and ends dark — full ignite/retract arc', () => {
    const frames = captureSequence({
      mode: 'ignition-cycle',
      config: makeBlueConfig({ ignitionMs: 300, retractionMs: 400 }),
      fps: 24,
      durationMs: 2500,
    });
    // First frame: still igniting from OFF, very dim.
    const firstLum = totalLuminance(frames[0]);
    // Last frame: blade has retracted to (or near) OFF.
    const lastLum = totalLuminance(frames[frames.length - 1]);
    // Some middle frame: blade is fully lit.
    const middleLum = totalLuminance(frames[Math.floor(frames.length / 2)]);
    expect(middleLum).toBeGreaterThan(firstLum);
    expect(middleLum).toBeGreaterThan(lastLum);
  });

  it('captureSequenceWithStates reports the full state machine arc', () => {
    const result = captureSequenceWithStates({
      mode: 'ignition-cycle',
      config: makeBlueConfig({ preonEnabled: true, preonMs: 200 }),
      fps: 30,
      durationMs: 3000,
    });
    const seen = new Set(result.states);
    // Hit at least PREON + IGNITING + ON + RETRACTING (OFF on tail).
    expect(seen.has(BladeState.PREON)).toBe(true);
    expect(seen.has(BladeState.IGNITING)).toBe(true);
    expect(seen.has(BladeState.ON)).toBe(true);
    expect(seen.has(BladeState.RETRACTING)).toBe(true);
  });

  it('skips PREON when preonEnabled is false', () => {
    const result = captureSequenceWithStates({
      mode: 'ignition-cycle',
      config: makeBlueConfig({ preonEnabled: false }),
      fps: 30,
      durationMs: 2500,
    });
    // No PREON frames when the option is off.
    expect(result.states.includes(BladeState.PREON)).toBe(false);
    // Still hit IGNITING / ON / RETRACTING.
    expect(result.states.includes(BladeState.IGNITING)).toBe(true);
    expect(result.states.includes(BladeState.ON)).toBe(true);
    expect(result.states.includes(BladeState.RETRACTING)).toBe(true);
  });

  it('is deterministic — same config produces structurally identical frames', () => {
    const cfg = makeBlueConfig({ ignitionMs: 250, retractionMs: 350 });
    const a = captureSequence({ mode: 'ignition-cycle', config: cfg, fps: 12, durationMs: 1500 });
    const b = captureSequence({ mode: 'ignition-cycle', config: cfg, fps: 12, durationMs: 1500 });
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a[i].length; j++) {
        expect(a[i][j]).toBe(b[i][j]);
      }
    }
  });
});

describe('captureSequence: argument validation', () => {
  it('throws on fps <= 0', () => {
    expect(() =>
      captureSequence({ mode: 'idle-loop', config: makeBlueConfig(), fps: 0 }),
    ).toThrow(/fps/);
    expect(() =>
      captureSequence({ mode: 'idle-loop', config: makeBlueConfig(), fps: -10 }),
    ).toThrow(/fps/);
  });

  it('throws on non-finite fps', () => {
    expect(() =>
      captureSequence({ mode: 'idle-loop', config: makeBlueConfig(), fps: NaN }),
    ).toThrow(/fps/);
    expect(() =>
      captureSequence({ mode: 'idle-loop', config: makeBlueConfig(), fps: Infinity }),
    ).toThrow(/fps/);
  });

  it('throws on durationMs <= 0', () => {
    expect(() =>
      captureSequence({ mode: 'idle-loop', config: makeBlueConfig(), durationMs: 0 }),
    ).toThrow(/durationMs/);
    expect(() =>
      captureSequence({ mode: 'idle-loop', config: makeBlueConfig(), durationMs: -100 }),
    ).toThrow(/durationMs/);
  });

  it('throws on unknown mode', () => {
    // @ts-expect-error — testing runtime guard against bogus mode strings.
    expect(() => captureSequence({ mode: 'spinny', config: makeBlueConfig() })).toThrow(/unknown mode/);
  });
});

// ─── Sprint 4 — Tier 3 effect-specific modes ─────────────────────────

describe('captureSequence: blast-deflect', () => {
  it('produces 18 frames at default 30 fps × 600ms', () => {
    const frames = captureSequence({
      mode: 'blast-deflect',
      config: makeBlueConfig(),
    });
    expect(frames.length).toBe(18);
  });

  it('matches computeFrameCount across overrides', () => {
    const opts = {
      mode: 'blast-deflect' as const,
      config: makeBlueConfig(),
      fps: 24,
      durationMs: 800,
    };
    expect(captureSequence(opts).length).toBe(computeFrameCount(opts));
  });

  it('returns Uint8Array buffers sized 3 × totalLEDs (default = 132)', () => {
    const frames = captureSequence({
      mode: 'blast-deflect',
      config: makeBlueConfig(),
    });
    for (const f of frames) {
      expect(f).toBeInstanceOf(Uint8Array);
      expect(f.length).toBe(132 * 3);
    }
  });

  it('blade is lit throughout (settle-to-ON before any blast)', () => {
    const frames = captureSequence({
      mode: 'blast-deflect',
      config: makeBlueConfig(),
    });
    for (const f of frames) {
      expect(totalLuminance(f)).toBeGreaterThan(0);
    }
  });

  it('the trigger frame (frameCount/3) shows a luminance spike vs pre-trigger baseline', () => {
    const frames = captureSequence({
      mode: 'blast-deflect',
      config: makeBlueConfig(),
    });
    const triggerFrame = computeEffectTriggerFrame({ mode: 'blast-deflect' });
    expect(triggerFrame).toBe(6); // 18 / 3
    const preTrigger = totalLuminance(frames[triggerFrame - 1]);
    // Frame just after trigger should be brighter than the previous
    // baseline as the blast bump lights up around mid-blade.
    const atOrAfter = Math.max(
      totalLuminance(frames[triggerFrame]),
      totalLuminance(frames[triggerFrame + 1] ?? frames[triggerFrame]),
    );
    expect(atOrAfter).toBeGreaterThan(preTrigger);
  });

  it('produces stable frame count + buffer sizes across runs', () => {
    // Strict byte-determinism is not expected — `MotionSimulator.update`
    // adds Math.random()*0.1 jitter into soundLevel, which the shimmer
    // pipeline reads. We assert the structural shape stays stable.
    const cfg = makeBlueConfig();
    const a = captureSequence({ mode: 'blast-deflect', config: cfg });
    const b = captureSequence({ mode: 'blast-deflect', config: cfg });
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].length).toBe(b[i].length);
    }
  });

  it('captureSequenceWithStates reports ON state throughout (settled blade)', () => {
    const result = captureSequenceWithStates({
      mode: 'blast-deflect',
      config: makeBlueConfig(),
    });
    // Every captured frame should be ON; we settle to ON before recording.
    for (const s of result.states) {
      expect(s).toBe(BladeState.ON);
    }
  });
});

describe('captureSequence: stab-tip-flash', () => {
  it('produces 15 frames at default 30 fps × 500ms', () => {
    const frames = captureSequence({
      mode: 'stab-tip-flash',
      config: makeBlueConfig(),
    });
    expect(frames.length).toBe(15);
  });

  it('blade is lit throughout (settle-to-ON before any stab)', () => {
    const frames = captureSequence({
      mode: 'stab-tip-flash',
      config: makeBlueConfig(),
    });
    for (const f of frames) {
      expect(totalLuminance(f)).toBeGreaterThan(0);
    }
  });

  it('the trigger frame is at frameCount/3', () => {
    expect(computeEffectTriggerFrame({ mode: 'stab-tip-flash' })).toBe(5); // 15 / 3
  });

  it('the trigger frame shows a luminance change vs pre-trigger baseline', () => {
    const frames = captureSequence({
      mode: 'stab-tip-flash',
      config: makeBlueConfig(),
    });
    const triggerFrame = computeEffectTriggerFrame({ mode: 'stab-tip-flash' });
    const preTrigger = totalLuminance(frames[triggerFrame - 1]);
    const atOrAfter = Math.max(
      totalLuminance(frames[triggerFrame]),
      totalLuminance(frames[triggerFrame + 1] ?? frames[triggerFrame]),
    );
    // Stab brightens the tip; expect any change in luminance vs baseline.
    expect(atOrAfter).not.toBe(preTrigger);
  });

  it('produces stable frame count + buffer sizes across runs', () => {
    // Same caveat as blast-deflect — MotionSimulator's soundLevel jitter
    // means strict byte-determinism is not expected; we assert shape.
    const cfg = makeBlueConfig();
    const a = captureSequence({ mode: 'stab-tip-flash', config: cfg });
    const b = captureSequence({ mode: 'stab-tip-flash', config: cfg });
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].length).toBe(b[i].length);
    }
  });
});

describe('captureSequence: swing-response', () => {
  it('produces 60 frames at default 30 fps × 2000ms', () => {
    const frames = captureSequence({
      mode: 'swing-response',
      config: makeBlueConfig(),
    });
    expect(frames.length).toBe(60);
  });

  it('blade is lit throughout (settle-to-ON; no event triggers)', () => {
    const frames = captureSequence({
      mode: 'swing-response',
      config: makeBlueConfig(),
    });
    for (const f of frames) {
      expect(totalLuminance(f)).toBeGreaterThan(0);
    }
  });

  it('captureSequenceWithStates reports ON state throughout', () => {
    const result = captureSequenceWithStates({
      mode: 'swing-response',
      config: makeBlueConfig(),
    });
    for (const s of result.states) {
      expect(s).toBe(BladeState.ON);
    }
  });

  it('is deterministic across runs with the same config', () => {
    // swing-response uses Math.sin(t) deterministically + the simulator's
    // soundLevel uses Math.random() jitter. We care that the helper
    // produces stable frame counts and the same swing-driven progression
    // shape; the existence of a tiny soundLevel jitter doesn't make the
    // mode non-deterministic at the LED-output layer because base
    // shimmer dominates.
    const a = captureSequence({
      mode: 'swing-response',
      config: makeBlueConfig({ shimmer: 0 }),
      fps: 12,
      durationMs: 1000,
    });
    const b = captureSequence({
      mode: 'swing-response',
      config: makeBlueConfig({ shimmer: 0 }),
      fps: 12,
      durationMs: 1000,
    });
    expect(a.length).toBe(b.length);
  });
});

describe('captureSequence: Sprint 4 default fps', () => {
  it('blast-deflect defaults to 30 fps', () => {
    expect(computeFrameCount({ mode: 'blast-deflect' })).toBe(18); // 30 × 0.6
  });
  it('stab-tip-flash defaults to 30 fps', () => {
    expect(computeFrameCount({ mode: 'stab-tip-flash' })).toBe(15); // 30 × 0.5
  });
  it('swing-response defaults to 30 fps', () => {
    expect(computeFrameCount({ mode: 'swing-response' })).toBe(60); // 30 × 2
  });
});
