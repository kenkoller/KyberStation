// ─── Deliverability — what actually transfers from editor to saber ───
//
// KyberStation's editor can model far more than any single export path
// actually carries to hardware. The deliverability function reports, per
// export target × design choice, whether the choice "transfers" to the
// saber, is "dropped silently," is "partial / lossy," or is purely
// "design-reference" (visualizer documentation only).
//
// This module is the single source of truth that the editor + CardWriter
// + export-confirmation UI all read from. Honest-by-default: if a user
// designs a magenta blade and picks an export target that won't carry
// custom colors, the UI says so before they hit Export.
//
// Phase 1 scope (this module):
//   - Implements deliverability for `proffie_runtime` (the immediate hole
//     opened by Runtime Presets Phase A), `cfx`, and `golden_harvest`
//     (design-reference only).
//   - Stubs `proffie` and `xenopixel` with their best-known status so
//     callers always get a structured response. Future PRs flesh those
//     out fully.

import type { BladeConfig } from '@kyberstation/engine';
import type { BoardId } from './zipExporter';

// ─── Public types ───

/**
 * The status of a single design knob's transferability for a given export
 * target. The summary view aggregates these to a one-line status.
 */
export type DeliverabilityCapability =
  /** Knob transfers fully to the saber. */
  | 'deliverable'
  /** Knob is silently dropped — user's design choice does not reach saber. */
  | 'dropped-silently'
  /** Knob is partially / lossily mapped. User should review. */
  | 'partial'
  /** Target is documentation-only (CFX/GH) — nothing is actually flashable. */
  | 'design-reference'
  /** Chassis isn't validated; cannot confirm whether knob would transfer. */
  | 'unknown';

/** Stable knob identifiers used across the editor + reports. */
export type DesignKnob =
  | 'presetName'
  | 'fontName'
  | 'trackFile'
  | 'presetOrder'
  | 'variation'
  | 'baseColor'
  | 'clashColor'
  | 'lockupColor'
  | 'blastColor'
  | 'style'
  | 'ignition'
  | 'ignitionMs'
  | 'retraction'
  | 'retractionMs'
  | 'shimmer'
  | 'modulation';

/** Per-knob delivery status with a user-facing rationale. */
export interface KnobDeliverability {
  knob: DesignKnob;
  capability: DeliverabilityCapability;
  /** Plain-English explanation shown to the user when expanded. */
  reason: string;
}

/** Aggregated delivery report for one preset, one export target. */
export interface DeliverabilityReport {
  target: BoardId;
  /**
   * Overall posture for headline UI:
   *   - 'full'       — every customized knob transfers
   *   - 'partial'    — some knobs transfer, others drop or are partial
   *   - 'design-only' — visualizer-doc target (CFX/GH); nothing flashes
   *   - 'unknown'     — chassis not validated for compile+flash
   */
  overall: 'full' | 'partial' | 'design-only' | 'unknown';
  knobs: KnobDeliverability[];
  /** Compact human-readable summary for headline + tooltip. */
  summary: string;
}

// ─── Default / "untouched" detection ───
//
// A knob counts as "customized" when its value differs from the
// editor's default for a fresh new preset. The Runtime Presets Phase
// A path silently drops every customized knob except name/font/track/
// order/variation — so detecting "is this knob customized" lets us
// surface "your custom X won't transfer" only when it actually matters.

interface DefaultBaseline {
  baseColor: { r: number; g: number; b: number };
  clashColor: { r: number; g: number; b: number };
  lockupColor: { r: number; g: number; b: number };
  blastColor: { r: number; g: number; b: number };
  style: string;
  ignition: string;
  retraction: string;
  ignitionMs: number;
  retractionMs: number;
  shimmer: number;
}

/**
 * The factory-untouched baseline for a fresh preset. Knobs equal to this
 * baseline are considered "not customized" and don't trigger
 * deliverability warnings even on lossy export paths.
 */
const DEFAULT_BASELINE: DefaultBaseline = {
  baseColor: { r: 0, g: 140, b: 255 },     // standard cyan-blue
  clashColor: { r: 255, g: 255, b: 255 },  // white
  lockupColor: { r: 255, g: 220, b: 80 },  // amber
  blastColor: { r: 255, g: 255, b: 255 },  // white
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 800,
  shimmer: 0,
};

function colorEquals(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

/**
 * Returns the set of customized knobs for a given BladeConfig — knobs
 * the user has changed from the default baseline. Exposed so callers
 * (and tests) can ask "is this preset substantively customized at all?"
 */
export function customizedKnobs(config: BladeConfig): Set<DesignKnob> {
  const customized = new Set<DesignKnob>();
  if (!colorEquals(config.baseColor, DEFAULT_BASELINE.baseColor)) {
    customized.add('baseColor');
  }
  if (!colorEquals(config.clashColor, DEFAULT_BASELINE.clashColor)) {
    customized.add('clashColor');
  }
  if (!colorEquals(config.lockupColor, DEFAULT_BASELINE.lockupColor)) {
    customized.add('lockupColor');
  }
  if (!colorEquals(config.blastColor, DEFAULT_BASELINE.blastColor)) {
    customized.add('blastColor');
  }
  if (config.style !== DEFAULT_BASELINE.style) customized.add('style');
  if (config.ignition !== DEFAULT_BASELINE.ignition) customized.add('ignition');
  if (config.retraction !== DEFAULT_BASELINE.retraction) customized.add('retraction');
  if (config.ignitionMs !== DEFAULT_BASELINE.ignitionMs) customized.add('ignitionMs');
  if (config.retractionMs !== DEFAULT_BASELINE.retractionMs) customized.add('retractionMs');
  if (config.shimmer !== DEFAULT_BASELINE.shimmer) customized.add('shimmer');
  // Modulation: any non-empty bindings array counts as customized.
  const modulation = (config as BladeConfig & { modulation?: { bindings?: unknown[] } }).modulation;
  if (modulation?.bindings && modulation.bindings.length > 0) {
    customized.add('modulation');
  }
  return customized;
}

// ─── Per-target deliverability tables ───
//
// Each board has its own knob → capability mapping. Keeping each table
// declarative + close to the data makes it easy to audit at a glance and
// keeps the report builder a thin formatter.

interface KnobTable {
  [knob: string]: { capability: DeliverabilityCapability; reason: string };
}

/**
 * ProffieOS Runtime Presets Phase A — emits `style=builtin N M` only.
 * EVERY BladeConfig design choice beyond name/font/track/variation/order
 * is silently dropped.
 */
const PROFFIE_RUNTIME_PHASE_A_TABLE: KnobTable = {
  presetName: { capability: 'deliverable', reason: 'Transfers via `name=` line.' },
  fontName: { capability: 'deliverable', reason: 'Transfers via `font=` line.' },
  trackFile: { capability: 'deliverable', reason: 'Transfers via `track=` line.' },
  presetOrder: { capability: 'deliverable', reason: 'Transfers via the order of preset blocks in `presets.ini`.' },
  variation: { capability: 'deliverable', reason: 'Transfers via `variation=` line.' },
  baseColor: {
    capability: 'dropped-silently',
    reason: 'Phase A references factory presets by index (`style=builtin N M`); custom colors do not transfer. Switch to Phase C — custom styles to lift this.',
  },
  clashColor: {
    capability: 'dropped-silently',
    reason: 'Phase A references factory presets by index; custom clash colors do not transfer. Switch to Phase C to lift this.',
  },
  lockupColor: {
    capability: 'dropped-silently',
    reason: 'Phase A references factory presets by index; custom lockup colors do not transfer. Switch to Phase C to lift this.',
  },
  blastColor: {
    capability: 'dropped-silently',
    reason: 'Phase A references factory presets by index; custom blast colors do not transfer. Switch to Phase C to lift this.',
  },
  style: {
    capability: 'dropped-silently',
    reason: 'Phase A references factory presets by index; the actual blade style on the saber is whatever your firmware compiled at that index.',
  },
  ignition: {
    capability: 'dropped-silently',
    reason: 'Phase A references factory presets by index; ignition animation is whatever your firmware compiled.',
  },
  ignitionMs: {
    capability: 'dropped-silently',
    reason: 'Phase A references factory presets by index; ignition timing does not transfer. Switch to Phase C to lift this.',
  },
  retraction: {
    capability: 'dropped-silently',
    reason: 'Phase A references factory presets by index; retraction animation is whatever your firmware compiled.',
  },
  retractionMs: {
    capability: 'dropped-silently',
    reason: 'Phase A references factory presets by index; retraction timing does not transfer. Switch to Phase C to lift this.',
  },
  shimmer: {
    capability: 'dropped-silently',
    reason: 'Runtime preset format has no shimmer slot.',
  },
  modulation: {
    capability: 'dropped-silently',
    reason: 'Runtime preset format does not carry modulation bindings — those need compiled-in style templates (compile+flash path).',
  },
};

/**
 * ProffieOS Runtime Presets Phase C — emits `style=advanced R,G,B …` so
 * colors + timing transfer to the saber without firmware flash. The
 * 11-slot `advanced` named verb covers base / blast / lockup / clash
 * colors plus extension + retraction timing. Style algorithm and
 * shimmer + modulation remain firmware-compiled.
 *
 * Phase C is opt-in and experimental: depends on the user's firmware
 * NOT having `DISABLE_BASIC_PARSER_STYLES` defined. Most stock
 * ProffieOS + Fett263 prop builds satisfy this; some vendor builds
 * may not.
 */
const PROFFIE_RUNTIME_PHASE_C_TABLE: KnobTable = {
  presetName: { capability: 'deliverable', reason: 'Transfers via `name=` line.' },
  fontName: { capability: 'deliverable', reason: 'Transfers via `font=` line.' },
  trackFile: { capability: 'deliverable', reason: 'Transfers via `track=` line.' },
  presetOrder: { capability: 'deliverable', reason: 'Transfers via the order of preset blocks in `presets.ini`.' },
  variation: { capability: 'deliverable', reason: 'Transfers via `variation=` line.' },
  baseColor: {
    capability: 'deliverable',
    reason: 'Phase C emits `advanced R,G,B …` with the base color in slots 1/2/3. Single-color blade renders correctly. Empirically verified on 89sabers V3.9-BT 2026-05-16 (hilt-mounted): with proper 16-bit color scaling (each RGB channel × 257 = 0-65535 range matching ProffieOS\'s Color16 RgbArg parser in styles/rgb_arg.h:41), the blade renders at factory-equivalent brightness. Requires firmware to NOT have DISABLE_BASIC_PARSER_STYLES defined (true for stock ProffieOS + standard Fett263 prop builds).',
  },
  clashColor: {
    capability: 'deliverable',
    reason: 'Phase C emits `advanced` slot 8 (clash color), 16-bit-scaled to match ProffieOS\'s RgbArg parser. Requires firmware to NOT have DISABLE_BASIC_PARSER_STYLES defined.',
  },
  lockupColor: {
    capability: 'deliverable',
    reason: 'Phase C emits `advanced` slot 7 (lockup AudioFlicker partner), 16-bit-scaled. Requires firmware to NOT have DISABLE_BASIC_PARSER_STYLES defined.',
  },
  blastColor: {
    capability: 'deliverable',
    reason: 'Phase C emits `advanced` slot 6 (blast color), 16-bit-scaled. Requires firmware to NOT have DISABLE_BASIC_PARSER_STYLES defined.',
  },
  style: {
    capability: 'dropped-silently',
    reason: 'Phase C uses the `advanced` named verb which is a fixed Layers<InOutSparkTipX<...>> template. The specific KyberStation style algorithm (Crystal Shatter, Aurora, etc.) is not represented; only its colors are.',
  },
  ignition: {
    capability: 'dropped-silently',
    reason: 'Phase C uses the `advanced` named verb which has a fixed InOutSparkTipX ignition; KyberStation ignition animation type is not modeled.',
  },
  ignitionMs: {
    capability: 'deliverable',
    reason: 'Phase C emits `advanced` slot 9 (extension time). Transfers as a raw millisecond value.',
  },
  retraction: {
    capability: 'dropped-silently',
    reason: 'Phase C uses the `advanced` named verb which has a fixed retraction shape.',
  },
  retractionMs: {
    capability: 'deliverable',
    reason: 'Phase C emits `advanced` slot 10 (retraction time). Transfers as a raw millisecond value.',
  },
  shimmer: {
    capability: 'dropped-silently',
    reason: 'Runtime preset format has no shimmer slot.',
  },
  modulation: {
    capability: 'dropped-silently',
    reason: 'Runtime preset format does not carry modulation bindings — those need compiled-in style templates (compile+flash path).',
  },
};

/**
 * CFX / Golden Harvest are design-reference paths today: the ZIP carries
 * structured notes, NOT a flashable bundle. Every knob is "documented"
 * but nothing actually flashes from KyberStation. The READMEs already
 * disclose this; this table makes it programmatic.
 */
const DESIGN_REFERENCE_TABLE: KnobTable = Object.fromEntries(
  (Object.keys(PROFFIE_RUNTIME_PHASE_A_TABLE) as DesignKnob[]).map((k) => [
    k,
    {
      capability: 'design-reference' as DeliverabilityCapability,
      reason: 'This export is design-reference notes only — KyberStation cannot write flashable firmware for this board. Use the ZIP as a guide when configuring via the vendor app.',
    },
  ]),
);

/**
 * Stock Proffie V3 compile+flash — the validated path. Most knobs
 * deliver; engine-only styles fall back; modulation bindings are
 * partially mapped via the v1.1 composer.
 */
const PROFFIE_COMPILE_FLASH_TABLE: KnobTable = {
  presetName: { capability: 'deliverable', reason: 'Compiled into the Preset[] array.' },
  fontName: { capability: 'deliverable', reason: 'Compiled into the Preset[] array.' },
  trackFile: { capability: 'deliverable', reason: 'Compiled into the Preset[] array.' },
  presetOrder: { capability: 'deliverable', reason: 'Compiled in array order.' },
  variation: { capability: 'deliverable', reason: 'Compiled into the preset variation seed.' },
  baseColor: { capability: 'deliverable', reason: 'Emitted as Rgb<R,G,B> in the style template.' },
  clashColor: { capability: 'deliverable', reason: 'Emitted in the SimpleClash<> color slot.' },
  lockupColor: { capability: 'deliverable', reason: 'Emitted in the Lockup<> color slot.' },
  blastColor: { capability: 'deliverable', reason: 'Emitted in the BlastL<>/Blast<> color slot.' },
  style: {
    capability: 'partial',
    reason: '32 of 33 KyberStation styles have ProffieOS codegen parity. Only `automata` (Rule 30 cellular automaton) lacks an honest template approximation and silently falls back to a stable style. See engine-style-parity-check CI guard.',
  },
  ignition: { capability: 'deliverable', reason: 'Emitted as an InOutTrL<>/InOutFunc<> ignition template.' },
  ignitionMs: { capability: 'deliverable', reason: 'Emitted as Int<N> argument to the ignition template.' },
  retraction: { capability: 'deliverable', reason: 'Emitted as the retraction half of InOutTrL<>/InOutFunc<>.' },
  retractionMs: { capability: 'deliverable', reason: 'Emitted as Int<N> argument to the retraction template.' },
  shimmer: { capability: 'deliverable', reason: 'Emitted as AudioFlicker<>/HumpFlicker<> intensity.' },
  modulation: {
    capability: 'partial',
    reason: 'Mappable bindings become live ProffieOS templates via the v1.1 composer; unmappable bindings are snapshotted into the AST (the live blade does not respond to that input).',
  },
};

/**
 * Xenopixel V3 SD card export — real flashable format, but the firmware
 * only supports a small set of effects so the editor's design space is
 * larger than what survives the trip.
 */
const XENOPIXEL_TABLE: KnobTable = {
  presetName: { capability: 'deliverable', reason: 'Transfers via numbered folder name on the SD card.' },
  fontName: { capability: 'deliverable', reason: 'Transfers via folder structure.' },
  trackFile: { capability: 'partial', reason: 'Xenopixel uses fixed track file names per folder.' },
  presetOrder: { capability: 'deliverable', reason: 'Transfers via numbered folders (1/, 2/, …).' },
  variation: { capability: 'dropped-silently', reason: 'Xenopixel V3 does not have a per-preset variation seed.' },
  baseColor: { capability: 'deliverable', reason: 'Transfers via the (R,G,B) tuple in fontconfig.ini.' },
  clashColor: { capability: 'dropped-silently', reason: 'Xenopixel V3 does not carry per-preset clash colors in fontconfig.ini.' },
  lockupColor: { capability: 'dropped-silently', reason: 'Xenopixel V3 does not carry per-preset lockup colors in fontconfig.ini.' },
  blastColor: { capability: 'dropped-silently', reason: 'Xenopixel V3 does not carry per-preset blast colors in fontconfig.ini.' },
  style: { capability: 'partial', reason: 'Only the 8 Xeno blade effects (Fire, Steady, Unstable, Rainbow, Candy, Crack, Pulse, Flashing) are supported. KyberStation styles outside this set fall back to Steady.' },
  ignition: { capability: 'partial', reason: 'Mapped to one of Xeno’s 12 ignition styles; KyberStation ignitions outside this set fall back to Standard.' },
  ignitionMs: { capability: 'deliverable', reason: 'Transfers as the ignitionSpeed field in fontconfig.ini.' },
  retraction: { capability: 'dropped-silently', reason: 'Xenopixel V3 fontconfig.ini does not carry a separate retraction style.' },
  retractionMs: { capability: 'deliverable', reason: 'Transfers as the retractionSpeed field in fontconfig.ini.' },
  shimmer: { capability: 'dropped-silently', reason: 'Xenopixel firmware does not expose a shimmer parameter.' },
  modulation: { capability: 'dropped-silently', reason: 'Xenopixel firmware has no equivalent of ProffieOS modulation bindings.' },
};

/**
 * Optional context that affects deliverability for some targets. Right
 * now only `proffie_runtime` honors it (Phase A vs Phase C). Future:
 * `proffie` could read `validatedBoot: boolean` here so unverified
 * chassis flip to `unknown` capability.
 */
export interface DeliverabilityContext {
  /** Phase C "Custom styles" toggle for proffie_runtime. Default false. */
  runtimeUseAdvancedVerb?: boolean;
}

function getKnobTable(target: BoardId, ctx?: DeliverabilityContext): KnobTable {
  switch (target) {
    case 'proffie_runtime':
      return ctx?.runtimeUseAdvancedVerb
        ? PROFFIE_RUNTIME_PHASE_C_TABLE
        : PROFFIE_RUNTIME_PHASE_A_TABLE;
    case 'cfx':
    case 'golden_harvest': return DESIGN_REFERENCE_TABLE;
    case 'proffie': return PROFFIE_COMPILE_FLASH_TABLE;
    case 'xenopixel': return XENOPIXEL_TABLE;
  }
}

// ─── Public API ───

const ALL_KNOBS: DesignKnob[] = [
  'presetName',
  'fontName',
  'trackFile',
  'presetOrder',
  'variation',
  'baseColor',
  'clashColor',
  'lockupColor',
  'blastColor',
  'style',
  'ignition',
  'ignitionMs',
  'retraction',
  'retractionMs',
  'shimmer',
  'modulation',
];

/**
 * Build a deliverability report for one BladeConfig × export target.
 *
 * The caller can choose to filter `knobs` to only customized ones via
 * `customizedKnobs(config)` for a more focused warning UI. This function
 * always returns the full table so the caller has the option to render
 * either view.
 */
export function getDeliverability(
  config: BladeConfig,
  target: BoardId,
  ctx?: DeliverabilityContext,
): DeliverabilityReport {
  const table = getKnobTable(target, ctx);
  const knobs: KnobDeliverability[] = ALL_KNOBS.map((knob) => ({
    knob,
    capability: table[knob].capability,
    reason: table[knob].reason,
  }));

  const overall = computeOverall(target, knobs);
  const summary = formatSummary(target, overall, knobs, config);

  return { target, overall, knobs, summary };
}

function computeOverall(
  target: BoardId,
  knobs: KnobDeliverability[],
): DeliverabilityReport['overall'] {
  if (target === 'cfx' || target === 'golden_harvest') return 'design-only';

  const hasDropped = knobs.some((k) => k.capability === 'dropped-silently');
  const hasPartial = knobs.some((k) => k.capability === 'partial');
  const hasUnknown = knobs.some((k) => k.capability === 'unknown');

  if (hasUnknown) return 'unknown';
  if (hasDropped || hasPartial) return 'partial';
  return 'full';
}

function formatSummary(
  _target: BoardId,
  overall: DeliverabilityReport['overall'],
  knobs: KnobDeliverability[],
  config: BladeConfig,
): string {
  if (overall === 'design-only') {
    return 'Design-reference only — KyberStation cannot write flashable firmware for this target. The ZIP documents your intended values for manual configuration via the vendor app.';
  }
  if (overall === 'unknown') {
    return 'This chassis has not been validated to boot KyberStation firmware. Flash at your own risk; have your factory backup ready.';
  }

  const customized = customizedKnobs(config);
  const droppedCustomized = knobs.filter(
    (k) =>
      k.capability === 'dropped-silently' && customized.has(k.knob),
  );

  if (overall === 'full') {
    return 'Your full design transfers to this saber.';
  }
  // partial
  if (droppedCustomized.length === 0) {
    return 'Some knobs partial; you have not customized any of the dropped knobs in this preset.';
  }
  const labels = droppedCustomized.map((k) => humanizeKnob(k.knob)).join(', ');
  return `Your custom ${labels} will NOT transfer via this export path.`;
}

const KNOB_LABELS: Record<DesignKnob, string> = {
  presetName: 'preset name',
  fontName: 'font',
  trackFile: 'track file',
  presetOrder: 'preset order',
  variation: 'variation',
  baseColor: 'base color',
  clashColor: 'clash color',
  lockupColor: 'lockup color',
  blastColor: 'blast color',
  style: 'blade style',
  ignition: 'ignition animation',
  ignitionMs: 'ignition timing',
  retraction: 'retraction animation',
  retractionMs: 'retraction timing',
  shimmer: 'shimmer',
  modulation: 'modulation bindings',
};

export function humanizeKnob(knob: DesignKnob): string {
  return KNOB_LABELS[knob];
}
