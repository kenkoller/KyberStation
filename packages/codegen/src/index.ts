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
} from './proffieOSEmitter/applyModulationSnapshot.js';

// ─── ProffieOS binding emitter (v1.0 Preview) ───

export {
  mapBindings,
  computeSnapshotValue,
  MAP_BINDINGS_REASONS,
  applyModulationSnapshot,
  formatSnapshotCommentBlock,
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
} from './proffieOSEmitter/index.js';

/**
 * One-shot convenience: BladeConfig -> ProffieOS C++ style code string.
 *
 * When the config carries a `config.modulation` payload (optional, added
 * in v1.0 Modulation Routing Preview), every binding is snapshotted to
 * its current value + baked into the config before the AST is built,
 * and a comment block describing the bindings is prepended to the
 * emitted code. v1.1 Core will replace snapshot-then-emit with live
 * template injection (Scale<SwingSpeed<>, ...>).
 */
export function generateStyleCode(
  config: BladeConfig,
  options?: EmitOptions & BuildOptions,
): string {
  const payload =
    (config as BladeConfig & { modulation?: ModulationPayloadLike }).modulation;
  const { config: snapshotConfig, report } = applyModulationSnapshot(
    config,
    payload,
  );
  const ast = buildAST(snapshotConfig, { editMode: options?.editMode });
  const code = emitCode(ast, options);
  // The comment block is noisy when this function is called per-preset
  // for the full config.h (one comment per preset would clutter the
  // preset array). Callers set `comments: false` to opt out. The
  // standalone view in CodeOutput.tsx calls with `comments: true` so
  // the modulation note lands where users read the full single-style
  // export.
  const commentBlock =
    options?.comments === false ? '' : formatSnapshotCommentBlock(report);
  return commentBlock + code;
}
