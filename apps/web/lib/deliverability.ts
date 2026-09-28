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
import {
  mapBladeConfigToRuntimeStyle,
  RUNTIME_VERB_SLOTS,
  type RuntimeStyleMapping,
  type RuntimeVerb,
} from '@kyberstation/codegen';
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
 * ProffieOS Runtime Presets, factory-style mode (historically "Phase A") —
 * emits `style=builtin N M` only.
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
    reason: 'Factory-style mode gives each preset the factory blade style at the same list position (`style=builtin N M`); your custom colors do not transfer. Switch to "Use my colors and blade style" to lift this.',
  },
  clashColor: {
    capability: 'dropped-silently',
    reason: 'Factory-style mode uses the factory blade style at the same list position; your custom clash colors do not transfer. Switch to "Use my colors and blade style" to lift this.',
  },
  lockupColor: {
    capability: 'dropped-silently',
    reason: 'Factory-style mode uses the factory blade style at the same list position; your custom lockup colors do not transfer. Switch to "Use my colors and blade style" to lift this.',
  },
  blastColor: {
    capability: 'dropped-silently',
    reason: 'Factory-style mode uses the factory blade style at the same list position; your custom blast colors do not transfer. Switch to "Use my colors and blade style" to lift this.',
  },
  style: {
    capability: 'dropped-silently',
    reason: 'Factory-style mode uses the factory blade style at the same list position — whatever your firmware compiled into that slot, not the style you designed.',
  },
  ignition: {
    capability: 'dropped-silently',
    reason: 'Factory-style mode uses the factory blade style at the same list position; the ignition animation is whatever your firmware compiled.',
  },
  ignitionMs: {
    capability: 'dropped-silently',
    reason: 'Factory-style mode uses the factory blade style at the same list position; your ignition timing does not transfer. Switch to "Use my colors and blade style" to lift this.',
  },
  retraction: {
    capability: 'dropped-silently',
    reason: 'Factory-style mode uses the factory blade style at the same list position; the retraction animation is whatever your firmware compiled.',
  },
  retractionMs: {
    capability: 'dropped-silently',
    reason: 'Factory-style mode uses the factory blade style at the same list position; your retraction timing does not transfer. Switch to "Use my colors and blade style" to lift this.',
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
 * What each runtime verb does with the effects it has NO slot for — the
 * fixed behavior baked into its ProffieOS 7.12 `named_styles[]` template.
 * Only read for knobs where `RUNTIME_VERB_SLOTS[verb]` is false.
 */
const RUNTIME_VERB_FIXED: Record<
  RuntimeVerb,
  { clash: string; blast: string; lockup: string; timing: string }
> = {
  builtin: {
    clash: 'the factory style decides the clash',
    blast: 'the factory style decides the blast',
    lockup: 'the factory style decides the lockup',
    timing: 'the factory style decides the timing',
  },
  standard: {
    clash: '',
    blast: 'blasts flash white',
    lockup: 'lockup flickers toward white',
    timing: '',
  },
  advanced: { clash: '', blast: '', lockup: '', timing: '' },
  fire: {
    clash: 'a clash stokes the flames instead of flashing a color',
    blast: 'there is no blast layer',
    lockup: 'lockup stokes the flames instead of showing a color',
    timing: 'the flame heats up on its own — there are no ignition/retraction time slots',
  },
  unstable: {
    clash: 'clashes flash white',
    blast: 'blasts flash white',
    lockup: 'lockup is a fixed yellow/red flicker',
    timing: '',
  },
  strobe: {
    clash: 'clashes flash a rainbow',
    blast: 'blasts flash white',
    lockup: 'lockup flickers toward white',
    timing: '',
  },
  cycle: {
    clash: 'clashes flash white',
    blast: '',
    lockup: '',
    timing: 'the blade spins up over a fixed ~1 s — there are no ignition/retraction time slots',
  },
  rainbow: {
    clash: 'clashes flash white',
    blast: 'there is no blast layer',
    lockup: 'lockup flickers toward white',
    timing: '',
  },
};

const REQUIRES_PARSER_STYLES =
  'Requires firmware without DISABLE_BASIC_PARSER_STYLES (true for stock ProffieOS + standard Fett263 prop builds).';

/**
 * ProffieOS Runtime Presets, custom-styles mode ("Phase C"). Each preset is
 * emitted as its closest ProffieOS 7.12 runtime verb
 * (`mapBladeConfigToRuntimeStyle` in @kyberstation/codegen), so the table is
 * per preset: which knobs transfer depends on the verb its style maps to.
 * Colors are 16-bit scaled (×257) to match ProffieOS's Color16 `RgbArg`
 * parser — bench-verified at factory brightness on the 89sabers V3.9-BT.
 *
 * Opt-in and experimental: depends on the user's firmware NOT having
 * `DISABLE_BASIC_PARSER_STYLES` defined.
 */
function buildProffieRuntimeCustomTable(config: BladeConfig): KnobTable {
  const mapping = mapBladeConfigToRuntimeStyle(config);
  const verb = mapping.verb;
  const slots = RUNTIME_VERB_SLOTS[verb];
  const fixed = RUNTIME_VERB_FIXED[verb];
  const via = `\`${verb}\` runtime verb`;
  const slot = (
    has: boolean,
    carried: string,
    dropped: string,
  ): { capability: DeliverabilityCapability; reason: string } =>
    has
      ? { capability: 'deliverable', reason: carried }
      : { capability: 'dropped-silently', reason: dropped };

  return {
    presetName: { capability: 'deliverable', reason: 'Transfers via `name=` line.' },
    fontName: { capability: 'deliverable', reason: 'Transfers via `font=` line.' },
    trackFile: { capability: 'deliverable', reason: 'Transfers via `track=` line.' },
    presetOrder: { capability: 'deliverable', reason: 'Transfers via the order of preset blocks in `presets.ini`.' },
    variation: { capability: 'deliverable', reason: 'Transfers via `variation=` line.' },
    baseColor:
      verb === 'rainbow'
        ? {
            capability: 'partial',
            reason: 'The rainbow verb has no color slots — the blade cycles the full spectrum (the Prism style ignores the base color in the editor too).',
          }
        : slot(
            slots.baseColor,
            `Carried by the ${via} as 16-bit (×257) RgbArg colors. ${REQUIRES_PARSER_STYLES}`,
            `The ${via} has no slot for the blade color.`,
          ),
    clashColor: slot(
      slots.clashColor,
      `Carried by the ${via} (clash color slot), 16-bit scaled. ${REQUIRES_PARSER_STYLES}`,
      `The ${via} has no clash-color slot — ${fixed.clash}.`,
    ),
    lockupColor: slot(
      slots.lockupColor,
      `Carried by the ${via} (lockup color slot), 16-bit scaled. ${REQUIRES_PARSER_STYLES}`,
      `The ${via} has no lockup-color slot — ${fixed.lockup}.`,
    ),
    blastColor: slot(
      slots.blastColor,
      `Carried by the ${via} (blast color slot), 16-bit scaled. ${REQUIRES_PARSER_STYLES}`,
      `The ${via} has no blast-color slot — ${fixed.blast}.`,
    ),
    style: {
      capability:
        mapping.fidelity === 'faithful'
          ? 'deliverable'
          : mapping.fidelity === 'approximate'
            ? 'partial'
            : 'dropped-silently',
      reason: mapping.note,
    },
    ignition: {
      capability: 'dropped-silently',
      reason: `Runtime verbs have fixed ignition shapes (the ${via} can't pick one); your ignition animation type is not carried.`,
    },
    ignitionMs: slot(
      slots.ignitionMs,
      `Carried by the ${via} (extension time), as raw milliseconds.`,
      `Not carried: ${fixed.timing}.`,
    ),
    retraction: {
      capability: 'dropped-silently',
      reason: `Runtime verbs have fixed retraction shapes (the ${via} can't pick one); your retraction animation type is not carried.`,
    },
    retractionMs: slot(
      slots.retractionMs,
      `Carried by the ${via} (retraction time), as raw milliseconds.`,
      `Not carried: ${fixed.timing}.`,
    ),
    shimmer: {
      capability: 'dropped-silently',
      reason: 'Runtime preset format has no shimmer slot.',
    },
    modulation: {
      capability: 'dropped-silently',
      reason: 'Runtime preset format does not carry modulation bindings — those need compiled-in style templates (compile+flash path).',
    },
  };
}

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
  shimmer: {
    capability: 'dropped-silently',
    reason: 'The compile+flash codegen does not read the shimmer value: each style\'s flicker is fixed by its template (e.g. Stable\'s AudioFlicker at 50% white), so shimmer only changes the non-Hardware-Preview editor view. A modulation binding that targets shimmer is handled separately (see modulation bindings).',
  },
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
  /**
   * proffie_runtime "Use my colors and blade style" toggle (custom-styles
   * mode, historically "Phase C"). Default false = factory blade styles.
   */
  runtimeUseAdvancedVerb?: boolean;
}

function getKnobTable(
  target: BoardId,
  config: BladeConfig,
  ctx?: DeliverabilityContext,
): KnobTable {
  switch (target) {
    case 'proffie_runtime':
      return ctx?.runtimeUseAdvancedVerb
        ? buildProffieRuntimeCustomTable(config)
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
  const table = getKnobTable(target, config, ctx);
  const knobs: KnobDeliverability[] = ALL_KNOBS.map((knob) => ({
    knob,
    capability: table[knob].capability,
    reason: table[knob].reason,
  }));

  const overall = computeOverall(target, knobs);
  const summary = formatSummary(target, overall, knobs, customizedKnobs(config));

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
  customized: Set<DesignKnob>,
): string {
  if (overall === 'design-only') {
    return 'Design-reference only — KyberStation cannot write flashable firmware for this target. The ZIP documents your intended values for manual configuration via the vendor app.';
  }
  if (overall === 'unknown') {
    return 'This chassis has not been validated to boot KyberStation firmware. Flash at your own risk; have your factory backup ready.';
  }

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

// ─── Multi-preset bundles ───

/** Higher = worse for the user. `design-reference` is its own overall mode. */
const CAPABILITY_SEVERITY: Record<DeliverabilityCapability, number> = {
  deliverable: 0,
  unknown: 1,
  partial: 2,
  'design-reference': 3,
  'dropped-silently': 4,
};

const BUNDLE_FALLBACK_CONFIG: BladeConfig = {
  baseColor: { ...DEFAULT_BASELINE.baseColor },
  clashColor: { ...DEFAULT_BASELINE.clashColor },
  lockupColor: { ...DEFAULT_BASELINE.lockupColor },
  blastColor: { ...DEFAULT_BASELINE.blastColor },
  style: DEFAULT_BASELINE.style,
  ignition: DEFAULT_BASELINE.ignition,
  retraction: DEFAULT_BASELINE.retraction,
  ignitionMs: DEFAULT_BASELINE.ignitionMs,
  retractionMs: DEFAULT_BASELINE.retractionMs,
  shimmer: DEFAULT_BASELINE.shimmer,
  ledCount: 144,
};

/**
 * Deliverability for a whole export bundle. In custom-styles mode the
 * runtime table differs per preset (it follows each preset's runtime verb),
 * so every knob reports its WORST capability across the bundle — the panel
 * never claims "transfers" for a knob that some preset drops. When presets
 * disagree, the reason is prefixed with how many presets it applies to.
 */
export function getBundleDeliverability(
  configs: BladeConfig[],
  target: BoardId,
  ctx?: DeliverabilityContext,
): DeliverabilityReport {
  if (configs.length <= 1) {
    return getDeliverability(configs[0] ?? BUNDLE_FALLBACK_CONFIG, target, ctx);
  }
  const reports = configs.map((c) => getDeliverability(c, target, ctx));
  const knobs: KnobDeliverability[] = ALL_KNOBS.map((knob, i) => {
    const entries = reports.map((r) => r.knobs[i]!);
    const worst = entries.reduce((a, b) =>
      CAPABILITY_SEVERITY[b.capability] > CAPABILITY_SEVERITY[a.capability] ? b : a,
    );
    const matching = entries.filter((e) => e.capability === worst.capability).length;
    const reason =
      matching === entries.length
        ? worst.reason
        : `${matching} of ${entries.length} presets: ${worst.reason}`;
    return { knob, capability: worst.capability, reason };
  });

  const customized = new Set<DesignKnob>();
  for (const c of configs) {
    for (const k of customizedKnobs(c)) customized.add(k);
  }
  const overall = computeOverall(target, knobs);
  return { target, overall, knobs, summary: formatSummary(target, overall, knobs, customized) };
}

// ─── Runtime-preset fidelity badge (CardWriter, custom-styles mode) ───

export interface RuntimeFidelityBadge {
  /** Compact chip text, e.g. "Faithful · unstable verb". */
  label: string;
  /** ok = faithful, partial = approximate, warn = colors only. */
  tone: 'ok' | 'partial' | 'warn';
  /** Longer explanation for the chip's tooltip. */
  detail: string;
}

/** Plain-language badge for one preset's runtime-verb mapping. */
export function describeRuntimeFidelity(mapping: RuntimeStyleMapping): RuntimeFidelityBadge {
  switch (mapping.fidelity) {
    case 'faithful':
      return { label: `Faithful · ${mapping.verb} verb`, tone: 'ok', detail: mapping.note };
    case 'approximate':
      return {
        label: `Approximate · ${mapping.verb} verb${mapping.verb === 'cycle' ? ' (audio-reactive)' : ''}`,
        tone: 'partial',
        detail: mapping.note,
      };
    case 'colors-only':
      return {
        label: 'Colors only — this style needs a firmware flash',
        tone: 'warn',
        detail: mapping.note,
      };
  }
}

/** Convenience: map a preset's config and describe the result. */
export function getRuntimeFidelityBadge(config: BladeConfig): RuntimeFidelityBadge {
  return describeRuntimeFidelity(mapBladeConfigToRuntimeStyle(config));
}
