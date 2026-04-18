// ─── Modulation Routing — v1.1 scaffold ───
//
// Type-only re-exports for now. The parser, evaluator, and
// binding resolver arrive in the v1.1 implementation sprint — see
// `docs/MODULATION_ROUTING_V1.1.md` for the design and
// `./NOTES.md` for what is / isn't in this scaffold.
//
// Status: DESIGN-SCOPED · NOT IMPLEMENTED

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

// TODO(v1.1): export the parser
// export { parseExpression } from './parser.js';
//
// TODO(v1.1): export the evaluator
// export { evaluate, evaluateBinding } from './evaluator.js';
//
// TODO(v1.1): export the built-in modulator registry
// export { BUILT_IN_MODULATORS, lookupModulator } from './registry.js';
//
// TODO(v1.1): export the per-frame sampler that feeds EvalContext.modulators
// export { sampleModulators } from './sampler.js';
//
// TODO(v1.1): export the binding-apply step used by BladeEngine
// export { applyBindings } from './applyBindings.js';
