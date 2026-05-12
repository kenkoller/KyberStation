# Sidebar IA Audit — 2026-04-27

Audit of the editor's left sidebar groups, MainContent panels, Inspector "Quick Controls" rail, Settings modal, header chrome, and DeliveryRail. Goal: catalog every control, identify duplicates, and recommend a logical order of operations for first-time users.

Reference state: `main` @ `ddaa3b6`, post-v0.14.0 modulation BETA + v1.1 Core overnight landings.

---

## 1. Current sidebar groups + sections

Source: `apps/web/components/layout/Sidebar.tsx` (`GROUPS` array L48–94), `apps/web/stores/uiStore.ts` (`SectionId` union L19–36, `VALID_SECTION_IDS` L361–367), `apps/web/components/layout/MainContent.tsx` (switch L46–60).

| Group | Section ID | Visible label | Panel rendered | File |
|---|---|---|---|---|
| (top link) | — | Gallery → | (route to /gallery) | `Sidebar.tsx` L129–134 |
| **APPEARANCE** | `blade-style` | Blade Style | `<StylePanel/>` | `editor/StylePanel.tsx` |
| APPEARANCE | `color` | Color | `<ColorPanel/>` | `editor/ColorPanel.tsx` |
| **BEHAVIOR** | `ignition-retraction` | Ignition & Retraction | `<IgnitionRetractionPanel/>` | `editor/IgnitionRetractionPanel.tsx` |
| BEHAVIOR | `combat-effects` | Combat Effects | `<EffectPanel/>` | `editor/EffectPanel.tsx` |
| BEHAVIOR | `gesture-controls` | Gesture Controls | `<GestureControlPanel/>` | `editor/GestureControlPanel.tsx` |
| **ADVANCED** | `layer-compositor` | Layer Compositor | `<LayerStack/>` | `editor/LayerStack.tsx` → `layerstack/LayerStack.tsx` |
| ADVANCED | `motion-simulation` | Motion Simulation | `<MotionSimPanel/>` | `editor/MotionSimPanel.tsx` |
| ADVANCED | `hardware` | Hardware | `<HardwarePanel/>` | `editor/HardwarePanel.tsx` |
| ADVANCED | `my-crystal` | My Crystal | `<CrystalPanel/>` | `editor/CrystalPanel.tsx` |
| **ROUTING** (BETA, board-gated) | `routing` | Routing | `<RoutingPanel/>` | `editor/routing/RoutingPanel.tsx` |
| (top link) | `audio` | Audio | `<AudioPanel/>` | `editor/AudioPanel.tsx` |
| (top link) | `output` | Output | `<OutputPanel/>` | `editor/OutputPanel.tsx` |

### Per-section control inventory

#### `blade-style` → `StylePanel`
- 29-style picker (MiniGalleryPicker, 3-col): `stable / unstable / fire / pulse / rotoscope / gradient / photon / plasma / crystalShatter / aurora / cinder / prism / dataStream / gravity / ember / automata / helix / candle / shatter / neutron / torrent / moire / cascade / vortex / nebula / tidal / mirage / painted / imageScroll`
- 4 ColorPickerRow (Base / Clash / Lockup / Blast) — duplicates ColorPanel channels
- ParameterBank (7 quick-access sliders + 7 grouped accordions)
- GradientBuilder mount
- GradientMixer mount
- BladePainter mount (when style=`painted`)
- ImageScrollPanel (when style=`imageScroll`)
- Randomizer (style-restricted variant)

#### `color` → `ColorPanel`
- 4 channel buttons (Base / Clash / Lockup / Blast)
- HSL sliders + RGB sliders + hex input + readout
- `COLOR_PRESETS` (24 canon character colors: Jedi/Sith/Neutral)
- Color harmony picker (`getHarmonyColors`)
- Auto-suggest clash color (complementary)
- GradientBuilder (rendered for Base channel only): linear/smooth/step interpolation, stops bar, click-to-add stops, drag-to-reposition

#### `ignition-retraction` → `IgnitionRetractionPanel`
- 19-ignition MiniGalleryPicker: `standard / scroll / spark / center / wipe / stutter / glitch / twist / swing / stab / crackle / fracture / flash-fill / pulse-wave / drip-up / hyperspace / summon / seismic / custom-curve`
- Ignition speed slider (100–2000ms)
- 13-retraction MiniGalleryPicker: `standard / scroll / fadeout / center / shatter / dissolve / flickerOut / unravel / drain / implode / evaporate / spaghettify / custom-curve`
- Retraction speed slider (100–3000ms)

#### `combat-effects` → `EffectPanel`
- Same 19-ignition + 13-retraction MGPs (LITERAL DUPLICATE of `IgnitionRetractionPanel` — same `IGNITION_STYLES` / `RETRACTION_STYLES` source, same MGP wiring)
- 24+ effect parameter sliders: clash color/brightness/decay, blast color/brightness/decay/spatial position, lockup parameters, drag/melt/lightning/stab parameters
- Effect log

#### `gesture-controls` → `GestureControlPanel`
- 5 prop file picker: Fett263 Buttons / SA22C / BC / Shtok / Default (Fredrik)
- Gesture-define toggles (Fett263-only): swing-on, twist-on, stab-on, thrust-on, etc.
- Button action map reference

#### `layer-compositor` → `LayerStack`
- Add Layer dropdown (5 layer types: blast, clash, lockup, drag, AlphaL)
- Layer rows (sortable list, each with thumbnail + bypass toggle + remove)
- Per-layer config panel (selected layer)

#### `motion-simulation` → `MotionSimPanel`
- Swing Speed slider (0–100, drives `motionSim.swing`)
- Blade Angle slider (0–100, mapped to ±)
- Twist Angle slider
- Sound Level / Battery Level / additional motion inputs

#### `hardware` → `HardwarePanel`
- Board picker (`BoardPicker` inline variant — duplicates StatusBar's BoardPicker chip + DeliveryRail's PROFILE segment glyph + SaberWizard Step 1)
- Topology: 5 options (Single / Staff / Crossguard / Triple / Inquisitor)
- Blade Length: 6 options (20" / 24" / 28" / 32" / 36" / 40")
- Strip Configuration: 5 options (1–5 strips)
- LED count override
- Brightness slider (drives `uiStore.brightness`)
- Power Draw live readout (RadialGauge + per-channel R/G/B + battery preset selector + runtime estimate + warnings)

#### `my-crystal` → `CrystalPanel`
- 3D Three.js crystal viewer
- Layout dropdown (16:9 / OG / Instagram / Story)
- Theme dropdown (Deep Space / Light / Imperial / Jedi / Pure Black)
- GIF variant toggle (Idle / Ignition cycle)
- Save crystal PNG / Save share card / Save share GIF buttons
- Animation trigger row (Clash / Lockup / Saved / Discovery / Attune)

#### `routing` → `RoutingPanel` (board-gated, BETA)
- ModulatorPlateBar — 11 plates (`swing / sound / angle / time / clash / twist / battery / lockup / preon / ignition / retraction`)
- BindingList (active routing rows with combinator + amount + bypass)
- RecipePicker (11 starter recipes, including breathing-blade, heartbeat-pulse, battery-saver)
- AddBindingForm (manual source/target/combinator dropdowns)
- ExpressionEditor popover (math formula UI per binding)

#### `audio` → `AudioPanel` (ReorderableSections)
- Sound Fonts section: SoundFontPanel (font browser, library, scoring, audio mixer with EQ + 8 effects)
- Effect Sequencer section: TimelinePanel

#### `output` → `OutputPanel` (ReorderableSections)
- Preset List section: PresetListPanel
- Configuration Summary (style / topology / colors / ignition / retraction / LEDs / board)
- Generated Code: CodeOutput (parser + emitter + apply round-trip + share URL + QR)
- Export to Card: CardWriter
- OLED Preview (collapsed by default)
- **Saber Profiles: SaberProfileManager** (collapsed by default, character-sheet hero, profile switcher, prop card configs)

---

## 2. Inspector "Quick Controls" overlap

Source: `apps/web/components/editor/Inspector.tsx` L36–71.

The Inspector is a permanently-mounted ~320px column to the LEFT of the blade canvas — every section view above is reachable AT THE SAME TIME as Quick Controls.

| Quick Controls surface | Quick implementation | Deep section duplicate |
|---|---|---|
| ActionRow: **Surprise Me** + **Undo** | `useSurpriseMe` hook | Randomizer panel (mounted inside StylePanel; was a standalone slot pre-OV3) |
| **QuickColorChips** — 8 canon colors + Custom | `quick/QuickColorChips.tsx` | `color` → ColorPanel (`COLOR_PRESETS` + HSL/RGB/hex/harmony/gradient — full editor) |
| **QuickIgnitionPicker** — same 19-ignition catalog + ms slider | `quick/QuickIgnitionPicker.tsx` (consumes `IGNITION_STYLES` from `lib/transitionCatalogs.ts`) | `ignition-retraction` → IgnitionRetractionPanel (same catalog) AND `combat-effects` → EffectPanel (same catalog AGAIN) |
| **QuickRetractionPicker** — same 13-retraction catalog + ms slider | `quick/QuickRetractionPicker.tsx` | `ignition-retraction` AND `combat-effects` (triple-mounted) |
| **ParameterBank** — 7 always-visible sliders (`shimmer / noiseIntensity / motionSwingSensitivity / colorHueShiftSpeed / spatialWaveSpeed / emitterFlare`) + 7 grouped accordions | `editor/ParameterBank.tsx` | `blade-style` → StylePanel ALSO mounts ParameterBank (literal double-mount of the same component) |

**Architectural note**: Quick Controls is intentional 80% path per Inspector.tsx header comment: "Deep tuning for each of these lives one sidebar click away". This is fine — but the cost is that color, ignition, retraction, and ParameterBank each have 2-3 simultaneous editing surfaces.

---

## 3. Settings modal overlap

Source: `apps/web/components/layout/SettingsModal.tsx`. Three tabs (`appearance / behavior / advanced`).

| Settings tab | Section | What it controls | Conceptual sibling elsewhere |
|---|---|---|---|
| Appearance | Aurebesh Mode (off/labels/full) | UI font swap | Pure Settings — no overlap |
| Appearance | Display | FPS counter visibility, Reduce Bloom, default visualization layers (12 toggles) | Reduce Bloom = `accessibilityStore.reduceBloom` (also surfaced in mobile AccessibilityPanel) |
| Appearance | Row density (SSL 22 / Ableton 26 / Mutable 32) | `accessibilityStore.density` | Pure Settings (scaffolding only — no consumers yet) |
| Behavior | UI Sounds | (placeholder: "coming in a future update") | Header: Sound ON/OFF button toggles `audio.muted` + `uiSoundEngine.setPreset` |
| Behavior | Effect auto-release (1–15s) | `accessibilityStore.effectAutoRelease` | Pure Settings |
| Behavior | Keyboard Shortcuts | reference list (read-only) | KeyboardShortcutsModal does the same — DUPLICATE list |
| Behavior | Feedback | 4 GitHub issue links | Pure Settings |
| Advanced | Performance Tier (full/medium/lite + auto-detect) | `performanceTier` | AppPerfStrip at app bottom has the same HIGH/MED/LOW segmented control — DUPLICATE control surface (wired through same `setPerformanceTier`) |
| Advanced | Layout (reset, save preset, load/delete saved presets) | `layoutStore` | Pure Settings; ResizeHandles persist independently to localStorage `kyberstation-ui-layout` |

**Saber Profile is conspicuously NOT in Settings.** It lives in 3 other places (see §4).

---

## 4. Identified duplicates / redundancies (most impactful first)

### A. Triple-mounted Ignition + Retraction pickers
Same 19-ignition + 13-retraction catalog (`lib/transitionCatalogs.ts`) renders in:
1. Inspector → `QuickIgnitionPicker` + `QuickRetractionPicker` (always visible)
2. `ignition-retraction` section → `IgnitionRetractionPanel` (deep tuning: same MGP + ms slider)
3. `combat-effects` section → `EffectPanel` L78–104 (same MGPs reproduced ABOVE the effect parameters)

`combat-effects` should not own ignition/retraction at all — it's named "Combat Effects" but its first 200 lines redo what `ignition-retraction` already covers.

### B. Color editing surfaces (3-way overlap)
1. Inspector → QuickColorChips (8 canon colors + Custom→deep)
2. `blade-style` section → StylePanel renders 4 `ColorPickerRow` (Base/Clash/Lockup/Blast) AT THE TOP — duplicates ColorPanel's channel system
3. `color` section → ColorPanel (full HSL/RGB/hex/harmony/24 presets/gradient)

StylePanel doing color editing is the worst offender — it has nothing to do with style selection.

### C. ParameterBank mounted twice
`ParameterBank` is the live-tune slider bank. It appears in:
1. Inspector body L67 (always visible)
2. StylePanel imports `{ ParameterBank }` and mounts it inside the `blade-style` deep section

These are LITERAL TWIN MOUNTS of the same component reading the same store — both render together when user is on `blade-style`.

### D. Board picker — 4 surfaces
1. SaberWizard Step 1 (5-board chip with VERIFIED/UNTESTED/REFERENCE compat tier)
2. StatusBar's inline BoardPicker chip (`BOARD · PROFFIE V3.9 · FULL`)
3. DeliveryRail PROFILE segment (passive readout)
4. `hardware` section → HardwarePanel `<BoardPicker variant="inline">`

All 4 read/write the same `useBoardProfile()` source — but they're 4 DIFFERENT trigger UIs.

### E. Saber Profile — fragmented across 3+ places
1. Header chrome → `SaberProfileSwitcher` (default variant: pill + dropdown)
2. DeliveryRail PROFILE segment → `SaberProfileSwitcher variant="compact"` (same dropdown body, different trigger)
3. **`output` section → SaberProfileManager** (collapsed by default — character-sheet hero, full CRUD, prop card configs, button map, equipped style/font, deep CRUD)

The deep manager is buried at the bottom of the OUTPUT section, behind a default-collapsed accordion. New users have no path to discover it. Per Ken's task brief, this is the #1 IA fix.

### F. Sound mute control fragmented
1. Header chrome → `Sound ON/OFF` button (toggles `audio.muted` + UI sound preset)
2. ⌘K palette → "Toggle audio mute"
3. Settings → Behavior → UI Sounds (placeholder, doesn't actually toggle)
4. AudioPanel → SoundFontPanel mixer has its own master volume slider

### G. Performance tier — DUPLICATE control surface
1. Settings → Advanced → Performance Tier radio (full / medium / lite + auto-detect)
2. AppPerfStrip → segmented HIGH / MED / LOW button row at app bottom

Same `setPerformanceTier` call. One should drive the other; instead they're two parallel UIs.

### H. Visualization layer toggles — 2 surfaces
1. Settings → Appearance → Display → "Default Visualization Layers" (12 checkboxes)
2. Editor canvas → `VisualizationToolbar` (live toggles for the same 12 layers)

The Settings copy controls the on-load default; the toolbar controls the live state. The relationship isn't documented anywhere visible.

### I. Layer Compositor vs. Routing
Both edit "things that modify the blade in real time":
- `layer-compositor` adds blast/clash/lockup overlay layers (effect compositing)
- `routing` (BETA) wires modulators to parameters (parameter modulation)

Different mental models, similar surface in the sidebar — easy to confuse for new users.

### J. Style/Color/Ignition picker keyboard shortcut conflict
`b` is mapped to Blast effect (palette + KeyboardShortcuts). But `Blade Style` is also `b`-shaped at the visual UI. Not a real conflict (effect shortcuts only trigger when no input is focused), but it's a discoverability hazard.

### K. Top-level `audio` and `output` are `topLevelSection` (no sub-list) but everything else groups
Sidebar has 4 collapsible groups + 2 top-level entries. Asymmetry adds cognitive cost.

### L. Gallery is a route, not a section
Sidebar's first link routes to `/gallery` (different page), but it's styled as a peer of the section list. Hover/click feels different from every other entry.

### M. Inspector is left of the blade, RightRail+AnalysisRail is right of the blade
Both are persistent ~280–400px columns. Symmetric, but it leaves the actual MainContent area with maybe 600–800px even on a 1440 desktop. Tight.

---

## 5. Recommended order of operations for new users

Working back from "user successfully designs and exports a saber to a real Proffieboard":

| Step | What user does | Why this order | Sidebar entry serving this |
|---|---|---|---|
| 0 | **Tell the app what saber they own** — name, chassis, board model, blade length, LED count, strip count | Without hardware ground-truth, every downstream estimate (power draw, runtime, storage) is fiction. Per Ken: "lightsaber profile should be one of the FIRST setup steps" | NEW: `Saber Profile` (promoted from buried OutputPanel slot) — also accessible via SaberWizard Step 1 |
| 1 | **Pick a starting preset OR run the wizard** | Faster than building from default-blue; both end at the same store state | Top: `Gallery` link OR header `Wizard ✦` button OR Inspector `Surprise Me` |
| 2 | **Choose a blade style** | Style determines what color/parameter UI applies (`painted` mode unlocks BladePainter, `gradient` unlocks gradient editor, etc.) | `Blade Style` |
| 3 | **Pick colors** for the 4 channels (Base + Clash + Lockup + Blast) | Color is the most visceral feedback loop; do this BEFORE timing/effects so the user is engaged | `Color` |
| 4 | **Tune ignition + retraction** (animation + duration) | These are character-defining (Mace's snap vs Vader's slow) and quick to A/B | `Ignition & Retraction` |
| 5 | **Configure combat effects** (clash flash, blast color/decay, lockup pattern, drag/melt) | Now that the blade has identity, style its impact | `Combat Effects` (rename per §6 below) |
| 6 | **Add modulation routing** (optional, BETA) — wire swing → shimmer, sound → hue, etc. | Advanced shaping; only after the basics feel right | `Routing` (board-gated) |
| 7 | **Optional: add overlay layers** (blast/clash bumps, AlphaL composites) | More advanced than parameter modulation | `Layer Compositor` |
| 8 | **Optional: motion + gesture sims** | Validate that gestures fire the right effects | `Motion Simulation`, `Gesture Controls` |
| 9 | **Pair a sound font** (Audio tab) | Sound binds late: blade is shaped first, audio matches it | `Audio` |
| 10 | **Generate code, export to SD card, flash** | Final ship step | `Output` |
| (anytime) | **My Crystal** — show off / share | Optional moment after the design is done | `My Crystal` |

The current sidebar doesn't enforce or even hint at this order; sections are alphabetical-ish within each group. Recommended renumbering below.

---

## 6. Recommended sidebar reorder

### Before (current, post-v0.14.0):

```
Gallery →
APPEARANCE
  Blade Style
  Color
BEHAVIOR
  Ignition & Retraction
  Combat Effects
  Gesture Controls
ADVANCED
  Layer Compositor
  Motion Simulation
  Hardware
  My Crystal
ROUTING (BETA)
  Routing
Audio
Output
```

### After (proposed):

```
Gallery →

SETUP
  My Saber              ← NEW. Profile (name + chassis + board + blade length + strip count + LED count). Step 0.
  Hardware              ← Deep tuning sibling — power draw, brightness, board details. (Moved from ADVANCED)

DESIGN
  Blade Style
  Color
  Ignition & Retraction
  Combat Effects        ← Rename "Combat Effects" but DROP its embedded ignition/retraction pickers (§4-A). Pure clash/blast/lockup/drag/melt config.
  Layers (Compositor)   ← Rename "Layer Compositor" → "Layers" for parity with Routing/Modulation parlance.

REACTIVITY
  Routing               ← BETA — board-gated. Same plate bar + bindings.
  Modulation Recipes    ← Could be a sub-tab inside Routing instead. Keep as one entry.
  Motion Simulation     ← Lives near Routing because they share the swing/angle/twist inputs.
  Gesture Controls      ← Prop file + button map.

OUTPUT
  Audio                 ← Top-level → demoted to Output group. Sound is part of "shipping the blade".
  Generate Code
  Export to Card
  Flash to Board
  Saber Card / Crystal  ← My Crystal (renamed) + share card export. Optional, last.
```

Three groups become "the order users actually move through": **Setup → Design → Reactivity → Output**. Saber Profile (new) is the FIRST entry, fulfilling Ken's brief.

### Why this works
- "SETUP" group answers: "what saber are you designing for?"
- "DESIGN" answers: "how does it look?" (visual)
- "REACTIVITY" answers: "how does it respond?" (motion + sound + button + modulation)
- "OUTPUT" answers: "how do you ship it?" (audio bind + code + flash + share)

### Sections to delete or merge
- **Drop the duplicate ignition/retraction pickers in `combat-effects`.** Those are owned by `ignition-retraction`; combat-effects should be only clash/blast/lockup/drag/melt parameters.
- **Drop the 4 ColorPickerRows in `blade-style`.** Color editing belongs in `color` only. The QuickColorChips in Inspector cover the 80% case.
- **Drop the `<ParameterBank/>` mount inside StylePanel.** Inspector already mounts it.
- **Move SaberProfileManager OUT of OutputPanel.** It becomes its own first-class section (`my-saber`) with its OWN sidebar entry.

### Settings consolidation
- **Delete Settings → Behavior → UI Sounds** (placeholder copy only).
- **Delete Settings → Behavior → Keyboard Shortcuts** (KeyboardShortcutsModal already shows the same list, opened via `?` or `Help`).
- **Delete Settings → Advanced → Performance Tier** (AppPerfStrip already covers HIGH/MED/LOW). Move auto-detect behind a small "Reset" affordance on AppPerfStrip.
- Keep: Aurebesh, Display defaults, Row density, Effect auto-release, Feedback, Layout presets.

---

## 7. Saber Profile relocation recommendation

### Current state (problematic)
- Trigger UI (compact dropdown) lives in 3 places: header `SaberProfileSwitcher`, DeliveryRail PROFILE segment, SaberWizard Step 1.
- Deep manager (`SaberProfileManager.tsx` — character-sheet hero, full CRUD, prop card configs, button map, equipped style+font + IndexedDB-backed persistence) lives **buried at the bottom of OutputPanel as a default-collapsed accordion**, behind 5 other sections (Preset List, Config Summary, Generated Code, Export to Card, OLED Preview).
- A first-time user opens the editor, doesn't know they own a saber profile, and never reaches the surface that would let them name their physical 89sabers Vader hilt + tell the app it has a Proffieboard V3.9 + 132 LEDs.

### Recommended

1. **Promote `my-saber` to a first-class sidebar section** at the TOP of a new `SETUP` group (above `Hardware`).
2. **The new `MySaberPanel`** absorbs:
   - `SaberProfileManager.tsx` body (character-sheet hero + CRUD + prop card configs)
   - Hardware fields PROMOTED into the profile object: blade length, board, strip count, LED count, brightness — these are PROPERTIES of the physical saber, not "advanced settings"
   - HiltSelector / HiltRenderer (currently disconnected — see CLAUDE.md hilt library §)
   - `chassisType` (existing field, e.g. "89sabers Vader")
   - `cardSize` (SD card capacity for storage budget)
3. **`Hardware` section becomes the deep-tuning sibling** — power draw math, RadialGauge, per-channel breakdown, runtime warnings — depend on the "what saber is this?" inputs that now live one section up.
4. **First-run flow change**: SaberWizard Step 1 (Hardware) becomes a thin wrapper around the same `MySaberPanel` form fields, so wizard + sidebar share one source of truth for hardware capture.
5. **Profile switcher remains in header + DeliveryRail** for fast switching between saved profiles. Both call into the same store; one is for casual identification, the other is for editing.

### Surface reduction net
- Inputs to capture a saber go from **buried-in-a-modal-step + buried-in-output-section** to **first sidebar section**.
- Profile switcher (light read/select) and Profile editor (heavy CRUD) become two clear roles instead of three overlapping ones.
- Hardware power-draw becomes a downstream consequence rather than a parallel concern.

---

## 8. Out-of-scope but worth flagging

- **`canvasMode` is dead UI** (uiStore L49) — kept after 1.5x for persistence safety. Remove field + setter eventually.
- **`BladeCanvas3DWrapper.tsx`** still in tree, no callers. Safe to delete.
- **`DesignPanel.tsx`** still alive for mobile/tablet shells (per CLAUDE.md "PR 5 scope") — when desktop ships A/B layout, mobile DesignPanel should also adopt the same Setup/Design/Reactivity/Output grouping.
- **Layer edits don't reach the blade engine** (CLAUDE.md "Known deferred"). Layer Compositor is a UI-only stub today; user clicks have no visual effect on the blade. Should be flagged in the panel header as "Preview-only" or hidden until v1.1 wires it.

---

End of audit.
