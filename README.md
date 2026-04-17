# KyberStation

[![CI](https://github.com/kenkoller/KyberStation/actions/workflows/ci.yml/badge.svg)](https://github.com/kenkoller/KyberStation/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/CONTRIBUTING.md)

**Visual blade style editor, real-time simulator, and config generator for custom lightsabers.**

Design, preview, and export blade styles for Proffieboard, CFX, Golden Harvest, Verso, Xenopixel, and more. Works on any device — phone, tablet, laptop, or desktop. Installable as a PWA.

> Think "DAW for lightsabers" — if GarageBand let you design blade animations instead of music tracks.

## Features

### Blade Engine (82+ source files, 398+ tests)
- **29 blade styles** — Stable, Unstable, Fire, Pulse, Rotoscope, Gradient, Photon, Plasma, Crystal Shatter, Aurora, Cinder, Prism, Painted, Image Scroll, Gravity, Data Stream, Ember, Automata, Helix, Candle, Shatter, Neutron, Torrent, Moire, Cascade, Vortex, Nebula, Tidal, Mirage
- **21 effect types** — Clash, Lockup, Blast, Drag, Melt, Lightning, Stab, Force, Shockwave, Scatter, Fragment, Ripple, Freeze, Overcharge, Bifurcate, Invert, Ghost Echo, Splinter, Coronary, Glitch Matrix, Siphon
- **19 ignition + 13 retraction animations** with 10 easing curves and custom easing support
- Multi-directional layer compositing with per-segment effect scoping
- Headless engine — zero DOM dependencies, runs in browser, tests, or Electron

### Code Generation
- AST-based ProffieOS C++ code emitter — balanced angle brackets, valid template nesting
- Full config.h generation with Layers<>, BlastL<>, InOutTrL<>, transitions, functions
- ProffieOS 7.x compilation validated via arduino-cli (23-preset config, 264 KB / 52% flash)
- Correct `SaberBase::` enum prefixes, `maxLedsPerStrip` placement, `CONFIG_PROP` section separation

### Multi-Board Support (16 boards)
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
- Export/import preset collections as `.kyberstation-collection.json` bundles
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

### Desktop Workbench Layout
- Horizontal blade canvas with multi-column panel workspace below
- Responsive 1–4 column grid (adapts to viewport width)
- Drag-and-drop panel reordering between columns via HTML5 DnD
- Saveable layout presets — create, load, delete custom arrangements
- Header bar with undo/redo, FPS counter, share (Kyber Code), global pause, settings

### Visualization Stack & Debug Mode
- 13 toggleable analysis layers below the blade canvas (pixel strip, R/G/B channels, luminance, power draw, hue, saturation, effect overlay, swing response, transition progress, storage budget)
- Per-pixel debug overlay: hover for RGB/hex/HSL/mA/SW color name, click to pin info cards, range selection
- Visualization toolbar with quick-toggle icons for each layer

### Fullscreen Preview
- Immersive blade preview with auto-hiding controls
- Horizontal and vertical blade orientations
- Mobile device motion support (accelerometer/gyroscope drives swing speed and blade angle)
- Full keyboard shortcut support for effect triggers

### Settings & Customization
- Performance tiers: Full, Medium, Lite (via CSS class system)
- Aurebesh mode: Off, Labels, Full (toggle all UI text to Star Wars script)
- UI sounds: Star Wars-style beep/chirp feedback with Web Audio synthesis (default off)
- 30 scene themes (9 base + 21 extended) with material, corner, border, and ambient properties
- Global pause toggle freezes all animations app-wide
- Undo/redo with 50-entry history and human-readable labels

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

### Phase 4-5: UI Redesign & New Effects (Complete)
- Desktop workbench layout with responsive multi-column panels replacing sidebar
- Visualization stack with 13 analysis layers and per-pixel debug mode
- 24 new engine effects (Phase 4): 8 styles, 7 effects, 5 ignitions, 4 retractions
- Fullscreen preview with device motion support for mobile
- Global pause system, undo/redo history, share via Kyber Code URLs
- Settings modal with performance tiers, Aurebesh mode, UI sounds, layout presets
- Hardware defaults corrected: LED count 132→144, volume 2000→1500, zoom constrained
- 30 scene themes with material/corner/border CSS properties

### Phase 6: Engine Expansion (Complete)
- 13 new engine components: 7 styles (Torrent, Moire, Cascade, Vortex, Nebula, Tidal, Mirage), 6 effects (Invert, Ghost Echo, Splinter, Coronary, Glitch Matrix, Siphon), 3 ignitions (Hyperspace, Summon, Seismic), 3 retractions (Implode, Evaporate, Spaghettify)
- Engine totals: 29 styles, 21 effects, 19 ignitions, 13 retractions (82 animation components)

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+

### Install & Run

```bash
git clone https://github.com/kenkoller/KyberStation.git
cd KyberStation
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

```bash
pnpm dev              # Start dev server
pnpm build            # Build all packages + app
pnpm test             # Run all tests (Vitest)
pnpm test:engine      # Engine tests only
pnpm test:codegen     # Codegen tests only
pnpm lint             # ESLint check
pnpm typecheck        # TypeScript strict check
```

## Architecture

Monorepo powered by pnpm workspaces. Engine-first design — the simulation engine is the source of truth, and the UI is a thin rendering layer.

```
kyberstation/
├── apps/web/              # Next.js 14 web application (App Router)
│   ├── app/               # Pages: landing, editor, share link handler
│   ├── components/        # Editor panels, shared UI, layout
│   ├── hooks/             # useBladeEngine, useAnimationFrame, etc.
│   ├── stores/            # Zustand stores (13 total: blade, UI, layout, visualization, history, presets, profiles, audio, mixer, accessibility, theme)
│   └── lib/               # Config I/O, Kyber Code encoding, IndexedDB
├── packages/engine/       # Headless blade simulation engine
│   ├── styles/            # 29 style implementations
│   ├── effects/           # 21 effect types
│   ├── ignition/          # 19 ignition + 13 retraction animations
│   ├── functions/         # ProffieOS function emulators
│   └── motion/            # IMU/motion simulation
├── packages/codegen/      # AST-based ProffieOS C++ code generator
├── packages/presets/      # Character preset library (all eras)
├── packages/sound/        # Sound font parser, player, filter chain
├── packages/boards/       # 16 board profiles + compatibility scoring
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

## Contributing

Contributions are welcome! Please read the [Contributing Guide](docs/CONTRIBUTING.md) before submitting a PR.

- **Bug reports** — [File an issue](https://github.com/kenkoller/KyberStation/issues/new?template=bug_report.md)
- **Feature requests** — [File an issue](https://github.com/kenkoller/KyberStation/issues/new?template=feature_request.md)
- **New blade styles or presets** — [File a style request](https://github.com/kenkoller/KyberStation/issues/new?template=style_request.md)
- **Questions & discussion** — [GitHub Discussions](https://github.com/kenkoller/KyberStation/discussions)

Please note that this project follows a [Code of Conduct](CODE_OF_CONDUCT.md).

## License

**KyberStation** itself is [MIT](LICENSE)-licensed.

### Upstream acknowledgements

- **ProffieOS** (the firmware this tool targets) is licensed under
  [GNU GPL-3.0](LICENSES/ProffieOS-GPL-3.0.txt). KyberStation does not
  contain any ProffieOS source code; it emits C++ configs intended to be
  compiled *into* ProffieOS. When a user compiles a generated config and
  distributes the resulting firmware, GPL-3.0 obligations apply to that
  combined work — most importantly, the Corresponding Source (including
  the generated config) must be made available to recipients.
  KyberStation's emitter includes a GPL-3.0 attribution header in every
  generated `config.h` to make this relationship explicit.
- **Community style snippets** committed under
  `packages/codegen/tests/fixtures/fett263/` are GPL-3.0 derivatives of
  ProffieOS examples (mostly Fett263's published style library). They are
  kept in a dedicated subdirectory with their own attribution comments;
  see that folder's `README.md` for the contribution policy. The rest of
  KyberStation remains MIT.

### Credits

- [ProffieOS](https://github.com/profezzorn/ProffieOS) by Fredrik Hübinette
- [Fett263's Style Library](https://fett263.com/) — community configs and
  the dual-mode ignition / edit-mode conventions this tool targets
