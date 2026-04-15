# BladeForge

**Visual blade style editor, real-time simulator, and config generator for custom lightsabers.**

Design, preview, and export blade styles for Proffieboard, CFX, Golden Harvest, Verso, Xenopixel, and more. Works on any device — phone, tablet, laptop, or desktop. Installable as a PWA.

## Features

### Blade Engine (42 source files, 398 tests)
- **12 blade styles** — Stable, Unstable, Fire, Pulse, Rotoscope, Gradient, Photon, Plasma, Crystal Shatter, Aurora, Cinder, Prism
- **8 effect types** — Clash, Lockup, Blast, Drag, Melt, Lightning, Stab, Force
- **7 ignition + 5 retraction animations** with 10 easing curves and custom easing support
- Multi-directional layer compositing with per-segment effect scoping
- Headless engine — zero DOM dependencies, runs in browser, tests, or Electron

### Code Generation
- AST-based ProffieOS C++ code emitter — balanced angle brackets, valid template nesting
- Full config.h generation with Layers<>, BlastL<>, InOutTrL<>, transitions, functions
- ProffieOS 7.x compilation validated via arduino-cli (23-preset config, 264 KB / 52% flash)
- Correct `SaberBase::` enum prefixes, `maxLedsPerStrip` placement, `CONFIG_PROP` section separation

### Multi-Board Support (14 boards)
- Proffieboard V2.2, V3.9, Lite, and Clone variants
- CFX, Golden Harvest V3/V4, Verso
- Xenopixel V2/V3, LGT, Asteria, Darkwolf, DamienSaber
- Board capability matrices with compatibility scoring per preset

### Blade Topologies (8 configurations)
- Single, Staff, Crossguard, Triple, Quad-Star, Inquisitor Ring, Split Blade, Accent LEDs
- Per-segment effect scoping, ring rotation, configurable blade lengths (24"–40")

### Sound System
- Sound font parser and Web Audio playback engine
- SmoothSwing pair crossfade simulation
- **13 stackable audio filters** — LP/HP/BP, distortion, reverb, delay, tremolo, chorus, flanger, phaser, bitcrusher, pitch shift, compressor
- Dynamic filter parameters driven by swing speed, blade angle, twist, LFO, or noise
- 6 built-in filter chain presets

### User Presets & Collections
- Save any blade configuration as a reusable preset in your personal library
- Tag, search, sort, duplicate, and organize presets
- Export/import preset collections as `.bladeforge-collection.json` bundles
- Thumbnail auto-capture from the blade canvas

### Font Library
- Directory picker scans your local sound font collection (Chromium browsers)
- Auto-detects format (Proffie, CFX, Generic), SmoothSwing pairs, completeness
- Load, pair with presets, and persist folder selection across sessions via IndexedDB

### Saber Profiles & Card Presets
- Create named saber profiles with multiple card configs ("Dueling Set", "Display Set")
- Card Preset Composer — add from Gallery, My Presets, or current editor state
- 4 built-in starter templates (OT Essentials, Prequel Collection, Dark Side Pack, Dueling Minimalist)
- Storage budget estimation per preset entry with real font sizes when library connected
- SD Card Writer — generate a ZIP with config.h and font directories, ready to extract

### Sharing
- Kyber Code system — compact config URLs with deflate compression + base64url encoding
- Single config, preset collection, and card template import/export

### Accessibility
- Reduced motion auto-sync from OS `prefers-reduced-motion`
- Keyboard-only drag-and-drop alternative (Alt+Arrow keys)
- ARIA labels, focus traps, and color-only indicator text fallbacks
- Responsive grid layouts, 44px minimum touch targets
- 9 scene themes for full UI theming

## Status

### Phase 1 Bug Fixes (Complete)
- Stutter ignition timing corrected
- Crystal Shatter retraction animation fixed
- Photon/pixel render sync resolved
- Responsive breakpoints tuned for mobile and tablet viewports
- Hex color input added to the color panel
- Gallery preset tag contrast improved for readability
- Canvas RGB graph improvements: Y-axis labels, consistent spacing

### ProffieOS Codegen Validation (Complete)
- Generated config.h compiles against ProffieOS 7.x without modification
- 23-preset config compiled successfully (264 KB, 52% of available flash)
- Validated via `arduino-cli` with Proffieboard V3 FQBN

## Quick Start

### Prerequisites
- Node.js 20+ (24.x recommended)
- pnpm 9+ (10.x recommended)

### Install & Run

```bash
pnpm install
pnpm dev:local        # Start dev server (network drive compatible)
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Windows desktop shortcut:** Double-click `BladeForge.bat` in the project root, or use the BladeForge shortcut on your Desktop.

### Network Drive Notes

This project lives on a network share (Z: drive). Standard `pnpm dev` / `pnpm build` use Turbo, which doesn't work well with UNC paths. Use the `:local` variants instead:

```bash
pnpm dev:local        # Dev server without Turbo
pnpm build:local      # Production build without Turbo
```

The `.npmrc` is configured with `node-linker=hoisted` and `symlink=false` for network drive compatibility.

## Development

```bash
pnpm dev:local        # Start dev server (recommended on network drive)
pnpm build:local      # Build all packages + app
pnpm test             # Run all 398 tests (via vitest)
pnpm test:engine      # Engine tests only
pnpm test:codegen     # Codegen tests only
pnpm lint             # ESLint check
pnpm typecheck        # TypeScript check
```

## Architecture

Monorepo powered by pnpm workspaces. Engine-first design — the simulation engine is the source of truth, and the UI is a thin rendering layer.

```
bladeforge/
├── apps/web/              # Next.js 14 web application (App Router)
│   ├── app/               # Pages: landing, editor, share link handler
│   ├── components/        # Editor panels, shared UI, layout
│   ├── hooks/             # useBladeEngine, useAnimationFrame, etc.
│   ├── stores/            # Zustand stores (blade, UI, presets, profiles, audio, accessibility)
│   └── lib/               # Config I/O, Kyber Code encoding, IndexedDB
├── packages/engine/       # Headless blade simulation engine
│   ├── styles/            # 12 style implementations
│   ├── effects/           # 8 effect types
│   ├── ignition/          # 7 ignition + 5 retraction animations
│   ├── functions/         # ProffieOS function emulators
│   └── motion/            # IMU/motion simulation
├── packages/codegen/      # AST-based ProffieOS C++ code generator
├── packages/presets/      # Character preset library (all eras)
├── packages/sound/        # Sound font parser, player, filter chain
├── packages/boards/       # 14 board profiles + compatibility scoring
├── scripts/               # local-build.mjs, local-dev.mjs (no-Turbo runners)
└── docs/                  # Architecture, contributing, ProffieOS reference
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| UI | React 18, Tailwind CSS, Radix UI |
| State | Zustand |
| Rendering | HTML5 Canvas 2D |
| Audio | Web Audio API |
| Code Generation | Custom AST → C++ emitter |
| Storage | IndexedDB (Dexie.js) — fonts, presets, profiles, library handles |
| Testing | Vitest + React Testing Library |
| Build | pnpm workspaces (Turborepo optional) |

## License

MIT
