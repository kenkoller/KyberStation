# Multi-Board Field Coverage — Xenopixel + CFX + Golden Harvest — Agent B2

**Date:** 2026-05-16
**Source of truth:** `packages/engine/src/types.ts` `BladeConfig` interface
**Emitters audited:**
- `packages/codegen/src/emitters/XenopixelEmitter.ts` (511 LoC, isolated emitter class)
- `packages/codegen/src/emitters/CFXEmitter.ts` (133 LoC, isolated emitter class)
- `packages/codegen/src/emitters/GHv3Emitter.ts` (114 LoC, isolated emitter class)
- `apps/web/lib/zipExporter.ts` (the real wiring path — emitter classes appear to be parallel/legacy code; the actual ZIP export pipeline calls `generateXenoFontConfig` / `generateCfxMainConfig` / `generateGoldenHarvestConfig` inline)
**Multi-board switch:** `apps/web/lib/zipExporter.ts` lines 783-842 (Xenopixel at 817, CFX at 783, Golden Harvest case key is `golden_harvest` at 802)
**Auditor:** B2

> **Important wiring note:** The `BoardEmitOptions` shape on `BaseEmitter.ts` is a **massively reduced subset of `BladeConfig`** (only ~12 fields: `presetName`, `fontName`, `baseColor`, `clashColor`, `lockupColor?`, `blastColor?`, `style`, `ignition`, `retraction`, `ignitionMs`, `retractionMs`, `ledCount`, `volume?`). The `[key: string]: unknown` escape hatch is theoretically there for extras (e.g., `xenoInTimeMs`), but for ~140 BladeConfig fields, **the data is never passed in to begin with**. That is the dominant LOSSY mode for all three boards.
>
> Additionally, the live ZIP-export pipeline in `zipExporter.ts` does NOT route through the emitter classes — it calls its own inline generators that read `preset.config` directly. So the audit traces both paths and records the more-permissive of the two where they diverge.

## Field count verified

**Total BladeConfig fields:** ~98 named fields enumerated, plus the `[key: string]: unknown` escape hatch (extensible). Below is the exhaustive list grouped by category.

Counted from `types.ts:344-568`:
- Identity/colors core: 9 (`name`, `baseColor`, `clashColor`, `lockupColor`, `blastColor`, `dragColor`, `meltColor`, `lightningColor`, `hiltId`)
- Style/ignition core: 7 (`style`, `ignition`, `retraction`, `ignitionMs`, `retractionMs`, `ignitionEasing`, `retractionEasing`)
- Visual core: 2 (`shimmer`, `ledCount`)
- Import preservation: 5 (`importedRawCode`, `importedAt`, `importedSource`, `altPhaseColors`, `detectedEffectIds`)
- Spatial lockup: 8 (`lockupPosition`, `lockupRadius`, `dragPosition`, `dragRadius`, `meltPosition`, `meltRadius`, `stabPosition`, `stabRadius`)
- Preon: 3 (`preonEnabled`, `preonColor`, `preonMs`)
- Spatial blast: 2 (`blastPosition`, `blastRadius`)
- Style-specific: 4 (`gradientEnd`, `edgeColor`, `gradientInterpolation`, `colorPositions`)
- Noise: 5 (`noiseScale`, `noiseSpeed`, `noiseOctaves`, `noiseTurbulence`, `noiseIntensity`)
- Motion reactivity: 6 (`motionSwingSensitivity`, `motionAngleInfluence`, `motionTwistResponse`, `motionSmoothing`, `motionSwingColorShift`, `motionSwingBrighten`)
- Color dynamics: 5 (`colorHueShiftSpeed`, `colorSaturationPulse`, `colorBrightnessWave`, `colorFlickerRate`, `colorFlickerDepth`)
- Spatial pattern: 5 (`spatialWaveFrequency`, `spatialWaveSpeed`, `spatialDirection`, `spatialSpread`, `spatialPhase`)
- Blend & layer: 3 (`blendSecondaryStyle`, `blendSecondaryAmount`, `blendMaskType`)
- Tip & emitter: 5 (`tipColor`, `tipLength`, `tipFade`, `emitterFlare`, `emitterFlareWidth`)
- Image scroll: 6 (`imageData`, `imageWidth`, `imageHeight`, `scrollSpeed`, `scrollDirection`, `scrollRepeatMode`)
- Dual-mode ignition: 6 (`dualModeIgnition`, `ignitionUp`, `ignitionDown`, `ignitionAngleThreshold`, `retractionUp`, `retractionDown`)
- Ignition/retraction params: 9 (`stutterFullExtend`, `stutterCount`, `stutterAmplitude`, `glitchDensity`, `glitchIntensity`, `sparkSize`, `sparkTrail`, `wipeSoftness`, `shatterScale`, `shatterDimSpeed`)
- Effect customization: 7 (`clashLocation`, `clashIntensity`, `unstableKylo`, `clashDecay`, `blastCount`, `blastSpread`, `stabDepth`)
- Custom curves: 2 (`ignitionCurve`, `retractionCurve`)
- Blade hardware: 3 (`stripType`, `bladeType`, `customLedCount`)

## Coverage matrix

Legend:
- **PRESERVED** — field reaches output in a parseable form (Xenopixel only). Encoding noted.
- **LOSSY** — field is mapped, dropped, truncated, or quantized below useful resolution.
- **N/A (vendor design-only)** — CFX/GH output is design-reference text, not flashable. Marked when the field IS surfaced in the output text as a note.
- **N/A (not in board)** — Xenopixel firmware has no concept of this field.
- **DROPPED** — field exists in BladeConfig but the emitter never references it (the dominant case).

### Identity / Colors

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `name` | `string?` | LOSSY (folder index is `${i+1}` — preset name is dropped from `fontconfig.ini`; only ZIP folder name survives via the export pipeline using `preset.name`, NOT `config.name`) | N/A (design-ref) — appears as `name=` in `[profile{i}]` (zipExporter.ts:209) | N/A (design-ref) — appears as `Name=` in `[Preset{i}]` (GHv3Emitter.ts:82) | Xenopixel `fontconfig.ini` has no name field; relies on folder index. |
| `baseColor` | `RGB` | PRESERVED — `font{N}=(R,G,B),...` with R,G,B in 0-255 native, rounded + clamped (zipExporter.ts:439-441). Matches vendor format. | N/A (design-ref) — hex `#RRGGBB` (GHv3Emitter.ts) or `R;G;B` 0-255 (CFXEmitter.ts:9-11) | N/A (design-ref) — hex `#RRGGBB` 0-255 | Xenopixel: 8-bit native (no scaling bug like Proffie's RgbArg). |
| `clashColor` | `RGB` | DROPPED — Xenopixel does NOT support per-preset clash color. `flash_on_clash` is global only. | N/A (design-ref) — emitted as `clashcolor=` (CFX) or `ClashColor=` (GH) for user reference | N/A (design-ref) — same | High-priority finding: Xenopixel discards per-preset clash hue entirely. |
| `lockupColor` | `RGB` | DROPPED — Xenopixel hardcodes `lockupLight=0` (zipExporter.ts:447). No per-preset lockup color. | N/A (design-ref) — emitted in CFXEmitter.ts:71 if defined | N/A (design-ref) — emitted in GHv3Emitter.ts:88 if defined | |
| `blastColor` | `RGB` | DROPPED — Xenopixel has `blasterLight` (0-2) as a global enum, not a color (zipExporter.ts:445). | N/A (design-ref) — emitted in CFXEmitter.ts:73 if defined | N/A (design-ref) — emitted in GHv3Emitter.ts:91 if defined | |
| `dragColor` | `RGB?` | DROPPED | DROPPED | DROPPED | None of the three boards reference drag color. |
| `meltColor` | `RGB?` | DROPPED — `melt_mode` exists as global bool (V1.3.1+) but no per-preset color | DROPPED | DROPPED | |
| `lightningColor` | `RGB?` | DROPPED — `lightning_block_mode` exists as global bool (V1.3.1+) but no color | DROPPED | DROPPED | |
| `hiltId` | `string?` | DROPPED | DROPPED | DROPPED | Display-side hint only — appropriately dropped on all boards. |

### Style / Ignition / Retraction

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `style` | `string` | LOSSY — only 8 IDs supported via `XENO_STYLE_MAP` (zipExporter.ts:397-404: fire, stable, unstable, rainbow, crystalShatter, pulse). KyberStation has **33 styles**, so **~25 styles silently degrade to Steady (1)**. XenopixelEmitter.ts:166-209 has wider degradation map (rotoscope/gradient/photon→Steady, plasma/cinder/ember/candle→Fire, aurora/prism→Rainbow, helix/neutron→Pulse, shatter→Crack, darksaber→Unstable) but **this map is NOT used by the live zipExporter pipeline**. | LOSSY (design-ref) — `cfxBladeStyle()` mapping (CFXEmitter.ts:40-56) collapses unknown styles to `stable` | LOSSY (design-ref) — `ghBladeEffect()` (GHv3Emitter.ts:13-29) collapses unknown to `Static` | **HIGH-PRIORITY finding** — see Systemic. |
| `ignition` | `string` | LOSSY — `XENO_IGNITION_MAP` has 12 entries (zipExporter.ts:409-422) but **only `standard` is shared with KyberStation's ignition registry** — the rest are Xenopixel-specific (`stack`, `foldTile`, `word`, `faser`, `scavenger`, `hunter`, `broken`). The KyberStation registry has ignitions like `center`, `stutter`, `glitch`, `crackle`, `fracture`, `flashFill`, `pulseWave`, `dripUp` — **all default to Standard (0)** because the live `XENO_IGNITION_MAP` lacks degradation fallbacks. XenopixelEmitter.ts:231-258 has fallbacks but is unused. | LOSSY (design-ref) — `cfxIgnition()` returns 0 default | LOSSY (design-ref) — `ghIgnition()` returns 'ScrollUp' default | High-priority finding. |
| `retraction` | `string` | DROPPED — Xenopixel `fontconfig.ini` has **no retraction style ID column**. Only `retractionSpeed` is emitted. Choice of retraction animation is firmware-fixed. | LOSSY (design-ref) — `cfxRetraction()` mapping | LOSSY (design-ref) — `ghRetraction()` mapping | Xenopixel hardware constraint — accepted lossy. |
| `ignitionMs` | `number` | LOSSY — clamped to `[100, 800]` range (XenopixelEmitter.ts:268-270), or passed raw in the zipExporter pipeline (no clamp — `c.ignitionMs ?? 200`). **The two paths disagree on whether to clamp.** | N/A (design-ref) — `ignitiontime=` raw ms | N/A (design-ref) — `IgnitionTime=` raw ms | Clamp inconsistency between emitter class and live pipeline is a real bug. |
| `retractionMs` | `number` | LOSSY — clamped to `[200, 1000]` in XenopixelEmitter.ts:272-274; live pipeline doesn't clamp | N/A (design-ref) — `retractiontime=` | N/A (design-ref) — `RetractionTime=` | Same clamp inconsistency. |
| `ignitionEasing` | `EasingConfig?` | DROPPED | DROPPED | DROPPED | Easing curves are firmware-fixed on all three. |
| `retractionEasing` | `EasingConfig?` | DROPPED | DROPPED | DROPPED | |

### Visual Core

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `shimmer` | `number` | DROPPED | DROPPED | DROPPED | No shimmer concept on these boards. |
| `ledCount` | `number` | PRESERVED — emitted as global `pixel_number=N` in `set/config.ini`; **derived from FIRST preset only** (zipExporter.ts:464) — multi-preset configs with different LED counts silently use preset[0]'s value | N/A (design-ref) — `ledcount=` per profile in CFXEmitter.ts:81; NOT in live `generateCfxMainConfig` | N/A (design-ref) — `LEDCount=` per preset in GHv3Emitter.ts:99; NOT in live `generateGoldenHarvestConfig` | Xenopixel limitation: one global pixel count, not per-blade. |

### Import Preservation

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `importedRawCode` | `string?` | DROPPED | DROPPED | DROPPED | ProffieOS C++ — meaningless on these boards. Correctly dropped. |
| `importedAt` | `number?` | DROPPED | DROPPED | DROPPED | Provenance metadata. |
| `importedSource` | `string?` | DROPPED | DROPPED | DROPPED | |
| `altPhaseColors` | `RGB[]?` | DROPPED | DROPPED | DROPPED | ColorChange wrapper recovery — no equivalent. |
| `detectedEffectIds` | `string[]?` | DROPPED | DROPPED | DROPPED | EFFECT_* introspection — no equivalent. |

### Spatial Lockup / Stab

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `lockupPosition` | `number?` | DROPPED | DROPPED | DROPPED | Position-aware effects are KyberStation-specific. |
| `lockupRadius` | `number?` | DROPPED | DROPPED | DROPPED | |
| `dragPosition` | `number?` | DROPPED | DROPPED | DROPPED | |
| `dragRadius` | `number?` | DROPPED | DROPPED | DROPPED | |
| `meltPosition` | `number?` | DROPPED | DROPPED | DROPPED | |
| `meltRadius` | `number?` | DROPPED | DROPPED | DROPPED | |
| `stabPosition` | `number?` | DROPPED | DROPPED | DROPPED | |
| `stabRadius` | `number?` | DROPPED | DROPPED | DROPPED | |

### Preon

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `preonEnabled` | `bool?` | N/A (not in board) — Xenopixel has SPECIAL preon ignitions (IDs 5-11 in `XENO_IGNITION_MAP`) but no separate enable flag | DROPPED | DROPPED | Xeno fuses preon into ignition style ID. |
| `preonColor` | `RGB?` | DROPPED — no per-preset preon color column | DROPPED | DROPPED | |
| `preonMs` | `number?` | DROPPED | DROPPED | DROPPED | |

### Spatial Blast

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `blastPosition` | `number?` | DROPPED | DROPPED | DROPPED | |
| `blastRadius` | `number?` | DROPPED | DROPPED | DROPPED | |

### Style-specific Visual Params

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `gradientEnd` | `RGB?` | N/A (not in board) | DROPPED | DROPPED | Gradient style degrades to Steady on Xeno. |
| `edgeColor` | `RGB?` | N/A (not in board) | DROPPED | DROPPED | |
| `gradientInterpolation` | `'linear'\|'smooth'\|'step'` | N/A (not in board) | DROPPED | DROPPED | |
| `colorPositions` | `Array<{position, color, width}>?` | N/A (not in board) | DROPPED | DROPPED | Blade painting is KyberStation-specific. |

### Noise Parameters

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `noiseScale` | `number?` | DROPPED | DROPPED | DROPPED | Engine-only; no firmware analog. |
| `noiseSpeed` | `number?` | DROPPED | DROPPED | DROPPED | |
| `noiseOctaves` | `number?` | DROPPED | DROPPED | DROPPED | |
| `noiseTurbulence` | `number?` | DROPPED | DROPPED | DROPPED | |
| `noiseIntensity` | `number?` | DROPPED | DROPPED | DROPPED | |

### Motion Reactivity

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `motionSwingSensitivity` | `number?` | LOSSY — Xenopixel has `swing_sensitivity` GLOBAL but it's sourced from `useXenopixelSettingsStore`, NOT from `BladeConfig.motionSwingSensitivity` | DROPPED | DROPPED | Per-preset motion sensitivity unsupported. |
| `motionAngleInfluence` | `number?` | DROPPED | DROPPED | DROPPED | |
| `motionTwistResponse` | `number?` | LOSSY — Xenopixel has global `twist_sensitivity` from xeno store, not from BladeConfig | DROPPED | DROPPED | |
| `motionSmoothing` | `number?` | DROPPED | DROPPED | DROPPED | |
| `motionSwingColorShift` | `RGB?` | DROPPED | DROPPED | DROPPED | |
| `motionSwingBrighten` | `number?` | DROPPED | DROPPED | DROPPED | |

### Color Dynamics

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `colorHueShiftSpeed` | `number?` | DROPPED | DROPPED | DROPPED | |
| `colorSaturationPulse` | `number?` | DROPPED | DROPPED | DROPPED | |
| `colorBrightnessWave` | `number?` | DROPPED | DROPPED | DROPPED | |
| `colorFlickerRate` | `number?` | DROPPED | DROPPED | DROPPED | |
| `colorFlickerDepth` | `number?` | DROPPED | DROPPED | DROPPED | |

### Spatial Pattern

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `spatialWaveFrequency` | `number?` | DROPPED | DROPPED | DROPPED | |
| `spatialWaveSpeed` | `number?` | DROPPED | DROPPED | DROPPED | |
| `spatialDirection` | `LayerDirection?` | DROPPED | DROPPED | DROPPED | |
| `spatialSpread` | `number?` | DROPPED | DROPPED | DROPPED | |
| `spatialPhase` | `number?` | DROPPED | DROPPED | DROPPED | |

### Blend & Layer

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `blendSecondaryStyle` | `string?` | DROPPED | DROPPED | DROPPED | Single-effect firmware on all three. |
| `blendSecondaryAmount` | `number?` | DROPPED | DROPPED | DROPPED | |
| `blendMaskType` | `'none'\|...` | DROPPED | DROPPED | DROPPED | |

### Tip & Emitter

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `tipColor` | `RGB?` | DROPPED | DROPPED | DROPPED | |
| `tipLength` | `number?` | DROPPED | DROPPED | DROPPED | |
| `tipFade` | `number?` | DROPPED | DROPPED | DROPPED | |
| `emitterFlare` | `number?` | DROPPED | DROPPED | DROPPED | |
| `emitterFlareWidth` | `number?` | DROPPED | DROPPED | DROPPED | |

### Image Scroll

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `imageData` | `Uint8Array?` | DROPPED | DROPPED | DROPPED | ImageScroll is ProffieOS-only. |
| `imageWidth` | `number?` | DROPPED | DROPPED | DROPPED | |
| `imageHeight` | `number?` | DROPPED | DROPPED | DROPPED | |
| `scrollSpeed` | `number?` | DROPPED | DROPPED | DROPPED | |
| `scrollDirection` | enum | DROPPED | DROPPED | DROPPED | |
| `scrollRepeatMode` | enum | DROPPED | DROPPED | DROPPED | |

### Dual-Mode Ignition

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `dualModeIgnition` | `bool?` | DROPPED | DROPPED | DROPPED | |
| `ignitionUp` | `string?` | DROPPED | DROPPED | DROPPED | |
| `ignitionDown` | `string?` | DROPPED | DROPPED | DROPPED | |
| `ignitionAngleThreshold` | `number?` | DROPPED | DROPPED | DROPPED | |
| `retractionUp` | `string?` | DROPPED | DROPPED | DROPPED | |
| `retractionDown` | `string?` | DROPPED | DROPPED | DROPPED | |

### Ignition/Retraction Tuning Params

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `stutterFullExtend` | `bool?` | DROPPED | DROPPED | DROPPED | Style-tuning params have no firmware analog. |
| `stutterCount` | `number?` | DROPPED | DROPPED | DROPPED | |
| `stutterAmplitude` | `number?` | DROPPED | DROPPED | DROPPED | |
| `glitchDensity` | `number?` | DROPPED | DROPPED | DROPPED | |
| `glitchIntensity` | `number?` | DROPPED | DROPPED | DROPPED | |
| `sparkSize` | `number?` | DROPPED | DROPPED | DROPPED | |
| `sparkTrail` | `number?` | DROPPED | DROPPED | DROPPED | |
| `wipeSoftness` | `number?` | DROPPED | DROPPED | DROPPED | |
| `shatterScale` | `number?` | DROPPED | DROPPED | DROPPED | |
| `shatterDimSpeed` | `number?` | DROPPED | DROPPED | DROPPED | |

### Effect Customization

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `clashLocation` | `number?` | DROPPED | DROPPED | DROPPED | |
| `clashIntensity` | `number?` | LOSSY — Xenopixel has global `clash_sensitivity` from xeno store (not from BladeConfig). | DROPPED | DROPPED | |
| `unstableKylo` | `bool?` | DROPPED | DROPPED | DROPPED | |
| `clashDecay` | `number?` | DROPPED | DROPPED | DROPPED | |
| `blastCount` | `number?` | DROPPED | DROPPED | DROPPED | |
| `blastSpread` | `number?` | DROPPED | DROPPED | DROPPED | |
| `stabDepth` | `number?` | DROPPED | DROPPED | DROPPED | |

### Custom Curves

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `ignitionCurve` | `[n,n,n,n]?` | DROPPED | DROPPED | DROPPED | |
| `retractionCurve` | `[n,n,n,n]?` | DROPPED | DROPPED | DROPPED | |

### Blade Hardware

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `stripType` | enum | N/A (not in board) — Xenopixel firmware is hardware-fixed for WS2812B single-strip | DROPPED | DROPPED | |
| `bladeType` | `'neopixel'\|'in-hilt-led'` | N/A (not in board) | DROPPED | DROPPED | |
| `customLedCount` | `number\|null?` | LOSSY — `customLedCount` is NOT read by `generateXenoFontConfig` or `generateXenoGlobalConfig`. Only `ledCount` (the resolved value) is read. If the resolution path runs upstream, it's preserved transitively. | DROPPED | DROPPED | Verify upstream — likely OK in practice. |

### Extension escape hatch

| Field | Type | Xenopixel V3 | CFX | Golden Harvest | Notes |
|---|---|---|---|---|---|
| `[key: string]: unknown` (`xenoInTimeMs`, `xenoOutTimeMs`, `xenoCustomFunction`) | various | PRESERVED (V1.4.0+ only) — read via type-narrowed cast in XenopixelEmitter.ts:347-361. **NOT wired into the live `zipExporter.ts` pipeline**, which uses its own non-versioned `generateXenoFontConfig`. | N/A | N/A | Version-gated extras are correctly handled in XenopixelEmitter class but lost in production export path. |

## Systemic findings

1. **Two parallel emitter paths, both lossy in different ways.** The `XenopixelEmitter` / `CFXEmitter` / `GHv3Emitter` classes in `packages/codegen/src/emitters/` are NOT what the live ZIP export uses. `apps/web/lib/zipExporter.ts` has its own `generateXenoFontConfig`, `generateCfxMainConfig`, `generateGoldenHarvestConfig` functions inline. The emitter classes have **superior coverage** (firmware-version-aware Xenopixel V1.4.0 extras, broader style-degradation map, speed clamping with notes) — but they are dormant code. **Either delete the emitter classes or rewire the ZIP exporter to call them.** This is the highest-priority structural finding.

2. **Xenopixel style coverage is the biggest one-sided loss.** The live pipeline's `XENO_STYLE_MAP` covers 6 KyberStation style IDs (fire, stable, unstable, rainbow, crystalShatter, pulse). KyberStation has 33 blade styles per CLAUDE.md. **27 styles silently default to Steady (1)** with no degradation note (the live xenoStyleId returns `?? 1` without surfacing a warning). XenopixelEmitter.ts has a more thoughtful degradation map (rotoscope→Steady, plasma→Fire, aurora→Rainbow, etc.) with `degradationNote` returns — adopting that mapping in the live pipeline is a feasible LOSSY→LOSSY-with-note upgrade.

3. **All modulation, motion-reactivity, blend, tip, image-scroll, dual-mode, noise, spatial, and color-dynamics fields are DROPPED on all three boards.** That's ~60 BladeConfig fields representing KyberStation's "advanced styling" surface that simply have no firmware analog on Xenopixel/CFX/GH. This is architecturally correct — these features ARE ProffieOS-only — but the export UI should clearly warn users when they switch board target and lose 60% of their configuration.

4. **CFX and GH design-reference output is honest about its status** (inline `KYBERSTATION DESIGN REFERENCE` banner + sibling README), but **field coverage is still narrow** even for documentation purposes: only baseColor/clashColor/lockupColor/blastColor/style/ignition/retraction/ignitionMs/retractionMs/ledCount are surfaced. None of the spatial/preon/motion params are mentioned — a richer design-reference doc could include them with a "your vendor may have an equivalent setting called X" footnote.

## High-priority LOSSY findings (Xenopixel only — CFX/GH are design-ref)

| Field | Current state | Feasible fix |
|---|---|---|
| `style` | `XENO_STYLE_MAP` has 6 entries; 27 styles silently → Steady | Adopt the `mapBladeEffect` map from `XenopixelEmitter.ts:166-209` in `zipExporter.ts:xenoStyleId`. Surface degradation notes in the ZIP README. |
| `ignition` | Live `XENO_IGNITION_MAP` lacks degradation fallbacks for `center`/`stutter`/`glitch`/`crackle`/`fracture`/`flashFill`/`pulseWave`/`dripUp` — all silently → Standard (0) | Adopt `mapIgnitionStyle` from `XenopixelEmitter.ts:231-258`. Notes string already implemented in emitter class. |
| `ignitionMs` / `retractionMs` clamp inconsistency | Live pipeline emits raw ms; emitter class clamps to 100-800 / 200-1000. Firmware likely truncates. | Apply `clampIgnitionSpeed` / `clampRetractionSpeed` in the live pipeline; emit clamp notes. |
| `ledCount` derived from `presets[0]` only | Multi-blade configs with different LED counts silently use the first blade's value | Detect mismatch and emit a warning note. Xenopixel firmware can't do per-blade LED counts so the LOSSY status stays, but the user deserves to be told. |
| `clashColor` / `lockupColor` / `blastColor` / `meltColor` / `lightningColor` / `dragColor` | Fully DROPPED | Xenopixel firmware has no per-preset effect colors. Accept LOSSY, surface as a single "Xenopixel does not support per-preset effect colors" note in the ZIP README. Already partially documented. |
| `customLedCount` | Not directly read | Verify the upstream resolver always folds `customLedCount` into `config.ledCount` before export. If yes, this is implicitly PRESERVED. If no, fix the resolver. |
| Firmware-version extras (`xenoInTimeMs`, `xenoOutTimeMs`, `xenoCustomFunction`) | Only the emitter class supports V1.4.0+ per-font in/out time + custom function. Live pipeline ignores firmware version. | Wire `firmwareVersion` from `useXenopixelSettingsStore` into the live pipeline, or replace the live pipeline with calls into `XenopixelEmitter`. |

## UNVERIFIED items

- `customLedCount` — emitter doesn't read it directly; verify a resolver in `bladeStore` or `zipExporter` folds it into `ledCount` before the emit. (Quick trace likely confirms this works; flagged for explicit grep.)
- `motionSwingSensitivity` / `motionTwistResponse` interaction with `useXenopixelSettingsStore` — the global Xeno settings store has parallel `swing_sensitivity` / `twist_sensitivity` fields. Intent unclear: do these come from the user's Xeno-mode toggles, or should KyberStation's BladeConfig motion fields auto-sync into the store on board switch? Current behavior: BladeConfig motion fields are simply DROPPED and the Xeno store values are used independently.
- `preonEnabled` semantic mismatch — Xenopixel encodes preon as ignition-style IDs 5-11 (`stack`, `foldTile`, `word`, `faser`, `scavenger`, `hunter`, `broken`). If a KyberStation user sets `preonEnabled=true` AND `ignition=standard`, the emitter currently silently drops the preon. Question for product: should the emitter substitute a preon-bearing Xeno ignition ID when `preonEnabled` is true? (E.g., default to `stack` (5) for preon-enabled standard ignition.)
- The `XenopixelEmitter` class and its richer degradation maps + V1.4.0 firmware-version handling appear to be orphaned code. Verify whether any test fixture or import path references it; if not, decide between delete vs. rewire-into-zipExporter.
