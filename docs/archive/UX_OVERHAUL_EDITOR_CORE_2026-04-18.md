# UX Overhaul — Editor Core Panels (2026-04-18)

**Branch:** `test/launch-readiness-2026-04-18`
**Scope:** `StylePanel` · `EffectPanel` · `TimelinePanel` · `LayerStack` ·
`VisualizationStack` + `VisualizationToolbar` · `IgnitionRetractionPanel`
(inline inside `TabColumnContent.tsx`)

**Reference:** `docs/UX_NORTH_STAR.md` §4 (per-component mapping)

---

## Panels probed

All owned files exist and were read end-to-end:

- `apps/web/components/editor/StylePanel.tsx` (347 lines)
- `apps/web/components/editor/EffectPanel.tsx` (853 lines)
- `apps/web/components/editor/TimelinePanel.tsx` (871 lines)
- `apps/web/components/editor/LayerStack.tsx` (729 lines)
- `apps/web/components/editor/VisualizationStack.tsx` (697 lines)
- `apps/web/components/editor/VisualizationToolbar.tsx` (395 lines)
- `apps/web/components/layout/TabColumnContent.tsx` — `IgnitionRetractionPanel`
  (inline function, L154–246) and the blade style switch case (L303)

No dedicated `IgnitionRetraction` component file exists; the focused panel
is defined inline inside `TabColumnContent` and delegates to the same store.

---

## Audit against §4 spec

### StylePanel / EffectPanel

North-star: Figma Inspector + TouchDesigner parameter density + Blender
drag-to-scrub. 24–28px row rhythm, collapsible sections, tabbed parameter
pages, drag-to-scrub on every numeric, expression fields, modulation color
signals.

Current state vs. spec:

- **Row rhythm** — reasonably consistent at `space-y-2` between sections
  and `flex items-center gap-3` inside rows. StylePanel style-button grid
  was cramped (`px-2 py-1` with `text-ui-xs`); EffectPanel conditional
  sub-sections had label widths of `w-20` while the parent panel used
  `w-28`, producing a jagged column.
- **Collapsible sections** — absent. Every section is always expanded.
  `CollapsibleSection.tsx` is referenced in `CLAUDE.md` but the file
  doesn't exist in `components/shared/`.
- **Tabbed parameter pages** — absent.
- **Drag-to-scrub** — not implemented; numerics are plain `<input
  type="range">` sliders with no hook or pointer handlers.
- **Math expressions on type** — absent (sliders are not text-editable).
- **Modulation color signals** — absent (the modulation system isn't built
  yet per §4 "Modulator plates" row; deferred to v1.1 per CLAUDE.md).

### TimelinePanel

North-star: ETC Eos cue list + Expanse live rhythm + SSL color grammar.

Current state vs. spec:

- **Tabular score of named events** — implemented (scroll track with
  ruler, event blocks with type labels, color-coded per `EVENT_COLORS`).
- **Row-per-event with timing + parameters** — selected event property
  panel shows duration / easing / intensity in a 3-column grid. Good.
- **Color grammar per event type** — raw hex, intentional per `CLAUDE.md`
  ("TimelinePanel event-type colors stay raw hex by design").
- **Playback controls** — present (play/pause, loop, speed, clear all).
  Empty-state guide + event-count hint both implemented.

### LayerStack

North-star: Ableton device chain + Resolume compositor rail + SSL strip
discipline.

Current state vs. spec:

- **Vertical rail of identical-shape rows** — implemented at ~36px row
  height with consistent gap-1 internal spacing.
- **Row contents** — reorder arrows, visibility, type badge, name,
  opacity, blend, duplicate, delete. Live mini-thumbnail is absent.
- **Header typography** — was just a small `text-ui-xs` muted line; did
  not match the section-header style used everywhere else
  (`text-ui-sm text-accent uppercase tracking-widest font-semibold`).
- **Touch targets** — reorder arrows used `px-0.5` and visibility toggle
  was `w-5 text-center` with no explicit min-height; both below 32px.
- **Empty state** — was a one-line italic string, not a shipped design
  artifact.

### VisualizationStack / VisualizationToolbar

North-star: Expanse layered live readouts + BR2049 single-hero readout.
Layer 1 = blade; Layer 2 = technical wireframe; Layer 3 = telemetry with
amber/cyan corner anchors.

Current state vs. spec:

- **Layered live readouts** — 11 layer render functions live-render
  waveforms with right-aligned stat readouts (`avg:`, `max:`, `total:`,
  etc.). Consistent `#030305` background, `rgba(255,255,255,0.07)` grid,
  7px monospace labels.
- **Toolbar chrome** — 32×32 rounded buttons with accent-dim active state
  and colored dot indicators. Good.
- **Amber/cyan corner anchors** — partial. Power layer uses `#ffaa00`
  (amber), swing uses `#44ffee` (cyan). Others are channel-specific.

### IgnitionRetractionPanel (inline in TabColumnContent)

Focused subset of EffectPanel — ignition + retraction buttons and speed
sliders only. Header typography matches spec. No gaps worth flagging as
FIX-INLINE.

---

## FIX-INLINE items applied

### 1. `StylePanel.tsx` — style-button row rhythm

**Why:** `px-2 py-1 text-ui-xs` was below the 24–28px §4 row-rhythm
target; outer label was `text-ui-xs` with an inner `text-ui-base` span,
inverting the hierarchy.

**Change:** Bumped to `touch-target px-2 py-1.5 text-ui-sm`, added
`aria-pressed`, removed the redundant inner `text-ui-base` and added
`truncate` on the label span so long names degrade cleanly at narrow
column widths.

### 2. `EffectPanel.tsx` — unified label column width

**Why:** Parent Timing / Spatial / Preon / Easing / Dual-Mode rows all
use `w-28 shrink-0`, while conditional sub-sections (Stutter / Glitch /
Spark / Wipe / Shatter-retract / Effect Customization Clash+Blast+Stab)
used `w-20`. This produced a jagged left gutter when a conditional
section expanded inside its parent.

**Change:** Replaced all 11 `w-20 shrink-0` occurrences with `w-28
shrink-0`, aligning every slider row to a single gutter width.

### 3. `LayerStack.tsx` — header typography + touch targets + empty state

**Why:**

- Header was `text-ui-xs text-text-muted` — did not match the
  `text-ui-sm text-accent uppercase tracking-widest font-semibold`
  style used by StylePanel, EffectPanel, TimelinePanel, and the
  `IgnitionRetractionPanel`.
- Reorder arrows (`px-0.5`), visibility toggle (no min-height),
  duplicate + delete (no min-height, opacity-0 also killed
  keyboard-focus visibility) were all below the 32px §5 touch-target.
- Empty state was `text-ui-sm italic` one-liner.

**Change:**

- Promoted `<span>` to `<h3>` matching the sibling panels'
  section-header typography; moved "N layers" count to a right-aligned
  `aria-live="polite"` counter.
- Added `touch-target` + readable padding to reorder, visibility,
  duplicate, delete. Added `focus:opacity-100` so keyboard users can
  still see duplicate / delete when tabbing.
- Sub-heading "Layer Config" bumped from `text-ui-xs tracking-wider`
  to `text-ui-sm tracking-widest` to match the global section-header
  scale.
- Empty state now renders as a dashed-border bg-surface card with
  primary label + secondary hint line, matching the Timeline empty-
  state shape.

---

## DEFER (big redesign — flag for Ken)

### D1. Collapsible sections on StylePanel / EffectPanel

`CollapsibleSection.tsx` referenced in `CLAUDE.md` doesn't exist. Adding
one and threading it through every `<h3>` … `</h3>` block + managing
open-state persistence across sessions is a dedicated mini-sprint.
Scope: ~15 sections across 3 files, plus `uiStore` entry for persisted
collapsed panel IDs.

### D2. Drag-to-scrub on every numeric

No `useDragToScrub` hook exists. Adding one is a dedicated infra
change: hook + wiring into `<Slider>` shared primitive + integration
across every numeric in StylePanel / EffectPanel / TimelinePanel /
LayerStack. Touches the shared component library.

### D3. Math-expression / modulation-routing fields

Deferred in §4 and §8 of the North Star (modulator plates are v1.1).
Not worth attempting until the modulation system itself lands.

### D4. LayerStack live mini-thumbnail per row

§4 spec calls for "live mini-thumbnail" on each layer. That requires a
per-layer offscreen engine render loop, which is architecturally
adjacent to `BladeCanvas` (owned by another agent). Defer.

### D5. LayerStack solo/mute buttons

§4 calls for "bypass/solo/mute" alongside visibility. Current code has
visibility only. Solo semantics (isolate + ghost others to 25%) touch
both the layer store and the canvas — dedicated sprint.

### D6. TimelinePanel — inline cue-list edit

§4 calls for an "editable inline" tabular cue list. Current impl is a
pixel-scroll timeline; a proper ETC Eos-style cue-list score would be
a parallel view, not a replacement. Non-trivial feature work.

---

## Verification

- `pnpm -w typecheck` — clean (all 11 workspace tasks pass).
- `pnpm -w test` — 428 / 428 tests pass, 25 / 25 files, ~5s.

No behavior regressions expected — all changes are typography /
layout-width / a11y only; no logic, prop, or store edits.
