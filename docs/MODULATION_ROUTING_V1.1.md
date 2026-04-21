# Modulation Routing + Math-Expression Evaluator — v1.1 Design

**Status:** Design-scoped. No implementation in v1.0. Scaffold lives
at `packages/engine/src/modulation/` with type contracts only.
**Ships as:** v1.1 / post-launch.
**Positioning:** UX North Star §4 (per-component: Modulator plates,
StylePanel, EffectPanel) + §8 open question 3 (modulation graph panel
deferred). This doc is the engine-level primitive those surfaces will
consume.
**Companion docs:** `docs/UX_NORTH_STAR.md`, `docs/KYBER_CRYSTAL_VERSIONING.md`.

---

## 1. Posture

Modulation is the difference between a blade style and an instrument.
Vital built its brand on dragging modulators onto knobs with
persistent source-color propagation (UX North Star §2 row 2). Bitwig
hosts them as plates nested inside its device chain (row 4, reference
#4 / §4 row "LayerStack"). TouchDesigner lets any numeric parameter
accept a math expression instead of a literal value (§4 row "StylePanel
/ EffectPanel"). All three patterns together are what KyberStation
wants in v1.1.

v1.0 ships with none of this — styles are static + the few motion-
reactive fields on `BladeConfig` are the only modulation surface. v1.1
introduces:

1. A **named modulator registry** — `swing`, `angle`, `twist`, `sound`,
   `battery`, `time`, `clash`, `lockup`, `preon`, `ignition`,
   `retraction`. Each has stable ID, identity color, smoothing
   coefficient, display metadata.
2. **Modulation bindings** — one modulator (or math expression over
   modulators) routed to one `BladeConfig` parameter, with a
   combinator (`replace` / `add` / `multiply` / `min` / `max`) and a
   wet/dry amount.
3. A **math-expression mini-language** — `clamp(swing * 2, 0, 1)`,
   `lerp(base, clash, clash)`, `sin(time * 0.001) * 0.5 + 0.5`.
4. **Wire format** — `ModulationPayload` on `BladeConfig` that
   round-trips through Kyber Glyph v2 (payload version byte bumped,
   visual version unchanged).

v1.0 stays untouched. None of the above is wired into the current
`BladeEngine`. The scaffold commits the type contract so UI designers
can start on `ModulationGraphPanel` mock-ups against a frozen API.

---

## 2. Primary references

| # | Reference | What we steal |
|---|-----------|---------------|
| 1 | **Vital** | Drag-to-route, animated previews on every modulator plate, persistent source-identity color propagating to every driven parameter. |
| 2 | **Bitwig Studio** | Modulator plates as first-class citizens nested inside the device chain — in our case inside `LayerStack` per UX North Star §4. |
| 3 | **TouchDesigner** | Every numeric parameter accepts an expression in place of a literal. Expression editing is inline in the Inspector. |
| 4 | **Arturia Pigments (Mod Overview)** | Fallback dedicated view when the graph gets too dense for hover-highlight — deferred to post-v1.1 per §8 of UX North Star. |

---

## 3. Data model

### 3.1 Modulators

A modulator is a named time- or context-varying signal.

```ts
type BuiltInModulatorId =
  | 'swing' | 'angle' | 'twist' | 'sound' | 'battery' | 'time'
  | 'clash' | 'lockup' | 'preon' | 'ignition' | 'retraction';
```

Each modulator has a `ModulatorDescriptor` carrying display name,
CSS-variable color identity, range, unit, and a smoothing coefficient.
The descriptor is metadata-only; the **value** comes out of the
sampler at render time.

All built-ins map 1-to-1 to data already flowing through `StyleContext`
/ `EffectContext` — this is a refactor, not new measurement:

| ID | Source | Range | Smoothing default |
|----|--------|-------|-------------------|
| `swing` | `StyleContext.swingSpeed` | 0..1 | 0.35 |
| `angle` | `StyleContext.bladeAngle` | -1..1 | 0.20 |
| `twist` | `StyleContext.twistAngle` | -1..1 | 0.20 |
| `sound` | `StyleContext.soundLevel` | 0..1 | 0.50 |
| `battery` | `StyleContext.batteryLevel` | 0..1 | 0 |
| `time` | `StyleContext.time` | 0..2^32 ms | 0 |
| `clash` | Latched on clash trigger, decays per `BladeConfig.clashIntensity` | 0..1 | (decay only) |
| `lockup` | 0/1 flag while LockupEffect active | 0..1 | 0 |
| `preon` | Preon progress | 0..1 | 0 |
| `ignition` | Ignition progress | 0..1 | 0 |
| `retraction` | Retraction progress | 0..1 | 0 |

Custom user-added modulators are allowed via
`ModulationPayload.customModulators`. Any string ID not in the
built-in list routes through the custom table.

### 3.2 Bindings

```ts
interface ModulationBinding {
  id: string;                    // stable UUID
  source: ModulatorId | null;    // set when binding is a simple route
  expression: ExpressionNode | null; // set when binding is a math expression
  target: ParameterPath;         // e.g. "shimmer" or "baseColor.r"
  combinator: 'replace' | 'add' | 'multiply' | 'min' | 'max';
  amount: number;                // 0..1 wet/dry
  label?: string;
  colorVar?: string;             // override of modulator identity color
  bypassed?: boolean;
}
```

**Invariants:**

- Exactly one of `source`, `expression` is non-null. A UI-authored
  simple route like `swing → shimmer` uses `source = 'swing'` and
  `expression = null`. A UI-authored expression like
  `clamp(swing * 2, 0, 1)` stores the parsed AST under `expression`
  and leaves `source = null`.
- `target` is a dotted path into `BladeConfig`. The UI resolves
  drop-targets from the `parameterGroups.ts` registry — same source of
  truth as the Inspector.
- `amount = 0` is functionally equivalent to `bypassed = true`, but the
  UI distinguishes: 0 is "wired up but muted", bypassed is "explicitly
  disabled so I can A/B compare".
- Two bindings with the same `target` are allowed; they apply in the
  authoring order. §6.2 covers the composition rules.

### 3.3 Parameter paths

Examples of legal `target`s:

```
shimmer
lockupPosition
lockupRadius
baseColor.r
baseColor.g
baseColor.b
colorHueShiftSpeed
motionSwingColorShift.r
spatialWaveSpeed
```

Not every leaf is a legal target. Enum-valued fields
(`style`, `ignition`, `blendMode`, `scrollDirection`, …) cannot be
modulated — bindings applied to them are silently dropped at load
with a `TESTING_NOTES.md`-style warning. The UI grey-boxes them.

---

## 4. Math-expression mini-language

### 4.1 Minimum viable grammar

```
Expression   := AdditiveExpr
AdditiveExpr := MultiplicativeExpr (('+' | '-') MultiplicativeExpr)*
MultiplicativeExpr := UnaryExpr (('*' | '/') UnaryExpr)*
UnaryExpr    := '-' UnaryExpr | Primary
Primary      := Number | Variable | Call | '(' Expression ')'
Number       := [0-9]+ ('.' [0-9]+)?          ; e.g. 0, 0.5, 3.14
Variable     := Identifier                     ; e.g. swing, sound
Call         := Identifier '(' ArgList? ')'
ArgList      := Expression (',' Expression)*
Identifier   := [a-zA-Z_][a-zA-Z0-9_]*
```

**Built-in functions** (fixed arity, no user-defined functions in v1.1):

| Fn | Arity | Semantics |
|----|-------|-----------|
| `min(a, b)` | 2 | `Math.min(a, b)` |
| `max(a, b)` | 2 | `Math.max(a, b)` |
| `clamp(x, lo, hi)` | 3 | `Math.max(lo, Math.min(hi, x))` |
| `lerp(a, b, t)` | 3 | `a + (b - a) * t`, no clamping on `t` |
| `sin(x)` | 1 | `Math.sin(x)` radians |
| `cos(x)` | 1 | `Math.cos(x)` radians |
| `abs(x)` | 1 | `Math.abs(x)` |
| `floor(x)` | 1 | `Math.floor(x)` |
| `ceil(x)` | 1 | `Math.ceil(x)` |
| `round(x)` | 1 | `Math.round(x)` |

**Out of scope for v1.1** (deferred or never):

- User-defined functions (`def f(x) = ...`) — deferred, needs scope semantics.
- Conditional / ternary (`if`, `?:`) — deferred; v1.1 uses `lerp` +
  `clamp` + `min` / `max` to cover the common cases.
- Strings, booleans, arrays — out of scope. Everything is `number`.
- Bitwise ops — never. Wrong register for a blade-style expression.

**Example expressions from the task brief:**

```
clamp(swing * 2, 0, 1)                     // amplify swing, cap at 1
lerp(base, clash, clash_level)             // crossfade on clash
sin(time * 0.001) * 0.5 + 0.5              // 1 Hz breathing envelope
max(sound, swing)                          // louder OR faster → driver
clamp(1 - battery, 0, 0.5)                 // low-battery dim
```

(Note: the `base` / `clash` / `clash_level` example uses config-slot
references, not modulator IDs. v1.1 scoping is **modulator IDs only**;
`base` and `clash` would resolve as modulator IDs. If the community
wants `config.*` refs later, that's a v1.2 grammar bump.)

### 4.2 Parser recommendation: **peggy** (PEG), not nearley

Both PEG.js/peggy and nearley can express this grammar. The short
argument for peggy:

| Dimension | peggy | nearley |
|-----------|-------|---------|
| Grammar style | PEG (ordered choice, no ambiguity) | Earley (context-free, handles ambiguity) |
| Output | Single generated `.js` file or runtime-parse from string | Generated parser + `Parser` runtime |
| Error messages | Built-in expected-set + location | Requires custom tooling |
| Bundle size | ~25 KB (runtime) | ~20 KB (runtime) + grammar module |
| Build-time grammar compilation | Yes (peggy CLI) or runtime-compile | Yes (nearley-compile) or runtime-compile |
| Fit for expression-grammars with left-recursion | Good (PEG handles it via iteration) | Good (Earley is unambiguous) |
| Community for JS/TS | Larger, more tutorials | Smaller but healthy |
| License | MIT | MIT |

**The deciding factors for our use case:**

1. Our grammar is unambiguous by construction (ordered choice with
   standard arithmetic precedence). We don't need Earley's ambiguity
   handling; we pay for it anyway.
2. Error messages matter in a live-typed expression field. peggy's
   `expected X, got Y at offset Z` is directly usable in the UI.
   Nearley needs its Moo-tokenizer plus custom formatting.
3. peggy supports runtime compilation — the UI can parse user
   expressions on every keystroke without a pre-compiled grammar
   shipped in the bundle. Given how small the grammar is (~30 lines),
   this is the cheaper path.
4. Bundle size is a wash. Both are small enough not to matter next to
   Three.js / msgpackr / pako in the editor.

**Recommendation: `peggy`** (`pnpm add peggy`, ~25 KB gzipped
runtime). The grammar lives in `packages/engine/src/modulation/grammar.peggy`
compiled at build time to `grammar.js`; the parser exported as
`parseExpression`. Rejected alternative: hand-rolled recursive descent
in TypeScript — trades bundle size for ~200 lines of maintenance
surface and reinvents location-tracking for error messages.

### 4.3 AST shape

```ts
type ExpressionNode =
  | { kind: 'literal'; value: number }
  | { kind: 'var'; id: ModulatorId }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/'; lhs: ExpressionNode; rhs: ExpressionNode }
  | { kind: 'unary'; op: '-'; operand: ExpressionNode }
  | { kind: 'call'; fn: BuiltInFnId; args: readonly ExpressionNode[] };
```

Full definition lives at `packages/engine/src/modulation/types.ts`.

### 4.4 Evaluation semantics

- **Type:** every expression evaluates to a `number`. No type errors
  at eval time — the parser rejects what the evaluator can't handle.
- **Missing modulator IDs** evaluate to `0`. This keeps a binding
  authored against a not-yet-connected modulator (e.g. a `beatGrid`
  modulator that the community library adds later) from crashing the
  render loop. The UI shows a yellow underline on unknown IDs.
- **Division by zero** yields `Infinity` / `NaN` per JS semantics.
  The per-parameter clamp (§6.3) sanitises `NaN` → parameter default
  and `Infinity` → parameter max before the value reaches the
  engine.
- **Determinism:** given the same `EvalContext`, `evaluate()` is pure.
  `time` is the only non-deterministic input and it comes in through
  the context, not a hidden side-effect. This is what makes the
  vitest fuzz suite possible.

---

## 5. Serialization (Kyber Glyph v2)

### 5.1 Placement on `BladeConfig`

Bindings ride on `BladeConfig` as an optional field:

```ts
interface BladeConfigWithModulation extends BladeConfig {
  modulation?: ModulationPayload;
}

interface ModulationPayload {
  version: 1;                                 // payload schema version
  bindings: readonly SerializedBinding[];
  customModulators?: readonly ModulatorDescriptor[];
}

interface SerializedBinding {
  id: string;
  source: ModulatorId | null;
  expression: SerializedExpression | null;    // { source: string; ast: ExpressionNode }
  target: ParameterPath;
  combinator: BindingCombinator;
  amount: number;
  label?: string;
  colorVar?: string;
  bypassed?: boolean;
}
```

The expression's source text is retained alongside its AST so:
- diffs stay readable in the Community Gallery PR review flow,
- re-opening a glyph in a future KyberStation shows the user the
  expression they authored, not a pretty-printed reconstruction.

### 5.2 Version-byte strategy

Kyber Glyph v1 (shipped in v0.12.0) stays frozen. The
`payload_version` byte bumps to `2` when a config contains a
`modulation` field; v1-only configs keep emitting v1. Decoding:

| Incoming version byte | Decoder behavior |
|-----------------------|------------------|
| `1` | Parse the v1 schema. `modulation` is absent. |
| `2` | Parse the v1 schema + a new required `modulation` field. |
| `>= 3` | Throw `KyberGlyphVersionError` — user is on an older KyberStation. |

This keeps v1 glyphs decodable forever (per
`docs/KYBER_CRYSTAL_VERSIONING.md` §1 Contract A) and avoids paying
the modulation-payload byte cost on the 99% of glyphs that don't use
modulation.

### 5.3 Alternative considered: sidecar payload

We considered shipping modulation as a separate MessagePack blob
concatenated after the BladeConfig delta (same `?s=<glyph>` URL,
second segment after a `.` separator). **Rejected** because:

- it doubles the URL-handler surface (two parse paths),
- it means a glyph copied to a chat app with modulation could lose
  the modulation half to an overeager link shortener,
- the version-byte bump is the simpler invariant to maintain over
  three years per the Versioning doc's stability contract.

### 5.4 Size budget

A typical binding serialises to ~50 bytes (MessagePack, uncompressed,
delta-encoded against an empty binding). Zlib deflate on a payload
with 6 bindings ≈ the size of the v1 default payload (~25 base58
chars uncompressed vs ~80 chars total after deflate). Full budget
below — numbers are pre-implementation estimates, revisit with real
fuzz data before promoting to launch.

| Config | v1 bytes | v2 bytes (est.) | QR version |
|--------|---------:|----------------:|-----------:|
| Default (Obi-Wan ANH) | 18 | 18 | 2 |
| Typical custom blade, no modulation | ~130 | ~130 | 4 |
| Typical + 3 bindings | — | ~200 | 5 |
| Max complexity + 8 bindings + 2 custom modulators | ~490 | ~700 | 10 |

If a modulation-heavy payload exceeds QR Version 12 capacity, the
glyph falls back to the same `?config=<base64>` path the graceful-
overflow ladder already uses for v1 (see the CLAUDE.md decision #12
"measured glyph sizes" note).

---

## 6. Evaluation order

### 6.1 Per-frame pipeline

For each frame the engine already calls `BladeEngine.render()`. With
modulation active, render becomes:

```
1. sampleModulators(prevCtx, thisFrame) → modulators: Map<Id, number>
    - pulls raw values off StyleContext + effect state
    - applies one-pole smoothing per descriptor
    - latches clash intensity + decay
    - returns frozen map

2. applyBindings(staticConfig, bindings, evalCtx) → modulatedConfig
    - for each binding (authoring order):
        staticValue = read target path from config
        driver      = evaluate(expression ?? { kind: 'var', id: source }, evalCtx)
        newValue    = combine(staticValue, driver * amount, combinator)
        modulatedConfig = setPath(modulatedConfig, target, newValue)
    - NaN / Infinity sanitised to parameter default / max

3. style.getColor(position, time, { ...styleContext, config: modulatedConfig })
    - styles see the MODULATED config, not the static one
    - layer compositing runs on modulated-config output

4. effects[].apply(color, position, effectContext)
    - effects see the modulated config via effectContext.config
    - effects themselves are not modulated in v1.1 (their triggers are
      one-shot; the parameters they take at trigger time are already
      snapshotted by the time the effect is active)

5. ignition / retraction mask applied
    - ignition parameters (ignitionMs, easing, etc.) are modulated by
      bindings authored against them
```

**Key rule: modulation applies BEFORE style rendering, not after.**
This matters because:
- modulating `baseColor.r` changes the color the style starts from,
  not a post-effect tint,
- modulating `shimmer` or `spatialWaveFrequency` changes the style's
  behavior, not the pixel output,
- modulating `lockupPosition` changes where the clash lands, not its
  color.

### 6.2 Multi-binding composition on the same target

Two bindings with the same `target` apply in **authoring order**:

```ts
// starting: shimmer = 0.1
// binding 1: swing → shimmer, combinator=add, amount=1.0
// binding 2: sound → shimmer, combinator=multiply, amount=0.5
// step:
//   v0 = 0.1
//   v1 = combine(0.1, swing * 1.0, 'add')      // 0.1 + 0.3 = 0.4
//   v2 = combine(0.4, sound * 0.5, 'multiply') // 0.4 * (0.2) = 0.08
```

The UI renders this as a left-to-right chain, matching the LayerStack
top-to-bottom signal flow metaphor. `replace` short-circuits — any
`replace` binding clears the accumulator.

### 6.3 Clamping + sanitisation

Every modulated parameter value is clamped to the parameter's
declared range (from `parameterGroups.ts`) before it reaches the
engine. `NaN` inputs resolve to the parameter's default; `Infinity`
resolves to the parameter's `max`. Negative values on unsigned params
(`opacity`, `shimmer`, color channels, `*Ms` timings, etc.) clamp to
`min`.

---

## 7. Kyber Glyph v2 migration plan

### 7.1 Rollout phases

1. **Phase 0 (now, v1.0 scaffold):** ship type contracts at
   `packages/engine/src/modulation/`. Zero runtime. Zero UI.
2. **Phase 1 (v1.1 engine):** ship `parser.ts`, `evaluator.ts`,
   `registry.ts`, `sampler.ts`, `applyBindings.ts`. Wire the engine
   to call `applyBindings` when `config.modulation` is present;
   otherwise it's a no-op path. v1 glyphs keep encoding as v1.
3. **Phase 2 (v1.1 UI):** ship Modulator plates in LayerStack,
   drag-to-route wires, expression fields in StylePanel + EffectPanel,
   Modulation Graph Panel (if §8 scope allows). Bindings start
   appearing in user glyphs; encoder bumps to version byte `2`.
4. **Phase 3 (v1.2+):** `ModulationGraphPanel` dedicated view
   (deferred per UX North Star §8). User-defined functions.
   Conditional expressions. Community-contributed modulator
   extensions (beat detector, envelope followers, external MIDI).

### 7.2 Drift sentinels

Two vitest checks gate every commit touching this surface, following
the pattern from CLAUDE.md decisions #1 and #11:

1. **Schema identity test.** Mirrors of `ModulationBinding`,
   `SerializedBinding`, and `ModulationPayload` in
   `apps/web/lib/sharePack/` must structurally equal the engine
   types. Drift fails CI.
2. **Grammar stability test.** A fixture file of 50+ expression
   strings that must parse, and 50+ that must reject, is committed
   alongside the parser. Any future grammar change that moves one of
   these fixtures across the accept/reject boundary is a breaking
   change — requires bumping `ModulationPayload.version` to `2` in
   the wire format.

### 7.3 Backwards-compat guarantees

- `BladeConfig` without a `modulation` field is always legal. The
  field is optional forever.
- Bindings with unknown modulator IDs load without error; the
  unknown ID evaluates to `0`. This lets a future KyberStation ship
  a new built-in modulator without breaking glyphs authored against
  it on older apps.
- Bindings with unknown built-in-function names (`fn` field) reject
  at load time with a user-facing warning. Rationale: an unknown
  function is a syntactic problem the user can fix; an unknown
  modulator might be a legitimate future ID.

---

## 8. UI hand-off (not this sprint)

Intentionally out of scope. The v1.1 UI sprint will consume this
engine and is specced against the types frozen here. High-level shape
of what that sprint looks like, for context only:

- **LayerStack plates** (Bitwig pattern per UX North Star §4 row
  "Modulator plates") — every modulator gets a plate with a live
  preview: swing shows a moving needle, sound shows a waveform,
  clash flashes on trigger, etc.
- **Drag-to-route** (Vital pattern) — drag a plate's handle onto any
  numeric parameter in the Inspector; a wire appears in the
  plate's identity color; the parameter's scrub label turns that
  color with a subtle glow.
- **Expression fields** (TouchDesigner pattern) — cmd-click any
  numeric parameter → open the expression editor inline; live parse
  errors with the peggy `expected X` message underlined; evaluates
  in real time against current `EvalContext`.
- **Binding list** — a secondary view in the sidebar showing every
  binding as a row with source / target / combinator / amount /
  bypass.
- **Wire highlight on hover** — hovering a parameter highlights every
  binding that drives it; hovering a modulator highlights every
  parameter it drives. Mirror of the `modulatorHoverHighlight`
  primitive in UX North Star §7.

Deferred post-v1.1 (per UX North Star §8):

- `ModulationGraphPanel` — dedicated dense-graph view for when the
  parameter count exceeds hover-highlight's legibility. Pigments Mod
  Overview reference.

---

## 9. Open questions

1. **Should `config.*` paths be first-class expression variables?**
   Example: `lerp(baseColor.r, clashColor.r, clash)` — `baseColor.r`
   would resolve as a config-field reference, not a modulator ID. §4.1
   recommends **no for v1.1** to keep the grammar simple; adds as a
   v1.2 grammar bump if community feedback asks for it.
2. **Per-binding smoothing override?** Descriptors carry smoothing
   coefficients, but a binding might want to override (`sound` is
   smoothed for most parameters but a binding driving `clashIntensity`
   might want the raw value). Propose: add an optional
   `rawValue: boolean` flag on `ModulationBinding` in a
   non-breaking way; default `false`. Revisit in Phase 1.
3. **Evaluation of `time` under reduced-motion.** The OS "prefers
   reduced motion" signal already pauses the main canvas. Should
   bindings whose expression references `time` auto-freeze? Propose:
   yes — honour the `usePauseSystem.isPaused` flag in the sampler,
   not in each expression. Behaviour is consistent with
   FPSCounter + PauseButton today.
4. **Effect-parameter modulation.** v1.1 modulates `BladeConfig`
   fields that effects read *through* `effectContext.config`. Direct
   modulation of per-effect params (e.g. "BlastEffect's radius on
   this specific trigger") would need the binding to be effect-scoped.
   Deferred — no UI need yet.
5. **Modulation in timeline cues.** ETC Eos cue-list view (item #11
   in `NEXT_SESSIONS.md`) — should cues be able to carry their own
   bindings that apply only while the cue is running? Propose: yes,
   as `TimelineCue.modulation?: ModulationPayload` — same schema,
   scoped lifetime. Revisit with timeline sprint.

---

_End of v1.1 design draft._ Implementation goes in the Phase 1 sprint
once this doc stabilises.
