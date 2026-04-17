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

/**
 * One-shot convenience: BladeConfig -> ProffieOS C++ style code string.
 */
export function generateStyleCode(
  config: BladeConfig,
  options?: EmitOptions & BuildOptions,
): string {
  const ast = buildAST(config, { editMode: options?.editMode });
  return emitCode(ast, options);
}
