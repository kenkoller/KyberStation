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
 */
export function isBuiltInModulatorId(id: string): id is BuiltInModulatorId {
  return BUILT_IN_MODULATOR_MAP.has(id);
}
