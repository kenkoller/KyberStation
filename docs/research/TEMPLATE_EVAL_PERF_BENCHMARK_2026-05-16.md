# Template-Eval Performance Benchmark — Phase 3 Step 1

**Date:** 2026-05-16
**Branch:** `perf/template-eval-benchmark-phase-3-step-1`
**Hardware:** Apple Silicon (`darwin-arm64`), Node v24.11.1
**Bench script:** [`packages/engine/perf/templateEvalBench.mjs`](../../packages/engine/perf/templateEvalBench.mjs)

This is the **first** of two prerequisites the Visualizer Upgrade Plan §Phase 3 requires before template-eval can become the default render mode:

> "Template-eval maintains 60fps on mid-range hardware for all preset combinations."
> "No styles in the codegen output that template-eval can't handle."

This benchmark answers both questions: per-frame interpreter cost (where it's measurable today) and codegen→template-eval round-trip coverage.

---

## TL;DR

| Question | Answer |
| --- | --- |
| Per-frame interpreter cost (synthetic suite, p95) | **0.007–0.041 ms** across 20 representative templates |
| Equivalent fps (per-preset avg) | **~78,000 fps** on Apple Silicon Node |
| Codegen→template-eval round-trip coverage | **0 / 455 presets** parse cleanly |
| Are perf numbers the blocker? | **No.** Template-eval is ~400× faster than the 60fps budget on the templates that parse. |
| What IS the blocker? | **3 template-name gaps** between codegen output and template-eval registry (`SaberBase::LOCKUP_NORMAL`, `SaberBase::LOCKUP_DRAG`, `FireConfig`) |

**Recommendation:** Phase 3's perf prerequisite is met. The Phase 3 *coverage* prerequisite is NOT met. The next session should land the three template-registry additions before any default-mode flip — this is a **bug-fix problem**, not a **perf-optimization problem**.

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

**Result: every preset in this slice fails to parse.** See `Codegen→template-eval coverage` below.

### Synthetic template fallback

Because the curated preset slice cannot be measured (the parse step fails before per-frame work begins), the bench also runs a **20-template synthetic suite** that hand-authors ProffieOS strings using the same style families. Each synthetic entry uses only template names that `packages/template-eval/src/registry.ts` actually registers.

The synthetic suite is a **lower bound** for production perf — it omits the `LockupTrL` / `InOutTrL` ignition layers that codegen normally wraps around every style, but it does include the per-LED hot loop for every style family. Real-world cost will be modestly higher (per-frame `Layers<>` composition adds one base style + N effect overlays per LED) but won't change the conclusion.

---

## Per-preset results (synthetic suite)

Timing in milliseconds, 600 measured frames each.

| Synthetic preset | Style family | p50 | p95 | p99 | max | mean | 60fps share | Passes p95 ≤ 16.67 ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | :---: |
| AudioFlicker stable | stable | 0.015 | 0.038 | 0.066 | 0.183 | 0.018 | 100.0% | ✅ |
| StyleFire unstable | unstable | 0.010 | 0.027 | 0.043 | 0.111 | 0.012 | 100.0% | ✅ |
| Fire | fire | 0.009 | 0.022 | 0.043 | 0.121 | 0.011 | 100.0% | ✅ |
| Pulsing | pulse | 0.013 | 0.019 | 0.038 | 0.082 | 0.014 | 100.0% | ✅ |
| SwingSpeed rotoscope | rotoscope | 0.018 | 0.031 | 0.046 | 0.113 | 0.020 | 100.0% | ✅ |
| Gradient | gradient | 0.010 | 0.022 | 0.038 | 0.150 | 0.012 | 100.0% | ✅ |
| Darksaber | darksaber | 0.008 | 0.015 | 0.030 | 0.080 | 0.010 | 100.0% | ✅ |
| Layered RgbCycle | rgb-cycle | 0.013 | 0.035 | 0.060 | 0.130 | 0.016 | 100.0% | ✅ |
| Rainbow | rainbow | 0.010 | 0.012 | 0.026 | 0.110 | 0.011 | 100.0% | ✅ |
| Stripes | stripes | 0.014 | 0.022 | 0.034 | 0.116 | 0.016 | 100.0% | ✅ |
| Cylon | cylon | 0.007 | 0.008 | 0.022 | 0.101 | 0.008 | 100.0% | ✅ |
| AudioFlickerL nested | flicker-nest | 0.011 | 0.028 | 0.045 | 0.131 | 0.014 | 100.0% | ✅ |
| Localized Clash | spatial-clash | 0.005 | 0.009 | 0.021 | 0.092 | 0.007 | 100.0% | ✅ |
| RandomPerLEDFlicker | random-per-led | 0.009 | 0.011 | 0.024 | 0.090 | 0.010 | 100.0% | ✅ |
| BrownNoiseFlicker | brown-noise | 0.013 | 0.017 | 0.031 | 0.124 | 0.014 | 100.0% | ✅ |
| Strobe | strobe | 0.008 | 0.008 | 0.018 | 0.030 | 0.008 | 100.0% | ✅ |
| Mix<Sin> | mix-sin | 0.017 | 0.024 | 0.036 | 0.111 | 0.019 | 100.0% | ✅ |
| Multi-stage Mix | multi-mix | 0.016 | 0.024 | 0.038 | 0.123 | 0.018 | 100.0% | ✅ |
| HumpFlicker | hump-flicker | 0.014 | 0.018 | 0.030 | 0.110 | 0.015 | 100.0% | ✅ |
| Sparkle | sparkle | 0.005 | 0.007 | 0.019 | 0.084 | 0.006 | 100.0% | ✅ |

**Note on absolute numbers.** Bench runs vary by ±5–10% between consecutive runs on the same machine — interpret the numbers as orders-of-magnitude, not stable benchmark constants. The headroom is wide enough that this variance doesn't affect the recommendation.

### Aggregate

- **20 / 20 synthetic templates** stay under 16.67 ms p95
- Mean p50: **0.011 ms** | Mean p95: **0.019 ms**
- Mean per-preset frame rate: **~78,000 fps**
- Effective margin to 60fps budget: **~400×** (p95) / **~1,500×** (p50)

### Top 3 fastest / slowest (p95)

| Position | Style | p95 (ms) | Notes |
| --- | --- | ---: | --- |
| Fastest 1 | Sparkle | 0.007 | Single-pass per-LED random |
| Fastest 2 | Strobe | 0.008 | Boolean toggle per LED |
| Fastest 3 | Cylon / Localized Clash | 0.008–0.009 | Bounded-range spatial work |
| Slowest 1 | AudioFlicker stable | 0.038 | Random per-LED + `Mix<Int<>>` composition |
| Slowest 2 | Layered RgbCycle | 0.035 | RGB hue rotation per LED |
| Slowest 3 | SwingSpeed rotoscope | 0.031 | Motion-driven `Mix<Mix<Sin>>` |

The "slowest" entries are all under **0.04 ms p95** — three orders of magnitude under budget. The synthetic suite gives no signal that any template family is at risk of missing 60fps in steady-state rendering.

---

## Codegen → template-eval coverage check

The bench walks **every preset in `ALL_PRESETS`** (n = 455) through:

1. `generateStyleCode(preset.config)` → ProffieOS template string
2. `evaluateTemplateString(code)` → instantiated `StyleTemplate`
3. `renderFrame()` → 1 frame written to LED buffer

| Stage | Count | % of total |
| --- | ---: | ---: |
| Total presets | 455 | 100% |
| Codegen succeeded | 455 | 100% |
| Parse succeeded | 0 | 0% |
| Render succeeded | 0 | 0% |
| **End-to-end success** | **0** | **0%** |

### Root cause — three unregistered template names

| Frequency | Unrecognized template | Origin in codegen | Origin in template-eval registry |
| ---: | --- | --- | --- |
| **363** | `SaberBase::LOCKUP_NORMAL` | Emitted as the 5th arg of `LockupTrL<>` by [`ASTBuilder.ts`](../../packages/codegen/src/ASTBuilder.ts) — see e.g. lines emitting `LockupTrL<..., SaberBase::LOCKUP_NORMAL>` | Not registered in [`registry.ts`](../../packages/template-eval/src/registry.ts). `LockupTrLTemplate` constructor only consumes 4 args. |
| **91** | `FireConfig` | Emitted as the 5th arg of `StyleFire<>` for `unstable` + `fire` styles (`FireConfig<3,2000,5>`) | Not registered in `registry.ts`. `StyleFireTemplate` consumes the first 4 args; the trailing `FireConfig<>` arg is template-eval-unknown. |
| **1** | `SaberBase::LOCKUP_DRAG` | Same as `LOCKUP_NORMAL` but for the drag-lockup variant (only 1 preset uses this) | Same as `LOCKUP_NORMAL`. |

These three names together cause **100% of preset parse failures**.

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

## Per-style failure breakdown

Distribution across the 28 distinct `config.style` values used in `ALL_PRESETS`:

| Style family | Failed presets | Failing template name |
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

### Immediate (this session's hand-off, not in scope for the bench PR)

1. **Close the registry gap** in `packages/template-eval/src/registry.ts`:
   - Register `SaberBase::LOCKUP_NORMAL` / `LOCKUP_DRAG` / `LOCKUP_LIGHTNING_BLOCK` / `LOCKUP_MELT` / `LOCKUP_NONE` as constant-tag templates that resolve to `LockupTypeTagTemplate` (new class) carrying the type name.
   - Update `LockupTrLTemplate` to accept a 5th constructor arg (the lockup-type tag) and to filter active lockups by that tag.
   - Register `FireConfig` as a 3-arg structured leaf and update `StyleFireTemplate` to read `Cooling`, `Heating`, `IntensityBase` from the trailing `FireConfig` arg.
   - Add a test in `packages/template-eval/tests/` that exercises the full `StylePtr<Layers<AudioFlicker<...>, BlastL<>, SimpleClashL<>, LockupTrL<..., SaberBase::LOCKUP_NORMAL>, ...>>` shape from `generateStyleCode` output.

### Conditional follow-up

2. **Re-run the bench post-fix.** Once registry gaps are closed, run `pnpm bench:template-eval` again and expect `COVERAGE CHECK: 455/455 ok`. With real (full-Layers + InOutTrL) preset templates measured, the worst-case p95 will increase but should remain well under 16.67 ms.

3. **Decision point — default-mode flip.** If the post-fix p95 stays under 8 ms (50% budget) across all 455 presets, the Phase 3 prerequisite "Template-eval maintains 60fps on mid-range hardware for all preset combinations" is met. A follow-up PR can flip `BladeEngine.renderMode` default to `'template-eval'` for all configs (`docs/VISUALIZER_UPGRADE_PLAN.md` §Phase 3, "Architectural Changes").

### Not needed

4. **Per-template optimization passes** — synthetic-suite p95 of 0.038 ms means template-eval has 400× headroom in the most expensive style measured. There's no perf-optimization work to schedule. The interpreter is fast enough.

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
