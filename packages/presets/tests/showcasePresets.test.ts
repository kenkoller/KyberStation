// ─── Showcase preset coverage ────────────────────────────────────────────
//
// The 5 showcase presets are tech demos that exercise the full feature
// surface — multi-binding modulation payloads, math-expression formulas,
// custom gradient stops, spatial effect placement, rare engine styles.
// Tests pin the contract that each showcase preset ships those features
// (so they can\'t be silently watered down).

import { describe, it, expect } from 'vitest';
import { SHOWCASE_PRESETS, type Preset } from '../src/index.js';

const SHOWCASE_IDS = [
  'showcase-living-force',
  'showcase-storm-singer',
  'showcase-prismatic-drift',
  'showcase-phoenix-cycle',
  'showcase-quiet-tempest',
] as const;

function findById(id: string): Preset | undefined {
  return SHOWCASE_PRESETS.find((p) => p.id === id);
}

interface ConfigWithModulation {
  modulation?: {
    version: number;
    bindings: Array<{
      source: string | null;
      expression: { source: string; ast: unknown } | null;
      target: string;
      combinator: string;
      amount: number;
    }>;
  };
  gradientStops?: Array<{ position: number; color: { r: number; g: number; b: number } }>;
  lockupPosition?: number;
  dragPosition?: number;
}

function modulation(p: Preset): ConfigWithModulation['modulation'] {
  return (p.config as unknown as ConfigWithModulation).modulation;
}

function gradientStops(p: Preset): ConfigWithModulation['gradientStops'] {
  return (p.config as unknown as ConfigWithModulation).gradientStops;
}

describe('Showcase presets — feature surface', () => {
  it('ships all 5 showcase presets', () => {
    for (const id of SHOWCASE_IDS) {
      expect(findById(id), `Expected ${id} in SHOWCASE_PRESETS`).toBeDefined();
    }
  });

  it('every showcase preset has continuity="showcase" + author="KyberStation"', () => {
    for (const id of SHOWCASE_IDS) {
      const preset = findById(id)!;
      expect(preset.continuity).toBe('showcase');
      expect(preset.author).toBe('KyberStation');
      expect(preset.screenAccurate).toBe(false);
    }
  });

  it('every showcase preset ships a modulation payload with at least 3 bindings', () => {
    for (const id of SHOWCASE_IDS) {
      const preset = findById(id)!;
      const mod = modulation(preset);
      expect(mod, `${id} modulation payload`).toBeDefined();
      expect(mod!.version).toBe(1);
      expect(
        mod!.bindings.length,
        `${id} should have at least 3 bindings (it has ${mod!.bindings.length})`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('Living Force has a heartbeat expression + swing + clash bindings', () => {
    const lf = findById('showcase-living-force')!;
    const mod = modulation(lf)!;
    const targets = mod.bindings.map((b) => b.target);
    expect(targets.every((t) => t === 'shimmer')).toBe(true);
    const sources = mod.bindings.map((b) => b.source);
    expect(sources).toContain('swing');
    expect(sources).toContain('clash');
    // Expression binding present (source null + expression set)
    expect(mod.bindings.some((b) => b.source === null && b.expression !== null)).toBe(true);
  });

  it('Storm Singer drives colorHueShiftSpeed via sound + a time-LFO expression', () => {
    const ss = findById('showcase-storm-singer')!;
    const mod = modulation(ss)!;
    const hueBindings = mod.bindings.filter((b) => b.target === 'colorHueShiftSpeed');
    expect(hueBindings.length).toBeGreaterThanOrEqual(2);
    const sources = mod.bindings.map((b) => b.source);
    expect(sources).toContain('sound');
    expect(mod.bindings.some((b) => b.expression?.source.includes('time'))).toBe(true);
  });

  it('Prismatic Drift uses 4 distinct modulator sources', () => {
    const pd = findById('showcase-prismatic-drift')!;
    const mod = modulation(pd)!;
    expect(mod.bindings.length).toBeGreaterThanOrEqual(4);
    const distinctSources = new Set(
      mod.bindings.map((b) => b.source ?? 'expression'),
    );
    expect(distinctSources.size).toBeGreaterThanOrEqual(4);
  });

  it('Phoenix Cycle wires the 3 lifecycle modulators (ignition / retraction / lockup)', () => {
    const pc = findById('showcase-phoenix-cycle')!;
    const mod = modulation(pc)!;
    const sources = new Set(mod.bindings.map((b) => b.source));
    expect(sources.has('ignition')).toBe(true);
    expect(sources.has('retraction')).toBe(true);
    expect(sources.has('lockup')).toBe(true);
  });

  it('Quiet Tempest ships a long-period (>= 0.0001 multiplier) expression', () => {
    const qt = findById('showcase-quiet-tempest')!;
    const mod = modulation(qt)!;
    const expressionBinding = mod.bindings.find((b) => b.expression !== null);
    expect(expressionBinding).toBeDefined();
    // The multiplier appears as `time * <small constant>` in the source
    const source = expressionBinding!.expression!.source;
    expect(source).toMatch(/time\s*\*\s*0\.000\d/);
  });

  it('every showcase preset has custom gradientStops with at least 3 stops', () => {
    for (const id of SHOWCASE_IDS) {
      const preset = findById(id)!;
      const stops = gradientStops(preset);
      expect(stops, `${id} gradientStops`).toBeDefined();
      expect(stops!.length).toBeGreaterThanOrEqual(3);
      // stops are sorted by position [0..1] and span the full blade
      const positions = stops!.map((s) => s.position);
      expect(positions[0]).toBe(0);
      expect(positions[positions.length - 1]).toBe(1);
    }
  });

  it('Living Force, Phoenix Cycle, and Quiet Tempest use spatial effect placement', () => {
    const lf = findById('showcase-living-force')!.config as unknown as ConfigWithModulation;
    const pc = findById('showcase-phoenix-cycle')!.config as unknown as ConfigWithModulation;
    const qt = findById('showcase-quiet-tempest')!.config as unknown as ConfigWithModulation;
    expect(lf.lockupPosition).toBeDefined();
    expect(pc.lockupPosition).toBeDefined();
    expect(qt.dragPosition).toBeDefined();
  });

  it('every showcase preset uses a non-default engine style', () => {
    // Showcase presets demonstrate variety — none should be the default
    // `stable` style. Each must use a more visually distinctive engine
    // style (unstable / aurora / prism / fire / pulse / etc).
    for (const id of SHOWCASE_IDS) {
      const preset = findById(id)!;
      expect(
        preset.config.style,
        `${id} should not use 'stable' (showcase variety)`,
      ).not.toBe('stable');
    }
  });

  it('expression bindings carry parseable AST shapes', () => {
    for (const id of SHOWCASE_IDS) {
      const preset = findById(id)!;
      const mod = modulation(preset)!;
      const expressionBindings = mod.bindings.filter((b) => b.expression !== null);
      for (const binding of expressionBindings) {
        const ast = binding.expression!.ast as { kind: string };
        expect(ast.kind, `${id} expression AST kind`).toBeDefined();
        expect(['literal', 'var', 'binary', 'unary', 'call']).toContain(ast.kind);
      }
    }
  });

  it('config shape passes runtime sanity for every showcase preset', () => {
    for (const id of SHOWCASE_IDS) {
      const preset = findById(id)!;
      expect(preset.config.ledCount).toBe(144);
      expect(preset.config.ignitionMs).toBeGreaterThan(0);
      expect(preset.config.retractionMs).toBeGreaterThan(0);
      expect(preset.config.shimmer).toBeGreaterThanOrEqual(0);
      expect(preset.config.shimmer).toBeLessThanOrEqual(1);
      for (const channel of ['baseColor', 'clashColor', 'lockupColor', 'blastColor'] as const) {
        const color = preset.config[channel] as { r: number; g: number; b: number };
        for (const v of [color.r, color.g, color.b]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(255);
        }
      }
    }
  });

  it('all showcase preset IDs are unique', () => {
    const ids = SHOWCASE_PRESETS.map((p) => p.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
