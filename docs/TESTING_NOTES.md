# KyberStation Testing Notes — 2026-04-14 (updated 2026-04-15)

Testing feedback and bugs. Items marked [x] are fixed; unmarked [ ] are open.

## Bugs / Blockers
- [x] CSP blocking all JavaScript in dev mode (fixed — removed CSP headers from dev, meta tag production-only)
- [x] Canvas strip too short, RGB graph clipped (fixed — changed to `h-[40vh] min-h-[280px] max-h-[500px]`)
- [x] **CRASH: "Unknown retraction type stutter"** — fixed: Randomizer had invalid retraction types, engine now falls back gracefully instead of throwing
- [x] **StylePanel is not defined** — fixed: was caused by upstream retraction crash cascading into module import failure
- [x] Stutter ignition not extending fully — fixed: getMask() now uses `Math.max(progress, progress + stutter)` to prevent negative oscillation
- [x] Shatter retraction direction inverted (built up instead of breaking down) — fixed: inverted progress direction with `1 - progress`
- [x] Photo mode / Pixel mode rendering mismatch during retraction — fixed: photo renderer now reads engine-masked LED values directly instead of applying its own extendProgress cutoff
- [x] Hilt-blade gap (visible space between emitter and blade start) — fixed: removed duplicate EMITTER_W offset from hilt position calculation
- [x] Pixel strip / RGB graph disappearing on some configs — fixed: added try-catch in BladeEngine.renderSegment() to prevent style crashes from blanking LED buffer
- [x] Below 600px width: layout breaks — fixed: mobile header uses icon-only buttons, reduced padding, flex-wrap
- [x] Around 1024px breakpoint: controls overlap — fixed: moved FX Compare, Help, FPS to wide (1440px+) breakpoint

## Gallery / Presets
- [x] Preset tags (Prequel, EU, Animated, etc.) need background/contrast — fixed: added `bg-black/60 backdrop-blur-sm` pill background to era badges
- [x] Add more filterable tags for gallery browsing — fixed: added blade style and ignition type dropdown filters with a "Clear" button when active
- [x] Preset thumbnails: show fully extended blade — fixed: warmup frames now calculated dynamically from `config.ignitionMs` (`Math.ceil(ignitionMs / 16) + 10` steady-state frames) instead of hardcoded 10 frames. Ensures blade is always fully extended regardless of ignition duration (100-1500ms). Cache key now includes ignitionMs and spatialDirection
- [ ] Preset hover animation: on hover, play sequence — ignition → steady state → clash/blast/stab/lockup/lightning/drag/melt/force effects → retraction (ignition + retraction should be prominent since users care most about those)
- [ ] Consider best demo sequence order: nothing → ignition → baseline → effects → retraction → re-ignition?
- [x] Audit all character presets — fixed: 18 presets updated across 5 files (36 field changes). Key fixes: Kylo→unstable+stutter, Vader→stable+standard, Mace→pulse, Ahsoka→rotoscope+center, Palpatine→cinder+glitch, Grievous→stable (stolen Jedi sabers), all unstable blades shimmer≥0.3
- [ ] Expand preset library — fans will want comprehensive coverage
- [ ] Preset accuracy: effects must feel film-accurate, not exaggerated. Stutter should be subtle like Kylo's unstable crystal, not cartoonishly long. Users should feel like they're downloading the actual saber from the film.
- [x] Gallery description/info panel: move from bottom of gallery tab to top — fixed: PresetDetail now renders above search/filters at the top of the gallery tab
- [x] Quick save + queue: add a prominent "+ Add to Card" button — fixed: persistent button pinned to bottom of sidebar, one click adds current config to output preset list and switches to Output tab
- [ ] **Favorites + Preset Hierarchy**: Users need a favorites/collection system with parent-child relationships. One "saber" (e.g. Luke ROTJ) can have multiple child variants (story presets: calm, angry, dark side temptation, redeemed, etc.). Children can have children — enabling deep iteration and storytelling through preset evolution. This is a core feature for the community — saber collectors tell stories through their presets.

## UI Layout
- [x] Move toolbar controls (style, ignition, retraction, color, shimmer, effects) out of top bar — fixed: Phase 2 sidebar layout, controls in left panel, canvas fills right side
- [x] Too many options crammed in the top toolbar strip — fixed: header simplified, controls moved to sidebar tabs
- [x] Horizontal space underused in panel area — fixed: sidebar + canvas split layout on desktop
- [ ] Consider reordering/condensing Design tab elements
- [ ] Consider consolidating or reorganizing tabs — are 5 tabs the right split?
- [x] Tooltips need significant improvement — fixed: HelpTooltip rewritten with smooth fade/scale animation (150ms CSS transition), 250ms hover delay, larger 16px touch target, auto-flip positioning when clipping viewport, hover persistence on tooltip body, keyboard focus/blur support
- [ ] **Modular/customizable UI**: Users should be able to rearrange tabs, reorder sections, and configure their workspace layout. Different users focus on different things at different stages (blade design vs audio vs browsing community presets). Draggable/dockable panels ideal.
- [ ] **Community features**: Community preset sharing, leaderboard/trending presets, inspiration feed. Need to plan storage/backend for community blades.

## Canvas / Visualizer
- [x] Default zoom: current ~125% looks good — fixed: default zoom set to 1.25, reset button returns to 125%
- [x] Pixel strip + RGB graph sometimes disappear on certain configs (e.g. Abyssal Blade) — fixed: root cause was engine LEDArray (132 LEDs from DEFAULT_TOPOLOGY) vs config.ledCount (144 from preset) mismatch. Canvas guards now use `Math.min(config.ledCount, bufferLeds)` instead of bailing. `loadPreset` in bladeStore now syncs topology.totalLEDs to match preset. `useBladeEngine` now syncs engine topology when store topology changes.
- [x] Hilt graphic must be flush with the blade — fixed (same as Bugs section fix): hilt end aligns with BLADE_START, no duplicate offset
- [x] Glow rendering artifacts: visible hotspots/bright spots along the blade — fixed: softened blade body edge gradient (edgeDim 0.55→0.72), added bridge bloom pass
- [x] Black band / dark gap around the blade core — fixed: wider core whiteout (0.3→0.45), smoother gradient stops, bridge glow layer between bloom and blade body
- [x] RGB chart: red line at 0 is too close to the bottom edge — fixed: added bottom padding, 0/255 baseline labels
- [x] RGB chart: Y-axis value labels (192, 128, 64) are not fully on the chart area — fixed: expanded left margin with labelMargin, added 0 and 255 labels
- [x] Pixel bar and RGB chart: MUST be visually separated — fixed: increased Y gap (STRIP_Y=400, GRAPH_TOP_Y=455), added divider line between them
- [x] Overall: pixel strip + RGB graph should feel like a distinct "dev workbench" zone — fixed: vertical layout with resizable sub-panels, clear divider lines, and Analyze/Clean mode toggle
- [x] Vertical spacing: tighten gap between saber and pixel strip, increase gap between strip and graph — fixed with new Y positions (STRIP_Y=400, GRAPH_TOP_Y=455)
- [x] **Clean Mode vs Analyze Mode** — fixed: toggle button in bottom-left of canvas. Analyze mode (default) shows pixel strip + RGB graph. Clean mode hides them for cinematic saber-only view. State stored in uiStore.analyzeMode.
- [ ] **Share Cards**: Clean mode + QR code / share code overlay for sharing creations. Users can export a still image or animated GIF of their saber with a share code embedded. Other users enter the code in KyberStation to load the exact same blade config. Think trading cards for sabers.
- [x] Add visual separation between pixel strip and RGB graph — fixed: divider line + increased spacing
- [x] Add visual separation between saber preview and dev data (pixel + RGB) — fixed: pixel strip at Y=400, RGB graph at Y=455, clear spatial separation
- [x] Zoom UX: add slider or +/- buttons (not just scroll wheel) — fixed: +/- buttons and reset button added to canvas overlay (bottom-right)
- [x] **Vertical blade layout**: With the sidebar layout, the blade and pixel strip + RGB graph should render vertically instead of horizontally to make better use of the tall/narrow canvas area — fixed: full vertical render with 90° CCW rotation, hilt at bottom-left, resizable sub-panels for blade/strip/graph (drag handles at panel boundaries, widths stored in uiStore)
- [ ] 2D photorealistic view improvements:
  - Better glow effects and core rendering
  - Improve color mixing accuracy
  - Make photo mode closely represent how blade looks to naked eye
  - Consider separate "naked eye" vs "on camera" render modes
- [ ] 3D view: low priority vs improving 2D realism

## Effects
- [x] Effect overlap: effects stack when triggered quickly — fixed: one-shot effects (clash/blast/stab/force) now cancel previous active one-shot when triggered. Sustained effects (lockup/drag/melt/lightning) unaffected

## Colors
- [x] Add hex code input for color selection — fixed: editable hex input in ColorPanel, validates on blur/Enter, syncs with sliders
- [ ] Add character preset quick-select for colors (may already exist in Gallery?)
- [x] Add minimum brightness threshold setting — fixed: randomizer enforces MIN_BRIGHTNESS=80 floor, boosts dim colors proportionally

## Styles
- [x] Add noise pattern directionality control — fixed: added `directionalPosition()` helper to noise.ts, wired `config.spatialDirection` into LightningEffect, FireStyle, UnstableStyle, CinderStyle, PlasmaStyle, CrystalShatterStyle. Direction dropdown (Hilt→Tip, Tip→Hilt, Center Out, Edges In) in Quick Parameters section of Design tab for easy access
- [x] Painted style: interface is too complex / unclear — fixed: added 4 quick-start templates (Two-Tone, Tri-Color, Fade, Fire Tip), replaced number inputs with range sliders, renamed "W:" to "Blend", moved brush controls below region editor, added region count indicator
- [x] Stutter ignition: blade doesn't extend fully — fixed: added `stutterFullExtend` config toggle (default true). When unchecked, stutter oscillation can pull the edge below true progress for a "struggling crystal" partial-extend effect. Toggle appears conditionally in Dynamics tab when stutter ignition is selected.
- [x] Ignition/retraction animations: add more granular control — fixed: contextual parameter panels appear when specific types are selected. Stutter: Flicker Count (5-60) + Amplitude (1-30%). Glitch: Density (1-20%) + Intensity (10-100%). Spark: Spark Size (1-15%) + Trail (1-20%). Wipe: Softness (1-20%). Shatter retraction: Fragment Size (5-50) + Fade Speed (10-100%). All params feed into engine via BladeConfig → IgnitionContext
- [ ] **Timeline Editor**: DAW-style timeline for authoring custom ignition, retraction, and effect animations frame-by-frame. Users who want precise control over exactly how a clash flash looks, how a lockup evolves over time, or custom multi-stage ignitions (e.g. flicker → pause → extend → flare) could keyframe color, brightness, position, and timing. This is the power-user feature that no other saber tool offers.
- [x] Retraction rendering mismatch: Photo mode animates differently from Pixel mode — fixed: photo renderer reads engine-masked LED values directly (Phase 1)
- [x] Shatter retraction: visual appears to build up instead of break down — fixed: inverted progress direction with `1 - progress` (Phase 1)

## Audio / Font Mapping
- [ ] Replace placeholder sounds with royalty-free/public domain or remove entirely
- [ ] **Critical UX gap**: Font folder name mapping is confusing. Gallery presets have hardcoded names (e.g. "obiwananh") but users' SD cards have different folder names (e.g. "Ben"). Need a clear workflow for: (1) browsing/selecting a style, (2) mapping it to the user's actual font folder on their card. Consider: font folder picker that reads from SD card, or a "My Fonts" library where users register their font folder names once, or auto-detect from card.
- [ ] Font name changes in Output panel preset list don't propagate back to Gallery — should they be the same source of truth?
- [ ] **Sound Font Builder**: Add ability to browse, preview, and create custom sound font folders within KyberStation. Users should be able to mix and match individual sound files (hum, swing, clash, ignition, etc.) from different sources to build their own font folder paired with a blade design.
- [ ] Consider a "My Font Library" where users register/import their existing font folders once, then drag-and-drop to pair with any blade preset
- [ ] Auto-assign sound fonts: intelligently match a default/base font to a blade based on its attributes (e.g. unstable style → crackling font, smooth style → smooth swing font, fire → aggressive font). Could tie into the Audio tab's EQ/mixer settings for per-preset audio tuning.

## Firmware / Flashing
- [ ] **CRITICAL: Eliminate Arduino IDE dependency.** config.h is C++ that must be compiled and flashed — just putting it on the SD card does nothing for ProffieOS. Three approaches:
  - (a) Server-side compilation: send config.h to build server, return .bin, flash via Web Serial API (browser-native, no installs)
  - (b) Bundled arduino-cli in Electron desktop app (offline, self-contained)
  - (c) Hybrid: KyberStation manages arduino-cli install locally, compile + flash from within app
- [ ] Web Serial API (Chrome/Brave/Edge) can flash Proffieboard directly from browser — no drivers needed
- [ ] Note: CFX, Golden Harvest, and Xenopixel boards DO read config from SD card directly — the card writer already works for those boards. This is ProffieOS-specific.
- [x] For immediate testing: install arduino-cli + Proffieboard toolchain on Ken's Mac to validate the generated config compiles
  - arduino-cli 1.4.1 installed via Homebrew
  - Proffieboard core proffieboard:stm32l4@4.6 installed
  - ProffieOS cloned to /Users/KK/Development/KyberStation/ProffieOS/
  - FQBN: `proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1,speed=80,opt=os`
  - **Test compilation PASSED**: 3-preset config → 192,904 bytes (37% of flash)

## Connectivity
- [ ] **Bluetooth Live Edit**: Some boards (e.g. CFX, Golden Harvest) support Bluetooth. Add ability to connect to a saber via Bluetooth and push parameter changes in real-time — adjust colors, effects, ignition style without removing the SD card. Would make KyberStation a true live-tuning companion app. Ken's Proffie V3.9 doesn't have BT, but this is a major feature for the broader community.

## Code Generation
- [x] Verify generated ProffieOS code is valid syntax — confirmed manually, all angle brackets balanced, correct template signatures
- [x] Verify full config.h output compiles — PASSED via arduino-cli, 192KB / 507KB flash (37%)
- [x] Fixed: codegen now emits `maxLedsPerStrip` constant (required by ProffieOS) and `track` field in Preset struct

## SD Card Export
- [ ] Test ZIP download structure
- [ ] Test card writer with real SD card
- [ ] Verify written config works on physical saber

## Saber Hardware Test
- [ ] Boot with new config
- [ ] Ignition works
- [ ] Blade color correct
- [ ] Effects (clash, lockup, blast) work
- [ ] Existing presets survive

---

# Launch-Readiness QA Sweep (2026-04-18 onward)

Running per `docs/LAUNCH_QA_PLAN.md`. Bugs tiered as Blocker / Quick / Medium / Large; launch severity as SHIP-BLOCKER / SHIP-WITH-NOTE / POST-LAUNCH.

## P0 — Automated baseline (2026-04-18)

- [x] typecheck: clean (11 tasks, 0 errors)
- [x] tests: 402 web tests + engine/codegen suites pass (21 web test files)
- [x] lint: placeholder (eslint not configured — known-deferred per CLAUDE.md)

**Finding (resolved in-session, not a bug):** First typecheck + test run failed with `Cannot find module 'msgpackr'` / `'pako'` / `'qrcode'` / `'bs58'`. Packages ARE declared in `apps/web/package.json` but node_modules was stale. `pnpm install` (added 39, removed 62) recovered. No code change needed. Noting here so future sessions know to run `pnpm install` after every branch-switch involving dependency changes.
