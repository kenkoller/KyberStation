# Next Session — Interface Polish (picking up from PR #46)

Self-contained paste-in prompt for a fresh Claude conversation. Ken and the prior session shipped the v0.14.0 Visualization Polish Pass across 23 commits on `feat/v0.14.0-blade-polish` (PR [#46](https://github.com/kenkoller/KyberStation/pull/46)). This file documents the state, the outstanding work, and what to look at first.

## Start state

- **Branch:** `feat/v0.14.0-blade-polish`, 23 commits ahead of main, pushed to origin.
- **PR:** [#46](https://github.com/kenkoller/KyberStation/pull/46) open, NOT yet merged. Typecheck clean, 912/912 web tests pass, browser-verified on /editor at 1600×1000.
- **Plan file:** `~/.claude/plans/i-would-like-to-starry-moon.md` — the original 4-phase blade-polish plan approved at the start of the prior session. All 4 phases shipped; a few deferred items remain (see below).
- **Last entry in `CLAUDE.md`:** the "Current State (2026-04-24, v0.14.0 Visualization Polish Pass)" block at the top of the Current State section — read that first for the commit-by-commit breakdown.

## What's working right now

The workbench blade preview area is in a good visual state:

- Width-driven auto-fit scale; blade + pixel strip + RGB+luma analysis rail all anchor to the user-draggable Point-A divider (`uiStore.bladeStartFrac`).
- 3-mip downsampled bright-pass bloom replaces the old 14-pass stack — continuous smooth halo with no seam ridges.
- Rim glow, motion blur (swing-driven), mip-2-driven ambient wash, vignette brightness coupling all shipped.
- All three canvas-column panel headers (BLADE PREVIEW, PIXEL STRIP, RGB + LUMA) unified to exact same 30 px height.
- Action bar lives on its own row above BLADE PREVIEW title row inside the panel; view controls (Single / All States / 2D / 3D / Fullscreen) are in the BLADE PREVIEW header children.
- Aurebesh AF font bundled; data ticker renders in Aurebesh glyphs at 10 px on an 18 px strip.
- Resize handles all 8 px hit targets.
- 500 ms auto-ignite on workbench load.

## Still open — interface polish tasks to pick from

These all build on the current state without blocking launch. Pick whichever reads highest-priority when you start.

### A. AccessibilityPanel toggle for `reduceBloom`

The flag is in `accessibilityStore` + wired through bloom / rim / motion-blur math. No UI toggle yet. Reachable only via `useAccessibilityStore.getState().setReduceBloom(true)` in devtools.

Add a checkbox in `AccessibilityPanel.tsx` (wherever `reducedMotion` + other a11y prefs are listed). Label: "Reduce bloom intensity" or "Dimmer blade glow". Short description: "Scales blade bloom alpha to 40% for photosensitive users — halo remains visible but subdued."

### B. Module extraction to `lib/blade/*`

Originally planned as Phase 4 of the bloom rewrite. Currently all blade rendering is inline in `apps/web/components/editor/BladeCanvas.tsx` (~2800 lines). Extracting would enable MiniSaber / FullscreenPreview / saber-card renderers to adopt the same pipeline.

Suggested module structure (from the original plan):

```
apps/web/lib/blade/
├── pipeline.ts       # drawBlade() top-level orchestrator
├── bloom.ts          # 3-mip bright-pass chain
├── endpoints.ts      # tip + emitter seed rendering
├── rim.ts            # rim-glow stroke
├── ambient.ts        # floor/ceiling wash + vignette modulator
├── diffusion.ts      # LED bleed + polycarb desat
├── motionBlur.ts     # ghost buffer + swing persistence
├── colorSpace.ts     # (already exists — move here)
├── glowProfile.ts    # per-color GlowProfile table
├── types.ts          # BloomConfig, MipChain, etc.
└── index.ts          # barrel
```

Public API target:
```ts
drawBlade({
  ctx, offscreen, mipBuffers, ledBuffer,
  bounds, theme, styleConfig, bloomConfig, frameState,
}): void
```

Expected BladeCanvas.tsx reduction: 2800 → ~2200 lines. MiniSaber could then adopt with `mipCount: 1` fast-tier.

### C. Golden-hash blade-render tests

No tests currently lock down blade visual output. Planned approach:
- 8 canonical configs: Obi-Wan Azure, Vader Crimson, Darksaber, Rey TROS Yellow, Mace Windu Amethyst, Luke ROTJ Green, Kylo Unstable, Trans-White.
- Render each to an offscreen canvas at 1200×600.
- Extract `ImageData`, FNV-1a hash, commit as golden.
- CI fails on drift. CLI flag `--update-goldens` to regenerate.

Would catch accidental drift from future edits to the bloom / rim / endpoint code.

### D. Small UX items Ken may have queued since this session

Open the `/editor` route at 1600×1000 and walk through:
- Is there a click target that's still hard to hit?
- Does any panel have a stale border / padding that doesn't match its neighbors?
- Are the action-bar chips readable at a glance or do they need size/color tuning?
- Does the blade render correctly at very narrow container widths (drag Inspector to max, drag analysis rail to max)?

### E. Merge PR #46 to main

23 commits is a large PR. Recommended merge strategy: **merge commit** (not squash) so the phase-by-phase history stays visible in `git log main`. Each commit message is descriptive enough to be a useful annotation of "when did we change X."

Before merging:
- Verify one last time that `pnpm -w typecheck` + `pnpm -w test` both green on the latest commit.
- Verify browser state at `/editor` loads cleanly.
- Consider cutting a `v0.15.0` tag after merge (the original plan suggested v0.14.0 for this work but v0.14.0 was already taken by Modulation Routing v1.0 Preview BETA — so promote to v0.15.0).

## Files the next session is most likely to touch

- `apps/web/components/editor/CanvasLayout.tsx` — canvas-column layout, three panel headers, draggable Point-A divider, view-controls slot
- `apps/web/components/editor/BladeCanvas.tsx` — main blade rendering (huge file, candidate for extraction)
- `apps/web/components/editor/PixelStripPanel.tsx` — LED strip canvas
- `apps/web/components/editor/VisualizationStack.tsx` — RGB+luma + other analysis layer render functions
- `apps/web/components/layout/WorkbenchLayout.tsx` — top-level workbench shell, view-controls extraction
- `apps/web/stores/uiStore.ts` — `bladeStartFrac`, `pixelStripHeight`, `expandedSlotHeight`, `showGrid`, view-state
- `apps/web/stores/accessibilityStore.ts` — `reduceBloom` flag (for item A)
- `apps/web/lib/bladeRenderMetrics.ts` — shared Point A / Point B math
- `apps/web/lib/blade/colorSpace.ts` — gamma LUT + tonemap helpers (the first `lib/blade/*` module)

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

Then paste this file (or reference it) and ask Claude to pick up on whichever of items A–E feels next.

## Known quirks + gotchas

1. **Dev server stale module resolution.** The preview server was restarted multiple times during this session to clear Next.js module caches after creating / moving files. If the editor shows import errors for files that actually exist on disk, `rm -rf apps/web/.next` + restart is the fix.

2. **`uiStore.isOn` persists across reloads.** The auto-ignite on workbench load (Phase 1.5h) explicitly resets `isOn` to `false` before the 500 ms timer so the ignition animation always plays, even if the prior session persisted `isOn: true`. Don't remove the reset step — it keeps the engine (fresh on each mount) in sync with the store.

3. **`computeBladeRenderMetrics` takes `ledCount` for bladeInches bucket.** Pass the stable CONFIG `ledCount` (from the store), NOT the buffer-clamped `min(pixelCount, Math.floor(pixels.length / 3))`. The latter can briefly drop into a shorter bladeInches bucket mid-render and break Point B alignment (Phase 1.5m fix).

4. **The absolute view-controls overlay (WorkbenchLayout) only renders when `canvasMode === '3d' || (showStateGrid && activeTab === 'design')`.** If you move state-grid / 3D / fullscreen controls somewhere else, verify those edge cases still let users toggle back to 2D + single mode.

5. **Aurebesh font is monospace-fallback on unbundled clones.** The project has 4 OTF variants checked in, but if someone clones fresh without `git lfs` (if LFS is ever added) or if the `font-display: swap` never resolves, the ticker falls back to monospace. Currently works fine via standard git clone.

## One-line status

**v0.14.0 Visualization Polish Pass complete (Phases 1–4); 23 commits on PR #46; ready for final review + merge; interface polish items A–D available for the next session.**
