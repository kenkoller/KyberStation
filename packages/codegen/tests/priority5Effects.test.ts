// ─── Priority 5 effects (v0.15.x) — codegen template emission ───
//
// Verifies the ProffieOS templates emitted by ASTBuilder for the
// 4 effects added in the priority-5 batch:
//   - Sith Flicker (style):    Mix<Sin<period_ms>, Mix<Int<floor>, Black, Rgb>, Rgb>
//   - Blade Charge (style):    Mix<Scale<SwingSpeed<400>, ...>, baseGradient, chargedGradient>
//   - Tempo Lock (style):      Mix<Sin<period_ms>, Mix<Int<floor>, Black, Rgb>, Rgb>
//   - Unstable Kylo (effect):  SimpleClashL<White, 60> overlay
//
// All four were specced in docs/NEW_EFFECTS_PRIORITY_5_PROPOSAL_2026-04-27.md
// with explicit hardware-fidelity check per docs/HARDWARE_FIDELITY_PRINCIPLE.md.

import { describe, it, expect } from 'vitest';
import { buildAST, emitCode } from '../src/index.js';
import type { BladeConfig, StyleNode } from '../src/index.js';

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 200, g: 0, b: 0 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 100, b: 100 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 400,
    shimmer: 0.0,
    ledCount: 144,
    ...overrides,
  };
}

function findNodes(root: StyleNode, predicate: (n: StyleNode) => boolean): StyleNode[] {
  const out: StyleNode[] = [];
  if (predicate(root)) out.push(root);
  for (const child of root.args) out.push(...findNodes(child, predicate));
  return out;
}

describe('Priority 5 effects — codegen', () => {
  describe('Sith Flicker', () => {
    it('produces a valid AST (StylePtr<Layers<...>>)', () => {
      const ast = buildAST(makeConfig({ style: 'sithFlicker' }));
      expect(ast.name).toBe('StylePtr');
      expect(ast.args[0].name).toBe('Layers');
    });

    it('base style is Mix<Sin<period>, Mix<Int<floor>, Black, baseRgb>, baseRgb>', () => {
      const ast = buildAST(makeConfig({ style: 'sithFlicker' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Mix');
      expect(baseStyle.args).toHaveLength(3);
      // First arg: Sin<period_ms>
      expect(baseStyle.args[0].name).toBe('Sin');
      // Second arg: inner Mix<Int<floor>, Black, baseRgb>
      expect(baseStyle.args[1].name).toBe('Mix');
      // Third arg: full baseColor Rgb
      expect(baseStyle.args[2].name).toBe('Rgb');
    });

    it('Sin period_ms = 1000 / flickerRate', () => {
      // Default rate = 5 Hz → period = 200ms
      const ast = buildAST(makeConfig({ style: 'sithFlicker' }));
      const baseStyle = ast.args[0].args[0];
      const sinNode = baseStyle.args[0];
      // Sin<Int<200>>
      expect(sinNode.args[0].name).toBe('Int');
      expect(sinNode.args[0].args[0].name).toBe('200');
    });

    it('custom flickerRate = 8 Hz produces Sin<Int<125>>', () => {
      const ast = buildAST(makeConfig({ style: 'sithFlicker', flickerRate: 8 }));
      const baseStyle = ast.args[0].args[0];
      const sinNode = baseStyle.args[0];
      expect(sinNode.args[0].args[0].name).toBe('125');
    });

    it('floor scalar = minBright * 32768', () => {
      // Default minBright = 0.1 → floor = 3277 (rounded)
      const ast = buildAST(makeConfig({ style: 'sithFlicker' }));
      const baseStyle = ast.args[0].args[0];
      const innerMix = baseStyle.args[1]; // Mix<Int<floor>, Black, Rgb>
      const intNode = innerMix.args[0]; // Int<floor>
      expect(intNode.name).toBe('Int');
      // 0.1 * 32768 = 3276.8 → rounded 3277
      expect(intNode.args[0].name).toBe('3277');
    });

    it('emitted code contains the canonical template shape', () => {
      const code = emitCode(
        buildAST(makeConfig({ style: 'sithFlicker' })),
        { minified: true },
      );
      // Mix<Sin<Int<200>>,Mix<Int<3277>,Black,Rgb<200,0,0>>,Rgb<200,0,0>>
      expect(code).toContain('Mix<Sin<Int<200>>');
      expect(code).toContain('Black');
      expect(code).toContain('Rgb<200,0,0>');
    });

    it('uses baseColor for both dim-mix and full-mix targets', () => {
      const ast = buildAST(
        makeConfig({ style: 'sithFlicker', baseColor: { r: 100, g: 50, b: 25 } }),
      );
      const baseStyle = ast.args[0].args[0];
      const innerMix = baseStyle.args[1];
      const innerRgb = innerMix.args[2]; // Rgb in the dim Mix
      const outerRgb = baseStyle.args[2]; // Rgb on the bright side
      expect(innerRgb.args.map((a) => a.name)).toEqual(['100', '50', '25']);
      expect(outerRgb.args.map((a) => a.name)).toEqual(['100', '50', '25']);
    });
  });

  describe('Blade Charge', () => {
    it('produces a valid AST (StylePtr<Layers<...>>)', () => {
      const ast = buildAST(makeConfig({ style: 'bladeCharge' }));
      expect(ast.name).toBe('StylePtr');
      expect(ast.args[0].name).toBe('Layers');
    });

    it('base style is Mix<Scale<SwingSpeed<400>, ...>, baseGradient, chargedGradient>', () => {
      const ast = buildAST(makeConfig({ style: 'bladeCharge' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Mix');
      expect(baseStyle.args).toHaveLength(3);
      // First arg: Scale<SwingSpeed<400>, Int<0>, Int<32768>>
      expect(baseStyle.args[0].name).toBe('Scale');
      // Second arg: idle Gradient
      expect(baseStyle.args[1].name).toBe('Gradient');
      // Third arg: charged Gradient
      expect(baseStyle.args[2].name).toBe('Gradient');
    });

    it('Scale function chain contains SwingSpeed<400>', () => {
      const ast = buildAST(makeConfig({ style: 'bladeCharge' }));
      const baseStyle = ast.args[0].args[0];
      const scale = baseStyle.args[0];
      const swing = scale.args[0]; // SwingSpeed
      expect(swing.name).toBe('SwingSpeed');
      expect(swing.args[0].name).toBe('400');
    });

    it('Scale clamps to [0, 32768]', () => {
      const ast = buildAST(makeConfig({ style: 'bladeCharge' }));
      const baseStyle = ast.args[0].args[0];
      const scale = baseStyle.args[0];
      // Scale<SwingSpeed<400>, Int<0>, Int<32768>>
      expect(scale.args[1].args[0].name).toBe('0');
      expect(scale.args[2].args[0].name).toBe('32768');
    });

    it('emitted code contains Mix<Scale<SwingSpeed<400>... shape', () => {
      const code = emitCode(
        buildAST(makeConfig({ style: 'bladeCharge' })),
        { minified: true },
      );
      expect(code).toContain('Mix<Scale<SwingSpeed<400>');
      expect(code).toContain('Gradient<');
    });
  });

  describe('Tempo Lock', () => {
    it('produces a valid AST', () => {
      const ast = buildAST(makeConfig({ style: 'tempoLock' }));
      expect(ast.name).toBe('StylePtr');
      expect(ast.args[0].name).toBe('Layers');
    });

    it('base style is Mix<Sin<period_ms>, Mix<Int<floor>, Black, Rgb>, Rgb>', () => {
      const ast = buildAST(makeConfig({ style: 'tempoLock' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Mix');
      expect(baseStyle.args[0].name).toBe('Sin');
      expect(baseStyle.args[1].name).toBe('Mix');
      expect(baseStyle.args[2].name).toBe('Rgb');
    });

    it('default BPM=120 produces Sin<Int<500>> (500ms period)', () => {
      const ast = buildAST(makeConfig({ style: 'tempoLock' }));
      const baseStyle = ast.args[0].args[0];
      const sin = baseStyle.args[0];
      expect(sin.args[0].args[0].name).toBe('500');
    });

    it('BPM=60 produces Sin<Int<1000>> (1s period — heartbeat)', () => {
      const ast = buildAST(makeConfig({ style: 'tempoLock', tempoBpm: 60 }));
      const baseStyle = ast.args[0].args[0];
      const sin = baseStyle.args[0];
      expect(sin.args[0].args[0].name).toBe('1000');
    });

    it('BPM=180 produces Sin<Int<333>> (333ms period — fast)', () => {
      const ast = buildAST(makeConfig({ style: 'tempoLock', tempoBpm: 180 }));
      const baseStyle = ast.args[0].args[0];
      const sin = baseStyle.args[0];
      expect(sin.args[0].args[0].name).toBe('333');
    });

    it('default depth=0.5 produces floor scalar (1-0.5)*32768 = 16384', () => {
      const ast = buildAST(makeConfig({ style: 'tempoLock' }));
      const baseStyle = ast.args[0].args[0];
      const innerMix = baseStyle.args[1];
      const intNode = innerMix.args[0];
      expect(intNode.args[0].name).toBe('16384');
    });

    it('depth=1 produces floor=0 (full off-to-on swing)', () => {
      const ast = buildAST(makeConfig({ style: 'tempoLock', tempoDepth: 1 }));
      const baseStyle = ast.args[0].args[0];
      const innerMix = baseStyle.args[1];
      const intNode = innerMix.args[0];
      expect(intNode.args[0].name).toBe('0');
    });

    it('emitted code contains Mix<Sin<Int<500>>... shape', () => {
      const code = emitCode(
        buildAST(makeConfig({ style: 'tempoLock' })),
        { minified: true },
      );
      expect(code).toContain('Mix<Sin<Int<500>>');
    });
  });

  describe('Unstable Kylo (clash overlay)', () => {
    it('does NOT emit the white overlay when unstableKylo is unset', () => {
      const ast = buildAST(makeConfig());
      const clashes = findNodes(ast, (n) => n.name === 'SimpleClashL');
      // Standard config has exactly 1 SimpleClashL (the standard clash layer)
      expect(clashes).toHaveLength(1);
    });

    it('does NOT emit the white overlay when unstableKylo is false', () => {
      const ast = buildAST(makeConfig({ unstableKylo: false }));
      const clashes = findNodes(ast, (n) => n.name === 'SimpleClashL');
      expect(clashes).toHaveLength(1);
    });

    it('emits a SECOND SimpleClashL<White, 60> overlay when unstableKylo is true', () => {
      const ast = buildAST(makeConfig({ unstableKylo: true }));
      const clashes = findNodes(ast, (n) => n.name === 'SimpleClashL');
      expect(clashes).toHaveLength(2);
    });

    it('the overlay clash uses raw White and 60ms duration', () => {
      const ast = buildAST(makeConfig({ unstableKylo: true }));
      const clashes = findNodes(ast, (n) => n.name === 'SimpleClashL');
      // Order: standard clash first, overlay second
      const overlay = clashes[1];
      // First arg: raw White
      expect(overlay.args[0].type).toBe('raw');
      expect(overlay.args[0].name).toBe('White');
      // Second arg: integer 60
      expect(overlay.args[1].name).toBe('60');
    });

    it('overlay coexists with standard clash (which keeps clashColor)', () => {
      const ast = buildAST(makeConfig({ unstableKylo: true, clashColor: { r: 255, g: 200, b: 100 } }));
      const clashes = findNodes(ast, (n) => n.name === 'SimpleClashL');
      const standard = clashes[0];
      // Standard clash uses clashColor
      const standardRgb = standard.args[0];
      expect(standardRgb.name).toBe('Rgb');
      expect(standardRgb.args.map((a) => a.name)).toEqual(['255', '200', '100']);
    });

    it('emitted code contains both SimpleClashL<...> and SimpleClashL<White,60>', () => {
      const code = emitCode(
        buildAST(makeConfig({ unstableKylo: true })),
        { minified: true },
      );
      expect(code).toContain('SimpleClashL<White,60>');
    });
  });

  describe('All 4 priority-5 styles produce valid ASTs (smoke)', () => {
    const stylesAndConfigs: Array<{ name: string; cfg: Partial<BladeConfig> }> = [
      { name: 'sithFlicker',                 cfg: { style: 'sithFlicker' } },
      { name: 'sithFlicker custom rate',     cfg: { style: 'sithFlicker', flickerRate: 4, flickerMinBright: 0.05 } },
      { name: 'bladeCharge',                 cfg: { style: 'bladeCharge' } },
      { name: 'tempoLock',                   cfg: { style: 'tempoLock' } },
      { name: 'tempoLock custom BPM/depth',  cfg: { style: 'tempoLock', tempoBpm: 90, tempoDepth: 0.8 } },
      { name: 'unstableKylo overlay',        cfg: { unstableKylo: true } },
    ];
    for (const { name, cfg } of stylesAndConfigs) {
      it(`produces a valid AST for ${name}`, () => {
        const ast = buildAST(makeConfig(cfg));
        expect(ast).toBeDefined();
        expect(ast.name).toBe('StylePtr');
        expect(ast.args[0].name).toBe('Layers');
        // Should also emit valid code without throwing
        const code = emitCode(ast, { minified: true });
        expect(code.length).toBeGreaterThan(0);
        expect(code).toContain('StylePtr<');
      });
    }
  });
});
