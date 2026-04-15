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
export type { ParseResult, ParseError, ReconstructedConfig, Token, TokenType } from './parser/index.js';

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
