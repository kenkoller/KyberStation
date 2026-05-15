# Codegen Correctness Audit

**Date:** 2026-05-15
**Author:** session-end synthesis after the v0.17 Hardware Profiles MVP Phase 1
**Status:** Strategic recommendations — not yet ratified; v0.17 sprint candidate
**Companion docs:** [HARDWARE_COMPATIBILITY_STRATEGY.md](./HARDWARE_COMPATIBILITY_STRATEGY.md) §7 item 3 commissioned this audit; [SESSION_2026-05-14_V39BT_BENCH.md](../archive/SESSION_2026-05-14_V39BT_BENCH.md) captures the failure context.

---

## 1. Goal & framing

The 2026-05-14 V3.9-BT bench session established that **a codegen output failing to boot on real Proffieboard hardware is not just a "wrong topology" problem**. Even after KyberStation's output was hand-rewritten to match the factory `CONFIG_TOP` (NUM_BLADES=2, 128+30 LEDs, USB_TOWARDS_BLADE, ENABLE_SERIAL, factory FETT263 defines), the firmware still failed to boot.

That means at least one of the following is true:

- **Codegen emits a preset body shape that ProffieOS 7.x runs differently than the vendor configs do, even when it compiles cleanly.**
- **Build-environment drift** between KyberStation's toolchain and 89sabers' is producing a non-compatible binary.
- **The V3.9-BT chassis** has hardware-level differences from V3.9 non-BT that aren't yet documented anywhere we have access to.

This audit addresses **only the first** — what does codegen emit, where does it diverge from known-working vendor output, and which gaps are likely to bite a user when Phase 2 wiring lands. The other two paths need hardware verification (ST-Link boot log, factory-config-from-our-toolchain flash test) and are out of scope here.

**Practical implication:** every severity ranking below is a *hypothesis*. None of these gaps are confirmed boot-blockers. They are documented risks that Phase 2 should account for and that Phase 3 hardware verification can confirm or dismiss.

---

## 2. Method

Three parallel exploration probes:

1. Surveyed `@kyberstation/codegen` to enumerate what templates the AST builder + emitter can produce (18 base styles, the wrapping pattern, the effect/transition/function catalog).
2. Parsed all **28 presets** in [`89V3_allfont.h`](/tmp/89sabers-config-download/89V3_allfont.h) (CCSabers' published OS 7.12 pack) and categorized their style template shapes.
3. Re-read [`scripts/hardware-test/build-modulation-test-config.mjs`](../../scripts/hardware-test/build-modulation-test-config.mjs) — the only documented case where KyberStation's codegen output booted on real hardware, after being post-processed.

Verified directly: engine style file inventory (33 .ts files in `packages/engine/src/styles/`) and the actual CONFIG_TOP block of `89V3_allfont.h`.

---

## 3. Findings

### Finding 1 — Wrapper pattern mismatch (`Layers<>` vs `InOutHelper<>`)

**KyberStation emits** every preset as:

```cpp
StylePtr<
  Layers<
    BaseStyle,                                    // 1 of 18 supported styles
    [TransitionEffectL<preon>],                   // optional, OS7+
    [TransitionEffectL<stab>],                    // optional
    BlastL<...> | AlphaL<BlastL<>, Bump<>>,
    SimpleClashL<Rgb, Int<40>>,
    [SimpleClashL<White, Int<60>>],               // optional, Unstable-Kylo
    LockupTrL<...> | ResponsiveLockupL<...>,
    [Drag layer],
    LockupTrL<Stripes<...>, ..., LOCKUP_LIGHTNING_BLOCK>,
    [Melt layer],
    InOutTrL<ignition, retraction>
  >
>()
```

This is the modern OS7 "layer overlay" composition model — the pattern Fett263's prop file and ProffieOS docs recommend for new presets. Source: `packages/codegen/src/ASTBuilder.ts` L800–813; `packages/codegen/src/CodeEmitter.ts` L67, L115–119.

**The 28 published 89sabers presets** use almost exclusively the **older callback-replacement pattern**:

| Pattern | Count | Skeleton |
|---|---|---|
| `InOutHelper<SimpleClash<Lockup<Blast<C1,C2>,AudioFlicker<C1,C2>>,clashColor>,t1,t2>` | 13 | the dominant shape |
| `InOutHelper<EasyBlade<OnSpark<flicker>,color>,t1,t2>` | 6 | flicker variants |
| `InOutHelper<EasyBlade<OnSpark<InOutTr<...,TrColorCycle,TrFade,...>>,color>,t1,t2>` | 2 | transition-based |
| `InOutHelper<...Stripes / RandomPerLEDFlicker / TransitionLoop / Cylon...>` | 4 | one-off variants |
| `StyleFire<Red,Yellow>` (bare, no wrapper) | 1 | Fire preset outlier |
| `Layers<StyleFire<Stripes<...>>, AlphaL<...>, LockupTrL<...>, ResponsiveLightningBlockL<...>, ...>` | 1 | Vortex outlier (matches KyberStation's pattern) |
| Bare style (no `InOutHelper`, no `Layers`) | 1 | StyleFire |

Only **1 of 28** vendor presets uses the same wrapper shape KyberStation always emits.

Both patterns are valid ProffieOS 7.x. Both compile. They differ semantically:

- **`InOutHelper<callback>`** wraps the whole style and treats effects as nested callback replacements: `SimpleClash` returns clashColor on clash, `Lockup` returns the audio-flickering color on lockup, otherwise return the base.
- **`Layers<base, effectL...>`** composites effect layers as overlays on top of the base style. Effect layers have their own alpha/spatial behavior.

The runtime behavior diverges around effect interaction (overlay-blend vs callback-replace) but should be visually similar for most presets. **However**, deeply-nested `Layers<>` templates produce significantly deeper C++ template instantiations than nested `InOutHelper<>`. KyberStation emits 8–11 Layers slots regularly; 89sabers presets nest 3–5 levels of callback. The template-depth difference is plausibly relevant to compile-time, binary-size, and possibly runtime stack pressure on the STM32L452RE, though none of this is confirmed.

**Severity (hypothesis):** **Medium.** This is the most visible structural difference between what works for real users today and what KyberStation produces. Not yet confirmed to be a boot-blocker.

**Phase 2 recommendation:** Have `codegen-adapter.ts` accept a `wrapperStyle: 'layers' | 'in-out-helper'` flag and default to `'in-out-helper'` for `hardwareProfile.source === 'community-validated' | 'vendor-confirmed'`. Power users who want `Layers<>` can opt in. This minimizes deviation from known-good community output without removing modern capability.

### Finding 2 — `AudioFlicker` masks modulation when audio level is silent

`stable`, `unstable`, and `pulse` base styles all wrap their base color in `AudioFlicker<Rgb, Mix<...>>`. On hardware without a loaded sound font (no SD card, factory-fresh chip), ProffieOS reports audio level = 0. `AudioFlicker` returns its `colorA` (the base color) and the `Mix<>` modulation never gets through.

This is the **only documented case** of a KyberStation codegen output failing on real hardware in a specific, identified way. The 2026-04-27 modulation test boot succeeded on a 89sabers V3.9 board only after `scripts/hardware-test/build-modulation-test-config.mjs` post-processed the emitted config:

```diff
- AudioFlicker<
-   Rgb<0,140,255>,
-   Mix<Scale<SwingSpeed<400>, Int<0>, Int<32768>>, Rgb<0,140,255>, White>
- >
+ Mix<Scale<SwingSpeed<400>, Int<0>, Int<32768>>, Rgb<0,140,255>, Rgb<255,40,40>>
```

Quoting the script's justification (L108–116):

> Strip the AudioFlicker wrapper so the live Mix is the blade's direct color. AudioFlicker gates on audio level: with no SD card / font loaded, audio level = 0 and the blade stays pinned to colorA (baseColor), masking our shimmer modulation entirely. Hardware-test on a board without sound needs the raw Mix to show through.

**This is environmental, not a codegen bug.** Production users with fonts loaded will see modulation correctly because audio level rises and AudioFlicker opens the gate. But: **first-time users who flash before loading fonts will see a frozen, dim blade and conclude KyberStation is broken.** That's the worst possible onboarding moment.

**Severity:** **Low to Medium for production** (users with fonts work fine); **Medium-High for first-flash UX** (boot-but-doesn't-modulate experience misleads users into thinking codegen is broken).

**Phase 2 recommendation:**
- **Don't change codegen behavior** — `AudioFlicker` is correct for production.
- **Add a documented "first-flash test" workflow** to [`docs/FLASH_GUIDE.md`](../FLASH_GUIDE.md): "Load sound fonts to the SD card *before* your first flash, otherwise the blade will appear frozen."
- **Optionally**, add an export-time toggle in the chassis picker UI: `[ ] First-flash dry test (strips audio gating)`. When ticked, codegen-adapter strips AudioFlicker wrappers from base styles. This reuses the modulation-test patch logic but as an exposed feature, not a hidden script.

### Finding 3 — Engine-only styles silently fall back to `stable` at emit time

KyberStation's engine ships 33 blade-style files in `packages/engine/src/styles/`. Codegen's AST builder (`packages/codegen/src/ASTBuilder.ts`) recognizes only **18** of them:

✅ With codegen parity (18): Aurora, BladeCharge, Cinder, CrystalShatter, DarkSaber, Fire, Gradient, ImageScroll, Painted, Photon, Plasma, Prism, Pulse, Rotoscope, SithFlicker, Stable, TempoLock, Unstable.

❌ Engine-only / visualizer-preview only (15): Automata, Candle, Cascade, DataStream, Ember, Gravity, Helix, Mirage, Moire, Nebula, Neutron, Shatter, Tidal, Torrent, Vortex.

When a user selects one of the 15 engine-only styles, builds a preset around it, and exports, the codegen path silently falls back to `stable` (per agent survey of `ASTBuilder.ts` L450–463). The user sees their hand-crafted Helix animation in the editor canvas, but the exported firmware ships plain blue.

This **violates the Hardware Fidelity Principle** the user has saved as a standing memory: "Engine styles must have codegen parity that runs on real Proffieboard; no visualizer-only fakes."

**Severity:** **High** — silent data loss between editor and hardware, no warning surfaced.

**Phase 2 recommendation, three options ranked:**

1. **Surface a hard warning at export time** when any preset uses a fallback-eligible style. Block export with "Style X is preview-only and will export as Stable. Continue?" modal. Lowest implementation cost, immediately closes the silent-failure gap. **Recommended for Phase 2.**
2. **Hide engine-only styles from the picker UI** unless an "experimental visualizer styles" toggle is set in Settings. Forces visibility of the gap to the user without removing capability.
3. **Implement codegen parity** for the 15 missing styles. Highest effort; should happen incrementally — start with the ones that have natural ProffieOS analogs (Helix could emit via `RotateColorsX<>`, Vortex could emit via the Vortex pattern in 89sabers' own preset).

A pre-commit / CI check that enumerates engine styles vs codegen handlers and fails on drift would prevent regression.

### Finding 4 — Color literal style (cosmetic)

KyberStation emits `Rgb<r,g,b>` for every color. 89sabers presets use named ProffieOS color constants (`Blue`, `Red`, `White`, `DeepSkyBlue`, `Snow`, `Yellow`, `DarkOrange`, etc.) where possible.

Both compile and produce identical output. The difference matters only for:
- **Diff-ability** when a user inspects their exported `config.h` and wants to compare against community examples.
- **Readability** for users coming from existing ProffieOS configs.

**Severity:** **Low.** Skip for Phase 2 unless trivially cheap.

**Phase 2 recommendation:** Optional cosmetic pass — when an emitted `Rgb<r,g,b>` matches one of the ~140 named ProffieOS color constants exactly, emit the name instead. Could land as a small post-pass on the AST. Not a Phase 2 blocker.

### Finding 5 — `InOutTrL<>` vs `InOutHelper<>` vs `InOutTr<>` (rolls up to Finding 1)

KyberStation's ignition/retraction always emits as a `Layers<>` slot via `InOutTrL<ignition, retraction>`. 89sabers presets use `InOutHelper<>` as the outer wrapper (subsumes ignition/retraction timing as numeric args: `InOutHelper<inner, 300, 800>`) or `InOutTr<>` for inner transition control (the `L` suffix is for layer use).

This is structurally the same divergence as Finding 1. Rolling up there.

### Finding 6 — Vortex outlier (positive evidence)

The single 89sabers preset that uses `Layers<>` (the "Vortex" sound font) demonstrates that the `Layers<>` shape IS used in published vendor configs, just rarely. Its emit shape closely matches what KyberStation produces by default. This is weak positive evidence that the `Layers<>` pattern is at least *runnable* on real 89sabers hardware — but it remains the exception, not the norm.

---

## 4. Severity matrix

| # | Finding | Severity (hypothesis) | Affects production users? | Phase 2 cost | Recommendation |
|---|---|---|---|---|---|
| 1 | Wrapper pattern (Layers vs InOutHelper) | M | Maybe — unconfirmed | Medium (new adapter flag + alt emitter) | Add `wrapperStyle` flag; default to `in-out-helper` for vendor profiles |
| 2 | AudioFlicker masks on silent audio | M (UX), L (production) | First-flash users only | Low (doc + optional toggle) | Document in FLASH_GUIDE; optional "dry test" toggle |
| 3 | Engine-only styles fall back to `stable` | **H** | Yes — silent data loss | Low (warning) to High (parity) | Surface hard export-time warning in Phase 2 |
| 4 | Color literal style (Rgb vs named) | L | No — cosmetic | Low | Optional cosmetic pass, post-Phase 2 |
| 5 | InOutTrL vs InOutHelper/InOutTr | M | Rolls into #1 | — | — |
| 6 | Vortex outlier | (positive evidence only) | — | — | — |

---

## 5. What this audit cannot diagnose

These need Phase 3 hardware verification — **none can be resolved by reading more code**:

- **Whether the wrapper-pattern difference (Finding 1) is a boot-blocker** on real V3.9 / V3.9-BT chassis, or just cosmetic. Test: build a known-working 89sabers preset via KyberStation's emit (with both wrapper styles), flash, see what boots.
- **Whether build-environment drift** (arduino-cli core 4.6 vs whatever 89sabers used; ProffieOS v7.12 tag vs 89sabers' tip-of-trunk) is the primary issue. Test: compile `89V3_allfont.h` unmodified from KyberStation's toolchain, flash, see if it boots. This is item 3 on the [SESSION_2026-05-14 next-session checklist](../archive/SESSION_2026-05-14_V39BT_BENCH.md#next-session-checklist).
- **Whether the V3.9-BT chassis** has hardware differences (pin assignments, BT module init requirements) that any non-BT-aware config can't address. Resolved by: factory `89sabers-config.h` from 89sabers support.
- **Whether `Layers<>` with 8+ slots overflows STM32L452RE stack** at runtime. Resolved by: ST-Link boot log during a failed flash.

The next-step recommendation in the session log ([SESSION_2026-05-14_V39BT_BENCH.md §"What we need before the next attempt"](../archive/SESSION_2026-05-14_V39BT_BENCH.md#what-we-need-before-the-next-attempt)) — buy an ST-Link clone, flash factory `89V3_allfont.h` from our toolchain, capture serial logs — remains the right path to disambiguate codegen vs toolchain vs hardware.

---

## 6. Recommendations for Phase 2

In rough order of leverage:

1. **Surface export-time warning for engine-only styles (Finding 3).** ~1 day. Closes the silent-failure gap immediately. Should land before any UI chassis picker so users can't be confused about "I picked a Helix style and a chassis but my hardware shows blue."
2. **Add `wrapperStyle` flag to `codegen-adapter.ts` (Finding 1).** Default to `'in-out-helper'` when profile source is `vendor-confirmed` or `community-validated`. ~2-3 days (new emitter path, golden-hash tests for both shapes). Hedge against the most-visible structural divergence without committing to one shape.
3. **Document AudioFlicker / no-font-loaded behavior in FLASH_GUIDE (Finding 2).** ~30 minutes. Prevents the worst onboarding moment.
4. **Optional export-time "dry test" toggle to strip AudioFlicker (Finding 2).** ~1 day. Exposes the modulation-test-script behavior as a first-class feature for first-flash bench testing.
5. **CI check: enforce engine styles match codegen handlers.** ~2 hours. Prevents regression of Finding 3 as new engine styles are added.
6. **Color literal cosmetic pass (Finding 4).** Post-Phase 2 polish; not a blocker.

The combined Phase 2 codegen-related work is ~1 week incremental over the planned wiring work — not enough to displace the Phase 2 schedule significantly.

---

## 7. Open questions for Ken

1. **Wrapper style default per profile** — endorse the `wrapperStyle: 'in-out-helper'` default for community-validated profiles, or stay all-Layers and rely on hardware verification (Phase 3) to settle it?
2. **Engine-only style handling** — warn at export (Phase 2), hide from UI behind experimental toggle (Phase 2 alt), or commit to implementing codegen parity for at least the most-common (Helix, Vortex, Ember, Candle, Gravity) before Phase 2 ships?
3. **AudioFlicker first-flash toggle** — worth building as an exposed feature, or leave as a doc-only known issue?
4. **Hardware verification posture** — does this audit increase the urgency on getting an ST-Link clone and re-running the bench, or is Phase 2 OK to ship "blind" with these mitigations and verify via Phase 3 hardware test once chassis picker exists?

---

## 8. What this audit produces (concrete next-step output)

If recommendations 1–3 above are approved, the Phase 2 PR can land:

- Engine-style fallback warning (probably in `apps/web/lib/zipExporter.ts` or a new `apps/web/lib/exportGuard.ts`).
- `codegen-adapter.ts` with `wrapperStyle` flag (new file in `packages/hardware-profiles/src/`).
- `packages/codegen/src/emitters/InOutHelperEmitter.ts` (alt emitter for the older wrapper shape).
- `docs/FLASH_GUIDE.md` updates documenting the no-font-loaded UX.

This audit does **not** lock in the wrapper-style decision irrevocably. If Phase 3 hardware verification proves `Layers<>` is fine on real hardware, the default can flip back without ripping out the `InOutHelper` emitter — both stay supported.
