# Mobile Design — Phase 2

**Branch:** `docs/mobile-design-phase-2`
**Worktree HEAD:** `812cd73`
**Date:** 2026-04-29
**Inputs:** [`docs/mobile-audit.md`](./mobile-audit.md) (Phase 1) · [`docs/UX_NORTH_STAR.md`](./UX_NORTH_STAR.md) · `apps/web/components/layout/{MobileShell,MobileSidebarDrawer,MobileTabBar,AppShell}.tsx` · `apps/web/components/layout/MainContentABLayout.tsx` · `tailwind.config.ts`
**Status:** Read + design only. No code in this PR. Phase 3 (implementation plan) and Phase 4 (code) come later, after Ken's review.

---

## Summary

This proposal answers Phase 1's three critical findings with a small, opinionated set of layout rules that fit `MobileShell`'s existing skeleton (header / blade / body / bottom-anchor) rather than reshape it. The biggest moves: (1) `MainContentABLayout` collapses to a stacked **inline-list-then-detail** pattern below 768px (Column A becomes a horizontally-scrolling chip rail above Column B, not a stacked panel); (2) the in-editor "← Back to Canvas" pill replaces the global `MobileTabBar` while inside the editor, with a one-line app-shell change so phone editor users see exactly one bottom-pinned bar; (3) every deep editor (EffectPanel, LayerStack, RoutingPanel) gets a full-screen **bottom-sheet edit overlay** for parameter tuning — sheets, not in-place compression, are the primary mobile editing idiom. Modulation routing keeps the click-to-route fallback as the documented mobile path; native HTML5 drag-and-drop stays desktop-only.

The proposal proposes one new breakpoint (`phone-sm` for 380–480px reflow rules), keeps the existing `phone`/`tablet`/`desktop` macro-shell switching points, and **explicitly rejects** introducing a fourth typeface, card-wrapping panels, or any shadcn-default chrome for the new sheet primitive — every design decision is checked against UX North Star §3 anti-references in §11 below.

The three most consequential decisions:

1. **A/B sections collapse to inline-list-on-top, not stacked-Column-A-panel-on-top.** Column A becomes a horizontally-scrolling chip strip (the "list of styles / colors / ignitions") that lives ABOVE Column B at phone widths. The chip strip is ~48px tall, takes the full viewport width, scrolls horizontally with momentum, snaps to chips, and the active chip drives Column B below. This preserves the A/B mental model on mobile without burning 280px of vertical space on a stacked list.
2. **Inside `/editor`, the global `MobileTabBar` hides; a single in-editor bottom bar handles both the section pill and the "Back to Canvas" affordance.** The `/m`, `/gallery`, `/docs` routes still render the global `MobileTabBar`; the editor is the only route that swallows it. This is a one-flag change in `app/layout.tsx`.
3. **Deep parameter tuning happens in full-screen bottom sheets, not inline compressed panels.** `EffectPanel`'s 24-slider grid, `LayerStack`'s row config, `RoutingPanel`'s expression editor, and `ParameterBank`'s individual sliders all get a "tap → sheet" pattern on phone. This is the single biggest payoff: the desktop density stays untouched on desktop; the phone gets one-thing-at-a-time editing without trying to make a 24-slider grid fit at 380px.

---

## 1. Breakpoint strategy

### 1.1 Current state (from `tailwind.config.ts`)

| Variant     | Range            | Used for                                                |
|-------------|------------------|---------------------------------------------------------|
| `phone`     | `max: 599px`     | `MobileTabBar` visibility, MobileShell shell switch    |
| `tablet`    | `600 – 1023px`   | TabletShell switch                                      |
| `desktop`   | `min: 1024px`    | WorkbenchLayout default                                 |
| `wide`      | `min: 1440px`    | Inspector grows 320 → 400px                             |

The macro-shell-switch points (600 / 1024) are doing real work and should NOT change. The shells are different layouts, not the same layout at different widths — moving the boundaries would force a rewrite of TabletShell or WorkbenchLayout. **Keep the macro boundaries.**

### 1.2 Proposed addition: `phone-sm`

Inside MobileShell, the audit shows there's a real difference between 380px (iPhone SE) and 480px (iPhone Pro Max + Galaxy S23 Ultra) that the current design ignores. At 380px the action bar's 5 effect chips can't fit without horizontal-scroll; at 480px they fit. Same story for the chip strip in §2 below.

```ts
// tailwind.config.ts — addition
screens: {
  'phone-sm':  { max: '479px' },        // ← NEW: tightest phone reflow rules
  'phone':     { max: '599px' },        // unchanged
  'tablet':    { min: '600px', max: '1023px' },  // unchanged
  'desktop':   '1024px',                // unchanged
  'wide':      '1440px',                // unchanged
},
```

**Why one new variant, not three (`phone-portrait` / `phone-landscape` / `tablet-sm`):**

- The original prompt suggested `phone-portrait` (≤640px) + `phone-landscape` (640–768px) + `tablet` (768–1023px). The macro layout already differs above/below 600px (MobileShell vs TabletShell); a 640 boundary would split MobileShell mid-shell and force two MobileShells.
- Phone landscape at 640–768px is rare for design tools (users rotate to type, not to design); the audit calls it out as an edge case. Better to handle landscape inside MobileShell with a `@media (orientation: landscape) and (max-height: 480px)` rule that swaps the blade canvas from horizontal to vertical (see §3 BladeCanvas section).
- Tablet 768–1023 is one shell (TabletShell). No subdivision needed.

**One variant addition keeps the existing chrome's structure intact and only adds a "tighter" rule for the tightest phones.**

### 1.3 What changes at each breakpoint

| Width      | Shell             | What's different                                                |
|------------|-------------------|------------------------------------------------------------------|
| ≤ 479px    | MobileShell       | `phone-sm` rules: action bar = icon-only chips, chip strip = scroll-snap, sheets cover viewport edge-to-edge, single-column ParameterBank |
| 480–599px  | MobileShell       | Action bar = icon + 1-letter labels, chip strip still scrolls but more chips visible, ParameterBank can fit 2-up sliders |
| 600–767px  | TabletShell       | Existing tablet layout (Sidebar 240px + MainContent + visualization rail) |
| 768–1023px | TabletShell       | Same as above; this is where MainContentABLayout's split (~280 + 488) starts to feel comfortable |
| 1024–1439px| WorkbenchLayout   | Desktop default                                                 |
| ≥1440px    | WorkbenchLayout   | Inspector grows 320 → 400px                                     |

The new `phone-sm` only adds one inflection inside MobileShell. Everything else keeps its current contract.

---

## 2. Per-section layout decisions

The 13 sidebar sections fall into four shape families. Each family gets one design pattern; the per-section work is minor variation within the pattern.

### 2.1 Section shape families

| Family                          | Sections                                                                                | Mobile pattern                            |
|---------------------------------|------------------------------------------------------------------------------------------|-------------------------------------------|
| **A. List → Detail (A/B)**     | `blade-style`, `color`, `ignition-retraction`, `combat-effects`, `audio`, `output`, `routing` | Chip strip + Column B below + tap-for-sheet |
| **B. Profile / Catalog**       | `my-saber`                                                                              | Profile list scroll + character sheet body |
| **C. Single-panel form**       | `hardware`, `gesture-controls`, `motion-simulation`                                     | Vertical scroll, full-width form, group accordions |
| **D. Live preview hero**       | `my-crystal` (Crystal + Saber Card export), `layer-compositor` (LayerStack)            | Hero canvas top + inline list + sheet edits |

### 2.2 Pattern A: Chip-strip + Column B + tap-for-sheet (the A/B fix)

**The headline fix from the audit (Critical Issue #1).** Today `MainContentABLayout` mounts Column A 280px wide and Column B `flex-1` at all breakpoints — Column B gets 95px on a 380px viewport. The proposed fix:

```
PHONE LAYOUT (≤599px) — sections in family A (blade-style shown)
┌──────────────────────────────────────────────────┐
│ Header (44h)          ☰   KYBERSTATION   ON ⚙ ⛶ │
├──────────────────────────────────────────────────┤
│ Action bar (40h, scroll-x)                       │
│ IGNITE · CLASH · BLAST · LOCKUP · STAB · …       │
├──────────────────────────────────────────────────┤
│ Blade canvas (28vh, min 180px)                   │
│ ── full-width horizontal blade ──                │
├──────────────────────────────────────────────────┤
│ Chip strip (52h, scroll-x snap, gradient fade)   │
│  ←  [Stable]  [Pulse]  [Plasma]  [Aurora]  →    │
│         ↑ active                                  │
├──────────────────────────────────────────────────┤
│ Column B body (flex-1, vertical scroll)          │
│   ┌─ Style: Stable ────────────────────────┐     │
│   │ Description text wraps fine            │     │
│   │ ┌─ Parameters ──────────────────┐ Edit │     │
│   │ │ shimmer ──●───────  0.42      │ ↗    │     │
│   │ │ flicker ──────●────  0.61      │     │     │
│   │ └────────────────────────────────┘     │     │
│   │ [ Try this style ]                     │     │
│   └────────────────────────────────────────┘     │
├──────────────────────────────────────────────────┤
│ Bottom bar (44h, sticky):                        │
│  ← Back to Canvas    ◆ blade-style              │
├──────────────────────────────────────────────────┤
│ pb-[env(safe-area-inset-bottom)]                 │
└──────────────────────────────────────────────────┘
```

**Specifically:**

- **Chip strip:** horizontal-scrolling, scroll-snap-mandatory, scroll-snap-align: center on each chip. ~48–52px tall. Each chip 48–80px wide (varies — "Style: Stable" needs more than "Color: Red"). Active chip has the existing accent border + identity-color stripe; inactive chips are flat label + icon. Edge-fade gradients (~16px each side, `bg-gradient-to-l from-bg-primary`) signal more content. 60ms scroll snap delay so flick gestures land cleanly.
- **Tap a chip → that becomes the active item, Column B repaints.** Single-tap, no gesture confusion with vertical body scroll because the chip strip's scroll axis is orthogonal.
- **Column B body:** vertical scroll inside its container, fills `flex-1`. Inline parameter rows render directly on phone (no compression). The Column B "Edit" affordance opens a full-screen bottom sheet for dense tuning (see §4).
- **No resize handle.** The desktop `ResizeHandle` is irrelevant on phone — chip strip is auto-sized, Column B fills.

**Where the audit was wrong about a stacked-A-on-top:** The audit's Phase-1 recommendation said `phone:flex-col phone:[&>aside]:w-full`. That stacks a 280px-tall list above Column B and burns the entire above-fold to "list of things" — by the time the user picks a style, they've scrolled past the blade canvas and lost the live preview. **Chip strip is denser, keeps the blade visible, and matches platform conventions** (App Store category chips, music-app genre chips, Linear status chips, Vital preset banks).

### 2.3 Pattern B: Profile list + character sheet (`my-saber`)

`my-saber` is Pattern A with one twist: the "list" is small (typical user has 1–4 profiles), and the "detail" is a character sheet that wants vertical space to feel right (per UX North Star §4: "saber profile as a 'character sheet' — hero render at top, categorized attribute groups").

```
PHONE LAYOUT — my-saber
┌──────────────────────────────────────────────────┐
│ ... header / action / blade canvas (same as A)   │
├──────────────────────────────────────────────────┤
│ Profile cards (vertical, 88h each, max 3 visible)│
│ ┌─[active]─────────────────────┐  + New Profile  │
│ │ ◆ Obi-Wan ANH       <swatch> │                 │
│ │ Stable · 144 LEDs            │                 │
│ └──────────────────────────────┘                 │
│ ┌──────────────────────────────┐                 │
│ │   My Custom Saber  <swatch>  │                 │
│ └──────────────────────────────┘                 │
├──────────────────────────────────────────────────┤
│ Character-sheet body (vertical scroll)            │
│   Hero render (live, ~140h)                       │
│   ┌─ Blade specs ─────────────────────────┐      │
│   │ Length · LEDs · …                      │ Edit│
│   └────────────────────────────────────────┘      │
│   ┌─ Equipped style ──────────────────────┐      │
│   │ Stable                                 │ →   │
│   └────────────────────────────────────────┘      │
│   ┌─ Equipped sound font ─────────────────┐      │
│   │ Custom — Bravado.kf                    │ →   │
│   └────────────────────────────────────────┘      │
│   …                                              │
├──────────────────────────────────────────────────┤
│ ← Back to Canvas         ◆ my-saber              │
└──────────────────────────────────────────────────┘
```

The "list" is vertical because each profile is 88px tall and there are usually ≤4 — horizontal scroll-snap would feel overengineered. The "+ New Profile" chip lives in the upper-right corner of the list region. The character sheet's grouped attribute rows each have a `→` chip that opens a sheet with deep editing for that group (Pattern A nested inside Pattern B).

### 2.4 Pattern C: Single-panel form (`hardware`, `gesture-controls`, `motion-simulation`)

These sections are forms — no list of items, just a grouped set of fields. They get the simplest mobile layout: vertical scroll inside `flex-1`, grouped sections rendered as `<CollapsibleSection>` (already in the codebase) with default-expanded for the most-edited group and default-collapsed for the rest. The header/blade-canvas/back-pill chrome is the same as Pattern A, just no chip strip and no Column A region.

```
PHONE LAYOUT — hardware
┌──────────────────────────────────────────────────┐
│ ... header / action / blade canvas ...           │
├──────────────────────────────────────────────────┤
│ Form body (flex-1, vertical scroll)              │
│   ┌─ Blade ▾ ──────────────────────────────┐    │
│   │ Length:   28"  [Edit]                  │    │
│   │ LEDs:     113  [Edit]                  │    │
│   │ Topology: single  [Edit]               │    │
│   └────────────────────────────────────────┘    │
│   ┌─ Power ▸ ────────────────────────────┐      │
│   │ Battery · Brightness · Limits         │      │
│   └────────────────────────────────────────┘    │
│   ┌─ Board ▸ ────────────────────────────┐      │
│   │ Proffieboard V3  · Audio              │      │
│   └────────────────────────────────────────┘    │
├──────────────────────────────────────────────────┤
│ ← Back to Canvas         ◆ hardware              │
└──────────────────────────────────────────────────┘
```

`[Edit]` chip taps open a sheet with that single field's editor (slider + numeric input + reset). For boolean toggles and small enum pickers, the row IS the editor (no sheet needed) — only sliders, multi-line text, and 5+-option pickers route to sheets. **`HardwarePanel` battery section** mounts a sub-sheet that wraps the existing battery picker — no logic change, just a presentation swap.

### 2.5 Pattern D: Live preview hero + inline list + sheet edits (`layer-compositor`, `my-crystal`)

`layer-compositor` is the most-painful section to fit on phone — `LayerStack` was authored for ≥1024px column space (per audit row 174). Its rows assume `--row-h` density tokens (22/26/32px) and inline scrub fields that don't reflow. The proposal:

```
PHONE LAYOUT — layer-compositor
┌──────────────────────────────────────────────────┐
│ ... header / action / blade canvas (28vh) ...    │
├──────────────────────────────────────────────────┤
│ Layer rail (76h horizontal, full-width, scroll-x)│
│  ┌─ Base ──┐ ┌─ Clash ──┐ ┌─ Blast ──┐ ┌+Layer  │
│  │ ●  S M  │ │ ◐  S M  │ │ ○  S M  │ │       │
│  │ Stable  │ │ Strike  │ │ Burst   │ │       │
│  └─────────┘ └─────────┘ └─────────┘           │
│        ↑ active                                  │
├──────────────────────────────────────────────────┤
│ Layer detail (flex-1, vertical scroll)           │
│   ┌─ Layer: Base · Stable ────────────────┐     │
│   │ Solo · Mute · Bypass                  │     │
│   │ ┌─ Parameters ─────────────┐  [Edit]  │     │
│   │ │ shimmer ··●·······  0.42 │     ↗    │     │
│   │ └──────────────────────────┘          │     │
│   │ ┌─ Modulators ─────────────┐  [Edit]  │     │
│   │ │ swing → shimmer · 60%    │     ↗    │     │
│   │ └──────────────────────────┘          │     │
│   │ [ Solo on canvas ]                    │     │
│   └────────────────────────────────────────┘     │
├──────────────────────────────────────────────────┤
│ ← Back to Canvas         ◆ layer-compositor      │
└──────────────────────────────────────────────────┘
```

- Layers become **horizontally-scrolling cards** (76px tall × ~120px wide each) instead of vertical SSL-strip-style rows. Cards still carry the per-layer identity color stripe at the top edge so the SSL color grammar (UX North Star §4 LayerStack row) survives.
- Active card pinned with a 1.5px outer ring in the layer's identity color.
- "+Layer" chip at the right end of the rail.
- Layer detail body below uses the same Pattern A "Edit → sheet" affordance for parameter blocks.
- **Solo on canvas** is the single button that activates the existing `layerSoloIsolate(layerId)` motion primitive (UX North Star §7), giving phone users the same "ghost everything else, pulse the soloed layer in identity color" feedback as desktop.

`my-crystal` is the inverse — it has a hero (the Three.js Kyber Crystal) that wants 60% of vertical real estate, and the dropdowns (layout × theme matrix) that select share-card variants below. The Crystal body uses ~50vh on phone (can scroll if needed); the layout/theme controls are 2-up dropdowns that open as native `<select>` (preferred over a sheet — the OS picker is the right idiom for a single short list selection).

### 2.6 Per-section quick reference

| Section                | Family | Mobile pattern                                                | Open issues                              |
|------------------------|--------|----------------------------------------------------------------|------------------------------------------|
| `my-saber`             | B      | Vertical profile cards + character sheet body                  | Hero render must shrink to 140h on phone-sm |
| `hardware`             | C      | Collapsible-section form, sheet-for-edit                       | Battery picker reuses existing component |
| `blade-style`          | A      | Chip strip (29 styles) + Column B + sheet                      | Chip width = 96px (style names ~12 chars) |
| `color`                | A      | Chip strip (24 colors) + Column B + sheet                      | Chips are color swatches, no text labels |
| `ignition-retraction`  | A      | Chip strip (19 ign / 13 ret split with section divider) + Column B | Sub-tabs IGN/RET render as pill toggle above chips |
| `combat-effects`       | A      | Chip strip (22 effects, GENERAL pinned first) + Column B       | Held-state pulse dot survives in chip   |
| `layer-compositor`     | D      | Horizontal layer cards + detail body + sheet                   | Modulator routing nested in Edit sheet  |
| `routing`              | A      | Chip strip = active bindings list; Column B = ExpressionEditor | New bindings open via "+Binding" sheet  |
| `motion-simulation`    | C      | Form with collapsibles                                         | Drift sentinel: BladeCanvas reads same store |
| `gesture-controls`     | C      | Form with collapsibles                                         | None |
| `audio`                | A      | Chip strip = sub-tabs (Events/EQ/FX/Presets/Sequencer) + Column B | Folder-picker bootstrap stays in Column B |
| `output`               | A      | Chip strip = pipeline steps (Setup → Compile → Flash → Verify) + Column B with active-step body | Pipeline must visualize step status (✓/▲/●) |
| `my-crystal`           | D      | Hero crystal canvas (50vh) + native dropdowns + Save buttons   | None |

---

## 3. Component-level decisions

### 3.1 BladeCanvas

- **Stays as the hero on every screen.** It's not negotiable per UX North Star §4 — the blade canvas anchors the experience.
- **Phone (portrait): horizontal blade, 28vh tall, min 180px.** Same as today.
- **Phone (landscape, ≤480px tall): vertical blade, 80% viewport height, anchored left.** Inspector compresses to a thin right rail. This handles the "iPhone in landscape during a maintenance moment" use case the audit calls Severity-medium.
- **Pinch-zoom: NO.** The audit asked. Per UX North Star §4 BladeCanvas row, the canvas is "the *one* place cinematic depth is permitted" — pinch-zoom would disrupt the 1:1 LED-to-pixel mapping that the analysis tools below depend on. Users who want to see fine pixel detail use the desktop's PixelDebugOverlay; on mobile, we honor the 1:1 mapping and show the pixel strip below.
- **Tap-on-canvas to ignite/retract:** YES. Currently the Ignite button is in the header (top-right, thumb-unreachable). Adding a tap-target on the blade canvas itself gives one-handed control. Long-press on canvas opens fullscreen preview (existing behavior, just discoverable).

### 3.2 LayerStack

- **Pattern D horizontal cards** (per §2.5 above). Card width 120px / height 76px. Identity stripe top edge. Solo / Mute toggles are 32×32 inline.
- **Layer parameter editing** routes to a sheet — never inline at phone width. The desktop's inline scrub fields stay desktop-only.
- **Drag-to-reorder:** long-press to grab + drag horizontally. iOS Safari supports this via Pointer Events API (which `useDragToScrub` already uses). HTML5 DnD is NOT used here.

### 3.3 EffectPanel

- **Becomes a sheet-only experience on phone.** The 24-slider grid (`grid-cols-2` × 4 from audit row 169) is broken at 380px. On phone, `EffectPanel` mounts ONLY when an effect is selected from `combat-effects`'s chip strip and renders inside a full-screen bottom sheet (§4). Inside the sheet, sliders flow `grid-cols-1` so each slider gets the full sheet width.
- **The action bar's effect chips (top of MobileShell) stay** — those are triggers, not editors. Tapping a chip fires the effect; long-pressing or tapping a "tune" affordance (one of the 5 chips becomes a "..." chip that opens the sheet picker) opens the sheet for that effect.

### 3.4 StylePanel (within `blade-style` Column B)

- **Description + parameters render inline** on phone — they're the readable-content portion.
- **Parameter sliders flow `grid-cols-1`** at `phone:` (current desktop is `grid-cols-2`).
- **Try-this-style button** at the bottom of Column B writes the style to the active blade and dismisses any open sheet.

### 3.5 PerformanceBar

- **Already deleted** (per CLAUDE.md, PR #53, v0.14.0). No mobile work needed. **Removed from the audit's hard-problems list correctly.**

### 3.6 Modulation plates (RoutingPanel)

- **Plates remain horizontally-scrollable on phone** — same as the existing `lg:grid-cols-4 xl:grid-cols-6`, but at phone width the plates flow as a horizontal scroll-snap rail (mirrors the chip strip pattern from §2.2).
- **Drag-to-route: NO at phone width.** HTML5 DnD doesn't fire `dragstart` from touch on iOS Safari. **Click-to-route is the documented mobile path** (already exists, works on touch). The plate's hold-to-arm gesture is: tap-to-arm → next slider tap binds. This is the same flow as desktop, just emphasized as primary on mobile.
- **Wire-grab gesture (desktop drag-and-drop): explicitly desktop-only.** Document this in the user guide.
- **Long-press on a plate opens the modulator config sheet** (modulator-specific parameters: smoothing, range, threshold).
- The reciprocal hover-highlight (CLAUDE.md PR #61): **on phone it triggers on tap-and-hold of a parameter row** — hold to see which plates drive this slider. Release dismisses.

### 3.7 OLEDPreview

- **Already 128×32 hardware-mirror at fixed size.** On phone, set zoom to 4× (display 512×128) so the user can actually see what's on the OLED. 1× / 2× / 4× toggle stays.
- **Sheet for OLED editing:** the existing `OLEDEditor` opens in a sheet (it's a click-each-pixel editor — already touch-friendly).

### 3.8 PresetGallery

- **Already mobile-ready** (audit row 179: `grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4`). Each card is the existing 200×416 portrait MiniSaber. At 380px viewport with `grid-cols-2` and 12px gap, each card is 174px wide — slightly compressed but the MiniSaber's aspect ratio survives. **No changes needed.**

### 3.9 GalleryGridView / GalleryPage (`/gallery` route)

- **Audit row 180: 1-up at phone width** (no `phone:` overrides). Should be `grid-cols-2 tablet:grid-cols-3` to match PresetGallery's pattern. **One-line CSS fix.**
- The filter rail above stacks vertically on phone (already does because `flex flex-wrap`).

### 3.10 SaberProfileManager

- Currently desktop-form-shaped (audit row 182). On phone, lives inside the `my-saber` Pattern B body. The character-sheet shape from UX North Star §4 already maps to phone fine — vertical attribute groups, each tappable to edit-in-sheet.

### 3.11 HardwarePanel

- **Battery section** is the only piece needing UX care (audit row 183). The selection is "battery type → discharge rating → custom override," which today is three coupled selects. On phone, this becomes one sheet: tap battery row → sheet shows battery picker → tap-to-confirm dismisses sheet.
- The rest of HardwarePanel is form fields → fits Pattern C cleanly.

### 3.12 FlashPanel

- **EXPERIMENTAL** — audit row 177 says functional but dense. On phone, the disclaimer's three checkboxes stack 1-up (currently they're a 1-up grid anyway, just with desktop-padding). The "Proceed" button remains gated on all three checks. **No structural change** — just typography tightening so the warning text stays readable at phone width.
- The actual WebUSB flash flow is desktop-only per launch posture (CLAUDE.md, 2026-04-30 PM); on phone, the panel shows the EXPERIMENTAL banner + a "Use desktop to flash" callout above the disclaimer.

---

## 4. Sheet / drawer / overlay strategy

The proposal introduces ONE new primitive: a full-screen bottom sheet. Everything routes through it.

### 4.1 Bottom sheet — the universal "edit one thing" surface

```
PHONE — bottom sheet open over Column B
┌──────────────────────────────────────────────────┐
│ Header / action / blade / chip strip — UNCHANGED │
├──────────────────────────────────────────────────┤
│                                                   │
│  (Column B body slightly dimmed,                  │
│   sheet rises above it)                           │
│                                                   │
├──────────────────────────────────────────────────┤
│ ╭─ drag handle (10×4 pill) ─╮                    │ ← sheet starts here, 92dvh tall
│ │                            │                    │
│ │  Edit · shimmer            │  ✕                 │
│ ├────────────────────────────┤                    │
│ │                            │                    │
│ │  ●··············  0.42     │                    │
│ │                            │                    │
│ │  Min: 0.00   Max: 1.00     │                    │
│ │  ┌─ Modulation ──────────┐ │                    │
│ │  │ swing · 60%        ↗  │ │                    │
│ │  │ + add modulator       │ │                    │
│ │  └────────────────────────┘ │                    │
│ │                            │                    │
│ │  [ Reset ]    [ Done ]    │                    │
│ │                            │                    │
│ ╰────────────────────────────╯                    │
└──────────────────────────────────────────────────┘
```

**Behavior:**

- **Mounts at 92dvh.** Title + drag-handle visible at top. Bottom safe-area padded.
- **Slides in from the bottom** with a 200ms ease-out CSS transform (`translateY(100% → 0)`). Backdrop fades in (`opacity 0 → 0.6`). Same speed as `MobileSidebarDrawer` so the two motion vocabularies match.
- **Three dismissal patterns:**
  1. Tap backdrop above the sheet → close.
  2. Drag handle down (Pointer Events) → close (swipe gesture).
  3. Tap ✕ in sheet header → close.
  4. Press Escape (when keyboard attached) → close.
- **Done button in the sheet footer commits + dismisses.** Reset reverts the field to its store-default.
- **Sheets do NOT layer.** Opening a second sheet from inside a sheet replaces the current sheet (slides out → next slides in). Avoids z-stack ambiguity. The exception: a confirm-discard sheet ("Discard unsaved changes?") IS a stack, but it's modal and uncloseable except by its own buttons, so it can layer on top.
- **Body scroll lock while sheet is open** — same pattern `MobileSidebarDrawer` uses today (`document.body.style.overflow = 'hidden'`).

**Why bottom sheet, not modal dialog (`useModalDialog`):**

- The codebase has `useModalDialog` (CLAUDE.md mentions it) which is a centered modal. Centered modals interrupt — they break the "I'm tuning my saber" flow. Bottom sheets are the iOS / Android / Vital / Bitwig idiom for "edit one parameter without leaving context." UX North Star §4 cites the Inspector pattern (Figma); on phone, sheets are the spatial equivalent.
- Bottom sheet anchors at the thumb. Centered modal forces the user to tap up at the screen center.
- Drag-to-dismiss is impossible on a centered modal but natural on a sheet.

### 4.2 Drawer (existing) — `MobileSidebarDrawer`

- **Stays unchanged.** Already left-side, 280px, slides in from the left, taps-section-closes-drawer. This is the section navigator.
- The drawer and the bottom sheet **never overlap** — drawer is for navigation (between sections), sheet is for editing (within a section). One left-anchor, one bottom-anchor; visual axes are orthogonal.

### 4.3 Z-stack

```
z-50  Bottom sheet + its backdrop                 ← new
z-50  MobileSidebarDrawer + its backdrop          ← existing (drawer)
z-50  MobileTabBar (when visible — see §6)        ← existing
z-40  Editor body + MobileShell chrome            ← existing
```

Sheet and drawer **share** z-50 because they never co-exist (sheet auto-closes if drawer opens via the `drawerOpen` setter). Document this invariant inline so a future Claude doesn't accidentally allow simultaneous mounts.

### 4.4 Transitions — CSS, not Framer Motion

- The codebase doesn't have Framer Motion (per the prompt's note). All transitions use CSS transforms + `transition-transform duration-200 ease-out` — same primitive `MobileSidebarDrawer` uses.
- **Reduced-motion respected:** `@media (prefers-reduced-motion: reduce)` collapses transitions to 0ms. The `useAccessibilityApplier` hook already syncs OS reduced-motion to the store, so the CSS rule reads the store flag.

---

## 5. Touch interaction patterns

### 5.1 Per-surface gestures

| Surface                          | Tap            | Long-press / hold      | Drag                       | Pinch | Swipe-edge |
|----------------------------------|----------------|------------------------|----------------------------|-------|------------|
| Blade canvas                     | Ignite/retract | Open fullscreen preview| (none)                     | (off) | Back nav   |
| Effect chip (header bar)         | Trigger effect | Open Edit sheet for fx | (none)                     | —     | —          |
| Chip in chip strip               | Activate item  | Long-press to multi-select (future) | scroll-x rail               | —     | —          |
| Layer card (LayerStack)          | Activate layer | Show solo isolation    | drag horizontally to reorder | —     | —          |
| Modulator plate                  | Arm for routing| Open modulator config sheet | (drag-to-route DESKTOP-only) | —    | —          |
| Parameter slider in Column B     | (no-op)        | Show drivers (modulator hover-highlight) | scrub horizontally   | —     | —          |
| Parameter slider in sheet        | Focus + edit   | Show value tooltip     | scrub horizontally          | —     | —          |
| Sheet drag-handle                | (no-op)        | (no-op)                | drag down to dismiss        | —     | —          |
| Section header (in sheet)        | Toggle expand  | (no-op)                | (none)                     | —     | —          |

### 5.2 Modulation routing (touch)

- **Click-to-route is the primary path on touch.** Documented in user guide. Tap plate → arm. Tap slider → bind. Tap armed plate again → disarm. Single-finger, predictable.
- **Drag-to-route is desktop-only.** HTML5 DnD limitation on touch (audit row 232). The existing implementation already gracefully falls through to click-to-route on touch — no change needed, just docs.
- **Long-press on a slider in Column B reveals "drivers"** — the reciprocal hover-highlight. Hold to see which plates drive it; release dismisses.

### 5.3 Edge swipes

- **Swipe from left edge → opens the sidebar drawer.** Native iOS pattern. Implementation: hit-test a 16px left-edge zone, intercept Pointer Events, threshold 48px to commit.
- **Swipe from bottom edge → DOES NOT mount a sheet.** Bottom-edge swipe on iOS is the system gesture for app dismissal/Home; we should not fight it.
- **Swipe a sheet downward → dismiss.** Pointer Events on the sheet drag-handle.

### 5.4 Pinch-zoom

- **Globally disabled on the editor route** via `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` (already in place per Next.js conventions).
- **No per-surface pinch.** The blade canvas is 1:1 LED-mapped and pinch would break the analysis math. The chip strip is scroll-snap, not zoom. Sheets don't zoom.

### 5.5 Touch target floor

- **44×44px minimum on every interactive element.** `MobileShell` already enforces this with `min-h-[44px] min-w-[44px]`. The chip strip's chips, the layer cards, the sheet's slider rails — all need explicit floor checks during implementation.

---

## 6. Resolving the three audit-critical issues

### 6.1 Critical Issue #1 — `MainContentABLayout` has no phone fallback

**Resolved by §2.2 Pattern A (chip strip + Column B).** Below 768px, `MainContentABLayout` switches its render shape:

```tsx
// MainContentABLayout.tsx — proposed reshape (Phase 3 work)
if (columnA == null) {
  return <div>{columnB}</div>;  // unchanged path
}

const { isMobile, isTablet } = useBreakpoint();

if (isMobile) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="ChipStripWrapper" data-mainab-column="a-mobile">
        {columnA}  {/* renders as horizontal chip strip in mobile mode */}
      </div>
      <section data-mainab-column="b" className="flex-1 min-h-0 overflow-y-auto">
        {columnB}
      </section>
    </div>
  );
}

// tablet + desktop: unchanged from today
return (
  <div className="flex flex-1 min-w-0 h-full">
    <aside style={{ width: columnAWidth }}>{columnA}</aside>
    <ResizeHandle .../>
    <section className="flex-1 min-w-0">{columnB}</section>
  </div>
);
```

**The chip-strip rendering is not the responsibility of `MainContentABLayout`** — each section's Column A component receives a `presentationMode: 'panel' | 'chips'` prop (or reads `useBreakpoint().isMobile` directly) and renders the right shape. This keeps `MainContentABLayout` thin (just a layout shell) and lets each section's Column A own its chip-rendering.

**Mid-tablet (600–767px) keeps the current 280 + flex-1 split.** The audit shows this is "cramped but workable" at 768px. Bumping the breakpoint to 768 (so tablet portrait at 600–767 also gets chip strip) is **rejected** — TabletShell's whole layout assumes a sidebar exists, and chip strip would mean two horizontal scrollers (effect bar + chip strip), which fights the spatial logic. Keep the tablet path as-is.

### 6.2 Critical Issue #2 — "Back to Canvas" pill + `MobileTabBar` overlap

**Resolved by hiding `MobileTabBar` on `/editor` only.** The proposal:

```tsx
// app/layout.tsx — proposed change (Phase 3 work)
{pathname === '/editor' ? null : <MobileTabBar />}
```

- Inside `/editor`, the in-editor bottom bar (the "← Back to Canvas" pill or the StatusBar) is the sole bottom-pinned chrome. No global tab bar.
- Outside `/editor` (i.e. `/m`, `/gallery`, `/docs`), the `MobileTabBar` shows as today.
- **The user reaches other routes from inside `/editor` via the hamburger drawer.** The drawer's existing `gallery` group already routes to `/gallery`; adding `Saber Companion` and `Docs` items to the drawer is a one-line `Sidebar.tsx` addition.

**Why this resolution and not "shrink the pill to 32px to fit above the tab bar":**

- 32px is below the 44px touch-target floor.
- Two competing bottom bars are confusing — which is "primary"? The pill says "Back to Canvas" and the tab bar says "Saber / Editor / Gallery / Docs" — the tab bar would suggest the user is between routes when they're actually mid-editing.
- The Editor screen is a **task** (designing a saber), not a **tab**. Tab bars are for switching between long-running modes; sheets and pills are for in-task chrome.

### 6.3 Critical Issue #3 — `MobileTabBar` Gallery link is stale

**Resolved by §6.2 (the bar is hidden on `/editor`) plus a one-line fix to the Gallery tab href.** Even when the bar is visible (on `/m`, `/gallery`, `/docs`), the Gallery tab's `href: '/editor?tab=gallery'` should be `href: '/gallery'` to match the post-overhaul route. **Trivial fix.** Documented now so the Phase 3 implementer doesn't miss it.

The deeper question — **should `/gallery` be a separate route, or should it be a section inside the editor drawer?** — has both answers shipped today (the route exists AND the drawer has a `gallery` group that routes to it). Keep both. The route gives a chrome-free deep-link target; the drawer item gives in-editor discoverability.

---

## 7. Navigation summary

| Surface                          | Mobile entry                        | Desktop equivalent                  |
|----------------------------------|-------------------------------------|-------------------------------------|
| Section nav (within editor)      | Hamburger ☰ → drawer → tap section  | Sidebar always visible              |
| Route nav (Saber / Gallery / Docs) | Drawer → bottom of section list (NEW item) | Header links / `MobileTabBar` (visible only outside editor) |
| Quick controls (color, ignition) | Inspector view (home)               | Inspector always visible (left rail) |
| Deep section editing             | Section in drawer + chip strip body | MainContent + sidebar               |
| Parameter tuning                 | Tap "Edit" → sheet                  | Inline scrub fields                 |
| Effects (trigger)                | Header action bar                   | Header action bar / shortcuts       |
| Effects (tune)                   | "..." chip in action bar → sheet     | Inspector EFFECTS tab               |
| Layer reorder                    | Long-press + drag in card rail       | Drag-to-reorder in vertical stack   |
| Modulation routing (bind)        | Tap plate → tap slider              | Drag plate to slider OR same        |
| Modulation routing (edit)        | Long-press plate → modulator sheet  | Inline plate config                 |
| Saber Card export                | `my-crystal` section + native dropdowns | CrystalPanel inline                 |

---

## 8. State persistence + breakpoint

- All Zustand stores already work breakpoint-agnostic (audit row 224). No changes here.
- `kyberstation-ui-layout` (localStorage region resize) is desktop-only. Add a phone-specific layout key if needed (e.g. `kyberstation-mobile-sheet-state` for "user dismissed the onboarding sheet" tracking) — but that's Phase 3 detail.

---

## 9. Specific component-level reflows

These are the surgical changes a Phase 3 implementer needs. Each cites the audit row or the UX North Star section it answers.

| Component                        | Phone change                                                                                  | Cites              |
|----------------------------------|-----------------------------------------------------------------------------------------------|--------------------|
| `MainContentABLayout`            | Add `useBreakpoint().isMobile` branch → vertical stack                                        | Audit row 165      |
| Each Column A (×7 A/B sections)  | Accept `presentationMode` prop; render chip strip when `isMobile`                              | Audit row 165, §2.2 |
| `EffectPanel`                    | Render in sheet only on phone; `grid-cols-1` flow inside sheet                                 | Audit row 169      |
| `LayerStack`                     | Horizontal layer cards on phone; row config moves to sheet                                     | Audit row 174      |
| `RoutingPanel.ModulatorPlateBar` | Plates flow as horizontal scroll-snap rail at `phone:`                                         | Audit row 175      |
| `ParameterBank` slider rows      | "Edit" chip on each row at `phone:` opens sheet                                                | Audit ¶234         |
| `EffectTriggerBar`               | Add scroll-affordance gradient (`bg-gradient-to-l` fade at right edge)                         | Audit recommendation |
| `MobileTabBar`                   | Hide on `/editor`; fix Gallery href to `/gallery`                                              | Audit Surprise #1, §6.2 |
| `Sidebar` drawer items           | Add Saber Companion + Docs items at bottom of drawer                                           | §6.2               |
| `BladeCanvas`                    | Landscape ≤480h → rotate to vertical, 80vh, anchor left                                        | Audit hard problem 1 |
| `GalleryPage` flex-wrap grid     | Add `grid-cols-2 tablet:grid-cols-3` to maintain density                                       | Audit row 180      |
| `<Sheet>` primitive              | NEW component: `apps/web/components/shared/Sheet.tsx`                                          | §4                 |
| `useEdgeSwipe` hook              | NEW: hit-tests left edge → opens drawer (Pointer Events)                                       | §5.3               |
| `<ChipStrip>` primitive          | NEW: horizontal scroll-snap rail with edge fade + active-indicator                              | §2.2               |

---

## 10. Risks & open questions

### 10.1 Things uncertain — need user testing

1. **Chip strip vs stacked-Column-A — does it land?** No competitor in the saber-design space has the A/B split-on-mobile precedent. The chip strip pattern is borrowed from Linear (status), App Store (categories), and Vital (preset banks). If user testing shows people hunt for a "back to list" affordance after tapping a chip, fall back to a tap-to-expand-list option (chip strip can grow into a 3-row grid on tap of a "..." chip). Phase 3 should ship with the chip strip; a 4-week post-launch poll informs whether to add the expand option.
2. **Layer cards horizontal vs vertical at 600–768px tablet portrait.** The proposal keeps tablet at the desktop-shape vertical row layout. Tablet users with thumbs-only might prefer the horizontal cards too — but switching tablet to horizontal cards changes a working surface for marginal benefit. **Phase 3 leaves tablet unchanged.** If feedback says tablet portrait users want phone shape, swap then.
3. **`my-crystal` Crystal Panel at 50vh on phone — is the Three.js performance OK?** The Three.js Kyber Crystal is GPU-cheap (CLAUDE.md polish notes it runs at 60fps on desktop), but mobile GPUs vary wildly. Tablet/phone testing during Phase 4 implementation. If frame drops appear on a 2019 iPhone, fall back to the static thumbnail PNG and require user-tap to mount the live renderer.

### 10.2 Things that depend on a UX call

4. **Action bar's 5 chips at 380px — show all 5 or condense to "Effects" + sheet?** Current proposal keeps the 5 chips visible (with horizontal-scroll). Alternative: 1 "Effects" chip that opens a sheet showing all 21 effects. The 5-chip path is more efficient (1 tap to fire); the 1-chip path is denser. **Ken's call.** Default proposal: keep 5, scroll to others.
5. **What happens to the StatusBar 11-segment PFD on phone?** The audit says it's broken at phone (row 184). Three options: (a) hide entirely on phone, (b) compress to 3 segments (Profile / LEDs / Battery), (c) tuck into the sheet header as a thin readout. Default proposal: option (b). **Ken's call.**
6. **Pinch-zoom on the blade canvas — really off?** UX North Star §4 says no, but real users on small screens may want detail. The pinch-zoom decision in §3.1 is the safe default (1:1 LED math preserved); future user testing may revise.

### 10.3 Things that might need to change after first build

7. **Sheet drag-to-dismiss responsiveness.** Pointer Events should give 60fps drag, but if there's audio/canvas overhead on the underlying view causing jank, may need `will-change: transform` hints or `prefers-reduced-motion` short-circuit. Test on a 2020-era Android.
8. **Edge-swipe-from-left to open drawer — conflicts with iOS Safari's swipe-back?** If the user's drag intent is ambiguous, iOS may steal the gesture. Solution if so: require a vertical threshold + horizontal threshold to commit (e.g. 24px down + 32px right) or only enable edge-swipe when the user has navigated INTO the editor (no back-history to swipe to).
9. **Chip strip scroll performance with 80+ chips (PresetGallery).** ScrollSnap + 80 cards is fine on desktop but can stutter on Android Go. If so, implement virtualization (only render visible chips ± buffer).

### 10.4 Things that imply logic changes (flag for separate review)

10. **Sheet state — controlled or uncontrolled?** If sheets need to share state with the parent surface (e.g. "tuning shimmer in a sheet, see live blade canvas behind") — and they should, that's the whole point — the sheet's content needs to be mounted from the parent's tree, not in a portal that re-mounts on each open. This is a small but real architectural call. Recommend: portal the **chrome** (backdrop, drag-handle, footer) but render the **content** inline with `position: relative; z-index: 51`. Phase 3 plan will detail.
11. **`useBreakpoint` is window-resize-driven**, not container-query-driven. If a future feature splits the editor between two devices (e.g. iPad + iPhone), this works. If it splits between a sidebar + iframe, container queries would matter. Out of scope for now; flag for Phase 5+.
12. **Hardware Fidelity Principle (CLAUDE.md `docs/HARDWARE_FIDELITY_PRINCIPLE.md`) and chip strip thumbnails.** The audit row 175 mentions plates have CSS-keyframe live-viz glyphs — those work fine in chip-strip cards. But the existing per-style chip thumbnail (PR #117 / #125 compact 24×24 SVGs) only has 26 styles; the chip strip needs all 29 + 24 colors + 19 ignitions + 13 retractions. **Phase 3 plan must include creating compact thumbnails for the missing items.** Not a logic change, but a content prerequisite.

---

## 11. Anti-pattern check (mandatory)

Each major proposed surface checked against UX North Star §3:

| Anti-ref                      | Where it could creep in              | How this proposal avoids it                                                                                       |
|-------------------------------|--------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| **SaaS dashboard chrome**     | Sheet header + footer                 | Sheet has flat dark backgrounds, drag-handle pill (not a pill button), single-line title, ✕ close — no metric tiles, no card wrapping, no decorative chrome. Sheet is the same `bg-bg-secondary` as the Inspector. |
| **Card-wrapped-everything**   | Layer cards in §2.5                   | Layer cards are MINIMAL — identity-color stripe + name + 3 toggles. Single border (`border-border-subtle`). No drop-shadow, no nested cards. The chip strip uses pill-shaped chips, not cards. |
| **SWTOR-style ornament**      | Profile cards in `my-saber`           | Cards are flat boxes with the saber identity-color stripe at the left edge — same idiom as desktop SaberProfileManager. No beveled edges, no rarity-color borders. |
| **shadcn defaults**           | New `<Sheet>` primitive               | Sheet is hand-rolled CSS + Tailwind (no Radix Dialog wrapper, no shadcn `Sheet` import). Inherits the project's existing token system (`bg-bg-secondary`, `border-border-subtle`). Drag-handle pill is a custom `<div>`, not a Radix primitive. |
| **Notion-flat aesthetic**     | The chip strip                        | Chips have identity-color stripes (active accent border + identity-color top edge) — more like Linear status chips than Notion tag pills. Active-state visual is an accent border + thin identity stripe, not a flat fill swap. |

**The hardest test:** would a Proffie-forum regular look at a phone screenshot and think "this was made by someone who cares about lightsabers"? Bottom sheet rising over a glowing blade canvas with parameter sliders in JetBrains Mono → yes. Generic SaaS phone with metric tiles and flat gray-on-white → no. The proposal designs FOR the first impression, not against the second.

---

## 12. What's NOT in this proposal

To match the prompt's scope discipline, these are **explicitly out of scope** for Phase 2:

- The Phase 3 implementation plan (file-by-file work breakdown, PR sequencing). That's the next deliverable.
- Code. None.
- Visual mockups in Figma or other design tools. ASCII wireframes are the design language for this proposal; if Ken wants high-fidelity mockups, that's a sibling sprint.
- The mobile companion route `/m` redesign. The audit says it's ✅ ready (mobile-first by design). No change.
- Marketing site mobile design. Out of scope.
- Mobile flash workflow (FlashPanel deep editing). Per CLAUDE.md launch posture, WebUSB flash is desktop-only and experimental.
- Server-side rendering / static export concerns for mobile. The codebase already handles SSR + hydration correctly.
- Accessibility deep audit. Phase 1 noted axe-core was zero-violations (CLAUDE.md PR #42); Phase 2 keeps that contract. Specific phone-only a11y testing happens in Phase 4 verification.
- Performance budgets (LCP / FPS / memory) on phone hardware. That's a Phase 4 measurement task, not a design task.

---

## 13. Phase-3 prerequisites (so the next Claude has a clean handoff)

When Phase 3 (implementation plan) starts, it'll need:

1. **Compact thumbnails for chip-strip items** — the existing 26 PR #125 thumbnails plus ~50 more for missing styles, colors, ignitions, retractions. Either a parallel agent dispatch or a designer pass. Estimated ~2hr.
2. **`<Sheet>` primitive spec'd in detail** — this proposal sketches the behavior; Phase 3 needs the full props/types/test surface. ~30min.
3. **`<ChipStrip>` primitive spec'd in detail** — same shape as Sheet. ~30min.
4. **Confirmation from Ken on the open questions in §10.2** — particularly: (4) action bar 5-chips-vs-1, (5) StatusBar phone shape, (6) pinch-zoom decision.
5. **Test plan** — golden-hash for the new sheet/chip primitives; visual regression test for each section's mobile layout. The renderer-level golden-hash harness from PR #147 already exists; Phase 3 extends it with mobile breakpoint cases.

---

## 14. Closing

The proposal preserves what works (MobileShell skeleton, drawer, BladeCanvas hero, action bar), fixes what's broken (A/B sections, MobileTabBar overlap, stale Gallery link), and adds one new primitive (bottom sheet) that solves the "deep editing on phone" problem cleanly. No new typeface, no new chrome library, no v0-dashboard tile grid. Every decision cites either an audit finding or a UX North Star section. The chip-strip pattern is the single biggest design call; everything else falls out of it.

Ready for Ken's review. Phase 3 (implementation plan) follows on approval.
