// ─── Randomizer test suite ──────────────────────────────────────────────
//
// Validates the Surprise Me randomizer covers all current engine features:
//   - Full ignition catalog (minus custom-curve)
//   - Full retraction catalog (minus custom-curve)
//   - All 27 styles present in STYLE_LABELS
//   - clashDecay generation + lock preservation
//   - Modulation binding generation from bare-source recipes
//   - Lock system prevents re-randomization of locked fields
//
// Uses the __-prefixed test-only exports from Randomizer.tsx so these
// tests exercise the pure-function layer without mounting React components.

import { describe, it, expect } from 'vitest';
import { IGNITION_STYLES, RETRACTION_STYLES } from '@/lib/transitionCatalogs';
import { MODULATION_RECIPES } from '@kyberstation/presets';
import {
  __ALL_IGNITIONS as ALL_IGNITIONS,
  __ALL_RETRACTIONS as ALL_RETRACTIONS,
  __ALL_STYLES as ALL_STYLES,
  __STYLE_LABELS as STYLE_LABELS,
  __BARE_SOURCE_RECIPES as BARE_SOURCE_RECIPES,
  __generateConfig as generateConfig,
  __randomModulationBindings as randomModulationBindings,
  __applyLocks as applyLocks,
  __THEMES as THEMES,
} from '@/components/editor/Randomizer';
import type { BladeConfig } from '@kyberstation/engine';

// ── Catalog coverage ────────────────────────────────────────────────────

describe('ALL_IGNITIONS', () => {
  it('covers all 18 non-custom-curve ignition IDs from transitionCatalogs', () => {
    const catalogIds = IGNITION_STYLES
      .map((s) => s.id)
      .filter((id) => id !== 'custom-curve');
    expect(catalogIds).toHaveLength(18);
    expect(ALL_IGNITIONS).toHaveLength(18);
    for (const id of catalogIds) {
      expect(ALL_IGNITIONS).toContain(id);
    }
  });

  it('excludes custom-curve', () => {
    expect(ALL_IGNITIONS).not.toContain('custom-curve');
  });
});

describe('ALL_RETRACTIONS', () => {
  it('covers all 12 non-custom-curve retraction IDs from transitionCatalogs', () => {
    const catalogIds = RETRACTION_STYLES
      .map((s) => s.id)
      .filter((id) => id !== 'custom-curve');
    expect(catalogIds).toHaveLength(12);
    expect(ALL_RETRACTIONS).toHaveLength(12);
    for (const id of catalogIds) {
      expect(ALL_RETRACTIONS).toContain(id);
    }
  });

  it('excludes custom-curve', () => {
    expect(ALL_RETRACTIONS).not.toContain('custom-curve');
  });
});

describe('STYLE_LABELS', () => {
  it('has a label for every style in ALL_STYLES', () => {
    for (const style of ALL_STYLES) {
      expect(STYLE_LABELS).toHaveProperty(style);
      expect(typeof STYLE_LABELS[style]).toBe('string');
      expect(STYLE_LABELS[style].length).toBeGreaterThan(0);
    }
  });

  it('covers all 27 styles', () => {
    expect(ALL_STYLES).toHaveLength(27);
    expect(Object.keys(STYLE_LABELS)).toHaveLength(27);
  });
});

// ── BARE_SOURCE_RECIPES ─────────────────────────────────────────────────

describe('BARE_SOURCE_RECIPES', () => {
  it('includes only recipes where every binding has a non-null source', () => {
    for (const recipe of BARE_SOURCE_RECIPES) {
      for (const b of recipe.bindings) {
        expect(b.source).not.toBeNull();
      }
    }
  });

  it('excludes expression-based recipes (breathing, heartbeat, battery-saver)', () => {
    const ids = BARE_SOURCE_RECIPES.map((r) => r.id);
    expect(ids).not.toContain('recipe-breathing-blade');
    expect(ids).not.toContain('recipe-heartbeat-pulse');
    expect(ids).not.toContain('recipe-battery-saver');
  });

  it('has 8 bare-source recipes from the full 11', () => {
    expect(BARE_SOURCE_RECIPES).toHaveLength(8);
    expect(MODULATION_RECIPES).toHaveLength(11);
  });
});

// ── generateConfig ──────────────────────────────────────────────────────

describe('generateConfig', () => {
  const theme = THEMES.random;

  it('produces a config with clashDecay within 150-500ms range', () => {
    for (let i = 0; i < 20; i++) {
      const config = generateConfig(theme);
      expect(config.clashDecay).toBeGreaterThanOrEqual(150);
      expect(config.clashDecay).toBeLessThanOrEqual(500);
      expect(Number.isInteger(config.clashDecay)).toBe(true);
    }
  });

  it('produces ignitionMs within 200-800ms range', () => {
    for (let i = 0; i < 20; i++) {
      const config = generateConfig(theme);
      expect(config.ignitionMs).toBeGreaterThanOrEqual(200);
      expect(config.ignitionMs).toBeLessThanOrEqual(800);
    }
  });

  it('produces retractionMs within 200-600ms range', () => {
    for (let i = 0; i < 20; i++) {
      const config = generateConfig(theme);
      expect(config.retractionMs).toBeGreaterThanOrEqual(200);
      expect(config.retractionMs).toBeLessThanOrEqual(600);
    }
  });

  it('selects ignition from the full catalog', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(generateConfig(theme).ignition);
    }
    // With 18 options and 200 draws, statistical coverage should be high.
    // Asserting at least 10 unique ignitions is conservative.
    expect(seen.size).toBeGreaterThanOrEqual(10);
  });

  it('selects retraction from the full catalog', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(generateConfig(theme).retraction);
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });

  it('always produces visible colors (min brightness >= 80)', () => {
    for (let i = 0; i < 50; i++) {
      const config = generateConfig(theme);
      const maxChannel = Math.max(
        config.baseColor.r,
        config.baseColor.g,
        config.baseColor.b,
      );
      expect(maxChannel).toBeGreaterThanOrEqual(80);
    }
  });
});

// ── randomModulationBindings ────────────────────────────────────────────

describe('randomModulationBindings', () => {
  it('returns 1-2 recipe binding sets', () => {
    for (let i = 0; i < 30; i++) {
      const bindings = randomModulationBindings();
      // Each recipe has >= 1 binding. 1 recipe = 1+ bindings, 2 recipes = 2+ bindings.
      expect(bindings.length).toBeGreaterThanOrEqual(1);
      // Maximum: 2 recipes, each could have multiple bindings (most have 1-2).
      expect(bindings.length).toBeLessThanOrEqual(10);
    }
  });

  it('generates fresh unique IDs for every binding', () => {
    const bindings = randomModulationBindings();
    const ids = bindings.map((b) => b.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('IDs differ from the original recipe binding IDs', () => {
    const originalIds = new Set(
      BARE_SOURCE_RECIPES.flatMap((r) => r.bindings.map((b) => b.id)),
    );
    for (let i = 0; i < 10; i++) {
      const bindings = randomModulationBindings();
      for (const b of bindings) {
        expect(originalIds.has(b.id)).toBe(false);
      }
    }
  });

  it('preserves binding source, target, combinator, and amount from the recipe', () => {
    // Run multiple times to get good coverage
    for (let i = 0; i < 20; i++) {
      const bindings = randomModulationBindings();
      for (const b of bindings) {
        // Each binding should match one of the bare-source recipes' bindings
        const matchingRecipeBinding = BARE_SOURCE_RECIPES
          .flatMap((r) => r.bindings)
          .find(
            (rb) =>
              rb.source === b.source &&
              rb.target === b.target &&
              rb.combinator === b.combinator &&
              rb.amount === b.amount,
          );
        expect(matchingRecipeBinding).toBeDefined();
      }
    }
  });

  it('only uses bare-source recipes (source is non-null)', () => {
    for (let i = 0; i < 20; i++) {
      const bindings = randomModulationBindings();
      for (const b of bindings) {
        expect(b.source).not.toBeNull();
      }
    }
  });
});

// ── applyLocks ──────────────────────────────────────────────────────────

describe('applyLocks', () => {
  const theme = THEMES.random;

  it('always preserves ledCount from current config regardless of locks', () => {
    const current: BladeConfig = {
      ...generateConfig(theme),
      ledCount: 88,
    };
    const generated = generateConfig(theme);
    const result = applyLocks(generated, current, new Set());
    expect(result.ledCount).toBe(88);
  });

  it('preserves clashDecay under effects lock', () => {
    const current: BladeConfig = {
      ...generateConfig(theme),
      clashDecay: 275,
    };
    const generated = generateConfig(theme);
    const result = applyLocks(generated, current, new Set(['effects']));
    expect(result.clashDecay).toBe(275);
  });

  it('preserves colors under color lock', () => {
    const current: BladeConfig = {
      ...generateConfig(theme),
      baseColor: { r: 10, g: 20, b: 30 },
    };
    const generated = generateConfig(theme);
    const result = applyLocks(generated, current, new Set(['colors']));
    expect(result.baseColor).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('preserves style + shimmer under style lock', () => {
    const current: BladeConfig = {
      ...generateConfig(theme),
      style: 'plasma',
      shimmer: 0.42,
    };
    const generated = generateConfig(theme);
    const result = applyLocks(generated, current, new Set(['style']));
    expect(result.style).toBe('plasma');
    expect(result.shimmer).toBe(0.42);
  });

  it('preserves ignition + retraction + timing under timing lock', () => {
    const current: BladeConfig = {
      ...generateConfig(theme),
      ignition: 'crackle',
      retraction: 'drain',
      ignitionMs: 350,
      retractionMs: 400,
    };
    const generated = generateConfig(theme);
    const result = applyLocks(generated, current, new Set(['timing']));
    expect(result.ignition).toBe('crackle');
    expect(result.retraction).toBe('drain');
    expect(result.ignitionMs).toBe(350);
    expect(result.retractionMs).toBe(400);
  });
});

// ── Theme coverage ──────────────────────────────────────────────────────

describe('Themes', () => {
  it('random theme includes all 27 styles', () => {
    expect(THEMES.random.styles).toHaveLength(27);
  });

  it('every theme defines valid hue/sat/light ranges', () => {
    for (const [_name, theme] of Object.entries(THEMES)) {
      expect(theme.hueRanges.length).toBeGreaterThanOrEqual(1);
      for (const [lo, hi] of theme.hueRanges) {
        expect(lo).toBeGreaterThanOrEqual(0);
        expect(hi).toBeLessThanOrEqual(360);
        expect(lo).toBeLessThanOrEqual(hi);
      }
      expect(theme.satRange[0]).toBeGreaterThanOrEqual(0);
      expect(theme.satRange[1]).toBeLessThanOrEqual(100);
      expect(theme.lightRange[0]).toBeGreaterThanOrEqual(0);
      expect(theme.lightRange[1]).toBeLessThanOrEqual(100);
    }
  });

  it('every theme style is in ALL_STYLES', () => {
    const allStyleSet = new Set(ALL_STYLES as readonly string[]);
    for (const [_name, theme] of Object.entries(THEMES)) {
      for (const style of theme.styles) {
        expect(allStyleSet.has(style)).toBe(true);
      }
    }
  });
});
