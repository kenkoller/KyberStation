// ─── Modulation — Built-in Modulator Registry (v1.1 / Friday v1.0 Preview) ───
//
// Source of truth for the 11 built-in modulator descriptors documented
// in `docs/MODULATION_ROUTING_V1.1.md` §3.1. Each descriptor carries:
//
//   - `id`           — stable string ID matching `BuiltInModulatorId`
//   - `displayName`  — user-facing label
//   - `colorVar`     — CSS variable reference for the modulator's
//                      identity color (propagates through the UI as
//                      wire-coloring on routed scrub fields)
//   - `range`        — closed interval the raw source value lives in
//   - `unit`         — unit label for scrub-label display
//   - `smoothing`    — one-pole smoothing coefficient in [0, 1). Higher
//                      = slower response. 0 = no smoothing.
//   - `builtIn`      — always `true` here
//
// The `colorVar` values are CSS tokens of the shape `var(--mod-<id>)`.
// The UI layer is responsible for defining those tokens; the engine
// does not care what color they resolve to.
//
// This module has zero DOM / React dependencies per CLAUDE.md
// Architecture Principle #2 (engine-first, headless-capable).

import type { BuiltInModulatorId, ModulatorDescriptor, ModulatorId } from './types.js';

/**
 * The 11 built-in modulators, in a fixed display order. Consumers that
 * want a UI-stable ordering (e.g. LayerStack modulator plate list)
 * should preserve this order. Adding new IDs is a breaking change per
 * the stability contract in `docs/MODULATION_ROUTING_V1.1.md` §7.3.
 *
 * Smoothing defaults come from the design doc §3.1 table — they are
 * deliberately slow on inputs that a human perceives as "inertia"
 * (swing, sound) and zero on discrete event progresses (preon,
 * ignition, retraction, clash, lockup) where the binding should see
 * the raw 0..1 ramp.
 */
export const BUILT_IN_MODULATORS: readonly ModulatorDescriptor[] = [
  {
    id: 'swing',
    displayName: 'Swing',
    colorVar: 'var(--mod-swing)',      // blue — kinetic motion
    range: [0, 1],
    unit: '',
    smoothing: 0.35,
    builtIn: true,
  },
  {
    id: 'angle',
    displayName: 'Angle',
    colorVar: 'var(--mod-angle)',      // teal — orientation
    range: [-1, 1],
    unit: '',
    smoothing: 0.2,
    builtIn: true,
  },
  {
    id: 'twist',
    displayName: 'Twist',
    colorVar: 'var(--mod-twist)',      // violet — rotation about long axis
    range: [-1, 1],
    unit: '',
    smoothing: 0.2,
    builtIn: true,
  },
  {
    id: 'sound',
    displayName: 'Sound',
    colorVar: 'var(--mod-sound)',      // magenta — audio / RMS envelope
    range: [0, 1],
    unit: '',
    smoothing: 0.5,
    builtIn: true,
  },
  {
    id: 'battery',
    displayName: 'Battery',
    colorVar: 'var(--mod-battery)',    // green — power / charge
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'time',
    displayName: 'Time',
    colorVar: 'var(--mod-time)',       // gold — temporal
    // Upper bound is 2^32 ms per StyleContext.time contract; expressed
    // as Number.MAX_SAFE_INTEGER here so UI scaling code never divides
    // by something that might wrap. Bindings authored against `time`
    // typically scale through `sin(time * 0.001)` anyway.
    range: [0, 0x1_0000_0000],
    unit: 'ms',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'clash',
    displayName: 'Clash',
    colorVar: 'var(--mod-clash)',      // white — impact flash
    range: [0, 1],
    unit: '',
    // Clash is latched + decayed in the sampler rather than smoothed —
    // smoothing is intentionally 0 to avoid compounding the decay.
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'lockup',
    displayName: 'Lockup',
    colorVar: 'var(--mod-lockup)',     // amber — sustained contact
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'preon',
    displayName: 'Preon',
    colorVar: 'var(--mod-preon)',      // ice-blue — pre-ignition priming
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'ignition',
    displayName: 'Ignition',
    colorVar: 'var(--mod-ignition)',   // cyan — extending
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'retraction',
    displayName: 'Retraction',
    colorVar: 'var(--mod-retraction)', // warm-red — retracting
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  // ─── Wave 8 LITE — aux + gesture event modulators ─────────────────
  //
  // Eight event-driven modulators that latch to 1 on a discrete event
  // and decay over time, mirroring the `clash` modulator's pattern
  // (design doc §3.1 latch+decay shape). The sampler receives these
  // events through a new optional `events: ReadonlySet<string>` arg
  // on `sampleModulators` — see the sampler module for the contract.
  //
  // The 8 IDs split into two families:
  //
  //   - Aux button events (3): `aux-click` / `aux-hold` / `aux-double-click`
  //     map to the prop file's discrete button events. Wave 8's full
  //     UI (button routing sub-tab) lands in a follow-up PR.
  //
  //   - Gesture events (5): `gesture-twist` / `gesture-stab` /
  //     `gesture-swing` / `gesture-clash` / `gesture-shake` map to
  //     prop-file gesture vocabularies (Fett263, SA22C, BC).
  //
  // Note on `gesture-clash`: this is distinct from the `clash`
  // modulator above. `clash` reads the engine's effects-active set
  // (i.e. "clash effect is firing right now") and represents the
  // visual decay of the impact flash. `gesture-clash` is the discrete
  // button/IMU-detected gesture event that USER motion produces — it
  // can fire without the clash effect (e.g. a user-bound clash trigger
  // that maps to a different visual response). Two separate signals;
  // future bindings can use either or both.
  //
  // Smoothing is `0` for all 8 — these are event-decay signals and
  // the sampler's latch+decay logic owns the temporal shape directly.
  // A non-zero smoothing would compound with the decay and feel sluggish.
  //
  // Decay coefficients (the per-modulator decay-per-frame multiplier)
  // live alongside the registry entry for the sampler to read. See
  // `EVENT_MODULATOR_DECAY` below — this is the right place for it
  // because changing decay-feel is a UX/registry concern, not a
  // sampler-internals concern.
  //
  // The IDs use kebab-case (`aux-click`, `gesture-twist`) to keep them
  // visually distinct from the camelCase / single-word built-ins above
  // when scanning binding tables in the UI. As of the Wave 8 UI shell
  // PR, all 8 IDs are members of the `BuiltInModulatorId` union — the
  // earlier "live as `ModulatorId` strings via custom branch" workaround
  // was tightened away. `isBuiltInModulatorId` narrows to the union via
  // the registry-map check, so consumers get strict type narrowing.
  {
    id: 'aux-click',
    displayName: 'Aux Click',
    colorVar: 'var(--mod-aux-click)',         // cyan — discrete button event
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'aux-hold',
    displayName: 'Aux Hold',
    colorVar: 'var(--mod-aux-hold)',          // deep-cyan — sustained button
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'aux-double-click',
    displayName: 'Aux Double Click',
    colorVar: 'var(--mod-aux-double-click)',  // bright-cyan — double tap
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'gesture-twist',
    displayName: 'Gesture Twist',
    colorVar: 'var(--mod-gesture-twist)',     // violet-pink — rotation gesture
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'gesture-stab',
    displayName: 'Gesture Stab',
    colorVar: 'var(--mod-gesture-stab)',      // yellow — thrust gesture
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'gesture-swing',
    displayName: 'Gesture Swing',
    colorVar: 'var(--mod-gesture-swing)',     // sky-blue — IMU swing event
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'gesture-clash',
    displayName: 'Gesture Clash',
    colorVar: 'var(--mod-gesture-clash)',     // pearl — IMU clash gesture
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
  {
    id: 'gesture-shake',
    displayName: 'Gesture Shake',
    colorVar: 'var(--mod-gesture-shake)',     // orange — sustained shake
    range: [0, 1],
    unit: '',
    smoothing: 0,
    builtIn: true,
  },
];

/**
 * Per-frame decay coefficients for the 8 Wave 8 LITE event-driven
 * modulators (registry entries above). On a discrete event, the
 * modulator value latches to 1.0; on subsequent frames without the
 * event, it multiplies by the decay coefficient.
 *
 * The values here are tuned for a ~120 FPS visualizer and produce
 * "reads as a flash but settles within a beat" envelopes:
 *
 *   - `aux-click`           0.85  ≈ 50 ms half-life — punchy click
 *   - `aux-hold`            0.95  ≈ 165 ms half-life — sustained on
 *                                  release; feels like "still holding"
 *                                  for a beat after release
 *   - `aux-double-click`    0.80  ≈ 33 ms half-life — sharper than
 *                                  single click to read as different
 *   - `gesture-twist`       0.92  ≈ 100 ms — matches clash's feel
 *   - `gesture-stab`        0.88  ≈ 65 ms — quick punch
 *   - `gesture-swing`       0.93  ≈ 115 ms — slightly slower decay
 *                                  since swings already feel sustained
 *   - `gesture-clash`       0.90  ≈ 80 ms — between stab and twist
 *   - `gesture-shake`       0.95  ≈ 165 ms — slowest; shake is
 *                                  inherently sustained, decay should
 *                                  read as "still settling"
 *
 * If a future UX pass wants per-binding decay, that's a binding-level
 * extension; for v1.1 Core, registry-level defaults beat per-binding
 * customization on simplicity grounds.
 */
export const EVENT_MODULATOR_DECAY: Readonly<Record<string, number>> = {
  'aux-click': 0.85,
  'aux-hold': 0.95,
  'aux-double-click': 0.8,
  'gesture-twist': 0.92,
  'gesture-stab': 0.88,
  'gesture-swing': 0.93,
  'gesture-clash': 0.9,
  'gesture-shake': 0.95,
};

/**
 * The 8 Wave 8 LITE event-driven modulator IDs. Exported so the
 * sampler can iterate them in lock-step with `EVENT_MODULATOR_DECAY`
 * without reaching into the full `BUILT_IN_MODULATORS` array.
 *
 * Tightened to `readonly BuiltInModulatorId[]` once the union was
 * extended in the 2026-05-01 Wave 8 UI shell PR. Previously typed as
 * `readonly string[]` because the IDs lived under `ModulatorId`'s
 * custom-branch escape hatch — see `types.ts` history.
 */
export const EVENT_MODULATOR_IDS: readonly BuiltInModulatorId[] = [
  'aux-click',
  'aux-hold',
  'aux-double-click',
  'gesture-twist',
  'gesture-stab',
  'gesture-swing',
  'gesture-clash',
  'gesture-shake',
];

/**
 * O(1) lookup of a descriptor by its ID. Returns `undefined` for IDs
 * that aren't in the built-in set (custom user modulators come from
 * `ModulationPayload.customModulators` — the UI layer is responsible
 * for merging the tables when a binding references a non-built-in ID).
 */
const BUILT_IN_MODULATOR_MAP: ReadonlyMap<string, ModulatorDescriptor> = new Map(
  BUILT_IN_MODULATORS.map((descriptor) => [descriptor.id as string, descriptor]),
);

/**
 * Look up a built-in modulator descriptor by ID. Returns `undefined`
 * for unknown IDs — callers should treat missing IDs as evaluating to
 * `0` per design doc §4.4 ("Missing modulator IDs evaluate to `0`").
 */
export function lookupModulator(id: ModulatorId): ModulatorDescriptor | undefined {
  return BUILT_IN_MODULATOR_MAP.get(id as string);
}

/**
 * Type-guard helper for callers that need to narrow a user-typed ID
 * down to a built-in one. Kept alongside the registry so there is a
 * single source of truth for "is this ID known to the engine".
 *
 * Implementation is a registry-map lookup — every ID in the canonical
 * registry corresponds to a literal in the `BuiltInModulatorId` union
 * (post Wave 8 UI shell PR). A drift-sentinel test in
 * `registry.test.ts` asserts every Wave 8 LITE event ID returns `true`
 * here, catching any future drift between the union and registry.
 */
export function isBuiltInModulatorId(id: string): id is BuiltInModulatorId {
  return BUILT_IN_MODULATOR_MAP.has(id);
}
