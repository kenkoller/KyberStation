# Next-Session Prompts — Remaining UX Overhaul Items

**Last updated:** 2026-04-22 · **Status:** 26 of 27 UX North Star items shipped. Only **#16 Figma color model** remains.

**Baseline:** All new work starts from `main`. PR [#31](https://github.com/kenkoller/KyberStation/pull/31) merged as commit `1b5da69` (`feat: v0.13.0 — launch readiness`) on 2026-04-21.

**Document references available in every session:**
- `docs/UX_NORTH_STAR.md` — per-panel specs in §4, house style in §5, directional rules in §6, motion primitives in §7
- `docs/UX_OVERHAUL_SUMMARY_2026-04-18.md` — what was fixed overnight + deferred list with rationale
- `docs/LAUNCH_QA_PLAN.md` — 37-phase QA plan
- `docs/TESTING_NOTES.md` — finding log
- `docs/WORKBENCH_UX_REALIGNMENT_2026-04-20.md` — 8-wave realignment plan (W5/W7/W8 still post-launch)

---

## Shipped items (historical prompts in git history at paths below)

| # | Item | Status | Evidence |
|---|---|---|---|
| #6 | CollapsibleSection shared component + threading | ✅ shipped | Threaded through 19 sections with `persistKey` (CLAUDE.md §Current State) |
| #7 | Shared `<DragToScrub>` / Slider primitive | ✅ shipped 2026-04-18 | `lib/severanceDragCurve.ts` + `hooks/useDragToScrub.ts` + `components/shared/ScrubField.tsx`; migrated 5 panels |
| #8 | Math-expression evaluator + modulation routing (scoping) | ✅ scoped | `docs/MODULATION_ROUTING_V1.1.md` + `packages/engine/src/modulation/` scaffold. Implementation is v1.1 work. |
| #9 | LayerStack live per-row thumbnails | ✅ shipped | `<LayerThumbnail>` primitive in LayerStack rows |
| #10 | LayerStack solo / mute / bypass | ✅ shipped | B/M/S controls + Ableton semantics in `components/editor/layerstack/` |
| #11 | TimelinePanel ETC Eos cue-list view | ✅ shipped | Cue-list view in `components/editor/TimelinePanel.tsx` |
| #12 | Severance-inverted haptic drag curve for ColorPanel | ✅ shipped | `lib/severanceDragCurve.ts` |
| #14 | Preset lineage graph + VCV author/version surface | ✅ shipped | `packages/presets/src/types.ts` — `author?` / `version?` / `parentId?` fields added |
| #15 | SmoothSwing → LayerStack plate refactor | ✅ shipped | SmoothSwing-as-plate pattern landed (CLAUDE.md §Current State) |
| #17 | Full Scarif motion ceremony for CardWriter | ✅ shipped | `hooks/useCommitCeremony.ts` wired into `CardWriter` |
| #19 | Full SWTOR character-sheet layout for SaberProfileManager | ✅ shipped | `SaberProfileManager.tsx` — character-sheet hero + category blocks (lines 205, 252, 356, 417) |

To see the original prompts for any shipped item, check the pre-2026-04-22 revisions of this file in git history:
```bash
git log --all --diff-filter=A -- docs/NEXT_SESSIONS.md
git show <commit>:docs/NEXT_SESSIONS.md
```

---

## Item #16 — Full Figma-style color model *(only item remaining)*

**Why it matters:** UX North Star §4 ColorPanel spec hints at opacity + blend modes. Current implementation only supports solid RGB. Adding opacity + blend modes opens layered-color compositions.

**Prompt (paste into a new session):**

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

## Item #20 — Hilt composer + saber-profile integration

**Why it matters:** The 2026-04-22 content-expansion session grew the modular hilt library to 47 parts / 16 assemblies, but none of it is surfaced in a user-facing picker yet. Users still can't build their own hilt from pieces, and the hilt choice isn't scoped to a saber profile — today it's a locally-held UI state in `BladeCanvas.tsx`. Ken's product intent (per the 2026-04-22 planning chat): users should pick from existing character hilts OR compose their own, and the choice should be a per-`SaberProfile` option so each saved profile carries its own hilt.

**Gating:** Parts A + B + C of the prompt below touch files the `feat/marketing-site-expansion` worktree is also editing (`BladeCanvas.tsx`, `SaberProfileManager.tsx`). Wait until `feat/marketing-site-expansion` lands on main, OR do A only (conflict-safe) as a standalone dockable panel and defer B + C to a follow-up post-mkt-merge.

**Prompt (paste into a new session):**

> Build a hilt composer feature so users can (1) pick a shipped assembly from the v0.13.1 expanded catalog, OR (2) compose their own hilt by swapping individual parts per slot, AND (3) have the choice persist per-`SaberProfile` so switching profiles restores each profile's chosen hilt.
>
> **Start by reading:**
> - [`apps/web/lib/hilts/types.ts`](apps/web/lib/hilts/types.ts) — `HiltPart` / `HiltAssembly` / `AssemblyPart` shapes, connector-diameter rules
> - [`apps/web/lib/hilts/catalog.ts`](apps/web/lib/hilts/catalog.ts) — 47 parts registered
> - [`apps/web/lib/hilts/assemblies.ts`](apps/web/lib/hilts/assemblies.ts) — 16 canonical assemblies
> - [`apps/web/lib/hilts/composer.ts`](apps/web/lib/hilts/composer.ts) — `resolveAssembly(..., 'strict' | 'permissive')`
> - [`apps/web/components/hilt/HiltRenderer.tsx`](apps/web/components/hilt/HiltRenderer.tsx) — SVG renderer (accepts `assemblyId` or `assembly` prop)
> - [`apps/web/stores/saberProfileStore.ts`](apps/web/stores/saberProfileStore.ts) — `SaberProfile` shape + CRUD actions
> - [`apps/web/components/editor/BladeCanvas.tsx`](apps/web/components/editor/BladeCanvas.tsx) §`SVG_HILT_STYLE_TO_ASSEMBLY` / `HILT_STYLES` (line ~125–155) — current hilt-style dispatch
>
> **Deliverable — 3 parts, shippable together or in order A → B → C:**
>
> **A — Schema + composer panel (conflict-safe, ship first if mkt is still in flight):**
> 1. Add `hiltAssembly: string | null` field to `SaberProfile` in [`saberProfileStore.ts`](apps/web/stores/saberProfileStore.ts). Default `null` = "use preset-derived hilt" (today's behavior); non-null = an assembly id (either a shipped one from `ASSEMBLY_CATALOG`, or a user-composed assembly that the user serialized via some mechanism — start with ids-only, defer user-composed-assembly serialization to a follow-up if scope creeps).
> 2. Create [`apps/web/components/editor/HiltComposer.tsx`](apps/web/components/editor/HiltComposer.tsx) — a self-contained panel:
>    - **Mode toggle**: "Preset" (pick from `allAssemblies()`) vs "Custom" (5 dropdowns, one per slot: emitter / switch / grip / pommel / accent-ring).
>    - Preset mode uses the new `<MiniGalleryPicker>` primitive (shipped in OV9) with thumbnail renders via `<HiltRenderer>` at small scale.
>    - Custom mode renders 5 `<select>`s populated by `getPartsByType('emitter')` etc., plus a live `<HiltRenderer>` preview that updates on every change. Validate with `resolveAssembly(..., 'strict')`; fall back to `'permissive'` and show a warning chip if diameters don't mate.
>    - Writes to active profile via `updateProfile(activeProfileId, { hiltAssembly: <id> })`.
> 3. Register the panel id (e.g. `'hilt-composer'`) in [`apps/web/components/layout/TabColumnContent.tsx`](apps/web/components/layout/TabColumnContent.tsx) so it's dockable via the workbench column grid. Add it to whichever tab's column preset feels natural — Design tab, right column, makes the most sense given the Inspector pattern.
>
> **B — Wire into the blade preview:**
> 4. In [`BladeCanvas.tsx`](apps/web/components/editor/BladeCanvas.tsx), after the existing `hiltStyle` dispatch, check `useSaberProfileStore.getActive()?.hiltAssembly`. If non-null, use it as the override for `SVG_HILT_STYLE_TO_ASSEMBLY`'s output — i.e. `<HiltRenderer assemblyId={profileHilt ?? SVG_HILT_STYLE_TO_ASSEMBLY[hiltStyle]}>`. Keep the legacy primitive-canvas path as a fallback when neither resolves. Same for [`MiniSaber.tsx`](apps/web/components/shared/MiniSaber.tsx) if the gallery marquee should also reflect the profile's hilt.
>
> **C — Nest inside Profile Manager:**
> 5. In [`SaberProfileManager.tsx`](apps/web/components/editor/SaberProfileManager.tsx)'s profile-edit modal, add a "Hilt" section (or tab, matching whatever edit pattern ships post-mkt). Render a compact `<HiltComposer>` inline (pass a `compact` prop if needed for modal dimensions). Save-on-change writes directly to the profile.
>
> **Tests:**
> - `saberProfileStore.test.ts` — assert the schema migration handles legacy profiles without `hiltAssembly` (returns `null`), `updateProfile` accepts the new field.
> - `hiltComposer.test.tsx` (new) — mode toggle, preset pick flow, custom composition flow, diameter-mismatch warning path.
> - Update any profile-import test fixtures to round-trip the new field.
>
> **Verify** `pnpm -w typecheck` + `pnpm -w test` clean. Browser-verify end-to-end: pick a shipped assembly → see it render in the blade canvas; switch to custom mode → swap emitters → render updates live; switch profile → hilt switches with it; create a new profile → defaults to null (no override).
>
> **Pre-launch posture:** zero real users — the schema addition doesn't need a migration fallback beyond `?? null`. Ship the simplest change that works.

---

## Document update checklist for any session closing one of these

When a session ships one of these items:

1. **Update `docs/UX_OVERHAUL_SUMMARY_2026-04-18.md`** — move the item from "Deferred" into "Fixed" with one line of commit reference
2. **Update `docs/LAUNCH_QA_PLAN.md`** if the item affected a Phase
3. **Append to `docs/TESTING_NOTES.md`** if the fix produced a new testing pattern or methodology note
4. **Close any related GitHub issue** or reference it in the commit
5. **Tag a `v0.14.x` release if you want the item to ship under a version** — otherwise leave for a future batch
