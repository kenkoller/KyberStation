// ─── Recipe 1: Reactive Shimmer ────────────────────────────────────────
//
// Wiring: `swing → shimmer` @ 60% (add)
//
// The canonical "first wire" — referenced directly from the 60-second
// quick-start in `docs/MODULATION_USER_GUIDE_OUTLINE.md` §1. Swinging
// the blade increases shimmer from the static 0.1 baseline, producing
// a kinetic "the blade responds to motion" feel that sells the whole
// modulation-routing system in a single gesture.
//
// Why `add` + 60%? Static shimmer of 0.1 stays barely-visible during
// idle; add-combinator + amount 0.6 maps a full-speed swing (1.0) to
// an additional +0.6 on top, landing at ~0.7 peak shimmer — energetic
// but not blinding. Pure `replace` would erase the idle baseline.

import type { ModulationRecipe } from './types.js';

export const REACTIVE_SHIMMER_RECIPE: ModulationRecipe = {
  id: 'recipe-reactive-shimmer',
  name: 'Reactive Shimmer',
  description:
    'Swing the blade to brighten the shimmer. The canonical first wire — ' +
    'the foundation of gesture-reactive modulation. Start here.',
  targetBoard: 'proffie-v3.9',
  version: 1,
  bindings: [
    {
      id: 'recipe-shimmer-binding-1',
      source: 'swing',
      expression: null,
      target: 'shimmer',
      combinator: 'add',
      amount: 0.6,
      label: 'Swing adds shimmer',
      bypassed: false,
    },
  ],
};
