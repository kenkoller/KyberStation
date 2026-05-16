# Multi-Board Field Coverage — Canonical Matrix

**Date:** 2026-05-16
**Status:** Canonical. Supersedes the two partial reports (`_B1_proffie.md`, `_B2_xeno-cfx-gh.md`) — those remain on disk as the evidence trail.
**Source of truth:** `packages/engine/src/types.ts` `BladeConfig` interface (lines 344–568).
**Companion doc:** [`docs/research/EMIT_PARSER_AUDIT.md`](./EMIT_PARSER_AUDIT.md) — encoding-layer contracts at every emit→parser boundary.

## Field count verified

**Canonical count: 103 named `BladeConfig` fields**, plus the `[key: string]: unknown` indexer
escape hatch used by AST-builder extras (`flickerRate`, `flickerMinBright`, `tempoBpm`,
`tempoDepth`, `modulation`) and Xenopixel-only extras (`xenoInTimeMs`, `xenoOutTimeMs`,
`xenoCustomFunction`).

B1's prior count of 91 missed several Effect Customization / Tip & Emitter / Image Scroll /
Spatial Lockup fields. B2's prior count of ~98 missed a handful in the Ignition/Retraction
Parameters / Color Dynamics blocks. The canonical extraction (sorted unique field-line scan
of lines 344-568) gives **103** unique top-level field names — used as the authoritative
count for this matrix.

Breakdown by category (matching the inline `// ──` headers in `types.ts`):

| Category | Field count |
|---|---|
| Core identity / colors (`name`, base/clash/lockup/blast/drag/melt/lightning, `hiltId`) | 9 |
| Style / ignition / retraction core | 7 (`style`, `ignition`, `retraction`, `ignitionMs`, `retractionMs`, `ignitionEasing`, `retractionEasing`) |
| Visual core (`shimmer`, `ledCount`) | 2 |
| Import Preservation | 5 |
| Spatial Lockup (Edit Mode) | 8 |
| Preon | 3 |
| Spatial Blast | 2 |
| Style-specific (gradient/edge/interpolation) | 3 |
| Blade painting (`colorPositions`) | 1 |
| Noise Parameters | 5 |
| Motion Reactivity | 6 |
| Color Dynamics | 5 |
| Spatial Pattern | 5 |
| Blend & Layer | 3 |
| Tip & Emitter | 5 |
| Image Scroll | 6 |
| Dual-Mode Ignition | 6 |
| Ignition/Retraction Parameters | 10 |
| Effect Customization | 7 |
| Custom Ignition Curve | 2 |
| Blade Hardware | 3 |
| **TOTAL** | **103** |

Plus untyped escape-hatch fields used by the AST builder via `(config.X as Y)` casts that
are operationally part of the contract but not in the canonical interface:
`flickerRate`, `flickerMinBright`, `tempoBpm`, `tempoDepth`, `modulation`. These could
silently break if the `[key: string]: unknown` indexer were ever removed.

## How to read this matrix

- **PRESERVED** — field reaches the output in parseable form. Encoding noted.
- **LOSSY** — field is dropped, truncated, quantized, or mapped imperfectly.
- **DROPPED** — field is silently ignored by the emitter. Distinct from LOSSY because the
  field's purpose may be covered by another mechanism (engine-runtime, snapshot bake-in
  via modulation, etc.).
- **N/A (vendor design-only)** — CFX/GH output is design-reference text, not flashable.
  Marked when the field IS surfaced in the output text as a note.
- **N/A (not in board)** — board firmware has no concept of this field.
- **N/A (no emit slot)** — Proffie runtime `advanced` verb has a fixed 11-slot signature
  with no place for this field.
- **UNVERIFIED** — emitter doesn't reference the field and intent isn't conclusively
  established by either audit pass.

**Emitter audit paths:**

- **Proffie compile-flash:** `packages/codegen/src/ConfigBuilder.ts` + `ASTBuilder.ts` +
  `CodeEmitter.ts` — emits full C++ `config.h` for Arduino IDE compile + flash.
- **Proffie runtime (Phase A):** `packages/codegen/src/emitters/ProffieRuntimeEmitter.ts`
  — emits `style=builtin N M` referencing factory-firmware bank.
- **Proffie runtime (Phase C):** same emitter, `advanced` verb path — emits
  `style=advanced R,G,B,…` with 11-slot color + timing args.
- **Xenopixel V3:** `apps/web/lib/zipExporter.ts` inline `generateXenoFontConfig` /
  `generateXenoGlobalConfig`. **Note:** the `packages/codegen/src/emitters/XenopixelEmitter.ts`
  class exists in parallel but is **dormant code** — see Critical Structural Findings below.
- **CFX:** `apps/web/lib/zipExporter.ts` inline `generateCfxMainConfig`. Design-reference
  text only, not flashable.
- **Golden Harvest:** `apps/web/lib/zipExporter.ts` inline `generateGoldenHarvestConfig`.
  Design-reference text only, not flashable.

## Coverage matrix

### Core identity / colors

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `name` | `string?` | Identity | DROPPED at `BladeConfig` level — preset name sourced from `PresetEntry.presetName` upstream | PRESERVED via `name=<presetName>` line | PRESERVED — same | LOSSY — folder index is `${i+1}`; `fontconfig.ini` has no name field, only ZIP folder name survives via `preset.name` (NOT `config.name`) | N/A (design-ref) — `name=` in `[profile{i}]` | N/A (design-ref) — `Name=` in `[Preset{i}]` | Both Proffie paths route via a separate "preset" envelope. |
| `baseColor` | `RGB` | Identity | PRESERVED as `Rgb<R,G,B>` literal — C++ `Color16(Color8(R,G,B))` auto-scales × 257 (`common/color.h:191`) | DROPPED (factory bank decides) | PRESERVED in slot 1/2/3 of `advanced` verb as 16-bit Color16 (× 257 scaling per commit `45737f2`, `styles/rgb_arg.h:41`) | PRESERVED — `font{N}=(R,G,B),...` in `fontconfig.ini`, 0-255 native | N/A (design-ref) — hex `#RRGGBB` or `R;G;B` 0-255 | N/A (design-ref) — hex `#RRGGBB` 0-255 | The smoking-gun bug doc. Phase A blades inherit factory base color. Xenopixel native 8-bit (no scaling bug like Proffie's RgbArg). |
| `clashColor` | `RGB` | Identity | PRESERVED as `Rgb<>` arg to `SimpleClashL<>` (ASTBuilder.ts:918) | DROPPED | PRESERVED in slot 8 of `advanced` verb, 16-bit-scaled | DROPPED — Xenopixel `flash_on_clash` is global only; no per-preset clash color | N/A (design-ref) — emitted as `clashcolor=` for user reference | N/A (design-ref) — emitted as `ClashColor=` for user reference | Xenopixel discards per-preset clash hue entirely. |
| `lockupColor` | `RGB` | Identity | PRESERVED as `Rgb<>` arg to `AudioFlickerL<>` wrapped by `LockupTrL<>`/`ResponsiveLockupL<>` (ASTBuilder.ts:961, 974) | DROPPED | PRESERVED in slot 7 (AudioFlicker partner), 16-bit-scaled | DROPPED — Xenopixel hardcodes `lockupLight=0` | N/A (design-ref) | N/A (design-ref) | |
| `blastColor` | `RGB` | Identity | PRESERVED as `Rgb<>` arg to `BlastL<>` (ASTBuilder.ts:901, 912) | DROPPED | PRESERVED in slot 6, 16-bit-scaled | DROPPED — Xenopixel `blasterLight` (0-2) is a global enum, not a color | N/A (design-ref) | N/A (design-ref) | |
| `dragColor` | `RGB?` | Identity | PRESERVED as `Rgb<>` arg to drag `LockupTrL<>`. Default `{r:255,g:150,b:0}` (ASTBuilder.ts:986) | DROPPED | DROPPED — no slot in `advanced` verb | DROPPED | DROPPED | DROPPED | |
| `meltColor` | `RGB?` | Identity | PRESERVED as `Rgb<>` arg to melt `LockupTrL<>` Mix. Default `{r:255,g:200,b:0}` (ASTBuilder.ts:1037) | DROPPED | DROPPED | DROPPED — `melt_mode` exists as global bool (V1.3.1+) but no per-preset color | DROPPED | DROPPED | |
| `lightningColor` | `RGB?` | Identity | PRESERVED as `Rgb<>` arg to lightning-block `LockupTrL<>` `Stripes<>`. Default `{r:100,g:100,b:255}` (ASTBuilder.ts:1016) | DROPPED | DROPPED | DROPPED — `lightning_block_mode` global bool but no color | DROPPED | DROPPED | |
| `hiltId` | `string?` | Identity | DROPPED — explicitly display-side-only (types.ts:367-369) | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Intentional drop on all boards. |

### Style / ignition / retraction core

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `style` | `string` | Style | PRESERVED via `buildBaseStyle()` switch (ASTBuilder.ts:128). 32/33 KyberStation styles have native parity per `deliverability.ts:328`. `automata` (Rule 30) falls back to stable. | DROPPED (factory firmware decides) | DROPPED — `advanced` is a fixed `Layers<InOutSparkTipX<...>>` template — only colors transfer, not algorithm | LOSSY — live `XENO_STYLE_MAP` covers only 6 KS styles (fire, stable, unstable, rainbow, crystalShatter, pulse). **~27 styles silently degrade to Steady (1).** XenopixelEmitter.ts:166-209 has broader degradation map but is dormant code. | LOSSY (design-ref) — `cfxBladeStyle()` collapses unknown to `stable` (CFXEmitter.ts:40-56) | LOSSY (design-ref) — `ghBladeEffect()` collapses unknown to `Static` (GHv3Emitter.ts:13-29) | **High-priority finding.** |
| `ignition` | `string` | Style | PRESERVED via `ignitionFromID()` lookup in transitionMap (ASTBuilder.ts:1125). 19 ignition animations. | DROPPED | DROPPED — Phase C uses fixed `InOutSparkTipX` ignition | LOSSY — live `XENO_IGNITION_MAP` has 12 entries but only `standard` is shared with KS registry; KS-specific (`center`, `stutter`, `glitch`, `crackle`, `fracture`, `flashFill`, `pulseWave`, `dripUp`) all default to Standard (0). XenopixelEmitter.ts:231-258 has fallbacks but unused. | LOSSY (design-ref) — `cfxIgnition()` returns 0 default | LOSSY (design-ref) — `ghIgnition()` returns 'ScrollUp' default | **High-priority finding.** |
| `retraction` | `string` | Style | PRESERVED via `retractionFromID()` (ASTBuilder.ts:1146). 13 retraction animations. | DROPPED | DROPPED — Phase C uses fixed retraction shape | DROPPED — Xenopixel `fontconfig.ini` has NO retraction style column. Only `retractionSpeed` is emitted. | LOSSY (design-ref) — `cfxRetraction()` mapping | LOSSY (design-ref) — `ghRetraction()` mapping | Xenopixel hardware constraint — accepted lossy. |
| `ignitionMs` | `number` | Style | PRESERVED as `Int<N>` arg to ignition transition (raw ms) | DROPPED | PRESERVED in slot 9 of `advanced` verb (extension time, raw ms) | LOSSY — XenopixelEmitter.ts:268-270 clamps to `[100, 800]`; live pipeline passes raw (`c.ignitionMs ?? 200`). **Clamp inconsistency.** | N/A (design-ref) — `ignitiontime=` raw ms | N/A (design-ref) — `IgnitionTime=` raw ms | |
| `retractionMs` | `number` | Style | PRESERVED as `Int<N>` arg to retraction transition (raw ms) | DROPPED | PRESERVED in slot 10 (raw ms) | LOSSY — XenopixelEmitter.ts:272-274 clamps to `[200, 1000]`; live pipeline doesn't clamp | N/A (design-ref) — `retractiontime=` | N/A (design-ref) — `RetractionTime=` | Same clamp inconsistency. |
| `ignitionEasing` | `EasingConfig?` | Style | UNVERIFIED — emitter doesn't reference. Engine evaluates the bezier when computing per-LED visibility; codegen emits static `Int<ms>` and lets ProffieOS run its built-in easing (different curve from KyberStation's bezier evaluator). | N/A (no emit slot) | N/A (no emit slot) | DROPPED | DROPPED | DROPPED | Per-frame curve shape is not representable in a ProffieOS template — engine-runtime-only. Visualizer ≠ hardware. |
| `retractionEasing` | `EasingConfig?` | Style | UNVERIFIED — same | N/A | N/A | DROPPED | DROPPED | DROPPED | Same. |

### Visual core

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `shimmer` | `number` | Visual | **LOSSY** — declared as deliverable per `deliverability.ts:335` ("emitted as AudioFlicker<>/HumpFlicker<> intensity") but `buildBaseStyle()` does NOT inspect `config.shimmer`. Constants like `Int<16384>` are hardcoded in stable's AudioFlicker. **Silently dropped — discrepancy between deliverability claim and emitter behavior.** | DROPPED | DROPPED — no slot in `advanced` verb | DROPPED — no shimmer concept | DROPPED | DROPPED | **P1 finding.** |
| `ledCount` | `number` | Visual | DROPPED at `BladeConfig` level — LED count flows through `ConfigOptions.bladeConfig[].ledCount` (hardware envelope), not per-preset. `maxLedsPerStrip=144` is the global cap (ConfigBuilder.ts:111). | DROPPED | DROPPED | PRESERVED — emitted as global `pixel_number=N` in `set/config.ini`. **LOSSY (multi-blade):** derived from FIRST preset only (zipExporter.ts:464) — multi-preset configs with different LED counts silently use preset[0]'s value. | N/A (design-ref) — `ledcount=` per profile in CFXEmitter.ts:81; NOT in live `generateCfxMainConfig` | N/A (design-ref) — `LEDCount=` per preset in GHv3Emitter.ts:99; NOT in live `generateGoldenHarvestConfig` | Xenopixel limitation: one global pixel count, not per-blade. |

### Import Preservation

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `importedRawCode` | `string?` | Import | PRESERVED via early-return in `generateStyleCode()` (index.ts:193-198) — emits raw code verbatim with a provenance header, skipping AST build entirely. | DROPPED — runtime emitter takes no raw-code path. Phase C still reconstructs from fields. | DROPPED | DROPPED — ProffieOS C++ meaningless on Xeno | DROPPED | DROPPED | Compile-flash-only safety net. |
| `importedAt` | `number?` | Import | PRESERVED via the provenance header (index.ts:316) | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Display metadata. |
| `importedSource` | `string?` | Import | PRESERVED via the provenance header (index.ts:289) | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Display metadata. |
| `altPhaseColors` | `RGB[]?` | Import | **LOSSY** — parser sets it (`ConfigReconstructor.ts:1307`) but emitter doesn't consume it. **Round-trip data loss** when users import a Fett263 ColorChange preset and click "Convert to native". Reconciliation: B1 marked UNVERIFIED; lowered to LOSSY here because round-trip is confirmed broken. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `detectedEffectIds` | `string[]?` | Import | UNVERIFIED — parser sets it (`ConfigReconstructor.ts:1308`) but emitter doesn't consume it. Display-only banner; no emit impact intended. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Display metadata. |

### Spatial Lockup (Edit Mode)

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `lockupPosition` | `number?` | Spatial | PRESERVED — switches from `LockupTrL<>` to `ResponsiveLockupL<>` with TOP/BOTTOM/SIZE args via `positionToProffie()` × 32768 quantization (ASTBuilder.ts:947-968) | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Sub-LED precision (227 steps/LED for 144-LED blades). Negligible loss. |
| `lockupRadius` | `number?` | Spatial | PRESERVED — `positionToProffie()` quantization. Default 0.12. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `dragPosition` | `number?` | Spatial | PRESERVED via `AlphaL<LockupTrL<>, Bump<pos, size>>` (ASTBuilder.ts:995-1010) | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `dragRadius` | `number?` | Spatial | PRESERVED. Default 0.15. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `meltPosition` | `number?` | Spatial | PRESERVED via `AlphaL<LockupTrL<>, Bump<>>` (ASTBuilder.ts:1063-1078) | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `meltRadius` | `number?` | Spatial | PRESERVED. Default 0.18. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `stabPosition` | `number?` | Spatial | PRESERVED via `TransitionEffectL<TrConcat<TrInstant, AlphaL<Rgb, Bump<pos,size>>, TrFade<200>>, EFFECT_STAB>` (ASTBuilder.ts:859-886). Opt-in — undefined means no stab emission. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `stabRadius` | `number?` | Spatial | PRESERVED. Default 0.2. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |

### Preon (ProffieOS 7+)

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `preonEnabled` | `boolean?` | Preon | PRESERVED as gate — emits `TransitionEffectL<TrConcat<TrInstant, Rgb<preonColor>, TrFade<preonMs>>, EFFECT_PREON>` (ASTBuilder.ts:834-851) | DROPPED | DROPPED — no preon slot | N/A (not in board) — Xenopixel encodes preon as ignition-style IDs 5-11 (`stack`, `foldTile`, `word`, etc.). **Semantic mismatch** — see UNVERIFIED items. | DROPPED | DROPPED | Compile-flash only on Proffie. |
| `preonColor` | `RGB?` | Preon | PRESERVED. Defaults to `baseColor`. | DROPPED | DROPPED | DROPPED — no per-preset preon color column | DROPPED | DROPPED | |
| `preonMs` | `number?` | Preon | PRESERVED as raw ms. Default 300. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |

### Spatial Blast

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `blastPosition` | `number?` | Spatial | PRESERVED — emits `AlphaL<BlastL<>, Bump<pos, waveSize>>` when set (ASTBuilder.ts:894-909). When undefined, emits bare `BlastL<>` (byte-identical to pre-v0.3.0 output). | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `blastRadius` | `number?` | Spatial | PRESERVED. Default 0.5. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |

### Style-specific gradient/edge

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `gradientEnd` | `RGB?` | Style | PRESERVED — consumed by gradient/photon/painted/imageScroll styles. Falls back to `brighten(baseColor, 0.4)` | DROPPED | DROPPED | N/A (not in board) — Gradient style degrades to Steady on Xeno | DROPPED | DROPPED | |
| `edgeColor` | `RGB?` | Style | PRESERVED — consumed by plasma/vortex styles. Falls back to `brighten(baseColor, 0.5)` | DROPPED | DROPPED | N/A (not in board) | DROPPED | DROPPED | |
| `gradientInterpolation` | `'linear'\|'smooth'\|'step'?` | Style | UNVERIFIED — emitter doesn't reference. ProffieOS `Gradient<>` is linear-only on hardware; smooth/step are engine-only. | N/A (no emit slot) | N/A (no emit slot) | N/A (not in board) | DROPPED | DROPPED | Visualizer-only field — no ProffieOS equivalent. Hardware-fidelity gap. |

### Blade painting

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `colorPositions` | `Array<{position, color, width}>?` | Painted | **LOSSY** — for `style: 'painted'`, sorted by position, emitted as multi-stop `Gradient<Rgb, Rgb, ...>` (ASTBuilder.ts:435-448). `width` is silently dropped (Gradient<> only stores stop colors). Position values are dropped too (Gradient<> evenly distributes stops). Only stop COLORS in input order survive. | DROPPED | DROPPED | N/A (not in board) | DROPPED | DROPPED | Significant visual divergence between visualizer and hardware. |

### Noise Parameters

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `noiseScale` | `number?` | Noise | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-runtime only. No ProffieOS template approximation in current codegen. |
| `noiseSpeed` | `number?` | Noise | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `noiseOctaves` | `number?` | Noise | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `noiseTurbulence` | `number?` | Noise | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `noiseIntensity` | `number?` | Noise | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |

All 5 noise fields are visualizer-only. Worth a hardware-fidelity flag.

### Motion Reactivity

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `motionSwingSensitivity` | `number?` | Motion | DROPPED — ProffieOS's built-in `SwingSpeed<400>` (fixed in templates) | DROPPED | DROPPED | LOSSY — Xenopixel has global `swing_sensitivity` from `useXenopixelSettingsStore`, NOT from `BladeConfig.motionSwingSensitivity` | DROPPED | DROPPED | Per-preset motion sensitivity unsupported on all three boards. |
| `motionAngleInfluence` | `number?` | Motion | DROPPED — ProffieOS `BladeAngle<>` is parameterless in current emits | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `motionTwistResponse` | `number?` | Motion | DROPPED | DROPPED | DROPPED | LOSSY — Xenopixel global `twist_sensitivity` from xeno store, not from BladeConfig | DROPPED | DROPPED | |
| `motionSmoothing` | `number?` | Motion | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `motionSwingColorShift` | `RGB?` | Motion | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `motionSwingBrighten` | `number?` | Motion | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |

All 6 motion-reactivity fields are visualizer-only knobs on Proffie. Xenopixel partially supplies via the global Xeno settings store.

### Color Dynamics

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `colorHueShiftSpeed` | `number?` | Color | DROPPED — ProffieOS `RotateColorsX<>` would be a partial analog but isn't emitted | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |
| `colorSaturationPulse` | `number?` | Color | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |
| `colorBrightnessWave` | `number?` | Color | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |
| `colorFlickerRate` | `number?` | Color | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. (Note: a separate untyped `flickerRate` IS consumed by `sithFlicker` style at ASTBuilder.ts:244 — different field name.) |
| `colorFlickerDepth` | `number?` | Color | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |

All 5 color-dynamics fields are visualizer-only.

### Spatial Pattern

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `spatialWaveFrequency` | `number?` | Spatial | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |
| `spatialWaveSpeed` | `number?` | Spatial | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |
| `spatialDirection` | `LayerDirection?` | Spatial | DROPPED — direction lives in `LayerConfig`, not flattened to template | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `spatialSpread` | `number?` | Spatial | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |
| `spatialPhase` | `number?` | Spatial | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |

### Blend & Layer

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `blendSecondaryStyle` | `string?` | Blend | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Visualizer-only multi-style blending. Single-effect firmware on all three boards. |
| `blendSecondaryAmount` | `number?` | Blend | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `blendMaskType` | `'none'\|'gradient'\|'noise'\|'wave'?` | Blend | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |

Note: the legacy top-level `blendMode` field is documented as retired (types.ts:484-491). Not present in current interface.

### Tip & Emitter

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `tipColor` | `RGB?` | Tip | DROPPED — `buildBaseStyle()` doesn't reference. Phase C `advanced` verb has slot 11 (`sparkTipColor`), currently fed from a stub — **wireable**. | DROPPED | DROPPED (currently stubbed) | DROPPED | DROPPED | DROPPED | **P2 wiring opportunity — free deliverability win.** |
| `tipLength` | `number?` | Tip | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |
| `tipFade` | `number?` | Tip | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |
| `emitterFlare` | `number?` | Tip | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |
| `emitterFlareWidth` | `number?` | Tip | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Engine-only. |

### Image Scroll

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `imageData` | `Uint8Array?` | ImageScroll | **LOSSY** — via `style: 'imageScroll'` path — samples 12 evenly-spaced columns at midrow, emits as multi-stop `Gradient<>` (ASTBuilder.ts:410-433). Quantized from full image (W×H pixels) to 12 colors, single row, no time dimension. | DROPPED | DROPPED | DROPPED — ImageScroll is ProffieOS-only | DROPPED | DROPPED | |
| `imageWidth` | `number?` | ImageScroll | PRESERVED (used for sampling indexing) | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `imageHeight` | `number?` | ImageScroll | PRESERVED (used for midrow calc) | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `scrollSpeed` | `number?` | ImageScroll | **LOSSY** — no time-domain in the emitted `Gradient<>`; scroll animation is lost on emit | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `scrollDirection` | `'left-to-right'\|'right-to-left'\|'bidirectional'?` | ImageScroll | **LOSSY** | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `scrollRepeatMode` | `'once'\|'loop'\|'pingpong'?` | ImageScroll | **LOSSY** | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |

**The entire image-scroll temporal dimension is dropped.** Users see scrolling in the visualizer but a static gradient on hardware.

### Dual-Mode Ignition

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `dualModeIgnition` | `boolean?` | DualIgnite | PRESERVED as gate at ASTBuilder.ts:1108-1124 — when true, emits `TrSelect<BladeAngle<>, downTransition, upTransition>` | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `ignitionUp` | `string?` | DualIgnite | PRESERVED — consumed by `TrSelect` branch. Falls back to `config.ignition`. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `ignitionDown` | `string?` | DualIgnite | PRESERVED — same | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `ignitionAngleThreshold` | `number?` | DualIgnite | **LOSSY** — emitter doesn't reference it. `TrSelect<BladeAngle<>, ...>` uses ProffieOS's default angle threshold (Fett263 prop-file `#define`), not this per-blade value. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Threshold dropped silently. |
| `retractionUp` | `string?` | DualIgnite | PRESERVED — consumed by `buildRetractionTransition()` at ASTBuilder.ts:1129-1145 | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `retractionDown` | `string?` | DualIgnite | PRESERVED — same | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |

### Ignition/Retraction Parameters

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `stutterFullExtend` | `boolean?` | IgnParams | UNVERIFIED — emitter doesn't reference. Likely visualizer-only — `transitionMap.ts` translates ignition IDs to templates with hardcoded args. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `stutterCount` | `number?` | IgnParams | UNVERIFIED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `stutterAmplitude` | `number?` | IgnParams | UNVERIFIED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `glitchDensity` | `number?` | IgnParams | UNVERIFIED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `glitchIntensity` | `number?` | IgnParams | UNVERIFIED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `sparkSize` | `number?` | IgnParams | UNVERIFIED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `sparkTrail` | `number?` | IgnParams | UNVERIFIED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `wipeSoftness` | `number?` | IgnParams | UNVERIFIED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `shatterScale` | `number?` | IgnParams | UNVERIFIED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |
| `shatterDimSpeed` | `number?` | IgnParams | UNVERIFIED | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | |

All 10 ignition/retraction param fields likely visualizer-only.

### Effect Customization

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `clashLocation` | `number?` | Effects | **LOSSY** — emitter emits `SimpleClashL<Rgb, 40>` with hardcoded `40` width (ASTBuilder.ts:918). Location field is not consumed. ProffieOS `ResponsiveClashL<>` accepts top/bottom/size args; consider routing. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | User's clash location preference is ignored. |
| `clashIntensity` | `number?` | Effects | **LOSSY** — hardcoded `40` width arg in `SimpleClashL` is the closest analog | DROPPED | DROPPED | LOSSY — Xenopixel global `clash_sensitivity` from xeno store (not from BladeConfig) | DROPPED | DROPPED | Intensity preference dropped on Proffie. |
| `unstableKylo` | `boolean?` | Effects | PRESERVED — when true, emits a second `SimpleClashL<White, 60>` overlay (ASTBuilder.ts:931-940) | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Compile-flash only. |
| `clashDecay` | `number?` | Effects | DROPPED — engine-only (modulation sampler uses it; no ProffieOS analog) | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Documented as runtime engine knob. |
| `blastCount` | `number?` | Effects | UNVERIFIED — `BlastL<>` doesn't take a count arg in current emit | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | LOSSY in practice. |
| `blastSpread` | `number?` | Effects | **LOSSY** — `Bump<>` width is set from `blastRadius`, not `blastSpread`. **Field-name conflict / drop:** users editing `blastSpread` will not see hardware change. | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | **Bug risk:** dual-named field bug-trap. |
| `stabDepth` | `number?` | Effects | UNVERIFIED — `stabRadius` is what feeds `Bump<>` (ASTBuilder.ts:861) | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Possibly intended depth-axis (along blade) vs `stabRadius` (radial extent). Feature ambiguity. |

### Custom Ignition Curve

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `ignitionCurve` | `[number, number, number, number]?` | Curve | **LOSSY** — emitter emits an `Int<ms>` arg; bezier curve shape is not representable in standard ProffieOS templates | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Per-frame curve shape is engine-only. Same issue as `ignitionEasing`. |
| `retractionCurve` | `[number, number, number, number]?` | Curve | **LOSSY** | DROPPED | DROPPED | DROPPED | DROPPED | DROPPED | Same. |

### Blade Hardware

| Field | Type | Category | Proffie compile-flash | Proffie runtime (Phase A) | Proffie runtime (Phase C) | Xenopixel | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `stripType` | `'single'\|...\|'penta-cree'?` | Hardware | DROPPED at `BladeConfig` level — strip topology flows through `ConfigOptions.bladeConfig[]` envelope, not per-preset | DROPPED | DROPPED | N/A (not in board) — Xenopixel is hardware-fixed for WS2812B single-strip | DROPPED | DROPPED | Hardware fact, not per-preset. |
| `bladeType` | `'neopixel'\|'in-hilt-led'?` | Hardware | DROPPED at `BladeConfig` level — same envelope split | DROPPED | DROPPED | N/A (not in board) | DROPPED | DROPPED | Same. |
| `customLedCount` | `number\|null?` | Hardware | DROPPED at `BladeConfig` level — flows through hardware envelope | DROPPED | DROPPED | LOSSY — `customLedCount` not read by Xeno generators directly. Only resolved `ledCount` is read. If upstream resolver folds it into `ledCount`, transitively preserved. (Verify upstream — likely OK in practice.) | DROPPED | DROPPED | |

### Untyped escape-hatch fields actually consumed

| Field | Consumed by | Encoding |
|---|---|---|
| `flickerRate` | `style: 'sithFlicker'` (ASTBuilder.ts:244) | `periodMs = 1000 / rate` → `Sin<Int<periodMs>>` |
| `flickerMinBright` | `style: 'sithFlicker'` (ASTBuilder.ts:246) | × 32768 → `Int<>` floor arg |
| `tempoBpm` | `style: 'tempoLock'` (ASTBuilder.ts:317) | `periodMs = 60000 / bpm` → `Sin<Int<periodMs>>` |
| `tempoDepth` | `style: 'tempoLock'` (ASTBuilder.ts:318) | × 32768 → `Int<>` floor arg |
| `modulation` | `generateStyleCode()` (index.ts:201-267) | Two paths: live bindings via `composeBindings` (ProffieOS templates), snapshot bake-in via `applyModulationSnapshot` |
| `xenoInTimeMs`, `xenoOutTimeMs`, `xenoCustomFunction` | XenopixelEmitter.ts:347-361 (dormant) | V1.4.0+ only. **NOT wired into the live `zipExporter.ts` pipeline.** |

These are NOT in the canonical `BladeConfig` interface but are operationally part of the contract. **Risk:** if a future refactor removes the `[key: string]: unknown` escape hatch, these silently break.

## Critical structural findings

### 1. Xenopixel emitter class vs. zipExporter inline path — dormant-code split

The `packages/codegen/src/emitters/XenopixelEmitter.ts` (511 LoC), `CFXEmitter.ts` (133 LoC),
and `GHv3Emitter.ts` (114 LoC) classes are NOT used by the live ZIP export pipeline.
`apps/web/lib/zipExporter.ts` has its own inline `generateXenoFontConfig` /
`generateCfxMainConfig` / `generateGoldenHarvestConfig` functions that read `preset.config`
directly. The emitter classes have **superior coverage**:

- **Xenopixel:** firmware-version-aware V1.4.0+ extras (`xenoInTimeMs`, `xenoOutTimeMs`,
  `xenoCustomFunction`); broader style-degradation map (rotoscope/gradient/photon→Steady,
  plasma/cinder/ember/candle→Fire, aurora/prism→Rainbow, helix/neutron→Pulse, shatter→Crack,
  darksaber→Unstable) with `degradationNote` returns; ignitionMs/retractionMs clamping with
  notes.
- **CFX/GH:** richer field surface in the design-reference output (per-preset ledcount,
  per-effect color fields).

**The live pipeline is the lossier of the two.** This is the highest-priority structural
finding: either rewire the ZIP exporter to call into the emitter classes, or delete the
dormant code to avoid the "two parallel paths" maintenance trap.

**Action options:**

1. **Rewire** `zipExporter.ts` to instantiate `XenopixelEmitter` / `CFXEmitter` /
   `GHv3Emitter` and call `.emit()`. Pulls firmware-version awareness and richer degradation
   into the live path.
2. **Delete** the emitter classes if no test fixture or other call site references them.
   Verify with `grep -r XenopixelEmitter packages/ apps/ tests/`.

This split is the dominant reason the Xenopixel coverage looks narrower than it should:
the inline code lacks the safety nets and notes the emitter class implements.

### 2. `BoardEmitOptions` shape vs `BladeConfig` shape

The `BoardEmitOptions` shape on `BaseEmitter.ts` is a massively reduced subset of
`BladeConfig` — only ~12 fields: `presetName`, `fontName`, `baseColor`, `clashColor`,
`lockupColor?`, `blastColor?`, `style`, `ignition`, `retraction`, `ignitionMs`,
`retractionMs`, `ledCount`, `volume?`. The `[key: string]: unknown` escape hatch is
theoretically there for extras (e.g., `xenoInTimeMs`), but **for ~91 of 103 BladeConfig
fields, the data is never passed in to begin with**. That is the dominant LOSSY mode for
all three non-Proffie boards.

Even if the dormant emitter classes were rewired, they'd still see only ~12 fields from
the call site. A fix here means expanding `BoardEmitOptions` to mirror the full
`BladeConfig` (or pass `BladeConfig` directly with a presetName/fontName envelope).

## Systemic findings

### Proffie path

1. **Compile-flash is broad but lossy in the temporal/parametric domain.** Of 103
   `BladeConfig` fields, ~40 are PRESERVED in compile-flash. Most DROPPED fields fall into
   three families:
   - **Visualizer-only "feel" knobs** (`motion*`, `noise*`, `color*Dynamics`, `spatial*`,
     `blend*Secondary`, `tip*`, `emitterFlare*`) — 25+ fields with no ProffieOS template
     analog. Intentionally engine-runtime-only per `HARDWARE_FIDELITY_PRINCIPLE.md`, but
     no emitter-side warning surfaces the gap.
   - **Effect customization micro-knobs** (`clashLocation`, `clashIntensity`, `blastCount`,
     `blastSpread`, `stabDepth`, `glitchDensity`, etc.) — all UNVERIFIED or LOSSY, likely
     intended for hardware but currently silently dropped.
   - **Time-domain features** (`imageScroll` direction/speed/repeat, `ignitionCurve`/
     `retractionCurve` bezier, `ignitionEasing`/`retractionEasing`) — ProffieOS templates
     can't represent arbitrary per-frame curves.

2. **Runtime emitter is extremely narrow.** Phase A delivers 5 knobs (`name`, `font`,
   `track`, `order`, `variation`). Phase C adds 7 more (4 colors + 2 times + style-stub).
   The remaining ~91 BladeConfig fields are DROPPED in both phases. The `deliverability.ts`
   table reflects this accurately — it's a documented gap, not a hidden one.

3. **Field-naming conflicts hide drops.** `blastSpread` vs `blastRadius`, `stabDepth` vs
   `stabRadius` — the emitter consumes the second of each pair; the first appears in
   BladeConfig but is unwired. Users editing the first will see no hardware change.
   Similar with `colorFlickerRate` (engine-only) vs `flickerRate` (consumed by sithFlicker).
   These dual-named fields are bug-traps.

4. **The hardware-fidelity gap is largest in painted/imageScroll modes.** Both drop
   critical data (per-stop widths/positions; all time-domain image data) on emit.
   Visualizer ≠ hardware in a way that's not surfaced in any banner.

### Cross-board

5. **Two parallel emitter paths on Xenopixel/CFX/GH, both lossy in different ways.**
   See Critical Structural Findings #1.

6. **Xenopixel style coverage is the biggest one-sided loss.** Live pipeline's
   `XENO_STYLE_MAP` covers 6 KyberStation style IDs; 27 styles silently default to Steady
   (1) with no degradation note. The emitter class has a thoughtful degradation map but
   is dormant code.

7. **All modulation, motion-reactivity, blend, tip, image-scroll, dual-mode, noise,
   spatial, and color-dynamics fields are DROPPED on Xenopixel/CFX/GH.** That's ~60
   BladeConfig fields representing KyberStation's "advanced styling" surface that have
   no firmware analog. Architecturally correct, but the export UI should clearly warn
   users when they switch board target and lose 60% of their configuration.

8. **CFX and GH design-reference output is honest about its status** (inline
   `KYBERSTATION DESIGN REFERENCE` banner + sibling README), but field coverage is still
   narrow even for documentation purposes: only baseColor/clashColor/lockupColor/blastColor/
   style/ignition/retraction/ignitionMs/retractionMs/ledCount are surfaced. None of the
   spatial/preon/motion params are mentioned — a richer design-reference doc could include
   them with a "your vendor may have an equivalent setting called X" footnote.

## High-priority LOSSY findings — unified prioritized list

Synthesized from B1's "Top high-priority LOSSY findings" + B2's same-named section.
Priority bands reflect bug severity × number of boards affected × user-visibility.

### P0 — Structural / cross-board

| # | Finding | Boards | Fix |
|---|---|---|---|
| 1 | **Xenopixel/CFX/GH emitter classes are dormant code; live ZIP path uses lossier inline functions.** | Xeno, CFX, GH | Rewire `zipExporter.ts` to use emitter classes, or delete them. See Critical Structural Findings #1. |
| 2 | **`BoardEmitOptions` only passes ~12 of 103 BladeConfig fields.** Even rewiring emitter classes won't help without expanding this. | Xeno, CFX, GH | Expand `BoardEmitOptions` to mirror `BladeConfig` (or pass full BladeConfig). |

### P1 — Hidden user-facing data loss

| # | Finding | Boards | Fix |
|---|---|---|---|
| 3 | **`shimmer`** declared "deliverable" in `deliverability.ts:335` but NOT consumed by `buildBaseStyle()`. Constants hardcoded in stable's AudioFlicker. | Proffie compile-flash | Either remove the deliverability claim or wire `shimmer` into AudioFlicker mix amount. |
| 4 | **`colorPositions[].width` and `colorPositions[].position`** silently dropped for `painted` style. Only stop colors in input order survive. | Proffie compile-flash | Add hardware-fidelity banner explaining painted-mode limit. ProffieOS Gradient<> has no per-stop width/position. |
| 5 | **`imageData` + entire `scroll*` family** — `imageScroll` emits static 12-stop `Gradient<>`. All time-domain dropped. Hardware blade does not scroll. | Proffie compile-flash | Add hardware-fidelity banner. Currently silent. |
| 6 | **`blastSpread`, `stabDepth`, `clashLocation`, `clashIntensity`** — Effect Customization fields appear in interface but emitter uses different field names (`blastRadius`, `stabRadius`) or hardcoded values. **Field-name drift bug class.** | Proffie compile-flash | Either remove the UI (don't ship dead knobs) or wire through to `ResponsiveClashL<>` / parameterized `BlastL<>`. |
| 7 | **Xenopixel `style` mapping covers 6 of 33 KS styles; 27 silently degrade to Steady.** | Xeno | Adopt `mapBladeEffect` map from `XenopixelEmitter.ts:166-209` in `zipExporter.ts:xenoStyleId`. Surface degradation notes in ZIP README. |
| 8 | **Xenopixel `ignition` mapping lacks fallback for KS-specific ignitions** (center/stutter/glitch/crackle/fracture/flashFill/pulseWave/dripUp → all silently → Standard). | Xeno | Adopt `mapIgnitionStyle` from `XenopixelEmitter.ts:231-258`. Notes already implemented. |
| 9 | **Xenopixel ignitionMs/retractionMs clamp inconsistency** between emitter class (clamps to safe range) and live pipeline (raw passthrough). | Xeno | Apply `clampIgnitionSpeed` / `clampRetractionSpeed` in live pipeline; emit clamp notes. |

### P2 — Round-trip / wireable quick wins

| # | Finding | Boards | Fix |
|---|---|---|---|
| 10 | **`tipColor` → Phase C slot 11.** Currently stubbed. Wiring `BladeConfig.tipColor` would surface real tip-color control in runtime presets without firmware changes. | Proffie runtime Phase C | Free deliverability win. Single field plumbing change. |
| 11 | **`altPhaseColors` round-trip.** Parser extracts ColorChange<> phases; emitter doesn't put them back. "Convert to native" silently drops phases. | Proffie compile-flash | Emit `ColorChange<>` or `ColorSelect<>` wrapper when present. Preserves Fett263 import fidelity. |
| 12 | **`ignitionAngleThreshold`** dropped — `TrSelect<BladeAngle<>, ...>` uses ProffieOS's default angle threshold (Fett263 prop-file `#define`), not per-blade value. | Proffie compile-flash | Either route to a per-blade `#define` or document as fixed-by-firmware. |
| 13 | **Xenopixel `ledCount` derived from `presets[0]` only.** Multi-blade configs with different LED counts silently use the first blade's value. | Xeno | Detect mismatch and emit a warning note. Firmware can't do per-blade LED counts but user deserves to be told. |
| 14 | **Xenopixel firmware-version extras (`xenoInTimeMs`/`xenoOutTimeMs`/`xenoCustomFunction`) only handled in dormant emitter class.** | Xeno | Wire `firmwareVersion` from `useXenopixelSettingsStore` into live pipeline, or use the emitter class. |

### P3 — Hardware-fidelity audits & banners

| # | Finding | Boards | Fix |
|---|---|---|---|
| 15 | **Add hardware-fidelity banner for `imageScroll` / `painted`.** Static-on-hardware vs animated-in-visualizer mismatch is currently silent. | Proffie compile-flash | UI banner + footer note in generated config header comment. |
| 16 | **Audit 10 ignition/retraction params** (`stutter*`, `glitch*`, `spark*`, `wipeSoftness`, `shatter*`) to confirm engine-only vs wireable. | Proffie compile-flash | Source-trace `transitionMap.ts`; either wire or move to engine-only flag. |
| 17 | **`ignitionEasing`, `retractionEasing`, `ignitionCurve`, `retractionCurve`** — bezier shape lost on emit. Hardware uses ProffieOS's built-in ease. | Proffie compile-flash | Visualizer ≠ hardware. Add banner or restrict UI to ProffieOS-compatible easings. |
| 18 | **Board-switch warning banner.** When user switches export target from Proffie → Xeno/CFX/GH, surface a "you will lose ~60 fields of configuration" prompt. | All boards | Cross-board UX. |
| 19 | **`gradientInterpolation`** — `smooth`/`step` modes have no ProffieOS analog; `linear` is native. | Proffie compile-flash | Either emit warning or quietly coerce. |
| 20 | **Xenopixel-side per-preset effect colors dropped** (clashColor/lockupColor/blastColor/meltColor/lightningColor/dragColor). Firmware has no per-preset slots; user deserves a banner. | Xeno | README/ZIP note. Already partially documented. |
| 21 | **CFX/GH design-reference field coverage is narrow.** Only ~10 fields surfaced; the other 90+ could be included with "your vendor app may have an equivalent" footnotes. | CFX, GH | Documentation-quality improvement. |

## UNVERIFIED items needing follow-up source trace

These fields are not referenced by current emitters but their intent isn't conclusively
engine-only. Source-trace recommended:

### Proffie (B1 territory — needs targeted source trace)

1. **`stutterFullExtend`, `stutterCount`, `stutterAmplitude`** — Stutter ignition exists in
   transition map. Check if `transitionMap.ts` accepts these as params or if they're truly
   engine-only.
2. **`glitchDensity`, `glitchIntensity`** — Glitch ignition. Same question.
3. **`sparkSize`, `sparkTrail`** — Spark ignition. Same question.
4. **`wipeSoftness`** — Wipe ignition. Same question.
5. **`shatterScale`, `shatterDimSpeed`** — Shatter ignition. Same question.
6. **`clashLocation`, `clashIntensity`** — Could plausibly map to
   `ResponsiveClashL<color, top, bottom, size>` instead of `SimpleClashL<color, 40>`.
7. **`blastCount`, `blastSpread`** — `BlastL<>` doesn't take count/spread args, but a
   wider `Blast<>` family might. Possible template-coverage gap.
8. **`stabDepth`** — Wired field is `stabRadius`; check if `stabDepth` is intended as a
   depth-axis (along blade) vs `stabRadius` (radial extent). Field-name suggests different
   semantics.
9. **`tipColor`** — Phase C `advanced` slot 11 (`sparkTipColor`) currently fed from a stub.
   Wiring `BladeConfig.tipColor` here is a free deliverability win.
10. **`gradientInterpolation`** — `smooth` and `step` modes have no ProffieOS analog;
    `linear` is native. Hardware-fidelity audit pass needed.
11. **`detectedEffectIds`** — Parser sets it but emitter doesn't consume it. Display-only
    banner — confirm intent is display-only.
12. **`ignitionEasing`, `retractionEasing`** — Engine evaluates bezier; codegen emits
    static `Int<ms>` and ProffieOS runs its built-in easing. Confirm hardware-fidelity
    expectation.

### Xenopixel/CFX/GH (B2 territory)

13. **`customLedCount`** — Emitter doesn't read it directly. Verify upstream resolver
    folds `customLedCount` into `config.ledCount` before export. Likely OK in practice;
    needs explicit grep.
14. **`motionSwingSensitivity` / `motionTwistResponse`** interaction with
    `useXenopixelSettingsStore` — global Xeno store has parallel `swing_sensitivity` /
    `twist_sensitivity` fields. Intent unclear: should KyberStation's BladeConfig motion
    fields auto-sync into the store on board switch?
15. **`preonEnabled` semantic mismatch** — Xenopixel encodes preon as ignition-style
    IDs 5-11. If user sets `preonEnabled=true` AND `ignition=standard`, emitter silently
    drops preon. Question for product: substitute a preon-bearing Xeno ignition ID when
    `preonEnabled` is true (e.g., default to `stack` (5))?
16. **XenopixelEmitter class orphan check** — Verify no test fixture or import path
    references it. If unreferenced, decide between delete vs. rewire-into-zipExporter.

## Follow-up actions (recommended priorities)

Grouped by impact:

1. **(P0)** Resolve the dormant emitter-class split (rewire or delete). Single biggest
   structural improvement.
2. **(P1)** Decide & fix `shimmer` (Proffie compile-flash) — align `deliverability.ts`
   with actual emitter behavior.
3. **(P1)** Investigate `blastSpread` / `stabDepth` / `clashLocation` / `clashIntensity`
   field drops — wire through or remove UI knobs.
4. **(P1)** Adopt the broader Xenopixel style + ignition degradation maps from the
   emitter class into the live pipeline; emit degradation notes in ZIP README.
5. **(P1)** Apply Xenopixel ignitionMs/retractionMs clamping in live pipeline.
6. **(P2)** Wire `tipColor` → Phase C slot 11. Free deliverability win for runtime
   presets.
7. **(P2)** Wire `altPhaseColors` round-trip. Preserves Fett263 import fidelity through
   "Convert to native".
8. **(P3)** Add hardware-fidelity banners for `imageScroll`, `painted`, and board-switch.
9. **(P3)** Audit the 10 ignition/retraction param fields to confirm engine-only vs
   wireable.
10. **(P3)** Expand CFX/GH design-reference output with vendor-equivalent footnotes for
    advanced fields.

## Reconciliation log (B1 vs B2 discrepancies)

For transparency about how conflicts were resolved:

- **BladeConfig field count:** B1 said 91 named fields; B2 said ~98. Authoritative count
  re-extracted: **103 named fields** (B1 missed several in Effect Customization /
  Tip & Emitter / Image Scroll / Spatial Lockup blocks; B2 missed a handful in
  Ignition/Retraction Parameters and Color Dynamics). Used 103 as the matrix's count.
- **`altPhaseColors`** — B1 marked UNVERIFIED. Lowered to LOSSY here because B1's notes
  confirm the round-trip break ("emitter doesn't consume it. Lost on round-trip if user
  'Convert to native'"). Following the LOSSY-over-UNVERIFIED reconciliation rule.
- **`shimmer`** — B1 marked LOSSY (declared deliverable, but emitter ignores). B2 didn't
  cover (out of Proffie-side scope). Kept as LOSSY per B1's evidence.
- **Xenopixel/CFX/GH fields:** trusted B2's coverage marks per the territorial rule.
- **Proffie-side fields:** trusted B1's coverage marks per the territorial rule.
- **Xenopixel `style` and `ignition`** — B2 found the dormant-emitter-class structural
  issue plus the live `XENO_STYLE_MAP`/`XENO_IGNITION_MAP` narrowness. Both are reflected
  in the LOSSY marks here and called out as a Critical Structural Finding.

## Source-of-truth references

- **BladeConfig interface:** `packages/engine/src/types.ts:344-568`
- **Proffie compile-flash emitter:** `packages/codegen/src/ASTBuilder.ts`,
  `packages/codegen/src/CodeEmitter.ts`, `packages/codegen/src/ConfigBuilder.ts`,
  `packages/codegen/src/index.ts`
- **Proffie runtime emitter:** `packages/codegen/src/emitters/ProffieRuntimeEmitter.ts`
- **Xenopixel emitter (dormant):** `packages/codegen/src/emitters/XenopixelEmitter.ts`
- **CFX emitter (dormant):** `packages/codegen/src/emitters/CFXEmitter.ts`
- **GH emitter (dormant):** `packages/codegen/src/emitters/GHv3Emitter.ts`
- **Live ZIP export pipeline:** `apps/web/lib/zipExporter.ts`
  (`generateXenoFontConfig`, `generateXenoGlobalConfig`, `generateCfxMainConfig`,
  `generateGoldenHarvestConfig`)
- **Encoding contracts at every emit→parser boundary:** `docs/research/EMIT_PARSER_AUDIT.md`
- **Hardware fidelity principle:** `docs/HARDWARE_FIDELITY_PRINCIPLE.md`
- **Partial audit evidence trail:**
  [`MULTI_BOARD_FIELD_COVERAGE_2026-05-16_B1_proffie.md`](./MULTI_BOARD_FIELD_COVERAGE_2026-05-16_B1_proffie.md),
  [`MULTI_BOARD_FIELD_COVERAGE_2026-05-16_B2_xeno-cfx-gh.md`](./MULTI_BOARD_FIELD_COVERAGE_2026-05-16_B2_xeno-cfx-gh.md)
