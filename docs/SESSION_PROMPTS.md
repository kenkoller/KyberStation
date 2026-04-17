# KyberStation — Session Prompts

Copy-paste-ready prompts for starting new Claude Code sessions on this project. Three variants covering the cases that come up in practice.

**Quick reference table:**

| Case | Shorthand | When to use |
|------|-----------|-------------|
| [New Session](#new-session) | `NEW` | Fresh chat, no specific agenda — let the session propose direction after reading project state |
| [Continuing a Session](#continuing-a-session) | `CONTINUE` | You know the sprint / deferred item you want executed — session reads state, plans, and builds |
| [Coordinating Multiple Sessions](#coordinating-multiple-sessions) | `COORDINATE` | 2+ sessions running in parallel and you need one to arbitrate merge order + conflict audit |

Each prompt shares the same discipline loop: **read state → verify no conflicts → branch → work → wrap-up prompt**. That's the pattern that converged the 5-session v0.11.1 phase on 2026-04-17 without collisions (see `docs/SESSION_2026-04-17_C.md` for the post-mortem).

---

## New Session

**Shorthand:** `NEW`

**When to use:** a fresh chat with no pre-decided agenda. You want the session to orient itself, tell you what's ripe to work on, and wait for direction.

```
You're working on KyberStation at /Users/KK/Development/KyberStation.
Before doing anything:

1. `git fetch origin && git log --oneline origin/main -10` — see what's
   landed recently.
2. Read `CLAUDE.md` top-to-bottom — especially "Current State",
   "Deferred items", and the sprint roadmap.
3. Read `docs/SESSION_2026-04-17_C.md` — it has the merge-order
   playbook, cross-session coordination rules, and the wrap-up prompt
   you'll use at session close.
4. Check `git worktree list` and `gh pr list --state open` — if other
   sessions are active, treat their branches and file footprints as
   hands-off until they merge.

Then tell me what you're here to work on. I'll confirm it doesn't
collide with any active sessions before we start, and I'll branch off
`origin/main` (never commit directly to main — the pre-push hook will
block you if you try).

At session close, run the wrap-up prompt from
`docs/SESSION_2026-04-17_C.md`: ship-vs-defer triage, typecheck + tests,
commit + push + PR, document deferred work, short report.
```

---

## Continuing a Session

**Shorthand:** `CONTINUE`

**When to use:** you've picked a specific sprint — a deferred item, a roadmap entry, or a feature you already scoped elsewhere. You want execution, not exploration.

```
You're working on KyberStation. We're tackling <SPRINT NAME> —
<ONE-LINE DESCRIPTION>.

First: `git fetch origin`, read `CLAUDE.md` "Current State" +
"Deferred items", check `git worktree list` and open PRs. Confirm
this sprint is in the deferred list or sprint roadmap and nobody
else is touching its file footprint.

Then: propose a 3-5 step plan with the files you'll touch, CI gates,
and how we verify. Wait for my go-ahead before branching.

When ready: branch `feat/<short-name>` off `origin/main`. Commit in
meaningful chunks. Run `pnpm -w typecheck && pnpm -w test` before
each commit. Open a PR when a coherent chunk is done — don't hold
work locally.

At session close: use the wrap-up prompt in
`docs/SESSION_2026-04-17_C.md`.
```

### Ready-to-use sprint names

Fill `<SPRINT NAME>` and `<ONE-LINE DESCRIPTION>` with one of these. Re-read `CLAUDE.md` before pasting in case anything has shipped or changed status.

- **Lint enforcement** — activate ESLint + `@typescript-eslint` across all 6 packages, wire CI lint gate, triage preexisting issues with an explicit fix-vs-disable policy
- **Share Pack implementation** — full Saber Card hilt+blade hero renderer, hum-GIF + state-cycle-GIF variants, Aurebesh card typography, Discord OG meta tags, `?config=<base64>` fallback toast when glyph exceeds QR capacity (spec in `docs/SHARE_PACK.md`)
- **Visualization polish pass (v0.12.x)** — gamma fidelity, LED bleed, polycarbonate diffusion accuracy, rim glow, bloom curves, motion blur on swing; reference-stills library from films/shows
- **Hardware validation** — smoke-test WebUSB flash on real Proffieboard V3.9 through the 3-phase checklist in `docs/HARDWARE_VALIDATION_TODO.md`
- **Kyber Forge ultra-wide mode (v0.13.0)** — dedicated layout for 21:9 / 32:9 / 32:10 displays
- **Preset Cartography (v0.14.0)** — parallel-agent preset expansion across deep-cut lanes (Prequel/OT/Sequel, Legends/KOTOR, Clone Wars, Mando/Ahsoka, cross-franchise)
- **Multi-Blade Workbench (v0.15.0)** — channel-strip UI for dual-blade / saberstaff / crossguard sabers
- **Editor + gallery README screenshots** — 30-min micro-sprint; generate screenshots from headless Chrome with the onboarding modal pre-dismissed via `localStorage.setItem('kyberstation-onboarding-complete', 'true')`
- **Strict glyph pairing for identity colors** — extend v0.11.1 `<StatusSignal>` pattern to `TimelinePanel` event-type markers + `StorageBudgetPanel` segment colors (optional polish, not a release blocker)

---

## Coordinating Multiple Sessions

**Shorthand:** `COORDINATE`

**When to use:** you've got 2+ sessions running on separate worktrees and need one Claude to arbitrate — survey state, spot conflicts, recommend merge order. Coordination is the job, not feature work.

```
You're the orchestrator session for KyberStation. Other claude
sessions are running in parallel on separate worktrees. Your job is
coordination, not feature work.

Survey:
- `git worktree list` — who's active
- `gh pr list --state open --json number,title,headRefName,mergeStateStatus`
- For each active worktree, `cd <path> && git status --short` —
  find uncommitted work
- Diff each open PR: `gh pr diff <n> --name-only`

Report:
- File-footprint conflict matrix across all active sessions + PRs
- Recommended merge order (smallest/most-isolated first, lockfile
  touchers last, draft/BLOCKED PRs held)
- Which sessions need the wrap-up prompt (uncommitted work) vs which
  are already clean

Do NOT merge PRs or write code yourself unless I explicitly ask. Your
value is the survey + the merge-order recommendation.
```

---

## Shared discipline (all three prompts)

Every prompt ends the same way — at session close, the session runs the **wrap-up prompt** from `docs/SESSION_2026-04-17_C.md`. That prompt:

1. Reports status (uncommitted files, unpushed commits, branch, PR)
2. Separates ship-ready from WIP for every uncommitted file
3. Lands ship-ready work (typecheck + test → commit → push → PR)
4. Documents deferred work in the PR description or `CHANGELOG.md`
5. Replies with a short verdict: READY / NEEDS-MORE-WORK / BLOCKED

**Never merge a session's own PR.** The orchestrator (you, or a COORDINATE session) decides merge order across all active work.

**Never commit directly to `main`.** The `.githooks/pre-push` hook (installed via `pnpm run hooks:install`) blocks force-push + deletion of main for any clone that's run the installer. Even in a bypassable case, always prefer branch-and-PR.

---

## Keeping this doc honest

Update this file when:

- A new deferred item joins the sprint roadmap and you want it in the CONTINUE sprint-names list
- `CLAUDE.md`'s top-level structure changes and the "read steps" in NEW need to point at different sections
- You find a gotcha in running parallel sessions that the COORDINATE prompt should catch

See also: `CLAUDE.md` (project context), `CHANGELOG.md` (release history), `docs/SESSION_2026-04-17_C.md` (the session post-mortem where this pattern was proven out).
