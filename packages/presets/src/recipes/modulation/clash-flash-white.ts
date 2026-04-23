// ─── Recipe 4: Clash-Flash White ───────────────────────────────────────
//
// Wiring: three bindings — `clash → baseColor.r @ 100% add`
//                          `clash → baseColor.g @ 100% add`
//                          `clash → baseColor.b @ 100% add`
//
// Three parallel bindings flash every RGB channel toward 255 during a
// clash event, producing a sharp white overexposure that settles back
// to the static base color as the clash modulator decays. This is the
// v1.0 bare-binding approximation of the v1.1 user-guide recipe
// `clash → lerp(baseColor, white, clash)` (§2 row 8).
//
// The `clash` modulator is latched by the sampler with a decay curve
// (design doc §3.1) — the binding sees a 0→1 spike on impact and then
// a smooth decay back to 0, so the flash has a natural falloff without
// needing an envelope follower.
//
// Why amount 1.0 on each channel? Channels are 0..255. amount 1.0 with
// `add` on clash peak (1.0) adds +255 to each channel — the `applyBindings`
// clamp then pins every channel to 255 at peak, producing pure white.
// As clash decays, each channel contribution proportionally shrinks,
// so the flash feels smooth rather than truncated.
//
// This is the first recipe that ships with 3 bindings — demonstrates
// that the v1.0 binding cap (soft warning at 50 per board profile)
// handles multi-binding recipes naturally.

import type { ModulationRecipe } from './types.js';

export const CLASH_FLASH_WHITE_RECIPE: ModulationRecipe = {
  id: 'recipe-clash-flash-white',
  name: 'Clash-Flash White',
  description:
    'Every clash produces a crisp white overexposure flash that fades back ' +
    'to base color. Three parallel RGB bindings approximate a true ' +
    'lerp-to-white — the v1.1 expression form will make this one wire.',
  targetBoard: 'proffie-v3.9',
  version: 1,
  bindings: [
    {
      id: 'recipe-clash-binding-r',
      source: 'clash',
      expression: null,
      target: 'baseColor.r',
      combinator: 'add',
      amount: 1.0,
      label: 'Clash flashes red channel',
      bypassed: false,
    },
    {
      id: 'recipe-clash-binding-g',
      source: 'clash',
      expression: null,
      target: 'baseColor.g',
      combinator: 'add',
      amount: 1.0,
      label: 'Clash flashes green channel',
      bypassed: false,
    },
    {
      id: 'recipe-clash-binding-b',
      source: 'clash',
      expression: null,
      target: 'baseColor.b',
      combinator: 'add',
      amount: 1.0,
      label: 'Clash flashes blue channel',
      bypassed: false,
    },
  ],
};
