// ─── ProffieOS Emitter — public surface ───
//
// This subpackage hosts the modulation-binding → ProffieOS template
// mapping layer (Option B+ per docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md
// §2 decision 1). v1.0 Routing Preview exposes `mapBindings`; a later
// sprint will add composers that graft the returned sub-ASTs into the
// main style tree.

export {
  mapBindings,
  computeSnapshotValue,
  MAP_BINDINGS_REASONS,
} from './mapBindings.js';

export {
  applyModulationSnapshot,
  formatSnapshotCommentBlock,
} from './applyModulationSnapshot.js';
export type {
  ModulationPayloadLike,
  ModulationSnapshotReport,
  AppliedBinding,
  SkippedBinding,
  ApplySnapshotOptions,
} from './applyModulationSnapshot.js';
export type {
  MapBindingsResult,
  MappedBinding,
  UnmappableBinding,
  ModulationBinding,
  BindingCombinator,
  BuiltInModulatorId,
  ModulatorId,
  ExpressionNode,
  ParameterPath,
  EvalContext,
  BladeConfig,
  RGB,
  BinaryOp,
  UnaryOp,
  BuiltInFnId,
} from './mapBindings.js';
