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
 * Import-preservation early-return (Phase 2A, 2026-05-02):
 * If the BladeConfig carries an `importedRawCode` string captured at
 * import time, that raw code is emitted verbatim with a provenance
 * header comment. This skips the AST build + emit pipeline entirely so
 * complex Fett263 OS7 Style Library snippets (which reach beyond
 * KyberStation's parser registry) round-trip byte-identically. The
 * "Convert to native" UI clears the field, after which the standard
 * regenerate-from-BladeConfig path resumes.
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
  // ─── Import-preservation early-return (Phase 2A) ───
  // When `importedRawCode` is a non-empty string, the original ProffieOS
  // code is emitted verbatim with a provenance header. Modulation bindings
  // (if any) cannot be applied to raw code — surface a single warning so
  // users know to "Convert to native" if they want their bindings to take
  // effect. Defense in depth: `migrateImportFields` already drops empty
  // strings, but the explicit check below keeps this path predictable when
  // callers construct configs by hand.
  if (
    typeof config.importedRawCode === 'string' &&
    config.importedRawCode.length > 0
  ) {
    return buildImportedRawCodeOutput(config, options);
  }

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

// ─── Import-preservation helpers (Phase 2A) ──────────────────────────

/**
 * Emit imported raw ProffieOS code verbatim with a provenance header.
 *
 * The header is load-bearing context for anyone reading the emitted
 * config, so it survives `comments: false` (which exists to suppress the
 * per-preset modulation banner inside a config.h preset array — a
 * different concern). The optional modulation-bindings warning IS
 * suppressed under `comments: false` to preserve that contract.
 *
 * Caller is responsible for clearing `importedRawCode` when the user
 * "Converts to native" — see Phase 2B for the UI wiring.
 */
function buildImportedRawCodeOutput(
  config: BladeConfig,
  options?: EmitOptions & BuildOptions,
): string {
  const raw = config.importedRawCode!;
  const source = config.importedSource ?? 'external source';
  const importedAtIso = formatImportedAt(config.importedAt);
  const lines: string[] = [
    `// Imported from ${source}`,
    `// Imported at: ${importedAtIso}`,
    '// Original ProffieOS code preserved verbatim — regenerated structure suppressed.',
  ];

  // Modulation-bindings warning (suppressed under comments: false to keep
  // the preset-array path clean). Surface once per emit, not per binding.
  const payload =
    (config as BladeConfig & { modulation?: ModulationPayloadLike }).modulation;
  const bindingCount = payload?.bindings?.length ?? 0;
  if (bindingCount > 0 && options?.comments !== false) {
    lines.push(
      `// NOTE: this config has ${bindingCount} modulation binding${bindingCount === 1 ? '' : 's'} that ${bindingCount === 1 ? 'is' : 'are'} not applied to the imported raw code. Click "Convert to native" in the editor to regenerate from BladeConfig with bindings.`,
    );
  }

  return lines.join('\n') + '\n' + raw;
}

/**
 * Format an `importedAt` Unix-ms timestamp as an ISO date string for the
 * provenance header. Falls back to the literal "unknown" when missing or
 * not a finite number — defense against legacy persisted state.
 */
function formatImportedAt(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'unknown';
  try {
    return new Date(value).toISOString();
  } catch {
    return 'unknown';
  }
}
