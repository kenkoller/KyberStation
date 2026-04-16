# KYBERSTATION — Project Context

## Overview

KyberStation is a standalone desktop + web application for designing, previewing, and exporting custom lightsaber blade styles for the Proffieboard V3.9 running ProffieOS 7.x. It is a visual style editor, real-time blade simulator, sound font manager, and config generator — think "DAW for lightsabers."

The app targets the Neopixel lightsaber hobbyist community (cosplay, reenactment, collecting, dueling) and aims to surpass every existing tool (Fett263 Style Library web UI, Fredrik's Style Editor, manual config editing) by combining them into a single cohesive experience with features nobody has built yet.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: React 18+, Tailwind CSS, Radix UI primitives
- **State**: Zustand (global store) + React state for local UI
- **Canvas/Rendering**: HTML5 Canvas 2D for blade visualizer, Three.js for optional 3D hilt preview
- **Code Generation**: Custom AST-based ProffieOS style code emitter
- **Sound**: Web Audio API for font preview playback
- **Storage**: IndexedDB (via Dexie.js) for local project persistence
- **Desktop**: Electron wrapper (future phase) for USB serial communication with Proffieboard
- **Package Manager**: pnpm
- **Testing**: Vitest + React Testing Library
- **CI**: GitHub Actions

## Repository Structure

```
kyberstation/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── release.yml
│   │   └── lint.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── style_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── apps/
│   ├── web/                          # Next.js web app
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Landing / app shell
│   │   │   ├── editor/
│   │   │   │   └── page.tsx          # Main editor workspace
│   │   │   ├── gallery/
│   │   │   │   └── page.tsx          # Community style gallery
│   │   │   └── docs/
│   │   │       └── page.tsx          # Built-in ProffieOS reference
│   │   ├── components/
│   │   │   ├── editor/
│   │   │   │   ├── BladeCanvas.tsx         # Main visualizer canvas (zoom: 0.9x–1.3x)
│   │   │   │   ├── BladeCanvas3D.tsx       # Three.js 3D hilt + blade
│   │   │   │   ├── StylePanel.tsx          # Style selection + config
│   │   │   │   ├── EffectPanel.tsx         # Effect triggers + config
│   │   │   │   ├── ColorPanel.tsx          # Color picker + palette
│   │   │   │   ├── MotionSimPanel.tsx      # Swing/angle/twist simulation
│   │   │   │   ├── TimelinePanel.tsx       # Effect timeline / sequencer
│   │   │   │   ├── LayerStack.tsx          # Visual layer compositor
│   │   │   │   ├── CodeOutput.tsx          # Generated code + export (volume default 1500)
│   │   │   │   ├── PresetGallery.tsx       # Preset gallery + user presets (My Presets)
│   │   │   │   ├── SoundFontPanel.tsx      # Sound font preview + font library
│   │   │   │   ├── SaberProfileManager.tsx # Saber profiles + card preset composer
│   │   │   │   ├── CardWriter.tsx          # SD card ZIP generation + writer
│   │   │   │   ├── StorageBudgetPanel.tsx  # Flash memory budget estimation
│   │   │   │   ├── OLEDPreview.tsx         # OLED display preview
│   │   │   │   ├── VisualizationStack.tsx  # Canvas-based analysis layers
│   │   │   │   ├── VisualizationToolbar.tsx # Layer toggle icons
│   │   │   │   ├── PixelDebugOverlay.tsx   # Per-pixel hover/pin/range debug
│   │   │   │   ├── FullscreenPreview.tsx   # Immersive blade + device motion
│   │   │   │   └── SmoothSwingPanel.tsx    # V1/V2 SmoothSwing config
│   │   │   ├── hilt/
│   │   │   │   ├── HiltSelector.tsx        # Hilt model picker
│   │   │   │   └── HiltViewer3D.tsx        # 3D hilt renderer
│   │   │   ├── shared/
│   │   │   │   ├── Slider.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Toggle.tsx
│   │   │   │   ├── Tooltip.tsx
│   │   │   │   ├── HelpTooltip.tsx         # Hover tooltip for feature help
│   │   │   │   ├── CollapsibleSection.tsx  # Collapsible panel wrapper
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Tabs.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── Skeleton.tsx            # Loading skeleton components
│   │   │   └── layout/
│   │   │       ├── AppShell.tsx            # Desktop→WorkbenchLayout, mobile/tablet shells
│   │   │       ├── WorkbenchLayout.tsx     # Desktop horizontal workbench
│   │   │       ├── ColumnGrid.tsx          # 1-4 col CSS grid + HTML5 DnD
│   │   │       ├── DraggablePanel.tsx      # Panel wrapper with drag handle
│   │   │       ├── TabColumnContent.tsx    # 29 panel ID → component mapping
│   │   │       ├── Toolbar.tsx
│   │   │       ├── StatusBar.tsx           # Power draw, storage budget, LED count
│   │   │       ├── PanelLayout.tsx
│   │   │       ├── UndoRedoButtons.tsx     # Cmd+Z / Cmd+Shift+Z
│   │   │       ├── ShareButton.tsx         # Kyber Code URL copy
│   │   │       ├── FPSCounter.tsx          # Color-coded FPS display
│   │   │       ├── PauseButton.tsx         # Global animation pause toggle
│   │   │       ├── SettingsModal.tsx       # Perf tiers, Aurebesh, sounds, layouts
│   │   │       └── ToastContainer.tsx      # Toast notification wrapper
│   │   ├── hooks/
│   │   │   ├── useBladeEngine.ts
│   │   │   ├── useAnimationFrame.ts
│   │   │   ├── useAudioEngine.ts
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   ├── useDeviceMotion.ts
│   │   │   ├── useSharedConfig.ts          # Kyber Code share link handler
│   │   │   ├── useAccessibilityApplier.ts  # OS reduced-motion sync
│   │   │   ├── useResponsiveColumns.ts     # matchMedia 1440/1200/1024 breakpoints
│   │   │   ├── usePauseSystem.ts           # isPaused → CSS class + Space key
│   │   │   ├── useHistoryTracking.ts       # bladeStore → historyStore debounced
│   │   │   └── useThemeApplier.ts          # CSS custom property theme application
│   │   ├── stores/
│   │   │   ├── bladeStore.ts               # Blade config, topology, state (LED default: 144)
│   │   │   ├── uiStore.ts                  # View mode, tabs, canvas theme, pause, fullscreen
│   │   │   ├── userPresetStore.ts          # User preset CRUD + IndexedDB
│   │   │   ├── saberProfileStore.ts        # Saber profiles + card configs
│   │   │   ├── presetListStore.ts          # Legacy preset list
│   │   │   ├── audioFontStore.ts           # Sound fonts + library
│   │   │   ├── audioMixerStore.ts          # EQ/effects mixer state
│   │   │   ├── accessibilityStore.ts       # A11y settings + OS sync
│   │   │   ├── layoutStore.ts              # Workbench columns, presets, collapsed panels
│   │   │   ├── visualizationStore.ts       # 13 analysis layers, debug mode, pins
│   │   │   └── historyStore.ts             # Undo/redo (50 entries, session-only)
│   │   ├── lib/
│   │   │   ├── bladeConfigIO.ts            # Config/collection/card template I/O
│   │   │   ├── configUrl.ts                # Kyber Code URL encoding
│   │   │   ├── fontDB.ts                   # IndexedDB schema (Dexie v3)
│   │   │   ├── cardDetector.ts             # SD card detection
│   │   │   ├── themeDefinitions.ts         # 30 themes (9 base + 21 extended)
│   │   │   └── visualizationTypes.ts       # 13 visualization layer definitions
│   │   └── styles/
│   │       └── globals.css
│   └── electron/                     # Future: Electron shell
│       ├── main.ts
│       ├── preload.ts
│       └── serial.ts                 # USB serial to Proffieboard
├── packages/
│   ├── engine/                       # Core blade simulation engine
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── BladeEngine.ts        # Main engine class
│   │   │   ├── LEDArray.ts           # LED buffer management
│   │   │   ├── styles/               # 29 style implementations
│   │   │   │   ├── index.ts
│   │   │   │   ├── StableStyle.ts
│   │   │   │   ├── UnstableStyle.ts
│   │   │   │   ├── FireStyle.ts
│   │   │   │   ├── RotoscopeStyle.ts
│   │   │   │   ├── PulseStyle.ts
│   │   │   │   ├── GradientStyle.ts
│   │   │   │   ├── PhotonStyle.ts
│   │   │   │   ├── PlasmaStyle.ts
│   │   │   │   ├── CrystalShatterStyle.ts
│   │   │   │   ├── AuroraStyle.ts
│   │   │   │   ├── CinderStyle.ts
│   │   │   │   ├── PrismStyle.ts
│   │   │   │   ├── GravityStyle.ts       # Accelerometer-driven pooling
│   │   │   │   ├── DataStreamStyle.ts    # Traveling data packets
│   │   │   │   ├── EmberStyle.ts         # Rising ember particles
│   │   │   │   ├── AutomataStyle.ts      # Rule 30 cellular automaton
│   │   │   │   ├── HelixStyle.ts         # Double helix sine waves
│   │   │   │   ├── CandleStyle.ts        # fbm flicker + gust events
│   │   │   │   ├── ShatterStyle.ts       # Independent shard pulses
│   │   │   │   ├── NeutronStyle.ts       # Bouncing particle + trail
│   │   │   │   └── BaseStyle.ts          # Abstract style interface
│   │   │   ├── effects/              # 21 effect implementations
│   │   │   │   ├── index.ts
│   │   │   │   ├── ClashEffect.ts
│   │   │   │   ├── LockupEffect.ts
│   │   │   │   ├── BlastEffect.ts
│   │   │   │   ├── DragEffect.ts
│   │   │   │   ├── MeltEffect.ts
│   │   │   │   ├── LightningEffect.ts
│   │   │   │   ├── StabEffect.ts
│   │   │   │   ├── ForceEffect.ts
│   │   │   │   ├── ShockwaveEffect.ts    # Dual Gaussian wavefronts
│   │   │   │   ├── ScatterEffect.ts      # Random pixel flash burst
│   │   │   │   ├── FragmentEffect.ts     # Expanding segment gaps
│   │   │   │   ├── RippleEffect.ts       # Concentric ring waves
│   │   │   │   ├── FreezeEffect.ts       # Icy crystal spread
│   │   │   │   ├── OverchargeEffect.ts   # Power surge + flicker
│   │   │   │   ├── BifurcateEffect.ts    # Warm/cool color split
│   │   │   │   └── BaseEffect.ts         # Abstract effect interface
│   │   │   ├── ignition/             # 19 ignition + 13 retraction anims
│   │   │   │   ├── index.ts
│   │   │   │   ├── StandardIgnition.ts
│   │   │   │   ├── ScrollIgnition.ts
│   │   │   │   ├── SparkIgnition.ts
│   │   │   │   ├── CenterIgnition.ts
│   │   │   │   ├── WipeIgnition.ts
│   │   │   │   ├── StutterIgnition.ts
│   │   │   │   ├── GlitchIgnition.ts
│   │   │   │   ├── CrackleIgnition.ts    # Random segment flicker fill
│   │   │   │   ├── FractureIgnition.ts   # Radiating crack points
│   │   │   │   ├── FlashFillIgnition.ts  # White flash → color wipe
│   │   │   │   ├── PulseWaveIgnition.ts  # Sequential building waves
│   │   │   │   ├── DripUpIgnition.ts     # Fluid upward flow
│   │   │   │   ├── DissolveRetraction.ts # Random shuffle turn-off
│   │   │   │   ├── FlickerOutRetraction.ts # Tip-to-base flicker band
│   │   │   │   ├── UnravelRetraction.ts  # Sinusoidal thread unwind
│   │   │   │   ├── DrainRetraction.ts    # Gravity drain + meniscus
│   │   │   │   └── BaseIgnition.ts
│   │   │   ├── functions/            # ProffieOS function emulators
│   │   │   │   ├── SwingSpeed.ts
│   │   │   │   ├── BladeAngle.ts
│   │   │   │   ├── TwistAngle.ts
│   │   │   │   ├── SoundLevel.ts
│   │   │   │   ├── BatteryLevel.ts
│   │   │   │   ├── Bump.ts
│   │   │   │   ├── SmoothStep.ts
│   │   │   │   ├── Sin.ts
│   │   │   │   ├── Scale.ts
│   │   │   │   └── Noise.ts
│   │   │   ├── motion/               # Motion simulation
│   │   │   │   ├── MotionSimulator.ts
│   │   │   │   └── IMUEmulator.ts
│   │   │   └── types.ts
│   │   ├── tests/
│   │   └── package.json
│   ├── codegen/                      # ProffieOS code generator
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── StyleAST.ts           # AST node types
│   │   │   ├── ASTBuilder.ts         # Config → AST
│   │   │   ├── CodeEmitter.ts        # AST → ProffieOS C++ code
│   │   │   ├── ConfigBuilder.ts      # Full config.h generator
│   │   │   ├── Validator.ts          # Validates generated code
│   │   │   ├── templates/
│   │   │   │   ├── colors.ts         # Rgb<>, Mix<>, etc.
│   │   │   │   ├── layers.ts         # Layers<>, BlastL<>, etc.
│   │   │   │   ├── transitions.ts    # TrWipe<>, TrFade<>, etc.
│   │   │   │   ├── functions.ts      # Int<>, Scale<>, etc.
│   │   │   │   └── wrappers.ts       # StylePtr<>, InOutTrL<>
│   │   │   └── types.ts
│   │   ├── tests/
│   │   └── package.json
│   ├── presets/                      # Preset library
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── characters/           # Film-accurate character presets
│   │   │   │   ├── prequel-era.ts
│   │   │   │   ├── original-trilogy.ts
│   │   │   │   ├── sequel-era.ts
│   │   │   │   ├── animated-series.ts
│   │   │   │   ├── extended-universe.ts
│   │   │   │   ├── legends.ts
│   │   │   │   └── creative-community.ts
│   │   │   ├── templates/
│   │   │   │   └── card-templates.ts # 4 built-in card preset templates
│   │   │   └── types.ts
│   │   └── package.json
│   └── sound/                        # Sound font utilities
│       ├── src/
│       │   ├── index.ts
│       │   ├── FontParser.ts         # Parse font folder structure
│       │   ├── FontPlayer.ts         # Web Audio playback engine
│       │   ├── SmoothSwingEngine.ts  # SmoothSwing pair crossfade sim
│       │   └── types.ts
│       ├── tests/
│       └── package.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   ├── DEVELOPMENT.md
│   ├── PROFFIE_REFERENCE.md          # ProffieOS template reference
│   └── STYLE_AUTHORING.md            # How to add new styles
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .eslintrc.js
├── .prettierrc
├── tailwind.config.ts
├── LICENSE                           # MIT
├── README.md
└── CLAUDE.md                         # This file
```

## Architecture Principles

1. **Monorepo via Turborepo + pnpm workspaces** — Engine, codegen, presets, and sound packages are decoupled from the UI. The engine runs identically in browser, tests, and (future) Electron.

2. **Engine-first** — `packages/engine` is the source of truth for all blade behavior. The React UI is a thin rendering layer over the engine's LED array output. The engine has zero DOM dependencies and can run headless.

3. **AST-based code generation** — We don't string-concatenate ProffieOS code. `packages/codegen` builds an AST of ProffieOS style templates, validates it, and emits formatted C++ code. This ensures correct nesting, matching angle brackets, and valid template arguments.

4. **Plugin-style extensibility** — New styles, effects, and ignition types are classes implementing well-defined interfaces (BaseStyle, BaseEffect, BaseIgnition). Adding a new style is: create class, register in index, add UI entry.

5. **Offline-first** — All project data persists in IndexedDB. No server required for core functionality. Future community gallery is additive.

## Key Interfaces

```typescript
// packages/engine/src/types.ts

interface BladeStyle {
  id: string;
  name: string;
  description: string;
  getColor(position: number, time: number, context: StyleContext): RGB;
}

interface BladeEffect {
  id: string;
  type: EffectType;
  apply(color: RGB, position: number, context: EffectContext): RGB;
  isActive(): boolean;
  trigger(params: EffectParams): void;
}

interface IgnitionAnimation {
  id: string;
  getMask(position: number, progress: number): number; // 0-1
}

interface StyleContext {
  time: number;
  swingSpeed: number;    // 0-1 normalized
  bladeAngle: number;    // -1 to 1
  twistAngle: number;    // -1 to 1
  soundLevel: number;    // 0-1 normalized
  batteryLevel: number;  // 0-1
  config: BladeConfig;
}

interface RGB {
  r: number; // 0-255
  g: number;
  b: number;
}

interface BladeConfig {
  baseColor: RGB;
  clashColor: RGB;
  lockupColor: RGB;
  blastColor: RGB;
  style: string;
  ignition: string;
  retraction: string;
  ignitionMs: number;
  retractionMs: number;
  shimmer: number;       // 0-1
  ledCount: number;      // typically 144
  [key: string]: any;    // style-specific params
}
```

## ProffieOS Compatibility Target

- ProffieOS 7.x (latest stable)
- Proffieboard V2.2 and V3.9
- Fett263 prop file (saber_fett263_buttons.h)
- Generated code must compile without modification in Arduino IDE with Proffieboard board manager installed
- Support for: Layers<>, BlastL<>, SimpleClashL<>, LockupTrL<>, InOutTrL<>, all standard transitions, AudioFlicker, StyleFire, Pulsing, Stripes, Mix<>, Gradient<>, Rainbow, RotateColorsX<>, responsive functions

## Development Environment

### Source of Truth

- **Local machine** is the development environment (Mac or PC)
- **GitHub** (`kenkoller/KyberStation`) is the canonical remote — all work is pushed here
- **NAS** (`/Volumes/ZDC/` aka Z: drive on Windows) is an optional mirror clone for backup only — never develop directly on the NAS
- There should only be ONE active working copy per machine, cloned from GitHub

### Multi-Machine Workflow (Mac + PC)

Both machines clone from GitHub independently. Standard push/pull to stay in sync:

```bash
# On any machine — always pull before starting work
git pull

# After finishing work — commit and push
git add <files>
git commit -m "feat: description"
git push
```

### PC Setup (Windows)

Prerequisites:
- Git for Windows
- Node.js 20+ (24.x recommended)
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- Windows Terminal + PowerShell or Git Bash

```bash
git clone https://github.com/kenkoller/KyberStation.git
cd KyberStation
pnpm install
pnpm dev
```

Windows launch scripts (`KyberStation.bat`, `KyberStation.ps1`) are provided in the project root.

### Mac Setup

Prerequisites:
- Node.js 20+ (24.x recommended)
- pnpm 9+ (10.x recommended)

```bash
git clone https://github.com/kenkoller/KyberStation.git
cd KyberStation
pnpm install
pnpm dev
```

### Cross-Platform Notes

- `.gitattributes` enforces LF line endings on all source files across Mac and Windows
- `.bat` and `.ps1` files are kept as CRLF for Windows compatibility
- Do NOT develop on the NAS directly — SMB causes issues with file watching, symlinks, and pnpm performance
- If a NAS backup is desired, clone the repo there and `git pull` periodically:
  ```bash
  git clone https://github.com/kenkoller/KyberStation.git /Volumes/ZDC/Development/KyberStation
  ```

## Development Commands

```bash
pnpm install                    # Install all dependencies
pnpm dev                        # Start Next.js dev server
pnpm build                      # Build all packages + app
pnpm test                       # Run all tests
pnpm test:engine                # Engine tests only
pnpm test:codegen               # Codegen tests only
pnpm lint                       # ESLint + Prettier check
pnpm typecheck                  # TypeScript strict check
```

## Conventions

- All files TypeScript, strict mode, no `any` except in types.ts escape hatches
- Components: PascalCase files, named exports, co-located tests
- Engine code: No DOM, no React, pure TypeScript classes
- Commits: Conventional Commits (feat:, fix:, refactor:, docs:, test:)
- PRs: Must pass CI, must have tests for new engine/codegen code
- Branch naming: `feat/description`, `fix/description`, `refactor/description`
