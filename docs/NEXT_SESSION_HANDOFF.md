# Next Session — Paste-Ready Handoff Prompt

Refreshed **2026-05-01 afternoon (Phase 4.4 ParameterSheet primitive shipped)**. v0.16.0 launched 2026-04-30. Mobile UX overhaul follows the **Claude Design StickyMiniShell handoff** at `Claude Design Mobile handoff/HANDOFF.md`. Phases 4.1, 4.2, 4.3, and 4.4 (foundation) are merged or in flight.

The next session is **Mobile UX Phase 4.4.x — ParameterSheet integration** (small focused PR, ~80 LOC) followed by **Phase 4.5 — Inspect mode + diagnostic strip review** (the bigger 4-part scope).

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

WHAT JUST HAPPENED (2026-05-01 mobile sprint)
---------------------------------------------
Mobile UX overhaul Phases 4.1 / 4.2 / 4.3 / 4.4 (foundation) are
shipped. ParameterSheet is built and ready for use; integration into
the QuickControls long-press flow is the immediate next task.

Today's merges (in order):
  #199 mobile/shell-density-and-sticky-canvas  — PR A1: sticky shell + drawer + auto-ignite
  #200 mobile/density-v2-and-stacked-columns   — PR A2: density v2 + stacked A/B columns + analysis stack
  #201 chore/gitignore-design-handoff-folder   — gitignore for the local design reference
  #202 docs/launch-comms-prep                  — launch comms package + audit fixes
  #203 feat/mobile-section-tabs                — Phase 4.2: sticky mini-shell + section tabs + status strip
  #205 feat/mobile-quick-controls              — Phase 4.3: Color-tab QuickControls + ColorRail (recovery PR for #204)

In flight at session wrap (2026-05-01 afternoon):
  #207 feat/mobile-parameter-sheet-primitive   — Phase 4.4 foundation (primitive + tests, no integration)

Mobile UX phase rollout state:
  Phase 4.1 — Sticky shell foundation       ✅ #199 + #200 (PR A1 + A2)
  Phase 4.2 — Section tabs + status strip   ✅ #203
  Phase 4.3 — QuickControls + ColorRail     ✅ #205
  Phase 4.4 — ParameterSheet primitive      ⏳ #207 (review pending)
  Phase 4.4.x — Integration into QuickControls  ⏳ NEXT
  Phase 4.5 — Inspect mode + diagnostic strip review  ⏳ after 4.4.x

PHASE 4.4.x SCOPE — ParameterSheet integration via store
--------------------------------------------------------
Phase 4.4 (PR #207) shipped the ParameterSheet primitive only — no
host integration. An earlier integration attempt wired the sheet
directly inside ColorQuickControls but Ken reverted that approach
intentionally; the integration deserves its own focused PR.

Recommended architecture: a global `parameterSheetStore` (Zustand)
that any slider can publish to, mounted ONCE at the MobileShell
level. Decouples QuickControls layout from sheet rendering and lets
future per-section variants (Style / Motion / FX / HW / Route) trigger
the same sheet without re-implementing per-variant state.

Implementation shape:

  1. NEW apps/web/stores/parameterSheetStore.ts (~50 LOC)
     interface ParameterSheetState {
       isOpen: boolean;
       paramSpec: ColorParamSheetSpec | null;  // or generic spec
       open(spec): void;
       close(): void;
     }

  2. MiniSlider gains an optional `paramSheetSpec` prop. When
     provided, the existing onLongPress callback writes
     `parameterSheetStore.getState().open(spec)`. When omitted,
     onLongPress falls through to the host (current behavior).
     ─ alternative: keep MiniSlider untouched and have
     ColorQuickControls' onLongPress callback dispatch to the
     store directly. Simpler change to MiniSlider.

  3. ColorQuickControls passes onLongPress callbacks per slider
     (Hue / Sat / Bright / Shimmer) that call
     `parameterSheetStore.getState().open({ id, title, ...spec })`
     for the matching parameter. Tempo / Depth (disabled
     placeholders) skip this — no sheet for them.

  4. NEW component: ParameterSheetHost — subscribes to
     parameterSheetStore, mounts <ParameterSheet /> + the right body.
     Gets reset/done callbacks based on the active paramSpec.

  5. MobileShell mounts <ParameterSheetHost /> once at the top
     level, alongside FullscreenPreview and the AccessibilityPanel
     modal. Keeps the sheet outside any subtree that could clip
     it visually.

Browser-verify the full flow before merging:
  ─ long-press Hue knob → sheet appears at peek (168px) within
    500ms, blade preview stays visible above
  ─ drag handle up 100px → snap to full (~720px), backdrop fades in
  ─ drag handle down 100px from full → snap back to peek
  ─ drag handle down 100px from peek → sheet dismisses
  ─ tap × in header → dismisses, in-progress slider value persists
  ─ tap Reset → value goes back to spec.defaultValue
  ─ tap Done → dismisses, value persists
  ─ at peek with ColorPanel visible below → no z-index conflicts
  ─ verify the same flow for Sat / Bright / Shimmer

Test deltas expected:
  +1 store test (parameterSheetStore.test.ts) covering open/close
    + spec swap when re-opening with a different parameter
  +1 component test (parameterSheetHost.test.tsx) covering
    subscribe-render-on-state-change + correct param body wiring

PHASE 4.5 SCOPE — Inspect mode + diagnostic strip review
--------------------------------------------------------
Per `Claude Design Mobile handoff/HANDOFF.md` §Q4 (Inspect mode) and
§Q3 (StatusBar). Two threads to address:

▌ INSPECT MODE on the blade canvas (the bigger of the two)

  Trigger:
    - 500ms long-press anywhere inside `.blade-canvas` enters
      Inspect mode. Reuse the same long-press timing pattern from
      MiniSlider so the gesture muscle memory carries over.

  Zoom HUD (floating, top-right of canvas):
    - 1× / 2.4× / 4× / 🎯 four-button chip cluster
    - 1× / 2.4× / 4× set the zoom factor + lock-pan to recenter on
      the LED that was at the long-press release point
    - 🎯 button re-centers + resets to 1× without exiting Inspect
    - HUD background: rgba(0,0,0,0.4) with backdrop-filter blur(4px)

  Pan:
    - One-finger drag while in Inspect = pan the blade laterally
    - Pinch-zoom optional — DEFER to v1.x if it complicates the
      pointer event tree
    - Pixel-strip below the canvas stays at 1× regardless of
      Inspect zoom — it's a separate diagnostic surface

  Chrome dim:
    - On entering Inspect, fade everything else (header, action
      bar, section tabs, status strip, sheet if open) to opacity
      0.4. Don't block taps — user may want to exit by tapping a
      section tab. Use a `data-inspect-mode="true"` attribute on
      the MobileShell root so CSS rules can opacity-target the
      affected regions cleanly.

  Animation:
    - Live blade animation MUST keep running while inspecting —
      the point of Inspect is to study a running blade, not a
      frozen one. Auto-ignite + RAF loop already handle this.

  Exit:
    - Tap outside the HUD / canvas zone (e.g. on a section tab)
    - Escape key (iPad keyboard / Bluetooth keyboard support)
    - On exit: zoom snaps back to 1×, chrome opacity returns to 1.

  Suggested architecture:
    - NEW apps/web/stores/inspectModeStore.ts (~40 LOC) tracking
      isInspecting + zoomFactor + panOffset
    - BladeCanvas.tsx (or a thin Mobile-specific wrapper) reads
      from the store + applies CSS transform to the blade rod
    - MobileShell adds the long-press handler on the blade canvas
      region wrapper + the data-inspect-mode attribute
    - NEW MobileInspectHUD primitive (zoom buttons, ~80 LOC)

▌ DIAGNOSTIC STRIP REVIEW (smaller, mostly UX call)

  The mobile bottom status bar is ALREADY shipped via Phase 4.2's
  MobileStatusBarStrip (PR #203) — it wraps the existing desktop
  StatusBar with mode='scroll'. Heights + scroll behavior + mask-
  image fade all match the handoff spec.

  Open question for Ken: does the segment SET match the handoff?

    What we ship today (11 segments — desktop StatusBar content):
      PWR · PROFILE · BOARD · CONN · PAGE · LEDS · MOD · STOR ·
      THEME · PRESET · UTC · BUILD

    What handoff §Q3 lists (8 segments — user-facing diagnostics):
      BLADE 36" · 144 LED · NEOPIXEL · 3.88A · 41% CHARGE · 4.2V ·
      BT ON · PROFILE 03

  These overlap (PWR ≈ 3.88A, LEDS ≈ 144 LED, PROFILE ≈ PROFILE 03)
  but the handoff list is shorter + more lay-user-friendly.

  Three viable paths — needs Ken's call:
    a) Keep current segments (mirror desktop). Tech-savvy users get
       full diagnostic richness. Ship as-is.
    b) Build a parallel mobile-only segment set matching the handoff
       exactly (BLADE + LED + NEOPIXEL + draw + charge + voltage +
       BT + PROFILE). More work — needs charge/voltage/BT data
       sources we don't have wired yet.
    c) Hybrid: keep most desktop segments but add the missing
       user-facing ones (charge, BT) when their data sources land.

  Recommend option (a) ship now; revisit (c) when battery + BT
  surfaces are wired (post-v0.17 per BLUETOOTH_FEASIBILITY.md).

  Conditional escalation per handoff §Q3 — IF option (a):
    - When CONN goes to error state → CONN segment colors --status-error
    - When MOD goes to ARMED → MOD segment colors --status-warn
    - These are already implemented via getConnectionDisplay's
      colorClass return value

KEY REFERENCE FILES (local-only, gitignored)
--------------------------------------------
- Claude Design Mobile handoff/HANDOFF.md       ← spec, read first
- Claude Design Mobile handoff/components/v1-synthesis.jsx
                                                ← lift verbatim
- Claude Design Mobile handoff/components/primitives.jsx
                                                ← Sheet/SheetPeek/SheetBody source
- Claude Design Mobile handoff/styles/kyber-mobile.css
                                                ← all mobile styles + tokens
- Claude Design Mobile handoff/shots/01..11-*.png ← per-decision screenshots

EXISTING MOBILE PRIMITIVES (shipped, ready to use)
--------------------------------------------------
apps/web/components/layout/mobile/
  MobileActionBar.tsx       — 5 icon+letter chips (I/C/B/L/S) + … overflow (4.2)
  MobileSectionTabs.tsx     — horizontal COLOR/STYLE/MOTION/FX/HW/ROUTE tabs (4.2)
  MobileStatusBarStrip.tsx  — wraps StatusBar mode='scroll' (4.2)
  ColorRail.tsx             — 8 canonical swatches + + More (4.3)
  QuickControls.tsx         — ColorQuickControls 6-slider grid (4.3)
  MiniSlider.tsx            — primitive: label + value + track + native range (4.3)
  ParameterSheet.tsx        — 3-stop bottom sheet primitive (4.4 — review pending)
  ParameterSheetBody.tsx    — default per-param body shell (4.4 — review pending)

apps/web/lib/colorHsl.ts    — rgbToHsl + hslToRgb + adjustColorHsl (4.3)

TOKENS ALREADY ADDED to apps/web/app/globals.css (do NOT re-add)
---------------------------------------------------------------
Phase 4.2 batch (all 14 tokens already shipped):
  --header-h: 44px
  --actionbar-h: 56px
  --statusbar-h: 36px
  --section-tabs-h: 32px
  --mobile-pixel-strip-h: 36px
  --blade-rod-h: 64px
  --blade-rod-h-inspect: 200px      ← used by Phase 4.5 Inspect mode
  --shell-h: composite calc()
  --touch-target: 44px
  --ease-sheet: cubic-bezier(0.32, 0.72, 0, 1)
  --dur-sheet: 260ms
  --sheet-radius: 14px
  --sheet-shadow: 0 -8px 24px -8px rgba(0,0,0,0.5)
  --blade-glow-cool: 0 0 24px rgba(74, 158, 255, 0.6)
  --blade-glow-warm: 0 0 24px rgba(255, 107, 53, 0.6)
  --chip-w: 96px
  --chip-h: 64px

Phase 4.5 doesn't need new tokens — it consumes --blade-rod-h-inspect
+ --touch-target + --status-warn / --status-error / --accent.

VERIFICATION COMMANDS BEFORE STARTING
-------------------------------------
  cd /Users/KK/Development/KyberStation
  git fetch origin --prune && git status && git log --oneline -10
  git worktree list             # should be ~2 (main + KyberStation-mkt)
  pnpm install
  pnpm typecheck                # should be clean (10/10 packages)
  pnpm test                     # should be ~5,000 passing

If PR #207 is merged before you start:
  git checkout main && git pull
Otherwise stack on top of feat/mobile-parameter-sheet-primitive:
  git fetch origin
  git checkout -b feat/mobile-parameter-sheet-integration origin/feat/mobile-parameter-sheet-primitive

WHERE THINGS LIVE
-----------------
- CLAUDE.md "Current State (2026-05-01 morning)" — today's wrap-up
- CLAUDE.md "Current State (2026-04-30 night)" — last night's marathon
- Claude Design Mobile handoff/ — the design source of truth (gitignored)
- docs/POST_LAUNCH_BACKLOG.md — single source of truth for open items
- docs/HARDWARE_FIDELITY_PRINCIPLE.md — north star for engine decisions
- docs/research/NEXTJS_15_UPGRADE_PLAN.md — defer to v0.17
- docs/research/BLUETOOTH_FEASIBILITY.md — defer to v0.17

OPEN PRs (mobile + other)
-------------------------
- #207 feat/mobile-parameter-sheet-primitive — Phase 4.4 foundation, awaiting review
- #32 feat/marketing-site-expansion — needs rebase, leave open, focused session post-mobile-sprint
- #83 docs/session-archive-2026-04-27-evening — recommend close (historical)

CROSS-SESSION COLLISION GUARDRAILS
-----------------------------------
The 4.2 / 4.3 / 4.4 sprint hit two cross-session worktree collisions
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

WHAT NOT TO DO
--------------
- Don't dispatch more than 4 concurrent agents (worktree leak risk)
- Don't bypass the worktree path discipline check
- Don't merge stacked PRs with --delete-branch without recovering
  child PRs immediately (auto-close trap — see CLAUDE.md current
  state for procedure: child PR's branch is usually a fast-forward
  of new main + 1 commit, just `gh pr create --base main` against
  the same branch)
- Don't force-push to ANY branch (strict per CLAUDE.md collab defaults)
- Don't modify branch protection rules
- Don't re-add the ParameterSheet wiring directly inside
  ColorQuickControls — Ken intentionally reverted that approach
  during the Phase 4.4 build. Use the parameterSheetStore pattern
  in 4.4.x instead.
- Don't replace or modify the existing Sheet primitive
  (apps/web/components/shared/Sheet.tsx, PR #195) — it's an
  independent general-purpose modal. ParameterSheet is the
  domain-specific 3-stop variant. They coexist.
- Don't re-add the proposed tokens to globals.css — they're
  already shipped via PR #203 (Phase 4.2). Check before adding.

COLLABORATION DEFAULTS (from CLAUDE.md)
---------------------------------------
- Local commits + push to feature branches: pre-authorized
- PR open + PR merge: pre-authorized (merge commits, NOT squash)
- Tag cuts: ALWAYS confirm with Ken first
- Force-push: never, on any branch
- Direct push to main: blocked by branch protection (good)
- Branch protection / repo settings: never modify

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
| `CLAUDE.md` "Current State (2026-05-01 morning)" | Today's mobile-sprint wrap-up — 6 PRs + design handoff pivot |
| `CLAUDE.md` "Current State (2026-04-30 night)" | Launch + post-launch sprint marathon (~30 PRs) |
| `Claude Design Mobile handoff/HANDOFF.md` | **The current mobile design source of truth** — Q1-Q5 resolved with production-shape JSX + tokens. Local-only (gitignored) |
| `Claude Design Mobile handoff/components/v1-synthesis.jsx` | Three reference screens (Color, Style, Motion) — lift verbatim |
| `Claude Design Mobile handoff/components/primitives.jsx` | Sheet, SheetPeek, SheetBody, ColorRail, QuickControls, etc. |
| `Claude Design Mobile handoff/styles/kyber-mobile.css` | All mobile styles + token definitions |
| `docs/mobile-audit.md` | Phase 1 — current state audit (historical) |
| `docs/mobile-design.md` | Phase 2 — chip-strip proposal (superseded by handoff) |
| `docs/mobile-implementation-plan.md` | Phase 3 — original 11-PR plan (historical, partially executed) |
| `docs/SECURITY_AUDIT_2026-04-30.md` | Security posture findings + remediation |
| `docs/research/NEXTJS_15_UPGRADE_PLAN.md` | Next 14→15 migration plan (3-5h, defer to v0.17) |
| `docs/research/BLUETOOTH_FEASIBILITY.md` | Web BT feasibility — port Fredrik's POC, defer to v0.17 |
| `docs/POST_LAUNCH_BACKLOG.md` | Single source of truth for open items |
| `docs/HARDWARE_FIDELITY_PRINCIPLE.md` | North star for engine + UI architectural decisions |
| `docs/FLASH_GUIDE.md` | Canonical end-user flash workflow (dfu-util first) |

## Open PRs (cleanup decisions)

- **#207** `feat/mobile-parameter-sheet-primitive` — Phase 4.4 foundation. Pure additive (4 new files); no integration. Ready for review.
- **#32** `feat/marketing-site-expansion` — substantial 4152-LOC marketing pages (38 files). Open since 2026-04-18. Needs rebase + focused review session post-mobile-sprint. **Leave open.**
- **#83** `docs/session-archive-2026-04-27-evening` — historical session archive, conflicts with newer state. **Recommend close** (work it documents is already on main).

## Phase rollout map (current)

| Phase | Status | Branch convention |
|---|---|---|
| 4.1 Sticky shell foundation | ✅ #199 + #200 | `feat/mobile-shell-sticky` |
| 4.2 Section tabs + status strip | ✅ #203 | `feat/mobile-section-tabs` |
| 4.3 QuickControls + ColorRail | ✅ #205 | `feat/mobile-quick-controls` |
| 4.4 ParameterSheet primitive (foundation) | ⏳ #207 review pending | `feat/mobile-parameter-sheet-primitive` |
| **4.4.x ParameterSheet integration via store** | **⏳ NEXT** | `feat/mobile-parameter-sheet-integration` |
| 4.5 Inspect mode + diagnostic strip review | ⏳ after 4.4.x | `feat/mobile-blade-inspect` |

## Architectural decisions worth carrying forward

1. **`transform: translateY()` is the right animation primitive for the sheet, not `height`.** Height transitions on fixed-positioned elements have a Chromium glitch where inline `height: 720px` sets correctly but computes to the prior value until forced reflow. The handoff calls for translateY anyway, and it runs on the GPU compositor (better perf).

2. **Backdrop must be a sibling of the sheet, not its parent.** The backdrop's `opacity: 0` at peek would otherwise cascade to the sheet (CSS opacity property cascades to children). Encode opacity in `background: rgba(0,0,0,0)` so children's opacity isn't tied.

3. **Mobile primitives stay confined to `apps/web/components/layout/mobile/`.** Desktop / tablet shells are byte-identical. Tokens added to `globals.css` are inert until consumed.

4. **StatusBar's `mode` prop is the source-of-truth seam between desktop and mobile.** `mode='default'` (desktop) and `mode='scroll'` (mobile via MobileStatusBarStrip) share the same segment data computation. No drift risk.

5. **Sheet primitives live in two parallel components by design.**
   - `apps/web/components/shared/Sheet.tsx` (PR #195) — single-state general-purpose modal.
   - `apps/web/components/layout/mobile/ParameterSheet.tsx` (PR #207) — 3-stop parameter-edit specific.
   They share no implementation but consume the same tokens (`--sheet-radius`, `--sheet-shadow`, `--ease-sheet`, `--dur-sheet`).
