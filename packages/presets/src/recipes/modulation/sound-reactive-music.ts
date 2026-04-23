// ─── Recipe 2: Sound-Reactive Music Saber ──────────────────────────────
//
// Wiring: `sound → baseColor.b` @ 80% (add)
//
// Audio RMS envelope drives the blue channel of the base color. At
// quiet moments the blade settles to its static hue; loud moments
// push the blue channel up to saturate toward a cooler / more
// spectrum-shifted tone. Pairs well with base colors that already
// have a blue component (cyan Jedi blades, white/silver) — with a
// pure red base the effect reads as a red→magenta shift; with a
// blue-heavy base it reads as a brightness pulse.
//
// Why `add` + 80%? Sound envelope is 0..1 (smoothed 0.5 in the engine
// sampler). amount 0.8 on a 255-scale channel gives +204 peak, which
// saturates against a 0-baseline blue channel on full-volume beats
// but only lightly perturbs an already-255 channel. The clamp inside
// `applyBindings` keeps the channel ≤ 255.
//
// Demo use: music-visualizer displays at cons, streaming setups.

import type { ModulationRecipe } from './types.js';

export const SOUND_REACTIVE_MUSIC_RECIPE: ModulationRecipe = {
  id: 'recipe-sound-reactive-music',
  name: 'Sound-Reactive Music Saber',
  description:
    'Ambient audio drives the blue channel of the blade color. Speak, sing, ' +
    'or play music — the blade pulses with the room. Perfect for displays ' +
    'and livestreams.',
  targetBoard: 'proffie-v3.9',
  version: 1,
  bindings: [
    {
      id: 'recipe-sound-binding-1',
      source: 'sound',
      expression: null,
      target: 'baseColor.b',
      combinator: 'add',
      amount: 0.8,
      label: 'Sound drives blue',
      bypassed: false,
    },
  ],
};
