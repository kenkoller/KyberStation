#!/usr/bin/env node
// ─── templateEvalBench — Phase 3 Step 1 perf benchmark ─────────────────
//
// Measures `@kyberstation/template-eval` interpreter throughput across a
// representative slice of the shipped preset gallery. Each preset is
// rendered for 600 frames (10 s @ 60 fps) with simulated motion; per-frame
// timings are collected and summarised (p50/p95/p99/max).
//
// The benchmark exists to support the Visualizer Upgrade Plan Phase 3
// prerequisite: "Template-eval maintains 60fps on mid-range hardware for
// all preset combinations." See docs/VISUALIZER_UPGRADE_PLAN.md §Phase 3.
//
// Usage (from repo root):
//   pnpm bench:template-eval
//   pnpm --filter @kyberstation/engine bench:template-eval
//
// Options (env vars):
//   BENCH_FRAMES   — frames per preset (default 600)
//   BENCH_OUTDIR   — output dir for JSON / CSV reports
//                    (default: packages/engine/perf/results)
//   BENCH_PRESETS  — comma-separated preset id list (overrides curated set)
//
// Output:
//   - JSON  → <outdir>/template-eval-bench-<ISO>.json
//   - CSV   → <outdir>/template-eval-bench-<ISO>.csv
//   - stdout summary table
//
// Coverage check (Step 4):
//   The script also walks every preset in `ALL_PRESETS` through the
//   `generateStyleCode → template-eval parser → 1-frame render` round-trip
//   and reports any presets that fail. This is the "no styles in codegen
//   output that template-eval can't handle" gate.
//
// Why .mjs and not .ts: matches the convention established by
// `packages/engine/scripts/generate-picker-gifs.mjs`. The engine's TS
// sources are consumed from their compiled dist/ artifacts so we don't
// pay the tsx loader tax — the bench loop's hot path stays comparable to
// what runs in the browser.

import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Module resolution ─────────────────────────────────────────────────
// The engine's dist/ folder must exist; if not, build it first. We
// resolve via the workspace package paths to keep this Node-runnable
// without symlinks bleeding.

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const ENGINE_DIST = resolve(REPO_ROOT, 'packages/engine/dist');
const TEMPLATE_EVAL_DIST = resolve(REPO_ROOT, 'packages/template-eval/dist');
const CODEGEN_DIST = resolve(REPO_ROOT, 'packages/codegen/dist');
const PRESETS_DIST = resolve(REPO_ROOT, 'packages/presets/dist');

function assertDistExists(distPath, packageName) {
  if (!existsSync(distPath)) {
    console.error(
      `${packageName} dist not found at ${distPath}.\n` +
      `Run \`pnpm --filter ${packageName} build\` first (or \`pnpm build\` from the repo root).`,
    );
    process.exit(1);
  }
}

assertDistExists(ENGINE_DIST, '@kyberstation/engine');
assertDistExists(TEMPLATE_EVAL_DIST, '@kyberstation/template-eval');
assertDistExists(CODEGEN_DIST, '@kyberstation/codegen');
assertDistExists(PRESETS_DIST, '@kyberstation/presets');

const { LEDArray } = await import(join(ENGINE_DIST, 'LEDArray.js'));
const { TemplateEvalBridge } = await import(
  join(ENGINE_DIST, 'templateEval/TemplateEvalBridge.js')
);
const { generateStyleCode } = await import(join(CODEGEN_DIST, 'index.js'));
const { ALL_PRESETS } = await import(join(PRESETS_DIST, 'index.js'));
// evaluateTemplateString is used for coverage diagnostics — the bridge's
// setTemplate() swallows parse exceptions to be friendly to runtime
// rendering. For the bench's coverage check we want the actual error,
// so we call the parser directly.
const { evaluateTemplateString } = await import(
  join(TEMPLATE_EVAL_DIST, 'index.js'),
);

// ─── Bench configuration ───────────────────────────────────────────────

const FRAMES_PER_PRESET = Number(process.env.BENCH_FRAMES ?? 600);
const FRAME_DELTA_MS = 1000 / 60; // 16.67ms
const FRAME_BUDGET_MS = 16.67;
const OUT_DIR = process.env.BENCH_OUTDIR
  ? resolve(process.env.BENCH_OUTDIR)
  : resolve(__dirname, 'results');

// ─── Curated preset slice ──────────────────────────────────────────────
//
// 20 presets selected to cover the breadth of style families the codegen
// supports. Coverage rationale:
//
//   stable / unstable / fire / pulse / rotoscope / gradient → core 6
//   photon / plasma / aurora / cinder / gravity / dataStream /
//     ember / helix / candle / shatter / neutron → distinct compositional
//     shapes worth measuring (each emits a different ProffieOS template)
//   gradient (Sith) → variant with `gradientEnd` for the gradient-end path
//   crystalShatter, automata → unusual mathematics in the per-LED loop
//
// The set was chosen by `style` field after enumerating
// `presets/src/characters/*.ts` (see `git grep "style: '"`); IDs are
// pinned to specific film/character presets so the timing reflects the
// configs actually shipped in v1.0.

// Build the curated set by style-family rather than hard-coded ids, so
// the bench is resilient to preset id renames. We pick the FIRST preset
// of each style family encountered when iterating ALL_PRESETS.
const STYLE_FAMILIES = [
  'stable', 'unstable', 'fire', 'pulse', 'rotoscope', 'gradient',
  'photon', 'plasma', 'aurora', 'cinder', 'gravity', 'dataStream',
  'ember', 'helix', 'candle', 'shatter', 'neutron', 'crystalShatter',
  'automata', 'prism',
];

function curatedSlice() {
  const out = [];
  const seen = new Set();
  for (const fam of STYLE_FAMILIES) {
    const hit = ALL_PRESETS.find((p) => p.config.style === fam);
    if (hit && !seen.has(hit.id)) {
      out.push(hit);
      seen.add(hit.id);
    }
  }
  return out;
}

// ─── Synthetic template suite ──────────────────────────────────────────
//
// When the codegen → template-eval round-trip is broken (e.g. parser
// gaps for `SaberBase::LOCKUP_NORMAL`, `FireConfig`, etc.) the curated
// preset slice can't produce perf numbers. This synthetic suite is
// hand-authored ProffieOS template strings that exercise the same
// runtime template families WITHOUT the unsupported tail args, so we
// can still measure template-eval per-frame cost. Treat the numbers as
// a lower bound for what real presets would cost once codegen → eval
// parity is restored.
//
// Each entry mirrors a `style` field from the preset config gallery.

const SYNTHETIC_TEMPLATES = [
  {
    id: 'synthetic-stable',
    name: 'Synthetic: AudioFlicker stable',
    style: 'stable',
    template: 'StylePtr<Layers<AudioFlicker<Rgb<0,135,255>,Mix<Int<16384>,Rgb<0,135,255>,White>>,BlastL<Rgb<255,255,200>>,SimpleClashL<Rgb<255,255,255>,40>>>()',
  },
  {
    id: 'synthetic-unstable',
    name: 'Synthetic: StyleFire unstable',
    style: 'unstable',
    template: 'StylePtr<Layers<StaticFire<Rgb<255,40,0>,Mix<Int<10000>,Rgb<255,40,0>,White>,0,4>,BlastL<Rgb<255,255,200>>,SimpleClashL<Rgb<255,255,255>,40>>>()',
  },
  {
    id: 'synthetic-fire',
    name: 'Synthetic: Fire',
    style: 'fire',
    template: 'StylePtr<Layers<StaticFire<Rgb<255,80,0>,Rgb<255,200,50>,0,3>,BlastL<Rgb<255,255,200>>,SimpleClashL<Rgb<255,255,255>,40>>>()',
  },
  {
    id: 'synthetic-pulse',
    name: 'Synthetic: Pulsing',
    style: 'pulse',
    template: 'StylePtr<Layers<Pulsing<Rgb<255,40,40>,Mix<Int<8000>,Rgb<255,40,40>,White>,3000>,BlastL<Rgb<255,255,200>>,SimpleClashL<Rgb<255,255,255>,40>>>()',
  },
  {
    id: 'synthetic-rotoscope',
    name: 'Synthetic: SwingSpeed rotoscope',
    style: 'rotoscope',
    template: 'StylePtr<Layers<Mix<SwingSpeed<400>,Rgb<0,135,255>,Mix<Sin<Int<3>>,Rgb<0,135,255>,Rgb<128,196,255>>>,BlastL<Rgb<255,255,200>>,SimpleClashL<Rgb<255,255,255>,40>>>()',
  },
  {
    id: 'synthetic-gradient',
    name: 'Synthetic: Gradient',
    style: 'gradient',
    template: 'StylePtr<Layers<Gradient<Rgb<0,40,255>,Rgb<255,128,40>>,BlastL<Rgb<255,255,200>>,SimpleClashL<Rgb<255,255,255>,40>>>()',
  },
  {
    id: 'synthetic-darksaber',
    name: 'Synthetic: Darksaber',
    style: 'darksaber',
    template: 'StylePtr<Layers<Gradient<White,Rgb<5,5,5>,Rgb<5,5,5>,White>,BlastL<Rgb<255,255,200>>,SimpleClashL<Rgb<255,255,255>,40>>>()',
  },
  {
    id: 'synthetic-layered-rgb-cycle',
    name: 'Synthetic: Layered RgbCycle',
    style: 'rgb-cycle',
    template: 'StylePtr<Layers<RgbCycle<Mult<Int<200>,Int<10>>>,BlastL<White>,SimpleClashL<White,40>>>()',
  },
  {
    id: 'synthetic-rainbow',
    name: 'Synthetic: Rainbow',
    style: 'rainbow',
    template: 'StylePtr<Layers<Rainbow<300,200,100>,BlastL<White>,SimpleClashL<White,40>>>()',
  },
  {
    id: 'synthetic-stripes',
    name: 'Synthetic: Stripes',
    style: 'stripes',
    template: 'StylePtr<Layers<Stripes<1000,3000,Red,Rgb<128,0,0>,Yellow,Rgb<128,64,0>>,BlastL<White>,SimpleClashL<White,40>>>()',
  },
  {
    id: 'synthetic-cylon',
    name: 'Synthetic: Cylon',
    style: 'cylon',
    template: 'StylePtr<Layers<Cylon<Rgb<255,0,0>,30,500>,BlastL<White>,SimpleClashL<White,40>>>()',
  },
  {
    id: 'synthetic-audioflicker-layer',
    name: 'Synthetic: AudioFlickerL nested',
    style: 'flicker-nest',
    template: 'StylePtr<Layers<Rgb<0,255,40>,AudioFlickerL<Rgb<200,255,200>>,BlastL<Rgb<255,255,200>>,SimpleClashL<White,40>>>()',
  },
  {
    id: 'synthetic-localized-clash',
    name: 'Synthetic: Localized Clash',
    style: 'spatial-clash',
    template: 'StylePtr<Layers<Rgb<0,135,255>,LocalizedClashL<White,40,30>,BlastL<Rgb<255,255,200>>>>()',
  },
  {
    id: 'synthetic-randomperled',
    name: 'Synthetic: RandomPerLEDFlicker',
    style: 'random-per-led',
    template: 'StylePtr<Layers<RandomPerLEDFlicker<Rgb<0,255,128>,Rgb<128,255,200>>,BlastL<White>,SimpleClashL<White,40>>>()',
  },
  {
    id: 'synthetic-brown-noise',
    name: 'Synthetic: BrownNoiseFlicker',
    style: 'brown-noise',
    template: 'StylePtr<Layers<BrownNoiseFlicker<Rgb<255,80,0>,Rgb<255,160,40>,300>,BlastL<White>,SimpleClashL<White,40>>>()',
  },
  {
    id: 'synthetic-strobe',
    name: 'Synthetic: Strobe',
    style: 'strobe',
    template: 'StylePtr<Layers<Strobe<Rgb<255,40,0>,White,40,100>,BlastL<White>,SimpleClashL<White,40>>>()',
  },
  {
    id: 'synthetic-mix-sin',
    name: 'Synthetic: Mix<Sin>',
    style: 'mix-sin',
    template: 'StylePtr<Layers<Mix<Sin<Int<2>,Int<5000>,Int<25000>>,Rgb<60,40,160>,Rgb<200,160,255>>,BlastL<White>,SimpleClashL<White,40>>>()',
  },
  {
    id: 'synthetic-multi-mix',
    name: 'Synthetic: Multi-stage Mix',
    style: 'multi-mix',
    template: 'StylePtr<Layers<Mix<BladeAngle<>,Mix<TwistAngle<>,Rgb<255,0,0>,Rgb<0,255,0>>,Mix<SwingSpeed<400>,Rgb<0,0,255>,Rgb<255,255,255>>>,BlastL<White>,SimpleClashL<White,40>>>()',
  },
  {
    id: 'synthetic-hump-flicker',
    name: 'Synthetic: HumpFlicker',
    style: 'hump-flicker',
    template: 'StylePtr<Layers<HumpFlicker<Rgb<0,200,255>,Rgb<200,240,255>,40>,BlastL<White>,SimpleClashL<White,40>>>()',
  },
  {
    id: 'synthetic-sparkle',
    name: 'Synthetic: Sparkle',
    style: 'sparkle',
    template: 'StylePtr<Layers<Sparkle<Rgb<0,255,255>,Rgb<255,255,255>>,BlastL<White>,SimpleClashL<White,40>>>()',
  },
];

// Wrap synthetic entries in a Preset-shaped object so the rest of the
// bench pipeline doesn't care about provenance. The `config.style`
// field carries the synthetic family name for the report table.

function syntheticPresets() {
  return SYNTHETIC_TEMPLATES.map((s) => ({
    id: s.id,
    name: s.name,
    config: {
      name: s.name,
      style: s.style,
      ledCount: 144,
      baseColor: { r: 0, g: 135, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 255, g: 255, b: 200 },
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 300,
      shimmer: 0,
    },
    __syntheticTemplate: s.template,
  }));
}

function envPresetSlice() {
  if (!process.env.BENCH_PRESETS) return null;
  const requested = process.env.BENCH_PRESETS.split(',').map((s) => s.trim());
  const out = [];
  for (const id of requested) {
    const hit = ALL_PRESETS.find((p) => p.id === id);
    if (!hit) {
      console.warn(`BENCH_PRESETS: unknown preset id "${id}" — skipping`);
      continue;
    }
    out.push(hit);
  }
  return out;
}

// ─── Motion simulation ─────────────────────────────────────────────────
//
// Drives swingSpeed / bladeAngle through smooth sinusoids so the
// per-frame work mirrors realistic in-app motion (not a static blade,
// which would underestimate cost for motion-reactive styles like
// rotoscope/AudioFlicker/SwingSpeed).

function simulatedMotion(frame) {
  const t = frame / 60; // seconds
  // 0.4 Hz swing with periodic spikes (clash-like) every ~3 s
  const baseSwing = 0.4 + 0.4 * Math.sin(2 * Math.PI * 0.4 * t);
  const spike = (frame % 180 < 5) ? 0.5 : 0;
  return {
    swingSpeed: Math.max(0, Math.min(1, baseSwing + spike)),
    bladeAngle: Math.sin(2 * Math.PI * 0.2 * t),       // -1..1
    twistAngle: Math.sin(2 * Math.PI * 0.15 * t + 1),  // -1..1
    soundLevel: 0.35 + 0.15 * Math.sin(2 * Math.PI * 0.7 * t),
  };
}

// ─── Stats helpers ─────────────────────────────────────────────────────

function quantile(sortedAsc, q) {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor(q * sortedAsc.length));
  return sortedAsc[idx];
}

function mean(arr) {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

// ─── Per-preset bench ──────────────────────────────────────────────────

function benchPreset(preset) {
  const ledCount = preset.config.ledCount ?? 144;
  const leds = new LEDArray(ledCount);
  const bridge = new TemplateEvalBridge();

  // Synthetic templates skip codegen — the template string is pre-baked
  // on the preset object. This is the fallback path when codegen →
  // template-eval round-trip is broken (the bench still produces
  // perf numbers for the templates that DO parse).
  let templateStr;
  if (preset.__syntheticTemplate) {
    templateStr = preset.__syntheticTemplate;
  } else {
    try {
      templateStr = generateStyleCode(preset.config);
    } catch (err) {
      return {
        preset,
        status: 'codegen-failed',
        error: String(err?.message ?? err),
      };
    }
  }

  // Compile template.
  let compileMs;
  try {
    const t0 = performance.now();
    const ok = bridge.setTemplate(templateStr);
    compileMs = performance.now() - t0;
    if (!ok) {
      return {
        preset,
        status: 'parse-failed',
        templateStr,
      };
    }
  } catch (err) {
    return {
      preset,
      status: 'parse-failed',
      templateStr,
      error: String(err?.message ?? err),
    };
  }

  // Warm-up — 10 frames to surface any JIT-compile / first-run cost out
  // of the measured window. Bench reports the steady-state cost.
  for (let f = 0; f < 10; f++) {
    const m = simulatedMotion(f);
    bridge.renderFrame(
      leds,
      FRAME_DELTA_MS,
      true,         // isOn
      1.0,          // extendProgress (fully ignited)
      m.swingSpeed,
      m.bladeAngle,
      m.twistAngle,
      m.soundLevel,
      1.0,          // battery full
      0,            // variation
    );
  }

  // Measured loop.
  const frameTimes = new Float64Array(FRAMES_PER_PRESET);
  for (let f = 0; f < FRAMES_PER_PRESET; f++) {
    const m = simulatedMotion(f);
    const t0 = performance.now();
    bridge.renderFrame(
      leds,
      FRAME_DELTA_MS,
      true,
      1.0,
      m.swingSpeed,
      m.bladeAngle,
      m.twistAngle,
      m.soundLevel,
      1.0,
      0,
    );
    frameTimes[f] = performance.now() - t0;
  }

  const sorted = Array.from(frameTimes).sort((a, b) => a - b);
  const p50 = quantile(sorted, 0.5);
  const p95 = quantile(sorted, 0.95);
  const p99 = quantile(sorted, 0.99);
  const max = sorted[sorted.length - 1];
  const min = sorted[0];
  const avg = mean(sorted);
  const fps60Frames = sorted.filter((t) => t <= FRAME_BUDGET_MS).length;
  const passes60fps = p95 <= FRAME_BUDGET_MS;

  return {
    preset,
    status: 'ok',
    ledCount,
    templateLength: templateStr.length,
    compileMs,
    avg,
    p50,
    p95,
    p99,
    max,
    min,
    fps60Frames,
    fps60Pct: fps60Frames / FRAMES_PER_PRESET,
    passes60fps,
    framesMeasured: FRAMES_PER_PRESET,
  };
}

// ─── Coverage check (Step 4) ───────────────────────────────────────────
//
// Walks every preset in the gallery and attempts:
//   1. generateStyleCode(preset.config)
//   2. bridge.setTemplate(code)
//   3. bridge.renderFrame() with 1 frame
// Reports any preset that fails any of the three steps.

function coverageCheck() {
  const failures = [];
  const leds = new LEDArray(144);
  const bridge = new TemplateEvalBridge();
  let codegenFails = 0;
  let parseFails = 0;
  let renderFails = 0;
  let ok = 0;

  for (const preset of ALL_PRESETS) {
    // Stage 1: codegen
    let templateStr;
    try {
      templateStr = generateStyleCode(preset.config);
    } catch (err) {
      codegenFails++;
      failures.push({
        id: preset.id,
        name: preset.name,
        style: preset.config.style,
        stage: 'codegen',
        error: String(err?.message ?? err),
      });
      continue;
    }

    // Stage 2: parse — call evaluateTemplateString directly so we capture
    // the real error message. The bridge's setTemplate() swallows
    // exceptions to keep runtime rendering robust, but for diagnostic
    // reporting we want to see what blew up.
    try {
      evaluateTemplateString(templateStr);
    } catch (err) {
      parseFails++;
      failures.push({
        id: preset.id,
        name: preset.name,
        style: preset.config.style,
        stage: 'parse',
        error: String(err?.message ?? err),
        templateStrPrefix: templateStr.slice(0, 200),
      });
      continue;
    }

    // Stage 3: render — use the bridge so we test the same wire-up the
    // engine actually goes through.
    bridge.reset();
    bridge.setTemplate(templateStr);
    try {
      bridge.renderFrame(leds, FRAME_DELTA_MS, true, 1.0, 0.3, 0, 0, 0.3, 1.0, 0);
      ok++;
    } catch (err) {
      renderFails++;
      failures.push({
        id: preset.id,
        name: preset.name,
        style: preset.config.style,
        stage: 'render',
        error: String(err?.message ?? err),
      });
    }
  }

  return {
    total: ALL_PRESETS.length,
    ok,
    codegenFails,
    parseFails,
    renderFails,
    failures,
  };
}

// ─── Report writers ────────────────────────────────────────────────────

function fmtMs(v) {
  return v.toFixed(3);
}

function printSummary(results, coverage) {
  console.log('');
  console.log('━'.repeat(110));
  console.log(
    'TEMPLATE-EVAL PERFORMANCE BENCHMARK — Phase 3 Step 1',
  );
  console.log('━'.repeat(110));
  console.log(`Frames per preset: ${FRAMES_PER_PRESET}  |  60fps budget: ${FRAME_BUDGET_MS}ms  |  Node: ${process.version}`);
  console.log('');

  const okResults = results.filter((r) => r.status === 'ok');
  const failedResults = results.filter((r) => r.status !== 'ok');

  // Per-preset table.
  console.log(
    '  ' + 'Preset'.padEnd(40) + 'Style'.padEnd(16) +
    'p50'.padStart(8) + 'p95'.padStart(8) + 'p99'.padStart(8) +
    'max'.padStart(8) + 'mean'.padStart(8) + '60fps'.padStart(9) + '  Pass',
  );
  console.log('  ' + '-'.repeat(108));
  for (const r of okResults) {
    const pct = `${(r.fps60Pct * 100).toFixed(1)}%`;
    const passLabel = r.passes60fps ? 'YES' : 'NO ';
    console.log(
      '  ' +
      r.preset.name.padEnd(40).slice(0, 40) +
      r.preset.config.style.padEnd(16).slice(0, 16) +
      fmtMs(r.p50).padStart(8) +
      fmtMs(r.p95).padStart(8) +
      fmtMs(r.p99).padStart(8) +
      fmtMs(r.max).padStart(8) +
      fmtMs(r.avg).padStart(8) +
      pct.padStart(9) +
      '  ' + passLabel,
    );
  }

  if (failedResults.length > 0) {
    console.log('');
    console.log('  Failed presets:');
    for (const r of failedResults) {
      console.log(`    - ${r.preset.id} (${r.preset.config.style}): ${r.status} ${r.error ?? ''}`);
    }
  }

  // Aggregate stats.
  if (okResults.length > 0) {
    const allP50 = okResults.map((r) => r.p50);
    const allP95 = okResults.map((r) => r.p95);
    const allFps60Pct = okResults.map((r) => r.fps60Pct);
    const passing = okResults.filter((r) => r.passes60fps).length;
    const meanFps = okResults.reduce((acc, r) => acc + (1000 / Math.max(0.01, r.avg)), 0) / okResults.length;
    console.log('');
    console.log('  AGGREGATE');
    console.log(`    Presets benchmarked: ${okResults.length}`);
    console.log(`    Passing p95 <= ${FRAME_BUDGET_MS}ms: ${passing}/${okResults.length}`);
    console.log(`    Mean p50 (across presets): ${fmtMs(mean(allP50))} ms`);
    console.log(`    Mean p95 (across presets): ${fmtMs(mean(allP95))} ms`);
    console.log(`    Mean frame-rate (per preset avg): ${meanFps.toFixed(1)} fps`);
    console.log(`    Mean fps60 share: ${(mean(allFps60Pct) * 100).toFixed(1)}%`);

    const slowest = [...okResults].sort((a, b) => b.p95 - a.p95).slice(0, 3);
    const fastest = [...okResults].sort((a, b) => a.p95 - b.p95).slice(0, 3);
    console.log('');
    console.log('  Top 3 fastest (lowest p95):');
    for (const r of fastest) {
      console.log(`    ${r.preset.config.style.padEnd(16)} ${r.preset.name.padEnd(34)} p95 ${fmtMs(r.p95)} ms`);
    }
    console.log('  Top 3 slowest (highest p95):');
    for (const r of slowest) {
      console.log(`    ${r.preset.config.style.padEnd(16)} ${r.preset.name.padEnd(34)} p95 ${fmtMs(r.p95)} ms`);
    }
  }

  // Coverage check.
  console.log('');
  console.log('  COVERAGE CHECK — codegen → template-eval round-trip');
  console.log(`    Total presets:    ${coverage.total}`);
  console.log(`    OK:               ${coverage.ok}`);
  console.log(`    codegen failures: ${coverage.codegenFails}`);
  console.log(`    parse failures:   ${coverage.parseFails}`);
  console.log(`    render failures:  ${coverage.renderFails}`);
  if (coverage.failures.length > 0) {
    const groupedByStyle = new Map();
    for (const f of coverage.failures) {
      const key = `${f.style} (${f.stage})`;
      groupedByStyle.set(key, (groupedByStyle.get(key) ?? 0) + 1);
    }
    console.log('    Failure breakdown by style/stage:');
    for (const [k, v] of groupedByStyle) {
      console.log(`      ${k}: ${v}`);
    }
  }
  console.log('━'.repeat(110));
  console.log('');
}

function toCsv(results, coverage) {
  const lines = [];
  lines.push('section,preset_id,preset_name,style,p50_ms,p95_ms,p99_ms,max_ms,avg_ms,frames_60fps,pct_60fps,passes_60fps,compile_ms,template_length,led_count,status,error');
  for (const r of results) {
    if (r.status !== 'ok') {
      lines.push([
        'bench', r.preset.id, csvEscape(r.preset.name), r.preset.config.style,
        '', '', '', '', '', '', '', '', '', '', '',
        r.status, csvEscape(r.error ?? ''),
      ].join(','));
    } else {
      lines.push([
        'bench', r.preset.id, csvEscape(r.preset.name), r.preset.config.style,
        r.p50.toFixed(4), r.p95.toFixed(4), r.p99.toFixed(4), r.max.toFixed(4),
        r.avg.toFixed(4), r.fps60Frames, r.fps60Pct.toFixed(4),
        r.passes60fps ? 'true' : 'false',
        r.compileMs.toFixed(4), r.templateLength, r.ledCount,
        'ok', '',
      ].join(','));
    }
  }
  for (const f of coverage.failures) {
    lines.push([
      'coverage', f.id, csvEscape(f.name), f.style,
      '', '', '', '', '', '', '', '', '', '', '',
      f.stage, csvEscape(f.error ?? ''),
    ].join(','));
  }
  return lines.join('\n');
}

function csvEscape(s) {
  if (typeof s !== 'string') return s ?? '';
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toJson(results, coverage) {
  return JSON.stringify({
    meta: {
      generatedAt: new Date().toISOString(),
      nodeVersion: process.version,
      platform: `${process.platform}-${process.arch}`,
      framesPerPreset: FRAMES_PER_PRESET,
      frameBudgetMs: FRAME_BUDGET_MS,
      frameDeltaMs: FRAME_DELTA_MS,
    },
    bench: results.map((r) => ({
      id: r.preset.id,
      name: r.preset.name,
      style: r.preset.config.style,
      status: r.status,
      ...(r.status === 'ok' ? {
        ledCount: r.ledCount,
        templateLength: r.templateLength,
        compileMs: r.compileMs,
        avg: r.avg,
        p50: r.p50,
        p95: r.p95,
        p99: r.p99,
        max: r.max,
        min: r.min,
        fps60Frames: r.fps60Frames,
        fps60Pct: r.fps60Pct,
        passes60fps: r.passes60fps,
        framesMeasured: r.framesMeasured,
      } : {
        error: r.error,
      }),
    })),
    coverage: {
      total: coverage.total,
      ok: coverage.ok,
      codegenFails: coverage.codegenFails,
      parseFails: coverage.parseFails,
      renderFails: coverage.renderFails,
      failures: coverage.failures,
    },
  }, null, 2);
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  // BENCH_MODE controls preset provenance:
  //   'preset'    — codegen → template-eval round-trip (curated 20)
  //   'synthetic' — hand-authored ProffieOS strings (20)
  //   'both'      — DEFAULT: both 20-preset bundles run back-to-back
  const mode = (process.env.BENCH_MODE ?? 'both').toLowerCase();
  const presetsToBench = [];
  if (process.env.BENCH_PRESETS) {
    const sliced = envPresetSlice();
    if (sliced && sliced.length > 0) presetsToBench.push(...sliced);
  } else {
    if (mode === 'preset' || mode === 'both') presetsToBench.push(...curatedSlice());
    if (mode === 'synthetic' || mode === 'both') presetsToBench.push(...syntheticPresets());
  }

  if (presetsToBench.length === 0) {
    console.error('No presets to bench — curated slice, synthetic suite, and BENCH_PRESETS all empty.');
    process.exit(1);
  }

  console.log(`Benchmarking ${presetsToBench.length} presets × ${FRAMES_PER_PRESET} frames  (mode: ${mode})`);
  console.log('');

  const results = [];
  for (const preset of presetsToBench) {
    process.stdout.write(`  ${preset.config.style.padEnd(16)} ${preset.name.padEnd(40).slice(0, 40)} ... `);
    const r = benchPreset(preset);
    results.push(r);
    if (r.status === 'ok') {
      const pct = (r.fps60Pct * 100).toFixed(1);
      process.stdout.write(`p95=${fmtMs(r.p95)}ms (${pct}% at 60fps)\n`);
    } else {
      process.stdout.write(`FAILED (${r.status})\n`);
    }
  }

  console.log('');
  console.log('Running codegen → template-eval coverage check across all ALL_PRESETS ...');
  const coverage = coverageCheck();
  console.log(`  ${coverage.ok}/${coverage.total} ok, ${coverage.codegenFails + coverage.parseFails + coverage.renderFails} failed`);

  // Write reports.
  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = join(OUT_DIR, `template-eval-bench-${stamp}.json`);
  const csvPath = join(OUT_DIR, `template-eval-bench-${stamp}.csv`);
  writeFileSync(jsonPath, toJson(results, coverage));
  writeFileSync(csvPath, toCsv(results, coverage));

  printSummary(results, coverage);

  console.log(`Reports written:`);
  console.log(`  ${jsonPath}`);
  console.log(`  ${csvPath}`);
  console.log('');

  // Exit 0 even when presets fail — this is a measurement, not a gate.
  // CI hooks should grep the JSON if they want pass/fail policy.
  process.exit(0);
}

main().catch((err) => {
  console.error('Bench failed:', err);
  process.exit(1);
});
