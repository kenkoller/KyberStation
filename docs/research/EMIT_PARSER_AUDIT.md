# Emit ↔ Parser Encoding Audit

**Status:** Living reference. Updated 2026-05-16 (audit-closeout pass) after the smoking-gun bench finding + the B1/B2 multi-board field-coverage audit reconciliation. Sections F (share URL), G (saber profile migration), and I (sound-font existence pre-check) flipped from ⚠ Unverified → ✅ Verified after PR #327, #332, and #340 landed. Sections H (Fett263 parser surface) and J (image sampling math) carry informational ⚠ marks rather than blocking gaps.
**Why this exists:** KyberStation emits text/binary/JSON to downstream parsers (firmware, vendor apps, our own persistence). Each interface is an opportunity for unit-scale, range, ordering, or schema-version mismatches. This doc captures the contract at each boundary so future contributors don't re-discover encoding rules by trial-and-error.

**Companion doc:** [`MULTI_BOARD_FIELD_COVERAGE_2026-05-16.md`](./MULTI_BOARD_FIELD_COVERAGE_2026-05-16.md)
— canonical per-field coverage matrix across Proffie compile-flash / Proffie runtime
Phase A+C / Xenopixel / CFX / Golden Harvest. Use the matrix for "does field X reach
hardware on board Y" questions; use this audit for "what bytes do we emit at boundary Z"
questions.

## The investigative lesson (read first)

On 2026-05-15/16 we spent ~6 hours of bench time concluding that ProffieOS's parser-verb path (`advanced`, `standard`, `cycle`, `fire`, `unstable`, `strobe`) had a "fundamental limitation" producing visibly dim blades. We theorized about AudioFlicker semantics, slot ordering, ColorCycle wrapping, chromatic LED response, drafted an upstream PR proposal for a new `vibrant` verb.

The actual bug: **KyberStation was emitting RGB color args in 0-255 range; ProffieOS's `RgbArg<>` parser stores them as `Color16` which expects 0-65535**. Every Phase C blade was rendering at 1/257 of intended brightness (~0.4%). Fix was a 12-line change scaling each channel × 257 before emit.

**Lesson for the next contributor:** when symptoms suggest a "fundamental limitation" or "template/firmware constraint":

1. **First** — verify the exact bytes you emit match what the consumer's parser expects. Read the parser source. Trace one value through end-to-end.
2. **Second** — only after step 1 is verified clean, investigate behavior.

The encoding layer is the cheapest layer to verify and the highest-leverage place to find bugs. If we'd read `styles/rgb_arg.h:41` on day 1 we'd have saved a session of bench time.

This audit doc exists so step 1 is fast.

## Interface inventory

Each row: what KyberStation emits, what the consumer expects, status, source-of-truth references.

### A. ProffieOS — compile + flash path (`apps/web/lib/zipExporter.ts` `proffie` board)

| What we emit | Consumer expects | Status | Notes |
|---|---|---|---|
| `Rgb<R,G,B>` literals in `config.h` (R,G,B 0-255) | C++ template — `Color16(Color8(R,G,B))` auto-scales × 257 at compile time | ✅ Verified | `common/color.h:191` constructor handles 8→16-bit promotion. KyberStation emits 0-255 in template args; C++ does the rest. |
| `IntArg<N, default>` time/option ints | Raw integers, ranges per-template (ms for timing, 0-32768 for proportions) | ✅ Verified | KyberStation emits raw values matching documented ranges. |
| `Preset presets[]` array entries | Specific struct layout per `common/preset.h` | ✅ Verified | `buildPresetsArray()` in codegen matches the struct shape. |
| `#define FETT263_*` etc. CONFIG_TOP defines | Verbatim preprocessor directives | ✅ Verified | Tokens passed through unchanged from `HardwareProfile.propDefines`. |
| `CONFIG_BLADES` / `BladeConfig` struct | Pin macros (`bladePin`, `bladePowerPin2`) + LED counts | ✅ Verified | Pin macros are unchanged-token passthrough; LED counts are raw ints. |

**Lesson:** This path is correct because C++ template instantiation does the scaling. The compile-flash path "just works" partly by accident — we'd have the same encoding bug if ProffieOS exposed a non-template literal Color16 API and KyberStation called it directly with 0-255 values.

### B. ProffieOS — runtime preset path (`packages/codegen/src/emitters/ProffieRuntimeEmitter.ts`)

| What we emit | Consumer expects | Status | Notes |
|---|---|---|---|
| `installed=<string>` first line | Byte-match against firmware's compile-time `install_time` constant | ✅ Verified | `current_preset.h:237` strict string match. Sourced from existing SD card or user paste. |
| `font=<folder>` / `track=<file>` | Plain-text path strings, newline-stripped | ✅ Verified | `sanitizeValue()` strips embedded newlines. |
| `style=builtin N M` (Phase A) | `BuiltinPresetAllocator::make()` parses N as preset index, M as blade number | ✅ Verified | `style_parser.h:15-41`. Empirically validated on V3.9-BT 2026-05-15. |
| `style=advanced R,G,B …` color args (Phase C) | **`RgbArg<>` stores as `Color16(r, g, b)` directly — expects 0-65535** | ✅ **Fixed 2026-05-16** | `styles/rgb_arg.h:41`. Was emitting 0-255; rendered at 0.4% brightness. Now × 257 scaled. |
| `style=advanced … <int> …` timing args (Phase C) | Raw milliseconds | ✅ Verified | `IntArg<>` accepts raw ints; KyberStation emits raw ms. |
| `name=<string>`, `variation=<int>` | Plain text | ✅ Verified | Sanitized, raw int respectively. |

**Lesson learned here:** parser-verb runtime args need 16-bit color encoding. This is the bug we just fixed. Test coverage: `packages/codegen/tests/proffieRuntimeEmitter.test.ts` pins the 16-bit byte format.

**Field-coverage caveats:** the encoding is correct, but Phase A delivers only 5 knobs
(`name`, `font`, `track`, `order`, `variation`) and Phase C adds 7 more (4 colors + 2 times
+ style-stub). The remaining ~91 of 103 BladeConfig fields are DROPPED in both phases. See
[`MULTI_BOARD_FIELD_COVERAGE_2026-05-16.md`](./MULTI_BOARD_FIELD_COVERAGE_2026-05-16.md) for
the per-field matrix.

### C. Xenopixel V3 — SD card format (`zipExporter.ts` `xenopixel` board)

| What we emit | Consumer expects | Status | Notes |
|---|---|---|---|
| `font{N}=(R,G,B),...` in `fontconfig.ini` (R,G,B in 0-255) | Xenopixel V3 firmware native format | ✅ Verified | Different firmware family; vendor docs specify 0-255 native. B2 audit confirms format matches. |
| Blade effect IDs (0-7), ignition style IDs (0-11) | Xenopixel firmware ID enums | ✅ Verified (encoding) — ⚠ Lossy coverage | `XENO_STYLE_MAP` / `XENO_IGNITION_MAP` in zipExporter map KyberStation IDs to Xeno IDs. **B2 audit finding (2026-05-16):** live `XENO_STYLE_MAP` covers only 6 of 33 KS styles; 27 silently degrade to Steady. Live `XENO_IGNITION_MAP` lacks fallbacks for KS-specific ignitions. See canonical matrix's Critical Structural Findings #1. Byte format is correct; field coverage is narrow. |
| `set/config.ini` global settings | Xenopixel V3 firmware native format | ✅ Verified | One-to-one mapping from `useXenopixelSettingsStore`. |
| `ignitionMs`/`retractionMs` raw integers | Firmware-clamped on parse | ⚠ Clamp inconsistency | **B2 audit finding (2026-05-16):** `XenopixelEmitter` (dormant class) clamps to `[100, 800]` / `[200, 1000]`; live `zipExporter.ts` pipeline emits raw. Two parallel paths disagree. Firmware likely truncates silently. See canonical matrix's P1 finding #9. |

**Not yet bench-validated on real Xenopixel hardware.** Marked "verified" against vendor format docs only.

**See also:** the canonical matrix [`MULTI_BOARD_FIELD_COVERAGE_2026-05-16.md`](./MULTI_BOARD_FIELD_COVERAGE_2026-05-16.md)
for full per-field coverage of all 103 BladeConfig fields on Xenopixel. The dormant
`XenopixelEmitter` class in `packages/codegen/src/emitters/` has richer coverage than the
live `zipExporter.ts` inline pipeline — see Critical Structural Findings #1.

### D. CFX + Golden Harvest — design reference only (NOT flashable)

| What we emit | Consumer expects | Status | Notes |
|---|---|---|---|
| INI-style text with KyberStation invented section names | N/A — these are documentation notes for users to manually configure via vendor app | ⚠ N/A | README files in the ZIP make this explicit. The format is NOT a real CFX/GH firmware config. |

### E. Modulation bindings → ProffieOS scale templates (`packages/codegen/src/proffieOSEmitter/mapBindings.ts`)

| What we emit | Consumer expects | Status | Notes |
|---|---|---|---|
| `Scale<SwingSpeed<400>, Int<0>, Int<N>>` etc. where N = round(amount × 32768) | ProffieOS 0-32768 convention for Scale ranges | ✅ Verified | `mapBindings.ts:485`. Conventional ProffieOS unit. |
| Sin breathing idiom `Scale<Sin<Int<period_ms>>, Int<0>, Int<hi>>` | Time-based oscillation; period in ms | ✅ Verified | Period is raw ms; hi is 0-32768. |
| Snapshot values for unmappable bindings | Static fallback baked into AST | ✅ Verified | Falls through cleanly. |
| **Wave 8 — `triggerEvent` bindings:** `Scale<EffectPulseF<EFFECT_BLAST>, Int<0>, Int<hi>>` etc. — wraps the aux/gesture event source in the spec'd `EFFECT_*` template | ProffieOS fires the wrapper on the matching firmware event; firmware natively dispatches `EFFECT_BLAST` / `EFFECT_FORCE` / `EFFECT_STAB` / `EFFECT_LOCKUP_BEGIN` / `EFFECT_USER1-6` | ✅ Verified | `packages/codegen/src/proffieOSEmitter/buttonEventMap.ts` owns the (event → EFFECT_*) table. 12 events covered (7 button + 5 gesture). Three wrapper shapes: `EffectPulseF<EFFECT_X>` (one-shot), `TransitionEffectL<TrInstant, inner, EFFECT_X>` (layer-level), `Trigger<EFFECT_X, inner>` (sustained). Bindings with `triggerEvent` + non-event source fall back to snapshot path with `TRIGGER_EVENT_NON_EVENT_SOURCE` reason. Bindings with aux/gesture source but no `triggerEvent` fall back to snapshot with `EVENT_SOURCE_WITHOUT_TRIGGER` (no canonical template for a bare event modulator). Drift sentinel keeps `PropFileEvent` mirror in lock-step with engine canonical type. |

### F. Share URL / Kyber Code (`apps/web/lib/configUrl.ts`, `apps/web/lib/sharePack/`)

| What we emit | Consumer expects | Status | Notes |
|---|---|---|---|
| Compressed binary payload base64-encoded in URL | KyberStation's own decoder | ⚠ Symmetric — both ends are us | Internal contract. Versioning is the main risk (we change schema; old URLs break). |
| Single-preset config in payload | Same shape as runtime `BladeConfig` | ✅ Verified | **Wire-format fixtures at `apps/web/tests/fixtures/kyberGlyphs/v1/fixtures.json`** pin byte-exact emit output; `apps/web/tests/kyberGlyph.test.ts:432-453` asserts `expect(encoded).toBe(fixture.glyph)`. Schema breaks fail the fixture round-trip. v2 (modulation) covered separately at `apps/web/tests/kyberGlyphV2Modulation.test.ts`. |

**Note:** the audit originally posited a "preset list state in payload" row, but the actual format encodes a single `BladeConfig`. Preset-list serialization is not yet a shipped feature; it would land as a v3 schema bump and require new fixtures.

### G. Saber Profile / IndexedDB persistence (`apps/web/stores/saberProfileStore.ts`)

| What we emit | Consumer expects | Status | Notes |
|---|---|---|---|
| JSON serialization of `SaberProfile[]` to localStorage | Same shape on next session load | ⚠ Symmetric — both ends are us | Migration logic for schema changes lives in the store. |
| Has a `migrateImportFields` step for legacy data | Backward compat across versions | ✅ Verified (2026-05-16) | **PR #327 shipped fixture-driven migration tests.** `apps/web/tests/saberProfileMigration.test.ts` pins v1 → v2 → v3 schemas with hand-authored fixtures (`apps/web/tests/fixtures/saberProfiles/v1.json`, `v2.json`, `v3.json`). `loadFromStorage` → `migrateProfile` path is now regression-locked. |

### H. Fett263 / OS7 import parser (`packages/codegen/src/parser/`)

| What it parses (consumer here is KyberStation itself) | Status | Notes |
|---|---|---|
| Hand-written ProffieOS C++ from clipboard / file | ⚠ Complex; non-trivial parser surface | Many edge cases. 372 templates registered, 153→372 expansion in v0.21.x. |
| `tokenize` + `filterTokens` + `reconstructConfig` pipeline | ⚠ Has known limitations | Some Fett263 stylebrary patterns require manual cleanup. Tracked in PR history. |
| AST round-trip for "Convert to native" flow | ⚠ Lossy for unsupported templates | `importedRawCode` preservation provides a safety net (emit verbatim if AST can't represent). |

**Not a unit-scale bug area, but a frequent friction point.** The audit here is different — it's about template-coverage completeness, not encoding.

### I. Sound font / track file references (`apps/web/lib/audio*.ts`)

| What we emit | Consumer expects | Status | Notes |
|---|---|---|---|
| `font=<folder>` / `track=tracks/<name>.wav` | Folder/file presence on SD card | ✅ Verified (2026-05-16) | **PR #340 shipped pre-flash validation.** `apps/web/lib/soundFontValidation.ts` enumerates the immediate-child directories on the user's selected SD card and cross-references against each preset's `fontName` (case-insensitive, mirroring ProffieOS firmware). Mismatches raise `SoundFontWarningModal` listing missing folders + a "did you mean?" prefix hint. User can Cancel write or Continue anyway. Direct-write path only — ZIP export users get a general "copy your fonts in after extracting" notice (no enumeration without a dirHandle). |

### J. Image import → ImageScroll style codegen (`apps/web/lib/import/`, `packages/codegen/src/ASTBuilder.ts:410`)

| What we emit | Consumer expects | Status | Notes |
|---|---|---|---|
| Sampled image columns → multi-stop `Gradient<>` with RGB literals | C++ compile-time `Gradient<Rgb<R,G,B>, ...>` | ✅ Verified | Uses compile-time literals (auto-scaled at C++ compile time). |
| Image data (Uint8Array, width, height) in BladeConfig | Internal state | ⚠ Symmetric | Worth pinning the sampling math for stability. |

## Suggested follow-up work

Prioritized by how likely the row turns up another bug:

1. ~~**(F) Share URL round-trip test**~~ — ✅ **Already shipped.** `apps/web/tests/fixtures/kyberGlyphs/v1/fixtures.json` + `apps/web/tests/kyberGlyph.test.ts` pin byte-exact wire-format serialization for v1 schema. v2 (modulation) at `kyberGlyphV2Modulation.test.ts`. Single-config payload only — preset-list serialization is future v3 work.

2. **(C) Xenopixel V3 hardware validation** — we've never bench-tested a Xenopixel saber with KyberStation-emitted files. Format is correct in theory; in practice unverified. Needs a Xenopixel V3 board + bench session. **Out of scope for software-only work.**

3. ~~**(I) Sound font existence pre-check**~~ — ✅ **Shipped (2026-05-16, PR #340).** Live in `apps/web/lib/soundFontValidation.ts` + `SoundFontWarningModal`. Direct-write path enumerates SD card font folders + raises modal on mismatch.

4. ~~**(G) Saber profile migration test fixtures**~~ — ✅ **Shipped (2026-05-16, PR #327).** Fixtures live at `apps/web/tests/fixtures/saberProfiles/v{1,2,3}.json`; driven by `apps/web/tests/saberProfileMigration.test.ts`.

5. **(H) Parser audit** — the import parser's template registry grew from 153 → 372 in v0.21.x. A round-trip test on the entire Fett263 stylebrary corpus would catch regressions in import fidelity. We already have `fett263Fixtures.test.ts` — extend it.

6. **(J) Image sampling math fixture** — `ASTBuilder.ts:410-433` samples 12 columns from a Uint8Array at the midrow. Pin the sampled colors for a known image input (e.g., a 12×12 known-color test image) to catch accidental changes to the sampling algorithm. ~30 min. **Low priority** — sampling output is symmetric (both KyberStation's emit and the test would change together) so the value is mostly preventing accidental regressions during refactors.

6. **(B) Phase C `builtin N M color args` follow-up** — we proved factory Vader template hardcodes `Red` (no `RgbArg<>`), so `builtin 1 1 R,G,B` color override doesn't work for that specific preset. But OTHER factory presets might use `RgbArg<>` — particularly the Vortex template we saw in `89V3_allfont.h` uses `RotateColorsX<Variation, RgbArg<>>` patterns. **Bench test**: send `builtin N M <16-bit colors>` for various N and see which factory presets accept color overrides. Would expand Phase A's customization surface without changing emitter shape.

## Regression-test conventions for encoding contracts

When you fix an emit-to-parser encoding bug:

1. **Reference the source line in the parser.** E.g. `styles/rgb_arg.h:41` shows exactly what the consumer does. Put it in a comment near your emit code AND in the test that pins the format. Future-you reads the test, sees the source ref, can verify.

2. **Test the SEMANTIC value, not just the format.** Old test pinned `expect(out).toContain('255,0,128')` — that test was "passing" while the blade was 0.4% dim. New test pins `expect(out).toContain('65535,0,32896')` because 32896 = 128 × 257 and that's the actual semantic claim.

3. **Note bench-verification in the comment** if you have it. "Empirically verified 2026-05-16 on 89sabers V3.9-BT" carries authority that "I read the source and think this is right" doesn't.

## Source references for ProffieOS encoding

For quick lookup when investigating an emit-to-parser bug at the ProffieOS boundary:

- **Color values in runtime args (`RgbArg`):** [`styles/rgb_arg.h:41`](/Users/KK/ProffieOS/styles/rgb_arg.h) — `Color16(r, g, b)` direct, 0-65535 range
- **Color values in compile-time templates (`Rgb<>`):** [`styles/rgb.h`](/Users/KK/ProffieOS/styles/rgb.h) + [`common/color.h:191`](/Users/KK/ProffieOS/common/color.h) — `Color16(Color8(R,G,B))` auto-scaled × 257
- **Named-style parser entries:** [`styles/style_parser.h:45-117`](/Users/KK/ProffieOS/styles/style_parser.h) — slot signatures for `standard`, `advanced`, `cycle`, `fire`, `unstable`, `strobe`, `rainbow`, `charging`, `builtin`
- **Sound level for AudioFlicker:** [`functions/sound_level.h:31-44`](/Users/KK/ProffieOS/functions/sound_level.h) — `NoisySoundLevelCompat` returns 0-32768
- **Preset file schema:** [`common/current_preset.h:114-194`](/Users/KK/ProffieOS/common/current_preset.h) — `Read()` for parsing, `Write()` for emit
- **Style template rendering pipeline:** [`styles/style_ptr.h:31-89`](/Users/KK/ProffieOS/styles/style_ptr.h) — where `getColor` flows to LED PWM
- **Layer compositing operator:** [`common/color.h:553-630`](/Users/KK/ProffieOS/common/color.h) — `operator<<` between SimpleColor / OverDriveColor / RGBA variants
