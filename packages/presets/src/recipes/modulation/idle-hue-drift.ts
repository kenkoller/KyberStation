// ─── Recipe 9: Idle Hue Drift ──────────────────────────────────────────
//
// Wiring: `time → colorHueShiftSpeed` @ 30% (add)
//
// Slow color drift on idle — subtle ambient hue rotation. Plain
// `time` modulator (engine-supplied 0..1 wrapped seconds) layered onto
// the static `colorHueShiftSpeed` value with `add` + 30% so the static
// hue-shift speed always wins as the baseline; `time` provides a gentle
// LFO-style nudge on top.
//
// User-guide table row 10 describes a richer "slow time-LFO when
// `swing < 0.1`" — the idle gate (swing-magnitude conditional) needs
// the v1.2 conditional-binding subsystem. The v1.1 bare-source form
// approximates the intent: `time` always advances, but with `add` at
// only 30% the contribution is subtle enough to pass for "ambient
// drift" rather than active animation. A v1.2 follow-up can wire the
// proper swing-gated conditional.
//
// Parameter path verification: `colorHueShiftSpeed` is in
// `apps/web/lib/parameterGroups.ts` (range 0..100, default 0,
// group 'color'). amount 0.3 yields up to +30 on the 0..100 scale —
// noticeable but not dominant.
//
// Pairs nicely with Reactive Shimmer or Twist-Drives-Hue layered on
// top for a "always-drifting, more-active-on-input" feel.

import type { ModulationRecipe } from './types.js';

export const IDLE_HUE_DRIFT_RECIPE: ModulationRecipe = {
  id: 'recipe-idle-hue-drift',
  name: 'Idle Hue Drift',
  description:
    'Subtle ambient hue rotation driven by elapsed time. Layer with other ' +
    'recipes for "always-drifting, more-active-on-input" behavior. The ' +
    'gentle background LFO every saber wants.',
  targetBoard: 'proffie-v3.9',
  version: 1,
  bindings: [
    {
      id: 'recipe-idle-hue-drift-binding-1',
      source: 'time',
      expression: null,
      target: 'colorHueShiftSpeed',
      combinator: 'add',
      amount: 0.3,
      label: 'Time drifts hue',
      bypassed: false,
    },
  ],
};
