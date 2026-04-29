# Next Session — Paste-Ready Handoff Prompt

Refreshed **2026-04-29 late** after a long full-day session that landed 15 PRs (#107–117 + #119 + #121 + #123 + #125, plus Ken's #115). All Phase 4 sidebar A/B sections complete (6/6). Major Hardware Fidelity Principle violation closed (BlendMode tighten). Two background agents (marketing site + Saber GIF Sprint 2) ran for ~2.5h without pushing — likely stuck; the next session should ping them or write off the work.

Previous handoff is in git history (`docs/NEXT_SESSION_HANDOFF.md` rewritten in place 2x today).

---

## Paste this into a new Claude Code session

```
Continue from the 2026-04-29 late session for KyberStation.

PROJECT CONTEXT
---------------
KyberStation is a web-based lightsaber style editor for Proffieboard
V3.9 / ProffieOS 7.x. Last tag is v0.15.0 (Modulation Routing v1.1
Core, hardware-validated). 2026-04-29 shipped 15 PRs total — 8 on
the morning side (#107-114) plus 7 in the afternoon (#115 from Ken,
#116 BlendMode tighten, #117 MGP infra, #119 blade-effect-button
overlap, #121 Phase 4 output A/B, #123 sampler progress, #125 MGP
26 compact thumbnails). Ken also shipped #118 (Audio Brave warning)
and #122 (12 modern Proffie sound categories) from a parallel
session.

WHERE WE ARE
------------
- Branch: `main`
- Last tag: `v0.15.0` (substantial untagged work pending — 17+ PRs
  since the tag including this session's batch)
- Recommended browser: Brave / Chrome / Edge. Safari known cosmetic
  gap (BladeCanvas bloom narrower than Chromium — see
  `docs/POST_LAUNCH_BACKLOG.md`).
- Cleanup state: 3 of today's agent worktrees were reaped post-merge.
  Two background agents from late session are likely stuck (no push
  in ~2.5h):
    * `agent-a077c8445fc8384d1` — Marketing site re-impl
      (worktree-agent-a077c8445fc8384d1 / `feat/marketing-site-v0.15.x`)
    * `agent-af446b7e1bb77edd2` — Saber GIF Sprint 2
      (`feat/saber-gif-sprint-2`)
  Their worktrees are still locked under `.claude/worktrees/`. First
  thing to do is `gh pr list --state open --author '@me'` + check
  whether those branches exist on origin. If they do but no PR opened,
  they got stuck pre-PR-creation; review their commits + finalise
  manually. If branches don't exist on origin, the work didn't push
  — write it off and re-dispatch.

READ FIRST
----------
1. `CLAUDE.md` — top "Current State (2026-04-29 late)" entry has the
   full session recap.
2. `docs/POST_LAUNCH_BACKLOG.md` — Tier 1 / Tier 2 status table at
   the top reflects what shipped 2026-04-29; only 6 items remain
   open of the original 14 in the shortlist Ken approved. Ground-
   truth-check before touching any "open" item — multiple were
   already shipped earlier this week and the backlog stale-bit at
   each.
3. `docs/HARDWARE_FIDELITY_PRINCIPLE.md` — new "Audit history"
   section at the bottom. **The blend-mode tighten in PR #116 closed
   a major existing violation.** Going forward any new layer/blend
   mode MUST emit to a ProffieOS template before shipping.
4. `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` — Phase 4 spec is now 6/6
   complete. Reference only; nothing to extend on this axis.
5. `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md` — Wave 8 button
   routing sub-tab is the largest remaining open item (sparse spec;
   needs design pass).

OPEN ITEMS YOU CAN PICK UP (priority order)
-------------------------------------------

A. Check on background agents from 2026-04-29 late session
   First action of the session. Both `feat/marketing-site-v0.15.x`
   and `feat/saber-gif-sprint-2` agents were dispatched but never
   pushed in 2.5h. Either:
   - Use SendMessage with the agent IDs above to ping them for
     status (if Claude harness still has them addressable)
   - OR: walk into the worktrees, review what's there, finalise
     + commit + push manually
   - OR: write off the work and re-dispatch fresh agents with the
     same prompts (saved at `/tmp/...` from earlier — actually,
     reconstruct from `docs/SABER_GIF_ROADMAP.md` Sprint 2 spec
     for GIF, and the v0.15.x patch sprint backlog row for marketing)

B. T2.10 + T2.9 — Renderer-level + card-snapshot golden-hash tests
   Both gated on `canvas` (npm) being added as a dev dep. The
   Saber GIF agent was supposed to add it; if their work landed
   after this session's handoff, you can build on top. If not,
   add it yourself in a small infra PR + then build the harness.
   T2.10 unblocks Item K (lib/blade module extraction) properly
   — engine-side golden-hash tests already shipped via PR #112,
   but they don't catch renderer drift (bloom / tonemap / canvas).
   Renderer-level tests are the explicit prerequisite per the
   v0.14.0 plan.

C. Item K — `lib/blade/*` module extraction
   ~2800 lines in `BladeCanvas.tsx`. After T2.10 lands, the
   extraction can proceed safely. Per the v0.14.0 plan, target
   modules: `lib/blade/pipeline.ts` (capsule rasterizer + bloom
   chain), `lib/blade/bloom.ts` (3-mip downsampled bright-pass),
   `lib/blade/colorSpace.ts` (already exists; absorbs more from
   BladeCanvas), `lib/blade/tonemap.ts`. Once extracted, MiniSaber
   / FullscreenPreview / SaberCard's `drawBlade.ts` can adopt the
   same pipeline rather than each having their own port.

D. Wave 8 — Button routing sub-tab
   Spec is 2 bullet points in `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md`
   §10. Needs a design pass first: what's the visual treatment for
   a "button event as modulator source" plate? What aux/click/hold/
   gesture vocabulary does each prop file expose (Fett263 vs sa22c
   vs bc vs shtok)? Recommend writing a 1-page design doc before
   coding. ~6-8h once shape is clear.

E. Item H — Mobile shell migration to Sidebar + MainContent
   Needs Ken's UX call on drawer vs bottom-sheet at 375px. Once
   that's decided, the migration unblocks the 3 consumer-migration
   stub deletions (`BladeHardwarePanel.tsx`, `PowerDrawPanel.tsx`,
   `GradientBuilder.tsx`) per the BLOCKED row in
   `docs/POST_LAUNCH_BACKLOG.md`.

F. Item B — Safari BladeCanvas bloom
   Bloom renders dramatically narrower in Safari than Chromium.
   Needs hands-on Safari debugging (mcp__Claude_Preview__* runs
   Chromium-only). Park unless Ken has a Safari instance available
   to drive interactively.

G. Sub-1024px responsive cleanup beyond the action-bar fix
   PR #119 fixed the blade-effect chip overlap at 1024-1279px by
   making chips icon-only below 1280. Broader sub-1024px layout
   issues (per Ken's notes) are post-launch — the goal state is
   clean ≥1024 + clean mobile (375px); intermediate widths can
   stay rough.

DON'T REDO
----------
- Phase 4 sidebar A/B — all 6 sections done (combat-effects /
  my-saber / audio / routing / gallery / output)
- BlendMode tighten / Hardware Fidelity audit history — shipped
  via PR #116
- T1.2 MGP compact thumbnails — both infra (PR #117) and 26 SVGs
  (PR #125) shipped
- T1.3 sampler progress fields — shipped via PR #123
- Custom color popover (T1.1) — Ken explicitly dropped per his
  reasoning that the deep Color section already covers the case;
  existing code's comment-against was correct
- Item J Figma color model (full opacity + blend modes) — Ken
  explicitly dropped because non-emittable blend modes would
  violate Hardware Fidelity Principle. Audit-and-tighten
  (PR #116) is the right Hardware-Fidelity-Principle-consistent
  path; it shipped instead.
- Marketing site re-implementation per the prior backlog — Ken
  explicitly deprioritized; it's not launch-blocking. The agent
  was dispatched but probably stuck — IF you decide to revive it,
  do so under a fresh agent dispatch.

PROCESS NOTES (lessons from 2026-04-29)
---------------------------------------
1. **Backlog stale-bit is real.** Multiple "open" items in
   `docs/POST_LAUNCH_BACKLOG.md` v0.15.x sprint table turned out
   to be already shipped at session start (CardTheme tokens,
   useSharedConfig URL test, Light-theme blade bloom, Hilt Library
   Stage 2, WebUSB store consumers). The Hilt Stage 2 agent
   correctly verified-first and reported "already shipped via PR
   #79." Pattern: before touching any backlog item, run
   `git log --oneline --grep="<keyword>"` + `git grep` for the
   relevant code to confirm the work isn't already in main.

2. **Worktree path discipline — agent leaks still happen.** The
   MGP compact-SVGs agent caught itself writing to the parent repo
   path mid-task and reverted before continuing. Pattern is
   load-bearing: every parallel-agent prompt must include
   `pwd && git rev-parse --abbrev-ref HEAD` confirmation step,
   AND agents should self-check that string before each batch of
   writes.

3. **Auto-closed PRs from base-branch deletion.** When merging a
   PR with `--delete-branch`, any open PRs targeting that branch
   auto-close on GitHub. If a parallel agent's PR was based on
   the just-merged branch, it ends up CLOSED + DIRTY/CONFLICTING
   (you can't reopen via API once base is gone). Workflow:
   `git checkout <agent-branch>` + `git rebase main` +
   `git push --force-with-lease` + `gh pr create` (new PR number).
   Happened on #120 → reborn as #125 this session.

4. **Engine-level golden-hash ≠ renderer-level golden-hash.**
   PR #112 shipped engine golden tests (LED-buffer hashes via
   `captureStateFrame` + FNV-1a). They protect engine drift
   (style algos, state machine, topology) but NOT renderer drift
   (bloom, tonemap, canvas pipeline). Renderer-level tests need
   `canvas` (npm) and are the explicit prerequisite for Item K.

5. **MainContent.tsx is the conflict surface for parallel A/B
   work.** Each new section adds an `else if` branch. Two
   parallel agents both editing it produces a 1-line conflict
   that's mechanical to resolve at integration. Phase 4 output
   PR #121 had this; resolution was clean.

6. **Hardware Fidelity Principle wins UX disputes.** When asked
   whether to expand or tighten Item J (Figma color model), Ken's
   instinct was right: the principle says "no visualizer-only
   features that misrepresent the real blade." Item J as
   originally specified would have ADDED non-emittable blend
   modes — direct violation. The tighten path closed an existing
   violation (5 visualizer-only blend modes → 1 emittable mode).
   Pre-public-launch is the right time for a one-way migration
   like that.

LAUNCH POSTURE
--------------
v0.15.0 hardware-validated. 17+ untagged PRs since (this session
landed 15). All Tier 1 + most of Tier 2 from Ken's pre-launch
shortlist either shipped or scoped for clear follow-on. Remaining
backlog is post-launch polish + 2 architectural sprints (Modulation
Wave 8 + Item K module extraction). None of the open items gate
launch — recommended path is a v0.15.1 patch tag once the 2 stuck
agents resolve, then start Wave 8 / Item K against a fresh focused
session.

WRAP-UP
-------
When you finish a session, archive the session at
`docs/SESSION_<date>.md` if it's a long one, update `CLAUDE.md`
"Current State" with a one-paragraph summary + demote the previous
"Current State" block to a session header, and refresh THIS handoff
doc in place.

Begin by reading the docs above + running:
  git fetch origin --prune
  git status
  git log --oneline -8
  gh pr list --state open --author '@me'
  git worktree list
to confirm branch state. The two stuck agents from 2026-04-29 late
session need either ping-and-recover OR write-off-and-redispatch
attention before any new work begins.
```

---

## Why this handoff shape

- **Stuck-agent recovery is the first priority** for the next
  session. If Claude can ping the agent IDs, that's free progress.
  If not, the work is lost — but the prompts are reconstructible
  from spec docs.
- **Tier 1 + Tier 2 inventory delta from 2026-04-29 morning's
  shortlist** is captured in DON'T-REDO + the open items list. 8
  of 14 items shipped; 6 remain.
- **Process notes capture this session's lessons** —
  ground-truth-check, worktree discipline, auto-closed-PRs-on-base-
  delete, engine-vs-renderer test layers, Hardware Fidelity
  Principle as UX-dispute arbiter.
- **Recommended v0.15.1 tag** is captured — clean cut point if Ken
  wants a release before bigger architectural work.
