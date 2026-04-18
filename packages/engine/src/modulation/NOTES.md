# `packages/engine/src/modulation/` — Scaffold Notes

**Status: DESIGN-SCOPED · NOT IMPLEMENTED.** Nothing in this directory
runs yet. The `BladeEngine` render pipeline does not call into this
module. It exists so the v1.1 implementation sprint has a pre-agreed
type surface and so bindings can start appearing in `BladeConfig`-
shaped test fixtures without waiting on the parser.

## What lives here

| File | Purpose | Ready for v1.1? |
|------|---------|-----------------|
| `types.ts` | Full type surface: `ModulatorDescriptor`, `ModulationBinding`, `ExpressionNode` AST, `EvalContext`, `ModulationPayload`, `SerializedBinding`. | ✅ Type contract locked |
| `index.ts` | Barrel re-export of the types. TODO stubs list the runtime modules to add. | ✅ Barrel shape locked |
| `NOTES.md` | This file. | ✅ |

## What does NOT live here yet (add in the v1.1 sprint)

| File | Contents |
|------|----------|
| `parser.ts` | PEG grammar compiled with `peggy` (see doc §4 for the recommendation). Exposes `parseExpression(source: string): ExpressionNode`. Throws `ExpressionParseError` on syntax failure. |
| `evaluator.ts` | Tree-walk interpreter over `ExpressionNode`. Exposes `evaluate(node: ExpressionNode, ctx: EvalContext): number` and `evaluateBinding(binding: ModulationBinding, staticValue: number, ctx: EvalContext): number` (applies the combinator + amount). |
| `registry.ts` | The hard-coded `BUILT_IN_MODULATORS: readonly ModulatorDescriptor[]` table plus `lookupModulator(id: ModulatorId)`. Smoothing coefficients and color-identity tokens live here. |
| `sampler.ts` | `sampleModulators(state, prev): ReadonlyMap<ModulatorId, number>` — pulls the raw values off `StyleContext` / `EffectContext`, applies one-pole smoothing, latches clash, returns the map that `EvalContext.modulators` wraps. |
| `applyBindings.ts` | The engine-side entry point called by `BladeEngine` each frame. Given a `BladeConfig` and an `EvalContext`, returns a new `BladeConfig` with binding-driven perturbations applied. Pure — no mutation. |
| `parser.test.ts` / `evaluator.test.ts` | Co-located vitest suites. Fuzz tests for round-trip `serialize → parse → ast-match`, property tests for the built-in functions. |

## Why no runtime code in v1.0

Three reasons:

1. **Nothing consumes it.** `BladeEngine` has no binding-resolution
   pass yet. Adding a no-op evaluator would just add code to delete
   later.
2. **The wire format is committed once.** Once we write the parser
   and ship a real `SerializedBinding` on a user's glyph, we have to
   round-trip it forever — see `docs/KYBER_CRYSTAL_VERSIONING.md` §1
   Contract A. Leaving v1.1 is the point at which we commit. This
   scaffold doesn't ship any glyph-visible bytes.
3. **The UI is the hard part.** Drag-to-route wires on Vital's
   preview surfaces, the LayerStack plate pattern from Bitwig, the
   Expression-field-as-modulation-sink from TouchDesigner — all three
   are separate design problems that the engine types don't unblock.
   Shipping the engine types now lets the UI sprint start designing
   against a frozen contract.

## Contract guarantees for v1.1 consumers

- The types in `types.ts` are the binding contract. Adding new fields
  to any interface is allowed **only** as optional fields with
  backwards-compatible defaults. Removing or retyping fields requires
  bumping `ModulationPayload.version` to `2`.
- `BuiltInModulatorId` is the only ID alphabet guaranteed stable in
  v1.1. Any extension (e.g. accelerometer axes, beat-detector output)
  adds new IDs; existing IDs never change semantics.
- The `ExpressionNode` union is exhaustive as of the scaffold date.
  Any new node kind (e.g. `if` / ternary / array-subscript) is a
  minor-version bump in the expression grammar and is documented in
  `docs/MODULATION_ROUTING_V1.1.md` §4 before landing.

## Where to go next

The companion doc is the single source of truth:
[`docs/MODULATION_ROUTING_V1.1.md`](../../../docs/MODULATION_ROUTING_V1.1.md)
(see §4 for grammar, §5 for wire format, §6 for the evaluation-order
rules, §7 for the Kyber Glyph v2 migration strategy).
