# Next Session — Wave 5 (PerformanceBar)

Paste the entire block below (everything between the two `===` rulers) into a
fresh Claude Code session. It's self-contained — the new session won't see
this conversation's context but has everything it needs pointed at files in
the repo.

=====================================================================

KyberStation workbench UX realignment — Wave 5 (PerformanceBar).

## Where we are

- Branch: cut a fresh `feat/w5-performance-bar` branch off `main`. PR #31
  (`test/launch-readiness-2026-04-18`) should have merged into main as
  v0.13.0 — confirm with `git log --oneline main -1` before starting. DO NOT
  restart from the old `test/launch-readiness-2026-04-18` branch; it's
  archived.
- Read `/Users/KK/Development/KyberStation/CLAUDE.md` "Current State" section
  for project posture (launch-readiness, humble framing, first public
  programming project).
- Read `/Users/KK/Development/KyberStation/docs/WORKBENCH_UX_REALIGNMENT_2026-04-20.md`
  — the authoritative 8-wave plan. Focus on §Wave 5.
- Reference design (port shape, not literal JSX):
  `/Users/KK/Development/KyberStation/docs/design-reference/2026-04-19-claude-design/src/performance-bar.jsx`
  + `atoms.jsx` (look at the `Knob` component specifically).

## What's already shipped on v0.13.0 — do NOT undo

All of these landed as part of the launch-readiness release:

- Morning workbench fixes — blade section 320px, DataTicker clipped to
  dedicated 12px strip, VisualizationToolbar vertical overflow-y-auto,
  BladeCanvas `compact` flag when `panelMode`
- W1 tokens — `--status-magenta`, `--status-white`, `--r-chrome` / `--r-interactive`
  / `--r-data`, `--row-h` / `--row-h-dense` / `--row-h-airy`, `--m-fast` / `--m-base`
  / `--m-slow`, `--ease`, `[data-density="ssl|ableton|mutable"]` selectors,
  StatusSignal `'modulation'` + `'data'` variants, accessibilityStore density
  field, SettingsModal Row density radio
- W2a palette primitive — `stores/commandStore.ts`,
  `components/shared/CommandPalette.tsx`, `hooks/useCommandPalette.ts`,
  `tests/commandPalette.test.ts`
- W3 StatusBar — 11-segment PFD strip (power / profile / conn / page / LEDs /
  modified / storage / theme / preset / UTC / build). **IMPORTANT: StatusBar
  is NOT at the footer of the app — it sits directly below the header.** W4
  + later commits moved it there.
- W4 header + tabs + palette mount — header trimmed (no subtitle, no inline
  version breadcrumb), `Command ⌘K` chip, upcased-mono tab labels with
  `⌘1–⌘5` kbd hints (OS-aware via `useMetaKey` from `lib/platform.ts`),
  `<CommandPalette />` mounted, 23 initial commands
- W4b action-bar pruning — 5 chips (Ignite + Clash/Blast/Lockup/Stab) +
  `● LIVE` indicator on the right. 17 hidden effects live in the palette
  AUDITION group. `<EffectChip>` subcomponent with active-held state via
  `activeEffectsStore`.
- W6a LayerStack file decomp — `components/editor/layerstack/*` (constants,
  scrubFields, AddLayerDropdown with portal rendering, LayerConfigPanel,
  LayerRow, LayerStack panel shell)
- W6b modulator primitives — `<ModulatorRow>` + `<ModulatorViz>`,
  `uiStore.hoveredModulatorId`, SmoothSwing rows render as ModulatorRow
  with live SVG viz ('sim' kind), temporary 1:1 hot-mod hover-highlight
- Polish wave — `activeEffectsStore`, `lib/effectToggle.ts` (shared toggle +
  timer registry), `effectAutoRelease` setting in Settings, live data
  interleaved into the HUD ticker every 4th slot
- Landing — visibility-gated animation via `animated={inView}`, 50-preset
  cap, 280s/340s row durations, MiniSaber `fps?` prop (LANDING_CARD_FPS=30)
- Ken's hardware work — DFU protocol fixes (macOS null-interfaceName
  fallback, verifyFlash abort, manifest abort, DOMException post-manifest
  catch), 3 regression tests, firmware-configs/v3-standard.h compile fix,
  CI firmware-build workflow casing fix

DO NOT undo or modify any of the above. If you find yourself editing
`BladeCanvas.tsx`, `DataTicker.tsx`, `StatusBar.tsx` (the 11-segment PFD),
the header trim in `WorkbenchLayout.tsx`, the action-bar `<EffectChip>`,
any file under `components/editor/layerstack/`, or the landing
`MarqueeCard`, **stop and re-read the scope**.

## Goal

Ship Wave 5 — PerformanceBar — as a persistent region between the main
panel area and the bottom DataTicker strip (which is the current app
footer). This turns the app from "visualizer" into "instrument."

Structural shape Ken approved:

    Row 1: shift-light rail — 32 LEDs wide, 10px tall, live RMS meter.
           Green under 50%, amber 50-75%, red above 75%.

    Row 2: the perf body — 148px tall, three columns laid out left→right:
             · Left:   page pills [A · IGNITION] [B · MOTION] [C · COLOR] [D · FX]
             · Center: 8-macro knob grid (2 rows × 4 cols, 54×54 arc SVGs)
             · Right:  bus / preset / BPM readouts

    Total visible height: 158px (10 rail + 148 body). When collapsed via
    the Settings toggle, only the 12px shift-rail-only mode shows; the body
    is hidden.

## Files to create

1. `apps/web/stores/performanceStore.ts` — zustand store, persisted to
   localStorage.
   - state: `currentPage: 'A' | 'B' | 'C' | 'D'`,
     `macroValues: Record<PageId, number[8]>`,
     `macroAssignments: Record<PageId, ParamBinding[8]>`,
     `visible: boolean` (default true)
   - actions: `setPage`, `setMacroValue(pageId, slot, value)`, `setVisible`,
     `resetDefaults`
   - `ParamBinding` shape: `{ target: string; min: number; max: number; label: string }`

2. `apps/web/components/layout/PerformanceBar.tsx` — reads `performanceStore`
   + `bladeStore`.
   - Top row: shift-light rail reading engine RMS. Grep
     `packages/engine/src/BladeEngine.ts` first — if no canonical RMS is
     exported, fall back to computing mean luminance from
     `engine.getPixels()` each shift-light tick.
   - Middle row: 3 columns — page pills left, 8-macro grid center,
     readouts right.
   - Gate rendering on `performanceStore.visible`.

3. `apps/web/components/shared/MacroKnob.tsx` — 54×54 SVG arc knob with a
   270° sweep from 7 o'clock to 5 o'clock.
   - Drag vertically to adjust. Reuse `useDragToScrub` from
     `apps/web/hooks/useDragToScrub.ts` — it's horizontal today, so either
     add a vertical mode to that hook or create a sibling
     `useDragToScrubVertical` hook.
   - UPPERCASE mono 10px label above, value (% or raw) below.
   - Hover/focus/active states via `var(--r-chrome)` border + faint accent
     glow.
   - Port the arc-drawing shape from
     `docs/design-reference/2026-04-19-claude-design/src/atoms.jsx:Knob`.

4. Optional `apps/web/components/shared/ShiftLightRail.tsx` — extract if
   large; inline in PerformanceBar otherwise.

## Files to modify

1. `apps/web/components/layout/WorkbenchLayout.tsx` — mount
   `<PerformanceBar />` between the main panel area (section 4 per the
   existing structure comments) and the bottom DataTicker strip. The
   ticker stays at the very foot.

2. `apps/web/components/layout/SettingsModal.tsx` — add a Performance Bar
   section with an enable toggle, matching the shape of existing toggles.
   Default on. Place it between Row density and Aurebesh Mode sections.

3. Optional `apps/web/components/editor/ParameterBank.tsx` — flag as
   deprecated-in-favor-of-PerformanceBar in a comment. Do NOT remove in
   this wave — two-step deprecation.

## Initial macro-to-param wiring

Stub with these defaults; Ken can iterate later.

- **A · IGNITION**: ignitionMs, retractionMs, shimmer, noiseLevel,
  swingFxIntensity, emitterBrightness, blastIntensity, clashBrightness
- **B · MOTION**: swingSensitivity, twistSensitivity, clashSensitivity,
  stabSensitivity, hardSwingThreshold, angleSwingDamping, motionSmoothness,
  responseCurve
- **C · COLOR**: baseColor.r, baseColor.g, baseColor.b, clashColor hue shift,
  blastColor hue shift, hue offset, saturation, brightness
- **D · FX**: lockupIntensity, meltIntensity, dragIntensity, forceIntensity,
  splinterIntensity, overchargeIntensity, fx global dry/wet, fx chain bypass

Not every field exists — `motionSmoothness`, `fx global dry/wet` etc. may
not be real `BladeConfig` fields. Grep `BladeConfig` in
`packages/engine/src/types.ts` for the real field list; fill in what exists,
and leave the rest as unwired placeholders with a tooltip:
`"not yet wired — v1.1 modulation-routing work"`.

## Token usage

Reference W1 tokens with fallbacks so this wave is independent:

- `var(--r-chrome, 2px)` — knob borders, pill borders
- `var(--r-interactive, 4px)` — knob hover states
- `var(--row-h, 26px)` — optional row-height reference; fixed 10px fallback
  for the shift-light if it reads cramped
- `rgb(var(--status-ok))` / `--status-warn` / `--status-error` — shift-light
  threshold colors (green <50%, amber 50-75%, red >75%)
- `rgb(var(--status-magenta))` — macro page A accent (optional)
- JetBrains Mono for readouts, UPPERCASE tracked mono for page pill labels

## Testing

Add `apps/web/tests/performanceStore.test.ts`:

- macro value clamping to [0, 1]
- page switching preserves per-page macro values
- localStorage persistence round-trip
- reset-defaults

And a logic test for MacroKnob's angle ↔ value conversion. Check
`apps/web/tests/commandPalette.test.ts` for how the project handles
component-logic tests without a DOM (pure helpers exported from the
component, tested in the node-only vitest environment).

## Walkthrough protocol

1. Implement all of the above.
2. Run `pnpm --filter @kyberstation/web typecheck && pnpm --filter @kyberstation/web test`.
   Confirm green.
3. Report back with the usual format: files touched, test count, any
   deviations, anything skipped and why.
4. DO NOT COMMIT. Ken will walkthrough the running app before committing.
   Expect findings on: knob drag feel, shift-light sensitivity, page-switch
   ergonomics, vertical space crowding.
5. After findings land, fix inline and commit focused commits:
   `feat(perf): W5 — PerformanceBar + macro knob strip + shift-light rail`.

## Risks

- **Vertical real-estate pressure.** PerformanceBar eats 158px from the
  main panel grid. If it feels crowded in the walkthrough, drop to
  collapsed-default + require the Settings toggle to open fully.
- **RMS source may not exist.** The engine exposes `getPixels()` but not
  necessarily a live RMS. Fall back to computing mean-luminance from the
  pixel buffer each shift-light tick if no canonical source is available.
- **Macro-to-param wiring is partial by design.** v1.1 modulation-routing
  is what makes this a real instrument. For v1.0 ship it as "tweak these 8
  params on each page" via direct setState on `bladeStore.config`; no
  through-modulator plumbing.
- **Drag-to-scrub adaptation.** `useDragToScrub` is horizontal today.
  Adding a vertical mode or creating a sibling hook is a design decision;
  check both options before reinventing.

## Success criteria

- PerformanceBar renders between the main panel area and the bottom ticker.
- Shift-light rail pulses with live blade activity — clash flashes red,
  idle stays green.
- Page pills A / B / C / D switch macro content.
- Dragging a knob changes the blade visibly (for wired params).
- Settings toggle collapses / expands PerformanceBar.
- No regression on anything shipped in v0.13.0.
- 580+ web tests pass (baseline is 579).

=====================================================================
