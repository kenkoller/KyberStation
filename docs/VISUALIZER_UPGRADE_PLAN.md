# Visualizer Upgrade Plan — Hardware-Accurate Preview + 3D Saber

**Created:** 2026-05-10
**Status (2026-05-12):** Phases 1 + 2A + 2B **shipped via PR #301** in `v0.21.1 "Polyglot Release"`. Phase 2C (3D mouse interaction), Phase 2D (3D post-processing — UnrealBloomPass + polycarbonate diffusion + motion blur), and Phase 3 remain open. See [`POST_LAUNCH_BACKLOG.md`](POST_LAUNCH_BACKLOG.md) for current priority order.
**Motivation:** Close the accuracy gap between KyberStation's preview and real hardware output, and build a flagship 3D saber visualizer with full mouse interaction (matching/exceeding Fredrik's Style Editor).

---

## Problem Statement

KyberStation has two rendering paths:

1. **Parameter Engine** (primary) — Hand-written TypeScript style classes (`StableStyle`, `FireStyle`, etc.) that approximate ProffieOS behavior. Users design via sliders/pickers, see this output, then codegen emits a ProffieOS template string for flashing.

2. **Template-Eval** (imported styles) — Evaluates actual ProffieOS template strings per-LED per-frame. Used for imported Fett263 styles via `importedRawCode`.

The gap: when users design via parameters, they see the approximation engine's output, but their hardware will run the codegen-emitted template. These are not verified to produce identical results.

Fredrik's Style Editor takes a different approach: the template string IS the program — parse it, evaluate it, that's both the preview AND the export. Zero drift by construction.

## Architecture: "Close The Loop"

```
┌─────────────┐      ┌──────────────┐      ┌───────────────────┐
│  User edits │─────▶│   Codegen    │─────▶│   Template-Eval   │
│  parameters │      │  emits TPL   │      │   evaluates TPL   │
└─────────────┘      └──────────────┘      └───────────────────┘
                                                     │
                                                     ▼
                                            ┌───────────────────┐
                                            │  LED Buffer[144]  │
                                            │  (ground truth)   │
                                            └───────────────────┘
                                                     │
                                            ┌────────┴────────┐
                                            ▼                 ▼
                                    ┌──────────────┐  ┌──────────────┐
                                    │ 2D Capsule   │  │ 3D Saber     │
                                    │ Renderer     │  │ Renderer     │
                                    └──────────────┘  └──────────────┘
```

The LED buffer is the single source of truth. Both 2D and 3D renderers consume it. The template-eval path produces the exact output the hardware will generate.

---

## Phase 1: Hardware Preview Toggle (Short Term — 1-2 sessions)

**Goal:** Let users see exactly what their hardware will produce, without changing the default editing experience.

### Deliverables

- [ ] **"Hardware Preview" toggle** in the BLADE PREVIEW toolbar
  - OFF (default): Current parameter engine drives the LED buffer (fast iteration, familiar)
  - ON: Codegen emits template from current config → template-eval evaluates it → LED buffer
- [ ] **Visual indicator** when Hardware Preview is active (amber "HW" badge)
- [ ] **Accuracy diff overlay** (optional stretch): highlight LEDs where parameter engine and template-eval disagree (educational — shows users where approximation diverges)
- [ ] **Performance budget**: template-eval must maintain 30+ fps for the toggle to be viable. If it drops below, show a frame-rate warning.

### Implementation Notes

- `BladeEngine` already has `renderMode: 'template-eval'` — the toggle sets this mode after running codegen on the current parameter config
- The codegen → template-eval pipeline runs on every parameter change (debounced 100ms)
- Template-eval registry covers 155 templates — all codegen output paths are covered
- No UI change to parameter panels — users edit the same way, just see different output

### Files to Create/Modify

- `apps/web/components/editor/HardwarePreviewToggle.tsx` (new)
- `apps/web/hooks/useHardwarePreview.ts` (new) — codegen → template-eval bridge
- `packages/engine/src/BladeEngine.ts` — expose `setDynamicTemplate(tplString)` method
- `apps/web/components/editor/CanvasLayout.tsx` — mount toggle in toolbar

---

## Phase 2: 3D Saber Renderer (Medium Term — 3-5 sessions)

**Goal:** Interactive 3D saber visualization with click/hold/drag mouse interaction, matching then exceeding Fredrik's Style Editor.

### What Fredrik Does (Reference)

- 3D saber model rendered with real-time LED coloring
- Mouse interaction: click, hold, drag to rotate/interact with the saber
- Blade shows per-LED color from template evaluation
- Clean, immediate feedback loop

### What KyberStation Will Do (Differentiators)

- **Real hilt models** from our 47-part, 16-assembly SVG library (LatheGeometry conversion)
- **Per-LED emissive material** on the blade mesh (not a simple gradient — individual LED segments glow)
- **Polycarbonate diffusion simulation** (LED bleed between adjacent pixels, matching real blade tubes)
- **Motion simulation integration** — drag the saber to see swing-reactive styles respond in real-time
- **Bloom + glow post-processing** matching the 2D workbench quality
- **Effect interaction** — click blade for clash at that position, drag for lockup, etc.

### Sub-Phases

#### 2A: Blade Mesh + LED Emissive (1 session)

- [ ] `BladeGeometry.ts` — CylinderGeometry segmented per-LED (144 segments default)
- [ ] `BladeMaterial.ts` — custom ShaderMaterial with per-segment emissive from LED buffer
- [ ] `BladeScene.tsx` — R3F scene with blade mesh, basic orbit controls
- [ ] Mount alongside existing 2D canvas as a `[2D | 3D]` toggle (resurrecting the removed UI)
- [ ] Performance target: 60fps with 144-segment blade on mid-range GPU

#### 2B: Hilt Integration (1 session)

- [ ] `HiltGeometry.ts` — Convert SVG hilt profiles to LatheGeometry (rotational symmetry)
- [ ] `HiltMaterial.ts` — metallic PBR (roughness 0.3, metalness 0.9)
- [ ] Assembly composer reads `config.hiltId` → builds complete 3D hilt
- [ ] Emitter junction where blade meets hilt (bore glow)

#### 2C: Mouse Interaction (1 session)

- [ ] **Orbit rotation**: click + drag to rotate the saber freely (OrbitControls from drei)
- [ ] **Swing simulation**: drag velocity → `engine.motion.targetSwing` (like existing `useMouseSwing` hook)
- [ ] **Effect triggers on blade**: click position → clash at that LED index, hold → lockup
- [ ] **Drag along blade**: drag tip-to-hilt → retraction simulation
- [ ] Touch support: pinch-to-zoom, two-finger rotate, tap for effects

#### 2D: Post-Processing + Polish (1 session)

- [ ] UnrealBloomPass (same config as Kyber Crystal — threshold 0.88, strength 0.32, radius 0.5)
- [ ] Polycarbonate diffusion (Gaussian blur along blade axis, radius = LED bleed distance)
- [ ] Environment lighting (subtle — the blade IS the light source, minimal external light)
- [ ] Motion blur on swing (accumulation buffer or per-object motion vectors)
- [ ] Smooth blade tip (hemisphere cap, not flat cylinder end)

### Technology Stack (Already Available)

- `three@0.183.2` — installed
- `@react-three/fiber@8.18.0` — installed
- `@react-three/drei@9.122.0` — installed (provides OrbitControls, Environment, etc.)
- `@react-three/postprocessing` — may need to add for bloom pipeline

### Interaction Model (Fredrik Reference + Enhancements)

| Action | Fredrik | KyberStation (Target) |
|--------|---------|----------------------|
| Click + drag | Rotate saber | Rotate saber (OrbitControls) |
| Click on blade | — | Trigger clash at position |
| Hold on blade | — | Trigger lockup at position |
| Drag along blade | — | Simulate swing (velocity → engine) |
| Scroll wheel | — | Zoom in/out |
| Double-click | — | Reset camera to default angle |
| Mouse velocity | — | Feed into SwingSpeed modulator |

---

## Phase 3: Template-Eval as Default + 3D Flagship (Long Term — 5+ sessions)

**Goal:** Template-eval becomes the primary rendering path for ALL designs (not just imports). The 3D view becomes the flagship experience.

### Strategy

1. **Validate template-eval performance** at 60fps across all style combinations
2. **Deprecate parameter engine rendering** — keep parameters as the UX input, but always render through codegen → template-eval
3. **3D becomes default view** on desktop (2D stays as compact/mobile alternative)
4. **Close the loop permanently** — what you see IS what your saber does, always

### Prerequisites

- Phase 1 + 2 shipped and stable
- Template-eval maintains 60fps on mid-range hardware for all preset combinations
- User studies confirm 3D view is preferred over 2D for design workflow
- No styles in the codegen output that template-eval can't handle

### Architectural Changes

- `BladeEngine.renderMode` defaults to `'template-eval'` for all configs
- Parameter changes → immediate codegen → immediate template-eval (< 16ms total budget)
- The 2D capsule renderer becomes a "compact mode" reading the same LED buffer
- 3D renderer becomes the full-width primary workspace view

---

## Infrastructure Already in Place

| Asset | Status | Location |
|-------|--------|----------|
| Three.js + R3F + drei | Installed | `package.json` |
| Template-eval engine | Working, 155 templates | `packages/template-eval/` |
| Codegen emitter | Full coverage | `packages/codegen/` |
| Hilt SVG library | 47 parts, 16 assemblies | `apps/web/lib/hilts/` |
| Motion simulation | SwingSpeed, BladeAngle, TwistAngle | `packages/engine/src/motion/` |
| Mouse swing hook | Working | `apps/web/hooks/useMouseSwing.ts` |
| LED buffer API | Public | `BladeEngine.captureStateFrame()` |
| Kyber Crystal 3D | Reference implementation | `apps/web/lib/crystal/` |
| Bloom post-processing | Working (crystal) | `apps/web/lib/crystal/postProcessing.ts` |

---

## Session Dispatch Plan

| Session | Focus | Dependencies |
|---------|-------|--------------|
| **S1** | Hardware Preview Toggle (Phase 1) | None — can start immediately |
| **S2** | 3D Blade Mesh + LED Emissive (Phase 2A) | None — can start in parallel with S1 |
| **S3** | 3D Hilt Integration (Phase 2B) | S2 complete |
| **S4** | 3D Mouse Interaction (Phase 2C) | S2 complete |
| **S5** | 3D Post-Processing + Polish (Phase 2D) | S2 + S3 complete |
| **S6+** | Template-eval default + performance (Phase 3) | S1 + S5 complete |

**S1 and S2 can run in parallel** — they touch disjoint file sets:
- S1: `BladeEngine.ts` (new method), `hooks/useHardwarePreview.ts`, `CanvasLayout.tsx` toolbar
- S2: New `apps/web/components/editor/blade3d/` directory, new R3F components

---

## Success Metrics

- **Phase 1**: Toggle works, < 100ms latency from parameter change to hardware-accurate LED update, 30+ fps maintained
- **Phase 2**: 3D saber renders at 60fps, all interaction gestures feel responsive (< 16ms input latency), hilt matches 2D representation
- **Phase 3**: Zero visual drift between preview and hardware output for any preset, 3D becomes the view users prefer

---

## Reference: Fredrik's Style Editor

- URL: https://fredrik.hubbe.net/lightsaber/style_editor.html
- Key insight: template string = program = preview = export (zero drift by construction)
- 3D interaction: click/hold/drag to rotate, mouse movement feeds into style evaluation
- Limitation: single rendering path only, no hilt models, no post-processing

KyberStation's advantage: we can offer BOTH the intuitive parameter-driven design workflow AND hardware-accurate preview, with a flagship 3D experience that no other tool offers.
