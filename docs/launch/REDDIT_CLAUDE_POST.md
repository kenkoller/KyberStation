# Reddit Post: r/ClaudeAI

The Claude-craft angle on the same launch. Different audience, different
framing. r/ClaudeAI users want substance about *how* a project was
built with Claude, what worked, what didn't, what the actual workflow
looks like. They are deeply skeptical of "I built a SaaS in 5 minutes
with AI" posts, so the antidote is concrete + honest + specific.

**Best subreddit fit:** r/ClaudeAI (the active Anthropic-focused sub).
Cross-post candidates after: r/cursor (workflow-overlap audience),
r/LocalLLaMA (build-process angle, not the model angle), r/programming
(only if there's real engineering depth surfaced in comments).

**Suggested timing:** A few days *after* the r/lightsabers launch goes
well. That gives you real engagement numbers to mention ("the post hit
front page of r/lightsabers", "users have flashed it on N boards", etc.)
which adds concrete texture and isn't speculation.

**Suggested flair:** "Productivity" / "Coding" / "Showcase", whichever
the sub has active for build-with-Claude posts.

**Hard rules:**
- Don't make Claude the protagonist. *You* made the architectural
  decisions. Claude was a force multiplier.
- Don't overclaim productivity gains. "10x dev speed" claims rot fast.
- Be specific about what didn't work. r/ClaudeAI rewards honesty.
- Do not paste the lightsabers post. Different audience, different
  story.

---

## Title: pick one (ranked)

1. Built my first public project (a niche hobby tool) with Claude Code on the Max plan over a few weeks. Sharing what worked and what didn't.
2. KyberStation: 5,000 tests, 10 packages, 30+ PRs in one launch session. First public project, built with Claude Code + Claude Design.
3. Non-pro programmer, first public project, shipped this week with Claude Code (Max plan). Workflow notes and honest rough edges.
4. What actually worked in shipping a non-trivial side project with Claude Code: parallel agents, plan mode, MCPs, and the things that bit me.

**Don't use:** "10x productivity," "vibe coding," "Claude built my entire app," any title that promises a magic outcome.

---

## Body

```
Hey r/ClaudeAI,

I'm Ken. I'm not a professional programmer. I shipped my first public
programming project this week, a browser-based visual editor for
designing custom lightsaber blade styles called KyberStation. It's a
hobby tool for the Proffieboard saber community.

Live: https://kenkoller.github.io/KyberStation/
Code: https://github.com/kenkoller/KyberStation

Posting here because the build process was Claude-Code-heavy and a
few patterns surprised me. Sharing in case any of it is useful, and
genuinely interested in feedback on what I'm doing wrong.

**The numbers, for context:**
- ~5,000 tests across 10 monorepo packages
- ~30 PRs landed in a single overnight launch session
- Next.js 14 / TypeScript strict / Zustand / Tailwind / Three.js
- One-person hobby project, first public release

**Tools used heavily:**
- Claude Code on the Max plan
- Claude Design (the standalone design tool, used for UI/UX consults
  that informed structural rework, not for component generation)
- Claude Preview MCP (in-browser dev server with screenshot/console
  introspection, closed the "I changed CSS, did it actually work?"
  loop)
- Chrome MCP (browser automation for live verification of user flows)
- Computer Use MCP (sparingly, for native-app flash testing of the
  built firmware)
- The standard file/bash/grep tools

**What worked, in rough order of impact:**

1. **CLAUDE.md as living session memory.** The project's CLAUDE.md is
huge, every session leaves a "Current State" entry dated and PR-
linked. Future sessions read it as their first context, so a new
conversation can pick up cold and know what was decided 3 weeks ago,
why, and what's still open. This sounds obvious; it's not how most
people use it. Mine grew to ~30k tokens. Worth every byte.

2. **Plan mode for anything non-trivial.** I treat plan mode as a
forcing function. Claude has to actually read the relevant files
and surface the real problem before any edits land. The plan files
live at `~/.claude/plans/*` and stay across sessions, so I can hand
the same plan to a fresh conversation if I need to.

3. **Parallel agents via git worktrees.** This was the unlock. For
the launch session, I dispatched 4-7 background agents in parallel,
each in its own `.claude/worktrees/agent-*` directory on its own
feature branch, each opening its own PR. Main session integrated
last. Worked because the lanes were file-disjoint (write-disjoint,
read-overlap is fine). Wall-clock cost: ~12h to land what would have
taken weeks serially.

4. **The memory system.** `~/.claude/projects/<project>/memory/`,
small markdown notes Claude writes to itself about user preferences
("never force-push," "this user prefers conventional commits," "the
hardware fidelity principle is load-bearing"). Persists across
sessions. Caught me a few times when I would have made a wrong call.

5. **MCPs that actually mattered.** Most MCPs I tried got pruned.
The two that earned their slot:
   - **Claude Preview**, I edit a component, it tells me if the
     dev server compiled, if the route renders, what the console
     says. Catches "this looked right but is broken" in seconds.
   - **Chrome MCP**, for verifying actual user flows. Mobile views
     in particular are impossible to validate without real browser
     automation. Computer Use was overkill for most of this; Chrome
     MCP is the right level of abstraction for web apps.

6. **Phased agent prompts for human-gated tasks.** I ran a 4-phase
mobile UX project (audit → design → plan → code) where each phase
was a separate dispatch and I reviewed in between. The agents knew
to stop and wait. This caught one architectural issue *before* any
code changed, way cheaper than catching it after.

**What didn't work / what bit me:**

1. **Worktree path discipline.** Three agents in one session leaked
file writes into the main repo path instead of their own worktree.
Recovery is a known pattern now (parent session inspects, runs
gates, commits + pushes for the agent), but the recovery costs ~10
min each. Don't dispatch more than 4 concurrent agents, concurrent
leak risk compounds. I now bake the `cd <worktree-path> && pwd`
confirmation into every agent prompt.

2. **Stuck agents.** A handful of background agents over the project
lifetime stalled mid-session, wrote files but never committed.
Salvage pattern: parent session checks the worktree, if typecheck +
tests pass, commits + pushes for them. If not, write off the work.
~2.5h of agent time vanished a couple of times before I learned to
detect it sooner.

3. **Confabulation when asked for verdicts.** Subagents are reliable
for evidence collection (grep, list, run command, paste output) and
reliable when given evidence-shape prompts. They are not reliable
when asked yes/no judgment questions like "is this branch merged?"
or "does X exist on main?". One of them once cited a real commit
hash but fabricated its role. Nearly destroyed thousands of lines of
unmerged work. Now I verify git/destructive state directly with
`git` calls, never delegate verdicts on shared mutable state.

4. **The Max plan reality.** I burned through usage during the launch
sprint. The Max plan made it feasible. Pro would not have. There's
no shortcut here; if you're doing parallel-agent dispatch on a
non-trivial codebase, plan for Max. I view it as a tool subscription,
not a luxury.

5. **Backlog stale-bits.** Claude doesn't know what shipped between
sessions unless CLAUDE.md tells it. Multiple sessions started by
agents independently rediscovering that "open" backlog items had
already shipped weeks earlier. Now I run a quarterly backlog audit
PR, `git log --grep` + `git grep` against every "open" item, mark
the false-opens as shipped, prune. Took an audit pass to find 5
false-opens out of 18.

**Specifically about Claude Design:**

Used for two structural rounds, once for a workbench layout
overhaul, once for a mobile UX rework. Both times I ran a 4-phase
flow: design audit (what's wrong) → design proposal (what to change)
→ implementation plan (PR-by-PR) → code (one PR at a time, reviewed
in between). The design phases caught things the code-only flow
missed, e.g., a mobile shell architecture issue that would have
been painful to fix after implementation.

The trick was treating Claude Design output as a *contract*. Once
a phase landed, the next phase couldn't renegotiate it without my
approval. Otherwise the design drifts during implementation and you
end up shipping something that doesn't match the agreed plan.

**What I'd do differently:**

- Lock the worktree path discipline earlier. The leak-recovery
  pattern works but costs time per leak.
- Start the memory system on day 1, not month 2. Half the
  preferences in there should have been recorded earlier.
- More phased prompts, fewer "do everything" prompts. The mobile
  UX 4-phase flow worked dramatically better than the layered
  one-shot prompts I used early on.
- Don't dispatch more than 4 concurrent agents. Five and the leak
  rate spikes.

**The honest disclosure:**

This is one person's workflow on one project. The project is a
visual editor + code generator with a clear architecture (engine /
codegen / UI / presets are decoupled monorepo packages) which
*helps*. Claude is much more reliable inside well-bounded modules
than across blast-radius-large refactors. If your codebase is one
giant tangle, a lot of these patterns will work less well until
the architecture is sorted.

I'm not selling a course, I don't have a Substack, no affiliate
links, no Patreon. KyberStation is free, MIT licensed, runs on
GitHub Pages. This is a hobby project that took on a life of its
own, and I wanted to share the build process in case it's useful
to anyone else trying to ship something ambitious as a non-pro.

Happy to answer specifics in comments. Genuinely curious what
patterns r/ClaudeAI uses that I'm missing.

Ken
```

---

## Reply templates: first 24 hours of comments

### "How much did the Max plan cost you?"
```
Max is $200/month. For the launch sprint specifically, a few days
where I was running 4-7 parallel agents, I used most of the
allocation. For steady-state hobby development, well within Max
limits. I treat it as a tool subscription, not a luxury, and the
project genuinely wouldn't exist on Pro at the rate it's moved.
```

### "Did Claude write all the code?"
```
No. I made all the architectural decisions, locked the design
principles (e.g., "Hardware Fidelity Principle", engine styles
must match what real LED hardware can produce), reviewed every PR,
and rejected plenty of approaches. Claude wrote a lot of the code
*inside* those decisions, but the decisions themselves were mine.
I think of the divide as: I own the system design and the taste,
Claude accelerates the implementation under those constraints.
```

### "Show your CLAUDE.md"
```
It's in the public repo, github.com/kenkoller/KyberStation/blob/main/CLAUDE.md.
Massive, dated session entries, "Current State" sections, all
collaboration defaults at the top. Use it as a reference if useful;
it's grown organically over the project so it's not a clean template.
```

### "What about [other AI tool]?"
```
Honestly haven't tried [tool] for this project. I picked Claude
Code early and it stuck. If [tool] has a workflow I should look at
I'd be curious. The patterns above (worktrees, plan mode, MCPs)
should be tool-agnostic concepts though.
```

### "Won't all your code rot once Claude updates?"
```
Maybe. The codebase is conventional, TypeScript strict, ~5k tests
covering the engine + codegen, no exotic patterns Claude introduced
that a human couldn't maintain. I'm bottlenecked on the architecture
+ testing discipline more than on any specific Claude artifact. If
Claude went away tomorrow I could keep developing it slower; the
foundation is mine.
```

### "Did you use any tests / CI?"
```
~5,000 tests across the monorepo. Vitest for engine + codegen, RTL
for web. CI gates type checking + the full test suite per PR.
Required for the parallel-agent workflow to work, without tests,
agents land breakage that other agents then build on top of.
```

### "What's the architecture?"
```
Monorepo: `packages/engine` (headless blade simulator, zero DOM
deps), `packages/codegen` (AST-based ProffieOS code generator),
`packages/presets` (preset library), `apps/web` (Next.js UI on top
of the engine). The engine is the source of truth, UI is a thin
rendering layer. AST-based codegen means the output structurally
can't have unbalanced template brackets. Architecture docs in the
repo if you want depth.
```

### "Could you walk me through your CLAUDE.md format?"
```
Top section: project overview + tech stack + repo structure (rare
edits). Middle: collaboration defaults + cross-session coordination
(slow-changing). Bottom: dated "Current State" entries, one per
significant session, with PR numbers, decisions made, and "still
open" items. Future sessions read the latest entry first. The
discipline is: every session ends by writing its own entry. Without
it, multi-week project memory falls apart.
```

### "Share your subagent prompts"
```
The pattern I converged on for parallel dispatch:
1. Lane name + scope (one paragraph)
2. The exact files to touch (write-disjoint from other lanes)
3. Acceptance criteria (typecheck + tests + a specific user flow)
4. Worktree path explicit (`cd <path> && pwd` before any work)
5. PR title + body shape
6. "If you hit X, stop and report, don't push broken code"

The "don't push broken code" line is load-bearing. Without it,
agents will sometimes push to unblock themselves.
```

### Troll / dismissive comment
**Don't reply.** Move on.

---

## Cross-post candidates (only if Variant A lands well)

- **r/cursor**, workflow audience, will recognize the patterns. Lead
  with "this transfers across tools" and acknowledge Cursor explicitly.
- **r/LocalLLaMA**, interested in the build process more than the
  model. Frame as "non-pro programmer's hands-on workflow notes."
- **r/programming**, only if a top-level comment surfaces real
  engineering depth (the AST-based codegen, the engine architecture).
  Don't lead with "I used AI."

**Don't cross-post on day 1.** Let r/ClaudeAI be the home post.
Cross-post only after stable engagement, with a fresh intro paragraph.
