# KyberStation Development Guide

## Prerequisites

- **Node.js** 20+ (24.x recommended)
- **pnpm** 9+ (10.x recommended)

## Setup

```bash
pnpm install
```

### Network Drive (Z: drive)

This project runs on a mapped network share (`\\10.10.10.2\ZDC`). The `.npmrc` is configured for this:

```ini
node-linker=hoisted
symlink=false
store-dir=./.pnpm-store
```

Because symlinks are disabled, `.bin` shims may not exist. Turbo won't work. Use the `:local` script variants instead:

```bash
pnpm dev:local        # Dev server without Turbo
pnpm build:local      # Production build without Turbo
```

These scripts (`scripts/local-build.mjs`, `scripts/local-dev.mjs`) resolve binaries via direct paths when `.bin` symlinks are missing.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:local` | Start Next.js dev server + package watchers |
| `pnpm build:local` | Build all packages + web app for production |
| `pnpm test` | Run all 498+ tests (Vitest) |
| `pnpm test:engine` | Engine tests only |
| `pnpm test:codegen` | Codegen tests only |
| `pnpm lint` | Placeholder — prints "lint: placeholder — eslint not yet configured". See note below. |
| `pnpm typecheck` | TypeScript strict mode check (authoritative correctness check) |

> **Lint status**: ESLint is referenced by each package's `lint` script but
> has never been added as a devDependency. Scripts were replaced with
> `echo` placeholders so CI and local `pnpm -w lint` both pass cleanly.
> TypeScript strict mode (`pnpm typecheck`) does most of the work a linter
> would. Adding proper ESLint + `eslint-config-next` + a shared
> `.eslintrc` is tracked as a follow-up.

**Windows shortcut:** Double-click `KyberStation.bat` in the project root to launch the dev server, or use the Desktop shortcut.

## Build Order

The local build script handles dependency ordering automatically:

1. **Engine** first (everything depends on it)
2. **Codegen, Presets, Sound, Boards** in parallel
3. **Web app** last (depends on all packages)

## Project Structure

```
kyberstation/
├── apps/web/              # Next.js 14 App Router
│   ├── app/               # Pages (/, /editor, /m, /s, /docs)
│   │                      #   /       = identity landing (live blade hero, value strip, CTAs, release strip, footer)
│   │                      #   /editor = main workbench (4-column panel grid, drag-reorderable)
│   │                      #   /m      = mobile companion (touch-first, swipe between 12 curated presets)
│   │                      #   /s      = short-link share redirect
│   │                      #   /docs   = built-in ProffieOS reference + design system page
│   ├── components/landing/# Landing page shell (Hero + ValueStrip + CTAs + ReleaseStrip + Footer)
│   ├── components/        # React components
│   │   ├── editor/        # Editor panels (canvas, style, effects, etc.)
│   │   ├── layout/        # App shell, toolbar
│   │   └── shared/        # Reusable UI primitives
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Config I/O, URL encoding, IndexedDB (fontDB)
│   └── stores/            # Zustand stores (13 total: blade, UI, layout, visualization, history, userPreset, saberProfile, presetList, audioFont, audioMixer, accessibility)
├── packages/engine/       # Blade simulation engine (zero DOM deps)
├── packages/codegen/      # AST-based ProffieOS C++ generator
├── packages/presets/      # Character preset library
├── packages/sound/        # Sound font + audio filter chain
├── packages/boards/       # 14 board profiles + compatibility
├── scripts/               # Build/dev runners (Turbo-free)
└── docs/                  # This documentation
```

## TypeScript Configuration

- **Target:** ES2022
- **Strict mode:** Enabled globally (`tsconfig.base.json`)
- **Composite projects:** Each package has its own `tsconfig.json` extending `tsconfig.base.json` with `composite: true` and `declaration: true`
- **No `any`:** Avoid `any` except in `types.ts` escape hatches

## Testing

Tests use Vitest and live in `packages/*/tests/`. Run with:

```bash
# All tests
pnpm test

# Watch mode (useful during development)
node node_modules/vitest/vitest.mjs --watch

# Single package
node node_modules/vitest/vitest.mjs run --project engine
```

Test coverage by package:
- **engine** — 6+ test suites, 398+ tests (styles, effects, ignition, easing, LEDArray, BladeEngine)
- **codegen** — AST building, code emission, config generation, template validation
- **web** — layoutStore (39 tests), visualizationStore (30 tests), historyStore (31 tests), component integration tests

## Debugging

### Dev server won't start
- Check if port 3000 is in use: `npx kill-port 3000`
- Use `pnpm dev:local` instead of `pnpm dev` on network drives

### TypeScript errors after pulling changes
- Rebuild packages: `pnpm build:local`
- Check that engine builds first — other packages import its types

### Killing processes safely
Don't use `taskkill /F /IM node.exe` — it will kill everything including your IDE and Claude Code. Instead:
- Kill by port: `npx kill-port 3000`
- Kill by PID: find with `netstat -ano | findstr :3000`, then `taskkill /F /PID <pid>`

## Firmware Compilation (ProffieOS)

KyberStation generates ProffieOS config.h files, but these must be compiled and flashed to the Proffieboard. The toolchain:

### Prerequisites

```bash
# Install arduino-cli
brew install arduino-cli

# Add Proffieboard board manager
arduino-cli config init
arduino-cli config add board_manager.additional_urls \
  https://profezzorn.github.io/arduino-proffieboard/package_proffieboard_index.json

# Install Proffieboard core
arduino-cli core update-index
arduino-cli core install proffieboard:stm32l4
```

### Clone ProffieOS

```bash
git clone --depth 1 https://github.com/profezzorn/ProffieOS.git
```

### Compile a config

1. Copy generated config.h to `ProffieOS/config/my_config.h`
2. In `ProffieOS/ProffieOS.ino`, add: `#define CONFIG_FILE "config/my_config.h"`
3. Compile:

```bash
cd ProffieOS
arduino-cli compile \
  --fqbn "proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1,speed=80,opt=os" .
```

### Board FQBNs

| Board | FQBN |
|-------|------|
| Proffieboard V1 | `proffieboard:stm32l4:Proffieboard-L433CC` |
| Proffieboard V2 | `proffieboard:stm32l4:ProffieboardV2-L433CC` |
| Proffieboard V3 | `proffieboard:stm32l4:ProffieboardV3-L452RE` |

### Required board options

- `dosfs=sdmmc1` — SDIO High Speed (required for SD card)
- `speed=80` — 80 MHz CPU
- `opt=os` — Smallest Code optimization

### Flash via USB

```bash
arduino-cli upload --fqbn "proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1" \
  --port /dev/cu.usbmodemXXXX .
```

The board must be in DFU/bootloader mode (hold BOOT button while powering on, or use the serial command).

## New Features (Phase 4-6)

### Desktop Workbench Layout

The sidebar layout has been replaced with a horizontal workbench on desktop:

- `components/layout/WorkbenchLayout.tsx` — Main desktop layout container
- `components/layout/ColumnGrid.tsx` — CSS grid with HTML5 DnD for panel reordering
- `components/layout/DraggablePanel.tsx` — Individual panel wrapper with drag handle
- `components/layout/TabColumnContent.tsx` — Maps 29 panel IDs to React components
- `stores/layoutStore.ts` — Column assignments, presets, collapsed state
- `hooks/useResponsiveColumns.ts` — matchMedia listeners at 1440/1200/1024px breakpoints

### Visualization Stack

Analysis layers below the blade canvas:

- `lib/visualizationTypes.ts` — 13 layer type definitions
- `stores/visualizationStore.ts` — Layer visibility, ordering, debug mode
- `components/editor/VisualizationToolbar.tsx` — Toggle icons per layer
- `components/editor/VisualizationStack.tsx` — Canvas-based layer rendering
- `components/editor/PixelDebugOverlay.tsx` — Per-pixel hover/pin/range debug overlay

### New Engine Effects (24 total)

All in `packages/engine/src/`:

**New Styles (8):** GravityStyle, DataStreamStyle, EmberStyle, AutomataStyle, HelixStyle, CandleStyle, ShatterStyle, NeutronStyle

**New Effects (7):** ShockwaveEffect, ScatterEffect, FragmentEffect, RippleEffect, FreezeEffect, OverchargeEffect, BifurcateEffect

**New Ignitions (5):** CrackleIgnition, FractureIgnition, FlashFillIgnition, PulseWaveIgnition, DripUpIgnition

**New Retractions (4):** DissolveRetraction, FlickerOutRetraction, UnravelRetraction, DrainRetraction

### Additional Features

- `components/editor/FullscreenPreview.tsx` — Immersive preview with device motion
- `components/layout/UndoRedoButtons.tsx` + `stores/historyStore.ts` — 50-entry undo/redo
- `components/layout/ShareButton.tsx` — Kyber Code URL encoding via configUrl.ts
- `components/layout/FPSCounter.tsx` — Real-time FPS with color-coded thresholds
- `components/layout/StatusBar.tsx` — Power draw, storage budget, LED count
- `components/layout/PauseButton.tsx` + `hooks/usePauseSystem.ts` — Global animation pause
- `components/layout/SettingsModal.tsx` — Performance tiers, Aurebesh, UI sounds, layout presets
- `lib/themeDefinitions.ts` — 30 theme definitions with material properties
- `hooks/useThemeApplier.ts` — CSS custom property theme application
- `components/editor/SmoothSwingPanel.tsx` — V1/V2 SmoothSwing configuration
- `components/shared/Skeleton.tsx` — Loading skeleton components

### Hardware Default Changes

- Default LED count: 132 → 144 (in `bladeStore.ts` and `BladeHardwarePanel.tsx`)
- Default volume: 2000 → 1500 (in `CodeOutput.tsx`)
- Zoom constrained to 0.9x–1.3x range (was 0.8x–2.0x in `BladeCanvas.tsx`)

## Conventions

- **Files:** PascalCase for components and classes, camelCase for utilities and hooks
- **Exports:** Named exports, no default exports
- **Engine code:** Pure TypeScript, no DOM, no React imports
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`)
- **Branches:** `feat/description`, `fix/description`, `refactor/description`
