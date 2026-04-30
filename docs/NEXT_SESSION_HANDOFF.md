# Next Session — Paste-Ready Handoff Prompt

Refreshed **2026-05-01 morning (mobile sprint pivot to design handoff)**. v0.16.0 launched 2026-04-30. Mobile UX overhaul has pivoted from the original `docs/mobile-implementation-plan.md` chip-strip plan to the **Claude Design StickyMiniShell handoff** that arrived this morning at `Claude Design Mobile handoff/HANDOFF.md`. Phases 4.1, 4.2, and 4.3 are merged to main.

The next session is **Mobile UX Phase 4.4 — Sheet primitive (peek + full) wired to long-press on knobs**, then 4.5 (Inspect mode + bottom diagnostic strip).

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

WHAT JUST HAPPENED (2026-05-01 morning + 2026-04-30 day, mobile sprint)
----------------------------------------------------------------------
SIX more PRs merged today on top of last night's launch sprint. Most
significant move: mid-sprint pivot away from the original
`docs/mobile-implementation-plan.md` chip-strip Pattern A toward the
Claude Design StickyMiniShell handoff that arrived in the morning.

Today's merges (in order):
  #199 mobile/shell-density-and-sticky-canvas  — PR A1: sticky shell + drawer + auto-ignite
  #200 mobile/density-v2-and-stacked-columns   — PR A2: density v2 + stacked A/B columns + analysis stack
  #201 chore/gitignore-design-handoff-folder   — gitignore for the local design reference
  #202 docs/launch-comms-prep                  — launch comms package + audit fixes
  #203 feat/mobile-section-tabs                — Phase 4.2: sticky mini-shell + section tabs + status strip
  #205 feat/mobile-quick-controls              — Phase 4.3: Color-tab QuickControls + ColorRail (recovery PR for #204)

Mobile UX overhaul state — NEW PHASE SEQUENCE (per design handoff):
  Phase 4.1 — Sticky shell foundation       ✅ #199 + #200 (PR A1 + A2)
  Phase 4.2 — Section tabs + status strip    ✅ #203
  Phase 4.3 — QuickControls + ColorRail      ✅ #205
  Phase 4.4 — Sheet primitive (peek + full)  ⏳ NEXT
  Phase 4.5 — Inspect mode + diagnostic strip ⏳ after 4.4

The original `docs/mobile-implementation-plan.md` (PRs #5-#11 chip
strip plan) is now historical. The Claude Design handoff at
`Claude Design Mobile handoff/HANDOFF.md` is the active source of truth.

PHASE 4.4 SCOPE — Sheet primitive (peek + full)
-----------------------------------------------
Per `Claude Design Mobile handoff/HANDOFF.md` §Q5:

The Phase 4 PR #2 single-state Sheet primitive (`apps/web/components/
shared/Sheet.tsx`, shipped via PR #195) needs to be replaced/extended
with a 3-stop sheet:

  - closed (unmounted)
  - peek    168px
  - full    min(92vh, 720px) — never quite full-screen

Drag stops — only the three. No free-drag — animates to nearest on
release. 48px threshold per stop transition. `cubic-bezier(0.32,
0.72, 0, 1)` 260ms on `transform: translateY()`.

Backdrop only at `full` (rgba(0,0,0,0.5) fade-in 200ms). No backdrop
at `peek`.

Wire to long-press on QuickControls knobs (PR #205): tap = flip to
slider, long-press = open sheet for that parameter.

Reference JSX to lift verbatim: `Claude Design Mobile handoff/
components/v1-synthesis.jsx` (the three reference screens — Color,
Style, Motion — already implement Sheet usage).

Reference primitives: `Claude Design Mobile handoff/components/
primitives.jsx` has `Sheet`, `SheetPeek`, `SheetBody` components
to lift.

PHASE 4.5 SCOPE — Inspect mode + diagnostic strip
-------------------------------------------------
Per `Claude Design Mobile handoff/HANDOFF.md` §Q3 + §Q4:

Inspect mode:
  - 500ms long-press anywhere in `.blade-canvas` enters Inspect
  - Floating zoom HUD top-right: 1× / 2.4× / 4× / 🎯
  - 🎯 button re-centers + resets to 1×
  - One-finger pan (no pinch v1)
  - On enter: fade other chrome to opacity 0.4 (don't block taps)
  - Keep blade animation running while inspecting

Bottom diagnostic strip:
  - 36px tall, pinned bottom (above OS gesture bar)
  - Horizontal scroll: BLADE 36" · 144 LED · NEOPIXEL · 3.88A · 41% CHARGE · 4.2V · BT ON · PROFILE 03
  - JetBrains Mono 500 / 11px / 0.06em tracking
  - Critical pieces first (BLADE, LED, charge)
  - When BT disconnects: swap to "BT OFF" colored --status-warn
  - When charge < 15%: charge segment goes --status-error

KEY REFERENCE FILES (local-only, gitignored)
--------------------------------------------
- Claude Design Mobile handoff/HANDOFF.md       ← spec, read first
- Claude Design Mobile handoff/components/v1-synthesis.jsx
                                                ← lift verbatim
- Claude Design Mobile handoff/components/primitives.jsx
                                                ← Sheet/SheetPeek/SheetBody source
- Claude Design Mobile handoff/styles/kyber-mobile.css
                                                ← all mobile styles + tokens
- Claude Design Mobile handoff/shots/01..11-*.png ← per-decision screenshots

PROPOSED TOKENS (HANDOFF §"Tokens we'd want added")
---------------------------------------------------
Phase 4.4 should add to `apps/web/app/globals.css`:
  --sheet-radius: 14px
  --sheet-shadow: 0 -8px 24px -8px rgba(0,0,0,0.5)
  --ease-sheet: cubic-bezier(0.32, 0.72, 0, 1)
  --dur-sheet: 260ms
  --touch-target: 44px

Phase 4.5 should add:
  --statusbar-h: 36px
  --blade-rod-h-inspect: 28px

VERIFICATION COMMANDS BEFORE STARTING
-------------------------------------
  cd /Users/KK/Development/KyberStation
  git fetch origin --prune && git status && git log --oneline -10
  git worktree list             # should be ~2 (main + KyberStation-mkt)
  pnpm install
  pnpm typecheck                # should be clean (10/10 packages)
  pnpm test                     # should be ~5,000 passing

WHERE THINGS LIVE
-----------------
- CLAUDE.md "Current State (2026-05-01 morning)" — today's wrap-up
- CLAUDE.md "Current State (2026-04-30 night)" — last night's marathon
- Claude Design Mobile handoff/ — the design source of truth (gitignored)
- docs/POST_LAUNCH_BACKLOG.md — single source of truth for open items
- docs/HARDWARE_FIDELITY_PRINCIPLE.md — north star for engine decisions
- docs/research/NEXTJS_15_UPGRADE_PLAN.md — defer to v0.17
- docs/research/BLUETOOTH_FEASIBILITY.md — defer to v0.17

OPEN PRs (other than mobile)
----------------------------
- #32 feat/marketing-site-expansion — needs rebase, leave open, focused session post-mobile-sprint
- #83 docs/session-archive-2026-04-27-evening — recommend close (historical)

WHAT NOT TO DO
--------------
- Don't dispatch more than 4 concurrent agents (worktree leak risk)
- Don't bypass the worktree path discipline check
- Don't merge stacked PRs with --delete-branch without recovering
  child PRs immediately (auto-close trap — see CLAUDE.md current
  state for procedure: child PR's branch is usually a fast-forward
  of new main + 1 commit, just `gh pr create --base main` against
  the same branch)
- Don't force-push to ANY branch (strict per CLAUDE.md collab defaults)
- Don't modify branch protection rules

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
| `CLAUDE.md` "Current State (2026-05-01 morning)" | Today's mobile-sprint wrap-up — 6 PRs + design handoff pivot |
| `CLAUDE.md` "Current State (2026-04-30 night)" | Launch + post-launch sprint marathon (~30 PRs) |
| `Claude Design Mobile handoff/HANDOFF.md` | **The current mobile design source of truth** — Q1-Q5 resolved with production-shape JSX + tokens. Local-only (gitignored) |
| `Claude Design Mobile handoff/components/v1-synthesis.jsx` | Three reference screens (Color, Style, Motion) — lift verbatim |
| `Claude Design Mobile handoff/components/primitives.jsx` | Sheet, SheetPeek, SheetBody, ColorRail, QuickControls, etc. |
| `Claude Design Mobile handoff/styles/kyber-mobile.css` | All mobile styles + token definitions |
| `docs/mobile-audit.md` | Phase 1 — current state audit (historical) |
| `docs/mobile-design.md` | Phase 2 — chip-strip proposal (superseded by handoff) |
| `docs/mobile-implementation-plan.md` | Phase 3 — original 11-PR plan (historical, partially executed) |
| `docs/SECURITY_AUDIT_2026-04-30.md` | Security posture findings + remediation |
| `docs/research/NEXTJS_15_UPGRADE_PLAN.md` | Next 14→15 migration plan (3-5h, defer to v0.17) |
| `docs/research/BLUETOOTH_FEASIBILITY.md` | Web BT feasibility — port Fredrik's POC, defer to v0.17 |
| `docs/POST_LAUNCH_BACKLOG.md` | Single source of truth for open items |
| `docs/HARDWARE_FIDELITY_PRINCIPLE.md` | North star for engine + UI architectural decisions |
| `docs/FLASH_GUIDE.md` | Canonical end-user flash workflow (dfu-util first) |

## Open PRs (cleanup decisions)

- **#32** `feat/marketing-site-expansion` — substantial 4152-LOC marketing pages (38 files). Open since 2026-04-18. Needs rebase + focused review session post-mobile-sprint. **Leave open.**
- **#83** `docs/session-archive-2026-04-27-evening` — historical session archive, conflicts with newer state. **Recommend close** (work it documents is already on main).

## Phase rollout map (current)

| Phase | Status | Branch convention |
|---|---|---|
| 4.1 Sticky shell foundation | ✅ #199 + #200 | `feat/mobile-shell-sticky` |
| 4.2 Section tabs + status strip | ✅ #203 | `feat/mobile-section-tabs` |
| 4.3 QuickControls + ColorRail | ✅ #205 | `feat/mobile-quick-controls` |
| **4.4 Sheet primitive (peek + full)** | **⏳ NEXT** | `feat/mobile-sheet-primitive` |
| 4.5 Inspect mode + diagnostic strip | ⏳ after 4.4 | `feat/mobile-blade-inspect` |
