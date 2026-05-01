// ─── Showcase presets — KyberStation feature demonstrations ─────────────
//
// A curated set of presets designed to showcase the full feature
// surface of KyberStation: modulation bindings (multiple per preset),
// math-expression formulas, custom gradient stops, spatial effect
// placement, and rare engine styles. These are NOT screen-accurate —
// they are aspirational tech demos meant to demonstrate what the app
// can do.
//
// Each preset's `modulation` payload is loaded by `bladeStore.loadPreset`
// alongside the rest of the config; the engine applies the bindings
// per frame. ProffieOS codegen emits live `Mix<Scale<...>>` templates
// for shimmer-target bindings (the AST-level template injection slot
// landed in v0.15.0), so the showcase presets run on real hardware
// rather than just in the visualizer — same authentic-blade promise as
// the rest of the library.
//
// Author: KyberStation. Continuity: pop-culture (creative-original).
// Era is `'expanded-universe'` per the preset Era union conventions.

import type { Preset } from '../types.js';
import type {
  RecipeExpressionNode,
  SerializedBinding,
} from '../recipes/modulation/types.js';

// ─── Expression AST builders ────────────────────────────────────────────
// Hand-built ASTs mirror the breathing-blade recipe's pattern. These
// can\'t use `parseExpression` from `@kyberstation/engine` because of the
// monorepo\'s hoisted-only npm config; the drift risk is small for
// these well-known idioms.

function literal(value: number): RecipeExpressionNode {
  return { kind: 'literal', value };
}

function variable(id: 'time' | 'swing' | 'sound' | 'angle' | 'twist' | 'battery' | 'clash'): RecipeExpressionNode {
  return { kind: 'var', id };
}

function binary(
  op: '+' | '-' | '*' | '/',
  lhs: RecipeExpressionNode,
  rhs: RecipeExpressionNode,
): RecipeExpressionNode {
  return { kind: 'binary', op, lhs, rhs };
}

function call(
  fn: 'sin' | 'cos' | 'abs' | 'clamp' | 'min' | 'max',
  args: RecipeExpressionNode[],
): RecipeExpressionNode {
  return { kind: 'call', fn, args };
}

// `sin(time * mul) * 0.5 + 0.5` — slow LFO mapped to [0, 1].
function sinLFO(timeMul: number): RecipeExpressionNode {
  return binary(
    '+',
    binary('*', call('sin', [binary('*', variable('time'), literal(timeMul))]), literal(0.5)),
    literal(0.5),
  );
}

// `abs(sin(time * mul)) * range + base` — half-wave LFO.
function absSinLFO(timeMul: number, range: number, base: number): RecipeExpressionNode {
  return binary(
    '+',
    binary('*', call('abs', [call('sin', [binary('*', variable('time'), literal(timeMul))])]), literal(range)),
    literal(base),
  );
}

// ─── Modulation payload helper ──────────────────────────────────────────

interface ModulationPayloadShape {
  readonly version: 1;
  readonly bindings: readonly SerializedBinding[];
}

function payload(...bindings: SerializedBinding[]): ModulationPayloadShape {
  return { version: 1, bindings };
}

// ─── 1. Living Force ────────────────────────────────────────────────────
//
// Demonstrates: heartbeat expression on shimmer + swing-reactive shimmer
// + clash-spike. Three modulation bindings combining math expression,
// modulator-direct, and event-latched signals into a single coherent
// "alive" blade character.

const LIVING_FORCE_BINDINGS: SerializedBinding[] = [
  {
    id: 'showcase-living-force-binding-1',
    source: null,
    expression: {
      source: 'abs(sin(time * 0.0008)) * 0.4 + 0.3',
      ast: absSinLFO(0.0008, 0.4, 0.3),
    },
    target: 'shimmer',
    combinator: 'replace',
    amount: 1.0,
    label: 'fx: heartbeat (sub-second)',
    bypassed: false,
  },
  {
    id: 'showcase-living-force-binding-2',
    source: 'swing',
    expression: null,
    target: 'shimmer',
    combinator: 'add',
    amount: 0.5,
    label: 'swing → shimmer (motion-reactive)',
    bypassed: false,
  },
  {
    id: 'showcase-living-force-binding-3',
    source: 'clash',
    expression: null,
    target: 'shimmer',
    combinator: 'add',
    amount: 0.8,
    label: 'clash → shimmer (impact spike)',
    bypassed: false,
  },
];

// ─── 2. Storm Singer ────────────────────────────────────────────────────
//
// Demonstrates: sound-driven hue + slow time drift + swing-reactive
// shimmer. The blade hue cycles with audio while a baseline drift keeps
// the color always-changing even at idle.

const STORM_SINGER_BINDINGS: SerializedBinding[] = [
  {
    id: 'showcase-storm-singer-binding-1',
    source: 'sound',
    expression: null,
    target: 'colorHueShiftSpeed',
    combinator: 'replace',
    amount: 1.0,
    label: 'sound → hue cycle speed',
    bypassed: false,
  },
  {
    id: 'showcase-storm-singer-binding-2',
    source: null,
    expression: {
      source: 'sin(time * 0.0003) * 0.5 + 0.5',
      ast: sinLFO(0.0003),
    },
    target: 'colorHueShiftSpeed',
    combinator: 'add',
    amount: 0.3,
    label: 'fx: slow background hue drift (~21s)',
    bypassed: false,
  },
  {
    id: 'showcase-storm-singer-binding-3',
    source: 'swing',
    expression: null,
    target: 'shimmer',
    combinator: 'replace',
    amount: 0.7,
    label: 'swing → shimmer',
    bypassed: false,
  },
];

// ─── 3. Prismatic Drift ─────────────────────────────────────────────────
//
// Demonstrates: 4-binding showcase using time / angle / twist / battery.
// Maximum modulator-plate diversity in a single preset — the most
// feature-saturated entry in the showcase set.

const PRISMATIC_DRIFT_BINDINGS: SerializedBinding[] = [
  {
    id: 'showcase-prismatic-binding-1',
    source: 'time',
    expression: null,
    target: 'colorHueShiftSpeed',
    combinator: 'replace',
    amount: 0.5,
    label: 'time → hue (continuous rainbow)',
    bypassed: false,
  },
  {
    id: 'showcase-prismatic-binding-2',
    source: 'angle',
    expression: null,
    target: 'shimmer',
    combinator: 'add',
    amount: 0.4,
    label: 'angle → shimmer (point-sky brightens)',
    bypassed: false,
  },
  {
    id: 'showcase-prismatic-binding-3',
    source: 'twist',
    expression: null,
    target: 'colorSaturationPulse',
    combinator: 'replace',
    amount: 0.7,
    label: 'twist → saturation pulse',
    bypassed: false,
  },
  {
    id: 'showcase-prismatic-binding-4',
    source: null,
    expression: {
      source: 'clamp(1 - battery, 0, 0.5)',
      ast: call('clamp', [
        binary('-', literal(1), variable('battery')),
        literal(0),
        literal(0.5),
      ]),
    },
    target: 'shimmer',
    combinator: 'add',
    amount: 0.3,
    label: 'fx: battery-saver (dims as charge drops)',
    bypassed: false,
  },
];

// ─── 4. Phoenix Cycle ───────────────────────────────────────────────────
//
// Demonstrates: ignition + retraction + lockup state-modulation. Each
// state of the blade lifecycle drives a distinct visual change, turning
// the standard ignite/retract/lockup loop into a per-state showcase.

const PHOENIX_CYCLE_BINDINGS: SerializedBinding[] = [
  {
    id: 'showcase-phoenix-binding-1',
    source: 'ignition',
    expression: null,
    target: 'shimmer',
    combinator: 'replace',
    amount: 1.0,
    label: 'ignition progress → shimmer (flares as blade extends)',
    bypassed: false,
  },
  {
    id: 'showcase-phoenix-binding-2',
    source: 'retraction',
    expression: null,
    target: 'shimmer',
    combinator: 'add',
    amount: 0.6,
    label: 'retraction progress → shimmer (cools as blade collapses)',
    bypassed: false,
  },
  {
    id: 'showcase-phoenix-binding-3',
    source: 'lockup',
    expression: null,
    target: 'shimmer',
    combinator: 'add',
    amount: 0.7,
    label: 'lockup → shimmer (sustained-impact intensification)',
    bypassed: false,
  },
];

// ─── 5. Quiet Tempest ───────────────────────────────────────────────────
//
// Demonstrates: contemplative slow-breath + sound-reactive saturation +
// swing-reactive base color shift. A meditative blade with subtle
// sub-second-aware modulation that rewards quiet contemplation.

const QUIET_TEMPEST_BINDINGS: SerializedBinding[] = [
  {
    id: 'showcase-quiet-tempest-binding-1',
    source: null,
    expression: {
      source: 'abs(sin(time * 0.0005)) * 0.6 + 0.2',
      ast: absSinLFO(0.0005, 0.6, 0.2),
    },
    target: 'shimmer',
    combinator: 'replace',
    amount: 1.0,
    label: 'fx: 12-second contemplative breath',
    bypassed: false,
  },
  {
    id: 'showcase-quiet-tempest-binding-2',
    source: 'sound',
    expression: null,
    target: 'colorSaturationPulse',
    combinator: 'replace',
    amount: 0.5,
    label: 'sound → saturation pulse (audio-reactive vividness)',
    bypassed: false,
  },
  {
    id: 'showcase-quiet-tempest-binding-3',
    source: 'swing',
    expression: null,
    target: 'shimmer',
    combinator: 'add',
    amount: 0.3,
    label: 'swing → shimmer (motion-aware rim brightening)',
    bypassed: false,
  },
];

// ─── Showcase preset registry ───────────────────────────────────────────

export const SHOWCASE_PRESETS: Preset[] = [
  // ── 1. Living Force ──
  {
    id: 'showcase-living-force',
    name: 'Living Force ⛯',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'A blade that breathes. Three modulation bindings — a sub-second heartbeat expression, swing-reactive shimmer, and clash-spike intensification — combine into a saber that feels alive at rest, responds to motion, and erupts with energy on impact. SHOWCASE: hand-written math expression + modulator-direct + event-latched signals.',
    hiltNotes: 'Showcase tech-demo hilt — designed to highlight the modulation routing engine.',
    config: {
      name: 'LivingForce',
      baseColor: { r: 30, g: 130, b: 240 },
      clashColor: { r: 255, g: 240, b: 220 },
      lockupColor: { r: 255, g: 200, b: 130 },
      blastColor: { r: 220, g: 240, b: 255 },
      style: 'unstable',
      ignition: 'spark',
      retraction: 'fadeout',
      ignitionMs: 380,
      retractionMs: 460,
      shimmer: 0.3,
      ledCount: 144,
      swingFxIntensity: 0.5,
      gradientStops: [
        { position: 0, color: { r: 0, g: 60, b: 200 } },
        { position: 0.4, color: { r: 80, g: 160, b: 250 } },
        { position: 1, color: { r: 200, g: 230, b: 255 } },
      ],
      gradientInterpolation: 'smooth',
      lockupPosition: 0.5,
      lockupRadius: 0.18,
      modulation: payload(...LIVING_FORCE_BINDINGS),
    },
  },

  // ── 2. Storm Singer ──
  {
    id: 'showcase-storm-singer',
    name: 'Storm Singer ♫',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'A hue-cycling aurora blade driven by ambient sound and a slow background drift. Three bindings — sound-driven hue speed, time-modulated drift, swing-reactive shimmer — produce a saber that sings with the music around it and never sits still. SHOWCASE: rare aurora style + multi-modulator hue-cycle composition.',
    hiltNotes: 'Showcase tech-demo hilt with an audio sensor visible at the pommel.',
    config: {
      name: 'StormSinger',
      baseColor: { r: 60, g: 200, b: 220 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 220, g: 240, b: 255 },
      blastColor: { r: 240, g: 250, b: 255 },
      style: 'aurora',
      ignition: 'summon',
      retraction: 'unravel',
      ignitionMs: 480,
      retractionMs: 600,
      shimmer: 0.18,
      ledCount: 144,
      swingFxIntensity: 0.55,
      colorHueShiftSpeed: 0.3,
      gradientStops: [
        { position: 0, color: { r: 0, g: 80, b: 220 } },
        { position: 0.3, color: { r: 0, g: 200, b: 240 } },
        { position: 0.7, color: { r: 200, g: 240, b: 255 } },
        { position: 1, color: { r: 80, g: 200, b: 240 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(...STORM_SINGER_BINDINGS),
    },
  },

  // ── 3. Prismatic Drift ──
  {
    id: 'showcase-prismatic-drift',
    name: 'Prismatic Drift ❖',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Maximum modulation diversity — 4 bindings spanning time / angle / twist / battery. Time drives a continuous hue rotation, angle adds shimmer when pointed up, twist pulses saturation on rotation, and a battery-saver expression dims output as charge drops. SHOWCASE: 4 modulator plates active simultaneously + math-formula battery dimmer + rare prism style.',
    hiltNotes: 'Showcase tech-demo hilt with kybertech metal-prism inlay.',
    config: {
      name: 'PrismaticDrift',
      baseColor: { r: 180, g: 100, b: 230 },
      clashColor: { r: 255, g: 230, b: 255 },
      lockupColor: { r: 230, g: 180, b: 255 },
      blastColor: { r: 240, g: 220, b: 255 },
      style: 'prism',
      ignition: 'flash-fill',
      retraction: 'dissolve',
      ignitionMs: 420,
      retractionMs: 540,
      shimmer: 0.16,
      ledCount: 144,
      swingFxIntensity: 0.45,
      colorHueShiftSpeed: 0.5,
      gradientStops: [
        { position: 0, color: { r: 60, g: 30, b: 220 } },
        { position: 0.25, color: { r: 200, g: 80, b: 240 } },
        { position: 0.5, color: { r: 240, g: 150, b: 220 } },
        { position: 0.75, color: { r: 200, g: 80, b: 240 } },
        { position: 1, color: { r: 60, g: 30, b: 220 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(...PRISMATIC_DRIFT_BINDINGS),
    },
  },

  // ── 4. Phoenix Cycle ──
  {
    id: 'showcase-phoenix-cycle',
    name: 'Phoenix Cycle ⟁',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'State-aware blade — every part of the ignition / retraction / lockup lifecycle drives a distinct visual change. Ignition flares the shimmer as the blade extends; retraction cools it as the blade collapses; lockup intensifies during sustained-impact. SHOWCASE: state-progress modulators (ignition/retraction/lockup) wired to a single target for a per-state composed visual.',
    hiltNotes: 'Showcase tech-demo hilt with a phoenix-feather etched along the grip.',
    config: {
      name: 'PhoenixCycle',
      baseColor: { r: 255, g: 100, b: 30 },
      clashColor: { r: 255, g: 240, b: 180 },
      lockupColor: { r: 255, g: 180, b: 60 },
      blastColor: { r: 255, g: 220, b: 130 },
      dragColor: { r: 255, g: 80, b: 0 },
      style: 'fire',
      ignition: 'crackle',
      retraction: 'unravel',
      ignitionMs: 520,
      retractionMs: 680,
      shimmer: 0.22,
      ledCount: 144,
      swingFxIntensity: 0.55,
      noiseLevel: 0.08,
      fireSize: 0.65,
      gradientStops: [
        { position: 0, color: { r: 255, g: 60, b: 0 } },
        { position: 0.4, color: { r: 255, g: 140, b: 30 } },
        { position: 0.8, color: { r: 255, g: 220, b: 100 } },
        { position: 1, color: { r: 255, g: 245, b: 200 } },
      ],
      gradientInterpolation: 'smooth',
      lockupPosition: 0.4,
      lockupRadius: 0.15,
      modulation: payload(...PHOENIX_CYCLE_BINDINGS),
    },
  },

  // ── 5. Quiet Tempest ──
  {
    id: 'showcase-quiet-tempest',
    name: 'Quiet Tempest ☷',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'A contemplative blade — slow 12-second breath shimmer, sound-reactive saturation, and a quiet swing-driven rim. Three bindings in conversation with the wielder\'s state. SHOWCASE: long-period expression LFO (~12s) + colorSaturationPulse audio reactivity + spatial drag at distal third.',
    hiltNotes: 'Showcase tech-demo hilt — sized for two-handed contemplative grip, brass + walnut.',
    config: {
      name: 'QuietTempest',
      baseColor: { r: 80, g: 200, b: 160 },
      clashColor: { r: 220, g: 250, b: 230 },
      lockupColor: { r: 160, g: 230, b: 200 },
      blastColor: { r: 220, g: 250, b: 240 },
      dragColor: { r: 60, g: 180, b: 140 },
      style: 'pulse',
      ignition: 'standard',
      retraction: 'fadeout',
      ignitionMs: 580,
      retractionMs: 720,
      shimmer: 0.25,
      ledCount: 144,
      swingFxIntensity: 0.35,
      noiseLevel: 0.04,
      pulseSpeed: 0.4,
      pulseMinBright: 0.55,
      gradientStops: [
        { position: 0, color: { r: 30, g: 130, b: 110 } },
        { position: 0.5, color: { r: 100, g: 220, b: 180 } },
        { position: 1, color: { r: 60, g: 180, b: 150 } },
      ],
      gradientInterpolation: 'smooth',
      dragPosition: 0.7,
      dragRadius: 0.2,
      modulation: payload(...QUIET_TEMPEST_BINDINGS),
    },
  },
];
