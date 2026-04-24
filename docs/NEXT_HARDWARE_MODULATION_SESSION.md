# Next Session — Hardware Validation + Version Tag for Modulation v1.0

**Purpose:** Paste the prompt block below into a fresh Claude Code session to finish the modulation v1.0 release: flash-test on real Proffieboard V3.9, decide + cut the version tag, update docs, and optionally record the 3 replacement GIFs.

**Previous session ended at:** main `bfcdbf6` (PR #44 merged). All code-side modulation work is done; the only remaining items require physical hardware.

---

## Paste this into a new Claude Code session

```
Continue the Modulation Routing v1.0 Preview release for KyberStation.
Previous session ran 2026-04-22 → 2026-04-24 and shipped everything
doable without hardware. Your job is the hardware-gated closeout:

  1. Flash-test the current main onto my Proffieboard V3.9 hardware
  2. Decide the version tag (v0.14.1 vs v0.15.0) and cut it
  3. Update docs + announcement content
  4. Optionally record 3 screen-recorded GIFs to replace the shipped
     SVG illustrations

PROJECT CONTEXT
---------------
KyberStation is a web-based lightsaber style editor for Proffieboard
V3.9 / ProffieOS 7.x. Modulation Routing is the headline v1.0 feature:
users wire live signals (swing / sound / angle / time / clash) to any
numeric blade parameter via drag + click + math expressions.

WHERE WE ARE
------------
- Branch: `main`, commit `bfcdbf6`. Local working tree should be clean.
- Last tag: `v0.14.0` — Modulation Routing v1.0 Preview BETA.
- Post-tag follow-up work (PR #41, #42, #43, #44) is merged but untagged.
- CI has been green on every push.
- axe-core WCAG 2 AA: 0 violations on desktop (1600×1000) + mobile
  (375×812) viewports of `/editor`.

READ FIRST (in order)
---------------------
1. `CLAUDE.md` "Current State (2026-04-23 late...)" section — full
   inventory of what's landed, what's deferred, and why.
2. `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md` §6 — hardware validation
   test plan that's been waiting for hardware all week.
3. `CHANGELOG.md` — the `[Unreleased]` block lists every post-v0.14.0
   addition that's waiting to be folded into a tagged release.
4. `docs/HARDWARE_VALIDATION_TODO.md` if present — the earlier
   hardware-flash runbook. The three DFU protocol bugs we fixed there
   2026-04-20 are the baseline for trusting the flash path.

TASK 1 — HARDWARE FLASH TEST (~30 min)
---------------------------------------
Goal: prove that modulation survives the flash path end-to-end. The
generated config now bakes modulation snapshot values + recognizes the
breathing idiom via `mapBindings.matchSinBreathingEnvelope`.

1. Start the dev server: `pnpm dev` (preview_start "kyberstation-landing"
   if you prefer the preview tool).
2. Navigate to /editor. Confirm `BOARD · PROFFIE V3.9 · FULL` shows in
   the StatusBar.
3. Load the Reactive Shimmer starter recipe via Routing → Recipes →
   click "Reactive Shimmer". Confirm a `SWING → Shimmer · add · 60%`
   binding row appears.
4. Switch to the Output tab. Confirm the generated config starts with
   the `// ─── Modulation Routing — v1.0 Preview BETA ──` comment
   block followed by a binding row and the actual `StylePtr<...>` tree.
5. Copy the full config via the Output tab's copy button.
6. Compile via the GitHub Actions firmware-build workflow OR local
   Arduino + Proffieboard board manager. The existing recovery-re-flash
   procedure from `docs/HARDWARE_VALIDATION_TODO.md` Phase C applies
   if anything goes sideways.
7. Flash to the 89sabers V3.9 via the in-editor FlashPanel (DFU mode:
   hold BOOT → tap RESET → release BOOT).
8. Boot, ignite, confirm:
   - Blade ignites clean (baseline — not modulation-specific but it's
     our proof the flash didn't brick anything).
   - Shimmer is visually "higher" than on a plain Obi-Wan config —
     the snapshot of swing=0 × amount=0.6 + 0.1 baseline = 0.1, so
     equal to baseline. (This is expected — v1.0 Preview snapshots at
     idle state; v1.1 Core will emit live `Scale<SwingSpeed<>...>`
     templates.)
9. Repeat with the Breathing Blade recipe. THIS should actually breathe
   on hardware — the `sin(time * 0.001) * 0.5 + 0.5` idiom is
   recognized by the emitter's breathing heuristic and emits
   `Sin<Int<6283>>` which ProffieOS runs natively.

Failure modes + how to recover in each: see `docs/HARDWARE_VALIDATION_TODO.md`
Phase C. Any new bug surfaced is a test-coverage gap — add a regression
test in `apps/web/tests/webusb/` or `packages/codegen/tests/` before
moving on.

TASK 2 — CUT THE VERSION TAG (~10 min)
---------------------------------------
Previous session's lean: `v0.15.0` (minor) rather than `v0.14.1`
(patch). ExpressionEditor is a new inline UI surface — that's more
than BETA-completion semver-wise. The CLAUDE.md "Current State" block
and CHANGELOG `[Unreleased]` both already document the exact scope.

Process (mirrors the v0.14.0 flow):
1. Read + polish the `[Unreleased]` block in CHANGELOG.md — rename
   the header to `[0.15.0] — 2026-04-24` (or whatever date you tag).
   Move the SVG and docs notes into Added / Changed / Fixed as
   appropriate.
2. Update CLAUDE.md: add a new `## Current State (YYYY-MM-DD, v0.15.0
   cut)` block and demote the prior block to a sub-header. Same
   pattern as the existing `### 2026-04-23 earlier — UI-overhaul v2
   merge (PR #33)` demotion.
3. Write the annotated tag:
     `git tag -a v0.15.0 -F /tmp/v0.15.0-tag-msg.txt`
   Draft the tag message from the CHANGELOG section — same shape as
   `v0.14.0`'s tag (see `git tag -l -n20 v0.14.0` for the template).
4. `git push origin v0.15.0`.
5. Separate docs PR for the CLAUDE.md + CHANGELOG updates — use the
   `docs/claude-md-v0.15` branch convention.
6. gh pr create + merge + delete-branch.

If hardware validation surfaced a blocker and you choose NOT to tag:
explicitly note that in CLAUDE.md and leave a clear path for a
follow-up session to pick it up.

TASK 3 — OPTIONAL GIF RECORDING (~30 min if you choose to)
-----------------------------------------------------------
The 3 shipped SVGs at `docs/user-guide/modulation/first-wire-step-*.svg`
are illustrations, not recordings. If you want real UI capture:

1. Read the HTML comment block at the bottom of
   `docs/user-guide/modulation/your-first-wire.md` — it documents
   exactly what each GIF should capture, timing, viewport.
2. Record on desktop (1600×1000), Tune tab active.
3. Use a recorder that produces optimized GIF (CleanShot X, Kap,
   LICEcap, or ffmpeg from an MP4). Target ~640-720px wide so they
   fit the docs column.
4. Save as `first-wire-step-{1,2,3}.gif` alongside the SVGs.
5. Update the markdown references to point at .gif instead of .svg.
   Keep the SVGs in-tree as fallback (or delete them; your call).

Skip this if the animated SVGs are enough for launch — the SVG
illustrations render on GitHub, in VS Code preview, and in any docs
site. They're a legitimate ship-ready deliverable.

COORDINATION NOTES
------------------
- The glyph v2 session has PR #38 (`feat/glyph-multi-version-decoder`)
  + PR #36 (`feat/saber-card-vertical`) open. Don't touch their files.
  They're in `apps/web/lib/sharePack/` + `apps/web/app/dev/card-preview/`.
  If your hardware-test run trips over card-preview build errors,
  check `git log --oneline origin/main~5..origin/main` — they may
  have merged newer fixes.
- Marketing expansion has PR #32 open on `feat/marketing-site-expansion`
  — worktree at `../KyberStation-mkt`. Disjoint footprint.
- The main preset audit from 2026-04-23 morning merged via PR #39
  (`cbeb7d5`) is fully-integrated; no coordination needed.

WHAT NOT TO DO
--------------
- Don't re-open the modulation routing branches (`feat/modulation-*`)
  — they've been merged + pruned. Any new work happens on a fresh
  branch cut from the current `main`.
- Don't bump to v1.0.0 yet — KyberStation hasn't hit "1.0 launch"
  itself per the release posture in CLAUDE.md. Modulation's v1.0
  Preview is a feature-internal version, not a project version.
- Don't skip CI. Every push should wait for green before merge.
- Don't auto-force-push main.
- Don't re-authenticate gh — the session inherits auth from the host.

WRAP-UP
-------
When done, reply: "done — v0.15.0 tagged, hardware validated on
89sabers V3.9, <GIFs recorded | SVGs kept>, CLAUDE.md + CHANGELOG
updated, branches pruned." Then let the user take it from there —
they'll drive announcement + marketing moves.

If hardware validation fails and we can't tag, reply with the specific
bug reproduced + the new regression test you added, and ask the user
how to proceed.

Begin by running `git fetch origin --prune && git status && git log
--oneline -8` to confirm the branch state matches this doc before
doing anything else.
```

---

## Why this handoff shape

- **Self-contained prompt** — new session has no memory of the previous, so every context pointer has to be in the prompt or in a doc it reads at step 1.
- **Task-gated** — hardware task first because it's the blocking action. Tag decision second because it's cheap. GIF recording optional because SVGs already ship.
- **Failure modes documented** — if hardware trips, the handoff says what to do (add regression test, report, don't skip).
- **Coordination notes** — the other three parallel sessions (glyph / saber-card / marketing) are called out by name so the new session doesn't accidentally step on their branches.
- **Wrap-up line predetermined** — "done — v0.15.0 tagged, hardware validated…" gives the user a crisp return signal.

## What's already documented and doesn't need re-pasting

- The full what-shipped inventory lives in `CLAUDE.md` § "Current State (2026-04-23 late…)" — the prompt just says "read it first."
- The per-PR detail is in `CHANGELOG.md` `[Unreleased]` — same "read first."
- The hardware flash runbook lives in `docs/HARDWARE_VALIDATION_TODO.md` (Phase A/B/C from the 2026-04-20 validation).

All three are on `main` at `bfcdbf6`, so the new session picks them up on `git clone` or `git pull`.
