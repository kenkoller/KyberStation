# New Effects Priority 5 — v0.15.x Proposal

Captured from the 2026-04-27 Explore-agent research run on `docs/NEW_EFFECTS_ROADMAP.md`. Explore agents are read-only, so the parent session is recording the findings here for follow-up work.

## Summary

Three engine additions + one bonus effect that earn their place by closing canonical visual gaps and emitting as valid ProffieOS templates per `docs/HARDWARE_FIDELITY_PRINCIPLE.md`. Total scope ~10-11 hours across 2-3 PRs, suitable for a v0.15.x mid-week post-launch sprint while modulation v1.1 momentum is fresh.

## Selected effects (3 + 1 bonus)

### 1. Sith Flicker — STYLE (priority pick)

- **Type**: blade style (engine `BladeStyle` class)
- **Source**: `docs/NEW_EFFECTS_ROADMAP.md` Priority 5 — flicker family
- **Visual**: red saber flickering between full brightness and near-black (~5-10%) at 3-8 Hz randomized. Models Vader's iconic unstable-weapon aesthetic from ROTJ + Rogue One's hallway scene + Inquisitor saber unsteadiness.
- **Math sketch**: `color(pos, time) = baseColor * (rand_pulse(time) ? 1 : minBrightness)` where `rand_pulse` is a deterministic noise function gated at 3-8 Hz with hysteresis to avoid 60 fps strobing artifacts. Per-LED variance kept low (~5% ripple) so the flicker reads as a whole-blade event, not noise.
- **Hardware-fidelity check**: emits as `<PwmPin>` with sine LFO + threshold step. Existing `Sin<>` template in `packages/codegen/src/templates/functions.ts` is the right primitive; pair it with `Lerp<>` for the brightness step.
- **Implementation scope**: S (~2-2.5 h)
  - New `SithFlickerStyle` engine class (mirror `UnstableStyle.ts` shape)
  - Codegen entry — extend `ASTBuilder.ts` to map `style: 'sithFlicker'` → `Sin<Int<flickerHz>, Int<minBrightness>, Int<255>>`
  - 3-4 engine tests (deterministic pulse cadence, brightness floor, gating hysteresis)
  - UI registration — sidebar Blade Style picker entry + thumbnail in `lib/styleThumbnails.tsx`

### 2. Blade Charge — STYLE

- **Type**: blade style
- **Source**: roadmap motion-reactive family
- **Visual**: color pools toward the tip as swing speed increases. Holding still: even base color. Fast swing: tip glows brighter / saturated, hilt-end dims toward the body color. Reverses on retract phase.
- **Math sketch**: per-LED weight = `1 + (swingSpeed * (pos / ledCount)^q)` with `q ≈ 1.5` for satisfying tip-pooling. Apply weight as brightness multiplier on `baseColor`.
- **Hardware-fidelity check**: emits as `Gradient<baseColor, brightTipColor>` wrapped in a `Scale<SwingSpeed<400>, ...>` template. The exact pattern Wave 6's composer produces today for shimmer — same shape, different target.
- **Implementation scope**: S (~2-2.5 h)
  - `BladeChargeStyle` engine class (consume `context.swingSpeed`)
  - Codegen entry mapping to `Mix<Scale<SwingSpeed<>>, Gradient<>>`
  - 3-4 tests (idle holds even, swing pools tip, retract reverses)

### 3. Unstable Kylo — EFFECT (clash variant)

- **Type**: combat effect (engine `BladeEffect`)
- **Source**: roadmap impact-shape family
- **Visual**: 6-8 white sparks spray from clash point along the blade — both directions toward hilt + tip, 100-150 ms lifespan each, additive blend over the existing clash flash. Differentiates Kylo's crossguard chaos from a clean lightsaber clash.
- **Math sketch**: particle system identical in shape to `ScatterEffect.ts` (which already exists). On clash trigger: spawn 6-8 sparks at `clashPosition`, each with random velocity + duration + size, render as additive bumps fading to black.
- **Hardware-fidelity check**: emits as `SimpleClashL<...>` wrapped in a particle `EffectSequence<>` template — extend the existing clash template family in `packages/codegen/src/templates/transitions.ts`. Same pattern as the existing `ScatterEffect`.
- **Implementation scope**: M (~3-3.5 h) — particle system bookkeeping is nontrivial
  - `UnstableKyloEffect` engine class composing particle math
  - Codegen entry
  - 4-5 tests (spark count, lifespan decay, additive blend with base clash)

### 4. Tempo Lock — EFFECT (bonus, scope-permitting)

- **Type**: rhythm effect
- **Source**: roadmap exotic-family
- **Visual**: phases blade intensity at user-defined BPM (60-180), creating heartbeat / dance-track pulse for rhythmic presets.
- **Math sketch**: `brightness(time) = 1 + sin(time * 2π * BPM / 60) * depth`. `depth` exposed as a slider.
- **Hardware-fidelity check**: emits as `Mix<Sin<BPM>, base, bright>` — straightforward IF BPM is a static config field. If BPM is meant to be modulation-driven (v1.1+ binding source), codegen needs a new pattern not yet in ASTBuilder. **Recommend confirming with Ken before implementation.**
- **Implementation scope**: S (~2 h) for the static-BPM version

## NOT selected (and why)

- **Envelope follower / step sequencer family**: owned by the deferred Modulation v1.2 / v1.3 work per `MODULATION_ROUTING_ROADMAP.md`. Don't touch in v0.15.x.
- **Audio-reactive effects beyond the existing `audioFlicker`**: needs Modulation v1.1's `sound` modulator polish to land first.
- **Multi-blade-aware effects** (e.g. saberstaff cross-talk): owned by the v0.16.0 Multi-Blade Workbench sprint.

## Implementation order

1. **Sith Flicker first** — smallest scope, highest visual payoff, codegen pattern is already established. Establishes the new-style-addition pattern post-v1.1-Core.
2. **Blade Charge second** — slightly more involved but reuses the modulation-composer pattern from Wave 6. Verifies the pattern can support new-style emission alongside the existing shimmer-Mix slot.
3. **Unstable Kylo third** — adds particle effect family. Bigger codegen lift since `EffectSequence<>` may need to be added.
4. **Tempo Lock — defer to v0.16.0 if Modulation v1.1 doesn't ship a `bpm` source** in time. Static-BPM version is OK in v0.15.x as a fallback.

## Open questions for Ken

1. **Tempo Lock BPM source** — fixed `BladeConfig.bpm` field, or modulation-driven via a future `tempo` modulator?
2. **Sith Flicker minimum brightness** — exposed as a tunable parameter (slider 0-30%), or locked at 10%?
3. **Blade Charge exponent** — linear (`q = 1`) or super-linear (`q = 1.5`)? Latter is more dramatic but may overshoot on aggressive swings.
4. **Unstable Kylo spark bias** — random both directions equally, or preferential hilt-ejection (matches Kylo's physical crossguard venting)?
5. **Sequencing vs. other v0.15.x work** — effects sprint runs ~10-11 h, 2-3 PRs. Compete for attention with Sidebar A/B Phase 2 build-out (`blade-style` migration), useSharedConfig test polish, GIF Sprint 2 generation. Recommend: ship effects first (engine work, isolated), then UI work after.

## Coordination

- Engine work (`packages/engine/src/styles/` + `packages/engine/src/effects/`) is disjoint from Sidebar A/B (`apps/web/components/layout/`), Hilt Stage 2 (`apps/web/lib/hilts/`), GIF Sprint 2 (`apps/web/lib/sharePack/` + `packages/engine/scripts/`), Wave 8 (`apps/web/components/editor/routing/`), and the deferred Modulation v1.2/v1.3 stack.
- Codegen edits are minimal: 1 mapping per new style/effect in `ASTBuilder.ts` + 1 template in `templates/`.

## Estimated total

- 3 effects: ~7-8 hours engine + codegen + tests + UI registration
- Tempo Lock bonus: +2 hours if BPM source is locked
- 2-3 PRs total (one per effect or batch the styles together)
