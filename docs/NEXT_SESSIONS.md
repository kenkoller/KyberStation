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

## Document update checklist for any session closing this item

1. **Update `docs/UX_OVERHAUL_SUMMARY_2026-04-18.md`** — move the item from "Deferred" into "Fixed" with one line of commit reference
2. **Update `docs/LAUNCH_QA_PLAN.md`** if the item affected a Phase
3. **Append to `docs/TESTING_NOTES.md`** if the fix produced a new testing pattern or methodology note
4. **Close any related GitHub issue** or reference it in the commit
5. **Tag a `v0.14.x` release if you want the item to ship under a version** — otherwise leave for a future batch
