# Launch A11y Audit — 2026-04-19

Pre-launch accessibility audit for KyberStation web app. Focused on 5 scopes: aria-label coverage, keyboard paths, color contrast, semantic/hydration issues, reduced-motion.

## Executive Summary

**Counts by severity**
- P0 (launch blocker): **3**
- P1 (should fix before launch): **11**
- P2 (post-launch): **7**

**Top 3 findings**
1. **P0** — `--text-muted` token (#4a4e58 on dark bg) computes to ~1.6:1 contrast. Used in 654 occurrences across 69 files, including body-copy paragraphs (e.g. MotionSimPanel auto-swing descriptions). WCAG AA fails across the app.
2. **P0** — `<HelpTooltip>` (a `<button>`) nested inside `<CollapsibleSection>`'s outer `<button>` via `headerAccessory` prop. Reproduces in ~16 places across EffectPanel / StylePanel / LayerStack / GradientBuilder. HTML spec violation + React hydration warning.
3. **P0** — "+ List" affordance in preset cards is a `<span role="button">` nested inside the `<button>` that wraps the entire card (PresetGallery + PresetBrowser). Nested interactive + `tabIndex={-1}` makes it keyboard-unreachable.

**General posture**: The app is well-instrumented for a11y in most places — modal focus traps via `useModalDialog`, focus-visible ring globally, reduced-motion class on `<html>`, colorblind token overrides, scalable font-scale. The issues below are specific gaps, not a systemic absence.

---

## 1. Aria-label Coverage

### P1 — EffectPanel clear-position buttons lack accessible name
- **Files**: `apps/web/components/editor/EffectPanel.tsx:309-315`, `:343-349`
- Icon-only `×` buttons next to Lockup position / Blast position scrubs have only a `title` attribute — no `aria-label`. Screen readers will announce them as "button" with no action context.
- **Fix**: add `aria-label="Clear lockup position"` (and similar for blast).
- **Why**: `title` is inconsistently surfaced by screen readers; unambiguous accessible name is required.

### P2 — Clear-position buttons use non-breaking close glyph without alt text
- Same locations as above. `×` character reads as "multiplication sign" in some SRs.
- **Fix**: keep visible `×` but set aria-label; already covered by P1 fix.

### P1 — Preset-card "+ List" span-button lacks real-button semantics AND is tab-unreachable
- **Files**: `apps/web/components/editor/PresetGallery.tsx:247-264`, `apps/web/components/editor/PresetBrowser.tsx:163-180`
- `<span role="button" tabIndex={-1}>` with `onClick` — keyboard users cannot reach it. Also creates nested-interactive (see §4).
- **Fix**: extract to a sibling `<button>` positioned after the preset card `<button>`, or move the "+ List" action into a detail panel.
- **Why**: one of the two primary actions on the card is keyboard-inaccessible.

### P1 — GradientMixer saved-gradient row is role="button" without keyboard handler
- **File**: `apps/web/components/editor/GradientMixer.tsx:142-149`
- `<div role="button" aria-label="Load gradient">` — no `tabIndex`, no `onKeyDown`. Mouse-only.
- **Fix**: add `tabIndex={0}` + `onKeyDown` handling Enter/Space, or convert to a real `<button>`.

### P2 — ColorPanel "Gradient End" / "Edge Color" toggle buttons (active variant) rely on title for channel name
- **File**: `apps/web/components/editor/ColorPanel.tsx:292-310`, `:311-329`
- Buttons have visible text ("Gradient End", "Edge Color") — actually adequate. No fix needed.

### Passing — Other high-risk editor panels
- StylePanel, LayerStack, MotionSimPanel, CardWriter, FlashPanel: icon buttons for move/duplicate/remove/visibility all have aria-label. Landing page CTAs all have aria-label. Selects in CanvasToolbar / ParameterBank / StorageBudgetPanel / PresetGallery / FlashPanel / CardWriter are all wrapped in `<label>` or given explicit aria-label.

---

## 2. Keyboard-Path Review

### P1 — LayerStack main row is click-to-select via `<div onClick>` with no keyboard handler
- **File**: `apps/web/components/editor/LayerStack.tsx:751-754`
- The outer row `<div className="flex ... cursor-pointer" onClick={() => selectLayer(...)}>` has no `tabIndex`, `role`, or `onKeyDown`. All the internal buttons work by keyboard but the row-itself-selects affordance is mouse-only.
- **Fix**: either wrap the label/thumbnail region in a `<button>` that calls `selectLayer`, or add `role="button" tabIndex={0}` + Enter/Space handler to the div.
- **Why**: keyboard-only users cannot select a layer without finding a child button to tab into.

### P1 — TimelinePanel ruler-click-to-seek is mouse-only
- **File**: `apps/web/components/editor/TimelinePanel.tsx:464-467`
- Ruler `<div onClick={handleRulerClick}>` — no keyboard alternative for seeking. The event rows themselves ARE keyboard-nav-able (line 1193+), but the ruler is not.
- **Fix**: add arrow-key-seek on a focusable ruler element, or document that seek is mouse-only since event nav via J/K-style keys covers it.

### P2 — TimelinePanel template-drop row is mouse-only
- **File**: `apps/web/components/editor/TimelinePanel.tsx:887-891`
- `<div cursor-pointer onClick>` to add template.
- **Fix**: convert to `<button>` (semantically it is a button).

### P2 — TimelinePanel inline-edit inputs lose focus ring
- **Files**: `apps/web/components/editor/TimelinePanel.tsx:1229`, `:1282`, `:1319`
- `outline-none` applied without `focus:border-accent` replacement. The global `*:focus-visible` rule still applies because `outline-none` sets a transparent outline (not `outline: none`), but the visual feedback is a 2px transparent outline — essentially invisible contrast-wise.
- **Fix**: add `focus-visible:ring-1 focus-visible:ring-accent` or switch to `focus:border-accent-border`.

### P2 — BladeCanvas WYSIWYG click-to-place spatial effects is mouse-only
- **File**: `apps/web/components/editor/BladeCanvas.tsx:2519-2530`
- `<canvas onPointerDown>` — primary placement path. Keyboard alternative exists via the ScrubField inputs in EffectPanel (lockupPosition, blastPosition).
- **Fix**: document in help text; no code change needed since numeric input is the documented keyboard fallback.

### P1 — BladeCanvas3D runs uncapped regardless of reduced-motion
- **File**: `apps/web/components/editor/BladeCanvas3D.tsx` (uses R3F `useFrame`, not `useAnimationFrame`)
- R3F's `useFrame` runs every frame. No throttle for reduced-motion users.
- **Fix**: call `useFrame((_, delta) => { ... })` only when `!reducedMotion`, or set `frameloop="demand"` on `<Canvas>` for reduced-motion. Crystal renderer already does this; blade renderer does not.
- **Why**: WCAG 2.3.3 "Animation from Interactions" and § 2.2.2 pause/stop/hide.

### Passing
- Modal focus traps (8 surfaces wire `useModalDialog`: AccessibilityPanel, PresetGallery Save, PresetBrowser Save, SaberProfileManager Copy, SettingsModal, KeyboardShortcutsModal, OnboardingFlow, SaberWizard). FullscreenPreview handles Esc separately.
- Global focus-visible ring defined in `apps/web/app/globals.css:157-161`.
- PresetListPanel rows use `role="option" tabIndex={0}` + Alt+Arrow reordering.

---

## 3. Color Contrast

All calculations use WCAG 2.x relative-luminance formula against `--bg-primary` (rgb 10 10 16, L≈0.0032).

### P0 — `--text-muted` (#4a4e58) is below AA for body text
- **File**: `apps/web/app/globals.css:23` — `--text-muted: 74 78 88`
- Computed contrast vs `--bg-primary`: ≈ **1.6 : 1**. WCAG AA body-text requires 4.5 : 1.
- Usage scale: 654 occurrences across 69 files.
- Concrete body-copy examples (not decorative):
  - `apps/web/components/editor/MotionSimPanel.tsx:89,113` — "Oscillates swing speed for demo preview" / "Triggers random combat effects automatically"
  - `apps/web/components/editor/MotionSimPanel.tsx:152-176` — ProffieOS Mapping descriptions
  - Form labels such as `EffectPanel.tsx:509,522,535,548` ("Ignition Up", "Ignition Down", etc.)
  - `FlashPanel.tsx:448-449` — "Compile ProffieOS yourself, then upload the output .bin here."
  - Lineage & release-strip text on LandingFooter / LandingReleaseStrip.
- **Fix**: raise `--text-muted` to approximately `110 115 130` (#6e7382) — yields ≈ 4.7:1; keeps the muted/secondary hierarchy but clears AA. Alternatively split into `--text-muted-decorative` (current value, strictly ornamental) and `--text-muted-body` (raised value) so existing visual hierarchy is preserved.
- **Why**: this is the single biggest a11y issue in the app; affects every editor panel.

### P1 — `--border-subtle` (`rgba(255,255,255,0.04)`) fails 3:1 UI-component contrast
- **File**: `apps/web/app/globals.css:27`
- Computed contrast vs `--bg-primary`: ≈ **1.75 : 1**. WCAG 1.4.11 requires 3:1 for UI component boundaries.
- **Fix**: raise to `rgba(255,255,255,0.15)` to clear 3:1. Or accept as a non-interactive visual separator and ensure all interactive-state borders use `--accent-border` or `--border-light-raised`.
- **Why**: many panel boundaries, input borders, and card edges use this token. The "subtle" look is intentional but crosses the minimum legibility line.

### P1 — `--border-light` (`rgba(255,255,255,0.08)`) borderline fails 3:1 UI contrast
- **File**: `apps/web/app/globals.css:28`
- Computed contrast: ≈ **2.5 : 1**. Still fails 3:1.
- **Fix**: raise to `rgba(255,255,255,0.18)` for interactive-state borders. Non-interactive decoration can stay.

### P2 — Faction-era tokens on dark bg — mostly pass, but verify light tints
- `--era-prequel: 147 197 253` (light blue) → ~8:1 against bg-primary. ✓
- `--era-ot: 254 215 170` (peach) → ~10:1. ✓
- `--era-sequel: 252 165 165` (pink) → ~7:1. ✓
- `--era-animated: 134 239 172` (mint) → ~10:1. ✓
- `--era-eu: 196 181 253` (lavender) → ~9:1. ✓
- `--badge-creative: 251 146 60` (amber) → ~6:1. ✓
- `--faction-jedi-deep: 0 68 204` — used as gradient bottom. When paired in gradient with a lighter stop, on-dark contrast of the bottom stop is ~1.8:1. Only affects the `sw-jedi-text` faction-gradient heading.
  - **Fix**: verify `sw-jedi-text` is decorative; if used for body text, raise the deep stop.

### Passing
- `--text-primary` (#d0d4dc) → ~13.3 : 1 on bg-primary. AAA ✓
- `--text-secondary` (#8a8f9a) → ~6.3 : 1. AA ✓
- `--accent` (#4a9eff) → ~9 : 1. AAA ✓
- Status tokens (`--status-ok`, `--status-warn`, `--status-error`, `--status-info`) all ≥ 6:1.
- High-contrast mode (`.high-contrast` class) raises everything to near-white.

---

## 4. Hydration / Semantic-HTML Issues

### P0 — Nested-button violation: `<CollapsibleSection>` + `<HelpTooltip>` headerAccessory
- **Primitive**: `apps/web/components/shared/CollapsibleSection.tsx:194-220`
- `CollapsibleSection` renders `<button>` as the disclosure header. `headerAccessory` children render INSIDE that button, wrapped in `<span onClick={stopPropagation}>`. The stopPropagation only blocks the click event; it does not change DOM nesting. React DOM still renders `<button><span><button /></span></button>`.
- `HelpTooltip` (`apps/web/components/shared/HelpTooltip.tsx:179`) is a `<button>`.
- **Affected usages** (all pass `<HelpTooltip />` as `headerAccessory`):
  - `apps/web/components/editor/EffectPanel.tsx:77, 202, 253, 284, 370, 442, 481, 571, 648, 712` (10 sections)
  - `apps/web/components/editor/StylePanel.tsx:208, 249, 279` (3 sections; 4th uses no tooltip)
  - `apps/web/components/editor/LayerStack.tsx:1057` (1 section)
  - `apps/web/components/editor/GradientBuilder.tsx:191` — `headerAccessory` is a `<div role="radiogroup">` containing buttons. Same nesting violation.
- **Browser behavior**: Chromium + Firefox emit `validateDOMNesting(...): <button> cannot appear as a descendant of <button>` as a React dev warning, and interactive-content-inside-button is an HTML spec violation (interactive content model).
- **Fix options**:
  1. Refactor `CollapsibleSection` to use a non-`<button>` outer element (e.g. `<h3>` + `<div role="button" tabIndex={0}>` with keyboard handler) so interactive descendants are legal. Loses native keyboard Enter/Space behavior; must re-add.
  2. Move `headerAccessory` OUT of the `<button>` — render as a sibling flex child so the DOM is `<div><button>…</button><span>{accessory}</span></div>`. Keeps the disclosure button semantic.
  3. Move HelpTooltip below the section header, as the first element of the section body. Simpler UX, no structural change.
- **Recommended**: option 2 — sibling flex layout. Minimal refactor, keeps button semantics, preserves visual layout.
- **Why**: HTML spec violation, hydration warning in dev, screen readers can behave unpredictably when a button nests another button.

### P0 — Nested-button violation: preset cards wrap `<span role="button">` inside `<button>`
- **Files**:
  - `apps/web/components/editor/PresetGallery.tsx:133` (card `<button>`) + `:247-264` (inner "+ List" span-button)
  - `apps/web/components/editor/PresetBrowser.tsx:87` (card `<button>`) + `:163-180` (inner "+ List" span-button)
- Same violation class as above — `role="button"` descendant inside `<button>` ancestor is nested interactive content.
- **Fix**: move "+ List" outside the card button as a sibling action. E.g. render the card and the action in a flex-row wrapper: `<div class="flex"><button>card…</button><button>+ List</button></div>`.
- **Why**: same as above; also the span-button has `tabIndex={-1}` so it's currently keyboard-unreachable.

### P1 — FlashPanel radio-label contains a nested `<button>` file-picker trigger
- **File**: `apps/web/components/editor/FlashPanel.tsx:436-472`
- `<label>` wraps both a radio `<input>` and a nested `<button>` ("Choose .bin file…"). Clicking the button bubbles the click to the label, which toggles the radio. Technically `<label>` is allowed to contain interactive descendants, but HTML spec §4.10.4 strongly discourages it because the label-click semantics can double-fire.
- **Fix**: restructure so the button is a sibling of the `<label>`, positioned below/next to the label's description text.
- **Why**: selecting the custom variant and opening the file picker are two discrete actions that currently share a click target.

### P2 — EraBadge / FactionBadge styling uses `<div>` where `<span>` would be more semantic in inline contexts
- Minor; flagged only for consistency with inline badge usage in headers. No a11y impact.

---

## 5. Reduced-Motion Compliance

### P1 — `RGBGraphPanel` canvas animation ignores reduced-motion
- **File**: `apps/web/components/editor/RGBGraphPanel.tsx:48`
- `useAnimationFrame(() => { ... })` — no `maxFps` option. Runs uncapped whether reduced-motion is active or not.
- **Fix**: add `{ maxFps: reducedMotion ? 2 : undefined }` per the BladeCanvas / VisualizationStack pattern (`BladeCanvas.tsx:2284`).
- **Why**: a live rolling RGB channel graph is exactly the kind of motion WCAG 2.3.3 targets.

### P1 — `PixelStripPanel` canvas animation ignores reduced-motion
- **File**: `apps/web/components/editor/PixelStripPanel.tsx:50`
- Same pattern as RGBGraphPanel.
- **Fix**: same — add `maxFps: reducedMotion ? 2 : undefined`.

### P1 — `BladeCanvas3D.tsx` Three.js render loop ignores reduced-motion
- **File**: `apps/web/components/editor/BladeCanvas3D.tsx` — uses R3F `useFrame`, always on.
- **Fix**: call `useFrame` conditionally on `!reducedMotion`, OR set `<Canvas frameloop={reducedMotion ? 'demand' : 'always'}>`. Crystal renderer's `CrystalRevealScene.tsx` already uses a similar pattern.
- **Why**: a rotating 3D hilt at 60fps is a significant motion source.

### P2 — `useAnimationFrame` hook doesn't auto-consume reduced-motion
- **File**: `apps/web/hooks/useAnimationFrame.ts`
- The hook requires every caller to pass `maxFps` manually. Two out of five current callers forget (see above).
- **Fix**: optionally read `useAccessibilityStore` inside the hook and default `maxFps: 2` when `reducedMotion` is true. Explicit `maxFps` prop overrides.

### Passing
- `.reduced-motion *` blanket rule in `apps/web/app/globals.css:121-127` neutralizes CSS keyframe animations globally.
- 13+ ambient animations (scan-sweep, corner-brackets, particle-drift, holo-flicker, etc.) have per-selector reduced-motion + `prefers-reduced-motion` overrides at lines 471-551.
- Skeleton shimmer, filename-reveal, commit-ceremony, panel-wipe, modal-holo-enter, sidebar-slide, toast-comm-enter all honor reduced-motion.
- `useAccessibilityApplier.ts` syncs OS `prefers-reduced-motion` into the `.reduced-motion` class.
- Crystal renderer (`lib/crystal/animations.ts`, `lib/crystal/renderer.ts`) explicitly checks `prefersReducedMotion`.

---

## Additional Observations (out of scope but noted)

- `apps/web/app/globals.css:187-189` applies a global 300ms `transition` to `background-color, color, border-color, fill, stroke` on every element. Reduced-motion class zeroes this via `transition-duration: 0.01ms !important` — but the base rule is heavy and mildly uncommon. No a11y finding, just unusual.
- Focus ring (`*:focus-visible`) is 2px solid accent (blue). On blue-tinted surfaces (active state) the contrast of the ring vs surface may drop. Consider a dual-color ring (white + accent).
- Aurebesh mode (`html.aurebesh-full`) replaces the entire body font. Even with `html.aurebesh-full input, textarea, code, pre` exclusions, confirm that all navigation aria-labels remain English — they do (React text props aren't replaced, only the visual font-face).

---

## Quick-fix Summary Checklist

Grouped by effort, most bang-for-buck first:

1. Raise `--text-muted` token value (one-line CSS change, app-wide improvement). **P0**
2. Refactor `CollapsibleSection` to move `headerAccessory` outside the `<button>`. **P0**
3. Restructure preset-card "+ List" as sibling button (PresetGallery + PresetBrowser). **P0**
4. Add `aria-label` to 2 EffectPanel `×` clear buttons. **P1**
5. Add keyboard handlers to GradientMixer saved-gradient rows + TimelinePanel ruler. **P1**
6. Thread `maxFps: reducedMotion ? 2 : undefined` through RGBGraphPanel + PixelStripPanel + BladeCanvas3D. **P1**
7. Raise `--border-subtle` and `--border-light` tokens. **P1**
8. Make LayerStack row keyboard-selectable (role + tabindex + onKeyDown, or refactor to `<button>`). **P1**
9. Restructure FlashPanel custom-firmware radio-label so the file-picker button is a sibling. **P1**

## Test-plan Additions Post-fix

- Lighthouse a11y audit on `/` and `/editor` — target score ≥ 95.
- axe DevTools run on editor with all panels visible — zero critical issues.
- Manual VoiceOver walk of landing → wizard → editor → export (covered by P29 in `LAUNCH_QA_PLAN.md`, still pending).
- Keyboard-only nav: can a Tab-user reach every action, including "+ List" on a preset card, every layer in the layer stack, every clear-position × button?
- Reduced-motion toggle in OS: confirm RGBGraphPanel, PixelStripPanel, and 3D blade all throttle or freeze.
