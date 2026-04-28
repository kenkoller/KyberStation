# Next Session — Paste-Ready Handoff Prompt

Refreshed **2026-04-28 PM** after a long full-day session that landed 8 PRs (combat-effects + my-saber + audio + routing A/B sections; BLADE_LENGTHS canonical lift; WebUSB connection store; CLAUDE.md archive + Item G blocker note; isGreenHue/isBlueHue test backfill).

Previous handoff lives in git history (`docs/NEXT_SESSION_HANDOFF.md` was rewritten in place).

---

## Paste this into a new Claude Code session

```
Continue from the 2026-04-28 PM session for KyberStation.

PROJECT CONTEXT
---------------
KyberStation is a web-based lightsaber style editor for Proffieboard
V3.9 / ProffieOS 7.x. Last tag is v0.15.0 (Modulation Routing v1.1
Core, hardware-validated). Today's PM session shipped 8 untagged PRs
on top of the morning's 5; total 13 PRs in 2026-04-28 across two long
sessions.

WHERE WE ARE
------------
- Branch: `main`
- Last tag: `v0.15.0` (untagged work pending — 13 PRs landed today)
- Recommended browser: Brave / Chrome / Edge. Safari has one known
  cosmetic gap (BladeCanvas bloom narrower than Chromium — see
  `docs/POST_LAUNCH_BACKLOG.md` "Safari rendering follow-ups").
- All worktrees from today's sessions cleaned up. 5 older `agent-*`
  worktrees from prior sessions still locked under
  `.claude/worktrees/` — leave them alone (cross-session
  coordination rule).

READ FIRST
----------
1. `CLAUDE.md` — top "Current State (2026-04-28 PM)" entry has the
   full session recap + architectural decisions worth carrying
   forward + still-open items mapped to the original handoff.
2. `docs/POST_LAUNCH_BACKLOG.md` — single-source-of-truth backlog
   index; check before doing any work to avoid redundancy (today's
   Lane D agent saved us hours by ground-truth-checking that the
   "small-cleanups" items had already shipped on 2026-04-27).
3. `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` — for any Phase 4 follow-on
   work. §4.6 (gallery) + §4.9 (output) are the two remaining sections.
4. `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md` — for Wave 8 button
   routing sub-tab work.

OPEN ITEMS YOU CAN PICK UP (priority order)
-------------------------------------------

A. Phase 4 GALLERY A/B (top-level /gallery route)
   Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.6. Different shape
   from sidebar sections — this is a refactor of the existing
   `apps/web/components/gallery/GalleryPage.tsx` rather than a new
   component. Column A is the 305-preset filter rail + card grid
   (largely already built in GalleryPage); Column B becomes the
   selected-preset detail card with hero blade preview, era /
   faction / continuity badges, Load button, and Kyber Glyph share.
   Bigger lift than today's sidebar A/B sections because it's
   reshaping an existing surface, not adding a new one.

B. Phase 4 OUTPUT — needs UX call from Ken
   Per spec §4.9, output doesn't fit A/B cleanly because it's a
   multi-step pipeline (Generate Code → Configuration Summary →
   Preview OLED → Export to SD Card → Flash to Board). Spec
   recommends Column A as a vertical stepper indicator with status
   glyphs per step. Needs Ken's confirmation before building.

C. Items D + E — engine work (Strip Configuration thickness +
   Topology multi-segment renderer)
   Both currently WIP-marked in the live editor — user-visible
   reminders that something's incomplete. Item D wires Strip
   Configuration selection to actually change the rendered capsule
   thickness (currently feeds power-draw + ledCount only). Item E
   builds the multi-segment renderer for Triple / Inquisitor
   topologies (currently visual placeholders; Single / Staff /
   Crossguard work). Item E is the bigger architectural change —
   touches `BladeCanvas.tsx` (~2800 lines).

D. Item J — UX item #16 Figma color model
   Last UX North Star deferred item. Adds opacity + blend modes to
   `BladeColor`; engine compositor changes; codegen warnings for
   blend modes ProffieOS can't emit; Kyber Glyph version bump (v2 →
   v3). Architectural; risky. ~M-L solo session.

E. Item I — Wave 8 button routing sub-tab + aux/gesture-as-modulator
   plates. Per `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md`. New
   sub-tab inside Routing; maps button events (aux click / hold /
   gesture) to actions per prop file. ~6-8h. Adds ~8 new modulator
   plates. Worth checking whether the new Routing A/B layout from
   PR #105 changes the shape of how this slots in.

F. Item B — Safari BladeCanvas bloom (architectural, NOT delegable)
   Bloom renders dramatically narrower in Safari than Chromium.
   Needs hands-on Safari debugging — `mcp__Claude_Preview__*` tools
   run a Chromium-based browser, can't reproduce. Park unless Ken
   has a Safari instance to drive interactively.

G. Item K — `lib/blade/*` module extraction from BladeCanvas.tsx
   ~2800 lines of inline pipeline. Pre-requisite per the v0.14.0
   plan: golden-hash regression tests for 8 canonical configs first,
   THEN extract. Two sprints, not one. High blast radius.

H. Item H — Mobile shell migration to Sidebar + MainContent
   UNBLOCKS Item G (consumer-migration stub deletions). Needs UX
   call from Ken on drawer vs bottom-sheet pattern at 375px.

DON'T REDO
----------
- Sidebar A/B Phase 4 sections combat-effects / my-saber / audio /
  routing — all merged 2026-04-28
- BLADE_LENGTHS source-of-truth lift — shipped via #99
- WebUSB connection store — shipped via #104
- `BladeConfig.hiltId` typing + drawHilt cast removal — shipped
  2026-04-27 in commit `0a1a54e`
- `isGreenHue` / `isBlueHue` predicates — shipped 2026-04-27 same
  commit; tests backfilled 2026-04-28 via #103
- Lane D-shape "delete consumer-migration stubs" attempts — Item G
  is BLOCKED on Item H per `docs/POST_LAUNCH_BACKLOG.md`.
  EMPIRICALLY VERIFIED 2026-04-28; don't re-attempt without
  shipping Item H first.

PROCESS NOTES (lessons from 2026-04-28)
---------------------------------------
1. **Ground-truth-check before doing work.** Multiple agents this
   session discovered work was already done or was blocked by
   prerequisites the handoff doc didn't flag. Before starting:
   `git log --oneline -20` + `git grep` for the affected files.
   `docs/POST_LAUNCH_BACKLOG.md` is the single source of truth;
   handoff docs CAN go stale.

2. **Test seam pattern for Zustand-store-reading components.**
   Zustand's React binding pins `useSyncExternalStore`'s server
   snapshot to `getInitialState()` (`node_modules/zustand/react.js`),
   so `setState(...)` before `renderToStaticMarkup` is INVISIBLE to
   SSR tests. The pattern: add an optional prop (e.g.
   `bindings?: Foo[]`), default to store read for production, pass
   explicit data in tests. Lower-overhead than full `vi.mock`.
   See `apps/web/components/editor/routing/RoutingColumnA.tsx` for
   a worked example.

3. **Worktree path discipline.** Every parallel-agent prompt must
   include `pwd && git rev-parse --abbrev-ref HEAD` before any
   write — at least 2 agents this week leaked writes to the parent
   repo path before recovering. Recovery via `git show HEAD:<file>
   > <file>` for modified + `rm` for new is clean.

4. **Cleanup pattern after merge.** `git worktree remove -f -f`
   (single `-f` errors on the lock; double overrides). Local
   feature branches can only be deleted after the worktree is
   removed.

5. **MainContent.tsx is the conflict surface for parallel A/B
   work.** Each new section adds an `else if (activeSection ===
   'foo')` branch. Two parallel agents both editing it produces a
   1-line conflict that's mechanical to resolve at integration.

LAUNCH POSTURE
--------------
v0.15.0 hardware-validated. 13 untagged PRs since. Remaining backlog
is post-launch polish + 2 remaining Phase 4 sections + 4 architectural
items. None of the open items gate launch.

WRAP-UP
-------
When you finish a session, archive at `docs/SESSION_<date>.md`
following the shape of `docs/SESSION_2026-04-27_OVERNIGHT.md`,
update CLAUDE.md "Current State" with a one-paragraph summary +
demote the previous "Current State" block to a session header,
and refresh this handoff doc in place.

Begin by reading the docs above + running:
  git fetch origin --prune
  git status
  git log --oneline -8
to confirm branch state. PR #105 (routing A/B) may still be CI-pending
when you start; if so, check `gh pr checks 105` and merge if green
before doing other work.
```

---

## Why this handoff shape

- **Open items are mapped to original handoff letters (A-K)** so the
  state diff from 2026-04-27 evening's handoff is clear: Items C + F
  shipped; A is 4/6 done; G is BLOCKED with verified reasoning; B
  needs human Safari debugging; D + E + H + I + J + K are still the
  natural picks.
- **DON'T-REDO list explicit** — flags work that's already shipped
  AND work that was attempted but proved blocked.
- **Process notes** capture this week's lessons (ground-truth-check,
  Zustand SSR pattern, worktree discipline, MainContent conflict
  surface).
- **PR #105 status note at the bottom** — the routing PR may have
  merged between sessions or still be in CI; the prompt directs the
  new session to check.
