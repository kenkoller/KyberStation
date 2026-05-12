# KyberStation QA Testing Checklist

> **Purpose:** Structured manual-testing checklist for in-depth QA sessions. Designed to be worked through in discrete 30–90 minute sittings rather than as one marathon. Covers the v0.21.1 "Polyglot Release" surface area (Xenopixel V3, Fredrik integration, template-eval, Visualizer 3D, Fett263 Prop Editor) plus all carried-forward functionality.
>
> **How to use:** Copy this file into a working session log (or fork it) and tick boxes as you go. Use ✅ for pass, ❌ for fail (file an issue), 🟡 for partial / quirky-but-shippable. Note browser + viewport + saved-state at the top of each session so failures are reproducible.
>
> **Update cadence:** revisit after each major version cut. Trim covered-in-tests items, add new feature areas.

---

## Session log header — fill in once per session

```
Session date:
Session number / focus:
Browser + version:
OS + version:
Viewport (px):     e.g. 1440×900, 375×812, 768×1024
Build version:     Read from StatusBar BUILD segment (should match v0.21.1)
Saved state:       Fresh / preserved from prior session
Tester:
Notes URL/Issue:
```

---

## Session 1 — Smoke tests + critical user flows (~30 min)

The "the whole thing isn't broken" baseline. Run this **first** in any session.

### 1.1 Cold-start landing page
- [ ] Open production site or `pnpm dev` localhost
- [ ] Page paints under 3 seconds (no white flash > 1s)
- [ ] Hero strip shows current version: `v0.21.1 · Polyglot Release · 2026-05-12`
- [ ] Both hero blade GIFs play and loop smoothly
- [ ] **OPEN EDITOR** / **LAUNCH WIZARD** / **BROWSE GALLERY** buttons all clickable
- [ ] "ONE HILT. INFINITE BLADES." grid loads with at least 16 hover-igniting tiles
- [ ] Clicking a tile opens the editor with that preset loaded
- [ ] No console errors (open DevTools → Console)

### 1.2 Editor cold-start
- [ ] Navigate `/editor` directly (no preset in URL)
- [ ] Welcome wizard renders (or is skippable)
- [ ] After dismiss, default workspace loads with a default blade visible
- [ ] StatusBar shows: build version, board name, LED count, power draw, storage budget
- [ ] FPS counter visible and stable > 50fps on desktop
- [ ] No console errors

### 1.3 Preset roundtrip (P0 — most critical flow)
- [ ] Open Preset Gallery
- [ ] Search for "Obi-Wan" — should appear
- [ ] Click → preset loads into editor with correct base color (blue) + style
- [ ] Edit base color to red — blade visualizer updates within 1 frame
- [ ] Trigger Clash effect (C key or button) — white flash visible
- [ ] Trigger Lockup (hold L) — sustained warm pulse visible while held; releases on key up
- [ ] Save as user preset → reload page → preset persists in "My Presets"

### 1.4 Codegen sanity
- [ ] Open OUTPUT panel (CodeOutput)
- [ ] Generated code is well-formed C++ with matching `<>` brackets
- [ ] No `undefined` or `null` strings in the generated code
- [ ] Copy to clipboard — paste into a scratch file — visually valid
- [ ] "Report this snippet" link visible if confidence < 0.3 or errors > 0 (don't expect it on a working preset)

### 1.5 Share URL roundtrip
- [ ] Click Share button → "Kyber Code" URL copied
- [ ] Open URL in incognito / private window
- [ ] Preset loads identically (color, style, effects, blade length)

**Session 1 PASS criteria:** all 5 sub-sections complete with no ❌s.

---

## Session 2 — Board profiles (~60 min)

Verify each board profile produces accurate, board-appropriate output and that switching boards doesn't corrupt state.

### 2.1 Proffieboard V3 (default)
- [ ] StatusBar BOARD segment shows "Proffieboard V3"
- [ ] OUTPUT panel emits C++ `StylePtr<...>` templates
- [ ] All 33 styles selectable in Style picker
- [ ] All 22 effects triggerable
- [ ] LED count default 144
- [ ] Volume default 1500

### 2.2 Xenopixel V3 (NEW in v0.21.1)
- [ ] Switch board via Settings → Board profile picker
- [ ] Board switch dialog warns about compatibility (Proffie→Xeno style mapping)
- [ ] StatusBar BOARD segment updates to "Xenopixel V3"
- [ ] **XenoEffectPicker** appears (8-card grid: Fire, Steady, Unstable, Rainbow, Candy, Crack, Pulse, Flashing)
- [ ] **XenoIgnitionPicker** appears (12-card grid)
- [ ] **XenoBlasterPicker** (3 cards) + **XenoForcePicker** (2 cards) visible
- [ ] **XenoMotionPanel** — stab/twist/swing/pull toggles + sensitivity sliders
- [ ] **XenoSettingsPanel** — volume, clash sensitivity, blade modes, countdown, blade length, crossguard
- [ ] **XenoConfigPreview** — shows live `fontconfig.ini` + `config.ini` text
- [ ] Firmware version picker — 1.0 / 1.2 / 1.2.5 / 1.3.1 / 1.4.0 — config format changes when version changes
- [ ] Effect preview in blade visualizer is the Xeno engine style (not Proffie), e.g. Xeno Fire is chunky not smooth
- [ ] Export → ZIP download contains `fontconfig.ini` and `set/config.ini` with valid INI syntax
- [ ] Candy + Flashing effects reachable through UI (not null-kyberStyle — that was the PR #293 bug)

### 2.3 Xenopixel SD card import (NEW)
- [ ] Switch to Xenopixel V3
- [ ] Find or fabricate a sample `fontconfig.ini` (or use one from a real Xeno SD card)
- [ ] Open **XenoImportPanel** → paste contents → click Import
- [ ] Imported font appears in preset library with correct base color, blade effect, ignition style
- [ ] `detectFirmwareVersion()` heuristic picked a sensible version

### 2.4 Proffie→Xeno compatibility analysis (NEW)
- [ ] Load a Fett263 preset on Proffie
- [ ] Switch board to Xenopixel V3
- [ ] Compatibility analysis dialog shows: bladeEffect mapping, ignitionStyle mapping, degradationNote in plain English
- [ ] Confidence score reflects mapping fidelity (Stable→Steady is exact; complex Fett263 styles should show low confidence)

### 2.5 CFX (CrystalFocusX, design-reference)
- [ ] Switch board → CFX
- [ ] StatusBar shows "CFX (design reference)"
- [ ] Tagline reflects "honest" status — not over-promising native CFX codegen
- [ ] Export produces `KYBERSTATION_README.txt` clarifying design-reference state

### 2.6 Golden Harvest (design-reference)
- [ ] Switch board → Golden Harvest
- [ ] Same design-reference signals as CFX

### 2.7 Board switch state preservation
- [ ] Set up a custom preset on Proffie (purple plasma, custom name)
- [ ] Switch to Xenopixel V3 → switch back to Proffie
- [ ] Preset state intact (color, style, name)

---

## Session 3 — Fredrik Style Editor integration (~60 min, NEW in v0.21.1)

The Phase 1–7 integration. Most of the new editing surface area lives here.

### 3.1 Template-eval render mode (Hardware Preview)
- [ ] In editor, find **Render Mode** selector (proffie / xenopixel / template-eval)
- [ ] Switch to `template-eval` mode
- [ ] Blade visualizer continues rendering — no blank or frozen state
- [ ] Generated code panel and visualizer should now be in sync (both driven by the template AST)
- [ ] FPS holds — template-eval may be slower; ~30fps minimum acceptable

### 3.2 Template tree panel (Phase 5A+5D)
- [ ] Open the **Template Tree** panel (or `/template-tree` route, wherever it lives)
- [ ] Current preset's AST renders as a collapsible tree
- [ ] Click a leaf color node → inline editor pops
- [ ] Edit a color value → blade visualizer updates within 1 frame
- [ ] Click a layer node → layer controls appear (Phase 5C — show/hide, reorder, delete)

### 3.3 Variant cycler (Phase 1A-1E)
- [ ] Load a preset that uses `ColorChange<>` (or build one — e.g. wrap base in ColorChange)
- [ ] VariantCycler control appears in the action bar: `[ ◀ ] N / M [ ▶ ]`
- [ ] Click ◀ / ▶ — visualizer color shifts to next variant
- [ ] Variant cycles wrap (last → first)
- [ ] Action bar has `aria-label`, `aria-live="polite"` for screen readers

### 3.4 Style transformations (Phase 6)
- [ ] Select a template node
- [ ] Toolbar shows 4 transformations: **Expand**, **Layerize**, **Argify**, **Wrap**
- [ ] Expand — `StyleNormalPtr<C, CLASH, 300, 300>` → `InOutTrL<Layers<C, ...>, TrWipe<300>, TrWipeIn<300>>`
- [ ] Layerize — any non-`Layers` root → `Layers<current>`
- [ ] Argify + Wrap behave per Phase 6 spec
- [ ] After transformation, generated code updates and blade visualizer is unchanged

### 3.5 Template insertion palette (Phase 7)
- [ ] Open template insertion palette
- [ ] Search/browse 372-entry registry
- [ ] Filter by category (Colors / Effects / Transitions / Functions)
- [ ] Insert a template at a selected node — AST updates, visualizer reflects change

### 3.6 Mouse-driven swing simulation (Phase 3)
- [ ] Hover mouse over blade canvas → move horizontally fast → blade visually responds to swing
- [ ] Move slowly → swing speed decays
- [ ] Vertical position → blade angle (-1 to 1)
- [ ] Settings → Accessibility → toggle `mouseSwingEnabled` off → swing no longer responds

### 3.7 Time-scale / slow-motion (Phase 4)
- [ ] Open **TimeScaleControl** in toolbar
- [ ] Click presets: 0.25x / 0.5x / 1x / 2x
- [ ] Animation visibly slows at 0.25x, speeds at 2x
- [ ] Keyboard `[` → slower, `]` → faster
- [ ] At 0.25x, ignition animation takes ~4× longer; effects clearly visible frame-by-frame

---

## Session 4 — Visualizer 3D + Hardware Preview (~30 min, NEW in v0.21.1)

### 4.1 3D blade renderer (Visualizer Phase 2A+2B)
- [ ] Switch to 3D view (or `/3d` route — wherever the toggle lives)
- [ ] Blade renders as 3D mesh, not flat 2D canvas
- [ ] Emissive LED material visible — blade glows from "inside"
- [ ] Orbit controls work — drag rotates camera around blade
- [ ] Zoom controls (scroll wheel) work
- [ ] Frame rate holds > 30fps on dev hardware

### 4.2 Known limitations (Phase 2C/2D not shipped)
- [ ] Mouse drag does NOT swing the blade (Phase 2C — that's expected post-v0.21.1)
- [ ] Click does NOT trigger Clash (Phase 2C — expected post-v0.21.1)
- [ ] Hold does NOT trigger Lockup (Phase 2C — expected post-v0.21.1)
- [ ] No bloom / motion blur post-processing (Phase 2D — expected post-v0.21.1)

### 4.3 Switching between 2D and 3D
- [ ] Toggle 2D ↔ 3D — state preserved (color, style, ignition state)
- [ ] No frozen frames or visual glitches at the transition

---

## Session 5 — Fett263 Prop File Editor Level 1 (~30 min, NEW in v0.21.1)

### 5.1 Prop editor surface
- [ ] Open **Prop File Editor** panel (Settings → Prop or sidebar entry)
- [ ] ~30–40 Fett263 `#define` toggles render
- [ ] Each toggle has a tooltip explaining what the define does
- [ ] Categories visible (e.g., Sound, Effects, Behavior, Display)

### 5.2 Toggle behavior
- [ ] Flip a toggle → generated `config.h` block reflects the `#define` / `#undef`
- [ ] Set numeric `#define` (e.g., clash threshold) → numeric input accepts value, generates correctly
- [ ] Reset all → restores defaults

### 5.3 Compatibility check (no Level 2 yet — UI shouldn't promise it)
- [ ] No "button routing" sub-tab visible (that's Level 2, future work)
- [ ] No "compile prop file" or "upload custom prop" (that's Level 3, future work)

---

## Session 6 — Cross-browser sanity (~30 min)

Run sessions 1.1–1.3 on each browser. Note any rendering differences.

### 6.1 Chrome (Chromium) — baseline
- [ ] Smoke tests pass
- [ ] Bloom rendering looks normal

### 6.2 Brave
- [ ] Smoke tests pass
- [ ] FlashPanel requires the FSA flag (`brave://flags/#file-system-access-api`) — if user opts to test FlashPanel, verify flag is set
- [ ] Otherwise behaves like Chrome

### 6.3 Safari (WebKit)
- [ ] Smoke tests pass
- [ ] **KNOWN ISSUE:** BladeCanvas bloom may render narrower than Chrome (tracked in POST_LAUNCH_BACKLOG.md "Safari BladeCanvas bloom")
- [ ] Other visual differences: note but don't block

### 6.4 Firefox
- [ ] Smoke tests pass
- [ ] WebUSB not supported in FF — confirm FlashPanel shows the unsupported-browser message
- [ ] Otherwise functional

---

## Session 7 — Responsive layouts (~30 min)

### 7.1 Mobile (375×812 — iPhone SE / 13 mini)
- [ ] Landing page hero fits without horizontal scroll
- [ ] Editor mobile shell loads (current pattern: 4-tab swipe UI + MergedDesignPanel)
- [ ] Blade visualizer renders at reduced resolution but stable framerate
- [ ] Tabs swipeable
- [ ] Settings drawer/sheet opens without breaking layout

### 7.2 Tablet (768×1024 — iPad)
- [ ] Layout adapts — neither mobile nor desktop chrome
- [ ] No tablet "brand drift" (PR #277 fixed this — verify it's still good)
- [ ] StatusBar doesn't show duplicate BOARD-BOARD entries (PR #277 fix)

### 7.3 Desktop wide (1440×900)
- [ ] Workbench layout fills available space
- [ ] 3-column or 4-column grid depending on settings
- [ ] No overflow / scrollbar reflow on resize

### 7.4 Desktop ultra-wide (1920+)
- [ ] Content stays readable (doesn't stretch awkwardly)
- [ ] Hover and click targets remain accurate

---

## Session 8 — Accessibility (~30 min)

### 8.1 Keyboard navigation
- [ ] Tab through main controls — focus rings visible
- [ ] Effect shortcuts work: `C` (clash), `L` (lockup hold), `B` (blast), `S` (stab)
- [ ] Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z = redo
- [ ] Spacebar = pause/resume animation
- [ ] `[` / `]` = time-scale slower/faster (Phase 4)

### 8.2 Screen reader friendliness
- [ ] VariantCycler announces variant changes (`aria-live="polite"`)
- [ ] Effect buttons have `aria-label`
- [ ] Blade canvas has `aria-hidden="true"` or descriptive alt (it's a decorative animation)

### 8.3 Reduced motion
- [ ] OS reduced-motion enabled → editor settings reflect it on first load
- [ ] Heavy effect animations subdued (no full ignition flash etc.)
- [ ] Settings → Accessibility → manual override works

### 8.4 Color contrast
- [ ] Text in StatusBar, panels, buttons passes WCAG 2.1 AA on default theme
- [ ] Light theme also passes

---

## Session 9 — Persistence + state (~20 min)

### 9.1 IndexedDB
- [ ] Create a user preset — close tab — reopen — preset still there
- [ ] Clear IndexedDB → preset gone (expected)
- [ ] No `localStorage` quota errors in console for normal use

### 9.2 Share URLs
- [ ] Kyber Code (`?c=`) — short codes work
- [ ] Kyber Glyph v2 (`?s=<glyph>`) — full configs roundtrip including modulation bindings
- [ ] v1 backward compat — old glyph URLs still load

### 9.3 Settings persistence
- [ ] Change canvas theme → reload → theme persisted
- [ ] Change panel layout → reload → layout persisted
- [ ] Toggle UI sounds → reload → setting persisted

---

## Session 10 — Audio + sound fonts (~30 min)

### 10.1 Sound font preview
- [ ] Open SoundFontPanel
- [ ] No fonts loaded message visible if library empty
- [ ] Drop a font folder (`hum.wav` + others) via FSA picker — fonts list populates
- [ ] Click a font → hum loop plays
- [ ] Trigger Clash → clash sound plays from the loaded font
- [ ] Audio Mixer panel — EQ / volume sliders affect playback

### 10.2 Brave-specific
- [ ] FSA flag required — verify warning copy is clear ([PR #118 fix](https://github.com/kenkoller/KyberStation/pull/118))

---

## Session 11 — Export paths (~30 min)

### 11.1 ProffieOS config.h export
- [ ] Build a config with 2+ presets
- [ ] Export → downloads `config.h`
- [ ] File compiles in `arduino-cli` (if you have it set up — otherwise visual sanity check)

### 11.2 Xenopixel ZIP export
- [ ] Switch to Xeno → build a 3-font config
- [ ] Export → downloads `.zip`
- [ ] Contents: top-level `fontconfig.ini`, `set/config.ini`, one folder per font
- [ ] INI files are real INI syntax (key=value)

### 11.3 Share card export
- [ ] Open Share Card composer
- [ ] Switch through 4 layouts × 5 themes
- [ ] Each combo renders without artifacts
- [ ] Export → downloads PNG or saves to Crystal Vault (if shipped)

### 11.4 Animated saber GIF export
- [ ] Open My Crystal panel
- [ ] Export idle hum loop GIF — downloads
- [ ] Export ignition cycle GIF — downloads
- [ ] Both play in macOS Preview / Photos / GitHub markdown

---

## Session 12 — WebUSB FlashPanel (EXPERIMENTAL, opt-in only) (~20 min)

> ⚠️ Only run this section if you have a Proffieboard plugged in via USB-C and are prepared to recover via `dfu-util` if anything goes wrong. **Back up firmware first.**

### 12.1 FlashPanel gating
- [ ] Open FlashPanel — 3-checkbox disclaimer is visible
- [ ] Flash button is disabled until all 3 are checked
- [ ] After checking all 3 — button enables

### 12.2 Backup workflow
- [ ] Click Backup Firmware → DFU prompt appears
- [ ] Backup file downloads (`.bin` of current firmware)

### 12.3 Flash (real hardware required)
- [ ] Click Flash → DFU upload progress visible
- [ ] **KNOWN ISSUE**: manifest phase may leave board stuck in DFU mode on vendor-customized boards (89sabers / KR / Saberbay / Vader's Vault)
- [ ] If stuck: use `dfu-util -l` then recovery procedure from [FLASH_GUIDE.md](docs/FLASH_GUIDE.md)

---

## Session 13 — Performance + perf strip (~15 min)

### 13.1 FPS counter
- [ ] Visible in StatusBar (color-coded green/yellow/red based on threshold)
- [ ] Drops only when actively rendering heavy stuff (3D mode, motion sim)
- [ ] Recovers when idle

### 13.2 Pause behavior
- [ ] Spacebar pause → all animations freeze
- [ ] FPS counter drops to ~0 fps (no work being done)
- [ ] Spacebar resume → animations continue from where paused

### 13.3 PerfStrip (debug)
- [ ] Toggle on (via settings or `?debug=perf`)
- [ ] Shows render time, GC pauses, key memory metrics
- [ ] Doesn't visibly degrade FPS when enabled

---

## Session 14 — Edge cases + regression spot-checks (~30 min)

### 14.1 Empty / null inputs
- [ ] Clear preset name field → save → error message, doesn't allow empty
- [ ] LED count 0 → input clamps to minimum (>= 1)
- [ ] Blade length 0 → clamps
- [ ] Negative brightness → clamps

### 14.2 Massive inputs
- [ ] LED count 1000 → either clamps or warns (≥ 144 standard)
- [ ] 50+ presets in library → preset gallery doesn't freeze
- [ ] Very long preset name (200 chars) → truncates with ellipsis in UI

### 14.3 Network failure resilience
- [ ] Devtools → Network → Offline
- [ ] Reload page → loads from PWA cache (Service Worker)
- [ ] Community gallery falls back gracefully (per PR #211: fresh fetch → localStorage cache → hardcoded fallback)

### 14.4 Preset bisection (regression sentinels)
- [ ] Load "Kylo Ren" — should look red + unstable
- [ ] Load "Yoda" — should look green + stable
- [ ] Load "Mace Windu" — should look purple
- [ ] Load "Darksaber" — should look black-body with white core (Gradient<White, Rgb<5,5,5>>)
- [ ] Load "Inferno" — should look orange + fire
- [ ] Load "Aurora" — should look gradient-flowing green

---

## Issue triage template

If anything fails, file a GitHub issue with this template:

```markdown
**Title:** [Component] — One-line description

**Session:**  e.g. Session 3.4
**Step:**     e.g. 3.4.2 "Expand transformation"
**Browser:**  Chrome 124 / Safari 17.4 / etc.
**OS:**       macOS 14.4 / Windows 11 / Ubuntu 22.04
**Viewport:** 1440×900
**Build:**    v0.21.1 (from StatusBar BUILD segment)

**Expected:** What should have happened
**Actual:**   What happened instead
**Repro:**    Minimal steps to reproduce
**Severity:** P0 (broken) / P1 (degraded) / P2 (cosmetic) / P3 (nice-to-fix)
**Screenshot:** Attach if visual
**Console errors:** Paste relevant ones
```

---

## Estimated total time

| Session | Time | Cumulative |
|---|---|---|
| 1. Smoke + critical flows | 30 min | 30 min |
| 2. Board profiles | 60 min | 90 min |
| 3. Fredrik integration | 60 min | 2h 30m |
| 4. Visualizer 3D | 30 min | 3h 00m |
| 5. Fett263 Prop Editor | 30 min | 3h 30m |
| 6. Cross-browser | 30 min | 4h 00m |
| 7. Responsive layouts | 30 min | 4h 30m |
| 8. Accessibility | 30 min | 5h 00m |
| 9. Persistence | 20 min | 5h 20m |
| 10. Audio + sound fonts | 30 min | 5h 50m |
| 11. Export paths | 30 min | 6h 20m |
| 12. WebUSB FlashPanel | 20 min | 6h 40m |
| 13. Performance | 15 min | 6h 55m |
| 14. Edge cases | 30 min | 7h 25m |

**Full pass: ~7.5 hours.** Recommended cadence: 1–2 sessions per sitting, spread across 4–6 days.

**Critical-path pass (1, 2, 3, 4, 14): ~3 hours.** Adequate for "is v0.21.1 ready to publicize" gate.

**Quick smoke (1 alone): ~30 min.** Run after every dependency bump or hot fix.
