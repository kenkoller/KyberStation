# Session archive — 2026-04-30 launch night (v0.16.0 + post-launch sprint)

**Tag cut:** `v0.16.0` at `9e3d747` on main, pushed to origin.
**Live site:** https://kenkoller.github.io/KyberStation/
**Repo:** Public (visibility flipped via `gh repo edit --visibility public`).
**Pages:** Enabled with `GitHub Actions` source.

## Total tonight — 16+ PRs

### Launch-prep PRs (early evening)

| PR | Scope |
|---|---|
| [#153](https://github.com/kenkoller/KyberStation/pull/153) | CHANGELOG v0.16.0 release notes |
| [#154](https://github.com/kenkoller/KyberStation/pull/154) | basePath / assetPrefix / .nojekyll for GitHub Pages |
| [#155](https://github.com/kenkoller/KyberStation/pull/155) | CSP allow `'unsafe-inline'` for Next.js inline hydration scripts |

### Bug-fix + UX-polish wave (Ken's notes addressed)

| PR | Scope |
|---|---|
| [#156](https://github.com/kenkoller/KyberStation/pull/156) | Wizard label visible on desktop (Tailwind tablet-only breakpoint bug) |
| [#157](https://github.com/kenkoller/KyberStation/pull/157) | Unique thumbnails for gradient + 9 styles (10 SVGs) |
| [#158](https://github.com/kenkoller/KyberStation/pull/158) | Lane A: All States click-to-set, Gallery nav prune, "My Saber"→"Saber Profiles" |
| [#159](https://github.com/kenkoller/KyberStation/pull/159) | Hardware: 36"=Standard caption + 5 caption fixes + LED divergence warning |
| [#160](https://github.com/kenkoller/KyberStation/pull/160) | UX polish: Quick Controls density + header heights + BETA badges + Crystal opt-in |
| [#161](https://github.com/kenkoller/KyberStation/pull/161) | Visual bug batch: power-draw arc + routing plate overlap + gallery filter labels |
| [#162](https://github.com/kenkoller/KyberStation/pull/162) | Batch preview MiniSaber + Save/Queue glyph polish |

### Brought-back features (per Ken's request)

| PR | Scope |
|---|---|
| [#163](https://github.com/kenkoller/KyberStation/pull/163) | Battery selector with manufacturer-spec warnings (6 cells + Custom) |
| [#164](https://github.com/kenkoller/KyberStation/pull/164) | Gallery grid view as default + detail modal + view toggle |
| [#165](https://github.com/kenkoller/KyberStation/pull/165) | Profile rename + workbench notes + card-preset rename |

### Late-night strategic asks

| PR | Scope |
|---|---|
| [#166](https://github.com/kenkoller/KyberStation/pull/166) | Bluetooth feasibility research → defer to v0.17 |
| [#167](https://github.com/kenkoller/KyberStation/pull/167) | Landing page one-page rework (pillars + beta notice + credits) |
| [#168](https://github.com/kenkoller/KyberStation/pull/168) | CHANGELOG + README refresh for v0.16.0 |
| [#169](https://github.com/kenkoller/KyberStation/pull/169) | Mobile shell overhaul (Item H) — drawer + vertical stack |
| [#170](https://github.com/kenkoller/KyberStation/pull/170) | 27 new kinetic presets + filter classification fix |

### Post-launch parallel-batch (8-12 hour run)

| PR | Scope |
|---|---|
| [#171](https://github.com/kenkoller/KyberStation/pull/171) | Delete 5 orphaned components after mobile shell migration (1030 lines) |
| [#172](https://github.com/kenkoller/KyberStation/pull/172) | Mobile UX/UI Phase 1 audit (`docs/mobile-audit.md`) |
| [#173](https://github.com/kenkoller/KyberStation/pull/173) | Archive 7 stale session/launch docs to `docs/archive/` |
| [#174](https://github.com/kenkoller/KyberStation/pull/174) | 1200×630 OG hero image + `scripts/generate-og-hero.mjs` |
| [#175](https://github.com/kenkoller/KyberStation/pull/175) | Priority-5 effects: Sith Flicker + Blade Charge + Tempo Lock + Unstable Kylo |
| [#176](https://github.com/kenkoller/KyberStation/pull/176) | useAudioEngine module-scope singleton (Chrome 6-AudioContext cap fix) |

### Still in flight at session wrap

- **Tier 1B** lib/blade/* extraction agent
- **Tier 2A** Marketing site re-implementation agent (`/features` `/showcase` `/changelog` `/faq`)
- **Tier 2B** Saber GIF Sprint 3 agent (style-grid, color-cycle, lockup-loop GIFs)

These will return when complete; merge them when CI green. They're additive — none should break existing functionality.

## Tier 3 quick wins shipped tonight

- ✅ Stub deletion (5 orphaned components from pre-mobile-overhaul shell — 1030 LOC removed)
- ✅ Stale doc archive (7 docs moved to `docs/archive/` with index README)
- ✅ OG hero image (replaces letterboxed icon-512 with proper 1200×630)
- ✅ Drift sentinel test (already shipped; confirmed comprehensive at `apps/web/tests/canonicalDefaultConfigDrift.test.ts`)

## Key strategic decisions locked tonight

1. **Mobile UX/UI overhaul is a phased process** — Phase 1 audit done (PR #172). Phases 2-4 await Ken's review per his prompt's gating discipline. Top 3 surprises from audit:
   - MobileTabBar Gallery link is stale (`/editor?tab=gallery` instead of `/gallery`)
   - MainContentABLayout has no phone fallback — 7 A/B sections render Column B at ~95px wide on 380px viewport
   - "← Back to Canvas" pill + MobileTabBar both bottom-pin → visual overlap
   - Component readiness: 8 ✅ / 15 🟡 / 8 🔴

2. **Bluetooth wireless updates → v0.17 minimum.** ProffieOS author Fredrik already shipped a Web Bluetooth POC (`profezzorn/lightsaber-web-bluetooth`); we'd port + integrate. iOS exclusion is permanent (Apple WebKit policy bans Web BT in all iOS browsers including Chrome-on-iPhone).

3. **`useAudioEngine` consolidated to a module-scope singleton.** Chrome's per-origin AudioContext cap (~6) is no longer hit. Mute lift from PR #124 preserved.

## Screenshots Ken needs to capture before launch announcement

Chrome MCP `save_to_disk` is for message-attachment, not filesystem retrieval. Ken needs to capture these manually via CleanShot / macOS screenshot per `docs/LAUNCH_ASSETS.md` §Screenshot Shot List:

1. Landing hero (top of `/`)
2. Saber gallery scrolling section (`?scroll=900`)
3. WHAT YOU GET feature pillars
4. NOTES FOR FIRST-TIME USERS beta + flash safety
5. BUILT ON SHOULDERS credits
6. Editor — Blade Style with new SAVE ★ + QUEUE ⊕ buttons
7. Editor — Hardware with Battery selector + active warning
8. Editor — Hardware with Topology BETA badges
9. Saber Profiles with rename-able profile heading
10. Gallery grid view (`/gallery`) — new default
11. Wizard step 1 with new captions (Standard 36" highlighted)
12. FlashPanel EXPERIMENTAL disclaimer with 3 checkboxes
13. Mobile (375px) with hamburger drawer open

## Open / next-session items

### Phase 2+ of mobile overhaul (gated on Ken's review)
Ken's prompt wants Phase 2 (design proposal) → Phase 3 (impl plan) → Phase 4 (1 PR at a time, paused after each). The audit (PR #172) is the input.

### Still in flight at wrap
- lib/blade/* extraction
- Marketing site pages
- Saber GIF Sprint 3

### Deferred locked
- Gesture controls UX redesign (post-launch)
- Blade tip shape change (post-launch — Ken accepted defer)
- Bulk-add presets to queue (post-launch)

## Process learnings worth carrying forward

1. **Worktree path discipline still bites.** Two agents leaked into the main repo path tonight (effects priority-5 + mobile overhaul). Salvage pattern is reliable: parent session inspects working tree, runs typecheck/tests, commits + pushes + opens PR. Both salvages shipped intact.

2. **Phased agent prompts work for human-gated tasks.** The mobile UX prompt has 4 phases with explicit "STOP. Wait for review." between each. Modified the dispatch to bound the agent at Phase 1, with the audit doc as deliverable. Ken reviews on his own time → next dispatch handles Phase 2.

3. **Background agents with explicit instructions to avoid main repo absolute paths sometimes still leak.** The instruction "ALWAYS use absolute paths inside your worktree (`<worktree-root>/apps/web/...`)" went into both Tier 2 prompts. Will see if it makes a difference.

4. **5-PR merge orderings matter.** Tonight's merge order minimized conflicts:
   - Docs-only first (#172, #173)
   - Isolated additive (#174 OG hero)
   - Pure deletions (#171 orphans)
   - Largest footprint last (#175 effects + #176 audio singleton)
   Zero merge conflicts across all 5.

5. **Flaky test recognition pattern.** `hardwarePanel.test.tsx` ("renders the CONFIGURATION header") and `webusb/DfuSeFlasher.test.ts` (~350 KB binary) timeout under parallel-CPU pressure. Both pass cleanly when re-run in isolation. Not bugs — environmental flakes.

## Test count snapshot at session wrap

After all merges:
- engine: ~876 (+9 priority-5 smoke)
- web: ~1952 (+27 from various PRs)
- codegen: 1859+ (audio singleton + priority-5 added codegen tests)
- boards: 260
- sound: 62
- presets: 47

**Workspace total: ~5,000+ tests, all passing.** Typecheck clean across 10/10 packages.
