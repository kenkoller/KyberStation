// ─── Modulation — Binding Application (v1.1 / Friday v1.0 Preview) ───
//
// Pure function that walks an ordered list of `ModulationBinding`s,
// resolves each to a driver value, composes it with the static
// parameter value using the requested combinator, clamps and
// sanitizes, and writes the result into a new `BladeConfig` object.
//
// Semantics follow `docs/MODULATION_ROUTING_V1.1.md` §6 (evaluation
// order + composition + clamping/sanitization).
//
// Zero DOM / React dependencies per CLAUDE.md Architecture Principle #2.

import type { BladeConfig } from '../types.js';
import type {
  BindingCombinator,
  EvalContext,
  ModulationBinding,
  ParameterPath,
} from './types.js';

// ─── Public types ───────────────────────────────────────────────────

/**
 * Per-parameter clamp metadata. Sourced from the UI's `parameterGroups`
 * registry (Agent C's deliverable); the engine is agnostic to where
 * this map comes from — it just consumes it.
 */
export interface ParameterClampRange {
  readonly min: number;
  readonly max: number;
  readonly default: number;
}

export type ParameterClampRanges = ReadonlyMap<ParameterPath, ParameterClampRange>;

// ─── Utilities ──────────────────────────────────────────────────────

/**
 * Read a dotted-path leaf from a `BladeConfig`. Returns `undefined` if
 * any intermediate segment is missing or non-object. Coerces to
 * `number` when possible; non-numeric leaves are returned as `NaN` so
 * downstream sanitization picks them up uniformly.
 */
function readPath(config: BladeConfig, path: ParameterPath): number {
  const segments = path.split('.');
  let cursor: unknown = config;
  for (const seg of segments) {
    if (cursor == null || typeof cursor !== 'object') {
      return NaN;
    }
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  if (typeof cursor !== 'number') return NaN;
  return cursor;
}

/**
 * Return a new object with the dotted-path leaf replaced by `value`.
 * Intermediate objects are shallow-cloned as we descend so the original
 * `config` is never mutated. Missing intermediate segments abort the
 * write and return the original config unchanged — the binding is
 * silently dropped (matches the design doc §3.3 "enum-valued fields
 * silently dropped" pattern).
 */
function writePath(
  config: BladeConfig,
  path: ParameterPath,
  value: number,
): BladeConfig {
  const segments = path.split('.');
  if (segments.length === 0) return config;

  // Walk down, shallow-cloning each intermediate level. If at any
  // point we hit a non-object, bail and return the original — the
  // binding's target doesn't exist on this config shape.
  const rootClone: Record<string, unknown> = { ...(config as Record<string, unknown>) };
  let cursor: Record<string, unknown> = rootClone;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    const next = cursor[seg];
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      // Non-object mid-path: the path target doesn't exist — drop the write.
      return config;
    }
    const clone = { ...(next as Record<string, unknown>) };
    cursor[seg] = clone;
    cursor = clone;
  }
  cursor[segments[segments.length - 1]!] = value;

  return rootClone as BladeConfig;
}

/**
 * Compose the static + driver pair under the requested combinator.
 * See design doc §6.2 for the multi-binding composition rules.
 */
function combine(
  staticValue: number,
  driverValue: number,
  combinator: BindingCombinator,
): number {
  switch (combinator) {
    case 'replace':
      return driverValue;
    case 'add':
      return staticValue + driverValue;
    case 'multiply':
      return staticValue * driverValue;
    case 'min':
      return Math.min(staticValue, driverValue);
    case 'max':
      return Math.max(staticValue, driverValue);
    default: {
      // Exhaustiveness check — TS will complain if a new combinator
      // is added without extending this switch.
      const _exhaustive: never = combinator;
      return staticValue + (_exhaustive as unknown as number);
    }
  }
}

/**
 * Sanitize a candidate value against the parameter's declared range.
 *
 * Rules per design doc §6.3:
 *
 *   - NaN           → parameter `default`
 *   - +Infinity     → parameter `max`
 *   - -Infinity     → parameter `min`
 *   - otherwise     → clamp(value, min, max)
 */
function sanitize(
  candidate: number,
  clampRange: ParameterClampRange | undefined,
): number {
  // If the UI hasn't declared a range for this parameter, fall back
  // to a permissive pass-through. This matches the Friday v1.0
  // preview posture: unknown params don't crash the render loop.
  if (!clampRange) {
    if (Number.isNaN(candidate)) return 0;
    if (candidate === Number.POSITIVE_INFINITY) return Number.MAX_VALUE;
    if (candidate === Number.NEGATIVE_INFINITY) return -Number.MAX_VALUE;
    return candidate;
  }

  if (Number.isNaN(candidate)) return clampRange.default;
  if (candidate === Number.POSITIVE_INFINITY) return clampRange.max;
  if (candidate === Number.NEGATIVE_INFINITY) return clampRange.min;

  if (candidate < clampRange.min) return clampRange.min;
  if (candidate > clampRange.max) return clampRange.max;
  return candidate;
}

/**
 * Resolve a binding's driver value.
 *
 * For v1.0 scope, expression evaluation is stubbed: if `expression` is
 * non-null, we fall back to `source` as if the binding were a simple
 * route. The math-expression parser + evaluator land in the v1.1
 * sprint.
 *
 * TODO(Agent-A-v1.1-parser): thread a real `evaluate(expression, ctx)`
 * call here. See design doc §4 and §6.1.
 */
function resolveDriver(binding: ModulationBinding, ctx: EvalContext): number {
  // Prefer `source` when present; expression is stubbed in v1.0 to
  // treat the source fallback as the driver. If both are null, the
  // binding is ill-formed — return 0 so it's a visible no-op rather
  // than a crash.
  if (binding.source !== null) {
    const raw = ctx.modulators.get(binding.source);
    return raw ?? 0;
  }

  if (binding.expression !== null) {
    // v1.0 scope stub — expression evaluation deferred. Log nothing;
    // the UI surfaces an "expression eval coming in v1.1" chip.
    // TODO(Agent-A-v1.1-parser): replace with `evaluate(binding.expression, ctx)`.
    //
    // To reduce the chance of a fully-zero binding feeling "dead" when
    // the user authors an expression, we attempt a best-effort source
    // extraction: if the top-level AST is a `var` node, use that
    // variable. Otherwise, 0.
    if (binding.expression.kind === 'var') {
      const raw = ctx.modulators.get(binding.expression.id);
      return raw ?? 0;
    }
    return 0;
  }

  // Neither set — ill-formed binding.
  return 0;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Apply an ordered list of `ModulationBinding`s to a `BladeConfig`,
 * returning a new config. Pure — `config` is not mutated.
 *
 * Rules:
 *   - Bindings are walked in array order.
 *   - `bypassed === true` bindings are skipped.
 *   - The driver value is `resolveDriver(binding) * binding.amount`
 *     (wet/dry).
 *   - The combinator composes `staticValue` and the driver.
 *   - The composed value is sanitized: NaN → default, ±Infinity → max/min,
 *     then clamped to `[min, max]` from `parameterClampRanges`.
 *   - If two bindings share a `target`, the second sees the first's
 *     output as its `staticValue` — matches design doc §6.2.
 *
 * @param config                  — the static authoring config
 * @param bindings                — ordered binding list (caller order)
 * @param evalCtx                 — per-frame eval context
 * @param parameterClampRanges    — parameter-path → clamp metadata from
 *                                  Agent C's `parameterGroups.ts`
 *                                  registry. Missing entries fall
 *                                  through to permissive sanitization.
 */
export function applyBindings(
  config: BladeConfig,
  bindings: readonly ModulationBinding[],
  evalCtx: EvalContext,
  parameterClampRanges: ParameterClampRanges,
): BladeConfig {
  if (bindings.length === 0) return config;

  let next = config;

  for (const binding of bindings) {
    if (binding.bypassed === true) continue;

    const clampRange = parameterClampRanges.get(binding.target);

    // `staticValue` comes from the current in-progress accumulator —
    // this is what makes multi-binding composition chain correctly
    // (design doc §6.2).
    const staticValue = readPath(next, binding.target);

    // Resolve + amount-scale the driver.
    const rawDriver = resolveDriver(binding, evalCtx);
    const amount = binding.amount;
    const scaledDriver = rawDriver * amount;

    // Compose. If `staticValue` is NaN (path missing) and combinator
    // isn't `replace`, the result will propagate NaN — which the
    // sanitizer then converts to `default`. That's acceptable as a
    // fallback behavior; the UI should surface invalid targets to the
    // user before they reach this code path.
    const composed = combine(staticValue, scaledDriver, binding.combinator);

    // Sanitize + clamp.
    const sanitized = sanitize(composed, clampRange);

    next = writePath(next, binding.target, sanitized);
  }

  return next;
}

/**
 * Test-visible helpers. Not re-exported via the modulation barrel.
 */
export const _internal: {
  readonly combine: typeof combine;
  readonly sanitize: typeof sanitize;
  readonly readPath: typeof readPath;
  readonly writePath: typeof writePath;
  readonly resolveDriver: typeof resolveDriver;
} = {
  combine,
  sanitize,
  readPath,
  writePath,
  resolveDriver,
};
