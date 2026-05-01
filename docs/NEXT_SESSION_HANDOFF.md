# Next Session — Paste-Ready Handoff Prompt

Refreshed **2026-05-01 late night (post-audit polish session)**. v0.16.0 launched 2026-04-30. Mobile sprint feature-complete on `main`. Today's late-evening session shipped **8 PRs** on top of the mobile sprint: backlog cleanup, Wave 8 (engine + UI), CommunityGallery real fetch, Saber Card + Kyber Glyph audit fixes (28× GIF speedup, archetype detection 14→87 canon presets, ShareButton emitting modern Kyber Glyph URLs).

**Repo is at 120 commits past v0.16.0 tag.** Likely time for a v0.16.1 patch tag — see RECOMMENDED RELEASE TAG below.

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

WHAT JUST HAPPENED (2026-05-01 late evening — audit + polish)
-------------------------------------------------------------
Built on top of the morning + afternoon mobile sprint (Phases 4.1-4.5
all merged to main). Late-evening session added 8 more PRs:

  #221 feat/community-gallery-fetch       — CommunityGallery wired to GitHub Pages JSON, 3-branch fallback
  #222 feat/wave-8-lite-engine            — Wave 8 LITE: 8 aux/gesture modulators in registry + sampler
  #223 docs/card-snapshot-v2-research     — pixelmatch perceptual-diff feasibility (negative finding)
  #226 (CLOSED) test/card-snapshot-matrix-v2 — platform-specific goldens also fail (macOS-CI-vs-local drift)
  #227 feat/wave-8-ui-shell               — Wave 8 UI: 8 plates + BuiltInModulatorId union extension
  #229 feat/kyber-glyph-emitter-migration — 5 ShareButton sites moved to Kyber Glyph + archetype fix + toast
  #230 feat/card-render-polish            — font gate + GIF hilt cache (28× speedup) + dev page cleanup

Plus 2 parallel-session merges:
  #224 feat/preset-cartography-acolyte-maul — Acolyte + Maul preset lifecycle additions
  #228 feat/preset-cartography-visions      — Star Wars Visions Vol 1 (8 new presets)

KEY LEARNINGS WORTH CARRYING FORWARD (new architecture insights)
----------------------------------------------------------------
1. Hash-based cardSnapshot regression testing is NOT viable cross-
   runner. Even platform-specific golden files (macOS + Linux) fail
   because GitHub's macos-latest runner produces different hashes
   than typical local Macs (different macOS versions / font sets /
   node-canvas binaries). Component-level assertions on individual
   drawers (drawHilt, drawMetadata) are the recommended path forward.
   Full writeup on CLOSED PR #226 + research doc at
   `docs/research/CARD_SNAPSHOT_V2_PERCEPTUAL_DIFF.md`.

2. pixelmatch perceptual-diff also fails: no usable threshold valley.
   At every threshold tested (0.05-0.50), backdrop tone changes
   register 0 mismatches AND blade hue shifts go to 0 at threshold ≥
   0.20 — the perceptual tolerance suppresses real semantic changes
   alongside platform drift. Same algorithmic property; undisableable.

3. L-scope agent dispatches (~6-8h) hit token limits. Wave 8 first
   attempt terminated at ~11min with no commits. Splitting L-scope
   into 3 smaller file-disjoint M-scope dispatches works (Wave 8
   shipped via PR #222 engine + PR #227 UI).

4. Auto-close cascade trap (recurring): merging a PR with
   --delete-branch auto-closes any open PR targeting that branch as
   base. Workflow: open replacement PR with same branch (no force-
   push needed if branch is already a fast-forward). Hit twice today
   already (PR #209 → no replacement needed; PR #210 → write-up
   in close comment).

PRIORITY ORDER FOR THE NEXT SESSION
-----------------------------------
1. **Decide on v0.16.1 patch tag.** 120 commits past v0.16.0 is
   substantial — see RECOMMENDED RELEASE TAG below. Tag-cut is a
   ~30min sprint: pick version, draft CHANGELOG entry, create tag,
   push.

2. **Make the Q3 diagnostic-strip segment-set call** if not already
   done. See PHASE 4.5 RESIDUAL below. Small follow-up PR after.

3. **Pick from CANDIDATE NEXT WORK** — see below for what's actually
   still open and delegable.

RECOMMENDED RELEASE TAG — v0.16.1
---------------------------------
120 commits past v0.16.0 across substantial polish:
  - Mobile UX overhaul Phases 4.1-4.5 feature-complete
  - Wave 8 (modulation routing button + gesture events)
  - Saber Card + Kyber Glyph audit fixes (5 share sites migrated to
    actual Kyber Glyphs; "Share Kyber Code" button now actually
    shares Kyber Glyphs!)
  - Card render polish (font gate, 28× hilt-render speedup)
  - CommunityGallery wired to real fetch
  - 16+ new presets (Acolyte, Maul, Visions)

Tag-cut sequence: cut a `[Unreleased]` → `[0.16.1]` section in
CHANGELOG.md from the merged PR titles, create the tag, push.

PHASE 4.5 RESIDUAL — diagnostic-strip segment-set call
------------------------------------------------------
Per `Claude Design Mobile handoff/HANDOFF.md` §Q3 — open question.

The mobile bottom status bar is ALREADY shipped via Phase 4.2's
MobileStatusBarStrip (PR #203). It wraps the existing desktop
StatusBar with `mode='scroll'`. Heights + scroll behavior + mask-
image fade all match handoff spec.

Question: which segments to display?

  (a) Keep current — desktop StatusBar mirror:
      PWR · PROFILE · BOARD · CONN · PAGE · LEDS · MOD · STOR ·
      THEME · PRESET · UTC · BUILD

  (b) Mirror handoff §Q3 exactly — user-facing diagnostics:
      BLADE 36" · 144 LED · NEOPIXEL · 3.88A · 41% CHARGE · 4.2V ·
      BT ON · PROFILE 03

  (c) Hybrid — keep most desktop segments + add charge / BT when
      data sources land

Recommended path is (a) ship-as-is — current segments cover the
diagnostic data we have. Path (c) revisit when battery + BT
surfaces wire up (post-v0.17 per BLUETOOTH_FEASIBILITY.md).

CANDIDATE NEXT WORK (post late-evening 2026-05-01 audit + polish)
----------------------------------------------------------------
After today's late-evening session, the genuinely-open delegable
work is much narrower:

  1. **Marketing site `/community` page** (S/M) — last 1/5 marketing
     pages from the v0.15.x re-implementation spec. The other 4
     (`/features`, `/showcase`, `/changelog`, `/faq`) shipped via
     PR #179. ⚠️ Active worktree `feat/marketing-site-expansion` may
     have this in flight (per `KyberStation-mkt`); coordinate before
     starting.

  2. **Wave 6 follow-on — composer slot expansion** (L) — modulation
     v1.1 follow-on per the impl plan. Per-channel RGB
     (`Mix<driver, ColorLow, ColorHigh>` restructuring) + timing
     scalars. Deeper AST work in codegen. Wave 8's split-into-3
     pattern would work here (engine slot expansion + codegen
     templates + UI binding-shape updates).

  3. **Crystal Vault panel + Re-attunement UI** — designed in
     `docs/KYBER_CRYSTAL_3D.md`, not built. M-L feature work; needs
     a focused session with Ken's UX confirmation on shape.

  4. **Component-level cardSnapshot regression coverage** — instead
     of pixel hashing, write assertions on drawHilt / drawMetadata /
     drawQr individually (chip count, layout slots, no-throw on edge
     configs). See PR #226 close comment for the rationale.

  5. **Item B Safari BladeCanvas bloom** — Ken's hands-on Safari
     debug. Can't delegate.

  6. **Sub-1024 layout pass** — Ken's UX call on breakpoints. Can't
     delegate.

  7. **Cross-OS hardware sweep** — V2 / V3-OLED / Windows / Linux
     validation of the WebUSB flash path. Hardware-gated; community-
     driven post-launch.

  8. **Saber GIF Sprint 5 (Tier 4)** — UI walkthrough GIFs per
     `SABER_GIF_ROADMAP.md`. Low priority. Sprint 4 (effect-specific
     blast / stab / swing) shipped via PR #218.

LARGER FUTURE SPRINTS (XL — multi-week, plan first)
---------------------------------------------------
  - Sound Font Library + Custom Presets + Card Presets
    (`docs/SOUND_FONT_LIBRARY_AND_CUSTOM_PRESETS.md`, 3 phases)
  - Multi-Blade Workbench (channel-strip UI for dual-blade /
    saberstaff / crossguard)
  - Modulation v1.2 Creative (chains, macros, LFO, conditionals)
  - Preset Cartography deep-cuts (KOTOR, SWTOR, animated series — a
    pop-up sprint with parallel agents could 4-5× the library)

VERIFICATION COMMANDS BEFORE STARTING
-------------------------------------
  cd /Users/KK/Development/KyberStation
  git fetch origin --prune && git status && git log --oneline -10
  git worktree list
  pnpm install
  pnpm typecheck    # should be clean across 10 packages
  pnpm test         # apps/web should be 2270+ passing

WHERE THINGS LIVE
-----------------
- CLAUDE.md "Current State (2026-05-01 ...)" — afternoon + evening wraps
- docs/POST_LAUNCH_BACKLOG.md — single source of truth for open items
  (Last audited: 2026-05-01 evening, marked 8 items shipped + flagged
  CommunityGallery real-data done via PR #221)
- docs/research/CARD_SNAPSHOT_V2_PERCEPTUAL_DIFF.md — negative-finding
  research; READ THIS before re-attempting card-snapshot regression
- docs/HARDWARE_FIDELITY_PRINCIPLE.md — north star for engine decisions
- docs/research/NEXTJS_15_UPGRADE_PLAN.md — defer to v0.17
- docs/research/BLUETOOTH_FEASIBILITY.md — defer to v0.17
- Closed PRs with valuable writeups: #210, #226 (read close comments)

OPEN PRs (post late-evening 2026-05-01)
---------------------------------------
None. All session-source PRs merged or closed.

Active sibling worktrees (cross-session coordination):
- `feat/marketing-site-expansion` (KyberStation-mkt) — may have
  `/community` page in flight
- `eager-benz-5b21c8` (`refactor/gradient-editor-extraction`,
  already merged via PR #215, worktree may still be locked)

CROSS-SESSION COLLISION GUARDRAILS
-----------------------------------
The 2026-05-01 sprint hit multiple cross-session worktree collisions
where parallel sessions checked out different branches over the same
working tree. Recovery pattern that worked:
  git stash push -u -m "<work-in-progress label>" -- <files>
  git checkout <intended-branch>
  git stash pop

Before starting any new branch:
  1. Confirm you're on the expected base via `git log -1`
  2. Check `git worktree list` for sibling sessions
  3. If your working tree contains files modified by another
     session (e.g. a file you didn't touch shows as M in
     `git status`), do NOT blindly stage — investigate first
  4. Untracked files in `Claude Design Mobile handoff/` are
     gitignored and safe to ignore in any commit

PARALLEL-AGENT DISPATCH PATTERN (validated again 2026-05-01)
------------------------------------------------------------
File-disjoint parallel agents in isolated worktrees works cleanly
when:
  - Each agent's prompt is self-contained (~400-600 words)
  - Agents have explicit "do NOT touch" lists for parallel work
  - Test gates baked in (typecheck + test before push)
  - Conservative-fallback rules ("if X doesn't work, ship Y subset")
  - L-scope work is split into 2-3 M-scope dispatches

Cap: ≤4 concurrent agents. CLAUDE.md learnings show concurrent leak
risk compounds beyond that.
```
