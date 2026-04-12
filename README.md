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
- Guaranteed compilable output for Arduino IDE with Proffieboard board manager

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

### Sharing
- Kyber Code system — compact config URLs with deflate compression + base64url encoding

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
│   └── lib/               # Zustand store, config I/O, Kyber Code encoding
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
| Storage | IndexedDB (via Dexie.js) |
| Testing | Vitest + React Testing Library |
| Build | pnpm workspaces (Turborepo optional) |

## License

MIT
