# KyberStation — Post-Launch Backlog

Single index of deferred work as of **2026-04-27 overnight** (post-overnight UI/UX sweep, pre-public-launch). The detail for each item lives in its linked source doc — edit the source for spec changes, edit this file when status / priority / target version changes.

**Update cadence:** review at the start of every multi-PR sprint. Move items to ✅ when they ship; promote items between target versions as priorities shift.

> **Last audited: 2026-04-30** — ground-truth sweep against `git log --grep` + `git grep`. Findings: Saber GIF Sprint 2 was shipped (PR #80, stale-bit confirmed); UX item #16 (Figma color model) removed as superseded by PR #116 audit-and-tighten path; several parking-lot items already shipped; 2026-04-30 session recap (PRs #127-#138) added.

---

## 2026-04-27 overnight session — what shipped (14 PRs)

Full archive at [`docs/SESSION_2026-04-27_OVERNIGHT.md`](SESSION_2026-04-27_OVERNIGHT.md). Handoff for next session at [`docs/NEXT_SESSION_HANDOFF.md`](NEXT_SESSION_HANDOFF.md).

✅ **Closed by overnight session:**
- Sidebar IA reorganization (PR #89) → SETUP / DESIGN / REACTIVITY / OUTPUT
- Sidebar A/B Column Layout v2 — Phases 2 + 3 (PRs #91 + #94) → blade-style + color + ignition-retraction migrated; Phase 4+ remains open
- Settings consolidation (PR #90) → 3 dup sections deleted
- Light-theme blade bloom theme-gating (PR #88)
- Safari MiniSaber halo banding (PR #92, box-shadow swap)
- Aurebesh font variants (PR #93, 4-variant picker)
- Surprise Me preserves user's ledCount (PR #95)
- Hardware blade-length tables aligned to community-standard 144 LEDs/m density (PR #96) + Strip Config + Topology marked WIP
- BladeConfig.hiltId typing + faction predicates + CardTheme tokens (PR #86, all bundled earlier in night)
- P29 axe-core a11y violations (PR #84)
- Hardware validation v0.15.0 close-out (PR #85, `scripts/hardware-test/build-modulation-test-config.mjs`)

🔴 **New items added by the overnight session:**
- **Safari BladeCanvas bloom** — bloom renders dramatically narrower than Chromium. Padding-mip approach attempted; didn't fully resolve. Defer to focused future session with proper Safari debugging. Recommend Brave/Chrome/Edge in launch comms.
- **BLADE_LENGTHS source-of-truth lift** — duplicated across `lib/bladeRenderMetrics.ts`, `components/editor/HardwarePanel.tsx`, `components/editor/BladeHardwarePanel.tsx`, `packages/engine/src/types.ts`. Tonight's "36"=144 vs 132" mismatch was the second time this drift bit. Lift to one shared module.
- **Strip Configuration — wire visual blade thickness** — selection feeds power-draw math + ledCount but doesn't yet change rendered capsule thickness. Currently WIP-marked.
- **Topology — multi-segment renderer for Triple / Inquisitor** — Single / Staff / Crossguard work. Triple + Inquisitor are visual placeholders. Currently WIP-marked.
- **Community Gallery — connect to real data source** — `CommunityGallery.tsx` renders hardcoded placeholder styles. Production fetch from GitHub Pages is unimplemented.
- **Sidebar A/B Phase 4+** — extend pattern to remaining sections (combat-effects, routing, audio, gallery in editor, my-saber, output preset list). Pattern is well-established after Phases 2+3.

---

## v0.15.x — patch sprint (post-hardware-validation)

Tracks small-to-medium items that should land soon after launch, scoped to one or two-day sessions.

| Item | Source | Scope | Notes |
|---|---|---|---|
| ~~Wave 7 — Kyber Glyph v2 modulation round-trip encoder body~~ | ~~MODULATION_ROUTING_v1.1_IMPL_PLAN.md~~ | ~~M~~ | **✅ Done — landed via [PR #72](https://github.com/kenkoller/KyberStation/pull/72) on 2026-04-27.** Auto-bumps glyph version byte 1 → 2 when modulation present; old clients see version error vs silent strip. +16 round-trip tests. |
| **Marketing site re-implementation** | (was PR #32, now closed-and-deferred) | L | Original PR #32 was 153 commits behind main and largely subsumed. Clean v0.15.x re-implementation: `/features` `/showcase` `/changelog` `/faq` `/community` pages, ScrollReveal component, inline code peek, `pageMetadata.ts` helper. SEO infra (`robots.txt` / `sitemap.xml` / `siteConfig.ts`) shipped pre-launch in PR #69. |
| ~~**Sidebar IA reorganization**~~ | ~~[`docs/SIDEBAR_IA_AUDIT_2026-04-27.md`](SIDEBAR_IA_AUDIT_2026-04-27.md)~~ | ~~M~~ | **✅ Done — landed via [PR #89](https://github.com/kenkoller/KyberStation/pull/89) on 2026-04-27.** SETUP / DESIGN / REACTIVITY / OUTPUT regrouping shipped; duplicate ignition/retraction pickers + duplicate Board picker triggers consolidated. |
| ~~**Sidebar A/B Column Layout v2**~~ | ~~[`docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md`](SIDEBAR_AB_LAYOUT_v2_DESIGN.md)~~ | ~~L~~ | **✅ Done — 6/6 sections complete as of 2026-04-29 late.** blade-style (PR #91), color + ignition-retraction (PR #94), combat-effects (PR #98), my-saber (PR #100), audio (PR #101), routing (PR #105), gallery (PR #107), **output (PR #121)**. |
| ~~**`useSharedConfig` URL handler test**~~ | ~~[`docs/SABER_CARD_AUDIT_2026-04-27.md`](SABER_CARD_AUDIT_2026-04-27.md) P1~~ | ~~S~~ | **✅ Done** — `apps/web/tests/useSharedConfig.test.ts` exists with 8 tests covering `?s=<glyph>` decode, `loadPreset` invocation, URL strip-after-decode, malformed glyph, version error, hash-fallback. `@testing-library/react` is in deps. |
| ~~**Hilt Library Stage 2 — 7 canon-character assemblies**~~ | ~~[`docs/HILT_STAGE_2_BRIEFING.md`](HILT_STAGE_2_BRIEFING.md)~~ | ~~L~~ | **✅ Done — landed via [PR #79](https://github.com/kenkoller/KyberStation/pull/79) on 2026-04-27** + follow-up fix `a1ec4e3`. All 7 assemblies + 29 parts shipped. The `~/.claude/plans/i-would-like-to-woolly-turtle-agent-a7508824b8adc4c43.md` plan file is now superseded; can be archived. |
| **Module extraction `lib/blade/*` from `BladeCanvas.tsx`** | `CLAUDE.md` v0.14.0 entry | M | BladeCanvas.tsx is ~2800 lines with the bloom / rim-glow / motion-blur / ambient pipeline inline. Extract to `lib/blade/pipeline.ts` + `lib/blade/bloom.ts` + etc. so `MiniSaber` / `FullscreenPreview` / `SaberCard` can adopt the same pipeline. Phase 4 of the v0.14.0 plan. |
| **Golden-hash blade-render regression tests** | `CLAUDE.md` v0.14.0 entry | M | **🟡 Engine-side done** via [PR #112](https://github.com/kenkoller/KyberStation/pull/112) on 2026-04-29 (33 cases hashing `captureStateFrame` LED buffers — protects engine drift). **Renderer-side still TBD** — needs `canvas` (npm) to capture rendered pixel buffers from the BladeCanvas pipeline. Renderer-level tests are the explicit prerequisite for Item K module extraction below. |
| **Card snapshot golden-hash tests (20 layout × theme combos)** | `CLAUDE.md` Share Card v2 entry | M | Same harness shape as the blade-render tests, applied to the saber card pipeline (4 layouts × 5 themes = 20 combos). Lock down regressions in `cardSnapshot.ts`. |
| **Mobile shell migration to Sidebar + MainContent** | `CLAUDE.md` left-rail overhaul entry | M | Mobile shell still uses 4-tab swipe UI + `MergedDesignPanel`. Once mobile migrates, `DesignPanel.tsx`, `DynamicsPanel.tsx`, `MergedDesignPanel`, and `uiStore.activeTab` can all leave together. **Needs UX judgment call** on drawer vs bottom-sheet pattern at 375px. |
| ~~**Custom color popover**~~ | ~~`CLAUDE.md` left-rail overhaul entry~~ | ~~S~~ | **✅ Explicitly dropped 2026-04-29** per Ken — existing pattern (Custom chip jumps to deep Color section) has a documented intentional reason ("the deep panel already does the job; no benefit to maintaining two custom-color surfaces"). |
| ~~**MGP thumbnail crispness**~~ | ~~`CLAUDE.md` left-rail overhaul entry~~ | ~~S~~ | **✅ Done — landed via [PR #117](https://github.com/kenkoller/KyberStation/pull/117) (infra) + [PR #125](https://github.com/kenkoller/KyberStation/pull/125) (26 compact 24×24 SVGs) on 2026-04-29.** Optional `compactThumbnail` field on registry entries; QuickTransitionPicker renders natively at 24×24 when present, falls back to scale-down when absent. |
| **Cross-OS hardware sweep — Windows / Linux + V2 / V3-OLED** | [`HARDWARE_VALIDATION_TODO.md`](HARDWARE_VALIDATION_TODO.md) | M | Phase A/B/C ✅ on macOS + V3.9 + Brave (Chromium). Windows WebUSB driver (WinUSB) historically fragile; Linux udev rules common sharp edge. Community-driven post-launch — invite reports via the launch Reddit post per `LAUNCH_PLAN.md`. |
| **Code-level TODOs sweep** | grep results | S each | ~~`WorkbenchLayout.tsx:669` (theme-row cap)~~ ✅ shipped via [PR #110](https://github.com/kenkoller/KyberStation/pull/110) · ~~`DeliveryRail.tsx:210` + `StatusBar.tsx:170,238` (global WebUSB store)~~ ✅ shipped via PR #104 · ~~`useClickToRoute.ts` (bladeStore-modulation-patch cleanup)~~ ✅ shipped via [PR #113](https://github.com/kenkoller/KyberStation/pull/113) on 2026-04-29 · ~~`packages/engine/src/modulation/sampler.ts` (v1.1 preon/ignition/retraction progress + `BladeConfig.clashDecay`)~~ ✅ shipped via [PR #114](https://github.com/kenkoller/KyberStation/pull/114) (clashDecay) + [PR #123](https://github.com/kenkoller/KyberStation/pull/123) (preon/ignition/retraction progress) on 2026-04-29 · `BladeHardwarePanel.tsx` / `PowerDrawPanel.tsx` / `GradientBuilder.tsx` (left-rail-overhaul consumer migration) ⛔ still blocked on mobile shell migration. **All sweep clusters except mobile-blocked stubs are now closed.** |
| ~~Dead-code cleanup (BladeCanvas3DWrapper + canvasMode)~~ | ~~CLAUDE.md 1.5x entry~~ | ~~S~~ | **✅ Done — landed via [PR #75](https://github.com/kenkoller/KyberStation/pull/75) on 2026-04-27.** Removed `BladeCanvas3DWrapper.tsx` (orphan) + `CanvasMode` type / `canvasMode` field / `setCanvasMode` setter from `uiStore.ts`. Persisted state from older sessions silently no-ops on next load (no migration shim needed since nothing reads). |
| **Dead-code cleanup — consumer-migration stubs** ⛔ BLOCKED on mobile migration | grep results | S each, post-mobile-migration | The 3 stubs `BladeHardwarePanel.tsx`, `PowerDrawPanel.tsx`, `GradientBuilder.tsx` carry "left-rail-overhaul: consumer migration in progress" TODOs. **Verified blocked 2026-04-28**: a parallel-agent attempt confirmed that all 3 stubs have ACTIVE consumers requiring **non-mechanical reshaping**, not just import rewrites. Specifically: (a) `BladeHardware` + `PowerDraw` are both still consumed by `DesignPanel.tsx` (mobile shell), which mounts them as **separate sibling sections** — swapping in `<HardwarePanel />` (which contains both) would either duplicate content or require restructuring DesignPanel's section list; (b) `PowerDrawPanel` is also routed from `TabColumnContent.tsx`'s `'power-draw'` panel-slot router; (c) `GradientBuilder` is consumed by A/B-section files (`ColorColumnB.tsx`, `BladeStyleColumnB.tsx`) AND `ColorPanel.tsx`'s gradient region is a private `function GradientRegion()` (not exported) — drop-in swap not possible without first extracting `GradientRegion` to a shared `lib/gradient/` module. **Sequence**: ship mobile migration → DesignPanel + TabColumnContent retire → BladeHardware/PowerDraw stubs delete cleanly → extract `GradientRegion` → GradientBuilder stub deletes. Don't re-attempt this PR until the mobile-migration row below ships. |
| ~~`BladeConfig.hiltId` type declaration~~ | ~~`CLAUDE.md` Share Card v2 follow-ups~~ | ~~S~~ | **✅ Done** — landed in commit `0a1a54e` on 2026-04-27. `hiltId?: string` declared on `BladeConfig`; `(config as unknown as { hiltId?: string }).hiltId` cast dropped from `card/drawHilt.ts`. |
| ~~Faction heuristic refactor in `chips.ts`~~ | ~~`CLAUDE.md` Share Card v2 follow-ups~~ | ~~S~~ | **✅ Done** — landed in commit `0a1a54e` on 2026-04-27. `isGreenHue` / `isBlueHue` siblings added to `lib/crystal/types.ts`; `chips.ts` `factionForConfig()` now composes them with an explicit `r < 80` gate (preserves amethyst → Grey). +14 test cases for the new predicates in `tests/crystalTypes.test.ts` shipped 2026-04-28. |
| ~~**`CardTheme` token expansion**~~ | ~~`CLAUDE.md` Share Card v2 follow-ups~~ | ~~S~~ | **✅ Done** — `vignetteColor` + `watermarkColor` + `hiltAccent` tokens already on `CardTheme` in `apps/web/lib/sharePack/card/cardTypes.ts` (lines 126/132/138) and populated per-theme in `cardTheme.ts`. The big `◈` watermark glyph was retired during the same pass per the comment at `drawBackdrop.ts:96`. |
| ~~**Light-theme blade bloom theme-gating**~~ | ~~`CLAUDE.md` Share Card v2 follow-ups~~ | ~~S~~ | **✅ Done — landed via [PR #88](https://github.com/kenkoller/KyberStation/pull/88) on 2026-04-27.** `drawBlade` consumes a `lightBackdrop` flag derived from `theme.id === 'light'` and switches `lighter` → `screen` composite over the paper-white backdrop to prevent saturation clipping. |
| ~~**Saber GIF Sprint 2**~~ | ~~[`SABER_GIF_ROADMAP.md`](SABER_GIF_ROADMAP.md)~~ | ~~M~~ | **✅ Done — landed via [PR #80](https://github.com/kenkoller/KyberStation/pull/80) on 2026-04-27** (`e55da9a feat(gif-sprint-2): per-variant ignition + retraction picker GIFs`). 19 ignition + 13 retraction animated GIFs, build script, and `MiniGalleryPicker` wiring all shipped. The 2026-04-29 late session stuck agent had the same assignment — written off cleanly per 2026-04-30 session (worktree removed, branch deleted). |
| **`useAudioEngine` singleton consolidation** | [PR #124](https://github.com/kenkoller/KyberStation/pull/124) follow-up | M | PR #124 lifted `muted` to a shared store but preserved the multi-instance pattern: each of the 6 `useAudioEngine()` consumers (`WorkbenchLayout`, `AppShell`, `SoundFontPanel`, `AudioColumnA`, `AudioColumnB`, `useAudioSync`) still creates its own `AudioContext` + `FontPlayer` + `AudioFilterChain` + `masterGain` + `SmoothSwingEngine` at first user gesture. Wasteful: Chrome caps `AudioContext` per origin at ~6 (we're at the limit), and decoded audio buffers are re-decoded per instance. Refactor to a singleton engine — either module-scope or React-context provider mounted at app root, with consumers reading the shared instance via a thin hook. Lower risk now that mute state is already lifted. |

## v0.16.0 — feature sprint

Multi-day work or architecturally heavier items.

| Item | Source | Scope | Notes |
|---|---|---|---|
| **Wave 8 — Button routing sub-tab + aux/gesture-as-modulator plates** | [`MODULATION_ROUTING_v1.1_IMPL_PLAN.md`](MODULATION_ROUTING_v1.1_IMPL_PLAN.md) | L (~6-8 h) | New ROUTING sub-tab inside Inspector. Maps button events (aux click/hold/gesture) to actions per prop file; adds 8 new modulator plates. |
| **Wave 6 follow-on — composer slot expansion** | `CLAUDE.md` overnight recap | L | v1.1 Core ships shimmer-Mix only. Per-channel RGB (`Mix<driver, ColorLow, ColorHigh>` restructuring) + timing scalars. Deeper AST work per the PR #60 body. |
| ~~**UX item #16 — Figma color model (opacity + blend modes)**~~ | ~~[`NEXT_SESSIONS.md`](NEXT_SESSIONS.md)~~ | ~~M~~ | **Superseded / dropped** — Per Ken's 2026-04-29 decision invoking the Hardware Fidelity Principle: non-emittable blend modes (`add`, `multiply`, `screen`, `overlay`) violate the principle because the codegen never emitted them. The correct path was audit-and-tighten, not expansion. PR #116 closed the existing violation (5-mode `BlendMode` union → `'normal'` literal) and documented the principle. Going forward any blend mode MUST have a verified ProffieOS emission path before shipping. This item will not be revisited as originally specified. |
| ~~**Hilt Library Stage 2 — 29 new parts across 7 assemblies**~~ | ~~[`HILT_STAGE_2_BRIEFING.md`](HILT_STAGE_2_BRIEFING.md)~~ | ~~L~~ | **✅ Done — landed via [PR #79](https://github.com/kenkoller/KyberStation/pull/79) on 2026-04-27** (duplicate of v0.15.x row). |
| **Saber GIF Sprint 3** | [`SABER_GIF_ROADMAP.md`](SABER_GIF_ROADMAP.md) | M | Tier 2 marketing showcases (style grid, colour cycle, lockup loop). |

## v0.16.0+ / longer sprints

Multi-week / cross-package work.

| Item | Source | Scope | Notes |
|---|---|---|---|
| **Modulation v1.1 full feature set** | [`MODULATION_ROUTING_ROADMAP.md`](MODULATION_ROUTING_ROADMAP.md) | XL | Beyond v1.1 Core: full peggy parser surface, all 11 modulators (currently 5 have plates active in UI per overnight Wave 1), true drag-to-route polish, hover wire highlighting refinements, V2.2 profile validation. Target ~2026-05-16. |
| **Modulation v1.2 Creative** | [`MODULATION_ROUTING_ROADMAP.md`](MODULATION_ROUTING_ROADMAP.md) | XL | Modulator chains + macros + LFO shape library + conditionals + `config.*` vars + snapshots/scenes + sidechain + probability/random + blade-level UDFs + response curves. Target ~2026-06-13. |
| **Sound Font Library + Custom Presets + Card Presets** | [`SOUND_FONT_LIBRARY_AND_CUSTOM_PRESETS.md`](SOUND_FONT_LIBRARY_AND_CUSTOM_PRESETS.md) | XL (3 phases) | Phase A: user preset store + save flow + browser UI. Phase B: font library directory picker + scanner + library panel. Phase C: card preset data model + composer + quick-switch + storage budget integration. |
| **New Effects Roadmap Priority 5+** | [`NEW_EFFECTS_ROADMAP.md`](NEW_EFFECTS_ROADMAP.md) | XL ongoing | Priority 1-4 (82 effects) shipped. Priority 5+ nice-to-haves are documented but not scheduled. |
| **Modulation v1.3 Advanced** | [`MODULATION_ROUTING_ROADMAP.md`](MODULATION_ROUTING_ROADMAP.md) | XL | Envelope followers (meyda + AudioWorklet) + step sequencers + `ModulationGraphPanel` + community UDF library + gesture recording. Target ~2026-07-18. |
| **Multi-Blade Workbench** | [`MODULATION_ROUTING_ROADMAP.md`](MODULATION_ROUTING_ROADMAP.md) | XL | Channel-strip UI for dual-blade / saberstaff / crossguard. Target ~2026-08-08. |
| **Preset Cartography sprint** | `CLAUDE.md` upcoming sprints table | L-XL | Parallel-agent preset library expansion: deep-cut Jedi/Sith lanes, Legends/KOTOR/SWTOR, animated series, sequel/Mando/Ahsoka/Acolyte, space-combat games, cross-franchise. Could 4-5× the preset library in one session. |

## Safari rendering follow-ups (P31 cross-browser sweep, 2026-04-27)

P31 cross-browser walkthrough on 2026-04-27 found two Safari-specific cosmetic regressions vs Brave/Chrome (Chromium). Functionally everything works (incl. graceful "browser not supported" messages on FlashPanel for Safari + Firefox); these are visual bugs only. Mac Safari only — no equivalent issues observed in Chrome on the same machine.

| Issue | Surface | Likely cause | Fix candidate |
|---|---|---|---|
| ~~**Banding artifacts in MiniSaber halo above blade tip**~~ | ~~Gallery cards, Landing hero~~ | ~~Safari WebKit chained-`drop-shadow` precision~~ | **✅ Fixed — [PR #92](https://github.com/kenkoller/KyberStation/pull/92) on 2026-04-27.** `drop-shadow` filter chain swapped for `box-shadow` on the canvas element. |
| **BladeCanvas editor preview "looks different / slightly incorrect"** in Safari vs Brave/Chrome — characterization pending (no screenshot taken). | `/editor` workbench blade preview | Likely the v0.14.0 bloom pipeline (3-mip downsampled bright-pass with `globalCompositeOperation = 'lighter'`) — Safari's compositing of `lighter` over chained mip canvases differs subtly from Chromium's. Or a `filter: blur()` precision issue on the bloom mips. | Inspect side-by-side in Safari + Chrome at 1280×800, characterize the divergence first (color cast? bloom intensity? halo cutoff?), THEN decide whether to gate compositing strategy on UA or accept the difference. |

**Fix priority:** post-launch v0.15.1 patch sprint, not launch-blocking. Brave/Chrome/Edge users see the correct rendering; Safari users see a slight visual regression but everything is functional. Recommended browser is documented as Brave / Chrome / Edge in launch communication per `LAUNCH_PLAN.md`.

## Parking lot — small polish items

Track here when surfaced; promote to a versioned sprint when bundled with related work.

- **1200×630 OG hero image** — current OG image is the square 512×512 icon; platforms letterbox. Reddit/Twitter share preview would be much sharper with a 1200×630 hero render. Source: launch readiness audit + `LAUNCH_ASSETS.md`.
- **Real-saber demo GIFs (15-20s)** — `LAUNCH_ASSETS.md` calls these "the single most impactful asset". Ken's hardware shoot. Add to launch-amplification post on Star Wars Day if not at initial launch.
- **`CANONICAL_DEFAULT_CONFIG` drift-sentinel test** — Kyber Glyph v1 delta-encodes against a default config that's currently duplicated between `apps/web/lib/sharePack/kyberGlyph.ts` and `apps/web/stores/bladeStore.ts`. Drift-sentinel test pattern matches the BladeConfig mirror. Source: `CLAUDE.md` v0.12.0 architectural decisions.
- **Crystal Vault panel + Re-attunement UI** — design done in `KYBER_CRYSTAL_3D.md`, not built. Source: `CLAUDE.md` v0.12.0 deferred items.
- **Favicon replacement with crystal-themed image** — current is the app icon. Source: `CLAUDE.md` v0.12.0 deferred items.
- **Phone-camera QR scan validation** — confirm Saber Card QRs scan reliably on real phones at typical viewing distances. Source: `CLAUDE.md` v0.12.0 deferred items.
- **`<HiltMesh>` extraction** from `BladeCanvas3D.tsx` (now dead). Source: `CLAUDE.md` v0.12.0 deferred items.
- ~~**Aurebesh font variants beyond Canon**~~ — ✅ Shipped via [PR #93](https://github.com/kenkoller/KyberStation/pull/93) on 2026-04-27. 4-variant picker (Canon / CanonTech / Legends / LegendsTech) in Settings. `lib/aurebesh.ts` variant type + helpers + localStorage persistence.
- ~~**`BladeCanvas3DWrapper` deletion**~~ — ✅ Shipped via [PR #75](https://github.com/kenkoller/KyberStation/pull/75) on 2026-04-27. Orphan file removed alongside dead `CanvasMode` type / `canvasMode` field.

## 2026-04-29 session — what shipped (15 PRs by Claude + 3 by Ken = 18 total)

Marathon session. Closed all user-visible WIP markers, the major Hardware Fidelity Principle gap, completed Phase 4 sidebar A/B (6/6 sections), and burned down most of Ken's pre-launch Tier 1 + Tier 2 shortlist.

### Morning batch (Tier 1 + initial cleanups)

| PR | Title | Status |
|---|---|---|
| [#107](https://github.com/kenkoller/KyberStation/pull/107) | feat(sidebar-ab): Phase 4f — gallery A/B prototype | ✅ Merged |
| [#108](https://github.com/kenkoller/KyberStation/pull/108) | feat(blade-render): Item D — strip count drives blade thickness | ✅ Merged |
| [#109](https://github.com/kenkoller/KyberStation/pull/109) | feat(blade-render): Item E — Triple + Inquisitor topology visuals | ✅ Merged |
| [#110](https://github.com/kenkoller/KyberStation/pull/110) | chore(palette): remove THEME_CAP — surface all 30 themes | ✅ Merged |
| [#111](https://github.com/kenkoller/KyberStation/pull/111) | docs(backlog): mark stale entries shipped + add 2026-04-29 recap | ✅ Merged |
| [#112](https://github.com/kenkoller/KyberStation/pull/112) | test(engine): golden-hash regression tests (33 cases) | ✅ Merged |
| [#113](https://github.com/kenkoller/KyberStation/pull/113) | chore(modulation): remove stale useClickToRoute TODO markers | ✅ Merged |
| [#114](https://github.com/kenkoller/KyberStation/pull/114) | feat(modulation): wire BladeConfig.clashDecay through sampleModulators | ✅ Merged |

### Afternoon batch (Tier 1 + Tier 2 priorities + Hardware Fidelity)

| PR | Title | Status |
|---|---|---|
| [#115](https://github.com/kenkoller/KyberStation/pull/115) | **(Ken)** fix(sound): scan/load directory handle iterator yields tuples | ✅ Merged |
| [#116](https://github.com/kenkoller/KyberStation/pull/116) | **feat(blend): tighten BlendMode to 'normal' (T2.2 Hardware Fidelity)** | ✅ Merged |
| [#117](https://github.com/kenkoller/KyberStation/pull/117) | feat(mgp): compactThumbnail infrastructure for crisp 24x24 picker triggers | ✅ Merged |
| [#118](https://github.com/kenkoller/KyberStation/pull/118) | **(Ken)** fix(audio): tell Brave users about the FSA flag in library warning copy | ✅ Merged |
| [#119](https://github.com/kenkoller/KyberStation/pull/119) | fix(workbench): action-bar effect chips icon-only below 1280px | ✅ Merged |
| [#121](https://github.com/kenkoller/KyberStation/pull/121) | **feat(sidebar-ab): Phase 4f — output multi-step pipeline (6/6 done)** | ✅ Merged |
| [#122](https://github.com/kenkoller/KyberStation/pull/122) | **(Ken)** feat(sound): recognize 12 modern Proffie / Kyberphonic sound categories | ✅ Merged |
| [#123](https://github.com/kenkoller/KyberStation/pull/123) | feat(modulation): wire preon/ignition/retraction progress to sampler | ✅ Merged |
| [#125](https://github.com/kenkoller/KyberStation/pull/125) | feat(mgp): 26 compact 24x24 thumbnails for crisp picker triggers | ✅ Merged |
| ~~#120~~ | superseded by #125 (auto-closed when #117's branch was deleted on merge) | closed |

### Highlights

- **Hardware Fidelity gap closed (PR #116).** The 5-mode `BlendMode` union (`normal | add | multiply | screen | overlay`) tightened to single literal `'normal'`. The codegen never emitted the 4 non-normal modes — they were visualizer-only fakes that misrepresented what users would see on real hardware. Audit-history section added to `docs/HARDWARE_FIDELITY_PRINCIPLE.md`.
- **Phase 4 Sidebar A/B v2 — 6/6 sections complete** (PR #121 shipped the final `output` section with vertical-stepper Column A).
- **All v1.1 modulation sampler TODOs closed** (PR #114 clashDecay + PR #123 preon/ignition/retraction progress).
- **2 user-visible WIP markers closed** (Item D strip-count thickness PR #108 + Item E Triple/Inquisitor topology PR #109).
- **Engine-level golden-hash tests** (PR #112, 33 cases) — ground truth for engine drift; renderer-level tests still TBD per `docs/HARDWARE_FIDELITY_PRINCIPLE.md` audit-history.

### Stuck agents (2026-04-29 late dispatch) — **resolved 2026-04-30**

Both background agents from the late-session push wrote zero commits. Clean writeoff per 2026-04-30 session — worktrees removed, branches deleted:
- `agent-a077c8445fc8384d1` (`feat/marketing-site-v0.15.x`) — no code produced; marketing re-impl remains open in v0.15.x table above
- `agent-af446b7e1bb77edd2` (`feat/saber-gif-sprint-2`) — no code produced; Sprint 2 was already shipped via PR #80 (stale-bit — see v0.15.x table above)

### Stale-backlog audit (carried over from PR #111)

Multiple v0.15.x sprint table items had already shipped at session start (CardTheme tokens, useSharedConfig URL test, Light-theme bloom, Hilt Stage 2, WebUSB store consumers). Backlog refreshed in PR #111. Going forward: ground-truth-check via `git log --grep` + `git grep` before touching any "open" item.

### Ken's pre-launch shortlist — Tier 1 + Tier 2 status delta

8 of 14 ✅ closed, 1 🟡 partial, 5 ⏳ deferred. Of deferred: 2 environmental (Safari hands-on, cross-OS hardware), 2 gated on canvas dep, 1 large architectural (Wave 8). See full table in `CLAUDE.md` "Current State (2026-04-29 late)" entry.

### Recommended next path (updated 2026-04-30)

~~Recover or write off the 2 stuck agents~~ — ✅ done (both written off cleanly)

1. Browser verification of 2026-04-30 session (retraction + save/queue + surprise-me + pause-audio in live preview)
2. Add `canvas` dep + build T2.10 renderer-level golden-hash harness
3. Item K module extraction (now safe with renderer-level coverage)
4. Cut **v0.15.1** patch tag — clean release between architectural sprints
5. Then: Wave 8 button routing (its own focused multi-day session)
6. Then: Item H mobile shell migration (Ken's UX call needed)

See `CLAUDE.md` "Current State (2026-04-30)" entry and `docs/NEXT_SESSION_HANDOFF.md` for the full updated handoff.

## Launch-night progress recap (2026-04-27 evening)

What shipped in the pre-launch sprint (10 PRs in ~5 hours):

| PR | Title | Status |
|---|---|---|
| [#56](https://github.com/kenkoller/KyberStation/pull/56) | docs(gif-sprint): saber GIF roadmap | ✅ Merged |
| [#36](https://github.com/kenkoller/KyberStation/pull/36) | feat(share-card): vertical-saber layout + rounded tip / flush emitter | ✅ Merged |
| [#67](https://github.com/kenkoller/KyberStation/pull/67) | feat(gif-sprint-1): saber GIF infrastructure + idle hum + ignition cycle | ✅ Merged |
| [#68](https://github.com/kenkoller/KyberStation/pull/68) | docs: salvage v0.14.0 left-rail overhaul recap (supersedes #54) | ✅ Merged |
| [#69](https://github.com/kenkoller/KyberStation/pull/69) | feat(launch): SEO infrastructure — robots.txt, sitemap.xml, siteConfig | ✅ Merged |
| [#70](https://github.com/kenkoller/KyberStation/pull/70) | docs(launch): post-launch backlog index + hardware handoff refresh | ✅ Merged |
| [#71](https://github.com/kenkoller/KyberStation/pull/71) | chore(release): stage v0.15.0 — Modulation Routing v1.1 Core | ✅ Merged + tagged |
| [#72](https://github.com/kenkoller/KyberStation/pull/72) | feat(modulation): Wave 7 — Kyber Glyph v2 modulation round-trip | ✅ Merged |
| [#73](https://github.com/kenkoller/KyberStation/pull/73) | docs(launch): launch-prep pack (Saber Card audit + Sidebar IA + marketing copy) | ✅ Merged |
| [#74](https://github.com/kenkoller/KyberStation/pull/74) | fix(launch): correct 700+ → 305+ preset count in LAUNCH_ASSETS | ✅ Merged |
| [#75](https://github.com/kenkoller/KyberStation/pull/75) | chore: dead code cleanup — BladeCanvas3DWrapper + canvasMode | ⏳ CI / merging |

**`v0.15.0` tagged at commit `42b3d2b`** with full release notes. Codename: Modulation Routing v1.1 Core. **Hardware-validated 2026-04-27 evening on 89sabers V3.9 + macOS + Brave** — live `Mix<Scale<SwingSpeed<400>, ...>, ...>` driver confirmed via swing→hue test. No blocking issues; v0.15.1 patch not needed.

## Open follow-ups deferred from tonight

| Item | Why deferred | Where to resume |
|---|---|---|
| ~~Wave 10 — Hardware validation on V3.9~~ | ✅ **Done 2026-04-27 evening** — live driver confirmed on 89sabers V3.9 via swing→hue test | n/a |
| ~~Hilt Library Stage 2 (29 parts + 7 assemblies)~~ | ~~Plan-mode forced agent into plan-only output; extraction is mechanical but takes time~~ | ✅ shipped — [PR #79](https://github.com/kenkoller/KyberStation/pull/79) merged 2026-04-27 |
| ~~`useSharedConfig` URL handler test~~ | ~~Requires adding `@testing-library/react` dep~~ | ✅ shipped — `apps/web/tests/useSharedConfig.test.ts` exists with 8 cases; `@testing-library/react` already in deps |
| Sidebar A/B layout build-out | Design spec done in [`SIDEBAR_AB_LAYOUT_v2_DESIGN.md`](SIDEBAR_AB_LAYOUT_v2_DESIGN.md); first prototype = `blade-style` section | v0.15.x or v0.16.0 sprint |
| Marketing copy ship | Drafts done in [`docs/launch/`](launch/); FILL-IN placeholders for Fett263 contact + YouTuber names | Ken sends manually pre-launch / on launch day |

---

## 2026-04-30 session — what shipped (14 PRs)

Focus: Ken's audio-engine improvements from parallel session + critical bugs from Ken's field testing + v1 launch features.

| PR | Title | Source | Status |
|---|---|---|---|
| [#118](https://github.com/kenkoller/KyberStation/pull/118) | fix(audio): tell Brave users about the FSA flag | Ken | ✅ Merged |
| [#122](https://github.com/kenkoller/KyberStation/pull/122) | feat(sound): recognize 12 modern Proffie sound categories | Ken | ✅ Merged |
| [#124](https://github.com/kenkoller/KyberStation/pull/124) | fix(audio): lift mute state to shared Zustand store | Ken | ✅ Merged |
| [#126](https://github.com/kenkoller/KyberStation/pull/126) | docs(session-archive): 2026-04-29 late session wrap | Claude | ✅ Merged |
| [#127](https://github.com/kenkoller/KyberStation/pull/127) | fix(audio): swap ignition/retraction sound dispatch (ProffieOS convention) | Ken (rebase) | ✅ Merged |
| [#128](https://github.com/kenkoller/KyberStation/pull/128) | fix(audio): broadcast SmoothSwing speed + hot-swap hum on font change | Ken (rebase) | ✅ Merged |
| [#130](https://github.com/kenkoller/KyberStation/pull/130) | fix(audio): suspend AudioContext on global pause | Agent 1C | ✅ Merged |
| [#131](https://github.com/kenkoller/KyberStation/pull/131) | fix(header): standardize buttons to consistent height/radius/focus ring | Agent 1D | ✅ Merged |
| [#132](https://github.com/kenkoller/KyberStation/pull/132) | fix(engine): correct retraction animation progress | Agent 1A | ✅ Merged |
| [#133](https://github.com/kenkoller/KyberStation/pull/133) | fix(blade): alignment drift, pointed tip, emitter glow | Agent 1B | ✅ Merged |
| [#134](https://github.com/kenkoller/KyberStation/pull/134) | feat(presets): v1 save state — save, load, delete user presets | Agent 4A | ✅ Merged |
| [#135](https://github.com/kenkoller/KyberStation/pull/135) | feat(randomizer): extend Surprise Me to full catalogs + modulation | Agent 3C | ✅ Merged |
| [#136](https://github.com/kenkoller/KyberStation/pull/136) | feat(queue): one-click Add to Queue action bar button | Agent 4B | ✅ Merged |
| [#137](https://github.com/kenkoller/KyberStation/pull/137) | fix(wizard): audit polish — stale defaults, a11y, tests | Agent 3B | ✅ Merged |

### Critical bugs fixed (Ken's field notes)

| Bug | Fix | PR |
|---|---|---|
| Retraction animation appeared as ignition | FadeoutRetraction + ImplodeRetraction had inverted progress (double-inversion with engine's 1→0 convention) | #132 |
| Pixel strip / analysis rail width misaligned | `BladeCanvas` switched from stale piecewise ternary to `inferBladeInches()` from shared `bladeLengths.ts` | #133 |
| Blade tip too pointed | Removed `tipExtension = radius * 0.15` in BladeCanvas + headless renderer | #133 |
| Emitter glow visible when blade is OFF | Gated bore glow on `extendProgress > 0.05` | #133 |
| Pause didn't pause audio | `useAudioEngine` now watches `isPaused` from uiStore → `ctx.suspend()`/`ctx.resume()` | #130 |
| Header buttons inconsistent | Extracted `<HeaderButton>` primitive, normalized 5 buttons to h-7/rounded-interactive/focus-visible ring | #131 |
| Wizard stale defaults + a11y | Fixed 132→144 LED default, `aria-pressed`/`aria-label` on color + vibe buttons, +7 tests | #137 |
| Surprise Me didn't use new features | Randomizer now picks from full 18-ignition + 12-retraction catalogs, generates 1-2 modulation bindings | #135 |

### v1 launch features shipped

- **Save-state v1** (PR #134): `⭐ Save` button in action bar + "My Presets" section in gallery sidebar with click-to-load, delete, color swatches, persistence via `userPresetStore` + IndexedDB
- **Add-to-queue v1** (PR #136): `📌 Queue` button in action bar; one-click adds current config to active saber profile's card queue with auto-generated name + toast
- **Audio engine improvements** (Ken's PRs #118, #122, #124, #127, #128): shared mute store, SmoothSwing speed broadcasting, hum hot-swap on font change, ProffieOS in/out convention fix, modern sound category recognition, Brave FSA flag warning

### Test deltas

| Package | Pre-session | Post-session | Δ |
|---|---:|---:|---:|
| web | 1327 | 1822 | +495 |
| engine | 753 | 796 | +43 |
| sound | 43 | 62 | +19 |
| codegen | 1859 | 1859 | 0 |
| **Total** | **4289** | **4846** | **+557** |

---

## How to use this file

1. **Looking for what to do next?** Sort by target version + scope. v0.15.x items are smaller and bundle well into 1-2 day sessions; v0.16.0 items want a multi-day commitment.
2. **Adding a new deferred item?** If it has a dedicated doc, link to it. If it's a small TODO without a home, list it under "Code-level TODOs sweep" in the v0.15.x section.
3. **Promoting/demoting between versions?** Move the row, leave a comment in the linked source doc explaining why if non-obvious.
4. **An item shipped?** Delete the row. Don't leave ✅ rows — git history captures completion; this file is for the open queue.
