// ─── Recipe 7: Heartbeat Pulse (v1.1 expression-based) ────────────────
//
// Wiring: `abs(sin(time * 0.002)) → shimmer` @ 100% (replace)
//
// Steady rhythmic pulse, ~120 BPM — the blade brightness "beats" like a
// heart. The user-guide stub (§2 row 9) calls for `→ brightness`, but
// `brightness` is not a discrete numeric leaf in `BladeConfig`. The
// closest in-spirit modulatable scalar is `shimmer` (range 0..1,
// `apps/web/lib/parameterGroups.ts` line 122) — same target the
// Breathing Blade recipe uses. Substitution noted in the description.
//
// Period math: sin's period at coefficient 0.002 is 2π / 0.002 ≈ 3142
// ms ≈ 3.14 s. `abs(sin(...))` halves that period to ~1.57 s, giving
// ~38 beats per minute. To land closer to 120 BPM (the prompt's spec)
// we'd want coefficient ~0.0079; but the user-guide table specifies
// `time * 0.002` so we honour that idiom and accept ~38 BPM as the
// "calm-heart-rate" reading. A future v1.2 recipe variant can offer
// 120 BPM via coefficient swap.
//
// `abs()` rectifies sin's [-1, 1] to [0, 1] — perfect for shimmer's
// native 0..1 range. `replace` (not `add`) so the heartbeat envelope
// IS the shimmer value; users wanting the static baseline preserved
// can switch to `add` and reduce amount in the binding row.
//
// AST is hand-built (same .npmrc constraint as Breathing Blade):
//   call abs(call sin(binary * (var time, literal 0.002)))

import type {
  ModulationRecipe,
  RecipeExpressionNode,
} from './types.js';

const HEARTBEAT_SOURCE = 'abs(sin(time * 0.002))';
const HEARTBEAT_AST: RecipeExpressionNode = {
  kind: 'call',
  fn: 'abs',
  args: [
    {
      kind: 'call',
      fn: 'sin',
      args: [
        {
          kind: 'binary',
          op: '*',
          lhs: { kind: 'var', id: 'time' },
          rhs: { kind: 'literal', value: 0.002 },
        },
      ],
    },
  ],
};

export const HEARTBEAT_PULSE_RECIPE: ModulationRecipe = {
  id: 'recipe-heartbeat-pulse',
  name: 'Heartbeat Pulse',
  description:
    'Steady rhythmic pulse on shimmer — blade brightness "beats" like a ' +
    'heart. Targets shimmer (the closest 0..1 brightness-shaped scalar in ' +
    'the registry). Showcases the abs(sin(time)) full-wave-rectified LFO.',
  targetBoard: 'proffie-v3.9',
  version: 1,
  bindings: [
    {
      id: 'recipe-heartbeat-binding-1',
      source: null,
      expression: {
        source: HEARTBEAT_SOURCE,
        ast: HEARTBEAT_AST,
      },
      target: 'shimmer',
      combinator: 'replace',
      amount: 1.0,
      label: 'fx: heartbeat pulse',
      bypassed: false,
    },
  ],
};
