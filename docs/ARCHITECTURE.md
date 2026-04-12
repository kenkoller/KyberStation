# BladeForge Architecture

## Design Principles

1. **Engine-first** — `packages/engine` is the source of truth for all blade behavior. The web UI is a thin rendering layer over the engine's LED array output. The engine has zero DOM dependencies and runs headless in browser, tests, or Electron.

2. **AST-based code generation** — `packages/codegen` builds an abstract syntax tree of ProffieOS style templates, validates it, and emits formatted C++ code. No string concatenation — this ensures correct nesting, balanced angle brackets, and valid template arguments.

3. **Plugin-style extensibility** — Styles, effects, and ignition types are classes implementing well-defined abstract base classes. Adding a new one is: create class, register in the index, add UI entry.

4. **Board abstraction** — `packages/boards` defines capability profiles for 14 boards. Presets are board-agnostic "intent" objects; the compatibility scorer determines what each board can actually render.

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

The simulation core. 42 source files, 398 tests.

**Key classes:**
- `BladeEngine` — Main engine. Owns an `LEDArray`, `MotionSimulator`, active style/effects/ignition instances. Call `update(deltaMs, config)` each frame, then `getPixels()` for the LED color array.
- `LEDArray` — LED buffer management. Provides color utilities: `lerpColor`, `scaleColor`, `hslToRgb`, blend modes (add, screen, multiply).
- `MotionSimulator` — IMU emulation. Produces swing speed, blade angle, and twist values for the `StyleContext`.

**Registries:**
- `STYLE_REGISTRY` — Maps style IDs to constructors. 12 styles (stable, unstable, fire, pulse, rotoscope, gradient, photon, plasma, crystalShatter, aurora, cinder, prism).
- `EFFECT_REGISTRY` — Maps effect type strings to constructors. 8 effects (clash, lockup, blast, drag, melt, lightning, stab, force).
- `IGNITION_REGISTRY` / `RETRACTION_REGISTRY` — 7 ignition + 5 retraction animations.

**Type system (`types.ts`):**
- `BladeState` enum: OFF, IGNITING, ON, RETRACTING
- `BladeStyle` interface: `getColor(position, time, context): RGB`
- `BladeEffect` interface: `apply()`, `isActive()`, `trigger()`, `release()`, `reset()`
- `IgnitionAnimation` interface: `getMask(position, progress): number` (0–1)
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
- `ASTBuilder.ts` — `buildAST(config)` maps style/effect/ignition settings to the correct ProffieOS template nesting.
- `CodeEmitter.ts` — `emitCode(ast, options)` walks the AST and emits formatted C++ with proper angle bracket balancing.
- `Validator.ts` — `validateAST(ast)` checks template argument counts, type compatibility, nesting depth.
- `ConfigBuilder.ts` — `buildConfigFile(options)` generates a complete `config.h` with `#ifdef`s, blade arrays, preset arrays, and prop file includes.
- `templates/` — Template definitions for colors, functions, layers, transitions, and wrappers. Each maps a ProffieOS template name to its expected argument types.

### packages/boards

14 board profiles with capability matrices.

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

Character preset library organized by era: Prequel, Original Trilogy, Sequel, Animated Series, Expanded Universe. Each preset is a `BladeConfig` with metadata (character name, era, affiliation, description).

## Web App Architecture

### State Management

Two Zustand stores:
- **bladeStore** — Blade config, topology, active segment, blade state, motion sim parameters, effect log. All engine-facing state.
- **uiStore** — View mode (blade/angle/strip/cross), active tab, brightness, HUD toggle. All UI-facing state.

### Rendering Pipeline

1. `useBladeEngine` hook initializes a `BladeEngine` instance.
2. `useAnimationFrame` drives the render loop via `requestAnimationFrame`.
3. Each frame: engine `update()` → `getPixels()` → `BladeCanvas` draws to HTML5 Canvas 2D.
4. Canvas renders blade glow, hilt, LED strip visualization, and motion sim overlay.

### Pages

- `/` — Landing page (redirects to editor)
- `/editor` — Main workspace with canvas, style panel, effect panel, motion sim, preset browser, code output
- `/s` — Share link handler (decodes Kyber Code URL → loads config into editor)

### Config I/O

- `bladeConfigIO.ts` — Serialize/deserialize configs to JSON, validate, download as file, read from file.
- `configUrl.ts` — Encode configs to compact URL-safe strings (JSON → deflate-raw → base64url) for Kyber Code sharing.
