# Next Session — Hardware Validation + v0.15.0 Tag for Modulation v1.1 Core

**Purpose:** Paste the prompt block below into a fresh Claude Code session to finish the modulation v1.1 Core release: hardware validation on Proffieboard V3.9, optional Wave 7/8 follow-on, then cut the `v0.15.0` tag.

**This session ended at:** main `9e22f5e` (PR #65 merged 2026-04-27). All code-side v1.1 Core scope is done. Only hardware-gated work remains for the tag.

---

## Paste this into a new Claude Code session

```
Continue the Modulation Routing v1.1 Core release for KyberStation.
The 2026-04-27 overnight session shipped 9 PRs (#57-#65) on top of
v0.14.0, completing the v1.1 Core scope. Your job is the
hardware-gated closeout + optional Wave 7/8 follow-on.

PROJECT CONTEXT
---------------
KyberStation is a web-based lightsaber style editor for Proffieboard
V3.9 / ProffieOS 7.x. Modulation Routing is the headline feature:
users wire live signals (swing / sound / angle / twist / time / clash
/ battery / lockup / preon / ignition / retraction = all 11) to any
numeric blade parameter via drag-to-route + click-to-route + math
expressions, and the generated config.h flashes those bindings as
LIVE ProffieOS templates (not just snapshots).

WHERE WE ARE
------------
- Branch: `main`, commit `9e22f5e`. Local working tree should be clean.
- Last tag: `v0.14.0` (Modulation Routing v1.0 Preview BETA).
- Untagged work since v0.14.0: PRs #41-#65 — full v1.1 Core scope from
  `docs/MODULATION_ROUTING_ROADMAP.md`. Recommended tag: `v0.15.0`
  post-hardware-validation.
- CI green on every push. axe-core WCAG 2 AA: 0 violations
  (desktop + mobile viewports of /editor).

READ FIRST (in order)
---------------------
1. `CLAUDE.md` "## Current State (2026-04-27 overnight, Modulation
   Routing v1.1 Core)" — per-PR scope table, test deltas, architectural
   notes, still-open ladder. Authoritative inventory of what shipped.
2. `CHANGELOG.md` "[Unreleased] → Modulation Routing v1.1 Core —
   overnight wave (2026-04-27)" — Added/Changed/Tests/Backfill/Salvage
   subsections. Lift this into `[0.15.0] - <date>` when you tag.
3. `docs/MODULATION_ROUTING_ROADMAP.md` — public version ladder. v1.0
   shipped + most of v1.1 Core shipped tonight; the rest of v1.1 Core
   (Waves 7/8) is documented but not built.
4. `docs/HARDWARE_VALIDATION_TODO.md` if present — earlier hardware
   flash runbook from the 2026-04-20 v0.14.0 validation. The three
   real DFU bugs fixed there are still relevant baseline.

TASK 1 — HARDWARE FLASH TEST (~45 min)
---------------------------------------
v1.1 Core's headline shift over v1.0: bindings now emit LIVE
templates for the shimmer-Mix slot, not snapshot values. So flash
behavior should actually demonstrate live modulation on the saber.

1. `pnpm dev` (or use the preview MCP `kyberstation-landing` config).
2. Navigate /editor. StatusBar should show `BOARD · PROFFIE V3.9 · FULL`.
3. Routing tab → Recipes → click "Reactive Shimmer". Confirm
   `SWING → Shimmer · add · 60%` appears in the binding list.
4. Output tab. Confirm the generated config starts with the v1.1
   comment block ("Modulation Routing — v1.1 Core") and the StylePtr
   contains a `Mix<Scale<SwingSpeed<400>, Int<lo>, Int<hi>>, X, Y>`
   shape (live driver, NOT a static snapshot value). This is the
   key v1.1 vs v1.0 difference — verify before flashing.
5. Copy the config. Compile via local Arduino + Proffieboard board
   manager (or the GitHub Actions firmware-build workflow if that's
   already set up).
6. DFU enter on the 89sabers V3.9: hold BOOT → tap RESET → release
   BOOT. Flash via the in-editor FlashPanel.
7. Boot, ignite, hold steady — confirm baseline shimmer reads as a
   slow flicker. Then SWING the saber — shimmer SHOULD increase
   noticeably with swing speed (because the emitted template
   actually scales swing into shimmer at runtime, vs. v1.0's frozen
   snapshot).
8. Repeat with the Breathing Blade recipe — should breathe live on
   hardware via the `sin(time * 0.001) * 0.5 + 0.5` → `Sin<Int<6283>>`
   heuristic. Held still vs. moving should show no difference (it's
   a time-driven LFO, not motion-reactive).

If flash fails or behavior doesn't match: regression test added
to `apps/web/tests/webusb/` or `packages/codegen/tests/` BEFORE the
fix. The test gap caught Wave 6 mid-stream — protect it now.

TASK 2 — OPTIONAL: WAVE 7 (GLYPH V2 MODULATION ROUND-TRIP) (~3-5 hr)
--------------------------------------------------------------------
PR #38 (multi-version dispatcher) merged earlier; the actual v2
encoder body for the `modulation` payload field is still needed.
Roughly:
  - Extend `apps/web/lib/sharePack/kyberGlyph.ts` v2 encoder to
    include `config.modulation` in the payload when present
  - v2 decoder path reads `modulation` and rehydrates onto the
    imported config
  - Drift-sentinel test ensures v2 round-trips a representative
    binding payload byte-for-byte
  - `?s=<glyph>` URL handler now imports modulation cleanly
Skip if hardware test surfaced bugs or you want the next session
to handle this.

TASK 3 — OPTIONAL: WAVE 8 (BUTTON ROUTING SUB-TAB) (~6-8 hr)
-------------------------------------------------------------
Big scope. New ROUTING sub-tab inside the Inspector that maps button
events (aux click / hold / double-click / gesture swing / stab / etc.)
to discrete actions per prop file. Plus aux/gesture-as-modulator-plates
(`aux1.held`, `gesture.swing`, etc.) as first-class sources alongside
the existing 11 modulators. `propFileProfiles.ts` already declares the
event vocabulary per Fett263 / SA22C / etc.
Big enough that it warrants its own session. Don't try to fit it
alongside the hardware closeout.

TASK 4 — CUT THE VERSION TAG (~10 min)
---------------------------------------
After hardware validation passes:

1. Polish `CHANGELOG.md` `[Unreleased]` block — rename the
   "Modulation Routing v1.1 Core" subsection's date to today, then
   move the whole [Unreleased] subsection out as a new
   `## [0.15.0] - <today>` section between `[Unreleased]` and
   `[0.14.0]`. Keep the `[Unreleased]` header in place (just empty
   for now until new work accumulates).
2. Update `CLAUDE.md` — add a `## Current State (YYYY-MM-DD, v0.15.0
   cut)` block at the top with a one-paragraph summary of what's in
   the tag. Demote the existing `## Current State (2026-04-27
   overnight, ...)` block to `### Earlier 2026-04-27 ...` so its
   detail is preserved in place.
3. Tag:
   git tag -a v0.15.0 -F /tmp/v0.15.0-tag-msg.txt
   Draft message from CHANGELOG. Mirror the v0.14.0 tag's shape
   (see `git tag -l -n50 v0.14.0` for the template).
4. git push origin v0.15.0
5. Open a docs PR for the CLAUDE.md + CHANGELOG updates on a
   `docs/claude-md-v0.15` branch. gh pr create + merge + delete-branch.

If hardware validation surfaced a blocker and you choose NOT to tag:
note it explicitly in CLAUDE.md and leave a clear path for a follow-up
session to pick it up. Don't tag a release that doesn't actually flash
correctly.

TASK 5 — OPTIONAL: REPLACE SVG ILLUSTRATIONS WITH SCREEN-RECORDED GIFs
-----------------------------------------------------------------------
The 3 animated SVGs at `docs/user-guide/modulation/first-wire-step-*.svg`
are illustrations, not recordings. Recording notes live in the HTML
comment at the bottom of `docs/user-guide/modulation/your-first-wire.md`.
Skip if illustrations are good enough for now.

WHAT'S DONE — DON'T REDO
------------------------
- All 11 modulators visible as plates (#57)
- 5 new starter recipes including 2 expression-based (#58)
- 7 new user-guide pages (#59)
- AST-level template injection for shimmer-Mix slot (#60)
- composeBindings test backfill (#62)
- Reciprocal hover highlight param→modulator (#61)
- Per-binding expression editing via fx button on rows (#63)
- True drag-to-route HTML5 (#64)
- CLAUDE.md + CHANGELOG full overnight recap (#65)

COORDINATION NOTES
------------------
- Other parallel sessions still active on origin: `feat/glyph-multi-version-decoder`
  (precursor merged via PR #38; encoder body is Wave 7 above),
  `feat/saber-card-vertical` (#36 OPEN), `feat/marketing-site-expansion`
  (#32 OPEN), `feat/saber-gif-sprint-1`, `feat/share-glyph-route`. Don't
  edit their files. Footprints are disjoint from modulation work.
- Worktrees from the overnight run (`/Users/KK/Development/KyberStation/.claude/worktrees/agent-*`)
  were force-cleaned at session end. Branches deleted (merged).
- Don't auto-force-push main. Don't skip CI. Don't bump to v1.0.0 — KyberStation hasn't hit "1.0 launch" itself per the
  release posture in CLAUDE.md.

WRAP-UP
-------
When done, reply: "done — v0.15.0 tagged, hardware validated on
89sabers V3.9, [Wave 7 done | Wave 7 deferred], CLAUDE.md + CHANGELOG
updated." Then user takes over for announcement / marketing.

If hardware fails: reply with the specific bug + the regression test
you added, and ask the user how to proceed.

Begin by running:
  git fetch origin --prune
  git status
  git log --oneline -8
to confirm branch state matches this doc before doing anything else.
```

---

## Why this handoff shape

- **Self-contained prompt** — new session reads the docs at step 1.
- **Hardware task first** — gating action; everything else depends on it.
- **Optional tasks clearly labeled** — Wave 7 / 8 / GIFs are nice-to-haves, not blockers for the tag.
- **WRAP-UP line predetermined** — gives the user a crisp return signal.
- **Failure mode documented** — if hardware fails, file a regression test BEFORE fixing.

## What's already documented and doesn't need re-pasting

- `CLAUDE.md` "## Current State (2026-04-27 overnight, ...)" — full inventory.
- `CHANGELOG.md` `[Unreleased]` "Modulation Routing v1.1 Core — overnight wave" — Added / Changed / Tests / Open subsections. Ready to lift into `[0.15.0]` at tag time.
- `docs/MODULATION_ROUTING_ROADMAP.md` — public version ladder, v1.2 / v1.3 / v2.0+ scope deferred.
- `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md` — sprint plan with 18 locked decisions.
- `docs/MODULATION_USER_GUIDE_OUTLINE.md` — 8-section guide skeleton (now mostly built).

All of these are on `main` at `9e22f5e`, so the new session picks them up on `git pull`.
