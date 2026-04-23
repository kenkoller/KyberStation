# Modulation Routing — v1.1 Implementation Plan

**Status:** Active sprint. Planning locked 2026-04-22.
**Companion docs:**
- Design spec: [`MODULATION_ROUTING_V1.1.md`](MODULATION_ROUTING_V1.1.md)
- Post-v1.1 ladder: [`MODULATION_ROUTING_ROADMAP.md`](MODULATION_ROUTING_ROADMAP.md)
- User docs skeleton: [`MODULATION_USER_GUIDE_OUTLINE.md`](MODULATION_USER_GUIDE_OUTLINE.md)
- Glyph v2 session prompt: [`NEXT_GLYPH_V2_SESSION.md`](NEXT_GLYPH_V2_SESSION.md)

**Primary engineer:** Ken Koller, assisted by Claude parallel agents.

---

## 1. Sprint timeline

| Date | Deliverable | Status |
|---|---|---|
| **Wed 2026-04-22 evening** | Plan lock, background agents start on engine / emitter / profiles (all zero-conflict new files); Ken completes UI overhaul walkthrough in separate session | Active |
| **Thu 2026-04-23 AM** | Merge overhaul + agent work onto `feat/modulation-routing` branch; begin UI integration | Queued |
| **Thu 2026-04-23 PM** | Click-to-route wiring, Flash dialog, board picker | Queued |
| **Thu 2026-04-23 evening** | Hardware validation on 89sabers V3.9 | Queued |
| **Fri 2026-04-24** | v1.0 ships with "Routing Preview" (BETA label) | Target |
| **~2026-05-16** (+3 wk) | v1.1 Routing Core — full feature set per design doc | Planned |
| **~2026-06-13** (+7 wk) | v1.2 Routing Creative — chains / macros / conditionals / UDFs | Planned |
| **~2026-07-18** (+12 wk) | v1.3 Routing Advanced — envelope followers / step seqs / community UDFs | Planned |

---

## 2. Decisions locked (from 2026-04-22 planning)

| # | Decision | Reference |
|---|---|---|
| 1 | Export semantics: **Option B+** — map where possible, snapshot fallback for unmappable, per-binding user agency | convo §Q2 deep dive |
| 2 | **Board Capability System** gates all features by board, not just modulation | convo §board-gated |
| 3 | Modulator plates = extended `BladeLayer` / `layerStore.LayerType` | convo §plate architecture |
| 4 | **Close layer→engine gap as wave 0** — prerequisite, not follow-up | convo §apply order |
| 5 | Parser = **peggy** (~25KB gzipped, MIT); add to `package.json` | design doc §4.2 |
| 6 | Audio DSP = **meyda** (v1.3 envelope followers — deferred post-Friday) | convo §deps |
| 7 | UDFs = blade-level (v1.1) + community PR library (v1.3), no hosting | convo §Q6 |
| 8 | Modulator chains = frame-delay feedback (Vital pattern), cycle warning not error | convo §Q7 |
| 9 | Gallery = variant chip on card + global "Show Alive variants" toggle | convo §Q8 |
| 10 | Binding cap = soft warnings at 50 / 100, no hard cap | convo §Q9 |
| 11 | Board picker required at blade creation; StatusBar quick-switcher for edits | convo §board-first |
| 12 | Default board = Proffieboard V3.9 (hardware-validated) | convo §board-first |
| 13 | Non-Proffie boards (CFX / Xenopixel / Verso) = `PREVIEW ONLY`, modulation hidden entirely | convo §board-first |
| 14 | Friday v1.0 = click-to-route, 5 modulators, ProffieOS V3.9 / GHv3 only, BETA label, 5 demo recipes | convo §Friday scope |
| 15 | Ken does UI overhaul walkthrough Wed evening (frees Thursday for UI integration) | convo §coord |
| 16 | Glyph v2 = separate parallel session; modulation session ships without sharing if it's not ready | convo §coord |
| 17 | Kyber Forge ultra-wide roadmap sunset — ResizeHandles already cover ultra-wide | convo §Q3 |
| 18 | Multi-Blade Workbench stays on roadmap as v1.4 (post-modulation) | convo §Q3 |

---

## 3. Friday v1.0 scope — "Routing Preview" BETA

### 3.1 What ships

**Infrastructure (new files, zero conflict with UX):**

| File | Owner | Description |
|---|---|---|
| `packages/engine/src/modulation/registry.ts` | Agent A | 11 built-in modulator descriptors |
| `packages/engine/src/modulation/sampler.ts` | Agent A | Per-frame value extraction + smoothing + clash latching |
| `packages/engine/src/modulation/applyBindings.ts` | Agent A | Binding composition + clamping + NaN sanitization |
| `packages/codegen/src/proffieOSEmitter/mapBindings.ts` | Agent B | Binding → ProffieOS template (Option B+) |
| `apps/web/lib/parameterGroups.ts` | Agent C | Numeric field registry: range / default / unit |
| `apps/web/lib/boardProfiles.ts` | Agent C | Board capability registry (6 boards) |
| `apps/web/lib/propFileProfiles.ts` | Agent C | Prop file event vocabularies |

**UI integration (Thursday, after UX overhaul commits):**

| Surface | Change |
|---|---|
| Blade creation wizard | Board picker step (required) |
| StatusBar | `BOARD · PROFFIE V3.9 · FULL` badge + quick-switcher |
| Inspector ROUTING tab | Fills placeholder: binding list, add form, amount/combinator/bypass |
| LayerStack | 5 new modulator plates: `swing`, `sound`, `angle`, `time`, `clash` |
| Any numeric scrub field | Click-to-route drop target (armed plate → click param) |
| FlashPanel | B+ mapping preview with per-binding status table |
| Gallery | 5 pre-wired demo recipes imported as starter presets |

**Content:**
- 5 demo recipes: **Reactive Shimmer · Breathing Jedi · Sound-Reactive Music · Angle-Reactive Tip · Clash-Flash White**
- One-page "Your First Wire in 30 Seconds" quick-start
- In-app coach mark on first binding creation (dismissible, once)

### 3.2 Labeled as "coming soon" in Friday's ROUTING tab

- Math formula expressions (peggy parser) → v1.1
- 6 additional modulators (twist, battery, lockup, preon, ignition, retraction) → v1.1
- True drag-to-route → v1.1
- Modulation round-trip through Kyber Glyph → v1.1 (unless glyph v2 lands Friday)
- V2.2 modulation flash → v1.1 (conservative V2 profile shipped Friday, modulation blocked on V2)
- Button routing sub-tab → v1.1

### 3.3 Deferred (not visible Friday)

Per [`MODULATION_ROUTING_ROADMAP.md`](MODULATION_ROUTING_ROADMAP.md).

---

## 4. Background agents (Wed evening)

### Agent A — Engine subsystem

**Scope:** `packages/engine/src/modulation/*` + co-located tests.
**Zero-conflict:** no existing files touched outside this directory.

**Deliverables:**
1. `registry.ts` — 11 `ModulatorDescriptor`s with display name, `colorVar`, range, unit, smoothing
2. `sampler.ts` — `sampleModulators(ctx, prev): ReadonlyMap<ModulatorId, number>` with one-pole smoothing, clash latching per §3.1 of design doc
3. `applyBindings.ts` — pure function applying all bindings in authoring order; clamps to parameter range per §6.3
4. Updated `index.ts` barrel
5. Vitest suite covering happy paths, edge cases (NaN / ∞ / negative amounts / missing IDs), all 5 combinators

**Constraints:**
- Do NOT modify `types.ts` — contract locked
- Do NOT commit
- Report status at end

### Agent B — ProffieOS emitter

**Scope:** `packages/codegen/src/proffieOSEmitter/mapBindings.ts` + tests. New directory.
**Zero-conflict:** no existing files touched.

**Deliverables:**
1. `mapBindings(bindings, config) → { mappable, unmappable, astPatches }` implementing Option B+
2. Mapping table: each modulator → ProffieOS template (`SwingSpeed<>` / `SoundLevel<>` / `Sin<>` / etc.)
3. Each `unmappable` binding carries `reason: string` + `snapshotValue: number`
4. Vitest suite with fixture bindings covering V3.9 template vocab + failure modes

**Reference:** Design doc §8, [`PROFFIE_REFERENCE.md`](PROFFIE_REFERENCE.md), existing `packages/codegen/src/CodeEmitter.ts` for style.

### Agent C — Board Capability System

**Scope:** 3 new files in `apps/web/lib/` + tests.
**Zero-conflict:** no existing files touched.

**Deliverables:**
1. `parameterGroups.ts` — every modulatable numeric `BladeConfig` field enumerated with range / default / unit / modulation-eligibility
2. `boardProfiles.ts` — 6 boards: Proffieboard V3.9 (full), V2.2 (conservative, modulation disabled for v1.0), Golden Harvest V3 (mirror V3.9), CFX / Xenopixel / Verso (preview-only)
3. `propFileProfiles.ts` — Fett263 (primary), SA22C, BC Button Controls, Default Fett; button/gesture event vocabularies
4. Helper exports: `canBoardModulate(id)`, `isParameterModulatable(path)`, `getBoardProfile(id)`
5. Vitest suite

**Constraints:**
- Be CONSERVATIVE with V2.2 declarations — modulation disabled on V2 for v1.0, revisit v1.1
- Do NOT edit existing files
- Do NOT commit

---

## 5. Thursday — UI integration

**High-conflict files now available** (after Ken's UX commits land):

| File | Change |
|---|---|
| `apps/web/stores/bladeStore.ts` | Add `modulation?: ModulationPayload` to `DEFAULT_CONFIG` shape + setter |
| `apps/web/stores/uiStore.ts` | Add `armedModulatorId`, `hoveredBindingId` state + setters |
| `apps/web/stores/layerStore.ts` | Extend `LayerType` union: add `'modulator-lfo'`, `'modulator-gesture'`, etc. |
| `apps/web/components/editor/Inspector.tsx` | Fill `InspectorRoutingTab` placeholder |
| `apps/web/components/editor/layerstack/LayerStack.tsx` | Render new modulator plate variants |
| `apps/web/components/editor/layerstack/ModulatorRow.tsx` | Extend for non-smoothswing modulators |
| `apps/web/components/editor/layerstack/ModulatorViz.tsx` | Add visualizations for swing / sound / angle / time / clash |

**New files (Thursday work):**
- `apps/web/components/editor/routing/BindingList.tsx` — list container
- `apps/web/components/editor/routing/BindingRow.tsx` — individual binding UI
- `apps/web/components/editor/routing/AddBindingForm.tsx` — dropdown-based add form
- `apps/web/components/editor/routing/ModulationMappingReport.tsx` — flash dialog subcomponent
- `apps/web/components/shared/BoardPicker.tsx` — modal + inline variants
- `apps/web/hooks/useBoardProfile.ts` — reactive hook returning current profile
- `apps/web/hooks/useClickToRoute.ts` — arm / select / bind state machine

---

## 6. Thursday evening — Hardware validation

**Test plan on 89sabers Proffieboard V3.9** (Ken's hardware, previously validated 2026-04-20):

1. Create blade: baseColor = Qui-Gon green, binding `swing → shimmer amount 60%`
2. Export → compile via local Arduino or CI firmware-build workflow
3. Flash to V3.9, confirm swing-reactive shimmer behavior matches web preview
4. Add second binding: `clash → lerp(baseColor, white, clash)` → `Trigger<EFFECT_CLASH, TrInstant, ...>` composition
5. Confirm clash-flash behavior matches preview
6. If any step fails: modulation ships Friday with red `FLASH · BETA — unverified on your configuration` label; fix lands in v1.0.1 mid-next-week.

---

## 7. Risks + mitigations

| Risk | Prob | Mitigation |
|---|---|---|
| UI overhaul walkthrough surfaces blockers | M | Ken runs walkthrough Wed evening, modulation waits to integrate until clean merge |
| Hardware validation fails Thursday evening | M | BETA label ship; v1.0.1 fix mid-next-week |
| Board profile data inaccurate for V3.9 modulation | M | Conservative declarations; easy to loosen post-feedback |
| Parser deferral disappoints early users | L | BETA label + visible roadmap chip sets expectations |
| Agent coordination conflicts | L | File-level ownership (engine / emitter / profiles — fully disjoint) |
| Glyph v2 session doesn't finish Friday | M | Modulation ships without sharing; v1.0.1 adds round-trip |
| `parameterGroups` misses fields or mis-declares ranges | M | Agent C conservative; first user feedback patches shape |

---

## 8. Cut list if Thursday afternoon runs hot

Order, first cut first:
1. **User guide** — ship the one-line coach-mark tooltip instead of the quick-start page
2. **4 of 5 demo recipes** — ship 1 hardcoded "Reactive Shimmer" recipe only
3. **Click-to-route** — ship form-only binding creation (select source + target from dropdowns)
4. **ProffieOS emitter polish** — ship basic `Scale<>` mappings only, defer complex compositions

**Do not cut:** Board Capability System · engine subsystem · ROUTING tab visibility · BETA labeling.

---

## 9. Alternative — "Option X" fallback

If Wed evening or Thursday morning surface blockers, fall back to:

**v1.0 (Friday):** ships Board Capability System + UI overhaul, NO modulation.
**v1.0.1 (Wed 2026-04-29):** Routing Preview ships as patch release, same scope as originally planned for Friday.

Call this at Thursday noon latest.

---

## 10. v1.1 full scope (launch +3 weeks)

Adds on top of Friday v1.0 Preview:
- Peggy parser + math expression editor (Cmd-click any scrub field)
- Remaining 6 modulators active (twist, battery, lockup, preon, ignition, retraction)
- True drag-to-route
- Hover wire highlighting (replaces `uiStore.hoveredModulatorId` 1:1 with real per-binding highlight)
- Kyber Glyph v2 modulation round-trip (depends on glyph v2 session)
- V2.2 profile validation + V2 modulation flash
- Button routing sub-tab with prop-file event vocabulary
- Aux/gesture events as first-class modulators
- Full 10-recipe starter gallery
- Complete user guide

---

## 11. Decision record — already-answered

Do not re-litigate without new information:

- Parser = peggy ✓
- Audio DSP = meyda (v1.3) ✓
- UDFs = blade-level v1.1, community PR v1.3 ✓
- Modulator chains = frame-delay feedback ✓
- Gallery = variant chip + global toggle ✓
- Binding cap = soft warnings only ✓
- Friday scope = click-to-route / 5 modulators / BETA ✓
- Fallback = Option X (BCS Friday, modulation v1.0.1) ✓
- Modulation plate architecture = extend BladeLayer ✓
- Export semantics = Option B+ ✓
- Board gating = all features, not just modulation ✓

---

_End of sprint plan. Updates go inline with `2026-04-XX: <change>` stamps._
