// ─── ProffieOS Runtime Preset Emitter ───
//
// Emits `presets.ini` — the SD-card file that modern ProffieOS firmware
// (with `SAVE_PRESET` enabled) reads at runtime to populate the user's
// preset list. Users design presets in KyberStation, drop this file on
// their saber's SD card, and the new entries appear after reboot. No
// firmware flashing, no compile, no toolchain.
//
// File format (verified against /Users/KK/ProffieOS/common/current_preset.h
// Write() / Read() / CreateINI() / ValidatePresets()):
//
//   installed=<install_time_string>
//   new_preset
//   font=<font_folder>
//   track=<track_file>
//   style=<style_string_blade_1>
//   style=<style_string_blade_2>
//   ...
//   name=<preset_name>
//   variation=<int>
//   new_preset
//   ...
//   end
//
// Critical invariants:
//   - First line MUST be `installed=` matching the firmware's compile-time
//     install_time constant byte-for-byte. ValidatePresets() rejects the
//     file otherwise and falls back to compiled-in presets.
//   - One `style=` line per compile-time NUM_BLADES.
//   - File terminates with `end` (lowercase on write; case-insensitive on
//     read).
//   - Style strings must pass IsValidStyleString(): lowercase verb, then
//     digits/spaces/commas only.
//
// Phase A scope (this emitter):
//   - `style=builtin N M` only — references factory firmware's preset
//     bank by index. Phase A delivers reorder/rename/duplicate/font-
//     reassignment, no color overrides.
//   - Phase B (color override via `builtin N M R,G,B ...` args) and
//     Phase C (parameterized verbs like `standard`/`advanced`) are
//     deferred until per-chassis schema work + hardware validation.

import type { StyleNode } from '../types.js';
import type { BoardEmitter, BoardEmitOptions, EmitterOutput } from './BaseEmitter.js';

// ─── Public Types ───

export interface ProffieRuntimePresetInput {
  /** Display name shown on OLED + serial output. */
  presetName: string;
  /** Sound font folder name on the SD card (no leading slash). */
  fontName: string;
  /** Track file, defaults to `tracks/<fontName>.wav`. */
  trackFile?: string;
  /** 0-based index into the factory firmware's compiled `current_config->presets[]`. */
  builtinPresetIndex: number;
  /** ProffieOS variation seed for the preset. Defaults to 0. */
  variation?: number;
  /**
   * Optional Phase C / "advanced verb" parameters. When present AND the
   * caller sets `useAdvancedVerb: true` on the emit options, the emitter
   * outputs `style=advanced R,G,B …` (custom preset independent of the
   * factory bank) instead of `style=builtin N M`. Maps directly to the
   * 11-slot signature of the ProffieOS `advanced` named style declared
   * in `~/ProffieOS/styles/style_parser.h`.
   *
   * Phase C is opt-in and experimental: it requires the user's firmware
   * NOT to have `DISABLE_BASIC_PARSER_STYLES` defined (the default for
   * stock ProffieOS + Fett263 prop builds). Vendor builds that disable
   * the basic parser styles silently reject the style string and fall
   * back to the firmware's compiled preset bank — surface the
   * experimental warning at the UI level.
   */
  advanced?: AdvancedVerbParams;
}

/**
 * 11-slot signature for the ProffieOS `advanced` named style:
 *
 *   advanced color1 color2 color3 onSparkColor onSparkTimeMs
 *            blastColor lockupColor clashColor extensionMs retractionMs
 *            sparkTipColor
 *
 * Slot semantics (from `~/ProffieOS/styles/style_parser.h` named_styles[]
 * `"advanced"` description):
 *   1. color at hilt (gradient start)
 *   2. middle color
 *   3. tip color (gradient end)
 *   4. onspark color (briefly flashed on ignition events)
 *   5. onspark time (ms)
 *   6. blast color
 *   7. lockup color (audioflicker partner)
 *   8. clash color
 *   9. extension time (ms) — ignition duration
 *  10. retraction time (ms)
 *  11. spark-tip color (tip-of-blade ignition spark)
 */
export interface AdvancedVerbParams {
  color1: { r: number; g: number; b: number };
  color2: { r: number; g: number; b: number };
  color3: { r: number; g: number; b: number };
  onSparkColor: { r: number; g: number; b: number };
  onSparkTimeMs: number;
  blastColor: { r: number; g: number; b: number };
  lockupColor: { r: number; g: number; b: number };
  clashColor: { r: number; g: number; b: number };
  extensionMs: number;
  retractionMs: number;
  sparkTipColor: { r: number; g: number; b: number };
}

export interface ProffieRuntimeEmitOptions {
  /**
   * Firmware's compile-time install_time string. MUST byte-match the
   * value the firmware emits via `pli` / `list_presets` over USB CDC.
   * The platform layer (apps/web) is responsible for sourcing this —
   * codegen never reads from disk or serial.
   */
  installTime: string;
  /**
   * Compile-time NUM_BLADES of the user's firmware. The emitter writes
   * `numBlades` copies of each preset's `style=` line; secondary blades
   * mirror the primary so all blades match the user's intent rather than
   * inheriting whatever the prior preset had on them.
   */
  numBlades: 1 | 2 | 3 | 4;
  presets: ProffieRuntimePresetInput[];
  /**
   * Phase C opt-in: when true, presets with an `advanced` field on their
   * input emit `style=advanced R,G,B …` (custom style independent of
   * factory bank) instead of `style=builtin N M`. Presets without an
   * `advanced` field still emit `builtin N M` regardless. Defaults to
   * false (Phase A behavior).
   *
   * The platform UI should label this "experimental" because it requires
   * the user's firmware NOT to have `DISABLE_BASIC_PARSER_STYLES`
   * defined. Stock ProffieOS + Fett263 prop builds satisfy this; vendor
   * builds may not.
   */
  useAdvancedVerb?: boolean;
}

// ─── Internal helpers ───

/**
 * Sanitize a string value before writing it into a `key=value` line.
 *
 * ProffieOS's `readString()` reads until newline, so we strip embedded
 * newlines + carriage returns. We don't escape anything else — the
 * parser is lenient and unknown content is read literally.
 *
 * Note: ProffieOS itself uses LSPtr<char> heap-allocated strings with
 * no hard length cap, but very long names truncate visibly on SSD1306
 * (16-char displays). Callers should cap presetName for UX; this
 * function only sanitizes, not truncates.
 */
function sanitizeValue(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim();
}

/**
 * Build a `style=builtin N M` line. Validates against
 * `IsValidStyleString()`: verb must be lowercase letters, then digits/
 * spaces/commas only. `builtin <int> <int>` always satisfies this.
 */
function buildBuiltinStyleString(presetIndex: number, bladeNumber: number): string {
  const safeIndex = Math.max(0, Math.floor(presetIndex));
  const safeBlade = Math.max(1, Math.floor(bladeNumber));
  return `builtin ${safeIndex} ${safeBlade}`;
}

function clampU8(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbCsv(c: { r: number; g: number; b: number }): string {
  return `${clampU8(c.r)},${clampU8(c.g)},${clampU8(c.b)}`;
}

/**
 * Build a `style=advanced ...` line using the 11-slot ProffieOS named-
 * style signature. The verb must pass `IsValidStyleString()`: lowercase
 * letters → space → digits/spaces/commas only. `advanced` + space-
 * separated comma-delimited RGB triples + integers satisfies this.
 *
 * Layout (from style_parser.h named_styles[] `"advanced"`):
 *   advanced  R1,G1,B1  R2,G2,B2  R3,G3,B3  R4,G4,B4
 *             onSparkTimeMs
 *             R6,G6,B6  R7,G7,B7  R8,G8,B8
 *             extensionMs  retractionMs
 *             R11,G11,B11
 *
 * Total 11 args following the verb.
 */
function buildAdvancedStyleString(p: AdvancedVerbParams): string {
  const slots = [
    rgbCsv(p.color1),
    rgbCsv(p.color2),
    rgbCsv(p.color3),
    rgbCsv(p.onSparkColor),
    String(Math.max(0, Math.floor(p.onSparkTimeMs))),
    rgbCsv(p.blastColor),
    rgbCsv(p.lockupColor),
    rgbCsv(p.clashColor),
    String(Math.max(0, Math.floor(p.extensionMs))),
    String(Math.max(0, Math.floor(p.retractionMs))),
    rgbCsv(p.sparkTipColor),
  ];
  return `advanced ${slots.join(' ')}`;
}

// ─── Public emitter function ───

/**
 * Build the literal text content of a `presets.ini` file for ProffieOS
 * runtime preset loading. Pure function — no I/O.
 *
 * The returned string is suitable for writing directly to the SD card
 * root as `presets.ini`. ProffieOS will pick it up at next reboot
 * (or sooner, depending on prop file behavior).
 */
export function buildRuntimePresetsFile(opts: ProffieRuntimeEmitOptions): string {
  const lines: string[] = [];
  lines.push(`installed=${sanitizeValue(opts.installTime)}`);
  const useAdvanced = opts.useAdvancedVerb === true;

  for (const p of opts.presets) {
    const fontName = sanitizeValue(p.fontName);
    const trackFile = sanitizeValue(p.trackFile ?? `tracks/${fontName}.wav`);
    const presetName = sanitizeValue(p.presetName);
    const variation = Number.isFinite(p.variation) ? Math.floor(p.variation as number) : 0;

    lines.push('new_preset');
    lines.push(`font=${fontName}`);
    lines.push(`track=${trackFile}`);

    // Per-preset style emission:
    // - Phase C opt-in AND this preset has `advanced` params → emit
    //   `advanced R,G,B …` (one identical line per blade; the advanced
    //   verb doesn't take a blade index).
    // - Otherwise → emit `builtin N M` per blade (Phase A).
    if (useAdvanced && p.advanced) {
      const advancedLine = buildAdvancedStyleString(p.advanced);
      for (let blade = 1; blade <= opts.numBlades; blade++) {
        lines.push(`style=${advancedLine}`);
      }
    } else {
      for (let blade = 1; blade <= opts.numBlades; blade++) {
        lines.push(`style=${buildBuiltinStyleString(p.builtinPresetIndex, blade)}`);
      }
    }

    lines.push(`name=${presetName}`);
    lines.push(`variation=${variation}`);
  }

  lines.push('end');
  return lines.join('\n') + '\n';
}

// Export for tests + caller code that wants to build the style string
// independently (e.g. for showing a preview to the user).
export { buildAdvancedStyleString };

// ─── BoardEmitter conformance ───
//
// ProffieOS Runtime export doesn't take a per-preset StyleNode AST the way
// the C++ codegen path does — the runtime format only stores references
// (`builtin N M`) to the factory firmware's compiled preset bank, plus
// font/track/name metadata. Conforming to the BoardEmitter shape keeps the
// multi-board registry uniform but the AST argument is ignored.
//
// For Phase A, the emitter expects platform-supplied options to carry the
// `builtinPresetIndex` and `runtime*` fields via the open `[key: string]:
// unknown` slot on BoardEmitOptions. Default mapping: the preset's index
// in the input array maps 1:1 to its builtinPresetIndex. The platform
// layer can override per preset by setting `runtimeBuiltinPresetIndex`
// on the options object.

interface RuntimeEmitOptions extends BoardEmitOptions {
  runtimeBuiltinPresetIndex?: number;
  runtimeVariation?: number;
  runtimeTrackFile?: string;
}

export class ProffieRuntimeEmitter implements BoardEmitter {
  readonly boardId = 'proffie-runtime';
  readonly boardName = 'ProffieOS Runtime (SD card)';
  readonly formatDescription =
    'ProffieOS presets.ini — runtime-loaded preset file (SAVE_PRESET / Workbench format)';

  /** Required for the BoardEmitter interface; supplied by the platform layer. */
  installTime: string;
  /** Required for the BoardEmitter interface; supplied by the platform layer. */
  numBlades: 1 | 2 | 3 | 4;

  constructor(opts?: { installTime?: string; numBlades?: 1 | 2 | 3 | 4 }) {
    this.installTime = opts?.installTime ?? '';
    this.numBlades = opts?.numBlades ?? 1;
  }

  emit(ast: StyleNode, options: BoardEmitOptions): EmitterOutput {
    return this.emitMultiPreset([{ ast, options }]);
  }

  emitMultiPreset(
    presets: Array<{ ast: StyleNode; options: BoardEmitOptions }>,
  ): EmitterOutput {
    const inputs: ProffieRuntimePresetInput[] = presets.map((p, i) => {
      const rt = p.options as RuntimeEmitOptions;
      return {
        presetName: p.options.presetName,
        fontName: p.options.fontName,
        trackFile: rt.runtimeTrackFile,
        builtinPresetIndex:
          typeof rt.runtimeBuiltinPresetIndex === 'number'
            ? rt.runtimeBuiltinPresetIndex
            : i,
        variation: rt.runtimeVariation,
      };
    });

    const content = buildRuntimePresetsFile({
      installTime: this.installTime,
      numBlades: this.numBlades,
      presets: inputs,
    });

    return {
      configContent: content,
      configFileName: 'presets.ini',
    };
  }
}
