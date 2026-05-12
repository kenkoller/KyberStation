# Mobile Implementation Plan — Phase 3

**Branch:** `docs/mobile-implementation-plan-phase-3`
**Date:** 2026-04-30 (overnight)
**Inputs:** [`docs/mobile-audit.md`](./mobile-audit.md) (Phase 1) · [`docs/mobile-design.md`](./mobile-design.md) (Phase 2)
**Status:** Plan only. **Ken has NOT yet reviewed Phase 2 as of this writing** — this plan assumes the Phase 2 design as written. If Phase 2 changes after Ken's review, individual PR scopes here will need revision; the overall PR sequence + dependency tree should mostly survive.

> **Phase 4 gate:** No code lands until Ken approves both Phase 2 design + this Phase 3 plan. PRs in §2 below are queued, not started.

---

## 1. Approach

The 11 PRs in §2 build the design from `docs/mobile-design.md` in dependency order. The sequence:

1. **Foundation** (PR #1–#3) — breakpoint addition, primitive components, app-shell flag
2. **Core fixes** (PR #4–#5) — the three Phase-1 critical findings
3. **Per-section** (PR #6–#9) — apply the 4 design patterns (A/B/C/D) section-by-section
4. **Polish** (PR #10–#11) — touch ergonomics + landscape + verification

Each PR is sized to be reviewable in 30–60 min and shippable independently. Several PRs CAN run in parallel (called out in §2.x dependencies); a single sequential pass is also viable.

**Logic vs layout split:** Most PRs are layout-only (Tailwind classes, container restructuring). Three PRs require small logic changes — flagged with 🟡 in §2 for separate review attention.

**Test approach:** Each PR includes:
- Unit tests for new primitives (Sheet, ChipStrip)
- SSR shape tests (`renderToStaticMarkup`) at 380 / 414 / 768 / 1024px viewports for layouts
- Visual verification via `pnpm dev` + Chrome DevTools mobile emulation at 375 × 812 (iPhone SE) and 414 × 896 (iPhone Plus)
- Existing tests must still pass

**Branch naming:** `mobile/<short-name>` per Ken's Phase 4 convention.

---

## 2. PR sequence

### PR #1 — Foundation: `phone-sm` breakpoint + tokens

**Scope:** Layout-only. No component changes.
**Files:**
- `tailwind.config.ts` — add `phone-sm: { max: '479px' }` to `screens`
- `apps/web/app/globals.css` — add CSS custom properties for new mobile-only tokens (`--mobile-action-bar-h`, `--mobile-bottom-bar-h`, `--mobile-safe-pb`)
- `apps/web/tests/tailwindBreakpoints.test.ts` — assert `phone-sm` is exported and applies at 479px max
- `docs/mobile-design.md` § 1 reference — no doc changes needed
**Dependencies:** None — pure foundation.
**Testing:** Existing Tailwind config tests + 1 new unit test asserting the breakpoint definition.
**Risk:** Zero. Adding a new variant doesn't activate anywhere until consumed.
**Estimated:** 30 min.

---

### PR #2 — Foundation: `<Sheet>` primitive

**Scope:** New component. No call sites yet.
**Files:**
- `apps/web/components/shared/Sheet.tsx` (new) — full-screen bottom sheet pattern. Slide-up + dim-backdrop + dismiss on backdrop-tap / Escape / swipe-down. Uses `useModalDialog` for focus trap (already in codebase).
- `apps/web/components/shared/Sheet.types.ts` — `SheetProps`, `SheetSize: 'auto' | 'half' | 'full'`
- `apps/web/tests/sheet.test.tsx` — 8–10 SSR + behavior tests (open/close, focus trap, sized variants, swipe-dismiss math)
- `apps/web/components/shared/index.ts` — export
**Dependencies:** PR #1 (uses `phone-sm` token for edge-to-edge variant).
**Testing:** Renders correctly closed (null), open, with content. Backdrop click dismisses. Escape dismisses. Reduces motion when `prefers-reduced-motion: reduce`.
**Risk:** Low. Additive primitive, no existing call sites depend on it.
**Estimated:** 1.5 hr (includes tests).
**UX North Star check:** §3 anti-ref "no shadcn drop-in" — Sheet is custom-built, not a Radix Dialog wrapper. §5 house style — flat, calm, dark-by-default chrome with the existing `--bg-deep` backdrop and `--border-subtle` edge.

---

### PR #3 — Foundation: `<ChipStrip>` primitive

**Scope:** New component. No call sites yet.
**Files:**
- `apps/web/components/shared/ChipStrip.tsx` (new) — horizontal scroll-snap container with edge-fade gradients. Children are `<Chip>` items with `active` / `accent` / `subtitle` props. Container handles momentum scroll, snap-center, and active-chip auto-scroll-into-view.
- `apps/web/components/shared/Chip.tsx` (new) — individual chip; identity-color stripe top edge, accent border on active, flat label + optional icon + optional subtitle.
- `apps/web/tests/chipStrip.test.tsx` — SSR shape, active-chip indicator, scroll-into-view behavior (with mock `scrollIntoView`).
- `apps/web/tests/chip.test.tsx` — Chip props matrix.
**Dependencies:** PR #1.
**Testing:** Renders chips, marks active, scrolls active into view, dismisses on outside-axis-tap.
**Risk:** Low. Additive primitive.
**Estimated:** 1.5 hr.
**UX North Star check:** §4 "list rails / chip rails" precedent — matches the existing chip-rail patterns (header-button group, gallery filter pills). §5 — flat, no card-wrap.

---

### PR #4 — Critical fix: in-editor bottom-bar swap (replaces global MobileTabBar inside `/editor`)

🟡 **Logic change required** — `app/layout.tsx` adds a route-aware flag.

**Scope:** Phase 1 audit Critical Issue #2 ("Back to Canvas pill + MobileTabBar bottom-pin overlap"). Phase 2 design §2.2 — "Inside `/editor`, the global MobileTabBar hides; a single in-editor bottom bar handles both the section pill and the Back to Canvas affordance."

**Files:**
- `apps/web/app/layout.tsx` — wrap `<MobileTabBar>` in a route-aware visibility check via a new `useShouldShowMobileTabBar()` hook OR via a CSS media-query on the `pathname`. Recommend the hook for testability.
- `apps/web/hooks/useShouldShowMobileTabBar.ts` (new) — reads `usePathname()`, returns `true` for `/m`, `/gallery`, `/docs`, `/`; returns `false` for `/editor` and any sub-route.
- `apps/web/components/layout/MobileTabBar.tsx` — reads the hook, returns `null` when false.
- `apps/web/components/layout/MobileShell.tsx` — adds the new in-editor bottom bar (section pill + "← Back to Canvas" affordance combined).
- `apps/web/tests/mobileTabBarVisibility.test.tsx` — hook unit tests + MobileTabBar SSR-null assertion under `/editor`.

**Dependencies:** None — independent of #2 / #3 (this is a global chrome fix, not section work).

**Testing:** Tab bar visible on `/m`, `/gallery`, `/docs`. Tab bar absent on `/editor`. In-editor bottom bar appears on `/editor` only. Visual: no double-stacked bottom-pinned bars.

**Risk:** Medium-low. The route-aware flag is a single-line conditional with clear test coverage. Edge case: search params on `/editor?...` should still hide the global bar.

**Estimated:** 1.5 hr.

---

### PR #5 — Critical fix: stale audit findings cleanup (already partial via [PR #180](https://github.com/kenkoller/KyberStation/pull/180))

**Scope:** Phase 1 audit Critical Issue #3 (stale Gallery link). **PR #180 already shipped this fix** — this Phase 3 PR slot is reserved for any additional small audit-finding cleanups discovered during Phase 4 implementation (e.g., a `403 → 404` route mismatch, a stale comment that drifted out of sync, etc.).

If no follow-up cleanups surface, this PR slot is dropped. Tracked here so the Phase 3 plan reflects the audit's complete coverage.

**Status:** Mostly closed by #180; this slot is reserved.

---

### PR #6 — Pattern A: A/B sections collapse to chip-strip + Column B (`blade-style` first)

🟡 **Logic change required** — `MainContentABLayout` gains a phone-fallback branch.

**Scope:** Phase 2 design §2.2. Apply the chip-strip pattern to `blade-style` as the first reference implementation. Subsequent A/B sections (color, ignition-retraction, combat-effects, audio, output, routing) follow the same shape in PR #7 + #8.

**Files:**
- `apps/web/components/layout/MainContentABLayout.tsx` — add `phone:` variant: below 600px, render Column A's chips above Column B body. ChipStrip from PR #3 wraps Column A.
- `apps/web/components/editor/blade-style/BladeStyleColumnA.tsx` — emit a chips-shaped representation when `phone:` active. Add a `renderAsChips()` method or a `phone` prop.
- `apps/web/components/editor/blade-style/BladeStyleColumnB.tsx` — add an "Edit" chip on dense parameter blocks that opens a Sheet (PR #2) with the editor body.
- `apps/web/tests/mainContentABLayoutMobile.test.tsx` — assert the phone fallback shape via `renderToStaticMarkup` at width 380.

**Dependencies:** PRs #1, #2, #3.

**Testing:** Phone fallback renders chip strip + Column B body. Active chip in strip matches selected style. Tap on a parameter row's Edit chip opens the Sheet. SSR shape locked.

**Risk:** Medium. The MainContentABLayout split is the heart of the audit's #1 critical finding. Visual regression must be golden-hash-tested via the renderer harness from PR #147.

**Estimated:** 3 hr.

---

### PR #7 — Pattern A: roll out chip-strip to color, ignition-retraction, combat-effects

**Scope:** Apply the same Pattern A shape to 3 more sections.

**Files:**
- `apps/web/components/editor/color/ColorColumnA.tsx` — chips are color swatches (no text labels per design §2.6)
- `apps/web/components/editor/ignition-retraction/IgnitionRetractionColumnA.tsx` — chips include a sub-tab pill for IGN/RET split
- `apps/web/components/editor/combat-effects/CombatEffectsColumnA.tsx` — GENERAL row pinned first, held-state pulse dot survives in chip
- 3 new SSR shape tests, one per section

**Dependencies:** PR #6.

**Testing:** Each section renders correctly at 380px. Active chip persists across navigation.

**Risk:** Low — once PR #6's pattern works, these are mechanical applications.

**Estimated:** 2 hr.

---

### PR #8 — Pattern A: roll out chip-strip to audio, output, routing

**Scope:** Apply Pattern A to the remaining 3 sections.

**Files:**
- `apps/web/components/editor/audio/AudioColumnA.tsx` — font list as chips (font-name label, font-format icon)
- `apps/web/components/editor/output/OutputColumnA.tsx` — multi-step pipeline chips (the existing vertical stepper renders as horizontal chips on phone, with active step's body in Column B below)
- `apps/web/components/editor/routing/RoutingColumnA.tsx` — modulator-plate chips. **Modulation routing on touch**: chip-tap arms; second chip-tap on a parameter wires. Click-to-route fallback per Phase 2 §6.
- 3 new SSR tests

**Dependencies:** PR #6.

**Testing:** Audio font picker still scans library. Output multi-step pipeline still advances correctly. Routing modulator wire creation works via tap-to-arm + tap-to-target.

**Risk:** Medium for routing — touch UX for modulation is the most novel piece. The fallback (click-to-route) already works on desktop, so this is preserving existing behavior at smaller viewport.

**Estimated:** 2.5 hr.

---

### PR #9 — Pattern B / C / D: profile, form, hero-preview sections

**Scope:** Apply remaining 3 design patterns.

**Files:**
- **Pattern B** (`my-saber`):
  - `apps/web/components/editor/my-saber/MySaberColumnB.tsx` — character sheet body with grouped attribute rows + `→ Edit` chip per group
  - Reuses Sheet primitive from PR #2 for deep editing
- **Pattern C** (`hardware`, `gesture-controls`, `motion-simulation`):
  - `apps/web/components/editor/HardwarePanel.tsx` — wrap fieldsets in `<CollapsibleSection>` (already in codebase). `[Edit]` chip per row → Sheet.
  - `apps/web/components/editor/MotionSimPanel.tsx` — same pattern
  - `apps/web/components/editor/GestureControlPanel.tsx` — same pattern
- **Pattern D** (`layer-compositor`, `my-crystal`):
  - `apps/web/components/editor/layerstack/LayerStack.tsx` — gain a phone-mode that renders horizontally-scrolling layer cards instead of vertical SSL strips. Active card detail body below uses the existing layer config UI but with sheet-for-deep-edit.
  - `apps/web/components/editor/CrystalPanel.tsx` — Three.js canvas takes 50vh; layout × theme dropdowns render as native `<select>` (Phase 2 §2.5 — OS picker is the right idiom).
- 5 new SSR shape tests

**Dependencies:** PRs #1–#3 (foundation), PR #6 (Sheet wiring proven).

**Testing:** All 6 sections renderable at 380px. LayerStack horizontal scroll feels right. Crystal canvas doesn't overflow.

**Risk:** Medium. LayerStack is the most-painful section to reshape — 1086 lines original, decomposed in W6a. Most work is already in `components/editor/layerstack/` sub-files; the phone-mode is additive.

**Estimated:** 4 hr (LayerStack is the bulk).

---

### PR #10 — Polish: touch ergonomics + landscape orientation

🟡 **Logic-adjacent** — landscape detection.

**Scope:** Phase 2 design §3 (BladeCanvas hero rotation) + §5 (touch ergonomics).

**Files:**
- `apps/web/components/editor/BladeCanvas.tsx` — `@media (orientation: landscape) and (max-height: 480px)` rule that swaps blade orientation from horizontal to vertical (rare case; mostly affects phone landscape design sessions).
- `apps/web/components/layout/MobileShell.tsx` — increase action-bar chip min-tap-target to 44 × 44 per WCAG 2.5.5.
- `apps/web/components/layout/MobileSidebarDrawer.tsx` — drawer item min-height 48px.
- `apps/web/components/editor/EffectChip.tsx` — phone variant with bigger hit-target.
- `apps/web/tests/touchTargets.test.tsx` — assert key surfaces have `>= 44 × 44` minimum measured tap targets via DOM inspection in a jsdom render.
- `apps/web/app/globals.css` — `@media (prefers-reduced-motion: reduce)` rule disables sheet + drawer slide animations.

**Dependencies:** PRs #1–#9 done.

**Testing:** Manual audit at 375 × 667 / 414 × 896 / 360 × 740 (Android). All interactive elements pass the 44 × 44 floor.

**Risk:** Low. Mostly CSS adjustments.

**Estimated:** 2 hr.

---

### PR #11 — Polish: verification + cleanup

**Scope:** Final pass.

**Files:**
- Phase 2 design §11 anti-pattern check executed against the merged result. Document any deviations.
- `docs/mobile-audit.md` — strikethrough resolved findings + add resolution date + PR link per finding.
- `docs/mobile-design.md` — append a "What shipped" section with PR links.
- `docs/mobile-implementation-plan.md` — strike completed PRs, add closing notes.
- `CHANGELOG.md` — bullet list under v0.17.0 (or v0.16.x patch — TBD).

**Dependencies:** PRs #1–#10 done.

**Testing:** Lighthouse mobile audit ≥ score parity with pre-Phase-4. axe-core zero violations on mobile shell + each section. Manual walkthrough on a real phone (Ken's hardware).

**Risk:** Low.

**Estimated:** 1.5 hr.

---

## 3. Total estimated effort

| Phase | PRs | Estimated time |
|---|---|---|
| Foundation (#1–#3) | 3 | ~3.5 hr |
| Critical fixes (#4–#5) | 1.5 (one slot reserved) | ~1.5 hr |
| Per-section A/B/C/D (#6–#9) | 4 | ~11.5 hr |
| Polish (#10–#11) | 2 | ~3.5 hr |
| **Total** | **11 (10 active + 1 reserved)** | **~20 hr** |

A focused multi-day mobile sprint, not an overnight job. Two senior days or a parallel-agent batch could compress to ~10 hours wall time.

---

## 4. Parallel-vs-sequential trade-off

The PR sequence above is **dependency-correct** but not maximally parallel. Many PRs CAN run concurrently:

- PR #1 (foundation tokens) blocks #2, #3
- #2, #3 are independent (Sheet vs ChipStrip) → can run in parallel agents
- PR #4 (route-aware flag) is independent of #2/#3 → parallel
- PR #6 unblocks #7, #8 (which can then run in parallel)
- PR #9 (B/C/D) is independent of #7/#8 (different files) → can run in parallel with #7/#8 once #6 is done
- #10, #11 strictly serial after the rest

Realistic parallel batch: dispatch #1 first → dispatch #2/#3/#4 in parallel → wait → dispatch #6 → dispatch #7/#8/#9 in parallel → wait → #10, #11.

---

## 5. Logic changes summary (🟡 flagged for separate review)

Three PRs in the plan touch logic, not just layout:

1. **PR #4** — `app/layout.tsx` route-aware flag for MobileTabBar visibility. Affects all routes' bottom-chrome rendering.
2. **PR #6** — `MainContentABLayout` gains a phone-fallback render branch. Affects 7 A/B sections at once when the breakpoint flips.
3. **PR #10** — `@media (orientation: landscape)` blade orientation flip in BladeCanvas. Touches the canvas's geometry assumption.

Each of these warrants explicit Ken-eyes review at PR time.

---

## 6. Open questions for Ken's Phase 3 review

1. **Pattern A chip width on phone-sm (≤479px):** Phase 2 §2.6 says 96px for blade-style chips ("Stable", "Plasma" etc are 5–8 chars). At 380px viewport that's ~4 chips visible at once. Acceptable? Or compress further to 80px?

2. **Action bar 5 chips at phone-sm:** Phase 2 §6.4 — at 380px the 5-chip action bar (IGNITE/CLASH/BLAST/LOCKUP/STAB) needs horizontal scroll OR icon-only mode. Phase 2 design proposed icon-only at phone-sm, icon+letter at 480–599px. OK?

3. **StatusBar phone shape:** Phase 2 §10 noted StatusBar's 11-segment PFD strip doesn't fit on phone. Two paths: (a) collapse to a single-line "MODE · v0.16.0" summary on phone; (b) make it horizontally-scrollable. (a) is simpler; (b) preserves the desktop-density vibe. Pick one.

4. **Pinch-zoom into BladeCanvas:** Phase 2 §6.5 listed this as an open question. Worth supporting on phone for "show me close-up shimmer detail"? Or leave as out-of-scope since the editor is the design surface, not a viewer?

5. **Phase 4 cadence:** PRs in §2 are 30–60 min each. Comfortable doing them one-at-a-time with Ken-pause-between, or batch 2–3 per review session?

---

## 7. What this plan does NOT cover

- **Performance tuning beyond the plan's PR list** — the existing Lighthouse mobile baseline is healthy; if the Phase 4 mobile rebuild regresses, that's investigated separately
- **Marketing site mobile design** — the `/features` `/showcase` `/changelog` `/faq` pages are already mobile-responsive (PR #179); not in scope here
- **Mobile companion route `/m`** — already mobile-first by design; not in scope
- **WebUSB FlashPanel mobile flow** — desktop-only per launch posture
- **Bluetooth mobile flow** — deferred to v0.17 per PR #166 research
- **Tablet refinements** (600–1023px) — already on Sidebar+MainContent; not in scope
- **Desktop layout** — strictly preserved; if any PR regresses desktop, revert that PR

---

## 8. Phase 4 entry criteria

Before any code lands, all of:

- [ ] Ken approves Phase 2 design proposal (`docs/mobile-design.md`)
- [ ] Ken approves this Phase 3 implementation plan (`docs/mobile-implementation-plan.md`)
- [ ] Open questions in §6 above are answered (or explicitly waived)

Once those three are checked, PRs in §2 can begin landing one at a time per Ken's gating discipline.

---

## 9. Closing

11 PRs, ~20 hours of focused work, dependency-tracked, parallel-friendly, logic changes flagged. Each PR is reviewable in 30–60 min and shippable independently. The sequence faithfully implements the Phase 2 design without over-scoping.

Ready for Ken's Phase 3 review. Phase 4 (per-PR implementation) follows on approval.
