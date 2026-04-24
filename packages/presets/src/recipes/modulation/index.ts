// ─── Modulation Recipes — Barrel + Registry ───────────────────────────
//
// Five starter modulation recipes shipped with the Friday v1.0 "Routing
// Preview" BETA per `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md` §3.1.
// Each recipe demonstrates a single routing pattern and seeds the
// Gallery as an importable starter preset.
//
// Sprint context:
//   - v1.0 ships these 5 bare-modulator-reference recipes (no math
//     expressions). The remaining 5 from the "Ten Recipes to Steal"
//     list (`docs/MODULATION_USER_GUIDE_OUTLINE.md` §2) require the
//     peggy-parsed math-expression evaluator and land in v1.1+.
//
// Adding a new v1.0 recipe: create the file in this directory, import
// it below, add it to the `MODULATION_RECIPES` registry. Tests in
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
export { BREATHING_BLADE_RECIPE } from './breathing-blade.js';

import type { ModulationRecipe } from './types.js';
import { REACTIVE_SHIMMER_RECIPE } from './reactive-shimmer.js';
import { SOUND_REACTIVE_MUSIC_RECIPE } from './sound-reactive-music.js';
import { ANGLE_REACTIVE_TIP_RECIPE } from './angle-reactive-tip.js';
import { CLASH_FLASH_WHITE_RECIPE } from './clash-flash-white.js';
import { TWIST_DRIVES_HUE_RECIPE } from './twist-drives-hue.js';
import { BREATHING_BLADE_RECIPE } from './breathing-blade.js';

/**
 * All starter modulation recipes in display order. Simpler bare-source
 * recipes first, then the expression-based v1.1 recipe so new users see
 * the gesture-reactive case before the formula-driven case.
 *
 *  1-5: v1.0 bare-source recipes (expression: null)
 *  6+ : v1.1 expression-based recipes (source: null, expression set)
 */
export const MODULATION_RECIPES: readonly ModulationRecipe[] = Object.freeze([
  REACTIVE_SHIMMER_RECIPE,
  SOUND_REACTIVE_MUSIC_RECIPE,
  ANGLE_REACTIVE_TIP_RECIPE,
  CLASH_FLASH_WHITE_RECIPE,
  TWIST_DRIVES_HUE_RECIPE,
  BREATHING_BLADE_RECIPE,
]);
