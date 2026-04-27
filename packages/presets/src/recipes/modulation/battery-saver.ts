// ─── Recipe 8: Battery Saver (v1.1 expression-based) ──────────────────
//
// Wiring: `clamp(1 - battery, 0, 0.5) → shimmer` @ 100% (replace)
//
// Power-saver mode — the blade dims as the battery drops. The
// `battery` modulator is 0..1 (1 = full charge, 0 = empty). `1 -
// battery` flips that to "drainage" (0 at full, 1 at empty). The
// `clamp(..., 0, 0.5)` cap ensures even a fully-dead pack still leaves
// a visible glow — the blade dims, but never goes black.
//
// Target swap: the user-guide stub (§2 row 4) calls for `→ brightness`,
// which is not a discrete numeric leaf in `BladeConfig`. We target
// `shimmer` (range 0..1, the closest brightness-shaped scalar) — same
// target used by the Heartbeat Pulse and Breathing Blade recipes for
// the same reason. Documented here so the description is honest about
// the substitution.
//
// Why this is useful in practice: ProffieOS already dims the blade
// itself when the battery sags (BatteryLevel<>) but that's a built-in
// behavior tied to the firmware's internal scaling. This recipe exposes
// the dimming as a user-routable modulation — the user can rewire the
// same `clamp(1 - battery, 0, 0.5)` envelope onto any other parameter
// (slow `colorHueShiftSpeed` as battery dies, mute `clashIntensity`,
// etc.) with a single expression-edit in the BindingList.
//
// `replace` (not `add`) so the battery envelope IS the shimmer value
// at low battery; an `add` would still be visible but wouldn't actually
// dim the blade — the static shimmer baseline would just rise.
//
// AST is hand-built (same .npmrc constraint as Breathing Blade):
//   call clamp(binary - (literal 1, var battery), literal 0, literal 0.5)

import type {
  ModulationRecipe,
  RecipeExpressionNode,
} from './types.js';

const BATTERY_SAVER_SOURCE = 'clamp(1 - battery, 0, 0.5)';
const BATTERY_SAVER_AST: RecipeExpressionNode = {
  kind: 'call',
  fn: 'clamp',
  args: [
    {
      kind: 'binary',
      op: '-',
      lhs: { kind: 'literal', value: 1 },
      rhs: { kind: 'var', id: 'battery' },
    },
    { kind: 'literal', value: 0 },
    { kind: 'literal', value: 0.5 },
  ],
};

export const BATTERY_SAVER_RECIPE: ModulationRecipe = {
  id: 'recipe-battery-saver',
  name: 'Battery Saver',
  description:
    'Power-saver mode — blade dims as the battery drops. Targets shimmer ' +
    '(the closest 0..1 brightness-shaped scalar in the registry). ' +
    'Showcases the clamp() expression and the battery modulator.',
  targetBoard: 'proffie-v3.9',
  version: 1,
  bindings: [
    {
      id: 'recipe-battery-saver-binding-1',
      source: null,
      expression: {
        source: BATTERY_SAVER_SOURCE,
        ast: BATTERY_SAVER_AST,
      },
      target: 'shimmer',
      combinator: 'replace',
      amount: 1.0,
      label: 'fx: battery dims shimmer',
      bypassed: false,
    },
  ],
};
