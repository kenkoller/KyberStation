// ─── Modulation Routing — v1.1 / Friday v1.0 Preview ───
//
// Public barrel for the modulation subsystem. Types live in
// `./types.ts` (contract locked). Runtime helpers for the Friday v1.0
// Preview — registry, sampler, applyBindings — are exported here.
//
// Status (2026-04-22): Friday v1.0 Preview — engine-side binding
// application is wired, math-expression parser + evaluator arrive in
// v1.1. See `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md` §4 Agent A.

// ── Types (contract-locked) ─────────────────────────────────────────
export type {
  BuiltInModulatorId,
  ModulatorId,
  ModulatorDescriptor,
  ParameterPath,
  BindingCombinator,
  ModulationBinding,
  NumericLiteralNode,
  VariableRefNode,
  BinaryOp,
  BinaryOpNode,
  UnaryOp,
  UnaryOpNode,
  BuiltInFnId,
  CallNode,
  ExpressionNode,
  EvalContext,
  SerializedExpression,
  SerializedBinding,
  ModulationPayload,
  BladeConfigWithModulation,
} from './types.js';

// ── Registry ────────────────────────────────────────────────────────
export {
  BUILT_IN_MODULATORS,
  lookupModulator,
  isBuiltInModulatorId,
} from './registry.js';

// ── Sampler ─────────────────────────────────────────────────────────
export type { SamplerState } from './sampler.js';
export { sampleModulators, emptySamplerState } from './sampler.js';

// ── Binding application ─────────────────────────────────────────────
export type {
  ParameterClampRange,
  ParameterClampRanges,
} from './applyBindings.js';
export { applyBindings } from './applyBindings.js';

// ── Math-expression parser + evaluator (v1.1) ───────────────────────
//
// Peggy-based parser + pure tree-walk evaluator for the math-expression
// mini-language specced in `docs/MODULATION_ROUTING_V1.1.md` §4.
export { parseExpression, ExpressionParseError } from './parser.js';
export { evaluate } from './evaluator.js';
