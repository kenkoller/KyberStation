# Sidebar A/B Column Layout v2 — Design Spec

Companion to `SIDEBAR_IA_AUDIT_2026-04-27.md`. Where the audit identifies WHAT to reorganize, this spec defines HOW the new MainContent surface is laid out: a Sidebar → Column A list → Column B controls pattern, modeled on the macOS System Settings / VS Code Extensions / Bitwig device chain triangulation.

Reference state: `main` @ `ddaa3b6`. Current MainContent is a single-panel switch keyed on `uiStore.activeSection` (`apps/web/components/layout/MainContent.tsx`).

---

## 1. Pattern reference

The pattern: **fixed Sidebar (nav) → narrower fixed Column A (item list within section) → Column B (controls for the selected item, fills remaining width).**

| Reference | What lives in A | What lives in B |
|---|---|---|
| **macOS System Settings** (since Ventura) | List of items inside a category — e.g. inside Privacy & Security, A is "Location Services / Contacts / Calendars / Photos / …", B is the toggles + permissions for the selected item | The deep config for the one selected A entry |
| **VS Code Extensions panel** | Search-filtered list of extensions | Selected extension's README + version + install button |
| **Bitwig Studio device chain** | Linear list of devices in the track | The selected device's parameter macros + automation lanes |
| **Logic Pro Smart Controls** | Channel strip list | Selected strip's plug-in chain + macros |

Common DNA:
1. Column A is **always one taxonomy lower** than Sidebar — e.g. Sidebar = "Blade Design", Column A = "29 individual blade styles"
2. Column A items are **homogeneous** — same shape per row, sortable/filterable
3. Column B is a **detail editor** for whichever A row is selected
4. Selecting a different A row swaps B's contents WITHOUT navigating away from the section (no full page change)

This is exactly what KyberStation needs for blade-style selection (29 styles), color editing (24 canon presets, 4 channels), ignition picker (19 options), retraction picker (13 options), preset library (305 presets), modulator routing (11 modulators × N parameters).

---

## 2. When does A/B apply?

### Sections that BENEFIT (have a list-of-things)
| Section | Column A list | Column B |
|---|---|---|
| `blade-style` | 29 blade styles (live thumbnail per row) | Selected style's parameters + colors + style-specific UI (BladePainter for `painted`, ImageScrollPanel for `imageScroll`, etc.) |
| `color` | 4 channels (Base / Clash / Lockup / Blast) — pinned at top — then 24 canon-color presets | Selected channel's HSL/RGB/hex/harmony picker + gradient editor (Base only) |
| `ignition-retraction` | TABS: Ignition / Retraction. Below tab: 19 ignition styles OR 13 retraction styles | Selected animation's ms slider + easing curve + custom-curve editor |
| `combat-effects` | List: Clash / Blast / Lockup / Drag / Melt / Lightning / Stab / Force / Shockwave / Scatter / Fragment / Ripple / Freeze / Overcharge / Bifurcate / Invert / Ghost Echo / Splinter / Coronary / Glitch Matrix / Siphon (21 effects) | Selected effect's color + brightness + decay + spatial position (when applicable) |
| `routing` | List of ACTIVE BINDINGS (not modulators — the bindings ARE the things) | Selected binding's source / target / combinator / amount + ExpressionEditor + viz of input/output |
| `gallery` (top route) | 305-preset grid | Selected preset's full preview + load button + creator/era metadata + (planned) glyph share |
| `audio` | Sound font browser (library list) | Selected font's preview + EQ/effects mixer |
| `my-saber` (NEW) | List of saved Saber Profiles | Selected profile's character-sheet hero + hardware fields + prop card configs |
| `output` → preset list | List of presets staged for the SD card | Selected preset's config dump + reorder + delete |

### Sections that DO NOT benefit (single-panel, no list)
| Section | Why not | Layout |
|---|---|---|
| `my-crystal` | One crystal, all the controls fit in one panel | Single column B (no A) |
| `motion-simulation` | 4 sliders, no list | Single column B |
| `gesture-controls` | One prop file at a time + flat toggles | Single column B (if prop files are picked from a small dropdown rather than a list) |
| `hardware` | Form layout (board + topology + length + strip + LED + brightness + power readout) | Single column B |
| `output` → generate code | Single code block | Single column B |
| `output` → export to card | Form-style flow | Single column B |

### Convention: the section's owning panel decides
- A `<MainContentABLayout>` composable wrapper takes optional `<ColumnA>` slot.
- If the section provides a Column A render, MainContent splits 280px / fill.
- If not (motion / hardware / crystal / etc.), the section gets full width and looks identical to today.

---

## 3. Layout shape

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (logo · Wizard · Cmd ⌘K · Sound · Docs · Help · Settings ⚙ · Profile pill)    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ BLADE PREVIEW + ANALYSIS RAIL (section 2 — unchanged from v0.14.0, ~320px tall)      │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ┃ SIDEBAR        ┃ COLUMN A        ┃ COLUMN B (deep editor for the selected A item) │
│ ┃ ~280px         ┃ ~280–320px      ┃ fills remaining width                          │
│ ┃                ┃                 ┃                                                │
│ ┃ Gallery →      ┃ ──────────────  ┃ ────────────────────────────────────────────── │
│ ┃                ┃ Blade Style     ┃ STABLE                                         │
│ ┃ SETUP          ┃ ────────────    ┃ ────────                                       │
│ ┃   My Saber     ┃ • Stable        ┃ Classic solid blade — no per-style params      │
│ ┃   Hardware     ┃ • Unstable      ┃                                                │
│ ┃                ┃ • Fire          ┃ ParameterBank (7 quick + 7 grouped sliders)    │
│ ┃ DESIGN         ┃ • Pulse         ┃                                                │
│ ┃   Blade Style◆ ┃ • Rotoscope     ┃                                                │
│ ┃   Color        ┃ • Gradient      ┃                                                │
│ ┃   Ignition&Ret ┃ • Photon        ┃                                                │
│ ┃   Effects      ┃ • Plasma        ┃                                                │
│ ┃   Layers       ┃ • Aurora        ┃                                                │
│ ┃                ┃ • …23 more      ┃                                                │
│ ┃ REACTIVITY     ┃                 ┃                                                │
│ ┃   Routing BETA ┃                 ┃                                                │
│ ┃   Motion Sim   ┃                 ┃                                                │
│ ┃   Gestures     ┃                 ┃                                                │
│ ┃                ┃                 ┃                                                │
│ ┃ OUTPUT         ┃                 ┃                                                │
│ ┃   Audio        ┃                 ┃                                                │
│ ┃   Generate     ┃                 ┃                                                │
│ ┃   Export Card  ┃                 ┃                                                │
│ ┃   Flash Board  ┃                 ┃                                                │
│ ┃   Saber Card   ┃                 ┃                                                │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ACTION BAR (Ignite + 5 effect chips — unchanged)                                     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ DELIVERY RAIL · SHIFT-LIGHT · APP PERF STRIP · DATA TICKER (unchanged)               │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Notes:
- Column A and Column B are both inside `<MainContent>` — neither extends past the panel area.
- The Inspector + AnalysisRail still live in section 2 above. They are NOT replaced; they're independent of A/B.
- Diamond glyph ◆ in the diagram is the active section indicator the sidebar already uses.

### Column widths
- Sidebar: 280px (unchanged from current `apps/web/components/layout/WorkbenchLayout.tsx` L1067)
- Column A: 280–320px (default 280, user-resizable, persisted to `uiStore.columnAWidth`)
- Column B: `flex-1 min-w-0` (fills the rest)
- Below 1200px breakpoint: Column A collapses to a 56px icon-only rail (icon + tooltip) so Column B keeps room. Below 1024px (mobile/tablet): see §5.

### Column A item structure
```
┌─────────────────────────────────┐
│ [thumb]  TITLE       │ status   │
│ [40×40]  subtitle    │ glyph    │
└─────────────────────────────────┘
```
- 40×40 thumbnail (uses MiniGalleryPicker thumbnails for styles / ignitions / retractions; saber-color swatch for color presets; mini blade preview for saber profiles)
- Single-line title + optional 1-line subtitle
- Right-edge status glyph slot (e.g. `⚠` for over-power, `★` for active, `BETA` chip)
- Active row: identical to sidebar's "active" treatment — `bg-accent-dim/30 border-l-2 border-accent text-accent`

---

## 4. Per-section design

### 4.1 `blade-style` (largest payoff — migrate FIRST)

**Column A** — 29-style list (replaces in-panel MiniGalleryPicker grid):
- Each row: 40×40 style thumbnail (live engine snapshot via `getStyleThumbnail` / scratch BladeEngine like StateGrid uses), label, 1-line description
- Top of A: search input ("Filter 29 styles…") + sort dropdown (default: catalog order)
- Active row: matches `config.style`

**Column B** — selected style's params:
- Style name + description header
- Style-specific UI (BladePainter for `painted`, ImageScrollPanel for `imageScroll`, etc.)
- ParameterBank (7 quick + 7 grouped) — moved here, NOT mounted in Inspector simultaneously (Inspector keeps a 4-slider compressed version OR the Inspector ParameterBank goes away in favor of the deep-section bank)
- DROPPED from this panel: the 4 ColorPickerRows (now `color` only), the GradientBuilder mount (already in `color`), the GradientMixer mount (already in `color`), the standalone Randomizer (Inspector keeps Surprise Me)

### 4.2 `color`

**Column A** — pinned-tabs (4 channels: Base / Clash / Lockup / Blast) followed by 24-preset list:
- Channel tabs sticky at top (always visible)
- Below: 24 canon-color preset rows. Each: color swatch + character name + "Tier 1 landmark" name from `namingMath` if locked
- Active row matches whatever was last clicked (preset OR a custom value)

**Column B** — picker for whichever channel + preset is active:
- HSL sliders + RGB sliders + hex input
- "As-on-blade Neopixel preview" swatch (existing `srgbToNeopixelPreview` math)
- Color harmony picker (`getHarmonyColors` — complementary/triad/etc.)
- Auto-suggest clash button
- GradientBuilder — only on Base channel (existing logic)

### 4.3 `ignition-retraction`

**Column A** — top tab toggle [Ignition | Retraction], below it the 19 / 13 styles list with thumbnails:
- Top: tab pair toggling A's contents
- Each row: 40×40 ignition or retraction static SVG thumbnail (existing `getIgnitionThumbnail` / `getRetractionThumbnail`), label, description

**Column B** — selected animation's deep config:
- Speed slider (ms range varies per kind)
- Easing curve picker (15 EASING_PRESETS exist; current panel doesn't expose them — A/B is a chance to surface them)
- Custom-curve editor (existing `EasingCurvePreview.tsx` — currently unwired)

### 4.4 `combat-effects` (renamed → just `Effects`)

**Column A** — 21-effect list:
- Each row: effect name + glyph + 1-line description + active-glow if currently held
- Sort by frequency / type (impact / sustained / one-shot)

**Column B** — selected effect's deep config:
- Color picker (specific to effect)
- Brightness, decay, duration sliders
- Spatial position UI (for blast / lockup / drag / melt / stab — existing `Bump<Int<pos>, Int<size>>` logic)
- Effect log preview ("last 3 triggers")
- DROPPED: the entire ignition/retraction MGP block (lives in §4.3 only)

### 4.5 `routing` (BETA)

**Column A** — list of ACTIVE BINDINGS (modulator → parameter rows):
- Each row: source-modulator color stripe + source name + → + target parameter + active-amount %
- Top of A: + Add Binding button (opens AddBindingForm in B) and ▾ Recipe Picker (11 starter recipes)
- Below: ModulatorPlateBar — moves IN to A's header, not its own section, since the plates' main job is "click to arm + click a parameter"

**Column B** — selected binding's deep config:
- Source dropdown / target dropdown / combinator dropdown / amount slider
- ExpressionEditor (math formula) — currently a popover, becomes inline B view
- Live viz of source signal × combinator → target output

### 4.6 `gallery` (top-level /gallery route)

**Column A** — 305-preset grid (already exists as `GalleryPage.tsx`):
- Filter rail (era / faction / continuity / color family / style family)
- Card grid
- Active row: current preset

**Column B** — selected preset's full detail card:
- Hero blade preview (live MiniSaber with the preset's exact config)
- Era / faction / continuity / canon-screen-accurate badges
- Description + creator attribution
- Load button (writes to bladeStore, switches back to /editor)
- Share glyph (Kyber Glyph copy)
- Variants (e.g., "Obi-Wan ANH / ESB / ROTS")

### 4.7 `my-saber` (NEW — replaces buried OutputPanel slot)

**Column A** — list of saved Saber Profiles:
- Each row: mini live blade preview (bottom of card) + profile name + chassis type + LED count
- Top of A: + New Profile button
- Active row: `activeProfileId`

**Column B** — selected profile's character-sheet hero (existing `SaberProfileManager.tsx`):
- ProfileHero (large blade + name + chassis + board + card size + preset count)
- BladeSpecsBlock (LED count, strip, ignition+retraction, shimmer, board)
- ButtonMapBlock (prop file reference)
- EquippedStyleBlock (style + 4 channel swatches)
- EquippedFontBlock (font name)
- HiltSelector (NEW wiring — currently disconnected)
- Card config CRUD

### 4.8 `audio`

**Column A** — sound font library list:
- Each row: font name + preview button + bundle indicator
- Filter: bundled / user-uploaded / favorites

**Column B** — selected font's editor:
- Font preview controls (per-event triggers: hum / swing / clash / blast / lockup / drag / melt / in / out / force / stab)
- Mixer (EQ + 8 effects, master volume, polarity)
- Pairing score / "Recommended for this blade" badge

### 4.9 `output`

Output is multi-step; A/B doesn't perfectly fit. Recommendation: keep the ReorderableSections pattern WITHIN Column B, but use Column A as a **pipeline progress indicator**:

**Column A** — vertical stepper:
1. Generate Code
2. Configuration Summary
3. Preview OLED
4. Export to SD Card
5. Flash to Board

Active step = section open in Column B. Each step's state (✓ / ⚠ / not run) shows as a status glyph next to it.

---

## 5. Mobile fallback

Current mobile (`<1024px`) uses `AppShell` + `MobileTabBar` not `WorkbenchLayout`, so the A/B redesign DOES NOT apply directly. But mobile DesignPanel mirrors the same 4-tab structure (`design / audio / output / gallery`).

### Mobile A/B strategy
Below 1024px:
1. Sidebar collapses to a top tab bar (already does — `MobileTabBar`).
2. Column A becomes a **horizontal chip strip** above Column B (similar to App Store category chips).
3. Column B fills the entire content area below the chip strip.
4. Tapping a chip in A swaps B; no resizable seam (mobile is content-tall not resizable).

Below 768px (small phone):
1. Column A becomes a sheet-style drawer triggered by a "List" button at the top of B.
2. Tapping a drawer item closes the sheet and updates B.

### Tablet (1024–1440px)
1. Column A remains as a column but at min width 220px (instead of 280–320 on desktop).
2. Column B shrinks proportionally; long forms gain a horizontal scroll guard.

---

## 6. Implementation plan

### Phase 1 — Foundation (1 PR, ~3–4 hours)
1. Add `<MainContentABLayout>` shared wrapper component at `apps/web/components/layout/MainContentABLayout.tsx`. Takes `columnA?: ReactNode` + `columnB: ReactNode` props; renders 280px / fill split or single-column fallback.
2. Add `uiStore.columnAWidth` field + setter + `REGION_LIMITS` entry (min 220, max 400, default 280) — mirror existing `inspectorWidth` pattern.
3. Add `<ResizeHandle>` between A and B inside the wrapper (mirror existing usage).
4. Smoke test by wrapping ONE section (`blade-style`) with a stub A list of 5 styles. Behind a feature flag (`uiStore.useABLayout: boolean`, default false).

### Phase 2 — Migrate first beneficiary section (1 PR, ~4–6 hours)
5. Implement `blade-style` Column A as a focused list with thumbnails + filter.
6. Strip duplicate mounts from StylePanel: drop the 4 ColorPickerRows, drop ParameterBank double-mount, drop GradientBuilder/GradientMixer/standalone Randomizer.
7. Move the still-relevant content to Column B.
8. New tests: A/B layout state, A/B keyboard navigation (↑↓ in A), filter behavior, persistence of column A width.
9. Flag default = true. Validate locally + browser-walkthrough.

### Phase 3 — Migrate remaining beneficiary sections (3 PRs in parallel, ~2–3 hours each)
10. **PR 3a** — `color` + `ignition-retraction` (similar shape, MGP-driven A list)
11. **PR 3b** — `combat-effects` + `routing` BETA
12. **PR 3c** — `audio` + new `my-saber` (this PR also moves SaberProfileManager out of OutputPanel)

### Phase 4 — Sidebar reorder + Settings cleanup (1 PR, ~2 hours)
13. Reorder GROUPS array per audit §6 (Setup → Design → Reactivity → Output).
14. Add new `my-saber` section ID + `setup` group.
15. Delete duplicate Settings tabs (UI Sounds placeholder, Keyboard Shortcuts duplicate, Performance Tier — moved to AppPerfStrip only).
16. Migration function for persisted `activeSection` (rename `layer-compositor` → `layers` if renaming, etc.).

### Phase 5 — Cleanup (1 PR, ~1–2 hours)
17. Delete dead code: `BladeCanvas3DWrapper.tsx`, `canvasMode` field + setter, unused MGPs in StylePanel.
18. Remove the feature flag — A/B is the only path.
19. Update CLAUDE.md "Current State" to reference the new layout.

### What's a feature flag vs. direct rewrite
- Flag for Phase 1–2 (touches the most heavily-used section)
- Direct rewrite for Phase 3+ (less risk; the foundation is proven by then)
- No flag for Phase 4–5 (cleanup only)

### Test gates
- Every PR: `pnpm typecheck && pnpm test` — must be clean
- Phase 1: +5 tests for MainContentABLayout (renders with/without A, persists width, clamps width, keyboard nav stub, mobile fallback path)
- Phase 2: +10 tests on the new blade-style A list (filter, active highlight, switches B contents, keyboard ↑↓)
- Phase 3: +6 tests per migrated section
- Phase 4: 1 migration test (sidebar reorder doesn't break activeSection persistence)

### Total estimate
- Phase 1: 3–4h
- Phase 2: 4–6h
- Phase 3 (3 parallel PRs): max ~6h wall-clock with parallelism, ~9h total agent-hours
- Phase 4: 2h
- Phase 5: 1–2h

Wall-clock with parallel agents: **~16–20 hours** spread across 5 PR drops. Achievable in 2 overnight runs of the proven parallel-Agent dispatch pattern.

---

## 7. Risks

### Pre-launch risk profile
KyberStation is pre-launch with zero real users (per memory note `prelaunch_aggressive_changes`). Persisted `activeSection` migration risk is theoretical. We can be aggressive.

### Technical risks
1. **Inspector + Column B parameter-bank duplication.** Today both Inspector AND StylePanel render `<ParameterBank/>`. If A/B keeps Inspector, we need ONE source of truth — either Inspector loses its bank (Inspector becomes pure Surprise Me + QuickColor + QuickIgnition + QuickRetraction), OR the deep `blade-style` section's B doesn't mount it again. **Recommend: Inspector loses ParameterBank in A/B world.** The deep section B is the new home; Inspector becomes 4 fast-access affordances and that's it.
2. **Below-1024px regression.** AppShell mobile shell IS NOT WorkbenchLayout. A/B redesign doesn't ship to mobile in the same PR — there's a real risk that mobile DesignPanel diverges from desktop section taxonomy. Mitigation: §5 mobile spec is implemented in Phase 3c (alongside `my-saber` extraction).
3. **Column A list virtualization.** Gallery is 305 presets. A naive list with full live-engine thumbnail rendering will tax the engine. Mitigation: A list uses STATIC SVG thumbnails (existing `lib/styleThumbnails.tsx` / `lib/ignitionThumbnails.tsx` / `lib/retractionThumbnails.tsx` infrastructure) — live blade rendering only happens in B for the selected item. Same pattern as MiniGalleryPicker today.
4. **Engine state during section switch.** If user switches B while a sustained effect (lockup) is held, do we release? Today: no, effects are global state in `activeEffectsStore`. Recommend: explicit "release on section change" only for transitory state, never for engine state.
5. **Resize handle stack.** We already have 4 resize handles (analysis rail / inspector / section 2 / pixel strip / expanded slot). Adding column-A handle = 5+ user-resizable seams. Discoverability risk. Mitigation: column A handle uses the same 0-width-wrapper-with-absolute-hit-target ResizeHandle primitive (existing `apps/web/components/shared/ResizeHandle.tsx`).
6. **Section that has its own internal layout (LayerStack).** LayerStack already has list-of-layers + selected-layer-config. It's basically already A/B internally. When we migrate, we should USE the new wrapper rather than reimplement — risk is divergence between LayerStack's existing pattern and the new shared wrapper. Mitigation: A/B wrapper is generic enough that LayerStack passes its existing layer list as `columnA`.
7. **"List of effects" framing breaks parameter relationships.** EffectPanel today bundles, e.g., clash + blast under "impact-shape" effects. A flat 21-row list loses that grouping. Mitigation: A list supports expandable group headers ("IMPACTS / SUSTAINED / SPATIAL / EXOTIC") with rows underneath. Same primitive as Sidebar's collapsible groups.
8. **The Inspector's `Surprise Me` button is the entry-point for new users.** If we strip Inspector down to just QuickColor / QuickIgnition / QuickRetraction (deleting the ParameterBank), `Surprise Me` MUST stay. And if Inspector's role narrows further, eventually we may even merge it INTO the new Column A as a sticky-top "Quick Actions" band. Defer to Phase 4 evaluation.

### UX risks
9. **Eye-flow distance**: Sidebar (left edge) → Column A (~280–600px from left) → Column B (~600–1880px from left). On a 1440px monitor, B starts at 560px from left edge (after Sidebar 280 + Column A 280 minimum). User's edit target is far from the blade preview at top. Mitigation: blade preview height is user-resizable; if A/B feels distant, drag section 2 up.
10. **List-vs.-grid muscle memory.** Today's MGP is a 3-column grid; A/B swaps to a 1-column list. Power users may resent the loss of 3-column scanning. Mitigation: A list supports an icon-only mode (small thumbnails only, multi-column) as a per-section toggle in localStorage. Default = list.
11. **Sidebar entries that don't need A/B feel inconsistent.** `motion-simulation` / `hardware` / `my-crystal` go full-width; `blade-style` / `color` / `effects` get split. Visual inconsistency = bad UX. Mitigation: rule: full-width is the FALLBACK; A column ALWAYS shows when the section provides one, and the empty Column A area is allowed (e.g., motion sim shows "no list — see motion sliders →").

---

End of design spec.
