# Next Session — Paste-Ready Handoff Prompt

Refreshed **2026-04-30** after a session that landed 14 PRs (#118, #122, #124, #126–#128, #130–#137) fixing Ken's field-test bugs and shipping v1 launch features. Both stuck agents from 2026-04-29 late were written off cleanly — worktrees removed, branches deleted.

Previous handoff is in git history (`docs/NEXT_SESSION_HANDOFF.md` rewritten in place at each wrap).

---

## Paste this into a new Claude Code session

```
Continue from the 2026-04-30 session for KyberStation.

PROJECT CONTEXT
---------------
KyberStation is a web-based lightsaber style editor for Proffieboard
V3.9 / ProffieOS 7.x. Last tag is v0.15.0 (Modulation Routing v1.1
Core, hardware-validated). 2026-04-30 shipped 14 PRs — 6 audio-engine
improvements from Ken's parallel session (#118 Brave FSA, #122 modern
sound categories, #124 shared mute store, #127 ProffieOS in/out swap,
#128 SmoothSwing broadcasting + hum hot-swap) and 8 from agent dispatch
(#130 pause audio, #131 header buttons, #132 retraction fix, #133 blade
canvas fixes, #134 save state v1, #135 surprise me extension, #136 add
to queue, #137 wizard audit).

WHERE WE ARE
------------
- Branch: `main` (tip 703feeb, merged PR #138 docs session wrap)
- Last tag: v0.15.0 (substantial untagged work pending — 30+ PRs since
  the tag; v0.15.1 patch tag is the recommended next milestone)
- Recommended browser: Brave / Chrome / Edge. Safari known cosmetic
  gap (BladeCanvas bloom narrower than Chromium — see
  docs/POST_LAUNCH_BACKLOG.md Safari section).
- Cleanup state: both stuck agents from 2026-04-29 late written off
  cleanly. No locked worktrees from recent sessions.

READ FIRST
----------
1. CLAUDE.md — top "Current State (2026-04-30)" entry has the full
   session recap including Ken's 18-item field notes delta (12 resolved,
   6 deferred).
2. docs/POST_LAUNCH_BACKLOG.md — last audited 2026-04-30. Key items:
   - Saber GIF Sprint 2 was already shipped (PR #80, stale-bit). Do
     not re-dispatch.
   - UX item #16 (Figma color model) removed — superseded by PR #116
     Hardware Fidelity audit-and-tighten.
   - 2026-04-30 session section added (PRs #127–#137).
3. docs/HARDWARE_FIDELITY_PRINCIPLE.md — "Audit history" section at
   the bottom. Any new blend/layer mode MUST emit to a ProffieOS
   template before shipping.

OPEN ITEMS YOU CAN PICK UP (priority order)
-------------------------------------------

A. Browser verification of 2026-04-30 session
   Start dev server. Verify in a live browser:
   - Retraction animation shows retraction (not ignition)
   - Surprise Me generates varied styles + modulation bindings
   - "⭐ Save" button in action bar saves to "My Presets" in gallery
   - "📌 Queue" button adds current config to saber profile card queue
   - Pausing the app (Space / PauseButton) suspends audio
   - Header buttons consistent height + focus rings
   No new code needed unless a regression surfaces.

B. T2.10 — Renderer-level golden-hash tests
   Gated on adding `canvas` npm dev dep. Engine-level tests already
   shipped (PR #112, 33 cases via captureStateFrame). Renderer-level
   tests need to capture BladeCanvas pipeline pixel output (bloom,
   tonemap, composite) rather than just LED buffers. Node-canvas
   (`canvas@^2.x`) enables off-screen CanvasRenderingContext2D in
   Vitest. After this lands, Item K (lib/blade module extraction) is
   unblocked.

C. Item K — lib/blade/* module extraction from BladeCanvas.tsx
   BladeCanvas.tsx is ~2800 lines with the bloom / rim-glow / motion-
   blur / ambient pipeline inline. Extract to:
     lib/blade/pipeline.ts  (capsule rasterizer + bloom chain)
     lib/blade/bloom.ts     (3-mip downsampled bright-pass)
     lib/blade/colorSpace.ts (already exists; absorbs more)
     lib/blade/tonemap.ts
   Once extracted, MiniSaber / FullscreenPreview / SaberCard's
   drawBlade.ts can adopt the same pipeline rather than each
   maintaining their own port. T2.10 renderer-level tests are the
   explicit prerequisite — don't skip them.

D. Wave 8 — Button routing sub-tab
   Spec is 2 bullet points in
   docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md §10. Needs a design
   pass first: what's the visual treatment for a "button event as
   modulator source" plate? What aux/click/hold/gesture vocabulary
   does each prop file expose? Write a 1-page design doc before
   coding. Estimated ~6-8h once shape is clear.

E. Item H — Mobile shell migration to Sidebar + MainContent
   Needs Ken's UX call on drawer vs bottom-sheet at 375px. Once
   that's decided, the migration unblocks the 3 consumer-migration
   stub deletions (BladeHardwarePanel.tsx, PowerDrawPanel.tsx,
   GradientBuilder.tsx) per the BLOCKED row in
   docs/POST_LAUNCH_BACKLOG.md.

F. v0.15.1 patch tag
   Once browser verification (Item A) passes, cut v0.15.1 as the
   clean pre-Wave-8 release. Changelog entry should cover all 30+
   PRs since v0.15.0.

G. useAudioEngine singleton consolidation
   Ken's audio PRs (#124 shared mute) lifted the first shared state,
   but 6 consumers still create their own AudioContext + FontPlayer +
   AudioFilterChain + SmoothSwingEngine. Chrome caps AudioContext
   per origin at ~6 (currently at the limit). Refactor to a
   singleton engine (module-scope or React-context provider).
   Lower risk now that mute state is lifted.

H. Item B — Safari BladeCanvas bloom
   Bloom renders dramatically narrower in Safari than Chromium.
   Needs hands-on Safari debugging (mcp__Claude_Preview__* runs
   Chromium-only). Park unless Ken has a Safari instance available.

I. Sub-1024px layout pass (Ken's field note #2)
   Ken confirmed the target: clean ≥1024px + clean 375px for v1.
   Intermediate widths can stay rough for launch. A targeted agent
   dispatch could clean up the remaining breakpoint issues at the
   1024-1279px range.

DON'T REDO
----------
- Phase 4 sidebar A/B — all 6 sections done (combat-effects /
  my-saber / audio / routing / gallery / output)
- BlendMode tighten / Hardware Fidelity audit history — PR #116
- T1.2 MGP compact thumbnails — PR #117 (infra) + PR #125 (26 SVGs)
- T1.3 sampler progress fields — PR #123
- Custom color popover (T1.1) — Ken explicitly dropped
- UX item #16 Figma color model — Ken explicitly dropped; Hardware
  Fidelity Principle prevents expanding to non-emittable blend modes
- Saber GIF Sprint 2 — shipped via PR #80 (stale-bit in backlog;
  do not re-dispatch the agent that was writing zero commits)
- Marketing site re-implementation — Ken explicitly deprioritized;
  not launch-blocking
- Engine golden-hash tests (T2.10 engine side) — PR #112 (33 cases)
  They protect engine drift; renderer-level tests are still TBD
- Retraction animation fix — PR #132
- Blade alignment / pointed tip / emitter glow fix — PR #133
- Save state v1 — PR #134
- Add to queue v1 — PR #136
- Surprise Me extension — PR #135
- Wizard audit — PR #137
- Header button standardization — PR #131
- Pause audio fix — PR #130

PROCESS NOTES (lessons from 2026-04-29/30)
-------------------------------------------
1. Backlog stale-bit is real and recurs. Saber GIF Sprint 2 was
   listed as open in POST_LAUNCH_BACKLOG.md but shipped via PR #80
   on 2026-04-27. The 2026-04-30 ground-truth audit confirmed it.
   Before starting any "open" item, run:
     git log --oneline --grep="<keyword>" main
     git grep -l <file_or_symbol>
   Don't trust the backlog's own status field.

2. Stuck agents write zero code. The 2026-04-29 late session
   dispatched 2 agents that ran 2.5h without pushing. Written off
   cleanly 2026-04-30. If an agent doesn't push in ~90 min,
   either ping via SendMessage or write off and re-dispatch fresh
   with a smaller, more concrete prompt.

3. Engine-level golden-hash != renderer-level golden-hash.
   PR #112 shipped engine tests (LED-buffer hashes via
   captureStateFrame + FNV-1a). They protect engine drift but NOT
   renderer drift (bloom, tonemap, canvas pipeline). Renderer-level
   tests need `canvas` npm and are the explicit prerequisite for
   Item K.

4. Hardware Fidelity Principle wins UX disputes. When deciding
   whether to expand or tighten Item J (Figma color model), Ken's
   instinct was right: "if ProffieOS can't emit it, it shouldn't
   ship." The tighten path (PR #116) was the correct call.

5. Auto-closed PRs from base-branch deletion. When merging with
   --delete-branch, any open PRs targeting that branch auto-close.
   Workflow: git checkout <agent-branch> + git rebase main +
   git push --force-with-lease + gh pr create (new PR number).
   Happened: PR #120 was reborn as #125.

LAUNCH POSTURE
--------------
v0.15.0 hardware-validated. 30+ untagged PRs since. All Tier 1 from
Ken's pre-launch shortlist shipped. Ken's 18 field-note issues: 12
resolved, 6 deferred (2 post-launch per Ken, 2 larger scope, 1 sub-
1024 layout, 1 small docs). Remaining backlog is post-launch polish +
2 architectural sprints (Modulation Wave 8 + Item K module extraction)
+ useAudioEngine singleton. None of the open items gate launch.

Recommended path:
1. Browser verify 2026-04-30 session (Item A above)
2. Cut v0.15.1 patch tag
3. Renderer-level golden-hash (B) + module extraction (C)
4. Wave 8 button routing (D) — its own focused multi-day session
5. Mobile shell migration (E) — after Ken's UX call
6. useAudioEngine singleton (G) — lower urgency, improves stability

WRAP-UP
-------
When you finish a session, archive at docs/SESSION_<date>.md if it's
a long one, update CLAUDE.md "Current State" with a one-paragraph
summary + demote the previous "Current State" block, and refresh THIS
handoff doc in place.

Begin by reading the docs above + running:
  git fetch origin --prune
  git status
  git log --oneline -8
  gh pr list --state open --author '@me'
  git worktree list
to confirm branch state. No stuck agents or locked worktrees expected.
```

---

## Why this handoff shape

- **Stuck-agent recovery removed** — both 2026-04-29 stuck agents
  were written off cleanly per the 2026-04-30 session. No recovery
  work needed.
- **Browser verification is now Item A** — 14 PRs landed 2026-04-30,
  none browser-verified yet per Ken. This is the first priority.
- **v0.15.1 tag is clearly positioned** — 30+ PRs since v0.15.0 is
  a lot of untagged work. Cut the tag once browser verification passes.
- **Audio singleton (Item G) surfaced** — Ken's audio PRs (#124)
  introduced the pattern but left 6 AudioContext instances alive.
  Chrome's ~6-per-origin cap means we're at the limit; singleton
  consolidation is stability-relevant.
- **Process notes updated** for the Saber GIF Sprint 2 stale-bit
  as a concrete example of the ground-truth-check principle.
