# BLADEFORGE — Claude Code Parallel Agent Prompts

## Session Strategy

Split the project into 4 parallel workstreams that have minimal merge conflicts. Each agent gets its own package or domain. Scaffold the monorepo first (Agent 0 — short task), then launch Agents 1-3 in parallel once the skeleton exists.

---

## AGENT 0 — Monorepo Scaffold (Run First, ~10 min)

### Prompt

```
Read CLAUDE.md for full project context.

Scaffold the BladeForge monorepo from scratch:

1. Initialize pnpm workspace with turbo.json
2. Create all directories per the repo structure in CLAUDE.md
3. Set up tsconfig.base.json with strict mode, path aliases
4. Configure Tailwind CSS with a custom dark theme:
   - Background: #08080c through #0e0e14
   - Accent: #4a9eff
   - Surface: rgba(255,255,255,0.02-0.06) borders
   - Font: IBM Plex Mono as primary, system monospace fallback
5. Set up ESLint + Prettier configs
6. Create pnpm-workspace.yaml pointing to apps/* and packages/*
7. Initialize each package with package.json, tsconfig.json, src/index.ts
8. Create the Next.js app in apps/web with App Router, basic layout.tsx and page.tsx shell
9. Set up Vitest config for each package
10. Create .github/workflows/ci.yml with lint + typecheck + test jobs
11. Write README.md with project description, screenshot placeholder, install instructions, and development commands
12. Write docs/CONTRIBUTING.md and docs/DEVELOPMENT.md stubs
13. Create .github/ISSUE_TEMPLATE and PR template files
14. Add MIT LICENSE file

DO NOT implement any actual features — only skeleton files with type stubs and TODO comments.
Every package's index.ts should export placeholder types.
Commit message: "feat: scaffold monorepo structure"
```

---

## AGENT 1 — Engine Package (Launch after Agent 0)

### Prompt

```
Read CLAUDE.md for full project context. You own packages/engine.

Build the complete blade simulation engine in packages/engine/src/. This is the core of BladeForge — a headless, zero-DOM TypeScript engine that simulates a 144-LED Neopixel blade in real-time.

### Phase 1: Core Architecture

1. Implement BladeEngine.ts as the main class:
   - Manages an array of 144 RGB values
   - update(deltaMs: number, config: BladeConfig) method runs one frame
   - Accepts motion inputs (swingSpeed, bladeAngle, twistAngle, soundLevel)
   - Manages active effects list with auto-cleanup
   - Handles ignition/retraction state machine
   - All computation is pure math — no requestAnimationFrame, no DOM

2. Implement LEDArray.ts:
   - Typed array-backed RGB buffer (Uint8Array or Float32Array)
   - lerpColor, blendAdd, blendMultiply, fill, copy utilities
   - Segment operations (fill range, apply mask)

3. Implement types.ts with all interfaces from CLAUDE.md

### Phase 2: Styles (packages/engine/src/styles/)

Implement BaseStyle.ts as an abstract class, then implement ALL 12 styles:

- StableStyle: AudioFlicker-equivalent, subtle noise-based shimmer
- UnstableStyle: Kylo Ren — high-frequency noise spikes, random white crackle
- FireStyle: Two-octave Perlin noise, yellow-orange tip bias, speed-reactive
- RotoscopeStyle: Film-era shimmer, sinusoidal luminance band that travels, swing-responsive
- PulseStyle: Sine wave intensity modulation traveling tip-to-hilt
- GradientStyle: Linear interpolation between two configurable colors
- PhotonStyle: Particle stream — multiple fast-moving bright dots on base color
- PlasmaStyle: Chaotic dual-noise with configurable edge color (for Darksaber)
- CrystalShatterStyle: Segmented blade with crack-line dark gaps between segments
- AuroraStyle: HSL hue rotation with dual sine wave modulation
- CinderStyle: Mostly dark with random hot ember spots that glow and fade
- PrismStyle: Full rainbow mapped to blade position, time-animated rotation

Each style MUST implement: getColor(position: number, time: number, context: StyleContext): RGB

### Phase 3: Effects (packages/engine/src/effects/)

Implement BaseEffect.ts, then ALL effects:

- ClashEffect: Full-blade white flash with rapid decay (configurable color, duration 200-600ms)
- LockupEffect: Localized flickering at a position, AudioFlicker-inspired, sustained until released
- BlastEffect: Localized ring burst at random position, expanding/fading
- DragEffect: Tip-concentrated orange-white sparking, sustained
- MeltEffect: Tip-concentrated heat glow, orange→white gradient, sustained
- LightningEffect: Full-blade random arc flashes, blue-white, sustained
- StabEffect: Tip white flash
- ForceEffect: Traveling sinusoidal pulse wave, subtle blue-white

Each effect MUST implement: trigger(params), apply(color, position, context): RGB, isActive(): boolean

### Phase 4: Ignition Animations (packages/engine/src/ignition/)

- StandardIgnition: Linear wipe from hilt to tip
- ScrollIgnition: Same as standard with slight easing
- SparkIgnition: Wipe with leading spark particles
- CenterIgnition: Expand from center outward
- WipeIgnition: Soft-edge wipe with configurable softness
- StutterIgnition: Wipe with sinusoidal stutter (jittery extend)
- GlitchIgnition: Wipe with random pixel dropout during extend

Each implements: getMask(position: number, progress: number): number (0-1)

### Phase 5: Functions (packages/engine/src/functions/)

Implement ProffieOS function emulators that map to the real functions:
- SwingSpeed: normalized 0-1 from motion input
- BladeAngle: -1 to 1 from gravity vector
- TwistAngle: -1 to 1 from rotation
- SoundLevel: 0-1 from audio input (simulated)
- BatteryLevel: 0-1 (configurable, default 1.0)
- Bump: gaussian bump at position with width
- SmoothStep: smooth interpolation between two thresholds
- Sin: sine wave function with configurable period
- Scale: remap a function's range
- Noise: deterministic pseudo-random noise by position+time

### Phase 6: Tests

Write Vitest tests for:
- BladeEngine state machine (off → igniting → on → retracting → off)
- Each style produces valid RGB output (0-255 range, no NaN)
- Each effect triggers, applies color modification, and deactivates
- Ignition masks transition from 0→1 correctly
- Function emulators produce expected ranges
- LED array utility operations

Target: 90%+ coverage on engine package.

Commit messages: conventional commits, prefix with "feat(engine):" or "test(engine):"
```

---

## AGENT 2 — Codegen Package (Launch after Agent 0)

### Prompt

```
Read CLAUDE.md for full project context. You own packages/codegen.

Build the ProffieOS code generator that converts BladeForge configurations into valid, compilable ProffieOS C++ blade style code.

### Phase 1: AST Definition (StyleAST.ts)

Define a TypeScript AST that models ProffieOS style templates:

interface StyleNode {
  type: 'template' | 'color' | 'integer' | 'function' | 'transition';
  name: string;
  args: StyleNode[];
}

Specific node types for:
- ColorNode: Rgb<R,G,B>, named colors (Red, Blue, White, Black, Rainbow)
- MixNode: Mix<FUNCTION, COLOR1, COLOR2>
- IntNode: Int<N> or bare integer
- TemplateNode: Any ProffieOS template (Layers, BlastL, LockupTrL, etc.)
- TransitionNode: TrWipe, TrFade, TrCenterWipeIn, TrInstant, etc.
- FunctionNode: SwingSpeed, BladeAngle, Sin, Scale, SmoothStep, etc.
- WrapperNode: StylePtr<>, InOutTrL<>

### Phase 2: AST Builder (ASTBuilder.ts)

Convert a BladeConfig object into a StyleNode AST:

function buildAST(config: BladeConfig): StyleNode

This maps our config format to the correct ProffieOS template nesting:
- config.style → base style template (AudioFlicker, StyleFire, Pulsing, Stripes, etc.)
- config.clashColor → SimpleClashL or ResponsiveClashL
- config.lockupColor → LockupTrL with AudioFlickerL
- config.blastColor → BlastL
- Drag, Melt, Lightning → their respective LockupTrL entries
- config.ignition/retraction → InOutTrL with correct transition
- Everything wrapped in Layers<...> then StylePtr<...>()

Support for Fett263 style features:
- RgbArg / IntArg for Edit Mode compatibility
- COLOR_ARG, LOCKUP_ARG, BLAST_ARG, CLASH_ARG argument wrappers
- Multi-Phase via EffectSequence<> or ColorSelect<>

### Phase 3: Code Emitter (CodeEmitter.ts)

function emitCode(ast: StyleNode, options?: EmitOptions): string

- Pretty-prints the AST as valid ProffieOS C++ code
- Proper indentation (2-space, each nesting level indented)
- Comments above each major section (// Blast Effect, // Lockup, etc.)
- Angle bracket matching validation
- Line length awareness (break long lines)
- Options: minified mode, with/without comments, with/without RgbArg wrappers

### Phase 4: Config Builder (ConfigBuilder.ts)

Generate a complete config.h file:

function buildConfigFile(options: ConfigOptions): string

Includes:
- #ifdef CONFIG_TOP with board defines, prop file, feature defines
- FETT263 defines (EDIT_MODE_MENU, SPECIAL_ABILITIES, SPIN_MODE, etc.)
- NUM_BLADES, NUM_BUTTONS
- VOLUME
- CLASH_THRESHOLD_G
- #ifdef CONFIG_PRESETS with BladeConfig and preset arrays
- Multiple presets support
- Blade configuration (WS2811BladePtr with LED count, color order)
- Proper #endif closure

### Phase 5: Validator (Validator.ts)

function validateAST(ast: StyleNode): ValidationResult

Checks:
- All angle brackets are balanced
- Template argument types are correct (COLOR where COLOR expected, etc.)
- No invalid template names
- Transition arguments are valid transitions
- Function arguments are valid functions
- RgbArg indices don't conflict

### Phase 6: Template Library (templates/)

Create typed template definitions for every ProffieOS template we support:

colors.ts: Rgb, Mix, Gradient, Rainbow, RotateColorsX, AudioFlicker, StyleFire, Pulsing, Stripes, HumpFlicker, ColorChange, ColorSelect, Layers, Black, White, Red, Green, Blue, Yellow, Orange, Cyan, Magenta, named color constants

layers.ts: BlastL, SimpleClashL, ResponsiveClashL, LockupTrL, ResponsiveLockupL, MultiTransitionEffectL, TransitionEffectL

transitions.ts: TrInstant, TrFade, TrWipe, TrWipeIn, TrCenterWipeIn, TrSmoothFade, TrDelay, TrConcat, TrJoin, TrBlink, TrDoEffect, TrWipeSparkTipL, TrColorCycle

functions.ts: Int, Scale, SwingSpeed, BladeAngle, TwistAngle, SmoothStep, Bump, Sin, NoisySoundLevel, WavLen, Mult, ClampF, IsLessThan, InOutFuncX, BatteryLevel, Variation, IfOn

wrappers.ts: StylePtr, InOutTrL, InOutHelper, InOutHelperX

Each template definition includes: name, expected argument types, default values, and validation rules.

### Phase 7: Tests

- Round-trip tests: config → AST → code → verify compilable patterns
- Snapshot tests for each preset's generated code
- Validator catches malformed ASTs
- Config builder produces valid #ifdef structure
- Template library covers all registered templates

Commit messages: "feat(codegen):" / "test(codegen):"
```

---

## AGENT 3 — Web UI (Launch after Agent 0, iterates as Engine/Codegen land)

### Prompt

```
Read CLAUDE.md for full project context. You own apps/web.

Build the Next.js web application — the visual editor UI for BladeForge. This is the user-facing product.

### Design System

Dark, industrial aesthetic. Think pro audio DAW meets Star Wars terminal.

- Background: #08080c (deep space black)
- Surface: #0e0e14 with rgba(255,255,255,0.04-0.08) borders
- Accent: #4a9eff (cool blade blue)
- Text: #c8ccd4 (primary), #8a8f98 (secondary), #444 (muted)
- Font: IBM Plex Mono from Google Fonts (import in layout.tsx)
- Border radius: 4-6px, never rounded/pill
- Interactions: subtle background shifts, no dramatic hovers
- Panel layout: resizable panels via CSS grid or a splitter library

### Phase 1: App Shell + Layout

1. layout.tsx: Import IBM Plex Mono, global styles, dark theme CSS variables
2. AppShell.tsx: Full-viewport flex layout with:
   - Top toolbar (logo, view toggles, ignite button, settings)
   - Main area split: left panel (controls) | center (canvas) | right panel (properties)
   - Bottom bar (status, effect triggers, timeline)
3. PanelLayout.tsx: Configurable panel arrangement, collapsible panels
4. StatusBar.tsx: Shows blade state, current style, FPS, LED count

### Phase 2: Blade Visualizer (BladeCanvas.tsx)

Canvas-based blade renderer consuming engine output:
- Three view modes: Blade (3D-lit with hilt), Strip (raw LEDs + luminosity graph), Cross-section (radial glow)
- Hilt rendering with metallic gradient, emitter detail, panel lines
- Bloom/glow effect via layered radial gradients per LED
- Core white-out (brighter center than edges, like real Neopixel in diffuser tube)
- Tip rounding with radial glow
- Grid background with subtle lines
- HUD overlay: LED indices, status info
- useAnimationFrame hook driving engine.update() + canvas redraw at 60fps
- requestAnimationFrame loop with delta time calculation

### Phase 3: Control Panels

StylePanel.tsx:
- Grid of style cards with color swatch preview
- Active style highlighted with accent border
- Style-specific parameter controls that appear contextually
  (e.g., gradient shows end color picker, plasma shows edge color picker)

ColorPanel.tsx:
- Color pickers for base, clash, lockup, blast, drag, melt, lightning
- Each shows the ProffieOS Rgb<R,G,B> value in monospace
- Palette presets (canonical film colors per character)
- "Randomize" button that generates harmonious color sets

EffectPanel.tsx:
- Effect trigger buttons (Clash, Lockup, Blast, Drag, Melt, Lightning, Stab, Force)
- Each button disabled when blade is off
- Effect log showing timestamped history
- Per-effect configuration: duration, color override, position

MotionSimPanel.tsx:
- Swing Speed slider (0-100%) → maps to engine swingSpeed
- Blade Angle slider (-50° to +50°) → maps to engine bladeAngle
- Twist slider → maps to twistAngle
- "Auto Swing" toggle that oscillates swing speed automatically
- "Auto Duel" toggle that triggers random clash/lockup at intervals
- Info box showing ProffieOS function mappings

### Phase 4: Ignition/Retraction Panel

- Ignition style selector (7 styles)
- Retraction style selector (5 styles)
- Duration sliders for each (100-1500ms)
- Preview button that retracts and re-ignites to demo the current config

### Phase 5: Preset Browser

- Grid of character preset cards with name, color swatch, style label
- One-click load replaces all config
- "Save as Preset" button to save current config
- Import/Export preset as JSON

### Phase 6: Code Output Panel

- Syntax-highlighted ProffieOS code display (use a simple highlighter — color template names blue, colors as their actual color, integers as green, comments as gray)
- Copy to Clipboard button
- "Download config.h" button that generates full config file
- Toggle between: style-only code vs full config.h
- Warning indicators if generated code uses features requiring specific #defines

### Phase 7: Timeline / Sequencer (Stretch)

- Horizontal timeline showing ignition → active → effect triggers → retraction
- Drag to place effects at specific times
- Playback button that runs through the timeline animating the blade
- Export as "choreography" sequence

### Phase 8: Sound Font Panel (Stretch)

- Drag-and-drop a font folder (reads file names)
- Shows categorized sound list (hum, swing01-N, clash01-N, etc.)
- Click to preview playback via Web Audio
- Font compatibility checker (warns if missing required files)

### Phase 9: Keyboard Shortcuts

- Space: Toggle ignite/retract
- C: Trigger clash
- L: Toggle lockup
- B: Trigger blast
- D: Trigger drag
- 1-9: Load preset 1-9
- Cmd/Ctrl+S: Save current preset
- Cmd/Ctrl+E: Export code
- Tab: Cycle view modes

### General Requirements

- All state in Zustand store (bladeConfig, bladeState, uiState)
- Engine runs in useAnimationFrame hook, NOT in a worker (canvas needs main thread)
- Responsive: works down to 1024px wide, optimized for 1440px+
- No localStorage (per artifact rules) — use Zustand with IndexedDB persist middleware via Dexie
- Tailwind for layout/spacing, inline styles or CSS modules for complex themed components
- Radix UI for accessible primitives (Dialog, Select, Tooltip, Tabs)

Commit messages: "feat(web):" / "fix(web):" / "style(web):"
```

---

## AGENT 4 — Presets + Sound + Docs (Can run anytime after Agent 0)

### Prompt

```
Read CLAUDE.md for full project context. You own packages/presets, packages/sound, and docs/.

### Part 1: Preset Library (packages/presets)

Build a comprehensive preset library organized by era:

prequel-era.ts:
- Obi-Wan EP1-3 (blue, varying styles per film)
- Anakin EP2-3 (blue)
- Mace Windu (purple)
- Yoda (green)
- Qui-Gon Jinn (green)
- Count Dooku (red, curved hilt note)
- General Grievous (multi-color note)
- Darth Maul (red, staff config note)
- Ahsoka (dual, white/blue/green variants)
- Kit Fisto (green)
- Plo Koon (blue)
- Darth Sidious (red)
- Barriss Offee (blue)
- Asajj Ventress (red, dual curved)

original-trilogy.ts:
- Luke ANH/ESB/ROTJ (blue/green progression)
- Vader ANH/ESB/ROTJ (red, subtle differences)
- Obi-Wan ANH (blue, the canonical one)
- Darksaber (black core, white edge)

sequel-era.ts:
- Kylo Ren (red unstable, crossguard note)
- Rey (blue → yellow progression)
- Leia (blue)

animated-series.ts:
- Rebels-era Ahsoka (white)
- Rebels Ezra (blue/green)
- Rebels Kanan (blue)
- Cal Kestis (blue/green/orange/purple/yellow/indigo)
- Baylan Skoll (orange)
- Shin Hati (orange-red)
- Inquisitors (red, spinning note)

expanded-universe.ts:
- Revan (purple/red)
- Starkiller (blue/red)
- Kyle Katarn (various)
- Mara Jade (purple)

Each preset is a typed BladeConfig object with:
- Accurate film colors (research the actual RGB values used in VFX/practical effects)
- Appropriate style selection
- Era-appropriate ignition style
- Notes in comments about the character's blade characteristics

Export a searchable index with metadata (name, era, affiliation, hilt model).

### Part 2: Sound Package (packages/sound)

FontParser.ts:
- Parse a directory listing of sound font files
- Identify categories: hum, swing (numbered), clash (numbered), blst, lock, drag, melt, in, out, force, quote, ccbegin, ccend, font, boot, tracks/
- Validate completeness (warn if missing critical files)
- Detect SmoothSwing pairs (swingl/swingh with matching numbers)
- Detect font format: Plecter, CFX, Proffie native

FontPlayer.ts:
- Web Audio API-based player
- Load and play individual sound files
- Crossfade between swing pairs (basic SmoothSwing sim)
- Hum loop with fade in/out tied to ignition/retraction

SmoothSwingEngine.ts:
- Emulate SmoothSwing V2 algorithm
- Input: swingSpeed (0-1), current hum
- Output: selected pair index, crossfade amount between L/H
- Parameters matching ProffieOS: SMOOTH_SWING_STRENGTH, SMOOTH_SWING_DAMPING, etc.

Types for all font structures.

### Part 3: Documentation (docs/)

ARCHITECTURE.md:
- System architecture diagram (describe in Mermaid syntax)
- Package dependency graph
- Data flow: user interaction → Zustand store → engine update → canvas render
- Code generation pipeline: config → AST → validation → emission

PROFFIE_REFERENCE.md:
- Complete reference of supported ProffieOS templates
- Organized by category: Colors, Functions, Transitions, Layers, Wrappers
- For each template: name, arguments with types, default values, description, example
- Cross-reference to ProffieOS source files
- Fett263 prop file defines reference
- Common config.h patterns

STYLE_AUTHORING.md:
- How to add a new blade style to BladeForge
- Step-by-step: create class, implement interface, register, add UI, add codegen mapping
- How to add a new effect
- How to add a new ignition animation
- Testing requirements

DEVELOPMENT.md (flesh out from stub):
- Prerequisites (Node 20+, pnpm 8+)
- Setup instructions
- Running dev server, tests, linting
- Package-by-package development guide
- Debugging tips
- How to test generated code (compile in Arduino IDE)

CONTRIBUTING.md (flesh out from stub):
- Code of conduct reference
- How to report bugs
- How to request features / new styles
- PR process and review expectations
- Style guide (TypeScript, naming conventions, commit messages)

Commit messages: "feat(presets):" / "feat(sound):" / "docs:"
```

---

## Merge Order

1. Agent 0 lands first (scaffold)
2. Agents 1, 2, 3, 4 branch from main after scaffold
3. Agent 1 (engine) and Agent 2 (codegen) can merge independently — no conflicts
4. Agent 4 (presets/sound/docs) can merge independently
5. Agent 3 (web UI) should merge last, pulling in engine + codegen as it wires up

## Post-Merge Integration Tasks

After all agents merge, a final integration pass is needed:
- Wire engine package into web app's useBladeEngine hook
- Wire codegen package into CodeOutput component
- Wire presets package into PresetBrowser component
- Wire sound package into SoundFontPanel component
- End-to-end test: load preset → visualize → trigger effects → export code → verify code compiles
- Performance profiling on the canvas render loop
- Responsive layout polish pass
