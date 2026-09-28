// ─── Differential render gate — every gallery preset ─────────────────
//
// The editor renders every preset by generating its ProffieOS style code
// and evaluating that template per LED (template-eval, the default render
// mode since v0.23.0). Nothing in CI exercised that pipeline across the
// gallery, and three shipped bugs would each have tripped one of the
// invariants below:
//
//   • v0.23.1 white-out (#357) — every blade rendered pure white
//     → "an ignited blade is not a white-out"
//   • lockup rendered nothing under template-eval
//     → "a lockup trigger changes pixels"
//   • ignition / retraction styles were never drawn (blade snapped fully
//     lit, stayed fully lit through retraction)
//     → "ignition / retraction are drawn"
//
// For each of the ALL_PRESETS entries the sweep: generates the style code,
// renders it through a BladeEngine in template-eval mode (asserting it
// really took the template path rather than silently falling back to the
// parameter engine), ignites, holds a lockup, releases it, and retracts.
// A second engine runs in lockstep — same seeded Math.random, same frames —
// so the lockup comparison is exact rather than fighting flicker noise.
//
// For solid `stable` presets the template-eval colour is also compared
// against the parameter engine (the pre-v0.23 approximation) within a
// documented tolerance.
//
// Allowlists: a preset that legitimately violates an invariant is listed
// by id with the reason, never by weakening the check for everyone. Each
// allowlist states its premise and the suite verifies that premise still
// holds, so entries cannot silently rot.
//
// Runtime: one sweep in beforeAll (~4–5 s locally for 455 presets); the
// individual invariant tests only read the recorded measurements and list
// every offending preset in their failure message.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ALL_PRESETS, type Preset } from '@kyberstation/presets';
import { generateStyleCode } from '@kyberstation/codegen';
import { BladeEngine, type BladeConfig, type EngineRenderPath } from '@kyberstation/engine';
import {
  bladeStats,
  hueDistance,
  installSeededRandom,
  presetBladeConfig,
  singleBladeTopology,
  toHsv,
  type BladeStats,
  type SeededRandom,
} from './presetRenderHarness';

// ─── Allowlists ───────────────────────────────────────────────────────

/**
 * `neutron` style: a single travelling particle over a dark blade. Whole-
 * blade brightness is dominated by where the particle happens to be, so
 * "mostly lit" and brightness ratios between states say nothing about the
 * ignition / retraction mask. (The mask itself is pinned for every
 * ignition and retraction by the engine's templateEvalIgnition test.)
 */
const SPARSE_PARTICLE_PRESETS: ReadonlySet<string> = new Set([
  'creative-astral-projection',
  'creative-shooting-star',
  'creative-neutron-drift',
  'showcase-neutron-star',
  'pop-myth-cu-chulainn-stream',
]);

/** Near-white base colour — a (near-)white blade is the intended look. */
const NEAR_WHITE_PRESETS: ReadonlySet<string> = new Set([
  'pop-anime-tengen-nichirin',
  'pop-harry-potter-lumos-maxima',
]);

// ─── Tolerances ───────────────────────────────────────────────────────

/** Ignited-blade share of LEDs that must be visibly lit. */
const MIN_LIT_FRACTION = 0.5;
/** Share of pure-white LEDs that counts as a white-out. */
const WHITE_OUT_FRACTION = 0.9;
/** Brightness (vs. steady ON) above which a mid-transition frame looks "fully lit". */
const MID_TRANSITION_MAX_RATIO = 0.9;
/** Brightness (vs. ON) allowed at 10% remaining extension during retraction. */
const LATE_RETRACTION_MAX_RATIO = 0.6;
/**
 * LEDs that must change when a lockup is held. The two lockstep engines
 * are bit-identical apart from the held lockup (same seeded randomness,
 * same frames, and triggering the lockup consumes no randomness), so ANY
 * per-channel difference is lockup output — a false positive is
 * impossible, and the shipped bug produced exactly zero change. A larger
 * threshold would wrongly flag presets whose lockup colour is deliberately
 * close to the base: creative-dark-mode locks up in 50,50,60 over a
 * 30,30,40 blade (~3–5 per channel), legends-corran-horn-silver in
 * 200,210,230 over 220,225,240.
 */
const MIN_LOCKUP_CHANGED_LEDS = 3;
const LOCKUP_CHANNEL_THRESHOLD = 1;

/**
 * Template-eval vs parameter engine, solid `stable` presets. The codegen
 * emits `AudioFlicker<base, Mix<Int<16384>, base, White>>`, which flickers
 * TOWARD WHITE (less saturated, brighter), while the engine's StableStyle
 * shimmer DARKENS the base colour. So the two agree on hue but differ
 * systematically in saturation and value. Observed across all 152 stable
 * presets on 2026-09-28: max hue Δ 0.6°, max |Δsat| 0.22, max |Δvalue| 45.
 */
const STABLE_PARITY = {
  maxHueDelta: 3, // degrees
  maxSaturationDelta: 0.3,
  maxValueDelta: 60, // 0-255
  /** Hue is meaningless for near-grey colours; skip the hue check below this saturation. */
  minSaturationForHue: 0.25,
} as const;

// ─── Sweep ────────────────────────────────────────────────────────────

const DT = 20; // ms per frame
const SETTLE_FRAMES = 10; // after reaching ON
const LOCKUP_FRAMES = 5;
const RELEASE_FRAMES = 20; // 400 ms > the 300 ms lockup end transition
const MAX_FRAMES = 500; // guard against a state machine that never settles

interface Measurement {
  preset: Preset;
  config: BladeConfig;
  codegenError: string | null;
  /** Render path at steady ON. */
  path: EngineRenderPath;
  on: BladeStats | null;
  /** Mean ON colour averaged over the settle frames. */
  onMean: [number, number, number] | null;
  /** Brightness at the first IGNITING frame with extension ≥ 0.4, vs ON. */
  midIgnitionRatio: number | null;
  lockupChangedLeds: number;
  /** Sum of |Δ| between the lockup engine and the reference after release + fade. */
  lockupResidue: number;
  /** Brightness at the first RETRACTING frame with extension ≤ 0.5, vs ON. */
  midRetractionRatio: number | null;
  /** Brightness at the first RETRACTING frame with extension ≤ 0.1, vs ON. */
  lateRetractionRatio: number | null;
  reachedOff: boolean;
  offBrightness: number;
}

function changedLeds(a: Uint8Array, b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i += 3) {
    const d = Math.max(
      Math.abs(a[i]! - b[i]!),
      Math.abs(a[i + 1]! - b[i + 1]!),
      Math.abs(a[i + 2]! - b[i + 2]!),
    );
    if (d >= LOCKUP_CHANNEL_THRESHOLD) n++;
  }
  return n;
}

function absDiff(a: Uint8Array, b: Uint8Array): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i]! - b[i]!);
  return d;
}

function measure(preset: Preset, presetIndex: number, rng: SeededRandom): Measurement {
  const config = presetBladeConfig(preset);
  const m: Measurement = {
    preset,
    config,
    codegenError: null,
    path: 'off',
    on: null,
    onMean: null,
    midIgnitionRatio: null,
    lockupChangedLeds: 0,
    lockupResidue: 0,
    midRetractionRatio: null,
    lateRetractionRatio: null,
    reachedOff: false,
    offBrightness: -1,
  };

  let code: string;
  try {
    code = generateStyleCode(config, { comments: false });
  } catch (err) {
    m.codegenError = err instanceof Error ? err.message : String(err);
    return m;
  }

  const topology = singleBladeTopology(config.ledCount ?? 144);
  const ref = new BladeEngine(topology);
  const lock = new BladeEngine(topology);
  ref.setPreviewTemplate(code);
  lock.setPreviewTemplate(code);

  let frame = 0;
  const seedFor = (f: number) => presetIndex * 100_003 + f;
  const stepBoth = () => {
    rng.seed(seedFor(frame));
    ref.update(DT, config);
    rng.seed(seedFor(frame));
    lock.update(DT, config);
    frame++;
  };

  // ── Ignition ──
  ref.ignite(config);
  lock.ignite(config);
  let midIgnition: number | null = null;
  while (ref.state !== 'on' && frame < MAX_FRAMES) {
    stepBoth();
    if (midIgnition === null && ref.state === 'igniting' && ref.extendProgress >= 0.4) {
      midIgnition = bladeStats(ref.getPixels()).brightness;
    }
  }
  const mean: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < SETTLE_FRAMES; i++) {
    stepBoth();
    const s = bladeStats(ref.getPixels());
    mean[0] += s.mean[0] / SETTLE_FRAMES;
    mean[1] += s.mean[1] / SETTLE_FRAMES;
    mean[2] += s.mean[2] / SETTLE_FRAMES;
  }
  m.path = ref.lastRenderPath;
  m.on = bladeStats(ref.getPixels());
  m.onMean = mean;
  const onBrightness = Math.max(1, m.on.brightness);
  m.midIgnitionRatio = midIgnition === null ? null : midIgnition / onBrightness;

  // ── Lockup (held on `lock` only) ──
  lock.triggerEffect('lockup', { position: 0.5 });
  for (let i = 0; i < LOCKUP_FRAMES; i++) stepBoth();
  m.lockupChangedLeds = changedLeds(ref.getPixels(), lock.getPixels());
  lock.releaseEffect('lockup');
  for (let i = 0; i < RELEASE_FRAMES; i++) stepBoth();
  m.lockupResidue = absDiff(ref.getPixels(), lock.getPixels());

  // ── Retraction (reference engine only) ──
  ref.retract();
  const retractStart = frame;
  while (ref.state !== 'off' && frame - retractStart < MAX_FRAMES) {
    rng.seed(seedFor(frame));
    ref.update(DT, config);
    frame++;
    if (ref.state !== 'retracting') continue;
    const p = ref.extendProgress;
    if (m.midRetractionRatio === null && p <= 0.5) {
      m.midRetractionRatio = bladeStats(ref.getPixels()).brightness / onBrightness;
    }
    if (m.lateRetractionRatio === null && p <= 0.1) {
      m.lateRetractionRatio = bladeStats(ref.getPixels()).brightness / onBrightness;
    }
  }
  m.reachedOff = ref.state === 'off';
  m.offBrightness = bladeStats(ref.getPixels()).brightness;
  return m;
}

/** Steady-ON mean colour of a preset rendered by the parameter engine. */
function parameterEngineMean(m: Measurement, presetIndex: number, rng: SeededRandom): [number, number, number] {
  const engine = new BladeEngine(singleBladeTopology(m.config.ledCount ?? 144));
  engine.setRenderMode('proffie');
  engine.ignite(m.config);
  let frame = 0;
  while (engine.state !== 'on' && frame < MAX_FRAMES) {
    rng.seed(presetIndex * 100_003 + frame++);
    engine.update(DT, m.config);
  }
  const mean: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < SETTLE_FRAMES; i++) {
    rng.seed(presetIndex * 100_003 + frame++);
    engine.update(DT, m.config);
    const s = bladeStats(engine.getPixels());
    mean[0] += s.mean[0] / SETTLE_FRAMES;
    mean[1] += s.mean[1] / SETTLE_FRAMES;
    mean[2] += s.mean[2] / SETTLE_FRAMES;
  }
  return mean;
}

let measurements: Measurement[] = [];
const parameterMeans = new Map<string, [number, number, number]>();
let restoreRandom: (() => void) | null = null;
let sweepMs = 0;

beforeAll(() => {
  const { rng, restore } = installSeededRandom();
  restoreRandom = restore;
  const t0 = performance.now();
  measurements = ALL_PRESETS.map((preset, i) => measure(preset, i, rng));
  measurements.forEach((m, i) => {
    if (m.config.style === 'stable' && m.onMean) {
      parameterMeans.set(m.preset.id, parameterEngineMean(m, i, rng));
    }
  });
  sweepMs = performance.now() - t0;
}, 120_000);

afterAll(() => {
  restoreRandom?.();
});

function offenders(pred: (m: Measurement) => string | null): string[] {
  const out: string[] = [];
  for (const m of measurements) {
    const why = pred(m);
    if (why) out.push(`${m.preset.id} (${m.config.style}): ${why}`);
  }
  return out;
}

const fmt = (x: number | null) => (x === null ? 'n/a' : x.toFixed(2));

// ─── Invariants ───────────────────────────────────────────────────────

describe(`preset render gate — ${ALL_PRESETS.length} presets through codegen → template-eval`, () => {
  it('swept every preset', () => {
    expect(measurements.length).toBe(ALL_PRESETS.length);
    // Visible in the test output for CI-time tracking.
    console.info(`[presetRenderParity] swept ${measurements.length} presets in ${sweepMs.toFixed(0)} ms`);
  });

  it('every preset generates code that parses and renders through template-eval', () => {
    const bad = offenders((m) => {
      if (m.codegenError) return `codegen threw: ${m.codegenError}`;
      if (m.path !== 'template-eval') return `rendered via '${m.path}' (template did not parse or was not used)`;
      return null;
    });
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('an ignited blade is not black', () => {
    const bad = offenders((m) => {
      if (!m.on) return 'never reached ON';
      if (m.on.lit === 0) return 'no LED lit';
      if (!SPARSE_PARTICLE_PRESETS.has(m.preset.id) && m.on.lit < m.on.count * MIN_LIT_FRACTION) {
        return `only ${m.on.lit}/${m.on.count} LEDs lit`;
      }
      return null;
    });
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('an ignited blade is not a white-out', () => {
    const bad = offenders((m) => {
      if (!m.on || NEAR_WHITE_PRESETS.has(m.preset.id)) return null;
      return m.on.white >= m.on.count * WHITE_OUT_FRACTION
        ? `${m.on.white}/${m.on.count} LEDs pure white (base ${JSON.stringify(m.config.baseColor)})`
        : null;
    });
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('the ignition is drawn (mid-ignition blade is not fully lit)', () => {
    const bad = offenders((m) => {
      if (SPARSE_PARTICLE_PRESETS.has(m.preset.id)) return null;
      if (m.midIgnitionRatio === null) return `no mid-ignition frame observed (ignitionMs=${m.config.ignitionMs})`;
      return m.midIgnitionRatio >= MID_TRANSITION_MAX_RATIO
        ? `mid-ignition brightness ${fmt(m.midIgnitionRatio)}× ON (ignition '${m.config.ignition}')`
        : null;
    });
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('a lockup trigger changes pixels', () => {
    const bad = offenders((m) =>
      m.lockupChangedLeds < MIN_LOCKUP_CHANGED_LEDS
        ? `lockup changed only ${m.lockupChangedLeds} LEDs`
        : null,
    );
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('a released lockup fades out completely', () => {
    const bad = offenders((m) =>
      m.lockupResidue !== 0 ? `lockup residue ${m.lockupResidue} after ${RELEASE_FRAMES * DT} ms` : null,
    );
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('the retraction is drawn and reaches dark', () => {
    const bad = offenders((m) => {
      if (!m.reachedOff) return 'never reached OFF';
      if (m.offBrightness !== 0) return `OFF blade not dark (brightness ${m.offBrightness})`;
      if (SPARSE_PARTICLE_PRESETS.has(m.preset.id)) return null;
      if (m.midRetractionRatio === null || m.midRetractionRatio >= MID_TRANSITION_MAX_RATIO) {
        return `mid-retraction brightness ${fmt(m.midRetractionRatio)}× ON (retraction '${m.config.retraction}')`;
      }
      if (m.lateRetractionRatio === null || m.lateRetractionRatio >= LATE_RETRACTION_MAX_RATIO) {
        return `late-retraction brightness ${fmt(m.lateRetractionRatio)}× ON (retraction '${m.config.retraction}')`;
      }
      return null;
    });
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('stable presets match the parameter engine within the documented tolerance', () => {
    expect(parameterMeans.size).toBeGreaterThan(100);
    const bad = offenders((m) => {
      const paramMean = parameterMeans.get(m.preset.id);
      if (!paramMean || !m.onMean) return null;
      const t = toHsv(m.onMean);
      const p = toHsv(paramMean);
      const problems: string[] = [];
      if (
        t.s >= STABLE_PARITY.minSaturationForHue &&
        p.s >= STABLE_PARITY.minSaturationForHue &&
        hueDistance(t.h, p.h) > STABLE_PARITY.maxHueDelta
      ) {
        problems.push(`hue ${t.h.toFixed(1)}° vs ${p.h.toFixed(1)}°`);
      }
      if (Math.abs(t.s - p.s) > STABLE_PARITY.maxSaturationDelta) {
        problems.push(`saturation ${t.s.toFixed(2)} vs ${p.s.toFixed(2)}`);
      }
      if (Math.abs(t.v - p.v) > STABLE_PARITY.maxValueDelta) {
        problems.push(`value ${t.v.toFixed(0)} vs ${p.v.toFixed(0)}`);
      }
      return problems.length ? `template-eval vs parameter engine: ${problems.join(', ')}` : null;
    });
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('allowlist entries exist and still match their stated premise', () => {
    const byId = new Map(ALL_PRESETS.map((p) => [p.id, p]));
    const stale: string[] = [];
    for (const id of SPARSE_PARTICLE_PRESETS) {
      const p = byId.get(id);
      if (!p) stale.push(`${id}: not in ALL_PRESETS`);
      else if (p.config.style !== 'neutron') stale.push(`${id}: style is '${p.config.style}', not 'neutron'`);
    }
    for (const id of NEAR_WHITE_PRESETS) {
      const p = byId.get(id);
      const c = p?.config.baseColor;
      if (!p || !c) stale.push(`${id}: not in ALL_PRESETS`);
      else if (Math.min(c.r, c.g, c.b) < 235) stale.push(`${id}: base ${JSON.stringify(c)} is not near-white`);
    }
    expect(stale, stale.join('\n')).toEqual([]);
  });
});
