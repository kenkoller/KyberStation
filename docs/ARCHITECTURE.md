# KyberStation Architecture

> A top-to-bottom view of how KyberStation is organized: the engine-first
> package layout, the AST-based code generator, and the React UI that sits on
> top of them. Start here if you're reading the codebase for the first time.

## Design Principles

1. **Engine-first** — `packages/engine` is the source of truth for all blade behavior. The web UI is a thin rendering layer over the engine's LED array output. The engine has zero DOM dependencies and runs headless in browser, tests, or Electron.

2. **AST-based code generation** — `packages/codegen` builds an abstract syntax tree of ProffieOS style templates, validates it, and emits formatted C++ code. No string concatenation — this ensures correct nesting, balanced angle brackets, and valid template arguments.

3. **Plugin-style extensibility** — Styles, effects, and ignition types are classes implementing well-defined abstract base classes. Adding a new one is: create class, register in the index, add UI entry.

4. **Board abstraction** — `packages/boards` defines capability profiles for 16 boards. Presets are board-agnostic "intent" objects; the compatibility scorer determines what each board can actually render.

5. **Offline-first** — All project data persists in IndexedDB. No server required for core functionality.

## Package Dependency Graph

```
apps/web
  ├── packages/engine     (blade simulation, styles, effects, ignition)
  ├── packages/codegen    (AST → ProffieOS C++ code)
  ├── packages/presets    (character preset library)
  │     └── packages/engine (BladeConfig type)
  ├── packages/boards     (board profiles, compatibility scoring)
  │     └── packages/engine (EffectType, StyleContext types)
  └── packages/sound      (font parsing, Web Audio playback, filter chain)
```

No circular dependencies. Engine is the leaf — everything depends on it, it depends on nothing.

## Package Details

### packages/engine

The simulation core. 82+ source files, 398+ tests.

**Key classes:**
- `BladeEngine` — Main engine. Owns an `LEDArray`, `MotionSimulator`, active style/effects/ignition instances. Call `update(deltaMs, config)` each frame, then `getPixels()` for the LED color array. Segment rendering is wrapped in try-catch for error recovery — a failing segment does not blank the entire blade.
- `LEDArray` — LED buffer management. Provides color utilities: `lerpColor`, `scaleColor`, `hslToRgb`, blend modes (add, screen, multiply).
- `MotionSimulator` — IMU emulation. Produces swing speed, blade angle, and twist values for the `StyleContext`.

**Registries:**
- `STYLE_REGISTRY` — Maps style IDs to constructors. 29 styles: stable, unstable, fire, pulse, rotoscope, gradient, photon, plasma, crystalShatter, aurora, cinder, prism, painted, imageScroll, gravity, dataStream, ember, automata, helix, candle, shatter, neutron, torrent, moire, cascade, vortex, nebula, tidal, mirage.
- `EFFECT_REGISTRY` — Maps effect type strings to constructors. 21 effects: clash, lockup, blast, drag, melt, lightning, stab, force, shockwave, scatter, fragment, ripple, freeze, overcharge, bifurcate, invert, ghostEcho, splinter, coronary, glitchMatrix, siphon.
- `IGNITION_REGISTRY` / `RETRACTION_REGISTRY` — 19 ignition animations (standard, scroll, center, spark, wipe, stutter, glitch, twist, swing, stab, custom-curve, crackle, fracture, flash-fill, pulse-wave, drip-up, hyperspace, summon, seismic) + 13 retraction animations (standard, scroll, center, fadeout, shatter, custom-curve, dissolve, flickerOut, unravel, drain, implode, evaporate, spaghettify).

**Type system (`types.ts`):**
- `BladeState` enum: OFF, IGNITING, ON, RETRACTING
- `BladeStyle` interface: `getColor(position, time, context): RGB`
- `BladeEffect` interface: `apply()`, `isActive()`, `trigger()`, `release()`, `reset()`
- `IgnitionAnimation` interface: `getMask(position, progress, context?): number` (0–1)
- `IgnitionContext` — bladeAngle, swingSpeed, twistAngle, config (optional BladeConfig reference for configurable ignitions like StutterIgnition's `stutterFullExtend`)
- `EffectType` — Union type now includes: 'clash' | 'lockup' | 'blast' | 'drag' | 'melt' | 'lightning' | 'stab' | 'force' | 'shockwave' | 'scatter' | 'fragment' | 'ripple' | 'freeze' | 'overcharge' | 'bifurcate' | 'invert' | 'ghostEcho' | 'splinter' | 'coronary' | 'glitchMatrix' | 'siphon'
- `StyleContext` — time, swingSpeed, bladeAngle, twistAngle, soundLevel, batteryLevel, config
- `BladeTopology` — segments, total LED count, topology type
- `BladeSegment` — startLED, endLED, direction, layers, ignition config, segment role

**Topology presets (8):**
Single, Staff, Crossguard, Triple, Quad-Star, Inquisitor (with ring rotation), Split Blade, Accent LEDs.

### packages/codegen

Converts `BladeConfig` objects into valid ProffieOS C++ code.

**Pipeline:** `BladeConfig → buildAST() → StyleNode tree → emitCode() → C++ string`

**Key files:**
- `types.ts` — `StyleNode` with type (template | color | integer | function | transition | wrapper | mix | raw), name, and args array.
- `ASTBuilder.ts` — `buildAST(config)` maps style/effect/ignition settings to the correct ProffieOS template nesting. Uses `SaberBase::` prefixed lockup types (`LOCKUP_NORMAL`, `LOCKUP_DRAG`, `LOCKUP_LIGHTNING_BLOCK`, `LOCKUP_MELT`) and correct transition names (`TrWipeSparkTip`, not `TrSparkWipeTip`).
- `CodeEmitter.ts` — `emitCode(ast, options)` walks the AST and emits formatted C++ with proper angle bracket balancing.
- `Validator.ts` — `validateAST(ast)` checks template argument counts, type compatibility, nesting depth. Validates `SaberBase::` enum prefixes.
- `ConfigBuilder.ts` — `buildConfigFile(options)` generates a complete `config.h` with `#ifdef`s, blade arrays, preset arrays, and prop file includes. Emits `maxLedsPerStrip` as a top-level constant (required by ProffieOS) and separates `CONFIG_PROP` into its own `#ifdef` section as required by the ProffieOS preprocessor.
- `templates/` — Template definitions for colors, functions, layers, transitions, and wrappers. Each maps a ProffieOS template name to its expected argument types.

**ProffieOS compilation requirements:** The codegen output has been validated against ProffieOS 7.x via `arduino-cli`. Key requirements enforced by the pipeline:
- `maxLedsPerStrip` declared before blade arrays (ProffieOS global, not inside a config section).
- `SaberBase::LOCKUP_*` enum values use the fully qualified `SaberBase::` prefix.
- `CONFIG_PROP` section separated from `CONFIG_PRESETS` (ProffieOS processes them in distinct passes).
- Transition template names match ProffieOS headers exactly (e.g. `TrWipeSparkTip`, not `TrSparkWipeTip`).
- A 23-preset config compiled successfully at 264 KB (52% of available flash).

### packages/boards

16 board profiles with capability matrices. Each profile declares supported features, LED limits, color profile count, and sub-blade support. Used by the UI to filter presets and by the codegen to select the correct board header and compilation options.

**Tier system:**
- **Tier 1** — Full custom styles (Proffieboard V2, V3): unlimited color profiles, custom everything, layer compositing, sub-blade support.
- **Tier 2** — Configurable (CFX, GHv3, GHv4, Verso): good feature set but limited style customization.
- **Tier 3** — Preset-based (Xenopixel, LGT, Asteria, Darkwolf, DamienSaber): limited to built-in styles, fixed palettes.

**Compatibility scoring:** `scoreCompatibility(preset, board)` returns a percentage (0–100) indicating how faithfully a board can reproduce a given preset. Proffieboard scores 100% on everything; budget boards may score 25–50%.

### packages/sound

Sound font parsing and audio processing.

**FontPlayer** — Parses font folder structures, plays sound effects via Web Audio API.

**Audio filter chain (13 filter types):**
Lowpass, Highpass, Bandpass, Distortion, Reverb, Delay, Tremolo, Chorus, Flanger, Phaser, Bitcrusher, Pitch Shift, Compressor.

**Dynamic parameter sources (10):**
Static, Swing Speed, Blade Angle, Twist Angle, Sound Level, Battery Level, Ignition Progress, Random Noise, LFO (sine/triangle/square/sawtooth), Manual.

`ParameterResolver` maps these sources to filter parameters in real time. `AudioFilterChain` builds the Web Audio graph and updates it each frame.

### packages/presets

Character preset library organized by era: Prequel, Original Trilogy, Sequel, Animated Series, Expanded Universe, Legends, Creative Community. Each preset is a `BladeConfig` with metadata (character name, era, affiliation, description).

**Card preset templates** (`templates/card-templates.ts`): 4 built-in card preset collections for quick saber profile setup:
- Original Trilogy Essentials (6 presets)
- Prequel Collection (7 presets)
- Dark Side Pack (6 presets)
- Dueling Minimalist (4 presets)

Each template entry has a `presetName`, `fontName`, `source: { type: 'builtin', presetId }`, and a full inline `BladeConfig`.

## Web App Architecture

### State Management

Thirteen Zustand stores:
- **bladeStore** — Blade config, topology, active segment, blade state, motion sim parameters, effect log. All engine-facing state.
- **uiStore** — View mode (blade/angle/strip/cross/uv-unwrap), render mode (photorealistic/pixel), canvas mode (2d/3d), active tab, brightness, HUD toggle, canvas theme, effect comparison toggle, active color channel, analyze mode (toggle pixel strip + RGB graph visibility for clean/analyze view).
- **userPresetStore** — User-created preset collection. Hydrates from IndexedDB on mount. CRUD operations: save, update, delete, duplicate, reorder. Import/export for `.kyberstation-collection.json` bundles.
- **saberProfileStore** — Saber profiles, card configs, and card preset entries. Each profile has multiple named card configs; each config has an ordered list of `CardPresetEntry` objects. Persists to IndexedDB.
- **presetListStore** — Legacy preset list management (predates card configs). Still used by older export paths.
- **audioFontStore** — Sound font state: loaded font data, playback, and font library. Library state includes `libraryHandle` (persisted `FileSystemDirectoryHandle`), `libraryFonts` (scanned `LibraryFontEntry[]`), `libraryPath`, scanning progress.
- **accessibilityStore** — Text size, reduced motion (auto-syncs from OS `prefers-reduced-motion` on first load), touch target sizing, high contrast mode.
- **audioMixerStore** — EQ and audio effects mixer state. 3-band EQ, 13 filter types, dynamic parameter sources, mixer presets.
- **layoutStore** — Workbench multi-column layout. Stores `ColumnAssignment` (Record mapping tab IDs to arrays of panel ID arrays), saved layout presets, collapsed panel tracking. Supports 1–4 columns with HTML5 Drag-and-Drop for cross-column panel movement. Auto-saves to localStorage.
- **visualizationStore** — Visualization stack layer visibility and ordering. 13 layer types (blade, pixel-strip, channel-r/g/b, luminance, power-draw, hue, saturation, effect-overlay, swing-response, transition-progress, storage-budget). Debug mode, pinned pixels, hovered pixel state. Persists to localStorage.
- **historyStore** — Undo/redo history. Past/future stacks of `HistoryEntry` objects (timestamp, label, snapshot), max 50 entries, session-only. Supports Cmd+Z / Cmd+Shift+Z / Cmd+Y keyboard shortcuts.
- **themeStore** — (shared via uiStore) Extended theme support with 30 themes (9 base + 21 extended). Material, corner style, border style, and ambient intensity CSS custom properties.
- **presetListStore** — Legacy preset list management (predates card configs). Still used by older export paths.

### IndexedDB Schema (Dexie.js, version 3)

```
fonts        — name (primary key)           // decoded sound font audio buffers
settings     — key (primary key)            // app settings, library directory handle
userPresets  — id, name, createdAt, updatedAt // user-saved blade presets
libraryHandles — id                         // persisted FileSystemDirectoryHandle
libraryFonts   — name                       // cached font scan results
```

### Key Data Models

**UserPreset** (stored in IndexedDB `userPresets` table):
```typescript
interface UserPreset {
  id: string;                   // crypto.randomUUID()
  name: string;
  description?: string;
  tags: string[];
  config: BladeConfig;
  fontAssociation?: string;     // font folder name to auto-load
  sourcePresetId?: string;      // if derived from a built-in preset
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;           // base64 data URL ~200x40px
}
```

**SaberProfile → CardConfig → CardPresetEntry** (stored in IndexedDB via saberProfileStore):
```typescript
interface CardPresetEntry {
  id: string;
  order: number;
  presetName: string;
  fontName: string;
  source:
    | { type: 'builtin'; presetId: string }
    | { type: 'custom'; userPresetId: string }
    | { type: 'inline' };
  config: BladeConfig;
  fontAssociation?: string;
}

interface CardConfig {
  id: string;
  name: string;
  entries: CardPresetEntry[];
  createdAt: string;
  updatedAt: string;
}

interface SaberProfile {
  id: string;
  name: string;
  boardId: string;
  bladeCount: number;
  cardConfigs: CardConfig[];
  activeCardConfigId: string;
  createdAt: string;
  updatedAt: string;
}
```

**LibraryFontEntry** (cached in IndexedDB `libraryFonts` table):
```typescript
interface LibraryFontEntry {
  name: string;
  format: 'proffie' | 'cfx' | 'generic';
  fileCount: number;
  totalSizeBytes: number;
  categories: Record<string, number>;
  hasSmoothSwing: boolean;
  smoothSwingPairCount: number;
  completeness: 'complete' | 'partial' | 'minimal';
  missingCategories: string[];
  lastScanned: number;
}
```

### Rendering Pipeline

1. `useBladeEngine` hook initializes a `BladeEngine` instance.
2. `useAnimationFrame` drives the render loop via `requestAnimationFrame`.
3. Each frame: engine `update()` → `getPixels()` → `BladeCanvas` draws to HTML5 Canvas 2D.
4. Canvas renders blade glow, hilt, LED strip visualization, and motion sim overlay.

### Desktop Layout (Workbench)

The desktop editor uses a horizontal workbench layout (`WorkbenchLayout.tsx`):

1. **Header Bar** — Logo, undo/redo, FPS counter, share button, pause toggle, settings gear, docs link
2. **Blade Canvas + Visualization Stack** — Horizontal blade preview with toggleable analysis layers (pixel strip, RGB channels, luminance, power draw, hue, saturation, effect overlay, swing response, transition progress, storage budget). Per-pixel debug overlay with hover tooltips and click-to-pin cards.
3. **Tab Bar** — 5 top-level tabs: Design, Dynamics, Audio, Gallery, Output
4. **Column Grid** — 1–4 columns (responsive to viewport width: 4 cols at 1440px+, 3 at 1200px+, 2 at 1024px+, 1 below). 29 panel definitions mapped across tabs. Panels are draggable between columns via HTML5 DnD. Users can save/load/delete custom layout presets.
5. **Status Bar** — Power draw (mA/5A), storage budget (%), LED count, color-coded thresholds

Mobile uses a swipe-between-tabs layout. Tablet uses a 2-column variant.

### Fullscreen Preview

Fixed z-50 overlay for immersive blade viewing. Supports horizontal and vertical orientations. Auto-hiding control bar (3s timeout). Keyboard shortcuts: Escape to exit, O for orientation, C/B/S/L/N/D/M/F for effects. Device motion toggle for mobile (accelerometer/gyroscope drives swing speed and blade angle via DeviceMotionEvent API).

### Settings System

Global settings modal with 5 sections:
- **Performance Tier** — Full (all effects), Medium (reduced particles), Lite (minimal animations). Applied via CSS classes `perf-medium`, `perf-lite`.
- **Aurebesh Mode** — Off, Labels only, Full. Toggles Aurebesh font rendering via CSS classes `aurebesh-labels`, `aurebesh-full`.
- **UI Sounds** — Star Wars-style beep/chirp feedback. Preset selection, per-category volume, generated via Web Audio API oscillator synthesis. Defaults to OFF.
- **Layout Management** — Save/load/delete custom workbench layouts via layoutStore presets.
- **Display** — FPS counter toggle, visualization layer checkboxes.

### Pages

- `/` — Identity landing (live BladeEngine hero with 4-preset rotation, value strip, CTAs to Editor / Wizard / Gallery, release strip, footer). Components in `apps/web/components/landing/`.
- `/editor` — Main workspace with canvas, style panel, effect panel, motion sim, preset browser, code output.
- `/m` — Mobile companion (touch-first swipe browser over 12 curated presets; read-only, no editor chrome; deep-link friendly via `?preset=<id>`).
- `/s` — Share link handler (decodes Kyber Code URL → loads config into editor).
- `/docs` — Built-in ProffieOS template reference and design-system page.

### Config I/O

- `bladeConfigIO.ts` — Serialize/deserialize configs to JSON, validate, download as file, read from file. Also handles:
  - **Collection I/O** — `downloadCollection()` / `readCollectionFile()` for `.kyberstation-collection.json` bundles (array of `UserPreset` objects with thumbnails).
  - **Card Template I/O** — `downloadCardTemplate()` / `readCardTemplateFile()` for `.kyberstation-card.json` files (card config entries stripped of personal font paths).
- `configUrl.ts` — Encode configs to compact URL-safe strings (JSON → deflate-raw → base64url) for Kyber Code sharing.
