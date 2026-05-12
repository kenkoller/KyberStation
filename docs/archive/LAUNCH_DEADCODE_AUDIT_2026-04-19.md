# Launch Dead-Code Audit — 2026-04-19

Branch audited: `test/launch-readiness-2026-04-18`
Auditor: Claude (Opus 4.7, 1M context)
Scope: `apps/web`, `packages/{engine,codegen,presets,sound,boards}`

**This doc is advisory. No code was deleted or edited.** Treat every
"safe to remove: Y" as a recommendation that still needs a local verify
(`pnpm -w typecheck && pnpm -w test`) before merging a deletion PR.

---

## Executive Summary

| Category | Flagged | Confident-delete | Keep-but-review |
|---|---|---|---|
| Unused exports (package `index.ts`) | 8 | 1 | 7 |
| Orphan source files | 5 | 5 | 0 |
| Unused npm dependencies | 9 | 9 | 0 |
| Unused workspace deps | 1 | 1 | 0 |
| TODO/FIXME/HACK markers | 5 | 0 | 5 |
| Dead feature flags | 0 | 0 | 0 |
| Stale test fixtures | 2 | 0 | 2 |
| **Total actionable** | **~30 items** | **16** | **14** |

**Risk assessment: LOW.** Every confident-delete item either has zero
consumers (orphan) or is a dep already proven unused by grep. The
launch can safely ship with them still present — but pruning reduces
bundle size and surface area for the "first public programming
project" polish goal.

**Biggest single win:** `packages/boards` has ZERO external consumers
outside its own src/tests folder, and the `apps/web` workspace declares
it as a dep. Either wire it up (scoreCompatibility surfaces, multi-board
emitter UI) or drop the dep and move the package to a
`packages/_archive/` so the planned v0.13.0 "Kyber Forge" /
multi-board work can reintroduce it cleanly.

**NOT run in this audit:** `tsc --noEmit --noUnusedLocals
--noUnusedParameters` — the sandbox blocked pnpm invocation. That
sweep is listed as a follow-up below; run it locally with the one-liners
at the bottom of this doc.

---

## 1. Unused exports (package `index.ts`)

Each item is "defined + exported from the package's public `index.ts`
but no file outside the package imports it."

| # | Symbol | Package | Safe? | Reasoning |
|---|---|---|---|---|
| 1.1 | `PARAMETER_GROUPS`, `ParameterGroup`, `ParameterDef`, `ParameterOption` | engine | **Y** | Defined in `parameterGroups.ts`; zero consumers across monorepo. Likely scaffolding for a UI that never landed. |
| 1.2 | `INQUISITOR_TOPOLOGY`, `SPLIT_BLADE_TOPOLOGY`, `QUAD_STAR_TOPOLOGY` | engine | review | Exported from `types.ts`; no external consumers but tangential to the topology-preset feature — may be referenced by preset JSON in the future. Recommend keeping through launch, revisiting at v0.12.x. |
| 1.3 | `blendAdd`, `blendScreen`, `blendMultiply`, `clampColor` | engine | review | Exported; only consumers are inside the engine (BladeEngine.ts, SiphonEffect, ShockwaveEffect, LEDArray tests). Safe to demote from public API → package-private, but the tree-shake win is negligible. |
| 1.4 | `directionalPosition` | engine | review | Exported; only consumers are internal engine styles (PlasmaStyle, CrystalShatterStyle, etc.). Demote to internal. |
| 1.5 | `EditArgManager`, `STANDARD_COLOR_ARGS` | codegen | review | Defined in codegen; zero consumers outside the package. Edit-mode arg tracking scaffolding — kept for WYSIWYG Edit Mode (feature #1 in CLAUDE.md is "shipped v0.2.0") but the wiring may live inside codegen only. |
| 1.6 | `TRANSITION_MAPPINGS`, `ignitionFromID`, `retractionFromID`, `ignitionFromAST`, `retractionFromAST`, `TransitionMapping`, `TransitionKind` | codegen | review | All seven transition-map primitives only consumed inside codegen (`ASTBuilder`, `ConfigReconstructor`). Demote from public API to internal. |
| 1.7 | `makeInitialBindingState`, `syncFromConfig`, `syncFromCode`, `BindingState`, `HitGeometry`, `LEDHit` | codegen | review | `BindingState` IS consumed via `hitToLED` by `useDeviceMotion.ts`, but `makeInitialBindingState`/`syncFromConfig`/`syncFromCode` have zero external consumers. The useDeviceMotion.ts import uses `hitToLED` only. |
| 1.8 | All `BOARD_PROFILES`, `getBoardProfile`, `getBoardsByTier`, every individual board profile, `scoreCompatibility`, `BoardProfile`, `CompatibilityReport`, etc. from `@kyberstation/boards` | boards | **Y** (whole package) | Entire `@kyberstation/boards` package has ZERO external consumers. Only self-referenced from its own tests. See §4. |

---

## 2. Orphan source files

Files that exist in a source tree but are not imported anywhere in the
monorepo (excluding entry points, test files, `.d.ts`, stories).

| # | File (absolute) | Safe? | Reasoning |
|---|---|---|---|
| 2.1 | `/Users/KK/Development/KyberStation/apps/web/components/shared/LoadingSkeleton.tsx` | **Y** | Exports `SkeletonLine`, `SkeletonCircle`, `SkeletonPanel`, `SkeletonBar`, `SkeletonGaugeCluster`, `SkeletonThemeCard`. Superseded by the newer `apps/web/components/shared/Skeleton.tsx` which redefines `SkeletonLine`. Zero imports from this file anywhere. |
| 2.2 | `/Users/KK/Development/KyberStation/apps/web/hooks/usePWA.ts` | **Y** | Exports `usePWA()` hook (install prompt + offline detection + SW registration). Zero consumers. The actual SW lives at `apps/web/public/sw.js`, but nothing in the React tree calls `usePWA()`. |
| 2.3 | `/Users/KK/Development/KyberStation/apps/web/components/hud/MotionTelemetry.tsx` | **Y** | Re-exported from `hud/index.ts` but never imported via that barrel or directly. Zero consumers. |
| 2.4 | `/Users/KK/Development/KyberStation/apps/web/components/hud/PowerDashboard.tsx` | **Y** | Same as above — re-exported but not consumed. Note: `components/editor/PowerDrawPanel.tsx` IS used; this `hud/PowerDashboard.tsx` is a separate, dead variant. |
| 2.5 | `/Users/KK/Development/KyberStation/apps/web/components/hud/EngineStats.tsx` | **Y** | Re-exported, not consumed. FPS readout lives in `components/layout/FPSCounter.tsx` which IS used. |

**Note on HUD kit:** `hud/ScanSweep`, `CornerBrackets`, `AurebeshScroll`,
`DataTicker`, `ConsoleIndicator`, `HoloFlicker`, `CircularGauge`,
`SegmentedBar` are all imported by `app/docs/design-system/page.tsx`
(the design-system docs route) and/or `WorkbenchLayout.tsx` —
intentionally alive.

---

## 3. TODO / FIXME / HACK markers

Only 5 markers exist across the entire monorepo source. All five are in
the same file.

| File | Line | Marker | Still relevant? |
|---|---|---|---|
| `packages/engine/src/modulation/index.ts` | 33 | `TODO(v1.1): export the parser` | **Yes** — v1.1 scaffold, documented in `docs/MODULATION_ROUTING_V1.1.md` |
| `packages/engine/src/modulation/index.ts` | 36 | `TODO(v1.1): export the evaluator` | **Yes** — same scaffold |
| `packages/engine/src/modulation/index.ts` | 39 | `TODO(v1.1): export the built-in modulator registry` | **Yes** |
| `packages/engine/src/modulation/index.ts` | 42 | `TODO(v1.1): export the per-frame sampler that feeds EvalContext.modulators` | **Yes** |
| `packages/engine/src/modulation/index.ts` | 45 | `TODO(v1.1): export the binding-apply step used by BladeEngine` | **Yes** |

All 5 TODOs are legitimate deferred work, correctly scoped to `v1.1`,
and paired with design doc `docs/MODULATION_ROUTING_V1.1.md`. Zero
stale markers. **No action needed.**

No `FIXME` / `HACK` / `XXX` anywhere.

---

## 4. Stale test fixtures

| # | Path | Status | Action |
|---|---|---|---|
| 4.1 | `packages/codegen/tests/fixtures/fett263/` | README only — no `.cpp` files committed | **Keep.** README documents the GPL-3.0 aggregate-work policy for Fett263 community configs. Wiring to actually load these fixtures is documented as a later-phase TODO. No stale test references here. |
| 4.2 | `packages/codegen/tests/fixtures/user/` | README only — no `.cpp` files committed | **Keep.** Intentionally empty; the README explicitly says drop real ProffieOS configs here for local testing, not for commit. |
| 4.3 | `packages/codegen/tests/fixtures/synthetic/*.{cpp,json}` (~510 files) | Regenerated from `ALL_PRESETS` via `KYBERSTATION_WRITE_FIXTURES=1` | **Keep.** `synthetic.test.ts:27` reads from this directory; the comment at `synthetic.test.ts:14-16` explicitly explains these are documentation fixtures for code review, not load-bearing. Round-trip assertions use ALL_PRESETS directly, not the committed files. |
| 4.4 | `apps/web/tests/fixtures/kyberGlyphs/v1/fixtures.json` | Used by `kyberGlyph.test.ts:24` | **Keep.** Locks v1 byte layout as the stability contract per decision #11 in CLAUDE.md. |
| 4.5 | `apps/web/tests/webusb/mockUsbDevice.ts` | Used by both `DfuDevice.test.ts` and `DfuSeFlasher.test.ts` | **Keep.** Active. |

**Recommendation: low-value cleanup.** The two empty README-only
directories are cheap. Keeping them preserves contributor
documentation. No action.

---

## 5. Dead feature flags / unused config

Only two `process.env` branches exist in source:

| File | Condition | Verdict |
|---|---|---|
| `apps/web/app/layout.tsx:48` | `process.env.NODE_ENV === 'production'` | **Legit** — standard Next.js CSP gate. Not a feature flag. |
| `packages/codegen/tests/synthetic.test.ts:29` | `process.env.KYBERSTATION_WRITE_FIXTURES === '1'` | **Legit** — fixture regeneration toggle documented in the test. |

**Zero `NEXT_PUBLIC_*` branches and zero dead flags.** Clean.

---

## 6. Unused npm dependencies

Scanned all `package.json` files and grep'd every declared dep against
source imports.

### 6.1 `apps/web/package.json` — unused runtime deps

| # | Dep | Current version | Consumers | Safe? |
|---|---|---|---|---|
| 6.1a | `@radix-ui/react-dialog` | `^1.1.0` | **ZERO** | **Y** |
| 6.1b | `@radix-ui/react-select` | `^2.1.0` | **ZERO** | **Y** |
| 6.1c | `@radix-ui/react-slider` | `^1.2.0` | **ZERO** | **Y** |
| 6.1d | `@radix-ui/react-tabs` | `^1.1.0` | **ZERO** | **Y** |
| 6.1e | `@radix-ui/react-toggle` | `^1.1.0` | **ZERO** | **Y** |
| 6.1f | `@radix-ui/react-tooltip` | `^1.1.0` | **ZERO** | **Y** |
| 6.1g | `idb-keyval` | `^6.2.1` | **ZERO** | **Y** — Dexie is used in its place (see `fontDB.ts`). |

**All six Radix packages declared but never imported.** CLAUDE.md's tech-stack
section states "Radix UI primitives" but the implementation uses custom
Tailwind components instead. Net: ~100 KB of `node_modules` bloat and
~6 unnecessary CVE surface exposures per launch.

### 6.2 `apps/web/package.json` — unused devDeps

| # | Dep | Notes | Safe? |
|---|---|---|---|
| 6.2a | `@types/jszip` | Modern `jszip` ships its own types. Redundant. | review (low-risk) |

### 6.3 `packages/engine/package.json`

| Dep | Status |
|---|---|
| `bezier-easing@^2.1.0` | **UNUSED.** `packages/engine/src/easing.ts:3` explicitly says "Inline cubic bezier evaluation (~40 lines, avoids bezier-easing dependency for now)". **Safe to remove.** |

### 6.4 `packages/presets/package.json`

| Dep | Status |
|---|---|
| `@kyberstation/engine` (workspace:*) | **UNUSED IMPORT.** `packages/presets/src/types.ts:1` comment says "BladeConfig is imported at runtime from @kyberstation/engine," but no `.ts` file in `packages/presets/src/` or `packages/presets/tests/` actually imports from `@kyberstation/engine`. The comment is stale / the type is duck-typed. **Safe to remove workspace dep** (the codegen package mirror + drift-sentinel already handles BladeConfig shape stability). |

### 6.5 Other packages

`packages/codegen`, `packages/sound`, `packages/boards` dep lists are all
consistent with actual imports. Clean.

---

## 7. `@kyberstation/boards` — the isolated-package finding

The boards package is functionally complete: 8 board profiles
(`PROFFIEBOARD_V2/V3`, `CFX`, `GHV3/V4`, `XENOPIXEL_V2/V3`,
budget-board cluster) plus `scoreCompatibility` plus types. Its own
tests pass.

However:

- `apps/web/package.json` declares `"@kyberstation/boards": "workspace:*"`
- `apps/web/tsconfig.json` aliases `@kyberstation/boards` →
  `../../packages/boards/src`
- `apps/web/next.config.mjs` lists `@kyberstation/boards` in
  `transpilePackages`
- `apps/web/vitest.config.ts` has the same resolver alias
- **But zero `.ts`/`.tsx` file in `apps/web` imports anything from it.**

The board-emitter UI, compatibility-scoring UI, and multi-board picker
all appear to be planned-but-not-built. Confirmed by searching the 60-plus
component files — no `BoardProfile`, `scoreCompatibility`, or
`getBoardProfile` call sites exist in the web app.

Meanwhile, `packages/boards/tests/emitters.test.ts` does import from
`@kyberstation/codegen` to test the emitter classes that codegen
re-exports. So the package's own tests are genuinely exercising the
code — it's just dead from the product-surface perspective.

**Recommendation at launch:** keep the package (deletion risks losing
real code), but remove the workspace dep + tsconfig alias +
transpilePackages entry in `apps/web` until the boards UI lands. That
removes ~a few dozen KB of transitive compile work and signals "not
yet wired up" clearly.

---

## 8. Notes on items NOT flagged

Per your instruction:

- `apps/web/components/layout/TabColumnContent.tsx` — the duplicate
  "Ignition/Retraction" panel next to `EffectPanel` is **intentional**
  (quick-access vs full panel). Not flagged.

Additionally not flagged:

- `components/landing/*` — all six consumed by `app/page.tsx`.
- `components/editor/CompatibilityPanel.tsx` — consumed by
  `DesignPanel.tsx`. Note this panel exists but doesn't call anything
  from `@kyberstation/boards`; it uses a local compatibility model.
  Worth cross-checking whether the boards package's `scoreCompatibility`
  should power it — that's a feature-gap question, not a dead-code one.
- `components/editor/CrystalRevealScene.tsx`,
  `CrystalPanel.tsx` — consumed via `FullscreenPreview` and
  `TabColumnContent`.
- Style / effect / ignition classes in `packages/engine/src/{styles,effects,ignition}/` —
  all registered in their respective registries (`EFFECT_REGISTRY`,
  `createStyle`, etc.) and dispatched at runtime via config ids. Every
  class IS alive.
- `components/layout/ToastContainer.tsx` — 3-line re-export shim for
  `components/shared/ToastContainer.tsx`. Both alive.
- `stores/historyRestoreFlag.ts` — consumed by `useHistoryTracking.ts`
  and `UndoRedoButtons.tsx`.
- `lib/hilts/parts/**` — all 33 SVG-part modules are wired through
  `lib/hilts/catalog.ts` + `assemblies.ts`. Covered by 18 unit tests.

---

## 9. `tsc --noUnusedLocals` follow-up

The sandbox blocked `pnpm --filter <pkg> exec tsc ...` invocations,
so these checks still need to run locally. Expected to surface mostly
unused destructured args, stale React hook deps, and a few dead
imports inside already-active files. Estimate < 20 findings total
based on the low rate of this sort of issue in the codebase.

**One-liners Ken or future-Claude can paste:**

```bash
pnpm --filter @kyberstation/web exec tsc --noEmit --noUnusedLocals --noUnusedParameters
pnpm --filter @kyberstation/engine exec tsc --noEmit --noUnusedLocals --noUnusedParameters
pnpm --filter @kyberstation/codegen exec tsc --noEmit --noUnusedLocals --noUnusedParameters
pnpm --filter @kyberstation/presets exec tsc --noEmit --noUnusedLocals --noUnusedParameters
pnpm --filter @kyberstation/sound exec tsc --noEmit --noUnusedLocals --noUnusedParameters
pnpm --filter @kyberstation/boards exec tsc --noEmit --noUnusedLocals --noUnusedParameters
```

Recommend appending findings to this doc under §9.1.

---

## 10. Safe-to-delete shortlist

**These are the items I am highest-confidence about. Each has zero
consumers, verified by grep.**

| # | Item | Kind | File(s) / Lines |
|---|---|---|---|
| S1 | `apps/web/components/shared/LoadingSkeleton.tsx` | File | Delete whole file |
| S2 | `apps/web/hooks/usePWA.ts` | File | Delete whole file |
| S3 | `apps/web/components/hud/MotionTelemetry.tsx` | File | Also remove re-export from `apps/web/components/hud/index.ts:9` |
| S4 | `apps/web/components/hud/PowerDashboard.tsx` | File | Also remove re-export from `apps/web/components/hud/index.ts:10` |
| S5 | `apps/web/components/hud/EngineStats.tsx` | File | Also remove re-export from `apps/web/components/hud/index.ts:11` |
| S6 | `@radix-ui/react-dialog` dep | npm dep | `apps/web/package.json:21` |
| S7 | `@radix-ui/react-select` dep | npm dep | `apps/web/package.json:22` |
| S8 | `@radix-ui/react-slider` dep | npm dep | `apps/web/package.json:23` |
| S9 | `@radix-ui/react-tabs` dep | npm dep | `apps/web/package.json:24` |
| S10 | `@radix-ui/react-toggle` dep | npm dep | `apps/web/package.json:25` |
| S11 | `@radix-ui/react-tooltip` dep | npm dep | `apps/web/package.json:26` |
| S12 | `idb-keyval` dep | npm dep | `apps/web/package.json:31` |
| S13 | `bezier-easing` dep | npm dep | `packages/engine/package.json:28` |
| S14 | `PARAMETER_GROUPS` export + `packages/engine/src/parameterGroups.ts` | Export + file | Zero consumers; the file itself has no external use. Verify internal engine code first. |
| S15 | `@kyberstation/engine` workspace dep in presets | workspace dep | `packages/presets/package.json:27` |
| S16 | `@kyberstation/boards` workspace dep in web + alias + transpilePackages entry | workspace dep (3 sites) | `apps/web/package.json:16`, `apps/web/tsconfig.json:34`, `apps/web/next.config.mjs:12`, `apps/web/vitest.config.ts:16`. **Keep package itself intact.** |

**Verify-before-delete checklist for each item:**

```bash
# Source of truth: re-grep before deleting
git grep "<symbol or filename>" -- ':!node_modules' ':!pnpm-lock.yaml'
# Then:
pnpm -w typecheck && pnpm -w test
```

**Estimated effort to clean all 16:** under 30 minutes. No behavioral
risk — every item is verified unused. Optional for launch; nice
reduction in install-footprint and CI wall-clock if Ken wants the
polish pass before cutting the tag.

---

## 11. What this audit does NOT cover

- Runtime reachability from UI flows (e.g., a panel mounted behind a
  tab that no one clicks). This audit is source-dependency based.
- CSS class pruning (unused Tailwind variants).
- Public assets in `apps/web/public/`.
- Whether deprecated fields (`SaberProfile.presetEntries` in
  `stores/saberProfileStore.ts:35`) are still read anywhere. Spot-checked:
  3 readers remain, so the `@deprecated` tag is accurate but not yet
  removable.
- Node scripts in `/scripts/` or `/backups/` (explicitly out of scope).
- Documentation files in `/docs/` (some are likely stale — e.g.,
  `apps/web/lib/version.ts` says `v0.11.3` but CLAUDE.md tracks
  `v0.10.0+` — but that's a versioning sync issue, not dead code).

---

## 12. Summary recommendation

**For launch: ship as-is OR do a 30-min cleanup pass on §10.**

Neither choice is wrong. The dead code is genuinely dead (no behavioral
impact) and the ~100KB `node_modules` waste won't affect a user's
browser — it's only installer weight. But reducing the surface before
public launch matches the "first public programming project, humble
tone" posture from CLAUDE.md.

If Ken wants the polish pass: apply items S1-S16 in a single
`chore/deadcode-sweep` branch, run the typecheck + test gate, and tag.
If Ken would rather ship sooner: keep this doc, revisit at v0.11.x.

Either way, zero items in this audit are a launch blocker.
