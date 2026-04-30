# Next Session — Paste-Ready Handoff Prompt

Refreshed **2026-04-30 PM (after launch-posture lock)**. This is the canonical handoff doc — rewritten in place at each wrap; previous versions live in git history.

The next session is **browser verification → launch-go decision**. Frame: walk through every user-visible change from the day's 17+ PRs in a live preview, decide if v1.0 is ready to ship as **v0.16.0**. If yes → tag, post launch announcement. If no but minor → fix inline, ship same day. If serious gap → slip 1–2 days (May 4 amplification still has 5–6 days runway).

> **Hard launch deadline:** Friday May 1, 2026. May 4 is the Star Wars Day amplification beat, not the launch date.

---

## Paste this into a new Claude Code session

```
Continue KyberStation launch prep. Today is the launch-go decision day.

PROJECT CONTEXT
---------------
KyberStation is a web-based lightsaber style editor for Proffieboard
V3.9 / ProffieOS 7.x. Last tag is v0.15.0 (Modulation Routing v1.1
Core, hardware-validated). Substantial untagged work since: ~17 PRs
landed 2026-04-30 across morning Wave 1, overnight refinement, and
afternoon launch-posture lock. Workspace: 4899+ tests passing, 10/10
packages typecheck-clean, production build clean.

LAUNCH POSTURE (LOCKED 2026-04-30 PM)
-------------------------------------
KyberStation v1.0 ships as a **design tool first**.

  "KyberStation is a visual blade design tool. Generate your ProffieOS
   config, compile it with arduino-cli, flash it with dfu-util.
   Web-based flashing is experimental and coming in v0.16+."

The audience is Proffieboard hobbyists who already own arduino-cli.
Codegen + compile pipeline validated end-to-end (213 KB binary builds
clean against ProffieOS 7.x). WebUSB FlashPanel ships behind a
3-checkbox EXPERIMENTAL disclaimer (responsibility / backup / recovery).
docs/FLASH_GUIDE.md is the canonical user flash workflow.

WHAT JUST HAPPENED (in chronological order)
-------------------------------------------

Phase 1 — 2026-04-30 morning: Wave 1 critical bugs + Ken's audio (10 PRs)
  - #126 docs(session-archive): 2026-04-29 wrap (rebase merge)
  - #118, #122, #124, #127, #128 — Ken's audio improvements (Brave FSA,
    modern sound categories, shared mute, ProffieOS in/out swap,
    SmoothSwing broadcast + hum hot-swap)
  - #130 fix(audio): suspend AudioContext on global pause
  - #131 fix(header): standardize buttons (HeaderButton primitive)
  - #132 fix(engine): correct retraction animation progress (TOP
    PRIORITY — retraction was rendering as ignition due to double-
    inversion in FadeoutRetraction + ImplodeRetraction)
  - #133 fix(blade): alignment drift, pointed tip, emitter glow
  - #134, #135, #136, #137 — v1 launch features (save state, Surprise
    Me extension, Add to Queue, wizard polish)

Phase 2 — 2026-04-30 overnight: refinement wave (5 PRs, parallel agents)
  - #139 docs: twist ignition + twist modulator behavior
  - #140 feat(analysis): audio-waveform layer in AnalysisRail
  - #141 feat(palette): 17 missing commands across NAVIGATE/EDIT/TOGGLE
  - #142 docs(backlog): ground-truth audit (5 stale-bits cleared)
  - #143 fix(card): theme-gate blade composite for LIGHT_THEME

Phase 3 — 2026-04-30 PM: launch-posture lock (3 PRs)
  - #145 feat(launch): FLASH_GUIDE + README beta posture + FlashPanel
    EXPERIMENTAL gate (3-checkbox disclaimer with mandatory backup ack)
  - #146 docs(session): archive 2026-04-29 + 2026-04-30 session notes
  - #149 docs(claude-md): launch posture lock + FLASH_GUIDE
    current-state entry

Phase 4 — 2026-04-30 night: T2.10 + session wrap (4 PRs)
  - #144 docs(claude): 2026-04-30 evening session wrap
  - #147 test(renderer): renderer-level golden-hash harness (T2.10
    SHIPPED — unblocks Item K module extraction)
  - #150 docs: archive 2026-04-30 night session
  - #151 docs(session): wrap 2026-04-30 PM + next-session handoff

THIS SESSION'S PRIMARY TASK: BROWSER VERIFICATION + LAUNCH DECISION
-------------------------------------------------------------------

Walk through every user-visible change from Phases 1-3 in a live
preview. Take notes on observed issues; fix small ones inline, flag
larger ones for follow-up. Then make the launch-go decision per the
tree below.

WHERE WE ARE
------------
- Branch: main (latest tip; run `git log --oneline -5` to confirm)
- Last tag: v0.15.0 (substantial untagged work — v0.16.0 is the
  candidate launch tag)
- Recommended browser: Brave / Chrome / Edge (Chromium-based for
  WebUSB). Safari has known cosmetic gap (BladeCanvas bloom narrower
  — see backlog). Firefox does not support WebUSB.
- Cleanup state: clean. No locked worktrees from prior sessions.

READ FIRST (in order)
---------------------
1. CLAUDE.md — three "Current State (2026-04-30 …)" entries: PM
   (launch posture), evening (overnight wave), morning (critical bugs).
2. docs/SESSION_2026-04-30_PM_LAUNCH_PREP.md — afternoon archive of
   FLASH_GUIDE / README / FlashPanel work
3. docs/LAUNCH_PLAN.md — vision + humble-tone guidance
4. docs/POST_LAUNCH_BACKLOG.md — last audited 2026-04-30
5. docs/HARDWARE_FIDELITY_PRINCIPLE.md — north star for engine + UI
   architectural decisions
6. docs/FLASH_GUIDE.md — canonical end-user flash workflow

VERIFICATION COMMANDS BEFORE BROWSER WALKTHROUGH
------------------------------------------------
  cd /Users/KK/Development/KyberStation
  git fetch origin --prune && git status && git log --oneline -10
  pnpm dev              # Start Next.js dev server
  pnpm typecheck        # Should be clean
  pnpm test             # Should be ~4899/4899 green

If any test fails or typecheck shifts, that is a regression — surface
it immediately, do not proceed with verification.

EMAIL + HARDWARE CHECK
----------------------
  - Inbox: any reply from pang89sabers@outlook.com or
    my89sabers@hotmail.com re: factory firmware for V3.9 recovery?
  - HiLetgo ST-Link V2 from Amazon Prime — did it arrive?

Hardware-path conditional flow:
  IF 89sabers replied with factory firmware:
    Walk through docs/FLASH_GUIDE.md end-to-end on the test saber.
    Restore factory firmware → design saber in KyberStation → export
    config.h → compile → flash → ignite. If end-to-end works, launch
    confidence is much higher; add a verification note to FLASH_GUIDE.

  IF ST-Link V2 arrived but 89sabers hasn't replied:
    Set ST-Link aside for post-launch. Don't disassemble saber today
    under launch pressure.

  IF neither: Launch decision is purely a docs + UX call. Codegen +
    compile is validated. FLASH_GUIDE walks users through the path.
    Acceptable launch state.

BROWSER VERIFICATION CHECKLIST
==============================

A. Launch posture (Phase 3, PR #145) — Ken hasn't seen yet
   ─────────────────────────────────────────────────────
   Path: Editor → OUTPUT panel (sidebar or ⌘4) → click FLASH

   [ ] Panel header reads "Flash to Saber" with EXPERIMENTAL
       orange/amber badge next to it
   [ ] Description ends with "For v1.0 the recommended path is the
       dfu-util CLI workflow" + hyperlinked FLASH_GUIDE that opens
       https://github.com/kenkoller/KyberStation/blob/main/docs/FLASH_GUIDE.md
   [ ] Disclaimer card title reads "Experimental — read before
       proceeding"
   [ ] Disclaimer body has 3 paragraphs (design-tool-first /
       manifest-phase known issue / DFU recovery instructions)
   [ ] Vendor-customized board warning sub-section visible inside
       the disclaimer (89sabers / KR / Saberbay / Vader's Vault,
       BFB2=1 caveat)
   [ ] Three checkboxes (responsibility / backup / recovery) all
       unchecked by default
   [ ] Proceed button is disabled when zero checkboxes checked
   [ ] Stays disabled with 1 of 3 checked
   [ ] Stays disabled with 2 of 3 checked
   [ ] Only enables when all 3 checked
   [ ] After Proceed, transitions to firmware-selection state

B. Critical bug fixes (Phase 1 — Ken's field-test list)
   ────────────────────────────────────────────────────
   [ ] Retraction (PR #132) — workbench → ignite → wait for ON →
       trigger retract with Dissolve / FlickerOut / Drain / Fadeout
       / Implode → confirm blade RETRACTS (not ignites)
   [ ] BladeCanvas alignment (PR #133) — pixel strip + analysis rail
       widths match blade preview at 20"/24"/28"/32"/36"/40" LED counts
   [ ] Tip shape (PR #133) — blade tip is rounded, not pointed
   [ ] Emitter glow (PR #133) — NO emitter glow when blade OFF (only
       when extendProgress > 0.05)
   [ ] Pause + audio (PR #130) — play hum → press Space (pause) →
       audio silences → unpause → audio resumes
   [ ] Header (PR #131) — all header buttons consistent height,
       radius, hover, focus ring

C. v1 launch features (Phase 1 morning)
   ────────────────────────────────────
   [ ] Save preset (PR #134) — click ⭐ Save in action bar → name it
       → appears in My Presets sidebar → click to load → delete works
   [ ] Add to queue (PR #136) — click 📌 Queue in action bar → toast
       "Added to queue (N presets)" → verify in saber profile
   [ ] Surprise Me (PR #135) — click 🎲 multiple times → varies
       ignition/retraction (full 18+12 catalog) + modulation bindings
       + clashDecay
   [ ] Wizard (PR #137) — open Saber Wizard → step 1 shows 144 LEDs
       default for 36" → tooltip "4 steps" not "3 steps" → screen
       reader announces colors + vibes correctly

D. Overnight refinement (Phase 2)
   ─────────────────────────────
   [ ] Audio waveform rail (PR #140) — AnalysisRail visualization
       toolbar → toggle "Audio Waveform" layer ON → load font →
       play hum → waveform animates at blade Point A → Point B →
       mute → waveform silences too
   [ ] CommandPalette (PR #141) — ⌘K → "save" finds Save Preset →
       "queue" finds Add to Queue → "surprise" finds Surprise Me →
       "section: hardware" jumps to hardware → "pause" toggles
   [ ] Light-theme card export (PR #143) — My Crystal panel → theme
       to LIGHT → save share card → blade renders correctly on paper
       background (not over-saturated from `lighter` composite)
   [ ] Twist docs (PR #139) — open docs/user-guide/ignitions.md and
       docs/user-guide/modulation/modulators.md "About twist" section

E. Architectural (Phase 4)
   ───────────────────────
   [ ] T2.10 harness (PR #147) — no user-visible change; just
       confirm `pnpm test --filter @kyberstation/web` passes the
       9 blade-renderer hashes

LAUNCH-GO DECISION TREE
=======================

| Outcome                                              | Action         |
|------------------------------------------------------|----------------|
| All checks ✅ + clean fault state                    | LAUNCH today   |
| 89sabers replied + recovery + end-to-end flash works | LAUNCH today, higher confidence |
| 1-2 small bugs fixable in <1 hour                    | Fix → re-verify → launch |
| Something serious surfaces                           | SLIP 1-2 days  |
| Hardware path goes badly                             | SLIP — at min ship "WebUSB experimental, dfu-util workflow not yet hardware-validated" |

LAUNCH CHECKLIST (if launching today)
=====================================

1. Cut v0.16.0 git tag
     git tag -a v0.16.0 -m "KyberStation v0.16.0 — public launch (beta posture)"
     git push origin v0.16.0
   This triggers release.yml → GitHub Release goes live.

2. Verify GitHub Pages deploy is live
     gh workflow list
     # Open deployed URL in fresh browser, confirm landing renders

3. Update CHANGELOG.md — replace [Unreleased] with [0.16.0] —
   2026-05-01 entry. Source content from CLAUDE.md's three
   2026-04-30 Current State entries (PM + evening + morning) —
   they collectively summarize ~17 PRs since v0.15.0:
     - PRs #115/118/122/124/127/128 (audio engine)
     - PRs #126/144/146/149/150/151 (docs / session archive)
     - PRs #130/131/132/133 (Wave 1 critical bug fixes)
     - PRs #134/135/136/137 (v1 launch features)
     - PRs #139/140/141/142/143 (overnight refinement)
     - PRs #145/147 (launch posture + T2.10)

4. Post launch announcement per docs/LAUNCH_ASSETS.md:
     - Reddit (r/lightsabers, r/proffie, r/sabers — pick variant)
     - Discord servers (lightsaber dueling, neopixel building)
     - Email YouTubers from LAUNCH_ASSETS outreach list

5. Watch GitHub Issues — respond fast to first-day reports.
   Patient, humble responses per LAUNCH_PLAN tone guidance.

ALTERNATIVE: v0.15.1 STABILIZATION TAG (optional)
=================================================
If you want a safety checkpoint before the public launch, cut a
v0.15.1 patch tag first containing all the Phase 1+2+4 bug fixes
+ minor features (no FLASH_GUIDE / posture pivot — that's v0.16.0
scope). Useful if browser verification surfaces issues and you
want the stabilization-only commits tagged separately for clean
rollback.

Recommended: skip v0.15.1 unless verification surfaces a
launch-blocker. Single v0.16.0 tag is cleaner public history.

DON'T
=====
- Don't touch Option Bytes on the test saber unless ST-Link is
  connected with STM32CubeProgrammer ready as recovery
- Don't keep flashing custom configs to the fault-state saber
  hoping they'll boot
- Don't rebuild WebUSB FlashPanel — manifest-phase bug well-
  understood enough to ship behind EXPERIMENTAL gate; root-cause
  fix is post-launch v0.16+
- Don't disassemble the saber under launch pressure to access SWD
  pads — multi-hour operation, defer to calm post-launch session
- Don't push the launch deadline past Sunday May 3 — May 4 needs
  ≥1-day runway for users to install + design + flash
- Don't re-dispatch the marketing or saber GIF agents — both clean
  writeoffs in prior sessions
- Don't touch the audio engine graph order — analyser tap MUST
  stay AFTER masterGain so mute silences both audio + waveform
- Don't tag v0.15.1 OR v0.16.0 until browser verification is clean
- Don't try to land card-snapshot regression coverage with the
  current node-canvas approach — needs visual-diff tooling

OPEN ITEMS YOU CAN PICK UP IF VERIFICATION IS CLEAN
====================================================

A. Launch (primary path) — see "LAUNCH CHECKLIST" above

B. Item B — Safari BladeCanvas bloom (Ken's hands-on)
   Cosmetic gap; bloom renders narrower in Safari than Chromium.
   Documented in docs/POST_LAUNCH_BACKLOG.md. Needs Safari debug.

C. Sub-1024 layout pass (Ken's #2)
   Need Ken's eyes for breakpoint judgment between 768 and 1023.
   Not delegable cleanly.

D. Item K — lib/blade/* module extraction (NOW UNBLOCKED)
   BladeCanvas.tsx is ~3000 lines with bloom + rim-glow + motion-
   blur + ambient pipeline inline. Extract to:
     lib/blade/pipeline.ts  (capsule rasterizer + bloom chain)
     lib/blade/bloom.ts     (3-mip downsampled bright-pass)
     lib/blade/colorSpace.ts (already exists; absorbs more)
     lib/blade/tonemap.ts
   PR #147's renderer-level golden-hash harness now provides the
   safety net for this refactor. Engine harness (PR #112) covers
   state machine; renderer harness covers visual output.

E. Card-snapshot regression coverage
   PR #147 dropped this from scope due to Cairo cross-platform AA
   drift. Future approach options:
     - Visual-diff tooling (Playwright screenshot compare, Argos)
     - Platform-specific golden files (separate macOS/Linux runs)
     - Pixel-aligned subset (skip drawMetadata text region)

F. Wave 8 — Button routing sub-tab (post-launch, sparse spec)

G. Item H — Mobile shell migration (needs Ken's drawer-vs-bottom-
   sheet UX call)

H. Hardware cross-OS sweep (community follow-up; macOS V3.9
   already validated)

PROCESS NOTES
=============
- 17+ PRs in one day is aggressive; expect at least one regression
  during browser walkthrough that didn't show up in tests
- v0.16.0 = the public launch tag. Don't include feature scope
  beyond what's already merged.
- Ken's launch posture (PR #145/#149) is the canonical v1.0
  framing: "design tool first, dfu-util reliable, WebUSB experimental"
- For UI tweaks during walkthrough, prefer small inline fixes
  (single-PR scope) over large refactors (which should wait for
  Item K's safe-to-refactor world)

END-OF-SESSION OUTPUT EXPECTATIONS
==================================

If you ship the launch today:
  - Write docs/SESSION_2026-05-01_LAUNCH.md archiving what shipped,
    announcement results, any first-day issues filed
  - Add memory entry: project_v016_launched_2026-05-01.md
  - Update CLAUDE.md with new "Current State (2026-05-01, ...)"
    entry above the existing 2026-04-30 PM entry
  - Refresh THIS NEXT_SESSION_HANDOFF.md in place for the
    post-launch first-day-monitoring session

If you slip:
  - Write docs/SESSION_2026-05-01_LAUNCH_SLIP.md with reason for
    slip + new target date + what remains
  - Update project_launch_deadline_2026-05-01.md memory with new date
  - Refresh THIS NEXT_SESSION_HANDOFF.md in place pointing at the
    updated date

WRAP-UP CONVENTION
==================
Archive long sessions at docs/SESSION_<date>.md. Update CLAUDE.md
"Current State". Refresh this NEXT_SESSION_HANDOFF.md in place.
```

---

## Quick reference — what's where

| Doc | Purpose |
|---|---|
| `CLAUDE.md` "Current State (2026-04-30 night)" | T2.10 + cross-platform CI lesson |
| `CLAUDE.md` "Current State (2026-04-30 evening)" | Wave 1 critical bugs + overnight refinement (14 PRs detail) |
| `CLAUDE.md` "Current State (2026-04-30 PM)" | Launch posture lock + FLASH_GUIDE |
| `CLAUDE.md` "Current State (2026-04-30 morning)" | Audio engine + critical bugs + v1 launch features |
| `docs/SESSION_2026-04-30_PM_LAUNCH_PREP.md` | Today's PM session archive |
| `docs/SESSION_2026-04-30_LAUNCH_DAY.md` | Today's session kickoff doc |
| `docs/LAUNCH_PLAN.md` | Launch comms strategy, May 4 amplification plan |
| `docs/LAUNCH_ASSETS.md` | Reddit drafts + YouTube outreach + screenshot shot list |
| `docs/LAUNCH_48H_CHECKLIST.md` | Launch punch list (status table refreshed 2026-04-30 PM) |
| `docs/POST_LAUNCH_BACKLOG.md` | Single source of truth for open items, last audited 2026-04-30 |
| `docs/HARDWARE_FIDELITY_PRINCIPLE.md` | North star for engine + UI architectural decisions |
| `docs/FLASH_GUIDE.md` | Canonical end-user flash workflow (dfu-util first) |
| `docs/user-guide/ignitions.md` | 18 ignition styles + twist deep-dive |
| `docs/user-guide/modulation/modulators.md` | Twist behavior section |
