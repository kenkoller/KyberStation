# Mobile Audit — Phase 1

**Branch:** `docs/mobile-audit-phase-1`
**Worktree HEAD:** `9e3d747`
**Date:** 2026-04-29
**Scope:** Read-only audit of the shipped mobile experience across `/m`, `/editor`, `/gallery`, `/docs` and the components mounted within them. **No code changes.** This document is the basis for Phase 2 (design proposal).

---

## Summary

KyberStation is a desktop-first lightsaber-style designer for ProffieOS Neopixel sabers. The "DAW for sabers" framing dictates a workbench-density UI built around a real-time blade canvas, rich parameter banks, layer compositors, and a modulation routing graph. Mobile support exists today as a heroic compatibility layer — `MobileShell.tsx` (PR #169, 2026-04-30) replaced the legacy 4-tab swipe layout with a hamburger-drawer + Inspector pattern that puts the live blade canvas above a Quick Controls surface. **App-level routing across `/m` / `/editor` / `/gallery` / `/docs` happens via `MobileTabBar`; the editor itself navigates 13 internal `SectionId`s through the slide-out drawer.** The plumbing is mostly correct (Zustand stores, IndexedDB persistence, Pointer-events scrubbers all behave identically across breakpoints), but the visual layer leaks desktop-only assumptions in three high-impact ways: (1) fixed pixel widths in panel components, (2) `MainContentABLayout` mounts a 280px Column A side-by-side with Column B at every breakpoint with no mobile fallback, and (3) the deep panels (StylePanel, EffectPanel, RoutingPanel, LayerStack, OutputPanel) were authored assuming ≥1024px column space and have not been touched for phone. The result: anything reachable from the drawer past `my-saber` will compress badly or overflow at 380–414px.

---

## Breakpoints

Per `tailwind.config.ts:65` and `apps/web/hooks/useBreakpoint.ts`:

| Variant     | Range            | Used by                                                |
|-------------|------------------|--------------------------------------------------------|
| `phone`     | `max: 599px`     | `MobileTabBar` (only via `phone:flex hidden`)         |
| `tablet`    | `600 – 1023px`   | `TabletShell` in `AppShell.tsx`                        |
| `desktop`   | `min: 1024px`    | `WorkbenchLayout` (default)                            |
| `wide`      | `min: 1440px`    | Inspector grows `w-[320px] xl:w-[400px]`              |

`useBreakpoint()` returns `isMobile` (`< 600px`) which routes `AppShell` → `MobileShell`. `isTablet` (600–1023) routes to `TabletShell`. Otherwise → `WorkbenchLayout`.

**The 600px boundary means Phase 1's audit at 380/414/640/768 spans all three shells:** 380/414 → MobileShell, 640/768 → TabletShell.

---

## App-level mobile routes (the four bottom tabs)

`MobileTabBar.tsx` is the global phone bottom-bar (`fixed inset-x-0 bottom-0` with `phone:flex hidden`). It is route nav, not editor-internal nav.

| Tab     | Route                       | Behavior at 380px                                                                                              | State        |
|---------|----------------------------|---------------------------------------------------------------------------------------------------------------|--------------|
| Saber   | `/m`                       | Chrome-free preset browser + Ignite + swipe nav. Was the original mobile-companion route (v0.9.0). MobileTabBar is suppressed here. | ✅ ready     |
| Editor  | `/editor` (no `?tab=`)     | Mounts `MobileShell` via `AppShell`. Internal nav via hamburger drawer + 13 sections.                          | 🟡 partial   |
| Gallery | `/editor?tab=gallery`      | **Stale link**: this is a legacy redirect to the old in-editor Gallery tab. Post-overhaul (PR #47–#53), Gallery lives at `/gallery` (`apps/web/components/gallery/GalleryPage.tsx`). Tapping this on phone goes to `/editor` with a query param the modern shell ignores. | 🔴 broken    |
| Docs    | `/docs`                    | Built-in ProffieOS reference page. Static markdown-style content; behaves OK at phone width but no `phone:` overrides.         | 🟡 partial   |

**Surprise #1 in the audit:** the Gallery bottom tab points to `?tab=gallery`, which was relevant pre-overhaul when the editor had an internal Gallery tab. The current sidebar's `gallery` group simply links out to `/gallery` (top-level route). The phone bottom bar wasn't updated when the sidebar overhaul changed gallery's home, so the link is misleading.

---

## Inside `/editor` mobile (`MobileShell`)

`MobileShell.tsx` ships the post-2026-04-30 architecture:

```
┌──────────────────────────────────────────────┐ pt-[safe-area-inset-top]
│ Header (h-14)                                │
│  ☰  KYBERSTATION    [ON][⚙][⛶][⏸][Ignite]   │
├──────────────────────────────────────────────┤
│ Effect/action bar (overflow-x-auto)          │
│  IGNITE · CLASH · BLAST · LOCKUP · STAB      │
├──────────────────────────────────────────────┤
│ Blade canvas (28vh, min 180px)               │
│  ── full-width horizontal blade ──           │
├──────────────────────────────────────────────┤
│ Body — switches on activeSection:            │
│   isHome (`my-saber`)  → <Inspector>         │
│   else                 → <MainContent>       │
│                                              │
│  Drawer trigger: hamburger ☰                 │
│  Drawer: 280px slide-in <Sidebar/>           │
├──────────────────────────────────────────────┤
│ Bottom anchor:                               │
│   isHome  → <StatusBar/>                     │
│   else    → "← Back to Canvas" pill          │
├──────────────────────────────────────────────┤ pb-[safe-area-inset-bottom]
│ <MobileTabBar/> (from app layout, 56px)      │
└──────────────────────────────────────────────┘
```

**Note:** `MobileShell` neutralizes the global `body { padding-bottom }` reservation that `MobileTabBar` claims, then re-adds bottom safe-area padding. This means the editor screen at 380px has both the in-editor "Back to Canvas" pill (44px) AND the global `MobileTabBar` (56px) when off-home, eating ~100px of vertical real estate.

---

## Per-page reality check at 380 / 414 / 640 / 768 px

For each width, behavior is reasoned from source rather than rendered live (worktree deps not installed; this is Phase 1, read-only).

### `/m` — Saber companion (`apps/web/app/m/page.tsx`)

| Width  | Behavior                                                                                  |
|--------|-------------------------------------------------------------------------------------------|
| 380    | Designed for this. Vertical preset list + ignite. Works.                                  |
| 414    | Same as 380; ample room.                                                                  |
| 640    | Tablet shell takes over (`MobileTabBar` auto-hides on `/m`); `/m` itself still renders single-column. Wasted horizontal space but functional. |
| 768    | Same as 640.                                                                              |

**Verdict:** ✅ ready. This route was built mobile-first.

### `/editor` (home, `activeSection === 'my-saber'`)

| Width  | Behavior                                                                                                                                                          |
|--------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 380    | MobileShell home view: header + effect bar (scrolls horizontally) + blade canvas (28vh ≈ 220px) + Inspector + StatusBar + global MobileTabBar. **Inspector body uses `width: 100%`** override so the 320px hardcode in `Inspector.tsx:44` is bypassed. ParameterBank sliders use Pointer events → touch works. **Effect bar `overflow-x-auto` succeeds but no scroll affordance** (no fade gradient, no chevrons). |
| 414    | Identical to 380; 34px more breathing room helps the IGNITE button cluster in the header.                                                                         |
| 640    | TabletShell (not MobileShell). Different layout entirely: horizontal blade + visualization toolbar + visualization stack + effect bar + Sidebar (240px) + MainContent. **Crosses the boundary into TabletShell at exactly 600px** — large visible jump in layout. |
| 768    | TabletShell again; sidebar at 240px is roomy for tablets but the header crams 5 buttons + audio toggle + ignite into the right cluster.                          |

**Verdict:** 🟡 partial. Home view is the most-tuned mobile surface. Drilled-into-section views are the broken case (next).

### `/editor` drilled into a deep section (e.g. `blade-style`, `routing`, `output`)

Most non-home sections route through `MainContent`, which then mounts `MainContentABLayout` for any section in the A/B set (`blade-style`, `color`, `ignition-retraction`, `combat-effects`, `my-saber`, `audio`, `routing`, `output`).

`MainContentABLayout.tsx:80` renders unconditionally:
```jsx
<div className="flex flex-1 min-w-0 h-full">
  <aside style={{ width: columnAWidth }}>{columnA}</aside>  {/* default 280px */}
  <ResizeHandle .../>
  <section className="flex-1 min-w-0">{columnB}</section>
</div>
```

| Width | Behavior in A/B section                                                                                                                                                                                                                                                              |
|-------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 380   | Column A locked at 280px, Column B gets ~95px (minus resize handle). **Column B is unusable.** The doc comment at `MainContentABLayout.tsx:14` says "Below 1024px breakpoint, mobile fallback (Phase 3c) — for now Phase 1 simply renders both stacked, A on top." **The code does NOT do this** — there is no breakpoint check. |
| 414   | Column B gets ~129px. Still unusable.                                                                                                                                                                                                                                                |
| 640   | TabletShell takes over but the same A/B layout mounts inside MainContent. 280 + 360 split — Column B usable but cramped.                                                                                                                                                              |
| 768   | 280 + 488 split. Workable for simple Column B contents (color picker, blade-style detail) but tight for OutputPanel's 5-step pipeline.                                                                                                                                                |

**Surprise #2 in the audit:** The `MainContentABLayout` source comment claims a phone fallback is implemented; reading the JSX shows no breakpoint gate exists. This is a **critical bug** for the 7 A/B sections at phone width.

### `/editor` drilled into a non-A/B section (`hardware`, `layer-compositor`, `motion-simulation`, `gesture-controls`, `my-crystal`)

These render via `renderLegacySection` in `MainContent.tsx:74`. They get full-width `flex-1 min-w-0` with a section header and scrollable body.

| Width | Behavior                                                                                                                                                  |
|-------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| 380   | Body fills available width. Internal panels still use desktop layouts: `LayerStack` rows, `HardwarePanel` form fields, `CrystalPanel` Three.js canvas. CrystalPanel will render but the share-card export buttons + dropdowns are very tight. |
| 414   | Same shape.                                                                                                                                              |
| 640+  | TabletShell layout takes over.                                                                                                                            |

**Verdict:** 🟡 partial. Renders without overflow but density is wrong.

### `/gallery` (top-level route, `GalleryPage.tsx`)

`grep -n "phone:\|tablet:" gallery/GalleryPage.tsx` returned **zero matches**. The gallery uses a flex-wrap card grid with `gap-3` and 200px-wide MiniSaber portrait cards (per W13a–f polish notes in CLAUDE.md). At 380px viewport this would render **one card per row** with the filter rail above. Functional but stripped of the curated 3-up density.

**Verdict:** 🟡 partial — works but loses its visual identity at phone width.

### `/docs`

Static reference content. Should reflow naturally. No `phone:`/`tablet:` overrides found. Probably ✅ ready in practice but not visually reviewed.

**Verdict:** 🟡 partial (untested).

---

## Component inventory — mobile readiness

| Component                                | Path                                                          | Phone variants                                          | Hardcoded sizes                                  | Status |
|------------------------------------------|---------------------------------------------------------------|---------------------------------------------------------|--------------------------------------------------|--------|
| `MobileShell`                            | `components/layout/MobileShell.tsx`                          | Built for phone                                         | `h-14` header, `28vh / min 180` canvas, `min-h-[44px]` buttons | ✅ ready |
| `MobileSidebarDrawer`                    | `components/layout/MobileSidebarDrawer.tsx`                  | Built for phone                                         | `DRAWER_WIDTH_PX = 280`                          | ✅ ready |
| `MobileTabBar`                           | `components/layout/MobileTabBar.tsx`                         | `phone:flex hidden`                                     | `min-h-[56px]` per tab                           | 🟡 partial (Gallery link stale, see Surprise #1) |
| `Sidebar`                                | `components/layout/Sidebar.tsx`                              | None — used as-is in drawer at `width: '100%'`          | None visible at top scope                         | ✅ ready (works because drawer wraps it) |
| `MainContent`                            | `components/layout/MainContent.tsx`                          | None                                                    | None — pure router                               | ✅ ready |
| `MainContentABLayout`                    | `components/layout/MainContentABLayout.tsx`                  | **None — no breakpoint gate despite source comment**     | `columnAWidth` 280 default, 220–400 range        | 🔴 broken |
| `WorkbenchLayout`                        | `components/layout/WorkbenchLayout.tsx`                      | Desktop-only via `useBreakpoint` gate                   | Many — desktop assumption                        | ✅ N/A (desktop) |
| `Inspector` (Quick Controls)             | `components/editor/Inspector.tsx`                            | `style.width` override path used by MobileShell        | `w-[320px] xl:w-[400px]` (overridden)            | ✅ ready (MobileShell passes `width: '100%'`) |
| `BladeCanvas`                            | `components/editor/BladeCanvas.tsx`                          | `hidden tablet:block desktop:hidden` for one config bar | None blocking; 3251 LOC, complex resize observer | 🟡 partial — large surface, render reasoned OK |
| `EffectPanel`                            | `components/editor/EffectPanel.tsx`                          | None                                                    | `grid grid-cols-2` repeated 4× (lines 276/425/450/510) | 🔴 broken at phone (24-slider UI assumes ≥640px) |
| `EffectTriggerBar`                       | `components/editor/EffectTriggerBar.tsx`                     | Mounted in MobileShell with `overflow-x-auto`           | (not deeply audited)                             | 🟡 partial — no scroll affordance |
| `StylePanel`                             | `components/editor/StylePanel.tsx`                           | None — desktop layout                                   | (not deeply audited but A/B section uses MainContentABLayout, see broken note) | 🔴 broken via A/B layout |
| `ColorPanel`                             | `components/editor/ColorPanel.tsx`                           | None                                                    | (likewise A/B routed)                            | 🔴 broken via A/B layout |
| `IgnitionRetractionPanel`                | `components/editor/IgnitionRetractionPanel.tsx`              | None                                                    | (A/B routed)                                     | 🔴 broken via A/B layout |
| `LayerStack` (+ subcomponents)          | `components/editor/layerstack/`                              | None                                                    | Row layout assumes wide rows (`--row-h` 22/26/32) | 🔴 broken — designed for ≥1024px |
| `RoutingPanel` (`routing/`)              | `components/editor/routing/`                                 | `lg:grid-cols-4 xl:grid-cols-6` for plate bar           | 11-plate bar wraps but at phone widths becomes ~2 wide | 🔴 broken via A/B layout |
| `OutputPanel` / `OutputAB`               | `components/editor/output/`                                  | None                                                    | 5-step pipeline; vertical stepper Column A           | 🔴 broken via A/B layout |
| `FlashPanel`                             | `components/editor/FlashPanel.tsx`                           | None                                                    | EXPERIMENTAL disclaimer + 3-checkbox gate         | 🟡 partial (functional, dense) |
| `CrystalPanel`                           | `components/editor/CrystalPanel.tsx`                         | None                                                    | Three.js canvas, layout/theme dropdowns           | 🟡 partial |
| `PresetGallery`                          | `components/editor/PresetGallery.tsx`                        | `grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4`    | Has phone-friendly grid                          | ✅ ready |
| `GalleryGridView` / `GalleryPage`        | `components/gallery/GalleryPage.tsx`                         | None — relies on `flex flex-wrap gap-3`                  | 200px cards × 416px tall                          | 🟡 partial (collapses to 1-up on phone) |
| `OLEDPreview`                            | `components/editor/OLEDPreview.tsx`                          | (not audited deeply)                                    | Hardware-accurate B/W                            | 🟡 partial |
| `SaberProfileManager`                    | `components/editor/SaberProfileManager.tsx`                  | (not audited deeply)                                    | Likely desktop-form                              | 🟡 partial |
| `HardwarePanel`                          | `components/editor/HardwarePanel.tsx`                        | None                                                    | Form fields                                      | 🟡 partial — needs UX call on battery section |
| `StatusBar`                              | `components/layout/StatusBar.tsx`                            | None                                                    | 11-segment PFD strip designed wide                | 🔴 broken at phone (segments compress, info loss) |
| `DeliveryRail`                           | `components/layout/DeliveryRail.tsx`                         | `compact` breakpoint per OV4 history                    | Desktop-driven                                   | 🟡 partial |
| `AnalysisRail`                           | `components/layout/AnalysisRail.tsx`                         | Has icon-mode at narrow widths                          | 200px default                                    | 🟡 partial — not mounted in MobileShell |
| `RightRail`                              | `components/layout/RightRail.tsx`                            | None                                                    | -                                                | ✅ N/A (desktop) |
| `EffectChip` / `EffectsPinDropdown`     | `components/editor/{EffectChip,EffectsPinDropdown}.tsx`      | None                                                    | Designed for action bar                          | 🟡 partial |
| `SoundFontPanel`                         | `components/editor/SoundFontPanel.tsx`                       | `grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3`   | Has phone fallback                               | ✅ ready |
| `Randomizer`                             | `components/editor/Randomizer.tsx`                           | Some `phone:`/`tablet:` per grep                        | -                                                | 🟡 partial |
| `GestureControlPanel`                    | `components/editor/GestureControlPanel.tsx`                  | Some `phone:`/`tablet:` per grep                        | -                                                | 🟡 partial |
| `OutputPanel` (legacy single-panel)      | `components/editor/OutputPanel.tsx`                          | None                                                    | -                                                | 🔴 broken (only consumed via OutputAB) |

**Tier counts:**
- ✅ ready: **8**
- 🟡 partial: **15**
- 🔴 broken: **8**

---

## Tailwind / CSS audit

### Are breakpoints used consistently?
**No.** Out of ~30 editor components surveyed, only 5 use `phone:`/`tablet:` Tailwind variants meaningfully (`MobileTabBar`, `PresetGallery`, `SoundFontPanel`, `BladeCanvas` (one place), `Randomizer`, `GestureControlPanel`). The vast majority of editor panels assume desktop column space.

### Hardcoded pixel widths
- `Inspector.tsx:44` — `w-[320px] xl:w-[400px]` (override-respecting via `style.width`, used correctly in MobileShell)
- `MobileSidebarDrawer.tsx:36` — `DRAWER_WIDTH_PX = 280`
- `MainContentABLayout.tsx` — `columnAWidth` default 280 (range 220–400). **No phone gate.**
- `WorkbenchLayout` — many fixed-width region limits (sidebar, analysisRail, inspector, etc). All scoped to `desktop:` breakpoint, so not a phone risk.

### Container queries
**Not used.** No `@container` Tailwind plugin enabled; no `cqw`/`cqi` units in CSS.

### Min-width declarations that block compression
- `MainContentABLayout` Column B uses `flex-1 min-w-0` (correct — collapses).
- `min-w-fit` on the effect bar wrapper in `MobileShell.tsx:203` (correct — gives the action bar its natural width with horizontal scroll).
- No problematic `min-w-[Npx]` declarations spotted in the editor panels.

---

## Plumbing check

### State persistence
- **Zustand** stores (`bladeStore`, `uiStore`, `userPresetStore`, `saberProfileStore`, `audioFontStore`, `accessibilityStore`, `layoutStore`, `visualizationStore`, `historyStore`) all use `persist` middleware where appropriate. Persistence is breakpoint-agnostic.
- **IndexedDB** via `fontDB.ts` (Dexie v3) for sound fonts; `userPresetStore` for saved presets; `saberProfileStore` for saber profiles. Same on phone, tablet, desktop. ✅
- **localStorage** for layout regions (`kyberstation-ui-layout`) — desktop-only since MobileShell doesn't expose region resize. No collision.

### Touch event handlers
- `useDragToScrub.ts` uses `onPointerDown` / `onPointerMove` / `onPointerUp` — Pointer Events API works for touch + mouse + stylus. ✅
- `FullscreenPreview.tsx:186` has `onTouchStart={resetHideTimer}` for chrome hide-on-tap. ✅
- All button click handlers use `onClick` which fires on both mouse and touch.
- Drag-to-route in routing module: `dragstart` / `dragover` / `drop` HTML5 DnD events — **broken on touch** (HTML5 DnD requires mouse on most mobile browsers; iOS Safari does not fire `dragstart` from touch). Mobile users can use click-to-route as a11y fallback per CLAUDE.md history.

### Canvas resize handlers
- `BladeCanvas.tsx` uses `ResizeObserver` to autofit. Works identically across breakpoints.
- The 28vh canvas height in MobileShell (`min: 180px`) means at very short viewports (e.g. landscape phone 390×320) the canvas may be 90px which is too short for the bloom + tip rendering. **Edge case**, not a default-case bug.

### Mobile-specific bugs unrelated to layout
- Body padding-bottom toggle in `MobileShell.tsx:97-103`: takes the global `MobileTabBar` 56px reservation and zeros it out on the editor screen, which is correct since the editor renders its own bottom anchor. But this means **the global `MobileTabBar` is actually drawn on top of the StatusBar/Back-pill** because it's `position: fixed`. Visually they stack but vertically the editor only allocates one bottom anchor's worth of safe-area, so there is overlap. Need visual confirm.
- The "← Back to Canvas" pill (`min-h-[44px]`, `MobileShell.tsx:251-262`) shares the same screen real estate as the global `MobileTabBar` (56px). Both are bottom-pinned. **Real overlap unless `MobileTabBar` is hidden inside `/editor` mobile**, which doesn't appear to happen — it only hides on `/m`.

**Surprise #3 in the audit:** the bottom of `/editor` on phone has the in-editor "Back to Canvas" pill (44px) AND the global `MobileTabBar` (56px) and StatusBar (variable) all competing for safe-area pinned space. Between the safe-area-inset-bottom + body-padding zeroing logic in MobileShell, this almost certainly produces visual overlap or layout double-pad.

---

## Hard problems list (per Section 3 of the original prompt)

1. **BladeCanvas hero on vertical screen.** Current behavior: 28vh / min 180px / max 220px above the body. **Severity: medium.** Works at 380px wide × 800–900px tall (typical iPhone 12+). Cramps at 390×320 landscape. Needs a landscape-aware layout to drop the canvas to a thinner ribbon and lift the body above.
2. **LayerStack on mobile.** **Mounted via `MainContent` legacy path** (not A/B) in section `layer-compositor`. The 6-component subfolder (`LayerRow`, `ModulatorRow`, etc.) was authored for ≥1024px column space. Rows assume `--row-h` density tokens (22/26/32px) and inline scrub fields that don't reflow at narrow widths. **Severity: high.** Effectively unusable on phone, but it's also a power-user surface so deferring is reasonable.
3. **EffectPanel parameter density.** 24-slider grid (`grid-cols-2` repeated four times). At 380px viewport, two columns of sliders ≈ 170px each — slider numerics and label collide. The UI was never designed for narrow widths. **Severity: high.**
4. **Modulation plates on touch.** `RoutingPanel`'s plate bar uses `lg:grid-cols-4 xl:grid-cols-6` so on phone the 11 plates form ~2 columns × 6 rows. Each plate has live CSS-keyframe viz (~70×70px target). Click-to-route works for touch (it's just `onClick`); HTML5 drag-to-route is **broken on iOS** due to the touch-DnD limitation. **Severity: medium** for users who need the routing surface; click-to-route is a workable fallback that just isn't documented as the mobile path.
5. **PerformanceBar with macro knobs.** **Removed in v0.14.0 PR #53** (`PerformanceBar.tsx` deleted). Not relevant to this audit. **Severity: none.** (Note: original prompt mentioned it; CLAUDE.md confirms deletion.)
6. **Bottom tab bar + safe area + "Back to Canvas" pill stacking.** See Surprise #3 above. **Severity: high** (visual + a11y bug, not just compression).
7. **Single-screen-no-scroll discipline.** Impossible at 380×800 for any deep section. The MobileShell does the right thing by anchoring the canvas + Inspector and putting deep tuning behind the drawer + Back-to-Canvas flow, but each deep section's body still scrolls. The home view is the closest approximation: header (56) + effect bar (~40) + canvas (220) + Inspector (~480) + StatusBar (~40) + safe-area = ~840px. **Severity: low** — this is by design.
8. **Touch ergonomics — one-handed reach, safe areas, gestures.**
   - All MobileShell interactive primitives are 44×44 minimum. ✅
   - `pt-[env(safe-area-inset-top)]` + `pb-[env(safe-area-inset-bottom)]` at the right boundaries. ✅
   - **No swipe gestures** for back navigation in the drilled-section flow. Users tap the "← Back to Canvas" pill only. **Severity: medium** — adds friction vs native iOS swipe-from-edge.
   - Hamburger is top-left (thumb-unreachable on the right hand). Standard pattern but worth flagging in the design proposal.
   - Ignite button is top-right of header; reachable but the entire header cluster (5 right buttons) is dense for thumb tapping.
   - **Severity overall: low-medium.**

---

## Top three surprises (for the PR summary)

1. **Gallery bottom-tab link is stale**: routes to `/editor?tab=gallery` from the pre-overhaul era; the modern Gallery lives at `/gallery`. (`MobileTabBar.tsx:39`)
2. **`MainContentABLayout` has no phone fallback despite a source comment claiming one**: 7 A/B sections render Column A 280px + Column B ~95px on a 380px viewport. (`MainContentABLayout.tsx:14, 80`)
3. **The "Back to Canvas" pill overlaps with the global `MobileTabBar`**: both are bottom-pinned in editor mobile views; safe-area + body-padding logic does not reliably separate them. (`MobileShell.tsx:97–267`)

---

## Recommendations to feed into Phase 2 design

(Not part of this Phase 1 audit deliverable, but the user asked for them downstream — flagged here for the spawning session.)

- **Critical (broken at phone, blocks launch):** add a phone-breakpoint stack fallback in `MainContentABLayout`. Either CSS-only via `phone:flex-col phone:[&>aside]:w-full` or a `useBreakpoint`-driven layout swap.
- **Critical:** fix `MobileTabBar` Gallery link to `/gallery` (top-level route).
- **Critical:** resolve "Back to Canvas" + global `MobileTabBar` overlap in editor mobile shell.
- **High:** EffectPanel + LayerStack + RoutingPanel deep editors need a phone-breakpoint pass — likely a vertical-stack reflow with `phone:grid-cols-1` on the slider grids and a touch-friendly modulator plate sheet for routing.
- **Medium:** add scroll affordance (fade gradient) to the `EffectTriggerBar` horizontal-scroll container in MobileShell.
- **Medium:** wire `useDragToScrub`-style touch-DnD shim for routing plates so drag-to-route works on iOS.
- **Low:** add swipe-from-edge back-navigation in MobileShell drilled sections.
