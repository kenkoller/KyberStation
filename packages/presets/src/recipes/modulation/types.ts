// ─── Modulation Recipes — Type Definitions ─────────────────────────────
//
// Shipped with the Friday v1.0 "Routing Preview" BETA per
// `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md` §3.1 and
// `docs/MODULATION_USER_GUIDE_OUTLINE.md` §2 ("Ten Recipes to Steal" —
// v1.0 ships the first five simpler recipes; the remaining five require
// peggy-parsed math expressions and land in v1.1+).
//
// A `ModulationRecipe` is a portable, importable demo preset that
// demonstrates a single modulation-routing pattern. Recipes are loaded
// into the Gallery as starter presets and serve as the in-app curriculum
// for the 5 demo-recipes deliverable.
//
// ── Engine type mirror ─────────────────────────────────────────────────
//
// The engine's `SerializedBinding` / `ModulatorId` / `BindingCombinator`
// live under `packages/engine/src/modulation/types.ts`, which the
// engine's package export (`@kyberstation/engine`) does NOT re-export at
// the barrel. We follow the `boardProfiles.ts` mirror pattern here:
// mirror the minimum shape required, and rely on a drift-sentinel test
// to flag divergence.
//
// Status: v1.0 launch registry. Author: Agent D (modulation routing
// sprint, 2026-04-22).

export type RecipeModulatorId =
  | 'swing'
  | 'angle'
  | 'twist'
  | 'sound'
  | 'battery'
  | 'time'
  | 'clash'
  | 'lockup'
  | 'preon'
  | 'ignition'
  | 'retraction';

export type RecipeBindingCombinator =
  | 'replace'
  | 'add'
  | 'multiply'
  | 'min'
  | 'max';

/**
 * Serialized form of a modulation binding, mirroring the engine's
 * `SerializedBinding` interface. Kept `readonly` at every level so the
 * recipe constants can be frozen at module load without exposing
 * write access.
 *
 * v1.0 recipes use the bare-modulator-reference form (`source` set,
 * `expression` null). Math-expression recipes arrive in v1.1.
 */
export interface SerializedBinding {
  readonly id: string;
  readonly source: RecipeModulatorId | null;
  readonly expression: null;
  readonly target: string;
  readonly combinator: RecipeBindingCombinator;
  readonly amount: number;
  readonly label?: string;
  readonly colorVar?: string;
  readonly bypassed?: boolean;
}

/**
 * A single modulation-routing recipe. Recipes ship pre-wired and can be
 * imported into the Gallery as starter presets.
 *
 * Conventions:
 *  - `id` is a stable string slug, matching `recipe-<kebab-slug>`.
 *  - `targetBoard` defaults to `'proffie-v3.9'` — the hardware-validated
 *    board. Other board IDs must reference a board in
 *    `apps/web/lib/boardProfiles.ts::BOARD_PROFILES`.
 *  - `bindings` are a `readonly SerializedBinding[]` so recipes stay
 *    immutable at the module level.
 *  - `seedPresetId`, when set, references an existing preset in
 *    `ALL_PRESETS` (a base config to spread on top of before applying
 *    bindings). When unset, the recipe starts from the store default.
 *  - `version: 1` mirrors the `ModulationPayload.version` contract in
 *    the engine — bumps here must be coordinated with the engine-side
 *    payload version.
 */
export interface ModulationRecipe {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly targetBoard: string;
  readonly bindings: readonly SerializedBinding[];
  readonly seedPresetId?: string;
  readonly version: 1;
}
