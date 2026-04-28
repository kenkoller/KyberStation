# Next Session — Paste-Ready Handoff Prompt

Use after the 2026-04-27 overnight session (archived in [`docs/SESSION_2026-04-27_OVERNIGHT.md`](SESSION_2026-04-27_OVERNIGHT.md)).

---

## Paste this into a new Claude Code session

```
Continue from the 2026-04-27 overnight session for KyberStation.

PROJECT CONTEXT
---------------
KyberStation is a web-based lightsaber style editor for Proffieboard
V3.9 / ProffieOS 7.x. Last tag is v0.15.0 (Modulation Routing v1.1
Core, hardware-validated). 14 PRs landed on top of v0.15.0 in the
overnight session — UI/UX sweep including the new Sidebar IA + A/B
column layout for blade-style + color + ignition-retraction.

WHERE WE ARE
------------
- Branch: `main`
- Last tag: `v0.15.0` (untagged work pending — 14 PRs since)
- Recommended browser: Brave / Chrome / Edge. Safari has one known
  cosmetic gap (BladeCanvas bloom narrower than Chromium — see
  POST_LAUNCH_BACKLOG.md "Safari rendering follow-ups").

READ FIRST
----------
1. `CLAUDE.md` "Current State" entry (overnight session recap)
2. `docs/SESSION_2026-04-27_OVERNIGHT.md` — full PR list + audit findings
3. `docs/POST_LAUNCH_BACKLOG.md` — open queue
4. `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` — for any A/B Phase 4+ work
5. `docs/SIDEBAR_IA_AUDIT_2026-04-27.md` — for any further IA cleanup

OPEN ITEMS YOU CAN PICK UP (in priority order)
-----------------------------------------------

A. Sidebar A/B Phase 4 — extend pattern to remaining sections
   Per SIDEBAR_AB_LAYOUT_v2_DESIGN.md §4.4-§4.9. Sections still
   rendering legacy single-panel: combat-effects, routing,
   gallery (in editor), audio, my-saber, output preset list.
   Pattern is well-established — Phase 2 (blade-style) and Phase 3
   (color + ignition-retraction) shipped in #91 + #94.
   Agent-doable, low risk. Each section ~250-700 lines of new code
   (Column A list + Column B detail + barrel) + ~10 lines in
   MainContent dispatch.

B. Safari BladeCanvas bloom (architectural)
   Bloom renders dramatically narrower in Safari than Chromium.
   The padding-mip approach attempted this session didn't fully
   resolve. Real fix candidates (each requires careful Safari
   inspection):
     1. Replace `ctx.filter = blur(N)` with manual box-blur via
        chained drawImage offsets. Browser-agnostic but slower.
     2. Use SVG `feGaussianBlur` filter applied via CSS
        `filter: url(#blur)` on the canvas element.
     3. Render bloom via overlaid `<div>` with `filter: blur()`
        — same shape as the MiniSaber box-shadow fix in PR #92.
   Out-of-band testing in Safari needed; risky on the live editor.

C. Source-of-truth drift fix — extract BLADE_LENGTHS to shared lib
   Currently duplicated across lib/bladeRenderMetrics.ts,
   components/editor/HardwarePanel.tsx,
   components/editor/BladeHardwarePanel.tsx,
   packages/engine/src/types.ts. Tonight's "36"=144 vs 132" mismatch
   was the second time this drift bit. Lift to
   `apps/web/lib/bladeLengths.ts` (or `@kyberstation/engine`'s
   exported `BLADE_LENGTH_PRESETS`) and import everywhere.

D. Strip Configuration — wire visual blade thickness
   Strip selection (1-5 strips) feeds the power-draw math + ledCount
   but doesn't change the rendered capsule thickness. Currently
   marked WIP via PR #96. Wiring this would close the gap.

E. Topology — multi-segment renderer for Triple / Inquisitor
   Single / Staff / Crossguard work. Triple + Inquisitor are visual
   placeholders pending a multi-segment rendering pipeline. Currently
   WIP-marked.

F. WebUSB global connection store
   `StatusBar.tsx:170-238` and `DeliveryRail.tsx:191-210` show
   hardcoded "IDLE" placeholders. FlashPanel holds connection state
   locally; lift to Zustand store so both consumers can read live
   state.

G. 3 consumer-migration stub deletions
   `BladeHardwarePanel.tsx` / `PowerDrawPanel.tsx` /
   `GradientBuilder.tsx` are full duplicate components flagged
   "consumer migration in progress". Active imports from DesignPanel,
   ColorPanel, StylePanel, TabColumnContent, lib/powerDraw,
   BladeStyleColumnB. Each stub is its own focused PR.

H. Mobile shell migration to Sidebar + MainContent
   Desktop migrated. Mobile still uses 4-tab swipe UI
   (MergedDesignPanel, DynamicsPanel, uiStore.activeTab). Needs UX
   call on drawer vs bottom-sheet pattern at 375px.

I. Wave 8 — Button routing sub-tab + aux/gesture-as-modulator plates
   Per docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md. New sub-tab inside
   Routing, maps button events to actions per prop file. ~6-8h.

J. UX item #16 — Figma color model (opacity + blend modes)
   Last UX North Star item. Needs Kyber Glyph version bump + engine
   compositor changes.

K. Module extraction `lib/blade/*` from BladeCanvas.tsx
   ~2800 lines of inline pipeline. Extracting to shared modules so
   MiniSaber + FullscreenPreview can adopt the workbench pipeline.
   High-risk on live editor; needs golden-hash regression tests in
   place first.

DON'T REDO
----------
- A/B Phase 2 (blade-style) — shipped via #91
- A/B Phase 3 (color + ignition-retraction) — shipped via #94
- Sidebar IA reorganization — shipped via #89
- Settings consolidation — shipped via #90
- Aurebesh variant UI — shipped via #93
- Safari MiniSaber halo banding — shipped via #92 (NOT to be confused
  with Safari BladeCanvas bloom, which is still open)

LAUNCH POSTURE
--------------
v0.15.0 is hardware-validated. Remaining backlog is post-launch
polish — none of the open items above gate launch. Public launch
communication should honestly acknowledge the Safari BladeCanvas
gap and recommend Chromium browsers for full visual fidelity.

WRAP-UP
-------
When you finish a session, archive at `docs/SESSION_<date>.md`
following the shape of `docs/SESSION_2026-04-27_OVERNIGHT.md`.
Update CLAUDE.md "Current State" with a one-paragraph summary +
demote the previous "Current State" block to a session header.

Begin by reading the docs above + running:
  git fetch origin --prune
  git status
  git log --oneline -8
to confirm branch state before doing anything.
```

---

## Why this handoff shape

- **Self-contained prompt** — new session reads everything at step 1.
- **Open items prioritized** — A is the cleanest next continuation; K requires architectural prep first.
- **DON'T-REDO list explicit** — prevents re-attempting closed work.
- **Launch-posture grounding** — keeps post-launch polish posture honest.
- **WRAP-UP shape preset** — sessions self-archive with consistent structure.
