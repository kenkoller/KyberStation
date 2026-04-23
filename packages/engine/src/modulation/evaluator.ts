// ─── Modulation — Expression Evaluator (v1.1) ───
//
// Pure tree-walk evaluator over the `ExpressionNode` AST produced by
// `parser.ts`. Evaluation rules live in
// `docs/MODULATION_ROUTING_V1.1.md` §4.4:
//
//   - every expression evaluates to a `number`
//   - missing modulator IDs evaluate to `0` (never throws)
//   - `NaN` / `Infinity` propagate unchanged — callers
//     (applyBindings.sanitize) handle per-parameter-range cleanup
//   - evaluation is deterministic: given the same `EvalContext`, the
//     returned value is identical across calls (this is what makes the
//     fuzz suite + drift-sentinel possible)
//
// This module has zero DOM / React dependencies per CLAUDE.md
// Architecture Principle #2 (engine-first, headless-capable).

import type {
  BuiltInFnId,
  EvalContext,
  ExpressionNode,
  ModulatorId,
} from './types.js';

// ─── Built-in function table ────────────────────────────────────────
//
// The 10 curated built-ins, matching the table in design doc §4.1.
// Arity is enforced at *parse time* — by the time a `call` node
// reaches this evaluator, `args.length` is guaranteed to match the
// function's declared arity. We nevertheless code defensively (read
// each argument by index, default to `NaN` for any missing slot) so
// that a malformed `ExpressionNode` built outside the parser cannot
// crash the render loop.

const BUILTIN_FNS: Readonly<Record<BuiltInFnId, (args: readonly number[]) => number>> = {
  min: (args) => Math.min(args[0] ?? NaN, args[1] ?? NaN),
  max: (args) => Math.max(args[0] ?? NaN, args[1] ?? NaN),
  clamp: (args) => {
    const x = args[0] ?? NaN;
    const lo = args[1] ?? NaN;
    const hi = args[2] ?? NaN;
    return Math.max(lo, Math.min(hi, x));
  },
  lerp: (args) => {
    const a = args[0] ?? NaN;
    const b = args[1] ?? NaN;
    const t = args[2] ?? NaN;
    return a + (b - a) * t;
  },
  sin: (args) => Math.sin(args[0] ?? NaN),
  cos: (args) => Math.cos(args[0] ?? NaN),
  abs: (args) => Math.abs(args[0] ?? NaN),
  floor: (args) => Math.floor(args[0] ?? NaN),
  ceil: (args) => Math.ceil(args[0] ?? NaN),
  round: (args) => Math.round(args[0] ?? NaN),
};

// ─── Modulator lookup ───────────────────────────────────────────────

/**
 * Resolve a variable reference against the eval context's modulator
 * map. Missing IDs return `0` per design doc §4.4 — this keeps bindings
 * authored against a not-yet-connected or community-added modulator
 * from crashing the render loop.
 */
function resolveVar(id: ModulatorId, ctx: EvalContext): number {
  const raw = ctx.modulators.get(id);
  return raw ?? 0;
}

// ─── Binary op dispatch ─────────────────────────────────────────────

function evaluateBinary(
  op: '+' | '-' | '*' | '/',
  lhs: number,
  rhs: number,
): number {
  switch (op) {
    case '+': return lhs + rhs;
    case '-': return lhs - rhs;
    case '*': return lhs * rhs;
    case '/':
      // JS semantics: 1 / 0 === Infinity, 0 / 0 === NaN. Propagate
      // unchanged per design doc §4.4 — the clamp in applyBindings
      // sanitises Infinity to `parameter.max` and NaN to default.
      return lhs / rhs;
    default: {
      const _exhaustive: never = op;
      return _exhaustive as unknown as number;
    }
  }
}

// ─── Call dispatch ──────────────────────────────────────────────────

function evaluateCall(
  fn: BuiltInFnId,
  argValues: readonly number[],
): number {
  const impl = BUILTIN_FNS[fn];
  if (impl === undefined) {
    // Unknown built-in — should be unreachable because the parser
    // validates `fn` at parse time, but a hand-built AST could still
    // trip this. Return 0 rather than throw; the UI will surface the
    // invalid binding separately.
    return 0;
  }
  return impl(argValues);
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Evaluate an `ExpressionNode` AST against the supplied context.
 *
 * Pure function — no side effects, no caching of intermediate values,
 * and no mutation of `node` or `ctx`. Invokes itself recursively for
 * children. Depth is bounded by the grammar (no user-defined
 * recursion) so stack-overflow is effectively impossible for any
 * human-authored expression.
 *
 * @returns a finite number, `NaN`, `+Infinity`, or `-Infinity`.
 */
export function evaluate(node: ExpressionNode, ctx: EvalContext): number {
  switch (node.kind) {
    case 'literal':
      return node.value;

    case 'var':
      return resolveVar(node.id, ctx);

    case 'unary':
      // Only unary operator the grammar admits today is `-`.
      return -evaluate(node.operand, ctx);

    case 'binary': {
      const lhs = evaluate(node.lhs, ctx);
      const rhs = evaluate(node.rhs, ctx);
      return evaluateBinary(node.op, lhs, rhs);
    }

    case 'call': {
      const argValues: number[] = [];
      for (const arg of node.args) {
        argValues.push(evaluate(arg, ctx));
      }
      return evaluateCall(node.fn, argValues);
    }

    default: {
      const _exhaustive: never = node;
      return _exhaustive as unknown as number;
    }
  }
}

/**
 * Test-visible built-in table. Not re-exported via the modulation
 * barrel — consumers should use `evaluate()` or the parser, not the
 * lookup table directly.
 */
export const _internal: {
  readonly BUILTIN_FNS: typeof BUILTIN_FNS;
  readonly evaluateBinary: typeof evaluateBinary;
  readonly evaluateCall: typeof evaluateCall;
  readonly resolveVar: typeof resolveVar;
} = {
  BUILTIN_FNS,
  evaluateBinary,
  evaluateCall,
  resolveVar,
};
