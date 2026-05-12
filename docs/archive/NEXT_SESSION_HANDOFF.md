# Next Session — Paste-Ready Handoff Prompt

Refreshed **2026-05-12** (post-audit). `main` is at `81694a9` (PR #312 merged), 116 commits past `v0.20.3`. Working tree clean. Major sprints since v0.20.3: Xenopixel V3 full board support, template-eval interpreter + engine bridge, Fredrik Style Editor Integration Phases 1–7, Visualizer Upgrade Plan Phases 1–2 (Hardware Preview + 3D blade), Fett263 Prop File Editor Level 1, mouse-driven swing simulation, slow-motion mode, lexer hardening, 40+ new presets, comprehensive 8-phase audit (Waves 0–4).

**Recommended first action next session: cut `v0.21.1` patch tag.**

---

## Paste this into a new Claude Code session

```
Continue KyberStation development.

PROJECT CONTEXT
---------------
KyberStation is a web-based lightsaber style editor for Proffieboard
V3.9 / ProffieOS 7.x with full Xenopixel V3 configuration mode as of
v0.21.0. v0.16.0 launched 2026-04-30 with public repo + GitHub Pages
deploy. Live site: https://kenkoller.github.io/KyberStation/

CURRENT STATE (2026-05-12)
--------------------------
- main at 81694a9 (PR #312 merged), 116 commits past v0.20.3 tag
- Working tree clean
- All 13 workspace packages typecheck clean
- 8,283 tests passing across 7 packages (web 3,552, codegen 2,854,
  engine 1,219, boards 278, template-eval 180, presets 138, sound 62)
- WebUSB FlashPanel = experimental, gated behind 3-checkbox disclaimer
- dfu-util CLI is the recommended flash workflow
- Branch protection ACTIVE on main; 2FA enabled
- CLAUDE.md compressed to 573 lines (was 3,043); 44 historical docs
  archived to docs/archive/

WHAT JUST SHIPPED (May sprints, post v0.20.3)
---------------------------------------------
v0.21.0 — Xenopixel V3 full board support (PR #287, 12 commits,
60 files, +8,025/-439). Board profiles, ini-txt emitter, 8-card
effect picker + 12-card ignition picker, board-gated UI, 8 engine
styles, 10 ignitions, design porter (mapStyleToXenoEffect etc.),
SD card import (fontconfig.ini + config.ini parsing), firmware
version awareness (1.0 / 1.2 / 1.2.5 / 1.3.1 / 1.4.0).

Fredrik Style Editor Integration Phases 1-7 (PRs #298, #299, #302,
#304, #306). Tree walking + variant cycling + variant cycler UI +
ChangeEffect bridge (Phase 1). Template registry gaps closed
(Phase 2). Mouse swing simulation (Phase 3, PR #291). Time-scale
control (Phase 4). AST-to-tree renderer + inline editing
(Phase 5A+5D, PR #299). Layer controls (Phase 5C, PR #302).
Phase 6 style transformations + Phase 7 template insertion palette
(PR #304). Phase 5F tests for TemplateInsertionPalette (PR #306).

Template-eval interpreter (PRs #295, #296, #303). Phase 1 foundation
(parser + evaluator + 153 templates). Engine bridge
(BladeEngine.renderMode = 'template-eval'). Registry expansion to
372 entries (PR #303).

Visualizer Upgrade Plan Phases 1-2 (PR #301). Hardware Preview mode
(template-eval pipeline). 3D blade mesh + LED emissive + R3F scene
+ orbit controls.

Fett263 Prop File Editor Level 1 (PR #305). Toggle panel for ~30-40
Fett263 #defines. Covers ~90% of Proffie users.

Other notable: slow-motion mode (#294), Xenopixel candy + flashing
fix (#293), Xenopixel docs (#288, #297), mobile shell sub-1024
brand drift fix (#277), import banner mobile vertical stack (#280),
altPhaseColors UI surface (#281), Xenopixel V3 + V2 wizard support
(#282), CFX + GH honest design-reference taglines (#285, #286),
lexer hardening — 2 LEXER_INCOMPATIBLE fixtures closed (#279),
40 new presets across Harry Potter / Halo / SWTOR deep-cuts /
Clone Wars Council (#307), card-snapshot golden-hash regression
harness (#307).

Comprehensive 8-phase audit (PRs #309-312):
  Wave 0 — accuracy: fixed style/effect/preset counts on landing +
    features pages, metadataBase warning (#309)
  Wave 1 — hygiene: HelpTooltip SSR warning fix, dead doc refs,
    stale CLAUDE.md counts (#310)
  Wave 2 — skipped (Next.js 14->15 is medium-risk, own session)
  Wave 3 — dead code: deleted performanceStore + 28 tests, removed
    uiStore.performanceBarHeight, cleaned stale TODOs (#311)
  Wave 4 — structural: archived 44 docs to docs/archive/, compressed
    CLAUDE.md 3,043->573 lines, fixed 7 cross-references (#312)

PRIORITY ORDER FOR THE NEXT SESSION
-----------------------------------
1. Cut v0.21.1 patch tag. 116 commits past v0.20.3 is substantial.
   Tag-cut sequence:
     - Skim PR titles `gh pr list --state merged --limit 30`
     - Draft [Unreleased] -> [0.21.1] block in CHANGELOG.md
     - Bump apps/web/package.json + root package.json versions
     - Create the tag: git tag -a v0.21.1 -m "..."
     - Push: git push origin main v0.21.1
   ~30 min sprint.

2. Renderer-level golden-hash full coverage. PR #307 shipped
   card-snapshot drawers + drawBlade harness. The blade-render
   pipeline (BladeCanvas inline renderer) still needs node-canvas-
   driven pixel-level coverage. This is the explicit prerequisite
   for any `lib/blade/*` follow-on extraction or Visualizer Phase
   2D post-processing work.

3. Pick from CANDIDATE NEXT WORK below.

CANDIDATE NEXT WORK
-------------------
After the audit, the genuinely-open delegable work, ordered by
value-per-effort:

  1. Wave 8 / Prop File Editor Level 2 — button routing sub-tab
     (L, ~6-8h). All 8 aux/gesture modulators already registered
     in engine + UI. Remaining surface: routing-sub-tab UI +
     binding shape extensions in bladeStore. Splittable into 3
     M-scope agent dispatches.

  2. Visualizer Phase 2C — 3D mouse interaction (M). Orbit-
     rotation from drag, swing-sim from drag velocity,
     click->clash, hold->lockup. Closes the "looks pretty but isn't
     interactive" gap in the 3D view.

  3. Visualizer Phase 2D — 3D post-processing (M). UnrealBloomPass,
     polycarbonate diffusion, motion blur. Builds on shipped Phase
     2A+2B.

  4. Crystal Vault panel + Re-attunement UI (M-L). Long-standing
     design debt from docs/KYBER_CRYSTAL_3D.md. Needs UX
     confirmation on entry-point shape (header button vs sidebar
     entry vs /vault route).

  5. Mobile shell migration to Sidebar + MainContent (M). Needs
     Ken's UX call on drawer vs bottom-sheet pattern at 375px.
     Unblocks retiring DesignPanel.tsx + DynamicsPanel.tsx +
     MergedDesignPanel + uiStore.activeTab together.

  6. Wave 6 follow-on — composer slot expansion (L). Per-channel
     RGB (Mix<driver, ColorLow, ColorHigh> restructuring) + timing
     scalars. Deeper AST work in codegen.

  7. Preset Cartography continued (S each). PR #307 added 40 across
     4 franchises. Next queued: KOTOR, animated series deep-cuts,
     Visions Vol 2, cross-franchise "inspired by". Could 4-5x the
     library in one parallel-agent session.

  8. Real-saber demo GIFs (Ken's hardware shoot). LAUNCH_ASSETS.md
     calls these "the single most impactful asset".

LARGER FUTURE SPRINTS (XL — multi-week, plan first)
---------------------------------------------------
  - Sound Font Library + Custom Presets + Card Presets
    (docs/SOUND_FONT_LIBRARY_AND_CUSTOM_PRESETS.md, 3 phases)
  - Multi-Blade Workbench (channel-strip UI)
  - Modulation v1.2 Creative (chains, macros, LFO, conditionals)
  - Modulation v1.3 Advanced (envelope followers, step sequencers,
    gesture recording)
  - Bluetooth wireless updates — v0.17 target. New BT-enabled board
    arriving per user memory; unblocks porting Fredrik's
    lightsaber-web-bluetooth POC.
  - Next.js 14 -> 15 upgrade — v0.17 stabilization slot (3-5h
    mechanical, React 18->19 jump is the risk). Audit Wave 2
    deferred this to its own session.
  - Fett263 Prop File Editor Level 3 — full custom prop file
    generation. Evaluate community demand after Wave 8.
  - Xenopixel Phase 5B/5C — hardware validation on real Xeno
    saber + stretch BLE integration

VERIFICATION COMMANDS BEFORE STARTING
-------------------------------------
  cd /Users/KK/Development/KyberStation
  git fetch origin --prune && git status && git log --oneline -10
  git worktree list
  pnpm install
  pnpm typecheck    # should be clean across 13 packages
  pnpm test         # 8,283 tests passing across 7 packages

WHERE THINGS LIVE
-----------------
- CLAUDE.md — 573-line project context file (compressed 2026-05-12)
- docs/POST_LAUNCH_BACKLOG.md — single source of truth for open items.
  Top "What's open right now (2026-05-12)" section refreshed.
- docs/VISUALIZER_UPGRADE_PLAN.md — Phases 1-2 shipped; 2C/2D/3 still
  in plan
- docs/FREDRIK_STYLE_EDITOR_INTEGRATION_PLAN.md — Phases 1-7 shipped;
  Phase 5E (board-gated panel mounting refinements) is the remaining
  loose-end
- docs/XENOPIXEL_IMPLEMENTATION_PLAN.md — Phases 1-5A shipped; 5B/5C
  hardware-gated
- docs/HARDWARE_FIDELITY_PRINCIPLE.md — north star; check before
  adding any new engine style / blend mode / compositor mode
- docs/research/BLUETOOTH_FEASIBILITY.md — v0.17 plan
- docs/research/NEXTJS_15_UPGRADE_PLAN.md — v0.17 stabilization
- docs/archive/ — 44 historical docs (sessions, audits, UX overhauls)
  moved here during Wave 4 cleanup

OPEN PRs
--------
None. PRs #309-312 merged 2026-05-12. Older stale PRs:
- PR #32 (marketing site expansion) — open since pre-launch; needs
  focused rebase. Most of its content already shipped via separate
  PRs.
- PR #83 (session archive 2026-04-27) — historical, conflicts with
  newer state. Recommend close.

CROSS-SESSION COLLISION GUARDRAILS
-----------------------------------
Multiple parallel sessions have hit working-tree collisions during
prior sprints. Recovery pattern that works:
  git stash push -u -m "<WIP label>" -- <files>
  git checkout <intended-branch>
  git stash pop

Before starting any new branch:
  1. Confirm you're on the expected base via `git log -1`
  2. Check `git worktree list` for sibling sessions
  3. If your working tree has unexpected modifications, investigate
     before staging

PARALLEL-AGENT DISPATCH PATTERN (validated repeatedly)
------------------------------------------------------
File-disjoint parallel agents in isolated worktrees works when:
  - Each agent's prompt is self-contained (~400-600 words)
  - Agents have explicit "do NOT touch" lists for parallel work
  - Test gates baked in (typecheck + test before push)
  - Conservative-fallback rules ("if X doesn't work, ship Y subset")
  - L-scope work split into 2-3 M-scope dispatches

Cap: <=4 concurrent agents. CLAUDE.md learnings show concurrent leak
risk compounds beyond that.

KNOWN GOTCHAS
-------------
- Bash heredoc + parens in commit messages keeps breaking. Workaround:
  write commit message to /tmp/commit-msg-X.txt, then `git commit -F`.
- Cross-platform font rendering (Cairo Core Text on macOS vs FreeType+
  Pango on Linux CI) makes pixel-hash tests sensitive on text-heavy
  surfaces. Use full-fidelity hashes for pixel-math-only drawers;
  structural assertions for text-containing drawers. PR #307 documents
  this pattern.
- Auto-close trap: merging a PR with --delete-branch auto-closes any
  PR targeting that branch as base. Open a replacement PR with the
  same branch (no force-push if it's still fast-forward).
- Zustand SSR snapshot pinning: useSyncExternalStore server snapshot
  is selector(api.getInitialState()) — post-init setState mutations
  are invisible to renderToStaticMarkup. Use hoisted-mock pattern for
  SSR tests that need non-default store state.
```
