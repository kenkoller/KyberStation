# Mobile UX Audit — 2026-05-02 (post-launch)

**Status:** audit-only. No code changes shipped. This document surfaces
findings + a recommendation per item; Ken triages before any fix work.

**Method:** local dev server (`mobile-audit-worktree`, port 56990) walked
across 5 viewports — 375 (phone), 599 (phone-just-below-tablet), 768
(iPad portrait), 900 (iPad landscape-ish), 1023 (just-below-desktop),
1024 (desktop boundary). All measurements via `preview_inspect` /
`getBoundingClientRect`, screenshots via `preview_screenshot`. Tested
with the post-v0.20.0 `ImportStatusBanner` actively rendered (Baylan
Skoll fixture pasted via `Output → Paste C++ → Parse → Apply to
Editor`).

Active branch is `claude/cool-williamson-bb756a` cut from `main` at
`39e5732` — i.e. the post-v0.20.0 state with all 14 import-sprint PRs
merged.

---

## Breakpoint reference

From `tailwind.config.ts` + `apps/web/hooks/useBreakpoint.ts`:

| Breakpoint | Width | Shell | Tailwind variants |
|---|---|---|---|
| phone-sm | ≤479 | `MobileShell` | `phone-sm:`, `phone:` |
| phone | 480–599 | `MobileShell` | `phone:` |
| tablet | 600–1023 | `TabletShell` | `tablet:` |
| desktop | 1024–1439 | `WorkbenchLayout` | `desktop:` |
| wide | ≥1440 | `WorkbenchLayout` | `wide:` |

---

## §1 — Diagnostic strip §Q3 segment-set decision (Q-call for Ken)

The mobile diagnostic strip at the bottom of `MobileShell` is currently
the desktop-mirror set: **PWR · PROFILE · BOARD · CONN · PAGE · LEDS ·
MOD · STOR · THEME · PRESET · UTC · BUILD** rendered via a single
`<StatusBar mode="scroll" />` wrapper in [MobileStatusBarStrip.tsx](apps/web/components/layout/mobile/MobileStatusBarStrip.tsx).

### Live measurements at 375 px

- Strip clientWidth: **373 px**
- Strip scrollWidth: **1337 px** (≈3.6× viewport)
- Default visible at rest: PWR + Profile + start of Board (≈260 px of content)
- ≈75% of segments require horizontal swipe to reach

### Three paths from CLAUDE.md "Current State 2026-05-01 afternoon" §Q3

| Path | Segments | Tradeoff |
|---|---|---|
| **(a)** Keep current desktop-mirror | 11 segments above | Tech-savvy users get full diagnostic richness; mobile === desktop. **No new data sources required.** |
| **(b)** Mirror handoff §Q3 verbatim | BLADE 36" · 144 LED · NEOPIXEL · 3.88A · 41% CHARGE · 4.2V · BT ON · PROFILE 03 | More user-facing; **needs charge / voltage / BT data sources we haven't wired yet** (battery selector exists but doesn't broadcast %; BT is post-v0.17). |
| **(c)** Hybrid | Most desktop segments + add charge / BT when sources land | Best long-term; gated on battery + BT features. |

### Recommendation: ship path (a) for v1.0, plan toward (c) post-v0.17

**Reasoning:**

1. **Path (a) ships zero risk.** Nothing changes. Strip already works.
2. **Path (b) is half-real today.** Charge/voltage/BT segments would
   render literal placeholders (`— %`, `— V`, `BT —`) — net negative
   vs. the current load-bearing signals.
3. **Path (c) is the right answer once feature data lands.** Battery
   feature gives charge/voltage. Web Bluetooth (deferred to v0.17) gives
   BT. After both, the strip can fold the new segments in alongside
   existing diagnostic ones.
4. **Two narrow polish items inside path (a) worth doing now:**
   - Fix the **"BOARD · BOARD" duplication** at status bar middle.
     `BoardSegment` (in [StatusBar.tsx](apps/web/components/layout/StatusBar.tsx):579–596)
     renders a 9px "Board" label *and* `BoardPicker variant="inline"`
     (in [BoardPicker.tsx](apps/web/components/shared/BoardPicker.tsx):161)
     renders its own "BOARD · displayName". Rendered text:
     `Profile · KYBER  Board  BOARD · Proffieboard V3.9  Conn · IDLE`.
     The two "Board"/"BOARD" labels back-to-back read confusing in the
     scroll strip — drop the outer label, keep the picker's.
   - Default the strip's initial scroll position to **show PWR + Profile +
     active board** (the three most-load-bearing fields). PWR is already
     left-anchored, so this is mostly a "verify it still anchors after
     the BOARD-BOARD fix" check.

### What this is NOT a recommendation for

- Don't gate launch on either fix above. They're polish.
- Don't pursue path (b) standalone — battery data isn't there.

---

## §2 — Sub-1024 responsive cleanup (Ken's #2 from v0.15.x field notes)

Tested 768 / 900 / 1023 / 1024 boundary transitions. Findings, in
descending severity:

### 2.1 Brand drift — TabletShell renders `BLADEFORGE`, not `KYBERSTATION`

**Severity:** medium-high. User-visible at 600–1023 px (any iPad
portrait, narrow laptop windows).

**Evidence:**

- Mobile (599 px): `<h1>` reads `KYBERSTATION` ✓
- Tablet (768 / 900 / 1023 px): `<h1>` reads `BLADEFORGE` ✗
- Desktop (1024 px): `<h1>` reads `KYBERSTATION` ✓

**Source:** [`apps/web/components/layout/AppShell.tsx:77–80`](apps/web/components/layout/AppShell.tsx)

```tsx
<h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
  <span className="text-white">BLADE</span>
  <span className="text-accent">FORGE</span>
</h1>
```

**Cause:** stale brand from a pre-rename TabletShell. MobileShell + the
desktop `WorkbenchLayout` were updated when the project renamed to
KyberStation; this surface was missed.

**Recommendation:** one-line fix to `BLADE` → `KYBER` and `FORGE` →
`STATION`. Trivial. Should ship before any post-launch "did you know
KyberStation works on iPad?" outreach. **No layout changes required.**

### 2.2 Output A/B Column B squeezed to ~210 px on tablet

**Severity:** medium. Affects users who paste-import a config on iPad.

**Evidence at 768 px:**

- TabletShell layout: outer `<Sidebar style={{width: 240}} />` +
  `<MainContent />` flex-1 = 528 px MainContent area
- Inside MainContent for `output`: another nested split
  (`<MainContentABLayout columnA={...} columnB={...} />`) —
  Column A defaults ~280 px, Column B gets the rest
- Net Column B width: **210 px** (measured)
- ImportStatusBanner inside Column B: width 210 / height 195 — buttons
  + description stack into one ultra-narrow column

**Layout depth:**
```
Tablet width 768
└── Sidebar 240 + MainContent 528
    └── ColumnA 280 + ResizeHandle + ColumnB ≈210
        └── ImportStatusBanner ≈210 wide
```

**Recommendation:** at tablet width, the nested A/B split inside
MainContent is one split too many. Two paths:

- **Fix A (cheaper):** for `output` section specifically at tablet
  widths, hide the outer `Sidebar` when the user is in Output (or auto-
  collapse it). Section nav is already in Column A. Saves ~240 px.
- **Fix B (broader):** at tablet width, force `MainContentABLayout` to
  stack columns vertically (same shape as mobile-stacked). Already
  written for `<600`; relaxing the threshold to `<1024` for nested
  `output` only is small.

Either fix is a single-PR scope. Fix B is cleaner architecturally.

### 2.3 Duplicate "1 GENERATE CODE" header inside Column B

**Severity:** low (cosmetic).

**Evidence:** Column A's stepper renders "1 Generate Code · Emit
ProffieOS config.h" as the active row. Column B's sticky header
([OutputColumnB.tsx](apps/web/components/editor/output/OutputColumnB.tsx):78–105)
re-renders the same thing: step number + label + description.

Same info twice in the user's eyeline at every viewport width. At 1024
desktop it reads as redundant breadcrumb; at 768 tablet it eats ~32 px
of vertical space inside the already-squeezed Column B.

**Recommendation:** drop the description from Column B's header (keep
the step number badge + label as a context anchor). The step IS
uniquely identified by Column A's selection — Column B's header was
designed for sections without an obvious anchor.

### 2.4 Hardware row reflow at 768

**Severity:** none — works as expected.

Type / Hilt / Strip / Blade / Dia / Tube / 144 LEDs / Grid all wrap to
2 rows at 768. Looks fine, no overlaps. Note for awareness.

---

## §3 — ImportStatusBanner mobile collision audit (375 px)

The v0.20.0 ImportStatusBanner is mounted in `CodeOutput.tsx:430`,
which ends up nested inside `OutputAB → OutputColumnB → CodeOutput`.
Question was: does it render correctly on the mobile shell at 375 px?

### 3.1 Banner DOES render — basic flow works

- `[data-testid="import-status-banner"]` query: present, visible ✓
- Save Preset / Convert to Native buttons: clickable, `touch-target`
  hit area = 96×44 (visible 70×30) ✓
- Preset switcher dropdown (appears when batch.length > 1): not tested
  this session — only single-style fixture used. Code path confirmed
  in source.

### 3.2 Layout breakdown at 375 px

**Measurements:**

- Banner: 343×255 px (nearly square)
- Description text column: **83 px wide** (extreme vertical wrap)
- Right action buttons: 70+88 = ~165 px
- Banner top edge: y=531 px — **only ~281 px visible** in 812-px viewport

**Why it looks bad:** the banner uses `flex items-start
justify-between gap-3 flex-wrap` with description left + buttons right.
At 343 px container width with ~165 px of buttons, description column
collapses to ~83 px → text wraps to ~6–7 lines of 1–2 words each
("Original / ProffieOS / code is / preserved / on export. /
Visualizer / edits / update / the / preview / only — / they / won't /
change / the / exported / code / until / you / convert.").

### 3.3 Banner is below-the-fold by default after Apply

The `output` section uses A/B layout. On mobile, this stacks Column A
(stepper) + Column B (CodeOutput body). Column A is `max-h-[40vh]`
(≈325 px on iPhone 13). Column B's body scrolls internally.

After "Apply to Editor", the banner mounts inside Column B. Default
scrollTop of Column B body: 0. Banner's vertical position: y=531 of
812. **The user sees the visualizer update + the OUTPUT_PIPELINE
stepper, but the banner explaining "your import was preserved" is
below the fold and requires manual scroll to discover.**

This is a discoverability regression vs desktop, where the banner sits
in the upper third of the right column.

### 3.4 Recommendations (not for this session — for triage)

1. **Stack vertically at phone-sm + phone widths.** Change
   `flex items-start justify-between` to `flex flex-col gap-2` below
   `phone:` breakpoint. Description gets full width; buttons sit below
   in a row. Banner height drops from 255 → ~140 px. Description text
   reads naturally.
2. **Auto-scroll to banner on import.** When `convertImportToNative` /
   `loadPreset` from a paste sets `importedRawCode`, scroll the
   containing scrollable parent to the banner's `top` minus a few px
   of breathing room. One-shot effect on the banner mount.
3. **Optional: sticky banner at top of Column B.** Costs vertical
   space but solves discoverability fully. Probably overkill if (2)
   ships.

(1) is the lowest-risk fix and would close the 375-px squeeze
without affecting larger viewports. ~10–15 LOC, 2–3 new tests.

---

## §4 — What was NOT regressed by the v0.20.0 import sprint

Sanity check that the post-v0.16 mobile work still holds after the
14-PR import sprint:

- ✅ Mobile shell loads at 375 / 599
- ✅ Auto-ignite fires after onboarding skip
- ✅ Section tabs strip (COLOR / STYLE / MOTION / FX / HW / ROUTE) renders
- ✅ Action bar 5 chips + ⋯ overflow visible
- ✅ Status bar scroll mode works (1337 px scrolls within 373 px container)
- ✅ Drawer opens via hamburger
- ✅ MobileSectionTabs no-tab-selected state when on `output` (drawer-only section) — strip stays visible, none highlighted
- ✅ Pixel strip + mini blade canvas render
- ✅ Banner is *present* on mobile shell when `importedRawCode` is set —
  layout has issues (§3) but the banner doesn't crash or hide

---

## Triage summary for Ken

Ordered by impact / effort:

| Item | Severity | Effort | Recommendation |
|---|---|---|---|
| 2.1 BLADEFORGE → KYBERSTATION | medium-high | 1 LOC | Ship now. |
| 1.x BOARD-BOARD label dedup | low-medium | ~5 LOC | Ship with 2.1. |
| 3.4(1) Banner vertical stack at phone | medium | ~15 LOC + tests | Next session. |
| 2.2 Tablet Output Column B squeeze | medium | medium PR | Post-launch. |
| 2.3 Drop duplicate Column B header description | low | ~3 LOC | Bundle with any output-area cleanup. |
| 3.4(2) Auto-scroll to banner | low | small | Nice-to-have. |
| §1 Diagnostic strip path (c) hybrid | n/a | gated on v0.17+ | Plan, don't build yet. |

---

## Files referenced

- [apps/web/components/layout/MobileShell.tsx](apps/web/components/layout/MobileShell.tsx)
- [apps/web/components/layout/AppShell.tsx](apps/web/components/layout/AppShell.tsx) — `BLADEFORGE` lines 77–80
- [apps/web/components/layout/MainContentABLayout.tsx](apps/web/components/layout/MainContentABLayout.tsx) — mobile-stacked branch lines 85–104
- [apps/web/components/layout/StatusBar.tsx](apps/web/components/layout/StatusBar.tsx) — `BoardSegment` lines 579–596
- [apps/web/components/shared/BoardPicker.tsx](apps/web/components/shared/BoardPicker.tsx) — `BOARD · displayName` line 161
- [apps/web/components/layout/mobile/MobileStatusBarStrip.tsx](apps/web/components/layout/mobile/MobileStatusBarStrip.tsx)
- [apps/web/components/editor/ImportStatusBanner.tsx](apps/web/components/editor/ImportStatusBanner.tsx)
- [apps/web/components/editor/CodeOutput.tsx](apps/web/components/editor/CodeOutput.tsx) — banner mount point line 430
- [apps/web/components/editor/output/OutputColumnB.tsx](apps/web/components/editor/output/OutputColumnB.tsx) — duplicate header lines 78–105
- [tailwind.config.ts](tailwind.config.ts) — breakpoints lines 63–73
