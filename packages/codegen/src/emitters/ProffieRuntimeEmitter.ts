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
// Scope:
//   - Phase A (default): `style=builtin N M` — references the factory
//     firmware's preset bank by index. Reorder / rename / duplicate /
//     font reassignment; the design's colors and style do not transfer.
//   - Phase C (opt-in "custom styles"): a per-preset runtime verb string —
//     `advanced` / `unstable` / `fire` / `cycle` / `rainbow` / `strobe` —
//     chosen by `mapBladeConfigToRuntimeStyle()` in `runtimeVerbs.ts`,
//     which also owns the byte-exact verb builders.
//   - Phase B (color overrides via `builtin N M R,G,B …`) stays deferred:
//     it needs per-chassis RgbArg schema knowledge.
//
// External writers must put a byte-identical copy of this file at
// `presets.tmp` too — see apps/web/lib/runtimePresetIO.ts.

import type { StyleNode } from '../types.js';
import type { BoardEmitter, BoardEmitOptions, EmitterOutput } from './BaseEmitter.js';
import {
  buildAdvancedStyleString,
  buildBuiltinStyleString,
  isValidRuntimeStyleString,
  type AdvancedVerbParams,
} from './runtimeVerbs.js';

export type { AdvancedVerbParams };

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
   * Phase C: a pre-built runtime style string (normally
   * `mapBladeConfigToRuntimeStyle(config).styleString`). Emitted instead of
   * `builtin N M` when the caller sets `useAdvancedVerb: true`, and takes
   * precedence over `advanced`. Must pass `isValidRuntimeStyleString()` —
   * `buildRuntimePresetsFile` throws otherwise rather than write a line
   * ProffieOS would misparse.
   */
  styleString?: string;
  /**
   * Optional Phase C `advanced`-verb parameters (the 11-slot signature
   * of the ProffieOS `advanced` named style). Used when `useAdvancedVerb`
   * is on and no `styleString` is given.
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
   * Phase C opt-in ("custom styles"): when true, presets with a
   * `styleString` (or `advanced` params) emit that runtime verb line —
   * a custom style independent of the factory bank — instead of
   * `style=builtin N M`. Presets with neither still emit `builtin N M`.
   * Defaults to false (Phase A behavior). The name is historical: the
   * mapped verb can be any of advanced / unstable / fire / cycle /
   * rainbow / strobe.
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

// Verb builders (`buildBuiltinStyleString`, `buildAdvancedStyleString`, …)
// live in `runtimeVerbs.ts`. CRITICAL encoding note kept here because it
// cost a bench session: ProffieOS's runtime `RgbArg<>` (`styles/rgb_arg.h`)
// stores parsed integers straight into `Color16` — 0-65535 per channel, NO
// 8→16 scaling — so every color is emitted ×257. Emitting 8-bit values
// rendered Phase C blades at ~0.4% brightness until PR #325 fixed it
// (bench-verified on the 89sabers V3.9-BT 2026-05-16).

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
    // - Phase C opt-in AND this preset carries a `styleString` (or legacy
    //   `advanced` params) → emit that verb line once per blade (the
    //   runtime verbs don't take a blade index).
    // - Otherwise → emit `builtin N M` per blade (Phase A).
    const customLine =
      useAdvanced && p.styleString !== undefined
        ? p.styleString
        : useAdvanced && p.advanced
          ? buildAdvancedStyleString(p.advanced)
          : undefined;
    if (customLine !== undefined) {
      if (!isValidRuntimeStyleString(customLine)) {
        throw new Error(
          `Invalid ProffieOS runtime style string for preset "${presetName}": "${customLine}" ` +
            '(IsValidStyleString requires a lowercase verb, then digits, spaces and commas only).',
        );
      }
      for (let blade = 1; blade <= opts.numBlades; blade++) {
        lines.push(`style=${customLine}`);
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

// Re-exported for backward compatibility (the builder moved to runtimeVerbs.ts).
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
