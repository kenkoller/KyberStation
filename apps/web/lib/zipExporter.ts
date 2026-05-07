import JSZip from 'jszip';
import type { BladeConfig } from '@kyberstation/engine';
import { generateStyleCode } from '@kyberstation/codegen';
import { buildConfigFile } from '@kyberstation/codegen';
import type { ConfigOptions, PresetEntry } from '@kyberstation/codegen';

// ─── Board Identifiers ───

export type BoardId = 'proffie' | 'cfx' | 'golden_harvest' | 'xenopixel';

export interface BoardInfo {
  id: BoardId;
  label: string;
  configFileName: string;
}

export const BOARDS: Record<BoardId, BoardInfo> = {
  proffie: { id: 'proffie', label: 'ProffieOS', configFileName: 'config.h' },
  cfx: { id: 'cfx', label: 'CFX', configFileName: 'config.txt' },
  golden_harvest: { id: 'golden_harvest', label: 'Golden Harvest', configFileName: 'config.ini' },
  xenopixel: { id: 'xenopixel', label: 'Xenopixel V3', configFileName: 'fontconfig.ini' },
};

// ─── Preset Export Shape ───

export interface ExportPreset {
  name: string;
  config: BladeConfig;
  fontName?: string;
  soundFiles?: File[];
}

export interface ExportOptions {
  preset: ExportPreset;
  boardId: BoardId;
  boardOptions?: ConfigOptions;
}

export interface MultiExportOptions {
  presets: ExportPreset[];
  boardId: BoardId;
  boardOptions?: ConfigOptions;
}

// ─── Helpers ───

function sanitizeFolderName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

function rgbToCfxHex(r: number, g: number, b: number): string {
  return [r, g, b]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
    .join('');
}

// ─── ProffieOS Config Generator ───

function generateProffieConfig(presets: ExportPreset[], boardOptions?: ConfigOptions): string {
  if (boardOptions) {
    return buildConfigFile(boardOptions);
  }

  // Build a minimal config.h from presets
  const presetEntries: PresetEntry[] = presets.map((p, i) => ({
    fontName: p.fontName ?? `font${i + 1}`,
    styleCodes: [generateStyleCode(p.config, { comments: false })],
    presetName: p.name,
  }));

  const options: ConfigOptions = {
    boardType: 'proffieboard_v3',
    propFile: 'saber_fett263_buttons.h',
    numBlades: 1,
    numButtons: 2,
    volume: 2000,
    clashThresholdG: 3.0,
    maxClashStrength: 16,
    fett263Defines: [
      'FETT263_EDIT_MODE_MENU',
      'FETT263_MULTI_PHASE',
    ],
    presets: presetEntries,
    bladeConfig: [
      {
        type: 'ws281x',
        ledCount: presets[0]?.config.ledCount ?? 144,
        pin: 'bladePin',
        colorOrder: 'Color8::GRB',
        powerPins: ['bladePowerPin2', 'bladePowerPin3'],
      },
    ],
  };

  return buildConfigFile(options);
}

// ─── CFX Config Generator ───
//
// IMPORTANT — DESIGN-REFERENCE ONLY, NOT FLASHABLE FIRMWARE.
//
// Real CFX (Crystal Focus X by Plecter Labs) uses a proprietary INI-style
// config schema that is documented in Plecter's user manual but uses
// vendor-specific section names + field keys that don't match the
// invented schema below. KyberStation generates a structured text file
// that DOCUMENTS the user's intended preset (colors, ignition timing) but
// will NOT auto-flash on a real CFX board.
//
// Renaming the file or changing the markers (`[general]`, `profiles=`,
// `[profile`) would break `cardDetector.ts` CFX SD-card recognition.
// Honesty surfaces:
//   1. Top-of-file `# KYBERSTATION DESIGN REFERENCE` banner inline
//   2. Sibling `KYBERSTATION_README.txt` at ZIP root with full guidance.

/**
 * Banner emitted at the top of every CFX `config.txt` export. Stable —
 * tests pin the exact wording so a future copy edit can't accidentally
 * drop the design-reference disclaimer.
 */
export const CFX_DESIGN_REFERENCE_BANNER = [
  '# KYBERSTATION DESIGN REFERENCE — NOT flashable CFX firmware.',
  '# Real CFX uses a proprietary config format (Plecter Labs).',
  '# Use these values as a guide when configuring your saber via',
  '# Plecter Studio or your vendor\'s app. See KYBERSTATION_README.txt',
  '# in this ZIP for details.',
].join('\n');

function generateCfxFontConfig(preset: ExportPreset, index: number): string {
  const c = preset.config;
  const lines: string[] = [];
  lines.push(CFX_DESIGN_REFERENCE_BANNER);
  lines.push(`# CFX Font Configuration - ${preset.name}`);
  lines.push('');
  lines.push(`[general]`);
  lines.push(`profile=${index + 1}`);
  lines.push(`name=${preset.name}`);
  lines.push('');
  lines.push(`[color]`);
  lines.push(`base=${rgbToCfxHex(c.baseColor.r, c.baseColor.g, c.baseColor.b)}`);
  lines.push(`clash=${rgbToCfxHex(c.clashColor.r, c.clashColor.g, c.clashColor.b)}`);
  lines.push(`lockup=${rgbToCfxHex(c.lockupColor.r, c.lockupColor.g, c.lockupColor.b)}`);
  lines.push(`blast=${rgbToCfxHex(c.blastColor.r, c.blastColor.g, c.blastColor.b)}`);
  lines.push('');
  lines.push(`[ignition]`);
  lines.push(`type=${c.ignition}`);
  lines.push(`duration=${c.ignitionMs}`);
  lines.push('');
  lines.push(`[retraction]`);
  lines.push(`type=${c.retraction}`);
  lines.push(`duration=${c.retractionMs}`);
  return lines.join('\n');
}

function generateCfxMainConfig(presets: ExportPreset[]): string {
  const lines: string[] = [];
  lines.push(CFX_DESIGN_REFERENCE_BANNER);
  lines.push('# CFX Saber Configuration');
  lines.push('');
  lines.push(`[general]`);
  lines.push(`profiles=${presets.length}`);
  lines.push(`volume=80`);
  lines.push(`clash_sensitivity=4`);
  lines.push('');
  for (let i = 0; i < presets.length; i++) {
    lines.push(`[profile${i + 1}]`);
    lines.push(`font=font${i + 1}`);
    lines.push(`name=${presets[i].name}`);
    lines.push(`color=${rgbToCfxHex(presets[i].config.baseColor.r, presets[i].config.baseColor.g, presets[i].config.baseColor.b)}`);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * README emitted at the CFX ZIP root. Plain text, Notepad-friendly.
 * Mirrors `XENOPIXEL_README_TEXT` shape with CFX-specific guidance.
 */
export const CFX_README_TEXT = `KYBERSTATION DESIGN REFERENCE FOR CFX (CRYSTAL FOCUS X)
=========================================================

This ZIP contains design notes generated by KyberStation, NOT a
flashable CFX firmware bundle. CFX (made by Plecter Labs) uses a
proprietary configuration schema that doesn't match the structured
text we generate here. The files document your intended preset values
so you can replicate them via Plecter's tools.

WHAT'S IN THIS ZIP
------------------
  config.txt
    Top-level summary listing each profile, its font folder name, and
    its base color in hex. Section names + keys are KyberStation's own
    convention — they are NOT what real CFX firmware reads.

  font1/, font2/, ...
    Per-preset folders containing your sound files (if uploaded) and a
    per-font config.txt with detailed color + ignition + retraction
    values for that profile.

HOW TO USE THIS REFERENCE
-------------------------
CFX presets are typically configured via:
  • Plecter Studio (the vendor's official tool — Mac/Windows desktop)
  • Direct text-edit of the SD card config files following Plecter's
    documented format
  • Some vendor companion apps (varies by saber maker)

For each profile in this ZIP:
  - Copy the base + clash + lockup + blast hex colors into the
    corresponding fields in your CFX config (the field names won't
    match — consult Plecter's manual for the real names).
  - Use the ignition / retraction durations as guidance for your
    saber's actual setting names.
  - Sound files in the font folders need to be placed where your
    Plecter setup expects them.

WHY KYBERSTATION CAN'T WRITE CFX FIRMWARE FILES DIRECTLY
--------------------------------------------------------
The CFX firmware schema is proprietary and not openly documented in
machine-readable form. KyberStation's full code path targets Proffieboard
(open-source ProffieOS via arduino-cli compile). For CFX, the most we
can do today is structured design notes that speed up your manual
configuration.

If you want full programmatic control over your saber, Proffieboard V3
is the path. Otherwise, this design reference is the best KyberStation
can offer for CFX users.

Generated by KyberStation. Questions or suggestions? File an issue:
  https://github.com/kenkoller/KyberStation/issues
`;

// ─── Golden Harvest Config Generator ───
//
// IMPORTANT — DESIGN-REFERENCE ONLY, NOT FLASHABLE FIRMWARE.
//
// Real Golden Harvest V3/V4 firmware has its own INI-style config
// schema that uses different section + field names than the ones we
// emit here. KyberStation generates structured design notes that
// document the user's intended preset, but the file will NOT auto-load
// on a real GH board. Honesty surfaces match the CFX pattern:
//   1. Inline `; KYBERSTATION DESIGN REFERENCE` banner at top
//   2. Sibling `KYBERSTATION_README.txt` at ZIP root.

/**
 * Banner emitted at the top of every GH `config.ini` export. Uses `;`
 * comment style to match INI convention. Stable — tests pin wording.
 */
export const GH_DESIGN_REFERENCE_BANNER = [
  '; KYBERSTATION DESIGN REFERENCE — NOT flashable Golden Harvest firmware.',
  '; Real GH uses a proprietary config format with different field names.',
  '; Use these values as a guide when configuring your saber via the',
  '; vendor app or direct SD card edits. See KYBERSTATION_README.txt',
  '; in this ZIP for details.',
].join('\n');

function generateGoldenHarvestConfig(presets: ExportPreset[]): string {
  const lines: string[] = [];
  lines.push(GH_DESIGN_REFERENCE_BANNER);
  lines.push('; Golden Harvest V3 Configuration');
  lines.push('');
  lines.push('[board]');
  lines.push('version=3');
  lines.push(`profiles=${presets.length}`);
  lines.push('volume=80');
  lines.push('');
  for (let i = 0; i < presets.length; i++) {
    const c = presets[i].config;
    lines.push(`[profile${i + 1}]`);
    lines.push(`name=${presets[i].name}`);
    lines.push(`font=font${i + 1}`);
    lines.push(`color_base=${c.baseColor.r},${c.baseColor.g},${c.baseColor.b}`);
    lines.push(`color_clash=${c.clashColor.r},${c.clashColor.g},${c.clashColor.b}`);
    lines.push(`color_lockup=${c.lockupColor.r},${c.lockupColor.g},${c.lockupColor.b}`);
    lines.push(`ignition_type=${c.ignition}`);
    lines.push(`ignition_time=${c.ignitionMs}`);
    lines.push(`retraction_type=${c.retraction}`);
    lines.push(`retraction_time=${c.retractionMs}`);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * README emitted at the GH ZIP root. Plain text, Notepad-friendly.
 */
export const GH_README_TEXT = `KYBERSTATION DESIGN REFERENCE FOR GOLDEN HARVEST
=================================================

This ZIP contains design notes generated by KyberStation, NOT a
flashable Golden Harvest firmware bundle. Real GH (V3/V4) firmware
uses a proprietary INI schema that doesn't match the structured text
we generate here. The files document your intended preset values so
you can replicate them via your vendor's configuration tool.

WHAT'S IN THIS ZIP
------------------
  config.ini
    Top-level INI listing each profile with its name, font folder,
    base/clash/lockup colors (RGB triplets), and ignition + retraction
    timing. Field names are KyberStation's own convention — they are
    NOT what real GH firmware reads.

  font1/, font2/, ...
    Per-preset folders containing your sound files (if uploaded).

HOW TO USE THIS REFERENCE
-------------------------
GH presets are typically configured via:
  • Your vendor's companion app (varies by saber maker)
  • Direct edits on the SD card following the GH config schema in
    your saber's documentation
  • Button-driven preset menu on the saber itself

For each profile in this ZIP:
  - Copy the base / clash / lockup colors into the corresponding
    profile slot in your GH config (the field names will differ —
    consult your saber maker's docs).
  - Use the ignition / retraction timing values as guidance for your
    saber's actual setting names.
  - Place the sound files in the locations your GH setup expects.

WHY KYBERSTATION CAN'T WRITE GH FIRMWARE FILES DIRECTLY
-------------------------------------------------------
The GH firmware schema varies by version (V3 vs V4) and by
saber-maker variant, and isn't openly documented in a single
machine-readable form. KyberStation's full code path targets
Proffieboard (open-source ProffieOS via arduino-cli compile).
For GH, the most we can do today is structured design notes that
speed up your manual configuration.

If you want full programmatic control over your saber, Proffieboard V3
is the path. Otherwise, this design reference is the best KyberStation
can offer for GH users.

Generated by KyberStation. Questions or suggestions? File an issue:
  https://github.com/kenkoller/KyberStation/issues
`;

// ─── Xenopixel V3 Config Generator ───
//
// Xenopixel V3 uses an SD-card-based configuration system with:
//   - `set/config.ini` — global settings (motion, volume, clash, blade modes)
//   - Numbered font folders (`1/`, `2/`, ... up to `40/`), each containing
//     a `fontconfig.ini` with a single-line blade preset definition
//
// The fontconfig.ini format is:
//   font{N}=(R,G,B),A,B,C,D,E,F,G,H
// where A..H are: blade effect, blaster effect, force effect, lockup effect,
// default effect, blade style/ignition, ignition speed ms, retraction speed ms.

/**
 * Map KyberStation style IDs to Xenopixel V3 blade effect IDs (0-7).
 * 0=Fire, 1=Steady, 2=Unstable, 3=Rainbow, 4=Candy, 5=Crack, 6=Pulse, 7=Flashing
 */
const XENO_STYLE_MAP: Record<string, number> = {
  fire: 0,
  stable: 1,
  unstable: 2,
  rainbow: 3,
  crystalShatter: 5,
  pulse: 6,
};

/**
 * Map KyberStation ignition IDs to Xenopixel V3 ignition/blade-style IDs (0-11).
 * 0=Standard, 1=Velocity, 2=Torch, 3=Blaster
 */
const XENO_IGNITION_MAP: Record<string, number> = {
  standard: 0,
  scroll: 1,
  wipe: 2,
  spark: 3,
};

function xenoStyleId(style: string): number {
  return XENO_STYLE_MAP[style] ?? 1; // Default to Steady (1)
}

function xenoIgnitionId(ignition: string): number {
  return XENO_IGNITION_MAP[ignition] ?? 0; // Default to Standard (0)
}

/**
 * Generate a single-line `fontconfig.ini` for one Xenopixel V3 font slot.
 *
 * Format: font{N}=(R,G,B),A,B,C,D,E,F,G,H
 */
function generateXenoFontConfig(preset: ExportPreset, fontNumber: number): string {
  const c = preset.config;
  const r = Math.max(0, Math.min(255, Math.round(c.baseColor.r)));
  const g = Math.max(0, Math.min(255, Math.round(c.baseColor.g)));
  const b = Math.max(0, Math.min(255, Math.round(c.baseColor.b)));

  const bladeEffect = xenoStyleId(c.style);      // A — blade effect ID (0-7)
  const blasterLight = 0;                         // B — blaster light effect (0-2)
  const forceLight = 0;                           // C — force lighting effect (0-1)
  const lockupLight = 0;                          // D — lockup lighting effect (0)
  const defaultLight = 0;                         // E — default light effect (0-2)
  const bladeStyle = xenoIgnitionId(c.ignition);  // F — blade style/ignition (0-11)
  const ignitionSpeed = c.ignitionMs ?? 200;      // G — ignition speed ms
  const retractionSpeed = c.retractionMs ?? 500;  // H — retraction speed ms

  return `font${fontNumber}=(${r},${g},${b}),${bladeEffect},${blasterLight},${forceLight},${lockupLight},${defaultLight},${bladeStyle},${ignitionSpeed},${retractionSpeed}\n`;
}

/**
 * Generate `set/config.ini` — global Xenopixel V3 settings for the SD card.
 * Uses sensible defaults; LED count derived from the first preset.
 */
function generateXenoGlobalConfig(presets: ExportPreset[]): string {
  const ledCount = presets[0]?.config.ledCount ?? 133;

  const lines: string[] = [];
  lines.push('#Main blade length');
  lines.push(`pixel_number=${ledCount}`);
  lines.push('');
  lines.push('#Motion control');
  lines.push('motion_control=1');
  lines.push('pull_push_on=1');
  lines.push('push_pull_off=1');
  lines.push('push_sensitivity=18');
  lines.push('pull_sensitivity=13');
  lines.push('swing_on=1');
  lines.push('swing_sensitivity=1100');
  lines.push('twist_on=0');
  lines.push('twist_off=0');
  lines.push('twist_sensitivity=220');
  lines.push('');
  lines.push('#Volume');
  lines.push('volume=80');
  lines.push('');
  lines.push('#Blade modes');
  lines.push('velocity_mode=0');
  lines.push('torch_mode=0');
  lines.push('multiblock_mode=0');
  lines.push('multilock_mode=0');
  lines.push('lightning_block_mode=0');
  lines.push('blaster_mode=0');
  lines.push('ghost_mode=0');
  lines.push('');
  lines.push('#Sound');
  lines.push('countdown=1');
  lines.push('');
  lines.push('#Clash');
  lines.push('flash_on_clash=1');
  lines.push('clash_sensitivity=2.0');
  lines.push('');
  lines.push('#Power timing');
  lines.push('PowerOnTime=2000');
  lines.push('PowerOffTime=10000');
  lines.push('');
  return lines.join('\n');
}

/**
 * Note emitted in the SD card ZIP describing what the files are.
 * Exported so tests + tooling can pin the exact wording.
 */
export const XENOPIXEL_SD_CARD_NOTE =
  'KyberStation Xenopixel V3 SD card configuration. ' +
  'Unzip this archive to your SD card root to apply your blade settings. ' +
  'See KYBERSTATION_README.txt for details.';

/** @deprecated Use XENOPIXEL_SD_CARD_NOTE instead */
export const XENOPIXEL_DESIGN_REFERENCE_NOTE = XENOPIXEL_SD_CARD_NOTE;

/**
 * README emitted at the ZIP root for Xenopixel V3 SD card exports.
 * Plain text, Notepad-friendly. Exported for test pinning.
 */
export const XENOPIXEL_README_TEXT = `KYBERSTATION SD CARD CONFIG FOR XENOPIXEL V3
=============================================

This ZIP contains ready-to-use Xenopixel V3 SD card config files
generated by KyberStation. Unzip the contents to your SD card root.

WHAT'S IN THIS ZIP
------------------
  set/
    config.ini — Global saber settings (motion, volume, clash, etc.)

  1/, 2/, 3/, ...
    Numbered font folders, each with a fontconfig.ini that sets the
    blade color, effect, ignition style, and timing for that preset.

HOW TO INSTALL
--------------
  1. Remove the SD card from your Xenopixel saber
  2. Back up your existing SD card contents (recommended)
  3. Unzip this file to the SD card root — the set/ folder and
     numbered folders should sit at the top level
  4. Re-insert the SD card and power on your saber
  5. Your new presets should be active immediately

NOTES
-----
  - Sound font files are NOT included unless you paired them in
    KyberStation. You'll need to add your own sound files to each
    numbered font folder.
  - The config.ini in set/ controls global settings. Edit it with
    a text editor if you need to fine-tune motion sensitivity or volume.
  - Blade effect names: 0=Fire, 1=Steady, 2=Unstable, 3=Rainbow,
    4=Candy, 5=Crack, 6=Pulse, 7=Flashing
  - Ignition styles: 0=Standard, 1=Velocity, 2=Torch, 3=Blaster,
    4=Ghost, 5-11=Special preon ignitions

Generated by KyberStation — https://github.com/kenkoller/KyberStation
`;

// ─── ZIP Builders ───

function addFontFolder(zip: JSZip, folderName: string, soundFiles?: File[]): void {
  const folder = zip.folder(folderName);
  if (!folder) return;

  // Add sound files if provided
  if (soundFiles && soundFiles.length > 0) {
    for (const file of soundFiles) {
      folder.file(file.name, file);
    }
  } else {
    // Create an empty placeholder so the folder exists in the ZIP
    folder.file('.kyberstation', 'KyberStation sound font placeholder\n');
  }
}

/**
 * Create a ZIP archive for a single preset targeting a specific board.
 */
export async function exportPresetZip(options: ExportOptions): Promise<Blob> {
  return exportMultiPresetZip({
    presets: [options.preset],
    boardId: options.boardId,
    boardOptions: options.boardOptions,
  });
}

/**
 * Create a ZIP archive for multiple presets targeting a specific board.
 */
export async function exportMultiPresetZip(options: MultiExportOptions): Promise<Blob> {
  const { presets, boardId, boardOptions } = options;
  const zip = new JSZip();

  switch (boardId) {
    case 'proffie': {
      // config.h at root
      const configH = generateProffieConfig(presets, boardOptions);
      zip.file('config.h', configH);

      // Font folders: font1/, font2/, ...
      for (let i = 0; i < presets.length; i++) {
        const folderName = presets[i].fontName
          ? sanitizeFolderName(presets[i].fontName!)
          : `font${i + 1}`;
        addFontFolder(zip, folderName, presets[i].soundFiles);
      }
      break;
    }

    case 'cfx': {
      // KyberStation design-reference README at root. Surfaces the
      // "this is not flashable firmware" contract for any user who
      // pops open the ZIP. Plain text, Notepad-friendly.
      zip.file('KYBERSTATION_README.txt', CFX_README_TEXT);

      // Main config.txt at root — design-reference, NOT real CFX format.
      // Inline `# KYBERSTATION DESIGN REFERENCE` banner at top.
      zip.file('config.txt', generateCfxMainConfig(presets));

      // Per-font folders + per-font design-reference config.txt files
      for (let i = 0; i < presets.length; i++) {
        const folderName = `font${i + 1}`;
        addFontFolder(zip, folderName, presets[i].soundFiles);
        zip.file(`${folderName}/config.txt`, generateCfxFontConfig(presets[i], i));
      }
      break;
    }

    case 'golden_harvest': {
      // KyberStation design-reference README at root.
      zip.file('KYBERSTATION_README.txt', GH_README_TEXT);

      // config.ini at root — design-reference with inline banner.
      zip.file('config.ini', generateGoldenHarvestConfig(presets));

      // Font folders
      for (let i = 0; i < presets.length; i++) {
        const folderName = `font${i + 1}`;
        addFontFolder(zip, folderName, presets[i].soundFiles);
      }
      break;
    }

    case 'xenopixel': {
      // README at root explaining these are real SD card files.
      zip.file('KYBERSTATION_README.txt', XENOPIXEL_README_TEXT);

      // set/config.ini — global Xenopixel V3 settings
      const setFolder = zip.folder('set');
      if (setFolder) {
        setFolder.file('config.ini', generateXenoGlobalConfig(presets));
      }

      // Numbered font folders: 1/, 2/, ... (Xenopixel uses plain numbers)
      for (let i = 0; i < presets.length; i++) {
        const folderName = `${i + 1}`;
        const folder = zip.folder(folderName);
        if (folder) {
          folder.file('fontconfig.ini', generateXenoFontConfig(presets[i], i + 1));
          // Add sound files if provided
          if (presets[i].soundFiles && presets[i].soundFiles!.length > 0) {
            for (const file of presets[i].soundFiles!) {
              folder.file(file.name, file);
            }
          }
        }
      }
      break;
    }
  }

  return zip.generateAsync({ type: 'blob' });
}
