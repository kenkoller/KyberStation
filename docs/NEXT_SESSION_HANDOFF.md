# Next Session — Paste-Ready Handoff Prompt

Refreshed **2026-04-30 night (post-launch overnight session wrap)**. v0.16.0 launched, ~40 PRs landed in the launch + post-launch sprint, mobile UX overhaul Phase 1-2-3 done + Phase 4 underway.

The next session is **Mobile UX Phase 4 continuation** (PRs #5-#11). Phases 1-2-3 docs are in main, Phase 4 PRs #1-#4 are merged, PRs #5-#11 are queued per `docs/mobile-implementation-plan.md`.

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

WHAT JUST HAPPENED (2026-04-30 night session)
---------------------------------------------
Marathon session — ~40 PRs across launch-prep, bug fixes, brought-back
features, security audit, post-launch polish, README visual refresh,
mobile UX phasing, and Phase 4 foundation PRs.

Mobile UX overhaul state (per Ken's 4-phase prompt at docs/UX_NORTH_STAR.md):
  Phase 1 (Audit)       ✅ docs/mobile-audit.md (PR #172)
  Phase 2 (Design)      ✅ docs/mobile-design.md (PR #182)
  Phase 3 (Plan)        ✅ docs/mobile-implementation-plan.md (PR #187)
  Phase 4 (Code)        🟡 in progress
    PR #1 phone-sm breakpoint        ✅ merged (PR #190)
    PR #2 Sheet primitive            ✅ merged (PR #195)
    PR #3 ChipStrip + Chip primitives ✅ merged (PR #194)
    PR #4 in-editor bottom bar       ✅ merged (PR #193)
    PR #5 (reserved)
    PR #6 Pattern A on blade-style   ⏳ next up
    PR #7 Pattern A on color, ignition-retraction, combat-effects
    PR #8 Pattern A on audio, output, routing
    PR #9 Pattern B/C/D (my-saber, hardware/gesture/motion, layer-compositor/crystal)
    PR #10 touch ergonomics + landscape
    PR #11 verification + cleanup

Other items shipped this session:
- Crystal-themed favicon (PR #188)
- Next.js 14 → 15 upgrade research doc (PR #189)
- README visual refresh with marketing GIFs (PR #192)
- CLAUDE.md "Current State" entry for tonight (PR #191)
- Wizard auto-open on ?wizard=1 bug fix (PR #197)
- "Saber Wizard" name decision: KEEP (no rename — Ken's call after considering "The Gathering")

NEXT-SESSION PRIORITY (pick one as scope)
-----------------------------------------

A. Mobile UX Phase 4 PRs #5-#8 (4 PRs, ~6 hours)
   - PR #6 Pattern A on blade-style first (reference impl)
   - PRs #7 + #8 roll out to color, ignition-retraction, combat-effects,
     audio, output, routing
   - Each PR is reviewable in 30-60 min, dependency-tracked
   - Sequential (not parallel) — #6 must land before #7/#8 can start

B. Mobile UX Phase 4 PRs #9-#11 (3 PRs, ~5 hours)
   - PR #9 Pattern B/C/D for my-saber, hardware, gesture-controls,
     motion-simulation, layer-compositor, my-crystal
   - PR #10 touch ergonomics + landscape
   - PR #11 verification + cleanup

C. v0.16.1 patch tag prep
   - Bundle small fixes since v0.16.0 (wizard auto-open, kinetic
     presets, security audit findings, etc.) into a clean patch tag
   - Refresh CHANGELOG
   - No new code

D. v0.17 sprint kickoff
   - Wave 8 button routing (modulation v1.1+ work) — sparse spec, ~6-8h
   - OR Next.js 14 → 15 upgrade per docs/research/NEXTJS_15_UPGRADE_PLAN.md
   - OR Bluetooth POC port from Fredrik's
     profezzorn/lightsaber-web-bluetooth per docs/research/
     BLUETOOTH_FEASIBILITY.md

OPEN QUESTIONS FOR KEN (from docs/mobile-implementation-plan.md §6)
------------------------------------------------------------------
Before Phase 4 PR #6 starts, Ken should answer:
1. Pattern A chip width on phone-sm (≤479px): 96px or 80px?
2. Action bar 5-chip layout at phone-sm: icon-only or icon+letter?
3. StatusBar phone shape: collapsed single-line or horizontal-scrollable?
4. Pinch-zoom into BladeCanvas: in-scope or out?
5. Phase 4 PR cadence: review one-at-a-time, or batch 2-3 per session?

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
- CLAUDE.md "Current State (2026-04-30 night)" — last refreshed PR #191
- docs/mobile-audit.md / mobile-design.md / mobile-implementation-plan.md
- docs/SECURITY_AUDIT_2026-04-30.md
- docs/research/NEXTJS_15_UPGRADE_PLAN.md
- docs/research/BLUETOOTH_FEASIBILITY.md
- docs/POST_LAUNCH_BACKLOG.md (single source of truth)
- docs/SESSION_2026-04-30_NIGHT_v0.16.0_LAUNCH.md (full archive)

WHAT NOT TO DO
--------------
- Don't dispatch more than 4 concurrent agents (worktree leak risk
  compounds; salvage cost ~10 min per leak; we lost 3 to leaks tonight)
- Don't bypass the worktree path discipline check — agents MUST `pwd`
  first and use that absolute path prefix
- Don't merge Phase 4 PRs out-of-sequence — dependencies are tracked
  in the impl plan
- Don't modify branch protection rules (system safety prohibits this)
- Don't try to land card-snapshot golden-hash with node-canvas — Cairo
  cross-OS AA drift; use Playwright visual-diff instead
- Don't force-push to ANY branch (strict per CLAUDE.md collaboration
  defaults) — re-create the branch instead

COLLABORATION DEFAULTS (from CLAUDE.md)
---------------------------------------
- Local commits + push to feature branches: pre-authorized
- PR open + PR merge: pre-authorized (with merge commits, NOT squash)
- Tag cuts: ALWAYS confirm with Ken first
- Force-push: never, on any branch
- Direct push to main: blocked by branch protection (good)
- Branch protection / repo settings: never modify (system prohibition)

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
| `CLAUDE.md` "Current State (2026-04-30 night)" | Tonight's marathon — full PR ledger + decisions |
| `CLAUDE.md` "Current State (2026-04-30 PM)" | Launch posture lock + FLASH_GUIDE (kept as historical) |
| `docs/SESSION_2026-04-30_NIGHT_v0.16.0_LAUNCH.md` | Detailed archive of tonight's session |
| `docs/mobile-audit.md` | Phase 1 — current state of mobile shell |
| `docs/mobile-design.md` | Phase 2 — proposed layout pattern (chip-strip + sheets + in-editor bottom bar) |
| `docs/mobile-implementation-plan.md` | Phase 3 — 11-PR sequence with dependencies |
| `docs/SECURITY_AUDIT_2026-04-30.md` | Security posture findings + remediation |
| `docs/research/NEXTJS_15_UPGRADE_PLAN.md` | Next 14→15 migration plan (3-5h, defer to v0.17) |
| `docs/research/BLUETOOTH_FEASIBILITY.md` | Web BT feasibility — port Fredrik's POC, defer to v0.17 |
| `docs/POST_LAUNCH_BACKLOG.md` | Single source of truth for open items |
| `docs/HARDWARE_FIDELITY_PRINCIPLE.md` | North star for engine + UI architectural decisions |
| `docs/FLASH_GUIDE.md` | Canonical end-user flash workflow (dfu-util first) |
| `docs/LAUNCH_ASSETS.md` | Reddit drafts + screenshot shot list |

## Stale long-running PRs (not from this session)

- PR #32 `feat/marketing-site-expansion` — superseded by PR #179 (marketing pages shipped). Can close.
- PR #83 `docs/session-archive-2026-04-27-evening` — pre-launch session archive. Can close or merge if useful.

## Reminder: open questions before Phase 4 #6

1. Chip width on phone-sm
2. Action bar reflow at phone-sm
3. StatusBar phone shape
4. Pinch-zoom into BladeCanvas
5. PR cadence preference

These need Ken's answers before the next mobile-pattern-rollout PR starts. Ken can write back inline with answers + the next session can dispatch immediately.
