# KyberStation — Launch-Readiness QA Plan

**Status:** v1 draft · Session: 2026-04-18 onward
**Purpose:** Full front-to-back QA sweep before public launch.
**UX grounding:** `docs/UX_NORTH_STAR.md` (Ableton / Vital / Linear / Expanse / Mutable as primaries; SWTOR / ChatGPT / Notion / v0.dev / stock shadcn as anti-refs).

This doc supersedes `docs/QA_TEST_PLAN.md` for the launch sweep. The legacy doc stays for historical reference.

---

## 0. How to use this plan

- **Sequential by phase.** Complete a phase, triage bugs, move on.
- **Per-test format:** `Do → See → Report (A/B/C/D + notes)`.
- **Roles:**
  - **Claude runs** automated steps and documents findings.
  - **Ken drives** UI tests, provides visual + UX observations.
- **Bug log:** Claude appends findings to `docs/TESTING_NOTES.md` inline.
- **Branch:** `test/launch-readiness-2026-04-18`. Fix commits land here; we split by area into PRs at session end.

## 1. Triage tiers (when a bug surfaces)

| Tier | Criteria | Handling |
|---|---|---|
| **Blocker** | Crash, breaks downstream tests, data-loss | Fix immediately before continuing |
| **Quick** | <5 min fix, mechanical | Fix inline, commit at phase end |
| **Medium** | 5–30 min, focused scope | Batch at phase end, commit before next phase |
| **Large** | >30 min, design decision, new scope | Log to `docs/TESTING_NOTES.md`, defer |

## 2. Launch-blocker rubric

| Severity | Definition | Examples |
|---|---|---|
| **SHIP-BLOCKER** | Breaks core journey (land → edit → save → export), crashes, data loss, visible security issue | Canvas won't render, preset save throws, config.h export malformed, saber fails to boot |
| **SHIP-WITH-NOTE** | Cosmetic, edge-case, non-core, documented workaround | Minor layout issue at 1100px, one tooltip offset, rare style combo looks off |
| **POST-LAUNCH** | Enhancement, new feature, deep refactor, perf polish beyond acceptable | New style type, bundle-size optimisation, refactor |

Ship-blockers must be fixed before launch. Ship-with-note items can land in a `v0.12.x` patch within a week. Post-launch items move to a roadmap doc.

## 3. Reporting format

For every test:

- **A** = works as designed, no issues
- **B** = works but with minor issues (describe)
- **C** = partially broken (describe what fails, what works)
- **D** = completely broken or crashes (describe error)

## 4. Hardware safety protocol

Applies to Phases P24–P28 (physical saber, SD card, WebUSB).

**Before any write:**

1. **Backup current firmware** via WebUSB DFU readback → save `.bin` with date stamp. This is the restore path if anything goes wrong.
2. **Use a test SD card** (not your daily one) for P24.
3. **Keep BOOT-pin DFU recovery procedure open** in a tab (`docs/PROFFIEOS_FLASHING_GUIDE.md`).
4. **Use a saber that is not mission-critical** if available.
5. **Checklist from `docs/HARDWARE_VALIDATION_TODO.md`** governs WebUSB. Don't skip phases.

**Abort signals:**

- Unexpected USB disconnect mid-flash → stop, inspect, do not retry blindly.
- Readback verification mismatch → do not proceed to write. Diagnose.
- Saber fails to boot after flash → use BOOT-pin recovery, flash the backup `.bin`.

---

# PHASES

## P0. Automated baseline

**Objective:** Green typecheck, lint, and test suite before any manual work.

**Claude runs:**

```bash
pnpm -w typecheck
pnpm -w lint
pnpm -w test
```

**Pass:** A = all green. B = warnings only. C = specific test failures (triage). D = build broken.

**Fix before proceeding if C or D.**

---

## P1. Pre-flight smoke (routes)

**Objective:** All top-level routes load in dev without console errors.

**Claude runs:** `preview_start` on dev server, visit in sequence:

- `/` — landing
- `/editor` — main workbench
- `/gallery` — presets
- `/docs` — built-in docs
- `/m` — mobile companion

For each: capture `preview_screenshot`, scan `preview_console_logs` for errors, scan `preview_network` for 4xx/5xx.

**Pass:** A = all 5 routes load, zero console errors. B = loads with warnings. C = one route broken. D = multiple routes broken.

---

## P2. First impressions — landing page (UX-heavy)

**Objective:** Landing page holds the UX north star, survives the "generic AI app" test.

**Ken drives (cold, full-screen Chrome):** `/`

| # | Do | See | UX anchor |
|---|---|---|---|
| T2.1 | Land on `/` | Live blade hero animates, preset rotation cycles | Vital (live previews), BR2049 (reveal treatment) |
| T2.2 | Read value strip | Confident, humble tone. Not corporate SaaS. | §3 anti-ref: v0.dev, Notion |
| T2.3 | Click "Open editor" | `/editor` loads clean | Linear (<200ms micro-interaction) |
| T2.4 | Click "Read docs" | `/docs` loads, renders expanded content | Andor (monospace data) |
| T2.5 | Scroll to release strip | Recent CHANGELOG entries readable | Mutable (typographic restraint) |
| T2.6 | Scroll to footer | Hobby-project framing + GitHub link + license | UX_NORTH_STAR §5 house style |
| T2.7 | **"Generic AI app" test** — would a Proffie-forum regular say "someone who cares about lightsabers made this," or "another Next.js dashboard"? | **Only the first answer is acceptable.** | §3 D-refs |

**Ken reports:** A/B/C/D per row + free-form UX observations. What felt off? What felt right?

---

## P3. Editor core rendering

**Objective:** Workbench loads, canvas renders hilt + blade + pixel strip + RGB graph.

| # | Do | See | Report |
|---|---|---|---|
| T3.1 | `/editor` cold load | Hilt + blade + pixel strip + RGB graph all visible | A/B/C/D |
| T3.2 | Watch canvas at rest | Live-data breathes (not frozen) | Expanse rhythm check |
| T3.3 | Press Ignite | Ignition animates, blade extends, button becomes Retract | A/B/C/D |
| T3.4 | Press Retract | Blade retracts with animation | A/B/C/D |
| T3.5 | Zoom in/out via canvas +/- buttons | Canvas scales smoothly, no clipping | A/B/C/D |

---

## P4. Blade styles (29 total)

**Objective:** Every style renders without crash and looks visually distinct.

**Method:** Design tab → Style dropdown. Cycle through all 29. Ignite after each.

List to test (from `packages/engine/src/styles/`):

Stable, Unstable, Fire, Pulse, Rotoscope, Gradient, Photon, Plasma, CrystalShatter, Aurora, Cinder, Prism, Painted, ImageScroll, Gravity, DataStream, Ember, Automata, Helix, Candle, Shatter, Neutron, Torrent, Moire, Cascade, Vortex, Nebula, Tidal, Mirage

**Per style:** Ignite → note any crashes, visual artifacts, or identical-looking output with other styles.

**Pass:** A = all 29 visually distinct, none crash. B = minor visual overlap between 2–3. C = N styles crash or render incorrectly (list). D = cannot switch styles.

---

## P5. Effects (21 total)

**Objective:** All effects trigger cleanly.

**Method:** Ignite, then press each effect button. Observe.

List (from `packages/engine/src/effects/`):

Clash, Lockup, Blast, Drag, Melt, Lightning, Stab, Force, Shockwave, Scatter, Fragment, Ripple, Freeze, Overcharge, Bifurcate, Invert, GhostEcho, Splinter, Coronary, GlitchMatrix, Siphon

**Also test:** rapid-fire triple Clash (overlap behavior).

**Pass:** A = all 21 work, overlap cancels old one-shots cleanly. B = 1–2 minor issues. C = N fail (list). D = all broken.

---

## P6. Ignition + Retraction animations

**Objective:** All 19 ignitions + 13 retractions produce visually distinct animations.

**Ignitions (19):** Standard, Scroll, Spark, Center, Wipe, Stutter, Glitch, Crackle, Fracture, FlashFill, PulseWave, DripUp, + 7 more (see `packages/engine/src/ignition/`)

**Retractions (13):** Standard, Scroll, FadeOut, CenterIn, Shatter, Dissolve, FlickerOut, Unravel, Drain, + 4 more

**Per type:** change dropdown, ignite or retract, verify animation is distinct and completes.

**Pass:** A = all distinct. B = some near-duplicates (list). C = N fail or look identical. D = dropdown broken.

---

## P7. Colors

**Objective:** Base / clash / lockup / blast color controls work; hex input works; naming math surfaces human-readable names.

| # | Do | See | Report |
|---|---|---|---|
| T7.1 | Change Base RGB sliders | Blade updates live | A/B/C/D |
| T7.2 | Type a hex into Base input | Blade updates + sliders sync | A/B/C/D |
| T7.3 | Change Clash color, trigger Clash | Clash flash uses new color | A/B/C/D |
| T7.4 | Change Lockup color, trigger Lockup | Lockup uses new color | A/B/C/D |
| T7.5 | Drag picker through a gradient | Color name changes, never repeats verbatim on adjacent values, never shows "Unknown Crystal" | v0.11.2 naming math check |
| T7.6 | Try 5 distinctive colors (pure red, pure green, pure blue, #CC3333, off-white) | Each gets a distinctive in-universe name | A/B/C/D |

---

## P8. Presets + Gallery

**Objective:** Gallery browses, filters, loads, saves correctly.

| # | Do | See | Report |
|---|---|---|---|
| T8.1 | Open `/gallery` or Gallery tab | Presets render with tiles, names, live mini-previews | A/B/C/D |
| T8.2 | Use era filter (Prequel, OT, Sequel, etc.) | List filters correctly | A/B/C/D |
| T8.3 | Use style filter | List filters correctly | A/B/C/D |
| T8.4 | Click 5 different character presets | Each loads, blade updates to match | A/B/C/D |
| T8.5 | Load Obi-Wan ANH | Blade is iconic Azure + standard ignition + AudioFlicker rotoscope | Compare to film |
| T8.6 | Load Kylo Ren | Blade is unstable + stutter ignition + crackling | Compare to film |
| T8.7 | Load Vader | Blade is stable + standard ignition + deep red | Compare to film |
| T8.8 | Save a custom blade to My Presets | Persists in IndexedDB, reappears on reload | A/B/C/D |

---

## P9. Sound fonts + pairing

**Objective:** Font library browses, auto-pairing suggestions make sense.

| # | Do | See | Report |
|---|---|---|---|
| T9.1 | Open Audio / SoundFont panel | Font entries + preview affordances render | A/B/C/D |
| T9.2 | Preview a font (click play) | Audio plays through Web Audio API | A/B/C/D |
| T9.3 | Load Kylo Ren preset, check pairing label | Shows "Recommended" or "Compatible" | fontPairing.ts |
| T9.4 | Change blade to Fire style, watch pairing | Suggestions update to aggressive/crackling fonts | A/B/C/D |
| T9.5 | Change font folder name in output preset list | Change propagates or is explicitly labeled | known-open per TESTING_NOTES |

---

## P10. Saber profiles + card preset composer

**Objective:** Profiles save, recall, and compose into card-preset templates.

| # | Do | See | Report |
|---|---|---|---|
| T10.1 | Create a new Saber Profile | Profile appears in list | A/B/C/D |
| T10.2 | Assign blade config to profile | Config persists | A/B/C/D |
| T10.3 | Build a card-preset template (multi-slot) | Template composes correctly | A/B/C/D |
| T10.4 | Load the 4 built-in card templates | All 4 load without error | A/B/C/D |

---

## P11. Motion sim + Timeline + Layer stack

**Objective:** Motion simulation panels + timeline editor + layer compositor function.

| # | Do | See | Report |
|---|---|---|---|
| T11.1 | Move swing-speed slider | Blade reacts (SwingSpeed function) | A/B/C/D |
| T11.2 | Move blade-angle slider | Blade reacts | A/B/C/D |
| T11.3 | Open Timeline panel | Events list renders, easing curves visible inline | A/B/C/D |
| T11.4 | Adjust an easing curve on an event | Preview updates | A/B/C/D |
| T11.5 | Open LayerStack | Layers render, identity colors, solo/mute/bypass work | Ableton device chain |

---

## P12. Visualization layers + pixel debug

**Objective:** All 13 analysis layers toggle, pixel debug overlay works.

| # | Do | See | Report |
|---|---|---|---|
| T12.1 | Open VisualizationToolbar | 13 layer toggles visible | A/B/C/D |
| T12.2 | Toggle each layer on one at a time | Each produces a visible overlay | A/B/C/D |
| T12.3 | Hover a pixel with debug overlay on | Per-pixel values appear | A/B/C/D |
| T12.4 | Pin a pixel value | Pin persists as tile | A/B/C/D |
| T12.5 | Switch to Clean Mode | Pixel strip + RGB graph hide, saber-only view | A/B/C/D |

---

## P13. Storage budget + Power dashboard

| # | Do | See | Report |
|---|---|---|---|
| T13.1 | Open StorageBudgetPanel | Gauge shows flash % used | A/B/C/D |
| T13.2 | Cross a threshold (load many presets into card) | `criticalStateChange` primitive fires | UX §7 motion |
| T13.3 | Open PowerDashboard | LED count, estimated power draw shown | A/B/C/D |
| T13.4 | StatusBar always visible bottom | Profile / connection / preset / storage % | PFD discipline |

---

## P14. Responsive layouts

**Objective:** Layout adapts cleanly at every breakpoint with no overlap.

| # | Width | Expect | Report |
|---|---|---|---|
| T14.1 | 1440px+ (wide desktop) | Full workbench, all toolbars visible | A/B/C/D |
| T14.2 | 1200–1439 | Minor adapt, no overlap | A/B/C/D |
| T14.3 | 1024–1199 | Tablet-adjacent, some controls collapse | A/B/C/D |
| T14.4 | 768–1023 | Tablet | A/B/C/D |
| T14.5 | 600–767 | Mobile border | A/B/C/D |
| T14.6 | <600 | `/m` compact view, touch-friendly | A/B/C/D |

---

## P15. Workbench layout (drag-drop, columns, presets, collapse)

**Objective:** 1–4 column workbench, drag-drop between columns, layout presets save/load.

| # | Do | See | Report |
|---|---|---|---|
| T15.1 | Switch column count 1→2→3→4 | Layout reflows | A/B/C/D |
| T15.2 | Drag a panel to another column | Drops cleanly | A/B/C/D |
| T15.3 | Collapse a panel | Stays collapsed, shows stub | A/B/C/D |
| T15.4 | Save a layout preset | Persists | A/B/C/D |
| T15.5 | Load a different preset | Layout snaps to it | A/B/C/D |

---

## P16. Settings modal

| # | Do | See | Report |
|---|---|---|---|
| T16.1 | Open Settings | Modal appears, sections collapsible | A/B/C/D |
| T16.2 | Switch perf tier | Setting persists, blade engine respects it | A/B/C/D |
| T16.3 | Toggle Aurebesh | UI chrome switches fonts where configured | A/B/C/D |
| T16.4 | Toggle UI sounds | Click sounds on toggle/etc play or mute | A/B/C/D |
| T16.5 | Open Feedback section | GitHub bug-report + feature-request links render | A/B/C/D |
| T16.6 | Click "Report a bug" | Opens GitHub issue template in new tab with label prefilled | A/B/C/D |

---

## P17. Undo/redo + Pause

| # | Do | See | Report |
|---|---|---|---|
| T17.1 | Change a color, press ⌘Z | Previous color restores | A/B/C/D |
| T17.2 | ⌘⇧Z | Redo | A/B/C/D |
| T17.3 | Walk through 50+ actions, then undo to bottom | Clean rewind | A/B/C/D |
| T17.4 | Press Space | Animation pauses globally | A/B/C/D |
| T17.5 | Press Space again | Resumes | A/B/C/D |

---

## P18. Kyber Code share links

**Objective:** Both share URL formats round-trip correctly.

| # | Do | See | Report |
|---|---|---|---|
| T18.1 | Build a blade, click Share, copy URL | URL of form `/editor?s=<glyph>` | A/B/C/D |
| T18.2 | Open URL in new tab (incognito) | Same blade config loads | A/B/C/D |
| T18.3 | Try legacy `?config=<base64>` URL | Still loads (backward compat) | A/B/C/D |
| T18.4 | Max-complexity config (custom styles, many effects) | Glyph round-trips without data loss | fuzz check |

---

## P19. Kyber Crystal (v0.12.0)

**Objective:** Three.js Kyber Crystal renders all 5 Forms, 13 animations trigger correctly, QR is scannable.

| # | Do | See | Report |
|---|---|---|---|
| T19.1 | Open "My Crystal" panel | Crystal renders with PBR + bloom | A/B/C/D |
| T19.2 | Switch between all 5 Forms (Natural, Bled, Cracked, Obsidian-Bipyramid, Paired) | Each visually distinct | A/B/C/D |
| T19.3 | Trigger each of 13 animations (from list) | Each plays cleanly | list any broken |
| T19.4 | Scan QR with phone camera | Resolves to the current `?s=<glyph>` URL | A/B/C/D |
| T19.5 | Click "Copy Glyph" | Short string in clipboard | A/B/C/D |
| T19.6 | Go Fullscreen from ACCENT_TOPOLOGY blade | Camera zooms into Crystal Chamber | A/B/C/D |
| T19.7 | Save crystal card snapshot | PNG downloads with crystal + bottom-right accent | A/B/C/D |

---

## P20. Saber Card snapshot

**Objective:** 1200×675 PNG exports with blade + hilt + crystal accent.

Currently placeholder hero area; verify existing pipeline works and frame it correctly in UI (placeholder is acknowledged).

| # | Do | See | Report |
|---|---|---|---|
| T20.1 | Trigger card export | PNG downloads, dimensions correct | A/B/C/D |
| T20.2 | Inspect PNG | Crystal + label + placeholder hero area | A/B/C/D |

---

## P21. Code output

**Objective:** Generated ProffieOS code is syntactically valid, exports full `config.h`.

| # | Do | See | Report |
|---|---|---|---|
| T21.1 | Open Output / Code tab | Code renders in JetBrains Mono | Andor typography |
| T21.2 | Inspect single-style mode | `StylePtr<InOutTrL<...>>` with matched brackets | A/B/C/D |
| T21.3 | Switch to Full Config mode | `CONFIG_TOP`, `CONFIG_PRESETS`, `CONFIG_BUTTONS` blocks present | A/B/C/D |
| T21.4 | Copy code to clipboard | Button works | A/B/C/D |
| T21.5 | Paste into Arduino IDE, compile | Compiles without errors | A/B/C/D (local compile already verified historically; re-verify after any codegen change) |

---

## P22. C++ import + parser

**Objective:** Paste a ProffieOS style → parse → apply → visual preview matches input.

| # | Do | See | Report |
|---|---|---|---|
| T22.1 | Paste Fett263 preset code | Parser accepts, shows AST | A/B/C/D |
| T22.2 | Click Apply | Blade updates to match | A/B/C/D |
| T22.3 | Round-trip: import → emit → import again | Output identical | A/B/C/D |
| T22.4 | Paste intentionally malformed code | Shows clear parse-error with location | A/B/C/D |

---

## P23. ZIP export

| # | Do | See | Report |
|---|---|---|---|
| T23.1 | Click Download ZIP | ZIP downloads | A/B/C/D |
| T23.2 | Inspect ZIP | `config.h` at root + font folders with correct names | A/B/C/D |
| T23.3 | Multi-preset ZIP | All presets present, correct numbering | A/B/C/D |

---

## P24. SD Card write (hardware)

**Prereq:** Test SD card inserted (not daily card).

| # | Do | See | Report |
|---|---|---|---|
| T24.1 | Click Write to Card, pick test SD | Detects "ProffieOS" card, lists existing presets | A/B/C/D |
| T24.2 | Enable backup → write preset | Backup created, new preset written, verification passes | A/B/C/D |
| T24.3 | Remove & reinsert | Files readable, config.h parses | A/B/C/D |

---

## P25. Physical saber boot via SD swap

**Prereq:** Backup card set aside. Known-good saber.

| # | Do | See | Report |
|---|---|---|---|
| T25.1 | Insert test SD into saber, power on | Boot sound plays | A/B/C/D |
| T25.2 | Ignite via button | Blade ignites correctly | A/B/C/D |
| T25.3 | Clash, Lockup, Blast via buttons | All effects fire | A/B/C/D |
| T25.4 | Retract | Blade retracts | A/B/C/D |
| T25.5 | Cycle through other presets on card | All work | A/B/C/D |

---

## P26. WebUSB connect (read-only, no flash)

**Prereq:** Hardware safety protocol complete. Daily driver firmware backed up.

Per `docs/HARDWARE_VALIDATION_TODO.md` Phase A.

| # | Do | See | Report |
|---|---|---|---|
| T26.1 | Plug saber into USB, DFU mode | OS sees device | A/B/C/D |
| T26.2 | Click Connect in FlashPanel | `DfuDevice` attaches, descriptors parsed | A/B/C/D |
| T26.3 | Click Readback current firmware | `.bin` downloads **— save this as restore path** | A/B/C/D |
| T26.4 | Disconnect and reconnect | Reconnect clean | A/B/C/D |

---

## P27. WebUSB dry-run (protocol exercise, no actual write)

Per `docs/HARDWARE_VALIDATION_TODO.md` Phase B.

| # | Do | See | Report |
|---|---|---|---|
| T27.1 | Dry-run flash with dummy `.bin` | UI walks connect → erase (dry) → write (dry) → verify (dry) | A/B/C/D |
| T27.2 | Dry-run verify readback | Mocked verify passes | A/B/C/D |
| T27.3 | Abort mid-flash (test cancel button) | Clean abort, no partial write | A/B/C/D |

---

## P28. WebUSB real flash (saber firmware update)

**Only after P26 + P27 pass cleanly. Backup `.bin` in hand.**

Per `docs/HARDWARE_VALIDATION_TODO.md` Phase C.

| # | Do | See | Report |
|---|---|---|---|
| T28.1 | Flash bundled ProffieOS V3-standard `.bin` | Progress completes, verification passes | A/B/C/D |
| T28.2 | Power cycle saber | Boots clean | A/B/C/D |
| T28.3 | Ignite, all effects work, retract | All green | A/B/C/D |
| T28.4 | Flash custom `.bin` via file upload | Same result | A/B/C/D |
| T28.5 | Flash the backup `.bin` from T26.3 | Saber restored | A/B/C/D |

**If any test D: stop, do not retry blindly.** Use BOOT-pin DFU recovery to restore backup.

---

## P29. Accessibility

| # | Do | See | Report |
|---|---|---|---|
| T29.1 | Navigate editor with Tab only | Every interactive element reachable, focus ring visible | A/B/C/D |
| T29.2 | OS reduced-motion ON | Ambient animations stop; blade still animates when ignited (content > chrome) | A/B/C/D |
| T29.3 | Open VoiceOver / screen reader | Key labels read correctly | A/B/C/D |
| T29.4 | Color-contrast scan on key surfaces | WCAG AA (4.5:1) body text, 3:1 UI; log failures | A/B/C/D |
| T29.5 | StatusSignal glyphs visible on status colors | Accessibility redundancy works (●/◉/✓/▲/⚠/✕) | v0.11.1 a11y check |
| T29.6 | Colorblind theme | All status/era/faction indicators still distinguishable | A/B/C/D |

---

## P30. Performance

| # | Do | Target | Report |
|---|---|---|---|
| T30.1 | Cold load `/` | LCP < 2.5s on typical connection | A/B/C/D |
| T30.2 | Editor FPS counter | 60 fps idle, 45+ during heavy animation | A/B/C/D |
| T30.3 | Switch styles rapidly 20x | No memory leak, no FPS degradation | A/B/C/D |
| T30.4 | Max LED count (512+) | Stays above 30 fps | A/B/C/D |

---

## P31. Cross-browser matrix

For each browser, run a shortlist: `/` loads, `/editor` ignites a blade, gallery loads a preset, WebUSB panel connects (optional — only Chromium-family supports).

| Browser | Version | Desktop | Mobile | Notes |
|---|---|---|---|---|
| Chrome | latest | ✓ | ✓ (Android) | WebUSB ✓ |
| Brave | latest | ✓ | — | WebUSB ✓ |
| Edge | latest | ✓ | — | WebUSB ✓ |
| Safari | latest | ✓ | ✓ (iOS) | WebUSB ✗ (expected, document) |
| Firefox | latest | ✓ | — | WebUSB ✗ (expected, document) |

**Pass:** A = all load editor + gallery cleanly, WebUSB works where supported. B = minor visual diff. C = one browser broken. D = multiple browsers broken.

---

## P32. Onboarding / SaberWizard / first-run

| # | Do | See | Report |
|---|---|---|---|
| T32.1 | Wipe IndexedDB, reload `/editor` | First-run experience (Wizard?) triggers | A/B/C/D |
| T32.2 | Complete Wizard (3 steps: archetype → color → vibe) | Produces complete working style | A/B/C/D |
| T32.3 | `firstIgnition()` ceremony plays | Dim chrome + ignite + audio + restore | UX §7 motion |

---

## P33. Docs page

| # | Do | See | Report |
|---|---|---|---|
| T33.1 | Open `/docs` | Expanded reference renders | A/B/C/D |
| T33.2 | Navigate docs sections | All sections reachable | A/B/C/D |
| T33.3 | Links to CHANGELOG / ARCHITECTURE / etc | Work | A/B/C/D |

---

## P34. Mobile route `/m`

| # | Do | See | Report |
|---|---|---|---|
| T34.1 | Open `/m` on phone | 12 curated presets in swipeable grid | A/B/C/D |
| T34.2 | Tap a preset | Preview + "Open in editor" deep link | A/B/C/D |
| T34.3 | Swipe navigation | Smooth, no jank | A/B/C/D |

---

## P35. Error states + skeletons

| # | Do | See | Report |
|---|---|---|---|
| T35.1 | Simulate gallery load failure (offline/devtools) | `<ErrorState>` renders with retry | A/B/C/D |
| T35.2 | Load heavy preset | Skeleton during load, not blank | A/B/C/D |
| T35.3 | Malformed import | `parse-failed` variant fires | A/B/C/D |

---

## P36. UX discipline sweep vs UX_NORTH_STAR.md

**This is the subjective "does it feel like KyberStation, not like v0.dev" sweep.**

Ken walks through the editor with the north star in the other eye. For each section below, screenshot + note:

| Panel / surface | North-star anchor | Sweep question |
|---|---|---|
| WorkbenchLayout | Resolve + Blender + Ableton | Single-screen discipline — do any frames shift position between pages? |
| BladeCanvas | Serum + Resolume + Diva | Hero occupies 40–55% of workbench; always animating; glow is meaningful (blade emissive, not chrome) |
| LayerStack | Ableton + SSL + Mutable | Identical-shape rows; typographic restraint; SSL color grammar |
| StylePanel / EffectPanel | Figma + TouchDesigner + Blender | 24–28px row rhythm; drag-to-scrub on numerics; collapsible sections |
| PerformanceBar | SSL + Maschine + F1 | Persistent bottom chrome-differentiated; macros present |
| StatusBar | Boeing/Airbus PFD + Andor | Thin, always-visible, never moves, JetBrains Mono |
| ColorPanel | Figma + Severance + Tron | Glow only because blade glows; never chrome glow |
| CodeOutput | Andor + BR2049 + Linear | JetBrains Mono; utilitarian terminal feel |
| PresetGallery | VCV + Savi's + Outer Wilds | Identity-card tiles; live mini-render; author/version/lineage |
| SoundFontPanel | Ableton + Mutable | Navigable tree; JetBrains Mono; waveform previews |
| SaberProfileManager | Linear + SWTOR-inverted + Andor | Character-sheet without SWTOR ornate trim |
| CardWriter | Scarif + Mandalorian forge + Maschine + Boeing | Multi-stage commit ceremony; amber commit lighting |
| SettingsModal | Linear + Blender | Restraint; theme section modeled on Blender Preferences |

**Global questions per Ken:**

1. Does this feel like an instrument-grade workbench, or a SaaS dashboard?
2. Where does it feel most like a KyberStation original?
3. Where does it feel most like stock shadcn / v0.dev?
4. Where does color feel like decoration instead of function?
5. Where is glow used where it shouldn't be?
6. Where is the row rhythm off (not 24–28px)?
7. Where is Inter used for data (should be JetBrains Mono), or vice-versa?

---

## P37. Launch-blocker triage + go/no-go

**Objective:** Decide ship-readiness.

**Claude assembles:**

- Count of SHIP-BLOCKER issues (from `TESTING_NOTES.md`).
- Count of SHIP-WITH-NOTE issues.
- Count of POST-LAUNCH items.

**Ken decides:**

- If SHIP-BLOCKER count = 0: **GO** — tag release, update CHANGELOG, proceed to launch checklist in `docs/LAUNCH_PLAN.md`.
- If SHIP-BLOCKER > 0: **NO-GO** — fix, then re-run affected phases.

---

## Phase completion log

Claude updates this table as each phase completes.

| Phase | Status | Date | Notes |
|---|---|---|---|
| P0 | ✅ | 2026-04-18 | typecheck clean · 402 web tests + engine/codegen suites pass · lint placeholder (known-deferred). Hit a stale-node_modules false failure on first run; `pnpm install` recovered. Logged to TESTING_NOTES.md. |
| P1 | ✅ | 2026-04-18 | 5 routes loaded, zero console errors. 4 findings; all fixed in-session: P1-001/002 stale version strings (unified via `lib/version.ts`, package.json bumped 0.11.0→0.11.3); P1-003 `/gallery` 404 (added redirect to `/editor?tab=gallery`); P1-004 `?tab=X` URL param ignored (wired to `uiStore.setActiveTab` in editor page). All 4 fixes verified end-to-end via preview_eval. |
| P2 | ✅ | 2026-04-18 | Programmatic checks done. **Both P2 findings FIXED:** P2-001 (docs link added to landing footer), P2-002 (RELEASE NOTES target now points to CHANGELOG.md). Hero animation / value-copy tone / generic-AI-app gut-check still pending Ken's foreground-tab check. |
| P3 | ⚠️ | 2026-04-18 | Core functional ✓. T3.1 editor loads, T3.3 Ignite works (cyan default blade), T3.4 Retract works. T3.2 (live-data breathes) + T3.5 (zoom visual) unverifiable from preview due to RAF throttling. No defects. |
| P4 | ✅ | 2026-04-18 | All 29 styles cycled, zero exceptions, zero console errors. Visual distinctness needs Ken's foreground check (RAF throttled in preview). |
| P5 | ✅ | 2026-04-18 | All 14 UI-ribbon effects click cleanly. **FIXED P5-001:** all 7 missing effects added to UI ribbon (Fragment/Bifurcate/GhostEcho/Splinter/Coronary/GlitchMatrix/Siphon). Audit confirmed all 21 engine effects were already fully implemented + registered — purely a UI gap. Engine test coverage grew 408 → 457 tests. |
| P6 | ✅ | 2026-04-18 | All 19 ignitions + 13 retractions clicked without exception or console error. Visual distinctness needs Ken. |
| P7 | ✅ | 2026-04-18 | Naming math working. **FIXED P7-001:** all 23 canon preset buttons synced to namingMath landmark HSL coords. Obi-Wan Blue now → "Obi-Wan Azure" (tier-1 exact), Mace Purple → "Mace Windu Violet", Ahsoka White → "Purified Kyber" (all tier-1 landmark hits). Darksaber left unchanged (no landmark; preset is source of truth for that one). T7.1 slider live-update needs Ken's eye. |
| P8 | ✅ | 2026-04-18 | Gallery renders 186 presets. Tile click + List workflows verified. **FIXED P8-001:** new `presetDetailStore` shares selection across Gallery inline view + standalone workbench "preset-detail" panel. `<ComingSoon/>` placeholder replaced with a real panel (empty state when no selection, full PresetDetail when a tile is clicked). T8.5–T8.7 film-accuracy checks need Ken's eye. |
| P9 | ⚠️ | 2026-04-18 | Audio tab loads cleanly. Font Library + Font Preview + Mixer/EQ + SmoothSwing Config + Effect Presets + Sound Events panels all render. **FIXED inline: FINDING-P9-001 (dev-note visible in UI)** — removed the "These values are ready to wire into audioMixerStore..." block from `SmoothSwingPanel.tsx:434-444`. Typecheck clean post-fix. Font preview/pairing behavior (T9.2–T9.5) needs Ken's eye with actual font loaded. |
| P10 | ⏳ | | |
| P11 | ⏳ | | |
| P12 | ⏳ | | |
| P13 | ⏳ | | |
| P14 | ⏳ | | |
| P15 | ⏳ | | |
| P16 | ✅ | 2026-04-18 | SettingsModal verified: 7 sections + Feedback (4 paths). **FIXED P16-001:** `useBreakpoint` now uses a lazy `useState` initializer reading `window.innerWidth` synchronously when available, SSR-fallback to 'desktop'. 9 regression tests pinning boundaries (0/599/600/1023/1024/1280/1439/1440) and SSR-fallback. Eliminates the first-render-shows-default class of viewport-conditional bugs. |
| P17 | ⏳ | | |
| P18 | ✅ | 2026-04-18 | `/editor?s=CNO.9HAX4ifU3jB5CE1DMR` (real v1 Kyber Glyph) loaded + decoded + applied + URL stripped to `/editor`. Round-trip verified: re-serialized glyph in My Crystal panel matches the original. 22-char base58 format with `CNO.` archetype prefix working. Legacy `?config=<base64>` path not re-tested this session (verified in prior sessions per CLAUDE.md §8). |
| P19 | ✅ | 2026-04-18 | "My Crystal" panel renders 292×292 WebGL2 canvas. Form 1 = "Natural" (default). Animation triggers present: Clash / Saved / Discovery / Attune. Buttons: Save crystal snapshot / Copy glyph / Copy share link. Glyph displays inline: `CNO.9HAX4ifU3jB5CE1DMR`. QR scannable check + all 5 Form switch visual distinction + 13 animation play-through need Ken's foreground eye. |
| P20 | ⏳ | | |
| P21 | ✅ | 2026-04-18 | Output tab loads. Generated ProffieOS C++ renders: `StylePtr<Layers<AudioFlicker<Rgb<0,140,255>, Mix<Int<16384>, Rgb<0,140,255>, White>>>...>`. "Copy to Clipboard" buttons (×2) + "Download .h" + "Export Config" + "Download ZIP" (×2) + "Export BMP" all present. JetBrains Mono font in code block (Andor register per UX North Star). Full config.h mode + Arduino-compile check need Ken's eye. |
| P22 | ⏳ | | |
| P23 | ⏳ | | |
| P24 | ⏳ | | |
| P25 | ⏳ | | |
| P26 | ⏳ | | |
| P27 | ⏳ | | |
| P28 | ⏳ | | |
| P29 | ⏳ | | |
| P30 | ⏳ | | |
| P31 | ⏳ | | |
| P32 | ✅ | 2026-04-18 | Onboarding walkthrough verified: `WELCOME → VISUAL QUALITY → COCKPIT SOUNDS → TYPOGRAPHY → editor`. **FIXED P32-001 (a11y):** both OnboardingFlow and SaberWizard now have `role="dialog"` + `aria-modal` + `aria-labelledby` + ESC/focus-trap/focus-restore via new shared `useModalDialog` hook. T32.2 wizard full step-walk and T32.3 `firstIgnition()` ceremony need Ken's foreground eye. Follow-up: 4 other modals (SaberProfileManager Copy Presets, SplashScreen, PresetGallery/PresetBrowser/AccessibilityPanel, SettingsModal) are now easy wins now that `useModalDialog` exists — logged. |
| P33 | ⏳ | | |
| P34 | ⏳ | | |
| P35 | ✅ | 2026-04-18 | Infra verified: `apps/web/components/shared/ErrorState.tsx` + `Skeleton.tsx` + `LoadingSkeleton.tsx` exist. Consumers: OLEDEditor, CodeOutput, PresetBrowser, CommunityGallery. 4 active `animate-pulse` elements at runtime (live skeletons). Force-error simulation not run from preview. |
| P36 | ⏳ | | |
| P37 | ⏳ | | |

Legend: ⏳ pending · 🚧 in progress · ✅ passed · ⚠️ passed with notes · ❌ blocked
