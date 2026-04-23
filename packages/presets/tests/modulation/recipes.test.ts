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
  type ModulationRecipe,
} from '../../src/recipes/modulation/index.js';

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

describe('Modulation recipes — v1.0 starter set', () => {
  it('exports all 5 recipes via the barrel', () => {
    expect(REACTIVE_SHIMMER_RECIPE).toBeDefined();
    expect(SOUND_REACTIVE_MUSIC_RECIPE).toBeDefined();
    expect(ANGLE_REACTIVE_TIP_RECIPE).toBeDefined();
    expect(CLASH_FLASH_WHITE_RECIPE).toBeDefined();
    expect(TWIST_DRIVES_HUE_RECIPE).toBeDefined();
  });

  it('MODULATION_RECIPES contains exactly 5 entries, in display order', () => {
    expect(MODULATION_RECIPES).toHaveLength(5);
    expect(MODULATION_RECIPES[0]).toBe(REACTIVE_SHIMMER_RECIPE);
    expect(MODULATION_RECIPES[1]).toBe(SOUND_REACTIVE_MUSIC_RECIPE);
    expect(MODULATION_RECIPES[2]).toBe(ANGLE_REACTIVE_TIP_RECIPE);
    expect(MODULATION_RECIPES[3]).toBe(CLASH_FLASH_WHITE_RECIPE);
    expect(MODULATION_RECIPES[4]).toBe(TWIST_DRIVES_HUE_RECIPE);
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

  it('every binding source is a built-in modulator ID', () => {
    for (const recipe of MODULATION_RECIPES) {
      for (const binding of recipe.bindings) {
        // v1.0 recipes are bare-source only (no expressions).
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
      }
    }
  });

  it('every binding has expression null (v1.0 bare-modulator-reference only)', () => {
    for (const recipe of MODULATION_RECIPES) {
      for (const binding of recipe.bindings) {
        expect(binding.expression).toBeNull();
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
