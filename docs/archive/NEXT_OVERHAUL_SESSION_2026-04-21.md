# UI Overhaul v2 — Next Session Handoff

**Created:** 2026-04-21
**Prior session:** shipped W5 PerformanceBar + OV1 dedupe + OV2 blade-length fidelity fix + the authoritative [UI_OVERHAUL_v2_PROPOSAL.md](UI_OVERHAUL_v2_PROPOSAL.md).
**Purpose:** give Ken copy-pasteable starter prompts for the remaining overhaul waves, organized so multiple Claude Code sessions can run in parallel without merge conflicts.

---

## Parallelism map

Three lanes, each on a dedicated feature branch off `feat/ui-overhaul-v2`:

```
feat/ui-overhaul-v2 (current; already has OV1 + OV2 + proposal doc)
├── feat/ov9-mini-galleries          (Lane A — safe parallel)
├── feat/ov3-gallery-marquee         (Lane B — safe parallel)
└── feat/ov4-ov5-layout-restructure  (Lane C — OV4+OV5 bundled, single lane)
```

**Why this split:**

| Lane | Files it owns | Files it shares with others | Safe parallel? |
|---|---|---|---|
| A (OV9) | `StylePanel.tsx`, `EffectPanel.tsx`, new `MiniGalleryPicker.tsx`, new `lib/styleThumbnails.ts` | none | ✓ |
| B (OV3) | `PresetGallery.tsx`, new `NewSaberCard.tsx`, new `SurpriseMeCard.tsx` | `Randomizer.tsx` (deletion) | ✓ |
| C (OV4+OV5) | `WorkbenchLayout.tsx` (sections 2/2b/5b/5c), new `DeliveryRail.tsx`, new `AnalysisRail.tsx`, new `AnalysisExpandOverlay.tsx`, `VisualizationStack.tsx`, `SaberProfileSwitcher.tsx`, `CardWriter.tsx`, `FlashPanel.tsx` | — | Lane C's two waves MUST run sequentially (both touch WorkbenchLayout section structure) |

**Merge order back to `feat/ui-overhaul-v2`:** A → B → C. A is smallest and most isolated, so it's the least likely to conflict with downstream waves. C touches the most files and goes last.

**Waves NOT in this parallel batch:** OV6 (tab merge) / OV7 (Inspector extraction) / OV8 (STATE mode) / OV10 (responsive parity) — these are strictly sequential on top of each other and on C. They get their own dedicated sessions in a future batch.

---

## Launching a lane

Each lane has a self-contained starter prompt below. To launch:

1. Open a fresh Claude Code session in `/Users/KK/Development/KyberStation`.
2. Ensure you're on `feat/ui-overhaul-v2`: `git checkout feat/ui-overhaul-v2 && git pull` (if pushed).
3. Paste the lane's entire prompt block as your first message.
4. The session cuts its own branch off `feat/ui-overhaul-v2`, does the work, commits, and reports.
5. You review + merge back to `feat/ui-overhaul-v2` manually.

---

## Lane A — OV9: Inspector mini-gallery pickers

**Risk:** Low. **Effort:** M (~2–3 hours).
**Branch:** `feat/ov9-mini-galleries` (cut from `feat/ui-overhaul-v2`).

### Starter prompt (paste into fresh session)

> UI Overhaul v2 — Lane A (OV9): Inspector mini-gallery pickers.
>
> **Context**
>
> Read [`docs/UI_OVERHAUL_v2_PROPOSAL.md`](UI_OVERHAUL_v2_PROPOSAL.md) §8 "Organization principles" — specifically the bullet: *"Discoverability via mini-galleries, not dropdowns."* The goal is to replace the current button grids in `StylePanel.tsx`, `EffectPanel.tsx`, and `TabColumnContent.tsx:168`'s inline `IgnitionRetractionPanel` with a shared thumbnail-grid primitive. 29 styles, 21 effects, and 19 ignitions exist in the engine today — the problem is discovery, not inventory.
>
> **Goal**
>
> Ship a `<MiniGalleryPicker>` primitive + thumbnail library, then migrate the style picker, ignition picker, and retraction picker to use it. Inspector is post-launch; this change lands on the CURRENT panels so the new pattern is battle-tested before the full Inspector extraction in OV7.
>
> **Branch setup**
>
> ```bash
> git checkout feat/ui-overhaul-v2
> git pull  # if pushed
> git checkout -b feat/ov9-mini-galleries
> ```
>
> **Defaults Ken has greenlit (don't ask, just implement):**
>
> - **Thumbnail shape:** static SVG. Each style gets a signature mini-blade SVG showing its visual character (e.g., stable = solid line, unstable = jagged line, fire = flame-tipped, fractal = branching). Static is faster, cheaper, and doesn't couple the picker to the live engine.
> - **Size:** 100×60 px thumbnails.
> - **Grid columns:** 3 on desktop, 2 on tablet, 1 on mobile (responsive flex-wrap).
> - **Click behavior:** apply style/effect/ignition immediately (preserve current button-grid behavior; no preview-first step).
> - **Hover behavior:** slight scale-up + accent border, no engine-driven animation (that's a stretch goal for OV9.1 if it feels static).
>
> **Files to create**
>
> - `apps/web/components/shared/MiniGalleryPicker.tsx` — primitive. Props: `{ items: Array<{ id, label, thumbnail: ReactNode, description?: string }>, activeId: string, onSelect: (id) => void, columns?: number, compact?: boolean }`. Radix-UI-free; uses existing Tailwind + CSS tokens.
> - `apps/web/lib/styleThumbnails.ts` — map of styleId → SVG component. Author ~10 signature thumbnails for the most common styles (stable, unstable, fire, rotoscope, pulse, gradient, photon, plasma, crystal-shatter, aurora). Fallback thumbnail for any unlisted style (simple horizontal line).
> - `apps/web/lib/ignitionThumbnails.ts` — same pattern for ignitions. Cover standard, scroll, spark, center, wipe, stutter, glitch, crackle, fracture, flash-fill, pulse-wave, drip-up.
> - `apps/web/lib/retractionThumbnails.ts` — same for retractions. Cover standard, scroll, fadeout, center, shatter, dissolve, flicker-out, unravel, drain.
> - `apps/web/tests/miniGalleryPicker.test.ts` — regression tests: click dispatches `onSelect` with correct id; `activeId` highlights the matching item; keyboard navigation (Arrow keys, Enter).
>
> **Files to modify**
>
> - `apps/web/components/editor/StylePanel.tsx` — replace the style button grid with `<MiniGalleryPicker items={STYLE_THUMBNAILS} ... />`. The style-specific parameter sliders underneath the picker stay unchanged.
> - `apps/web/components/editor/EffectPanel.tsx` — replace ignition + retraction button grids. Preserve the adjacent ignitionMs / retractionMs sliders.
> - `apps/web/components/layout/TabColumnContent.tsx` — the inline `IgnitionRetractionPanel` function (line ~168) should adopt the same pattern. Extract `IgnitionRetractionPanel` into its own file `apps/web/components/editor/IgnitionRetractionPanel.tsx` while you're at it.
>
> **Acceptance**
>
> 1. `pnpm --filter @kyberstation/web typecheck` clean.
> 2. `pnpm --filter @kyberstation/web test` all tests passing (baseline 660 → add ~10 new for MiniGalleryPicker).
> 3. Preview-start the dev server, navigate to editor, click through Design tab's style picker and Dynamics tab's ignition/retraction picker. Each swap changes the blade visibly within ~100ms.
> 4. No visual regression on the style-parameter sliders below the picker.
>
> **Commit shape**
>
> - Commit 1: `feat(overhaul): OV9 — MiniGalleryPicker primitive + style thumbnails`
> - Commit 2: `refactor(overhaul): OV9 — migrate StylePanel to MiniGalleryPicker`
> - Commit 3: `refactor(overhaul): OV9 — migrate ignition + retraction pickers`
>
> Do NOT merge to `feat/ui-overhaul-v2`. Report back with the usual format (files touched, test count, deviations, anything skipped). Ken reviews + merges manually.
>
> **Non-goals for Lane A (do not expand scope)**
>
> - Inspector extraction — that's OV7, a later session.
> - Live-engine animation on hover — stretch goal, revisit after the static pattern ships.
> - Sound font picker — that's a different shape; keep it separate.
> - Touching WorkbenchLayout.tsx or layoutStore — Lane A is panel-internal only.

---

## Lane B — OV3: Gallery tab marquee

**Risk:** Medium. **Effort:** M–L (~3–4 hours).
**Branch:** `feat/ov3-gallery-marquee` (cut from `feat/ui-overhaul-v2`).

### Starter prompt (paste into fresh session)

> UI Overhaul v2 — Lane B (OV3): Gallery tab edge-to-edge marquee.
>
> **Context**
>
> Read [`docs/UI_OVERHAUL_v2_PROPOSAL.md`](UI_OVERHAUL_v2_PROPOSAL.md) §5 "Gallery tab — near-full-screen marquee" and §4 panel redistribution rows for `gallery-browser`, `randomizer`, `preset-detail`. Ken wants the Gallery tab to look like the landing page's saber marquee — zip-hue-spread horizontal rows, hover-to-ignite, edge-to-edge — with two special cards (NEW SABER opens the wizard, SURPRISE ME randomizes) at the head of the grid.
>
> **Goal**
>
> Rebuild the Gallery tab so it uses the existing `LandingSaberArray` pattern (already shipped on `/`). Kill the 3 dead panel aliases (already done in OV1). Add NEW SABER and SURPRISE ME cards. Preserve filter functionality.
>
> **Branch setup**
>
> ```bash
> git checkout feat/ui-overhaul-v2
> git pull
> git checkout -b feat/ov3-gallery-marquee
> ```
>
> **Defaults Ken has greenlit:**
>
> - **Grid structure:** reuse `LandingSaberArray` shape (zip-hue-spread rows, hover-to-ignite). Don't rebuild from scratch.
> - **NEW SABER card:** first card in the grid. Accent-border (var(--accent)), `GUIDED BUILD` uppercase eyebrow, ✦ glyph center, static treatment (no animation). Click opens existing `SaberWizard` as a modal.
> - **SURPRISE ME card:** second card. 🎲 or sparkle glyph, neutral treatment (not accent-bordered — keeps NEW SABER the visual primary). Click picks a random archetype+style+color, loads into bladeStore, switches user to Design tab.
> - **Filter rail:** horizontal-scrolling chip row at top (~48px). Chips: `ALL / CANONICAL / CREATIVE / MY PRESETS / COMMUNITY` plus era chips (`PREQUEL / OT / SEQUEL / ANIMATED / LEGENDS`) plus faction chips (`JEDI / SITH / GREY / OTHER`). Default: `ALL` selected.
> - **Click on preset card:** load preset into bladeStore + auto-switch to Design tab (so user sees their edit canvas immediately).
> - **Delivery rail is still visible** on Gallery tab (per proposal §7). PerformanceBar is NOT visible on Gallery (§12.6 resolved). Both of those are Lane C's concerns — Lane B just doesn't obstruct them.
>
> **Files to create**
>
> - `apps/web/components/editor/NewSaberCard.tsx` — card using the same dimensions as `MarqueeCard` with a distinct treatment.
> - `apps/web/components/editor/SurpriseMeCard.tsx` — absorbs the `Randomizer` logic (pick random archetype+style+color).
> - `apps/web/components/editor/GalleryMarquee.tsx` — new top-level Gallery tab body. Wraps the filter rail + NEW SABER card + SURPRISE ME card + marquee grid.
>
> **Files to modify**
>
> - `apps/web/components/editor/PresetGallery.tsx` — becomes a thin wrapper that delegates to `GalleryMarquee`. Alternatively, if simpler, replace its body entirely while preserving the named export. Keep `PresetDetail` export alive for `preset-detail` panel consumers.
> - `apps/web/components/landing/LandingSaberArray.tsx` — if necessary, extract the reusable shape into `apps/web/components/shared/SaberMarqueeArray.tsx` and have both the landing page + gallery tab import it. Don't change the landing page's behavior.
> - `apps/web/components/landing/MarqueeCard.tsx` — if reused, may need a variant prop for "preset click loads + navigates" vs landing's "click opens editor with preset URL".
> - `apps/web/components/editor/Randomizer.tsx` — can be deleted once SurpriseMeCard absorbs the logic, OR kept as a non-panel utility accessible via ⌘K. Prefer deletion; `randomizer` panel is already in `feat/ui-overhaul-v2/docs/UI_OVERHAUL_v2_PROPOSAL.md §4` slated for relocation to Gallery anyway.
> - `apps/web/stores/layoutStore.ts` — remove the `randomizer` panel entry if deleted.
> - `apps/web/components/layout/TabColumnContent.tsx` — if `randomizer` panel is killed, drop its case.
>
> **Acceptance**
>
> 1. `pnpm --filter @kyberstation/web typecheck` clean.
> 2. `pnpm --filter @kyberstation/web test` all tests passing.
> 3. Preview-start the dev server, navigate to Gallery tab. Confirm: edge-to-edge grid, NEW SABER + SURPRISE ME visible as first two cards, filter chips functional, clicking a preset loads it + switches to Design.
> 4. Landing page `/` still works — LandingSaberArray unaffected.
> 5. No regression in `preset-detail` panel — still reads from `presetDetailStore`.
>
> **Commit shape**
>
> - Commit 1: `feat(overhaul): OV3 — SaberMarqueeArray shared primitive` (if extracted)
> - Commit 2: `feat(overhaul): OV3 — NEW SABER + SURPRISE ME cards`
> - Commit 3: `refactor(overhaul): OV3 — Gallery tab replaced with marquee`
> - Commit 4: `refactor(overhaul): OV3 — delete Randomizer panel (absorbed by SURPRISE ME)`
>
> Do NOT merge. Report back with the usual format.
>
> **Non-goals for Lane B**
>
> - Delivery rail — Lane C.
> - PerformanceBar gating per tab — Lane C.
> - OV7 Inspector — later session.
> - Adding new presets — scope is the UI, not the data.

---

## Lane C — OV4 + OV5: Delivery rail + AnalysisRail

**Risk:** Medium–High. **Effort:** L (~4–6 hours).
**Branch:** `feat/ov4-ov5-layout-restructure` (cut from `feat/ui-overhaul-v2`).

Lane C bundles OV4 and OV5 because both touch `WorkbenchLayout.tsx` section structure and would cause merge conflicts if split into parallel branches.

### Starter prompt (paste into fresh session)

> UI Overhaul v2 — Lane C (OV4 + OV5): Delivery rail + AnalysisRail.
>
> **Context**
>
> Read [`docs/UI_OVERHAUL_v2_PROPOSAL.md`](UI_OVERHAUL_v2_PROPOSAL.md) §2 (ASCII region diagram), §7 (Delivery rail spec), §9 (blade-length fidelity fix — already shipped as OV2), and §13 OV4 + OV5 rows. The goal is (a) adding a persistent 50px delivery rail at the bottom of the workbench between PerformanceBar and DataTicker, and (b) splitting the current vertical `VisualizationStack` below the blade into a left-side `AnalysisRail` (line-graph-shaped layers) plus the existing pixel-shaped layers that stay with the blade preview.
>
> **Goal**
>
> Two sequential sub-waves on the same branch:
> 1. **OV4 Delivery rail** first — additive, lower risk, unlocks a visible always-there "ship it" affordance.
> 2. **OV5 AnalysisRail split** second — structural, higher risk, changes how section 2/2b of WorkbenchLayout is laid out.
>
> **Branch setup**
>
> ```bash
> git checkout feat/ui-overhaul-v2
> git pull
> git checkout -b feat/ov4-ov5-layout-restructure
> ```
>
> **Defaults Ken has greenlit:**
>
> OV4:
> - **Delivery rail height:** 50px, visible on every tab (Gallery / Design / Audio / Output).
> - **Segment layout** (left to right): `[🗡 PROFILE ▾] [STOR 1.2/8 MB ●] [EXPORT ▸] [FLASH ▸] [● CONN STATUS]`.
> - **PROFILE segment:** single dropdown that wraps the existing `SaberProfileSwitcher` dropdown logic. Don't add a separate "Switch saber" button.
> - **STORAGE segment:** passive readout, reads from `StorageBudgetPanel`'s existing storage math. Green <60%, amber 60–85%, red >85%.
> - **EXPORT segment:** triggers a modal containing `CardWriter`.
> - **FLASH segment:** triggers a modal containing `FlashPanel`.
> - **STATUS segment:** passive readout, mirrors the StatusBar's CONN field (WebUSB connection state).
> - **Labels visible at desktop, icons-only at tablet and below.**
>
> OV5:
> - **AnalysisRail width:** 200px at desktop. Collapses to 40px icon-only at tablet. Becomes a left-edge slide-in drawer at mobile.
> - **Layer classification** (Agent B's work): the 9 line-graph-shaped layers move to AnalysisRail: luminance, power-draw, hue, saturation, channel-r, channel-g, channel-b, swing-response, transition-progress. The 3 pixel-shaped stay with blade: blade, pixel-strip, effect-overlay. `storage-budget` moves to the Delivery rail (OV4), not AnalysisRail.
> - **Expand affordance:** each AnalysisRail layer renders with a small ↗ icon in its top-right. Click = full-workbench-width overlay of that single layer. ESC or click-outside closes.
> - **Section 2/2b restructure:** the current vertical stack (blade canvas at section 2, analysis stack at section 2b) becomes a horizontal flex: left AnalysisRail (200px) + center blade + pixel layers (flex-1). Section 2b's vertical height is reclaimed.
> - **PerformanceBar visibility:** currently always-on across all tabs. Gate it to DESIGN tab only (Ken's §12.6 decision — no PerformanceBar on Gallery). Audio and Output reclaim that 148px.
>
> **Files to create (OV4)**
>
> - `apps/web/components/layout/DeliveryRail.tsx` — new top-level region.
> - `apps/web/components/editor/CardWriterModal.tsx` — thin modal wrapper around existing `CardWriter` body (existing CardWriter stays a panel-renderable component for backward compat; the modal is a second mount point).
> - `apps/web/components/editor/FlashPanelModal.tsx` — thin modal wrapper around existing `FlashPanel`.
> - `apps/web/tests/deliveryRail.test.ts` — segment-click dispatches correct modal, PROFILE dropdown opens + selects, STORAGE threshold colors.
>
> **Files to modify (OV4)**
>
> - `apps/web/components/layout/WorkbenchLayout.tsx` — mount `<DeliveryRail />` between the PerformanceBar section (5b) and the DataTicker section (6). Call it section 5c.
> - `apps/web/components/editor/SaberProfileSwitcher.tsx` — extract the dropdown trigger so DeliveryRail's PROFILE segment can mount it without also rendering the full switcher chrome that lives in the header.
> - `apps/web/stores/layoutStore.ts` — card-writer, flash-to-saber, storage-budget panel slots stay alive but the default Output tab assignment can de-emphasize them (they're secondary now, primary trigger is the delivery rail).
>
> **Files to create (OV5)**
>
> - `apps/web/components/layout/AnalysisRail.tsx` — left-side region. Accepts the 9 analysis layers.
> - `apps/web/components/layout/AnalysisExpandOverlay.tsx` — full-workbench-width overlay, portal-rendered, ESC/click-outside close.
> - `apps/web/tests/analysisRail.test.ts` — layer visibility toggles, expand-overlay open/close, classification (pixel-shaped stays with blade).
>
> **Files to modify (OV5)**
>
> - `apps/web/components/layout/WorkbenchLayout.tsx` — restructure section 2: flex row with `<AnalysisRail />` on left + `<CanvasLayout />` in center. Section 2b (the vertical viz stack) is either deleted or reduced to the pixel-shaped-only subset.
> - `apps/web/components/editor/VisualizationStack.tsx` — split into `VisualizationStack` (pixel-shaped, kept) and the new AnalysisRail-resident layer renderer. Probably cleanest as: AnalysisRail imports individual layer components directly, bypassing the stack wrapper.
> - `apps/web/lib/visualizationTypes.ts` — add a `shape: 'pixel' | 'line-graph' | 'scalar'` field to each layer definition so the split is data-driven, not a heuristic in the component.
> - `apps/web/stores/visualizationStore.ts` — no structural changes expected (layers still toggle visibility via the same store). AnalysisRail + blade-pixel-region both subscribe to the same store.
> - `apps/web/components/layout/PerformanceBar.tsx` — read activeTab from uiStore and return null unless activeTab === 'design'.
>
> **Acceptance**
>
> OV4:
> 1. Delivery rail visible on every tab at the bottom.
> 2. Clicking EXPORT opens CardWriter modal; clicking FLASH opens FlashPanel modal; both work end-to-end (same as they do today in the panel form).
> 3. PROFILE dropdown switches active saber.
> 4. STORAGE color changes with usage.
>
> OV5:
> 5. AnalysisRail visible on left at 200px. 9 line-graph layers render there.
> 6. Pixel strip + RGB graphs stay below the blade preview (OV2 still works).
> 7. Each line-graph layer has a ↗ icon; clicking expands it; ESC closes.
> 8. PerformanceBar invisible on Gallery / Audio / Output tabs; visible on Design.
>
> All: `pnpm --filter @kyberstation/web typecheck` + `test` green. Preview confirms every tab renders without regression.
>
> **Commit shape**
>
> - Commit 1: `feat(overhaul): OV4 — DeliveryRail primitive + modals`
> - Commit 2: `feat(overhaul): OV4 — mount DeliveryRail in WorkbenchLayout`
> - Commit 3: `refactor(overhaul): OV5 — classify viz layers by shape`
> - Commit 4: `feat(overhaul): OV5 — AnalysisRail + AnalysisExpandOverlay`
> - Commit 5: `refactor(overhaul): OV5 — restructure WorkbenchLayout section 2 for AnalysisRail`
> - Commit 6: `refactor(overhaul): OV5 — gate PerformanceBar to Design tab only`
>
> Do NOT merge. Report back with the usual format.
>
> **Non-goals for Lane C**
>
> - OV6 tab merge (Dynamics → Design) — later session; requires layoutStore migration.
> - OV7 Inspector extraction — later session.
> - Responsive polish at every breakpoint — that's OV10.
> - Adding new analysis layers — use the 13 that exist.

---

## Decisions Ken needs to pre-answer ONLY if he wants to override the defaults

Every lane above has a "Defaults Ken has greenlit" block that a spawned session can act on without blocking. These are the decisions baked into those defaults — override by pasting any of these at the end of the lane prompt:

### Lane A (OV9)
- Thumbnail shape (static SVG vs live engine snapshot vs animated hover)
- Thumbnail size (100×60 default)
- Grid columns per breakpoint (3/2/1 default)
- Click behavior (apply immediately default; alternative = "preview first then apply")

### Lane B (OV3)
- Grid row height / card aspect ratio — Ken has `LandingSaberArray` to match, so default is "same"
- NEW SABER card treatment (static accent border default; alternatives = animated ✦, glowing border, image)
- SURPRISE ME card glyph (🎲 default; alternatives = sparkle, random preset thumbnail)
- Filter rail default state (ALL selected default; alternative = last-used filter persisted)

### Lane C (OV4 + OV5)
- Delivery rail segment order (default above; alternative = custom order)
- PROFILE dropdown style (reuse SaberProfileSwitcher default; alternative = condensed dropdown)
- AnalysisRail default width (200px default; alternatives = 180/220/resizable)
- Expand overlay close behavior (ESC + click-outside default; alternative = X button only)
- PerformanceBar tab gating (Design only default; alternative = Design + Audio)

---

## Merge-back order

After lanes complete, merge back to `feat/ui-overhaul-v2` in this order:

```bash
# Lane A first (smallest, most isolated)
git checkout feat/ui-overhaul-v2
git merge feat/ov9-mini-galleries

# Lane B next (Gallery rebuild; shouldn't conflict with A's panel-internal changes)
git merge feat/ov3-gallery-marquee

# Lane C last (structural layout changes; absorbs any minor conflicts)
git merge feat/ov4-ov5-layout-restructure
```

After all three merge, `feat/ui-overhaul-v2` will contain: proposal doc + OV1 + OV2 + OV3 + OV4 + OV5 + OV9. Then OV6 / OV7 / OV8 / OV10 become the subsequent batch of sequential waves in a follow-up session.

---

## Blocking items that still need Ken's explicit call

None of the parallel lanes are gated on an unresolved decision. Every decision listed in the proposal doc §12 / §12b is locked. If Ken wants to override a default, he does it per-lane at launch.

Sequential waves NOT in the parallel batch DO still have pending decisions:

- **OV6 tab merge**: needs a migration strategy for users with persisted `dynamics` tab state (do they land on Design with their old column layout absorbed, or a fresh default?).
- **OV7 Inspector extraction**: needs a final call on tab naming — STATE / STYLE / COLOR / EFFECTS / ROUTING is the current plan, but "STYLE" vs "APPEARANCE" vs "VISUAL" is still a naming question.
- **OV8 STATE mode**: needs engine `captureStateFrame` API implementation in `packages/engine/src/BladeEngine.ts` before UI work can start.

Those three can wait for their own session batch.

---

_End of handoff._
