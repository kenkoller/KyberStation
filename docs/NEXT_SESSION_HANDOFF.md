# Next Session — Paste-Ready Handoff Prompt

Refreshed **2026-05-01 late evening (mobile sprint MERGED to main)**. v0.16.0 launched 2026-04-30. Mobile UX overhaul follows the **Claude Design StickyMiniShell handoff** at `Claude Design Mobile handoff/HANDOFF.md`. **All 5 phases shipped to main**; PRs #207 + #211 + #212 + #213 + #214 all merged. PRs #208 + #209 + #210 closed (content already on main via the #211 merge cascade).

The mobile-sprint open question is the **diagnostic-strip segment-set UX call** (Ken's call). The next session pivots to **non-mobile backlog** — see CANDIDATE NEXT WORK below.

---

## Paste this into a new Claude Code session

```
Continue KyberStation post-v0.16.0 launch development.

PROJECT CONTEXT
---------------
KyberStation is a web-based lightsaber style editor for Proffieboard
V3.9 / ProffieOS 7.x. v0.16.0 launched 2026-04-30 with public repo +
GitHub Pages deploy. Live site: https://kenkoller.github.io/KyberStation/

LAUNCH STATE (locked)
---------------------
- v0.16.0 tag at 9e3d747, design-tool-first posture
- WebUSB FlashPanel = experimental, gated behind 3-checkbox disclaimer
- dfu-util CLI is the recommended flash workflow
- Branch protection ACTIVE on main (ruleset "Protect Main")
- 2FA enabled on Ken's GitHub account

WHAT JUST HAPPENED (2026-05-01, mobile sprint MERGED)
-----------------------------------------------------
Mobile UX overhaul Phases 4.1 / 4.2 / 4.3 / 4.4 / 4.4.x / 4.5 all
shipped today across multiple sessions. Mobile sprint is feature
complete on `main`.

Today's merges:
  #199 mobile/shell-density-and-sticky-canvas  — PR A1: sticky shell + drawer + auto-ignite
  #200 mobile/density-v2-and-stacked-columns   — PR A2: density v2 + stacked A/B + analysis stack
  #201 chore/gitignore-design-handoff-folder   — gitignore design reference
  #202 docs/launch-comms-prep                  — launch comms package + audit fixes
  #203 feat/mobile-section-tabs                — Phase 4.2: sticky mini-shell + section tabs + status strip
  #205 feat/mobile-quick-controls              — Phase 4.3: Color-tab QuickControls + ColorRail
  #206 docs/wrap-2026-04-30-mobile-sprint      — sprint wrap docs
  #207 feat/mobile-parameter-sheet-primitive   — Phase 4.4 foundation primitive
  #211 docs/wrap-2026-05-01-afternoon          — afternoon wrap (cascade-merged 4.4.x + 4.5 to main)
  #212 docs/launch-images-and-replies          — launch screenshot + reply pack
  #213 docs/launch-stale-numbers               — stale-numbers cleanup
  #214 docs/backlog-audit-2026-05-01-evening   — backlog audit (8 items moved to ✅)

Closed (content already on main via #211 cascade):
  #208 docs/handoff-refresh-phase-4.4-4.5      — superseded by #211
  #209 feat/mobile-parameter-sheet-integration — auto-closed when base branch deleted; content on main
  #210 feat/mobile-blade-inspect               — auto-closed when base branch deleted; content on main

Mobile UX phase rollout state — ALL ON MAIN:
  Phase 4.1 — Sticky shell foundation         ✅ merged (#199 + #200)
  Phase 4.2 — Section tabs + status strip     ✅ merged (#203)
  Phase 4.3 — QuickControls + ColorRail       ✅ merged (#205)
  Phase 4.4 — ParameterSheet primitive        ✅ merged (#207)
  Phase 4.4.x — ParameterSheet integration    ✅ merged (#211 cascade)
  Phase 4.5 — Inspect mode + zoom HUD         ✅ merged (#211 cascade)

The only remaining mobile-handoff item is the **diagnostic-strip
segment-set UX call** (Ken's decision — see PHASE 4.5 RESIDUAL
below).

PRIORITY ORDER FOR THE NEXT SESSION
-----------------------------------
1. **Make the Q3 diagnostic-strip segment-set call** (see below).
   Small follow-up PR after the call is made.

2. **Pivot to non-mobile backlog** — see CANDIDATE NEXT WORK below.

PHASE 4.5 RESIDUAL — diagnostic-strip segment-set call
------------------------------------------------------
Per `Claude Design Mobile handoff/HANDOFF.md` §Q3 — open question.

The mobile bottom status bar is ALREADY shipped via Phase 4.2's
MobileStatusBarStrip (PR #203). It wraps the existing desktop
StatusBar with `mode='scroll'`. Heights + scroll behavior + mask-
image fade all match handoff spec.

Question: which segments to display?

  (a) Keep current — desktop StatusBar mirror:
      PWR · PROFILE · BOARD · CONN · PAGE · LEDS · MOD · STOR ·
      THEME · PRESET · UTC · BUILD

  (b) Mirror handoff §Q3 exactly — user-facing diagnostics:
      BLADE 36" · 144 LED · NEOPIXEL · 3.88A · 41% CHARGE · 4.2V ·
      BT ON · PROFILE 03

  (c) Hybrid — keep most desktop segments + add charge / BT when
      data sources land

Recommended path is (a) ship-as-is — current segments cover the
diagnostic data we have. Path (c) revisit when battery + BT
surfaces wire up (post-v0.17 per BLUETOOTH_FEASIBILITY.md).

CANDIDATE NEXT WORK (non-mobile backlog, post-2026-05-01-evening audit)
----------------------------------------------------------------------
The 2026-05-01 evening audit (PR #214) found that 8 backlog items
shipped silently — `useAudioEngine` singleton (PR #176), `lib/blade/*`
extraction (PR #177), `BLADE_LENGTHS` lift (PR #99), Strip Config
thickness (PR #108), Topology Triple/Inquisitor (PR #109), Saber GIF
Sprint 3 (PR #184 + #185), OG hero (PR #174), favicon (PR #188), and
`CANONICAL_DEFAULT_CONFIG` drift-sentinel (already exists). Audio
waveform rail (Ken's note #12) shipped via PR #140. So most "natural
pivot" candidates from the prior handoff are already done.

What's actually still open and delegable:

  1. **Marketing site `/community` page** (S/M) — last 1/5 marketing
     pages from the v0.15.x re-implementation spec. The other 4
     (`/features`, `/showcase`, `/changelog`, `/faq`) shipped via
     PR #179. ⚠️ Active worktree `feat/marketing-site-expansion` may
     have this in flight (per `KyberStation-mkt`); coordinate before
     starting.

  2. **Wave 8 — Button routing sub-tab + aux/gesture-as-modulator
     plates** (L, ~6-8h) — modulation v1.1 follow-on. Well-scoped
     per `MODULATION_ROUTING_v1.1_IMPL_PLAN.md`. Adds 8 new
     modulator plates, button-event mapping per prop file. Its own
     focused session.

  3. **Card snapshot golden-hash tests (20 layout × theme combos)**
     (M) — has known cross-platform issue (Cairo text rasterization
     differs on macOS vs Linux CI per PR #147 reduction). Either
     hash only pixel-stable regions (no text), use perceptual diff
     with tolerance, or split CI by platform.

  4. **Mobile shell migration to Sidebar + MainContent** — Mobile
     shell now has the StickyMiniShell pattern from Phase 4. The
     legacy 4-tab swipe shell + `MergedDesignPanel` /
     `DesignPanel.tsx` / `DynamicsPanel.tsx` can probably retire.
     Needs Ken's UX call to confirm.

  5. **`GradientBuilder` consumer-migration stub** (S) — last
     remaining stub from the left-rail overhaul. ⚠️ Active worktree
     `refactor/gradient-editor-extraction` may have this in flight.

  6. **Wave 6 follow-on — composer slot expansion** (L) — v1.1
     Core ships shimmer-Mix only. Per-channel RGB
     (`Mix<driver, ColorLow, ColorHigh>` restructuring) + timing
     scalars. Deeper AST work per the PR #60 body.

  7. **Item B Safari BladeCanvas bloom** — Ken's hands-on, can't
     delegate. Defer until Ken has Safari time.

  8. **Cross-OS hardware sweep** — V2 / V3-OLED / Windows / Linux
     validation of the WebUSB flash path. Hardware-gated.

  9. **Saber GIF Sprint 4 (Tier 3 + UI walkthroughs)** —
     effect-specific + hilt-only + UI walkthrough GIFs per
     `SABER_GIF_ROADMAP.md` Tier 3. As-needed.

ARCHITECTURAL DECISIONS FROM TODAY (worth carrying forward)
-----------------------------------------------------------
1. transform: translateY() animation for sheets, NOT height.
   Chromium has a rendering glitch on fixed-position height
   transitions where inline height sets correctly but computes to
   the prior value until forced reflow. translateY also runs on
   the GPU compositor (better perf). Documented in
   ParameterSheet.tsx comment block.

2. Backdrop must be a sibling of the sheet, not its parent.
   CSS opacity property cascades to children; parent backdrop with
   opacity:0 makes the sheet invisible too. Encode opacity in
   `background: rgba(0,0,0,0)` and keep sheet + backdrop as
   siblings.

3. Global stores beat inline state for shell-wide overlays.
   parameterSheetStore (Phase 4.4.x) decouples slider grids from
   sheet rendering. Same pattern in inspectModeStore (Phase 4.5).
   Future per-section variants just call `open(spec)` without
   reimplementing per-variant state.

4. Defensive setPointerCapture + hasPointerCapture wrap.
   Synthetic-dispatched PointerEvents (test paths) throw
   NotFoundError because there's no real active pointer. Wrap in
   try/catch — capture is a perf hint, not load-bearing.

5. Zustand SSR snapshot pinning — use hoisted-mock pattern with
   mutable stub state for any selector-reading test. Live `setState`
   calls before `renderToStaticMarkup` are invisible to the host's
   selectors otherwise.

KEY REFERENCE FILES (local-only, gitignored)
--------------------------------------------
- Claude Design Mobile handoff/HANDOFF.md          ← spec, read first
- Claude Design Mobile handoff/components/v1-synthesis.jsx
- Claude Design Mobile handoff/components/primitives.jsx
- Claude Design Mobile handoff/styles/kyber-mobile.css
- Claude Design Mobile handoff/shots/01..11-*.png

EXISTING MOBILE PRIMITIVES (all shipped today)
-----------------------------------------------
apps/web/components/layout/mobile/
  MobileActionBar.tsx       — 5 icon+letter chips (I/C/B/L/S) + … (4.2)
  MobileSectionTabs.tsx     — horizontal COLOR/STYLE/MOTION/FX/HW/ROUTE (4.2)
  MobileStatusBarStrip.tsx  — wraps StatusBar mode='scroll' (4.2)
  ColorRail.tsx             — 8 canonical swatches + + More (4.3)
  QuickControls.tsx         — ColorQuickControls 6-slider grid (4.3+4.4.x)
  MiniSlider.tsx            — primitive: label + value + track + range (4.3)
  ParameterSheet.tsx        — 3-stop bottom sheet primitive (4.4)
  ParameterSheetBody.tsx    — default per-param body shell (4.4)
  ParameterSheetHost.tsx    — store-subscribing single-mount host (4.4.x)
  MobileInspectHUD.tsx      — 1×/2.4×/4×/🎯 zoom HUD (4.5)

apps/web/stores/
  parameterSheetStore.ts    — global single-active sheet state (4.4.x)
  inspectModeStore.ts       — Inspect mode + zoom + pan state (4.5)

apps/web/lib/
  colorHsl.ts               — rgbToHsl / hslToRgb / adjustColorHsl (4.3)

TOKENS ADDED to apps/web/app/globals.css (do NOT re-add)
---------------------------------------------------------
Phase 4.2 batch (14 tokens, all shipped):
  --header-h: 44px
  --actionbar-h: 56px
  --statusbar-h: 36px
  --section-tabs-h: 32px
  --mobile-pixel-strip-h: 36px
  --blade-rod-h: 64px
  --blade-rod-h-inspect: 200px
  --shell-h: composite calc()
  --touch-target: 44px
  --ease-sheet: cubic-bezier(0.32, 0.72, 0, 1)
  --dur-sheet: 260ms
  --sheet-radius: 14px
  --sheet-shadow: 0 -8px 24px -8px rgba(0,0,0,0.5)
  --blade-glow-cool: 0 0 24px rgba(74, 158, 255, 0.6)
  --blade-glow-warm: 0 0 24px rgba(255, 107, 53, 0.6)
  --chip-w: 96px
  --chip-h: 64px

Phase 4.5 added a CSS rule (no new tokens):
  [data-inspect-mode] header,
  [data-inspect-mode] .mobile-action-bar,
  [data-inspect-mode] .mobile-section-tabs,
  [data-inspect-mode] .mobile-statusbar-scroll,
  [data-inspect-mode] [aria-label="Pixel strip"],
  [data-inspect-mode] [aria-label="Analysis rail"] {
    opacity: 0.4;
    transition: opacity 200ms ease-out;
  }

VERIFICATION COMMANDS BEFORE STARTING
-------------------------------------
  cd /Users/KK/Development/KyberStation
  git fetch origin --prune && git status && git log --oneline -10
  git worktree list
  pnpm install
  pnpm typecheck    # should be clean across 10 packages
  pnpm test         # apps/web should be 2176+ passing

WHERE THINGS LIVE
-----------------
- CLAUDE.md "Current State (2026-05-01 afternoon)" — today's wrap-up
- CLAUDE.md "Current State (2026-05-01 morning)" — morning sprint
- Claude Design Mobile handoff/ — design source of truth (gitignored)
- docs/POST_LAUNCH_BACKLOG.md — single source of truth for open items
- docs/HARDWARE_FIDELITY_PRINCIPLE.md — north star for engine decisions
- docs/research/NEXTJS_15_UPGRADE_PLAN.md — defer to v0.17
- docs/research/BLUETOOTH_FEASIBILITY.md — defer to v0.17

OPEN PRs (post-mobile-sprint)
-----------------------------
- #214 docs/backlog-audit-2026-05-01-evening — backlog audit pass (8 items moved to ✅)
- #215 docs/handoff-refresh-2026-05-01-evening — this handoff refresh
- (mobile-sprint PRs all merged or closed; #207, #211, #212, #213 merged; #208, #209, #210 closed)

⚠️ Active sibling worktrees (cross-session coordination):
- `feat/marketing-site-expansion` — may have `/community` page in flight
- `refactor/gradient-editor-extraction` — likely the GradientBuilder cleanup

CROSS-SESSION COLLISION GUARDRAILS
-----------------------------------
The 2026-05-01 sprint hit two cross-session worktree collisions
where parallel sessions checked out different branches over the same
working tree. Recovery pattern that worked:
  git stash push -u -m "<work-in-progress label>" -- <files>
  git checkout <intended-branch>
  git stash pop

Before starting any new branch:
  1. Confirm you're on the expected base via `git log -1`
  2. Check `git worktree list` for sibling sessions
  3. If your working tree contains files modified by another
     session (e.g. a file you didn't touch shows as M in
     `git status`), do NOT blindly stage — investigate first
  4. Untracked files in `Claude Design Mobile handoff/` are
     gitignored and safe to ignore in any commit

WHAT NOT TO DO
--------------
- Don't dispatch more than 4 concurrent agents (worktree leak risk)
- Don't bypass the worktree path discipline check
- Don't merge stacked PRs with --delete-branch without recovering
  child PRs immediately (auto-close trap)
- Don't force-push to ANY branch
- Don't modify branch protection rules
- Don't replace or modify the existing Sheet primitive
  (apps/web/components/shared/Sheet.tsx, PR #195) — it's a separate
  general-purpose modal. ParameterSheet is the domain-specific
  3-stop variant. They coexist.
- Don't re-add the proposed tokens to globals.css — already shipped
- Don't add per-component sheet wiring directly inside slider grids
  — use the parameterSheetStore + ParameterSheetHost pattern
- Don't add per-component inspect wiring — use the inspectModeStore
  pattern; long-press handler stays on the canvas region wrapper

COLLABORATION DEFAULTS (from CLAUDE.md)
---------------------------------------
- Local commits + push to feature branches: pre-authorized
- PR open + PR merge: pre-authorized (merge commits, NOT squash)
- Tag cuts: ALWAYS confirm with Ken first
- Force-push: never, on any branch
- Direct push to main: blocked by branch protection (good)
- Branch protection / repo settings: never modify

END-OF-SESSION CONVENTION
-------------------------
Each session ends with:
1. Refresh THIS file (NEXT_SESSION_HANDOFF.md) in place
2. Add CLAUDE.md "Current State" entry above the previous one
3. Optional: write docs/SESSION_<date>_<short>.md archive for big sessions
4. Update docs/POST_LAUNCH_BACKLOG.md if items shipped or were added
```

---

## Quick reference — what's where

| Doc | Purpose |
|---|---|
| `CLAUDE.md` "Current State (2026-05-01 afternoon)" | Phase 4.4 + 4.4.x + 4.5 wrap — 4 PRs in stack |
| `CLAUDE.md` "Current State (2026-05-01 morning)" | Mobile sprint pivot to design handoff |
| `CLAUDE.md` "Current State (2026-04-30 night)" | Launch + post-launch sprint marathon |
| `Claude Design Mobile handoff/HANDOFF.md` | **The mobile design source of truth** — Q1-Q5 resolved with production-shape JSX + tokens |
| `Claude Design Mobile handoff/components/v1-synthesis.jsx` | Three reference screens (Color, Style, Motion) |
| `Claude Design Mobile handoff/components/primitives.jsx` | Sheet, SheetPeek, SheetBody, ColorRail, QuickControls, etc. |
| `Claude Design Mobile handoff/styles/kyber-mobile.css` | All mobile styles + token definitions |
| `docs/POST_LAUNCH_BACKLOG.md` | Single source of truth for open items |
| `docs/HARDWARE_FIDELITY_PRINCIPLE.md` | North star for engine + UI architectural decisions |
| `docs/FLASH_GUIDE.md` | Canonical end-user flash workflow (dfu-util first) |
| `docs/research/NEXTJS_15_UPGRADE_PLAN.md` | Next 14→15 migration plan (3-5h, defer to v0.17) |
| `docs/research/BLUETOOTH_FEASIBILITY.md` | Web BT feasibility — defer to v0.17 |

## Open PRs (cleanup decisions)

- **#207** `feat/mobile-parameter-sheet-primitive` — Phase 4.4 foundation primitive (4 new files, +38 tests)
- **#208** `docs/handoff-refresh-phase-4.4-4.5` — handoff doc refresh; independent of code stack
- **#209** `feat/mobile-parameter-sheet-integration` — Phase 4.4.x via parameterSheetStore (stacks on #207)
- **#210** `feat/mobile-blade-inspect` — Phase 4.5 Inspect mode + zoom HUD (stacks on #209)
- **#32** `feat/marketing-site-expansion` — substantial 4152-LOC marketing pages (38 files). Open since 2026-04-18. Needs rebase + focused review. **Leave open.**
- **#83** `docs/session-archive-2026-04-27-evening` — historical archive, conflicts with newer state. **Recommend close.**

## Phase rollout map (final)

| Phase | Status | PR |
|---|---|---|
| 4.1 Sticky shell foundation | ✅ merged | #199 + #200 |
| 4.2 Section tabs + status strip | ✅ merged | #203 |
| 4.3 QuickControls + ColorRail | ✅ merged | #205 |
| 4.4 ParameterSheet primitive (foundation) | ⏳ open | #207 |
| 4.4.x ParameterSheet integration via store | ⏳ open | #209 |
| 4.5 Inspect mode + zoom HUD | ⏳ open | #210 |
| Diagnostic strip segment-set decision | ⏸ awaits Ken's UX call | — |

## Architectural decisions from the 2026-05-01 sprint

1. **`transform: translateY()` is the right animation primitive for the sheet, not `height`.** Chromium height-transition glitch on fixed-position elements. translateY also runs on GPU compositor.
2. **Backdrop must be a sibling of the sheet, not its parent.** CSS opacity cascades to children; sibling layout keeps them independent.
3. **Mobile primitives stay confined to `apps/web/components/layout/mobile/`.** Desktop / tablet shells unchanged.
4. **Tokens added to `globals.css` are inert until consumed.**
5. **StatusBar's `mode` prop is the source-of-truth seam between desktop and mobile.** Single computation drives both.
6. **Sheet primitives live in two parallel components by design.**
   - `apps/web/components/shared/Sheet.tsx` (PR #195) — single-state general-purpose modal.
   - `apps/web/components/layout/mobile/ParameterSheet.tsx` (PR #207) — 3-stop parameter-edit specific.
   They share no implementation but consume the same tokens.
7. **Global stores beat inline component state for shell-wide overlays.** parameterSheetStore + inspectModeStore both follow this.
8. **Defensive `setPointerCapture` + `hasPointerCapture` wrap.** Synthetic-event paths throw `NotFoundError`; capture is a perf hint, not load-bearing.
9. **Zustand SSR snapshot pinning** — tests need hoisted-mock with mutable stub state pattern.
10. **Cross-session collision recovery** — `git stash push -u → branch switch → git stash pop` is the canonical pattern. Documented at top of handoff.
