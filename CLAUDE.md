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

## Current State (2026-05-01 afternoon, mobile sprint feature-complete)

Continuation of the 2026-05-01 morning session. **Three more PRs opened this afternoon** (#207, #209, #210) plus a docs refresh (#208), bringing the mobile redesign through Phase 4.4 → 4.4.x → 4.5. **The mobile sprint is now feature-complete** per `Claude Design Mobile handoff/HANDOFF.md` — all 5 phases shipped, only the Q3 diagnostic-strip segment-set decision remains as an open UX call for Ken.

### Today's afternoon PR stack

| PR | Branch | Scope |
|---|---|---|
| [#207](https://github.com/kenkoller/KyberStation/pull/207) | `feat/mobile-parameter-sheet-primitive` | **Phase 4.4** — ParameterSheet 3-stop primitive (foundation only). New `ParameterSheet.tsx` + `ParameterSheetBody.tsx`. Closed/peek 168px/full min(92vh,720px) with drag-snap state machine. `transform: translateY()` animation per handoff §Q5 (not height — Chromium glitches on fixed-position height transitions). Sibling backdrop, not parent (avoids opacity-cascade trap). +38 tests |
| [#208](https://github.com/kenkoller/KyberStation/pull/208) | `docs/handoff-refresh-phase-4.4-4.5` | **Docs** — refresh of `docs/NEXT_SESSION_HANDOFF.md` for Phase 4.4 + 4.5 with architectural decisions, EXISTING MOBILE PRIMITIVES list, TOKENS ALREADY ADDED list, and CROSS-SESSION COLLISION GUARDRAILS (stash → switch → pop pattern). Ken later reverted some of this back to the morning version mid-session — kept the docs branch separate so the merged version can be whichever Ken prefers |
| [#209](https://github.com/kenkoller/KyberStation/pull/209) | `feat/mobile-parameter-sheet-integration` | **Phase 4.4.x** — wire ParameterSheet into ColorQuickControls via global `parameterSheetStore` (Zustand). New `ParameterSheetHost.tsx` mounts once at MobileShell root. ColorQuickControls' 4 wired sliders gain onLongPress callbacks dispatching to the store. Defensive try/catch around `setPointerCapture` — synthetic-dispatched PointerEvents threw `NotFoundError` on the Next.js dev overlay. +15 tests. Browser-verified: long-press → peek → drag-up → full → drag-down → close all working |
| [#210](https://github.com/kenkoller/KyberStation/pull/210) | `feat/mobile-blade-inspect` | **Phase 4.5** — Inspect mode + zoom HUD. New `inspectModeStore.ts` + `MobileInspectHUD.tsx`. 500ms long-press on blade canvas enters Inspect (default 2.4× zoom centered on long-press point); HUD with 1× / 2.4× / 4× / 🎯 buttons; one-finger pan (clamped by zoom-derived maxPan); chrome dim to 40% via CSS rule on `[data-inspect-mode]`; Escape + tap-outside exit. +15 tests. Browser-verified end-to-end |

### Architectural decisions worth carrying forward

1. **`transform: translateY()` is the right animation primitive for the sheet, not `height`.** Discovered during Phase 4.4 build: inline `height: 720px` with a CSS height transition would set inline style correctly but compute to the prior value (168px) until forced reflow on fixed-positioned elements in Chromium. The handoff explicitly calls for translateY anyway, and it runs on the GPU compositor (better perf).

2. **Backdrop must be a sibling of the sheet, not its parent.** First Phase 4.4 attempt nested the sheet inside the backdrop's div. The backdrop's `opacity: 0` at peek cascaded to the sheet (CSS opacity property cascades to children). Encode opacity in `background: rgba(0,0,0,0)` so children's opacity isn't tied; siblings keep them independent.

3. **Global stores beat inline component state for shell-wide overlays.** Phase 4.4.x's `parameterSheetStore` decouples slider grids from sheet rendering. Future per-section variants (Style / Motion / FX / HW / Route QuickControls) just call `open(spec)` instead of re-implementing per-variant sheet state. Phase 4.5's `inspectModeStore` follows the same pattern. Single mount point + multiple publishers.

4. **Defensive `setPointerCapture` for synthetic events.** Test paths and dev tooling that synthesize `PointerEvent`s via `dispatchEvent` will throw `NotFoundError` when `setPointerCapture` runs because the browser has no real active pointer with the dispatched id. Real touch + mouse interactions on devices always succeed. Wrap calls in try/catch — the capture is a perf optimization, not load-bearing. Caught the dev runtime overlay flashing "1 error" during browser-verify; fix shipped in PR #209.

5. **Zustand SSR snapshot pinning continues to bite.** Tests that read store state via `useXxxStore(selector)` need a hoisted-mock pattern with mutable stub state — Zustand's React binding pins the SSR snapshot to `getInitialState()`, so any `setState` call before `renderToStaticMarkup` is invisible. Pattern works for `parameterSheetStore` + `inspectModeStore` tests (and the existing `useUIStore` mock pattern in `mobileShell.test.tsx`).

### Cross-session collision recovery — happened twice today

Two cross-session worktree collisions during the afternoon session, both recovered cleanly via the same pattern:

1. Mid-Phase-4.2 wrap: `docs/launch-comms-prep` got checked out under the working tree by a parallel session. Working tree state preserved via `git stash push -u`, switched back to `feat/mobile-section-tabs`, `git stash pop`. Mobile work intact.

2. Mid-Phase-4.4 wrap: similar pattern when the docs handoff branch was created. The `Claude Design Mobile handoff/` directory is gitignored (per #201) so it survives all branch switches without conflict.

The `git stash push -u → branch switch → git stash pop` recovery is now well-tested. **Documented as the canonical pattern in `docs/NEXT_SESSION_HANDOFF.md` §"CROSS-SESSION COLLISION GUARDRAILS"** for future sessions.

### What's actually next — the diagnostic-strip segment-set decision

Per `docs/NEXT_SESSION_HANDOFF.md`, the only remaining mobile-handoff item is the **diagnostic strip segment-set review** (§Q3). The strip itself is shipped via Phase 4.2's `MobileStatusBarStrip`; the question is what segments to display:

| Path | Segments | Tradeoff |
|---|---|---|
| (a) Keep current — desktop StatusBar mirror | PWR · PROFILE · BOARD · CONN · PAGE · LEDS · MOD · STOR · THEME · PRESET · UTC · BUILD | Tech-savvy users get full diagnostic richness; mobile = desktop |
| (b) Mirror handoff §Q3 exactly | BLADE 36" · 144 LED · NEOPIXEL · 3.88A · 41% CHARGE · 4.2V · BT ON · PROFILE 03 | More user-facing; needs charge / voltage / BT data sources we haven't wired |
| (c) Hybrid | Most desktop segments + add charge / BT when sources land | Best long-term; gated on battery + BT features (post-v0.17 per `BLUETOOTH_FEASIBILITY.md`) |

Ken's call. Recommended path is (a) ship-as-is, revisit (c) when battery + BT land.

### Recommended merge order for the afternoon stack

1. **#207** Phase 4.4 ParameterSheet primitive — pure additive, 38 new tests, no API breakage
2. **#208** Docs handoff refresh — independent of code stack, mergeable any time
3. **#209** Phase 4.4.x integration — stacked on #207, +15 tests, browser-verified
4. **#210** Phase 4.5 Inspect mode — stacked on #209, +15 tests, browser-verified

After all merge, total apps/web test count hits **2191/2191 passing** (was 2123 at start of afternoon session — +68 across the 4 PRs).

### Phase rollout — MOBILE SPRINT FEATURE-COMPLETE

| Phase | Status | PR |
|---|---|---|
| 4.1 Sticky shell foundation | ✅ merged | #199 + #200 |
| 4.2 Section tabs + status strip | ✅ merged | #203 |
| 4.3 Color-tab QuickControls + ColorRail | ✅ merged | #205 |
| 4.4 ParameterSheet primitive | ⏳ open | #207 |
| 4.4.x ParameterSheet integration via store | ⏳ open | #209 |
| 4.5 Inspect mode + zoom HUD | ⏳ open | #210 |
| Diagnostic strip segment-set decision | ⏸ awaits Ken's UX call | — |

---

## Current State (2026-05-01 morning, mobile sprint pivot to design handoff)

Continuation of the 2026-04-30 night session. **Six PRs merged today** (#199, #200, #201, #202, #203, #205 with #204 auto-closed mid-stack and recovered as #205). The day's most significant move was a **mid-sprint pivot away from the original `docs/mobile-implementation-plan.md` chip-strip Pattern A** — replaced by the **Claude Design StickyMiniShell handoff** that arrived this morning at `Claude Design Mobile handoff/HANDOFF.md` (folder gitignored per #201; reference materials live next to the repo as a local-only design source).

### Today's merge timeline

| Time | PR | Branch | Scope |
|---|---|---|---|
| 16:23 | [#199](https://github.com/kenkoller/KyberStation/pull/199) | `mobile/shell-density-and-sticky-canvas` | **PR A1** — sticky blade canvas (fixes "odd zoom levels"), drawer discoverability via visible MENU label, header h-12, effect bar `compact` mode (drops kbd letter), blade canvas auto-ignite, bottom-bar hamburger trigger |
| 17:31 | [#200](https://github.com/kenkoller/KyberStation/pull/200) | `mobile/density-v2-and-stacked-columns` | **PR A2** — header h-10 + 30px chrome buttons, single thin row effect bar, blade canvas 120px floor 96, **MainContentABLayout phone branch** (stacked vertical full-width Column A above Column B, no ResizeHandle), PixelStripPanel + LayerCanvas (rgb-luma) mounted directly below blade matching desktop CanvasLayout vertical order |
| 18:56 | [#201](https://github.com/kenkoller/KyberStation/pull/201) | `chore/gitignore-design-handoff-folder` | Adds `Claude Design Mobile handoff/` to `.gitignore` so the downloaded design reference (HANDOFF.md, components/*.jsx, kyber-mobile.css, screenshots, original uploads) stays local without git noise |
| 20:13 | [#202](https://github.com/kenkoller/KyberStation/pull/202) | `docs/launch-comms-prep` | Launch comms package finalised + audit fixes (stale numbers, version/date refs) |
| 20:18 → merged | [#203](https://github.com/kenkoller/KyberStation/pull/203) | `feat/mobile-section-tabs` | **Phase 4.2** — sticky mini-shell anatomy from `Claude Design Mobile handoff/HANDOFF.md`. Header (44px) + mini blade canvas (64px, down from 96-120px in PR A2) + pixel strip (36px) + MobileActionBar (56px) + MobileSectionTabs (32px). Single overflow-y-auto body region. New components: `apps/web/components/layout/mobile/{MobileActionBar,MobileSectionTabs,MobileStatusBarStrip}.tsx` |
| 21:xx → merged | [#205](https://github.com/kenkoller/KyberStation/pull/205) | `feat/mobile-quick-controls` | **Phase 4.3** — Color tab QuickControls + ColorRail. 8-swatch ColorRail + 6-slider 2-col QuickControls grid (HUE / SAT / BRIGHT / SHIMMER / TEMPO placeholder / DEPTH placeholder) on the mobile Color tab body. New components: `apps/web/components/layout/mobile/{ColorRail,MiniSlider,QuickControls}.tsx` + `apps/web/lib/colorHsl.ts`. Recovery PR for the auto-closed #204 (its base branch was deleted by #203's merge — same trap as PR #120 → #125 in the v0.15.0 entry below) |

### Strategic pivot worth carrying forward

The original `docs/mobile-implementation-plan.md` proposed a **chip-strip Pattern A** for the mobile A/B sections. PR A1 + PR A2 partially executed that plan (PR A2 added MainContentABLayout's mobile branch as a stacked-fallback) but **after Ken field-tested PR A1 mid-session and gave new direction**, the chip-strip plan was cancelled and PR A2 pivoted to stacked columns instead.

**Then a cleaner answer arrived in the morning** when Ken downloaded the Claude Design **StickyMiniShell** spec at `Claude Design Mobile handoff/HANDOFF.md`. That doc resolved Q1–Q5 (chip width, action bar shape, status bar, blade Inspect mode, Sheet stops) with production-shape JSX in `Claude Design Mobile handoff/components/v1-synthesis.jsx` meant to be lifted verbatim. Phases 4.2 + 4.3 implement that spec faithfully.

The new sequence (from HANDOFF §"Phased rollout"):

| Phase | Status | Branch convention |
|---|---|---|
| 4.1 — Sticky shell foundation | ✅ done via PRs #199 + #200 (covered by A1 + A2's restructure) | `feat/mobile-shell-sticky` |
| 4.2 — Section tabs + section content swap | ✅ #203 (named `feat/mobile-section-tabs`) | `feat/mobile-section-tabs` |
| 4.3 — Quick-controls grid + color rail | ✅ #205 (named `feat/mobile-quick-controls`) | `feat/mobile-quick-controls` |
| 4.4 — Sheet primitive (peek + full) on knobs | ⏳ next | `feat/mobile-sheet-primitive` |
| 4.5 — Inspect mode + bottom diagnostic strip | ⏳ after 4.4 | `feat/mobile-blade-inspect` |

### Process learnings worth keeping

1. **Auto-closed PRs from base-branch deletion is a real workflow trap (recurring).** When merging `--delete-branch` on a PR whose child PRs target it, the children auto-close. Today: #204 → #205 reborn off main. Same trap previously hit PR #120 → #125 (v0.15.0 entry below). Pattern: merge with `--delete-branch`, child auto-closes, open replacement PR with same branch (no force-push needed if the branch's commits are already a fast-forward of new main). When the branch IS already a fast-forward (as today), no rebase is required — just `gh pr create --base main` against the same branch.

2. **Cross-session coordination via the working tree is fragile.** Ken's parallel session was actively committing Phase 4.2 + 4.3 while this session was merging A1/A2. Detecting it required `git reflog` + `git status` checks and pausing before any destructive action. Documented push-to-origin discipline in CLAUDE.md (the "When parking WIP for another session, push the branch to origin" rule on line 540) was load-bearing today: Ken pushed `feat/mobile-section-tabs` to origin BEFORE I could clobber it. The two parallel streams ended up cooperating without collision.

3. **Stacked PRs need recovery procedure documented inline.** PR #205's body now carries a `> Recovery PR.` callout at the top explaining why it exists. Future stacked-PR setups should expect this and include the recovery callout proactively so reviewers don't think the PR is duplicating work.

4. **Design handoffs from external sources beat in-session design pivots.** Ken's "we should match desktop order" feedback during PR A2 was correct but underscoped — the Claude Design handoff resolved it cleanly with explicit token specs (`--header-h: 44px`, `--blade-rod-h: 12px`, `--actionbar-h: 56px`, `--statusbar-h: 36px`, `--shell-h` total 136px so scroll regions can size as `calc(100vh - var(--shell-h) - var(--blade-canvas-h))`). The pivot from "stacked columns + analysis stack" (PR A2) → "StickyMiniShell with section tabs" (#203) was net additive: A2's height/density wins carry over; #203 adds the section-tabs nav model on top.

### Recommended next steps

1. **Phase 4.4 — Sheet primitive (peek + full) wired to long-press on knobs.** Per HANDOFF §Q5, the 3-stop Sheet (closed / peek 168px / full 92vh) replaces the existing single-state `<Sheet>` primitive (the v1 from PR #195). Long-press on any QuickControls knob opens the Sheet for that parameter; tap inside the sheet flips knob → slider → modulation graph. Drag stops to nearest of 3, 48px threshold, `cubic-bezier(0.32, 0.72, 0, 1)` 260ms motion.
2. **Phase 4.5 — Inspect mode + bottom diagnostic strip.** Long-press on `.blade-canvas` enters Inspect mode (1× / 2.4× / 4× / 🎯 zoom HUD). Bottom diagnostic strip is a horizontal-scroll segment list (BLADE 36" · 144 LED · NEOPIXEL · 3.88A · 41% CHARGE · 4.2V · BT ON · PROFILE 03) with critical pieces first.
3. **Stale PR cleanup.** [#83](https://github.com/kenkoller/KyberStation/pull/83) (session archive 2026-04-27) — recommend close (historical, conflicts with newer state). [#32](https://github.com/kenkoller/KyberStation/pull/32) (marketing site expansion) — leave open, needs focused rebase session.

---

## Current State (2026-04-30 night, v0.16.0 LAUNCH + post-launch sprint)

KyberStation v1.0 launched tonight. Tag `v0.16.0` cut at commit `9e3d747` on main, pushed to origin. Live site: https://kenkoller.github.io/KyberStation/. Repo flipped public, GitHub Pages enabled, branch protection active (ruleset "Protect Main").

**~30 PRs landed this session** across launch-prep, bug fixes, brought-back features, late-night strategic asks, post-launch parallel batch, and overnight Phase 4 mobile work. Tonight's session was a marathon — ~24 hours from launch-go decision to current state. The full session archive lives at `docs/SESSION_2026-04-30_NIGHT_v0.16.0_LAUNCH.md` (PR #178).

### Key strategic decisions locked tonight

1. **Launch posture: design tool first.** Generate config with KyberStation, compile with `arduino-cli`, flash with `dfu-util`. Web-based flashing remains experimental behind a 3-checkbox EXPERIMENTAL disclaimer.
2. **Mobile UX overhaul phased per Ken's prompt.** Phase 1 audit (PR #172) → Phase 2 design (PR #182) → Phase 3 implementation plan (PR #187) → Phase 4 PR-by-PR coding (in flight).
3. **Bluetooth wireless updates → defer to v0.17 minimum.** Research doc at `docs/research/BLUETOOTH_FEASIBILITY.md` (PR #166). ProffieOS author Fredrik already shipped a Web Bluetooth POC at `profezzorn/lightsaber-web-bluetooth` — port + integrate is the v0.17 path. iOS exclusion is permanent (Apple WebKit policy).
4. **Next.js 14 → 15 upgrade → defer to v0.17 stabilization slot.** Research doc at `docs/research/NEXTJS_15_UPGRADE_PLAN.md` (PR #189). 3-5 hour mechanical upgrade, NOT launch-blocking. Forced React 18 → 19 jump is the main risk.
5. **`useAudioEngine` consolidated to module-scope singleton** (PR #176). Chrome's per-origin AudioContext cap (~6) was hit; now bounded to 1.
6. **`lib/blade/*` module extraction** (PR #177). BladeCanvas's bloom + tonemap + rim-glow + motion-blur pipeline extracted to 7 shared modules. Pixel-identical refactor (renderer golden-hash unchanged across all 9 cases). MiniSaber + SaberCard can now adopt the shared pipeline.

### What shipped (chronological highlights)

| Block | PRs | Notes |
|---|---|---|
| Launch-prep | #153 CHANGELOG, #154 basePath/.nojekyll, #155 CSP `unsafe-inline` | GitHub Pages deploy plumbing |
| Tonight's bug-fix wave | #156-#162 | Wizard label, blade thumbnails, Lane A cleanup, hardware caption audit, UX polish, visual bugs, Save/Queue glyphs |
| Brought-back features | #163-#165 | Battery selector, gallery grid view, profile rename + workbench notes |
| Late-night strategic | #166 Bluetooth research, #167 landing one-page, #168 CHANGELOG/README refresh, #169 mobile shell overhaul (Item H), #170 27 kinetic presets |
| Post-launch sprint | #171 stub deletion (1030 LOC), #172 mobile audit Phase 1, #173 doc archive (7 docs), #174 OG hero 1200×630, #175 priority-5 effects (Sith Flicker + Blade Charge + Tempo Lock + Unstable Kylo), #176 audio singleton, #177 lib/blade extraction, #178 session archive |
| README + GIFs | #179 marketing pages, #180 mobile gallery link fix, #181 BladeCanvas3D orphan deletion, #182 mobile design Phase 2, #183 README post-launch refresh, #184 GIF Sprint 3, #185 GIF bloom fix, #186 security audit + CodeQL, #187 mobile Phase 3 plan |
| Overnight Phase 4 | #188 crystal favicon, #189 Next.js 15 research, #190 Phase 4 PR #1 phone-sm breakpoint |
| In flight at wrap | Phase 4 PR #2 Sheet primitive, PR #3 ChipStrip, PR #4 in-editor bottom bar, README visual refresh |

### Process learnings worth carrying forward

1. **Worktree path discipline still bites.** 3 agents leaked into the main repo path tonight (effects priority-5, mobile overhaul, Phase 4 PR #1). The salvage pattern is now well-rehearsed: parent session inspects working tree, runs typecheck/tests, commits + pushes + opens PR. Cost is ~10 min per salvage. Don't dispatch more than 4 concurrent agents — concurrent leak risk compounds.
2. **Phased agent prompts work for human-gated tasks.** Ken's mobile UX prompt specified "Stop. Wait for review" between phases. Modified the dispatch to bound the agent at one phase per dispatch; Ken reviews on his own time. Phases 1, 2, 3 all shipped this way.
3. **5-PR merge orderings matter.** Tonight's merge order (docs-only first → isolated additive → pure deletions → biggest-footprint last) produced zero conflicts across 12+ batched merges.
4. **Flaky test recognition.** `hardwarePanel.test.tsx` + `webusb/DfuSeFlasher.test.ts` timeout under parallel-CPU pressure — pass cleanly when re-run in isolation. Not bugs.
5. **Ken's review gating discipline pays off.** The mobile UX 4-phase audit → design → plan → code structure caught the mobile shell architectural issue (no-phone-fallback in MainContentABLayout) BEFORE any code changed. Phase 4 PRs are now landing one-at-a-time with the design as a stable contract.

### Pre-launch action Ken completed tonight

- ✅ Enabled GitHub Pages
- ✅ Flipped repo to public
- ✅ Enabled branch protection ruleset on `main` ("Protect Main", enforcement: active)
- ✅ Set up 2FA on GitHub account
- ⏸ One older legacy `main-protection` ruleset (2026-04-17) still exists — Ken to review/clean up if redundant

### Test count snapshot at session wrap

- Total: ~5,000 tests passing across 10 packages
- Web: 1,952+ tests (after #176 singleton + #182 Phase 2 + Phase 4 #1 +2)
- Engine: 876+ tests (after priority-5 effects +9 smoke tests)
- Codegen / boards / sound / presets: unchanged from pre-session
- Typecheck clean across all 10 workspace packages

### What's next (post-overnight, awaiting Ken's morning review)

1. **Mobile UX Phase 4 PRs #2-#4** — Sheet primitive, ChipStrip primitive, in-editor bottom bar (in flight at session wrap)
2. **Mobile UX Phase 4 PRs #5-#11** — per-section pattern application + polish (sequential after #2-#4 land)
3. **README visual refresh** — embed marketing GIFs + OG hero throughout, replace static landing-hero (in flight)
4. **Manual screenshots** Ken needs to capture for `LAUNCH_ASSETS.md` Reddit post (8 of the listed 12)
5. **Reddit / Twitter launch announcement** per `docs/LAUNCH_ASSETS.md` (Ken's own)

### Open questions for Ken

(From `docs/mobile-implementation-plan.md` §6 — needs answers before Phase 4 PRs #5+ start)

1. Pattern A chip width on phone-sm (≤479px): 96px or 80px?
2. Action bar 5-chip layout at phone-sm: icon-only or icon+letter?
3. StatusBar phone shape: collapsed single-line, or horizontally scrollable preserving density?
4. Pinch-zoom into BladeCanvas: in-scope or out?
5. Phase 4 PR cadence: review one-at-a-time, or batch 2-3 per review session?

---

## Current State (2026-04-30 PM, launch posture lock + FLASH_GUIDE)

Continuation of `docs/SESSION_2026-04-30_LAUNCH_DAY.md`. Pure launch-prep session: locked the v1.0 launch posture, wrote the canonical user flash guide, strengthened the WebUSB disclaimer. **2 PRs merged this session.**

### PRs merged this session

| PR | Status | Title |
|---|---|---|
| #145 | ✅ merged | feat(launch): FLASH_GUIDE + README beta posture + FlashPanel experimental gate |
| #146 | ✅ merged | docs(session): archive 2026-04-29 + 2026-04-30 session notes |

### Launch posture (locked)

**KyberStation v1.0 ships as a design tool first.** The pitch is now:

> "KyberStation is a visual blade design tool. Generate your ProffieOS config, compile it with `arduino-cli`, flash it with `dfu-util`. Web-based flashing is experimental and coming in v0.16+."

**Why:** The audience is Proffieboard hobbyists who already own `arduino-cli`. The codegen + compile pipeline is validated end-to-end (213 KB binary builds clean against ProffieOS 7.x from a KyberStation-generated config — verified 2026-04-29). The WebUSB FlashPanel has an unfixed manifest-phase bug where the chip stays in DFU mode after a successful write, particularly on vendor-customized boards. Honest "tool we shipped" beats "tool we claim works but doesn't."

### What landed in #145

- **`docs/FLASH_GUIDE.md`** — canonical end-user flash guide (~290 lines, 13 sections + TL;DR). Covers `dfu-util` install, ProffieOS source setup, KyberStation config export, `arduino-cli` compile (V3 + V2 fqbns), DFU mode entry (vendor combos + on-board BOOT/RESET), the **mandatory firmware backup step**, vendor-customized board warnings (89sabers BFB2=1, KR Sabers, Saberbay, Vader's Vault), recovery procedure, troubleshooting, FAQ. The mandatory backup is the single most important user-protection step — turns "I just bricked my saber" into "I just lost 30 seconds."
- **README.md** rewrite of the Flash section. Replaced the misleading "validated WebUSB" hardware table with an honest "dfu-util first, WebUSB experimental" framing. Added "Beta" tag + posture callout linking to FLASH_GUIDE.md. Rewrote credits to thank Fredrik Hübinette, Fett263, Crucible community, saber vendors, and font makers per `LAUNCH_PLAN.md` humble-tone guidance.
- **FlashPanel disclaimer rebuild.** EXPERIMENTAL badge in the panel header. Inline FLASH_GUIDE.md pointer in the description. Disclaimer state refactored from a single boolean to a 3-key object (`responsibility / backup / recovery`) — all three checkboxes must be checked before Proceed unblocks. Vendor-customized board warning section inside the disclaimer. The mandatory-backup checkbox aligns the in-browser path with the FLASH_GUIDE's safety net.

### Architectural decision: strengthened-disclaimer over feature-flag-off

The session doc offered two options for the WebUSB FlashPanel: (a) hide it behind `const SHOW_WEBUSB_FLASH = false`, or (b) ship with a strengthened disclaimer. **Picked (b).**

- The mandatory-backup checkbox is a **stronger gate** than hiding the panel — anyone proceeding has acknowledged they have a backup, so worst case is a 30-second recovery.
- Hiding the panel discards a feature that took weeks to build and works fine on stock boards.
- Honest "this is experimental, here's the reliable path" beats either "broken but hidden" or "broken but no warning."
- The 3-key disclaimer state (`responsibility / backup / recovery`) is the choke-point for any future tightening — adding a 4th ack key is one line in the type + one checkbox in the JSX.

### Test deltas

| Package | Pre-session | Post-session | Δ |
|---|---:|---:|---:|
| All | unchanged | unchanged | 0 |

No new tests added. The disclaimer state refactor (single boolean → 3-key object) didn't break any existing tests because nothing in `apps/web/tests/` currently asserts against `DisclaimerCard`. **Manual smoke test still pending** — open editor → OUTPUT → FLASH and verify the EXPERIMENTAL badge + 3-checkbox gate UI flows correctly. Workspace typecheck clean across all 10 packages.

### What's next (launch-day decision tree)

Per `docs/SESSION_2026-04-30_LAUNCH_DAY.md`'s end-of-day tree:

| Outcome | Action |
|---|---|
| All P0 done + smoke test green + recovery state OK | ✅ **Launch tomorrow Friday May 1.** Cut `v0.16.0` tag, post launch announcement per `LAUNCH_ASSETS.md`. |
| 89sabers email arrives with factory firmware | Attempt saber recovery → validate one full design → compile → flash → ignite cycle on real hardware → much higher launch confidence |
| ST-Link V2 arrives | Set aside for post-launch — don't disassemble saber today under launch pressure |
| Significant work remains | ❌ **Slip 1–2 days, ship Saturday or Sunday.** May 4 runway still gives 5–6 days for amplification |

### Things to NOT do today

- ❌ Don't touch Option Bytes again unless ST-Link is connected with STM32CubeProgrammer ready as recovery
- ❌ Don't keep flashing custom configs to the test saber hoping they'll boot
- ❌ Don't rebuild WebUSB FlashPanel today — it's broken in a way we don't fully understand
- ❌ Don't disassemble the saber under launch pressure to access SWD pads

---

## Current State (2026-04-30 night, T2.10 golden-hash harness + full verification)

Session-end addendum to the overnight refinement wave below. After the 5 overnight refinement PRs (#139–#143) merged, ran a full integration verification sweep on main and dispatched one more agent for T2.10 (renderer-level golden-hash harness). **3 more PRs landed: #144, #147, plus Ken's parallel #149.** Session total: **17 PRs**.

### Final PRs

| PR | Status | Title | Notes |
|---|---|---|---|
| #144 | ✅ merged | docs(claude): 2026-04-30 evening session wrap | Session archive doc — pinned the overnight-wave findings before the next batch landed |
| #147 | ✅ merged | test(renderer): renderer-level golden-hash harness for blade pipelines | T2.10 — unblocks Item K (lib/blade/* extraction) |
| #149 | ✅ merged (Ken) | docs(claude-md): launch posture v2 | Ken's parallel work — locked v1.0 launch posture, FLASH_GUIDE current-state |

### Integration verification (after 14-PR landing)

Before tag-cut prep, ran a full workspace integration sweep on main. **Confirmed clean integration of all 14 merged PRs:**

- **Typecheck**: 10/10 packages clean
- **Tests**: 4899 passing (web 1875 / engine 796 / codegen 1859 / boards 260 / sound 62 / presets 47)
- **Production build**: success — `/editor` route 260 kB / 860 kB First Load JS, all routes static-prerendered

No integration drift between Wave 1 critical bugs + Ken's audio merges + overnight refinement. The 14 PRs that landed in succession all play well together — typecheck-clean across the merge sequence and full test green.

### T2.10 — renderer-level golden-hash harness (PR #147)

Pure test infrastructure. Pixel-output regression sentinel for the workbench blade renderer, complementary to the engine-level golden-hash from PR #112.

**What ships:**
- `apps/web/tests/rendererGoldenHash/setup.ts` — `installCanvasGlobals()` + `createTestCanvas()` bridging the renderer pipeline onto node-canvas via an `OffscreenCanvas` polyfill
- `apps/web/tests/rendererGoldenHash/hash.ts` — `hashCanvas` (FNV-1a, full-fidelity) + `hashCanvasCoarse` (4×4 tile + 16-level luma quantization, escape hatch for AA-sensitive surfaces)
- `apps/web/tests/rendererGoldenHash/bladeRenderer.test.ts` — 9 cases hashing `drawWorkbenchBlade` output: Obi-Wan blue × 4 states (off/igniting-50/on/retracting-50) + 3 cross-color ON variants + Darksaber + FNV drift sentinel
- `apps/web/tests/rendererGoldenHash/__snapshots__/bladeRenderer.test.ts.snap` — recorded hashes
- `canvas@^3.0.0` as devDependency (v2.x has no Node 24 prebuilt binary)

**Scope reduction from original spec:** PR originally included 8 card-snapshot tests covering the layout × theme matrix. Those failed cross-platform CI even with coarse hashing because **Cairo's text/font rasterization diverges substantially between macOS (Core Text glyphs) and Linux CI (FreeType + Pango)**. Coarse hashing at 4×4 tiles + 16-level luma quantize was still too granular to mask the drift. Dropped from PR #147; tracked as future work using a different approach (visual-diff with tolerance, or platform-specific golden files via separate macOS/Linux test runs).

**What this unblocks:** Item K (lib/blade/* module extraction from BladeCanvas.tsx, ~3000 LOC) is now safe to attempt — both engine-level and renderer-level golden-hash sentinels would catch any drift.

### Architectural decisions worth carrying forward (T2.10-specific)

6. **Cross-platform pixel-hash tests need pixel-aligned math.** Blade renderer hashes work cross-platform because the output is capsule rasterizer + bloom mip-chain — pixel-aligned arithmetic with no font hinting. Card-snapshot hashes failed because they include drawMetadata text, which Cairo rasterizes differently per OS. Future renderer tests: keep hash sentinels OFF text-heavy or font-dependent surfaces; reserve those for visual-diff tooling (Playwright screenshot compare, Argos, etc.) which has tolerance baked in.

7. **`canvas@^3.0.0` over `canvas@^2.x` for Node 24+.** v2.11.2's prebuilt binaries don't include Node 24 ABI; v3 ships universal prebuilds. The agent caught this during dep install and pivoted before pushing.

8. **OffscreenCanvas polyfill must return a real node-canvas Canvas, not a wrapper.** `drawImage`'s prototype-chain check fails on wrapper classes with "Image or Canvas expected." Used a function-style constructor that returns `createCanvas(w, h)` directly.

### Recommended next steps (refreshed)

1. **Ken browser walkthrough** of all 17 PRs — especially the user-visible ones (retraction, save preset, add to queue, audio-waveform layer toggle, ⌘K palette, light-theme card export, header standardization).
2. **Cut v0.15.1 patch tag** once browser-verified — pre-launch stabilization release.
3. **Sub-1024 layout pass** (Ken's #2) — deferred; needs Ken's eyes for breakpoint judgment. Not delegable cleanly.
4. **Item B Safari BladeCanvas bloom** — Ken's hands-on, can't delegate.
5. **Item K — lib/blade/* extraction** — now unblocked by PR #147. Future session.
6. **Card-snapshot regression coverage** — different approach (visual-diff or platform-specific golden files). Tracked as backlog.
7. **Launch comms prep** — per `docs/LAUNCH_PLAN.md`.

---

## Current State (2026-04-30 evening, overnight refinement wave)

Session focus: continue from 2026-04-30 morning session. Merged Ken's 6 in-flight audio PRs after rebase, dispatched Wave 1 (4 critical-bug agents in parallel), then dispatched a 5-agent overnight refinement wave while Ken slept. **14 PRs landed this session.**

### PRs merged this session

| PR | Status | Title | Source |
|---|---|---|---|
| #126 | ✅ merged | docs(session-archive): 2026-04-29 late session wrap | Claude (rebase) |
| #118 | ✅ merged | fix(audio): tell Brave users about FSA flag | Ken |
| #122 | ✅ merged | feat(sound): recognize 12 modern Proffie sound categories | Ken |
| #124 | ✅ merged | fix(audio): lift mute state to shared Zustand store | Ken |
| #127 | ✅ merged | fix(audio): swap ignition/retraction sound dispatch | Ken (rebase) |
| #128 | ✅ merged | fix(audio): broadcast SmoothSwing speed + hot-swap hum | Ken (rebase) |
| #130 | ✅ merged | fix(audio): suspend AudioContext on global pause | Agent 1C |
| #131 | ✅ merged | fix(header): standardize buttons | Agent 1D |
| #132 | ✅ merged | fix(engine): correct retraction animation progress | Agent 1A |
| #133 | ✅ merged | fix(blade): alignment drift, pointed tip, emitter glow | Agent 1B |
| #139 | ✅ merged | docs(user-guide): twist ignition + twist modulator behavior | Agent O2 |
| #140 | ✅ merged | feat(analysis): audio-waveform layer in AnalysisRail | Agent O1 |
| #141 | ✅ merged | feat(palette): 17 missing commands across NAVIGATE/EDIT/TOGGLE | Agent O5 |
| #142 | ✅ merged | docs(backlog): ground-truth audit 2026-04-30 | Agent O3 |
| #143 | ✅ merged | fix(card): theme-gate blade composite for LIGHT_THEME | Agent O4 |

(Previous 2026-04-30 morning session also landed PRs #134, #135, #136, #137 — save-state v1, randomizer extension, add-to-queue, wizard audit. See entry below.)

### Overnight refinement wave (5 parallel agents)

After Wave 1 critical bugs cleared, Ken approved an overnight 5-agent dispatch. Each agent ran in an isolated worktree, opened its own PR, all CI-green by morning.

- **PR #140 (Audio waveform rail, Ken's #12)** — new `audioAnalyserStore` (first-publisher-wins), `useAudioAnalyser` hook, `AnalyserNode` inserted between `masterGain` and `ctx.destination` as a transparent tap. New `audio-waveform` layer in `visualizationTypes.ts` (default off, opt-in). `VisualizationStack` paints the time-domain waveform along the blade Point A → Point B with reduced-motion fallback (static baseline). Tap is intentionally AFTER `masterGain` so muting silences both audio AND the waveform readout (correct UX). +26 web tests.
- **PR #139 (Twist ignition docs)** — investigation finding: `TwistIgnition` consumes ONLY `twistAngle`, not `bladeAngle`. Twist does NOT trigger or speed up ignition — time-based `progress` still owns the wipe duration via `ignitionMs`. Twist only shapes visuals (spiral wobble phase). Pre-existing class JSDoc claimed "spiral direction" implying CW/CCW; corrected to "phase along the blade." New `docs/user-guide/ignitions.md` (63 lines, all 18 ignition styles + deeper "About `twist`" section), expanded `modulators.md` twist row, README link.
- **PR #142 (Backlog audit)** — 18 backlog entries audited against `git log --grep` + `git grep` ground truth. **5 stale-bits cleared**: Saber GIF Sprint 2 was actually shipped via PR #80 (the 2026-04-29 stuck agent was re-dispatching to already-done work); Aurebesh font variants shipped via PR #93; BladeCanvas3DWrapper deletion shipped via PR #75; Safari MiniSaber halo banding fixed via PR #92; UX item #16 (Figma color model) explicitly dropped on Hardware Fidelity Principle grounds. POST_LAUNCH_BACKLOG.md gained `Last audited: 2026-04-30` header note. `NEXT_SESSION_HANDOFF.md` fully rewritten.
- **PR #141 (CommandPalette audit)** — 17 new commands added across **NAVIGATE +9** (every `SectionId` now reachable from ⌘K: my-saber, hardware, ignition-retraction, combat-effects, layer-compositor, routing, motion-simulation, gesture-controls, my-crystal), **EDIT +3** (Save Preset, Add to Queue, Surprise Me — all wrapping existing helpers so palette + buttons share one path), **TOGGLE +3** (Pause, Reduce Bloom, Reduce Motion with dynamic title text). +18 tests; existing 28 still green. No stale commands found.
- **PR #143 (Light-theme blade bloom)** — replaced ad-hoc `lightBackdrop` boolean (a shipped-but-leaky 2026-04-22 fix) with a proper `bladeComposite: GlobalCompositeOperation` field on `CardTheme`. Each theme declares its own preference; `drawBlade` reads it as a token like every other theme value. LIGHT_THEME = `'source-over'` (paper background); 4 dark themes = `'lighter'` (additive glow). +9 drift-sentinel tests.

### Architectural decisions worth carrying forward

1. **First-publisher-wins on shared engine taps.** The `audioAnalyserStore` from PR #140 demonstrates the pattern: when multiple `useAudioEngine` instances mount (header / preview buttons / SmoothSwing / mobile), the first instance to publish its `AnalyserNode` wins; cleanup only fires when that instance unmounts. Sibling instances don't churn the tap. Same pattern applies to other "shared engine resource" cases: AudioContext itself (Item G in NEXT_SESSION_HANDOFF — Chrome's ~6 AudioContext per-origin cap is now hit), GPU readback for golden-hash, etc.

2. **AnalyserNode tap placement matters for UX.** Putting the analyser AFTER `masterGain` in the audio graph means muting silences both audio output AND the waveform readout (correct: user expects mute = silence everywhere). Putting it BEFORE would render a live waveform while the user thinks they've muted. Documented inline in `useAudioEngine.ts` so the next person tweaking the audio graph doesn't accidentally swap order.

3. **Theme tokens beat string-comparison branching.** PR #143's audit-and-tighten pattern: replace `if (theme.id === 'light')` checks with a typed `bladeComposite` field on `CardTheme`. Each theme owns its idiom; `drawBlade` is theme-id-blind. The pattern scales — when a 6th theme arrives, no `drawBlade` change needed. Same shape used by `--text-muted` token migration earlier in the project.

4. **Backlog audits are high-leverage when evidence-shape.** PR #142's protocol: for every "open" item, run `git log --grep="<keyword>"` + `git grep -l "<symbol>"` BEFORE drawing a verdict; cite specific commits + file paths. Found 5 false-open entries in 18 audited. Future agents avoid re-doing shipped work. Run quarterly minimum.

5. **Pre-existing JSDoc can lie about behavior.** Twist ignition's class doc claimed "spiral direction" (implying CW/CCW rotation) but the code shifted spiral *phase* along the blade. Investigation found via reading the actual `getMask()` math, not trusting the docstring. Future docs PRs should sanity-check the doc against the code before quoting.

### Wave 1 critical-bug findings (from morning session, kept here for completeness)

- **PR #132 (Retraction bug, Ken's #18 top priority)** — `FadeoutRetraction` + `ImplodeRetraction` had inverted progress handling (used `(1 - progress)` when the engine already sends progress 1→0 during retraction, causing a double-inversion that made retractions look like ignitions). +43 retraction tests covering 9 retraction types.
- **PR #133 (BladeCanvas alignment + tip + emitter glow)** — alignment drift fixed by replacing inline piecewise ternary with shared `inferBladeInches()`; tip pointed-ness fixed by removing `tipExtension = radius * 0.15` in BladeCanvas + headless renderer; emitter glow when off gated on `extendProgress > 0.05`. +379 alignment test cases.
- **PR #130 (Pause pauses audio)** — `useAudioEngine` watches `isPaused` from uiStore → `ctx.suspend()`/`ctx.resume()`. Independent of mute state.
- **PR #131 (Header standardization)** — extracted `<HeaderButton>` primitive, normalized 5 buttons + ShareButton + FPSCounter + UndoRedo to h-7/rounded-interactive/focus-visible ring.

### Test deltas

| Package | Pre-session | Post-session | Δ |
|---|---:|---:|---:|
| web | 1822 | ~1900 | +78 (audio-waveform 26, palette audit 18, card-theme 9, retraction 43→engine, alignment 379, header 10, others) |
| engine | 753 | 796 | +43 (retraction-progress) |
| sound | 43 | 62 | +19 (Ken's PR #122) |
| codegen / boards / presets | unchanged | unchanged | 0 |
| **Total** | **~4289** | **~4900+** | **+600+** |

Workspace typecheck clean across all 10 packages.

### Stuck-agent triage

Both stuck agents from the 2026-04-29 late session (marketing site + saber GIF Sprint 2) confirmed clean writeoff:
- Marketing agent — never pushed branch, zero commits, zero uncommitted changes. Worktree removed.
- Saber GIF agent — same. Backlog audit (PR #142) discovered Sprint 2 was actually already shipped via PR #80, so the stuck agent was redoing already-done work.

### Recommended next steps

1. **Ken morning walkthrough**: verify all 14 merged PRs in live preview (especially retraction, save-preset, add-to-queue, audio-waveform, command palette, light-theme card export).
2. **Cut v0.15.1 patch tag**: once browser-verified, this is the pre-launch stabilization release.
3. **Sub-1024 layout pass** (Ken's #2): deferred from this session — needs Ken's eyes for breakpoint judgment. Not delegable cleanly.
4. **Item B Safari BladeCanvas bloom**: Ken's hands-on, can't delegate.
5. **Launch comms prep**: per `docs/LAUNCH_PLAN.md`.

---

## Current State (2026-04-30 morning, critical bugs + v1 launch features)

Session focus: merge Ken's 6 audio-engine PRs from his parallel session, fix critical bugs from Ken's field testing, ship v1 launch features. **14 PRs merged this session** (6 from Ken's audio session + 8 from this session's agent dispatch).

### PRs merged this session

| PR | Status | Title | Source |
|---|---|---|---|
| #118 | ✅ merged | fix(audio): tell Brave users about FSA flag | Ken |
| #122 | ✅ merged | feat(sound): recognize 12 modern Proffie sound categories | Ken |
| #124 | ✅ merged | fix(audio): lift mute state to shared Zustand store | Ken |
| #126 | ✅ merged | docs(session-archive): 2026-04-29 late session wrap | Claude |
| #127 | ✅ merged | fix(audio): swap ignition/retraction sound dispatch | Ken (rebase) |
| #128 | ✅ merged | fix(audio): broadcast SmoothSwing speed + hot-swap hum | Ken (rebase) |
| #130 | ✅ merged | fix(audio): suspend AudioContext on global pause | Agent 1C |
| #131 | ✅ merged | fix(header): standardize buttons to consistent height/radius/focus | Agent 1D |
| #132 | ✅ merged | fix(engine): correct retraction animation progress | Agent 1A |
| #133 | ✅ merged | fix(blade): alignment drift, pointed tip, emitter glow | Agent 1B |
| #134 | ✅ merged | feat(presets): v1 save state — save, load, delete user presets | Agent 4A |
| #135 | ✅ merged | feat(randomizer): full catalog + modulation coverage | Agent 3C |
| #136 | ✅ merged | feat(queue): one-click Add to Queue action bar button | Agent 4B |
| #137 | ✅ merged | fix(wizard): audit polish — stale defaults, a11y, tests | Agent 3B |

### Critical bugs fixed (Ken's field notes)

| Ken's # | Issue | Fix | PR |
|---|---|---|---|
| #18 | Retraction appears as ignition in blade preview | FadeoutRetraction + ImplodeRetraction had inverted progress (double-inversion with engine's 1→0 convention) | #132 |
| #8 | Pixel strip / analysis rail width doesn't match blade | BladeCanvas used stale piecewise ternary for blade inches; switched to `inferBladeInches()` from shared `bladeLengths.ts` | #133 |
| #3 | Tip too pointed on blade + saber cards | Removed `tipExtension = radius * 0.15` in BladeCanvas + headless renderer | #133 |
| #13 | Emitter glow when blade is OFF | Gated bore glow on `extendProgress > 0.05` | #133 |
| #11 | Pause animation doesn't pause audio | `useAudioEngine` now watches `isPaused` from uiStore → `ctx.suspend()`/`ctx.resume()` | #130 |
| #6 | Header buttons inconsistent | Extracted `<HeaderButton>` primitive; normalized 5 buttons + ShareButton + FPSCounter + UndoRedo to h-7/rounded-interactive/focus-visible ring | #131 |
| #10 | Audit launch wizard | Fixed stale 132→144 LED default, stale "3 steps" tooltip, added `aria-pressed`/`aria-label` on color + vibe buttons, +7 tests | #137 |
| #9 | Surprise-me doesn't use new features | Randomizer now picks from full 18-ignition + 12-retraction catalogs, generates 1-2 modulation bindings, adds clashDecay, theme-aware HSL colors | #135 |

### v1 launch features shipped

- **Save-state v1** (#134): `⭐ Save` button in action bar + "My Presets" section in gallery sidebar with click-to-load, delete, color swatches, persistence via `userPresetStore` + IndexedDB
- **Add-to-queue v1** (#136): `📌 Queue` button in action bar; one-click adds current config to active saber profile's card queue with auto-generated name + toast feedback
- **Audio engine improvements** (Ken's PRs #118, #122, #124, #127, #128): shared mute store, SmoothSwing speed broadcasting, hum hot-swap on font change, ProffieOS in/out convention fix, modern sound category recognition, Brave FSA flag warning

### Stuck agent triage

Both agents from the 2026-04-29 late session (marketing + saber GIF Sprint 2) wrote zero commits. Clean writeoff — worktrees removed, branches deleted. Marketing is deprioritized per Ken. Saber GIF Sprint 2 is revisitable post-launch.

### Test deltas

| Package | Pre-session | Post-session | Δ |
|---|---:|---:|---:|
| web | 1327 | 1822 | +495 |
| engine | 753 | 796 | +43 |
| sound | 43 | 62 | +19 |
| codegen | 1859 | 1859 | 0 |
| boards | 260 | 260 | 0 |
| presets | 47 | 47 | 0 |
| **Total** | **4289** | **4846** | **+557** |

Workspace typecheck clean across all 10 packages.

### Ken's field notes — status delta

| Ken's # | Topic | Status |
|---|---|---|
| #1 | Zoom controls | ✅ already removed v0.14.0 (stale note) |
| #2 | Sub-1024 layout | ⏳ deferred (Ken confirmed ≥1024 + 375px for v1) |
| #3 | Tip too pointed | ✅ fixed (#133) |
| #4 | Kyber Code sharing | ✅ already shipped — confirmed as launch scope |
| #5 | Blade length audit | ✅ already shipped via PR #99 (stale note) |
| #6 | Header standardization | ✅ fixed (#131) |
| #7 | Node-based editor | ⏳ post-launch per Ken |
| #8 | Alignment drift | ✅ fixed (#133) |
| #9 | Surprise-me extension | ✅ fixed (#135) |
| #10 | Wizard audit | ✅ fixed (#137) |
| #11 | Pause pauses audio | ✅ fixed (#130) |
| #12 | Audio waveform rail | ⏳ deferred (larger scope, post-launch) |
| #13 | Emitter glow when off | ✅ fixed (#133) |
| #14 | Twist ignition docs | ⏳ small docs task, not blocking |
| #15 | Save state | ✅ v1 shipped (#134) |
| #16 | Quick save to queue | ✅ v1 shipped (#136) |
| #17 | Surprise-me sound font | ⏳ post-launch per Ken |
| #18 | Retraction bug | ✅ fixed (#132) |

**12 of 18 resolved, 6 deferred** (2 post-launch per Ken, 2 larger scope, 1 sub-1024 layout, 1 small docs).

### Recommended next steps

1. **Browser verification**: start dev server, verify retraction + save/queue + surprise-me + pause-audio in live preview
2. **Sub-1024 layout pass** (Ken's #2): dispatch agent for breakpoint cleanup (≥1024 + 375px confirmed)
3. **Audio waveform rail** (Ken's #12): AnalyserNode + VisualizationStack layer
4. **v0.15.1 tag cut**: once browser-verified, cut tag as the pre-launch stabilization release
5. **Launch comms prep**: per `docs/LAUNCH_PLAN.md`

---

## Current State (2026-04-29 late, big Hardware Fidelity + Phase 4 wrap)

Marathon session. **15 PRs landed by Claude + 3 from Ken's parallel session — 18 total today**. Main outcomes:

1. **Hardware Fidelity Principle gap closed.** PR #116 tightened `BlendMode` from a 5-mode union (`normal | add | multiply | screen | overlay`) to single literal `'normal'`. The codegen never emitted the 4 non-normal modes — they were visualizer-only fakes that misrepresented what users would see on real hardware. UI surfaces (LayerRow dropdown, ParameterBank select) removed; `BladeConfig.blendMode` dead field retired; `migrateBlendMode` helper coerces legacy state + glyph round-trip to `'normal'`; new audit-history section in `docs/HARDWARE_FIDELITY_PRINCIPLE.md` documents the tighten + sets the principle for future blend-mode additions.

2. **Phase 4 Sidebar A/B v2 — 6/6 sections complete.** PR #121 shipped the final section (`output`, vertical-stepper Column A + active-step body in Column B) with full extraction of `ConfigSummary` from `OutputPanel.tsx` so legacy fallback + A/B path share one source of truth.

3. **T1.2 MGP thumbnail crispness — both halves shipped.** PR #117 (infra) added optional `compactThumbnail` field on registry entries + threaded through MiniGalleryItem to QuickTransitionPicker. PR #125 authored 26 compact 24×24 SVGs + a `CompactSvg` wrapper.

4. **T1.3 modulation sampler progress fields — closed long-standing v1.1 TODO.** PR #123 added `preonProgress` / `ignitionProgress` / `retractionProgress` to `StyleContext` + `BladeEngine.computeStateProgress()` derives them from current state + sampler reads them directly. Modulation routing v1.1 sampler TODOs are now closed (clashDecay shipped 2026-04-28 via PR #114).

5. **Item D + Item E — both user-visible WIP markers closed.** Strip Configuration drives blade thickness (PR #108); Triple + Inquisitor topologies render their own silhouettes (PR #109). Plus 4 small cleanups (THEME_CAP removal #110, useClickToRoute stale TODOs #113, blade-effect chip overlap fix #119, golden-hash blade-engine tests #112).

| PR | Status | Title |
|---|---|---|
| #107 | ✅ merged | feat(sidebar-ab): Phase 4f gallery A/B prototype |
| #108 | ✅ merged | feat(blade-render): Item D — strip count drives blade thickness |
| #109 | ✅ merged | feat(blade-render): Item E — Triple + Inquisitor topology visuals |
| #110 | ✅ merged | chore(palette): remove THEME_CAP — surface all 30 themes |
| #111 | ✅ merged | docs(backlog): mark stale entries shipped + add 2026-04-29 recap |
| #112 | ✅ merged | test(engine): golden-hash regression tests (33 cases) |
| #113 | ✅ merged | chore(modulation): remove stale useClickToRoute TODO markers |
| #114 | ✅ merged | feat(modulation): wire BladeConfig.clashDecay through sampleModulators |
| #115 | ✅ merged | **(Ken)** fix(sound): scan/load directory handle iterator yields tuples |
| #116 | ✅ merged | feat(blend): tighten BlendMode to 'normal' (T2.2 Hardware Fidelity) |
| #117 | ✅ merged | feat(mgp): compactThumbnail infrastructure for crisp picker triggers |
| #118 | ✅ merged | **(Ken)** fix(audio): tell Brave users about the FSA flag |
| #119 | ✅ merged | fix(workbench): action-bar effect chips icon-only below 1280px |
| #121 | ✅ merged | feat(sidebar-ab): Phase 4f — output multi-step pipeline (6/6 done) |
| #122 | ✅ merged | **(Ken)** feat(sound): recognize 12 modern Proffie sound categories |
| #123 | ✅ merged | feat(modulation): wire preon/ignition/retraction progress to sampler |
| #125 | ✅ merged | feat(mgp): 26 compact 24x24 thumbnails for crisp picker triggers |
| ~~#120~~ | closed (auto) | superseded by #125 — base branch was deleted on #117 merge |

**Test deltas across the day:**

| Package | Pre-session | Post-session | Δ |
|---|---:|---:|---:|
| web | 1262 | 1327 | +65 (gallery A/B 21, strip thickness 12, output A/B 20, golden-hash 33 split, MGP infra 0…) |
| engine | 740 | 753 | +13 (clashDecay 4, migrateBlendMode 5, sampler progress 4) |
| sound | 40 | 43 | +3 (Ken's PR #122) |
| codegen / boards / presets | unchanged | unchanged | 0 |

Workspace typecheck clean across all 10 packages throughout.

### Architectural decisions worth carrying forward

1. **Hardware Fidelity Principle as UX-dispute arbiter.** When deciding whether to expand or tighten a feature whose codegen-emission gap was unclear (Item J Figma color model), Ken's instinct correctly invoked the principle: "if ProffieOS can't emit it, it shouldn't ship." The audit-and-tighten path (PR #116) closed an existing violation rather than expanding it. Going forward, ANY new layer/blend/compositor mode MUST have a verified ProffieOS template emission path before it surfaces in the UI. Documented in `docs/HARDWARE_FIDELITY_PRINCIPLE.md` audit history.

2. **`migrateBlendMode` choke-point pattern.** When tightening a value union, expose a `migrateXxx(value: unknown): NewType` helper that always coerces to the safe default. Every persisted-state read + every network-payload decode funnels through it. Single grep-able choke-point + drift-sentinel test. The pattern works for any one-way migration where the old shape needs to be silently handled but the new shape is the only thing emitted forward.

3. **Engine-level vs renderer-level golden-hash tests are different layers.** Engine golden-hash (PR #112) hashes `BladeEngine.captureStateFrame` LED buffers — protects engine state machine, style algos, topology routing. Doesn't catch renderer drift (bloom, tonemap, canvas pipeline). Renderer-level golden-hash needs node-canvas + is the explicit prerequisite for Item K (`lib/blade/*` module extraction). Don't conflate them; ship them as separate PRs.

4. **Auto-closed PRs from base-branch deletion is a real workflow trap.** When merging a PR with `--delete-branch`, any open PRs targeting that branch auto-close. If a parallel agent's PR was based on the just-merged branch, it ends up CLOSED + DIRTY/CONFLICTING (can't reopen via API once base is gone). Workflow: `git checkout <agent-branch>` + `git rebase main` + `git push --force-with-lease` + `gh pr create` (new PR number). Happened today: PR #120 → #125 reborn after rebase.

5. **Backlog stale-bit drains agent time.** Multiple agents this week independently rediscovered that "open" backlog items had already shipped (CardTheme tokens, useSharedConfig URL test, Light-theme bloom, Hilt Stage 2, WebUSB store consumers). PR #111 refreshed the backlog index 2026-04-29 morning. Going forward: `docs/POST_LAUNCH_BACKLOG.md` is the single source of truth + `git log --grep` is the authoritative ground-truth check before starting any "open" item.

### Ken's pre-launch shortlist — Tier 1 + Tier 2 status delta

Per Ken's 2026-04-29 morning prioritization:

| Item | Pre-session | Post-session |
|---|---|---|
| T1.1 Custom color popover | open | ✅ explicitly dropped (existing pattern is sound) |
| T1.2 MGP thumbnail crispness | open | ✅ infra (#117) + 26 SVGs (#125) |
| T1.3 Modulation sampler progress | open | ✅ shipped (#123) |
| T2.1 Wave 8 button routing | open | ⏳ deferred (sparse spec, large scope) |
| T2.2 Item J Figma color model | open | ✅ pivoted to "audit-and-tighten" + shipped (#116) |
| T2.3 Item K module extraction | open | ⏳ deferred (renderer-level golden-hash prereq) |
| T2.4 Item H mobile + sub-1024px | open | 🟡 blade overlap shipped (#119); full mobile migration needs UX call |
| T2.5 Item B Safari | open | ⏳ deferred (Ken's hands-on) |
| T2.6 Saber GIF Sprint 2 | open | 🟡 agent stuck ~2.5h; recovery needed |
| T2.7 Marketing site | open | 🟡 agent stuck ~2.5h; Ken explicitly deprioritized |
| T2.8 Phase 4 output A/B | open | ✅ shipped (#121) |
| T2.9 Card snapshot golden-hash | open | ⏳ deferred (canvas dep) |
| T2.10 Renderer-level golden-hash | open | ⏳ deferred (canvas dep) |
| T2.11 Cross-OS hardware sweep | open | ⏳ community |

**8 of 14 ✅ closed, 1 🟡 partial, 5 ⏳ deferred.** Of the deferred items, 2 are environmental (Safari hands-on, cross-OS hardware), 2 are gated on canvas dep + renderer golden-hash, 1 is large architectural (Wave 8). Item H (mobile shell) needs Ken's drawer-vs-bottom-sheet UX call to unblock.

### Stuck agents — handoff for next session

Two background agents from this session ran ~2.5h without pushing their branches:

| Agent | Branch (intended) | Worktree | Status |
|---|---|---|---|
| `agent-a077c8445fc8384d1` | `feat/marketing-site-v0.15.x` | `.claude/worktrees/agent-a077c8445fc8384d1/` | locked, no push |
| `agent-af446b7e1bb77edd2` | `feat/saber-gif-sprint-2` | `.claude/worktrees/agent-af446b7e1bb77edd2/` | locked, no push |

`docs/NEXT_SESSION_HANDOFF.md` covers the recovery options. Marketing is explicitly low-priority per Ken; Saber GIF Sprint 2 has the workbench renderer locked-in dependency satisfied so it should be reviveable.

### Test count summary

- **web**: 1327 tests across 74 suites
- **engine**: 753 tests across 16 suites
- **codegen**: 1859 tests
- **boards**: 260 tests
- **presets**: 47 tests
- **sound**: 43 tests (Ken's PR #122 +3)
- **Total workspace**: ~3300 tests passing across 10 packages, all green, all typecheck-clean

### Cleanup status

3 of today's agent worktrees were reaped post-merge. 5 older `agent-*` worktrees from prior sessions still locked under `.claude/worktrees/` — not touched per cross-session coordination rules. The 2 stuck agents above are still locked.

### Still open from `docs/NEXT_SESSION_HANDOFF.md` (refreshed 2026-04-29 late)

| Item | Status |
|---|---|
| **A.** Stuck-agent recovery (Marketing + Saber GIF) | next session priority |
| **B.** T2.10 + T2.9 renderer-level + card-snapshot golden-hash | needs canvas dep |
| **C.** Item K — `lib/blade/*` module extraction | after T2.10 |
| **D.** Wave 8 button routing sub-tab | needs design pass |
| **E.** Item H mobile shell migration | needs UX call (drawer vs bottom-sheet) |
| **F.** Item B Safari BladeCanvas bloom | needs Ken's hands-on |
| **G.** Sub-1024px responsive (beyond #119) | post-launch |

### Recommended near-term path

1. Next session: recover or write off the 2 stuck agents
2. Add `canvas` dep + build T2.10 renderer-level golden-hash harness
3. Item K module extraction (now safe with renderer-level coverage)
4. Cut **v0.15.1** patch tag — clean release between architectural sprints
5. Then: Wave 8 button routing (its own focused multi-day session)
6. Then: Item H mobile shell migration (Ken's UX call)

---

## Current State (2026-04-28 PM, full-day session wrap)

Long-session day. **8 PRs landed across two parallel-agent waves + one focused solo PR**, plus 1 PR closed as superseded:

| PR | Status | Scope |
|---|---|---|
| **#98** | ✅ merged | Sidebar A/B Phase 4a — combat-effects (~1480 LOC, 17 tests) |
| **#99** | ✅ merged | BLADE_LENGTHS source-of-truth lift; engine canonical flipped to **36"=144 LEDs** community standard; supersedes #96 |
| **#100** | ✅ merged | Sidebar A/B Phase 4c — my-saber (mounts existing SaberProfileManager whole; +11 tests) |
| **#101** | ✅ merged | Sidebar A/B Phase 4d — audio (font list + 4 sub-tabs incl. Sequencer; +17 tests) |
| **#102** | ✅ merged | CLAUDE.md archive of morning session + Item G ⛔ BLOCKED note |
| **#103** | ✅ merged | Lane D test backfill — `isGreenHue` / `isBlueHue` (+24 tests). Source-side already shipped 2026-04-27 in `0a1a54e`; agent ground-truth-checked before doing redundant work. Also adds Item G blocker note to `POST_LAUNCH_BACKLOG.md`. |
| **#104** | ✅ merged | WebUSB connection store (Item F) — 6-status enum + FlashPanel publishes via single useEffect, StatusBar + DeliveryRail subscribe (+27 tests) |
| **#105** | ⏳ open / CI in flight | Sidebar A/B Phase 4e — routing (1128 LOC, 16 tests, browser-verified) |
| ~~#96~~ | closed superseded | Original 36"=144 panel-side fix; #99 absorbed it |

**Sidebar A/B Phase 4 status: 4/6 sections done** (combat-effects + my-saber + audio + routing). Gallery (top-level `/gallery` route, different shape) + output (multi-step pipeline, doesn't fit A/B per spec §4.9) remain.

### Architectural decisions worth carrying forward

1. **Test seam pattern for Zustand-store-reading components.** Zustand 4's React binding pins `useSyncExternalStore`'s server snapshot to `getInitialState()` (`node_modules/zustand/react.js`), so `setState(...)` before `renderToStaticMarkup` is invisible to SSR tests. The pattern that works without `vi.mock`: add an optional prop to the component (e.g. `bindings?: SerializedBinding[]`), default to the store read for production, pass explicit data in tests. RoutingColumnA + RoutingColumnB use this. Lower-overhead than full module mocking; production code unchanged.

2. **ExpressionEditor reuse strategy in routing A/B.** Rather than reshape the existing ~300-line absolute-positioned popover for inline mounting, Column B mounts it via the same proven anchor pattern that legacy `BindingList` uses (anchored beneath the source-display row when "Edit Expression" is pressed). UX equivalent to inline; saves a refactor whose blast radius would dwarf the migration.

3. **Re-targeting via Column B Target dropdown is a real UX win** unlocked by the A/B migration. The store's `updateBinding(id, partial)` already accepted `target` / `source` / `combinator` / `amount` / `bypassed` updates — the new UI surface is purely additive. Previously users had to delete + recreate to change a binding's target.

4. **Lane A meta-finding (carried forward from earlier in the day):** the "delete 3 consumer-migration stubs" item was incorrectly listed as shippable in the prior handoff. Empirically verified blocked on Item H (mobile shell migration to Sidebar + MainContent). Sequence: Item H ships → DesignPanel + TabColumnContent retire → BladeHardware/PowerDraw stubs delete → extract `GradientRegion` from `ColorPanel.tsx` (private) into `lib/gradient/` → GradientBuilder stub deletes. Documented inline at the corresponding `POST_LAUNCH_BACKLOG.md` row + this CLAUDE.md's still-open list.

5. **Lane D meta-finding:** small-cleanups bundle agent ground-truth-checked the codebase first and discovered both source-side cleanups (`hiltId` cast removal + `isGreenHue`/`isBlueHue` predicates) had already shipped in `0a1a54e` on 2026-04-27, before today's session started. Agent shipped what was actually missing — test backfill + backlog status updates. Pattern worth keeping: agent prompts that spec the work also explicitly direct the agent to verify-first.

### Test deltas across the day

| Package | Pre-day | Post-day | Δ |
|---|---:|---:|---:|
| web | 1,114 | ~1,257 (+16 from #105 still gated on merge) | +127–143 |
| engine | 740 | 740 | 0 |
| codegen | 1,859 | 1,859 | 0 |

All 10 workspace packages typecheck-clean. Browser-verified each new A/B section live at desktop 1600×1000 throughout.

### Worktree cleanup status

All this session's worktrees removed cleanly via `git worktree remove -f -f` (single `-f` errors on the lock; double overrides). Local feature branches deleted post-merge. 5 older `agent-*` worktrees from prior sessions remain locked under `.claude/worktrees/` — not touched per cross-session coordination rules.

### Still open from the original `docs/NEXT_SESSION_HANDOFF.md`

| Item | Status as of 2026-04-28 PM |
|---|---|
| **A.** Sidebar A/B Phase 4 — extend pattern | ✅ 4 of 6 done (combat-effects + my-saber + audio + routing). Gallery + output remain. |
| **B.** Safari BladeCanvas bloom | ⏳ open — needs hands-on Safari debug, not delegable |
| **C.** `BLADE_LENGTHS` source-of-truth lift | ✅ shipped via #99 |
| **D.** Strip Configuration → wire visual blade thickness | ⏳ open — engine + UI work, ~M scope |
| **E.** Topology multi-segment renderer | ⏳ open — engine work, ~M-L scope, real architectural change |
| **F.** WebUSB global connection store | ✅ shipped via #104 |
| **G.** 3 consumer-migration stub deletions | ⛔ BLOCKED on Item H — empirically verified, see above |
| **H.** Mobile shell migration | ⏳ open — UX call needed (drawer vs bottom-sheet at 375px) |
| **I.** Wave 8 — Button routing sub-tab | ⏳ open — ~6-8h scope, modulation v1.1 follow-on |
| **J.** UX item #16 — Figma color model | ⏳ open — last UX North Star item; needs Kyber Glyph version bump + engine compositor changes |
| **K.** Module extraction `lib/blade/*` | ⏳ open — high-risk; needs golden-hash regression tests in place first |

### Next-session candidates (rough priority)

- **Phase 4 gallery A/B** (top-level `/gallery` route refactor; bigger than a sidebar section but established A/B pattern)
- **Phase 4 output** (needs UX call from Ken on multi-step-pipeline shape)
- **Item D + E engine work** (Strip Config thickness + Topology multi-segment renderer — closes WIP markers users see today)
- **Item J Figma color model** (last UX North Star item — but architectural with glyph version bump)
- **Item I Wave 8 button routing** (modulation v1.1 follow-on)
- **Item B Safari bloom** (hands-on; can't delegate)

Handoff prompt for next session at [`docs/NEXT_SESSION_HANDOFF.md`](docs/NEXT_SESSION_HANDOFF.md) (refreshed 2026-04-28 PM).

---

## Current State (2026-04-28, Sidebar A/B Phase 4 + BLADE_LENGTHS lift)

**Active branch: `main` (tip `86f9a69`).** Last tag still **`v0.15.0`** — today's 5 PRs are post-tag follow-ups, no hardware change. This session bundled 4 lanes of parallel work via the worktree-isolated agent dispatch pattern:

- **PR [#98](https://github.com/kenkoller/KyberStation/pull/98) — Sidebar A/B Phase 4a (combat-effects)** — `apps/web/components/editor/combat-effects/` with `CombatEffectsAB` wrapper + `CombatEffectsColumnA` (22 rows: pinned GENERAL row + 21 effects, glyph thumbnails tinted by category, hold-pill on sustained, kbd shortcut badge, held-state pulse dot from `activeEffectsStore`) + `CombatEffectsColumnB` (per-effect Trigger button using `toggleOrTriggerEffect`, Color/Position/Parameters slots, filtered Recent-triggers log). The GENERAL row absorbs the legacy EffectPanel's globally-scoped concerns: Preon flash, Dual-Mode Ignition, full effect log. `triggerEffect` / `releaseEffect` thread from WorkbenchLayout's `useBladeEngine()` instance through MainContent props down into Column B (deliberately NOT calling `useBladeEngine()` inside Column B — its `useRef` initializer would spawn a second engine + RAF tick). 17 new tests; ~1480 lines.
- **PR [#99](https://github.com/kenkoller/KyberStation/pull/99) — `BLADE_LENGTHS` source-of-truth lift** — supersedes the original PR #96 (closed). Same blade-length table was inlined in **5 places** (`HardwarePanel.tsx`, `BladeHardwarePanel.tsx`, `BladeCanvas.tsx`, `SaberWizard.tsx`, `bladeRenderMetrics.ts`). New `apps/web/lib/bladeLengths.ts` derives `BLADE_LENGTHS` array + `inferBladeInches` reverse mapping from the engine's `BLADE_LENGTH_PRESETS` (now canonical for the web app too). Engine table flipped: **`'36"': 144 LEDs`** with `ledsPerInch: 4.00` (community 1m WS2812B-strip standard) — overrides the strict-math 132 and matches what vendor "Standard 36-inch" blades actually ship with. New 20" preset entry (73 LEDs at 3.65/inch) for shoto / Yoda configs. Pretty captions ("Yoda (20\")", "Long (36\")") preserved per-consumer via small `Record<number, string>` decorators over the canonical shape. New `bladeLengths.test.ts` drift sentinel (15 cases); existing `bladeRenderMetrics.test.ts` + `saberWizardOptions.test.ts` updated to reflect bucket boundaries (the 36" bucket extends through 144; 40" bucket starts at 145 since 147 is the 40" canonical). +276 LOC, 9 files.
- **PR [#100](https://github.com/kenkoller/KyberStation/pull/100) — Sidebar A/B Phase 4c (my-saber)** — `apps/web/components/editor/my-saber/` with `MySaberAB` + `MySaberColumnA` (saved-profile list with mini blade swatches, "+ New Profile" button, active row from `saberProfileStore.activeProfileId`) + `MySaberColumnB` (mounts the existing `<SaberProfileManager />` whole, keeping all character-sheet logic intact). Static SVG swatches in Column A rather than mounting per-row `<MiniSaber>` engine ticks (cheap to render dozens). 11 new tests; +712 lines, 6 files. Known cosmetic redundancy: `ProfileTabStrip` inside `SaberProfileManager` + Column A list both surface profile selection — flagged for follow-up cleanup, harmless.
- **PR [#101](https://github.com/kenkoller/KyberStation/pull/101) — Sidebar A/B Phase 4d (audio)** — `apps/web/components/editor/audio/` with `AudioAB` (thin pass-through; `audioFontStore.fontName` is both selection and engine state, so threading a separate cursor would create a divergence bug) + `AudioColumnA` (font library list with empty-state pointer to Column B for first-run users) + `AudioColumnB` (4 sub-tabs: Events / EQ / Effects / Effect Presets / Sequencer; folder-picker bootstrap kept here so users without a configured library can land somewhere actionable). 17 new tests; +1688 lines, 7 files.

### Test deltas

| Package | Pre-session | Post-session | Δ |
|---|---:|---:|---:|
| web | 1,114 | ~1,194 | +80 (combat-effects 17 / my-saber 11 / audio 17 / bladeLengths 15 + sundry) |
| engine | 740 | 740 | unchanged |
| codegen | 1,859 | 1,859 | unchanged |
| presets | 47 | 47 | unchanged |
| boards | 260 | 260 | unchanged |
| sound | 40 | 40 | unchanged |

Workspace typecheck clean across all 10 packages. End-to-end browser-verified each new A/B section live at desktop 1600×1000.

### Architectural decisions worth carrying forward

1. **Phase 4 A/B sections own their own `<MainContentABLayout>` mount** when they need transient state (combat-effects' `selectedEffectId`, ignition-retraction's `activeTab`) or when they pass-through props to Column B (combat-effects' triggerEffect/releaseEffect). Phase 2/3 sections that don't (blade-style, color) let `MainContent.tsx` mount the wrapper directly.
2. **Engine handlers thread by props, not by re-acquiring.** `useBladeEngine()` instantiates a fresh `BladeEngine` per call (its `useRef` initializer creates one if `engineRef.current` is null). Calling it again inside any deep editor would spawn a second engine + RAF loop. Phase 4 combat-effects uses the same threading pattern as `CanvasLayout` and `RightRail`: handlers come from `WorkbenchLayout` → `MainContent` props → AB wrapper → Column B.
3. **Zustand SSR snapshot pinning is real.** `node_modules/zustand/react.js`'s `useSyncExternalStore` server snapshot is `selector(api.getInitialState())` — post-init `setState` mutations don't reach `renderToStaticMarkup`. Tests that need non-default store state must seed via the hoisted-mock pattern (see `mySaberAB.test.tsx` header comment); SSR-only tests skip held-state branches and rely on browser walkthrough for those (combat-effects "Release Lockup" assertion was dropped this way).
4. **Engine canonical for `BLADE_LENGTH_PRESETS` follows vendor reality, not strict math.** The 36"=144 community standard wins over 36"=132 strict-math because real "Standard 36-inch" blades ship with the full 1m WS2812B strip at 144 LEDs/m density. Documented inline in `packages/engine/src/types.ts` so the next person doing the math doesn't "fix" it back to 132. The drift bit twice (PR #96 first, this lift second); centralizing through `lib/bladeLengths.ts` plus the `bladeLengths.test.ts` drift sentinel kills the class of bug.
5. **Worktree path discipline + force-unlock works.** All 3 agent worktrees this session committed cleanly into their own paths (no leaked writes into the main repo). Post-merge cleanup needs `git worktree remove -f -f` (single `-f` errors on the lock; double `-f` overrides). Local branches with worktrees can't be deleted until the worktree is gone — same as overnight session pattern.

### Sidebar A/B v2 — Phase 4 status

| Section | Status |
|---|---|
| `blade-style` | ✅ Phase 2 (PR #91) |
| `color` | ✅ Phase 3 (PR #94) |
| `ignition-retraction` | ✅ Phase 3 (PR #94) |
| `combat-effects` | ✅ Phase 4a (PR #98) |
| `my-saber` | ✅ Phase 4c (PR #100) |
| `audio` | ✅ Phase 4d (PR #101) |
| `routing` | ⏳ open — has ExpressionEditor integration, deserves solo session |
| `gallery` (top-level `/gallery` route) | ⏳ open — different shape from sidebar sections; refactor of existing `GalleryPage.tsx` |
| `output` (multi-step pipeline) | ⏳ open — spec §4.9 says it doesn't fit A/B cleanly; needs UX call |

### Cleanup done

- 3 session worktrees removed (`agent-abf01153e…`, `agent-abc311b4f…`, `agent-a84be4a2e…`).
- 4 local branches deleted (`fix/blade-lengths-source-of-truth`, `feat/sidebar-ab-phase-4-{combat-effects,my-saber,audio}`).
- 5 older `agent-*` worktrees from prior sessions still locked under `.claude/worktrees/`. Not from this session — left alone per cross-session coordination rules.

### Still open from `docs/NEXT_SESSION_HANDOFF.md`

- **B.** Safari BladeCanvas bloom (architectural, hands-on Safari debug needed)
- **C.** ✅ shipped today (PR #99)
- **D.** Strip Configuration → wire visual blade thickness
- **E.** Topology multi-segment renderer (Triple / Inquisitor)
- **F.** WebUSB global connection store (StatusBar / DeliveryRail "IDLE" placeholders)
- **G.** ⛔ BLOCKED on Item H — 3 consumer-migration stub deletions (`BladeHardwarePanel.tsx` / `PowerDrawPanel.tsx` / `GradientBuilder.tsx`). 2026-04-28 parallel-agent attempt verified all 3 stubs have ACTIVE consumers requiring non-mechanical reshaping: `BladeHardware` + `PowerDraw` are mounted as separate sibling sections in `DesignPanel.tsx` (mobile shell) — swap to `<HardwarePanel />` would duplicate content; `GradientBuilder` is consumed by A/B-section files (`ColorColumnB.tsx`, `BladeStyleColumnB.tsx`) AND `ColorPanel.tsx`'s `GradientRegion` is private (not exported). Sequence: ship Item H → DesignPanel + TabColumnContent retire → BladeHardware/PowerDraw delete → extract `GradientRegion` to shared `lib/gradient/` → GradientBuilder delete. Full reasoning in `docs/POST_LAUNCH_BACKLOG.md`.
- **H.** Mobile shell migration to Sidebar + MainContent
- **I.** Wave 8 — Button routing sub-tab + aux/gesture-as-modulator plates
- **J.** UX item #16 — Figma color model (opacity + blend modes)
- **K.** Module extraction `lib/blade/*` from `BladeCanvas.tsx`

### Sibling / follow-on branches still open

- **`feat/marketing-site-expansion`** (worktree at `../KyberStation-mkt`) — disjoint footprint, no overlap.
- **PR #83** (`docs/session-archive`) and **PR #32** (marketing pages) — both pre-existing, unaffected by today's work.

---

## Current State (2026-04-27, v0.15.0 cut — Modulation Routing v1.1 Core)

**Active branch: `main` (post pre-launch cleanup pass).** Tag: **`v0.15.0`** — hardware-validated on 89sabers Proffieboard V3.9 (2026-04-27 evening). Codename: **Modulation Routing v1.1 Core**.

This release bundles ~5 weeks of work since `v0.14.0` (2026-04-23):

- **Modulation Routing v1.1 Core** (PRs #57-#65, overnight 2026-04-27) — all 11 modulators surface as plates, AST-level template injection (live `Mix<Scale<SwingSpeed<...>, ...>>` instead of snapshot values), per-binding expression editing via `fx` button, reciprocal hover highlighting, true HTML5 drag-to-route, 5 new starter recipes (heartbeat / battery-saver / idle-hue-drift / sound-driven-hue / twist-driven-saturation), 7 new user-guide pages, the `composeBindings` test suite, and the full `[Unreleased]` recap on CHANGELOG.
- **Saber GIF Sprint 1** (PR #67, 2026-04-27) — animated GIF export from My Crystal panel via the new `captureSequence` engine helper + `gif.js` Promise wrapper + headless workbench renderer port. Two variants ship: Idle 1s shimmer loop, Ignition 2.5s state-machine arc. Both stay under the brief's ≤2 MB / ≤5 MB targets.
- **Vertical Saber Card layout** (PR #36, 2026-04-23) — portrait 675×1200 layout adds to the four existing OG layouts; rounded blade tip + flush emitter polish on all card variants.
- **Left-rail overhaul** (PRs #47-#53, 2026-04-25) — Sidebar + MainContent shell replaces the multi-tab + multi-column workbench; Inspector becomes the always-visible Quick Controls surface; tablet adopts the same shape at 240px sidebar width. Three panel merges: Color, Hardware, Routing. SettingsModal reorganized to 3 tabs.
- **v0.14.0 Visualization Polish + Workbench Chrome** (PR #46, 2026-04-24) — bloom rewrite (3-mip downsampled bright-pass chain), rim glow, motion blur, ambient wash, and 24 chrome-alignment passes against Ken's walkthrough.
- **Preset Accuracy Audit + Pop-Culture Expansion** (PR #39, 2026-04-22) — full canonical sweep of 216 presets + 89 net-new pop-culture entries (LOTR, Marvel/DC, Zelda, FF/KH, anime, kids' cartoons, Power Rangers, mascots) + new `DarkSaberStyle` engine class with codegen parity + `continuity` field on presets + the `HARDWARE_FIDELITY_PRINCIPLE.md` architectural doc.
- **Modulation v1.0 Preview BETA + Polish** (PRs #35-#42, 2026-04-23) — the original v1.0 routing surface plus the post-merge polish that cleared the P29 axe-core launch blocker (zero WCAG 2 AA violations on /editor desktop + mobile).
- **Saber Wizard hardware step** (2026-04-22) — first-step blade-length + board picker with 3-tier compatibility chips on the StatusBar's BoardPicker primitive.
- **Pre-launch cleanup pass** (PRs #36, #56, #67, #68, #69, #70, 2026-04-27 evening) — merge of in-flight feature branches, salvage of the left-rail overhaul recap docs, SEO infrastructure (`robots.txt` / `sitemap.xml` / `siteConfig.ts`), and the new `docs/POST_LAUNCH_BACKLOG.md` single-source backlog index.

Hardware validation status: ✅ macOS + 89sabers V3.9 + Brave (Chromium WebUSB). Confirmed live `Mix<Scale<SwingSpeed<400>, ...>, ...>` driver evaluation on hardware via a swing→hue test on 2026-04-27 evening: a hand-patched config emitting `Mix<Scale<SwingSpeed<400>, Int<0>, Int<32768>>, Rgb<0,140,255>, Rgb<255,40,40>>` as the blade's primary color produced visible blue↔red gradient that tracked swing speed in real time. AudioFlicker wrapper masks the live shimmer when no audio font is loaded — flag for users who flash without a font. Build/flash pipeline used: codegen via `scripts/hardware-test/build-modulation-test-config.mjs` → `arduino-cli compile` (Proffieboard V3 fqbn) → `stm32l4-upload 0x1209 0x6668 ProffieOS.ino.dfu`. Preserved test config at `ProffieOS/config/v3-modulation-test.h` for future re-flash. Cross-OS (Windows / Linux) + cross-board (V2, V3-OLED, CFX, Golden Harvest, Xenopixel) sweeps are post-launch per `docs/POST_LAUNCH_BACKLOG.md`.

Test count at tag: **3,168** workspace-wide (60 web suites at 1,064 tests + 740 engine + 1,859 codegen + 47 presets + 260 boards + 40 sound + 158 in flight). Typecheck clean across all 10 packages.

Single source of truth for the backlog: [`docs/POST_LAUNCH_BACKLOG.md`](docs/POST_LAUNCH_BACKLOG.md). Hardware validator handoff: [`docs/NEXT_HARDWARE_MODULATION_SESSION.md`](docs/NEXT_HARDWARE_MODULATION_SESSION.md).

---

### Earlier 2026-04-27 — Saber GIF Sprint 1

**Active branch: `feat/saber-gif-sprint-1` — PR [#67](https://github.com/kenkoller/KyberStation/pull/67), 4 commits, rebased onto `origin/main` at `ed7e5d8`. Open, pending review.** Sprint 1 of the saber-GIF roadmap (`docs/SABER_GIF_ROADMAP.md` on PR [#56](https://github.com/kenkoller/KyberStation/pull/56), still open). Ships animated GIF export from the My Crystal panel with two variants (Idle 1 s loop / Ignition cycle 2.5 s arc), driven by the v0.14 workbench blade renderer ported into a parallel headless module.

### What shipped (4 commits, oldest → newest)

| # | Commit | File | Scope |
|---|---|---|---|
| 1 | `63f9f20` | `packages/engine/src/captureSequence.ts` (+ tests) | **`captureSequence` engine helper** — pure-data multi-frame capture returning `Uint8Array[]` of LED buffers. Modes: `'idle-loop'` (settles to ON, captures 1 s of steady-state shimmer) / `'ignition-cycle'` (full PREON → IGNITING → ON → RETRACTING → OFF arc). Built on the public `ignite() / retract() / update()` API; no private state poking. Sibling `captureSequenceWithStates` returns frames + per-frame `BladeState`. +18 engine tests. |
| 2 | `5ac398e` | `apps/web/lib/sharePack/gifEncoder.ts` + `apps/web/public/gif.worker.js` (+ tests) | **`gif.js` Promise wrapper.** Exports `encodeGif(canvases, options)` (array → Blob), `encodeGifStreamed(options, callback)` (streaming variant — caller pushes frames into the encoder for memory-bounded loops), and `setGifEncoderFactory()` test seam. Default factory dynamic-imports `gif.js` so node tests don't load the browser-only module. Worker script lives at `/gif.worker.js` (committed under `apps/web/public/`, 16 KB from `node_modules/gif.js/dist/`). +15 web tests. Adds `gif.js@^0.2.0` + `@types/gif.js` to `apps/web/package.json`. |
| 3 | `08760ce` | `apps/web/lib/sharePack/bladeRenderHeadless.ts` | **Workbench renderer headless port.** 1:1 port of the v0.14 capsule rasterizer + 3-mip bloom chain from `BladeCanvas.tsx`. Same plateau (`PLATEAU_END=0.16` / `COLOR_END=0.40`) + α-feather anchors + mip alphas (`0.65 / 0.52 / 0.45`) + blur radii (`6/10/14 × bloomRadius`) + additive `lighter` body composite + per-color `getGlowProfile`. Skips rim glow, motion blur, ignition flash burst, and ambient mip-2 wash (visual icing — needs swing/effect-state refs we don't track per captureSequence frame). **Leaves `BladeCanvas.tsx` untouched** — workbench risk zero. Paired-but-parallel until the deferred Phase 4 extraction collapses them. |
| 4 | `994ad42` | `apps/web/lib/sharePack/cardSnapshot.ts` (+231 lines) + `apps/web/components/editor/CrystalPanel.tsx` (+80) (+ tests) | **`renderCardGif` orchestrator + UI button.** Additive sibling of `renderCardSnapshot` — static PNG path stays untouched. Per-frame: clear canvas → repaint chrome (backdrop / header / hilt / metadata / qr / footer) → call `drawWorkbenchBlade` reading the engine LED buffer directly → `gif.addFrame(canvas, copy: true)`. Reuses one `<canvas>` across the sequence (gif.js's `copy:true` snapshots pixel data immediately, freeing the canvas for the next frame). Test seams: `__setCardFrameRendererForTesting` + `__setCreateQrSurfaceForTesting`. UI: "Save share GIF" button + variant select on CrystalPanel. Filename: `kyberstation-card-<variant>-<presetSlug>-<timestamp>.gif`. +13 web tests. |

### Defaults + size budgets (verified via dev-server smoke test)

| Variant | fps | Frames | Output | File size | Encode time |
|---|---|---|---|---|---|
| Idle | 18 | 18 | 640 × 360 | 1.66 MB | 1.95 s |
| Ignition | 18 | 45 | 640 × 360 | 4.32 MB | 4.28 s |

Hits the brief's `< 2 MB idle / < 5 MB ignition` targets at default settings. Callers can override `width / fps / quality / workerScript` for hosted-use higher-fidelity renders. Visual: GIF shows the workbench-quality blade (capsule + bloom + plateau core), not the simplified gradient that `card/drawBlade.ts` paints for the static PNG.

### Architectural decisions worth carrying forward

- **`bladeRenderHeadless.ts` is a parallel port, not a shared extraction.** The deferred Phase 4 module-extraction (per CLAUDE.md "Still open" on the v0.14.0 entry below — collapse `BladeCanvas.tsx`'s inline pipeline into `lib/blade/*`) is the right long-term home for this code. Doing it inside a GIF feature PR would refactor the live workbench inline rendering — high blast radius. The parallel port:
  - leaves `BladeCanvas.tsx` unchanged (zero workbench risk),
  - gives `renderCardGif` workbench-quality output today,
  - sets up the canonical headless module that the deferred Phase 4 can adopt by migrating `BladeCanvas` (and `MiniSaber` and `card/drawBlade.ts`) to call into it.
  Drift is contained — both files document the invariants they share at the top.
- **GIF output canvas dispatch differs from PNG.** `gif.js`'s `addFrame` detects an HTMLCanvasElement via `image.childNodes !== undefined` and rejects `OffscreenCanvas` with "Invalid image". So `renderCardGif` always uses `document.createElement('canvas')`; the static-PNG `renderCardSnapshot` keeps using `OffscreenCanvas` via `convertToBlob`. Both paths documented inline.
- **Per-frame blade modulation comes from the engine, not from analyzing the LED buffer.** First-pass implementation derived an `extentFraction` + `meanColor` from each buffer to scale `bladeEndX` / override `config.baseColor`. After porting the workbench renderer, the rasterizer reads each LED's color directly — partial-ignition states render as partial brightness along the strip without us scaling the layout. The engine's per-LED state IS the truth.
- **Output canvas is reused across frames.** gif.js's `copy: true` snapshots pixel data per `addFrame` call, so the loop holds at most one full-size canvas in memory regardless of frame count. Streaming `encodeGifStreamed` exposes this pattern as a public API.

### Test deltas

| Package | Pre-sprint | Post-sprint | Δ |
|---|---:|---:|---:|
| engine | 722 | 740 | +18 |
| web | 1,041 | 1,069 | +28 |

Workspace-wide typecheck clean. `pnpm test` green across all 10 tasks.

### Still open

- **PR #67 review + merge.** Branch is rebased onto `origin/main` at `ed7e5d8`; CI run pending.
- **PR #56 (`docs/saber-gif-roadmap`) merge.** The roadmap doc itself lives on a sibling open PR. Once merged, the Sprint 1 status flip on `docs/SABER_GIF_ROADMAP.md` (mark Sprint 1 ✅, link PR #67) should land — either as a follow-up commit on PR #56 before merge, or as a separate docs commit on main after both merge.
- **Sprint 2** — per-variant ignition / retraction picker GIFs (19 + 13 thumbnails) + build script + `MiniGalleryPicker` wiring. Roadmap doc has the spec.
- **Sprint 3** — Tier 2 marketing showcases (style grid, colour cycle, lockup loop).
- **Sprint 4** — Tier 3 effect-specific + hilt-only + UI walkthrough GIFs.
- **Phase 4 module extraction** (separate, lower-risk PR): collapse `bladeRenderHeadless.ts` ↔ `BladeCanvas.tsx`'s inline pipeline into one shared module under `lib/blade/*`; migrate `MiniSaber`, `card/drawBlade.ts`, etc. to call it. This is the natural follow-up that closes the parallel-port loop.
- **`docs/SHARE_PACK.md` GIF sections** — pre-Sprint-1 spec language ("Phase 3 — Hum GIF" / `omggif` dep / 1200×675 / 24 fps) is now stale relative to what shipped (gif.js, 640×360, 18 fps). Will refresh in this same docs commit.
- **Manual share-target verification** — open the GIF in Discord / Twitter / iMessage to confirm preview thumbnails play. Not yet done; suggested for the morning walkthrough.

### Pre-sprint state (kept for history)

### Earlier 2026-04-27 overnight — Modulation Routing v1.1 Core

**Active branch: `main` (tip `ddaa3b6`).** Eight PRs landed overnight on top of v0.14.0, completing the v1.1 Core scope from `docs/MODULATION_ROUTING_ROADMAP.md`. Last tag is still `v0.14.0` — pending hardware-gated v0.15.0 tag. Tonight's run was Phase 1 (4 parallel agents in worktrees) + Phase 2a (3 parallel agents) + Phase 2b (Wave 5, salvaged after agent stalled pre-commit).

### What shipped overnight (chronological)

| # | PR | Wave | Scope |
|---|---|---|---|
| 1 | [#57](https://github.com/kenkoller/KyberStation/pull/57) | Wave 1 | **Activate 6 dormant modulators** — `twist` / `battery` / `lockup` / `preon` / `ignition` / `retraction` plates with bespoke CSS-keyframe live-viz glyphs (rotating axis bar, battery-fill cell, sustained pulse ring, flickering charge spark, extension/contraction wipes). Plate grid bumped to `lg:grid-cols-4 xl:grid-cols-6` to fit 11 readably. Touched `routing/ModulatorPlateBar.tsx` + `routing/AddBindingForm.tsx`. |
| 2 | [#58](https://github.com/kenkoller/KyberStation/pull/58) | Wave 4 | **5 new starter recipes** — `heartbeat-pulse` (`abs(sin(time*0.002))`), `battery-saver` (`clamp(1-battery, 0, 0.5)`), `idle-hue-drift` (time→colorHueShiftSpeed), `sound-driven-hue` (sound→colorHueShiftSpeed), `twist-driven-saturation` (twist→colorSaturationPulse). Recipe library: 6 → 11. `V1_0_RECIPES` now 8; `V1_1_EXPRESSION_RECIPES` now 3 (Breathing + Heartbeat + Battery Saver). +18 tests. Brightness target swapped to shimmer in two recipes since `brightness` isn't a discrete leaf in BladeConfig (matches the existing `breathing-blade` substitution). |
| 3 | [#59](https://github.com/kenkoller/KyberStation/pull/59) | Wave 9 | **7 new user-guide pages** — `recipes.md` / `combinators.md` / `modulators.md` / `expressions.md` / `canon-patterns.md` / `troubleshooting.md` / `sharing.md`. ~5,400 new words total. Voice-matched to the existing quick-start. Honest-scope-tagged throughout — every recipe + feature flagged `(v1.0)` / `(v1.1+)` / `(v1.2+)`. Updated `your-first-wire.md` with a "Read more" section linking the 7 new pages. |
| 4 | [#60](https://github.com/kenkoller/KyberStation/pull/60) | Wave 6 | **AST-level template injection** — `composeBindings(ast, mappable)` in `packages/codegen/src/proffieOSEmitter/composeBindings.ts` walks the style AST and grafts each mapped binding's `astPatch` into the slot identified by `targetPath`. v1.1 Core slot set handles the **shimmer-Mix slot pattern** (`Mix<Int<N>, X, Y>`) used by `stable`/`unstable`/`pulse`/`photon`/`crystalShatter`/`cinder`. `generateStyleCode` rewired: `mapBindings` → `applyModulationSnapshot` (full set baseline) → `buildAST` → `composeBindings` (overwrites mappable slots with live drivers) → `emitCode` → v1.1 comment block distinguishing live / snapshotted / deferred / skipped bindings. **Targets handled live**: `shimmer`. **Targets still deferred to snapshot** (v1.2 candidates): `baseColor.r/g/b` + timing scalars — would need `Mix<driver, ColorLow, ColorHigh>` restructuring. Test file shipped separately as PR #62 (Wave 6b) due to a worktree-environment file-revert issue mid-agent. |
| 5 | [#61](https://github.com/kenkoller/KyberStation/pull/61) | Wave 2 | **Reciprocal hover highlight** — hovering a parameter row in ParameterBank now highlights every modulator plate that drives it. New `uiStore.hoveredParameterPath: string \| null` field + setter, written from `SliderControl`'s pointer events. `ModulatorPlate` reads + computes `isDrivenByThis = bindings.some(b => b.source === id && b.target === hoveredParameterPath && !b.bypassed)`. When true (and not armed), layers a 1.5 px outer ring + opacity boost on top of the existing inset stripe. Bypassed bindings filtered out. Multi-driver case lights multiple plates simultaneously. |
| 6 | [#62](https://github.com/kenkoller/KyberStation/pull/62) | Wave 6b | **Backfill `composeBindings.test.ts`** — 17 tests across 9 groups: pure-function invariants, single binding swing→shimmer @ 60%, breathing heuristic detection, multi-binding composition, fall-through to deferred, purity (no mutation / idempotency / structural sharing), result shape, `generateStyleCode` integration, snapshot/live boundary. Codegen test count 1842 → 1859. |
| 7 | [#63](https://github.com/kenkoller/KyberStation/pull/63) | Wave 3 | **Per-binding expression editing** — `BindingList`'s `BindingRow` shows a magenta `fx` button on expression-bound rows (where `binding.source === null && binding.expression !== null`). Clicking it opens `ExpressionEditor` as a popover preloaded with the binding's existing source. The editor's existing `existingBindingId` flow correctly delegates to `bladeStore.updateBinding`. New 28-px fx-slot grid column on every row keeps alignment consistent across mixed expression / bare-source lists. +7 tests in `apps/web/tests/bindingListEditExpression.test.tsx`. |
| 8 | [#64](https://github.com/kenkoller/KyberStation/pull/64) | Wave 5 | **True drag-to-route** — HTML5 drag-and-drop layered on click-to-route as the primary mouse/trackpad gesture (Vital / Bitwig pattern). Plates `draggable={true}` write modulator id onto `dataTransfer` under MIME type `application/x-kyberstation-modulator`. Slider rows are drop targets with `isDropTarget` visual cue (dashed accent in dragged modulator's identity color). New `useClickToRoute.dragBind(modulatorId, targetPath)` action bypasses the arm/click sequence. Same `BindingCreateResult` gating semantics as click-to-route. `MODULATOR_DRAG_MIME_TYPE` exported as a constant. Click-to-route preserved unchanged as the keyboard / a11y fallback. +9 tests. **Salvage note**: original Wave 5 agent stalled post-implementation but pre-commit; parent session re-ran gates against the worktree (clean) and committed/pushed. |

### Test deltas overnight

| Package | Pre-night | Post-night | Δ |
|---|---:|---:|---:|
| codegen | 1,842 | 1,859 | +17 |
| web | 1,025 | ≥1,041 (+9 from #64; more from #61, #63) | ≥+16 |
| presets | 29 | 47 | +18 |

### Architectural notes worth carrying forward

- **Worktree path discipline.** Three of seven background agents tonight (Wave 4, Wave 6, Wave 6b) initially leaked file writes into the main repo path instead of their own worktree, requiring recovery. Wave 5 stalled before committing entirely. Future agent prompts must include the explicit `cd <worktree-path> && pwd` confirmation step + the warning header about other agents that hit the issue.
- **Wave 5 salvage pattern**: when an agent stalls after writing files but before committing, check the worktree state directly — if typecheck + tests pass, the parent session can commit + push + open PR using the agent's exact code. Don't re-run the agent to redo the work.
- **`shimmer-Mix` slot was the canonical first AST target.** It's the most common modulation entry in ProffieOS (every base-style passes shimmer through `Mix<Int<N>, X, Y>` for `AudioFlicker` blending). Future composer expansion (per-channel RGB, timing scalars) needs deeper AST restructuring per the Wave 6 PR body.
- **Reciprocal hover replaces the legacy 1:1 stub.** The 2026-04-20 ModulatorRow's `hoveredModulatorId` 1:1 mapping was always meant as a placeholder until v1.1 wired the proper bindings-aware version. Wave 2 closes that.

### Still open (post-overnight)

- **Wave 7 — Kyber Glyph v2 modulation round-trip.** PR #38 (the multi-version dispatcher) merged earlier; the actual v2 encoder body for the `modulation` payload field is still outstanding.
- **Wave 8 — Button routing sub-tab + aux/gesture-as-modulator plates.** L scope (~6-8 hours), its own session.
- **Wave 10 — Hardware validation + V2.2 modulation flash + cut `v0.15.0` tag.** Hardware-gated. Handoff doc at `docs/NEXT_HARDWARE_MODULATION_SESSION.md` still applies; refresh it for v1.1 Core scope before running.
- **Wave 6 follow-on — composer slot expansion.** v1.1 Core ships with shimmer-Mix only. Per-channel RGB + timing scalars are v1.2 candidates per the PR #60 body.
- **Manual visual verification of all 8 PRs in the live editor.** Browser-driven walkthrough of: 11 plates render with viz, drag-to-route lands a binding, fx-edit on existing binding updates correctly, reciprocal hover lights the right plate, generated config.h shows the v1.1 comment block.

### Ready for morning

- All 8 PRs CI-green and merged to main. Local main = origin/main = `ddaa3b6`.
- Worktrees still locked under `.claude/worktrees/agent-*` from background agents — manually clean via `git worktree remove --force` for each, OR they may auto-release after the parent session ends.
- No tag cut. Recommend `v0.15.0` post-hardware-validation per the same flow used for v0.14.0.

### Pre-overnight state (kept for history)

### Earlier 2026-04-25 — v0.14.0 left-rail overhaul shipped to main

Seven PRs merged 2026-04-25 (#47 through #53) implementing the full left-rail overhaul that replaces the multi-tab + multi-column workbench with a unified Sidebar + MainContent shell. PR #46 (the prior session's blade-polish branch) merged earlier the same day; the left-rail work was cut as a separate sprint after a long planning conversation about UI/UX direction.

End-to-end browser-verified at desktop (1600×1000) and tablet (900×1024). 1030 / 1030 tests passing. Typecheck clean.

| PR | Commit | Scope | LOC |
|---|---|---|---|
| **#47** | merge `39ebf4d` | PR 1 + PR 2 stacked: built sidebar shell behind a `useNewLayout` flag, then flipped the flag and removed the legacy chrome (page tabs, dual-mount conditional, PerformanceBar mount, activeTab gates) | +1828 / −861 |
| **#48** | merge `d15dfd3` | PR 3 — Inspector becomes single-surface "Quick Controls"; GALLERY tab retired; 8 canonical color chips + ignition/retraction MGP pickers added above the existing parameter sliders | +853 / −213 |
| **#49** | merge `517b9d7` | PR 4 — restored Motion Simulation in sidebar Advanced group; ⌘1–⌘4 digit nav rewired from `setActiveTab` → `setActiveSection`; cheatsheet surfaces all nav shortcuts | +36 / −28 |
| **#50** | merge `995e710` | PR 5a — extracted duplicated 19-ignition + 13-retraction catalogs to `lib/transitionCatalogs.ts`; three call sites now share one source | +95 / −106 |
| **#51** | merge `3f44947` | PR 5b — wired the previously-inert Custom color chip to jump to the deep Color sidebar section | +59 / −12 |
| **#52** | merge `ac4d75f` | PR 5c — migrated the tablet shell from 4-tab + TabColumnContent to Sidebar + MainContent at 240px sidebar width | +23 / −160 |
| **#53** | merge `34f7520` | PR 5d — deleted PerformanceBar.tsx + MacroKnob.tsx + QuickMacroPreview.tsx (truly dead after PR 2); extracted `shiftLedColor` to `lib/shiftLight.ts` for the lone surviving consumer (ShiftLightRail) | +32 / −959 |

#### Final desktop layout shape (post-overhaul)

```
┌────────────────────────────────────────────────────────────┐
│  HEADER  (logo, ShareButton, FPS, Sound, Docs, ⌘K, Wizard, │
│           ?, ⚙)  — page-tabs nav removed                   │
├────────────────────────────────────────────────────────────┤
│ INSPECTOR │   BLADE PREVIEW  + pixel strip + RGB           │ ANALYSIS │
│ (Quick    │                                                │ RAIL     │
│ Controls) │   ┌─ action bar — IGNITE · CLASH · BLAST · …─┐ │ STATE +  │
│ ~320-400  │                                                │ ANALYSIS │
│ ✨ + ↶    │                                                │ tabs     │
│ COLOR · 8 │                                                │ ~200-280 │
│ chips +   │                                                │          │
│ Custom    │                                                │          │
│ IGNITION  │                                                │          │
│ RETRACT   │                                                │          │
│ 7 sliders │                                                │          │
├───────────┴────────────────────────────────────────────────┤          │
│ SIDEBAR (~280, collapsible) │ MAINCONTENT (active section) │          │
├──────────────────────────────────────────────────────────────────────│
│ DELIVERY RAIL · SHIFT-LIGHT RAIL · APPPERFSTRIP · DATATICKER         │
└──────────────────────────────────────────────────────────────────────┘
```

Sidebar groups (collapsible, persisted): GALLERY → /gallery route · APPEARANCE (Blade Style · Color) · BEHAVIOR (Ignition & Retraction · Combat Effects · Gesture Controls) · ADVANCED (Layer Compositor · Motion Simulation · Hardware · My Crystal) · ROUTING BETA (board-gated) · AUDIO · OUTPUT.

Three panel merges shipped in PR 1: Colors + Gradient Builder → unified ColorPanel (channel-scoped gradient region); BladeHardwarePanel + PowerDrawPanel → HardwarePanel (config + live readout); ModulatorPlateBar + BindingList → RoutingPanel.

SettingsModal reorganized to 3 tabs (Appearance / Behavior / Advanced); the dead "Performance Bar" toggle removed alongside the bar itself.

#### Architectural decisions worth carrying forward

1. **Sidebar pattern is `aside[aria-label="Editor sections"]`.** Single nav for the entire editor — replaces both the page tabs in the header AND the per-tab DesignPanel pill bar. `uiStore.activeSection` is the one selection slot. New section IDs go in `SectionId` union + `VALID_SECTION_IDS` list + `MainContent.tsx` switch + `Sidebar.tsx` group definitions.
2. **Quick Controls is the left "fast tune" surface; sidebar Color is the deep editor.** Both views over the same `bladeStore` — changes propagate. Custom color chip jumps to the deep Color section rather than opening a separate popover (one custom-color surface, not two).
3. **Tablet uses the same Sidebar + MainContent at 240px width.** No more swipe-driven tab UI. Mobile shell still uses the 4-tab swipe layout — that's intentional, awaiting a UX-judgment session on small-screen drawer / bottom-sheet patterns.
4. **`lib/transitionCatalogs.ts` is the source of truth** for the 19 ignition + 13 retraction styles. Both `IgnitionRetractionPanel` (deep) and `QuickIgnitionPicker` / `QuickRetractionPicker` (compact) consume it.
5. **`lib/shiftLight.ts` houses `shiftLedColor`** (extracted from the deleted PerformanceBar). ShiftLightRail is the only consumer.

#### Parallel-agent dispatch pattern that worked

PR 1 fanned out into 5 lanes — Lane A (layout shell) in the main session, Lanes B/C/D/E dispatched as parallel agents touching disjoint files. PR 3 fanned out into 3 lanes (QuickColorChips, QuickTransitionPicker, Inspector shell). All agents committed with `Co-Authored-By: Claude Opus 4.7 (1M context)` trailers.

The discipline that made it work: (a) every agent prompt is self-contained — it doesn't see the parent conversation; (b) lanes touch entirely disjoint files (write-disjoint, read-overlap is fine); (c) main session integrates last so the tree is consistent; (d) main session typecheck runs against the integrated state, not each agent's branch. Three of seven agents had Bash blocked mid-session and couldn't commit themselves — main session committed their files at integration time and that worked cleanly.

#### Still deferred from this overhaul

- **Mobile shell migration to Sidebar + MainContent.** Current mobile shell is still on `MergedDesignPanel` + 4-tab swipe UI. At 375px viewport the sidebar pattern doesn't fit cleanly without picking a drawer / bottom-sheet idiom. Once mobile migrates, `DesignPanel.tsx`, `DynamicsPanel.tsx`, `MergedDesignPanel`, and `uiStore.activeTab` can all leave together.
- **Custom color popover.** Currently the Custom chip jumps to the deep Color section. If an inline HSL popover is preferred, that's a small follow-up.
- **MGP thumbnail crispness.** The 24×24 ignition/retraction triggers are scaled-down 100×60 SVGs via `transform: scale(0.24)`. A `compactThumbnail` field on the catalog entries would allow authors to provide optimised small-size SVGs.

### Earlier 2026-04-24 — v0.14.0 Visualization Polish + Workbench Chrome Pass

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
