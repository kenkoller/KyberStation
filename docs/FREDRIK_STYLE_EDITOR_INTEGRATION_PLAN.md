# Fredrik Style Editor Integration Plan

Comprehensive plan for adopting features from Fredrik Hubinette's ProffieOS
Style Editor into KyberStation. Based on hands-on analysis of the live editor,
source review, and gap assessment against KyberStation's existing capabilities.

**Date:** 2026-05-08
**Branch:** `feat/variant-cycling` (in-progress work already started)
**Prior art:** `packages/template-eval/` (Phase 1+2 merged, PRs #295 + #296)

---

## Licensing Assessment

ProffieOS source code is GPL-3.0 (copyright Fredrik Hubinette). Fredrik's
Style Editor JS is derived from ProffieOS source. KyberStation's approach is
**clean-room implementation** — original TypeScript classes matching documented
behavioral specs from the ProffieOS source comments, function signatures, and
output behavior. We do not translate, port, or copy GPL code. This is the same
legal model used by `packages/codegen` for AST emission of ProffieOS templates.

The behavioral contract (e.g., "AudioFlicker produces per-LED color by mixing
color A and B based on a smoothed random noise value scaled by sound level")
is a functional specification, not copyrightable expression. Our implementations
are original TypeScript with our own class hierarchy, naming conventions, and
test suites.

---

## Current State

### What already exists

| Component | State | Location |
|---|---|---|
| Template parser | Shipped (PR #295) | `packages/template-eval/src/parser.ts` |
| Template evaluator | Shipped (PR #295) | `packages/template-eval/src/evaluate.ts` |
| Template registry | Shipped, 143 names | `packages/template-eval/src/registry.ts` |
| EffectManager | Shipped (PR #295) | `packages/template-eval/src/EffectSystem.ts` |
| TemplateEvalBridge | Shipped (PR #296) | `packages/engine/src/templateEval/TemplateEvalBridge.ts` |
| BladeEngine render mode | Shipped (PR #296) | `packages/engine/src/BladeEngine.ts` |
| Variant cycling | ✅ Committed on `feat/variant-cycling` | 12 files, +318/−8 lines |
| `getChildren()` tree walk | ✅ All 40+ template classes | All 6 template files + BaseStyle.ts |
| `walkForColorChange()` | ✅ Shipped | `TemplateEvalBridge.ts` |
| `ChangeEffect` (no-op) | ✅ Shipped | `packages/engine/src/effects/index.ts` |
| 155 template-eval tests | Passing | `packages/template-eval/tests/` |
| 7,540 total workspace tests | Passing | All 7 packages |

### Variant cycling — completed (committed on `feat/variant-cycling`)

- `getChildren()` on BaseStyleTemplate (default `[]`) + all 40+ template classes
  across colors.ts, styles.ts, effects.ts, transitions.ts, functions.ts, wrappers.ts
- Inline anonymous `StyleTemplate` fallback objects updated with `getChildren()` (6 sites)
- `ColorChangeTemplate` enhanced with `EFFECT_CHANGE` handling, `variantCount`,
  `currentVariant`, `setVariant` accessors
- `TemplateEvalBridge` extended with `variantCount`, `currentVariant`,
  `setVariant`, `findColorChange` (via recursive `walkForColorChange()` DFS)
- `'change'` added to engine `EffectType` union + `ChangeEffect` no-op in registry
- `EFFECT_CHANGE` mapped in `TemplateEvalBridge` effect mapping table

### Known template registry gaps (7 templates)

Found in real Fett263 import fixtures but not yet registered:

| Template | Category | Used in |
|---|---|---|
| `PulsingL` | Style (alias) | Battery charging styles |
| `PulsingF` | Function | Time-varying alpha |
| `VolumeLevel` | Function | Volume display effects |
| `EffectPulseF` | Function | Cal Kestis multi-phase |
| `ModF` | Function | Multi-phase color logic |
| `BendTimePowX` | Function | Revan ignition/retraction |
| `TrCenterWipeInSpark` | Transition | Corran Horn fast-on |

---

## Phase 1: Complete Variant Cycling — ✅ DONE

**Status:** Phases 1A + 1B committed on `feat/variant-cycling` (2026-05-08).
Phase 1C (UI) + 1D (tests) + 1E (PR) still open.

### ~~1A. Implement `walkForColorChange()`~~ ✅

Shipped in commit `255ad4d`. Recursive DFS in `TemplateEvalBridge.ts`.

### ~~1B. Add `getChildren()` to remaining template files~~ ✅

All 40+ template classes across all 6 files now have `getChildren()`.
Includes nullable-child patterns (conditional push) for templates like
`SinTemplate`, `CenterDistFTemplate`. Six inline anonymous `StyleTemplate`
fallback objects also updated.

### 1C. Wire variant UI into the action bar

Add a variant control to the action bar (visible only when the active template
contains ColorChange/ColorSelect):

```
[ < 0/N > ]  Variant
```

- Left/right arrows cycle `bridge.setVariant()`
- Display shows `currentVariant / variantCount`
- Color swatch previews the active variant's base color
- Hidden when `bridge.variantCount === 0`

### 1D. Tests

- `walkForColorChange` unit tests: finds nested CC, returns null for no CC,
  handles deeply nested trees
- Variant cycling integration: evaluate template string with ColorChange,
  verify `variantCount`, verify `setVariant` changes output colors
- Bridge round-trip: `setTemplate` → `variantCount` → `setVariant` → `renderFrame` → verify LED buffer

### 1E. Commit + PR

Land on `feat/variant-cycling`, open PR targeting `main`.

---

## Phase 2: Close Template Registry Gaps (M effort, ~4 hours)

**Goal:** Register the 7 missing templates so 100% of Fett263 corpus fixtures
evaluate pixel-accurately.

### 2A. Function templates (4 new classes)

Add to `packages/template-eval/src/templates/functions.ts`:

| Template | Behavior |
|---|---|
| `PulsingF` | `sin(time * speed) * 0.5 + 0.5` scaled to 0-32768 range. Args: speed |
| `VolumeLevel` | Returns current volume setting from BladeState. Simple passthrough |
| `EffectPulseF` | Returns a pulse (0→32768→0) triggered by a specified effect type, decaying over time |
| `ModF` | `a % b` modulo operation on two integer sub-functions |

### 2B. Transition template (1 new class)

Add to `packages/template-eval/src/templates/transitions.ts`:

| Template | Behavior |
|---|---|
| `TrCenterWipeInSpark` | Center-in wipe with spark particles at the leading edge. Combines `TrCenterWipeIn` geometry with randomized bright pixels ahead of the wipe front |

### 2C. Function template (1 new class)

| Template | Behavior |
|---|---|
| `BendTimePowX` | Time-bending easing curve (power function). Companion to existing `BendTimePowInvX`. `t^(N/32768)` curve shape |

### 2D. Registry alias (1 entry)

| Alias | Target |
|---|---|
| `PulsingL` | `PulsingTemplate` (already exists, just needs alias registration like `BlinkingL` → `BlinkingTemplate`) |

### 2E. Tests

- One test per new template class: verify `run()` + `getInteger()` or `getColor()` output
- Corpus regression: re-run all Fett263 fixture imports, verify zero "unregistered template" warnings
- Registry count assertion: update `registry.test.ts` expected count

---

## Phase 3: Mouse-Driven Swing Simulation (M effort, ~1 session)

**Goal:** Moving the mouse over the blade canvas feeds SwingSpeed/BladeAngle,
giving instant feedback for motion-reactive styles.

### 3A. Mouse velocity tracker

New `apps/web/hooks/useMouseSwing.ts`:

```typescript
interface MouseSwingState {
  swingSpeed: number;   // 0-1, fed into MotionSimulator
  bladeAngle: number;   // -1 to 1, fed into MotionSimulator
  isActive: boolean;    // true while mouse is over canvas
}
```

Track `mousemove` events on the blade canvas. Compute velocity from
`(dx^2 + dy^2) / dt`. Normalize to 0-1 range with a configurable
sensitivity curve (exponential ramp, saturates at ~800px/s). Smooth
with a one-pole lowpass filter (same approach as `SmoothSoundLevel`
in the template-eval package). Compute blade angle from mouse Y
position relative to canvas center.

### 3B. Feed into MotionSimulator

When `isActive`, override `MotionSimulator.swingSpeed` and
`MotionSimulator.bladeAngle` with the mouse-derived values. When
mouse leaves canvas, decay back to the MotionSimPanel slider values
over ~300ms (smooth handoff, no jarring snap).

### 3C. Settings toggle

Add to Settings modal, Behavior tab:

```
[ ] Enable mouse swing simulation (desktop only)
```

Default: ON for desktop, hidden on mobile/tablet (already have DeviceMotion).
Persist in `accessibilityStore` or `uiStore`.

### 3D. Visual feedback

Optional: slight 2D rotation of the blade canvas (max ~3 degrees) following
mouse position to reinforce the "swinging" metaphor. Purely cosmetic; gated
behind the same setting.

### 3E. Tests

- Velocity calculation unit tests: stationary=0, fast=saturates, smooth decay
- Integration: mock `mousemove` events on canvas, verify `MotionSimulator.swingSpeed` updates
- Settings toggle: verify mouse events are no-ops when disabled

---

## Phase 4: Slow-Motion Mode (S effort, ~2 hours)

**Goal:** 0.25x / 0.5x / 1x / 2x time scale for inspecting fast transitions.

### 4A. Time scale in engine

Add `timeScale: number` to `BladeEngine` (or `TemplateEvalBridge`). Multiply
`deltaMs` by `timeScale` before passing to `template.run()`. Default: 1.0.

### 4B. UI control

Add to the blade canvas toolbar (next to the existing Pause button):

```
[ 0.25x | 0.5x | 1x | 2x ]
```

Or a dropdown if toolbar space is tight. Keyboard shortcut: `[` slower, `]` faster.

### 4C. Interaction with pause

- Pause = `timeScale` temporarily set to 0 (animation frozen)
- Slow-motion = `timeScale` < 1 (animation runs, time passes slower)
- Both can coexist: paused overrides slow-motion

### 4D. Tests

- Engine: verify `deltaMs` scaling at 0.25, 0.5, 1.0, 2.0
- UI: keyboard shortcut cycles through presets

---

## Phase 5: Structured AST Editor Panel (L effort, ~2-3 sessions)

**Goal:** A "Template View" panel showing the ProffieOS template tree with
inline editing, matching Fredrik's right-panel experience.

### 5A. AST-to-tree renderer

New `apps/web/components/editor/TemplateTreePanel.tsx`. Takes a parsed
`TemplateNode` tree (from `packages/template-eval/src/parser.ts`) and renders:

```
Layers
  ├─ AudioFlicker
  │    ├─ Rgb<0, 135, 255>          [color picker]
  │    └─ Rgb<255, 255, 255>        [color picker]
  ├─ AlphaL
  │    ├─ Mix
  │    │    ├─ Scale                 [edit: 16384]
  │    │    │    └─ SwingSpeed
  │    │    │         └─ 400         [edit: 400]
  │    │    ├─ Rgb<0, 0, 200>       [color picker]
  │    │    └─ Rgb<200, 0, 0>       [color picker]
  │    └─ SmoothStep<...>
  └─ TransitionEffectL
       ├─ TrConcat
       │    ├─ TrFade<100>          [edit: 100]
       ...
```

Each node renders:
- Template name (bold)
- Inline-editable integer values (click to edit, Enter to apply)
- Color swatch + picker for `Rgb<r,g,b>` nodes
- Collapse/expand toggle for deep trees

### 5B. Parameter annotations

Build a metadata registry mapping template names to per-argument descriptions:

```typescript
const PARAM_DOCS: Record<string, string[]> = {
  'TrFade': ['Fade time in milliseconds'],
  'TrWipe': ['Wipe time in milliseconds'],
  'Scale': ['Function to scale', 'Minimum output', 'Maximum output'],
  'SwingSpeed': ['What swing speed returns 32768'],
  'Bump': ['Center position', 'Bump width'],
  // ...
};
```

Display as gray annotations next to each argument.

### 5C. Layer controls

For `Layers<>` children, show:
- `[+]` Add layer (opens template insertion dropdown)
- `[X]` Remove layer
- `[^]` Move up
- `[v]` Move down

Operations modify the AST and re-emit the template string. If the template
is from `importedRawCode`, track the AST edits and re-serialize.

### 5D. Bidirectional sync

Two-way binding between the template text (Output tab) and the tree view:
- Edit a value in the tree → template string updates → engine re-evaluates
- Edit the template text → tree re-parses → tree updates

Debounce re-parse on text edits (300ms). Show parse-error inline if the
edited text is invalid.

### 5E. Panel placement

Mount as a new section in the Sidebar: **TEMPLATE** (between ROUTING and
OUTPUT). Visible only when:
- The active config has `importedRawCode`, OR
- The user has enabled "Template View" in Settings, OR
- The engine is in template-eval render mode

### 5F. Tests

- Tree renderer: snapshot tests for known AST shapes
- Inline editing: edit value → verify template string changes
- Layer controls: add/remove/reorder → verify AST mutation
- Bidirectional sync: text edit → tree update, tree edit → text update
- Parse error: invalid edit shows error, valid edit clears it

---

## Phase 6: Style Transformation Tools (M effort, ~1-2 sessions)

**Goal:** Four AST-to-AST transformations matching Fredrik's toolbar.

### 6A. Expand

Expand shorthand templates into their full form. Primary cases:

| Shorthand | Expansion |
|---|---|
| `StyleNormalPtr<C, CLASH, ignMs, retMs>` | `InOutTrL<Layers<C, ...>, TrWipe<ignMs>, TrWipeIn<retMs>>` |
| `StylePtr<C, ...>` | `InOutTrL<Layers<C, ...>, ...>` |

The codegen package already knows these expansions (they're the reverse of
what `ConfigBuilder` does). Expose as `expandTemplate(node: TemplateNode): TemplateNode`.

### 6B. Layerize

Wrap any non-`Layers` root in `Layers<current>`:

```
AudioFlicker<Red, Blue>
  → Layers<AudioFlicker<Red, Blue>>
```

This makes it easy to add effect layers on top. Trivial AST transformation.

### 6C. Argify

Wrap numeric arguments in `RgbArg<N, default>` or `IntArg<N, default>`:

```
TrFade<100>
  → TrFade<IntArg<ARG_FADE_MS, 100>>
Rgb<0, 135, 255>
  → RgbArg<ARG_BASE_COLOR, Rgb<0, 135, 255>>
```

This enables Fett263-style OLED editing on the saber. Useful for users who
want their styles to be editable in-hilt via the Fett263 prop.

Argument numbering follows the Fett263 convention (sequential from 1).

### 6D. Rotate

For `ColorChange<TrInstant, C1, C2, C3, ..., CN>`:
- Rotate shifts colors: `C1, C2, C3` → `C2, C3, C1`
- Useful for previewing different orderings without manually rewriting

For non-ColorChange styles, no-op.

### 6E. UI placement

Four buttons in the Template Tree Panel toolbar (Phase 5) and/or the Output
tab's code view header:

```
[ Expand ] [ Layerize ] [ Argify ] [ Rotate ]
```

Each applies the transformation to the current template string. The template
text updates live; the tree view re-renders.

### 6F. Tests

- Each transformation: input AST → expected output AST
- Round-trip: transform → evaluate → verify same visual output (where applicable)
- Edge cases: already-expanded → no-op, already-layerized → no-op

---

## Phase 7: Template Insertion Palette (M effort, ~1 session)

**Goal:** Categorized template library for power users editing raw templates.

### 7A. Template catalog

Build a structured catalog from the existing registry, organized by category:

```typescript
const TEMPLATE_CATALOG = {
  'Colors': ['Red', 'Green', 'Blue', 'White', 'Rgb', 'Rgb16', 'Hue', ...],
  'Styles': ['Layers', 'AudioFlicker', 'StyleFire', 'Pulsing', ...],
  'Functions': ['Int', 'Scale', 'SwingSpeed', 'BladeAngle', ...],
  'Transitions': ['TrFade', 'TrWipe', 'TrCenterWipe', ...],
  'Effects': ['SimpleClashL', 'ResponsiveClashL', 'BlastL', ...],
  'Wrappers': ['InOutTrL', 'StyleNormalPtr', ...],
};
```

Each entry includes: name, signature (arg types), one-line description,
default arguments for insertion.

### 7B. Insertion UI

Tabbed panel (or dropdown) in the Template Tree Panel. Click a template name
→ inserts at the selected tree position with default arguments. If editing
raw text, inserts at cursor position.

### 7C. Examples tab

Port Fredrik's 13 example styles as preset template strings. Each click
loads the full template into the editor. These serve as starting points for
template-level editing.

### 7D. Tests

- Catalog completeness: every registered name appears in exactly one category
- Insertion: click template → verify it appears in the AST at the correct position
- Examples: each example parses and evaluates without errors

---

## Phase 8: 3D Hilt Polish (S-M effort, ~1 session, optional)

**Goal:** Evaluate whether Fredrik's 3D hilt rendering approach offers
improvements over KyberStation's existing Three.js crystal + hilt SVG.

### Assessment

Fredrik uses WebGL with a simple 3D hilt model (cylinder + guard + pommel)
that tilts to follow mouse movement. KyberStation has:
- 2D SVG hilt library (47 parts, 16 assemblies) rendered via `HiltRenderer`
- Three.js Kyber Crystal with PBR materials, bloom, refraction
- Blade canvas with 3-mip bloom chain

### Recommendation

**Do not port Fredrik's 3D hilt.** KyberStation's SVG hilt library is more
detailed and authentic (per-character parts vs generic cylinder). The
interesting part of Fredrik's 3D is the tilt-to-follow-mouse behavior, which
is better achieved via Phase 3's mouse swing simulation + slight canvas
rotation than a full 3D hilt model.

**Optional enhancement:** If Phase 3's 2D canvas tilt feels insufficient,
consider mounting the SVG hilt in a CSS 3D transform context
(`perspective` + `rotateX/Y`) driven by mouse position. Much lighter than
WebGL and preserves the detailed SVG artwork.

---

## Effort Summary + Recommended Sequencing

| Phase | Feature | Effort | Sessions | Dependencies |
|---|---|---|---|---|
| **1** | ~~Complete variant cycling~~ | ✅ Done | — | Committed on `feat/variant-cycling` (1C UI still open) |
| **2** | Close registry gaps (7 templates) | M | ~0.5 | None |
| **3** | Mouse-driven swing simulation | M | 1 | None |
| **4** | Slow-motion mode | S | ~0.5 | None |
| **5** | Structured AST editor panel | L | 2-3 | Phase 1 (tree walking) |
| **6** | Style transformation tools | M | 1-2 | Phase 5 (UI host) |
| **7** | Template insertion palette | M | 1 | Phase 5 (UI host) |
| **8** | 3D hilt polish | S-M | 1 | Phase 3 (mouse swing) |

**Total:** ~7-9 focused sessions across all phases.

### Recommended order

```
Session 1:  Phase 1 (variant cycling) + Phase 2 (registry gaps)
Session 2:  Phase 3 (mouse swing) + Phase 4 (slow-motion)
Session 3:  Phase 5A-5C (AST editor — tree renderer + annotations + layer controls)
Session 4:  Phase 5D-5F (AST editor — bidirectional sync + panel placement + tests)
Session 5:  Phase 6 (style transformations)
Session 6:  Phase 7 (template insertion palette)
Optional:   Phase 8 (3D hilt polish)
```

Phases 1-4 are independent and can be parallelized. Phases 5-7 are sequential
(each builds on the previous). Phase 8 is independent.

### Quick wins (shippable this session)

- Phase 1: implement `walkForColorChange`, commit the variant cycling work
- Phase 2D: register `PulsingL` alias (one line in registry.ts)

---

## Features NOT Recommended for Adoption

| Fredrik Feature | Why Skip |
|---|---|
| WebGL blade rendering | KyberStation's Canvas 2D 3-mip bloom runs at 120fps. Migration cost >> marginal perf gain. |
| `eval()` template parsing | Security risk. KyberStation's AST parser + factory registry is safer and equally fast. |
| History tab | KyberStation's `historyStore` with Cmd+Z/Shift+Cmd+Z (50 entries) is already stronger. |
| Inline CSS styling | KyberStation uses Tailwind + CSS custom properties. No architectural benefit from porting. |
| Settings: number of LEDs | KyberStation already has LED count in `BladeConfig.ledCount` with full UI. |
| Settings: blade length | Already covered by `BLADE_LENGTHS` source-of-truth + blade length picker. |
| Copy/paste style text | Already covered by Output tab paste import + Kyber Code URL sharing. |

---

## Metrics for Success

After all phases ship:

1. **Template coverage:** 100% of Fett263 corpus fixtures evaluate with zero
   "unregistered template" warnings (currently 7 gaps)
2. **Variant cycling:** Users can cycle through ColorChange variants in the
   visualizer with `< N/M >` controls
3. **Mouse swing:** Desktop users see SwingSpeed-reactive styles respond to
   mouse movement over the blade canvas
4. **AST editor:** Users can inspect and edit the ProffieOS template tree
   with inline value editing and layer reordering
5. **Style transforms:** Users can Expand, Layerize, Argify, and Rotate
   templates from the UI
6. **Fidelity trust:** The visualizer shows exactly what the hardware produces
   for any valid ProffieOS template string
