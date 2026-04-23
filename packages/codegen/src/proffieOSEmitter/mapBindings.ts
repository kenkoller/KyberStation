// ─── ProffieOS Binding Emitter — Option B+ ───
//
// Maps ModulationBinding[] to ProffieOS template sub-ASTs where the
// mapping is lossless, returns a snapshot-value fallback for bindings
// that can't be represented in ProffieOS's static template system.
//
// The user picks per-binding at export time between "Map to template"
// (lossless/approximate) and "Snapshot current value" (freezes the
// evaluated value at export time). We compute both sides here so the
// flash dialog can present a per-binding status table.
//
// See:
//   docs/MODULATION_ROUTING_V1.1.md §8 — UI hand-off
//   docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md §2 decision 1 (Option B+)
//
// ─── Mapping table (v1.0 Routing Preview) ────────────────────────────
//
//   swing       → SwingSpeed<400>
//   angle       → BladeAngle<>
//   twist       → TwistAngle<>
//   sound       → NoisySoundLevel<>        (ProffieOS SoundLevel equivalent)
//   battery     → BatteryLevel<>
//   time        → Sin<Int<period>>         (only when expression is
//                                           sin(time * k) * 0.5 + 0.5)
//   clash       → ClashImpactF<>
//   lockup      → UNMAPPABLE                (layer-state; defer to v1.1)
//   preon       → UNMAPPABLE                (InOutTrL/TrPreon owns this)
//   ignition    → UNMAPPABLE                (InOutTrL owns this)
//   retraction  → UNMAPPABLE                (InOutTrL owns this)

import type { StyleNode } from '../types.js';

// ─── Mirrored types ──────────────────────────────────────────────────
//
// The workspace uses `node-linker=hoisted` with `symlink=false` per the
// root .npmrc, so codegen src/ can't import @kyberstation/engine at
// compile time (CLAUDE.md decision #1). These mirrors are a subset of
// `packages/engine/src/modulation/types.ts` plus the fields from
// `packages/engine/src/types.ts` that snapshot evaluation needs.
//
// A vitest drift sentinel in tests/proffieOSEmitter/mapBindings.test.ts
// asserts the mirror stays assignment-compatible with the canonical
// engine types. If you add a field to the engine types and this emitter
// needs it, add it to the mirror too or the sentinel test fails.

export type BuiltInModulatorId =
  | 'swing'
  | 'angle'
  | 'twist'
  | 'sound'
  | 'battery'
  | 'time'
  | 'clash'
  | 'lockup'
  | 'preon'
  | 'ignition'
  | 'retraction';

export type ModulatorId = BuiltInModulatorId | string;

export type BindingCombinator =
  | 'replace'
  | 'add'
  | 'multiply'
  | 'min'
  | 'max';

export type ParameterPath = string;

export type BinaryOp = '+' | '-' | '*' | '/';
export type UnaryOp = '-';
export type BuiltInFnId =
  | 'min'
  | 'max'
  | 'clamp'
  | 'lerp'
  | 'sin'
  | 'cos'
  | 'abs'
  | 'floor'
  | 'ceil'
  | 'round';

export type ExpressionNode =
  | { readonly kind: 'literal'; readonly value: number }
  | { readonly kind: 'var'; readonly id: ModulatorId }
  | {
      readonly kind: 'binary';
      readonly op: BinaryOp;
      readonly lhs: ExpressionNode;
      readonly rhs: ExpressionNode;
    }
  | { readonly kind: 'unary'; readonly op: UnaryOp; readonly operand: ExpressionNode }
  | {
      readonly kind: 'call';
      readonly fn: BuiltInFnId;
      readonly args: readonly ExpressionNode[];
    };

export interface ModulationBinding {
  id: string;
  source: ModulatorId | null;
  expression: ExpressionNode | null;
  target: ParameterPath;
  combinator: BindingCombinator;
  amount: number;
  label?: string;
  colorVar?: string;
  bypassed?: boolean;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Minimal BladeConfig shape the emitter reads from. Intentionally a
 * loose `[key: string]: unknown` — snapshot evaluation walks dotted
 * paths, and the engine's full BladeConfig has dozens of optional
 * numeric fields that wouldn't all fit in a narrow type.
 */
export interface BladeConfig {
  readonly [key: string]: unknown;
}

/**
 * Subset of engine `EvalContext` the snapshot path needs. We only care
 * about current-frame modulator values — `styleContext` is optional so
 * callers can construct a lightweight context for export-time snapshot
 * evaluation (no need to spin up a full BladeEngine).
 */
export interface EvalContext {
  /** Current-frame modulator values. Missing IDs evaluate to 0. */
  modulators: ReadonlyMap<ModulatorId, number>;
  /** Optional config snapshot for parameter-default resolution. */
  config?: BladeConfig;
  /** Frame counter, unused here but kept for shape-compat with engine. */
  frame?: number;
}

// ─── Public result shape ─────────────────────────────────────────────

export interface MappedBinding {
  /** Original binding that produced this mapping. */
  binding: ModulationBinding;
  /** Dotted BladeConfig path this binding targets. */
  targetPath: string;
  /**
   * Sub-AST representing the binding's driver inside ProffieOS. The
   * composer that lives in a later sprint will graft this into the
   * surrounding style AST at `targetPath`. For v1.0 Preview, the flash
   * dialog simply renders this for user review.
   */
  astPatch: StyleNode;
  /** Human-readable hint shown in the mapping preview table. */
  note?: string;
}

export interface UnmappableBinding {
  /** Original binding that couldn't be mapped. */
  binding: ModulationBinding;
  /**
   * User-facing reason — "Modulator chains aren't supported in
   * ProffieOS", etc. Matches the exact copy strings the flash dialog
   * renders, so this doubles as the i18n key when translations land.
   */
  reason: string;
  /**
   * Current evaluated value at export time. When the user picks
   * "Snapshot current value" the parameter is written with this
   * constant in the generated config.
   */
  snapshotValue: number;
}

export interface MapBindingsResult {
  readonly mappable: readonly MappedBinding[];
  readonly unmappable: readonly UnmappableBinding[];
}

// ─── Reasons ─────────────────────────────────────────────────────────

const REASON = {
  EXPRESSION_V11:
    'Math expressions are a v1.1 feature (snapshot value frozen at export)',
  MODULATOR_CHAIN:
    "Modulator chains aren't supported in ProffieOS (snapshot value frozen at export)",
  LOCKUP_V11:
    "Lockup state isn't a simple template driver in ProffieOS (deferred to v1.1)",
  PREON_HANDLED:
    "Preon is already driven by ProffieOS's TrPreon / InOutTrL — modulating it here would double up",
  IGNITION_HANDLED:
    "Ignition progress is already driven by InOutTrL — modulating it here would double up",
  RETRACTION_HANDLED:
    "Retraction progress is already driven by InOutTrL — modulating it here would double up",
  BYPASSED: 'Binding is bypassed (snapshot value frozen at export)',
  UNKNOWN_SOURCE: (id: string) =>
    `Unknown modulator source "${id}" — no ProffieOS template maps to it`,
  INVALID_BINDING:
    'Binding has neither `source` nor `expression` set (invariant violation)',
} as const;

// ─── AST helpers (mirrors of ASTBuilder's private helpers) ────────────

function rawNode(value: string): StyleNode {
  return { type: 'raw', name: value, args: [] };
}

function intNode(value: number): StyleNode {
  return { type: 'integer', name: String(Math.round(value)), args: [] };
}

function intTemplateNode(value: number): StyleNode {
  return { type: 'function', name: 'Int', args: [intNode(value)] };
}

function functionNode(name: string, ...args: StyleNode[]): StyleNode {
  return { type: 'function', name, args };
}

// ─── Snapshot evaluation ─────────────────────────────────────────────

/** Read a dotted path out of a BladeConfig-like object. */
function readPath(obj: unknown, path: string): unknown {
  if (obj == null || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** Coerce a dotted-path value to a finite number, or return fallback. */
function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

/** Pure evaluator for the ExpressionNode tree. Matches the v1.1 spec. */
function evaluateExpression(
  node: ExpressionNode,
  ctx: EvalContext,
): number {
  switch (node.kind) {
    case 'literal':
      return node.value;
    case 'var': {
      const v = ctx.modulators.get(node.id);
      return typeof v === 'number' && Number.isFinite(v) ? v : 0;
    }
    case 'unary': {
      const operand = evaluateExpression(node.operand, ctx);
      return node.op === '-' ? -operand : operand;
    }
    case 'binary': {
      const lhs = evaluateExpression(node.lhs, ctx);
      const rhs = evaluateExpression(node.rhs, ctx);
      switch (node.op) {
        case '+': return lhs + rhs;
        case '-': return lhs - rhs;
        case '*': return lhs * rhs;
        case '/': return lhs / rhs; // JS semantics: Infinity / NaN propagate
      }
      return 0;
    }
    case 'call': {
      const a = node.args.map((arg) => evaluateExpression(arg, ctx));
      switch (node.fn) {
        case 'min': return Math.min(a[0] ?? 0, a[1] ?? 0);
        case 'max': return Math.max(a[0] ?? 0, a[1] ?? 0);
        case 'clamp':
          return Math.max(a[1] ?? 0, Math.min(a[2] ?? 0, a[0] ?? 0));
        case 'lerp': {
          const [aa = 0, bb = 0, t = 0] = a;
          return aa + (bb - aa) * t;
        }
        case 'sin':   return Math.sin(a[0] ?? 0);
        case 'cos':   return Math.cos(a[0] ?? 0);
        case 'abs':   return Math.abs(a[0] ?? 0);
        case 'floor': return Math.floor(a[0] ?? 0);
        case 'ceil':  return Math.ceil(a[0] ?? 0);
        case 'round': return Math.round(a[0] ?? 0);
      }
      return 0;
    }
  }
}

/**
 * Compute the snapshot value for an unmappable binding — the constant
 * that the generated config will hold in place of live modulation.
 *
 * Strategy:
 *   1. If the binding has an expression, evaluate it against evalCtx.
 *   2. If the binding has a source, look up the source's current value.
 *   3. Apply `amount`, then combine with the target's static config
 *      value using `combinator`. This is the same math the engine runs
 *      at apply time per MODULATION_ROUTING_V1.1.md §6.1.
 *   4. Sanitize NaN / Infinity to the static value (or 0 if absent).
 *
 * A binding whose combinator is `replace` and whose evaluation is
 * invalid falls back to the target's current static value, preserving
 * the pre-modulation shape of the config.
 */
export function computeSnapshotValue(
  binding: ModulationBinding,
  config: BladeConfig,
  evalCtx: EvalContext,
): number {
  const staticValue = toFiniteNumber(readPath(config, binding.target), 0);

  let driver: number;
  try {
    if (binding.expression) {
      driver = evaluateExpression(binding.expression, evalCtx);
    } else if (binding.source != null) {
      const v = evalCtx.modulators.get(binding.source);
      driver = typeof v === 'number' && Number.isFinite(v) ? v : 0;
    } else {
      // Invariant violation — neither source nor expression.
      return staticValue;
    }
  } catch {
    return staticValue;
  }

  if (!Number.isFinite(driver)) driver = 0;

  const amount = Number.isFinite(binding.amount) ? binding.amount : 0;
  const wet = driver * amount;

  let result: number;
  switch (binding.combinator) {
    case 'replace':  result = wet; break;
    case 'add':      result = staticValue + wet; break;
    case 'multiply': result = staticValue * wet; break;
    case 'min':      result = Math.min(staticValue, wet); break;
    case 'max':      result = Math.max(staticValue, wet); break;
    default:         result = staticValue;
  }

  if (!Number.isFinite(result)) return staticValue;
  return result;
}

// ─── Expression heuristics ───────────────────────────────────────────

/**
 * Detect `sin(time * k) * 0.5 + 0.5` as a mappable breathing envelope.
 *
 * The UI's common-idiom shortcut produces this shape for "breathing"
 * presets. We recognize it so breathing blades can round-trip to
 * `Sin<Int<period>>` without the user paying the snapshot-fallback cost.
 *
 * Returns the period in ms if the shape matches, otherwise null.
 *
 * Shape matched:
 *   (sin(time * k) * 0.5) + 0.5
 *   sin(time * k) * 0.5 + 0.5     (left-associative, same thing)
 */
function matchSinBreathingEnvelope(expr: ExpressionNode): number | null {
  // Outer: <stuff> + 0.5
  if (expr.kind !== 'binary' || expr.op !== '+') return null;
  if (!isLiteralValue(expr.rhs, 0.5)) return null;

  // Middle: sin(time * k) * 0.5
  const middle = expr.lhs;
  if (middle.kind !== 'binary' || middle.op !== '*') return null;
  if (!isLiteralValue(middle.rhs, 0.5)) return null;

  // Inner: sin(time * k)
  const sinCall = middle.lhs;
  if (sinCall.kind !== 'call' || sinCall.fn !== 'sin') return null;
  if (sinCall.args.length !== 1) return null;

  const mulNode = sinCall.args[0];
  if (mulNode.kind !== 'binary' || mulNode.op !== '*') return null;

  // `time * k` OR `k * time` — accept either order.
  let kValue: number | null = null;
  if (mulNode.lhs.kind === 'var' && mulNode.lhs.id === 'time' && mulNode.rhs.kind === 'literal') {
    kValue = mulNode.rhs.value;
  } else if (mulNode.rhs.kind === 'var' && mulNode.rhs.id === 'time' && mulNode.lhs.kind === 'literal') {
    kValue = mulNode.lhs.value;
  }
  if (kValue === null || !Number.isFinite(kValue) || kValue === 0) return null;

  // Sin<Int<N>> in ProffieOS: N = period in ms. Our expression's `time`
  // is in ms, so `sin(time * k)` completes one cycle every `2π / k` ms.
  const period = Math.max(1, Math.round((2 * Math.PI) / Math.abs(kValue)));
  return period;
}

function isLiteralValue(node: ExpressionNode, value: number): boolean {
  return node.kind === 'literal' && Math.abs(node.value - value) < 1e-9;
}

/**
 * An expression references *only* modulator IDs that are themselves
 * built-ins — no custom modulators, no unknown IDs. Returns the set of
 * referenced IDs; `null` signals an invalid / chain-like reference.
 *
 * v1.0 reports any custom-modulator reference as a chain. v1.1 will
 * extend this to accept `builtIn === false` descriptors that describe
 * non-chain custom sources.
 */
function isChainReference(
  expr: ExpressionNode,
  knownBuiltIns: ReadonlySet<ModulatorId>,
): boolean {
  switch (expr.kind) {
    case 'literal':
      return false;
    case 'var':
      return !knownBuiltIns.has(expr.id);
    case 'unary':
      return isChainReference(expr.operand, knownBuiltIns);
    case 'binary':
      return (
        isChainReference(expr.lhs, knownBuiltIns) ||
        isChainReference(expr.rhs, knownBuiltIns)
      );
    case 'call':
      return expr.args.some((arg) => isChainReference(arg, knownBuiltIns));
  }
}

// ─── Per-modulator mappers ───────────────────────────────────────────

/**
 * Build the ProffieOS driver sub-AST for a simple `source → target`
 * binding at a given `amount`. The sub-AST is the "driver" portion —
 * the composer in a later sprint decides how to graft it into the
 * surrounding style (`Scale<>` wrapping, `Mix<>`-style blends, etc.).
 *
 * For v1.0 Preview we always wrap the source in:
 *   Scale<source, Int<0>, Int<scaledAmount32k>>
 * where `scaledAmount32k = round(amount * 32768)`. This is a
 * half-implementation — it gives the composer a single consistent
 * shape to handle and gets the common "swing → shimmer amount 60%"
 * recipe looking right. Real range-tuning ships in v1.1 with
 * parameterGroups as the range source of truth.
 */
function buildSourceDriver(source: BuiltInModulatorId): StyleNode | null {
  switch (source) {
    case 'swing':
      // SwingSpeed<400> — 400ms window matches existing rotoscope usage.
      return functionNode('SwingSpeed', intNode(400));
    case 'angle':
      return functionNode('BladeAngle');
    case 'twist':
      return functionNode('TwistAngle');
    case 'sound':
      // NoisySoundLevel<> — the "raw" / unsmoothed audio RMS envelope.
      // Most mapping recipes want the responsiveness of the unsmoothed
      // value here; smoothing can be added by wrapping in SmoothStep in
      // a future sprint.
      return rawNode('NoisySoundLevel');
    case 'battery':
      return rawNode('BatteryLevel');
    case 'clash':
      // ClashImpactF<> returns a decaying 0..1 on clash. Not wrapped in
      // Scale — the composer decides how to fold it in based on target.
      return functionNode('ClashImpactF');
    case 'time':
      // Without an expression, a bare `time` source has no natural
      // ProffieOS mapping (time in ms doesn't fit a 0..32768 window).
      // Return null so the caller marks it unmappable.
      return null;
    case 'lockup':
    case 'preon':
    case 'ignition':
    case 'retraction':
      return null;
  }
}

function wrapInScale(driver: StyleNode, amount: number): StyleNode {
  // Clamp amount to [0, 1], then scale to ProffieOS's 32768-wide range.
  const clamped = Math.max(0, Math.min(1, amount));
  const hi = Math.round(clamped * 32768);
  return functionNode('Scale', driver, intTemplateNode(0), intTemplateNode(hi));
}

const BUILTIN_MODULATORS: ReadonlySet<ModulatorId> = new Set<ModulatorId>([
  'swing',
  'angle',
  'twist',
  'sound',
  'battery',
  'time',
  'clash',
  'lockup',
  'preon',
  'ignition',
  'retraction',
]);

const UNMAPPABLE_BUILTINS: Partial<Record<BuiltInModulatorId, string>> = {
  lockup: REASON.LOCKUP_V11,
  preon: REASON.PREON_HANDLED,
  ignition: REASON.IGNITION_HANDLED,
  retraction: REASON.RETRACTION_HANDLED,
};

// ─── Main entry point ────────────────────────────────────────────────

/**
 * Option B+ mapping: for each binding, produce either a mappable
 * sub-AST (grafted into the style AST by a later sprint) or an
 * unmappable record carrying the user-facing reason + the snapshot
 * value to freeze in the generated config.
 *
 * This function is pure — it reads `bindings`, `config`, and `evalCtx`,
 * and returns a new result. No side effects. No mutation.
 */
export function mapBindings(
  bindings: readonly ModulationBinding[],
  config: BladeConfig,
  evalCtx: EvalContext,
): MapBindingsResult {
  const mappable: MappedBinding[] = [];
  const unmappable: UnmappableBinding[] = [];

  for (const binding of bindings) {
    // Bypassed bindings freeze as snapshot so the flash dialog can show
    // a greyed row + "bypassed" tag. They still contribute a snapshot
    // value so the generated config matches what the user sees on the
    // web preview at export time.
    if (binding.bypassed) {
      unmappable.push({
        binding,
        reason: REASON.BYPASSED,
        snapshotValue: computeSnapshotValue(binding, config, evalCtx),
      });
      continue;
    }

    // Invariant violation: neither source nor expression set.
    if (binding.source == null && binding.expression == null) {
      unmappable.push({
        binding,
        reason: REASON.INVALID_BINDING,
        snapshotValue: toFiniteNumber(readPath(config, binding.target), 0),
      });
      continue;
    }

    // Expression branch.
    if (binding.expression) {
      // Chain detection — any var reference to an unknown / custom ID.
      if (isChainReference(binding.expression, BUILTIN_MODULATORS)) {
        unmappable.push({
          binding,
          reason: REASON.MODULATOR_CHAIN,
          snapshotValue: computeSnapshotValue(binding, config, evalCtx),
        });
        continue;
      }

      // Common-idiom: sin(time * k) * 0.5 + 0.5 → Sin<Int<period>>.
      const period = matchSinBreathingEnvelope(binding.expression);
      if (period !== null) {
        const driver = functionNode('Sin', intTemplateNode(period));
        mappable.push({
          binding,
          targetPath: binding.target,
          astPatch: wrapInScale(driver, binding.amount),
          note: `Breathing envelope (${period}ms period)`,
        });
        continue;
      }

      // Fall-through: complex expressions land in v1.1 once the parser
      // can round-trip to ProffieOS templates. Everything else snapshots.
      unmappable.push({
        binding,
        reason: REASON.EXPRESSION_V11,
        snapshotValue: computeSnapshotValue(binding, config, evalCtx),
      });
      continue;
    }

    // Source branch.
    const source = binding.source as ModulatorId;

    // Unknown / custom source IDs — no template to route to.
    if (!BUILTIN_MODULATORS.has(source)) {
      unmappable.push({
        binding,
        reason: REASON.UNKNOWN_SOURCE(String(source)),
        snapshotValue: computeSnapshotValue(binding, config, evalCtx),
      });
      continue;
    }

    const builtIn = source as BuiltInModulatorId;

    // Built-ins that are fundamentally unmappable.
    const bannedReason = UNMAPPABLE_BUILTINS[builtIn];
    if (bannedReason) {
      unmappable.push({
        binding,
        reason: bannedReason,
        snapshotValue: computeSnapshotValue(binding, config, evalCtx),
      });
      continue;
    }

    const driver = buildSourceDriver(builtIn);
    if (driver === null) {
      // `time` as a bare source falls here — the UI should push users
      // toward the `sin(time * k) * 0.5 + 0.5` expression form.
      unmappable.push({
        binding,
        reason: `${builtIn} as a bare source has no ProffieOS template — wrap it in a sin() expression`,
        snapshotValue: computeSnapshotValue(binding, config, evalCtx),
      });
      continue;
    }

    mappable.push({
      binding,
      targetPath: binding.target,
      astPatch: wrapInScale(driver, binding.amount),
    });
  }

  return { mappable, unmappable };
}

// ─── Re-exports for convenience ──────────────────────────────────────
// Let the emitter surface the REASON table for the flash dialog so
// string-match tests in apps/web can assert the exact copy.
export const MAP_BINDINGS_REASONS = REASON;
