# BladeForge Development Guide

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
| `pnpm test` | Run all 398 tests (Vitest) |
| `pnpm test:engine` | Engine tests only |
| `pnpm test:codegen` | Codegen tests only |
| `pnpm lint` | ESLint check |
| `pnpm typecheck` | TypeScript strict mode check |

**Windows shortcut:** Double-click `BladeForge.bat` in the project root to launch the dev server, or use the Desktop shortcut.

## Build Order

The local build script handles dependency ordering automatically:

1. **Engine** first (everything depends on it)
2. **Codegen, Presets, Sound, Boards** in parallel
3. **Web app** last (depends on all packages)

## Project Structure

```
bladeforge/
├── apps/web/              # Next.js 14 App Router
│   ├── app/               # Pages (/, /editor, /s, /docs)
│   ├── components/        # React components
│   │   ├── editor/        # Editor panels (canvas, style, effects, etc.)
│   │   ├── layout/        # App shell, toolbar
│   │   └── shared/        # Reusable UI primitives
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Config I/O, URL encoding, IndexedDB (fontDB)
│   └── stores/            # Zustand stores (blade, UI, userPreset, saberProfile, presetList, audioFont, accessibility, audioMixer)
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
- **engine** — 6 test suites, 398 tests (styles, effects, ignition, easing, LEDArray, BladeEngine)
- **codegen** — AST building, code emission, config generation, template validation

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

BladeForge generates ProffieOS config.h files, but these must be compiled and flashed to the Proffieboard. The toolchain:

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

## Conventions

- **Files:** PascalCase for components and classes, camelCase for utilities and hooks
- **Exports:** Named exports, no default exports
- **Engine code:** Pure TypeScript, no DOM, no React imports
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`)
- **Branches:** `feat/description`, `fix/description`, `refactor/description`
