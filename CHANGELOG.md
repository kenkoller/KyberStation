# Changelog

All notable changes to KyberStation are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Tracking work on the v1.0 path. Current in-flight sprints:

- **v0.11.1 — Design Review Polish Pass** (this release): alert-color
  discipline, skeleton + error-state coverage, color-glyph pairing for
  accessibility, CHANGELOG + README assets, housekeeping
- **v0.11.2 — Color Naming Math** (upcoming): three-tier algorithmic
  naming (landmark + modifier + coordinate-mood) expanding ~120
  curated names into 1,500+ HSL coverage
- **v0.12.0 — Kyber Crystal Three.js renderer** (upcoming): full 3D
  crystal component with PBR materials, 5 procedural Forms, bleed +
  heal + first-discovery animations, scannable QR embedded, card
  snapshot pipeline
- **v0.13.0 — Kyber Forge ultra-wide mode** (planned): dedicated
  layout for 21:9 / 32:9 / 32:10 displays
- **v0.14.0 — Preset Cartography** (planned): multi-agent preset
  expansion across deep-cut lanes (Prequel/OT/Sequel, Legends/KOTOR,
  Clone Wars, Mando/Ahsoka, cross-franchise)
- **v0.15.0 — Multi-Blade Workbench** (planned): channel-strip UI for
  editing dual-blade / saberstaff / crossguard sabers (glyph format
  already supports multi-blade from v1)

See `~/.claude/plans/declarative-strolling-dragonfly.md` for the
orchestration plan that scopes these sprints.

---

## [0.11.1] — 2026-04-17

### Added

- `ErrorState` shared component (`apps/web/components/shared/ErrorState.tsx`)
  with 4 variants (`load-failed`, `parse-failed`, `save-failed`,
  `import-failed`) + optional retry callback + compact-mode rendering
- `StatusSignal` shared component (`apps/web/components/shared/StatusSignal.tsx`)
  pairing status colors with typographic glyphs (●/◉/✓/▲/⚠/✕) for
  colorblind accessibility, with era and faction monogram variants
- CHANGELOG.md documenting the full release history
- `docs/images/landing-hero.png` — live-engine landing screenshot
  referenced from `README.md` above the feature list
- `--faction-sith-deep` and `--faction-jedi-deep` tokens for
  gradient-stop use in `.sw-sith-text` / `.sw-jedi-text`

### Changed

- **Alert-color discipline** — replaced raw `#ff4444` and
  `rgba(255, 60, 60, ...)` in `apps/web/app/globals.css` with theme
  tokens:
  - `.era-sequel` and all era classes now use `rgb(var(--era-*))`
    tokens
  - `@keyframes retract-breathe` now uses `rgb(var(--badge-creative))`
    amber — the retract button is a warning, not an error
  - `.console-alert` now uses `rgb(var(--status-error))` — still red
    (it IS an alert), but tokenised so colorblind theme overrides flow
    through
- Status indicators across `StatusBar.tsx`, `PresetGallery.tsx`,
  `PowerDashboard.tsx`, and `EngineStats.tsx` now pair color with
  `StatusSignal` glyphs (FPS performance bucket, system-status
  indicator, power draw)
- Async-boundary panels across the editor now show `<Skeleton>`
  during loading and `<ErrorState>` on failure (previously: blank
  panels or silent failures)
- `.sw-sith-text` / `.sw-jedi-text` gradient stops routed through
  `rgb(var(--faction-*))` tokens instead of raw hex
- Raw `#22c55e` / `#eab308` / `#ef4444` in `PowerDashboard.tsx` and
  `EngineStats.tsx` replaced with `rgb(var(--status-ok/warn/error))`
  so colorblind + theme overrides flow through

### Fixed

- Era badges in PresetGallery now honour theme overrides (e.g.,
  colorblind palette) instead of rendering raw hex
- Retract-button pulse no longer conflates "action in progress" with
  "error state"

### Infrastructure

- Deleted empty orphan directories: `packages/codegen/src/sharing/`,
  `apps/web/components/sharing/`
- Verified `**/.DS_Store` in root `.gitignore` (already present; no
  tracked files found)

### Notes

- Third-party R/G/B-channel visualization renders in `BladeCanvas.tsx`,
  `VisualizationStack.tsx`, `RGBGraphPanel.tsx`, and
  `visualizationTypes.ts` intentionally keep raw red/green/blue hex
  colors — those represent the literal RGB channels being visualized,
  not alert semantics
- `TimelinePanel.tsx` event-type category colors (ignite/retract/
  clash/blast/etc.) stay as raw hex — these are distinct identity
  colors paired with text labels, not alert semantics. Tokenising
  these would be identity coupling, not accessibility
- **Lint enforcement** (originally scoped for this sprint as Phase C4)
  is deferred. ESLint is not currently in `devDependencies`; activating
  it would surface hundreds of preexisting issues and is worth its own
  sprint with a clear scope for how to handle them (fix vs
  `// eslint-disable-next-line`). Tracked as a follow-up

---

## [0.11.0] — 2026-04-17

### Added — WebUSB Flash

- Full STM32 DfuSe protocol library for flashing Proffieboard firmware
  directly from the browser via WebUSB
- `FlashPanel.tsx` UI with "use at your own risk" disclaimer gate,
  per-session acknowledgement
- Firmware variants pre-built via GitHub Actions CI:
  `firmware-configs/v3-standard.h`, `v3-oled.h`, `v2-standard.h`
- Read-back verification after flash to confirm write success
- Dry-run mode for testing protocol logic without actually flashing
- 43 mock-USB tests covering the DFU state machine
- `docs/WEBUSB_FLASH.md` technical reference documentation
- `docs/HARDWARE_VALIDATION_TODO.md` pending-validation checklist

### Changed

- Landing page (`/`) now a real landing with blade hero + value strip +
  CTAs + release strip + footer, replacing the redirect stub

### Notes

- `v0.11.0` is NOT yet tagged — pending hardware validation against
  real Proffieboard V3.9 devices before promoting to release

---

## [0.10.0] — 2026-04-17

### Added — Long-tail cleanup

- Spatial positioning for drag, melt, and stab effects (joining lockup
  and blast from v0.3.0)
- Parser warnings channel (non-fatal diagnostics for unknown templates
  + arg-count mismatches)
- Font pairing polish: keyword-based scoring, "Recommended /
  Compatible" labels in SoundFontPanel

### Architecture

- `packages/codegen/src/astBinding.ts` — six-seam façade for config ↔
  AST ↔ code transformations
- `packages/codegen/src/transitionMap.ts` — single source of truth for
  ignition/retraction ID ↔ AST mappings (fixed pre-existing
  `standard ↔ scroll` round-trip swap)
- Lexer now consumes `::` tokens (fixes `SaberBase::LOCKUP_NORMAL`
  misreading as 5 args)

---

## [0.9.1] — 2026-04-17

### Fixed — Validation + polish

- **Critical data-loss fix**: Import → Apply round-trip no longer
  silently drops spatial, Preon, and extended-color fields
- Mobile companion route now carries preset ID to editor via
  `?preset=` query
- Theme-token compliance: replaced `accent-[var(--color-accent)]`
  no-ops with real Tailwind classes across 4 components

---

## [0.9.0] — 2026-04-17

### Added — Mobile companion route

- `/m` route with 12 curated canonical presets
- Swipe navigation
- Deep-link into full editor via preset ID

---

## [0.8.0] — 2026-04-17

### Added — Audio-visual sync

- `useAudioSync` hook feeding motion swing → audio pitch/volume
- SmoothSwing V1/V2 pair crossfading
- Motion-driven audio envelope ripples through the blade render

---

## [0.7.0] — 2026-04-17

### Added — Timeline easing curves

- 8 named easing curves (linear, easeIn, easeOut, easeInOut, bounce,
  elastic, dramatic, smooth)
- Inline SVG preview of each curve in the TimelinePanel
- SSR-safe `easingMath.ts` pure-function module

---

## [0.6.0] — 2026-04-17

### Added — Prop file visual UI

- 5 prop file presets (Fett263, SA22C, BC, Shtok, default)
- Button-action map reference table with gesture icons

---

## [0.5.0] — 2026-04-17

### Added — Sound font pairing + crystal reactive glow

- Keyword-based sound font scoring against blade config
- "Recommended / Compatible" pairing labels
- `--crystal-accent` CSS var follows `baseColor` for themed UI accents
- `useCrystalAccent` hook publishing the accent

---

## [0.4.0] — 2026-04-17

### Added — Saber Wizard (guided onboarding)

- 3-step onboarding modal: archetype → colour → vibe
- 5 archetypes, curated colour swatches, 4 vibe presets
- AutoFocus on first archetype button for keyboard users

---

## [0.3.1] — 2026-04-17

### Added

- Blade-accurate colour rendering (Neopixel gamma + diffusion preview)
- Preon engine preview animation
- Spatial blast placement polish

---

## [0.3.0] — 2026-04-17

### Added — Preon editor + spatial blast

- `TransitionEffectL<…, EFFECT_PREON>` emission + engine preview
- Spatial blast position + radius round-trip through `Bump`

---

## [0.2.2] — 2026-04-17

### Added

- GPL-3.0 attribution for ProffieOS upstream
- `LICENSES/ProffieOS-GPL-3.0.txt` with full license text
- README aggregate-work separation documentation

---

## [0.2.1] — 2026-04-17

### Added — Polish

- Dual-mode ignition (`TrSelect` with saber-up / saber-down variants)
- `detectStyle` heuristic for imported configs
- UI theme tokens rationalised across panels

---

## [0.2.0] — 2026-04-17

### Added — WYSIWYG Edit Mode + Spatial Lockup

- Click on blade → moves caret, updates config, re-emits code
- `AlphaL<LockupTrL<…>, Bump<Int<pos>, Int<size>>>` spatial lockup
  round-trip

---

## [0.1.0] and earlier — Foundational phases

Pre-v0.2.0 work focused on building the core architecture:

- Monorepo setup (Turborepo + pnpm workspaces)
- Engine-first architecture (`packages/engine`)
- AST-based code generation (`packages/codegen`)
- 29 blade styles, 21 effects, 19 ignitions, 13 retractions
- Multi-column workbench layout with visualization stack
- 30 canvas themes (9 base + 21 extended)
- IndexedDB persistence via Dexie

See the full history in `git log --oneline` for implementation
commit details.

---

## Release tagging convention

- Tags use `vX.Y.Z` format (e.g., `v0.10.0`, `v0.11.0`)
- Each release has a corresponding `feat/vX.Y.Z-*` feature branch that
  squash-merges to main
- GitHub releases include a release notes summary and any relevant
  build artefacts (firmware binaries for v0.11.x, for example)

## Related planning documents

- `CLAUDE.md` — project context + roadmap matrix
- `~/.claude/plans/declarative-strolling-dragonfly.md` — current
  multi-sprint orchestration plan
- `~/.claude/plans/i-m-curious-what-the-glistening-island.md` — design
  review plan that spawned v0.11.1
- `docs/KYBER_CRYSTAL_VISUAL.md`, `docs/KYBER_CRYSTAL_NAMING.md`,
  `docs/KYBER_CRYSTAL_VERSIONING.md`, `docs/SHARE_PACK.md` — Kyber
  Crystal + Saber Card design specs
- `docs/COMMUNITY_GALLERY.md` — GitHub-PR community gallery spec
- `docs/WEBUSB_FLASH.md` + `docs/HARDWARE_VALIDATION_TODO.md` — WebUSB
  reference + hardware validation pending list
