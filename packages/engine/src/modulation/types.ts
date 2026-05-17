// ─── Modulation Routing — v1.1 scaffold ───
//
// Type-only scaffold for the math-expression evaluator + modulation
// routing system specced in `docs/MODULATION_ROUTING_V1.1.md`. No
// runtime behavior lives here — these are the interface contracts that
// a later implementation sprint will fill in.
//
// Everything in this file is **v1.1 / post-launch**. Nothing in the
// engine wires into these types yet. See the doc for evaluation-order
// rules, serialization format, and the Kyber Glyph v2 migration plan.
//
// Status: DESIGN-SCOPED · NOT IMPLEMENTED

import type { BladeConfig, StyleContext, EffectContext } from '../types.js';

// ─── Modulator sources ──────────────────────────────────────────────
//
// A modulator is any time-varying or context-varying signal that can
// drive a style parameter. The engine already exposes many of these
// as fields on StyleContext / EffectContext (swingSpeed, bladeAngle,
// twistAngle, soundLevel, batteryLevel, time). v1.1 formalises them
// into a named registry so expressions and UI can reference them by
// ID.

/**
 * Stable string IDs for every built-in modulator. Adding a new built-in
 * modulator is a breaking change — new IDs require bumping
 * {@link MODULATOR_REGISTRY_VERSION} in the companion doc.
 *
 * **Wave 8 LITE union extension (2026-05-01):** the 8 aux/gesture
 * event-driven IDs (`aux-*` + `gesture-*`) were added to the union
 * after PR #222 shipped them as `ModulatorId` strings via the custom
 * branch. Their decay envelope is owned by the sampler's latch+decay
 * logic, registry-tabled in `EVENT_MODULATOR_DECAY` — see
 * `packages/engine/src/modulation/registry.ts`. Surfaced as plates in
 * the routing UI; `ModulatorPlateBar` categorizes them under
 * BUTTON / GESTURE section headers.
 */
export type BuiltInModulatorId =
  // ─── v1.1 Core modulators (continuous + latched-effect signals) ───
  | 'swing'              // StyleContext.swingSpeed — 0..1 normalized swing speed
  | 'angle'              // StyleContext.bladeAngle — -1..1 (down..up)
  | 'twist'              // StyleContext.twistAngle — -1..1
  | 'sound'              // StyleContext.soundLevel — 0..1 RMS envelope
  | 'battery'            // StyleContext.batteryLevel — 0..1 battery charge
  | 'time'               // StyleContext.time — ms elapsed (wraps at 2^32 ms)
  | 'clash'              // Latched clash intensity, 0..1, decays with BladeConfig.clashIntensity
  | 'lockup'             // 0/1 lockup active flag
  | 'preon'              // 0..1 preon progress (1 at preon start, 0 at ignition)
  | 'ignition'           // 0..1 ignition progress
  | 'retraction'         // 0..1 retraction progress
  // ─── Wave 8 LITE — aux button events ───
  | 'aux-click'          // Single aux button press, ~50ms decay (decay=0.85)
  | 'aux-hold'           // Sustained aux button hold, ~165ms decay (decay=0.95)
  | 'aux-double-click'   // Aux double-tap, ~33ms decay (decay=0.80)
  // ─── Wave 8 LITE — gesture events ───
  | 'gesture-twist'      // IMU rotation-about-long-axis, ~100ms decay (decay=0.92)
  | 'gesture-stab'       // IMU forward thrust, ~65ms decay (decay=0.88)
  | 'gesture-swing'      // IMU swing event (distinct from continuous `swing`), ~115ms (decay=0.93)
  | 'gesture-clash'      // IMU clash gesture (distinct from `clash` effect), ~80ms (decay=0.90)
  | 'gesture-shake';     // Sustained IMU shake, ~165ms decay (decay=0.95)

export type ModulatorId = BuiltInModulatorId | (string & { readonly __custom?: unique symbol });

// ─── Prop-file event vocabulary (Wave 8 — button routing) ───────────
//
// Discrete events the firmware emits — distinct from the continuous
// `ModulatorId` signals above. A `SerializedBinding` may optionally
// declare which prop-file event it reacts to via {@link SerializedBinding.triggerEvent},
// in which case the binding only fires when that event is observed.
//
// The vocabulary mirrors `apps/web/lib/propFileProfiles.ts` exactly —
// that file is the source of truth for which events each prop file
// (Fett263, SA22C, BC Button Controls, Default Fett) supports. Adding
// a new event here means the UI side (Agent 3) extends the prop-file
// profile registry to match, and codegen (Agent 2) wires it through.
//
// NOTE: These types deliberately use the bare event names from
// propFileProfiles (`click`, `swing`, `twist`) — NOT the longer-form
// `aux-click` / `gesture-twist` modulator IDs. The two vocabularies
// are related but distinct:
//
//   - ButtonEvent / GestureEvent (here)     — discrete firmware events
//                                             that the prop file emits
//                                             on physical input
//   - aux-click / gesture-twist (registry)  — continuous modulators that
//                                             latch+decay when those
//                                             events fire
//
// A binding with `triggerEvent: 'click'` + `source: 'aux-click'` means
// "fire on the click button event, using the aux-click latched
// envelope as the driver value". The validation pass in
// `applyBindings.ts` enforces the source-must-be-aux-or-gesture rule
// when triggerEvent is set; see §6.4 of the design doc.

/**
 * Discrete button events emitted by the prop file on physical input.
 * Mirrors `apps/web/lib/propFileProfiles.ts` ButtonEvent union exactly.
 *
 * Not every prop file emits every event — the UI gates available
 * events by the active prop file's `buttonEvents` array.
 */
export type ButtonEvent =
  | 'click'
  | 'long-press'
  | 'hold'
  | 'double-click'
  | 'triple-click'
  | 'click-and-hold'
  | 'held-plus-other-click';

/**
 * Discrete gesture events emitted by the prop file on IMU detection.
 * Mirrors `apps/web/lib/propFileProfiles.ts` GestureEvent union exactly.
 *
 * As with ButtonEvent, the active prop file's `gestureEvents` array
 * determines which entries are surfaced in the UI.
 */
export type GestureEvent = 'swing' | 'stab' | 'thrust' | 'twist' | 'shake';

/**
 * Union of all prop-file events a binding can be coupled to.
 *
 * Stored on `SerializedBinding.triggerEvent` (optional) as a plain
 * string — the type-level distinction between button and gesture is
 * preserved by the union but the wire form is a single field. Consumers
 * that want to branch on category can use string-prefix or membership
 * checks against the relevant subset.
 */
export type PropFileEvent = ButtonEvent | GestureEvent;

/**
 * Metadata that drives the UI (name, color-identity for wire-coloring
 * in LayerStack + StylePanel, display-unit for scrub labels) and the
 * evaluator (range + smoothing).
 */
export interface ModulatorDescriptor {
  id: ModulatorId;
  displayName: string;
  /** CSS variable reference for the modulator's identity color. */
  colorVar: string;
  /** Closed interval the raw source value lives in, for UI scaling. */
  range: readonly [number, number];
  /** Unit label for UI display (`"ms"`, `"°"`, `""`). */
  unit: string;
  /** Optional one-pole smoothing coefficient in [0, 1). 0 = no smoothing. */
  smoothing?: number;
  /** `true` when the modulator is one of the {@link BuiltInModulatorId}s. */
  builtIn: boolean;
}

// ─── Modulation bindings ────────────────────────────────────────────
//
// A ModulationBinding wires a modulator (or an expression over
// modulators) to a BladeConfig parameter. Bindings are layered on top
// of the static parameter value — the static value is the "default"
// the user sees in the UI, and the binding perturbs it at evaluation
// time.

/**
 * A dotted path into `BladeConfig` that addresses a single numeric
 * leaf. Example: `"shimmer"`, `"baseColor.r"`, `"lockupPosition"`.
 * The UI side uses this for drop-target identification and tooltips.
 * Validation is deferred to runtime because `BladeConfig` extends a
 * `[key: string]: unknown` escape hatch.
 */
export type ParameterPath = string;

export type BindingCombinator =
  | 'replace'   // expression value overwrites the static parameter
  | 'add'       // static + expression
  | 'multiply'  // static * expression
  | 'min'       // min(static, expression)
  | 'max';      // max(static, expression)

export interface ModulationBinding {
  /**
   * Stable ID per binding — used for undo/redo, for wire highlighting
   * in the UI, and for addressability via the ⌘K palette.
   */
  id: string;
  /**
   * When the binding was authored as "just route modulator X to param Y"
   * (no math), this holds the source ID directly. When it was authored
   * as a math expression, this is `null` and {@link expression} is set.
   * Exactly one of {@link source}, {@link expression} must be set.
   */
  source: ModulatorId | null;
  expression: ExpressionNode | null;
  target: ParameterPath;
  combinator: BindingCombinator;
  /** 0..1 wet/dry — 0 bypasses the binding, 1 applies it fully. */
  amount: number;
  /** User-authored display name, falls back to `"<modId> → <target>"`. */
  label?: string;
  /** Optional color override (defaults to the modulator's `colorVar`). */
  colorVar?: string;
  /** Rendered as a dashed wire in the UI when true. */
  bypassed?: boolean;
  /**
   * Wave 8 (button routing) — optional prop-file event coupling.
   *
   * When set, the binding only fires when the engine reports that
   * specific prop-file event (e.g. `'double-click'`, `'twist'`) was
   * observed this frame. When `undefined`, the binding's `source`
   * modulator drives the binding on every frame (the legacy
   * pre-Wave-8 behavior).
   *
   * **Validation:** when `triggerEvent` is set, `source` MUST be one
   * of the 8 aux/gesture event modulators (`aux-click`, `aux-hold`,
   * `aux-double-click`, `gesture-twist`, `gesture-stab`,
   * `gesture-swing`, `gesture-clash`, `gesture-shake`). Bindings that
   * declare `triggerEvent` with a non-event source are filtered out
   * by `applyBindings` — see `isValidTriggerEventBinding` in
   * `./applyBindings.ts`.
   *
   * **Source of truth for valid event ids:**
   * `apps/web/lib/propFileProfiles.ts`. The type-level union
   * {@link PropFileEvent} mirrors that file. The wire format is a
   * plain string because future prop files may extend the vocabulary
   * without requiring an engine release.
   */
  triggerEvent?: string;
}

// ─── Expression AST ─────────────────────────────────────────────────
//
// The math-expression grammar is defined in
// `docs/MODULATION_ROUTING_V1.1.md` §4. The AST below is a straight
// transliteration of that grammar. A parser consumes a source string
// and produces one of these; the evaluator walks the tree. Both are
// out-of-scope for this scaffold.

export type NumericLiteralNode = {
  readonly kind: 'literal';
  readonly value: number;
};

export type VariableRefNode = {
  readonly kind: 'var';
  readonly id: ModulatorId;
};

export type BinaryOp = '+' | '-' | '*' | '/';

export type BinaryOpNode = {
  readonly kind: 'binary';
  readonly op: BinaryOp;
  readonly lhs: ExpressionNode;
  readonly rhs: ExpressionNode;
};

export type UnaryOp = '-'; // unary minus
export type UnaryOpNode = {
  readonly kind: 'unary';
  readonly op: UnaryOp;
  readonly operand: ExpressionNode;
};

/**
 * Call site for the curated built-in function set. Argument arity is
 * checked at parse time against {@link BUILTIN_FN_ARITY} in the
 * runtime (scaffold — table not included here).
 */
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

export type CallNode = {
  readonly kind: 'call';
  readonly fn: BuiltInFnId;
  readonly args: readonly ExpressionNode[];
};

export type ExpressionNode =
  | NumericLiteralNode
  | VariableRefNode
  | BinaryOpNode
  | UnaryOpNode
  | CallNode;

// ─── Evaluation context ─────────────────────────────────────────────
//
// The context the evaluator sees at render time. A single EvalContext
// is built per frame per blade; bindings for all parameters share it so
// modulator smoothing + clash latching stay coherent.

export interface EvalContext {
  /** Current-frame modulator values, already smoothed per descriptor. */
  modulators: ReadonlyMap<ModulatorId, number>;
  /**
   * The ambient style context for this frame. Anything a binding might
   * want to inspect that isn't a modulator (e.g. `config`) is reachable
   * here.
   */
  styleContext: StyleContext;
  /** Optional — populated only during effect apply passes. */
  effectContext?: EffectContext;
  /**
   * Stable frame index. Bindings that want to throttle their
   * expression evaluation (e.g. 30 Hz instead of 60 Hz) use this.
   */
  frame: number;
}

// ─── Serialization-facing types ─────────────────────────────────────
//
// See §5 of the companion doc for the wire format. These types are
// what the Kyber Glyph v2 encoder / decoder will round-trip.

/**
 * Serializable form of an {@link ExpressionNode}. Strings use UTF-8;
 * the expression's source-text is retained so diffs and Community
 * Gallery code-review stay readable.
 */
export interface SerializedExpression {
  /** Re-parseable source text for UI editing. */
  source: string;
  /** Pre-parsed AST (redundant with source, but saves a parse on load). */
  ast: ExpressionNode;
}

export interface SerializedBinding {
  id: string;
  source: ModulatorId | null;
  expression: SerializedExpression | null;
  target: ParameterPath;
  combinator: BindingCombinator;
  amount: number;
  label?: string;
  colorVar?: string;
  bypassed?: boolean;
  /**
   * Wave 8 (button routing) — optional prop-file event coupling. Wire
   * form mirror of {@link ModulationBinding.triggerEvent}. See that
   * field's docstring for validation rules + the prop-file event
   * vocabulary source-of-truth (`apps/web/lib/propFileProfiles.ts`).
   *
   * Stored as a plain string for forward-compatibility — prop files
   * may extend their event vocabulary out-of-band without requiring
   * an engine release. The {@link PropFileEvent} union is the
   * type-level mirror for the current vocabulary; consumers that want
   * compile-time narrowing can cast through it.
   *
   * Round-trips losslessly through Kyber Glyph v2 — if the field is
   * absent from the payload (e.g. a legacy v1.0 binding), it stays
   * `undefined` and the binding behaves as it did pre-Wave-8 (fires
   * every frame the source modulator is non-zero).
   */
  triggerEvent?: string;
}

/**
 * The top-level payload a BladeConfig carries when modulation is
 * active. Stored under a new `modulation` field on BladeConfig in
 * v1.1 — see §5.2 of the companion doc.
 */
export interface ModulationPayload {
  version: 1;
  bindings: readonly SerializedBinding[];
  /** User-added modulator definitions not in the built-in registry. */
  customModulators?: readonly ModulatorDescriptor[];
}

// ─── Helper type to attach modulation to a BladeConfig ──────────────
//
// Intentionally NOT re-declared on the canonical BladeConfig in
// `../types.ts` yet — that would ship a v1.1 field on a v1.0 store.
// This alias is how a future v1.1 build will extend BladeConfig in
// a single place.

export type BladeConfigWithModulation = BladeConfig & {
  modulation?: ModulationPayload;
};
