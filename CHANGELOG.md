# Changelog

All notable changes to KyberStation are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Tracking work on the v1.0 path.

- **Marketing site** (in flight, PR #32): five-page public marketing
  site under `apps/web/app/` — `/features`, `/showcase`, `/changelog`,
  `/faq`, `/community`. Twelve shared marketing components
  (`MarketingShell`, `MarketingNav`, `MarketingHero`,
  `MarketingSection`, `FeatureCard`, `PresetCard`, `ShowcaseGrid`,
  `ChangelogMarkdown`, `ScrollReveal`, `LiveBladePreview`,
  `InlineCodePeek`, `CopyButton`). SEO + social preview
  infrastructure: `sitemap.ts`, `robots.ts`, `siteConfig.ts`,
  `pageMetadata.ts`, `metadataBase` on root layout, real
  192 / 512 / maskable favicons. `/showcase` filters the full
  214-preset library by era / faction / screen-accurate + search.
  `/features` runs four live blades from the real BladeEngine
  inline + a formatted ProffieOS code sample. `/changelog` reads
  this file at build time with 1h revalidation. +44 tests (446
  total). Architecture reference at `docs/MARKETING_SITE.md`.
  **Not deployed yet** — merging this PR only lands the code; the
  kyberstation.com domain + hosting wire-up is separate.
- **v0.11.1 — Design Review Polish Pass** (shipped): alert-color
  discipline, skeleton + error-state coverage, color-glyph pairing for
  accessibility, CHANGELOG + README assets, housekeeping
- **v0.11.2 — Color Naming Math** (shipped): three-tier algorithmic
  naming (landmark + modifier + coordinate-mood) expanding ~120
  curated names into 1,500+ HSL coverage
- **v0.11.3 — Modular Hilt Library** (shipped): 33 reusable line-art
  SVG parts composed into 8 canonical hilt assemblies (Graflex, MPP,
  Negotiator, Count, Shoto Sage, Vented Crossguard, Staff, Fulcrum),
  authored across 3 parallel artist-agents on top of a strict-typed
  composer + `HiltRenderer` with horizontal / vertical orientation. 8
  new SVG hilt options added to the editor's `Hilt` picker (marked
  with ✦)
- **v0.12.0 — Kyber Crystal Three.js renderer** (shipped): full 3D
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

### Branch protection — server-side active

After the KyberStation owner upgraded to GitHub Pro (2026-04-17
afternoon), `pnpm run branch-protection:setup` applied the
`main-protection` ruleset (id `15217927`) on `refs/heads/main`:

- `non_fast_forward` blocks force-push to main
- `deletion` blocks main-branch deletion
- `pull_request` (0 approvals required) blocks direct pushes — all
  changes must go through a PR
- `required_status_checks: build-and-test` requires CI green before
  merge

Client-side `.githooks/pre-push` remains active as defense-in-depth.

### Deferred items (documented, awaiting dedicated pickup)

- Hardware validation of WebUSB flash against real Proffieboard V2.2
  and V3.9 — see `docs/HARDWARE_VALIDATION_TODO.md`
- Real ESLint enforcement across packages (stub lint scripts currently)
- `CANONICAL_DEFAULT_CONFIG` drift-sentinel test pattern
- Shared `<HiltMesh>` extraction between `BladeCanvas3D.tsx` and
  `CrystalRevealScene.tsx`
- Crystal Vault panel (scanned-crystal collection)
- Re-attunement UI for visual-version upgrades
- Favicon replacement from crystal snapshot pipeline
- `SHARE_PACK.md` §4 size-estimate table refresh (current doc understates
  max glyph size; real measurements from PR #20 hit ~490 chars at max)

See `~/.claude/plans/declarative-strolling-dragonfly.md` for the
orchestration plan that scopes the current sprints, and
`docs/SESSION_2026-04-17.md` Part 2 for the full session summary.

## [0.11.2] — 2026-04-17

### Changed

- **Color naming system rewritten** as three-tier algorithmic model in
  new `apps/web/lib/namingMath.ts`. Replaces the 121-entry flat
  lookup in `saberColorNames.ts` with:
  - **Tier 1 — Landmarks** (~147 curated Star Wars character/location
    names) at exact HSL points. Every landmark from the original
    dataset preserved verbatim
  - **Tier 2 — Modifier grammar** (10 modifiers: `Pale`, `Deep`,
    `Vivid`, `Muted`, `Dawn-`, `Dusk-`, `Shadowed`, `Bleached`,
    `Ember-`, `Frost-`) applied to nearby-landmark colors. 147 × 10 =
    1,470+ modifier-expanded names algorithmically
  - **Tier 3 — Coordinate-mood fallback** for colors outside any
    landmark's orbit. Pattern: `{ColourMood} Sector {hex}-{hex}` —
    e.g., `Crimson Sector 4E-92`, `Azurine Outer Rim 6D-F7`
- `saberColorNames.ts` becomes a thin shim that re-exports
  `getSaberColorName` from `namingMath.ts`. No call sites need to
  change; every caller stays working.

### Fixed

- Every possible RGB now returns a distinctive, evocative name. Zero
  "Unknown Crystal" fallbacks across the full HSL space.
- Minute color adjustments no longer produce repeated names — modifier
  layers discriminate between neighboring hues.

### Notes

- All existing tests still pass (backward-compatible signature)
- New test suite (`namingMath.test.ts`) covers landmark preservation,
  modifier-trigger boundaries, coordinate-mood stability, and
  1000-sample coverage

---

## [0.11.3] — 2026-04-17

### Added

- **Modular hilt library** (`apps/web/lib/hilts/`) — a composable
  parts + assemblies architecture. Every hilt is an ordered stack of
  discrete parts (emitter, shroud, switch, grip, pommel, accent-ring)
  that mate via three interface-diameter classes (narrow 1.0",
  standard 1.25", wide 1.5"). 33 original MIT-licensed line-art SVG
  parts ship across 5 type directories.
- **8 canonical assemblies** curated from the parts: `graflex`,
  `mpp`, `negotiator`, `count`, `shoto-sage`, `ren-vent` (5-part
  crossguard including the quillon), `zabrak-staff` (double-emitter
  saberstaff), and `fulcrum-pair` (dual-shoto compact).
- **`HiltRenderer`** (`apps/web/components/hilt/HiltRenderer.tsx`) —
  pure React inline SVG renderer with opaque metal-gradient body +
  line-art detail strokes. Supports `vertical` (emitter up) and
  `horizontal` (emitter right) orientations via internal viewBox
  rotation.
- **Editor integration** — 8 new `✦`-tagged options in the Hilt
  picker route through the SVG renderer overlay, coexisting with
  the 9 existing canvas-primitive hilts as a zero-risk addition.
- **Authoring docs** — `docs/HILT_PART_SPEC.md` (canvas, connectors,
  palette, file structure) and `docs/HILT_STAGE_2_BRIEFING.md` (the
  3-agent parallel fan-out plan) define the contribution path for
  community-PR'd parts.

### Tested

- 18 tests across `hiltComposer.test.ts` and `hiltCatalog.test.ts`
  — composition stacking, connector strict + permissive modes,
  emitter tracking, catalog conformance (canvas width 48, connector
  cx=24), per-part spec validation, and round-trip composition of
  every shipped assembly.

### Legal

- All shipped SVG parts are original hand-drawn line art, MIT
  under the same licence as the rest of the project. Reference
  commercial packs used only on-device during authoring — never
  redistributed.

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
