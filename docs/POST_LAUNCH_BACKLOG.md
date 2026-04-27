# KyberStation — Post-Launch Backlog

Single index of deferred work as of **2026-04-27 evening** (pre-public-launch). The detail for each item lives in its linked source doc — edit the source for spec changes, edit this file when status / priority / target version changes.

**Update cadence:** review at the start of every multi-PR sprint. Move items to ✅ when they ship; promote items between target versions as priorities shift.

---

## v0.15.x — patch sprint (post-hardware-validation)

Tracks small-to-medium items that should land soon after launch, scoped to one or two-day sessions.

| Item | Source | Scope | Notes |
|---|---|---|---|
| **Wave 7 — Kyber Glyph v2 modulation round-trip encoder body** | [`MODULATION_ROUTING_v1.1_IMPL_PLAN.md`](MODULATION_ROUTING_v1.1_IMPL_PLAN.md) | M (3-5 h) | PR #38 dispatcher merged; v2 encoder for the `modulation` payload field still outstanding. Multiplies value of v1.1 modulation features for community sharing. **Highest-leverage post-launch item.** |
| **Marketing site re-implementation** | [`POST_LAUNCH_BACKLOG.md`](POST_LAUNCH_BACKLOG.md) (this file, was PR #32) | L | Original PR #32 deferred — branch was 153 commits behind main and largely subsumed. Clean v0.15.x re-implementation: `/features` `/showcase` `/changelog` `/faq` `/community` pages, ScrollReveal component, inline code peek, `pageMetadata.ts` helper. SEO infra (`robots.txt` / `sitemap.xml` / `siteConfig.ts`) shipped pre-launch in PR #69. |
| **Module extraction `lib/blade/*` from `BladeCanvas.tsx`** | `CLAUDE.md` v0.14.0 entry | M | BladeCanvas.tsx is ~2800 lines with the bloom / rim-glow / motion-blur / ambient pipeline inline. Extract to `lib/blade/pipeline.ts` + `lib/blade/bloom.ts` + etc. so `MiniSaber` / `FullscreenPreview` / `SaberCard` can adopt the same pipeline. Phase 4 of the v0.14.0 plan. |
| **Golden-hash blade-render regression tests** | `CLAUDE.md` v0.14.0 entry | M | Render 8 canonical configs to a buffer, hash, diff against a checked-in golden set. Catches accidental visual drift. Designed in the v0.14.0 plan; not built. |
| **Card snapshot golden-hash tests (20 layout × theme combos)** | `CLAUDE.md` Share Card v2 entry | M | Same harness shape as the blade-render tests, applied to the saber card pipeline (4 layouts × 5 themes = 20 combos). Lock down regressions in `cardSnapshot.ts`. |
| **Mobile shell migration to Sidebar + MainContent** | `CLAUDE.md` left-rail overhaul entry | M | Mobile shell still uses 4-tab swipe UI + `MergedDesignPanel`. Once mobile migrates, `DesignPanel.tsx`, `DynamicsPanel.tsx`, `MergedDesignPanel`, and `uiStore.activeTab` can all leave together. **Needs UX judgment call** on drawer vs bottom-sheet pattern at 375px. |
| **Custom color popover** | `CLAUDE.md` left-rail overhaul entry | S | Custom color chip currently jumps to deep Color section. Inline HSL popover is an alternative; small follow-up if preferred. |
| **MGP thumbnail crispness** | `CLAUDE.md` left-rail overhaul entry | S | 24×24 ignition/retraction triggers are scaled-down 100×60 SVGs via `transform: scale(0.24)`. Add `compactThumbnail` field on `transitionCatalogs.ts` entries so authors can ship optimised small-size SVGs. |
| **Cross-OS hardware sweep — Windows / Linux + V2 / V3-OLED** | [`HARDWARE_VALIDATION_TODO.md`](HARDWARE_VALIDATION_TODO.md) | M | Phase A/B/C ✅ on macOS + V3.9 + Brave (Chromium). Windows WebUSB driver (WinUSB) historically fragile; Linux udev rules common sharp edge. Community-driven post-launch — invite reports via the launch Reddit post per `LAUNCH_PLAN.md`. |
| **Code-level TODOs sweep** | grep results | S each | `WorkbenchLayout.tsx:669` (theme-row cap) · `DeliveryRail.tsx:210` + `StatusBar.tsx:170,238` (global WebUSB store) · `BladeHardwarePanel.tsx` / `PowerDrawPanel.tsx` / `GradientBuilder.tsx` (left-rail-overhaul consumer migration) · `useClickToRoute.ts` (bladeStore-modulation-patch cleanup) · `packages/engine/src/modulation/sampler.ts` (v1.1 preon/ignition/retraction progress, `BladeConfig.clashDecay`). One PR per cluster. |
| **Dead-code cleanup** | `CLAUDE.md` 1.5x entry | S | `canvasMode` field in uiStore (kept after 1.5x for persistence safety). `BladeCanvas3DWrapper.tsx` (no import path). Safe to delete after verification sweep confirms no test/storybook references. |
| **`BladeConfig.hiltId` type declaration** | `CLAUDE.md` Share Card v2 follow-ups | S | Currently read via `(config as unknown as { hiltId?: string }).hiltId` in `card/drawHilt.ts`. Add to `BladeConfig` in `packages/engine/src/types.ts` and drop the cast. |
| **Faction heuristic refactor in `chips.ts`** | `CLAUDE.md` Share Card v2 follow-ups | S | `card/chips.ts` uses ad-hoc green/blue hue predicates. Cleaner: add `isGreenHue` / `isBlueHue` siblings to `isRedHue` in `lib/crystal/types.ts` so chip + crystal-form selection share one detection pass. |
| **`CardTheme` token expansion** | `CLAUDE.md` Share Card v2 follow-ups | S | Vignette color, watermark glyph, hilt accent are hardcoded in drawers. Add `vignetteColor` / `watermarkGlyph` / `hiltAccent` tokens so themes can vary (cream vignette on Jedi, ✦ on Imperial, amber hilt tint). |
| **Light-theme blade bloom theme-gating** | `CLAUDE.md` Share Card v2 follow-ups | S | `drawBlade` uses `'lighter'` composite mode, which over-brightens on `LIGHT_THEME`. Theme-gate the composite. |
| **Saber GIF Sprint 2** | [`SABER_GIF_ROADMAP.md`](SABER_GIF_ROADMAP.md) | M | Per-variant ignition / retraction picker GIFs (19 + 13 thumbnails) + build script + `MiniGalleryPicker` wiring. |

## v0.16.0 — feature sprint

Multi-day work or architecturally heavier items.

| Item | Source | Scope | Notes |
|---|---|---|---|
| **Wave 8 — Button routing sub-tab + aux/gesture-as-modulator plates** | [`MODULATION_ROUTING_v1.1_IMPL_PLAN.md`](MODULATION_ROUTING_v1.1_IMPL_PLAN.md) | L (~6-8 h) | New ROUTING sub-tab inside Inspector. Maps button events (aux click/hold/gesture) to actions per prop file; adds 8 new modulator plates. |
| **Wave 6 follow-on — composer slot expansion** | `CLAUDE.md` overnight recap | L | v1.1 Core ships shimmer-Mix only. Per-channel RGB (`Mix<driver, ColorLow, ColorHigh>` restructuring) + timing scalars. Deeper AST work per the PR #60 body. |
| **UX item #16 — Figma color model (opacity + blend modes)** | [`NEXT_SESSIONS.md`](NEXT_SESSIONS.md) | M | Add `opacity + blendMode` to `BladeColor`; ColorPanel UI; engine compositor; codegen warnings for unsupported modes; Kyber Glyph v2 migration. Architectural — needs glyph version bump. **Last UX North Star deferred item.** |
| **Hilt Library Stage 2 — 29 new parts across 7 assemblies** | [`HILT_STAGE_2_BRIEFING.md`](HILT_STAGE_2_BRIEFING.md) | L | 3-agent parallel: Agent A (top emitters, 7 parts), Agent B (switches+grips, 14 parts), Agent C (pommels+accents, 8 parts). Spec-driven SVG authoring. |
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

## Parking lot — small polish items

Track here when surfaced; promote to a versioned sprint when bundled with related work.

- **1200×630 OG hero image** — current OG image is the square 512×512 icon; platforms letterbox. Reddit/Twitter share preview would be much sharper with a 1200×630 hero render. Source: launch readiness audit + `LAUNCH_ASSETS.md`.
- **Real-saber demo GIFs (15-20s)** — `LAUNCH_ASSETS.md` calls these "the single most impactful asset". Ken's hardware shoot. Add to launch-amplification post on Star Wars Day if not at initial launch.
- **`CANONICAL_DEFAULT_CONFIG` drift-sentinel test** — Kyber Glyph v1 delta-encodes against a default config that's currently duplicated between `apps/web/lib/sharePack/kyberGlyph.ts` and `apps/web/stores/bladeStore.ts`. Drift-sentinel test pattern matches the BladeConfig mirror. Source: `CLAUDE.md` v0.12.0 architectural decisions.
- **Crystal Vault panel + Re-attunement UI** — design done in `KYBER_CRYSTAL_3D.md`, not built. Source: `CLAUDE.md` v0.12.0 deferred items.
- **Favicon replacement with crystal-themed image** — current is the app icon. Source: `CLAUDE.md` v0.12.0 deferred items.
- **Phone-camera QR scan validation** — confirm Saber Card QRs scan reliably on real phones at typical viewing distances. Source: `CLAUDE.md` v0.12.0 deferred items.
- **`<HiltMesh>` extraction** from `BladeCanvas3D.tsx` (now dead). Source: `CLAUDE.md` v0.12.0 deferred items.
- **Aurebesh font variants beyond Canon** — CanonTech / Legends / LegendsTech `.otf` files are bundled, no UI uses them. Future immersion-mode toggle. Source: `CLAUDE.md` v0.14.0 entry.
- **`BladeCanvas3DWrapper` deletion** — file exists in `apps/web/components/editor/` with no import path. Safe to delete after sweep. Source: `CLAUDE.md` 1.5x entry.

## Launch-night work (pre-launch — tonight, 2026-04-27 evening)

Tracked here so it doesn't get lost in the pre-launch shuffle. Items here either ship before launch or get explicitly punted to v0.15.x.

| Item | Status |
|---|---|
| **Wave 10 — Hardware validation on V3.9** | Planned for tonight. Handoff doc: [`NEXT_HARDWARE_MODULATION_SESSION.md`](NEXT_HARDWARE_MODULATION_SESSION.md). |
| **Cut `v0.15.0` tag** | Conditional on Wave 10 success. CHANGELOG + CLAUDE.md staged. |
| **Manual visual verification of overnight modulation PRs** | Pre-launch QA task. Browser-driven walkthrough of 11 plates, drag-to-route, fx-edit, reciprocal hover, generated config.h v1.1 comment block. |
| **Pre-launch verification battery** | Axe-core re-run + Lighthouse perf + asset inventory cross-check + smoke test the editor / gallery / share flow. |

---

## How to use this file

1. **Looking for what to do next?** Sort by target version + scope. v0.15.x items are smaller and bundle well into 1-2 day sessions; v0.16.0 items want a multi-day commitment.
2. **Adding a new deferred item?** If it has a dedicated doc, link to it. If it's a small TODO without a home, list it under "Code-level TODOs sweep" in the v0.15.x section.
3. **Promoting/demoting between versions?** Move the row, leave a comment in the linked source doc explaining why if non-obvious.
4. **An item shipped?** Delete the row. Don't leave ✅ rows — git history captures completion; this file is for the open queue.
