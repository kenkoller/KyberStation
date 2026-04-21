# Design-Reference Gap Analysis — 2026-04-19

Ken ran our `UX_NORTH_STAR.md` through Claude Design and got back a full
runnable reference: two CSS files (`tokens.css`, `workbench.css`) and 10
React JSX modules implementing a complete workbench mockup. The files
live at [`docs/design-reference/2026-04-19-claude-design/`](design-reference/2026-04-19-claude-design/)
(and a CSS-only slim copy at [`docs/design-reference/2026-04-19-imperial-andor/`](design-reference/2026-04-19-imperial-andor/)).

This doc captures the gap between that reference and our shipped app,
and recommends which parts to harvest pre-launch vs post-launch.

## Scope

The reference is a **pure visual + structural mockup**. It has no
engine, no codegen, no ProffieOS, no IndexedDB, no Kyber Glyph, no
WebUSB. Our current KyberStation has all of those. This means the
reference is useful as a **design direction** but not as a drop-in
replacement. Any adoption is harvest-and-port, not a branch swap.

## What the reference gets right

1. **Single amber accent** (`#c08a3e`) — bureaucratic, not saturated.
   Our current app uses `#4a9eff` (bright blue) as its accent. The
   reference's Imperial/Andor direction reads as more instrument-grade,
   less game-UI.
2. **Six aviation status colors fixed across themes** —
   green/amber/red/cyan/magenta/white. We have `--status-*` tokens but
   only 4 (ok/warn/error/info). Adding magenta (modulation / routing)
   and white (neutral data) would give us richer telemetry vocabulary.
3. **Three-radius discipline** — `--r-chrome: 2px` /
   `--r-interactive: 4px` / `--r-data: 0px`. Our current Tailwind
   classes (`rounded-sm`, `rounded-panel`, `rounded-lg`) are less
   disciplined.
4. **Row-density tokens** — `data-density` attribute on `<html>` with
   SSL (22px) / Ableton (26px) / Mutable (32px) presets. We have one
   fixed density. This is a small-effort, high-value power-user feature.
5. **Cmd+K command palette** — single-shortcut access to every action.
   We don't have one. This is table-stakes for instrument-grade UIs.
6. **Shift-light RMS rail** — 10px LED-strip-style meter at the top of
   the perf bar that responds to clash/lockup/swing events. We have a
   StatusBar but no equivalent real-time meter.
7. **8-macro Ableton strip** — bottom perf bar with 8 knob slots, page
   buttons (Design/Mix/Perf), and live telemetry readouts. We have
   ParameterBank but it's list-shaped, not knob-shaped.
8. **File / Edit / View menu bar** — classical desktop affordance with
   keyboard accelerators. We don't have one; the reference's menus
   (File / Edit / View / Layer / Modulator / Audition / Card / Window /
   Help) suggest a more discoverable action surface.
9. **4-page top nav** — Design / Audition / Code / Deliver. We have
   Design / Dynamics / Audio / Gallery / Output. The reference's
   structure is arguably cleaner — Audition as a first-class page is a
   strong signal.

## What our shipped app has that the reference doesn't

- Actual ProffieOS codegen with AST roundtrip
- Engine package with 29 blade styles, 21 effects, 19 ignition / 13
  retraction animations
- Kyber Glyph v1 encoder + version contract
- WebUSB flash protocol + mock-tested DfuSe implementation
- Three.js Kyber Crystal renderer with 13 trigger animations
- Real preset library (characters, eras, authors, lineage)
- IndexedDB persistence via Dexie
- Modular hilt library with 33 line-art parts
- Audio engine with SmoothSwing crossfade simulation
- Motion sim, audio sync, dual-mode ignition, spatial effect placement
- OLED editor, card writer, sound font panel, accessibility store
- 547 web tests + 2,636 workspace tests

The reference is a **facade**; our app is the **instrument**. The
facade is useful for discipline, not for content.

## Adoption plan

### Pre-launch (this week) — low-risk, high-signal

#### 1. Token refinement pass — `--status-magenta`, `--status-white`, radii
Add the two missing status colors (magenta for modulation/routing
signals, white for neutral data). Thread through existing StatusSignal
primitive. Low risk; no component rewrites.

**Effort**: ~30 min. **Impact**: richer telemetry without restructuring.

#### 2. Cmd+K command palette
Build as a shared primitive (`apps/web/components/shared/CommandPalette.tsx`)
that registers commands from a store. Wire Cmd+K / Ctrl+K shortcut
globally. Start with ~20 commands (open each editor panel, trigger each
blade effect, switch theme, toggle pause, load a preset). Can be
additive — doesn't remove anything.

**Effort**: ~half-day session. **Impact**: instrument-grade discoverability.
**Suggested location**: `apps/web/components/shared/CommandPalette.tsx` +
`apps/web/stores/commandStore.ts`.

#### 3. Density toggle
Add `data-density` attribute on `<html>`, three presets (compact / default / airy),
wire into existing `--font-scale` infrastructure from accessibility. Low risk.

**Effort**: ~2 hrs. **Impact**: power-user + accessibility win.

### Post-launch — higher effort, higher impact

#### 4. Imperial amber accent theme
Add an "Imperial" canvas theme option alongside the existing 30 themes.
`accent: '192 138 62'`, matched Andor palette. Purely additive; users
select it if they want it. No existing-theme changes.

#### 5. Full perf-bar macro strip
Replace ParameterBank with a 8-knob Ableton strip. Substantial UI work;
worth it for the long-term instrument-UI direction but NOT pre-launch.

#### 6. 4-page nav (Design / Audition / Code / Deliver)
Current `/editor` has 5 tabs; reference has 4. Consolidating requires
moving panels across tabs + rewriting the layout store's panel-to-tab
mapping. Defer.

#### 7. File/Edit/View menu bar
Classical menu bar is foreign to the current web-app direction; it's a
power-user nicety but the Cmd+K palette likely covers the same
discoverability more cheaply.

### Explicit non-adoption

- **Wholesale theme swap to Imperial/Andor palette** — our shipped app
  uses `#4a9eff` blue as its accent, baked into gradients, crystal
  renderer, and marketing material. Swapping would invalidate screenshots
  + require full QA. Keep blue as the default; offer Imperial as an
  additional theme.
- **Rewriting panels as flat instrument rows** — the reference's
  `layer-row` + `mod-row` shapes are crisp but our current LayerStack
  already ships live thumbnails + B/M/S audition controls + Bitwig-
  style plate rows (#15). Redesigning for minor visual differences is
  not justified.
- **The mock-data layer** — data.jsx + atoms.jsx demonstrate a hand-
  curated preset set. Our preset library is richer and already wired
  to the real engine.

## Files on disk

- [`docs/design-reference/2026-04-19-claude-design/`](design-reference/2026-04-19-claude-design/) —
  full reference: HTML + 2 CSS + 10 JSX + uploads/UX_NORTH_STAR copy
- [`docs/design-reference/2026-04-19-imperial-andor/`](design-reference/2026-04-19-imperial-andor/) —
  slim CSS-only reference (earlier snapshot of the same tokens)

Both are tracked in git so future sessions can diff our implementation
against the design brief.

## Follow-up tasks (spawn-ready)

When one of the adoption items above is ready to land, it's scoped
enough for an independent session. Use these as prompts:

- "Add `--status-magenta` + `--status-white` tokens + thread through
  StatusSignal. Reference: `docs/design-reference/2026-04-19-claude-design/tokens.css`
  lines 37-43 (`--status-*` palette)."
- "Build `<CommandPalette>` primitive with Cmd+K shortcut. Start with
  ~20 editor-action commands. Reference:
  `docs/design-reference/2026-04-19-claude-design/src/palette.jsx` for
  the visual shape and `workbench.css:923-1050` for the tokens."
- "Add density toggle (compact / default / airy) to accessibility
  settings. Reference: `tokens.css:56-59` + `tokens.css:67-69`."

## Decision record

- **2026-04-19** — Ken provided Claude Design reference. Reviewed it
  pre-launch while running a11y / perf / dead-code audits in parallel.
  Decided: harvest token refinements + Cmd+K + density toggle
  pre-launch; defer structural redesign (perf bar macros, 4-page nav,
  menu bar) to post-launch. Imperial palette shipped as additive
  theme, not a replacement.
