# Changelog

All notable changes to KyberStation are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Tracking work on the v1.0 path.

### Left-rail overhaul (2026-04-25)

Replaced the multi-tab + multi-column workbench with a unified **Sidebar + MainContent** shell driven by a single `uiStore.activeSection` slot. Page-tabs nav, the DesignPanel pill bar, the macro-knob PerformanceBar, and the swipe-driven tablet tab UI all retired together. Seven PRs (#47-#53) shipped in one day via parallel-agent dispatch.

**Final desktop shape.** The header keeps its utility chrome (logo, Share, FPS, Sound, Docs, ⌘K, Wizard, Settings) but loses the Gallery/Design/Audio/Output tabs — the sidebar absorbs them. Inspector stays left of the canvas as the always-visible "Quick Controls" surface; RightRail (STATE + ANALYSIS) stays right; new Sidebar (~280px) + MainContent split fills the panel area below the canvas. Tablet (600–1023px) uses the same shell at 240px sidebar width. Mobile is intentionally unchanged in this sprint — a small-screen drawer/bottom-sheet UX pass is owned by Ken.

**Sidebar groups (collapsible, localStorage-persisted)**: GALLERY → /gallery · APPEARANCE (Blade Style · Color) · BEHAVIOR (Ignition & Retraction · Combat Effects · Gesture Controls) · ADVANCED (Layer Compositor · Motion Simulation · Hardware · My Crystal) · ROUTING BETA (board-gated) · AUDIO · OUTPUT.

**Quick Controls (Inspector left rail).** GALLERY tab retired. Single-surface stack: Surprise Me + Undo · 8 canonical color chips (Blue / Red / Green / Yellow / Purple / Orange / White / Cyan) + Custom (jumps to deep Color section) · compact ignition + retraction MGP pickers with inline ms field · the existing 7 ParameterBank sliders. Every fast-access section is a thin view over the same store as the deep sidebar section, so changes propagate both directions.

**Three panel merges** ([#47](https://github.com/kenkoller/KyberStation/pull/47)):
- Colors + Gradient Builder → unified `ColorPanel` (channel selector at top; gradient region only renders for the Base channel)
- BladeHardwarePanel + PowerDrawPanel → `HardwarePanel` (config inputs on top, live power readout below the divider with `<StatusSignal>` headroom indicator)
- ModulatorPlateBar + BindingList → `RoutingPanel` (plate bar + binding count divider + active bindings list)

**SettingsModal reorganized to 3 tabs** ([#47](https://github.com/kenkoller/KyberStation/pull/47)): Appearance (Aurebesh Mode · Display · Row density) · Behavior (UI Sounds · Effect auto-release · Keyboard Shortcuts · Feedback) · Advanced (Performance Tier · Layout). The "Performance Bar" toggle was deleted alongside the bar itself.

**Other shipped pieces.** Motion Simulation restored under sidebar Advanced ([#49](https://github.com/kenkoller/KyberStation/pull/49)) after PR 1 dropped its mount point. ⌘1–⌘4 digit nav rewired from `setActiveTab` → `setActiveSection`; ⌘5 still toggles the All States takeover. KeyboardShortcutsModal now surfaces ⌘1–⌘5, ⌘K, ⌘Z, ⌘⇧Z as first-class Editor rows ([#49](https://github.com/kenkoller/KyberStation/pull/49)). The 19-ignition + 13-retraction style tables that were copy-pasted across three sites moved to a shared `lib/transitionCatalogs.ts` ([#50](https://github.com/kenkoller/KyberStation/pull/50)). The previously-inert Custom color chip now jumps to the deep Color sidebar section ([#51](https://github.com/kenkoller/KyberStation/pull/51)). Tablet shell migrated to Sidebar + MainContent ([#52](https://github.com/kenkoller/KyberStation/pull/52)). PerformanceBar.tsx + MacroKnob.tsx + QuickMacroPreview.tsx finally deleted ([#53](https://github.com/kenkoller/KyberStation/pull/53)) — the surviving `shiftLedColor` helper moved to a tiny `lib/shiftLight.ts` for ShiftLightRail's exclusive use.

**Test count:** 1030 / 1030 passing across 58 files (was 1044 across 59 pre-overhaul; net change reflects the deletion of the MacroKnob test suite + the addition of QuickColorChips + QuickTransitionPicker + Inspector regression tests). Typecheck clean across all 10 workspace packages. Verified end-to-end at desktop (1600×1000) and tablet (900×1024) viewports.

**Deferred** (post-overhaul follow-ups, not blocking a v0.15 tag): mobile shell migration (needs UX call on drawer vs bottom-sheet), inline custom-color popover (Ken's preference), and `compactThumbnail` field on transition catalog entries to author crisp 24×24 MGP triggers instead of scaled-down 100×60 SVGs.

### Saber Wizard — hardware step (2026-04-22)

Added a new first step to the Saber Wizard so newcomers tell the app about the saber they actually own (blade length + board) before picking aesthetic. The 3-step archetype/colour/vibe flow shifts to steps 2/3/4 and is otherwise unchanged.

- **Blade length picker** — 6 tiles (20"/24"/28"/32"/36"/40"). LED counts mirror `BLADE_LENGTH_PRESETS` in the engine package; selection writes `BladeConfig.ledCount` so every per-LED surface in the editor (BladeCanvas + PixelStripPanel + RGBGraphPanel + state-grid takeover) renders the chosen length 1:1.
- **Board picker** — 5 tiles (Proffie V3 / V2 / CFX / GH V4 / GH V3) with **3-tier compatibility chips** built on the existing `<StatusSignal>` primitive (paired colored glyph + label, colorblind-safe):
  - **VERIFIED** (green ✓) — Proffie V3, the only board hardware-validated end-to-end (per the 2026-04-20 Phase A/B/C entry above).
  - **UNTESTED** (amber ▲) — Proffie V2. Code path identical to V3, hardware testing pending. Community hardware reports welcome.
  - **REFERENCE** (red ✕) — CFX / GH V4 / GH V3. Different firmware ecosystems entirely; the editor + visualizer work but the generated config.h won't run on these boards.
  - A mini legend strip next to the "Board" heading shows what each color means.
  - Selection writes `boardType` to the active `SaberProfile` (or auto-creates a "My Saber" profile if none exists).
- **"Skip for now"** advances to the archetype step without writing anything to the blade config or profile — for users who want to dive straight into design and configure hardware later via the Profile + Code panels.
- **Initial focus** lands on the currently-selected length tile (matches selection rather than always-first), so keyboard users start where the visual selection is.

10 new contract tests in `apps/web/tests/saberWizardOptions.test.ts` guard the LED-count ↔ `inferBladeInches` mapping, the V3-only-verified tier assignment (will fail loudly when V2 gets hardware-validated, prompting a tier bump), and the storeValue strings that `CodeOutput.tsx` maps back to `proffieboard_v{2,3}`. 637 web tests pass.

### WebUSB flash — hardware validation (2026-04-20)

**Phases A + B + C all green on Proffieboard V3.9 (89sabers) + macOS 15 + Brave.** Connect → dry-run → real flash → post-write verify → recovery re-flash — full clean pass. Blade ignites blue on the first power press after replug; USB serial enumerates as `/dev/tty.usbmodem*`; audio DAC active (ProffieOS voice pack announces "SD card not found" / "font not found").

**Three real DFU protocol bugs fixed** that 576 passing mock tests had missed. Real STM32 DfuSe bootloader correctly returned STALL where the mock was too permissive:

- `DfuSeFlasher.verifyFlash`: `setAddressPointer` leaves the device in `dfuDNLOAD_IDLE`, but UPLOAD requires `dfuIDLE`. Added `abort()` between the two.
- `DfuSeFlasher.flash` (manifest step): after UPLOAD verify the device sits in `dfuUPLOAD_IDLE`, but the manifest's zero-length DNLOAD requires `dfuIDLE`. Added `abort()` before the manifest download.
- `DfuSeFlasher.waitForManifestComplete`: STM32 resets the USB bus as part of manifest (`bitManifestationTolerant=0`); the resulting `controlTransferIn` failure surfaces as a raw `DOMException`, not our `DfuError`. The old catch only swallowed `DfuError`, so successful flashes showed a red error banner. Now any error during the post-manifest poll is treated as success.

**Plus two supporting fixes uncovered while building firmware to validate against:**

- `firmware-configs/v3-standard.h`: legacy `InOutTrL<TrWipe<300>, TrWipeIn<500>, Blue>` no longer compiles against current ProffieOS master — bare `Blue` returns `RGBA_nod` which doesn't convert to `OverDriveColor`. Replaced with the modern `StyleNormalPtr<Blue, WHITE, 300, 500>` factory (same visual result).
- `.github/workflows/firmware-build.yml`: Linux runners are case-sensitive, so checking out ProffieOS into `proffieos/` broke the `arduino-cli compile <sketch-dir>` contract (ProffieOS ships `ProffieOS.ino`). Renamed the checkout path to `ProffieOS/`.

**Validated hardware scope: Proffieboard V3.9 on macOS + Chromium.** Brave is Chromium-based, and Chrome/Edge/Arc share Chromium's WebUSB implementation so they should behave identically. Windows, Linux, Proffieboard V2, and V3+OLED are untested; community hardware reports welcome via the [hardware_report](https://github.com/kenkoller/KyberStation/issues/new?template=hardware_report.md) issue template.

**Followups:**

- ~~Tighten `MockUsbDevice` to enforce the three DFU state-machine rules~~ — done (same session). `strictState` + `resetAfterManifest` options added; three regression tests added (one per bug), each verified to fail if the corresponding fix is reverted. 579 tests pass.
- Cross-OS sweep: Windows + Linux hardware smoke-tests before promoting the feature to "validated on all supported configurations".
- Cross-board sweep: Proffieboard V2.2 and V3+OLED hardware smoke-tests.

Full details in [`docs/HARDWARE_VALIDATION_TODO.md`](docs/HARDWARE_VALIDATION_TODO.md) § Phase C.


- **v0.11.1 — Design Review Polish Pass** (shipped): alert-color
  discipline, skeleton + error-state coverage, color-glyph pairing for
  accessibility, CHANGELOG + README assets, housekeeping
- **v0.11.2 — Color Naming Math** (shipped): three-tier algorithmic
  naming (landmark + modifier + coordinate-mood) expanding ~120
  curated names into 1,500+ HSL coverage
- **v0.11.3 — Modular Hilt Library** (shipped): 33 reusable line-art
  SVG parts composed into 8 canonical hilt assemblies (Graflex, MPP,
  Negotiator, Count, Shoto Sage, Vented Crossguard, Staff, Fulcrum),
  authored across 3 parallel artist-agents on top of a strict-typed
  composer + `HiltRenderer` with horizontal / vertical orientation. 8
  new SVG hilt options added to the editor's `Hilt` picker (marked
  with ✦)
- **v0.12.0 — Kyber Crystal Three.js renderer** (shipped): full 3D
  crystal component with PBR materials, 5 procedural Forms, bleed +
  heal + first-discovery animations, scannable QR embedded, card
  snapshot pipeline
- **v0.15.0 — Preset Cartography** (planned): multi-agent preset
  expansion across deep-cut lanes (Prequel/OT/Sequel, Legends/KOTOR,
  Clone Wars, Mando/Ahsoka, cross-franchise)
- **v0.16.0 — Multi-Blade Workbench** (planned): channel-strip UI for
  editing dual-blade / saberstaff / crossguard sabers (glyph format
  already supports multi-blade from v1)

*(v0.13.0 — Launch Readiness — shipped via PR #31; v0.14.0 slot open for
reassignment after deprecating the former "Kyber Forge" ultra-wide
layout concept, which is redundant now that OV11's drag-to-resize
handles cover the ultra-wide use case.)*

### Branch protection — server-side active

After the KyberStation owner upgraded to GitHub Pro (2026-04-17
afternoon), `pnpm run branch-protection:setup` applied the
`main-protection` ruleset (id `15217927`) on `refs/heads/main`:

- `non_fast_forward` blocks force-push to main
- `deletion` blocks main-branch deletion
- `pull_request` (0 approvals required) blocks direct pushes — all
  changes must go through a PR
- `required_status_checks: build-and-test` requires CI green before
  merge

Client-side `.githooks/pre-push` remains active as defense-in-depth.

### Deferred items (documented, awaiting dedicated pickup)

- Hardware validation of WebUSB flash against real Proffieboard V2.2
  and V3.9 — see `docs/HARDWARE_VALIDATION_TODO.md`
- Real ESLint enforcement across packages (stub lint scripts currently)
- `CANONICAL_DEFAULT_CONFIG` drift-sentinel test pattern
- Shared `<HiltMesh>` extraction between `BladeCanvas3D.tsx` and
  `CrystalRevealScene.tsx`
- Crystal Vault panel (scanned-crystal collection)
- Re-attunement UI for visual-version upgrades
- Favicon replacement from crystal snapshot pipeline
- `SHARE_PACK.md` §4 size-estimate table refresh (current doc understates
  max glyph size; real measurements from PR #20 hit ~490 chars at max)

See `~/.claude/plans/declarative-strolling-dragonfly.md` for the
orchestration plan that scopes the current sprints, and
`docs/SESSION_2026-04-17.md` Part 2 for the full session summary.

### Modulation polish + a11y clean (2026-04-23 late — untagged; candidate v0.14.1 or v0.15.0 once hardware-validated)

Two PRs shipped on top of v0.14.0 (PR #41 + PR #42). Items ordered by PR.

**PR #41 — modulation follow-up (merge commit `bd9bb7b`):**

- **Generated code now reflects modulation.** `generateStyleCode` threads
  a new `applyModulationSnapshot` helper that walks
  `config.modulation.bindings`, snapshots each to its current value via
  `computeSnapshotValue`, bakes the results into the config at each
  binding's target path (shallow-clone-on-write, no mutation), and
  prepends a BETA-labeled comment block listing every applied + skipped
  binding. Opt out via `{ comments: false }` on the preset-array code
  path to avoid one-comment-per-preset clutter in the full config.h.
  Expression bindings currently snapshot; v1.1 Core adds AST-level
  template injection for `Scale<SwingSpeed<>, ...>` + friends.
- **Hover wire-highlighting + bound-param stripe.** Three priority-
  stacked visual states on every slider label in ParameterBank:
  ARMED (click-to-wire) > HOVERED (this plate drives this param) >
  BOUND (some binding targets this param — persistent left-edge
  identity-color stripe). Identity colors propagate via
  `BUILT_IN_MODULATORS` descriptors.
- **Inline BoardPicker chip in StatusBar** between Profile and Conn.
  `BOARD · PROFFIE V3.9 · FULL`; click opens the modal picker. Reactive
  across capability-sensitive UI.
- **ExpressionEditor — v1.1 Core math-formula UI.** `fx` button on every
  SliderControl opens a 380-px popover with auto-focused textarea,
  live peggy parse status (✓ Valid / ✕ with error location + message),
  5 starter-idiom chips (Breathing / Heartbeat / Battery dim / Swing
  doubled / Loud OR fast), ⌘+Enter shortcut, Escape/outside-click
  dismiss. Apply creates a binding with `source: null`, `expression: {
  source, ast }`, `combinator: 'replace'`, `amount: 1.0`. BindingList
  distinguishes expression bindings from bare-source with an `fx`
  label in status-magenta + full-source hover tooltip.
- **Color-contrast fix across 9 canvas themes + the root default.**
  `--text-muted` bumped +40 each channel (106 110 120 → 146 150 160
  for Deep Space, equivalent deltas for the other 8 themes). Fixes
  82 axe-core color-contrast violations concentrated on muted-text
  surfaces in the modulation UI.

**PR #42 — a11y clean + first expression recipe (merge commit `c0a92c4`):**

- **Zero axe-core WCAG 2 AA violations** at desktop (1600×1000, 30
  passes) AND mobile (375×812) viewports on `/editor`. Closes the P29
  launch blocker carried from v0.13.0 readiness.
  - MobileTabBar: dropped `role="tablist"` / `role="tab"` —
    semantically this is route navigation, not a tab interface;
    `aria-current="page"` handles the active state.
  - AppShell mobile tablist: scoped `role="tablist"` to an inner
    wrapper so the collapse toggle + dot indicators become siblings of
    the tablist, not children (fixes `aria-required-children`).
  - AppShell tab `aria-controls`: replaced per-tab panel IDs with a
    single stable `id="mobile-panel"`; dropped when `showPanel` is
    false and paired with `aria-expanded`.
  - MiniGalleryPicker: `role="listbox"` → `role="group"` (children use
    `role="button"`, not `role="option"`).
  - Cleared the final 5 contrast issues: DesignPanel BETA chip
    `opacity-70`, ColorPanel preset subtitle `text-accent/70`,
    PerformanceBar page tabs + SaberProfileManager source badge
    `rgb(var(--text-muted) / 0.65)`.
- **Breathing Blade — first expression-based starter recipe.**
  `sin(time * 0.001) * 0.5 + 0.5 → shimmer · replace · 100%`. AST
  hand-built inline (can't import `parseExpression` across the
  `.npmrc` hoisted boundary per CLAUDE.md decision #1). Test split:
  `V1_0_RECIPES` (5) vs `V1_1_EXPRESSION_RECIPES` (1). Presets test
  count 29 → 40. The ProffieOS emitter's existing
  `matchSinBreathingEnvelope` heuristic recognizes this exact shape
  so the flashed blade will breathe live on hardware via
  `Sin<Int<period>>`.

**Tests delta since v0.14.0:** codegen +15, presets +11, web unchanged
(new UI work covered by visual QA + axe audit, which itself ran clean
on both viewports).

**PR #43 — docs catch-up (merge commit `b98af51`):** CLAUDE.md +
CHANGELOG updates for PR #41 + PR #42. No code touched.

**PR #44 — quick-start illustrations (merge commit `bfcdbf6`):** Three
hand-authored animated SVGs replace the `[gif-placeholder]` markers in
`docs/user-guide/modulation/your-first-wire.md`:

- `first-wire-step-1.svg` (7.0 KB) — five-plate bar with per-plate
  live viz (swing needle, angle tilt, sound VU, time sweep, clash
  flash).
- `first-wire-step-2.svg` (3.4 KB) — SWING plate armed, siblings
  dimmed, "◎ swing armed" banner below.
- `first-wire-step-3.svg` (7.1 KB) — two-column frame with an
  animated dashed wire connecting plate → shimmer slider, plus the
  binding row "SWING → Shimmer · add · 60%".

~17.5 KB combined. Native SVG animation — no JS. Each has `<title>` +
`<desc>` for screen readers. Matches editor color tokens exactly. An
inline HTML comment at the bottom of the markdown documents the
replacement pass for future screen-recorded GIFs.

## [0.14.0] — 2026-04-23

### Added — Modulation Routing v1.0 Preview (BETA)

First release of the headline **Modulation Routing** feature. Turns KyberStation from a static blade picker into a "blade instrument" — users wire live signals (swing / sound / angle / time / clash) to any numeric blade parameter with a combinator + amount; bindings drive the blade render in real time at 60 FPS.

Merged via [PR #35](https://github.com/kenkoller/KyberStation/pull/35). Marked BETA in the new `ROUTING` pill; full v1.1 Core (math formula UI + remaining 6 modulators + drag-to-route + Kyber Glyph v2 sharing + V2.2 flash + button routing) lands ~3 weeks post-launch per [`docs/MODULATION_ROUTING_ROADMAP.md`](docs/MODULATION_ROUTING_ROADMAP.md).

**UI additions:**

- New `ROUTING` pill in the DesignPanel (hidden on non-Proffie boards via the Board Capability System).
- `ModulatorPlateBar` — 5 plates (`swing` / `sound` / `angle` / `time` / `clash`) with live CSS-driven identity-color viz (`--mod-swing` through `--mod-retraction`). Click to arm, Escape to disarm.
- `AddBindingForm` — dropdown source/target/combinator picker + amount scrub. Fast form-based binding creation alternative to click-to-route.
- `RecipePicker` — 5 one-click starter recipes: **Reactive Shimmer** (swing → shimmer), **Sound-Reactive Music Saber** (sound → baseColor.b), **Angle-Reactive Tip** (angle → emitterFlare), **Clash-Flash White** (3-binding clash → baseColor.{r,g,b}), **Twist-Drives-Hue** (twist → colorHueShiftSpeed).
- `BindingList` — rows with source → target arrow, combinator dropdown, amount scrub (0–100%), bypass toggle (▶/⏸), remove button. Empty state nudges toward the plate workflow.
- Click-to-route wiring in every `ParameterBank.SliderControl` — armed plate tints all slider labels in the modulator's identity color; clicking wires `source → targetPath` as a new binding with the v1.0 defaults (add combinator, 60% amount).
- Inline `BoardPicker` chip in `StatusBar` between Profile and Conn — `BOARD · PROFFIE V3.9 · FULL`; click opens modal picker with all 6 boards + color-coded status chips.
- `BoardPicker` modal + inline variants ([`apps/web/components/shared/BoardPicker.tsx`](apps/web/components/shared/BoardPicker.tsx)) — 6 boards (Proffieboard V3.9 full, V2.2 partial, Golden Harvest V3 mirrors V3.9, CFX / Xenopixel / Verso preview-only), status chips, hardware-validated ✓ badge on V3.9.

**Engine additions** (`packages/engine/src/modulation/`):

- `registry.ts` — 11 built-in `ModulatorDescriptor`s with identity colors, ranges, units, one-pole smoothing coefficients, clash latch metadata.
- `sampler.ts` — per-frame value extraction + one-pole smoothing + clash latching with decay. Returns a frozen `SamplerState` consumed by `applyBindings`.
- `applyBindings.ts` — pure binding composer. Walks bindings in authoring order, composes with the 5 combinators (`replace` / `add` / `multiply` / `min` / `max`), sanitizes NaN / ±∞ / out-of-range values against per-parameter clamp data.
- `parser.ts` + `grammar.peggy` — peggy 4.2 expression parser for the math-formula mini-language (arithmetic + 10 built-in functions `min` / `max` / `clamp` / `lerp` / `sin` / `cos` / `abs` / `floor` / `ceil` / `round`). Runtime-compiled; module-level parser singleton. Drift-sentinel fixtures: 63 accept / 61 reject.
- `evaluator.ts` — tree-walk interpreter over `ExpressionNode`. Missing modulator IDs fall through to `0`; NaN / Infinity propagate (sanitizer upstream of the engine cleans up).
- `BladeEngine.update()` now samples modulators + applies bindings before style rendering; persistent `_samplerState` for smoothing continuity; `setParameterClampRanges(map)` API for the web layer to push per-parameter range constraints; `getSamplerState()` accessor for future UI viz.
- `packages/engine/src/index.ts` top-level barrel re-exports the full modulation subsystem so consumers (codegen, web, presets) can import from `@kyberstation/engine` directly.

**Codegen additions** (`packages/codegen/src/proffieOSEmitter/`):

- `mapBindings.ts` — Option B+ export semantics. Maps each binding to equivalent ProffieOS templates where possible (`Scale<SwingSpeed<>>`, `Sin<Int<>>`, `SoundLevel<>`, etc.); returns a `snapshotValue` fallback for unmappable bindings (expressions in v1.0, modulator chains, enum-targeted bindings). `MAP_BINDINGS_REASONS` constant exports the exact user-facing reason strings for the Flash dialog's per-binding review. Mirrors engine types inline with a drift-sentinel test per the CLAUDE.md decision #1 pattern.

**Web library additions** (`apps/web/lib/`):

- `parameterGroups.ts` — 77 modulatable `BladeConfig` fields enumerated with `path` / `displayName` / `group` / `range` / `default` / `unit` / `isModulatable`. 5 groups (color / motion / timing / style / other). Drives drop-target validation, parameter clamping, and the AddBindingForm's target picker.
- `boardProfiles.ts` — 6 board profiles: **Proffieboard V3.9** (full, hardware-validated) / **V2.2** (partial; modulation disabled in v1.0 until V2 hardware validation) / **Golden Harvest V3** (mirrors V3.9) / **CFX** / **Xenopixel** / **Verso** (last three: preview-only, modulation hidden). Each profile declares hardware (flash size, max LEDs, buttons, OLED), firmware, feature support (styles / effects / ignitions / retractions / SmoothSwing / prop files), modulation capability flags (supported modulators + functions + max bindings + soft/hard warnings + chains / step-seq / envelope-follower), and template emission ceilings. Helpers: `getBoardProfile` / `canBoardModulate` / `isParameterModulatableOnBoard` / `DEFAULT_BOARD_ID`.
- `propFileProfiles.ts` — 4 prop file profiles (Fett263 most-flexible, SA22C, BC Button Controls, Default Fett) with button event + gesture event vocabularies.

**Store additions:**

- `bladeStore.config.modulation?: ModulationPayload` (optional, backward-compatible) + `addBinding` / `removeBinding` / `updateBinding` / `toggleBindingBypass` / `clearAllBindings` actions.
- `uiStore.armedModulatorId: string | null` + `setArmedModulatorId` — click-to-route arm state, separate from `selectedLayerId` (which drives the layer-config panel).

**Hooks:**

- `useBoardProfile()` — reactive board selection backed by `localStorage.kyberstation.board.selected` with cross-tab sync via a `board-profile-changed` CustomEvent dispatched on the window.
- `useClickToRoute(options?)` — click-to-route state machine. Arm / disarm / onParameterClick returning `{ kind: 'created' | 'ignored', reason? }`. Escape-key disarm listener. Board-capability gating via `isParameterModulatableOnBoard`.
- `useBladeEngine()` — now pushes the `parameterGroups.ts` clamp ranges to the engine on init via `setParameterClampRanges()`.

**Starter recipe fixtures** (`packages/presets/src/recipes/modulation/`):

- 5 shipped for v1.0 (bare-source bindings, no expressions): Reactive Shimmer, Sound-Reactive Music Saber, Angle-Reactive Tip, Clash-Flash White (3 bindings), Twist-Drives-Hue. Top-level exports from `@kyberstation/presets` so the web layer imports directly.

**CSS tokens** ([`apps/web/app/globals.css`](apps/web/app/globals.css)):

- 11 `--mod-*` identity colors (one per built-in modulator) as full-color CSS variables, with paired `--mod-*-rgb` triples for alpha compositing. Swing = electric blue, Angle = teal, Twist = violet, Sound = magenta, Battery = green, Time = gold, Clash = near-white, Lockup = amber, Preon = ice-blue, Ignition = cyan, Retraction = warm-red.

**Docs:**

- Design spec: [`docs/MODULATION_ROUTING_V1.1.md`](docs/MODULATION_ROUTING_V1.1.md) (pre-existing; authoritative source for evaluation order, wire format, etc.).
- Implementation plan + 18 locked decisions: [`docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md`](docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md).
- Public roadmap (v1.0 → v2.0+): [`docs/MODULATION_ROUTING_ROADMAP.md`](docs/MODULATION_ROUTING_ROADMAP.md).
- User guide outline: [`docs/MODULATION_USER_GUIDE_OUTLINE.md`](docs/MODULATION_USER_GUIDE_OUTLINE.md) — 8 sections + 10 recipes + in-app supplements.
- 60-second quick-start (shipped): [`docs/user-guide/modulation/your-first-wire.md`](docs/user-guide/modulation/your-first-wire.md). Three GIF placeholders marked for Ken to record pre-launch.
- Glyph v2 session handoff: [`docs/NEXT_GLYPH_V2_SESSION.md`](docs/NEXT_GLYPH_V2_SESSION.md) — self-contained prompt for the parallel Kyber Glyph v2 encoder work.

### Changed

- `apps/web/components/editor/DesignPanel.tsx` — added the 4th pill group (`Routing`) with a BETA chip. The pill is hidden entirely when the current board doesn't support modulation (filtered via `canBoardModulate(boardId)`); state-rescue logic uses `useEffect` rather than setState-in-render.
- `apps/web/components/editor/layerstack/LayerStack.tsx` — no changes on main but the modulation work consumes the existing ModulatorRow viz kind convention (the SmoothSwing plate prototype from 2026-04-20).
- `packages/engine/package.json` — added `peggy@^4.2.0` runtime dependency (~25KB gzipped).
- `apps/web/lib/boardProfiles.ts` — cleanup pass by Agent P5 replaced 28 lines of inline-mirrored `BuiltInModulatorId` / `BuiltInFnId` unions with direct imports from `@kyberstation/engine` now that the top-level engine barrel re-exports the modulation subsystem. 21 drift-sentinel `.toContain` string checks in the tests replaced with compile-time assignment assertions.
- `packages/presets/src/index.ts` — top-level barrel now re-exports `MODULATION_RECIPES` + friends.

### Fixed

- **Infinite render loop in ROUTING panel.** `useBladeStore((s) => s.config.modulation?.bindings ?? [])` returned a new empty-array reference every render, triggering Zustand's store-rerender loop. Fixed with a module-level `EMPTY_BINDINGS: readonly SerializedBinding[] = []` constant as the fallback.
- **`setState` called during render** in DesignPanel's board-gating rescue. Moved the `setActiveGroup('appearance')` call into a `useEffect` hook.
- **Card-preview dev page `config.name` coercion** — `string | undefined` → `string` via `?? 'Untitled'` fallback (surfaced during modulation CI run; pre-existing issue from the parallel Kyber Glyph v2 session's dev page).

### Tests (+386)

| Package | Before v0.14.0 | After v0.14.0 |
|---|---|---|
| engine | 513 | **714** |
| codegen | 1,323 | **1,347** |
| web | 749 | **890** |
| presets | 9 | **29** |

Full workspace typecheck clean. CI green on every push.

## [0.11.2] — 2026-04-17

### Changed

- **Color naming system rewritten** as three-tier algorithmic model in
  new `apps/web/lib/namingMath.ts`. Replaces the 121-entry flat
  lookup in `saberColorNames.ts` with:
  - **Tier 1 — Landmarks** (~147 curated Star Wars character/location
    names) at exact HSL points. Every landmark from the original
    dataset preserved verbatim
  - **Tier 2 — Modifier grammar** (10 modifiers: `Pale`, `Deep`,
    `Vivid`, `Muted`, `Dawn-`, `Dusk-`, `Shadowed`, `Bleached`,
    `Ember-`, `Frost-`) applied to nearby-landmark colors. 147 × 10 =
    1,470+ modifier-expanded names algorithmically
  - **Tier 3 — Coordinate-mood fallback** for colors outside any
    landmark's orbit. Pattern: `{ColourMood} Sector {hex}-{hex}` —
    e.g., `Crimson Sector 4E-92`, `Azurine Outer Rim 6D-F7`
- `saberColorNames.ts` becomes a thin shim that re-exports
  `getSaberColorName` from `namingMath.ts`. No call sites need to
  change; every caller stays working.

### Fixed

- Every possible RGB now returns a distinctive, evocative name. Zero
  "Unknown Crystal" fallbacks across the full HSL space.
- Minute color adjustments no longer produce repeated names — modifier
  layers discriminate between neighboring hues.

### Notes

- All existing tests still pass (backward-compatible signature)
- New test suite (`namingMath.test.ts`) covers landmark preservation,
  modifier-trigger boundaries, coordinate-mood stability, and
  1000-sample coverage

---

## [0.11.3] — 2026-04-17

### Added

- **Modular hilt library** (`apps/web/lib/hilts/`) — a composable
  parts + assemblies architecture. Every hilt is an ordered stack of
  discrete parts (emitter, shroud, switch, grip, pommel, accent-ring)
  that mate via three interface-diameter classes (narrow 1.0",
  standard 1.25", wide 1.5"). 33 original MIT-licensed line-art SVG
  parts ship across 5 type directories.
- **8 canonical assemblies** curated from the parts: `graflex`,
  `mpp`, `negotiator`, `count`, `shoto-sage`, `ren-vent` (5-part
  crossguard including the quillon), `zabrak-staff` (double-emitter
  saberstaff), and `fulcrum-pair` (dual-shoto compact).
- **`HiltRenderer`** (`apps/web/components/hilt/HiltRenderer.tsx`) —
  pure React inline SVG renderer with opaque metal-gradient body +
  line-art detail strokes. Supports `vertical` (emitter up) and
  `horizontal` (emitter right) orientations via internal viewBox
  rotation.
- **Editor integration** — 8 new `✦`-tagged options in the Hilt
  picker route through the SVG renderer overlay, coexisting with
  the 9 existing canvas-primitive hilts as a zero-risk addition.
- **Authoring docs** — `docs/HILT_PART_SPEC.md` (canvas, connectors,
  palette, file structure) and `docs/HILT_STAGE_2_BRIEFING.md` (the
  3-agent parallel fan-out plan) define the contribution path for
  community-PR'd parts.

### Tested

- 18 tests across `hiltComposer.test.ts` and `hiltCatalog.test.ts`
  — composition stacking, connector strict + permissive modes,
  emitter tracking, catalog conformance (canvas width 48, connector
  cx=24), per-part spec validation, and round-trip composition of
  every shipped assembly.

### Legal

- All shipped SVG parts are original hand-drawn line art, MIT
  under the same licence as the rest of the project. Reference
  commercial packs used only on-device during authoring — never
  redistributed.

---

## [0.11.1] — 2026-04-17

### Added

- `ErrorState` shared component (`apps/web/components/shared/ErrorState.tsx`)
  with 4 variants (`load-failed`, `parse-failed`, `save-failed`,
  `import-failed`) + optional retry callback + compact-mode rendering
- `StatusSignal` shared component (`apps/web/components/shared/StatusSignal.tsx`)
  pairing status colors with typographic glyphs (●/◉/✓/▲/⚠/✕) for
  colorblind accessibility, with era and faction monogram variants
- CHANGELOG.md documenting the full release history
- `docs/images/landing-hero.png` — live-engine landing screenshot
  referenced from `README.md` above the feature list
- `--faction-sith-deep` and `--faction-jedi-deep` tokens for
  gradient-stop use in `.sw-sith-text` / `.sw-jedi-text`

### Changed

- **Alert-color discipline** — replaced raw `#ff4444` and
  `rgba(255, 60, 60, ...)` in `apps/web/app/globals.css` with theme
  tokens:
  - `.era-sequel` and all era classes now use `rgb(var(--era-*))`
    tokens
  - `@keyframes retract-breathe` now uses `rgb(var(--badge-creative))`
    amber — the retract button is a warning, not an error
  - `.console-alert` now uses `rgb(var(--status-error))` — still red
    (it IS an alert), but tokenised so colorblind theme overrides flow
    through
- Status indicators across `StatusBar.tsx`, `PresetGallery.tsx`,
  `PowerDashboard.tsx`, and `EngineStats.tsx` now pair color with
  `StatusSignal` glyphs (FPS performance bucket, system-status
  indicator, power draw)
- Async-boundary panels across the editor now show `<Skeleton>`
  during loading and `<ErrorState>` on failure (previously: blank
  panels or silent failures)
- `.sw-sith-text` / `.sw-jedi-text` gradient stops routed through
  `rgb(var(--faction-*))` tokens instead of raw hex
- Raw `#22c55e` / `#eab308` / `#ef4444` in `PowerDashboard.tsx` and
  `EngineStats.tsx` replaced with `rgb(var(--status-ok/warn/error))`
  so colorblind + theme overrides flow through

### Fixed

- Era badges in PresetGallery now honour theme overrides (e.g.,
  colorblind palette) instead of rendering raw hex
- Retract-button pulse no longer conflates "action in progress" with
  "error state"

### Infrastructure

- Deleted empty orphan directories: `packages/codegen/src/sharing/`,
  `apps/web/components/sharing/`
- Verified `**/.DS_Store` in root `.gitignore` (already present; no
  tracked files found)

### Notes

- Third-party R/G/B-channel visualization renders in `BladeCanvas.tsx`,
  `VisualizationStack.tsx`, `RGBGraphPanel.tsx`, and
  `visualizationTypes.ts` intentionally keep raw red/green/blue hex
  colors — those represent the literal RGB channels being visualized,
  not alert semantics
- `TimelinePanel.tsx` event-type category colors (ignite/retract/
  clash/blast/etc.) stay as raw hex — these are distinct identity
  colors paired with text labels, not alert semantics. Tokenising
  these would be identity coupling, not accessibility
- **Lint enforcement** (originally scoped for this sprint as Phase C4)
  is deferred. ESLint is not currently in `devDependencies`; activating
  it would surface hundreds of preexisting issues and is worth its own
  sprint with a clear scope for how to handle them (fix vs
  `// eslint-disable-next-line`). Tracked as a follow-up

---

## [0.11.0] — 2026-04-17

### Added — WebUSB Flash

- Full STM32 DfuSe protocol library for flashing Proffieboard firmware
  directly from the browser via WebUSB
- `FlashPanel.tsx` UI with "use at your own risk" disclaimer gate,
  per-session acknowledgement
- Firmware variants pre-built via GitHub Actions CI:
  `firmware-configs/v3-standard.h`, `v3-oled.h`, `v2-standard.h`
- Read-back verification after flash to confirm write success
- Dry-run mode for testing protocol logic without actually flashing
- 43 mock-USB tests covering the DFU state machine
- `docs/WEBUSB_FLASH.md` technical reference documentation
- `docs/HARDWARE_VALIDATION_TODO.md` pending-validation checklist

### Changed

- Landing page (`/`) now a real landing with blade hero + value strip +
  CTAs + release strip + footer, replacing the redirect stub

### Notes

- `v0.11.0` is NOT yet tagged — pending hardware validation against
  real Proffieboard V3.9 devices before promoting to release

---

## [0.10.0] — 2026-04-17

### Added — Long-tail cleanup

- Spatial positioning for drag, melt, and stab effects (joining lockup
  and blast from v0.3.0)
- Parser warnings channel (non-fatal diagnostics for unknown templates
  + arg-count mismatches)
- Font pairing polish: keyword-based scoring, "Recommended /
  Compatible" labels in SoundFontPanel

### Architecture

- `packages/codegen/src/astBinding.ts` — six-seam façade for config ↔
  AST ↔ code transformations
- `packages/codegen/src/transitionMap.ts` — single source of truth for
  ignition/retraction ID ↔ AST mappings (fixed pre-existing
  `standard ↔ scroll` round-trip swap)
- Lexer now consumes `::` tokens (fixes `SaberBase::LOCKUP_NORMAL`
  misreading as 5 args)

---

## [0.9.1] — 2026-04-17

### Fixed — Validation + polish

- **Critical data-loss fix**: Import → Apply round-trip no longer
  silently drops spatial, Preon, and extended-color fields
- Mobile companion route now carries preset ID to editor via
  `?preset=` query
- Theme-token compliance: replaced `accent-[var(--color-accent)]`
  no-ops with real Tailwind classes across 4 components

---

## [0.9.0] — 2026-04-17

### Added — Mobile companion route

- `/m` route with 12 curated canonical presets
- Swipe navigation
- Deep-link into full editor via preset ID

---

## [0.8.0] — 2026-04-17

### Added — Audio-visual sync

- `useAudioSync` hook feeding motion swing → audio pitch/volume
- SmoothSwing V1/V2 pair crossfading
- Motion-driven audio envelope ripples through the blade render

---

## [0.7.0] — 2026-04-17

### Added — Timeline easing curves

- 8 named easing curves (linear, easeIn, easeOut, easeInOut, bounce,
  elastic, dramatic, smooth)
- Inline SVG preview of each curve in the TimelinePanel
- SSR-safe `easingMath.ts` pure-function module

---

## [0.6.0] — 2026-04-17

### Added — Prop file visual UI

- 5 prop file presets (Fett263, SA22C, BC, Shtok, default)
- Button-action map reference table with gesture icons

---

## [0.5.0] — 2026-04-17

### Added — Sound font pairing + crystal reactive glow

- Keyword-based sound font scoring against blade config
- "Recommended / Compatible" pairing labels
- `--crystal-accent` CSS var follows `baseColor` for themed UI accents
- `useCrystalAccent` hook publishing the accent

---

## [0.4.0] — 2026-04-17

### Added — Saber Wizard (guided onboarding)

- 3-step onboarding modal: archetype → colour → vibe
- 5 archetypes, curated colour swatches, 4 vibe presets
- AutoFocus on first archetype button for keyboard users

---

## [0.3.1] — 2026-04-17

### Added

- Blade-accurate colour rendering (Neopixel gamma + diffusion preview)
- Preon engine preview animation
- Spatial blast placement polish

---

## [0.3.0] — 2026-04-17

### Added — Preon editor + spatial blast

- `TransitionEffectL<…, EFFECT_PREON>` emission + engine preview
- Spatial blast position + radius round-trip through `Bump`

---

## [0.2.2] — 2026-04-17

### Added

- GPL-3.0 attribution for ProffieOS upstream
- `LICENSES/ProffieOS-GPL-3.0.txt` with full license text
- README aggregate-work separation documentation

---

## [0.2.1] — 2026-04-17

### Added — Polish

- Dual-mode ignition (`TrSelect` with saber-up / saber-down variants)
- `detectStyle` heuristic for imported configs
- UI theme tokens rationalised across panels

---

## [0.2.0] — 2026-04-17

### Added — WYSIWYG Edit Mode + Spatial Lockup

- Click on blade → moves caret, updates config, re-emits code
- `AlphaL<LockupTrL<…>, Bump<Int<pos>, Int<size>>>` spatial lockup
  round-trip

---

## [0.1.0] and earlier — Foundational phases

Pre-v0.2.0 work focused on building the core architecture:

- Monorepo setup (Turborepo + pnpm workspaces)
- Engine-first architecture (`packages/engine`)
- AST-based code generation (`packages/codegen`)
- 29 blade styles, 21 effects, 19 ignitions, 13 retractions
- Multi-column workbench layout with visualization stack
- 30 canvas themes (9 base + 21 extended)
- IndexedDB persistence via Dexie

See the full history in `git log --oneline` for implementation
commit details.

---

## Release tagging convention

- Tags use `vX.Y.Z` format (e.g., `v0.10.0`, `v0.11.0`)
- Each release has a corresponding `feat/vX.Y.Z-*` feature branch that
  squash-merges to main
- GitHub releases include a release notes summary and any relevant
  build artefacts (firmware binaries for v0.11.x, for example)

## Related planning documents

- `CLAUDE.md` — project context + roadmap matrix
- `~/.claude/plans/declarative-strolling-dragonfly.md` — current
  multi-sprint orchestration plan
- `~/.claude/plans/i-m-curious-what-the-glistening-island.md` — design
  review plan that spawned v0.11.1
- `docs/KYBER_CRYSTAL_VISUAL.md`, `docs/KYBER_CRYSTAL_NAMING.md`,
  `docs/KYBER_CRYSTAL_VERSIONING.md`, `docs/SHARE_PACK.md` — Kyber
  Crystal + Saber Card design specs
- `docs/COMMUNITY_GALLERY.md` — GitHub-PR community gallery spec
- `docs/WEBUSB_FLASH.md` + `docs/HARDWARE_VALIDATION_TODO.md` — WebUSB
  reference + hardware validation pending list
