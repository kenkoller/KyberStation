# Next Session — Interface Polish (picking up from PR #46, post-2026-04-24-late)

Self-contained paste-in prompt for a fresh Claude conversation. Two iterative-walkthrough sessions have shipped on `feat/v0.14.0-blade-polish` (PR [#46](https://github.com/kenkoller/KyberStation/pull/46)) — 29 commits ahead of main, pushed to origin, **NOT yet merged**. This file documents the current state and what's left to pick up.

## Start state

- **Branch:** `feat/v0.14.0-blade-polish`, 29 commits ahead of main, pushed to `origin`.
- **PR:** [#46](https://github.com/kenkoller/KyberStation/pull/46) open, NOT merged.
- **Last commit:** `6a93889` — Phase 1.5x (retire 2D/3D + rework All States layout).
- **Workspace gates:** `pnpm -w typecheck` clean, `pnpm -w test` 912/912 web + workspace packages all green.
- **Plan file:** `~/.claude/plans/i-would-like-to-starry-moon.md` (the original 4-phase bloom rewrite plan; all 4 phases shipped + a11y-toggle done; module extraction + golden-hash tests still open).
- **Last entry in `CLAUDE.md`:** the "Current State (2026-04-24 late, v0.14.0 Visualization Polish + Workbench Chrome Pass)" block — read that first for the commit-by-commit breakdown.

## What shipped this session (2026-04-24 late)

Six commits, all on `feat/v0.14.0-blade-polish`:

| Commit | Phase | Scope |
|---|---|---|
| `a023b0b` | a11y | **Reduce Bloom toggle** — Settings → Display section + AccessibilityPanel under Reduced Motion. Persists via localStorage, single store flag, both surfaces share state. Closes the dead-UI item from the prior handoff doc. |
| `a4f55e4` | 1.5t | **Chrome alignment + true slot splitter.** ResizeHandle = 0-size wrapper + absolute hit target straddling the seam. Blade-canvas wrapper `px-1` dropped (CanvasLayout `border-x` butts directly against Inspector / RightRail). Toolbar `min-h-8` to match Inspector tab BAR. ExpandedSlotResizeHandle is now a true 2-store splitter (PIXEL STRIP no longer translates when seam moves). TUNE / GALLERY tabs `+1px`. |
| `683227a` | 1.5u | **Surprise Me + Undo relocated** to the Inspector's TUNE tab top, above ParameterBank. DesignPanel's top bar now hosts only group pills. |
| `8c05e83` | 1.5v | **AnalysisRail full-width + matched border tone.** Width-resolver fix (was hardcoded 200 px because `style.width: '100%'` is a string, not a number). Row borders bumped from `/40` → full opacity to match every other panel border in the app. |
| `85c38db` | 1.5w | Action toolbar `min-h-8` → `min-h-[33px]` to match Inspector tab BAR's outer height (32 px tab button + 1 px bar border-b = 33 px). |
| `6a93889` | 1.5x | **Retire 2D/3D toggle + rework All States.** 3D parked indefinitely; toggle group + `BladeCanvas3D` import + absolute fallback overlay all removed. PixelDebugOverlay always-on. **All States now keeps BLADE PREVIEW visible** and replaces only the PIXEL STRIP + Expanded Slot regions with the StateGrid. Each state row uses `computeBladeRenderMetrics` + `bladeStartFrac` so it lines up Point A → Point B with the main blade above. |

## Suggested merge plan

1. **Verify gates one more time:** `pnpm -w typecheck && pnpm -w test`. Browser smoke test at `/editor` 1600×1000.
2. **Merge strategy: merge commit** (NOT squash) — `gh pr merge 46 --merge --delete-branch`. The 29 commits are all atomic + descriptive enough to read as `git log main` annotation.
3. **Optional tag after merge:** `v0.15.0` (v0.14.0 was already taken by Modulation Routing v1.0 BETA in `43b73aa`). The bloom rewrite + chrome polish is a natural minor bump.

## Still open after this branch merges

### Easy follow-ups (small, isolated)

- **Drop `BladeCanvas3DWrapper`** — file still exists at `apps/web/components/editor/BladeCanvas3DWrapper.tsx` but no longer has any import path after Phase 1.5x. Safe to delete after one quick sweep confirming no test / storybook / Cypress references.
- **Drop `canvasMode` field from uiStore** — kept after 1.5x for persistence-state safety. Once enough sessions have passed with no readers, the field + its setter can be removed cleanly.

### Medium tasks (still planned from the original bloom-rewrite)

- **Module extraction to `lib/blade/*`** — Phase 4 of the original plan. `BladeCanvas.tsx` is ~2800 lines with the entire rendering pipeline inline. Extracting to `lib/blade/{pipeline,bloom,endpoints,rim,ambient,diffusion,motionBlur,glowProfile,types}.ts` would let MiniSaber + FullscreenPreview + SaberCard share the same polished pipeline. Non-urgent, but unlocks broader pipeline reuse. Risk: medium-high without golden-hash tests as a regression net (see next item).

- **Golden-hash blade-render tests** — 8 canonical configs (Obi-Wan Azure, Vader Crimson, Darksaber, Rey TROS Yellow, Mace Windu Amethyst, Luke ROTJ Green, Kylo Unstable, Trans-White) rendered to offscreen canvas at fixed dimensions, FNV-1a hashed, committed as goldens. CI fails on drift. CLI flag `--update-goldens` to regenerate after intentional changes. **Should land before module extraction** so the extraction has a regression sentinel.

### Continued UX-walkthrough items (Ken-driven, drop-in as observed)

This session's iteration cadence — Ken annotates a screenshot, Claude proposes a fix, walkthrough confirms, commit. There may be more polish items in Ken's queue when he resumes. Look for:

- Click targets that are still hard to hit
- Stale borders / padding mismatches between neighbors
- Action-bar chip readability
- Blade rendering at extreme container widths (Inspector at max, AnalysisRail at max)
- Aurebesh ticker overflow on narrow widths

## Files touched this session

- `apps/web/components/editor/AccessibilityPanel.tsx` — added Reduce Bloom toggle row
- `apps/web/components/layout/SettingsModal.tsx` — added Reduce Bloom toggle in Display section
- `apps/web/components/shared/ResizeHandle.tsx` — restructured to 0-size wrapper + absolute hit target
- `apps/web/components/layout/WorkbenchLayout.tsx` — dropped `px-1` on blade wrapper, removed 2D/3D toggle, removed BladeCanvas3D + StateGrid imports + the 3D / StateGrid render branches + the absolute fallback overlay
- `apps/web/components/editor/CanvasLayout.tsx` — toolbar `min-h-[33px]`, true splitter for ExpandedSlotResizeHandle, conditional StateGrid in place of pixel strip + slot when `showStateGrid` is on
- `apps/web/components/editor/StateGrid.tsx` — Point A / Point B alignment via `computeBladeRenderMetrics` + `bladeStartFrac`, full-width canvas with absolute label overlay, dropped header strip
- `apps/web/components/editor/Inspector.tsx` — TUNE / GALLERY tabs `pt-[9px] pb-2` (+1 px), added TuneTabActionRow with Surprise Me + Undo at the top of TUNE tab
- `apps/web/components/editor/DesignPanel.tsx` — removed Surprise Me + Undo block, kept group pills
- `apps/web/components/layout/AnalysisRail.tsx` — width-resolver fix (string `'100%'` honored), row border `/40` → full opacity

## How to resume

```bash
cd /Users/KK/Development/KyberStation
git fetch origin --prune
git checkout feat/v0.14.0-blade-polish
git pull origin feat/v0.14.0-blade-polish
pnpm install  # if dep changes happened
pnpm -w typecheck
pnpm -w test
pnpm --filter @kyberstation/web dev  # or use preview_start in Claude tools
```

Then either:
- **Merge the PR**: `gh pr merge 46 --merge --delete-branch`, optionally tag `v0.15.0`.
- **Or pick up another iteration**: ask Ken what to look at next.

## Known quirks + gotchas

1. **Dev server stale module resolution.** Restart the preview server if you see import errors for files that exist on disk: `rm -rf apps/web/.next && pnpm --filter @kyberstation/web dev`.

2. **`uiStore.isOn` persists across reloads.** Phase 1.5h's auto-ignite (500 ms after workbench load) explicitly resets `isOn` to `false` first so the ignition animation always plays. Don't remove the reset.

3. **`computeBladeRenderMetrics` takes the CONFIG `ledCount`**, not the buffer-clamped `min(pixelCount, Math.floor(pixels.length / 3))`. The buffer count can briefly drop into a shorter `bladeInches` bucket mid-render and break Point B alignment (Phase 1.5m fix). PixelStrip + StateGrid both honor this.

4. **`canvasMode` is dead UI** but stays in uiStore for now. Don't add new readers; pretend the field doesn't exist. Drop it cleanly in a future session once enough time has passed.

5. **`BladeCanvas3DWrapper.tsx` is dead code** — file still exists in the editor folder but has no importers. Drop it cleanly in a future session.

6. **Aurebesh font is monospace-fallback on unbundled clones.** OTF files at `apps/web/public/fonts/aurebesh/*.otf` ship with the repo via standard git clone — no LFS needed.

## One-line status

**v0.14.0 Visualization Polish + Workbench Chrome Pass complete; 29 commits on PR #46 pushed to origin; gates clean; ready for final merge + optional `v0.15.0` tag.**
