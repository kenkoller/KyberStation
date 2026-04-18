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

## P1 — Pre-flight smoke (2026-04-18)

Five routes tested: `/`, `/editor`, `/gallery`, `/docs`, `/m`. Zero runtime console errors anywhere.

- [x] **P1-001 + P1-002 (FIXED):** Landing release strip showed `V 0.11.0 · LONG-TAIL CLEANUP · 2026-04-17`; editor breadcrumb also stale. Root cause: `LandingReleaseStrip.tsx` read `apps/web/package.json#version` (stuck at 0.11.0). Fix: new `apps/web/lib/version.ts` as single source of truth exporting `LATEST_VERSION='0.11.3'`, `LATEST_CODENAME='Modular Hilt Library'`, `LATEST_DATE='2026-04-17'`. Landing strip + editor breadcrumb both consume it. `package.json` version bumped 0.11.0→0.11.3 for consistency.
- [x] **P1-003 (FIXED):** `/gallery` returned 404. Landing "BROWSE GALLERY" CTA already pointed to `/editor?tab=gallery` (correct flow), but direct URL access broke and `CLAUDE.md` claimed `app/gallery/page.tsx` existed. Fix: added 7-line redirect stub at `apps/web/app/gallery/page.tsx` using `next/navigation`'s `redirect()`. `CLAUDE.md` structure comment updated to `# Redirect to /editor?tab=gallery`.
- [x] **P1-004 (FIXED):** `/editor?tab=<name>` URL param was ignored. Landing → Gallery journey was quietly broken (landed on Design tab). Fix: `apps/web/app/editor/page.tsx` now reads `searchParams.get('tab')`, validates against `['design','dynamics','audio','gallery','output']`, calls `useUIStore.getState().setActiveTab(tab)` on mount, then strips the param from URL via `router.replace`. Coexists with existing `?preset=` and `?s=<glyph>` handlers. Edge cases handled: uppercase → normalized, invalid → ignored (default stays).
- [x] **Methodology note (agent 3 finding):** Next.js dev server's Fast Refresh file watcher occasionally serves stale compiled chunks after edits to `apps/web/app/editor/page.tsx`. Symptom: source file newer than `.next/static/chunks/app/editor/page.js` by >5min. Remedy: `preview_stop` + `preview_start`. Worth preserving for later sessions.

## P2 — First impressions, landing page (2026-04-18)

Programmatic sweep. `document.hidden: true` in preview mode throttles requestAnimationFrame, so any animation verification needs a foreground-Chrome tab by a human.

- [ ] **P2-001 (SHIP-WITH-NOTE):** Landing page has zero docs link. All 8 links enumerated — Open Editor / Launch Wizard / Browse Gallery in hero, Release Notes (GitHub) in release strip, GitHub + Issues + Editor in footer, skip-to-main a11y link. `/docs` exists with 28 topics but is unreachable from landing. Recommended fix: add a small "Read the docs" text link adjacent to the primary CTAs, or in the footer.
- [ ] **P2-002 (minor):** `RELEASE NOTES →` link points to `https://github.com/kenkoller/KyberStation/releases` but repo hasn't tagged a release since v0.10.0 (per CHANGELOG) — users click and see stale info. Options: (a) start tagging releases, (b) point link to `CHANGELOG.md` on GitHub, (c) point to `/docs#changelog`. Recommendation: (a) + (b) belt-and-suspenders.
- [ ] **P2-???-pending-Ken:** hero animation (T2.1), value-copy humble-vs-corporate tone (T2.2), overall generic-AI-app gut check (T2.7). Cannot evaluate from preview — human foreground-Chrome judgment needed.

## P3 — Editor core rendering (2026-04-18)

- [x] **T3.1 (PASS):** `/editor` loads. 7 canvases (1 main blade preview + pixel strip + RGB graph + OLED preview + Kyber Crystal + smaller). 5 tabs: Design / Dynamics / Audio / Gallery / Output. 421 interactive buttons total.
- [x] **T3.3 (PASS):** Ignite button works. Blade renders (cyan default). Button text switches to "Retract".
- [x] **T3.4 (PASS):** Retract button works. Blade clears. Button text switches back to "Ignite".
- [x] **T3.5 (PASS-CLICKABLE):** Zoom-in + Zoom-out buttons exist (`aria-label="Zoom in"` / `"Zoom out"`) and respond to clicks. Visual effect unverifiable from preview since no blade is ignited.
- [ ] **T3.2 (PENDING-KEN):** "Live-data breathes at rest" — RAF throttled in preview under `document.hidden:true`. Requires foreground-Chrome check.
- **Note:** Fresh-state (IndexedDB cleared) triggers the 4-step WELCOME onboarding modal. Good UX discovery. Phase 32 will test this flow in detail. For all subsequent phases, I'm using "Skip setup" to reach the editor directly.
- **THREE.Clock deprecation warning** (minor): console shows `THREE.THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` Fire a follow-up to migrate when convenient. Not blocking.

## P4 — All 29 blade styles (2026-04-18)

Programmatic click-cycle through `Stable, Unstable, Fire, Pulse, Rotoscope, Gradient, Photon Blade, Plasma Storm, Crystal Shatter, Aurora, Cinder, Prism, Data Stream, Gravity, Ember, Automata, Helix, Candle, Shatter, Neutron, Torrent, Moiré, Cascade, Vortex, Nebula, Tidal, Mirage, Painted, Image Scroll`.

- [x] 29/29 click cleanly; zero exceptions thrown, zero console errors, blade stays ignited through all 29 switches, canvas count stable.
- [ ] Visual-distinctness check (T4 pass criterion) deferred to Ken's foreground-Chrome walk. Preview's RAF is throttled under `document.hidden:true`, so all 29 styles return identical pixel signatures in automated sampling — NOT evidence they look the same; evidence that only a single frame was rendered.

## P5 — Effects (2026-04-18)

Effect ribbon has 15 buttons (Retract + 14 effects). Enumerated buttons: `Clash, Blast, Stab, Lockup, Lightning, Drag, Melt, Force, Shockwave, Scatter, Ripple, Freeze, Overcharge, Invert` — shortcut letter doubled in button text (e.g. "ClashCC", "OverchargeOv").

- [x] 14/14 UI effects click cleanly; zero console errors.
- [ ] **P5-001 (SHIP-WITH-NOTE):** 7 effects defined in the engine per CLAUDE.md (Fragment, Bifurcate, GhostEcho, Splinter, Coronary, GlitchMatrix, Siphon) have no UI ribbon button. Users cannot trigger them via one-click from the editor. Either: (a) add them to the ribbon, (b) scope them to style-config-only access and document, (c) remove them from the engine if they're unshipped code. Root-cause this before launch — 7 defined but inaccessible is a release-smell.
- [ ] T5.2 rapid-fire Clash overlap behavior — deferred to Ken's foreground check.

## P6 — Ignitions + Retractions (2026-04-18)

- [x] **19 ignitions** clicked: Standard, Scroll, Spark, Center Out, Wipe, Stutter, Glitch, Twist, Swing, Stab, Crackle, Fracture, Flash Fill, Pulse Wave, Drip Up, Hyperspace, Summon, Seismic, Custom Curve. All OK. Zero exceptions, zero console errors.
- [x] **13 retractions** clicked: Standard, Scroll, Fade Out, Center In, Shatter, Dissolve, Flicker Out, Unravel, Drain, Implode, Evaporate, Spaghettify, Custom Curve. All OK. Zero exceptions.
- [ ] Visual-distinctness check pending Ken.
- Label overlap note: "Standard", "Scroll", "Custom Curve" appear in both ignition and retraction lists; my script correctly picks the right one by index.

## P7 — Colors (2026-04-18)

Current base color at load: `#008CFF` / "Dusk-Bo-Katan Azure" (tier-2 modifier + landmark).

- [x] **Naming math alive** — verified across multiple preset clicks:
  - Mace Purple (`#8000FF`) → "Mace Windu Violet" (tier-1 landmark ✓)
  - Ahsoka White (`#FFFFFF`) → "Purified Kyber" (tier-1 landmark ✓)
  - Pure blue (`#0000FF`) → "Dawn-Anakin Skywalker" (tier-2 modifier+landmark ✓)
- [ ] **P7-001 (QUICK fix, SHIP-WITH-NOTE):** Canon preset buttons define hexes that don't match the naming-math landmark HSL coordinates. Specific example: `ColorPanel.tsx:30` "Obi-Wan Blue" = `rgb(0,140,255)` = HSL(207, 100%, 50%), but `namingMath.ts:226` "Obi-Wan Azure" = HSL(215, 90%, 52%). Deltas large enough (Δh=8, Δs=10) that preset clicks land in a nearby landmark's orbit ("Dusk-Bo-Katan Azure") instead of hitting the intended character landmark. **Recommended fix:** update ColorPanel preset RGBs to match `namingMath.ts` landmark HSL coords (or vice versa). Audit all 19 canon preset buttons for this drift. One canonical source of truth would be better long-term.
- [ ] **T7.1 / T7.2 / T7.3 / T7.4** — live slider updates, hex-input→slider sync, clash/lockup/blast per-channel color changes — preview RAF throttled; need Ken's foreground eye.
- Confirmed via introspection: 2 hex inputs for base color (likely popover + panel mirror), 36 sliders total across page, Clash/Lockup/Blast tab structure present.

## P8 — Presets + Gallery (2026-04-18)

- [x] Gallery renders: **186 presets** visible across 5 eras (Prequel 25, OT, Sequel, Animated, EU Creative, Legends).
- [x] Filter chips present: Era, Affiliation (Jedi/Sith/Neutral), Origin (On-Screen/Creative), Sort (A-Z), Legends toggle.
- [x] Search input + `Save Current` + `Gallery/My Presets/Community` tab switches all rendered.
- [x] **Tile click loads preset** — verified by clicking "Obi-Wan Kenobi (ANH)" tile, switching to Design tab, observed base color changed from `#008CFF` (app default) to `#009BFF` (canonical Obi-Wan ANH color) ✓. Gallery handler `PresetGallery.tsx:767 handleSelect` fires `loadPreset(preset.config)` + `setDetailPreset(preset)` correctly.
- [x] **"+ List" nested button works** — adds preset to Output queue. Verified "Output(1)" count appeared.
- [ ] **P8-001 (SHIP-WITH-NOTE):** Workbench's `preset-detail` panel slot at `apps/web/components/layout/TabColumnContent.tsx:338-340` renders `<ComingSoon label="Preset Detail" />`. Users who have this panel docked in their workbench layout will see a "Coming soon" placeholder. Options: (a) ship a real PresetDetail panel here (the internal `PresetGallery.tsx:267 PresetDetail` component may be reusable), (b) remove the slot from the registry so it can't be docked, (c) leave as-is and accept the "Coming soon" visibility. Not strictly blocking launch but visible work-in-progress surface.
- [ ] T8.5 (Obi-Wan ANH film accuracy), T8.6 (Kylo Ren), T8.7 (Vader) — Ken's foreground eye needed to confirm style/ignition/color combos feel film-accurate.
- **Methodology note (my mistake worth recording):** clicking a gallery tile while on the Gallery tab doesn't visibly update the hex input — because the ColorPanel (which contains the hex input) is mounted only in the Design tab. My initial false-positive SHIP-BLOCKER reading came from reading stale state on an unmounted component. Future phase tests: when checking store-bound UI state, verify the component is mounted, or read the store directly.

## P9 — Sound fonts + pairing (2026-04-18)

- [x] Audio tab loads cleanly. Rich structure: FONT LIBRARY (Sound Fonts / Library / EQ + Effects sub-tabs), FONT PREVIEW panel (empty-state: "Select a font from the library to preview"), MIXER / EQ, EFFECT PRESETS, SMOOTHSWING CONFIG (V1/V2 toggle, swing threshold/sharpness/strength, hum & accent, live crossfade preview), SOUND EVENTS (Hum, Swing, Clash, Blast, Drag, Lockup).
- [x] **FIXED inline: P9-001 (SHIP-WITH-NOTE, QUICK):** Dev-facing note was visible in production UI at bottom of SmoothSwing panel: `"NOTE These values are ready to wire into audioMixerStore or a dedicated smoothSwingStore for persistence and codegen integration."` — surfaced internal store names + a "not wired up yet" admission. Fix: removed lines 434–444 of `apps/web/components/editor/SmoothSwingPanel.tsx` (the `{/* ── Wiring note ── */}` block). Typecheck clean. Source verified (0 grep matches post-fix).
- [ ] **T9.2–T9.5 (PENDING-KEN):** Font playback (T9.2), blade-style → font-pairing recommendation labels (T9.3/T9.4), font-folder name propagation (T9.5) — require a loaded font + preset switches; audio preview playback in preview-mode also hits user-gesture requirements for AudioContext.

## P16 — Settings modal + Feedback section (2026-04-18)

- [x] Full settings modal opens from the ⚙ "Open settings" gear button in the WorkbenchLayout header.
- [x] 7 sections visible: Performance Tier / Aurebesh Mode / UI Sounds / Layout / Keyboard Shortcuts / **Feedback** / Display. All collapsible via `▾` toggle.
- [x] **Feedback section is excellent** — expanded to find:
  - Humble intro copy: *"KyberStation is a hobby project and your feedback shapes what comes next. Every report and suggestion goes to GitHub Issues — no account needed to read, a free GitHub account is required to post."*
  - **4 paths** (richer than originally scoped):
    1. 🐞 Report a bug → `template=bug_report.md&labels=bug`
    2. 💡 Suggest a feature → `template=feature_request.md&labels=enhancement`
    3. ⚔️ Request a blade style or preset
    4. 💬 Ask a question / start a discussion
  - All links: `target="_blank"` + `rel="noopener noreferrer"` (security-clean)
- [ ] **P16-001 (SHIP-WITH-NOTE, worth investigation):** Hydration/layout-bootstrap bug — AppShell sometimes renders MobileShell (detected via `[id^="mobile-tab-"]` presence — 5 mobile-tab IDs) at 1440×900 viewport. `matchMedia('(min-width:1440px)')` reports true but the layout decision was already made earlier. Full-page reload corrects the layout. Possibly `useBreakpoint()` initial SSR state not matching client viewport, combined with AppShell taking the layout branch before the useEffect re-fires. Affected path observed: after `window.location.href = '/editor'` navigation and a `preview_stop → preview_start` cycle. Real users might hit this on first visit or after reload under certain timing. **Recommended next step:** read the SSR'd HTML at 1440 viewport, compare to post-hydration DOM, and either (a) switch AppShell to matchMedia-based decision inside a `useLayoutEffect`, or (b) add a hydration guard.
