// ─── Modulation Recipes — Barrel + Registry ───────────────────────────
//
// Starter modulation recipes shipped with the Modulation Routing v1.x
// sprint per `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md` §3.1 and
// `docs/MODULATION_USER_GUIDE_OUTLINE.md` §2 ("Ten Recipes to Steal").
// Each recipe demonstrates a single routing pattern and seeds the
// Gallery as an importable starter preset.
//
// Sprint context:
//   - v1.0 shipped 5 bare-modulator-reference recipes (no math
//     expressions): reactive-shimmer, sound-reactive-music,
//     angle-reactive-tip, clash-flash-white, twist-drives-hue.
//   - v1.1 Core adds expression-based recipes (breathing, heartbeat,
//     battery-saver) plus 3 more bare-source recipes (idle-hue-drift,
//     sound-driven-hue, twist-driven-saturation).
//
// Adding a new recipe: create the file in this directory, import it
// below, add it to the `MODULATION_RECIPES` registry in display order
// (bare-source first, then expression-based). Tests in
// `packages/presets/tests/modulation/recipes.test.ts` will validate
// the parameter-path + modulator-ID + board-ID invariants.

export type {
  ModulationRecipe,
  SerializedBinding,
  RecipeModulatorId,
  RecipeBindingCombinator,
  RecipeExpressionNode,
  RecipeSerializedExpression,
  RecipeBuiltInFnId,
  RecipeBinaryOp,
  RecipeUnaryOp,
} from './types.js';

export { REACTIVE_SHIMMER_RECIPE } from './reactive-shimmer.js';
export { SOUND_REACTIVE_MUSIC_RECIPE } from './sound-reactive-music.js';
export { ANGLE_REACTIVE_TIP_RECIPE } from './angle-reactive-tip.js';
export { CLASH_FLASH_WHITE_RECIPE } from './clash-flash-white.js';
export { TWIST_DRIVES_HUE_RECIPE } from './twist-drives-hue.js';
export { IDLE_HUE_DRIFT_RECIPE } from './idle-hue-drift.js';
export { SOUND_DRIVEN_HUE_RECIPE } from './sound-driven-hue.js';
export { TWIST_DRIVEN_SATURATION_RECIPE } from './twist-driven-saturation.js';
export { BREATHING_BLADE_RECIPE } from './breathing-blade.js';
export { HEARTBEAT_PULSE_RECIPE } from './heartbeat-pulse.js';
export { BATTERY_SAVER_RECIPE } from './battery-saver.js';

import type { ModulationRecipe } from './types.js';
import { REACTIVE_SHIMMER_RECIPE } from './reactive-shimmer.js';
import { SOUND_REACTIVE_MUSIC_RECIPE } from './sound-reactive-music.js';
import { ANGLE_REACTIVE_TIP_RECIPE } from './angle-reactive-tip.js';
import { CLASH_FLASH_WHITE_RECIPE } from './clash-flash-white.js';
import { TWIST_DRIVES_HUE_RECIPE } from './twist-drives-hue.js';
import { IDLE_HUE_DRIFT_RECIPE } from './idle-hue-drift.js';
import { SOUND_DRIVEN_HUE_RECIPE } from './sound-driven-hue.js';
import { TWIST_DRIVEN_SATURATION_RECIPE } from './twist-driven-saturation.js';
import { BREATHING_BLADE_RECIPE } from './breathing-blade.js';
import { HEARTBEAT_PULSE_RECIPE } from './heartbeat-pulse.js';
import { BATTERY_SAVER_RECIPE } from './battery-saver.js';

/**
 * All starter modulation recipes in display order. Bare-source recipes
 * first, then expression-based recipes so new users see the
 * gesture-reactive cases before the formula-driven cases.
 *
 *  1-5  : v1.0 bare-source recipes (the original 5)
 *  6-8  : v1.1 bare-source recipes (idle-drift / sound-hue / twist-sat)
 *  9    : v1.1 breathing (sin LFO)
 *  10   : v1.1 heartbeat (abs(sin) full-wave-rectified LFO)
 *  11   : v1.1 battery-saver (clamp expression)
 */
export const MODULATION_RECIPES: readonly ModulationRecipe[] = Object.freeze([
  REACTIVE_SHIMMER_RECIPE,
  SOUND_REACTIVE_MUSIC_RECIPE,
  ANGLE_REACTIVE_TIP_RECIPE,
  CLASH_FLASH_WHITE_RECIPE,
  TWIST_DRIVES_HUE_RECIPE,
  IDLE_HUE_DRIFT_RECIPE,
  SOUND_DRIVEN_HUE_RECIPE,
  TWIST_DRIVEN_SATURATION_RECIPE,
  BREATHING_BLADE_RECIPE,
  HEARTBEAT_PULSE_RECIPE,
  BATTERY_SAVER_RECIPE,
]);
