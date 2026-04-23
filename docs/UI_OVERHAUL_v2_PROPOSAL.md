# UI Overhaul v2 — Proposal

**Status:** proposal · pending Ken's mockup + redline · **do not implement yet**
**Date:** 2026-04-21
**Authors:** Ken (direction) · Claude (synthesis)
**Supersedes:** the unshipped portion of [`docs/WORKBENCH_UX_REALIGNMENT_2026-04-20.md`](WORKBENCH_UX_REALIGNMENT_2026-04-20.md). W1 / W2a / W3 / W4 / W4b / W5 / W6a / W6b from that plan already shipped on v0.13.0 and stay shipped. W7 (four-tab consolidation) + W8 (Inspector extraction) are replaced by this document.
**Sibling:** [`docs/UX_NORTH_STAR.md`](UX_NORTH_STAR.md) — still authoritative on type, tokens, motion, color. This doc only touches structure.

---

## 0. Executive summary

The launched v0.13.0 workbench is a **5-tab grid-of-panels** with ~29 panels. Agent audits surfaced: Design tab overloaded (10 panels), three dead gallery aliases, one exact duplicate (`gesture-config` = `effect-config`), one unimplemented stub (`font-preview`), and heavy overlap (colors live in 5 panels, motion in 4, ignition in 3). The blade preview, pixel strip, and per-LED RGB graphs render at mismatched widths because each scales independently (canvas by physical inches, everything else by container width).

This proposal restructures the editor around four principles:

1. **Four tabs in workflow order**: `Gallery → Design → Audio → Output` (new-user path: browse → tweak → hear → ship; last-active persisted so returning users land where they left off).
2. **A right-column Inspector** on Design with five tabs: STATE / STYLE / COLOR / EFFECTS / ROUTING. STATE renders the current blade in 9 states simultaneously — same width, vertically stacked — so changing one parameter reads across all states at a glance.
3. **A persistent bottom Delivery rail** (~50px) surfacing `[ Profile · Storage · Export · Flash ]` so shipping is always one click away from any tab.
4. **No "show advanced" toggle.** Clean organization + strict dedupe replaces hiding. If the IA is right, progressive disclosure is free.

Responsive consistency is a stated constraint: same components at every breakpoint, only arrangement changes. The 9-state Inspector stack stays Inspector-scoped at every width; desktop adds an opt-in `[ ALL STATES ]` mode that takes over the center preview at full workbench width.

The overhaul is **post-launch** — do not merge before v0.13.0 goes public. May 4 is still a promotion beat, not the launch date.

---

## 1. Tab map — before → after

| Before (v0.13) | After (this proposal) | Notes |
|---|---|---|
| Design | Gallery | Gallery first. New users browse → pick → fall into Design. Returning users land on last-active. |
| Dynamics | Design | Design absorbs all of current Dynamics via the Inspector pattern. |
| Audio | Audio | Largely unchanged — 4 panels, low overlap. |
| Gallery | Output | Lightened — card-writer + flash + storage-budget move into the Delivery rail. Output keeps code-output + compatibility + saber-profiles. |
| Output | — | Removed as separate tab. |

**Tab count: 5 → 4.** Drop Dynamics (absorbed by Design). Rename + reorder to match workflow.

---

## 2. Center layout — the five regions

```
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER                                                              │ ~36px
├──────────────────────────────────────────────────────────────────────┤
│  STATUSBAR (11-segment PFD strip — shipped v0.13.0)                  │ 22px
├──────────────────────────────────────────────────────────────────────┤
│  TABS  GALLERY · DESIGN · AUDIO · OUTPUT                             │ ~36px
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┬────────────────────────────────┬──────────────────┐   │
│  │ ANALYSIS │ BLADE PREVIEW + pixel strip    │ INSPECTOR        │   │
│  │ RAIL     │                                │                  │   │
│  │          │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ [STATE][STYLE]…  │   │
│  │ · pwr    │  ████████░░░░░░░░░░░░░░░░░░░   │ STATE ▼          │   │
│  │ · hue    │  ▁▂▄▆█▇▅▃▁░░░░░░░░░░░░░░░░░   │ [OFF           ] │   │
│  │ · sat    │                                │ [PREON         ] │   │
│  │ · R      │                                │ [IGNITING 50%  ] │   │
│  │ · G      │                                │ [IDLE ON       ] │   │
│  │ · B      │                                │ [CLASH         ] │   │
│  │ · lum    │                                │ [BLAST         ] │   │
│  │ · swing  │                                │ [LOCKUP        ] │   │
│  │ · trans  │                                │ [DRAG          ] │   │
│  │          │                                │ [RETRACTING…   ] │   │
│  │  [↗ expand]                               │                  │   │
│  └──────────┴────────────────────────────────┴──────────────────┘   │
│   ~200px          ~center (bladeRenderWidth)      ~400px             │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  PERFORMANCEBAR (shift-light radial gauge + 8-macro row)             │ ~148px *
├──────────────────────────────────────────────────────────────────────┤
│  DELIVERY RAIL  [PROFILE] · [STORAGE 1.2/8MB] · [EXPORT] · [FLASH]   │ ~50px
├──────────────────────────────────────────────────────────────────────┤
│  HUD DATA TICKER (ambient — shipped v0.13.0)                         │ 12px
└──────────────────────────────────────────────────────────────────────┘
```

\* PerformanceBar becomes `visible-in-Design-only` to reclaim space on Gallery / Audio / Output. See §13.

### Width math for the blade-preview / pixel-strip / RGB mismatch

Three trio (BladeCanvas, PixelStripPanel, per-LED RGB graphs when rendered inside the preview region) share a **single computed `bladeRenderWidth`** set at the WorkbenchLayout level:

```ts
bladeRenderWidth = clamp(
  container.width - analysisRailWidth - inspectorWidth - paddingX,
  MIN_BLADE_WIDTH,   // e.g. 400
  MAX_BLADE_WIDTH,   // e.g. ledCount * MAX_LED_PITCH_PX
);
```

All three components receive `bladeRenderWidth` as a prop and lay out around it. The center column's remaining width becomes horizontal padding (centering). AnalysisRail layers get their **own** much narrower width — they do not need to match.

---

## 3. Inspector tabs (right column on Design)

Right column is **400px wide** at desktop, narrower at tablet, collapses to bottom sheet at phone.

### STATE — 9 states, same width, vertically stacked

The workbench's primary audition surface. Each row is the same blade at a different state, rendered at the same width as the row above + below it:

| Row | State | Engine source | Notes |
|---|---|---|---|
| 1 | OFF | `state = OFF` | All dark |
| 2 | PREON | `state = PREON, progress = 0.5` | Mid-flash capture |
| 3 | IGNITING 50% | `state = IGNITING, progress = 0.5` | Half-extended |
| 4 | IDLE ON | `state = ON, no effects` | Steady full blade |
| 5 | CLASH | `state = ON + effect: clash held` | Captures flash at peak |
| 6 | BLAST | `state = ON + effect: blast held` | Mark at centre |
| 7 | LOCKUP | `state = ON + effect: lockup held` | Flicker bump held |
| 8 | DRAG | `state = ON + effect: drag held` | Tip bleed held |
| 9 | RETRACTING 50% | `state = RETRACTING, progress = 0.5` | Half-retracted |

**Click behavior**: clicking a row snaps the main blade preview + engine to that state (holds sustained effects, freezes transient ignition/retraction at the captured progress frame). Changing any param in STYLE / COLOR / EFFECTS re-renders all 9 rows live.

**Desktop-only mode toggle** (see §6): a top-level `[ SINGLE BLADE ] · [ ALL STATES ]` toggle replaces the center blade preview with the 9-state stack at **full workbench width** — best comparison fidelity. Hidden on tablet + mobile.

### STYLE — style picker + style-specific params

Absorbs current `StylePanel` content (style selector + shimmer / noise / motion-response tuning). The style picker becomes a **mini-gallery** of thumbnails (29 styles exist, discovery is the current bottleneck — see §8).

### COLOR — all colors + gradient builder

Absorbs current `ColorPanel` + `GradientBuilder`. One home for: base / clash / blast / lockup / drag / melt / lightning / preon + gradient stops. Presents as grouped sections (primary / effect / gradient) not tabs-within-tabs.

### EFFECTS — ignition + retraction + spatial + preon + prop

Absorbs current `EffectPanel` + `IgnitionRetractionPanel` + `GestureControlPanel`. Sub-sections: Ignition (style + ms + curve) / Retraction (style + ms + curve) / Spatial (clash-loc / blast-spread / stab-depth / lockup-drag-melt radii) / Preon / Prop (Fett263 gesture config). Dedupes the current double-home for ignition/retraction.

### ROUTING — modulator wiring placeholder

Empty shell reserved for v1.1 modulation-routing. Shows "modulator routes go here — v1.1" in the interim.

---

## 4. Panel redistribution table

Every current panel has a destination. Dedupes resolved. Source: Agent A audit + this proposal's structural decisions.

| Current panel ID | File | Destination | Action |
|---|---|---|---|
| `style-select` | StylePanel.tsx | Inspector → STYLE tab | move |
| `color-picker` | ColorPanel.tsx | Inspector → COLOR tab | move |
| `ignition-retraction` | (IgnitionRetractionPanel) | Inspector → EFFECTS tab | merge into EFFECTS |
| `parameters` | ParameterBank.tsx | Inspector → STYLE tab (params section) + PerformanceBar macro bindings | merge — the ParameterBank sliders ARE what the PerformanceBar macros drive. Single source of truth. |
| `layer-stack` | LayerStack.tsx | Design center column (below blade preview) OR left of Inspector | keep, relocate — needs its own column, doesn't fit inside Inspector |
| `gradient-builder` | GradientBuilder.tsx | Inspector → COLOR tab | merge into COLOR |
| `randomizer` | Randomizer.tsx | Gallery tab → "✦ SURPRISE ME" card (first-row, alongside the wizard card) | move |
| `my-crystal` | CrystalPanel.tsx | Keep as-is (dockable panel) OR header-chip popout | keep, reconsider scope later — not part of this overhaul |
| `oled-preview` | OLEDPreview.tsx | Output tab (pairs with code-output) | move |
| `theme-picker` | ThemePickerPanel.tsx | Settings modal (already partially there via ⌘K) | move — not a core editor concern |
| `effect-triggers` | EffectPanel.tsx | Inspector → STATE tab (trigger = audition) + existing action-bar chips | consolidate — action-bar stays for quick-fire; Inspector STATE owns sustained-hold triggering |
| `effect-config` | GestureControlPanel.tsx | Inspector → EFFECTS tab (Prop sub-section) | move + merge with dup |
| `motion-simulation` | MotionSimPanel.tsx | Always-visible peek in Inspector (above the tab bar, 3 sliders) OR Inspector → STATE tab's auto-motion controls | absorb |
| `gesture-config` | GestureControlPanel.tsx | — | **DELETE — exact dup of effect-config** |
| `comparison-view` | ComparisonView.tsx | — | **DELETE — replaced by Inspector STATE tab** |
| `font-library` | SoundFontPanel.tsx | Audio tab | keep |
| `font-preview` | FontPreviewPlaceholder | — | **DELETE — unimplemented stub** |
| `mixer-eq` | AudioPanel.tsx | Audio tab | keep |
| `effect-presets` | EffectPresetsPanel | Audio tab (as quick-access row inside mixer-eq) | merge |
| `gallery-browser` | PresetGallery.tsx | Gallery tab (full-screen marquee) | reshape — see §5 |
| `builtin-presets` | (alias → PresetGallery) | — | **DELETE alias** |
| `my-presets` | (alias → PresetGallery) | — | **DELETE alias** |
| `community-gallery` | (alias → PresetGallery) | — | **DELETE alias** |
| `preset-detail` | PresetDetailPanelConnected | Gallery tab → expanded card state | merge into gallery card hover/click |
| `output-workflow` | OutputWorkflowGuide.tsx | Output tab | keep (ambient workflow checklist) |
| `saber-profiles` | SaberProfileManager.tsx | Output tab + Delivery rail's `[PROFILE]` segment | split |
| `code-output` | CodeOutput.tsx | Output tab | keep |
| `storage-budget` | StorageBudgetPanel.tsx | Delivery rail's `[STORAGE]` segment | move |
| `card-writer` | CardWriter.tsx | Delivery rail's `[EXPORT]` action | move (trigger opens modal) |
| `flash-to-saber` | FlashPanel.tsx | Delivery rail's `[FLASH]` action | move (trigger opens modal) |
| `compatibility` | CompatibilityPanel.tsx | Output tab | keep |
| `oled-editor` | OLEDEditor.tsx | Output tab | keep (paired with oled-preview) |

**Deletions: 6 panels** (3 gallery aliases, 1 dup, 1 stub, 1 replaced by Inspector STATE).
**Demotions: 7 panels** (merged into Inspector / Delivery rail / Settings).
**Final editor panel count: ~16** (down from 29).

---

## 5. Gallery tab — near-full-screen marquee

Rebuild `gallery-browser` using the existing `LandingSaberArray` + `MarqueeCard` pattern already proven on the landing page.

Shape:
- **Edge-to-edge**, no per-column grid (Gallery tab ignores the workbench left/center/right layout — this tab owns the full width).
- **Filter rail at top** (~48px): `[ ALL ] [ CANONICAL ] [ CREATIVE ] [ MY PRESETS ] [ COMMUNITY ]` + era + faction chips.
- **Card grid** beneath: auto-sized rows, zip-hue-spread so adjacent cards rarely share colors, hover-to-ignite preview, click loads the preset into the editor (switches user to Design tab automatically).
- **First card: "✦ NEW SABER"** — distinct treatment (accent border, `GUIDED BUILD` eyebrow, star glyph). Opens `SaberWizard` as a modal. Replaces the current standalone wizard button.
- **Second card: "🎲 SURPRISE ME"** — replaces the `Randomizer` panel. Picks random archetype + style + color, loads directly into editor.
- **Cards after**: preset library, user presets, community presets (per filter selection).

---

## 6. STATE comparison mode

Inspector's STATE tab is always available. **Desktop only** adds an opt-in escalation:

- A top-level mode toggle in the editor chrome: `[ SINGLE BLADE ] · [ ALL STATES ]`.
- When `ALL STATES` is active, the center column's blade preview is **replaced** by the 9-state stack at full workbench width — each state renders as wide as the blade preview normally is.
- AnalysisRail and Inspector remain visible on sides (so you can still tweak while seeing all states).
- Toggling back to `SINGLE BLADE` returns to the default single-preview view.

On tablet / mobile this toggle isn't exposed; only the Inspector-scoped stack is available.

---

## 7. Delivery rail — persistent bottom bar

**Height: ~50px.** Visible on every tab (Gallery, Design, Audio, Output). Above the DataTicker, below PerformanceBar on Design.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [🗡 OBI-WAN ANH ▾]  [STOR 1.2 / 8 MB ●]  [EXPORT ▸]  [FLASH ▸]  [STATUS] │
└──────────────────────────────────────────────────────────────────────────┘
```

| Segment | Content | Interactive? |
|---|---|---|
| `PROFILE` | Active saber profile + name. Dropdown switches profiles. | Yes (dropdown) |
| `STORAGE` | Total flash + SD usage (green <60% · amber 60–85% · red >85%). | No — passive |
| `EXPORT` | Opens CardWriter modal for SD card zip + config export. | Yes (modal trigger) |
| `FLASH` | Opens FlashPanel modal for WebUSB DFU flashing. | Yes (modal trigger) |
| `STATUS` | WebUSB connection indicator (idle / connected / flashing / error). | No — passive |

Why persistent: the core message is **"you can ship this at any time"**. Beginners never wonder where export lives. Advanced users save clicks.

---

## 8. Organization principles — no "show advanced" toggle

Per Ken's direction: no progressive-disclosure gating. Instead:

1. **One semantic concern = one home.** Colors live in Inspector COLOR. Ignition lives in Inspector EFFECTS. Motion sim lives in Inspector (above tabs) OR STATE tab's auto-motion controls. No concern is editable from two places.
2. **Collapsible sections remain** for visual rhythm and scroll ergonomics, but **no section is labeled "advanced"**. All-closed-by-default at first load, persisted per-section via existing `CollapsibleSection` store.
3. **Dedupe is mandatory.** §4's 6 deletions and 7 merges are not optional. Post-overhaul, `git grep` should find each BladeConfig field written from exactly one UI surface.
4. **Discoverability via mini-galleries, not dropdowns.** Style picker, ignition picker, effect picker, sound font picker all become thumbnail-grid pickers within their Inspector sections. Ken's direction: *"give users the ability to easily inject new and cool animations into designs."* The animations exist (29 styles, 21 effects, 19 ignitions); the discovery surface is the gap.

---

## 9. Blade-length fidelity fix

Tracking from Agent B's diagnosis:

- Introduce `useBladeRenderWidth()` hook in `hooks/` that computes and memoizes the shared width.
- Thread it through `BladeCanvas`, `PixelStripPanel`, and the per-LED RGB graphs inside the center column.
- AnalysisRail layers (power / hue / sat / swing / transition) get their **own** narrow width (180–240px) — no match required.
- Each AnalysisRail layer gets a `↗ expand` affordance that overlays that layer at workbench-width for forensic inspection. `ESC` or click-outside closes.
- PixelStripPanel and per-LED RGB graphs below the blade get their x-axis scale from `bladeRenderWidth`, not from container width.

Effort: S–M. Primarily prop plumbing + a width-computation hook. No store changes.

---

## 10. Breakpoint behavior — responsive parity

"Visually consistent across all breakpoints" means **structural parity** — same 4 tabs, same Inspector tabs, same Delivery rail — at every width. Pixel-identical layout isn't free. Tradeoffs:

| Region | Desktop ≥1440 | Tablet 1024–1440 | Mobile <1024 |
|---|---|---|---|
| Tabs | Full row, UPPERCASE mono + ⌘1–⌘4 kbd | Full row, no kbd | Scrollable pill row |
| AnalysisRail | Full ~200px column | Icon-only ~40px with on-demand expand | Slide-in drawer (swipe from left edge) |
| Blade preview | Center, `bladeRenderWidth` honors LED count | Same | Full-width |
| Inspector | Right ~400px column | Right ~320px column | Bottom sheet (tap Inspector button in editor chrome) |
| PerformanceBar | 148px, 8-knob row visible | 148px, 4-knob visible + horizontal scroll for rest | Collapsed to page-pill strip only; expand reveals knobs |
| Delivery rail | Full 50px, all 5 segments | Same | Same, icon-only mode collapsible |
| Gallery tab | Edge-to-edge marquee, zip-hue rows | Same, narrower rows | 2-column portrait grid |
| STATE mode toggle | Yes (top-level `[SINGLE][ALL STATES]`) | No | No |

Every surface exists at every width; fidelity degrades gracefully rather than disappearing.

---

## 11. What this doesn't change

Explicit non-goals so the scope stays tight:

- **SaberWizard content.** The 3 steps (archetype / color / vibe) stay. Only its mount point changes (modal from "NEW SABER" card, no longer a header button).
- **Landing page.** No changes. Overhaul is editor-only.
- **Preset library.** No preset additions / removals in this sprint. Agent A flagged 3 alias-panel deletions; those are layout-store + layoutStore mapping-only, not preset data changes.
- **Engine, codegen, presets, sound packages.** Untouched. This is a UI sprint.
- **CrystalPanel, FullscreenPreview, OLED editor content.** Kept as-is.
- **StatusBar (top) + DataTicker (bottom).** Both shipped on v0.13.0. Structurally unchanged.
- **PerformanceBar macro bindings.** Wave 5 shipped. Dedupe bindings against ParameterBank during the overhaul, but the macro concept stays.
- **Theme definitions.** 30 themes stay. Imperial amber is NOT being promoted to default.
- **Mobile web app.** Preserved, not dropped, despite the desktop-primary framing.

---

## 12. Open questions — resolved 2026-04-21

Round 1 locked:

1. **LayerStack placement.** → (b) collapsible drawer below the blade preview.
2. **Inspector STATE — default tab on first open?** → STATE on first visit, persisted per-user after.
3. **Motion-sim peek placement.** → Folded into STATE tab's auto-swing / auto-duel controls.
4. **Delivery rail PROFILE** → Single dropdown.
5. **Action bar fate.** → Keep Ignite chip only; remove the 4 effect chips (STATE tab subsumes). LIVE indicator stays.
6. **Gallery chrome.** → No PerformanceBar on Gallery; Delivery rail stays. "It's a gallery, it should look like a gallery."
7. **STATE mode affordance (desktop).** → Inline toggle chip in the editor chrome.
8. **Dark-mode-only** → Confirmed. Lightsabers render correctly only against dark chrome.

## 12b. Open questions — round 2 (resolved 2026-04-21)

Surfaced after round 1, all locked:

1. **STATE mode rendering approach** → **Snapshot cache + motion-on-hover.** Each of the 9 state rows renders from a cached RGB frame by default (cheap, refreshes only when config changes). Hovering a row switches THAT row's canvas to live-tick from the engine — so dynamic effects (CLASH flash, LOCKUP flicker, IGNITING sweep) play through while the user's looking at them. Matches the landing MarqueeCard hover-to-ignite pattern exactly. Only one row can be hovered at a time → worst-case live cost = 1× normal engine tick above the snapshot baseline. Still requires the `captureStateFrame(state, effectHeld?)` BladeEngine API for the snapshot path.
2. **Performance tier × STATE mode** → On Lite tier, hover fallback degrades to "slow refresh" (snapshots re-capture every ~400ms while hovered) rather than full live-tick. Full / Medium get true live-tick on hover. Unhovered rows are static on every tier.
3. **CrystalPanel placement** → **(a) Dockable in Design tab**, with default size **reduced** from the current footprint. Pairs naturally with the LayerStack drawer below the blade. User can close / resize / drag it like any other dockable panel. Signature feature preserved without dominating the layout.
4. **⌘5 fate** → **⌘5 → toggle STATE mode**. Pairs with the inline toggle chip from round 1 Q7. Power users get the keyboard path.

---

## 13. Phasing — post-launch sequencing

Do not ship this before public launch. Once merged, sequencing should absorb the waves in an order that keeps each commit independently shippable:

| Wave | Content | Risk | Effort |
|---|---|---|---|
| OV1 | **Dedupe pass**: delete 3 gallery aliases + gesture-config dup + font-preview stub + comparison-view. Panel map goes from 29 → 23. No UI rearrangement yet. | Low — all deletions are already orphaned or duplicated | S |
| OV2 | **Blade-length fix**: shared `bladeRenderWidth` hook, prop through pixel strip + RGB graphs. | Low | S |
| OV3 | **Gallery tab rebuild**: edge-to-edge marquee, NEW SABER card, SURPRISE ME card, kill remaining gallery filters. | Medium — Gallery is a known surface; rebuild is additive-or-replace | M |
| OV4 | **Delivery rail**: persistent bottom bar with 5 segments. Move CardWriter / FlashPanel / StorageBudget triggers into it. | Medium — touches current Output tab | M |
| OV5 | **AnalysisRail left panel + expand affordance**: split VisualizationStack into pixel-shaped (stays) + line-graph-shaped (moves). | Medium | M |
| OV6 | **Tab reorder + Dynamics → Design merge**: 5 → 4 tabs. Layout-store migration for persisted panel positions. | High — persisted user layouts migrate; tests needed | M-L |
| OV7 | **Inspector extraction**: StylePanel + EffectPanel + ColorPanel → Inspector with STATE / STYLE / COLOR / EFFECTS / ROUTING tabs. | High — largest structural move, mature panels at stake | L |
| OV8 | **STATE-mode takeover (desktop)**: top-level toggle chip + ⌘5 keybinding + 9-state full-width stack. Requires engine `captureStateFrame(state, effectHeld?)` API per §12b.1. Snapshot-cache default, live-tick on hover (Full/Medium) or slow-refresh (Lite) per §12b.2. | Medium | M |
| OV9 | **Inspector mini-gallery pickers**: thumbnail grids for style, ignition, effect, sound font. | Low | M |
| OV10 | **Responsive parity sweep**: tablet + mobile fallbacks per §10 table. | Medium | M-L |

OV1 + OV2 can ship into a v0.13.1 even before the rest lands — they're cleanups. Everything else targets v0.14.x as a "UI overhaul" release train.

---

## 14. Cross-links

- [`docs/UX_NORTH_STAR.md`](UX_NORTH_STAR.md) — type / tokens / motion / aesthetics (authoritative)
- [`docs/WORKBENCH_UX_REALIGNMENT_2026-04-20.md`](WORKBENCH_UX_REALIGNMENT_2026-04-20.md) — predecessor plan (shipped waves stay, W7/W8 superseded by this doc)
- [`docs/design-reference/2026-04-19-claude-design/`](design-reference/2026-04-19-claude-design/) — reference that seeded this direction
- [`docs/MODULATION_ROUTING_V1.1.md`](MODULATION_ROUTING_V1.1.md) — v1.1 modulation work that fills Inspector's ROUTING tab
- [`CLAUDE.md`](../CLAUDE.md) — project posture (launch-readiness, humble framing)

---

_End of proposal._
