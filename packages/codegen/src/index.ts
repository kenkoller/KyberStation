// ─── ProffieOS Code Generator ───
// Public API for the codegen package.

export type {
  StyleNode,
  StyleNodeType,
  ColorNode,
  IntNode,
  TemplateNode,
  TransitionNode,
  FunctionNode,
  WrapperNode,
  MixNode,
  RawNode,
  EmitOptions,
  ValidationError,
  ValidationResult,
  ConfigOptions,
  PresetEntry,
  BladeHardwareConfig,
  ArgType,
  TemplateDefinition,
} from './types.js';

export { buildAST } from './ASTBuilder.js';
// BladeConfig / RGB are mirrored here from @kyberstation/engine (canonical source).
// A compile-time structural-identity test (tests/typeIdentity.test.ts) guarantees
// they stay assignment-compatible with the engine's definitions; if you add a
// field to engine's BladeConfig, add it to the mirror in ASTBuilder.ts too.
export type { BladeConfig, RGB, BuildOptions } from './ASTBuilder.js';
export { EditArgManager, STANDARD_COLOR_ARGS } from './EditArgManager.js';
export { emitCode } from './CodeEmitter.js';
export { buildConfigFile } from './ConfigBuilder.js';
export { validateAST } from './Validator.js';
export {
  lookupTemplate,
  isKnownTemplate,
  getAllTemplates,
} from './templates/index.js';

// ─── Multi-Board Emitters ───

export type {
  BoardEmitter,
  BoardEmitOptions,
  EmitterOutput,
} from './emitters/index.js';
export {
  CFXEmitter,
  GHv3Emitter,
  XenopixelEmitter,
  getEmitter,
  hasEmitter,
  listEmitterBoards,
} from './emitters/index.js';

// ─── C++ Style Parser ───

export { parseStyleCode, tokenize, filterTokens, reconstructConfig } from './parser/index.js';
export type { ParseResult, ParseError, ParseWarning, ReconstructedConfig, Token, TokenType } from './parser/index.js';

// ─── AST Binding Layer (Phase 2) ───

export {
  configToAST,
  astToCode,
  codeToAST,
  astToConfig,
  makeInitialBindingState,
  syncFromConfig,
  syncFromCode,
  hitToLED,
  positionToProffie,
  clamp01,
} from './astBinding.js';
export type {
  BindingState,
  HitGeometry,
  LEDHit,
} from './astBinding.js';

// ─── Transition Map (Phase 2) ───

export {
  TRANSITION_MAPPINGS,
  ignitionFromID,
  retractionFromID,
  ignitionFromAST,
  retractionFromAST,
} from './transitionMap.js';
export type { TransitionMapping, TransitionKind } from './transitionMap.js';

// ─── Convenience ───

import type { EmitOptions } from './types.js';
import type { BladeConfig, BuildOptions } from './ASTBuilder.js';
import { buildAST } from './ASTBuilder.js';
import { emitCode } from './CodeEmitter.js';
import {
  applyModulationSnapshot,
  formatSnapshotCommentBlock,
  type ModulationPayloadLike,
  type MappedBindingSummary,
  type DeferredMappingSummary,
} from './proffieOSEmitter/applyModulationSnapshot.js';
import { mapBindings, type MappedBinding } from './proffieOSEmitter/mapBindings.js';
import { composeBindings } from './proffieOSEmitter/composeBindings.js';

// ─── ProffieOS binding emitter (v1.0 Preview + v1.1 Core composer) ───

export {
  mapBindings,
  computeSnapshotValue,
  MAP_BINDINGS_REASONS,
  applyModulationSnapshot,
  formatSnapshotCommentBlock,
  composeBindings,
} from './proffieOSEmitter/index.js';
export type {
  MapBindingsResult,
  MappedBinding,
  UnmappableBinding,
  ModulationPayloadLike,
  ModulationSnapshotReport,
  AppliedBinding,
  SkippedBinding,
  ApplySnapshotOptions,
  CommentBlockExtras,
  MappedBindingSummary,
  DeferredMappingSummary,
  ComposeBindingsResult,
} from './proffieOSEmitter/index.js';

/**
 * One-shot convenience: BladeConfig -> ProffieOS C++ style code string.
 *
 * v1.1 Core flow when the config carries a `config.modulation` payload:
 *
 *   1. `mapBindings()` partitions every binding into `mappable` (a
 *      ProffieOS template fits) and `unmappable` (snapshot-only).
 *   2. `applyModulationSnapshot()` writes a snapshot value into the
 *      config for every binding (mappable + unmappable). For mappable
 *      bindings this snapshot is overwritten by the composer in step 4;
 *      for unmappable / deferred bindings it remains baked into the
 *      AST. Snapshotting the full set means the AST always carries a
 *      reasonable static fallback if the composer can't graft a
 *      particular slot.
 *   3. `buildAST()` builds the style tree against the snapshotted config.
 *   4. `composeBindings()` walks the AST and grafts each mappable
 *      binding's `astPatch` into the slot identified by `targetPath`.
 *      Bindings with no slot in the current AST shape land in
 *      `deferred` and stay snapshotted (already baked in step 2).
 *   5. `emitCode()` pretty-prints the rewritten AST.
 *   6. A v1.1 comment block describes which bindings became live
 *      templates vs. snapshots vs. skipped.
 *
 * Callers that want the v1.0 single-style code without the comment
 * banner pass `{ comments: false }` (used by the full-config.h preset
 * array path so we don't get one comment per preset).
 */
export function generateStyleCode(
  config: BladeConfig,
  options?: EmitOptions & BuildOptions,
): string {
  const payload =
    (config as BladeConfig & { modulation?: ModulationPayloadLike }).modulation;

  // Fast path: no payload / empty bindings → v1.0 byte-identical output.
  if (!payload || payload.bindings.length === 0) {
    const ast = buildAST(config, { editMode: options?.editMode });
    return emitCode(ast, options);
  }

  // Step 1 — partition bindings into mappable / unmappable.
  const mappingCtx = {
    modulators: new Map<string, number>([
      ['swing', 0], ['angle', 0], ['twist', 0],
      ['sound', 0], ['battery', 1.0], ['time', 0],
      ['clash', 0], ['lockup', 0], ['preon', 0],
      ['ignition', 0], ['retraction', 0],
    ]),
    config: config as unknown as { readonly [key: string]: unknown },
    frame: 0,
  };
  const mappingResult = mapBindings(payload.bindings, config, mappingCtx);

  // Step 2 — snapshot ALL bindings into a baseline config. Mappable
  // entries get overwritten by the composer in step 4; unmappable +
  // deferred entries keep the snapshot in the emitted AST.
  const { config: snapshotConfig, report } = applyModulationSnapshot(
    config,
    payload,
  );

  // Step 3 — build the style AST against the fully snapshotted config.
  const ast = buildAST(snapshotConfig, { editMode: options?.editMode });

  // Step 4 — graft live drivers for mappable bindings. Bindings the
  // composer couldn't place fall through to `deferred` — they stay
  // snapshotted (already baked in step 2).
  const composeResult = composeBindings(ast, mappingResult.mappable);

  // Step 5 — emit.
  const code = emitCode(composeResult.ast, options);

  // Step 6 — comment block (skipped via `comments: false` for preset arrays).
  if (options?.comments === false) return code;

  // Translate composer state into the formatter's extras shape.
  const mappedSummaries: MappedBindingSummary[] = composeResult.composed.map(
    (m: MappedBinding) => ({
      id: m.binding.id,
      source: m.binding.source,
      target: m.binding.target,
      combinator: m.binding.combinator,
      amount: m.binding.amount,
      note: m.note,
      label: m.binding.label,
    }),
  );
  const deferredSummaries: DeferredMappingSummary[] = composeResult.deferred.map(
    (m: MappedBinding) => ({
      id: m.binding.id,
      reason: `no AST slot for "${m.binding.target}" in current style shape`,
    }),
  );

  const commentBlock = formatSnapshotCommentBlock(report, {
    mappedBindings: mappedSummaries,
    deferredFromMapping: deferredSummaries,
  });
  return commentBlock + code;
}
