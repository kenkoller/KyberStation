#!/usr/bin/env node
//
// build-bench-validation-presets.mjs — Generate a curated 15-preset
// `presets.ini` for ProffieOS SAVE_PRESET runtime-preset bench validation.
//
// Used 2026-05-16 (this session) to validate that the smoking-gun fix
// (PR #325 commit 45737f2 — 16-bit RGB scaling) actually produces bright
// blades on the 89sabers V3.9-BT in production form. The 15 picks span
// the color wheel (red / orange / yellow / green / blue / purple / white)
// and the style mix (stable / rotoscope / unstable) so a single bench
// session exercises the worst-case dim paths from the pre-fix era.
//
// Usage:
//   node scripts/hardware-test/build-bench-validation-presets.mjs \
//     --install-time '2026-05-16T12:34:56' \
//     --num-blades 2 \
//     [--phase a|c] \
//     [--output path/to/presets.ini]
//
// Defaults:
//   --install-time  PLACEHOLDER  (you must replace before flashing)
//   --num-blades    2            (matches 89sabers V3.9-BT NUM_BLADES)
//   --phase         c            (advanced verb — exercises the 16-bit fix)
//   --output        scripts/hardware-test/bench-output/curated-15.ini
//
// Phase A vs Phase C:
//   - Phase A emits `style=builtin N M` (factory-bank references). Visually
//     verifies preset ordering / font assignment / install_time matching.
//     Doesn't exercise the smoking-gun fix.
//   - Phase C emits `style=advanced R,G,B …` (16-bit-scaled custom colors).
//     EXERCISES the smoking-gun fix. Use this for brightness validation.
//
// Reference: docs/research/PROFFIEOS_RUNTIME_PRESET_FORMAT.md
//
// Prerequisites:
//   pnpm install
//   pnpm --filter=@kyberstation/codegen build
//   pnpm --filter=@kyberstation/presets build

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Built-artifact imports — same pattern as build-modulation-test-config.mjs
const { ALL_PRESETS } = await import(
  '../../packages/presets/dist/index.js'
);
const { buildRuntimePresetsFile } = await import(
  '../../packages/codegen/dist/index.js'
);

// ─── CLI args ───

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.findIndex((a) => a === `--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
};

const INSTALL_TIME = getArg('install-time', 'PLACEHOLDER_REPLACE_ME');
const NUM_BLADES = Number.parseInt(getArg('num-blades', '2'), 10);
const PHASE = getArg('phase', 'c').toLowerCase();
const OUTPUT = getArg(
  'output',
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    'bench-output/curated-15.ini',
  ),
);

if (![1, 2, 3, 4].includes(NUM_BLADES)) {
  console.error(`Invalid --num-blades: ${NUM_BLADES}. Must be 1, 2, 3, or 4.`);
  process.exit(1);
}
if (!['a', 'c'].includes(PHASE)) {
  console.error(`Invalid --phase: ${PHASE}. Must be 'a' or 'c'.`);
  process.exit(1);
}

// ─── Curated 15 picks ───
//
// Selection criteria:
//   - Color wheel coverage (red, orange, yellow, green, blue, purple,
//     magenta, white) so the 16-bit scaling is exercised across all
//     channels.
//   - Style mix: 11 stable + 3 rotoscope + 1 unstable to catch any
//     style-specific emit quirks.
//   - Iconic / unambiguous on-screen references so visual mismatch is
//     immediately obvious at the bench.
//   - Bright + saturated `baseColor` values — the smoking-gun pre-fix
//     would have rendered these at 0.4% brightness, so any dim picks
//     are diagnostic of regression.
//
// All picks are screenAccurate canon presets from ALL_PRESETS. If you
// add picks, prefer ones with `tier: 'detailed'` so blast / clash /
// lockup colors are also customized rather than defaulted.

const CURATED_IDS = [
  // Original Trilogy / canon film references
  'ot-obiwan-anh',                          // pale blue rotoscope
  'ot-vader',                                // deep red rotoscope
  'ot-luke-rotj',                            // saturated green rotoscope

  // Prequel canon — diverse colors
  'prequel-anakin',                          // bright blue stable
  'prequel-mace-windu',                      // purple (R+B exercises both)
  'prequel-yoda',                            // bright green-yellow
  'prequel-plo-koon',                        // pale blue
  'prequel-darth-maul',                      // red double
  'prequel-palpatine',                       // red unstable (Sith)
  'prequel-dooku',                           // red curved hilt
  'prequel-asajj-ventress',                  // red short blades

  // Sequel canon
  'st-kylo-ren',                             // unstable crossguard

  // Rare colors
  'st-rey-yellow',                           // yellow (G + R, low B)
  'animated-ahsoka-rebels-white',            // white (R=G=B max-channel)
  'legends-mara-jade-purple',                // magenta-purple
];

if (CURATED_IDS.length !== 15) {
  console.error(`Expected 15 picks, got ${CURATED_IDS.length}.`);
  process.exit(1);
}

// ─── Resolve presets ───

const picks = [];
for (const id of CURATED_IDS) {
  const preset = ALL_PRESETS.find((p) => p.id === id);
  if (!preset) {
    console.error(`Preset not found: ${id}. Aborting to avoid silent gap.`);
    process.exit(1);
  }
  picks.push(preset);
}

// ─── Map preset → ProffieRuntimePresetInput ───
//
// fontName guess: use the preset's config.name (e.g. 'ObiWanANH'). This
// matches the convention KyberStation's UI uses. If your SD card's font
// folder names don't match (89sabers V3.9-BT factory ships with a
// specific font set), the preset will still load but use default sound.
// Visual color verification works regardless.
//
// For Phase C: the `advanced` field gets auto-derived inside the
// emitter from the BladeConfig — but `buildRuntimePresetsFile` only
// reads what we pass, so we have to construct AdvancedVerbParams here
// using the same logic as `apps/web/lib/zipExporter.ts:bladeConfigToAdvancedParams`.

function bladeConfigToAdvancedParams(config) {
  // Mirror the shape produced by zipExporter's adapter so the bench
  // output matches what the UI would produce for the same picks.
  const safeRgb = (rgb, fallback) =>
    rgb && typeof rgb === 'object'
      ? { r: rgb.r ?? 0, g: rgb.g ?? 0, b: rgb.b ?? 0 }
      : fallback;
  const base = safeRgb(config.baseColor, { r: 0, g: 140, b: 255 });
  return {
    color1: base,
    color2: base,
    color3: base,
    onSparkColor: safeRgb(config.clashColor, { r: 255, g: 255, b: 255 }),
    onSparkTimeMs: 200,
    blastColor: safeRgb(config.blastColor, { r: 255, g: 255, b: 255 }),
    lockupColor: safeRgb(config.lockupColor, { r: 255, g: 200, b: 80 }),
    clashColor: safeRgb(config.clashColor, { r: 255, g: 255, b: 255 }),
    extensionMs: config.ignitionMs ?? 300,
    retractionMs: config.retractionMs ?? 800,
    sparkTipColor: safeRgb(config.clashColor, { r: 255, g: 255, b: 255 }),
  };
}

const useAdvancedVerb = PHASE === 'c';

const presetInputs = picks.map((preset, i) => ({
  presetName: preset.name,
  fontName: preset.config.name ?? preset.id,
  builtinPresetIndex: i,
  advanced: useAdvancedVerb
    ? bladeConfigToAdvancedParams(preset.config)
    : undefined,
}));

// ─── Generate presets.ini ───

const content = buildRuntimePresetsFile({
  installTime: INSTALL_TIME,
  numBlades: NUM_BLADES,
  useAdvancedVerb,
  presets: presetInputs,
});

// ─── Write output ───

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, content, 'utf8');

// ─── Report ───

console.log('');
console.log(`Wrote bench-validation presets.ini → ${OUTPUT}`);
console.log('');
console.log(`Configuration:`);
console.log(`  install_time: ${INSTALL_TIME}${INSTALL_TIME === 'PLACEHOLDER_REPLACE_ME' ? '  ⚠ MUST REPLACE before SD-card flash' : ''}`);
console.log(`  num_blades:   ${NUM_BLADES}`);
console.log(`  phase:        ${PHASE.toUpperCase()} (${useAdvancedVerb ? 'advanced verb — exercises 16-bit RGB fix' : 'builtin — references factory bank'})`);
console.log(`  presets:      ${presetInputs.length}`);
console.log('');
console.log('Picks:');
for (let i = 0; i < picks.length; i++) {
  const p = picks[i];
  const c = p.config.baseColor;
  console.log(`  ${String(i).padStart(2)}: ${p.name.padEnd(48)} | rgb(${c.r},${c.g},${c.b}) | ${p.config.style}`);
}
console.log('');

if (INSTALL_TIME === 'PLACEHOLDER_REPLACE_ME') {
  console.log('━'.repeat(72));
  console.log('NEXT STEPS — REPLACE THE install_time PLACEHOLDER');
  console.log('━'.repeat(72));
  console.log('');
  console.log('1. Connect saber via USB. Run:');
  console.log('     scripts/hardware-test/proffie-serial.sh');
  console.log('   At the > prompt, type:  pli');
  console.log('   Note the `installed=...` line.');
  console.log('');
  console.log('2. Re-run this script with the real value:');
  console.log(`     node scripts/hardware-test/build-bench-validation-presets.mjs \\`);
  console.log(`       --install-time '<paste-the-string>' \\`);
  console.log(`       --num-blades ${NUM_BLADES} --phase ${PHASE}`);
  console.log('');
  console.log('   OR — load via serial (no install_time match required):');
  console.log(`     scripts/hardware-test/load-runtime-presets.sh ${OUTPUT}`);
  console.log('');
  console.log('3. Reboot saber. Confirm all 15 presets appear via `pli`.');
  console.log('   Cycle through and verify each blade renders at full');
  console.log('   brightness — that confirms the smoking-gun fix.');
  console.log('');
}
