# Next-Session Prompts — Remaining UX Overhaul Items

**Session context:** 2026-04-18 overnight UX overhaul closed 15 of 27 deferred items. 12 items remain, each large enough to warrant its own session. This doc has a ready-to-paste prompt per item so you can spin up dedicated Claude Code sessions.

**Branch baseline:** All new work should start from `test/launch-readiness-2026-04-18` OR from `main` once PR [#31](https://github.com/kenkoller/KyberStation/pull/31) is merged.

**Document references available in every session:**
- `docs/UX_NORTH_STAR.md` — per-panel specs in §4, house style in §5, directional rules in §6, motion primitives in §7
- `docs/UX_OVERHAUL_SUMMARY_2026-04-18.md` — what was fixed overnight + deferred list with rationale
- `docs/LAUNCH_QA_PLAN.md` — 37-phase QA plan
- `docs/TESTING_NOTES.md` — finding log

---

## Item #6 — CollapsibleSection component + threading

**Why it matters:** CLAUDE.md references a `<CollapsibleSection>` shared primitive that doesn't exist today. Many editor panels (StylePanel, EffectPanel, LayerStack, etc.) have their own ad-hoc disclosure/fold-out patterns — inconsistent header styles, inconsistent expand/collapse affordances, inconsistent keyboard behavior.

**Prompt (paste into a new session):**

> Ship a `<CollapsibleSection>` shared component and thread it through ~15 editor panels that currently have ad-hoc disclosure sections. Follow UX North Star `§4` per-panel specs — Figma Inspector conventions for collapsible headers with consistent affordances.
>
> Deliverable:
> 1. New `apps/web/components/shared/CollapsibleSection.tsx` — props: `{ title, defaultOpen?, children, aria-label?, onToggle? }`. Chevron rotation (▾/▸), keyboard support (Enter/Space to toggle, aria-expanded), persistence via optional localStorage key prop.
> 2. Audit `apps/web/components/editor/*.tsx` for ad-hoc disclosures. Migrate each to the shared primitive.
> 3. Preserve current default-expanded vs default-collapsed behavior per section.
> 4. Test: visual snapshot + keyboard a11y walk.
> 5. Verify `pnpm -w typecheck` + `pnpm -w test` clean; no visual regression.
>
> Scope: no redesign of section contents, no new features. Threading only.

---

## Item #7 — Shared `<DragToScrub>` / Slider primitive

**Why it matters:** `ColorPanel.tsx` already has `<ScrubLabel>` (shipped in this session's overhaul). Numeric inputs + sliders across the app should have consistent drag-to-scrub behavior per UX North Star §6 (Blender + TouchDesigner reference). Right now they're inconsistent.

**Prompt:**

> Build a shared Slider/numeric-input primitive with drag-to-scrub behavior, and apply it across the editor. Model the drag mechanics on the existing `<ScrubLabel>` helper in `apps/web/components/editor/ColorPanel.tsx` — pointer-capture, Shift for fine-grained, Alt for coarse.
>
> Deliverable:
> 1. Extract ScrubLabel's drag logic into `apps/web/hooks/useDragToScrub.ts` or `apps/web/components/shared/ScrubField.tsx` (your call on hook vs component).
> 2. API: `{ value, onChange, min, max, step, fineStep?, coarseStep?, unit?, format? }`. Cursor ew-resize while active. Numeric + label sub-parts both scrub-capable.
> 3. Audit callers: any `<input type='range'>` + numeric text inputs in `apps/web/components/editor/*`. Don't migrate ALL at once — pick ~5 high-traffic consumers (e.g., Dynamics sliders, Timeline easing curves, BladeHardwarePanel numeric fields).
> 4. Update ColorPanel's ScrubLabel to delegate to the new primitive.
> 5. Respect prefers-reduced-motion (no drag cursor / animation changes).
>
> Scope: this is a design-system pass. Flag any component whose scrubbing would be non-obvious (e.g. categorical selects don't need drag-to-scrub).

---

## Item #8 — Math-expression evaluator + modulation routing

**Why it matters:** UX North Star §4/§8 explicitly marks these as v1.1 / post-launch. But the primitive hooks for modulation are worth scoping now so later work isn't blocked.

**Prompt:**

> Scope a math-expression evaluator + modulation-routing plumbing for v1.1. Do not implement the UI — focus on the engine-level primitives that a later UI sprint would consume.
>
> Deliverable:
> 1. `docs/MODULATION_ROUTING_V1.1.md` — architecture sketch. How modulators (swing speed, clash intensity, sound level, etc.) route to style parameters. Data shape. Serialization format for round-tripping via Kyber Glyph.
> 2. `packages/engine/src/modulation/` scaffold — empty files with type signatures per the arch doc. No implementation yet.
> 3. Math-expression parser spec — what's the minimum viable grammar? Constant + variable references + basic ops. Target a PEG parser or nearley grammar.
>
> Scope: no UI. No breaking changes to current engine. This is the DESIGN sprint; implementation comes later.

---

## Item #9 — LayerStack live per-row thumbnails

**Why it matters:** Per UX North Star §4 LayerStack spec, each row should render a "live mini-thumbnail" showing that layer's output. Currently layers are just rows of text + controls.

**Prompt:**

> Add live per-row mini-thumbnails to LayerStack, per UX North Star §4. Each layer should render a small (~40×8 px) live strip showing that layer's blade output.
>
> Deliverable:
> 1. Find LayerStack's row-render code. Add a per-row offscreen BladeEngine that renders the layer's standalone output into a hidden canvas.
> 2. Mini-thumbnail = that canvas scaled down + inserted into the row.
> 3. Performance budget: total frame cost must stay under 16ms at default FPS. If rendering 10+ layers exceeds budget, throttle per-row updates (e.g. render each row at 10fps even if the main canvas is at 60).
> 4. Respect the Pause button: paused = thumbnails freeze too.
> 5. `pnpm -w test` clean, no visual regression at other panels.
>
> Scope: keep all existing LayerStack controls (reorder, bypass, mute, solo). Just add the visual column.

---

## Item #10 — LayerStack solo / mute / bypass

**Why it matters:** Per UX North Star §4 — "bypass/solo/mute" are core to the Ableton device-chain metaphor. Current LayerStack has a single-layer visibility toggle but no solo (isolate) or proper mute-while-keeping-CPU-cost behaviors.

**Prompt:**

> Add solo + mute + bypass controls to LayerStack layers. Match Ableton's device-chain semantics per UX North Star §4.
>
> Semantics:
> - **Bypass** — skip this layer entirely when compositing. No engine cost.
> - **Mute** — composite but output is black/transparent. Still pays engine cost (so CPU profile is honest).
> - **Solo** — render ONLY this layer (isolate); all others temporarily muted. Clicking solo on a second layer adds it to the solo group. Clicking solo again on a soloed layer removes from group.
>
> Deliverable:
> 1. Update `packages/engine/src/` layer compositor to support the three states.
> 2. LayerStack UI: three icon buttons per row (B/M/S). Use --status-* tokens with StatusSignal glyph pairing for accessibility.
> 3. Solo group UX: if ANY layer is soloed, show a banner at top: "Solo active — 2 of 5 layers isolated. Clear solo." Click banner → clear all solos.
> 4. Tests: per-state engine output, solo-group toggle, persistence across undo/redo.
>
> Scope: keyboard shortcuts optional (can be follow-up).

---

## Item #11 — TimelinePanel ETC Eos cue-list view

**Why it matters:** UX North Star §4 TimelinePanel spec calls for an ETC Eos cue-list register — tabular score of timed events with row-per-event edit-in-place. Current implementation is a horizontal timeline canvas.

**Prompt:**

> Add an alternate tabular cue-list view to TimelinePanel, matching the ETC Eos lighting-console register per UX North Star §4. Keep the existing horizontal timeline as the DEFAULT; the cue-list is a secondary view the user can toggle into.
>
> Deliverable:
> 1. Add a view-toggle button in TimelinePanel header: "Timeline / Cue List".
> 2. Cue-list view: each row = one timed event. Columns: cue #, time (MM:SS.ms), event type (ignite/clash/blast/etc.), color, duration, notes.
> 3. Inline editing on every cell — type a new time, Enter to commit.
> 4. Sort by time ascending by default; allow click-column to re-sort.
> 5. Keyboard: arrow keys to navigate rows; Enter to edit; Esc to cancel.
> 6. Both views read from the same timeline store — no duplication.
>
> Scope: no new timeline event types. Just a different presentation.

---

## Item #12 — Severance-inverted haptic drag curve for ColorPanel

**Why it matters:** UX North Star §4 says ColorPanel should use "Severance inverted (haptic 'feels right' drag)" — subtle pointer-velocity curves that reward precise adjustments.

**Prompt:**

> Tune the drag curve for ColorPanel's RGB/HSL scrub fields so small movements produce precise changes and larger movements accelerate. Model on Severance UI's tactile-feeling drag.
>
> Deliverable:
> 1. Find the ScrubLabel drag logic (apps/web/components/editor/ColorPanel.tsx).
> 2. Currently: linear delta pixel-to-value mapping. Change to: easing curve where |delta| < 4px → fine-step, 4-16px → normal, >16px → accelerated.
> 3. Use a cubic bezier or similar; make the transitions smooth, not stepped.
> 4. Optional haptic-feedback hint on iOS via `navigator.vibrate()` at step boundaries (short 5ms pulse).
> 5. User can override with Shift/Alt modifiers (already shipped) to force fine or coarse.
>
> Scope: ColorPanel only. Don't touch other sliders. A/B side-by-side compare against current behavior to tune.

---

## Item #14 — Preset lineage graph + VCV author/version surface

**Why it matters:** UX North Star §4 PresetGallery spec calls for "VCV Rack library + Savi's Workshop identity cards + Outer Wilds lineage graph" — author/version/path-cluster surface on every preset tile.

**Prompt:**

> Extend the Preset type to carry author / version / lineage metadata + surface it in the PresetGallery identity cards per UX North Star §4.
>
> Deliverable:
> 1. `packages/presets/src/types.ts` — extend Preset interface with `author?: string`, `version?: string`, `parentId?: string` (lineage), `createdAt?: number`.
> 2. Backfill known presets in `packages/presets/src/characters/` — every on-screen preset gets `author: 'on-screen'` + `parentId` if it's a variant of another.
> 3. PresetGallery tile subtitle — expand from "{character} · {tier}" to include author + version when set.
> 4. Optional: small inline lineage tooltip on hover showing the parent preset tile.
> 5. Glyph-based encoding: lineage needs to survive Kyber Glyph roundtrip — add a version-byte bump to the glyph schema and migration test.
>
> Scope: data + surface, not new UI sections. Full lineage-graph visualization deferred to post-v1.

---

## Item #15 — SmoothSwing → LayerStack plate refactor

**Depends on:** Items #9 + #10. Do those first.

**Why it matters:** SmoothSwing currently lives as a sibling panel to LayerStack. UX North Star §4 wants it refactored as a specialized modulator plate LIVING INSIDE LayerStack (Bitwig plate-in-device-chain pattern).

**Prompt:**

> Refactor SmoothSwingPanel from a sibling panel to a specialized modulator plate that mounts inside LayerStack as a layer type. Depends on Items #9 (LayerStack live thumbnails) and #10 (layer types / solo-mute) being done.
>
> Deliverable:
> 1. Add a new layer type `smoothswing` to the engine's layer type union.
> 2. Add SmoothSwingPanel as the panel rendered for that layer type's expanded state.
> 3. Remove the standalone SmoothSwingPanel sidebar entry.
> 4. Migration for users who had SmoothSwing state stored separately — map to a layer instance on first load.
> 5. Persistence: SmoothSwing state now lives on the layer, so it moves with it when reordered/duplicated.
>
> Scope: one layer type. Don't refactor other panels into plates yet.

---

## Item #16 — Full Figma-style color model

**Why it matters:** UX North Star §4 ColorPanel spec hints at opacity + blend modes. Current implementation only supports solid RGB. Adding opacity + blend modes opens layered-color compositions.

**Prompt:**

> Extend ColorPanel to support opacity + blend modes per the Figma color model hinted at in UX North Star §4.
>
> Deliverable:
> 1. Add `opacity: number` (0-1) to the BladeColor type.
> 2. Add `blendMode: 'normal' | 'multiply' | 'screen' | 'overlay'` (pick a minimal set).
> 3. ColorPanel UI: opacity slider below the color picker; blend-mode select inline.
> 4. Engine compositor: apply blend mode when layers overlap.
> 5. ProffieOS codegen: some blend modes may not have a ProffieOS equivalent — flag unsupported modes with a warning in CodeOutput.
> 6. Kyber Glyph roundtrip: version bump + migration tests.
>
> Scope: architectural. This is bigger than a one-day sprint — plan before building.

---

## Item #17 — Full Scarif motion ceremony for CardWriter

**Why it matters:** I shipped the basic 5-stage CommitCeremonyStrip earlier this session. UX North Star §4 spec wants a fuller motion ceremony — Rogue One Scarif physical-slot register — with ambient amber-warm chrome during the commit phase + multi-stage reveal.

**Prompt:**

> Extend CardWriter's commit ceremony from the 5-stage strip I shipped to the full Scarif-style motion ceremony per UX North Star §4 + §7 `commitCeremony(stage)` primitive.
>
> Deliverable:
> 1. During the "writing" stage, wrap the panel in an amber warm-light halo (radial gradient from `--accent-warm`, 800-1500ms ease-in + hold + ease-out).
> 2. On "verified" stage, a green triumph flash + hold.
> 3. Stage transitions cross-fade the previous stage's glyph/label.
> 4. Add `commitCeremony()` motion primitive to `apps/web/hooks/useCommitCeremony.ts` — reusable for FlashPanel (WebUSB flash) which has similar multi-stage semantics.
> 5. Respect prefers-reduced-motion — snap through stages, no ambient halo.
>
> Scope: motion only. Don't change the existing state-machine logic or the copy. Just the envelope.

---

## Item #19 — Full SWTOR character-sheet layout for SaberProfileManager

**Why it matters:** UX North Star §4 specifies SaberProfileManager should look like an inverted-SWTOR character sheet — hero render at top, categorized attribute groups below — not a flat list.

**Prompt:**

> Redesign SaberProfileManager layout to the inverted-SWTOR character-sheet register per UX North Star §4. Keep current data model; this is a pure layout/composition pass.
>
> Deliverable:
> 1. Hero area at top: saber profile name (big, JetBrains Mono Bold per §6 ceremonial scale) + live mini-blade preview (reuse `<LandingBladeHero>` at small scale).
> 2. Category blocks below: "Blade Specs" / "Button Map" / "Equipped Style" / "Equipped Sound Font" / "SmoothSwing" — each a defined section with Linear-restrained typography.
> 3. Flat chrome per §5 — no ornate trim, no beveled edges, no RPG drop-shadows.
> 4. Edit-in-place where feasible (JetBrains Mono for all data values).
> 5. Responsive at mobile/tablet — probably stack sections; hero adjusts to smaller variant.
>
> Scope: this surface only. No changes to the underlying profile data model.

---

## Document update checklist for any session closing one of these

When a session ships one of these items:

1. **Update `docs/UX_OVERHAUL_SUMMARY_2026-04-18.md`** — move the item from "Deferred" into "Fixed" with one line of commit reference
2. **Update `docs/LAUNCH_QA_PLAN.md`** if the item affected a Phase
3. **Append to `docs/TESTING_NOTES.md`** if the fix produced a new testing pattern or methodology note
4. **Close any related GitHub issue** or reference it in the commit
5. **Update PR #31 description** if PR is still open
6. **Tag a `v0.12.x` release if you want the item to ship under a version** — otherwise leave for a future batch
