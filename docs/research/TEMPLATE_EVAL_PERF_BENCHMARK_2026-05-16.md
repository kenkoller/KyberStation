# Template-Eval Performance Benchmark — Phase 3 Steps 1 + 2

**Step 1 date:** 2026-05-16 (PR #351, branch `perf/template-eval-benchmark-phase-3-step-1`)
**Step 2 date:** 2026-05-16 (PR #352, branch `feat/template-eval-default-phase-3-step-2`)
**Hardware:** Apple Silicon (`darwin-arm64`), Node v24.11.1
**Bench script:** [`packages/engine/perf/templateEvalBench.mjs`](../../packages/engine/perf/templateEvalBench.mjs)

This benchmark documents the two prerequisites the Visualizer Upgrade Plan §Phase 3 required before template-eval could become the default render mode:

> "Template-eval maintains 60fps on mid-range hardware for all preset combinations."
> "No styles in the codegen output that template-eval can't handle."

**Status (post-Step 2):** both prerequisites met. Template-eval is now the default `BladeEngine.renderMode` (flipped from `'proffie'`).

---

## TL;DR

| Question | Pre-fix (Step 1) | Post-fix (Step 2) |
| --- | --- | --- |
| Per-frame interpreter cost, p95 | 0.007–0.041 ms (synthetic only) | **0.008–0.062 ms** across 20 synthetic + 20 real preset templates |
| Equivalent fps (per-preset avg) | ~78,000 fps | **~59,000 fps** (full-Layers + InOutTrL templates now measured) |
| Codegen→template-eval round-trip coverage | **0 / 455** | **455 / 455** ✅ |
| 60fps budget (16.67 ms p95) | 20/20 synthetic pass | **40/40 templates pass** |
| Headroom vs 60fps budget | ~400× | **~260×** worst case |
| Default render mode | `'proffie'` | **`'template-eval'`** (`BladeEngine.ts:111`) |

**Step 1 bottleneck (resolved in Step 2):** three template-name gaps between codegen output and template-eval registry — `SaberBase::LOCKUP_NORMAL`, `SaberBase::LOCKUP_DRAG`, and `FireConfig`. The bench's "first parse error" surfaced 2 of the 4 actual `LOCKUP_*` variants (the parser fails fast on the first unknown name); the full closure required registering all four `SaberBase::LOCKUP_*` tags plus their unqualified aliases, all 21 `EFFECT_*` tags (for `TransitionEffectL`'s trailing arg), and the `FireConfig<>` structured leaf.

**PR #352 changes:**
- 36 new registry entries: 14 `LockupTypeTag` variants (7 qualified + 7 unqualified aliases) + 21 `EffectTypeTag` variants + 1 `FireConfig` structured leaf.
- `LockupTrLTemplate` updated to read the 5th arg (`LockupType` tag) and filter activation to matching `effects.lockupType` values. Preserves 4-arg backwards compatibility (no tag = match any non-`LOCKUP_NONE`).
- `StyleFireTemplate` updated to read the optional `FireConfig<Cooling, Heating, IntensityBase>` 5th arg and scale its heat-map simulation parameters accordingly. Preserves 4-arg shape used by the `cinder` style family.
- Default `BladeEngine.renderMode` flipped from `'proffie'` to `'template-eval'`. The existing fall-through path (no template code → parameter-engine pipeline) is preserved as a safety net.

---

## Methodology

### Setup

- 600 frames per preset (10 s @ 60 fps)
- Frame delta: 1000/60 ≈ 16.67 ms (60fps budget)
- Each preset: 10-frame warm-up (discarded), 600-frame measured loop
- Simulated motion: 0.4 Hz sinusoidal swing + periodic spikes (every 3 s), 0.2 Hz blade-angle oscillation, 0.15 Hz twist
- Per-frame timing via `performance.now()` deltas around `TemplateEvalBridge.renderFrame()`
- Synthetic templates use hand-authored ProffieOS strings (covered below)

The bench runs entirely against the **compiled engine + template-eval dist/ output** through Node's ESM loader, so the hot path is the same code the browser executes (no `tsx` transform overhead in the measurement).

### Curated preset slice (intended sample)

We picked one preset per style family from the shipped gallery, covering all 20 distinct `config.style` values currently in use:

```
stable, unstable, fire, pulse, rotoscope, gradient, photon, plasma,
aurora, cinder, gravity, dataStream, ember, helix, candle, shatter,
neutron, crystalShatter, automata, prism
```

The 20 chosen presets:

| Style | Preset |
| --- | --- |
| stable | Obi-Wan Kenobi (Padawan) |
| unstable | Maul (Cybernetic — Crime Lord) |
| fire | Shin Hati (Orange) |
| pulse | Grogu (Armored Youngling) |
| rotoscope | Luke Skywalker (ANH) |
| gradient | Kyber Bleeding |
| photon | Ahsoka Tano (Rebels/Mandalorian — White) |
| plasma | Praetorian Guard |
| aurora | Rey (Own Saber) |
| cinder | Palpatine (TROS) |
| gravity | Earthquake |
| dataStream | Digital Rain |
| ember | Magma Core |
| helix | Warp Core |
| candle | Protosaber |
| shatter | Darth Sion (Red) |
| neutron | Astral Projection |
| crystalShatter | Marchion Ro (Nihil) |
| automata | 404 Saber Not Found |
| prism | Orla Jareni (Wayseeker) |

**Step 1 result:** every preset in this slice failed to parse. **Step 2 result:** all 20 now parse and measure cleanly — see the per-preset table below.

### Synthetic template suite

The bench also runs a **20-template synthetic suite** that hand-authors ProffieOS strings using each style family. Each synthetic entry uses only template names that `packages/template-eval/src/registry.ts` registers. In Step 1, this was the only source of measured timings (because the curated preset slice all failed to parse). In Step 2, both the real-preset slice and the synthetic suite measure successfully.

The synthetic suite is a **lower bound** for production perf — it omits the `LockupTrL` / `InOutTrL` ignition layers that codegen normally wraps around every style. The real-preset slice (now measurable post-fix) shows the full per-frame cost with all `Layers<>` composition + lockup-tag filtering + ignition transitions in play.

---

## Per-preset results — Step 2 (post-fix, 40 templates)

Timing in milliseconds, 600 measured frames each. **Real presets** are sampled from `ALL_PRESETS` via the curated-slice methodology; **synthetic** entries are hand-authored to isolate single-style cost.

### Real presets (codegen → template-eval round-trip)

| Preset | Style family | p50 | p95 | p99 | max | mean | 60fps share | Passes p95 ≤ 16.67 ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | :---: |
| Obi-Wan Kenobi (Padawan) | stable | 0.023 | 0.062 | 0.106 | 0.547 | 0.030 | 100.0% | ✅ |
| Maul (Cybernetic — Crime Lord) | unstable | 0.017 | 0.032 | 0.052 | 0.161 | 0.019 | 100.0% | ✅ |
| Shin Hati (Orange) | fire | 0.017 | 0.028 | 0.047 | 0.193 | 0.018 | 100.0% | ✅ |
| Grogu (Armored Youngling) | pulse | 0.014 | 0.019 | 0.034 | 0.096 | 0.015 | 100.0% | ✅ |
| Luke Skywalker (ANH) | rotoscope | 0.025 | 0.043 | 0.080 | 0.159 | 0.028 | 100.0% | ✅ |
| Kyber Bleeding | gradient | 0.018 | 0.035 | 0.052 | 0.129 | 0.021 | 100.0% | ✅ |
| Ahsoka Tano (Rebels/Mandalorian — White) | photon | 0.032 | 0.042 | 0.082 | 0.230 | 0.035 | 100.0% | ✅ |
| Praetorian Guard | plasma | 0.016 | 0.020 | 0.040 | 0.134 | 0.016 | 100.0% | ✅ |
| Rey (Own Saber) | aurora | 0.018 | 0.025 | 0.041 | 0.121 | 0.020 | 100.0% | ✅ |
| Palpatine (TROS) | cinder | 0.019 | 0.023 | 0.055 | 0.215 | 0.020 | 100.0% | ✅ |
| Earthquake | gravity | 0.029 | 0.040 | 0.087 | 0.151 | 0.031 | 100.0% | ✅ |
| Digital Rain | dataStream | 0.026 | 0.030 | 0.046 | 0.150 | 0.028 | 100.0% | ✅ |
| Magma Core | ember | 0.018 | 0.019 | 0.037 | 0.120 | 0.018 | 100.0% | ✅ |
| Warp Core | helix | 0.023 | 0.029 | 0.052 | 0.151 | 0.025 | 100.0% | ✅ |
| Protosaber | candle | 0.026 | 0.034 | 0.055 | 0.517 | 0.027 | 100.0% | ✅ |
| Darth Sion (Red) | shatter | 0.033 | 0.038 | 0.050 | 0.184 | 0.033 | 100.0% | ✅ |
| Astral Projection | neutron | 0.024 | 0.028 | 0.049 | 0.162 | 0.025 | 100.0% | ✅ |
| Marchion Ro (Nihil) | crystalShatter | 0.031 | 0.036 | 0.062 | 0.137 | 0.032 | 100.0% | ✅ |
| 404 Saber Not Found | automata | 0.023 | 0.028 | 0.045 | 0.159 | 0.024 | 100.0% | ✅ |
| Orla Jareni (Wayseeker) | prism | 0.018 | 0.019 | 0.034 | 0.141 | 0.019 | 100.0% | ✅ |

### Synthetic suite (single-style baseline)

| Synthetic preset | Style family | p50 | p95 | p99 | max | mean | 60fps share | Passes p95 ≤ 16.67 ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | :---: |
| AudioFlicker stable | stable | 0.016 | 0.017 | 0.025 | 0.076 | 0.017 | 100.0% | ✅ |
| StyleFire unstable | unstable | 0.013 | 0.022 | 0.038 | 0.084 | 0.014 | 100.0% | ✅ |
| Fire | fire | 0.011 | 0.017 | 0.032 | 0.140 | 0.012 | 100.0% | ✅ |
| Pulsing | pulse | 0.014 | 0.016 | 0.037 | 0.106 | 0.015 | 100.0% | ✅ |
| SwingSpeed rotoscope | rotoscope | 0.020 | 0.022 | 0.030 | 0.114 | 0.020 | 100.0% | ✅ |
| Gradient | gradient | 0.011 | 0.011 | 0.014 | 0.130 | 0.011 | 100.0% | ✅ |
| Darksaber | darksaber | 0.010 | 0.016 | 0.035 | 0.097 | 0.012 | 100.0% | ✅ |
| Layered RgbCycle | rgb-cycle | 0.013 | 0.015 | 0.031 | 0.119 | 0.013 | 100.0% | ✅ |
| Rainbow | rainbow | 0.012 | 0.013 | 0.024 | 0.151 | 0.012 | 100.0% | ✅ |
| Stripes | stripes | 0.020 | 0.025 | 0.043 | 0.157 | 0.022 | 100.0% | ✅ |
| Cylon | cylon | 0.008 | 0.009 | 0.025 | 0.116 | 0.009 | 100.0% | ✅ |
| AudioFlickerL nested | flicker-nest | 0.014 | 0.021 | 0.028 | 0.120 | 0.016 | 100.0% | ✅ |
| Localized Clash | spatial-clash | 0.007 | 0.008 | 0.017 | 0.027 | 0.007 | 100.0% | ✅ |
| RandomPerLEDFlicker | random-per-led | 0.011 | 0.012 | 0.027 | 0.158 | 0.012 | 100.0% | ✅ |
| BrownNoiseFlicker | brown-noise | 0.015 | 0.017 | 0.035 | 0.136 | 0.016 | 100.0% | ✅ |
| Strobe | strobe | 0.009 | 0.010 | 0.023 | 0.133 | 0.009 | 100.0% | ✅ |
| Mix<Sin> | mix-sin | 0.019 | 0.021 | 0.036 | 0.164 | 0.019 | 100.0% | ✅ |
| Multi-stage Mix | multi-mix | 0.021 | 0.023 | 0.042 | 0.155 | 0.022 | 100.0% | ✅ |
| HumpFlicker | hump-flicker | 0.016 | 0.018 | 0.034 | 0.045 | 0.017 | 100.0% | ✅ |
| Sparkle | sparkle | 0.007 | 0.009 | 0.015 | 0.142 | 0.008 | 100.0% | ✅ |

**Note on absolute numbers.** Bench runs vary by ±5–10% between consecutive runs on the same machine — interpret the numbers as orders-of-magnitude, not stable benchmark constants. The headroom is wide enough that this variance doesn't affect any decision.

### Aggregate (Step 2)

- **40 / 40 templates** stay under 16.67 ms p95
- Mean p50 (across all 40): **0.018 ms** | Mean p95: **0.024 ms**
- Mean per-preset frame rate: **~59,000 fps**
- Effective margin to 60fps budget: **~260×** worst-case p95 (Obi-Wan Kenobi `stable` preset at 0.062 ms)

### Top 3 fastest / slowest (p95) — Step 2

| Position | Style | p95 (ms) | Notes |
| --- | --- | ---: | --- |
| Fastest 1 | Synthetic: Localized Clash | 0.008 | Bounded-range spatial work |
| Fastest 2 | Synthetic: Sparkle / Cylon | 0.009 | Single-pass per-LED random / Bounded-range |
| Fastest 3 | Synthetic: Strobe | 0.010 | Boolean toggle per LED |
| Slowest 1 | Real: Obi-Wan Kenobi (Padawan) — `stable` | 0.062 | Full Layers + InOutTrL + 4 LockupTrL variants + AudioFlicker |
| Slowest 2 | Real: Luke Skywalker (ANH) — `rotoscope` | 0.043 | Motion-driven `Mix<Mix<Sin>>` + same wrapping |
| Slowest 3 | Real: Ahsoka Tano (W) — `photon` | 0.042 | Photon overlays + same wrapping |

The "slowest" entry — a full-fidelity ProffieOS preset shape — is **0.062 ms p95**. Still effectively unconstrained against the 16.67 ms budget.

---

## Codegen → template-eval coverage check

The bench walks **every preset in `ALL_PRESETS`** (n = 455) through:

1. `generateStyleCode(preset.config)` → ProffieOS template string
2. `evaluateTemplateString(code)` → instantiated `StyleTemplate`
3. `renderFrame()` → 1 frame written to LED buffer

| Stage | Pre-fix (Step 1) | Post-fix (Step 2) |
| --- | ---: | ---: |
| Total presets | 455 | 455 |
| Codegen succeeded | 455 | 455 |
| Parse succeeded | 0 | **455** |
| Render succeeded | 0 | **455** |
| **End-to-end success** | **0 / 455 (0%)** | **455 / 455 (100%)** ✅ |

### Step 1 root cause — three unregistered template names

| Frequency | Unrecognized template | Origin in codegen | Resolution in Step 2 |
| ---: | --- | --- | --- |
| **363** | `SaberBase::LOCKUP_NORMAL` | Emitted as the 5th arg of `LockupTrL<>` by [`ASTBuilder.ts`](../../packages/codegen/src/ASTBuilder.ts) | Registered as `LockupTypeTagTemplate('LOCKUP_NORMAL')` in [`registry.ts`](../../packages/template-eval/src/registry.ts). `LockupTrLTemplate` now reads the 5th arg and filters activation by it. |
| **91** | `FireConfig` | Emitted as the 5th arg of `StyleFire<>` for `unstable` + `fire` styles (`FireConfig<3,2000,5>`) | Registered as `FireConfigTemplate` (a structured leaf carrying 3 ints). `StyleFireTemplate` now reads Cooling/Heating/IntensityBase from it. |
| **1** | `SaberBase::LOCKUP_DRAG` | Same as `LOCKUP_NORMAL` but for the drag-lockup variant | Same as `LOCKUP_NORMAL`. |

The bench's "first parse error" surfaced 2 of the 4 actual `LOCKUP_*` variants emitted by codegen (the parser fails fast on the first unknown name). The full Step 2 closure also registered the 2 remaining variants (`SaberBase::LOCKUP_LIGHTNING_BLOCK` and `SaberBase::LOCKUP_MELT`), their unqualified aliases, and all 21 `EFFECT_*` tags emitted as trailing args of `TransitionEffectL<>`.

**Total new registry entries (Step 2):** 36 (14 lockup-tag variants + 21 effect-tag variants + 1 FireConfig).

These three names together caused **100% of pre-fix preset parse failures**.

### Bottleneck analysis

The bottleneck for Phase 3 default-mode flip is **not** template-eval per-frame cost. The bottleneck is a **3-line registry gap** in `packages/template-eval/src/registry.ts`. Once the gap is closed:

- `SaberBase::LOCKUP_NORMAL` / `_DRAG` / etc. → register as no-op leaf templates (they're enum tags consumed by `LockupTrL`'s constructor logic, not standalone style nodes). The `LockupTrL` template-eval class should be updated to accept a 5th arg and dispatch on its name. Same shape: `EFFECT_CLASH` etc. are referenced as bare names but resolved via `EffectManager`, not the registry.
- `FireConfig` → register as a structured leaf template that exposes its three integer args (`Cooling`, `Heating`, `IntensityBase`) to the parent `StyleFire` for its fire-simulation params.

A future contributor can verify the fix is complete by re-running:

```bash
pnpm bench:template-eval
```

…and looking at the `COVERAGE CHECK` section. The exit criteria for the default-mode flip is `ok == total` (455 / 455).

---

## Per-style failure breakdown (pre-fix, Step 1)

Pre-fix distribution across the 28 distinct `config.style` values used in `ALL_PRESETS` — kept here as a historical record of where the gap had its largest impact. **All entries below are now zero in Step 2.**

| Style family | Failed presets (pre-fix) | Failing template name |
| --- | ---: | --- |
| stable | 152 | `SaberBase::LOCKUP_NORMAL` |
| unstable | 62 | `FireConfig` |
| pulse | 28 | `SaberBase::LOCKUP_NORMAL` |
| aurora | 27 | `SaberBase::LOCKUP_NORMAL` |
| gradient | 18 | `SaberBase::LOCKUP_NORMAL` |
| photon | 15 | `SaberBase::LOCKUP_NORMAL` |
| fire | 13 | `FireConfig` |
| rotoscope | 12 | `SaberBase::LOCKUP_NORMAL` |
| helix | 12 | `SaberBase::LOCKUP_NORMAL` |
| plasma | 11 | `SaberBase::LOCKUP_NORMAL` |
| prism | 10 | `SaberBase::LOCKUP_NORMAL` |
| vortex | 10 | `SaberBase::LOCKUP_NORMAL` |
| tidal | 9 | `SaberBase::LOCKUP_NORMAL` |
| darksaber | 8 | `SaberBase::LOCKUP_NORMAL` |
| torrent | 7 | `SaberBase::LOCKUP_NORMAL` |
| gravity | 7 | `SaberBase::LOCKUP_NORMAL` |
| crystalShatter | 7 | `SaberBase::LOCKUP_NORMAL` |
| dataStream | 6 | `SaberBase::LOCKUP_NORMAL` |
| cinder | 6 | `SaberBase::LOCKUP_NORMAL` |
| candle | 5 | `SaberBase::LOCKUP_NORMAL` |
| automata | 5 | `SaberBase::LOCKUP_NORMAL` |
| neutron | 5 | `SaberBase::LOCKUP_NORMAL` |
| ember | 5 | `SaberBase::LOCKUP_NORMAL` |
| nebula | 3 | `SaberBase::LOCKUP_NORMAL` |
| mirage | 3 | `SaberBase::LOCKUP_NORMAL` |
| cascade | 3 | `SaberBase::LOCKUP_NORMAL` |
| moire | 3 | `SaberBase::LOCKUP_NORMAL` |
| shatter | 3 | `SaberBase::LOCKUP_NORMAL` |

---

## Recommended next steps

### Done — Phase 3 Steps 1 + 2

1. ✅ **Close the registry gap** in `packages/template-eval/src/registry.ts`. PR #352 added:
   - 7 `SaberBase::LOCKUP_*` tags + 7 unqualified aliases as `LockupTypeTagTemplate` factories.
   - 21 `EFFECT_*` tags as `EffectTypeTagTemplate` factories (for `TransitionEffectL<>`'s trailing arg).
   - 1 `FireConfig` structured leaf as `FireConfigTemplate` (3-int payload).
   - `LockupTrLTemplate` updated to read the 5th arg (LockupType tag) and filter activation. Preserves 4-arg backwards compatibility.
   - `StyleFireTemplate` updated to read the optional FireConfig 5th arg. Preserves 4-arg shape used by the `cinder` style.
   - 50 new tests in `packages/template-eval/tests/lockupTypes.test.ts` covering tag registration, parent-template arg semantics, and codegen→template-eval round-trip.
2. ✅ **Re-run the bench post-fix.** `pnpm bench:template-eval` now shows **455/455 ok**, all 40 measured templates pass the 60fps budget.
3. ✅ **Default-mode flip.** `BladeEngine.renderMode` default switched from `'proffie'` to `'template-eval'` (`packages/engine/src/BladeEngine.ts:111`). Worst-case p95 is **0.062 ms** — far inside the 8 ms / 50% budget threshold that the Step 1 doc proposed as the decision criterion. Engine retains its existing fall-through to the parameter-engine pipeline when no template code is present, preserving the original behavior as a safety net.

### Not needed

4. **Per-template optimization passes** — worst-case p95 of **0.062 ms** means template-eval has ~260× headroom on the most expensive real preset measured (full-fidelity Obi-Wan `stable` shape with InOutTrL + 4 LockupTrL variants + AudioFlicker). There's no perf-optimization work to schedule. The interpreter is fast enough.

---

## Reproducing this benchmark

From the repo root:

```bash
pnpm install
pnpm build                  # ensures dist/ output for engine + codegen + template-eval + presets
pnpm bench:template-eval    # ~10s on Apple Silicon, longer on x86 + older hardware
```

Environment variables:

- `BENCH_FRAMES` — frames per preset (default 600)
- `BENCH_MODE` — `preset` | `synthetic` | `both` (default `both`)
- `BENCH_PRESETS` — comma-separated preset ids to override the curated slice
- `BENCH_OUTDIR` — directory for JSON / CSV reports (default `packages/engine/perf/results/`)

Reports are written as timestamped JSON + CSV; the directory is gitignored so multiple runs don't pollute the repo.

---

## Cross-references

- Visualizer Upgrade Plan: [`docs/VISUALIZER_UPGRADE_PLAN.md`](../VISUALIZER_UPGRADE_PLAN.md) §Phase 3
- Template-eval implementation: [`packages/template-eval/`](../../packages/template-eval/)
- Engine bridge (template-eval ↔ BladeEngine): [`packages/engine/src/templateEval/TemplateEvalBridge.ts`](../../packages/engine/src/templateEval/TemplateEvalBridge.ts)
- Codegen entry point: [`packages/codegen/src/index.ts`](../../packages/codegen/src/index.ts) `generateStyleCode()`
- Preset gallery: [`packages/presets/src/index.ts`](../../packages/presets/src/index.ts) `ALL_PRESETS`
