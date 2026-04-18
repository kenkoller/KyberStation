# KYBERSTATION — Project Context

## Overview

KyberStation is a standalone desktop + web application for designing, previewing, and exporting custom lightsaber blade styles for the Proffieboard V3.9 running ProffieOS 7.x. It is a visual style editor, real-time blade simulator, sound font manager, and config generator — think "DAW for lightsabers."

The app targets the Neopixel lightsaber hobbyist community (cosplay, reenactment, collecting, dueling) and aims to surpass every existing tool (Fett263 Style Library web UI, Fredrik's Style Editor, manual config editing) by combining them into a single cohesive experience with features nobody has built yet.

## Release Posture

- **Launch target: as soon as ready.** Not tied to a specific date. Ship as soon as the pre-launch checklist (in `docs/LAUNCH_PLAN.md`) is clean.
- **May 4 (Star Wars Day) is a promotion amplification beat, NOT the launch date.** Launch well before May 4 so users have time to install, design, and flash their sabers before the big day; then do a second wave of outreach in the days leading up to May 4.
- **Tone is humble.** First public programming project, first GitHub project. Acknowledge hobby status, invite feedback, don't overclaim.
- **Contribution policy at launch:** Issues/feedback open, outside PRs not yet accepted. Revisit at 30 days post-launch.
- **Full launch strategy lives in `docs/LAUNCH_PLAN.md`.** Reference it when asked about release plans, Reddit post content, YouTube outreach, or post-launch monitoring.

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

---

## Current State (2026-04-17)

Last git tag: **v0.10.0**. Multiple feature sprints have landed on
`main` past that tag:

- **Landing page + Kyber Crystal spec** (WS1 of the design polish
  pass) — first-impression landing page replacing `redirect('/editor')`,
  plus four crystal-design docs. Shipped in PR #14.
- **WebUSB flash** (feature #16 below) — STM32 DfuSe protocol library,
  FlashPanel UI, dry-run mode, readback verification, 43 mock-based
  tests. **Not yet validated on real hardware.** See
  `docs/HARDWARE_VALIDATION_TODO.md` for the three-phase checklist
  (connect → dry run → real flash) that must pass before a `v0.11.x`
  tag is cut.
- **v0.11.1 — Design Review Polish Pass** (PR #19, merged) — WS2
  alert-color tokenisation, WS3 `ErrorState` primitive + skeleton
  coverage across async panels, WS4 `StatusSignal` primitive + HUD
  glyph pairing (EngineStats FPS readout, PowerDashboard system
  status, StatusBar power/storage/LED indicators, PresetGallery
  era/faction badges). New `CHANGELOG.md` + README landing-hero
  screenshot.
- **Branch protection safeguards** (PR #22, merged) — client-side
  `.githooks/pre-push` blocking force-push/deletion of main, plus a
  `setup-branch-protection` script ready for when the repo upgrades
  to GitHub Pro / goes public.
- **Tiered algorithmic color naming** (PR #21, merged) — three-tier
  name generator for saber colors (landmark + modifier + mood-word)
  expanding the curated palette to full HSL coverage.

Session notes: `docs/SESSION_2026-04-17.md`,
`docs/SESSION_2026-04-17_C.md` (release-readiness wrap-up).
WebUSB protocol reference: `docs/WEBUSB_FLASH.md`.
Release history: `CHANGELOG.md`.

### 23-feature brainstorm — status matrix

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | WYSIWYG Edit Mode | ✅ v0.2.0 | Click blade → moves caret, updates config, re-emits code |
| 2 | Spatial lockup placement | ✅ v0.2.0 | `AlphaL<LockupTrL<…>, Bump<Int<pos>, Int<size>>>` round-trips |
| 3 | Dual-mode ignition | ✅ v0.2.1 | `TrSelect` with saber-up / saber-down variants |
| 4 | Preon editor | ✅ v0.3.0 | `TransitionEffectL<…, EFFECT_PREON>` + engine preview |
| 5 | Spatial blast placement | ✅ v0.3.0 | Position + radius round-trip through `Bump` |
| 6 | Blade-accurate colour | ✅ v0.3.1 | Neopixel gamma + diffusion preview |
| 7 | Saber Wizard (onboarding) | ✅ v0.4.0 | 3-step: archetype → colour → vibe |
| 8 | Sound font pairing | ✅ v0.5.0 | Keyword scoring, "Recommended / Compatible" labels |
| 9 | Crystal reactive glow | ✅ v0.5.0 | `--crystal-accent` CSS var follows base colour |
| 10 | Prop file visual UI | ✅ v0.6.0 | 5 prop files, button-action map reference |
| 11 | Timeline easing curves | ✅ v0.7.0 | 8 named curves with inline SVG preview |
| 12 | Audio-visual sync | ✅ v0.8.0 | Motion swing → audio pitch/volume via `useAudioSync` |
| 13 | Mobile companion route | ✅ v0.9.0 | `/m` — 12 curated presets, swipe nav, deep-link to `/editor` |
| 14 | Validation + polish | ✅ v0.9.1 | Round-trip data-loss fix, theme-token compliance |
| 15 | Long-tail cleanup | ✅ v0.10.0 | Spatial drag/melt/stab, parser warnings, font pairing polish |
| 16 | **WebUSB flash** | 🧪 merged | Protocol + UI on `main`; 43 mock tests pass. Pending hardware validation before `v0.11.x` tag — see `docs/HARDWARE_VALIDATION_TODO.md`. |
| 17 | **Share Pack + Kyber Crystal** | 🧪 v0.12.0 merged | **Three.js Kyber Crystal renderer** (5 Forms, 13 animations, scannable QR), **real v1 Kyber Glyph encoder** (full BladeConfig round-trip through MsgPack → delta → raw-deflate → base58, `/editor?s=<glyph>` URL handler), **Fullscreen camera-zoom reveal** into ACCENT_TOPOLOGY Crystal Chamber, **bloom + env map + tube veins + GPU fleck twinkle** polish pass. Crystal portion of Saber Card (snapshot pipeline) shipped; hilt+blade hero card renderer still pending. Four commits on `feat/kyber-crystal-threejs`, PR #20. See `docs/KYBER_CRYSTAL_3D.md`. |
| 18 | **Community gallery (GitHub PR)** | 📋 planned | Static, PR-moderated. See `docs/COMMUNITY_GALLERY.md` |
| 19 | Tablet-specific layout | ⏸ deferred | Existing responsive breakpoints cover it for now |
| 20 | More spatial effects | ✅ v0.10.0 | drag/melt/stab positioning completed |
| 21 | Hosted gallery + voting | ⏸ deferred | Requires backend; GitHub-PR gallery is the pragmatic alternative |
| 22 | Electron USB serial | ⏸ deferred | Superseded by WebUSB flash (v0.11.0) |
| 23 | Plugin-authored styles | ⏸ deferred | Worth revisiting once the style API stabilises |

### Design audit polish pass (post-review, not part of the original 23)

Output of the 2026-04-17 12-question design review. Plan lives at
`~/.claude/plans/i-m-curious-what-the-glistening-island.md`.

| # | Workstream | Status | Notes |
|---|---|---|---|
| DA-1 | Landing page | ✅ v0.11.1 | Replaces `redirect('/editor')`. Hero (live BladeEngine render with 4-preset rotation) + value strip + CTAs + release strip + footer. `apps/web/components/landing/` + new `apps/web/app/page.tsx`. |
| DA-2 | Alert-color discipline | ✅ v0.11.1 | `globals.css` tokenised. `.console-alert` → `--status-error`. `@keyframes retract-breathe` → `--badge-creative` amber. Era badges → `rgb(var(--era-*))`. Sith/Jedi gradient text → new `--faction-*-deep` tokens. HUD hex (`#22c55e`/`#eab308`/`#ef4444`) in `PowerDashboard` + `EngineStats` → `--status-ok/warn/error`. Remaining raw-hex RGB viz in `BladeCanvas`/`VisualizationStack`/`RGBGraphPanel` intentional (literal R/G/B channel renders). |
| DA-3 | Skeleton + error-state coverage | ✅ v0.11.1 | New `<ErrorState>` primitive (`components/shared/ErrorState.tsx`) with 4 named variants + retry callback + compact mode. Applied to CommunityGallery, PresetBrowser, CodeOutput, OLEDEditor (in-panel) and SaberProfileManager, SoundFontPanel, PresetGallery (toast). CardWriter + FlashPanel intentionally unchanged (existing state machines fit-for-purpose). |
| DA-4 | Color-glyph pairing | ✅ v0.11.1 | New `<StatusSignal>` + `<EraBadge>` + `<FactionBadge>` (`components/shared/StatusSignal.tsx`) pairing color with typographic glyphs (●/◉/✓/▲/⚠/✕ + era monograms ◇/◆/▲/◯/✦/✧ + faction markers ☉/✦/◐/·). Applied in StatusBar, PresetGallery, EngineStats (FPS), PowerDashboard (system status). Colorblind-safe via redundant glyph channel. `TimelinePanel` event-type colors stay raw hex by design (identity colors paired with text labels). |

### Additional sprints planned (beyond the 23-feature brainstorm)

| Version | Sprint | Status | Notes |
|---|---|---|---|
| v0.11.1 | **Design Review Polish Pass** | ✅ shipped | All four workstreams merged to main via PR #14 (WS1 Landing Page) and PR #19 (WS2/WS3/WS4 + docs + housekeeping). See `CHANGELOG.md` for full entry and `docs/SESSION_2026-04-17_C.md` for the release-readiness wrap-up. |
| v0.11.2 | **Color Naming Math** | 🧪 partial | PR #21 (tiered base generator) merged. Follow-up polish pass on PR #23 (compound threshold + shorter Tier 3 mood words) in flight. |
| v0.11.3 | **Modular Hilt Library** | 🧪 complete, awaiting merge | 33 original line-art SVG parts across 5 type dirs composed into 8 canonical assemblies (Graflex, MPP, Negotiator, Count, Shoto Sage, Vented Crossguard, Staff, Fulcrum). 3-agent parallel fan-out via `feat/hilt-parts-{top,body,bottom}` merged back to `feat/hilt-library`. `HiltRenderer` supports vertical + horizontal orientation via internal viewBox rotation. 18 unit tests cover composition, connector validation, and catalog conformance. Plan: `~/.claude/plans/feat-hilt-library.md`. Spec: `docs/HILT_PART_SPEC.md`. PR #30. |
| v0.12.0 | **Kyber Crystal — Three.js renderer** | ✅ shipped (PR #20) | Four commits: foundation (ddc5ee7) + camera-zoom reveal (1276edd) + real glyph encoder (783c3c6) + visual polish (59ed6f3). 294/294 tests. Deferred follow-ups: Crystal Vault panel, Re-attunement UI, favicon replacement, phone-camera scan validation, `CANONICAL_DEFAULT_CONFIG` drift-sentinel, `<HiltMesh>` extraction. Spec/arch in `docs/KYBER_CRYSTAL_3D.md`. |
| v0.12.x | **Visualization Polish Pass** | 📋 planned | Gamma fidelity, LED bleed, polycarbonate diffusion accuracy, hilt integration, rim glow, bloom curves, motion blur on swing. Reference-stills library from films/shows. Dedicated multi-agent session — originally planned for v0.12.0, reassigned to let the crystal renderer take that slot. |
| v0.13.0 | **Kyber Forge (ultra-wide showcase)** | 📋 planned | Dedicated layout mode for 21:9 / 32:9 / 32:10 displays. Blade+hilt hero full-width; flanking setup (left) + quick-options (right) sidebars; pixel-level LED debug row synced 1:1 beneath the hero; analysis panels stacked in a bottom row; status-ticker at the base. Cosplay + fan-film + livestream-optimised. |
| v0.14.0 | **Preset Cartography** | 📋 planned | Parallel-agent preset expansion. Deep-cut lanes: Prequel/OT/Sequel Jedi & Sith, Legends/KOTOR/SWTOR (incl. Dark Forces / Jedi Knight / Outcast / Academy), Animated/Rebels/BadBatch, Sequel/Mando/Ahsoka/Acolyte, Space-combat (Rogue Squadron / X-Wing / TIE Fighter / Squadrons / Rebel Assault), Cross-franchise "inspired by". Could 4-5× the preset library in one session. |
| v0.15.0 | **Multi-Blade Workbench** | 📋 planned | Channel-strip UI for editing dual-blade sabers / saberstaffs / crossguards. Blade-switching in the workbench. Sync / Unsync toggle for symmetry vs independence. Glyph format already supports multi-blade from v1, so this is purely the editing UI side. |

Legend: ✅ shipped · 🧪 complete, awaiting merge · 🚧 in progress · 🔜 next sprint · 📋 planned (doc exists) · ⏸ deferred

### Cross-session coordination (as of 2026-04-17, late session)

Multiple claude sessions have been running in parallel on this project.
Discipline that carried the v0.11.1 multi-session phase through to
green CI on main:

1. **Branch per workstream. Never commit directly to main.** PRs are
   how work lands. Client-side `.githooks/pre-push` (PR #22, on main)
   now blocks accidental force-push + deletion of main for any clone
   that has run `pnpm run hooks:install`.
2. **Before starting any workstream:** `git fetch origin && git log
   --oneline origin/main ^HEAD && git diff origin/main --name-only`
   to see what's moved. The v0.11.1 merge order (WebUSB → WS1 → Kyber
   Crystal spec → v0.11.1 polish pass) worked because each merge
   created a clean base for the next.
3. **When wrapping a session:** use the generic wrap-up prompt
   documented in `docs/SESSION_2026-04-17_C.md` — it separates
   ship-ready work from deferred work, enforces a typecheck + test
   gate before commit, and requires deferred items to land in the
   PR description or CHANGELOG before close.
4. **Conflict audit checklist before cross-session merge:** (a) diff
   each PR's file footprint, (b) check `package.json` + `pnpm-lock.yaml`
   for dep conflicts, (c) prefer the smallest-footprint PR first so
   subsequent rebases are trivial.
5. **Active branches (late session 2026-04-17):** `feat/kyber-crystal-threejs`
   (PR #20, Three.js renderer + reveal scene), `feat/naming-math-polish`
   (PR #23, polish on top of merged naming math), `feat/hilt-library`
   (pre-PR, cataloging hilt parts). Lint-enforcement sprint is the
   planned Phase C4 follow-up after those land.

### Architecture decisions made this session

1. **BladeConfig mirror + drift-sentinel.** `.npmrc` sets
   `node-linker=hoisted` + `symlink=false`, so `packages/codegen` can't
   `import` from `packages/engine` at compile time. Instead of a refactor we
   keep a **mirror** of `BladeConfig` in `packages/codegen/src/ASTBuilder.ts`,
   and a vitest test (`typeIdentity.test.ts`) imports the real engine type
   through a vitest-only alias and asserts structural equivalence. Drift
   fails CI.

2. **`astBinding.ts` six-seam façade.** `configToAST` / `astToCode` /
   `codeToAST` / `astToConfig` / `syncFromConfig` / `syncFromCode` live in
   one module. Pure math (`hitToLED`, `positionToProffie`, `clamp01`) lives
   alongside. One import path for everything that crosses the config ↔ AST
   ↔ text boundary.

3. **Transition map as single source of truth.** `packages/codegen/src/transitionMap.ts`
   holds every transition ID with `{ kind, buildAST(ms), matches(node),
   extractMs(node), preferForInverse }`. Fixed the pre-existing
   `standard ↔ scroll` round-trip swap where emitter and parser each had
   their own half of the mapping.

4. **Lexer consumes `::`.** `packages/codegen/src/parser/Lexer.ts` now
   treats `SaberBase::LOCKUP_NORMAL` as one token. Previously the lexer
   split on `:`, making `LockupTrL<..., SaberBase::LOCKUP_NORMAL>` look
   like 5 args to the parser and triggering spurious arg-count warnings.

5. **GPL-3.0 attribution chain.** KyberStation source is MIT. ProffieOS
   fixtures and template reference material derived from the ProffieOS
   project are GPL-3.0; `LICENSES/ProffieOS-GPL-3.0.txt` carries the full
   text and `README.md` documents the aggregate-work separation (§5). Fett263
   prop file helpers sit under the same aggregate.

6. **Theme-token discipline.** All colour / radius / size decisions must
   reference a CSS variable, not a Tailwind arbitrary hex. Enforced via
   `git grep` checks in the v0.9.1 verification pass. Exception:
   `OLEDPreview.tsx` intentionally hardcodes black/white to simulate the
   hardware OLED — that is a simulation concern, not a theme concern.

7. **Community gallery via GitHub PR.** Instead of hosting a backend for
   submissions + voting, curated presets live in
   `packages/presets/src/characters/community/` and contributors open a
   PR. Reviews are the moderation; merges are the publication. Zero
   infra, one clean audit trail, and contributor attribution via git.

8. **WebUSB flash is a separate sprint (shipped v0.11.0).** ProffieOS
   Workbench already proves WebUSB flashing is safe for STM32 DFU on
   Proffieboard V3.9. The only real risk (bricked board) is mitigated
   by STM32's BOOT-pin DFU recovery. Implementation is isolated to
   `apps/web/lib/webusb/` + `FlashPanel.tsx` — the visual editor is
   untouched. The protocol is tested against a pure-TypeScript DfuSe
   mock (`apps/web/tests/webusb/`). See `docs/WEBUSB_FLASH.md` for
   details.

9. **Pre-built firmware ships as a convenience, not a requirement.** A
   GitHub Actions matrix job (`firmware-build.yml`) compiles ProffieOS
   7.x for V3-standard / V3-OLED / V2-standard. The FlashPanel falls
   back gracefully (user-friendly error + file picker hint) when a
   bundled binary is absent — power users always have the "custom .bin"
   path via file upload, so missing binaries don't break the feature.

10. **Crystal renderer is Three.js, not SVG (v0.12.0).** Option C from
    the design brainstorm won over pre-rendered PNGs (Option A) and
    hand-authored SVG (Option B). Only Three.js delivers photoreal-
    stylised quartz + real refraction/transmission/iridescence + the
    stretch-goal camera-zoom reveal into the hilt's Crystal Chamber
    LED segment. `MeshPhysicalMaterial` carries the PBR weight;
    `UnrealBloomPass` + `RoomEnvironment` PMREM carry the polish.
    SVG mockups in `KYBER_CRYSTAL_VISUAL.md` §5 are retained as
    *conceptual art only* and explicitly flagged as placeholder in
    the doc header.

11. **Kyber Glyph v1 is a binding stability contract.** `payload_byte
    version + visual_byte version` at the head of every zlib-deflated
    MessagePack payload per `docs/KYBER_CRYSTAL_VERSIONING.md` §2.
    Encoder lives at `apps/web/lib/sharePack/kyberGlyph.ts`. Delta-
    encoded against a `CANONICAL_DEFAULT_CONFIG` — currently
    duplicated with `apps/web/stores/bladeStore.ts`'s `DEFAULT_CONFIG`.
    **A drift-sentinel vitest (same pattern as the BladeConfig mirror
    in decision #1) is a pending follow-up before v1 is promoted to a
    public stability pledge.** 50-config fuzz + 9 fixtures in
    `apps/web/tests/fixtures/kyberGlyphs/v1/` catch accidental breaks
    today, but the real default-config diff is the load-bearing
    constraint.

12. **Measured vs. pre-implementation glyph sizes.** Default
    Obi-Wan ANH: 18 base58 chars. Typical custom blade: ~130 chars.
    Max-complexity (35+ fields): ~490 chars / QR Version 8. Earlier
    spec in `SHARE_PACK.md` guessed max at ~112 chars / Version 3 —
    doc corrected 2026-04-17. The graceful-overflow fallback path
    (item 5 in the revised ladder) becomes load-bearing earlier than
    the doc implied; detection + toast for
    `?config=<base64>` fallback is not yet implemented.

### Deferred items

**Pending hardware validation:**

- **WebUSB flash on real Proffieboard V3.9** — protocol is fully
  exercised in 43 mock-based tests (including readback verification,
  dry-run, bootloader-advertised wTransferSize). Must be smoke-tested
  against real hardware in three phases: connect-only → dry run →
  real flash. Checklist + success criteria + failure-mode playbook
  in `docs/HARDWARE_VALIDATION_TODO.md`. Blocks moving the status
  in the feature table above from "✅ shipped" to "✅ validated".

**Share Pack — partially shipped, partially deferred:**

- Shipped in v0.12.0: Kyber Glyph v1 encoder, `?s=<glyph>` URL handler,
  Three.js Kyber Crystal with scannable QR, crystal portion of Saber
  Card snapshot pipeline.
- Still deferred: full Saber Card hilt+blade hero renderer, hum-GIF
  variant, state-cycle-GIF variant, Aurebesh card typography, Discord
  OG meta tags, `?config=<base64>` fallback toast when glyph exceeds
  QR capacity.

**Deferred from v0.11.1 release-readiness pass** (see
`docs/SESSION_2026-04-17_C.md`):

- **Lint enforcement sprint** — ESLint not currently in
  `devDependencies`. Activating it would surface hundreds of
  preexisting issues; scoped as its own sprint with explicit
  triage policy (fix vs `// eslint-disable-next-line`) to avoid
  breaking main.
- **Editor/gallery screenshots for README** — landing-hero screenshot
  shipped in v0.11.1; editor + gallery screenshots blocked by the
  onboarding modal in headless capture. Defer to the sprint that
  next modifies either surface, or a dedicated 30-min micro-sprint.
- **Strict glyph pairing for identity colors** (`TimelinePanel` event
  type markers, `StorageBudgetPanel` segment colors) — currently
  colorblind-safe via paired text labels. Tightening the rule to
  include identity colors is cosmetic polish, not a release blocker.

**Not yet planned:**

- Tablet-specific layout adaptations beyond the existing breakpoints
- Hosted community gallery with voting / comments / profile pages
- Plugin-authored styles (third-party `BladeStyle` implementations)
- OAuth / account system
- Telemetry / analytics
- Server-side blade rendering for the OG-image social preview
- A real installer (`.dmg` / `.msi`) — currently `.app` bundle via
  symlink is the Mac install story

**Intentional deviations from the brainstorm:**

- The "community gallery with voting" (item #21) is replaced with the
  GitHub-PR model (item #18). If demand justifies the cost later, the
  former can layer on top of the latter without breaking contributors.
- "More spatial effects" (item #20) turned into drag/melt/stab
  positioning rather than new effect types — user-value was higher in
  making existing effects placeable than adding more.

### New utilities (reusable)

Added this session; tests co-located unless noted:

| Module | Purpose |
|---|---|
| `packages/codegen/src/astBinding.ts` | Six-seam config ↔ AST ↔ code façade + pure math |
| `packages/codegen/src/transitionMap.ts` | Single source of truth for ignition / retraction ID ↔ AST |
| `packages/codegen/src/parser/ConfigReconstructor.ts` | Container-based colour + spatial field recovery |
| `apps/web/lib/neopixelColor.ts` | sRGB → linear + WS2812b bias + diffusion desaturation |
| `apps/web/lib/easingMath.ts` | 8 named curves including bounce + elastic (SSR-safe) |
| `apps/web/lib/fontPairing.ts` | Keyword-based font ↔ config scoring + pairing label |
| `apps/web/lib/factionStyles.ts` | Jedi / Sith / Grey / era / badge → CSS var lookup |
| `apps/web/hooks/useCrystalAccent.ts` | Publishes `baseColor` as `--crystal-accent` |
| `apps/web/hooks/useAudioSync.ts` | Swing-driven audio pitch/volume modulation |
| `apps/web/lib/webusb/` | WebUSB + STM32 DfuSe protocol (v0.11.0): `DfuDevice`, `DfuSeFlasher`, memory-layout parser, connect façade |
| `apps/web/components/editor/FlashPanel.tsx` | Disclaimer → connect → flash state machine with progress UI |
| `apps/web/components/shared/ErrorState.tsx` | v0.11.1 — named error-state presentation (`load-failed`/`parse-failed`/`save-failed`/`import-failed`) with retry callback + compact mode |
| `apps/web/components/shared/StatusSignal.tsx` | v0.11.1 — color + glyph pair indicator (●/◉/✓/▲/⚠/✕) plus `EraBadge` + `FactionBadge` for colorblind accessibility |
| `.githooks/pre-push` + `scripts/install-git-hooks.mjs` | v0.11.1 — client-side safeguard blocking force-push / deletion of main (paywall workaround until repo upgrades to GitHub Pro or goes public) |
| `scripts/setup-branch-protection.mjs` | v0.11.1 — post-upgrade automation for server-side ruleset |
| `apps/web/lib/crystal/` | **Three.js Kyber Crystal (v0.12.0)**: `renderer.ts` (scene driver), `materials.ts` (PBR + `MATERIAL_TUNING` table), `geometry.ts` (5 Forms + hybrid normals + tube veins), `animations.ts` (13-trigger controller), `qrSurface.ts` (real `qrcode` + WCAG contrast), `lighting.ts`, `hash.ts` (FNV-1a + mulberry32), `postProcessing.ts` (UnrealBloomPass), `reactComponent.tsx` (R3F wrapper), `cameraChoreographer.ts` (Fullscreen dolly) |
| `apps/web/lib/sharePack/kyberGlyph.ts` | v1 Kyber Glyph encoder/decoder: MsgPack + delta-vs-default + raw-deflate + base58. Archetype prefix (`JED/SIT/GRY/CNO/SPC`). Version-byte routing. |
| `apps/web/lib/sharePack/cardSnapshot.ts` | 1200×675 Saber Card PNG with crystal accent in bottom-right; hero area is labelled placeholder pending full Share Pack card renderer |
| `apps/web/components/editor/CrystalPanel.tsx` | "My Crystal" dockable Workbench panel (Design tab, col 3) |
| `apps/web/components/editor/CrystalRevealScene.tsx` | R3F overlay for the Fullscreen camera-zoom reveal |
| `apps/web/hooks/useSharedConfig.ts` | Now handles `?s=<glyph>` in addition to the legacy `?config=<base64>` |

### Test coverage (top-level)

- **Engine**: style output stability, effect activation / decay, ignition
  masks, motion simulation determinism
- **Codegen**: AST round-trip (config → code → config), transition map
  inverse coverage, parser warnings, type-identity drift sentinel,
  reconstructor spatial field recovery
- **Web**: applyReconstructedConfig import round-trip, factionStyles
  lookup, easingMath numeric stability, fontPairing scoring

### Verification shortcuts

```bash
# Type / lint / test health
pnpm -w typecheck && pnpm -w lint && pnpm -w test

# Theme-token discipline
git grep "accent-\[var(--color-accent)\]" apps/web      # must be zero
git grep "text-\[9px\]" apps/web                        # must be zero

# Visual QA: Journey 6 round-trip (manual)
# 1. Build config with Preon ON + lockup 33% + blast 50% + dual-mode ignition
# 2. Copy emitted code
# 3. Paste into C++ import panel → Parse → Apply
# 4. Confirm every field above survives unchanged
```
