// ─── Modulation Snapshot Export — v1.0 Preview ────────────────────────
//
// Bridges the live-modulation bindings on `config.modulation.bindings`
// into the emitted ProffieOS config.h. For the v1.0 Preview BETA the
// semantic is "snapshot every binding to its current value, bake into
// config, emit static templates": safe, honest, always-flashable, and
// matches the Option B+ `snapshotValue` fallback path from
// `mapBindings`. v1.1 Core adds AST-level injection so mappable
// bindings emit as live `Scale<SwingSpeed<>, ...>` templates, with the
// snapshot path remaining as the fallback for unmappable bindings + any
// mappable binding the composer can't graft into the current AST shape.
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
  /** Total bindings the payload declared (or, when a filter is active, the in-scope subset). */
  readonly totalBindings: number;
  /** Bindings whose snapshot was successfully written into the config. */
  readonly appliedBindings: readonly AppliedBinding[];
  /** Bindings that couldn't be applied (invalid target path, bypassed, etc.). */
  readonly skippedBindings: readonly SkippedBinding[];
}

/**
 * Extra context the comment-block formatter uses when v1.1 Core's AST
 * composer has handled some bindings as live templates (instead of
 * snapshotting them). Optional — the v1.0 single-call form
 * (`formatSnapshotCommentBlock(report)`) still works unchanged.
 */
export interface CommentBlockExtras {
  /**
   * Bindings the AST composer grafted as live ProffieOS templates
   * (e.g., `Scale<SwingSpeed<>, Int<lo>, Int<hi>>`). Reported under the
   * "Mapped to live templates" section in the comment block.
   */
  readonly mappedBindings?: readonly MappedBindingSummary[];
  /**
   * Bindings the composer recognised as mappable in principle but
   * couldn't graft (no AST slot for the target). These were snapshotted
   * via the snapshot path, so they ALSO appear in
   * `report.appliedBindings`. The formatter cross-references this list
   * to label those rows as "deferred from live mapping".
   */
  readonly deferredFromMapping?: readonly DeferredMappingSummary[];
}

export interface MappedBindingSummary {
  readonly id: string;
  readonly source: ModulatorId | null;
  readonly target: string;
  readonly combinator: string;
  readonly amount: number;
  /** Optional human-readable hint from `mapBindings` (e.g., "Breathing envelope (6283ms period)"). */
  readonly note?: string;
  /** Optional binding label carried through from the user. */
  readonly label?: string;
}

export interface DeferredMappingSummary {
  readonly id: string;
  /** Why the composer couldn't graft this binding (e.g., "no AST slot for `baseColor.r`"). */
  readonly reason: string;
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
  /**
   * Optional filter — only bindings whose `id` appears in this set get
   * snapshotted. Bindings excluded by the filter are NOT applied and
   * NOT reported. Used by `generateStyleCode` to snapshot only the
   * unmappable + deferred bindings while leaving composer-handled
   * bindings to graft live drivers into the AST instead.
   *
   * When undefined, every payload binding is processed (v1.0 behavior).
   */
  readonly onlyBindingIds?: ReadonlySet<string>;
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
  const filter = options.onlyBindingIds;
  const applied: AppliedBinding[] = [];
  const skipped: SkippedBinding[] = [];
  let next = config;

  for (const binding of payload.bindings) {
    // Skip bindings outside the filter set entirely (no apply, no report).
    if (filter !== undefined && !filter.has(binding.id)) {
      continue;
    }

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

  // When a filter is supplied, totalBindings reflects only the in-scope
  // subset (matches what was actually processed) so report consumers can
  // reason about the applied-vs-skipped split without needing to know
  // about composer-handled bindings that bypassed the snapshot path.
  const totalBindings =
    filter !== undefined
      ? applied.length + skipped.length
      : payload.bindings.length;

  return {
    config: next,
    report: {
      totalBindings,
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
 * `extras` (optional, v1.1 Core) provides the AST composer's view of
 * which bindings were grafted as live templates vs. fell through to
 * snapshot. When omitted, the formatter emits the v1.0 Preview wording
 * (preserves byte-for-byte output for callers that pre-date v1.1
 * composing). When provided, the formatter switches to v1.1 wording
 * and adds a "Mapped to live templates" section.
 *
 * Returns an empty string when there's nothing to report.
 */
export function formatSnapshotCommentBlock(
  report: ModulationSnapshotReport,
  extras?: CommentBlockExtras,
): string {
  const mapped = extras?.mappedBindings ?? [];
  const deferred = extras?.deferredFromMapping ?? [];
  const totalForBlock = report.totalBindings + mapped.length;
  if (totalForBlock === 0) return '';

  // v1.1 Core wording when the composer was involved (caller passed
  // `extras`); v1.0 wording otherwise. Switching on `extras !==
  // undefined` rather than `mapped.length > 0` lets a v1.1 caller
  // produce the v1.1 banner even when zero bindings ended up grafted.
  const v11 = extras !== undefined;
  const deferredLookup = new Map<string, string>();
  for (const d of deferred) deferredLookup.set(d.id, d.reason);

  const lines: string[] = [];
  if (v11) {
    lines.push('// ─── Modulation Routing — v1.1 Core ──────────────────────');
    lines.push('//');
    lines.push('// This blade carries ' + totalForBlock + ' live-modulation binding' +
      (totalForBlock !== 1 ? 's' : '') + ' in KyberStation\'s editor.');
    lines.push('// Mappable bindings emit as LIVE ProffieOS templates (Scale<...>,');
    lines.push('// Sin<...>, etc.) so the flashed saber reacts in real time. Bindings');
    lines.push('// that don\'t fit a current template slot snapshot to a static value.');
    lines.push('//');
  } else {
    lines.push('// ─── Modulation Routing — v1.0 Preview BETA ──────────────');
    lines.push('//');
    lines.push('// This blade carries ' + report.totalBindings + ' live-modulation binding' +
      (report.totalBindings !== 1 ? 's' : '') + ' in KyberStation\'s editor.');
    lines.push('// For v1.0 Preview every binding was SNAPSHOTTED to its current value at');
    lines.push('// export time — the flashed saber shows a static "frozen-mid-design" view');
    lines.push('// of your modulation intent. True live-modulation templates (Scale<...>,');
    lines.push('// Sin<...>, etc.) ship in the v1.1 Core release.');
    lines.push('//');
  }

  if (mapped.length > 0) {
    lines.push('// Mapped to live templates (source -> target * combinator * amount):');
    for (const b of mapped) {
      const source = b.source ?? '(expression)';
      const note = b.note ? `  [${b.note}]` : '';
      lines.push(`//   ${source} -> ${b.target} * ${b.combinator} * ${Math.round(b.amount * 100)}%${note}`);
    }
  }

  if (report.appliedBindings.length > 0) {
    if (mapped.length > 0 && lines[lines.length - 1] !== '//') lines.push('//');
    const header = v11
      ? '// Snapshotted to static values (source -> target * combinator * amount -> snapshot):'
      : '// Applied bindings (source -> target * combinator * amount -> snapshot):';
    lines.push(header);
    for (const b of report.appliedBindings) {
      const source = b.source ?? '(expression)';
      const sv = formatSnapshotValue(b.snapshotValue);
      const tag = deferredLookup.has(b.id) ? '  [no AST slot - deferred]' : '';
      lines.push(`//   ${source} -> ${b.target} * ${b.combinator} * ${Math.round(b.amount * 100)}% -> ${sv}${tag}`);
    }
  }

  if (report.skippedBindings.length > 0) {
    lines.push('//');
    lines.push('// Skipped bindings:');
    for (const b of report.skippedBindings) {
      lines.push(`//   ${b.target} - ${b.reason}`);
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
