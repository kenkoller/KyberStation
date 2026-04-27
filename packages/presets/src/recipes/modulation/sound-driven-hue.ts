// ─── Recipe 10: Sound-Driven Hue ───────────────────────────────────────
//
// Wiring: `sound → colorHueShiftSpeed` @ 80% (add)
//
// Speak / sing / play music into the mic — the blade's hue cycles with
// the audio level. Sound RMS envelope (engine-supplied 0..1, smoothed
// 0.5 by the sampler) drives `colorHueShiftSpeed` with `add` + 80%, so
// loud peaks send hue cycling fast while silence holds the static hue.
//
// Companion to Sound-Reactive Music Saber (recipe 2) — that recipe
// pushes sound onto the blue channel, this one pushes it onto hue
// rotation. Stack them for a "louder = bluer + faster-cycling" effect,
// or use one or the other for clearer cause-and-effect.
//
// Parameter path verification: `colorHueShiftSpeed` is in
// `apps/web/lib/parameterGroups.ts` (range 0..100, default 0,
// group 'color'). amount 0.8 yields up to +80 on the 0..100 scale on
// loud peaks — fast cycle without quite saturating, leaving headroom
// for layering with Idle Hue Drift's +30 baseline drift.
//
// Why `add` at 80% (not `replace` at 100%): the user might already
// have a static colorHueShiftSpeed dialed in for ambient cycling; we
// want sound to ADD to that, not replace it. Same convention as the
// Twist-Drives-Hue recipe.
//
// Demo use: livestream backdrop saber, music-visualizer cosplay, bench
// sandbox to confirm mic input is actually plumbed before flashing.

import type { ModulationRecipe } from './types.js';

export const SOUND_DRIVEN_HUE_RECIPE: ModulationRecipe = {
  id: 'recipe-sound-driven-hue',
  name: 'Sound-Driven Hue',
  description:
    'Speak, sing, or play music — blade hue cycles with audio level. ' +
    'Companion to Sound-Reactive Music Saber: same modulator, different ' +
    'parameter. Stack them for a layered "louder = bluer + faster-cycling".',
  targetBoard: 'proffie-v3.9',
  version: 1,
  bindings: [
    {
      id: 'recipe-sound-driven-hue-binding-1',
      source: 'sound',
      expression: null,
      target: 'colorHueShiftSpeed',
      combinator: 'add',
      amount: 0.8,
      label: 'Sound cycles hue',
      bypassed: false,
    },
  ],
};
