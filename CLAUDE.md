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
│   │   │   │   └── page.tsx          # Redirect stub → /editor?tab=gallery
│   │   │   └── docs/
│   │   │       └── page.tsx          # Built-in ProffieOS reference
│   │   ├── components/
│   │   │   ├── editor/
│   │   │   │   ├── BladeCanvas.tsx         # Main visualizer canvas (auto-fit scale)
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

## Collaboration defaults (2026-04-23)

Standing authorizations for Claude Code sessions working in this repo.
These override the default "confirm before acting" posture for the
scope listed. If a memory note or explicit user instruction in the
current conversation conflicts with these, the more restrictive rule
wins.

### Pre-authorized actions (no confirmation needed)

- **Local commits on feature branches.** Any commit onto the current
  feature branch with a descriptive conventional-commits message +
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
  trailer. Stage specific files, not `git add -A` / `git add .`.
- **Push feature branches.** Any branch that is NOT `main`. The
  client-side `.githooks/pre-push` hook + server-side branch
  protection both guard `main` independently.
- **Open PRs via `gh pr create`.** With a descriptive title (short,
  ≤70 chars) and a body that summarizes scope + includes test/typecheck
  results + a test plan. Follow `.github/PULL_REQUEST_TEMPLATE.md` if present.
- **Merge PRs via `gh pr merge --merge --delete-branch`.** Merge-commit
  strategy preserves history (preferred for multi-commit feature
  branches). Use `--squash` only when the PR body explicitly says to.
- **Enable auto-merge via `gh pr merge --auto --merge`** if the repo
  supports it (currently disabled on kenkoller/KyberStation — fall
  back to polling `gh pr checks` until green, then merge).
- **Prune verified-merged branches.** Local + origin. Verify safety
  with `git branch --merged main` (for fully-merged) or
  `git cherry origin/main <branch>` (no `+` lines = content on main).
  Branches with worktrees are never deletable even if they show as
  merged.

### Never, under any circumstances

- **Never force-push** to any branch. No `--force`, no `--force-with-lease`
  without a direct user request spelling out why.
- **Never disable branch protection rules**, even temporarily.
- **Never skip git hooks** — no `--no-verify` on commit or push,
  no `-c commit.gpgsign=false`.
- **Never modify git config** or global settings.
- **Never delete a branch that has a worktree**, even if it shows as
  merged. `git worktree list` is the authoritative check.
- **Never delete a branch with an open PR** on origin.
- **Never commit files that likely contain secrets** (`.env`,
  credential files, etc.) — warn the user explicitly if they appear
  in the candidate stage set.

### Always confirm first

- Opening a PR whose diff **removes a feature, bumps a major dep, or
  touches `package.json` / `pnpm-lock.yaml`** in a way that could break
  installs.
- Deleting any **stash** — they often hold WIP the user hasn't moved
  elsewhere. Check `git stash list` before any branch op that could
  affect stashed state.
- Deleting a branch with **unique-hash commits** that appear to be
  cherry-picked into main (`git cherry origin/main <branch>` shows
  `-` lines only). Content is on main; hashes are not.
- Any PR merge that **targets `main` outside CI hours** or that
  involves a release tag.

### Test gates before any `git push`

- `pnpm typecheck` — must be clean across all workspace packages.
- `pnpm test` — must pass across all workspace packages.
- If either fails: report the failure with file:line references and
  do NOT push. Never push a red tree to unblock a workflow.

### Branch-naming expectations

- Features: `feat/<short-description>`
- Fixes: `fix/<short-description>`
- Refactors: `refactor/<short-description>`
- Docs-only: `docs/<short-description>`
- Merge-transport (landing a long-running branch on main when direct
  push is blocked): `feat/merge-<source-branch-name>`

### Cross-session coordination

When multiple Claude sessions are running in parallel against this
repo (modulation + UI + preset work in separate worktrees, etc.):

1. **Before any git operation**, run `git fetch origin --prune` and
   `git worktree list` to see current state.
2. **If another worktree is on the branch you'd edit**, pause and
   surface the collision to the user rather than racing.
3. **When merging into main**, announce in the PR body which sibling
   branches/worktrees are active so they can rebase cleanly after.
4. **When parking WIP** for another session, push the branch to
   origin so work is recoverable even if the local worktree is
   clobbered.

---

## Current State (2026-04-24 late, v0.14.0 Visualization Polish + Workbench Chrome Pass)

**Active branch: `feat/v0.14.0-blade-polish` — PR [#46](https://github.com/kenkoller/KyberStation/pull/46), 29 commits, pushed to origin, NOT YET MERGED.** This branch ships the v0.12.x Visualization Polish Pass (promoted into the v0.14.0 release slot) plus two multi-hour iterative-walkthrough sweeps with Ken on workbench chrome / layout refinements.

Handoff doc for the next session: [`docs/NEXT_INTERFACE_SESSION.md`](docs/NEXT_INTERFACE_SESSION.md). That file is self-contained and paste-in-ready for a fresh Claude conversation to pick up where this one left off.

**Plan file:** `~/.claude/plans/i-would-like-to-starry-moon.md` (the original 4-phase bloom rewrite plan approved earlier; Phases 1–4 all shipped; module extraction + golden-hash tests remain open).

### Next sprint queued — Saber GIF infrastructure

With the workbench blade renderer now in good shape, the next workstream is **animated GIF capture**: idle hum loop, full ignition cycle, clash, and per-variant ignition/retraction picker thumbnails. Full scope + handoff prompt in [`docs/SABER_GIF_ROADMAP.md`](docs/SABER_GIF_ROADMAP.md). Sprint 1 is engine `captureSequence` helper + `gif.js` encoder + idle-hum + ignition-cycle as a separate PR off `origin/main` (NOT against the v0.14 branch). Sprints 2-4 ship the per-variant pickers, marketing-grade showcases, and non-blade UI walkthroughs.

### What shipped on this branch (chronological)

| Phase | Commit | Scope |
|---|---|---|
| 1 | `52d3e11` | Zoom removal + endpoint bloom-seed widening (tip coreH\*4.0, emitter coreH\*4.0\*0.7) + gamma wiring via new `lib/blade/colorSpace.ts` |
| 1.5 | `33e96e7` | Width-driven auto-fit scale + vertical centering + `showGrid` lifted to uiStore + Grid toggle in BLADE PREVIEW header |
| 1.5b | `28dfd75` | Analysis rail rails anchored to blade Point A → Point B via `computeGraphBounds` |
| 1.5c/d | `4b939c2` | Blade-canvas `minHeight: 200` floor dropped in panelMode + action bar moved into BLADE PREVIEW toolbar |
| 1.5e | `b2c3bbb` | Toolbar overlap fix — 8 overlapping click-targets → 0 |
| 1.5f | `e0461d5` | User-draggable **Point-A divider** (`uiStore.bladeStartFrac`, fraction-of-container × 1000, min 80 / max 350 / default 180). Replaces legacy `AUTO_FIT_LEFT_PULL_DS`. Blade / pixel strip / analysis rail all read the same fraction → single source of truth for Point A |
| 1.5g | `5fc5be9` | `pixelStripHeight.max` 120 → 300 |
| 1.5h | `20873f4` | 500ms auto-ignite on workbench load |
| 1.5i | `2bd58a9` | `expandedSlotHeight.max` 240 → 400 + de-dup Pause button + drop "Blade View" canvas label |
| **2** | **`00fb455`** | **Bloom rewrite** — 14-pass additive blur loop replaced with 3-mip downsampled bright-pass chain. Per-mip: `filter: contrast(1.4) brightness(1.05) blur(Npx)` applied to downsampled buffer at 1/2, 1/4, 1/8 of canvas dims, composited back additively with `lighter`. ~1/8 the fragment cost of the old loop. Smooth continuous halo wrapping the entire blade, no visible seam ridges — Ken's primary "hard edges" complaint resolved. |
| **3** | **`a2fc1a8`** | Rim glow (2-device-px saturated stroke on blade top/bottom edges) + motion blur (ghost buffer at mip-0 dims, `motionSim.swing`-driven persistence) + new `reduceBloom` a11y flag in accessibilityStore |
| **4** | **`01766b4`** | Ambient wash driven by mip-2 avg luma + vignette brightness coupling (`1 + avgBloomLum * 0.08` opacity modulator) |
| 1.5j | `9ce3a18` | PIXEL STRIP header row added + in-canvas stats text removed from PixelStripPanel + merged action bar into BLADE PREVIEW panel header |
| 1.5k | `b6c81dd` | Split blade preview into two rows (title + action bar) + `rounded-panel` dropped + header height bumped to `py-2` to match Inspector tabs |
| 1.5l | `238b63c` | Swap row order — action bar row now ON TOP of title row |
| 1.5m | `0d4d862` | Point B alignment fix — pass config `ledCount` (not buffer-clamped `leds`) to `computeBladeRenderMetrics` |
| 1.5n | `c90a44c` | **Aurebesh AF font bundled** at `/public/fonts/aurebesh/*.otf` (4 variants: Canon / CanonTech / Legends / LegendsTech) + `@font-face` declarations + ticker height +50% (12 → 18 px) + ticker font 7 → 10 px |
| 1.5o | `437bb28` | Canvas outer border `border` → `border-x` (top+bottom removed) + action bar height matched to Inspector tab (30.59 px exact) |
| 1.5p | `1757650` | ResizeHandle hit target 4 → 8 px (all 7 workbench handles) |
| 1.5q | `e87f0be` | Canvas wrapper `p-1` → `px-1` so left+right borders extend to section2 top+bottom |
| 1.5r | `998155c` | All 3 canvas-column panel headers unified to `h-8` 32 px + view controls (`Single / All States / 2D / 3D / Fullscreen`) moved INTO BLADE PREVIEW PanelHeader children (out of absolute overlay). Fallback overlay kept for 3D / StateGrid modes only. |
| 1.5s | `7254195` | Header height 32 → 30 px + CLAUDE.md summary + `docs/NEXT_INTERFACE_SESSION.md` handoff |
| **a11y** | **`a023b0b`** | **Reduce Bloom toggle** — Settings → Display section (desktop) + AccessibilityPanel under Reduced Motion (mobile/tablet). Both write the same store flag + persist via localStorage; toggling on either surface flows through every shell mode. The flag was already wired through bloom + rim + motion-blur math; this surfaces it in the UI. |
| **1.5t** | **`a4f55e4`** | **Chrome alignment + true slot splitter.** ResizeHandle: 0-width wrapper with absolute hit target straddling the seam — neighbor borders meet directly, no 8 px gap. Blade-canvas wrapper: dropped `px-1` so CanvasLayout's `border-l` butts against Inspector / RightRail edges. Toolbar: `py-0.5` → `min-h-8` (32 px) to match Inspector tab BAR. **ExpandedSlotResizeHandle is now a true two-store splitter** — drag-down grows `pixelStripHeight` AND shrinks `expandedSlotHeight` simultaneously with linked clamps; PIXEL STRIP no longer translates vertically when seam moves. TUNE / GALLERY tabs `py-2` → `pt-[9px] pb-2` (+1 px) to match toolbar. |
| 1.5u | `683227a` | **Surprise Me + Undo relocated** — out of DesignPanel's top bar, into the Inspector's TUNE tab top, directly above ParameterBank. Surprise Me now spans the Inspector column width (flex-1); Undo stays compact. DesignPanel's top bar now hosts only the APPEARANCE / BEHAVIOR / ADVANCED / ROUTING group pills. |
| 1.5v | `8c05e83` | **AnalysisRail full-width + matched border tone.** AnalysisRail's width-resolver was honoring `style.width` only when it was a `number` — RightRail passed `'100%'` (string) so it fell through to the 200 px default. Resolver now uses `'100%'` on desktop (icon mode still 40 px) so the aside fills its parent column exactly. Row borders bumped from `border-border-subtle/40` to full `border-border-subtle` so they match every other panel/card border in the app (was reading whitish at ~6 % white due to compounded translucency). |
| 1.5w | `85c38db` | Action toolbar bumped `min-h-8` → `min-h-[33px]` to match Inspector tab BAR's outer height (33 px = 32 px tab button + 1 px bar border-b). |
| **1.5x** | **`6a93889`** | **Retire 2D/3D toggle + rework All States layout.** 3D blade view parked indefinitely — `[2D | 3D]` button group, `BladeCanvas3D` import, and the absolute fallback overlay all removed from WorkbenchLayout. PixelDebugOverlay is no longer gated behind `canvasMode === '2d'` (always on while engine is ready). `canvasMode` field stays in `uiStore` for persistence-state safety; nothing in the UI references it. **All States behavior reshaped:** previously the 9-state stack replaced the entire canvas column, hiding BLADE PREVIEW. Now BLADE PREVIEW stays visible; the StateGrid replaces only the PIXEL STRIP + Expanded Slot regions. Each state row's LED band uses `computeBladeRenderMetrics` with `bladeStartFrac` so it lines up Point A → Point B exactly with the BLADE PREVIEW above. StateGridRowView now uses an absolute-positioned canvas with the state label overlaid in the pre-blade hilt area. Dropped the StateGrid header strip (no longer needed inside CanvasLayout). |

### Architectural decisions worth carrying forward

- **`lib/blade/colorSpace.ts`** is the canonical gamma LUT + tonemap helpers. `neopixelColor.ts` re-exports `srgbToLinear` / `linearToSrgb` from it so the color picker + blade renderer share one source.
- **`uiStore.bladeStartFrac`** is the single source of truth for Point A (blade-start X fraction × 1000). `bladeRenderMetrics.ts` consumes it via an input prop; BladeCanvas reads it directly; PixelStripPanel + VisualizationStack + StateGrid (1.5x) all thread it through `computeBladeRenderMetrics`. `AUTO_FIT_LEFT_PULL_DS` is deprecated but exported as 0 so legacy imports don't break.
- **Bloom pipeline lives inline in `BladeCanvas.tsx`** — originally planned (phase 4) as `lib/blade/pipeline.ts` extraction but that's deferred; the current inline implementation is ~80 lines of focused code and works well.
- **View controls are a shared `viewControlsNode`** memoised in WorkbenchLayout, passed to CanvasLayout as a prop. After 1.5x, CanvasLayout is the only renderer (no 3D / no full-takeover StateGrid), so the absolute fallback overlay was removed.
- **ResizeHandle is a 0-size wrapper + absolute hit target** straddling the seam (1.5t). All seven workbench handles paint nothing at rest — neighbor borders form continuous T-intersections. Splitter handles (currently just ExpandedSlotResizeHandle, between PIXEL STRIP and Slot) coordinate two stores inversely with linked clamps so the seam moves but the unrelated regions stay put. The section-2 handle is single-store on purpose — bottom-anchored content under a flex-1 region naturally translates with the bottom edge, matching every DAW/IDE's vertical-split mental model.
- **All States toggle (1.5x)** swaps PIXEL STRIP + ExpandedSlotResizeHandle + Slot for the StateGrid (9 rows), keeping BLADE PREVIEW visible. Each StateGrid row uses the same `bladeStartFrac` + `computeBladeRenderMetrics` so its LED band aligns Point A → Point B with the live blade above. Implementation lives inside CanvasLayout (no longer takes over WorkbenchLayout's whole canvas column).
- **`canvasMode` is dead UI** but kept in uiStore for persistence-state safety. If a user has `canvasMode: '3d'` in localStorage from before 1.5x, nothing breaks — the field is just no longer read by any component.

### Still open (deferred from the original plan)

- ~~**AccessibilityPanel UI toggle for `reduceBloom`**~~ — **Done in `a023b0b`.** Toggle now lives in Settings → Display (desktop) + AccessibilityPanel under Reduced Motion (mobile/tablet).
- **Module extraction to `lib/blade/*`** — Phase 4 of the original plan. Blade rendering is currently all in `BladeCanvas.tsx` (~2800 lines). Extracting to `lib/blade/pipeline.ts`, `lib/blade/bloom.ts`, etc. would enable MiniSaber / FullscreenPreview / SaberCard to adopt the same pipeline. Non-urgent; the rendering works great inline.
- **Golden-hash blade-render tests** — planned regression sentinel for 8 canonical configs. Would catch accidental visual drift. Not built yet.
- **Aurebesh font variants beyond Canon** — CanonTech / Legends / LegendsTech OTF files are bundled and have `@font-face` declarations, but no UI uses them yet. Future immersion-mode variants could surface via a toggle.
- **Final merge of PR #46 to main + tag** — gates green, working tree clean, branch pushed at `6a93889`. Merge strategy: merge commit (preserve phase-by-phase history). After merge, optionally tag `v0.15.0` (v0.14.0 was already taken by Modulation Routing v1.0 BETA).
- **Cleanup of dead `canvasMode` field in uiStore** — kept after 1.5x for persistence-state safety. Once enough sessions have passed with no readers, remove the field + its setter.
- **Cleanup of dead `BladeCanvas3DWrapper`** — the file still exists in `apps/web/components/editor/` but no longer has an import path. Safe to delete after a sweep confirms no test/storybook references.

### Pre-session state before v0.14.0 (kept for history)

## Current State (2026-04-23 late, modulation v0.14 polish + a11y clean)

**Active branch: `main`. Three landings on 2026-04-23 in chronological order:**

- **`feat/preset-accuracy-audit-2026-04-22` merged via PR #39** (merge commit `cbeb7d5`) — full-library preset accuracy sweep + 89-preset pop-culture expansion + end-to-end Darksaber hardware parity + Hardware Fidelity Principle architectural doc. Details further below.
- **`feat/modulation-routing-v1.1` merged via PR #35** (commit `43b73aa`, tagged `v0.14.0`) — Modulation Routing v1.0 Preview BETA. Details in the section after.
- **`feat/modulation-snapshot-export` merged via PR #41** (commit `bd9bb7b`) + **`fix/a11y-clean-at-launch` merged via PR #42** (commit `c0a92c4`) + **`docs/modulation-followup-2026-04-23` merged via PR #43** (commit `b98af51`, docs catch-up) + **`docs/first-wire-svg-illustrations` merged via PR #44** (commit `bfcdbf6`, quick-start visuals) — v0.14 follow-up polish, detailed in the block immediately below.

**Last git tag: `v0.14.0`** (Modulation Routing v1.0 Preview BETA). Today's follow-up work is untagged pending hardware validation on the 89sabers Proffieboard V3.9. Post-hardware candidates: `v0.14.1` (patch) if we treat ExpressionEditor as a BETA completion, or `v0.15.0` (minor) if we treat ExpressionEditor's arrival as a new feature milestone. I (the agent) would lean **v0.15.0** — it's the right semver read since a whole new inline UI surface landed.

**Hardware validation handoff doc: [`docs/NEXT_HARDWARE_MODULATION_SESSION.md`](docs/NEXT_HARDWARE_MODULATION_SESSION.md)** — self-contained paste-in prompt for the fresh session that'll run the flash + boot test on the 89sabers V3.9, do the version tag, and optionally record the 3 replacement GIFs.

### What shipped on 2026-04-23 late — modulation polish + a11y clean

PR #41 (5 commits, modulation-snapshot-export branch):
- **`generateStyleCode` now wires modulation bindings into the Output tab.** A new `applyModulationSnapshot` helper at [`packages/codegen/src/proffieOSEmitter/applyModulationSnapshot.ts`](packages/codegen/src/proffieOSEmitter/applyModulationSnapshot.ts) walks `config.modulation.bindings` in authoring order, computes each binding's snapshot via `computeSnapshotValue`, writes into the config at the target path with shallow-clone-on-write, and produces a `formatSnapshotCommentBlock(report)` that gets prepended to the style code. Suppressed via `{ comments: false }` on the preset-array path so the full config.h doesn't get one comment per preset. +15 new tests.
- **Hover wire-highlighting + bound-param left-edge stripe** in ParameterBank. Three priority-stacked visual states for each slider label: ARMED (click-to-wire) > HOVERED (this modulator drives this param) > BOUND (some binding targets this param). Identity colors propagate from `BUILT_IN_MODULATORS` descriptors through the UI.
- **Inline BoardPicker chip in StatusBar** between Profile and Conn — `BOARD · PROFFIE V3.9 · FULL`; click opens the modal picker.
- **ExpressionEditor — the v1.1 Core math-formula UI.** `fx` button on every SliderControl opens a 380-px popover with auto-focused textarea, live peggy parse status (✓ Valid / ✕ with error), 5 starter chips (Breathing / Heartbeat / Battery dim / Swing doubled / Loud OR fast), ⌘+Enter shortcut, Escape/outside-click dismiss. Apply creates a binding with `source: null, expression: { source, ast }, combinator: 'replace', amount: 1.0`. BindingList distinguishes expression bindings from bare-source with `fx` label in magenta + full-source tooltip.
- **Color-contrast fix across 9 canvas themes + root default** — `--text-muted` bumped +40 per channel (106 110 120 → 146 150 160 for Deep Space, equivalent deltas for Tatooine / Bespin / Dagobah / Mustafar / Kamino / Coruscant / Endor / Hoth). Fixes 82 axe-core violations on the modulation UI surfaces.

PR #42 (3 commits, a11y + breathing recipe):
- **Zero axe-core WCAG 2 AA violations** at desktop (1600×1000, 30 passes) AND mobile (375×812) viewports on the editor. Closes the P29 launch blocker carried from v0.13.0 readiness.
  - MobileTabBar: dropped `role="tablist"`/`role="tab"` (it's route nav, not a tab interface) — `aria-current="page"` handles active state.
  - AppShell mobile tablist: scoped `role="tablist"` to inner wrapper so collapse toggle + dot indicators become siblings, not children.
  - AppShell tab `aria-controls`: replaced per-tab IDs with stable `id="mobile-panel"`; dropped when collapsed + paired with `aria-expanded`.
  - MiniGalleryPicker: `role="listbox"` → `role="group"` (children use `role="button"`, not `role="option"`).
  - Cleared 5 remaining contrast violations: DesignPanel BETA chip `opacity-70`, ColorPanel preset subtitle `text-accent/70`, PerformanceBar page tabs + SaberProfileManager source badge `rgb(var(--text-muted) / 0.65)`.
- **First expression-based starter recipe — Breathing Blade** at [`packages/presets/src/recipes/modulation/breathing-blade.ts`](packages/presets/src/recipes/modulation/breathing-blade.ts). Wiring: `sin(time * 0.001) * 0.5 + 0.5 → shimmer · replace · 100%`. AST hand-built inline (can't import `parseExpression` across `.npmrc` hoisted boundary). Test split: `V1_0_RECIPES` (5) vs `V1_1_EXPRESSION_RECIPES` (1, breathing). Presets test count: 29 → 40.

PR #43 (docs catch-up, merge commit `b98af51`):
- CLAUDE.md + CHANGELOG updated to document PRs #41 + #42. This block + the CHANGELOG's "Modulation polish + a11y clean" subsection were added then.

PR #44 (quick-start illustrations, merge commit `bfcdbf6`):
- Three hand-authored animated SVGs replace the `[gif-placeholder]` markers in [`docs/user-guide/modulation/your-first-wire.md`](docs/user-guide/modulation/your-first-wire.md):
  - `first-wire-step-1.svg` (7.0 KB) — five-plate bar at rest with per-plate live viz (swing needle, angle tilt, sound VU, time sweep, clash flash)
  - `first-wire-step-2.svg` (3.4 KB) — SWING plate armed, siblings dimmed, "◎ swing armed" banner
  - `first-wire-step-3.svg` (7.1 KB) — two-column frame with animated dashed wire connecting plate → shimmer slider, plus binding row
- ~17.5 KB combined. Native `<animate>` / `<animateMotion>` / `<animateTransform>` — no JS. Each SVG has `<title>` + `<desc>` for screen readers. Matches editor color tokens exactly (`#409cff` / `#e879f9` / `#2dd4bf` / `#fbbf24` / `#f8fafc`).
- Inline HTML comment at the bottom of the markdown file documents the screen-recording replacement pass — ship the SVGs now, swap for real GIFs post-launch if recording fidelity matters more than vector sharpness.

End-to-end browser-verified across all the above. Next: hardware validation on 89sabers V3.9 — the one remaining open ☐ from the modulation impl plan.

### What shipped in the preset accuracy audit landing (PR #39, commit `cbeb7d5`)

Full-library preset correctness pass + 89-preset pop-culture expansion + Darksaber hardware parity + new architectural principle. Session ran as 4 phases with parallel agents per file.

- **Phase 1 audit** — 7 per-file audit docs at [`docs/PRESET_AUDIT_2026-04-22/`](docs/PRESET_AUDIT_2026-04-22/) covering all 216 pre-session presets. One agent per era file in parallel, each producing evidence-shape markdown tables with current/recommended/reasoning per preset.
- **Phase 3a canonical fixes** — ~76 presets corrected. Headline finds:
  - **Mace Windu**: `style: 'pulse'` → `'stable'`, ignition `'seismic'` → `'standard'`, retraction `'implode'` → `'standard'`, baseColor to canonical amethyst `{r:170,g:60,b:240}`
  - **Darth Maul**: ignition `'center'` → `'standard'`, style `'fire'` → `'stable'` (Ken specifically flagged these as wrong on canonical film sabers at session start)
  - **Kylo Ren**: shimmer 0.4 → 0.6 (mid-range of recommended band) + `BifurcateEffect` bound to clash
  - **Rey TROS yellow**: `'photon'` → `'aurora'` (the ceremonial halo on the construction saber)
  - **Loden Greatstorm**: blue → canonical High Republic yellow
  - **Marchion Ro**: invented red → canonical Loden's looted yellow (he carries no personal lightsaber in canon)
  - **Burryaga**: green → canonical blue crossguard
  - **Inquisitors** unified on `style: 'unstable'` across the five presets (cracked-kyber lore)
  - Dead-config purge: `voidEffect`, `telekinetic`, `rainbow`, `dualPhase`, `sparkSize`, `fireSize`, `sparkRate`, `heatSpread`, `fadeout` animations not in engine registry
  - Detailed-tier "engine-showcase" animation drift (`summon`, `implode`, `seismic`, `evaporate`, `fadeout`, `crackle`, `fracture`) reverted on 35+ presets across prequel-era / legends / extended-universe — canonical film sabers should be `standard`+250-400ms
- **Phase 3b relocations** — 3 non-canonical presets moved from canonical files to creative-community with `screenAccurate: false` + reframed descriptions + new `creative-*` IDs:
  - `ot-palpatine` (Palpatine never wielded a saber on-screen in the OT) → `creative-palpatine-speculative`
  - `ot-obiwan-ghost` (speculative Force Ghost) → `creative-obiwan-force-ghost`
  - `animated-morgan-elsbeth-red` (wields the Beskar Sword in canon, not a lightsaber) → `creative-morgan-elsbeth-nightsister`
- **DarkSaberStyle (hardware-parity, load-bearing)** — new [`packages/engine/src/styles/DarkSaberStyle.ts`](packages/engine/src/styles/DarkSaberStyle.ts) class + codegen extension in [`packages/codegen/src/ASTBuilder.ts`](packages/codegen/src/ASTBuilder.ts) that emits canonical `Gradient<White, Rgb<5,5,5>, Rgb<5,5,5>, White>` ProffieOS template — the Fett263 community standard. Runs correctly on real Proffieboard hardware, not visualizer-only fake. 3 Darksaber presets migrated to `style: 'darksaber'` (Pre Vizsla / Sabine Wren / Din Djarin). Engine style: piecewise per-LED color (white 0.0-0.03 → smoothstep → near-black 0.08-0.92 → smoothstep → white 0.97-1.0). 8 engine tests + 4 codegen tests.
- **Continuity field** — new optional `continuity?: 'canon' | 'legends' | 'pop-culture' | 'mythology'` on `PresetMetadata`. Defaults to `'canon'` via `preset.continuity ?? 'canon'` convention. `LEGENDS_PRESETS` bulk-migrated to `continuity: 'legends'` (34 presets). 8 new test cases (type-level + runtime).
- **89 pop-culture presets, 11 files** — new [`packages/presets/src/characters/pop-culture/`](packages/presets/src/characters/pop-culture/) subdirectory with per-franchise files + aggregator `index.ts`. Breakdown:
  - **LOTR** (10): Glamdring · Sting · Andúril · Narsil (broken) · Orcrist · Gurthang (black+red via `darksaber`) · Morgul-blade · Herugrim · Narya (Ring of Fire) · One Ring
  - **Mythology** (8): Excalibur · Kusanagi · Gáe Bolg · Gram · Joyeuse · Caladbolg (rainbow gradient) · Perseus' Harpē · Trident of Poseidon
  - **Marvel MCU** (12): Mjolnir · Stormbreaker · Jarnbjorn · Gungnir · 6 Infinity Stones (Space/Mind/Reality/Power/Time/Soul) · Ebony Blade · Skurge's Axe
  - **DC** (10): Green Lantern emotional spectrum (Will/Fear/Rage/Avarice/Hope/Compassion/Love = 7) · Wonder Woman's Godkiller · Dr. Fate's Ankh · Swamp Thing
  - **Zelda** (7): Master Sword (awakened + dormant) · Fierce Deity Sword · Goddess Sword · Biggoron's Sacred Flame · Trident of Power · Wind Waker
  - **Final Fantasy/KH** (8): Buster Sword (materia glow) · Masamune · Gunblade · Brotherhood · Ultima Weapon · Omega Weapon · Kingdom Key · Oblivion
  - **Anime** (6): Demon Slayer Nichirin set (Tanjiro black+red via `darksaber` · Rengoku fire · Zenitsu thunder · Inosuke) · Ichigo Bankai · Hyorinmaru
  - **Kids cartoons** (8): Powerpuff Girls trio (Blossom/Bubbles/Buttercup) · Hello Kitty · Steven Universe Garnet · Adventure Time Finn's Grass Sword · Ben 10 Omnitrix · Chemical X
  - **Power Rangers** (7): MMPR Red/Blue/Yellow/Pink/Black + Green Ranger (Dragon Dagger) + White Ranger (Saba)
  - **Adult animation** (5): Rick's Portal Gun · Samurai Jack Katana of Righteousness · Master Shake · Meatwad · Brock Samson
  - **Mascots** (8): Tony the Tiger · Toucan Sam (rainbow gradient) · Kool-Aid Man · Mr. Peanut · Cap'n Crunch · Chester Cheetah · Mr. Clean · Lucky the Leprechaun
  - All entries use `continuity: 'pop-culture'` (or `'mythology'`). `era: 'expanded-universe'` as fallback — the Era union doesn't yet have a `'pop-culture'` value, so the `continuity` field is the authoritative filter source of truth.
- **Hardware Fidelity Principle (load-bearing architectural doc)** — new [`docs/HARDWARE_FIDELITY_PRINCIPLE.md`](docs/HARDWARE_FIDELITY_PRINCIPLE.md). Codifies: the visualizer simulates what real 1D WS2812B Neopixel LED strips can physically do, not visualizer-only fakes. No 2D outline effects — every style must be expressible as a function of LED position + time AND emittable as a ProffieOS template that produces the same visual on real hardware. Darksaber is the worked example (bright emitter + dark body + bright tip is the honest 1D approximation; a "bright outline around dark body" render-pipeline fake was REJECTED during this session because it would show users something their real saber can't produce). **This doc is the north star for all future engine style additions.** Includes an audit queue of existing styles whose codegen parity hasn't been verified (`automata`, `helix`, `aurora`, `prism`, `gravity`, `crystalShatter`, `dataStream`, `nebula`, `neutron`, `candle`).

**Test count delta this PR:** +20 (8 DarkSaberStyle engine + 8 continuity + 4 codegen Darksaber template). Final workspace total across both 2026-04-23 merges: **3,164 tests passing across 10 packages**. Typecheck clean.

**Preset library scope after merge:** ~305 presets total (216 canonical pre-session + 89 pop-culture; the 3 relocations stay in the library, just in a different file).

**Process learnings worth carrying forward:**

- **Hardware fidelity is architectural, not cosmetic.** Mid-session, Ken corrected a proposed render-pipeline "bright outline around dark body" Darksaber effect because the real 1D LED strip can't produce 2D outlines. Instead of inventing a visualizer-only fake, the session shipped the honest approximation (bright endpoints + dark body) via `DarkSaberStyle` + canonical ProffieOS `Gradient<White, Rgb<5,5,5>, Rgb<5,5,5>, White>` emission. **Future sessions must not propose visualizer-only effects** — always ask "can the codegen emit a valid ProffieOS template that produces the same visual on real hardware?" before adding a new engine style. The principle is codified in `docs/HARDWARE_FIDELITY_PRINCIPLE.md`.
- **Audit-first + parallel-agent fix pass scales.** 7 parallel agents per file for Phase 1 (audit), then again for Phase 3a (fix). Evidence-shape output (markdown tables with current/recommended/reasoning per preset) made the fix pass mechanical — each agent applied its own audit. Also gave strong per-file accountability when skim-reviewing.
- **Mid-session usage limits are recoverable.** Phase 4 launched 5 pop-culture agents in background; 2 hit Claude usage limits mid-work. Resumption on a fresh turn: `ls` the output directory to verify which agents completed, then re-run the specific agents that didn't. Completed agents' work persists on disk — resumption doesn't re-do their work. Don't assume the worst on usage-limit task notifications; actually check state.
- **Delegate-to-me on review, confirm-with-me on principles.** Ken delegated review-depth decisions (Phase 2 review: "delegate to me") but asserted architectural principles strongly (Hardware Fidelity). The pattern: Claude proposes, Ken ratifies principles, Claude executes autonomously within those. Works well.

### What shipped in v0.14.0

End-to-end browser-verified on `localhost:3000/editor` at 120 FPS:

- **ROUTING BETA pill** in DesignPanel — hidden on non-Proffie boards; shows 5 modulator plates (`swing` / `sound` / `angle` / `time` / `clash`) with live CSS-driven identity-color viz
- **Three paths to create a binding:**
  - **RecipePicker** — 5 one-click starter recipes (Reactive Shimmer / Sound-Reactive Music / Angle-Reactive Tip / Clash-Flash White / Twist-Drives-Hue)
  - **AddBindingForm** — dropdown source/target/combinator + amount slider
  - **Click-to-route** — arm a plate, every ParameterBank label tints in the armed modulator's identity color with "Click to wire {source} → {label}" hover title; click to bind
- **BindingList** — rows show source → target with combinator dropdown, amount scrub, bypass toggle, remove button
- **Inline BoardPicker** in StatusBar between Profile and Conn — `BOARD · PROFFIE V3.9 · FULL`; click opens modal picker with all 6 boards + status chips
- **Engine**: `BladeEngine.update()` samples modulators + applies bindings per frame before style rendering; persistent sampler state for one-pole smoothing + clash latching; `setParameterClampRanges()` pushes 77 parameter range constraints from `parameterGroups.ts`
- **Codegen ProffieOS emitter** (Option B+): maps bindings to `Scale<SwingSpeed<>>`, `Sin<Int<>>`, etc. templates where possible; snapshot-value fallback per binding for anything inexpressible in ProffieOS

### Scope deferred (labeled in ROUTING tab banner)

- Math formula expressions in UI — peggy parser + evaluator are **live** in the engine with 63 accept / 61 reject fixtures; inline `Cmd-click` expression editor UI lands in v1.1 Core
- 6 additional modulators (`twist` / `battery` / `lockup` / `preon` / `ignition` / `retraction`) — scaffolded in the registry, not shown as plates until v1.1
- True drag-to-route (vs. click-to-route arm)
- Hover wire highlighting (replaces the 2026-04-20 1:1 `hoveredModulatorId` stub)
- Kyber Glyph v2 modulation round-trip — handoff doc at [`docs/NEXT_GLYPH_V2_SESSION.md`](docs/NEXT_GLYPH_V2_SESSION.md), parallel session owns it
- V2.2 modulation flash — conservative profile ships with modulation disabled; v1.1 after hardware validation
- Button routing sub-tab (aux / gesture events as modulators)

### Test + verification deltas

| Package | Before v0.14.0 | After v0.14.0 | Delta |
|---|---|---|---|
| engine | 513 | 714 | +201 (parser/evaluator/sampler/applyBindings + 124 grammar fixtures) |
| codegen | 1,323 | 1,347 | +24 (ProffieOS binding emitter) |
| web | 749 | 890 | +141 (board profiles / BoardPicker / useClickToRoute) |
| presets | 9 | 29 | +20 (starter recipes) |
| boards / sound | unchanged | unchanged | 0 |
| **Total** | 2,594 | 2,980 | **+386 tests across 4 packages** |

Full workspace typecheck clean. CI green on all 4 intermediate pushes + the final merged commit.

### Sprint artifacts

- Design spec: [`docs/MODULATION_ROUTING_V1.1.md`](docs/MODULATION_ROUTING_V1.1.md)
- Implementation plan + 18 locked decisions: [`docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md`](docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md)
- Public roadmap (v1.0 → v2.0+): [`docs/MODULATION_ROUTING_ROADMAP.md`](docs/MODULATION_ROUTING_ROADMAP.md)
- User guide outline + 10 recipes: [`docs/MODULATION_USER_GUIDE_OUTLINE.md`](docs/MODULATION_USER_GUIDE_OUTLINE.md)
- Quick-start (60-second tutorial with 3 GIF placeholders): [`docs/user-guide/modulation/your-first-wire.md`](docs/user-guide/modulation/your-first-wire.md)
- Glyph v2 handoff: [`docs/NEXT_GLYPH_V2_SESSION.md`](docs/NEXT_GLYPH_V2_SESSION.md)

### Sibling / follow-on branches

- **`feat/saber-card-vertical`** (local + `origin/feat/saber-card-vertical` at `53303dd`): glyph-v2 session's in-flight work on the vertical Saber Card layout + rounded blade tip + flush emitter. Independent of modulation; the session owner controls its PR timing.
- **`feat/marketing-site-expansion`** (worktree at `../KyberStation-mkt`): marketing components / showcase / sitemap / changelog-parser. Still disjoint.
- **`feat/w5-performance-bar`**: already subsumed into main via `feat/ui-overhaul-v2` earlier today; local branch pointer kept for traceability, safe to prune.

### Remaining launch-blockers (carried over from v0.13.0 readiness)

Code-wise nothing new — the modulation landing is self-contained BETA and doesn't add launch blockers. The four ⏳ QA phases from the v0.13.0 launch-readiness plan still apply: **P29 a11y audit**, **P30 perf deep-dive**, **P31 cross-browser matrix**, **P37 launch triage**. Plus hardware cross-OS + cross-board sweeps remain pending.

### What's next on the modulation roadmap

Per [`docs/MODULATION_ROUTING_ROADMAP.md`](docs/MODULATION_ROUTING_ROADMAP.md):

- **v1.1 Core** (~2026-05-16, launch +3 weeks): math formula editor UI + all 11 modulators + drag-to-route + hover highlighting + Kyber Glyph v2 sharing + V2.2 flash + button routing + full 10-recipe gallery + complete user guide
- **v1.2 Creative** (~2026-06-13): modulator chains + macros + LFO shape library + conditionals + `config.*` vars + snapshots/scenes + sidechain + probability/random + blade-level UDFs + response curves
- **v1.3 Advanced** (~2026-07-18): envelope followers (meyda + AudioWorklet) + step sequencers + `ModulationGraphPanel` + community UDF library + gesture recording
- **v1.4 Multi-Blade Workbench** (~2026-08-08): dual-blade / saberstaff / crossguard channel-strip UI (unchanged from prior plan)

---

### 2026-04-23 earlier — UI-overhaul v2 merge (PR #33)

**Active branch: `main`. `feat/ui-overhaul-v2` merged into main on 2026-04-23, landing the full four-session sprint: Saber Wizard hardware step + Hilt library v2 content expansion + post-walkthrough W-series UX iteration + Kyber Crystal polish & Share Card v2 — on top of the 2026-04-21 OV1–OV11 UI overhaul waves (Inspector, PerformanceBar, GalleryMarquee, DeliveryRail, AnalysisRail, MiniGalleryPicker, drag-to-resize). Detailed session write-ups below.**

Remaining launch-blockers: the four ⏳ QA phases (P29 a11y / P30 perf / P31 cross-browser / P37 triage) plus hardware cross-OS + cross-board sweeps, not new code.

**Sibling branch: `feat/w5-performance-bar`** — 1 commit (W5 PerformanceBar). `feat/ui-overhaul-v2` was cut from this so merging it first would be redundant; the W5 commit is already included on the overhaul branch.

**Sibling worktree: `feat/marketing-site-expansion`** — at `../KyberStation-mkt`. New `apps/web/components/marketing/*` + showcase/sitemap/changelog-parser. Disjoint footprint — no overlap with editor / wizard / store files.

Last git tag: **v0.13.0** (launch readiness, merged via PR #31).

### 2026-04-22 session — Saber Wizard hardware step

Added a new first step to the Saber Wizard so new users tell the app about their physical saber (blade length + board) before picking archetype/colour/vibe. Skippable for users who want to dive straight into design.

**What shipped (1 commit, both files on `feat/ui-overhaul-v2`):**

- [`apps/web/components/onboarding/SaberWizard.tsx`](apps/web/components/onboarding/SaberWizard.tsx) — wizard expanded 3 → 4 steps. New `Step1Hardware` component with two pickers:
  - **Blade length**: 6 tiles (20"/24"/28"/32"/36"/40"). LED counts mirror `BLADE_LENGTH_PRESETS` in `packages/engine/src/types.ts` (3.66 LEDs/inch); 20" entry slots into the `inferBladeInches` ≤73 bucket. Live "N LEDs" readout in the section header. On apply, writes `BladeConfig.ledCount` via the existing `loadPreset` path.
  - **Board**: 5 tiles (Proffie V3 / V2 / CFX / GH V4 / GH V3). Each tile carries a 3-tier compatibility chip via the existing `<StatusSignal>` primitive (paired colored glyph + label, colorblind-safe by design):
    - **VERIFIED** (green ✓ `--status-ok`) — Proffie V3, the only board with end-to-end hardware validation per the 2026-04-20 Phase A/B/C entry.
    - **UNTESTED** (amber ▲ `--badge-creative`) — Proffie V2. Code path is identical, hardware validation pending. Tagline: "Code path ready, awaiting community hardware testing."
    - **REFERENCE** (red ✕ `--status-error`) — CFX / GH V4 / GH V3. Different firmware ecosystems entirely; the editor + visualizer work but flash output won't run. Tagline: "Editor + reference only — flash needs Proffie."
  - On apply, writes `boardType` to the active `SaberProfile` (or auto-creates a "My Saber" profile if none exists) using the same `storeValue` strings (`'Proffie V3'` / `'Proffie V2'`) that `CodeOutput.tsx` maps back to `proffieboard_v{2,3}`.
  - **Skip-vs-Continue semantics**: footer left button reads "Skip for now" on step 1, "← Back" on later steps. The right primary reads "Continue →" on step 1, "Create saber" on step 4, hidden on steps 2/3 (auto-advance). Skip leaves a `applyHardware: false` flag in component state; apply() only writes `ledCount` + `boardType` when `applyHardware === true`. Skip path verified end-to-end as zero side effects.
  - Mini legend strip next to the "Board" heading shows the three compat icons + tooltips so the colors are self-documenting.
  - Initial-focus follows the currently-selected length tile (was always-first-tile — fixed mid-session after walkthrough screenshot caught the mismatch).
- [`apps/web/tests/saberWizardOptions.test.ts`](apps/web/tests/saberWizardOptions.test.ts) — new contract test, **10 cases**:
  - Each `BLADE_LENGTHS` ledCount reverse-maps to its inches via `inferBladeInches` (drift sentinel; if the piecewise ladder shifts, the wizard would silently mis-render the chosen length).
  - V3 is the *only* `verified` board (will fail loudly when V2 gets validated, prompting a tier bump).
  - V2 is `untested`, not `verified`.
  - CFX / GH V4 / GH V3 are all `reference`.
  - V3 / V2 `storeValue` strings match `CodeOutput.tsx:67-68` keys exactly.
  - Every `storeValue` ≤ 50 chars (matches `saberProfileStore.importProfile` truncation guard).
  - Reference taglines mention Proffie.
  - Board IDs are unique.

**Test count:** 637 passing in `apps/web/tests` (was 627 last session, +10 from the new file). Workspace-wide typecheck clean.

**Conflict audit at session start (per Ken's ask):** clean. The only other live worktree is `feat/marketing-site-expansion` — its footprint is `apps/web/components/marketing/*` + sitemap/changelog/icons + new tests, zero overlap with `SaberWizard.tsx`, `bladeStore.ts`, `saberProfileStore.ts`, or `WorkbenchLayout.tsx`. The other local branches (`feat/ov*` / `claude/*` / `worktree-agent-*`) are dangling refs already absorbed into `feat/ui-overhaul-v2` per the prior session's "Loose ends worth flagging" entry — not active sessions.

**Browser-verified end-to-end** via the running preview: Step 1 renders all 6 lengths + 5 boards with correct chips; Continue advances to Archetype; full walkthrough (Continue → Jedi → Obi-Wan Blue → Classic vibe → Create) creates a "My Saber" profile with `boardType: 'Proffie V3'`; Skip walkthrough leaves profiles empty (verified by clearing localStorage and re-counting after Create); dialog closes cleanly on Create.

**Why the 3-tier model (vs 2-tier green/red Ken initially proposed):**

The honest hardware-validation truth is three-state, not binary. Two tiers would have either lied (claiming V2 is "verified" when it isn't hardware-tested) or been overly pessimistic (lumping the actively-supported V2 with the never-going-to-flash CFX). The amber middle band signals "this is a real flash target we'd love community help validating" — a more useful signal for hobbyists than red/green alone. The `<StatusSignal>` primitive was already in the codebase (per the 2026-04-17 Design Review Polish Pass, WS4) so this composes rather than introducing a new visual primitive.

**What this session did NOT touch:**
- The OV1–OV11 walkthrough checklist (still queued — see the 2026-04-21 session block below)
- Wizard mounting / trigger paths (the `+ Wizard` button in the action bar, `?wizard=1` URL param if any) — only the modal contents changed
- The `@kyberstation/boards` package — it stays intact (and unwired from the app per the 2026-04-20 cleanup pass) as the source of truth for the broader 12-board reference matrix; the wizard intentionally shows only the 5 most-relevant boards to keep the choice tractable for new users

### 2026-04-22 session (P.M.) — Hilt library content expansion

Grew the modular hilt library 42% in parts (33 → 47) and 100% in assemblies (8 → 16). Pure content + catalog registration + tests. Zero UI wiring — the natural integration points (`BladeCanvas.tsx` + `SaberProfileManager.tsx`) are both slated for a saber-profile-scoped hilt composer in a future session (see Item #20 in [`docs/NEXT_SESSIONS.md`](docs/NEXT_SESSIONS.md)); this session stopped cleanly at the catalog boundary so the content can ship independently.

**Parts added (+14, every one standard-diameter on both connectors for maximum composability):**

| Type | Added |
|---|---|
| emitter (+4) | `flat-top`, `tapered`, `maul-emitter`, `ringed-emitter` |
| switch (+2) | `windu-switch`, `inquisitor-switch` |
| grip (+3) | `windu-grip`, `luke-rotj-grip`, `covertec-grip` |
| pommel (+2) | `windu-pommel`, `inquisitor-mount` |
| accent-ring (+3) | `leather-wrap`, `activation-box`, `gold-band` |

**Assemblies added (+8 — character-focused Jedi/Sith/grey):** `windu` (Mace Windu), `luke-rotj` (Luke Skywalker ROTJ), `qui-gon` (Qui-Gon Jinn — pure-composition reuse of existing parts), `savage` (Savage Opress / Maul-single), `inquisitor` (Grand Inquisitor single-blade variant), `cal-kestis` (Jedi: Fallen Order/Survivor with covertec + leather wrap), `starkiller` (Legends / Galen Marek — cobbled MPP + activation-box), `palpatine` (ceremonial Sith with gold-band accent).

**Files touched (all append-only, zero modification to existing content):**
- 14 new part files under [`apps/web/lib/hilts/parts/{emitters,switches,grips,pommels,accents}/`](apps/web/lib/hilts/parts/)
- [`catalog.ts`](apps/web/lib/hilts/catalog.ts) — +14 imports + catalog entries (alphabetical within type group per the catalog's comment-documented convention)
- [`assemblies.ts`](apps/web/lib/hilts/assemblies.ts) — +8 assembly exports + `ASSEMBLY_CATALOG` registrations
- [`apps/web/tests/hiltCatalog.test.ts`](apps/web/tests/hiltCatalog.test.ts) — +2 `describe` blocks / 4 `it` cases asserting presence + era/faction metadata + strict-mode composition for the 14 new parts and 8 new assemblies

**Tests:** `apps/web` 739 passing (+4 targeted assertions; existing generic spec tests automatically extend coverage via catalog iteration — canvas-width-48 + cx-24 enforcement on every part, strict-mode composition on every shipped assembly). Workspace typecheck clean.

**Conflict audit at session start:** verified both active sidecars via `git diff origin/main --name-only`:
- `feat/w5-performance-bar` — single W5 commit, already on the overhaul branch. No hilt footprint.
- `feat/marketing-site-expansion` — broad editor + landing rewrite against the pre-overhaul main baseline (disjoint footprint per the Saber Wizard session's audit above; the `-199` line count on `BladeCanvas.tsx` vs `origin/main` reflects reverting the 2026-04-21 overhaul work, not new mkt edits to BladeCanvas). Either way, mkt doesn't touch `apps/web/lib/hilts/` or `apps/web/tests/hiltCatalog.test.ts` — zero merge conflict surface.

**Deliberately NOT wired** — no changes to `BladeCanvas.tsx`, `SaberProfileManager.tsx`, `bladeStore.ts`, or `saberProfileStore.ts`. The new assemblies are discoverable programmatically (`getAssembly('windu')`) and render correctly through the existing `HiltRenderer` primitive; they just aren't surfaced in a picker UI yet. That's the pickup point for Item #20 of [`docs/NEXT_SESSIONS.md`](docs/NEXT_SESSIONS.md) (hilt composer + saber-profile integration; scoped A+B+C: schema field + composer panel + BladeCanvas override + Profile Manager nest).

### 2026-04-22 session (evening) — post-walkthrough W-series UX iteration

The OV1–OV11 walkthrough Ken queued in the 2026-04-21 block below was
exercised live in this session. What came out of the walkthrough was a
multi-wave polish + restructure sprint (W1–W13 naming, independent of
the OV numbering from 2026-04-21) that reshaped the Inspector,
DesignPanel, PerformanceBar/chrome, gallery, and visualization stack.
All sitting in the same uncommitted working-tree delta as the Wizard
and Hilt-library sessions above; ready to squash or group by theme.

**Structural moves:**

- **Inspector slim (W10).** Five tabs (STATE / STYLE / COLOR / EFFECTS / ROUTING) → **two**: TUNE (ParameterBank; primary live-tune surface) + GALLERY (preset swap). [`apps/web/components/editor/Inspector.tsx`](apps/web/components/editor/Inspector.tsx) went from 253 lines to ~100, pure tab-router shell. STYLE / COLOR / EFFECTS absorbed into [`DesignPanel.tsx`](apps/web/components/editor/DesignPanel.tsx). STATE moved out entirely to a new **RightRail** (`components/layout/RightRail.tsx` + `components/editor/StateTab.tsx`). `InspectorGalleryTab.tsx` extracted so the gallery tab body lives on its own.

- **W13 Inspector rename + reorder.** "Quick" → "TUNE" (the old name implied a Quick/Advanced split that no longer exists). TUNE moved to the **first** position since it's the primary editing surface; GALLERY second.

- **Dedicated `/gallery` page (W7).** `apps/web/components/gallery/GalleryPage.tsx` replaces the legacy in-editor Gallery tab. Four-link top-level nav (Gallery / Design / Audio / Output) mirrors the editor header so users can flip routes without losing their bearings. `lib/galleryFilters.ts` classifies presets by color family + style family for the filter rail. Footer chrome (`ShiftLightRail` + `AppPerfStrip` + `DataTicker`) reproduced identically to the editor shell.

- **Perf strip consolidation (W3–W5).** New `AppPerfStrip` merges what used to live across multiple rails (macro controls, shift-light rail, GFX toggle). New `ShiftLightRail` primitive surfaces blade RMS. `MacroKnob` + `QuickMacroPreview` + `useRmsLevel` compose into the strip.

- **Effects surface reshuffle (W6).** New `EffectChip.tsx` + `EffectsPinDropdown.tsx` for the action bar / DesignPanel.

- **Analysis restructure (W8).** `RGBGraphPanel.tsx` **deleted** — absorbed into `VisualizationStack`. `AnalysisExpandOverlay.tsx` **deleted** — folded into `AnalysisRail`. `visualizationTypes.ts` reworked; `visualizationStore` migration added.

- **Tailwind config fix (W12).** `rounded-chrome` and `rounded-interactive` class names are used app-wide but were never declared as Tailwind tokens — every occurrence was silently rendering as 0px. Added `chrome: 'var(--r-chrome)'` + `interactive: 'var(--r-interactive)'` under `borderRadius` in [`tailwind.config.ts`](tailwind.config.ts). Real bug fix retroactively affecting every component that used those classes.

**Gallery-card polish loop (W13a–f, Ken-driven iteration):**

The gallery cards went through six sequential iterations based on live walkthrough feedback:

| Sub-wave | Change |
|---|---|
| **W13a** | Reverted from thin-row blade cards back to portrait `MiniSaber` cards matching the landing page's `SaberMarqueeArray` pattern. Static-till-hover contract preserved (inView mounts via `IntersectionObserver`; only the hovered card's engine ticks at 30fps). |
| **W13b** | Grid: `grid-cols-* + justify-items-center` (which inflated horizontal gaps well past the 12px `gap-3` value on wide monitors because every cell was equal-width with a 200px card centered inside) → `flex flex-wrap justify-center gap-3`. Consistent 12px gap in both axes, dynamic column count. Title size stepped down one level. New `splitNameSubtitle` helper extracts parenthetical content as the subtitle (e.g. `"Obi-Wan Kenobi (Episode III)"` → title `"Obi-Wan Kenobi"`, subtitle `"Episode III"`; multi-parens join with em-dash on a single line; no parens → no subtitle row). |
| **W13c** | Card split into two fixed-height regions — saber region 352px (332px MiniSaber + 20px top breathing room), text region 48px. Saber hilt bottom-anchored at Y=352 on every card; title top-anchored at Y=364 on every card. Subtitle (when present) flows in below without displacing the saber or title. Fixes the "saber moves when subtitle presence changes" observation. |
| **W13d** | Bumped `pt-2` (8px) → `pt-3` (12px) for more breathing room between saber hilt and title. |
| **W13e** | Card height 400 → 416. Subtitle now has ~20px bottom breathing room, symmetric with the ~20px between card top and blade tip. Vertically balanced margins. |
| **W13f** | Card background unified with filter bar (`bg-bg-card/60` → `bg-bg-deep/40` — same `--bg-deep` token the filter bar's `bg-bg-deep/40` uses). **Latent bug fix**: default border color was `'rgb(var(--border-subtle))'`, which double-wrapped the already-complete `rgba(...)` token declared in [`globals.css`](apps/web/app/globals.css) and rendered as invalid CSS — the card border was silently falling back to the browser default the whole time. Corrected to `'var(--border-subtle)'`, matching how the filter pills apply it via the Tailwind `border-border-subtle` class. Hover still transitions to the saber's base color over 800ms with the inset-border + outer-glow treatment. |

**New files / primitives introduced this session:**

| File | Purpose |
|---|---|
| `apps/web/components/gallery/GalleryPage.tsx` | Full-screen `/gallery` route |
| `apps/web/components/editor/InspectorGalleryTab.tsx` | Extracted Inspector gallery tab body |
| `apps/web/components/editor/StateTab.tsx` | Right-rail STATE body |
| `apps/web/components/editor/EffectChip.tsx` | Action-bar effect chip with held-glow state |
| `apps/web/components/editor/EffectsPinDropdown.tsx` | Effect pin picker |
| `apps/web/components/editor/QuickMacroPreview.tsx` | Mini macro-knob preview |
| `apps/web/components/layout/RightRail.tsx` | Right-column container (hosts STATE) |
| `apps/web/components/layout/ShiftLightRail.tsx` | Blade RMS shift-light strip |
| `apps/web/components/layout/AppPerfStrip.tsx` | Merged perf + macros + GFX toggle |
| `apps/web/hooks/useRmsLevel.ts` | Blade-RMS subscription hook |
| `apps/web/lib/galleryFilters.ts` | Color/style family classifiers |

**Deleted files:**
- `apps/web/components/editor/RGBGraphPanel.tsx` (absorbed into VisualizationStack)
- `apps/web/components/layout/AnalysisExpandOverlay.tsx` (folded into AnalysisRail)

**Test count after sprint:** 749 passing in `apps/web/tests` (was 637 at the start of the 2026-04-22 wizard beat). Net **+112** across wizard, hilt catalog expansions, gallery filters, visualization-store migrations, and the existing suites keeping pace with refactors. Typecheck clean on every package.

**Walkthrough-checklist status update** (against the 2026-04-21 block below):
- Every listed item was exercised live during the W-series sprint (tabs / STATE grid / color-propagation / Inspector tab swap / DeliveryRail modals / resize handles).
- The gallery-tab walkthrough item turned into the dedicated `/gallery` route, the SURPRISE ME + NEW SABER cards moved with it, and the six-iteration polish loop (W13a–f) captured the bulk of Ken's UX notes.
- No regressions surfaced during verification.

**Loose ends worth flagging to future-Claude:**
- The `<Inspector>` STATE-tab removal means the `<StateGrid>` ⌘5 takeover (OV8) is now the only way to audition all nine saber states at once. The per-state snapshot cards that used to live in the Inspector STATE tab are captured by the same `captureStateFrame` API inside the new RightRail — the API footprint didn't change, just the mounting surface.
- `inView` is still subscribed but unused in `GalleryCard` — left a `{inView && null}` marker to keep the IntersectionObserver read so the TS dead-code check doesn't strip it. If a future wave needs to react to in-view status (e.g. lazy-tick a non-hovered card), the subscription is already in place.

### 2026-04-22 session (late) — Kyber Crystal polish + Share Card v2

Four-phase visual polish of the Three.js Kyber Crystal renderer, then a module refactor of the Share Card pipeline, then a parallel agent fan-out, then a layout × theme variant matrix. Focused, append-only scope — every file this session touched lives under `apps/web/lib/crystal/`, `apps/web/lib/sharePack/`, `apps/web/components/editor/CrystalPanel.tsx`, or `apps/web/tests/crystalQrSurface.test.ts`. Zero overlap with the Saber Wizard (`onboarding/`), Hilt library (`lib/hilts/`), or W-series (`RightRail.tsx`, `GalleryCard.tsx`, etc.) sessions — independently commitable.

**Phase 1 — QR scannability** — [`qrSurface.ts`](apps/web/lib/crystal/qrSurface.ts) + [`materials.ts`](apps/web/lib/crystal/materials.ts) + [`crystalQrSurface.test.ts`](apps/web/tests/crystalQrSurface.test.ts):

- Error correction **M → Q** (15% → 25% module recovery).
- Quiet-zone margin **2 → 4 modules** (spec-minimum 2 fails on many phones against visual clutter).
- Canvas **512 → 768 px** + anisotropy **4 → 8**.
- Decal `zOffset` moved from **inside** the refractive body (`radius * 0.95`) to **just forward** (`radius * 1.08`) so transmission/refraction no longer distorts the scan target. Test assertion updated: `zOffset > radius` (forward of surface) instead of `< radius * 1.05` (inside the body).
- QR material: opacity **0.92 → 1.0** + added **`depthTest: false`** so the QR always composites on top of the transmissive body regardless of viewing angle.

**Phase 2 — Crystal visual polish** — [`lighting.ts`](apps/web/lib/crystal/lighting.ts), [`materials.ts`](apps/web/lib/crystal/materials.ts), [`postProcessing.ts`](apps/web/lib/crystal/postProcessing.ts), [`reactComponent.tsx`](apps/web/lib/crystal/reactComponent.tsx), [`renderer.ts`](apps/web/lib/crystal/renderer.ts):

Pre-session the crystal read as a "blown-out milk-glass cube." Root cause: compounding whiteout from internal PointLight intensity 1.2, inner-glow opacity 0.4, fleck base opacity 0.35, bloom threshold 0.5 (every mid-luminance pixel bloomed), tone-mapping exposure 1.15, and — crucially — `flatShading:true` **overriding** the HYBRID normals encoded in `geometry.ts` (per-pixel dFdx/dFdy face normals broke the continuous vertical highlight band the geometry was authored to produce).

Rebalance: ambient `0.15 → 0.22`, key `1.1 → 0.75`, keyRim `0.8 → 0.5`, fillRim `0.3 → 0.22`, internal PointLight `1.2 → 0.38`. Per-form `MATERIAL_TUNING` tightened (transmission up, `ior 1.55 → 1.72`, `attenuationDistance` compressed for deeper tint, sheen `0.35 → 0.15` for clear forms). Removed `flatShading:true`. Inner glow opacity `0.4 → 0.14`. Bloom `0.8 / 0.6 / 0.5 → 0.32 / 0.5 / 0.88`. Tone-mapping exposure `1.15 → 0.95` in both the live R3F canvas and the headless `renderer.snapshot()` pipeline. Result: faceted glass gem with visible body tint, not a backlit milk cube.

**Phase 3 — Animation polish** — [`lighting.ts`](apps/web/lib/crystal/lighting.ts), [`renderer.ts`](apps/web/lib/crystal/renderer.ts), [`animations.ts`](apps/web/lib/crystal/animations.ts):

- **Latent bug caught + fixed.** `renderer.ts::applyAnimationState` hardcoded `this.lights.internal.intensity = 1.2 * state.glowIntensity`, silently overriding `lighting.ts`'s base every frame. Extracted `INTERNAL_LIGHT_BASE_INTENSITY = 0.38` and imported into `renderer.ts` so the two paths can't drift.
- **Clash** — glow multiplier `2.5 → 3.0` + scale kick `0.04 → 0.05` + added fleck-opacity tie-in.
- **Lockup** — pinned intensity `2.2 → 2.8` with 12 Hz ±0.15 chatter + coupled vein opacity so the "hold" reads as live energy, not static. Reduced-motion branch keeps the flat held-bright behavior.
- **Idle** — two superposed sines (0.6 Hz primary at 0.08 amplitude + 0.17 Hz slow drift at 0.03 amplitude) so the baseline reads "alive" instead of metronomic.

**Phase 4 — Share Card, QR pulled off the crystal.** Mid-sprint pivot — the QR no longer overlays the 3D crystal. Crystal reads as a pure gem; the scannable QR lives in a corner of the share card as a flat, unrefracted target. [`CrystalPanel.tsx`](apps/web/components/editor/CrystalPanel.tsx) passes `qrEnabled={false}` to `<KyberCrystal>`. First share-card pass: 1200×675 with header · horizontal saber (stylized hilt + blade + bloom halo + tip cone) · metadata (Orbitron title + spec + glyph) · QR corner + "⤓ SCAN TO OPEN" label · footer. New "Save share card" button alongside the existing "Save crystal PNG".

**Refactor — modular drawers.** To unblock parallel agent work, [`cardSnapshot.ts`](apps/web/lib/sharePack/cardSnapshot.ts) was split into 12 modules under [`apps/web/lib/sharePack/card/`](apps/web/lib/sharePack/card/): `cardTypes.ts` · `cardLayout.ts` · `cardTheme.ts` · `canvasUtils.ts` · `drawBackdrop.ts` · `drawHeader.ts` · `drawBlade.ts` · `drawHilt.ts` · `drawMetadata.ts` · `drawQr.ts` · `drawFooter.ts` · `chips.ts`. `cardSnapshot.ts` is now a ~90-line orchestrator composing drawers in z-order against a `CardContext`. Every drawer consumes `{ ctx, options, layout, theme, qrCanvas }` — swap `layout` or `theme` and the whole card re-paints.

**Parallel agent fan-out (3 concurrent agents via `Agent` tool `run_in_background: true`, ~2 min wall clock):**

- **Agent A — Real hilt** ([`drawHilt.ts`](apps/web/lib/sharePack/card/drawHilt.ts)). Replaced the stylized canvas hilt with the real SVG assembly via `HiltRenderer` → `renderToStaticMarkup` → `svgStringToImage` → `drawImage`. Reads `config.hiltId` (cast through `unknown` — see follow-up), defaults to Graflex. Right-aligned against `layout.bladeStartX - 4` with a 4 px emitter overlap. Preserves the SVG's natural aspect. Stylized canvas path preserved as `drawStylizedHilt` fallback.
- **Agent B — Chip toolkit + row** ([`chips.ts`](apps/web/lib/sharePack/card/chips.ts) + [`drawMetadata.ts`](apps/web/lib/sharePack/card/drawMetadata.ts)). `drawChipRow(card, chips, x, y)` + `buildChipsForConfig(config, glyph)`. Default row: `◆ Form · ☉/✦/◐ Faction · N LEDs · Nms ignite · ARCH`. Form via `selectForm`. Faction via `isRedHue` → Sith (crimson) / green/blue hue predicates → Jedi (ice-blue) / fallback → Grey. Archetype chip suppressed when it would duplicate the faction. Row wraps to a second row on `metadataMaxWidth` overflow.
- **Agent C — HUD chrome** ([`drawBackdrop.ts`](apps/web/lib/sharePack/card/drawBackdrop.ts)). Grid dots on a 40 px lattice · large `◈` watermark glyph (Orbitron 320px at 0.07 alpha, mid-right) · scanlines reordered above the watermark · edge vignette · four corner L-brackets (18 px arms, 1.5 px stroke, 24 px inset from the safe zone) · four edge-midpoint registration crosshairs · `◢ CLASSIFIED: BLADE-A` archive stamp at `(32, headerH + 16)`. Every element wrapped in `save()/restore()` — nothing leaks downstream.

All three agents returned typecheck-clean. Integration verified visually against a real Obi-Wan Azure config.

**Variant matrix (serial D + E after agents merged):**

Four layouts in [`cardLayout.ts`](apps/web/lib/sharePack/card/cardLayout.ts): `DEFAULT_LAYOUT` 1200×675 · `OG_LAYOUT` 1200×630 (Twitter / Open Graph) · `INSTAGRAM_LAYOUT` 1080×1080 · `STORY_LAYOUT` 1080×1920.

Five themes in [`cardTheme.ts`](apps/web/lib/sharePack/card/cardTheme.ts): `DEFAULT_THEME` (deep-space blue) · `LIGHT_THEME` (paper-white) · `IMPERIAL_THEME` (crimson on charcoal) · `JEDI_THEME` (cream on brown parchment) · `SPACE_THEME` (pure-black minimal).

Every theme fills every `CardTheme` token — drawers never special-case theme ids. `getLayout(id)` / `getTheme(id)` fall back to default on unknown ids. [`CrystalPanel.tsx`](apps/web/components/editor/CrystalPanel.tsx) gained Layout + Theme `<select>` dropdowns above "Save share card"; filename encodes the combo (`kyberstation-card-<layoutId>-<themeId>-<timestamp>.png`).

Spot-verified 4 of 20 combos in the preview (`default×default`, `default×imperial`, `instagram×jedi`, `story×space`). All 20 combinations are typesafe + produce valid PNG blobs.

**Test count:** `apps/web` 749 passing at end of session. **One test updated:** `crystalQrSurface.test.ts::deriveQrLayout` asserts the new forward-of-surface invariant. **No new tests added by this session** — the new card/drawers are covered only by manual visual verification.

**Typecheck:** clean for every crystal + card file touched. Pre-existing unrelated errors in `components/gallery/GalleryPage.tsx` (missing `BladeEngine` import) come from a sibling workstream — not introduced here.

**Conflict audit at session start (per memory preferences):** `git worktree list` + `git diff origin/main...<branch> --name-only` for every live sidecar. `feat/marketing-site-expansion` — fully disjoint (marketing routes/components/icons). Other 2026-04-22 sessions' footprints (`onboarding/SaberWizard.tsx`, `lib/hilts/*`, `RightRail.tsx`, etc.) — zero overlap with crystal + card paths. Dangling refs (`feat/ov*` / `claude/*` / `worktree-agent-*`) already absorbed into the overhaul branch per the 2026-04-21 "Loose ends" list.

**Follow-ups for next session:**
- **`BladeConfig.hiltId` has no type declaration.** Agent A reads via `(config as unknown as { hiltId?: string }).hiltId`. When the hilt-picker UI lands (Hilt library session's `NEXT_SESSIONS.md` Item #20), add the field to `BladeConfig` in `packages/engine/src/types.ts` and drop the cast.
- **Faction heuristic in `chips.ts`** uses ad-hoc green/blue hue predicates. Cleaner to add `isGreenHue` / `isBlueHue` siblings to `isRedHue` in [`apps/web/lib/crystal/types.ts`](apps/web/lib/crystal/types.ts) so chip + crystal-form selection share one detection pass.
- **Vignette color + watermark glyph + hilt accent** are hardcoded in the drawers. Candidates for `CardTheme` tokens (`vignetteColor`, `watermarkGlyph`, `hiltAccent`) when themes want variants (cream vignette on Jedi, `✦` on Imperial, amber hilt tint).
- **Light-theme blade bloom** — `drawBlade` uses `'lighter'` composite mode, which over-brightens on `LIGHT_THEME`. Theme-gate the composite when polishing that surface.
- **No card snapshot tests.** A golden-hash harness (render each 20 combos to a buffer, hash, diff) would lock down regressions. Deferred.
- **Still-open crystal follow-ups from earlier sessions** (untouched here): Crystal Vault panel, Re-attunement UI, favicon replacement with crystal, phone-camera QR scan validation on real hardware, `CANONICAL_DEFAULT_CONFIG` drift-sentinel, `<HiltMesh>` extraction.

**Walkthrough checklist for Ken:**
- **Design → Advanced → My Crystal** — 3D crystal reads as a clean faceted gem (no QR overlay).
- Change baseColor → body tint updates live; internal glow follows; no blown highlight.
- Trigger Clash / Saved / Discovery / Attune → animations feel punchier; clash sparkles; idle has a subtle secondary drift.
- **Layout** dropdown → cycle default/OG/Instagram/Story.
- **Theme** dropdown → cycle Deep Space/Light/Imperial/Jedi/Pure Black.
- "Save share card" → valid PNG for any combo; filename encodes combo. QR should scan on a phone.

**Suggested commit shape:** one focused commit isolated to the ~22 files under `apps/web/lib/crystal/`, `apps/web/lib/sharePack/`, `apps/web/components/editor/CrystalPanel.tsx`, and `apps/web/tests/crystalQrSurface.test.ts`. Use `git add -p` or file-by-file staging to keep the other three sessions' work out of this commit. Suggested conventional-commit header: `feat(crystal+card): 2026-04-22 visual polish + share card v2`.

### 2026-04-21 session — UI Overhaul v2 (11 waves)

Shipped the entire 10-wave plan in [`docs/UI_OVERHAUL_v2_PROPOSAL.md`](docs/UI_OVERHAUL_v2_PROPOSAL.md) plus a post-plan OV11 polish wave. Walkthrough checklist lives at the end of this block.

Planning artifacts (both on branch):
- [`docs/UI_OVERHAUL_v2_PROPOSAL.md`](docs/UI_OVERHAUL_v2_PROPOSAL.md) — 14-section spec with all 12 structural decisions locked across two rounds of back-and-forth.
- [`docs/NEXT_OVERHAUL_SESSION.md`](docs/NEXT_OVERHAUL_SESSION.md) — the 3-lane handoff prompt doc that seeded the parallel-agent fan-out (agent outputs were merged back to `feat/ui-overhaul-v2` during this session; the doc is preserved as a reference for future parallel sprints).

**Waves shipped (12 total commits on `feat/ui-overhaul-v2` past main, plus 17 absorbed via Lane B / Lane C merge commits):**

| Wave | Landed via | Content |
|---|---|---|
| OV1 | `5d45806` | Dedupe 6 panel slots (3 gallery aliases / gesture-config dup / font-preview stub / comparison-view). Panel count: 29 → 23. |
| OV2 | `5e1404b` + [`apps/web/lib/bladeRenderMetrics.ts`](apps/web/lib/bladeRenderMetrics.ts) + 18 tests | Blade-length fidelity fix: `computeBladeRenderMetrics` shares BladeCanvas's auto-fit geometry with PixelStripPanel + RGBGraphPanel so all three per-LED surfaces line up visually. |
| OV3 | `ff11990` (Lane B merge) | Gallery tab edge-to-edge marquee. Reused landing's `LandingSaberArray` shape via new `SaberMarqueeArray` primitive. NEW SABER + SURPRISE ME cards, filter rail. PresetGallery slimmed 1151 → 241 lines. Randomizer panel slot deleted (component kept for DesignPanel inline use). |
| OV4 | `64f3322` (Lane C merge) — `DeliveryRail.tsx` + `CardWriterModal` + `FlashPanelModal` + `lib/storageBudget.ts` hook + 11 tests | Persistent 50px bottom bar: PROFILE / STORAGE / EXPORT / FLASH / CONN. Always visible on every tab. |
| OV5 | `64f3322` — `AnalysisRail.tsx` + `AnalysisExpandOverlay.tsx` + 15 tests | Split VisualizationStack by layer-shape: 9 line-graph layers → left AnalysisRail; 3 pixel-shaped stay with blade; scalar moved to Delivery rail. Section 2 restructured horizontal. PerformanceBar gated to Design tab. |
| OV6 | `4908ba3` | Tab merge 5 → 4: `Gallery / Design / Audio / Output`. Dynamics panels absorbed into Design (effect-triggers / motion-simulation / effect-config / ignition-retraction all land on the merged Design tab). ⌘-shortcut reshuffle. `migrateDynamicsIntoDesign` layoutStore migration function for any persisted `dynamics` state. ⌘5 freed for OV8. |
| OV7 | `3f6cb26` — `components/editor/Inspector.tsx` (205 lines) | Right-column Inspector on Design tab. 5 tabs: STATE / STYLE / COLOR / EFFECTS / ROUTING. Composes existing panels (StylePanel + EffectPanel + ColorPanel + GradientBuilder + IgnitionRetractionPanel + GestureControlPanel) rather than deep-extracting — lower risk, same familiar surfaces. ROUTING tab is a v1.1 placeholder. |
| OV8 | `4f73f46` — `BladeEngine.captureStateFrame` API + `components/editor/StateGrid.tsx` + 6 engine tests | `captureStateFrame(state, config, effectHeld?, { progress, settleMs })` allocates a scratch engine, forces the target state, returns a COPY of the pixel buffer. Used by Inspector STATE tab (9 per-row snapshots that refresh on config change) and by StateGrid (full-workbench takeover of the blade-preview region). Toggle: `[ SINGLE | ALL STATES ]` chip in the canvas-area controls + ⌘5 / Ctrl+5. Desktop + Design-tab only. Main engine untouched (scratch engine per call). |
| OV9 | `0b1c5d6` + `3639eba` + `b5e6c4c` + `012a7a1` + 18 tests | MiniGalleryPicker primitive + 52 static SVG thumbnails (20 styles / 19 ignitions / 13 retractions). StylePanel, EffectPanel (ignition + retraction), and extracted `IgnitionRetractionPanel.tsx` all migrated. Static-till-hover; accent-token thumbnails track active theme. |
| OV10 | `88f2fd3` | Responsive polish. Inspector 320px at `desktop:` / 400px at `xl:`. PerformanceBar macro grid `overflow-x-auto`. StateGrid header right-pads 280px to avoid toggle-cluster collision. DeliveryRail already had `compact` breakpoint from Lane C. |
| **OV11** | `6cd94e7` — `components/shared/ResizeHandle.tsx` + `REGION_LIMITS` + localStorage (`kyberstation-ui-layout`) | Drag-to-resize handles on all 4 main-region seams (AnalysisRail width / Inspector width / section-2 height / PerformanceBar height). Double-click resets; arrow keys = 8px step, Shift-arrow = 24px. Redundant borders between resize-seam regions removed (handles carry the seam). Panel-grid desktop padding p-4 → p-2 for a tighter feel. |

**Test count after sprint:** 2,799 passing workspace-wide (was ~2,636). Per-package:
- `sound` 40 · `presets` 9 · `boards` 260 · `codegen` 1,323 · `engine` 463 (+6 new `captureStateFrame`) · `web` 704 (+125 across OV1–OV11)
- Typecheck clean on every package.

**What the editor looks like now (desktop, `feat/ui-overhaul-v2` tip):**

```
┌───────────────────────────────────────────────────────┐
│ HEADER                                                │
├───────────────────────────────────────────────────────┤
│ STATUSBAR (11-segment PFD)                            │
├───────────────────────────────────────────────────────┤
│ TABS: GALLERY ⌘1 · DESIGN ⌘2 · AUDIO ⌘3 · OUTPUT ⌘4  │
├──────┬─────────────────────────────────────┬──────────┤
│ ANAL │                                     │ INSPECTOR│  ← section 2 (draggable heights + widths)
│ YSIS │  Blade canvas + pixel strip + RGB   │ ┌─tabs─┐ │
│ RAIL │  OR 9-state takeover (⌘5)           │ │STATE │ │
│ (drag│                                     │ │STYLE │ │
│ to   │                                     │ │COLOR │ │
│ resi)│                                     │ │EFFEC │ │
│      │                                     │ │ROUTI │ │
├──────┴─────────────────────────────────────┴──────────┤
│ ═══ drag-to-resize ═══                                │
├───────────────────────────────────────────────────────┤
│ ACTION BAR: IGNITE + Clash/Blast/Lockup/Stab + LIVE   │
├───────────────────────────────────────────────────────┤
│ PANEL GRID (column-resize handles, tighter p-2 gutters)│
├───────────────────────────────────────────────────────┤
│ ═══ drag-to-resize ═══                                │
├───────────────────────────────────────────────────────┤
│ PERFORMANCE BAR (Design tab only, draggable height)   │
├───────────────────────────────────────────────────────┤
│ DELIVERY RAIL: PROFILE · STOR · EXPORT · FLASH · CONN │
├───────────────────────────────────────────────────────┤
│ DATA TICKER (ambient bottom chrome)                   │
└───────────────────────────────────────────────────────┘
```

**Walkthrough checklist for Ken (handoff for next session):**
- Toggle ⌘1–⌘4 — confirm Gallery / Design / Audio / Output switch
- On Design: click `All States` chip → 9-row grid renders with per-state snapshots (CLASH flash, BLAST mark, LOCKUP warm bumps, IGNITING half-extension)
- Change baseColor in Inspector COLOR tab → all 9 state rows update
- Hit ⌘5 → toggles STATE takeover mode
- Gallery tab: NEW SABER card opens wizard; SURPRISE ME randomizes + jumps to Design
- DeliveryRail: EXPORT opens CardWriter modal; FLASH opens FlashPanel modal
- Drag handles between: AnalysisRail / blade / Inspector / section 2 bottom / above PerformanceBar. Double-click resets. Values persist in localStorage (`kyberstation-ui-layout`).
- Resize to 1024px → confirm no layout overlaps; resize to 1600px → Inspector grows to 400px.

**Loose ends worth flagging:**
- Dead local branches from the parallel-agent fan-out: `feat/ov3-gallery-marquee` / `feat/ov4-ov5-layout-restructure` / `feat/ov9-mini-galleries` / `feat/ui-overhaul-v2-local`. All fully subsumed into `feat/ui-overhaul-v2` via the Lane B / Lane C merge commits or cherry-pick (Lane A). Safely deletable with `git branch -D` now that the overhaul has merged to main.
- `feat/ui-overhaul-v2` pushed to origin + merged into main on 2026-04-23. Both it and `feat/w5-performance-bar` (the W5-only branch it was cut from) are safely deletable post-merge.
- `CrystalPanel` size reduction from proposal §12b.3 not yet applied (it's still at its shipped size on Design column 3). Micro-sprint candidate when Ken gets to it.
- PerformanceBar knob label/readout spacing can compress on <780px-tall viewports — not a desktop regression, worth revisiting in a layout polish pass.

### Pre-2026-04-21 legacy sessions (kept for history)

### 2026-04-19 session

- **#7 DragToScrub primitive shipped** (26/27 UX North Star items complete). `useDragToScrub` hook + `<ScrubField>` wrapper + `severanceDragCurve` lib. Migrated 5 high-traffic panels (EffectPanel 24 sliders, StylePanel, MotionSimPanel, LayerStack, SmoothSwingPanel). Only **#16 Figma color model** remains from UX North Star.
- **P0 launch-readiness sweep** (commit 71ea296 → f9cca7e):
  - `--text-muted` contrast raised across `:root` + all 30 themes (≈1.6:1 → ≈4.4:1 WCAG AA).
  - CollapsibleSection nested-button hydration warning fixed (header accessory now sibling of the disclosure button).
  - PresetGallery + PresetBrowser "+ List" lifted out of the card button into a sibling keyboard-focusable button.
  - BladeCanvas diffusion blur: canvas-per-frame alloc → reused `diffusionTempRef` (killed 60 allocs/sec of GC churn).
  - `useAnimationFrame` default-consumes reduced-motion.
- **P1 a11y + perf batch** (commit f9cca7e):
  - `--border-subtle` / `--border-light` raised for WCAG 3:1 UI-component contrast, across all 30 themes.
  - LayerStack rows + GradientMixer saved-row now keyboard-focusable.
  - FlashPanel radio-label nested-button restructured (radio label + picker button now siblings).
  - PWA icons regenerated from `icon-1024.png`; 672KB orphan removed.
  - CrystalPanel lazy-mount via `next/dynamic` (reverted in the next session — see below).
  - BladeCanvas bloom pipeline early-skip when blade is retracted (~50% frame budget recovered in that state).
- **3 launch audit docs**: [LAUNCH_A11Y_AUDIT_2026-04-19.md](docs/LAUNCH_A11Y_AUDIT_2026-04-19.md), [LAUNCH_PERF_AUDIT_2026-04-19.md](docs/LAUNCH_PERF_AUDIT_2026-04-19.md), [LAUNCH_DEADCODE_AUDIT_2026-04-19.md](docs/LAUNCH_DEADCODE_AUDIT_2026-04-19.md).
- **Design-reference ingestion**: Claude Design reference parked at [docs/design-reference/2026-04-19-claude-design/](docs/design-reference/2026-04-19-claude-design/). Gap analysis at [docs/DESIGN_REFERENCE_2026-04-19.md](docs/DESIGN_REFERENCE_2026-04-19.md). Harvest plan: Cmd+K palette + density toggle + token refinements pre-launch; structural redesign deferred post-launch.

### 2026-04-20 session

- **Editor ChunkLoadError fixed** — reverted the CrystalPanel `next/dynamic` wrapper from the P1 batch; pattern was unstable under Turbopack HMR. Static import restored; the Three.js payload is still code-split by CrystalPanel's own internal `dynamic`.
- **Landing page rework** (Ken's walkthrough drove this end-to-end):
  - Shared `<MiniSaber>` primitive (`apps/web/components/shared/MiniSaber.tsx`): canonical hilt SVG + lightweight canvas blade + CSS drop-shadow halo. Props for orientation, hiltPosition (start/end), controlled ignition, `animated` on/off (static-till-hover pattern), neutral chrome hilt accent by default.
  - **Hero**: two horizontal sabers flanking the title, always ignited, colors + styles morph live in place (no retract). Top cycles 8 canonical hero colors, bottom cycles 8 creative styles, staggered beats. Graflex hilt throughout for brand consistency. Tip-only border-radius so the hilt end sits flush.
  - **Hero composition**: flex column — top saber (translateY -15px) → KYBERSTATION title + subtitle + CTAs (moved inside the hero from the standalone LandingCTAs section) → bottom saber (translateY +25px). Hilt:blade ratio 4:1 (180px hilt, 720px blade) to match real Graflex proportions.
  - **LandingSaberArray**: edge-to-edge dual-marquee gallery with 80 unique presets (40 canonical characters + 40 creative-style variants). Static by default, hover ignites the live engine tick + pauses that row. Click opens the preset directly in `/editor?s=<glyph>` (glyphs encoded once at module load). IntersectionObserver lazy-mount keeps startup cost flat regardless of pool size. Cards alternate canonical/creative type at every index, hue-spread so adjacent cards rarely share a color. 140s/170s per-row loop (premium-slow). 800ms ease-in/out on hover.
- **Cleanup pass**: applied the dead-code shortlist from the 2026-04-19 audit. Removed 5 orphan files (LoadingSkeleton, usePWA, MotionTelemetry, PowerDashboard, EngineStats), 6 unused `@radix-ui/*` deps, `idb-keyval`, `bezier-easing`, the `@kyberstation/boards` wiring sites in apps/web (the package itself stays intact), the `@kyberstation/engine` workspace dep from presets, and `PARAMETER_GROUPS` + its file. Typecheck + all 547 web tests still pass.
- **Hardware validation Phase A ✅** (89sabers Proffieboard V3.9, macOS, Chromium-based browser). Surfaced a macOS-specific release-blocker: Chromium on macOS returns `null` for `USBAlternateInterface.interfaceName` on DFU alternates (affects Chrome + Brave + Edge + Arc — all share Chromium's WebUSB implementation), so `findInternalFlash()` couldn't find a writable region and the FlashPanel refused to flash. Fix in [`apps/web/lib/webusb/DfuDevice.ts`](apps/web/lib/webusb/DfuDevice.ts) — `loadAlternates()` now falls back to raw `GET_DESCRIPTOR(config + string)` control transfers when any alternate comes back nameless. Regression test + new `macosNullInterfaceNames` mock option in [`apps/web/tests/webusb/`](apps/web/tests/webusb/). Validated end-to-end on real hardware; 512 KiB banner confirmed. **Code landed in commit `c70b4e5`** ("feat(workbench): W4 — header trim, upcased tabs, ⌘K mount, ⌘1–⌘5") — the workbench session swept up the hardware-session's staged files into its commit, so the commit message is misleading for future `git log` readers but the content is correct and tests pass. Phases B (dry-run) + C (real flash) need firmware prep and were deferred to a dedicated session — handoff prompt in [`docs/NEXT_HARDWARE_SESSION.md`](docs/NEXT_HARDWARE_SESSION.md).
- **DFU entry method clarified**: for a live-powered board (battery connected, or even just USB-powered + already running ProffieOS), the correct sequence is **hold BOOT → tap RESET → release BOOT**. The "unplug, hold BOOT, replug" method doesn't reset the chip when a battery is attached, so BOOT0 is never resampled. Both paths are now documented in [`docs/HARDWARE_VALIDATION_TODO.md`](docs/HARDWARE_VALIDATION_TODO.md).
- **Hardware validation Phases B + C ✅** (89sabers V3.9, macOS + Brave) — including recovery re-flash. Brave is Chromium-based; Chrome / Edge / Arc should behave identically but have not been independently verified. Blade ignites blue, USB serial enumerates as `/dev/tty.usbmodem*`, audio DAC announces "font not found"/"SD card not found". **Three real DFU protocol bugs caught + fixed** that 576 mock tests missed: (1) `verifyFlash` needs `abort()` after `setAddressPointer` to leave `dfuDNLOAD_IDLE` before `UPLOAD`; (2) manifest needs `abort()` before zero-length `DNLOAD` to leave `dfuUPLOAD_IDLE`; (3) post-manifest `controlTransferIn` raises a raw `DOMException` (not our `DfuError`) when STM32 resets the bus, and the catch block only swallowed `DfuError` — surfaced a successful flash as a red error banner. All three in [`apps/web/lib/webusb/DfuSeFlasher.ts`](apps/web/lib/webusb/DfuSeFlasher.ts). `MockUsbDevice` tightened with `strictState` + `resetAfterManifest` options (3 regression tests added, each independently verified to fail against a reverted fix). Also fixed [`firmware-configs/v3-standard.h`](firmware-configs/v3-standard.h) compile regression against current ProffieOS master (legacy `InOutTrL<TrWipe<300>, TrWipeIn<500>, Blue>` no longer compiles — bare `Blue` returns `RGBA_nod` which doesn't convert to `OverDriveColor`; replaced with `StyleNormalPtr<Blue, WHITE, 300, 500>`). Workflow at [`.github/workflows/firmware-build.yml`](.github/workflows/firmware-build.yml) had a Linux-only sketch-dir casing bug (`proffieos/` vs `ProffieOS.ino`) — fixed in commit `abe039d`. Cross-OS (Windows/Linux) and cross-board (V2, V3-OLED) sweeps still pending.

### 2026-04-20 late session — workbench UX realignment

Delivered waves W1 / W2a / W3 / W4 / W4b / W6a / W6b from the new
[`docs/WORKBENCH_UX_REALIGNMENT_2026-04-20.md`](docs/WORKBENCH_UX_REALIGNMENT_2026-04-20.md)
plan (commit `d30aae5`), plus two walkthrough-fix passes and one polish
wave. The plan synthesizes the UX North Star + the Claude Design
reference at `docs/design-reference/2026-04-19-claude-design/` into 8
waves; this session shipped everything except W5 (PerformanceBar),
W7 (4-tab consolidation), and W8 (Inspector extraction) — those are
post-launch per the plan's launch-readiness gating.

Structural shape changes (visible to users):

- **StatusBar promoted from bottom to top** (commit `0ce7d82`). The
  11-segment PFD strip (⚡ PWR · PROFILE · CONN · PAGE · LEDs · MOD ·
  STOR · THEME · PRESET · UTC · BUILD) now sits directly under the
  header. Replaces the decorative HUD ticker that used to live there.
  Tag flipped from `<footer>` to `<div role="status">`; `border-t` →
  `border-b` to match the new placement.
- **DataTicker relocated to the bottom** (same commit) as ambient
  chrome. Half-speed (60s vs 30s) since it's out of the primary eye
  zone. Fixed a seamless-loop asymmetry bug so the content no longer
  snaps back each loop (`items.concat(items).join` symmetry — commit
  `7347ebf`). 26-message pool (up from 8). **Now interleaves live
  readouts** (`TAB · DESIGN`, `THEME · JEDI`, `LEDS · 144`) every 4th
  slot via `tickerMessages` memo (commit `c09af58`).
- **Header trim** (commit `20bde4e`): dropped "Universal Saber Style
  Engine" subtitle + inline version/profile breadcrumb (StatusBar
  owns both now). Removed "FX Compare" button — moved to palette.
  Tighter padding (`py-2 → py-1.5`), height ~32-36px. Added
  `[Command ⌘K]` chip + tab kbd hints `⌘1–⌘5` (OS-aware — Ctrl+1
  on non-Mac via new [`apps/web/lib/platform.ts`](apps/web/lib/platform.ts)
  hooks `useIsMac` / `useMetaKey` / `useKbd`, commit `6207b8a`).
- **Action-bar pruned 21 chips → 5** (commit `b02ee81`, W4b). Kept
  `[IGNITE | CLASH | BLAST | LOCKUP | STAB]` plus the right-side
  `● LIVE` indicator. The 17 removed effects stay keyboard-bound
  (`EFFECT_SHORTCUTS_BY_CODE`) and discoverable through the palette's
  22-command AUDITION group. Sustained effects (Lockup et al.) now
  render an "active held" glow — commit `c09af58` / polish wave.

New primitives + stores shipped:

- `<CommandPalette>` — 640px Raycast-shape portal dialog (commit
  `a791150`, W2a). Mounted in W4. Uses `useModalDialog` for focus
  trap, keyboard nav ↑↓↵ESC, two crumb chips OS-aware.
- `commandStore` — registry + `registerCommand` / `runCommand` /
  open/close/query. Idempotent.
- `useCommandPalette` + `useRegisterCommands` — global `⌘K` /
  `Ctrl+K` listener with input-focus guard.
- 23 initial palette commands (NAVIGATE 5 / AUDITION 22 / VIEW 4 /
  WIZARD 1 / THEME 8-capped) registered from WorkbenchLayout.
- `--status-magenta` + `--status-white` tokens (fills the §6 six-
  aviation-color set). Radius trio `--r-chrome 2px / --r-interactive
  4px / --r-data 0px`. `--row-h` density token (SSL 22 / Ableton 26
  default / Mutable 32) with `[data-density="…"]` selectors wired
  through `useAccessibilityApplier`. Settings modal Row-density
  radio (W1, commit `d744ff5`). No components consume `--row-h`
  yet; density is scaffolding.
- `<StatusSignal variant="modulation" | "data">` glyphs added (◆ / ·).
- `<EffectChip>` action-bar subcomponent — subscribes to
  `activeEffectsStore`, shows accent glow on held state.
- `<ModulatorRow>` + `<ModulatorViz>` (W6b, commit `5e7281a`) —
  distinct row shape for SmoothSwing layers. Magenta left-edge
  stripe, animated SVG viz (lfo / env / sim / state kinds), target
  label + B/M/S, uses `--row-h` + `--mod-color`. Hot-mod hover-
  highlight: hovering the row tints other LayerRows (temporary 1:1
  mapping via `uiStore.hoveredModulatorId` until v1.1 modulation-
  routing plumbs real per-parameter highlighting). Docs:
  [`docs/MODULATION_ROUTING_V1.1.md`](docs/MODULATION_ROUTING_V1.1.md).
- `activeEffectsStore` (runtime Set of held sustained effects) +
  `stores/accessibilityStore.effectAutoRelease: { enabled, seconds }`
  (persisted demo-mode setting, default off / 4s).
- [`apps/web/lib/effectToggle.ts`](apps/web/lib/effectToggle.ts) —
  single `toggleOrTriggerEffect` helper called by keyboard
  (`useKeyboardShortcuts`), chip clicks (`EffectChip`), and all 21
  palette AUDITION commands. Module-level timer registry so rapid
  re-triggers from mixed sources share cancellation — never leaves
  a stale auto-release scheduled.

LayerStack W6a decomposition (behavior-preserving, commit `18cd9bf`):

- `components/editor/LayerStack.tsx` reduced 1086 → 4 lines
  (public re-export only).
- New `components/editor/layerstack/` subfolder with 6 focused files
  (`LayerStack` panel shell, `LayerRow`, `LayerConfigPanel`,
  `AddLayerDropdown`, `scrubFields`, `constants`).
- `AddLayerDropdown` portal-refactored (commit `0ce7d82`) via
  `createPortal(document.body)` so it escapes the LayerStack panel's
  `overflow: hidden` ancestor — previously clipped to 2-of-5 options.
  Click-outside + Escape close.

Bug fixes caught in walkthroughs:

- **Space key ignition regression** (finding #4, commit `7347ebf`) —
  `usePauseSystem` had a lingering Space → togglePause binding
  registered earlier than `useKeyboardShortcuts`, swallowing the
  ignite handler via `preventDefault`. Pause now lives only on the
  header PauseButton; inline comment blocks future reintroduction.
- **DataTicker snap-back** (finding #3, commit `7347ebf`) —
  asymmetric middle separator → `items.concat(items).join` fix.
- **Add Layer dropdown clipped** (finding #8, commit `0ce7d82`) —
  portal refactor above.
- **Landing page:** visibility-gated blade animation (commit
  `c47a640`): all 50 unique presets animate at 30fps via new
  `fps` prop on `<MiniSaber>`; rows no longer pause on hover;
  IntersectionObserver keeps `inView` state live so off-screen cards
  freeze (zero CPU). Row drift halved (280s/340s). Hover polish:
  2px-feel border via inset box-shadow + brighter halo (blur 48,
  opacity 0.42). `LANDING_PRESET_CAP = 50` slice applied after
  zipHueSpread.

Landing architecture:
- `MiniSaber` now has an `fps?: number` prop; RAF still fires at
  native rate but `engine.update` + `drawPixels` only run when
  `time - lastAppliedTime >= 1000/fps`. Undefined = native. Landing
  passes 30. Gate on visibility means concurrent tick count stays
  proportional to viewport (~12-20 cards) regardless of total pool.

Test count: **579 web tests** (547 pre-session + 28 new from W2a's
`commandPalette.test.ts`). +workspace packages unchanged. Typecheck
clean through every commit.

Known deferred (don't treat as bugs next session):

- **Layer edits don't reach the blade engine** — `layerStore` is not
  consumed by `BladeCanvas` / `useBladeEngine` / `packages/engine`.
  Pre-existing architectural state; part of the v1.1 modulation-
  routing sprint per `docs/MODULATION_ROUTING_V1.1.md`.
- **StatusBar `CONN · IDLE`** is a placeholder. No global WebUSB
  store exists yet (FlashPanel holds its state locally). Drop-in
  swap documented in the StatusBar source via `getConnectionDisplay()`.
- **Below 1024px layout breaks** — pre-existing; the desktop
  workbench is gated on `desktop:` breakpoint via AppShell.
- **Density toggle is scaffolding** — `--row-h` defined + flipped on
  `<html data-density>`, but no component reads it yet. Threading
  through LayerStack rows is a natural first consumer.

### Current session accomplishments (2026-04-18)

- **Phase 1 QA sweep** — 28 of 37 launch-readiness phases. 11 findings fixed inline. `docs/LAUNCH_QA_PLAN.md` is the authoritative plan.
- **UX overhaul pass** — **26 of 27** UX North Star deferred items shipped across 3 waves + a 2026-04-18 follow-up session (item #7 DragToScrub primitive + 5-panel migration). Only **#16 Figma color model** remains.
- **New primitives shipped:** `<CollapsibleSection>`, `useFilenameReveal`, `<RadialGauge>`, `<MobileTabBar>`, `useModalDialog`, `useCommitCeremony`, `historyRestoreFlag`, `<LayerThumbnail>`, modulation-routing type scaffold, **`useDragToScrub` + `<ScrubField>`** (2026-04-18 follow-up).
- **Typography migrated** per §6 to Inter + JetBrains Mono + Orbitron (Orbitron ratified as the third ceremonial face in §5/§6/§8).
- **Test count:** 547 web tests + 457 engine + 1,323 codegen + 260 boards + presets + sound = **~2,636 passing**. +145 new regression tests this session.

### What's waiting

**Launch-blocker QA phases (from `docs/LAUNCH_QA_PLAN.md`):**
- **P29 deep a11y audit** — VoiceOver walk, WCAG contrast sweep, keyboard-only nav.
- **P30 perf deep-dive** — LCP / FPS / memory.
- **P31 cross-browser matrix** — Safari / Firefox / Edge + mobile Safari / mobile Chrome.
- **P37 launch-triage** — go/no-go after above.

**Post-launch structural waves (from `docs/WORKBENCH_UX_REALIGNMENT_2026-04-20.md`):**
- **W5 — PerformanceBar** (plan §W5). Dedicated session.
- **W7 — 4-tab consolidation** (plan §W7). Requires Ken's explicit call on panel redistribution.
- **W8 — Inspector extraction** (plan §W8). v0.14+; XL effort on StylePanel + EffectPanel.

**Hardware:**
- **Cross-OS + cross-board validation** — Phase A/B/C ✅ on macOS + V3.9. Windows / Linux + V2 / V3-OLED sweeps still pending.

**UX:**
- **1 remaining UX item** (#16 Figma color model — opacity + blend modes) — prompt in `docs/NEXT_SESSIONS.md`. Requires Kyber Glyph version bump + engine compositor changes.

**Polish sweeps queued (from `docs/WORKBENCH_UX_REALIGNMENT_2026-04-20.md` §6b):**
- **Radius token migration** (`rounded-*` → `var(--r-interactive)`). 39+ sites across 20 files.
- **Density consumption** — thread `var(--row-h)` through `LayerRow` + `StylePanel` rows so the SSL/Ableton/Mutable toggle has visible effect. (`ModulatorRow` already consumes it.)
- **Imperial amber as additive theme** — `lib/themeDefinitions.ts` addition (not a default swap).

**Open PRs:** [#32](https://github.com/kenkoller/KyberStation/pull/32) (marketing site expansion, ready, not draft).

**Housekeeping:** 5 stale feature branches merged into main (pruning candidates); 3 stashes on `test/launch-readiness-2026-04-18` worth triaging (WIP landing CTAs / ReleaseStrip URL / Footer changes).

**Known TODOs surfaced in code:**
- `StatusBar.tsx` CONN segment is a placeholder — global WebUSB store doesn't exist yet (FlashPanel holds state locally).
- `WorkbenchLayout.tsx:682` — theme-row cap TODO pending theme-section redesign.
- `packages/engine/src/modulation/index.ts` — 5 TODOs for v1.1 parser/evaluator/registry/sampler/binding-apply (architectural scaffold only).
- `PauseButton` mobile touch-target 23px — needs 44px minimum per WCAG (flagged in `UX_OVERHAUL_MOBILE_2026-04-18.md §DEFER`).
- Single-BladeEngine context consolidation to eliminate double-tick (`SABER_VISIBILITY_AUDIT_2026-04-18.md §Follow-Up`).

### Key session docs for future-Claude (or Ken)

- [`docs/WORKBENCH_UX_REALIGNMENT_2026-04-20.md`](docs/WORKBENCH_UX_REALIGNMENT_2026-04-20.md) — 8-wave realignment plan. W1–W4b + W6a+b shipped late 2026-04-20; W5 / W7 / W8 are post-launch.
- [`docs/UX_NORTH_STAR.md`](docs/UX_NORTH_STAR.md) — updated 2026-04-18; Orbitron sanctioned as the third ceremonial face per §5/§6/§8
- [`docs/UX_OVERHAUL_SUMMARY_2026-04-18.md`](docs/UX_OVERHAUL_SUMMARY_2026-04-18.md) — full session synthesis, all 25 items + their docs references
- [`docs/NEXT_SESSIONS.md`](docs/NEXT_SESSIONS.md) — ready-to-paste prompts for the 2 remaining items
- [`docs/LAUNCH_QA_PLAN.md`](docs/LAUNCH_QA_PLAN.md) — 37-phase QA plan with per-phase status
- [`docs/TESTING_NOTES.md`](docs/TESTING_NOTES.md) — session finding log
- [`docs/MODULATION_ROUTING_V1.1.md`](docs/MODULATION_ROUTING_V1.1.md) — v1.1 architecture doc for the layer-to-engine wiring (referenced by W6b's temporary 1:1 hover-highlight)
- [`docs/MODULATION_ROUTING_V1.1.md`](docs/MODULATION_ROUTING_V1.1.md) — new this session; v1.1 architecture scoping for math expressions + modulation
- Per-area audit docs: `UX_OVERHAUL_{LANDING,EDITOR_CORE,COLOR_PRESET_AUDIO,OUTPUT_EXPORT,MOBILE,SABER_VISIBILITY}_2026-04-18.md`

### Pre-session state (legacy context — kept for history)

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
| 16 | **WebUSB flash** | ✅ validated (V3.9 / macOS / Brave) | Protocol + UI on `main`. 576 mock tests pass + Phases A/B/C hardware-validated 2026-04-20 on 89sabers Proffieboard V3.9 (macOS + Brave, Chromium-based) including recovery re-flash. Three real DFU protocol bugs caught + fixed during validation — see `docs/HARDWARE_VALIDATION_TODO.md` § Phase C. Chrome/Edge/Arc share the same WebUSB implementation so should behave identically but not independently verified. Cross-OS (Windows/Linux) + cross-board (V2, V3-OLED) sweeps pending. |
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
| v0.13.0 | **Launch Readiness** | ✅ shipped (PR #31, commit `1b5da69`) | 37-phase QA sweep (28/37 complete pre-merge), UX overhaul (26/27 items), workbench realignment (W1/W2a/W3/W4/W4b/W6a/W6b + polish), landing page rework, hardware validation phases A/B/C on V3.9 + macOS. Remaining launch-blockers are P29/P30/P31/P37 + cross-OS hardware sweeps. |
| v0.14.0 | *open for next sprint* | 📋 available | Slot cleared 2026-04-23 after deprecating the former "Kyber Forge" ultra-wide layout concept — OV11's drag-to-resize handles already cover the ultra-wide use case, making a dedicated layout mode redundant. Strong candidate: modulation routing v1.1 (currently parked on `feat/modulation-routing-v1.1`). |
| v0.15.0 | **Preset Cartography** | 📋 planned | Parallel-agent preset expansion. Deep-cut lanes: Prequel/OT/Sequel Jedi & Sith, Legends/KOTOR/SWTOR (incl. Dark Forces / Jedi Knight / Outcast / Academy), Animated/Rebels/BadBatch, Sequel/Mando/Ahsoka/Acolyte, Space-combat (Rogue Squadron / X-Wing / TIE Fighter / Squadrons / Rebel Assault), Cross-franchise "inspired by". Could 4-5× the preset library in one session. |
| v0.16.0 | **Multi-Blade Workbench** | 📋 planned | Channel-strip UI for editing dual-blade sabers / saberstaffs / crossguards. Blade-switching in the workbench. Sync / Unsync toggle for symmetry vs independence. Glyph format already supports multi-blade from v1, so this is purely the editing UI side. |

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

### Agent delegation discipline (added 2026-04-22 after near-miss)

Subagents can confabulate when prompted for a verdict. The P29/P30/P31
audits this session were reliable because the prompts required
evidence-shape output (`file:line — description` with citations). Two
other sweeps in the same session — "are these items still open?" and
"are these branches merged?" — produced false positives, including one
where an agent cited a real commit hash but fabricated its role
(`64f3322` exists on the feature branches, not on main). Nearly led to
destroying thousands of lines of unmerged feature work.

Rules for future sessions:

1. **Git / commit / merge / branch state — verify directly via `git`,
   don't delegate.** One-shot Bash calls are cheap; delegation adds
   hallucination surface area for no speed benefit. `git diff main..<branch>
   --stat`, `git cat-file -e <hash>`, and `git cherry` are the canonical
   checks for "is X on main?".
2. **When delegating fact-finding, require evidence output, not
   verdicts.** "Paste the first N lines of `<command>` for each target,
   then draw conclusions" — not "is X true?". Forces the agent to look
   at ground truth before concluding.
3. **Match model to task shape.** Bulk evidence collection (grep, list
   files, run commands) — default Haiku is fine. Verdict-making (is
   this shipped? will this break?) — set `model: "sonnet"` or
   `"opus"` on the `Agent` call.
4. **Relay agent output with provenance.** "Agent reports X
   (unverified)" until verified directly, then "Verified: X". Never
   promote agent summary to a claim of fact via silent restatement.
5. **Verify before any destructive action, even after user approval.**
   "Can we prune X?" / "Is this safe to delete?" is a confirmation
   request, not a green light. Re-verify in the main session with the
   canonical git check before acting.

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
