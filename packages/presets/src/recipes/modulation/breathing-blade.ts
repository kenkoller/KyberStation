// ─── Recipe 6: Breathing Blade (v1.1 expression-based) ──────────────
//
// Wiring: `sin(time * 0.001) * 0.5 + 0.5 → shimmer` @ 100% (replace)
//
// The first expression-based recipe. Introduces math-formula routing —
// the same ExpressionEditor the user discovers via the "fx" button on
// any slider. `time` is the engine's ms-elapsed modulator; the sine
// wave period of ~6.28s (2π / 0.001) gives a slow idle breath, and the
// `* 0.5 + 0.5` reshapes sin's [-1, 1] output to [0, 1] — ready to drop
// into the shimmer parameter's native range.
//
// Uses `replace` combinator (not `add`) so the breathing envelope is
// the shimmer value — not an additive overlay on the static baseline.
// Users wanting to preserve idle-shimmer should switch to `add` and
// reduce amount via the binding row.
//
// The ProffieOS emitter's sin-breathing heuristic (mapBindings.ts) will
// recognize this exact shape and emit `Sin<Int<6283>>` — so the flashed
// blade breathes live on hardware too, not just a snapshot value.

import type {
  ModulationRecipe,
  RecipeExpressionNode,
} from './types.js';

// Expression AST is hand-built here instead of calling parseExpression
// from @kyberstation/engine: the monorepo's .npmrc (node-linker=hoisted +
// symlink=false) prevents packages/presets from importing the engine at
// build time. The drift risk is low — this specific breathing idiom is
// the canonical example that `mapBindings.matchSinBreathingEnvelope`
// also recognizes; a future parser-aware build step could replace the
// literal with a runtime parseExpression call.
//
// Source: sin(time * 0.001) * 0.5 + 0.5
//   ((sin((time * 0.001)) * 0.5) + 0.5)
const BREATHING_SOURCE = 'sin(time * 0.001) * 0.5 + 0.5';
const BREATHING_AST: RecipeExpressionNode = {
  kind: 'binary',
  op: '+',
  lhs: {
    kind: 'binary',
    op: '*',
    lhs: {
      kind: 'call',
      fn: 'sin',
      args: [
        {
          kind: 'binary',
          op: '*',
          lhs: { kind: 'var', id: 'time' },
          rhs: { kind: 'literal', value: 0.001 },
        },
      ],
    },
    rhs: { kind: 'literal', value: 0.5 },
  },
  rhs: { kind: 'literal', value: 0.5 },
};

export const BREATHING_BLADE_RECIPE: ModulationRecipe = {
  id: 'recipe-breathing-blade',
  name: 'Breathing Blade',
  description:
    '6-second breath cycle on shimmer. First expression-based recipe — ' +
    'showcases the math-formula UI and the sin(time) LFO pattern.',
  targetBoard: 'proffie-v3.9',
  version: 1,
  bindings: [
    {
      id: 'recipe-breathing-binding-1',
      source: null,
      expression: {
        source: BREATHING_SOURCE,
        ast: BREATHING_AST,
      },
      target: 'shimmer',
      combinator: 'replace',
      amount: 1.0,
      label: 'fx: breathing shimmer',
      bypassed: false,
    },
  ],
};
