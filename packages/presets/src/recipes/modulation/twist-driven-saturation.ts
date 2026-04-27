// ─── Recipe 11: Twist-Driven Saturation ───────────────────────────────
//
// Wiring: `twist → colorSaturationPulse` @ 100% (multiply)
//
// Wrist-twist drives color vibrancy — blade is fully saturated when
// twisted hard, washed out at neutral. The `twist` modulator is
// -1..1 (smoothed 0.2 by the sampler); `multiply` combinator scales
// the static `colorSaturationPulse` value by the twist envelope, so
// at zero-twist the parameter is multiplied by 0 (washed-out / neutral)
// and at full-twist it's multiplied by ±1 (full saturation pulse).
//
// Companion to Twist-Drives-Hue (recipe 5): twist controls hue speed
// there, saturation here. Run them simultaneously for the full
// "wrist-rotation drives color personality" pattern: twist to start
// the hue cycle AND ramp up saturation; settle to hold a steady hue
// at low saturation.
//
// Parameter path verification: `colorSaturationPulse` is in
// `apps/web/lib/parameterGroups.ts` (range 0..100, default 0,
// group 'color').
//
// Why `multiply` (not `add`): saturation pulse is conceptually a
// "scale by current twist" envelope, not an additive offset. With
// `add`, full-counter-twist would pull saturation below 0 (clamped),
// producing the same visual as zero-twist. `multiply` gives a true
// bipolar "twist either direction = vibrant, neutral = washed-out"
// reading. Note that the engine's `applyBindings` clamp catches the
// negative-twist case to 0, so visually the curve is symmetric around
// neutral.
//
// Why amount 1.0: `multiply` with amount 1.0 is the "full effect"
// case — the binding contribution exactly equals the modulator's
// envelope. Lower amounts soften the effect while still scaling
// against twist.

import type { ModulationRecipe } from './types.js';

export const TWIST_DRIVEN_SATURATION_RECIPE: ModulationRecipe = {
  id: 'recipe-twist-driven-saturation',
  name: 'Twist-Driven Saturation',
  description:
    'Wrist twist drives color vibrancy — fully saturated when twisted hard, ' +
    'washed-out at neutral. Companion to Twist-Drives-Hue: stack them for ' +
    'full wrist-rotation color control.',
  targetBoard: 'proffie-v3.9',
  version: 1,
  bindings: [
    {
      id: 'recipe-twist-driven-saturation-binding-1',
      source: 'twist',
      expression: null,
      target: 'colorSaturationPulse',
      combinator: 'multiply',
      amount: 1.0,
      label: 'Twist scales saturation',
      bypassed: false,
    },
  ],
};
