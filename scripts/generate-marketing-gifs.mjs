#!/usr/bin/env node
/**
 * generate-marketing-gifs.mjs — Saber GIF Sprint 3 build script
 *
 * Renders the three Tier-2 marketing showcase GIFs from the saber-GIF
 * roadmap (`docs/SABER_GIF_ROADMAP.md`):
 *
 *   1. style-grid.gif   — montage of 12 styles tiled 4×3, each cycling
 *                         ~1.4s of its signature motion. 1200×675.
 *   2. color-cycle.gif  — single horizontal saber cycling 10 canonical
 *                         colors with smooth transitions. 1200×675.
 *   3. lockup-loop.gif  — single ignited saber with mid-blade lockup
 *                         hotspot pulsing. 1200×675.
 *
 * Aimed at Reddit / Twitter / blog post embeds — high impact, premium
 * polish, sized to fit social-media compression budgets.
 *
 * Usage:
 *   node scripts/generate-marketing-gifs.mjs              # all three
 *   node scripts/generate-marketing-gifs.mjs --only=style-grid
 *   node scripts/generate-marketing-gifs.mjs --only=color-cycle,lockup-loop
 *
 * Output: apps/web/public/marketing/{style-grid,color-cycle,lockup-loop}.gif
 *
 * Hard constraints (per Sprint 3 brief):
 *   • No new npm deps. Uses `canvas` (already a devDep for the renderer
 *     golden-hash harness, PR #147) and gif.js (Sprint 1).
 *   • Idempotent: re-running overwrites existing output cleanly.
 *   • Engine built JS from `packages/engine/dist` is the source of
 *     truth — script does not import the source TypeScript directly.
 *
 * Why a vendored GIF encoder lives here, not the gif.js npm pkg:
 *   gif.js's main-thread bundle is `new Worker(...)` — Web-Worker only.
 *   Its core encoder (NeuQuant color quantizer, LZW writer, GIFEncoder)
 *   lives in the worker script. We use those classes directly here so
 *   the GIF89a output is byte-identical with what Sprint 1's in-app
 *   encoder produces. `vendor/gif-encoder.mjs` is a one-time port of
 *   that worker's encoder code; license + provenance documented at
 *   the top of that file.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { existsSync as preExistsSync } from 'node:fs';
import { dirname as preDirname, resolve as preResolve } from 'node:path';
import { fileURLToPath as preFileURLToPath } from 'node:url';

import { createCanvas } from 'canvas';

// Engine — uses built JS, not source TS, so no tsx required. The
// script may be invoked from a git worktree (which has no
// `packages/engine/dist`) OR from the main repo working tree (which
// does). We resolve the built engine dynamically by walking up from
// here until we find a `packages/engine/dist/index.js` that exists.
const _scriptDir = preDirname(preFileURLToPath(import.meta.url));
function findEngineDist() {
  let cur = _scriptDir;
  for (let i = 0; i < 10; i++) {
    const candidate = preResolve(cur, 'packages/engine/dist/index.js');
    if (preExistsSync(candidate)) return candidate;
    const parent = preDirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  throw new Error(
    'Could not find packages/engine/dist/index.js. Run `pnpm --filter @kyberstation/engine build` first.',
  );
}
const _enginePath = findEngineDist();
const { BladeEngine, BladeState, captureSequence } = await import(
  _enginePath
);

// Vendored GIF encoder (gif.js worker port) and blade renderer (1:1
// pure-JS port of apps/web/lib/sharePack/bladeRenderHeadless.ts).
import { GIFEncoder } from './vendor/gif-encoder.mjs';
import { drawWorkbenchBlade, ledBufferFrom } from './vendor/blade-render.mjs';

// ─── Path setup ────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = join(REPO_ROOT, 'apps', 'web', 'public', 'marketing');

// ─── CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flagValue(name) {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}
const onlyFilter = flagValue('only');
const allowList = onlyFilter
  ? new Set(onlyFilter.split(',').map((s) => s.trim()).filter(Boolean))
  : null;

// ─── Shared geometry + visual config ───────────────────────────────────

const W = 1200;
const H = 675;
const FPS = 18;
const BG = '#0a0a10';
const QUALITY = 10;

// Default LED count for marketing renders. The headless renderer uses
// per-LED capsule rasterization, so this controls the strip resolution
// rather than physical strip pitch — 132 keeps it visually identical
// to the workbench preview's default bucket without driving up frame
// memory.
const LED_COUNT = 132;

// Single-saber baseline used by color-cycle and lockup-loop. Matches
// the workbench preview's default Obi-Wan blue + canonical timing.
const SINGLE_BASE_CONFIG = {
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 80 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 400,
  shimmer: 0.12,
  ledCount: LED_COUNT,
};

// ─── Targets registry ──────────────────────────────────────────────────

const targets = [
  { id: 'style-grid', fn: renderStyleGrid },
  { id: 'color-cycle', fn: renderColorCycle },
  { id: 'lockup-loop', fn: renderLockupLoop },
];

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const wantTargets = allowList
    ? targets.filter((t) => allowList.has(t.id))
    : targets;
  if (wantTargets.length === 0) {
    console.error(`No targets matched --only=${onlyFilter}`);
    process.exitCode = 1;
    return;
  }

  console.log('▌ saber GIF sprint 3 — Tier-2 marketing showcases');
  console.log(`  output:  ${OUTPUT_DIR}`);
  console.log(`  targets: ${wantTargets.map((t) => t.id).join(', ')}`);
  console.log('');

  const t0 = performance.now();
  const results = [];
  for (const target of wantTargets) {
    const tStart = performance.now();
    process.stdout.write(`▌ ${target.id} … `);
    const gifBytes = target.fn();
    const outPath = join(OUTPUT_DIR, `${target.id}.gif`);
    writeFileSync(outPath, gifBytes);
    const elapsed = ((performance.now() - tStart) / 1000).toFixed(2);
    const kb = (gifBytes.length / 1024).toFixed(1);
    const mb = (gifBytes.length / 1024 / 1024).toFixed(2);
    console.log(`${kb} KB (${mb} MB) in ${elapsed}s`);
    results.push({ id: target.id, bytes: gifBytes.length, elapsed: Number(elapsed) });
  }

  const totalElapsed = ((performance.now() - t0) / 1000).toFixed(2);
  const totalBytes = results.reduce((sum, r) => sum + r.bytes, 0);
  console.log('');
  console.log(`▌ done — ${results.length} GIFs, ${(totalBytes / 1024 / 1024).toFixed(2)} MB total, ${totalElapsed}s wall clock`);
}

// ─── Helpers ───────────────────────────────────────────────────────────

function fillBackground(ctx, w, h) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  // Subtle vignette so the GIF reads on darker social-media backdrops.
  const grad = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.15,
    w / 2, h / 2, Math.max(w, h) * 0.7,
  );
  grad.addColorStop(0, 'rgba(20, 24, 38, 0.20)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawHilt(ctx, x, y, hiltLength, hiltHeight) {
  // Simple grayscale hilt. The blade extends to the right of (x + hiltLength).
  const cx = x;
  const cy = y;
  const w = hiltLength;
  const h = hiltHeight;

  // Body
  ctx.fillStyle = '#3a3e48';
  ctx.fillRect(cx, cy - h / 2, w, h);

  // Grip rings
  ctx.fillStyle = '#1f2229';
  const ringCount = 4;
  for (let i = 0; i < ringCount; i++) {
    const rx = cx + (w * (i + 1)) / (ringCount + 1);
    ctx.fillRect(rx - 1, cy - h / 2, 2, h);
  }

  // Pommel + emitter caps
  ctx.fillStyle = '#5a606b';
  const capW = 8;
  ctx.fillRect(cx, cy - h / 2 - 2, capW, h + 4); // pommel (left)
  ctx.fillRect(cx + w - capW, cy - h / 2 - 4, capW, h + 8); // emitter (right)
}

function drawTitleStrip(ctx, lines, w, h) {
  // Tiny corner watermark — keeps focus on the saber itself.
  ctx.save();
  ctx.font = '500 16px "JetBrains Mono", "Menlo", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let y = 24;
  for (const line of lines) {
    ctx.fillText(line, 32, y);
    y += 22;
  }
  ctx.restore();
  // Tag in opposing corner.
  ctx.save();
  ctx.font = '500 14px "JetBrains Mono", "Menlo", monospace';
  ctx.fillStyle = 'rgba(0, 140, 255, 0.7)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('KYBERSTATION', w - 32, h - 28);
  ctx.restore();
}

/**
 * Pull RGBA pixel data out of a node-canvas context as a Uint8Array
 * suitable for the gif-encoder. Cairo returns pre-multiplied alpha but
 * since we pre-fill an opaque BG every frame the alpha channel is
 * 0xFF everywhere, so the pre-multiplication is a no-op for our use.
 */
function rgbaFromCanvas(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  return img.data;
}

// ─── 1) style-grid ─────────────────────────────────────────────────────
//
// Tiled montage of distinctive blade styles. We pick 12 styles that
// each have a clear signature visual at idle, lay them out in a 4×3
// grid, render a 1.4-second idle window per cell, and stitch all 12
// into one synchronized loop. Every cell uses the same Obi-Wan azure
// baseline so users see the STYLE difference (not color difference).

const STYLE_GRID_CELLS = [
  { style: 'stable',         label: 'Stable' },
  { style: 'pulse',          label: 'Pulse' },
  { style: 'unstable',       label: 'Unstable' },
  { style: 'fire',           label: 'Fire' },
  { style: 'aurora',         label: 'Aurora' },
  { style: 'crystalShatter', label: 'Crystal Shatter' },
  { style: 'cinder',         label: 'Cinder' },
  { style: 'helix',          label: 'Helix' },
  { style: 'gravity',        label: 'Gravity' },
  { style: 'ember',          label: 'Ember' },
  { style: 'photon',         label: 'Photon' },
  { style: 'plasma',         label: 'Plasma' },
];

function renderStyleGrid() {
  const cols = 4;
  const rows = 3;
  const padX = 24;
  const padY = 60;
  const labelH = 28;
  const cellW = (W - padX * (cols + 1)) / cols;
  const cellH = (H - padY - 24 - rows * labelH) / rows; // top header + rows
  const headerH = padY;

  // Capture per-cell engine sequences once. They're all idle-loops so
  // they share frame-count and FPS — easy to sync.
  const durationMs = 1400;
  const frameCount = Math.round((durationMs / 1000) * FPS);
  console.log(`  (style-grid: ${STYLE_GRID_CELLS.length} cells, ${frameCount} frames @ ${FPS}fps)`);

  const cellSequences = STYLE_GRID_CELLS.map((cell) => {
    const config = { ...SINGLE_BASE_CONFIG, style: cell.style };
    return captureSequence({
      mode: 'idle-loop',
      config,
      fps: FPS,
      durationMs,
    });
  });

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const encoder = new GIFEncoder(W, H);
  encoder.setRepeat(0);
  encoder.setDelay(Math.round(1000 / FPS));
  encoder.setQuality(QUALITY);
  encoder.start();

  // Position helper: cell (col, row) → top-left corner (in canvas px).
  function cellOrigin(col, row) {
    const x = padX + col * (cellW + padX);
    const y = headerH + row * (cellH + labelH);
    return { x, y };
  }

  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    fillBackground(ctx, W, H);

    // Header
    ctx.save();
    ctx.font = '500 22px "JetBrains Mono", "Menlo", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('STYLE GALLERY · 12 of 34', 32, 22);
    ctx.font = '500 14px "JetBrains Mono", "Menlo", monospace';
    ctx.fillStyle = 'rgba(0, 140, 255, 0.78)';
    ctx.textAlign = 'right';
    ctx.fillText('KYBERSTATION', W - 32, 26);
    ctx.restore();

    // Render each cell.
    for (let i = 0; i < STYLE_GRID_CELLS.length; i++) {
      const cell = STYLE_GRID_CELLS[i];
      const col = i % cols;
      const row = (i / cols) | 0;
      const { x: cellX, y: cellY } = cellOrigin(col, row);

      // Cell border + label
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cellX + 0.5, cellY + 0.5, cellW, cellH);

      ctx.font = '500 12px "JetBrains Mono", "Menlo", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(cell.label, cellX + 8, cellY + cellH + 6);
      ctx.restore();

      // Blade — laid horizontally inside the cell. The hilt is a tiny
      // grayscale block at the left; the blade fills the rest.
      const hiltW = 22;
      const hiltH = 8;
      const inset = 14;
      const bladeStartPx = cellX + inset + hiltW;
      const bladeLenPx = cellW - inset * 2 - hiltW;
      const bladeYPx = cellY + cellH * 0.45;
      const coreH = 12;

      // Hilt
      drawHilt(ctx, cellX + inset, bladeYPx, hiltW, hiltH);

      // Blade
      const ledBuffer = cellSequences[i][frameIdx];
      drawWorkbenchBlade(ctx, ledBufferFrom(ledBuffer), {
        bladeStartPx,
        bladeLenPx,
        bladeYPx,
        coreH,
        cw: W,
        ch: H,
        bladeComposite: 'lighter',
      });
    }

    encoder.addFrame(rgbaFromCanvas(ctx, W, H));
  }

  encoder.finish();
  return Buffer.from(encoder.bytes());
}

// ─── 2) color-cycle ────────────────────────────────────────────────────
//
// Single horizontal saber that smoothly transitions through 10 canonical
// colors. Loops cleanly. Each color holds for ~0.7s with ~0.3s
// crossfade between adjacent colors.

const COLOR_CYCLE_PALETTE = [
  { name: 'Obi-Wan Azure',   color: { r: 0,   g: 140, b: 255 } },
  { name: 'Vader Crimson',   color: { r: 255, g: 32,  b: 24  } },
  { name: 'Yoda Verdant',    color: { r: 32,  g: 220, b: 60  } },
  { name: 'Mace Amethyst',   color: { r: 170, g: 60,  b: 240 } },
  { name: 'Rey Sunburst',    color: { r: 255, g: 200, b: 30  } },
  { name: 'Ahsoka Sunfire',  color: { r: 255, g: 140, b: 30  } },
  { name: 'Plo Koon Sky',    color: { r: 0,   g: 200, b: 220 } },
  { name: 'Kylo Unstable',   color: { r: 255, g: 60,  b: 50  } },
  { name: 'Luke Emerald',    color: { r: 60,  g: 240, b: 80  } },
  { name: 'Cere Pale Blue',  color: { r: 100, g: 180, b: 255 } },
];

function renderColorCycle() {
  const totalDurationMs = 8000;
  const frameCount = Math.round((totalDurationMs / 1000) * FPS);
  console.log(`  (color-cycle: ${COLOR_CYCLE_PALETTE.length} colors, ${frameCount} frames @ ${FPS}fps)`);

  // We drive the engine ourselves — captureSequence produces a single
  // config's idle loop, but here we want to mutate config.baseColor
  // smoothly per frame. Cleanest path: instantiate an engine, ignite,
  // settle, then per-frame update with an interpolated config.
  const engine = new BladeEngine();
  const baseConfig = { ...SINGLE_BASE_CONFIG };
  engine.ignite(baseConfig);
  // Settle until ON.
  const settleMs = (baseConfig.preonEnabled ? (baseConfig.preonMs ?? 0) : 0)
    + (baseConfig.ignitionMs ?? 300) + 120;
  for (let t = 0; t < settleMs; t += 1000 / FPS) {
    engine.update(1000 / FPS, baseConfig);
  }

  // Per-frame interpolated colors. We ride a continuous t∈[0..N) where
  // N = palette length, with t looping back to 0 at the end. The
  // current segment is floor(t), the within-segment lerp is frac(t).
  const colorPerFrame = [];
  const labelPerFrame = [];
  const N = COLOR_CYCLE_PALETTE.length;
  for (let i = 0; i < frameCount; i++) {
    const u = (i / frameCount) * N;        // 0 .. N
    const seg = Math.floor(u) % N;
    const frac = u - Math.floor(u);
    // Smooth easing for the segment-to-segment crossfade — keeps each
    // color "held" for ~70% of its slot before lerping the rest.
    const HOLD = 0.35;
    let lerp;
    if (frac < HOLD) lerp = 0;
    else if (frac > 1 - HOLD) lerp = 1;
    else {
      const t = (frac - HOLD) / (1 - 2 * HOLD);
      // Smoothstep
      lerp = t * t * (3 - 2 * t);
    }
    const a = COLOR_CYCLE_PALETTE[seg].color;
    const b = COLOR_CYCLE_PALETTE[(seg + 1) % N].color;
    colorPerFrame.push({
      r: Math.round(a.r + (b.r - a.r) * lerp),
      g: Math.round(a.g + (b.g - a.g) * lerp),
      b: Math.round(a.b + (b.b - a.b) * lerp),
    });
    // Label flips when lerp >= 0.5 (the saber visually reads as the
    // upcoming color past the midpoint of the crossfade).
    labelPerFrame.push(lerp >= 0.5 ? COLOR_CYCLE_PALETTE[(seg + 1) % N].name
                                   : COLOR_CYCLE_PALETTE[seg].name);
  }

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const encoder = new GIFEncoder(W, H);
  encoder.setRepeat(0);
  encoder.setDelay(Math.round(1000 / FPS));
  encoder.setQuality(QUALITY);
  encoder.start();

  // Saber geometry — one big horizontal blade across the canvas.
  const hiltX = 100;
  const hiltLen = 180;
  const hiltH = 32;
  const bladeStartPx = hiltX + hiltLen;
  const bladeLenPx = W - bladeStartPx - 100;
  const bladeYPx = H * 0.55;
  const coreH = 24;

  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    const targetColor = colorPerFrame[frameIdx];
    const config = { ...baseConfig, baseColor: targetColor };
    engine.update(1000 / FPS, config);
    const ledBuffer = engine.getPixels();

    fillBackground(ctx, W, H);

    // Header
    ctx.save();
    ctx.font = '500 22px "JetBrains Mono", "Menlo", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('COLOR CYCLE · 10 canonical', 32, 22);
    ctx.font = '500 14px "JetBrains Mono", "Menlo", monospace';
    ctx.fillStyle = 'rgba(0, 140, 255, 0.78)';
    ctx.textAlign = 'right';
    ctx.fillText('KYBERSTATION', W - 32, 26);
    ctx.restore();

    // Hilt
    drawHilt(ctx, hiltX, bladeYPx, hiltLen, hiltH);

    // Blade — feed the engine's pixel buffer through the workbench
    // headless renderer.
    drawWorkbenchBlade(ctx, ledBufferFrom(ledBuffer), {
      bladeStartPx,
      bladeLenPx,
      bladeYPx,
      coreH,
      cw: W,
      ch: H,
      bladeComposite: 'lighter',
    });

    // Color label below the saber
    ctx.save();
    ctx.font = '500 18px "JetBrains Mono", "Menlo", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(labelPerFrame[frameIdx], W / 2, bladeYPx + 70);
    ctx.restore();

    encoder.addFrame(rgbaFromCanvas(ctx, W, H));
  }

  encoder.finish();
  return Buffer.from(encoder.bytes());
}

// ─── 3) lockup-loop ────────────────────────────────────────────────────
//
// Single ignited saber; held mid-blade lockup pulses. Showcases the
// spatial-effect placement feature (LockupTrL<…, Bump<…>>). ~5s loop.

function renderLockupLoop() {
  const totalDurationMs = 5000;
  const frameCount = Math.round((totalDurationMs / 1000) * FPS);
  console.log(`  (lockup-loop: ${frameCount} frames @ ${FPS}fps)`);

  const config = {
    ...SINGLE_BASE_CONFIG,
    lockupPosition: 0.50,    // mid-blade
    lockupRadius: 0.14,
    lockupColor: { r: 255, g: 200, b: 80 },
  };

  // Drive the engine: settle ON, hold lockup throughout, capture.
  const engine = new BladeEngine();
  engine.ignite(config);
  const settleMs = (config.preonEnabled ? (config.preonMs ?? 0) : 0)
    + (config.ignitionMs ?? 300) + 120;
  for (let t = 0; t < settleMs; t += 1000 / FPS) {
    engine.update(1000 / FPS, config);
  }

  // Hold lockup throughout the loop. Lockup is sustained-by-default —
  // stays active until releaseEffect() is called. Pre-tick a few frames
  // so the ramp-up isn't visible at the start of the loop.
  engine.triggerEffect('lockup', { position: config.lockupPosition });
  for (let t = 0; t < 200; t += 1000 / FPS) {
    engine.update(1000 / FPS, config);
  }

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const encoder = new GIFEncoder(W, H);
  encoder.setRepeat(0);
  encoder.setDelay(Math.round(1000 / FPS));
  encoder.setQuality(QUALITY);
  encoder.start();

  // Same single-saber geometry as color-cycle.
  const hiltX = 100;
  const hiltLen = 180;
  const hiltH = 32;
  const bladeStartPx = hiltX + hiltLen;
  const bladeLenPx = W - bladeStartPx - 100;
  const bladeYPx = H * 0.55;
  const coreH = 24;

  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    engine.update(1000 / FPS, config);
    const ledBuffer = engine.getPixels();

    fillBackground(ctx, W, H);

    // Header
    ctx.save();
    ctx.font = '500 22px "JetBrains Mono", "Menlo", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('LOCKUP · spatial mid-blade', 32, 22);
    ctx.font = '500 14px "JetBrains Mono", "Menlo", monospace';
    ctx.fillStyle = 'rgba(0, 140, 255, 0.78)';
    ctx.textAlign = 'right';
    ctx.fillText('KYBERSTATION', W - 32, 26);
    ctx.restore();

    // Hilt
    drawHilt(ctx, hiltX, bladeYPx, hiltLen, hiltH);

    drawWorkbenchBlade(ctx, ledBufferFrom(ledBuffer), {
      bladeStartPx,
      bladeLenPx,
      bladeYPx,
      coreH,
      cw: W,
      ch: H,
      bladeComposite: 'lighter',
    });

    // Caption
    ctx.save();
    ctx.font = '500 16px "JetBrains Mono", "Menlo", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('AlphaL<LockupTrL<…>, Bump<Int<32768>, Int<9000>>>', W / 2, bladeYPx + 70);
    ctx.restore();

    encoder.addFrame(rgbaFromCanvas(ctx, W, H));
  }

  encoder.finish();
  return Buffer.from(encoder.bytes());
}

// ─── Run ───────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('\n✖ generation failed:');
  console.error(err);
  process.exitCode = 1;
});

// Unused for now but exported so the script-level imports don't get
// flagged as dead — kept here in case a future Sprint 4 effect-specific
// GIF wants the explicit BladeState API.
void BladeState;
