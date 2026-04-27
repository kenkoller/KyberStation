// ─── Modulation Recipes — Regression Tests ────────────────────────────
//
// Tests for the five starter modulation recipes shipped with Friday v1.0
// "Routing Preview" BETA per `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md`
// §3.1 (Agent D deliverable).
//
// Invariants verified:
//   1. All 5 recipes load without error (no missing / undefined exports).
//   2. Each recipe's binding `target` paths exist in
//      `apps/web/lib/parameterGroups.ts::PARAMETER_DESCRIPTORS` and are
//      flagged `isModulatable`.
//   3. Each recipe's binding `source` is a built-in modulator ID from
//      `packages/engine/src/modulation/types.ts::BuiltInModulatorId`.
//   4. Each recipe's `targetBoard` is a valid board ID from
//      `apps/web/lib/boardProfiles.ts::BOARD_PROFILES` AND that board
//      has `supportsModulation: true` (can't ship a recipe for a
//      preview-only board).
//   5. No recipe has > 5 bindings (v1.0 scope limit).
//
// Mirror-pattern rationale: `packages/presets` has no dependency on
// either `apps/web` or `@kyberstation/engine` beyond the (absent) type
// import. We follow the `boardProfiles.ts` mirror-pattern policy by
// embedding the authoritative sets below; drift is caught by these
// tests failing, which is the exact shape the sprint plan wants.
// A post-v1.0 refactor can promote these to a shared workspace when
// the modulation registry exports stabilize.

import { describe, it, expect } from 'vitest';
import {
  MODULATION_RECIPES,
  REACTIVE_SHIMMER_RECIPE,
  SOUND_REACTIVE_MUSIC_RECIPE,
  ANGLE_REACTIVE_TIP_RECIPE,
  CLASH_FLASH_WHITE_RECIPE,
  TWIST_DRIVES_HUE_RECIPE,
  IDLE_HUE_DRIFT_RECIPE,
  SOUND_DRIVEN_HUE_RECIPE,
  TWIST_DRIVEN_SATURATION_RECIPE,
  BREATHING_BLADE_RECIPE,
  HEARTBEAT_PULSE_RECIPE,
  BATTERY_SAVER_RECIPE,
  type ModulationRecipe,
} from '../../src/recipes/modulation/index.js';

/** Recipes authored in the bare-source style (source set, expression null). */
const V1_0_RECIPES = [
  REACTIVE_SHIMMER_RECIPE,
  SOUND_REACTIVE_MUSIC_RECIPE,
  ANGLE_REACTIVE_TIP_RECIPE,
  CLASH_FLASH_WHITE_RECIPE,
  TWIST_DRIVES_HUE_RECIPE,
  IDLE_HUE_DRIFT_RECIPE,
  SOUND_DRIVEN_HUE_RECIPE,
  TWIST_DRIVEN_SATURATION_RECIPE,
];

/** Recipes using math-formula expressions (source null, expression set). v1.1+. */
const V1_1_EXPRESSION_RECIPES = [
  BREATHING_BLADE_RECIPE,
  HEARTBEAT_PULSE_RECIPE,
  BATTERY_SAVER_RECIPE,
];

// ─── Authoritative sets (mirror of source-of-truth registries) ─────────
//
// Regenerate by copying the string values from the listed files when
// the registries change. Drift here = test failure = intentional loud
// signal.

/**
 * Mirror of `PARAMETER_DESCRIPTORS` paths where `isModulatable === true`.
 * Source: `apps/web/lib/parameterGroups.ts` (v1.0 launch registry,
 * Agent C).
 */
const MODULATABLE_PARAMETER_PATHS = new Set<string>([
  // baseColor
  'baseColor.r', 'baseColor.g', 'baseColor.b',
  // clashColor
  'clashColor.r', 'clashColor.g', 'clashColor.b',
  // lockupColor
  'lockupColor.r', 'lockupColor.g', 'lockupColor.b',
  // blastColor
  'blastColor.r', 'blastColor.g', 'blastColor.b',
  // optional effect colors
  'dragColor.r', 'dragColor.g', 'dragColor.b',
  'meltColor.r', 'meltColor.g', 'meltColor.b',
  'lightningColor.r', 'lightningColor.g', 'lightningColor.b',
  'preonColor.r', 'preonColor.g', 'preonColor.b',
  'gradientEnd.r', 'gradientEnd.g', 'gradientEnd.b',
  'edgeColor.r', 'edgeColor.g', 'edgeColor.b',
  'tipColor.r', 'tipColor.g', 'tipColor.b',
  // core scalars
  'shimmer',
  // timing
  'ignitionMs', 'retractionMs', 'preonMs', 'ignitionAngleThreshold',
  // spatial effect positions
  'lockupPosition', 'lockupRadius',
  'dragPosition', 'dragRadius',
  'meltPosition', 'meltRadius',
  'stabPosition', 'stabRadius',
  'blastPosition', 'blastRadius',
  // noise
  'noiseScale', 'noiseSpeed', 'noiseOctaves', 'noiseTurbulence', 'noiseIntensity',
  // motion reactivity
  'motionSwingSensitivity', 'motionAngleInfluence', 'motionTwistResponse',
  'motionSmoothing', 'motionSwingBrighten',
  // color dynamics
  'colorHueShiftSpeed', 'colorSaturationPulse', 'colorBrightnessWave',
  'colorFlickerRate', 'colorFlickerDepth',
  // spatial pattern
  'spatialWaveFrequency', 'spatialWaveSpeed', 'spatialSpread', 'spatialPhase',
  // blend
  'blendSecondaryAmount',
  // tip/emitter
  'tipLength', 'tipFade', 'emitterFlare', 'emitterFlareWidth',
  // image scroll
  'scrollSpeed',
  // ignition/retraction knobs
  'stutterCount', 'stutterAmplitude', 'glitchDensity', 'glitchIntensity',
  'sparkSize', 'sparkTrail', 'wipeSoftness', 'shatterScale', 'shatterDimSpeed',
  // effect customization
  'clashLocation', 'clashIntensity', 'blastCount', 'blastSpread', 'stabDepth',
]);

/**
 * Mirror of `BuiltInModulatorId` in
 * `packages/engine/src/modulation/types.ts`.
 */
const BUILT_IN_MODULATOR_IDS = new Set<string>([
  'swing', 'angle', 'twist', 'sound', 'battery',
  'time', 'clash', 'lockup', 'preon', 'ignition', 'retraction',
]);

/**
 * Mirror of board IDs in `apps/web/lib/boardProfiles.ts::BOARD_PROFILES`
 * where `supportsModulation === true`. Preview-only and V2.2 (modulation
 * disabled for v1.0) are intentionally excluded — no recipe should target
 * a board it can't run on.
 */
const MODULATION_CAPABLE_BOARD_IDS = new Set<string>([
  'proffie-v3.9',
  'golden-harvest-v3',
]);

/** v1.0 scope cap from the impl plan (no hard cap; 5 is the recipe ceiling). */
const MAX_BINDINGS_PER_RECIPE = 5;

// ─── Tests ─────────────────────────────────────────────────────────────

describe('Modulation recipes — v1.0 + v1.1 starter set', () => {
  it('exports all 11 recipes via the barrel', () => {
    expect(REACTIVE_SHIMMER_RECIPE).toBeDefined();
    expect(SOUND_REACTIVE_MUSIC_RECIPE).toBeDefined();
    expect(ANGLE_REACTIVE_TIP_RECIPE).toBeDefined();
    expect(CLASH_FLASH_WHITE_RECIPE).toBeDefined();
    expect(TWIST_DRIVES_HUE_RECIPE).toBeDefined();
    expect(IDLE_HUE_DRIFT_RECIPE).toBeDefined();
    expect(SOUND_DRIVEN_HUE_RECIPE).toBeDefined();
    expect(TWIST_DRIVEN_SATURATION_RECIPE).toBeDefined();
    expect(BREATHING_BLADE_RECIPE).toBeDefined();
    expect(HEARTBEAT_PULSE_RECIPE).toBeDefined();
    expect(BATTERY_SAVER_RECIPE).toBeDefined();
  });

  it('MODULATION_RECIPES lists bare-source recipes first, then expression recipes', () => {
    // 8 bare-source + 3 expression = 11 total. Bare-source comes first
    // so new users see the gesture-reactive case before the formula-driven
    // case.
    expect(MODULATION_RECIPES).toHaveLength(11);
    expect(MODULATION_RECIPES[0]).toBe(REACTIVE_SHIMMER_RECIPE);
    expect(MODULATION_RECIPES[1]).toBe(SOUND_REACTIVE_MUSIC_RECIPE);
    expect(MODULATION_RECIPES[2]).toBe(ANGLE_REACTIVE_TIP_RECIPE);
    expect(MODULATION_RECIPES[3]).toBe(CLASH_FLASH_WHITE_RECIPE);
    expect(MODULATION_RECIPES[4]).toBe(TWIST_DRIVES_HUE_RECIPE);
    expect(MODULATION_RECIPES[5]).toBe(IDLE_HUE_DRIFT_RECIPE);
    expect(MODULATION_RECIPES[6]).toBe(SOUND_DRIVEN_HUE_RECIPE);
    expect(MODULATION_RECIPES[7]).toBe(TWIST_DRIVEN_SATURATION_RECIPE);
    expect(MODULATION_RECIPES[8]).toBe(BREATHING_BLADE_RECIPE);
    expect(MODULATION_RECIPES[9]).toBe(HEARTBEAT_PULSE_RECIPE);
    expect(MODULATION_RECIPES[10]).toBe(BATTERY_SAVER_RECIPE);
  });

  it('every recipe has a unique id with the `recipe-` prefix', () => {
    const ids = MODULATION_RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^recipe-/);
    }
  });

  it('every recipe has a non-empty name + description', () => {
    for (const recipe of MODULATION_RECIPES) {
      expect(recipe.name.length).toBeGreaterThan(0);
      expect(recipe.description.length).toBeGreaterThan(0);
    }
  });

  it('every recipe is v1 (matches the ModulationPayload.version contract)', () => {
    for (const recipe of MODULATION_RECIPES) {
      expect(recipe.version).toBe(1);
    }
  });

  it('every recipe has at least one binding and at most 5 (v1.0 scope)', () => {
    for (const recipe of MODULATION_RECIPES) {
      expect(recipe.bindings.length).toBeGreaterThan(0);
      expect(recipe.bindings.length).toBeLessThanOrEqual(MAX_BINDINGS_PER_RECIPE);
    }
  });

  it('every binding has a unique stable id within its recipe', () => {
    for (const recipe of MODULATION_RECIPES) {
      const bindingIds = recipe.bindings.map((b) => b.id);
      expect(new Set(bindingIds).size).toBe(bindingIds.length);
      for (const id of bindingIds) {
        expect(id.length).toBeGreaterThan(0);
      }
    }
  });

  it('every binding targets a parameter path that exists in parameterGroups and is modulatable', () => {
    for (const recipe of MODULATION_RECIPES) {
      for (const binding of recipe.bindings) {
        expect(
          MODULATABLE_PARAMETER_PATHS.has(binding.target),
          `Recipe "${recipe.id}" binding "${binding.id}" targets unknown/non-modulatable path "${binding.target}"`,
        ).toBe(true);
      }
    }
  });

  it('v1.0 bare-source recipes: every binding has a built-in modulator source + null expression', () => {
    for (const recipe of V1_0_RECIPES) {
      for (const binding of recipe.bindings) {
        expect(
          binding.source,
          `Recipe "${recipe.id}" binding "${binding.id}" has null source (v1.0 bindings must have a source set)`,
        ).not.toBeNull();
        if (binding.source !== null) {
          expect(
            BUILT_IN_MODULATOR_IDS.has(binding.source),
            `Recipe "${recipe.id}" binding "${binding.id}" references unknown modulator "${binding.source}"`,
          ).toBe(true);
        }
        expect(
          binding.expression,
          `Recipe "${recipe.id}" binding "${binding.id}" has an expression set — that's v1.1+ territory`,
        ).toBeNull();
      }
    }
  });

  it('v1.1 expression recipes: every binding has null source + pre-parsed expression', () => {
    for (const recipe of V1_1_EXPRESSION_RECIPES) {
      for (const binding of recipe.bindings) {
        expect(
          binding.source,
          `Recipe "${recipe.id}" binding "${binding.id}" has a source set — expression recipes should have source: null`,
        ).toBeNull();
        expect(
          binding.expression,
          `Recipe "${recipe.id}" binding "${binding.id}" lacks an expression`,
        ).not.toBeNull();
        if (binding.expression !== null) {
          expect(
            binding.expression.source.length,
            `Recipe "${recipe.id}" binding "${binding.id}" expression.source is empty`,
          ).toBeGreaterThan(0);
          expect(
            binding.expression.ast,
            `Recipe "${recipe.id}" binding "${binding.id}" expression.ast is missing`,
          ).toBeDefined();
        }
      }
    }
  });

  it('every binding has amount in [0, 1]', () => {
    for (const recipe of MODULATION_RECIPES) {
      for (const binding of recipe.bindings) {
        expect(binding.amount).toBeGreaterThanOrEqual(0);
        expect(binding.amount).toBeLessThanOrEqual(1);
      }
    }
  });

  it('every binding defaults to bypassed: false', () => {
    for (const recipe of MODULATION_RECIPES) {
      for (const binding of recipe.bindings) {
        expect(binding.bypassed).toBe(false);
      }
    }
  });

  it('every binding uses a known combinator', () => {
    const allowedCombinators = new Set(['replace', 'add', 'multiply', 'min', 'max']);
    for (const recipe of MODULATION_RECIPES) {
      for (const binding of recipe.bindings) {
        expect(allowedCombinators.has(binding.combinator)).toBe(true);
      }
    }
  });

  it('every recipe targets a modulation-capable board', () => {
    for (const recipe of MODULATION_RECIPES) {
      expect(
        MODULATION_CAPABLE_BOARD_IDS.has(recipe.targetBoard),
        `Recipe "${recipe.id}" targets "${recipe.targetBoard}" which is not modulation-capable`,
      ).toBe(true);
    }
  });

  it('every recipe defaults to proffie-v3.9 (hardware-validated default)', () => {
    // v1.0 recipes all share the default board — no cross-board recipes
    // Friday. This test locks that assumption so future work is deliberate.
    for (const recipe of MODULATION_RECIPES) {
      expect(recipe.targetBoard).toBe('proffie-v3.9');
    }
  });
});

// ─── Per-recipe sanity checks ──────────────────────────────────────────

describe('Reactive Shimmer recipe (recipe 1)', () => {
  const recipe: ModulationRecipe = REACTIVE_SHIMMER_RECIPE;

  it('has one binding wiring swing → shimmer with add @ 60%', () => {
    expect(recipe.bindings).toHaveLength(1);
    const [binding] = recipe.bindings;
    expect(binding.source).toBe('swing');
    expect(binding.target).toBe('shimmer');
    expect(binding.combinator).toBe('add');
    expect(binding.amount).toBeCloseTo(0.6, 5);
  });
});

describe('Sound-Reactive Music recipe (recipe 2)', () => {
  const recipe: ModulationRecipe = SOUND_REACTIVE_MUSIC_RECIPE;

  it('has one binding wiring sound → baseColor.b with add @ 80%', () => {
    expect(recipe.bindings).toHaveLength(1);
    const [binding] = recipe.bindings;
    expect(binding.source).toBe('sound');
    expect(binding.target).toBe('baseColor.b');
    expect(binding.combinator).toBe('add');
    expect(binding.amount).toBeCloseTo(0.8, 5);
  });
});

describe('Angle-Reactive Tip recipe (recipe 3)', () => {
  const recipe: ModulationRecipe = ANGLE_REACTIVE_TIP_RECIPE;

  it('has one binding wiring angle → emitterFlare with add @ 50%', () => {
    expect(recipe.bindings).toHaveLength(1);
    const [binding] = recipe.bindings;
    expect(binding.source).toBe('angle');
    expect(binding.target).toBe('emitterFlare');
    expect(binding.combinator).toBe('add');
    expect(binding.amount).toBeCloseTo(0.5, 5);
  });
});

describe('Clash-Flash White recipe (recipe 4)', () => {
  const recipe: ModulationRecipe = CLASH_FLASH_WHITE_RECIPE;

  it('has three parallel clash bindings flashing every RGB channel at 100%', () => {
    expect(recipe.bindings).toHaveLength(3);
    const targets = recipe.bindings.map((b) => b.target).sort();
    expect(targets).toEqual(['baseColor.b', 'baseColor.g', 'baseColor.r']);
    for (const binding of recipe.bindings) {
      expect(binding.source).toBe('clash');
      expect(binding.combinator).toBe('add');
      expect(binding.amount).toBeCloseTo(1.0, 5);
    }
  });
});

describe('Twist-Drives-Hue recipe (recipe 5)', () => {
  const recipe: ModulationRecipe = TWIST_DRIVES_HUE_RECIPE;

  it('has one binding wiring twist → colorHueShiftSpeed with add @ 100%', () => {
    expect(recipe.bindings).toHaveLength(1);
    const [binding] = recipe.bindings;
    expect(binding.source).toBe('twist');
    expect(binding.target).toBe('colorHueShiftSpeed');
    expect(binding.combinator).toBe('add');
    expect(binding.amount).toBeCloseTo(1.0, 5);
  });
});

describe('Breathing Blade recipe (recipe 6 — v1.1 expression)', () => {
  const recipe: ModulationRecipe = BREATHING_BLADE_RECIPE;

  it('has one expression-based binding on shimmer with replace @ 100%', () => {
    expect(recipe.bindings).toHaveLength(1);
    const [binding] = recipe.bindings;
    expect(binding.source).toBeNull();
    expect(binding.target).toBe('shimmer');
    expect(binding.combinator).toBe('replace');
    expect(binding.amount).toBeCloseTo(1.0, 5);
  });

  it('expression source matches the canonical sin(time) breathing idiom', () => {
    const [binding] = recipe.bindings;
    expect(binding.expression).not.toBeNull();
    if (binding.expression !== null) {
      expect(binding.expression.source).toBe('sin(time * 0.001) * 0.5 + 0.5');
      // ast top-level is a binary + node adding 0.5 to a scaled sin
      expect(binding.expression.ast.kind).toBe('binary');
    }
  });
});

describe('Idle Hue Drift recipe (v1.1 bare-source)', () => {
  const recipe: ModulationRecipe = IDLE_HUE_DRIFT_RECIPE;

  it('has one binding wiring time → colorHueShiftSpeed with add @ 30%', () => {
    expect(recipe.bindings).toHaveLength(1);
    const [binding] = recipe.bindings;
    expect(binding.source).toBe('time');
    expect(binding.target).toBe('colorHueShiftSpeed');
    expect(binding.combinator).toBe('add');
    expect(binding.amount).toBeCloseTo(0.3, 5);
  });
});

describe('Sound-Driven Hue recipe (v1.1 bare-source)', () => {
  const recipe: ModulationRecipe = SOUND_DRIVEN_HUE_RECIPE;

  it('has one binding wiring sound → colorHueShiftSpeed with add @ 80%', () => {
    expect(recipe.bindings).toHaveLength(1);
    const [binding] = recipe.bindings;
    expect(binding.source).toBe('sound');
    expect(binding.target).toBe('colorHueShiftSpeed');
    expect(binding.combinator).toBe('add');
    expect(binding.amount).toBeCloseTo(0.8, 5);
  });
});

describe('Twist-Driven Saturation recipe (v1.1 bare-source)', () => {
  const recipe: ModulationRecipe = TWIST_DRIVEN_SATURATION_RECIPE;

  it('has one binding wiring twist → colorSaturationPulse with multiply @ 100%', () => {
    expect(recipe.bindings).toHaveLength(1);
    const [binding] = recipe.bindings;
    expect(binding.source).toBe('twist');
    expect(binding.target).toBe('colorSaturationPulse');
    expect(binding.combinator).toBe('multiply');
    expect(binding.amount).toBeCloseTo(1.0, 5);
  });
});

describe('Heartbeat Pulse recipe (v1.1 expression)', () => {
  const recipe: ModulationRecipe = HEARTBEAT_PULSE_RECIPE;

  it('has one expression-based binding on shimmer with replace @ 100%', () => {
    expect(recipe.bindings).toHaveLength(1);
    const [binding] = recipe.bindings;
    expect(binding.source).toBeNull();
    expect(binding.target).toBe('shimmer');
    expect(binding.combinator).toBe('replace');
    expect(binding.amount).toBeCloseTo(1.0, 5);
  });

  it('expression source matches the abs(sin(time)) heartbeat idiom', () => {
    const [binding] = recipe.bindings;
    expect(binding.expression).not.toBeNull();
    if (binding.expression !== null) {
      expect(binding.expression.source).toBe('abs(sin(time * 0.002))');
      // ast top-level is a `call abs(...)` node
      expect(binding.expression.ast.kind).toBe('call');
      if (binding.expression.ast.kind === 'call') {
        expect(binding.expression.ast.fn).toBe('abs');
        expect(binding.expression.ast.args).toHaveLength(1);
      }
    }
  });
});

describe('Battery Saver recipe (v1.1 expression)', () => {
  const recipe: ModulationRecipe = BATTERY_SAVER_RECIPE;

  it('has one expression-based binding on shimmer with replace @ 100%', () => {
    expect(recipe.bindings).toHaveLength(1);
    const [binding] = recipe.bindings;
    expect(binding.source).toBeNull();
    expect(binding.target).toBe('shimmer');
    expect(binding.combinator).toBe('replace');
    expect(binding.amount).toBeCloseTo(1.0, 5);
  });

  it('expression source matches the clamp(1 - battery, 0, 0.5) idiom', () => {
    const [binding] = recipe.bindings;
    expect(binding.expression).not.toBeNull();
    if (binding.expression !== null) {
      expect(binding.expression.source).toBe('clamp(1 - battery, 0, 0.5)');
      // ast top-level is a `call clamp(...)` node with 3 args
      expect(binding.expression.ast.kind).toBe('call');
      if (binding.expression.ast.kind === 'call') {
        expect(binding.expression.ast.fn).toBe('clamp');
        expect(binding.expression.ast.args).toHaveLength(3);
      }
    }
  });
});
