// ─── Modulation — Per-Frame Modulator Sampler (v1.1 / Friday v1.0 Preview) ───
//
// Pulls raw modulator values off `StyleContext`, applies per-descriptor
// one-pole smoothing, latches clash intensity, and returns a frozen
// value map that an `EvalContext` wraps. See design doc §3.1 (value
// sources) and §6.1 (per-frame pipeline).
//
// This module has zero DOM / React dependencies per CLAUDE.md
// Architecture Principle #2.

import type {
  EffectType,
  StyleContext,
} from '../types.js';
import type { ModulatorId } from './types.js';
import {
  BUILT_IN_MODULATORS,
  EVENT_MODULATOR_DECAY,
  EVENT_MODULATOR_IDS,
} from './registry.js';

// ─── Clash decay default ────────────────────────────────────────────
//
// Design doc §3.1 reads: "Latched on clash trigger, decays per
// `BladeConfig.clashIntensity`". The existing `BladeConfig.clashIntensity`
// is a 0-100 *brightness* scalar consumed by `ClashEffect`, not a
// per-frame decay coefficient — using the same name for both would
// have conflated brightness with temporal falloff.
//
// 2026-04-29: an authoritative `BladeConfig.clashDecay` field now
// exists (`packages/engine/src/types.ts`); BladeEngine threads it
// through to `sampleModulators` as the optional 4th parameter. When
// the caller passes `undefined` (or the field is unset on the config),
// we fall back to the established 0.92 — a stable "looks right"
// default that mirrors the ClashEffect's brightness falloff.
const DEFAULT_CLASH_DECAY_PER_FRAME = 0.92;

// ─── Public state shape ─────────────────────────────────────────────

/**
 * State the sampler threads frame-to-frame.
 *
 * - `values`           — the map of ModulatorId → smoothed sample, frozen
 *                        (pass as `EvalContext.modulators`)
 * - `clashIntensity`   — latched clash value; decays toward 0 each frame
 * - `eventIntensities` — Wave 8 LITE: latched intensities for the 8
 *                        aux/gesture event modulators. Each entry decays
 *                        per its `EVENT_MODULATOR_DECAY` coefficient and
 *                        re-latches to 1.0 on a fresh rising edge of the
 *                        corresponding event in `events`.
 * - `prevTime`         — the `StyleContext.time` from the previous call,
 *                        used to detect new frames vs. reuse
 */
export interface SamplerState {
  readonly values: ReadonlyMap<ModulatorId, number>;
  readonly clashIntensity: number;
  readonly eventIntensities: ReadonlyMap<string, number>;
  readonly prevTime: number;
}

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * One-pole exponential smoothing.
 *
 *   out = prev + (raw - prev) * (1 - smoothing)
 *
 * When `smoothing === 0`, this degenerates to `raw` — i.e. no
 * smoothing. Matches the math in design doc §3.1.
 */
function smooth(prev: number, raw: number, coefficient: number): number {
  if (coefficient <= 0) return raw;
  if (coefficient >= 1) return prev;
  return prev + (raw - prev) * (1 - coefficient);
}

/**
 * Sample the raw value for a built-in modulator off the current
 * StyleContext. No smoothing, no latching — just the plumbed-through
 * live reading. For `preon` / `ignition` / `retraction` progress,
 * StyleContext does not expose a direct reading, so v1.0 returns 0
 * with a TODO — the engine-side wiring lands in the v1.1 sprint when
 * BladeEngine publishes those progress values into the StyleContext
 * shape.
 */
function readRawModulator(
  id: ModulatorId,
  ctx: StyleContext,
  effectsActive: ReadonlySet<EffectType>,
  prevClashIntensity: number,
  clashJustTriggered: boolean,
  prevEventIntensities: ReadonlyMap<string, number>,
): number {
  switch (id) {
    case 'swing':
      return ctx.swingSpeed;
    case 'angle':
      return ctx.bladeAngle;
    case 'twist':
      return ctx.twistAngle;
    case 'sound':
      return ctx.soundLevel;
    case 'battery':
      return ctx.batteryLevel;
    case 'time':
      return ctx.time;
    case 'clash':
      // Clash is special: latch to 1 on trigger, otherwise decay the
      // previous value. The caller computes `clashJustTriggered` and
      // we return the raw latched/decayed reading; the decay is done
      // by the sampler's outer loop (not here).
      return clashJustTriggered ? 1 : prevClashIntensity;
    case 'lockup':
      return effectsActive.has('lockup') ? 1 : 0;
    // T1.3 (2026-04-29): `preon` / `ignition` / `retraction` progress
    // are now first-class fields on `StyleContext` (populated by
    // BladeEngine.computeStateProgress). Each climbs 0→1 only while
    // its corresponding state is active and reads 0 otherwise. See
    // `packages/engine/src/types.ts` for the field docstrings.
    case 'preon':
      return ctx.preonProgress;
    case 'ignition':
      return ctx.ignitionProgress;
    case 'retraction':
      return ctx.retractionProgress;
    default:
      // Wave 8 LITE: aux/gesture event modulators. Their values come
      // from `prevEventIntensities` (which the sampler outer loop
      // updates by latching on rising edge + decaying per-frame). The
      // outer loop is the source of truth; here we just surface the
      // latest known intensity into the values map.
      const idStr = id as string;
      if (EVENT_MODULATOR_DECAY[idStr] !== undefined) {
        return prevEventIntensities.get(idStr) ?? 0;
      }
      // Unknown ID — per design doc §4.4, this evaluates to 0.
      return 0;
  }
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Per-frame modulator sampler. Pure — returns a new state; does not
 * mutate `prevSample`.
 *
 * @param ctx              — the current frame's `StyleContext`
 * @param prevSample       — the previous frame's returned `SamplerState`,
 *                           or `null` for the first frame
 * @param effectsActive    — live set of effect types currently firing;
 *                           drives `lockup` (and later `drag` / `melt`).
 *                           For Friday v1.0 only `clash` + `lockup` are
 *                           consumed; other entries are ignored.
 * @param clashDecayPerFrame — optional override for the clash modulator's
 *                           per-frame decay coefficient. Defaults to
 *                           `DEFAULT_CLASH_DECAY_PER_FRAME` (0.92) when
 *                           `undefined`. Threaded from
 *                           `BladeConfig.clashDecay` by BladeEngine.
 * @param events           — optional set of Wave 8 LITE event-modulator
 *                           IDs that fired this frame (e.g. `aux-click`,
 *                           `gesture-twist`). On a rising edge for any
 *                           ID present here, that modulator latches to
 *                           1.0; subsequent frames without the event
 *                           decay per `EVENT_MODULATOR_DECAY[id]`.
 *                           Defaults to an empty set.
 *
 * Evaluation order matches §6.1 of the design doc:
 *
 *   1. read raw values off the context + previous clash
 *   2. one-pole smooth per descriptor `smoothing` coefficient
 *   3. latch clash on new trigger, decay per-frame otherwise
 *   4. latch each Wave 8 event modulator on its rising edge, decay
 *      per its registry-declared coefficient otherwise
 *   5. return a frozen map
 */
export function sampleModulators(
  ctx: StyleContext,
  prevSample: SamplerState | null,
  effectsActive: ReadonlySet<EffectType>,
  clashDecayPerFrame?: number,
  events: ReadonlySet<string> = EMPTY_EVENT_SET,
): SamplerState {
  // Clamp the override into a sensible range. Undefined / out-of-band
  // inputs fall back to the established 0.92 default — the modulation
  // UI shouldn't surface negative or >1 values, but defending against
  // them here keeps the sampler robust against legacy config files
  // and adversarial inputs from glyph round-trip.
  const decayCoefficient =
    typeof clashDecayPerFrame === 'number' &&
    clashDecayPerFrame >= 0 &&
    clashDecayPerFrame <= 1
      ? clashDecayPerFrame
      : DEFAULT_CLASH_DECAY_PER_FRAME;
  // Decide whether this call represents a new clash trigger.
  // We look at:
  //   (a) clash membership in `effectsActive` (engine says it's active)
  //   (b) a rising edge: the previous sample either didn't exist or
  //       its clash was below a rising-edge threshold (0.5).
  //
  // The rising-edge guard prevents a long-held `effectsActive.has('clash')`
  // (which shouldn't happen in practice — clash is a one-shot — but is
  // cheap to defend against) from re-latching to 1 every frame.
  const clashActive = effectsActive.has('clash');
  const prevClashIntensity = prevSample?.clashIntensity ?? 0;
  const clashJustTriggered = clashActive && prevClashIntensity < 0.5;

  // ─── Wave 8 LITE: compute next event intensities ─────────────────
  //
  // For each of the 8 event-driven modulators:
  //   - If the event is present in `events` AND the previous intensity
  //     is below the rising-edge threshold (0.5), latch to 1.0.
  //   - Otherwise, decay the previous intensity by the registry-
  //     declared coefficient (`EVENT_MODULATOR_DECAY[id]`).
  //
  // The same rising-edge guard as `clash` prevents a sustained event
  // (e.g. a held aux-hold spanning many frames) from re-latching every
  // frame. For modulators with a "held" semantic like `aux-hold` and
  // `gesture-shake`, the high decay coefficient (0.95) keeps the value
  // near 1.0 across the held frames so bindings see continuous
  // engagement, then settles after release.
  const prevEventIntensities =
    prevSample?.eventIntensities ?? EMPTY_EVENT_INTENSITY_MAP;
  const nextEventIntensities = new Map<string, number>();
  for (const id of EVENT_MODULATOR_IDS) {
    const prev = prevEventIntensities.get(id) ?? 0;
    const justTriggered = events.has(id) && prev < 0.5;
    if (justTriggered) {
      nextEventIntensities.set(id, 1);
    } else {
      const eventDecay = EVENT_MODULATOR_DECAY[id] ?? 0;
      nextEventIntensities.set(id, prev * eventDecay);
    }
  }

  // Build the next values map by walking the built-in descriptor list.
  const nextValues = new Map<ModulatorId, number>();

  for (const descriptor of BUILT_IN_MODULATORS) {
    const raw = readRawModulator(
      descriptor.id,
      ctx,
      effectsActive,
      prevClashIntensity,
      clashJustTriggered,
      // For event modulators, surface the freshly-computed intensity so
      // `values.get(id)` reflects the current frame's latched/decayed
      // value. Event modulators have smoothing=0 so the smoothing pass
      // below is a pass-through.
      nextEventIntensities,
    );

    const prevValue = prevSample?.values.get(descriptor.id) ?? raw;
    const smoothing = descriptor.smoothing ?? 0;
    const smoothed = smooth(prevValue, raw, smoothing);

    nextValues.set(descriptor.id, smoothed);
  }

  // Compute the next latched clash intensity.
  //
  // - New trigger: snap to 1
  // - Otherwise: decay prev by `decayCoefficient` (caller override
  //   from BladeConfig.clashDecay, or DEFAULT_CLASH_DECAY_PER_FRAME)
  //
  // The decayed intensity is what we expose through `values.get('clash')`
  // for the next frame's read. We patch it in here after the smoothing
  // pass so the value the sampler returns for `clash` reflects the
  // decayed state the evaluator should see this frame.
  const nextClashIntensity = clashJustTriggered
    ? 1
    : prevClashIntensity * decayCoefficient;
  nextValues.set('clash', nextClashIntensity);

  return {
    values: nextValues,
    clashIntensity: nextClashIntensity,
    eventIntensities: nextEventIntensities,
    prevTime: ctx.time,
  };
}

// Stable empty references so callers that don't pass `events` don't
// each allocate their own Set / Map per frame.
const EMPTY_EVENT_SET: ReadonlySet<string> = new Set<string>();
const EMPTY_EVENT_INTENSITY_MAP: ReadonlyMap<string, number> = new Map<
  string,
  number
>();

/**
 * Convenience constructor for a first-frame `SamplerState`. Useful for
 * tests and for engine code that wants to seed a known zero-state
 * without pattern-matching `null` everywhere.
 */
export function emptySamplerState(): SamplerState {
  const values = new Map<ModulatorId, number>();
  for (const descriptor of BUILT_IN_MODULATORS) {
    values.set(descriptor.id, 0);
  }
  // Wave 8 LITE — seed every event modulator's latched intensity to 0.
  const eventIntensities = new Map<string, number>();
  for (const id of EVENT_MODULATOR_IDS) {
    eventIntensities.set(id, 0);
  }
  return {
    values,
    clashIntensity: 0,
    eventIntensities,
    prevTime: 0,
  };
}

/**
 * Exposed for tests that want to assert the default decay coefficient
 * matches the intended value.
 */
export const _internal: {
  readonly DEFAULT_CLASH_DECAY_PER_FRAME: number;
  readonly smooth: (prev: number, raw: number, coefficient: number) => number;
} = {
  DEFAULT_CLASH_DECAY_PER_FRAME,
  smooth,
};
