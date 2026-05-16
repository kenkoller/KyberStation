# Multi-Board Field Coverage — Proffie (compile-flash + runtime) — Agent B1

**Date:** 2026-05-16
**Source of truth:** `packages/engine/src/types.ts` `BladeConfig` interface (741 LoC)
**Emitters audited:**
- Compile-flash: `packages/codegen/src/ConfigBuilder.ts` + `packages/codegen/src/ASTBuilder.ts` + `packages/codegen/src/CodeEmitter.ts`
- Runtime: `packages/codegen/src/emitters/ProffieRuntimeEmitter.ts`
**Companion doc:** `docs/research/EMIT_PARSER_AUDIT.md`
**Auditor:** B1

## Field count verified

**Total BladeConfig fields enumerated:** 91 named fields on the `BladeConfig` interface (plus the `[key: string]: unknown` escape hatch).

Breakdown by category (matching the inline `// ──` headers in `types.ts`):

| Category | Field count |
|---|---|
| Core (name, primary colors, style/ignition/retraction, timing, shimmer, ledCount, hiltId) | 14 |
| Import Preservation | 5 |
| Spatial Lockup (Edit Mode) | 8 |
| Preon | 3 |
| Spatial Blast | 2 |
| Style-specific (gradient/edge/interpolation) | 3 |
| Blade painting (colorPositions) | 1 |
| Noise Parameters | 5 |
| Motion Reactivity | 6 |
| Color Dynamics | 5 |
| Spatial Pattern | 5 |
| Blend & Layer | 3 |
| Tip & Emitter | 5 |
| Image Scroll | 6 |
| Dual-Mode Ignition | 6 |
| Ignition/Retraction Parameters | 9 |
| Effect Customization | 7 |
| Custom Ignition Curve | 2 |
| Blade Hardware | 3 |
| **TOTAL** | **91** |

Plus untyped escape-hatch fields used by the AST builder via `(config.X as Y)` casts:
`flickerRate`, `flickerMinBright`, `tempoBpm`, `tempoDepth`, `modulation`. These are not in
the canonical interface but are consumed during emit.

## How to read this matrix

- **PRESERVED** — field reaches the output in parseable form. Encoding noted.
- **LOSSY** — field is dropped, truncated, or quantized below useful resolution.
- **DROPPED** — field is silently ignored by the emitter. Distinct from LOSSY because the
  field's purpose may be covered by another mechanism (engine-runtime, snapshot bake-in via
  modulation, etc.).
- **N/A** — field doesn't apply to this emitter path (e.g., import-preservation metadata
  has no place in `presets.ini`).
- **UNVERIFIED** — emitter doesn't reference the field and intent isn't covered elsewhere.

## Coverage matrix

### Core fields

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `name` | `string?` | DROPPED at `BladeConfig` level — preset name is sourced from `PresetEntry.presetName` at the ConfigBuilder layer | PRESERVED via `name=<presetName>` (sourced from `BoardEmitOptions.presetName`) | Both paths route through a separate "preset" envelope; the engine `BladeConfig.name` field is informational only. |
| `baseColor` | `RGB` | PRESERVED as `Rgb<R,G,B>` literal at compile time; C++ `Color16(Color8(R,G,B))` auto-scales × 257 in `common/color.h:191` | Phase A: DROPPED (style=builtin N M only references factory bank). Phase C: PRESERVED in slots 1/2/3 of `advanced` verb as 16-bit Color16 (× 257 scaling per commit `45737f2`, `styles/rgb_arg.h:41`) | The smoking-gun fix doc. Phase A blades inherit factory-firmware base color. |
| `clashColor` | `RGB` | PRESERVED as `Rgb<>` arg to `SimpleClashL<>` (ASTBuilder.ts:918) | Phase A: DROPPED. Phase C: PRESERVED in slot 8 of `advanced` verb, 16-bit-scaled | |
| `lockupColor` | `RGB` | PRESERVED as `Rgb<>` arg to `AudioFlickerL<>` wrapped by `LockupTrL<>`/`ResponsiveLockupL<>` (ASTBuilder.ts:961, 974) | Phase A: DROPPED. Phase C: PRESERVED in slot 7 of `advanced` verb (AudioFlicker partner), 16-bit-scaled | |
| `blastColor` | `RGB` | PRESERVED as `Rgb<>` arg to `BlastL<>` (ASTBuilder.ts:901, 912) | Phase A: DROPPED. Phase C: PRESERVED in slot 6 of `advanced` verb, 16-bit-scaled | |
| `dragColor` | `RGB?` | PRESERVED as `Rgb<>` arg to drag `LockupTrL<>`. Defaults to `{r:255,g:150,b:0}` when undefined (ASTBuilder.ts:986) | DROPPED. No slot in `advanced` verb signature. | The `advanced` verb's 11-slot signature has no drag slot. |
| `meltColor` | `RGB?` | PRESERVED as `Rgb<>` arg to melt `LockupTrL<>` Mix. Defaults to `{r:255,g:200,b:0}` (ASTBuilder.ts:1037) | DROPPED. No slot in `advanced` verb. | |
| `lightningColor` | `RGB?` | PRESERVED as `Rgb<>` arg to lightning-block `LockupTrL<>` `Stripes<>`. Defaults to `{r:100,g:100,b:255}` (ASTBuilder.ts:1016) | DROPPED. No slot in `advanced` verb. | |
| `style` | `string` | PRESERVED via the giant `switch(config.style)` in `buildBaseStyle()` (ASTBuilder.ts:128) — maps to one of ~30 ProffieOS template families. 32/33 KyberStation styles have native parity per `deliverability.ts:328`. `automata` (Rule 30) falls back to stable. | DROPPED in both Phase A (factory firmware decides) and Phase C (`advanced` is a fixed `Layers<InOutSparkTipX<...>>` template — only colors transfer, not the algorithm). | |
| `ignition` | `string` | PRESERVED via `ignitionFromID()` lookup in transitionMap (ASTBuilder.ts:1125). 19 ignition animations. | DROPPED. Phase C uses fixed `InOutSparkTipX` ignition. | |
| `retraction` | `string` | PRESERVED via `retractionFromID()` (ASTBuilder.ts:1146). 13 retraction animations. | DROPPED. Phase C uses fixed retraction shape. | |
| `ignitionMs` | `number` | PRESERVED as `Int<N>` arg to the ignition transition (raw ms) | Phase A: DROPPED. Phase C: PRESERVED in slot 9 of `advanced` verb (extension time, raw ms) | |
| `retractionMs` | `number` | PRESERVED as `Int<N>` arg to the retraction transition (raw ms) | Phase A: DROPPED. Phase C: PRESERVED in slot 10 of `advanced` verb (raw ms) | |
| `ignitionEasing` | `EasingConfig?` | UNVERIFIED — emitter doesn't reference this field. Engine evaluates the easing curve when computing per-LED visibility; codegen emits a static `Int<ms>` and lets ProffieOS run its built-in easing (which differs from KyberStation's bezier evaluator). | N/A | Per-frame curve shape is not representable in a ProffieOS template — this is engine-runtime-only. Visualizer ≠ hardware here. |
| `retractionEasing` | `EasingConfig?` | UNVERIFIED — same as above | N/A | Same caveat. |
| `shimmer` | `number` | LOSSY — declared as deliverable per `deliverability.ts:335` ("emitted as AudioFlicker<>/HumpFlicker<> intensity") but the `buildBaseStyle()` switch does NOT inspect `config.shimmer`. Constants like `16384` are hardcoded in stable's AudioFlicker. **The `shimmer` field is dropped silently in ASTBuilder.** | DROPPED — no slot in `advanced` verb | Discrepancy between deliverability claim and actual emitter behavior. Likely a stale deliverability claim from earlier code. |
| `ledCount` | `number` | DROPPED at config level — LED count flows through `ConfigOptions.bladeConfig[].ledCount` (a separate hardware envelope), not `BladeConfig.ledCount`. The `maxLedsPerStrip` value at ConfigBuilder.ts:111 is the global cap (default 144). | DROPPED | Hardware fact written into `WS281XBladePtr<N, ...>` instantiation, not into the per-preset style. |
| `hiltId` | `string?` | DROPPED — explicitly documented as display-side-only (types.ts:367-369). Used by Saber Card renderer + MiniSaber gallery, not by codegen. | DROPPED | Intentional drop per documentation. |

### Import Preservation

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `importedRawCode` | `string?` | PRESERVED via early-return in `generateStyleCode()` (index.ts:193-198) — emits raw code verbatim with a provenance header comment, skipping AST build entirely. | DROPPED — runtime emitter takes no `importedRawCode` path. Phase C still emits `advanced ...` from BladeConfig fields. | The runtime path always reconstructs from fields; raw-code preservation is a compile-flash-only feature. |
| `importedAt` | `number?` | PRESERVED via the provenance header (index.ts:316) | DROPPED | Display metadata. |
| `importedSource` | `string?` | PRESERVED via the provenance header (index.ts:289) | DROPPED | Display metadata. |
| `altPhaseColors` | `RGB[]?` | UNVERIFIED — parser sets it (`ConfigReconstructor.ts:1307`) but emitter doesn't consume it. Lost on round-trip if user "Convert to native" — current `baseColor` survives, alt phases are silently dropped. | DROPPED | **Round-trip data loss risk** when users import a Fett263 ColorChange preset and click "Convert to native". |
| `detectedEffectIds` | `string[]?` | UNVERIFIED — parser sets it (`ConfigReconstructor.ts:1308`) but emitter doesn't consume it. Display-only banner; no emit impact. | DROPPED | Display metadata. |

### Spatial Lockup (Edit Mode)

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `lockupPosition` | `number?` | PRESERVED — when defined, switches from `LockupTrL<>` to `ResponsiveLockupL<>` with TOP/BOTTOM/SIZE args via `positionToProffie()` × 32768 quantization (ASTBuilder.ts:947-968) | DROPPED | LOSSY at single-LED resolution: 0-1 float → 0-32768 int. Sub-LED for 144-LED blades (227 steps/LED). Negligible loss. |
| `lockupRadius` | `number?` | PRESERVED — `positionToProffie()` quantization. Default 0.12. | DROPPED | Same quantization story. |
| `dragPosition` | `number?` | PRESERVED via `AlphaL<LockupTrL<>, Bump<pos, size>>` wrapper (ASTBuilder.ts:995-1010). When undefined, emits non-positional drag. | DROPPED | |
| `dragRadius` | `number?` | PRESERVED. Default 0.15. | DROPPED | |
| `meltPosition` | `number?` | PRESERVED via `AlphaL<LockupTrL<>, Bump<>>` wrapper (ASTBuilder.ts:1063-1078). | DROPPED | |
| `meltRadius` | `number?` | PRESERVED. Default 0.18. | DROPPED | |
| `stabPosition` | `number?` | PRESERVED via `TransitionEffectL<TrConcat<TrInstant, AlphaL<Rgb, Bump<pos,size>>, TrFade<200>>, EFFECT_STAB>` (ASTBuilder.ts:859-886). Emits stab layer only when set. | DROPPED | The stab layer is opt-in — undefined means no stab emission. |
| `stabRadius` | `number?` | PRESERVED. Default 0.2. | DROPPED | |

### Preon (ProffieOS 7+)

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `preonEnabled` | `boolean?` | PRESERVED as gate — when true, emits `TransitionEffectL<TrConcat<TrInstant, Rgb<preonColor>, TrFade<preonMs>>, EFFECT_PREON>` (ASTBuilder.ts:834-851) | DROPPED — no preon slot in `advanced` verb | Compile-flash only. |
| `preonColor` | `RGB?` | PRESERVED. Defaults to `baseColor`. | DROPPED | |
| `preonMs` | `number?` | PRESERVED as raw ms. Default 300. | DROPPED | |

### Spatial Blast

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `blastPosition` | `number?` | PRESERVED — when set, emits `AlphaL<BlastL<>, Bump<pos, waveSize>>` (ASTBuilder.ts:894-909). When undefined, emits bare `BlastL<>` (byte-identical to pre-v0.3.0 output). | DROPPED | |
| `blastRadius` | `number?` | PRESERVED. Default 0.5. | DROPPED | |

### Style-specific gradient/edge

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `gradientEnd` | `RGB?` | PRESERVED — consumed by gradient/photon/painted/imageScroll styles in `buildBaseStyle()`. Falls back to `brighten(baseColor, 0.4)` when undefined. | DROPPED | |
| `edgeColor` | `RGB?` | PRESERVED — consumed by plasma/vortex styles in `buildBaseStyle()`. Falls back to `brighten(baseColor, 0.5)` when undefined. | DROPPED | |
| `gradientInterpolation` | `'linear'\|'smooth'\|'step'?` | UNVERIFIED — emitter doesn't reference this. ProffieOS `Gradient<>` template is linear-only on hardware; smooth/step variants are engine-only. | N/A | Visualizer-only field — no ProffieOS equivalent. Hardware-fidelity gap. |

### Blade painting

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `colorPositions` | `Array<{position, color, width}>?` | PRESERVED for `style: 'painted'` — sorted by position, emitted as multi-stop `Gradient<Rgb, Rgb, ...>` (ASTBuilder.ts:435-448). **LOSSY:** `width` is silently dropped (Gradient<> only stores stop colors, not widths). Position values are dropped too (Gradient<> evenly distributes stops). | DROPPED | Painted mode is significantly lossy in compile-flash: only colors survive, in their input order. |

### Noise Parameters

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `noiseScale` | `number?` | DROPPED — emitter never reads | DROPPED | Engine-runtime only. No ProffieOS template approximation in current codegen. |
| `noiseSpeed` | `number?` | DROPPED | DROPPED | Same. |
| `noiseOctaves` | `number?` | DROPPED | DROPPED | Same. |
| `noiseTurbulence` | `number?` | DROPPED | DROPPED | Same. |
| `noiseIntensity` | `number?` | DROPPED | DROPPED | Same. |

All 5 noise fields are visualizer-only. Worth a hardware-fidelity flag.

### Motion Reactivity

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `motionSwingSensitivity` | `number?` | DROPPED | DROPPED | Engine-runtime only. The compile-flash path uses ProffieOS's built-in `SwingSpeed<400>` semantic (400ms decay window) which is fixed in the templates. |
| `motionAngleInfluence` | `number?` | DROPPED | DROPPED | Same. ProffieOS `BladeAngle<>` is parameterless in current emits. |
| `motionTwistResponse` | `number?` | DROPPED | DROPPED | Same. |
| `motionSmoothing` | `number?` | DROPPED | DROPPED | Same. |
| `motionSwingColorShift` | `RGB?` | DROPPED | DROPPED | Same. |
| `motionSwingBrighten` | `number?` | DROPPED | DROPPED | Same. |

All 6 motion-reactivity fields are visualizer-only knobs.

### Color Dynamics

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `colorHueShiftSpeed` | `number?` | DROPPED | DROPPED | Engine-only. ProffieOS `RotateColorsX<>` would be the partial analog but isn't emitted. |
| `colorSaturationPulse` | `number?` | DROPPED | DROPPED | Engine-only. |
| `colorBrightnessWave` | `number?` | DROPPED | DROPPED | Engine-only. |
| `colorFlickerRate` | `number?` | DROPPED | DROPPED | Engine-only. (Note: a separate untyped `flickerRate` field IS consumed by `sithFlicker` style at ASTBuilder.ts:244 — different field name.) |
| `colorFlickerDepth` | `number?` | DROPPED | DROPPED | Engine-only. |

All 5 color-dynamics fields are visualizer-only.

### Spatial Pattern

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `spatialWaveFrequency` | `number?` | DROPPED | DROPPED | Engine-only. |
| `spatialWaveSpeed` | `number?` | DROPPED | DROPPED | Engine-only. |
| `spatialDirection` | `LayerDirection?` | DROPPED | DROPPED | Direction lives in `LayerConfig`, not flattened to template. |
| `spatialSpread` | `number?` | DROPPED | DROPPED | Engine-only. |
| `spatialPhase` | `number?` | DROPPED | DROPPED | Engine-only. |

All 5 spatial-pattern fields are visualizer-only.

### Blend & Layer

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `blendSecondaryStyle` | `string?` | DROPPED — emitter ignores | DROPPED | Visualizer-only multi-style blending. |
| `blendSecondaryAmount` | `number?` | DROPPED | DROPPED | Same. |
| `blendMaskType` | `'none'\|'gradient'\|'noise'\|'wave'?` | DROPPED | DROPPED | Same. |

Note: the legacy top-level `blendMode` field is documented as retired (types.ts:484-491). Not present in current interface.

### Tip & Emitter

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `tipColor` | `RGB?` | DROPPED — `buildBaseStyle()` doesn't reference. (Phase C runtime DOES emit a `sparkTipColor`, but that's a different concept.) | DROPPED | Worth investigating: could feed into the `advanced` verb's slot 11 (spark-tip color), but currently unwired. |
| `tipLength` | `number?` | DROPPED | DROPPED | Engine-only. |
| `tipFade` | `number?` | DROPPED | DROPPED | Engine-only. |
| `emitterFlare` | `number?` | DROPPED | DROPPED | Engine-only. |
| `emitterFlareWidth` | `number?` | DROPPED | DROPPED | Engine-only. |

### Image Scroll

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `imageData` | `Uint8Array?` | PRESERVED via `style: 'imageScroll'` path — samples 12 evenly-spaced columns at the midrow and emits as multi-stop `Gradient<>` (ASTBuilder.ts:410-433). **LOSSY:** quantized from full image (W×H pixels) to 12 colors, single row sampled, no time dimension. | DROPPED | Significant lossy compression. Documentation: "scroll" isn't actually emitted — the multi-stop gradient is static. |
| `imageWidth` | `number?` | PRESERVED (used for sampling indexing) | DROPPED | |
| `imageHeight` | `number?` | PRESERVED (used for midrow calc) | DROPPED | |
| `scrollSpeed` | `number?` | DROPPED — no time-domain in the emitted `Gradient<>` | DROPPED | LOSSY: scroll animation is lost on emit. |
| `scrollDirection` | `'left-to-right'\|'right-to-left'\|'bidirectional'?` | DROPPED | DROPPED | LOSSY. |
| `scrollRepeatMode` | `'once'\|'loop'\|'pingpong'?` | DROPPED | DROPPED | LOSSY. |

**The entire image-scroll temporal dimension is dropped.** Users will see scrolling in the visualizer but a static gradient on hardware.

### Dual-Mode Ignition

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `dualModeIgnition` | `boolean?` | PRESERVED as a gate at ASTBuilder.ts:1108-1124 — when true, emits `TrSelect<BladeAngle<>, downTransition, upTransition>` instead of a single transition. | DROPPED | |
| `ignitionUp` | `string?` | PRESERVED — consumed by the `TrSelect` branch. Falls back to `config.ignition`. | DROPPED | |
| `ignitionDown` | `string?` | PRESERVED — same. | DROPPED | |
| `ignitionAngleThreshold` | `number?` | UNVERIFIED — emitter doesn't reference it. ProffieOS `TrSelect<BladeAngle<>, ...>` uses ProffieOS's default angle threshold (a Fett263 prop-file `#define`), not this per-blade value. | DROPPED | LOSSY: threshold is dropped silently. |
| `retractionUp` | `string?` | PRESERVED — consumed by `buildRetractionTransition()` at ASTBuilder.ts:1129-1145 | DROPPED | |
| `retractionDown` | `string?` | PRESERVED — same. | DROPPED | |

### Ignition/Retraction Parameters

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `stutterFullExtend` | `boolean?` | UNVERIFIED — emitter doesn't reference. Visualizer-only? | DROPPED | |
| `stutterCount` | `number?` | UNVERIFIED | DROPPED | |
| `stutterAmplitude` | `number?` | UNVERIFIED | DROPPED | |
| `glitchDensity` | `number?` | UNVERIFIED | DROPPED | |
| `glitchIntensity` | `number?` | UNVERIFIED | DROPPED | |
| `sparkSize` | `number?` | UNVERIFIED | DROPPED | |
| `sparkTrail` | `number?` | UNVERIFIED | DROPPED | |
| `wipeSoftness` | `number?` | UNVERIFIED | DROPPED | |
| `shatterScale` | `number?` | UNVERIFIED | DROPPED | |
| `shatterDimSpeed` | `number?` | UNVERIFIED | DROPPED | |

All 10 ignition/retraction params likely visualizer-only — the transition map (`transitionMap.ts`) translates ignition IDs to ProffieOS templates with hardcoded numeric args (no per-saber knobs).

### Effect Customization

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `clashLocation` | `number?` | UNVERIFIED — emitter emits `SimpleClashL<Rgb, 40>` with hardcoded `40` width (ASTBuilder.ts:918). The location field is not consumed. | DROPPED | LOSSY: user's clash location preference is ignored. ProffieOS `ResponsiveClashL<>` accepts top/bottom/size args; consider routing. |
| `clashIntensity` | `number?` | UNVERIFIED — hardcoded `40` width arg in `SimpleClashL` is the closest thing | DROPPED | LOSSY: intensity preference dropped. |
| `unstableKylo` | `boolean?` | PRESERVED — when true, emits a second `SimpleClashL<White, 60>` overlay (ASTBuilder.ts:931-940). | DROPPED | Compile-flash only. |
| `clashDecay` | `number?` | DROPPED — engine-only (modulation sampler uses it; no ProffieOS analog). | DROPPED | Documented as runtime engine knob. |
| `blastCount` | `number?` | UNVERIFIED — `BlastL<>` doesn't take a count arg in current emit | DROPPED | LOSSY. |
| `blastSpread` | `number?` | UNVERIFIED — `Bump<>` width is set from `blastRadius`, not `blastSpread`. **Field name conflict / drop:** users editing `blastSpread` will not see hardware change. | DROPPED | **Bug risk:** dual-named field (`blastRadius` vs `blastSpread`) — the latter appears unwired. |
| `stabDepth` | `number?` | UNVERIFIED — `stabRadius` is what feeds `Bump<>` (ASTBuilder.ts:861) | DROPPED | Similar dual-named field concern. |

### Custom Ignition Curve

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `ignitionCurve` | `[number, number, number, number]?` | DROPPED — emitter emits an `Int<ms>` arg to the transition template; bezier curve shape is not representable in standard ProffieOS templates | DROPPED | LOSSY: per-frame curve shape is engine-only. Same issue as `ignitionEasing`. |
| `retractionCurve` | `[number, number, number, number]?` | DROPPED | DROPPED | Same. |

### Blade Hardware

| Field | Type | Proffie (compile-flash) | Proffie (runtime) | Notes |
|---|---|---|---|---|
| `stripType` | `'single'\|...\|'penta-cree'?` | DROPPED at `BladeConfig` level — strip topology flows through `ConfigOptions.bladeConfig[]` envelope, not the per-preset config. | DROPPED | Hardware fact, not per-preset. |
| `bladeType` | `'neopixel'\|'in-hilt-led'?` | DROPPED at `BladeConfig` level — same envelope split. | DROPPED | Same. |
| `customLedCount` | `number\|null?` | DROPPED at `BladeConfig` level — flows through hardware envelope. | DROPPED | Same. |

### Untyped escape-hatch fields actually consumed

| Field | Consumed by | Encoding |
|---|---|---|
| `flickerRate` | `style: 'sithFlicker'` (ASTBuilder.ts:244) | `periodMs = 1000 / rate` → `Sin<Int<periodMs>>` |
| `flickerMinBright` | `style: 'sithFlicker'` (ASTBuilder.ts:246) | × 32768 → `Int<>` floor arg |
| `tempoBpm` | `style: 'tempoLock'` (ASTBuilder.ts:317) | `periodMs = 60000 / bpm` → `Sin<Int<periodMs>>` |
| `tempoDepth` | `style: 'tempoLock'` (ASTBuilder.ts:318) | × 32768 → `Int<>` floor arg |
| `modulation` | `generateStyleCode()` (index.ts:201-267) | Two paths: live bindings via `composeBindings` (ProffieOS templates), snapshot bake-in via `applyModulationSnapshot` (static values written back into config fields, then re-AST-built) |

These are NOT in the canonical `BladeConfig` interface but are operationally part of the contract. **Risk:** if a future refactor removes the `[key: string]: unknown` escape hatch, these silently break.

## Systemic findings

1. **Compile-flash path is broad but lossy in the temporal/parametric domain.** Of the 91 `BladeConfig` fields, ~40 are PRESERVED in compile-flash. The vast majority of the DROPPED fields fall into 3 families:
   - **Visualizer-only "feel" knobs** (`motion*`, `noise*`, `color*Dynamics`, `spatial*`, `blend*Secondary`, `tip*`, `emitterFlare*`) — 25+ fields with no ProffieOS template analog. These are intentionally engine-runtime-only per the `HARDWARE_FIDELITY_PRINCIPLE.md` doc but the lack of an emitter-side warning is a hidden gap.
   - **Effect customization micro-knobs** (`clashLocation`, `clashIntensity`, `blastCount`, `blastSpread`, `stabDepth`, `glitchDensity`, etc.) — all UNVERIFIED, all likely intended for hardware but currently silently dropped.
   - **Time-domain features** (`imageScroll` direction/speed/repeat, `ignitionCurve`/`retractionCurve` bezier, `ignitionEasing`/`retractionEasing`) — ProffieOS templates can't represent arbitrary per-frame curves, so these necessarily drop.

2. **Runtime emitter is extremely narrow.** Phase A delivers 5 knobs (`name`, `font`, `track`, `order`, `variation`). Phase C adds 7 more (4 colors + 2 times + style-algorithm-stub). The remaining ~80 BladeConfig fields are DROPPED in both phases. The `deliverability.ts` table accurately reflects this — it's not a hidden gap, it's a documented one.

3. **Field-naming conflicts hide drops.** `blastSpread` vs `blastRadius`, `stabDepth` vs `stabRadius` — the emitter consumes the second of each pair; the first appears in BladeConfig but is unwired. Users editing the first will see no hardware change. Same pattern with `colorFlickerRate` (engine-only) vs `flickerRate` (consumed by sithFlicker). These dual-named fields are bug-traps.

4. **The hardware-fidelity gap is largest in painted/imageScroll modes.** Both modes drop critical data (per-stop widths/positions, all time-domain image data) on emit. Visualizer ≠ hardware in a way that's not surfaced in any banner.

## High-priority LOSSY findings

1. **`shimmer` (Core)** — declared as PRESERVED in `deliverability.ts:335` but **NOT actually consumed** by `buildBaseStyle()`. Constants like `Int<16384>` are hardcoded in stable's AudioFlicker. Either deliverability claim is stale, or the field should flow into the AudioFlicker mix amount. **Action:** decide which is correct and align.

2. **`colorPositions[].width` and `colorPositions[].position`** — `painted` style only emits stop colors in input order, dropping per-stop width and quantized-to-Gradient<> position. Significant visual divergence between visualizer and hardware.

3. **`imageData` + the entire `scroll*` family** — `imageScroll` emits a static 12-stop `Gradient<>` from a single image row. All time-domain (scrollSpeed, direction, repeat) is dropped. The hardware blade does not actually scroll.

4. **`blastSpread`, `stabDepth`, `clashLocation`, `clashIntensity`** — Effect Customization fields appear in the interface but the emitter uses different field names (`blastRadius`, `stabRadius`) or hardcoded values. **Field-name drift bug class.**

5. **`ignitionAngleThreshold`** — Dual-mode ignition emits `TrSelect<BladeAngle<>, ...>` without the per-saber threshold. ProffieOS uses its compiled-in default, ignoring the user's preference.

6. **`ignitionEasing`, `retractionEasing`, `ignitionCurve`, `retractionCurve`** — bezier curve shape lost on emit. Hardware uses ProffieOS's built-in ease, which differs from KyberStation's bezier evaluator. Visualizer ≠ hardware.

7. **`altPhaseColors`** — parser extracts them from imported `ColorChange<>` wrappers; emitter doesn't put them back. Round-trip data loss when "Convert to native" is clicked on a multi-phase imported preset.

## UNVERIFIED items needing follow-up trace

These fields are not referenced by `ASTBuilder.ts` / `ConfigBuilder.ts` / `ProffieRuntimeEmitter.ts`, but their intent isn't conclusively engine-only:

1. **`stutterFullExtend`, `stutterCount`, `stutterAmplitude`** — Stutter ignition exists in the transition map. Worth checking if `transitionMap.ts` accepts these as params or if they're truly engine-only.
2. **`glitchDensity`, `glitchIntensity`** — Glitch ignition. Same question.
3. **`sparkSize`, `sparkTrail`** — Spark ignition. Same question.
4. **`wipeSoftness`** — Wipe ignition. Same question.
5. **`shatterScale`, `shatterDimSpeed`** — Shatter ignition. Same question.
6. **`clashLocation`, `clashIntensity`** — Could plausibly map to `ResponsiveClashL<color, top, bottom, size>` instead of the current `SimpleClashL<color, 40>`. Worth a feature trace.
7. **`blastCount`, `blastSpread`** — `BlastL<>` doesn't take count/spread args, but the wider `Blast<>` family might. Could be unwired due to template-coverage gap.
8. **`stabDepth`** — Wired field is `stabRadius`; check if `stabDepth` is intended as a depth-axis (along blade) vs `stabRadius` (radial extent). Field names suggest different semantics — possible feature ambiguity.
9. **`tipColor`** — Phase C `advanced` verb has slot 11 (`sparkTipColor`). Currently fed from a stub. Wiring `BladeConfig.tipColor` here would surface real tip-color control in runtime presets without firmware changes.
10. **`gradientInterpolation`** — `smooth` and `step` modes have no ProffieOS analog; `linear` is native. Worth a hardware-fidelity audit pass to either emit a warning or quietly coerce.

## Follow-up actions (recommended priorities)

1. **(P1) Decide & fix `shimmer`.** Either remove its "deliverable" claim from `deliverability.ts`, or wire it into the AudioFlicker mix amount in compile-flash. Mismatch between docs and behavior is the highest-leverage bug class to fix.
2. **(P1) Investigate `blastSpread` / `stabDepth` / `clashLocation` / `clashIntensity` field drops.** These have UI surfaces but no emitter wiring. Either remove the UI (don't ship dead knobs) or wire them through to `ResponsiveClashL<>` / `BlastL<>` parameterization.
3. **(P2) Wire `tipColor` → Phase C slot 11.** Free deliverability win for runtime presets.
4. **(P2) Wire `altPhaseColors` round-trip.** Emit `ColorChange<>` or `ColorSelect<>` wrapper when present; preserves Fett263 import fidelity through "Convert to native".
5. **(P3) Add hardware-fidelity banner for `imageScroll` / `painted`.** Static-on-hardware vs animated-in-visualizer mismatch is currently silent.
6. **(P3) Audit the 10 ignition/retraction params** (`stutter*`, `glitch*`, `spark*`, `wipeSoftness`, `shatter*`) to confirm engine-only vs wireable.
