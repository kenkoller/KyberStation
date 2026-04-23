// ─── Modulation Snapshot Export — v1.0 Preview ────────────────────────
//
// Bridges the live-modulation bindings on `config.modulation.bindings`
// into the emitted ProffieOS config.h. For the v1.0 Preview BETA the
// semantic is "snapshot every binding to its current value, bake into
// config, emit static templates": safe, honest, always-flashable, and
// matches the Option B+ `snapshotValue` fallback path from
// `mapBindings`. v1.1 Core will add true AST-level injection so mappable
// bindings emit as live `Scale<SwingSpeed<>, ...>` templates.
//
// The caller threads this into the emit pipeline BEFORE `buildAST`:
//
//     const { config: snapshotConfig, report } = applyModulationSnapshot(config);
//     const code = emitCode(buildAST(snapshotConfig));
//     return prependCommentBlock(report) + code;
//
// No engine dependency — the snapshot math lives in this package.

import type { BladeConfig } from '../ASTBuilder.js';
import {
  computeSnapshotValue,
  type EvalContext,
  type ModulationBinding,
  type ModulatorId,
} from './mapBindings.js';

// ─── Public types ────────────────────────────────────────────────────

/**
 * Minimal shape the snapshot reader understands — matches the engine's
 * `ModulationPayload.bindings` array shape for wire-format compatibility
 * without requiring the codegen package to depend on the engine.
 */
export interface ModulationPayloadLike {
  readonly version?: number;
  readonly bindings: readonly ModulationBinding[];
}

export interface ModulationSnapshotReport {
  /** Total bindings the payload declared. */
  readonly totalBindings: number;
  /** Bindings whose snapshot was successfully written into the config. */
  readonly appliedBindings: readonly AppliedBinding[];
  /** Bindings that couldn't be applied (invalid target path, bypassed, etc.). */
  readonly skippedBindings: readonly SkippedBinding[];
}

export interface AppliedBinding {
  readonly id: string;
  readonly source: ModulatorId | null;
  readonly target: string;
  readonly combinator: string;
  readonly amount: number;
  readonly snapshotValue: number;
  readonly label?: string;
}

export interface SkippedBinding {
  readonly id: string;
  readonly reason: string;
  readonly target: string;
}

// ─── Default eval context ────────────────────────────────────────────

/**
 * Build a default `EvalContext` for snapshot-at-export. In the absence
 * of a live engine, every modulator resolves to a sensible "at rest"
 * value: swing/sound/angle/twist at 0 (blade idle), battery at 1.0
 * (full charge), time at 0, effect-latches at 0.
 *
 * Consumers that want a different snapshot state (e.g. "mid-swing to
 * capture the reactive shimmer value") pass a custom EvalContext.
 */
function makeDefaultEvalContext(config: BladeConfig): EvalContext {
  const modulators = new Map<ModulatorId, number>([
    ['swing', 0],
    ['angle', 0],
    ['twist', 0],
    ['sound', 0],
    ['battery', 1.0],
    ['time', 0],
    ['clash', 0],
    ['lockup', 0],
    ['preon', 0],
    ['ignition', 0],
    ['retraction', 0],
  ]);
  return {
    modulators,
    config: config as unknown as EvalContext['config'],
    frame: 0,
  };
}

// ─── Path helpers ────────────────────────────────────────────────────

/**
 * Write a dotted-path numeric value into a BladeConfig. Shallow-clones
 * intermediate objects so the input config isn't mutated. Returns the
 * original object unchanged if any intermediate segment is missing or
 * non-object (matches the engine's applyBindings `writePath` semantics).
 */
function writeConfigPath(
  config: BladeConfig,
  path: string,
  value: number,
): { config: BladeConfig; wrote: boolean } {
  const segments = path.split('.');
  if (segments.length === 0) return { config, wrote: false };

  const rootClone: Record<string, unknown> = { ...(config as Record<string, unknown>) };
  let cursor: Record<string, unknown> = rootClone;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    const next = cursor[seg];
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      return { config, wrote: false };
    }
    const clone = { ...(next as Record<string, unknown>) };
    cursor[seg] = clone;
    cursor = clone;
  }

  const leaf = segments[segments.length - 1]!;
  // Only write if the leaf is a pre-existing numeric field — matches
  // the modulatable-parameter contract. Refuses to (a) clobber enum /
  // bool / object leaves or (b) invent new fields that the engine
  // wouldn't consume.
  const existing = cursor[leaf];
  if (existing === undefined || typeof existing !== 'number') {
    return { config, wrote: false };
  }

  cursor[leaf] = value;
  return { config: rootClone as BladeConfig, wrote: true };
}

// ─── Main entry ──────────────────────────────────────────────────────

export interface ApplySnapshotOptions {
  /**
   * Custom eval context for snapshot computation. Defaults to a "blade
   * idle / full battery" context; override for different snapshot states.
   */
  readonly evalContext?: EvalContext;
}

/**
 * Apply snapshot values of every `ModulationBinding` onto the config,
 * returning a new config + a report of what happened. Pure — does not
 * mutate `config` or its nested objects.
 *
 * Behavior:
 *   - Bypassed bindings are skipped with reason "bypassed".
 *   - Bindings targeting non-numeric / missing paths are skipped with
 *     reason "target path invalid".
 *   - Every other binding computes its snapshot via `computeSnapshotValue`
 *     and writes the result into `config` at `target`.
 *
 * Multiple bindings on the same target apply in authoring order; later
 * bindings see earlier bindings' writes as the new static value (matches
 * the engine's `applyBindings` chaining per design doc §6.2).
 */
export function applyModulationSnapshot(
  config: BladeConfig,
  payload: ModulationPayloadLike | undefined,
  options: ApplySnapshotOptions = {},
): { config: BladeConfig; report: ModulationSnapshotReport } {
  if (!payload || payload.bindings.length === 0) {
    return {
      config,
      report: {
        totalBindings: 0,
        appliedBindings: [],
        skippedBindings: [],
      },
    };
  }

  const evalCtx = options.evalContext ?? makeDefaultEvalContext(config);
  const applied: AppliedBinding[] = [];
  const skipped: SkippedBinding[] = [];
  let next = config;

  for (const binding of payload.bindings) {
    if (binding.bypassed === true) {
      skipped.push({
        id: binding.id,
        reason: 'bypassed',
        target: binding.target,
      });
      continue;
    }

    // computeSnapshotValue consumes the accumulating `next` so
    // multi-binding target chains read from the latest value.
    const ctxWithCurrent: EvalContext = {
      ...evalCtx,
      config: next as unknown as EvalContext['config'],
    };
    const snapshotValue = computeSnapshotValue(binding, next as unknown as {
      readonly [key: string]: unknown;
    }, ctxWithCurrent);

    const { config: written, wrote } = writeConfigPath(next, binding.target, snapshotValue);
    if (!wrote) {
      skipped.push({
        id: binding.id,
        reason: 'target path invalid or non-numeric',
        target: binding.target,
      });
      continue;
    }

    next = written;
    applied.push({
      id: binding.id,
      source: binding.source,
      target: binding.target,
      combinator: binding.combinator,
      amount: binding.amount,
      snapshotValue,
      label: binding.label,
    });
  }

  return {
    config: next,
    report: {
      totalBindings: payload.bindings.length,
      appliedBindings: applied,
      skippedBindings: skipped,
    },
  };
}

// ─── Comment block emitter ───────────────────────────────────────────

/**
 * Format a human-readable comment block describing the bindings that
 * were snapshotted during export. Rendered at the top of the emitted
 * config.h (or style code) so users can see exactly what their
 * modulation intent was at export time.
 *
 * Returns an empty string when the report has zero bindings — the
 * caller doesn't need to guard.
 */
export function formatSnapshotCommentBlock(
  report: ModulationSnapshotReport,
): string {
  if (report.totalBindings === 0) return '';

  const lines: string[] = [];
  lines.push('// ─── Modulation Routing — v1.0 Preview BETA ──────────────');
  lines.push('//');
  lines.push('// This blade carries ' + report.totalBindings + ' live-modulation binding' +
    (report.totalBindings !== 1 ? 's' : '') + ' in KyberStation\'s editor.');
  lines.push('// For v1.0 Preview every binding was SNAPSHOTTED to its current value at');
  lines.push('// export time — the flashed saber shows a static "frozen-mid-design" view');
  lines.push('// of your modulation intent. True live-modulation templates (Scale<...>,');
  lines.push('// Sin<...>, etc.) ship in the v1.1 Core release.');
  lines.push('//');

  if (report.appliedBindings.length > 0) {
    lines.push('// Applied bindings (source → target · combinator · amount → snapshot):');
    for (const b of report.appliedBindings) {
      const source = b.source ?? '(expression)';
      const sv = formatSnapshotValue(b.snapshotValue);
      lines.push(`//   ${source}\u00A0→\u00A0${b.target} · ${b.combinator} · ${Math.round(b.amount * 100)}% → ${sv}`);
    }
  }

  if (report.skippedBindings.length > 0) {
    lines.push('//');
    lines.push('// Skipped bindings:');
    for (const b of report.skippedBindings) {
      lines.push(`//   ${b.target} — ${b.reason}`);
    }
  }

  lines.push('//');
  lines.push('// See docs/MODULATION_ROUTING_ROADMAP.md for the v1.1+ ladder.');
  lines.push('// ───────────────────────────────────────────────────────────');
  return lines.join('\n') + '\n\n';
}

function formatSnapshotValue(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  // Integers stay integers, floats get up to 4 sig figs.
  if (Math.abs(v - Math.round(v)) < 1e-9) return Math.round(v).toString();
  return v.toPrecision(4);
}
