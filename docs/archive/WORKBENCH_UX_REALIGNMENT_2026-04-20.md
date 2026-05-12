# Workbench UX Realignment — 2026-04-20

**Status:** plan · Synthesized from a compare of `docs/UX_NORTH_STAR.md`, the Claude Design reference at `docs/design-reference/2026-04-19-claude-design/`, and the currently-shipped desktop workbench.
**Owner:** Ken · **Author:** planning agent (read-only exploration pass)
**Sibling docs:** `docs/DESIGN_REFERENCE_2026-04-19.md` (extends), `docs/UX_OVERHAUL_SUMMARY_2026-04-18.md` (do not re-plan shipped items), `CLAUDE.md` §Current State (project posture).

---

## 1. Executive summary

- The shipped workbench is a **top-hero-then-stack** tab-router layout; the reference is a **three-column single-screen instrument** (LayerStack · BladeCanvas · Inspector, PerformanceBar below, StatusBar at foot). Moving to the reference's exact shape is a v0.13+ structural rewrite — the realignment plan adopts **shape cues, density, tokens, and one new persistent surface (a PerformanceBar analogue)** rather than restructuring the whole app before launch.
- **Highest-impact pre-launch waves:** (W1) token + density foundation, (W2) `⌘K` command palette, (W3) StatusBar rewrite to the PFD grammar, (W4) header trim + page-tab shape. These are all additive-or-surgical and each pays for its own risk.
- **Post-launch structural waves:** (W5) PerformanceBar + shift-light rail, (W6) LayerStack identical-strip polish with modulator plates inline, (W7) four-page consolidation (Design/Audition/Code/Deliver), (W8) Inspector extraction.
- The reference's **Imperial amber accent** is a separate theme proposal — do *not* swap the shipped default blue before launch; ship Imperial as an additive theme so screenshots + crystal renderer stay unchanged.
- Honor the recent commit `d33812e` (blade 280→320, DataTicker clipped, toolbar overflow, BladeCanvas `compact` in panel mode). No wave undoes those.

---

## 2. Gap analysis — current workbench vs. North Star vs. reference

### 2a. What the current workbench already meets (don't re-plan)

| Area | Status | Evidence |
|---|---|---|
| Inter + JetBrains Mono + Orbitron (three-face cap) | Shipped | Self-hosted via `next/font`, Orbitron + Exo 2 via `@import` in `globals.css`; §5/§6/§8 of North Star already ratified this. |
| LayerStack live thumbnails, B/M/S, modulator plate pattern (SmoothSwing) | Shipped (item #9, #10, #15 of UX Overhaul) | `components/editor/LayerStack.tsx` (1086 lines, 92 solo/mute/bypass/thumbnail hits), `<LayerThumbnail>` primitive. |
| `criticalStateChange` motion primitive | Shipped | StorageBudgetPanel + PowerDrawPanel via `<RadialGauge>` with `classifyTier` pulse. |
| `filenameReveal` motion primitive | Shipped | `useFilenameReveal` + `<FilenameReveal>`, applied to CodeOutput hero header + PresetGallery detail. |
| `commitCeremony` motion (amber warm halo, stages) | Shipped | `useCommitCeremony` hook wired into `CardWriter`. |
| Drag-to-scrub on numerics (Blender pattern) | Shipped | `useDragToScrub` + `<ScrubField>`, migrated across EffectPanel/StylePanel/MotionSimPanel/LayerStack/SmoothSwingPanel. |
| Collapsible sections with persistence | Shipped | `<CollapsibleSection>` threaded through 19 sections with `persistKey`. |
| Shipped-design-artifact empty states | Shipped | SaberProfileManager, LayerStack, CodeOutput, CommunityGallery, PresetBrowser, OLEDEditor. |
| Aviation status colors with glyph pairing | Partial (4 of 6) | `--status-ok/warn/error/info` + `<StatusSignal>` with glyph pairs. **Missing: `magenta` (modulation/routing) and `white` (neutral data).** |

### 2b. Where the current workbench falls short of the North Star (new gaps worth fixing)

| Gap | North Star section | Where it shows |
|---|---|---|
| **No `⌘K` command palette.** §6 says "⌘K palette is a v1 primary surface." | §6 Keyboard-first | No `CommandPalette.tsx`, no `commandStore`; `useKeyboardShortcuts.ts` ignores modified keystrokes explicitly (`if (e.metaKey || e.ctrlKey || e.altKey) return;`). |
| **Radius tokens are blanket-Tailwind.** §6 "Deliberate tokens, not blanket 8px. Candidate scale: 2px chrome / 4–6px interactive / 0px data cells." | §6 Radius | `globals.css` has no `--r-chrome / --r-interactive / --r-data`; components use `rounded-lg` (8px) and `rounded-panel` loosely. DesignPanel's "Surprise Me" uses `rounded-lg`. |
| **No row-density tokens.** | §6 Density — "TouchDesigner-grade parameter density" | No `data-density` attribute, no SSL/Ableton/Mutable presets; `--row-h` doesn't exist. Power users have one density. |
| **Only 4 status colors.** §6 "six global status colors fixed across every theme (green / amber / red / cyan / magenta / white)." | §6 Color | `--status-ok / warn / error / info` only. Modulation color doesn't have an assigned token; neutral data color isn't standardized. |
| **No PerformanceBar / shift-light rail.** §4 "Persistent bottom region chrome-differentiated from LayerStack; 8 macros per page with swap-pages affordance; shift-light LED rail above." | §4 PerformanceBar | `ParameterBank` exists (list-shaped quick-access sliders) but no knob strip, no page swap, no LED rail, no bottom-persistent macro chrome. |
| **StatusBar is light on PFD content.** §4 "profile name, connection state, active page, modified flag, storage %, active theme, current preset." | §4 StatusBar | Current `StatusBar.tsx` shows power draw, storage %, LED count. Missing: profile/preset/page/theme/modified/connection. |
| **Header has conversational-app shape.** KyberStation / Universal Saber Style Engine / Sound ON / FX Compare / Docs / Wizard / ? / ⚙ is readable but wide, and competes with the title strip register in the North Star (tight uppercase page tabs). | §4 WorkbenchLayout, §5 house style | `WorkbenchLayout.tsx:319–438`. |
| **5 tabs, not the North Star's 4 pages.** `Design / Dynamics / Audio / Gallery / Output` vs. `Design / Audition / Code / Deliver`. Audition is not a first-class page. | §4 WorkbenchLayout | `WorkbenchLayout.tsx:65–71`. |
| **FX Compare + 21 effect trigger buttons in the header-ish action bar** compete with BladeCanvas for vertical space. | §5 "reach for type and rule before reaching for cards or borders" | `WorkbenchLayout.tsx:532–587` — 22 buttons in a flex row, each with `border-border-subtle` + hover state. |
| **Hero vs. chrome ratio.** §4 "Hero surface occupying 40–55% of workbench, always animating, never iconified." BladeCanvas is now 320px tall of a ~1080px viewport ≈ 30%; after the action bar + tab bar + ticker + status bar the BladeCanvas + viz panels climb higher. Close to target but on the lean side. | §4 BladeCanvas | `WorkbenchLayout.tsx:446` `style={{ height: 320 }}`. |

### 2c. Reference moves aligned with the North Star (adopt)

| Reference surface | North Star alignment | Verdict |
|---|---|---|
| 3-radius token trio (`--r-chrome / --r-interactive / --r-data`) at `2px / 4px / 0px` | §6 exact | Adopt. |
| `data-density` attribute on `<html>` with `ssl / ableton / mutable` presets driving `--row-h` | §6 density row | Adopt. |
| `--status-magenta` (modulation/routing) + `--status-white` (neutral data) added to status color family | §6 color row | Adopt. |
| Uppercase-mono page tabs with `⌘1 ⌘2 ⌘3 ⌘4` inline | §4 WorkbenchLayout | Adopt. |
| `⌘K` palette with Raycast two-level (group → action) + inline `kbd` hints | §6 keyboard-first | Adopt. |
| PFD-shape StatusBar with profile / conn / page / modified / storage / theme / preset / UTC / build | §4 StatusBar | Adopt (field list). |
| Shift-light LED rail at top of PerformanceBar | §4 PerformanceBar | Adopt (post-launch). |
| 8-macro knob strip with page pills | §4 PerformanceBar | Adopt (post-launch). |
| `criticalStateChange` + mod-hover-highlight animation discipline | §7 | Already shipped; reference confirms direction. |

### 2d. Reference moves that are stylistic deviations (note, defer, or reject)

| Reference move | Why it's not a clean North-Star adopt | Decision |
|---|---|---|
| Imperial amber `#c08a3e` as the default accent | Would invalidate shipped landing screenshots + crystal renderer + marketing material; current blue is baked deep. | **Defer.** Ship Imperial as an additive theme (already on the 30-theme plan). |
| File / Edit / View / Layer / Modulator / Audition / Card / Window / Help menu bar | Classical-desktop menu strip is foreign to current web-app direction; `⌘K` covers discoverability more cheaply. | **Reject for v1.** Revisit if Electron shell phase lands. |
| Tweaks panel (density / blade hue / HUD mode host protocol) | This is Claude Design's edit-mode harness, not a product feature. The useful bits (density, HUD mode) already belong inside SettingsModal. | **Reject the panel.** Adopt density + HUD-verbosity toggles into `SettingsModal`. |
| `blade-outer` flex-middle column with `hud-*` modifiers | Conceptually aligned, but we already have `VisualizationToolbar` + `VisualizationStack` + `CanvasLayout` doing equivalent work. | **Map-to-existing; don't duplicate.** |
| Mock INITIAL_LAYERS with invented ProffieOS types | Decorative data, not production shape. | **Reject.** Our real engine + presets > hand-curated mock. |
| Reference's `position: fixed` Tweaks floating panel | Ken already has `SettingsModal`. | **Reject.** |
| Reference's all-`--n-*` 15-step neutral scale | Ours is `--bg-*` / `--text-*` tiered RGB tuples. Both are legitimate; migrating for its own sake is churn. | **Defer to a future token refactor sprint if it comes up.** |

---

## 3. Waves — prioritized, independently shippable

Each wave is independently shippable. Dependencies are called out where they exist. All "pre-launch" waves are low-risk additive changes; all "post-launch" waves are structural and should wait until PR #31 merges and the hardware-validation phase closes.

---

### Wave 1 — Token foundation (`--status-magenta`, `--status-white`, radius trio, density)

**Goal:** land the three token families the North Star specifies but the codebase is missing — in one coherent pass so subsequent waves can reference them.

**Concrete file edits:**
- `/Users/KK/Development/KyberStation/apps/web/app/globals.css` — under `:root` add:
  - `--status-magenta: 180 106 192;` (matches reference `#b46ac0`)
  - `--status-white: 226 230 236;` (matches reference `#e2e6ec`)
  - `--r-chrome: 2px;` `--r-interactive: 4px;` `--r-data: 0px;`
  - `--row-h: 26px;` (default = Ableton) `--row-h-dense: 22px;` `--row-h-airy: 32px;`
  - Density selectors: `[data-density="ssl"] { --row-h: 22px; } [data-density="ableton"] { --row-h: 26px; } [data-density="mutable"] { --row-h: 32px; }`
  - Mirror the magenta/white additions into all 30 themes via `lib/themeDefinitions.ts`. Ensure all themes hold the six status colors fixed (per §6 Color).
- `/Users/KK/Development/KyberStation/apps/web/components/shared/StatusSignal.tsx` — extend `StatusVariant` with `'modulation'` (magenta) and `'data'` (white) glyphs. Suggested: `◆` for modulation, `·` for data.
- `/Users/KK/Development/KyberStation/apps/web/lib/themeDefinitions.ts` — add magenta + white to the shared theme surface; confirm every theme row has both (grep the file; any theme missing them is a North-Star violation).
- `/Users/KK/Development/KyberStation/apps/web/hooks/useAccessibilityApplier.ts` (or wherever `--font-scale` is applied) — add a `density: 'ssl' | 'ableton' | 'mutable'` toggle applied to `document.documentElement.dataset.density`. Persist through `accessibilityStore`.
- `/Users/KK/Development/KyberStation/apps/web/components/layout/SettingsModal.tsx` — add a density radio row matching the existing accessibility section.
- No component markup changes in this wave. Leave `rounded-lg` / `rounded-panel` Tailwind usages untouched — migration to the new radius tokens is a separate sweep and deliberately deferred (see §6 non-goals).

**Risk:** low. Net-additive tokens; density attribute defaults to `ableton` which matches current 26–28px row rhythm. No layout shifts expected; the magenta/white additions are callable by future code, not applied to existing elements.

**Verification:**
- DevTools → `:root` should show the new custom properties.
- In Settings, toggle density to SSL and confirm `<html data-density="ssl">` appears; no visual change is expected yet because no component is reading `var(--row-h)` at this wave.
- All 30 themes in `ThemePickerPanel` still render with the four existing status colors correctly (no regression).
- Run: `pnpm -w typecheck && pnpm -w test` — no regressions; grep `--status-magenta` in `globals.css` to confirm threading.

**Effort:** S (one short session).
**Dependency:** none.
**Launch-readiness:** land pre-launch. Low risk, unlocks W3 + W5.

---

### Wave 2 — `⌘K` Command Palette (Raycast-shape, two-level)

**Goal:** ship the keyboard-first primary surface that §6 calls v1 table-stakes.

**Concrete file edits:**
- **New:** `/Users/KK/Development/KyberStation/apps/web/stores/commandStore.ts` — zustand store of `Command[]` where each command is `{ id, group, title, subtitle?, kbd?, icon?, run() }`. Expose `registerCommand`, `unregisterCommand`, `runCommand`.
- **New:** `/Users/KK/Development/KyberStation/apps/web/components/shared/CommandPalette.tsx` — portal-rendered dialog styled after the reference `workbench.css:923–1050` (640px wide, 60vh max-height, `--n-800` background, hairline border, `⌘K` crumb chip). Uses `useModalDialog` for ESC + focus trap (already shipped). Renders commands grouped by `group` with Raycast rows: `ico · title + subtitle · kbd-hint`. ↑↓ to navigate, ↵ to run, ESC to close. Active-row background highlights via `--bg-surface`.
- **New:** `/Users/KK/Development/KyberStation/apps/web/hooks/useCommandPalette.ts` — registers the global `⌘K` / `Ctrl+K` shortcut. Opens / closes via a zustand slice; owns no other keys when closed.
- **Edit:** `/Users/KK/Development/KyberStation/apps/web/components/layout/WorkbenchLayout.tsx` — mount `<CommandPalette />` at the end of the tree (sibling of `SettingsModal`, `SaberWizard`). Add a small `⌘K` hint button in the header right cluster (next to `⚙`) that opens the palette — satisfies the reference's title-strip `Command · ⌘K` chip without adopting the menu bar.
- **Edit:** `/Users/KK/Development/KyberStation/apps/web/hooks/useKeyboardShortcuts.ts` — the current `if (e.metaKey || e.ctrlKey || e.altKey) return;` guard correctly excludes `⌘K`; the palette hook handles it separately. No change needed unless a conflict surfaces.

**Initial command set (~20 commands, matches reference data.jsx `PALETTE_COMMANDS`):**
- **NAVIGATE:** Go to Design / Dynamics / Audio / Gallery / Output (current tab names; renaming is W7, not W2)
- **LAYER:** Add Layer, Duplicate Selected Layer, Solo Selected Layer, Bypass Selected Layer
- **AUDITION:** Ignite (Space), Trigger Clash (C), Hold Lockup (L), Trigger Blast (B)
- **THEME:** pick any theme (feed from `themeDefinitions.ts`)
- **DELIVER:** Open Card Writer, Open Flash Panel, Copy Config, Copy Share Link
- **GALLERY:** Open preset gallery, Open random preset

Commands register on mount of their owning panel/hook — e.g. `BladeCanvas` registers Ignite; `LayerStack` registers layer commands when mounted. This keeps the palette content-aware without a global command catalog file.

**Risk:** moderate. Scope creep is the biggest risk — resist the urge to make every panel register 20 commands. Start with the list above; grow from there.

**Verification:**
- Press `⌘K` from anywhere in the workbench — palette opens.
- Type "ignite" — space-key command appears at top; ↵ triggers blade ignite (confirm audio + BladeEngine state).
- Type "theme" — all 30 themes listed; select one, `ThemePickerPanel` reflects the change.
- ESC closes; focus returns to the element that opened it (`useModalDialog` already handles this).
- Accessibility: `<dialog>` or `role="dialog"` with `aria-label="Command palette"`; input has `aria-autocomplete="list"`.

**Effort:** M (half-day session — primitive + store + first 20 commands).
**Dependency:** W1 (uses `--r-chrome` for the crumb, `--r-interactive` for the palette shell). Can run in parallel if W1 tokens land first.
**Launch-readiness:** land pre-launch if W1 merges first. The §6 North Star calls this a v1 primary surface — launching without it is the clearest gap.

---

### Wave 3 — StatusBar rewrite (PFD grammar)

**Goal:** bring the bottom chrome strip up to §4 StatusBar spec — eight segments, JetBrains Mono, never moves.

**Concrete file edits:**
- `/Users/KK/Development/KyberStation/apps/web/components/layout/StatusBar.tsx` — replace the three-cluster layout (power/storage/LED) with a horizontal segment strip matching reference `status-bar.jsx`. Segments, left to right:
  1. **Profile** — active saber name (from `saberProfileStore`); shown pre-colon: author if known, else `KYBER`.
  2. **Conn** — WebUSB state (idle / connected / flashing). Reads `useBladeEngine` or the FlashPanel state. Green when connected; amber when idle; red on error. Use `<StatusSignal variant="success|alert|error">`.
  3. **Page** — current `activeTab` label in UPPERCASE amber (matches reference). Drops the tab reorder concern — this is just a mirror.
  4. **Layers** — `{ledCount}` from `bladeStore`.
  5. **Modified** — unsaved-vs-saved glyph pair. Wire to `historyStore` dirty flag (exists). Amber when unsaved.
  6. **Storage** — storage % with magenta→amber→red escalation (keep existing `storageFraction` math). Uses the new `--status-magenta` token when nominal (<60%), amber at 60–85%, red above.
  7. **Theme** — current theme key from `uiStore`. UPPERCASE mono.
  8. **Preset** — active preset index + name from `presetListStore`.
  9. **UTC clock** (right, before build) — ephemeral but chrome-appropriate per reference.
  10. **Build** — `v{LATEST_VERSION}` (currently in the header; move here).
- Keep the power-draw (⚡ X.XA/5A) segment — it's a North Star win our app uniquely has. Place as the **leftmost** segment alongside Profile, or add as a 9th segment before Storage. Recommendation: keep at left, styled as a PFD segment (`k/v` pair rendered in mono).
- `/Users/KK/Development/KyberStation/apps/web/components/layout/WorkbenchLayout.tsx:340–353` — the version + active-saber breadcrumb that currently lives in the header subtitle can be **removed** once StatusBar shows Profile + Build. This is a direct hand-off; no data loss.
- `/Users/KK/Development/KyberStation/apps/web/components/hud/ConsoleIndicator.tsx` — no change; StatusBar continues to use `<ConsoleIndicator>` + `<StatusSignal>` for colorblind-safe pairing.

**Risk:** moderate. Eight segments is more chrome than four; must fit on a 1280px workbench without overflow. Mitigation: keep `overflow-hidden whitespace-nowrap` (already present), and drop the UTC clock at tablet widths via `desktop:inline-flex`.

**Verification:**
- At 1920×1080, all nine segments visible + spacer on right.
- At 1280×800, fit confirmed — UTC clock drops if needed.
- Change theme from Imperial → Jedi: Theme segment updates; all seven visible colors stay consistent (the six global + accent).
- Make an unsaved change: Modified segment goes amber with `●  UNSAVED`. Cmd+S clears it.
- Unplug the board: Conn goes red with "DISCONNECTED".

**Effort:** M (half-day). Most effort is in wiring saberProfileStore + presetListStore + WebUSB state.
**Dependency:** W1 (`--status-magenta`). None else.
**Launch-readiness:** land pre-launch. The current three-cluster StatusBar is a clear §4 gap and the edit is contained to one file.

---

### Wave 4 — Header + Action-Bar trim

**Goal:** bring the top chrome closer to the reference's `title-strip` register — tighter, less conversational, UPPERCASE-mono page tabs — without restructuring the tab model yet.

**Concrete file edits:**
- `/Users/KK/Development/KyberStation/apps/web/components/layout/WorkbenchLayout.tsx`:
  - **Header (lines 319–438):** drop the "Universal Saber Style Engine" subtitle span (line 354) now that W3 puts Profile in the StatusBar. Drop the version breadcrumb (lines 340–353) for the same reason. Tighten padding `py-2` → `py-1.5`, bring height to ~32–36px. Reduce right-cluster button count by moving two verbs into `⌘K`:
    - "FX Compare" toggle → `⌘K` → "Toggle FX Comparison"
    - "Sound ON/OFF" stays (frequent toggle, warrants a chip)
    - "Wizard" stays (primary onboarding CTA)
    - "Docs" stays but hidden behind desktop breakpoint
    - "?" and "⚙" stay
  - Add a small `⌘K` chip (mono, 11px, hairline border, radius `--r-chrome`) right of Docs: `Command ⌘K`. Matches reference line-strip `.cmd-hint`.
  - **Tab bar (lines 592–637):** keep the horizontal drag-to-reorder. Upcase the labels with mono (`font-mono uppercase tracking-[0.08em]`) and add an inline `kbd` beside each label showing `⌘1 ⌘2 ⌘3 ⌘4 ⌘5`. Wire `⌘1–⌘5` to tab-switching in `useKeyboardShortcuts.ts` (explicitly opt into this one modified-key case; the existing guard stays for all other unmodified keys). Keep the 5-tab count — **renaming is W7, not W4.**
  - **Action bar (lines 532–587):** this is the big lift. 21 effect buttons + Ignite is too much chrome. Proposed:
    - Keep Ignite/Retract as a primary chip (accent-bordered) with the `Space` kbd.
    - Keep the **four most-used** effect buttons as explicit chips with their hotkeys: Clash (C), Blast (B), Lockup (L), Stab (S). Reference only ships 4 (Ignite/Clash/Lockup/Blast) — the North Star doesn't require the full 21 exposed as buttons.
    - Move the other 17 effects (lightning, drag, melt, force, shockwave, scatter, fragment, ripple, freeze, overcharge, bifurcate, invert, ghostEcho, splinter, coronary, glitchMatrix, siphon) into `⌘K` under AUDITION, each with its existing single-letter hotkey registered.
    - The action bar height drops significantly; reclaim the vertical space for the BladeCanvas stack.
    - Add `<LIVE>` + zoom readout on the right of the action bar per reference `blade-controls` — this is a small polish, non-blocking.

**Risk:** moderate to high — Ken uses those effect buttons during auditioning; losing visible access is a regression in feel. Mitigation: the single-letter hotkeys (C/B/L/S/D/F/etc.) are already shipped in `useKeyboardShortcuts`; the `⌘K` palette gives a searchable fallback. If it feels wrong in walkthrough, revert the button removal and keep everything else (header trim + upcased mono tabs).

**Verification:**
- Header height visibly tighter; version + subtitle gone (now in StatusBar).
- Tab bar shows `DESIGN  ⌘1`, `DYNAMICS  ⌘2`, etc.; `⌘1` actually switches to Design.
- Ignite + Clash/Blast/Lockup/Stab are the only chrome in the action bar.
- Open `⌘K`, type "shockwave", ↵ — effect triggers.
- No existing test regresses; `useKeyboardShortcuts` single-key handlers still work.

**Effort:** M.
**Dependency:** W2 (palette must exist to absorb the hidden effects). If W2 isn't ready, ship header trim + upcased tabs only; hold action-bar pruning.
**Launch-readiness:** header trim + upcased tabs land pre-launch alongside W2. **Action-bar pruning holds for a separate post-launch PR** — it's a visible change Ken should approve in a walkthrough first.

---

### Wave 5 — PerformanceBar (shift-light rail + macro strip)

**Goal:** ship the §4 PerformanceBar — persistent bottom region, 8-macro page strip, shift-light rail above.

**Concrete file edits (post-launch):**
- **New:** `/Users/KK/Development/KyberStation/apps/web/components/layout/PerformanceBar.tsx` — structural shape matches reference `performance-bar.jsx`:
  - `.shift-rail` — 32-LED horizontal bar, each LED lit based on RMS (take from `BladeEngine` or `audioEngine`). Threshold colors: green under 50%, amber 50–75%, red above. 10px tall. Uses `--status-green/amber/red`.
  - `.perf-body` — three columns: page-pill strip (left), 8-macro grid (center), bus/preset/BPM readouts (right).
  - 8 `<MacroKnob>` cells. Each renders: 54×54 SVG arc knob (`atoms.jsx:Knob`), label (UPPERCASE mono), value %. Drag vertically to adjust. Wire each knob to a real blade param (reuse `ParameterBank` quick-access entries as the initial set: shimmer / noise / swing sensitivity / hue shift / wave / emitter / … fill to 8).
  - Height: 148px (matches reference `grid-template-rows: 28px 1fr 148px 22px`).
- **New:** `/Users/KK/Development/KyberStation/apps/web/stores/performanceStore.ts` — holds current macro page (`'A · IGNITION' | 'B · MOTION' | 'C · COLOR' | 'D · FX'`), per-page 8 macro assignments, current values. Persist to `localStorage`.
- **Edit:** `/Users/KK/Development/KyberStation/apps/web/components/layout/WorkbenchLayout.tsx` — add `<PerformanceBar />` between the multi-column panel area and `<StatusBar />`. Decide if it's always visible or Settings-gated — **recommend: behind a setting initially, default ON.** Gives a kill-switch if it doesn't work out.
- **Optional:** `/Users/KK/Development/KyberStation/apps/web/components/editor/ParameterBank.tsx` — once PerformanceBar ships, ParameterBank's quick-access sliders become redundant. Collapse into an "Advanced parameters" accordion inside DynamicsPanel, or remove. **Don't delete in the same PR** — give Ken a two-step deprecation.

**Risk:** moderate. Structural addition of a 158-px-tall (10+148) persistent bottom surface eats vertical space from the main panel area. Mitigation: make it collapsible; default to open; single click to minimize-to-shift-light-rail-only.

**Verification:**
- PerformanceBar visible at bottom; shift-light responds live to audio/blade state (hit Clash → rail flashes red).
- Drag a macro knob; a real blade param changes; BladeCanvas reflects it.
- Switch pages A → B → C → D; different knob assignments appear.
- Tests: macro store round-trip, knob value clamping, shift-light threshold transitions.

**Effort:** L (one-to-two focused sessions).
**Dependency:** W1, W3 (uses the radius + density + status-color tokens).
**Launch-readiness:** **post-launch.** This is structural chrome; it should not ship before PR #31 merges and Ken has had a walkthrough on the tighter header + palette. First-public-release is not the time to add a new persistent surface.

---

### Wave 6 — LayerStack identical-strip polish + modulator plates inline

**Goal:** close out the §4 LayerStack spec. LayerStack already has live thumbnails + B/M/S per-layer + SmoothSwing-as-plate (shipped); what's missing is the **explicit modulator plate row shape inline with layers** (the reference's `.mod-row` with drag-to-route, identity color, live viz), and SSL-strip identical-row discipline (all rows the same height, same column grid).

**Concrete file edits (post-launch):**
- **Extend:** `/Users/KK/Development/KyberStation/apps/web/components/editor/LayerStack.tsx` — the file is 1086 lines; refactor into smaller files under `components/editor/layerstack/`. Structure:
  - `LayerStack.tsx` (panel shell + layer/mod section headers)
  - `LayerRow.tsx` (one layer row)
  - `ModulatorRow.tsx` (one modulator plate, per reference `.mod-row` — 18px handle + 80px name + flex viz + target label)
  - `ModulatorViz.tsx` (SVG live-viz for LFO / ENV / SIM / STATE kinds — port from reference `atoms.jsx:ModViz`)
- Use the reference's row-grid discipline: `grid-template-columns: 18px 28px 1fr auto` for layers, `grid-template-columns: 18px 80px 1fr auto` for mods. Source-identity color propagates via `--mod-color` CSS var.
- Wire hot-mod hover state: hovering any modulator plate highlights every parameter driven by it (the North Star `modulatorHoverHighlight` primitive, §7). This lands on top of the v1.1 modulation-routing scaffold (`MODULATION_ROUTING_V1.1.md` + `packages/engine/src/modulation/`).
- **Do not** implement drag-to-route in this wave — that's a v1.1 / v1.2 feature tied to the modulation-routing sprint.

**Risk:** moderate. Refactoring a 1086-line file is where regressions live. Mitigation: the existing layer tests cover round-trip + solo/mute/bypass behavior; run them after each extraction.

**Verification:**
- LayerStack panel visually tighter — identical row heights (driven by `--row-h`), consistent 18/28/1fr/auto columns across layers and mods.
- Hover over a modulator plate; its color faintly tints the parameters driven by it in the Inspector (or StylePanel today).
- Mods render live SVG viz (sine / envelope / noise / state) that breathes at the correct frequency.
- All existing LayerStack tests pass; no solo/mute/bypass regressions.

**Effort:** L (multi-day — the refactor is the cost).
**Dependency:** W1 (row-h density), W5 (if PerformanceBar exposes macro-assignment target UX — optional).
**Launch-readiness:** **post-launch.** Big file refactor on a launch-critical panel = regression risk not worth taking before public release.

---

### Wave 7 — Four-page consolidation (Design / Audition / Code / Deliver)

**Goal:** adopt the reference's §4 WorkbenchLayout pages. Current 5 tabs (Design / Dynamics / Audio / Gallery / Output) collapse into 4.

**Concrete file edits (post-launch):**
- `/Users/KK/Development/KyberStation/apps/web/stores/uiStore.ts` — update `ActiveTab` type: `'design' | 'audition' | 'code' | 'deliver'`. Migration: on load, any persisted `'dynamics' | 'audio'` → `'design'`; `'gallery'` → `'audition'`; `'output'` → `'code'` or `'deliver'` based on which panel was last active.
- `/Users/KK/Development/KyberStation/apps/web/components/layout/WorkbenchLayout.tsx:65–71` — update `TABS`:
  - `design` — DesignPanel + DynamicsPanel panels (merged into a single page; per-page editable layout via layoutStore)
  - `audition` — PresetGallery + AudioPanel + PresetDetail + MotionSimPanel + TimelinePanel (ephemeral-state, hear-it-now surfaces)
  - `code` — CodeOutput + CompatibilityPanel + GradientBuilder (developer-facing, ProffieOS surfaces)
  - `deliver` — CardWriter + FlashPanel + StorageBudgetPanel + SaberProfileManager (final stage)
- `/Users/KK/Development/KyberStation/apps/web/stores/layoutStore.ts` — update panel-to-tab mapping. Each page ships an authored default layout (4-column, 3-column, 2-column as appropriate).
- `/Users/KK/Development/KyberStation/apps/web/components/layout/TabColumnContent.tsx` — update panel router to the new tab IDs.
- Command palette (W2) entries renamed from `page_dynamics` etc. to `page_design/audition/code/deliver`.
- StatusBar (W3) Page segment shows the new names.

**Risk:** high. This is the wave Ken must explicitly green-light. Users' persisted workspaces migrate; the migration must be lossless (all panels still reachable in the new structure).

**Verification:**
- Fresh user sees 4 tabs with authored defaults.
- Existing user with layout-store state sees their panels re-distributed into the new 4 pages (no panels missing).
- `⌘1–⌘4` switch pages correctly.
- No persistence churn on reload — opened panel stays open, active tab stays active.

**Effort:** XL (spans multiple files + migration + test churn). Prepare a dedicated session.
**Dependency:** W2 (palette owns the new page IDs), W3 (StatusBar owns Page readout), W5 (if PerformanceBar ships, its page pills are a sibling concept — consider aligning names).
**Launch-readiness:** **post-launch, behind Ken's explicit call.** This is the biggest single structural move and should probably ship as its own v0.13 alongside the PerformanceBar.

---

### Wave 8 — Inspector extraction (right-column panel)

**Goal:** the reference's third column is a dedicated Inspector (per-layer parameters). We currently render `StylePanel` / `EffectPanel` inside the Design tab's multi-column grid. The North Star §4 StylePanel/EffectPanel row calls out "Right-side Inspector pattern" with tabbed parameter pages (PARAMETERS / COLOR / SHAPE / ROUTING).

**Concrete file edits (post-launch — optional):**
- **New:** `/Users/KK/Development/KyberStation/apps/web/components/editor/Inspector.tsx` — right-column panel that reads `selectedLayerId` from `layerStore`; tabs: PARAMETERS / COLOR / SHAPE / ROUTING. Ports reference `style-panel.jsx` shape including the hero section (eyebrow + name + meta with inline modulator glyphs).
- **Extract:** existing `StylePanel` and `EffectPanel` logic into tab-scoped content blocks.
- **Edit:** `layoutStore` — define a workbench-level "right sidebar" slot distinct from the per-tab column grid.

**Risk:** high. StylePanel (344 lines) and EffectPanel (768 lines) are mature — extracting them without regression is delicate.

**Verification:** parity with the current Design tab experience after refactor; no lost controls.

**Effort:** XL.
**Dependency:** W6, W7 (structural moves that this sits on top of).
**Launch-readiness:** **post-launch.** This is a v0.14+ move.

---

## 4. Design tokens

The reference's token shape **fits** our existing `globals.css` structure with three additions:

### 4a. Add to `:root` in `apps/web/app/globals.css`

```css
/* Six global status colors — §6 North Star; cyan already covered by --status-info.
   magenta = modulation / routing identity; white = neutral data. */
--status-magenta: 180 106 192;
--status-white:   226 230 236;

/* Radius discipline — §6 North Star "2px chrome / 4–6px interactive / 0px data cells" */
--r-chrome:      2px;
--r-interactive: 4px;
--r-data:        0px;

/* Row rhythm — §6 "24–28px" default; density presets via data attribute */
--row-h:       26px;
--row-h-dense: 22px;
--row-h-airy:  32px;

/* Motion — explicit names to align with reference + motion primitives doc */
--m-fast: 120ms;
--m-base: 180ms;
--m-slow: 400ms;
--ease: cubic-bezier(0.2, 0.8, 0.2, 1);
```

### 4b. Add density selectors (outside `:root`)

```css
[data-density="ssl"]      { --row-h: 22px; }
[data-density="ableton"]  { --row-h: 26px; }
[data-density="mutable"]  { --row-h: 32px; }
```

### 4c. Status color naming — mapping reference → our house

| Reference | Our house |
|---|---|
| `--status-green` (`#4ea872`) | `--status-ok` (unchanged) |
| `--status-amber` (`#d4a04a`) | `--status-warn` (unchanged) |
| `--status-red` (`#c85a4f`) | `--status-error` (unchanged) |
| `--status-cyan` (`#5aa9c8`) | `--status-info` (unchanged; cyan aviation color) |
| `--status-magenta` (`#b46ac0`) | **new** `--status-magenta` |
| `--status-white` (`#e2e6ec`) | **new** `--status-white` |

Keep our house names (`--status-ok`/`warn`/`error`/`info`) — they're threaded through ~100 files. Don't rename to match the reference. The two new colors fill the aviation set.

### 4d. Deliberate non-adoptions

- **The reference's `--n-*` 15-step neutral scale.** Our `--bg-deep / --bg-primary / --bg-secondary / --bg-surface / --bg-card` + `--text-primary / --text-secondary / --text-muted` system is less granular but already threaded everywhere. Migrating is churn, not clarity.
- **The reference's `--accent: #c08a3e` amber.** Our shipped `--accent: 74 158 255` blue is load-bearing across the crystal renderer + landing page. Imperial amber is a *theme*, not a replacement.

---

## 5. Component-level moves — reference → ours

| Reference component | Adopt / Adapt / Ignore | Maps to | Notes |
|---|---|---|---|
| **BladeCanvas** (`blade-canvas.jsx`) | **Adapt** | `components/editor/CanvasLayout.tsx` + `components/editor/BladeCanvas.tsx` | The reference's HUD corners (TL / TR / BL / BR with STYLE / AUTHOR / LEDS / LEN / DRAW / TEMP / FPS / RMS / PWM) align with our `VisualizationStack` + `DataTicker` + `CornerBrackets` + `FPSCounter` — mostly already shipped. Adopt: the "BR2049 filename reveal" bottom-center static label showing `/styles/<name>.style` in wide-letter-spaced mono at the BladeCanvas foot. Small polish. |
| **LayerStack** (`layer-stack.jsx`) | **Adapt** | `components/editor/LayerStack.tsx` | See W6. Already have B/M/S + live thumbnails + SmoothSwing-plate. Adopt: inline `<ModulatorRow>` shape with live SVG viz per modulator, hot-mod hover highlighting, identical `--row-h`-driven row grid. |
| **Palette** (`palette.jsx`) | **Adopt** | New `components/shared/CommandPalette.tsx` | See W2. |
| **PerformanceBar** (`performance-bar.jsx`) | **Adopt** | New `components/layout/PerformanceBar.tsx` | See W5. |
| **StatusBar** (`status-bar.jsx`) | **Adopt** (field list) | `components/layout/StatusBar.tsx` | See W3. |
| **StylePanel** (`style-panel.jsx`) | **Adapt (long-term)** | `components/editor/StylePanel.tsx` + `EffectPanel.tsx` | The Inspector pattern (hero + tabs PARAMETERS / COLOR / SHAPE / ROUTING) is the target. Our current split-across-panels approach works for now. Adopt: the hero header pattern (eyebrow + name + meta-with-mod-glyphs) for `StylePanel` above the current sections. Small wave, not sized here. |
| **Tweaks** (`tweaks.jsx`) | **Ignore as a panel; adopt as settings rows** | `components/layout/SettingsModal.tsx` | Tweaks is Claude Design's edit-mode host panel, not a product feature. Bring density + HUD verbosity into Settings (W1). |
| **Data** (`data.jsx`) | **Ignore** | — | Mock data; production uses engine + presets library. |
| **Atoms** (`atoms.jsx`) | **Ignore (duplicated) except Knob + ModViz** | `useDragToScrub` (shipped) + new `Knob` / `ModulatorViz` (W5, W6) | `ScrubNum`, `ParamSlider`, `LayerThumb` are already shipped primitives. `Knob` (54×54 arc SVG) and `ModViz` (LFO/ENV/SIM/STATE line viz) need porting — they're the two new atoms W5/W6 pull in. |
| **App** (`app.jsx`) | **Ignore structure; reference only** | `components/layout/WorkbenchLayout.tsx` | The reference's `grid-template-rows: 28px 1fr 148px 22px` is the **target shape** for W5 + W3; don't mirror the file. |

---

## 6. What we deliberately don't change

### 6a. Non-goals for this realignment

- **Don't migrate `rounded-lg` / `rounded-panel` Tailwind usages to the new `--r-*` tokens in bulk.** Tokens exist after W1 so new code can use them; migrating ~200 call-sites is a separate radius-audit sprint.
- **Don't replace the default blue accent with Imperial amber.** Imperial ships as a theme; the crystal renderer + landing page stay blue.
- **Don't rename neutral scale from `--bg-*`/`--text-*` to `--n-*`.** Churn without a win.
- **Don't add File / Edit / View menu bar.** `⌘K` covers discoverability.
- **Don't kill ParameterBank in the same PR that adds PerformanceBar (W5).** Two-step deprecation.
- **Don't restructure the 5-tab model as part of W4.** W7 owns that — explicit, standalone.
- **Don't undo commit d33812e.** Blade section 320px stays (W4 may nudge up if the header trim gives more room, but the 320 floor holds). DataTicker bottom strip stays. BladeCanvas `compact` in panel mode stays. VisualizationToolbar overflow-y-auto stays.
- **Don't touch the SaberWizard, CrystalPanel, or FullscreenPreview.** They're on-ref and shipping.

### 6b. Proposals requiring Ken's explicit call before shipping

- **W4 action-bar pruning (21 effect buttons → 5 chips + palette).** Clear visual change; Ken should see it in a walkthrough before merge.
- **W5 PerformanceBar always-on vs Settings-gated.** Default ON recommended, but a Settings toggle is wise for the first public release.
- **W7 5-tab → 4-tab consolidation.** Structural. Must have a migration plan for persisted layouts, and Ken's sign-off on which current panels live under `Audition`.
- **W8 Inspector extraction.** Big refactor on two mature files; should be its own v0.14 sprint.

---

## 7. Launch-readiness interaction (PR #31 context)

PR #31 on `test/launch-readiness-2026-04-18` is the staging area for everything past v0.10.0. 26/27 UX North Star items shipped. `CLAUDE.md` Current State notes: Ken's walkthrough is pending, hardware validation is outstanding, launch is "as soon as ready, not a specific date", May 4 is an amplification beat, launch is well before.

**Ship on PR #31 (pre-launch, low risk, clearly better):**
- **W1 — tokens + density.** Net-additive, no component markup changes. Unlocks downstream waves. **Recommend: include.**
- **W3 — StatusBar PFD.** One-file edit, clear win, closes a §4 gap. **Recommend: include.**
- **W4 — header trim (partial).** Drop "Universal Saber Style Engine" subtitle + version breadcrumb; upcase the tab labels with `⌘1–⌘5` kbd hints. **Recommend: include.** Hold action-bar pruning (effect buttons → palette) for a post-launch PR where Ken has approved the change in a walkthrough.

**Pre-launch if calendar allows (M effort, higher value, defensible risk):**
- **W2 — `⌘K` command palette.** The §6 North Star calls this a v1 primary surface; launching without it is the clearest public-review gap. If W1 merges cleanly, W2 becomes the next wave. **Recommend: include if at least a half-day session is available before launch.**

**Hold for post-launch:**
- **W4 — action-bar pruning.** Visible regression risk without Ken's walkthrough approval.
- **W5 — PerformanceBar.** Structural bottom surface; not the right time.
- **W6 — LayerStack refactor + modulator plates inline.** Big file refactor on a launch-critical panel.
- **W7 — 4-tab consolidation.** Structural, migration-heavy, Ken must call.
- **W8 — Inspector extraction.** v0.14+ sprint.

The rationale: public launch is a brand + trust moment for a first public programming project. Pre-launch waves should be the kind where every change is either invisible-under-default (W1 tokens), a clean one-file win (W3 StatusBar), or filling a clear gap named in the rubric (W2 palette). The structural waves (W5–W8) are better paired with a changelog entry and a post-launch walk-through.

---

## 8. Verification script for any of these waves

After any wave lands:
```bash
pnpm -w typecheck && pnpm -w test
```
Then walk the app at `http://localhost:3000/editor`:
- Header height + shape matches target (tighter / upcased / kbd hints present).
- `⌘K` opens the palette (if W2 shipped).
- StatusBar shows the full PFD segment strip (if W3 shipped).
- Toggle density in Settings; `<html data-density>` changes; no layout shift observed.
- Imperial theme still absent from the default (it's an addon, not a replacement).
- BladeCanvas still 320px, ticker still clipped to 12px bottom strip, BladeCanvas still visible in panel mode.
- All 547 web tests + ~2,636 workspace tests green.

Grep checks:
```bash
# Token additions landed:
git grep -- "--status-magenta" apps/web/app/globals.css
git grep -- "--r-chrome" apps/web/app/globals.css
git grep -- "data-density" apps/web

# Command palette wired in:
git grep -l "CommandPalette" apps/web/components

# Status bar rewrite hit all segments:
git grep "Modified\|Conn\|Preset\|Theme\|Build" apps/web/components/layout/StatusBar.tsx
```

---

_End of plan._
