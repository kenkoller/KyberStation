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

  // ═══════════════════════════════════════════════════════════════════
  // ULTRA SHOWCASE — go-all-out tech demos
  // ═══════════════════════════════════════════════════════════════════
  //
  // 3 maximum-everything entries: 6+ modulation bindings each, multi-stop
  // gradients, spatial effects, rare engine styles, expression LFOs at
  // multiple periods simultaneously.

  // ── Singularity Engine ──
  {
    id: 'showcase-singularity-engine',
    name: 'Singularity Engine ⚛',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      '6 modulation bindings firing simultaneously. Two LFOs at different periods (3.1s + 12.6s) drive shimmer + saturation; sound + swing + clash + battery each control a distinct parameter. Multi-stop rainbow gradient + spatial lockup + drag distal. Maximum-everything tech demo — open the routing panel and watch every plate light up at once.',
    hiltNotes: 'A reactor-core hilt — visible kybertech window cycling through every visible wavelength.',
    config: {
      name: 'SingularityEngine',
      baseColor: { r: 200, g: 60, b: 240 },
      clashColor: { r: 255, g: 240, b: 220 },
      lockupColor: { r: 220, g: 180, b: 255 },
      blastColor: { r: 240, g: 220, b: 255 },
      dragColor: { r: 255, g: 100, b: 200 },
      style: 'unstable',
      ignition: 'flash-fill',
      retraction: 'shatter',
      ignitionMs: 460,
      retractionMs: 720,
      shimmer: 0.3,
      ledCount: 144,
      swingFxIntensity: 0.6,
      noiseLevel: 0.1,
      colorHueShiftSpeed: 0.7,
      gradientStops: [
        { position: 0, color: { r: 60, g: 0, b: 220 } },
        { position: 0.2, color: { r: 200, g: 80, b: 240 } },
        { position: 0.4, color: { r: 255, g: 100, b: 200 } },
        { position: 0.6, color: { r: 255, g: 200, b: 100 } },
        { position: 0.8, color: { r: 100, g: 240, b: 255 } },
        { position: 1, color: { r: 60, g: 0, b: 220 } },
      ],
      gradientInterpolation: 'smooth',
      lockupPosition: 0.5,
      lockupRadius: 0.16,
      dragPosition: 0.85,
      dragRadius: 0.12,
      modulation: payload(
        {
          id: 'showcase-singularity-binding-1',
          source: null,
          expression: {
            source: 'abs(sin(time * 0.002)) * 0.5 + 0.4',
            ast: absSinLFO(0.002, 0.5, 0.4),
          },
          target: 'shimmer',
          combinator: 'replace',
          amount: 1.0,
          label: 'fx: 3.1s shimmer LFO',
          bypassed: false,
        },
        {
          id: 'showcase-singularity-binding-2',
          source: null,
          expression: {
            source: 'sin(time * 0.0005) * 0.5 + 0.5',
            ast: sinLFO(0.0005),
          },
          target: 'colorSaturationPulse',
          combinator: 'replace',
          amount: 0.7,
          label: 'fx: 12.6s saturation LFO',
          bypassed: false,
        },
        {
          id: 'showcase-singularity-binding-3',
          source: 'sound',
          expression: null,
          target: 'colorHueShiftSpeed',
          combinator: 'add',
          amount: 0.5,
          label: 'sound → hue cycle accelerate',
          bypassed: false,
        },
        {
          id: 'showcase-singularity-binding-4',
          source: 'swing',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.4,
          label: 'swing → shimmer (motion)',
          bypassed: false,
        },
        {
          id: 'showcase-singularity-binding-5',
          source: 'clash',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.8,
          label: 'clash → shimmer spike',
          bypassed: false,
        },
        {
          id: 'showcase-singularity-binding-6',
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
          label: 'fx: battery drain dims',
          bypassed: false,
        },
      ),
    },
  },

  // ── The Conductor ──
  {
    id: 'showcase-the-conductor',
    name: 'The Conductor ♫',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Sound-orchestra blade — 6 bindings, 4 of them sound-derived. Audio drives the hue cycle, saturation, shimmer, and a pulse on the base color. The other 2 bindings are a slow time-LFO floor and a swing-reactive overlay. Plug in a saber-font with active SmoothSwing and watch the blade dance with the music.',
    hiltNotes: 'Hilt with twin parabolic audio sensors at the pommel and a chrome-and-glass crystal chamber visible through the side window.',
    config: {
      name: 'TheConductor',
      baseColor: { r: 30, g: 200, b: 230 },
      clashColor: { r: 255, g: 250, b: 220 },
      lockupColor: { r: 200, g: 240, b: 255 },
      blastColor: { r: 240, g: 250, b: 255 },
      dragColor: { r: 100, g: 220, b: 240 },
      style: 'aurora',
      ignition: 'summon',
      retraction: 'unravel',
      ignitionMs: 540,
      retractionMs: 680,
      shimmer: 0.18,
      ledCount: 144,
      swingFxIntensity: 0.55,
      colorHueShiftSpeed: 0.4,
      gradientStops: [
        { position: 0, color: { r: 0, g: 80, b: 220 } },
        { position: 0.25, color: { r: 0, g: 200, b: 240 } },
        { position: 0.5, color: { r: 200, g: 240, b: 255 } },
        { position: 0.75, color: { r: 100, g: 220, b: 250 } },
        { position: 1, color: { r: 0, g: 100, b: 230 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(
        {
          id: 'showcase-conductor-binding-1',
          source: 'sound',
          expression: null,
          target: 'colorHueShiftSpeed',
          combinator: 'replace',
          amount: 1.0,
          label: 'sound → hue cycle (primary)',
          bypassed: false,
        },
        {
          id: 'showcase-conductor-binding-2',
          source: 'sound',
          expression: null,
          target: 'colorSaturationPulse',
          combinator: 'replace',
          amount: 0.7,
          label: 'sound → saturation pulse',
          bypassed: false,
        },
        {
          id: 'showcase-conductor-binding-3',
          source: 'sound',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.5,
          label: 'sound → shimmer overlay',
          bypassed: false,
        },
        {
          id: 'showcase-conductor-binding-4',
          source: 'sound',
          expression: null,
          target: 'baseColor.b',
          combinator: 'add',
          amount: 0.3,
          label: 'sound → base.b cyan flash',
          bypassed: false,
        },
        {
          id: 'showcase-conductor-binding-5',
          source: null,
          expression: {
            source: 'sin(time * 0.0003) * 0.3 + 0.4',
            ast: binary(
              '+',
              binary('*', call('sin', [binary('*', variable('time'), literal(0.0003))]), literal(0.3)),
              literal(0.4),
            ),
          },
          target: 'shimmer',
          combinator: 'add',
          amount: 0.2,
          label: 'fx: 21s baseline drift',
          bypassed: false,
        },
        {
          id: 'showcase-conductor-binding-6',
          source: 'swing',
          expression: null,
          target: 'colorHueShiftSpeed',
          combinator: 'add',
          amount: 0.3,
          label: 'swing → hue accelerate',
          bypassed: false,
        },
      ),
    },
  },

  // ── Eternal Forge ──
  {
    id: 'showcase-eternal-forge',
    name: 'Eternal Forge ⚟',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'State-aware fire blade — 7 modulation bindings spanning the full lifecycle. Ignition flares the shimmer; retraction cools it; lockup intensifies; clash spikes; battery dims; time pulses a slow heartbeat under it all; sound reactivity adds a final layer. Spatial lockup + drag + blast all positioned. The most feature-saturated showcase entry.',
    hiltNotes: 'Forge-hilt of dark iron and red enamel; visible heat-shimmer along the activation collar even when retracted.',
    config: {
      name: 'EternalForge',
      baseColor: { r: 255, g: 90, b: 20 },
      clashColor: { r: 255, g: 250, b: 220 },
      lockupColor: { r: 255, g: 180, b: 80 },
      blastColor: { r: 255, g: 220, b: 150 },
      dragColor: { r: 255, g: 70, b: 0 },
      style: 'fire',
      ignition: 'crackle',
      retraction: 'unravel',
      ignitionMs: 620,
      retractionMs: 800,
      shimmer: 0.28,
      ledCount: 144,
      swingFxIntensity: 0.6,
      noiseLevel: 0.12,
      fireSize: 0.7,
      gradientStops: [
        { position: 0, color: { r: 255, g: 50, b: 0 } },
        { position: 0.3, color: { r: 255, g: 130, b: 30 } },
        { position: 0.6, color: { r: 255, g: 200, b: 80 } },
        { position: 0.9, color: { r: 255, g: 240, b: 180 } },
        { position: 1, color: { r: 255, g: 250, b: 220 } },
      ],
      gradientInterpolation: 'smooth',
      lockupPosition: 0.42,
      lockupRadius: 0.18,
      dragPosition: 0.82,
      dragRadius: 0.14,
      blastPosition: 0.18,
      blastRadius: 0.12,
      modulation: payload(
        {
          id: 'showcase-forge-binding-1',
          source: 'ignition',
          expression: null,
          target: 'shimmer',
          combinator: 'replace',
          amount: 1.0,
          label: 'ignition → shimmer flare',
          bypassed: false,
        },
        {
          id: 'showcase-forge-binding-2',
          source: 'retraction',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.6,
          label: 'retraction → shimmer cool',
          bypassed: false,
        },
        {
          id: 'showcase-forge-binding-3',
          source: 'lockup',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.7,
          label: 'lockup → sustained intensity',
          bypassed: false,
        },
        {
          id: 'showcase-forge-binding-4',
          source: 'clash',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.8,
          label: 'clash → shimmer spike',
          bypassed: false,
        },
        {
          id: 'showcase-forge-binding-5',
          source: null,
          expression: {
            source: 'clamp(1 - battery, 0, 0.4)',
            ast: call('clamp', [
              binary('-', literal(1), variable('battery')),
              literal(0),
              literal(0.4),
            ]),
          },
          target: 'shimmer',
          combinator: 'add',
          amount: 0.3,
          label: 'fx: battery dim',
          bypassed: false,
        },
        {
          id: 'showcase-forge-binding-6',
          source: null,
          expression: {
            source: 'abs(sin(time * 0.001)) * 0.3 + 0.2',
            ast: absSinLFO(0.001, 0.3, 0.2),
          },
          target: 'shimmer',
          combinator: 'add',
          amount: 0.25,
          label: 'fx: 6.3s heartbeat floor',
          bypassed: false,
        },
        {
          id: 'showcase-forge-binding-7',
          source: 'sound',
          expression: null,
          target: 'colorSaturationPulse',
          combinator: 'replace',
          amount: 0.6,
          label: 'sound → saturation pulse',
          bypassed: false,
        },
      ),
    },
  },

  // ─── Engine-style tour ──────────────────────────────────────────────────
  //
  // Ten presets whose primary job is to put rare engine styles in front
  // of users. Each one foregrounds a specific style class
  // (helix / neutron / dataStream / automata / crystalShatter / candle /
  // ember / photon / gravity / plasma) and pairs it with 3+ modulation
  // bindings so the gallery reads as both a style demo AND a routing
  // demo. Style coverage was chosen to fill gaps left by the original
  // 5 + ultra trio above (which between them cover unstable / aurora /
  // prism / fire / pulse).

  // ── 9. Genesis Helix ──
  {
    id: 'showcase-genesis-helix',
    name: 'Genesis Helix ⫯',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Twin-strand DNA blade. Two sine waves running 180° out of phase along the blade let cool teal coil around warm gold the way a double helix coils on itself. Saturation pulse breathes with a slow LFO, sound flares the shimmer, swing tightens the coil, clash flashes the entire helix white. SHOWCASE: rare `helix` style + 4 bindings spanning expression/sound/swing/clash.',
    hiltNotes: 'Chrome-on-bone hilt with a glass coiled-band activation collar.',
    config: {
      name: 'GenesisHelix',
      baseColor: { r: 100, g: 220, b: 200 },
      clashColor: { r: 255, g: 250, b: 230 },
      lockupColor: { r: 255, g: 230, b: 160 },
      blastColor: { r: 240, g: 250, b: 230 },
      style: 'helix',
      ignition: 'pulse-wave',
      retraction: 'unravel',
      ignitionMs: 520,
      retractionMs: 640,
      shimmer: 0.22,
      ledCount: 144,
      swingFxIntensity: 0.5,
      gradientStops: [
        { position: 0, color: { r: 60, g: 200, b: 220 } },
        { position: 0.5, color: { r: 220, g: 240, b: 200 } },
        { position: 1, color: { r: 255, g: 200, b: 100 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(
        {
          id: 'showcase-helix-binding-1',
          source: null,
          expression: {
            source: 'sin(time * 0.0008) * 0.4 + 0.5',
            ast: binary(
              '+',
              binary('*', call('sin', [binary('*', variable('time'), literal(0.0008))]), literal(0.4)),
              literal(0.5),
            ),
          },
          target: 'colorSaturationPulse',
          combinator: 'replace',
          amount: 0.8,
          label: 'fx: 7.8s saturation breath',
          bypassed: false,
        },
        {
          id: 'showcase-helix-binding-2',
          source: 'sound',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.5,
          label: 'sound → shimmer flare',
          bypassed: false,
        },
        {
          id: 'showcase-helix-binding-3',
          source: 'swing',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.4,
          label: 'swing → coil tighten',
          bypassed: false,
        },
        {
          id: 'showcase-helix-binding-4',
          source: 'clash',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.7,
          label: 'clash → helix flash',
          bypassed: false,
        },
      ),
    },
  },

  // ── 10. Neutron Star ──
  {
    id: 'showcase-neutron-star',
    name: 'Neutron Star ✸',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'A collapsing-star blade. The neutron style throws a single bright particle bouncing tip-to-emitter trailing a phosphor ghost; a slow LFO floors a baseline shimmer so the rest of the blade stays alive between bounces; sound + clash add intensity, and battery drain dims it gradually like a dying pulsar. SHOWCASE: rare `neutron` style + 4 bindings spanning expression/sound/clash/battery.',
    hiltNotes: 'Cold-iron hilt with a single accent-blue ring.',
    config: {
      name: 'NeutronStar',
      baseColor: { r: 60, g: 140, b: 240 },
      clashColor: { r: 240, g: 250, b: 255 },
      lockupColor: { r: 200, g: 220, b: 255 },
      blastColor: { r: 240, g: 250, b: 255 },
      style: 'neutron',
      ignition: 'flash-fill',
      retraction: 'fadeout',
      ignitionMs: 360,
      retractionMs: 540,
      shimmer: 0.18,
      ledCount: 144,
      swingFxIntensity: 0.45,
      gradientStops: [
        { position: 0, color: { r: 0, g: 60, b: 200 } },
        { position: 0.5, color: { r: 80, g: 160, b: 240 } },
        { position: 1, color: { r: 220, g: 240, b: 255 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(
        {
          id: 'showcase-neutron-binding-1',
          source: null,
          expression: {
            source: 'abs(sin(time * 0.0006)) * 0.25 + 0.15',
            ast: absSinLFO(0.0006, 0.25, 0.15),
          },
          target: 'shimmer',
          combinator: 'replace',
          amount: 1.0,
          label: 'fx: 10.5s pulsar floor',
          bypassed: false,
        },
        {
          id: 'showcase-neutron-binding-2',
          source: 'sound',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.4,
          label: 'sound → core glow',
          bypassed: false,
        },
        {
          id: 'showcase-neutron-binding-3',
          source: 'clash',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.9,
          label: 'clash → magnetar flare',
          bypassed: false,
        },
        {
          id: 'showcase-neutron-binding-4',
          source: null,
          expression: {
            source: 'clamp(1 - battery, 0, 0.4)',
            ast: call('clamp', [
              binary('-', literal(1), variable('battery')),
              literal(0),
              literal(0.4),
            ]),
          },
          target: 'shimmer',
          combinator: 'add',
          amount: 0.3,
          label: 'fx: battery dim (dying pulsar)',
          bypassed: false,
        },
      ),
    },
  },

  // ── 11. Memory Cascade ──
  {
    id: 'showcase-memory-cascade',
    name: 'Memory Cascade ⌬',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Living-data blade. Discrete packets of light travel emitter → tip in time with the sound font, leaving a dim cyan trail behind them; a long-period background drift shifts the trail blue ↔ violet over half a minute; swing kicks the packet rate; clash hits saturate everything. SHOWCASE: rare `dataStream` style + sound-driven packet emission + chromatic baseColor.b drift.',
    hiltNotes: 'Black-anodized hilt with a glass viewing slit on the activation collar.',
    config: {
      name: 'MemoryCascade',
      baseColor: { r: 80, g: 200, b: 240 },
      clashColor: { r: 240, g: 240, b: 255 },
      lockupColor: { r: 180, g: 220, b: 255 },
      blastColor: { r: 220, g: 240, b: 255 },
      style: 'dataStream',
      ignition: 'pulse-wave',
      retraction: 'dissolve',
      ignitionMs: 440,
      retractionMs: 620,
      shimmer: 0.2,
      ledCount: 144,
      swingFxIntensity: 0.5,
      gradientStops: [
        { position: 0, color: { r: 0, g: 80, b: 200 } },
        { position: 0.4, color: { r: 60, g: 180, b: 240 } },
        { position: 0.8, color: { r: 200, g: 240, b: 255 } },
        { position: 1, color: { r: 100, g: 100, b: 255 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(
        {
          id: 'showcase-cascade-binding-1',
          source: 'sound',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.6,
          label: 'sound → packet emission rate',
          bypassed: false,
        },
        {
          id: 'showcase-cascade-binding-2',
          source: null,
          expression: {
            source: 'sin(time * 0.0002) * 0.5 + 0.5',
            ast: sinLFO(0.0002),
          },
          target: 'baseColor.b',
          combinator: 'add',
          amount: 0.4,
          label: 'fx: 31s violet drift',
          bypassed: false,
        },
        {
          id: 'showcase-cascade-binding-3',
          source: 'swing',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.4,
          label: 'swing → packet kick',
          bypassed: false,
        },
        {
          id: 'showcase-cascade-binding-4',
          source: 'clash',
          expression: null,
          target: 'colorSaturationPulse',
          combinator: 'add',
          amount: 0.8,
          label: 'clash → full-blade saturation',
          bypassed: false,
        },
      ),
    },
  },

  // ── 12. Hex Loom ──
  {
    id: 'showcase-hex-loom',
    name: 'Hex Loom ⬢',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Self-evolving blade. Rule 30 cellular automaton runs continuously, weaving deep magenta + cobalt into a never-quite-repeating pattern. A slow expression pulses the shimmer floor so the cell pattern reads as living; sound drives an additive shimmer overlay; clash + swing add their own boosts. SHOWCASE: rare `automata` style + 4 bindings + multi-stop magenta gradient.',
    hiltNotes: 'Hex-machined hilt with a row of six visible accent-light pinholes on the grip.',
    config: {
      name: 'HexLoom',
      baseColor: { r: 220, g: 60, b: 240 },
      clashColor: { r: 255, g: 240, b: 255 },
      lockupColor: { r: 240, g: 200, b: 255 },
      blastColor: { r: 240, g: 220, b: 255 },
      style: 'automata',
      ignition: 'glitch',
      retraction: 'shatter',
      ignitionMs: 420,
      retractionMs: 580,
      shimmer: 0.26,
      ledCount: 144,
      swingFxIntensity: 0.55,
      noiseLevel: 0.08,
      gradientStops: [
        { position: 0, color: { r: 80, g: 0, b: 220 } },
        { position: 0.5, color: { r: 220, g: 60, b: 240 } },
        { position: 1, color: { r: 255, g: 100, b: 200 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(
        {
          id: 'showcase-hex-binding-1',
          source: null,
          expression: {
            source: 'abs(sin(time * 0.0009)) * 0.3 + 0.2',
            ast: absSinLFO(0.0009, 0.3, 0.2),
          },
          target: 'shimmer',
          combinator: 'replace',
          amount: 1.0,
          label: 'fx: 7s cell-pattern pulse',
          bypassed: false,
        },
        {
          id: 'showcase-hex-binding-2',
          source: 'sound',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.5,
          label: 'sound → automaton overlay',
          bypassed: false,
        },
        {
          id: 'showcase-hex-binding-3',
          source: 'clash',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.8,
          label: 'clash → full-cell flash',
          bypassed: false,
        },
        {
          id: 'showcase-hex-binding-4',
          source: 'swing',
          expression: null,
          target: 'colorSaturationPulse',
          combinator: 'add',
          amount: 0.4,
          label: 'swing → saturation boost',
          bypassed: false,
        },
      ),
    },
  },

  // ── 13. Kyber Bloom ──
  {
    id: 'showcase-kyber-bloom',
    name: 'Kyber Bloom ✦',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Crystal-lattice blade that shatters and reforms. crystalShatter style draws hexagonal facets that fracture on impact and bloom back. A long-period LFO drives the baseline lattice density; clash spikes the shimmer to fully shatter the field; sound modulates saturation pulse so the crystal hums with the music; swing pushes the lattice to flare on motion. SHOWCASE: rare `crystalShatter` style + 4 bindings + spatial lockup.',
    hiltNotes: 'Brushed-platinum hilt with a visible tetrahedral kyber-chamber window.',
    config: {
      name: 'KyberBloom',
      baseColor: { r: 200, g: 240, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 240, g: 250, b: 255 },
      blastColor: { r: 240, g: 255, b: 255 },
      style: 'crystalShatter',
      ignition: 'fracture',
      retraction: 'shatter',
      ignitionMs: 540,
      retractionMs: 700,
      shimmer: 0.24,
      ledCount: 144,
      swingFxIntensity: 0.55,
      gradientStops: [
        { position: 0, color: { r: 100, g: 180, b: 240 } },
        { position: 0.5, color: { r: 220, g: 240, b: 255 } },
        { position: 1, color: { r: 255, g: 255, b: 255 } },
      ],
      gradientInterpolation: 'smooth',
      lockupPosition: 0.5,
      lockupRadius: 0.16,
      modulation: payload(
        {
          id: 'showcase-bloom-binding-1',
          source: null,
          expression: {
            source: 'sin(time * 0.0004) * 0.3 + 0.4',
            ast: binary(
              '+',
              binary('*', call('sin', [binary('*', variable('time'), literal(0.0004))]), literal(0.3)),
              literal(0.4),
            ),
          },
          target: 'shimmer',
          combinator: 'replace',
          amount: 0.8,
          label: 'fx: 15.7s lattice density',
          bypassed: false,
        },
        {
          id: 'showcase-bloom-binding-2',
          source: 'clash',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.9,
          label: 'clash → full-field shatter',
          bypassed: false,
        },
        {
          id: 'showcase-bloom-binding-3',
          source: 'sound',
          expression: null,
          target: 'colorSaturationPulse',
          combinator: 'replace',
          amount: 0.6,
          label: 'sound → crystal hum',
          bypassed: false,
        },
        {
          id: 'showcase-bloom-binding-4',
          source: 'swing',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.4,
          label: 'swing → lattice flare',
          bypassed: false,
        },
      ),
    },
  },

  // ── 14. Hearth Watch ──
  {
    id: 'showcase-hearth-watch',
    name: 'Hearth Watch 🜂',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Vigil-blade. The candle style runs an fbm flicker with random gust events; an irregular slow LFO adds a cool/warm body sway; sound provides "wind across the flame" gusts; clash spikes the shimmer like a log popping; battery drain dims the candle as the night wears on. SHOWCASE: rare `candle` style + 4 bindings + battery awareness.',
    hiltNotes: 'Aged-bronze hilt with a tarnished engraved sigil ring.',
    config: {
      name: 'HearthWatch',
      baseColor: { r: 255, g: 180, b: 80 },
      clashColor: { r: 255, g: 240, b: 200 },
      lockupColor: { r: 255, g: 200, b: 100 },
      blastColor: { r: 255, g: 230, b: 180 },
      style: 'candle',
      ignition: 'crackle',
      retraction: 'fadeout',
      ignitionMs: 580,
      retractionMs: 720,
      shimmer: 0.32,
      ledCount: 144,
      swingFxIntensity: 0.5,
      noiseLevel: 0.14,
      gradientStops: [
        { position: 0, color: { r: 200, g: 60, b: 0 } },
        { position: 0.4, color: { r: 255, g: 140, b: 40 } },
        { position: 0.8, color: { r: 255, g: 220, b: 140 } },
        { position: 1, color: { r: 255, g: 250, b: 220 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(
        {
          id: 'showcase-hearth-binding-1',
          source: null,
          expression: {
            source: 'abs(sin(time * 0.0011)) * 0.3 + 0.25',
            ast: absSinLFO(0.0011, 0.3, 0.25),
          },
          target: 'shimmer',
          combinator: 'replace',
          amount: 1.0,
          label: 'fx: 5.7s flicker base',
          bypassed: false,
        },
        {
          id: 'showcase-hearth-binding-2',
          source: 'sound',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.5,
          label: 'sound → wind gust',
          bypassed: false,
        },
        {
          id: 'showcase-hearth-binding-3',
          source: 'clash',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.7,
          label: 'clash → log pop',
          bypassed: false,
        },
        {
          id: 'showcase-hearth-binding-4',
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
          label: 'fx: battery dim (wick burning)',
          bypassed: false,
        },
      ),
    },
  },

  // ── 15. Ember Drift ──
  {
    id: 'showcase-ember-drift',
    name: 'Ember Drift 🜂',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Forge-fall blade. The ember style sends rising particles emitter→tip; swing motion lifts the ember rate; sound pushes brighter sparks; a slow expression breathes the saturation between deep crimson and amber gold; clash hammers the whole field bright. SHOWCASE: rare `ember` style + 4 bindings + 4-stop fire gradient.',
    hiltNotes: 'Ember-blackened hilt with a heat-shimmer activation collar visible at rest.',
    config: {
      name: 'EmberDrift',
      baseColor: { r: 255, g: 80, b: 30 },
      clashColor: { r: 255, g: 240, b: 200 },
      lockupColor: { r: 255, g: 160, b: 60 },
      blastColor: { r: 255, g: 220, b: 130 },
      style: 'ember',
      ignition: 'spark',
      retraction: 'fadeout',
      ignitionMs: 460,
      retractionMs: 620,
      shimmer: 0.3,
      ledCount: 144,
      swingFxIntensity: 0.62,
      gradientStops: [
        { position: 0, color: { r: 180, g: 30, b: 0 } },
        { position: 0.4, color: { r: 255, g: 80, b: 0 } },
        { position: 0.8, color: { r: 255, g: 180, b: 60 } },
        { position: 1, color: { r: 255, g: 240, b: 180 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(
        {
          id: 'showcase-ember-binding-1',
          source: 'swing',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.6,
          label: 'swing → ember lift rate',
          bypassed: false,
        },
        {
          id: 'showcase-ember-binding-2',
          source: 'sound',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.4,
          label: 'sound → brighter sparks',
          bypassed: false,
        },
        {
          id: 'showcase-ember-binding-3',
          source: null,
          expression: {
            source: 'sin(time * 0.0007) * 0.3 + 0.5',
            ast: binary(
              '+',
              binary('*', call('sin', [binary('*', variable('time'), literal(0.0007))]), literal(0.3)),
              literal(0.5),
            ),
          },
          target: 'colorSaturationPulse',
          combinator: 'replace',
          amount: 0.7,
          label: 'fx: 9s crimson↔amber breath',
          bypassed: false,
        },
        {
          id: 'showcase-ember-binding-4',
          source: 'clash',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.8,
          label: 'clash → forge-strike',
          bypassed: false,
        },
      ),
    },
  },

  // ── 16. Photon Loom ──
  {
    id: 'showcase-photon-loom',
    name: 'Photon Loom ✺',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Sun-loom blade. Photon style sends discrete bright bands sliding emitter→tip; a slow LFO swells the underlying brightness so each band rides a tide instead of stamping flat; clash whites out the entire weave; sound pulses the saturation; swing speeds the hue cycle. SHOWCASE: rare `photon` style + 4 bindings + colorHueShiftSpeed driven by motion.',
    hiltNotes: 'Brushed-gold hilt with three vertical accent slots cut through to glow when ignited.',
    config: {
      name: 'PhotonLoom',
      baseColor: { r: 255, g: 230, b: 100 },
      clashColor: { r: 255, g: 255, b: 240 },
      lockupColor: { r: 255, g: 240, b: 180 },
      blastColor: { r: 255, g: 250, b: 220 },
      style: 'photon',
      ignition: 'flash-fill',
      retraction: 'unravel',
      ignitionMs: 460,
      retractionMs: 600,
      shimmer: 0.22,
      ledCount: 144,
      swingFxIntensity: 0.55,
      colorHueShiftSpeed: 0.2,
      gradientStops: [
        { position: 0, color: { r: 200, g: 100, b: 0 } },
        { position: 0.5, color: { r: 255, g: 220, b: 100 } },
        { position: 1, color: { r: 255, g: 255, b: 220 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(
        {
          id: 'showcase-photon-binding-1',
          source: null,
          expression: {
            source: 'sin(time * 0.0005) * 0.3 + 0.4',
            ast: binary(
              '+',
              binary('*', call('sin', [binary('*', variable('time'), literal(0.0005))]), literal(0.3)),
              literal(0.4),
            ),
          },
          target: 'shimmer',
          combinator: 'replace',
          amount: 0.9,
          label: 'fx: 12.6s tide swell',
          bypassed: false,
        },
        {
          id: 'showcase-photon-binding-2',
          source: 'clash',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.9,
          label: 'clash → loom whiteout',
          bypassed: false,
        },
        {
          id: 'showcase-photon-binding-3',
          source: 'sound',
          expression: null,
          target: 'colorSaturationPulse',
          combinator: 'replace',
          amount: 0.6,
          label: 'sound → saturation pulse',
          bypassed: false,
        },
        {
          id: 'showcase-photon-binding-4',
          source: 'swing',
          expression: null,
          target: 'colorHueShiftSpeed',
          combinator: 'add',
          amount: 0.4,
          label: 'swing → hue cycle accelerate',
          bypassed: false,
        },
      ),
    },
  },

  // ── 17. Gravitas ──
  {
    id: 'showcase-gravitas',
    name: 'Gravitas ⊥',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Liquid-blade. The gravity style pools light toward whichever end of the saber points down — point the hilt at the floor and the brightness collects in the emitter; raise it and it floods toward the tip. Angle drives the shimmer floor; swing kicks up turbulence; a long-period LFO drifts a deep magenta into the pool; clash detonates the pool back to baseline. SHOWCASE: rare `gravity` style + the rarely-shown angle modulator.',
    hiltNotes: 'Mercury-finish hilt with a single visible bubble in the activation collar.',
    config: {
      name: 'Gravitas',
      baseColor: { r: 80, g: 120, b: 240 },
      clashColor: { r: 240, g: 240, b: 255 },
      lockupColor: { r: 200, g: 200, b: 255 },
      blastColor: { r: 220, g: 230, b: 255 },
      style: 'gravity',
      ignition: 'drip-up',
      retraction: 'drain',
      ignitionMs: 580,
      retractionMs: 720,
      shimmer: 0.2,
      ledCount: 144,
      swingFxIntensity: 0.5,
      gradientStops: [
        { position: 0, color: { r: 40, g: 60, b: 200 } },
        { position: 0.5, color: { r: 100, g: 140, b: 240 } },
        { position: 1, color: { r: 200, g: 220, b: 255 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(
        {
          id: 'showcase-gravitas-binding-1',
          source: 'angle',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.5,
          label: 'angle → pool brightness',
          bypassed: false,
        },
        {
          id: 'showcase-gravitas-binding-2',
          source: 'swing',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.4,
          label: 'swing → turbulence',
          bypassed: false,
        },
        {
          id: 'showcase-gravitas-binding-3',
          source: null,
          expression: {
            source: 'sin(time * 0.00025) * 0.4 + 0.4',
            ast: binary(
              '+',
              binary('*', call('sin', [binary('*', variable('time'), literal(0.00025))]), literal(0.4)),
              literal(0.4),
            ),
          },
          target: 'baseColor.r',
          combinator: 'add',
          amount: 0.3,
          label: 'fx: 25s magenta drift',
          bypassed: false,
        },
        {
          id: 'showcase-gravitas-binding-4',
          source: 'clash',
          expression: null,
          target: 'colorSaturationPulse',
          combinator: 'add',
          amount: 0.7,
          label: 'clash → pool detonation',
          bypassed: false,
        },
      ),
    },
  },

  // ── 18. Plasma Coil ──
  {
    id: 'showcase-plasma-coil',
    name: 'Plasma Coil ⚯',
    character: 'Showcase',
    era: 'expanded-universe',
    continuity: 'showcase',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Tesla-coil blade. Plasma style runs interleaved bright/dim bands with constant micro-flicker; sound drives the saturation pulse so each note bites; a slow LFO breathes the shimmer floor; swing accelerates the hue cycle; clash hits like a discharge. SHOWCASE: rare `plasma` style + 4 bindings + multi-stop violet→white gradient.',
    hiltNotes: 'Black-chrome hilt with twin copper accent rings around the activation collar.',
    config: {
      name: 'PlasmaCoil',
      baseColor: { r: 200, g: 100, b: 240 },
      clashColor: { r: 255, g: 240, b: 255 },
      lockupColor: { r: 240, g: 200, b: 255 },
      blastColor: { r: 240, g: 220, b: 255 },
      style: 'plasma',
      ignition: 'glitch',
      retraction: 'flicker-out',
      ignitionMs: 380,
      retractionMs: 540,
      shimmer: 0.28,
      ledCount: 144,
      swingFxIntensity: 0.6,
      colorHueShiftSpeed: 0.25,
      gradientStops: [
        { position: 0, color: { r: 120, g: 0, b: 200 } },
        { position: 0.5, color: { r: 200, g: 100, b: 240 } },
        { position: 1, color: { r: 255, g: 220, b: 255 } },
      ],
      gradientInterpolation: 'smooth',
      modulation: payload(
        {
          id: 'showcase-plasma-binding-1',
          source: 'sound',
          expression: null,
          target: 'colorSaturationPulse',
          combinator: 'replace',
          amount: 0.7,
          label: 'sound → coil saturation bite',
          bypassed: false,
        },
        {
          id: 'showcase-plasma-binding-2',
          source: null,
          expression: {
            source: 'abs(sin(time * 0.0008)) * 0.25 + 0.2',
            ast: absSinLFO(0.0008, 0.25, 0.2),
          },
          target: 'shimmer',
          combinator: 'replace',
          amount: 1.0,
          label: 'fx: 7.8s breath floor',
          bypassed: false,
        },
        {
          id: 'showcase-plasma-binding-3',
          source: 'swing',
          expression: null,
          target: 'colorHueShiftSpeed',
          combinator: 'add',
          amount: 0.4,
          label: 'swing → hue accelerate',
          bypassed: false,
        },
        {
          id: 'showcase-plasma-binding-4',
          source: 'clash',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.9,
          label: 'clash → coil discharge',
          bypassed: false,
        },
      ),
    },
  },
];
