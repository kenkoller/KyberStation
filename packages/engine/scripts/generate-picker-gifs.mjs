#!/usr/bin/env node
// ─── generate-picker-gifs — Saber GIF Sprint 2 build script ────────────
//
// Renders one small animated GIF per ignition (19) and retraction (13)
// variant for the editor's MiniGalleryPicker thumbnails. Output goes to
// apps/web/public/picker-gifs/{ignition,retraction}/<id>.gif and is
// served as a static asset by Next.js.
//
// Usage:
//   pnpm --filter @kyberstation/engine gif:pickers
//   pnpm --filter @kyberstation/engine gif:pickers -- --variant=ignition
//   pnpm --filter @kyberstation/engine gif:pickers -- --only=spark,glitch
//
// Per Sprint 2 budget: 32 GIFs, target <50 KB each, 80×40 px, ~16 fps,
// ~1.0 s ignition window / ~1.0 s retraction window. Total disk delta
// after a regen is ~1 MB — small enough to commit if Ken wants the
// generated artifacts in git, otherwise keep gitignored and produce as
// part of the build.
//
// ─── Why this script lives in `packages/engine/scripts` ────────────────
//
// `captureSequence` is the engine's pure-data multi-frame helper. It
// has no DOM dependency. The renderer it feeds (`drawWorkbenchBlade`
// from apps/web/lib/sharePack/bladeRenderHeadless.ts) DOES need a
// canvas — when this script runs in plain Node we polyfill via the
// `@napi-rs/canvas` package, which is the modern node-native canvas
// implementation (faster + no system libs vs the legacy `canvas` pkg).
//
// We import from the engine's source TypeScript via tsx; the renderer
// from apps/web is a relative path. Both rely on the workspace's
// existing tsconfig + module-resolution setup.
//
// ─── Why `gif.js` doesn't run here ─────────────────────────────────────
//
// `gif.js` ships a Web Worker entry point — its core encoder is a
// browser script. In Node it tries to construct `new Worker(...)`
// against a non-existent global. Rather than monkey-patching that
// env, we use `gifenc` (a tiny pure-JS GIF89a encoder, ESM, no DOM)
// for the build-time path. The browser-side `gifEncoder` wrapper that
// Sprint 1 shipped is unchanged — runtime in-app GIF saves still go
// through gif.js + a real Worker.
//
// Encoder choice writeup: gifenc supports indexed-color frames + per-
// frame delays + global palette quantization. Frame-rate budget at
// 80×40 × 16fps × 16 frames ≈ 0.8 MP per GIF — well within gifenc's
// happy path.
//
// ─── How to regenerate ────────────────────────────────────────────────
//
// 1. Add or rename a transition in `apps/web/lib/transitionCatalogs.ts`
// 2. Run `pnpm --filter @kyberstation/engine gif:pickers`
// 3. Verify the new file in `apps/web/public/picker-gifs/...`
// 4. (Optional) commit the generated GIF alongside the catalog change

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Path setup ────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const OUTPUT_ROOT = join(REPO_ROOT, 'apps', 'web', 'public', 'picker-gifs');

// ─── CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flagValue(name) {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}
const variantFilter = flagValue('variant'); // 'ignition' | 'retraction' | null
const onlyFilter = flagValue('only'); // 'standard,spark' | null
const allowList = onlyFilter
  ? new Set(onlyFilter.split(',').map((s) => s.trim()).filter(Boolean))
  : null;

// ─── Capture geometry ──────────────────────────────────────────────────
//
// Small thumbnails — 80×40 keeps the file under the 50 KB target and
// matches the existing static SVG thumbnail aspect (100×60 viewBox →
// roughly 5:3, but the picker grid renders these at 60 px tall with
// flex-fit width, so the rasterizer aspect doesn't have to match
// exactly; what matters is the LED-strip representation is recognizable
// at thumbnail size).

const GIF_WIDTH = 80;
const GIF_HEIGHT = 40;
const GIF_FPS = 16;
const IGNITION_DURATION_MS = 1100;
const RETRACTION_DURATION_MS = 1100;

// Blade strip — leave a small margin on left for the "hilt", rest is
// LED strip. Keeps the visual density consistent across variants.
const BLADE_START_PX = 12;
const BLADE_LEN_PX = GIF_WIDTH - BLADE_START_PX - 4; // 64 px strip
const BLADE_Y_PX = GIF_HEIGHT / 2;
const CORE_H_PX = 14; // capsule thickness — radius 7 px

// Default LED count for the small-card render. Smaller than the 132
// canonical because at 80 px wide we can't resolve more than ~64 LEDs
// per pixel anyway.
const LED_COUNT = 48;

// Standard Obi-Wan blue baseline — viewers should see a recognizable
// saber instantly without per-variant color tuning. The renderer's
// glow profile picks blue's tuning automatically from the average lit
// LED color.
const BASE_CONFIG_TEMPLATE = {
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 80 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  // ignition / retraction filled in per-variant
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 600,
  retractionMs: 600,
  shimmer: 0.12,
  ledCount: LED_COUNT,
};

// ─── Lazy module loader ────────────────────────────────────────────────
//
// We wrap the dynamic-import block in a function so the script can
// short-circuit + emit a friendly error if `@napi-rs/canvas` or
// `gifenc` aren't installed yet. Both are devDependencies declared in
// `packages/engine/package.json`.

async function loadDeps() {
  let napiCanvas;
  try {
    napiCanvas = await import('@napi-rs/canvas');
  } catch {
    throw new Error(
      [
        '`@napi-rs/canvas` is not installed.',
        'Add it as a devDependency in packages/engine/package.json:',
        '   pnpm --filter @kyberstation/engine add -D @napi-rs/canvas gifenc tsx',
        'then re-run this script.',
      ].join('\n'),
    );
  }

  let gifenc;
  try {
    gifenc = await import('gifenc');
  } catch {
    throw new Error(
      [
        '`gifenc` is not installed.',
        'Add it as a devDependency in packages/engine/package.json:',
        '   pnpm --filter @kyberstation/engine add -D gifenc',
        'then re-run this script.',
      ].join('\n'),
    );
  }

  // Engine + renderer — these live in the workspace, so the import path
  // is filesystem-relative. Run with `tsx` so the source TypeScript can
  // be loaded directly without a build step.
  const enginePath = pathToFileUrl(
    join(REPO_ROOT, 'packages', 'engine', 'src', 'index.ts'),
  );
  const rendererPath = pathToFileUrl(
    join(
      REPO_ROOT,
      'apps',
      'web',
      'lib',
      'sharePack',
      'bladeRenderHeadless.ts',
    ),
  );

  let engineMod, rendererMod;
  try {
    engineMod = await import(enginePath);
  } catch (err) {
    throw new Error(
      [
        'Failed to dynamically import @kyberstation/engine source.',
        'Run this script via `tsx` (already added as a dev dep):',
        '   pnpm --filter @kyberstation/engine gif:pickers',
        '',
        'Underlying error:',
        String(err && err.message ? err.message : err),
      ].join('\n'),
    );
  }
  try {
    rendererMod = await import(rendererPath);
  } catch (err) {
    throw new Error(
      [
        'Failed to dynamically import bladeRenderHeadless.ts.',
        'It lives at apps/web/lib/sharePack/bladeRenderHeadless.ts and is',
        'tsx-loadable. Confirm tsx is installed in the engine package.',
        '',
        'Underlying error:',
        String(err && err.message ? err.message : err),
      ].join('\n'),
    );
  }

  return { napiCanvas, gifenc, engineMod, rendererMod };
}

function pathToFileUrl(p) {
  // file:// URLs need three slashes on POSIX (`file:///abs/path`).
  // node:url fileURLToPath handles the inverse but a tiny inline helper
  // dodges importing `pathToFileURL` from a less-common subpath.
  const normalized = p.replace(/\\/g, '/');
  return `file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

// ─── Variant catalogs ──────────────────────────────────────────────────
//
// Mirror of `apps/web/lib/transitionCatalogs.ts`. We don't import the TS
// source here because it lives under apps/web and would pull in JSX +
// the React tooling. The list is short, stable, and any drift will be
// caught by the test seam (`pickerGifs.test.ts`) which iterates the real
// catalog and checks for expected output paths.

const IGNITION_IDS = [
  'standard', 'scroll', 'spark', 'center', 'wipe',
  'stutter', 'glitch', 'twist', 'swing', 'stab',
  'crackle', 'fracture', 'flash-fill', 'pulse-wave', 'drip-up',
  'hyperspace', 'summon', 'seismic', 'custom-curve',
];

const RETRACTION_IDS = [
  'standard', 'scroll', 'fadeout', 'center', 'shatter',
  'dissolve', 'flickerOut', 'unravel', 'drain', 'implode',
  'evaporate', 'spaghettify', 'custom-curve',
];

// ─── Main pipeline ─────────────────────────────────────────────────────

async function main() {
  console.log('▌ saber GIF sprint 2 — picker thumbnail generator');
  console.log('  output: %s', OUTPUT_ROOT);
  console.log('  size:   %d×%d @ %dfps', GIF_WIDTH, GIF_HEIGHT, GIF_FPS);

  const { napiCanvas, gifenc, engineMod, rendererMod } = await loadDeps();

  const { captureSequence } = engineMod;
  const { drawWorkbenchBlade, ledBufferFrom } = rendererMod;
  if (!captureSequence || !drawWorkbenchBlade) {
    throw new Error(
      'Required exports missing: captureSequence / drawWorkbenchBlade.',
    );
  }

  // Make output directories.
  const ignitionDir = join(OUTPUT_ROOT, 'ignition');
  const retractionDir = join(OUTPUT_ROOT, 'retraction');
  for (const dir of [ignitionDir, retractionDir]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  const targets = [];
  if (!variantFilter || variantFilter === 'ignition') {
    for (const id of IGNITION_IDS) {
      if (allowList && !allowList.has(id)) continue;
      targets.push({ kind: 'ignition', id });
    }
  }
  if (!variantFilter || variantFilter === 'retraction') {
    for (const id of RETRACTION_IDS) {
      if (allowList && !allowList.has(id)) continue;
      targets.push({ kind: 'retraction', id });
    }
  }

  if (targets.length === 0) {
    console.error('No targets matched filters. Aborting.');
    process.exit(1);
  }

  console.log('  targets: %d total', targets.length);

  let totalBytes = 0;
  for (const { kind, id } of targets) {
    const gifBytes = await renderOne(
      kind,
      id,
      { napiCanvas, gifenc, captureSequence, drawWorkbenchBlade, ledBufferFrom },
    );
    const dir = kind === 'ignition' ? ignitionDir : retractionDir;
    const filePath = join(dir, `${id}.gif`);
    writeFileSync(filePath, gifBytes);
    totalBytes += gifBytes.length;
    const kb = (gifBytes.length / 1024).toFixed(1);
    console.log(`  ✓ ${kind}/${id}.gif  (${kb} KB)`);
  }

  console.log(
    '\n▌ done — %d GIFs, %.1f KB total (avg %.1f KB / file)',
    targets.length,
    totalBytes / 1024,
    totalBytes / 1024 / targets.length,
  );
}

// ─── Per-target rendering ──────────────────────────────────────────────

async function renderOne(kind, id, deps) {
  const {
    napiCanvas,
    gifenc,
    captureSequence,
    drawWorkbenchBlade,
    ledBufferFrom,
  } = deps;

  // Build a per-variant config. Both ignition + retraction sit on the
  // same captureSequence path ('ignition-cycle' covers both), but we
  // wire the variant-of-interest into config.{ignition,retraction}.
  const config = { ...BASE_CONFIG_TEMPLATE };
  if (kind === 'ignition') {
    config.ignition = id;
    // Keep retraction simple so the on-the-tail retraction frames don't
    // distract from the ignition's signature shape.
    config.retraction = 'standard';
    // Shorten the retraction so the tail-of-clip doesn't dominate.
    config.retractionMs = 200;
  } else {
    // For retractions we want the retract phase to be the visual focus.
    // Use a fast standard ignition so the ON-hold is short.
    config.ignition = 'standard';
    config.ignitionMs = 200;
    config.retraction = id;
    config.retractionMs = 600;
  }

  // captureSequence with mode 'ignition-cycle' produces the full
  // PREON → IGNITING → ON-hold → RETRACTING → OFF arc. For ignition
  // GIFs we trim to the front portion; for retractions we trim to the
  // back portion.
  const durationMs =
    kind === 'ignition' ? IGNITION_DURATION_MS : RETRACTION_DURATION_MS;

  // Capture a sequence covering the full arc. We slice the appropriate
  // window after the fact so the visible "story" centers on the variant
  // we're showing off.
  //
  // Total arc length = ignitionMs + 100ms ON-hold + retractionMs + tail.
  const fullArcMs =
    (config.ignitionMs ?? 300) +
    100 +
    (config.retractionMs ?? 500) +
    100; // tail
  const frames = captureSequence({
    mode: 'ignition-cycle',
    config,
    fps: GIF_FPS,
    durationMs: fullArcMs,
  });

  // Slice the visible window. For ignition: first ~1.1s. For retraction:
  // last ~1.1s. Ignition GIFs can include a couple of fully-extended
  // frames at the end; retraction GIFs should start from a fully-lit
  // blade so the transition out reads cleanly.
  const totalFrames = frames.length;
  const wantFrames = Math.max(
    1,
    Math.round((durationMs / 1000) * GIF_FPS),
  );
  let visibleFrames;
  if (kind === 'ignition') {
    visibleFrames = frames.slice(0, Math.min(wantFrames, totalFrames));
  } else {
    const startIdx = Math.max(0, totalFrames - wantFrames);
    visibleFrames = frames.slice(startIdx);
  }

  // ─── Per-frame headless render → indexed-color ─────────────────────
  //
  // For each frame: rasterize via drawWorkbenchBlade onto a
  // @napi-rs/canvas canvas, snapshot pixels, build an indexed image
  // for gifenc.

  const { createCanvas } = napiCanvas;
  const { GIFEncoder, quantize, applyPalette } = gifenc;

  // Reuse a single canvas — the per-frame draw clears and rerenders.
  const canvas = createCanvas(GIF_WIDTH, GIF_HEIGHT);
  const ctx = canvas.getContext('2d');

  const encoder = GIFEncoder();
  // Per-frame delay in 1/100 s. gif.js also uses this unit (delay).
  const delayCs = Math.max(1, Math.round(100 / GIF_FPS));

  for (const ledBuffer of visibleFrames) {
    // Background — opaque dark grey. The picker shows these at
    // bg-bg-deep behind, so the viewer never sees the GIF's own
    // background as an isolated rectangle.
    ctx.save();
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, GIF_WIDTH, GIF_HEIGHT);
    ctx.restore();

    drawWorkbenchBlade(ctx, ledBufferFrom(ledBuffer), {
      bladeStartPx: BLADE_START_PX,
      bladeLenPx: BLADE_LEN_PX,
      bladeYPx: BLADE_Y_PX,
      coreH: CORE_H_PX,
      cw: GIF_WIDTH,
      ch: GIF_HEIGHT,
      // Tighter halo at thumbnail scale — full bloom radii would push
      // colour onto neighbouring picker cells.
      reduceBloom: false,
    });

    // Pull RGBA from the canvas. @napi-rs/canvas matches the browser
    // 2D API, so this is the same call shape as the live editor.
    const imgData = ctx.getImageData(0, 0, GIF_WIDTH, GIF_HEIGHT);
    const rgba = imgData.data;

    // Palette per frame — 64 colors keeps each frame tight (~6 bits/px).
    // For multi-frame loops gifenc supports global palettes, but the
    // glow halo varies enough between PREON / IGNITING / ON that
    // per-frame palettes give better visual fidelity at the same total
    // byte budget.
    const palette = quantize(rgba, 64);
    const indexed = applyPalette(rgba, palette);

    encoder.writeFrame(indexed, GIF_WIDTH, GIF_HEIGHT, {
      palette,
      delay: delayCs * 10, // gifenc takes ms — 10ms × cs unit count
    });
  }

  encoder.finish();
  return Buffer.from(encoder.bytes());
}

// ─── Entry ─────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('\n✖ generation failed:');
  console.error(err);
  process.exitCode = 1;
});
