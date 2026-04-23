// ─── Recipe 3: Angle-Reactive Tip ──────────────────────────────────────
//
// Wiring: `angle → emitterFlare` @ 50% (add)
//
// The `angle` modulator reports blade orientation in -1..1 (down..up).
// When the blade tilts upward, the emitter flare intensifies; tilted
// downward, the static emitter-flare value holds. Produces a
// "directional glow" — the blade brightens at the base when raised,
// dims when lowered, giving the user kinesthetic feedback in motion.
//
// Note: the user-guide stub (§2 row 5) describes this as "Tip-Bright-
// When-Up" with a `max(0, angle) → baseColor.r` wiring, which requires
// the v1.1 peggy parser + math expressions. The v1.0 bare-binding form
// doesn't have a `max(0, ...)` half-wave rectifier available — bindings
// are pure modulator → parameter routes. We use the full -1..1 angle
// range here; the `add` combinator + `applyBindings` clamp handle the
// downside (negative angles would pull emitterFlare below its 0 floor,
// which the clamp catches).
//
// Parameter substitution note: the task prompt suggested `emitterFlare`
// with a fallback to "a similar tip param if emitterFlare not in
// parameterGroups". `emitterFlare` IS in the registry (range 0..100,
// default 20, group 'other'). No substitution needed.
//
// Why `add` + 50%? amount 0.5 on a 0..100 scale yields ±50 delta.
// From the 20 default, full-up tips saturate at +50 → 70, full-down at
// -50 → clamp floor 0. Range feels alive without overpowering the
// static value.

import type { ModulationRecipe } from './types.js';

export const ANGLE_REACTIVE_TIP_RECIPE: ModulationRecipe = {
  id: 'recipe-angle-reactive-tip',
  name: 'Angle-Reactive Tip',
  description:
    'Tilt the blade up to brighten the emitter flare; tilt down and it ' +
    'dims. Directional glow that gives the user kinesthetic feedback ' +
    'in motion.',
  targetBoard: 'proffie-v3.9',
  version: 1,
  bindings: [
    {
      id: 'recipe-angle-binding-1',
      source: 'angle',
      expression: null,
      target: 'emitterFlare',
      combinator: 'add',
      amount: 0.5,
      label: 'Angle drives emitter flare',
      bypassed: false,
    },
  ],
};
