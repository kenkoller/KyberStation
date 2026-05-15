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

  for (const p of opts.presets) {
    const fontName = sanitizeValue(p.fontName);
    const trackFile = sanitizeValue(p.trackFile ?? `tracks/${fontName}.wav`);
    const presetName = sanitizeValue(p.presetName);
    const variation = Number.isFinite(p.variation) ? Math.floor(p.variation as number) : 0;

    lines.push('new_preset');
    lines.push(`font=${fontName}`);
    lines.push(`track=${trackFile}`);
    for (let blade = 1; blade <= opts.numBlades; blade++) {
      lines.push(`style=${buildBuiltinStyleString(p.builtinPresetIndex, blade)}`);
    }
    lines.push(`name=${presetName}`);
    lines.push(`variation=${variation}`);
  }

  lines.push('end');
  return lines.join('\n') + '\n';
}

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
