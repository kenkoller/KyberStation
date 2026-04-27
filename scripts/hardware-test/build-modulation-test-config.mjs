#!/usr/bin/env node
// Build a ProffieOS config.h for the v1.1 modulation hardware test.
//
// Mirrors what the editor's Output panel produces when:
//   - DEFAULT_CONFIG (Obi-Wan ANH blue) is loaded
//   - "Reactive Shimmer" recipe is applied (swing -> shimmer @ 60% add)
//   - Generate config.h is emitted via buildConfigFile()
//
// Output: ProffieOS/config/v3-modulation-test.h

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateStyleCode, buildConfigFile } from '../../packages/codegen/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const OUT_PATH = resolve(REPO_ROOT, 'ProffieOS', 'config', 'v3-modulation-test.h');

// Mirror of apps/web/stores/bladeStore.ts DEFAULT_CONFIG (Obi-Wan ANH).
// Keep in sync with that store; see CANONICAL_DEFAULT_CONFIG drift sentinel.
const baseConfig = {
  name: 'Obi-Wan ANH',
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 80 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 800,
  shimmer: 0.1,
  ledCount: 144,
};

// SWING-DRIVEN HUE SHIFT (post-codegen patched):
//   swing -> shimmer · replace · 1.0
//   => Mix<Scale<SwingSpeed<400>, Int<0>, Int<32768>>, baseColor, White>
//
// We then post-process the emitted config.h to swap the literal `White`
// inside the shimmer-Mix slot to a contrasting Rgb (red). This gives:
//   held still: shimmer driver = 0 -> Mix factor = 0 -> pure blue
//   full swing: shimmer driver = 32768 -> Mix factor = 1 -> pure red
//
// True swing-driven HUE shift on hardware. v1.1 Core's codegen doesn't
// natively emit this shape (the second mix-color is hardcoded `White`
// in stable/unstable/pulse style templates). The patch here demonstrates
// the v1.2 capability live on hardware ahead of the architectural lift.
const modulation = {
  version: 1,
  bindings: [
    {
      id: 'hwtest-swing-hue-1',
      source: 'swing',
      expression: null,
      target: 'shimmer',
      combinator: 'replace',
      amount: 1.0,
      label: 'Swing replaces shimmer (drives blue<->red hue mix)',
      bypassed: false,
    },
  ],
};

const config = { ...baseConfig, modulation };

// 1) Generate the style code WITH the v1.1 comment block so we can
//    sanity-check the output before flash.
const styleWithComment = generateStyleCode(config, { comments: true, editMode: false });
process.stderr.write('--- Generated style code (preview) ---\n');
process.stderr.write(styleWithComment + '\n');
process.stderr.write('--- end preview ---\n\n');

// 2) Generate without the comment for the preset array embedding.
const styleCode = generateStyleCode(config, { comments: false, editMode: false });

// 3) Wrap into a full config.h via buildConfigFile (mirrors the editor's
//    multi-preset path with this single config in the list).
const configH = buildConfigFile({
  boardType: 'proffieboard_v3',
  numBlades: 1,
  numButtons: 2,
  volume: 1500,
  clashThresholdG: 3.0,
  maxClashStrength: 200,
  propFile: 'saber_fett263_buttons.h',
  fett263Defines: ['MOTION_TIMEOUT 60 * 15 * 1000'],
  presets: [
    {
      fontName: 'font1',
      styleCodes: [styleCode],
      presetName: 'modulation-test',
    },
  ],
  bladeConfig: [
    {
      type: 'ws281x',
      ledCount: 144,
      pin: 'bladePin',
      colorOrder: 'Color8::GRB',
      powerPins: ['bladePowerPin2', 'bladePowerPin3'],
    },
  ],
});

// Post-process — two patches:
//   (a) Replace `White` inside the AudioFlicker shimmer-Mix slot with
//       Rgb<255,40,40> (red) so swing-driven shimmer == swing-driven hue.
//   (b) Strip the AudioFlicker wrapper so the live Mix is the blade's
//       direct color. AudioFlicker gates on audio level: with no SD
//       card / font loaded, audio level = 0 and the blade stays pinned
//       to `colorA` (baseColor), masking our shimmer modulation
//       entirely. Hardware-test on a board without sound needs the raw
//       Mix to show through.
const HUE_TARGET_RGB = 'Rgb<255,40,40>';
const SHIMMER_MIX_WHITE = /(Rgb<0,140,255>,\n\s+)White(\n\s+>)/;
let patched = configH.replace(SHIMMER_MIX_WHITE, `$1${HUE_TARGET_RGB}$2`);

if (patched === configH) {
  process.stderr.write('WARNING: shimmer-Mix White patch did not match. Output unchanged.\n');
} else {
  process.stderr.write('Patched (a): shimmer-Mix White -> ' + HUE_TARGET_RGB + '\n');
}

// Strip AudioFlicker wrapper. Pattern: AudioFlicker< ... Mix<...> ... >
// Capture the inner Mix block, drop AudioFlicker.
const AUDIOFLICKER_WRAPPER = /AudioFlicker<\n\s+Rgb<0,140,255>,\n\s+(Mix<[\s\S]+?\n\s+>)\n\s+>/;
const stripped = patched.replace(AUDIOFLICKER_WRAPPER, '$1');
if (stripped === patched) {
  process.stderr.write('WARNING: AudioFlicker strip patch did not match.\n');
} else {
  process.stderr.write('Patched (b): AudioFlicker wrapper stripped (no audio-gate).\n');
  patched = stripped;
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, patched, 'utf8');

process.stdout.write(OUT_PATH + '\n');
