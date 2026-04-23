// ─── Recipe 5: Twist-Drives-Hue ────────────────────────────────────────
//
// Wiring: `twist → colorHueShiftSpeed` @ 100% (add)
//
// Wrist-rotation drives the hue-shift speed. Twist the hilt and the
// blade's color cycles; hold steady and it returns to its static hue.
// This is the v1.0 realization of row 7 in the user-guide's ten-recipe
// table — a canonical "wrist control" pattern.
//
// Parameter path verification: `colorHueShiftSpeed` is in
// `apps/web/lib/parameterGroups.ts` (range 0..100, default 0,
// group 'color'). No substitution needed.
//
// Why `add` + 100%? The `twist` modulator is -1..1 (smoothed 0.2 in the
// engine sampler). colorHueShiftSpeed is 0..100 with a 0 default. amount
// 1.0 produces a ±100 delta on full-twist, which the clamp bounds to
// [0, 100] — negative twists pin to the floor 0 (no hue shift), positive
// twists saturate at 100 (max shift speed). User gets a "twist-to-cycle,
// hold-to-settle" interaction. Signed combinators like multiply/replace
// aren't needed for this recipe.

import type { ModulationRecipe } from './types.js';

export const TWIST_DRIVES_HUE_RECIPE: ModulationRecipe = {
  id: 'recipe-twist-drives-hue',
  name: 'Twist-Drives-Hue',
  description:
    'Twist the hilt to cycle the blade\'s hue. Hold steady and the color ' +
    'holds. Wrist-control wizardry for anyone who wants color-shifting ' +
    'without reaching for a button.',
  targetBoard: 'proffie-v3.9',
  version: 1,
  bindings: [
    {
      id: 'recipe-twist-binding-1',
      source: 'twist',
      expression: null,
      target: 'colorHueShiftSpeed',
      combinator: 'add',
      amount: 1.0,
      label: 'Twist drives hue shift',
      bypassed: false,
    },
  ],
};
