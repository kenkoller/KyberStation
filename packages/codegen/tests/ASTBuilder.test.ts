// ─── ASTBuilder Tests ───

import { describe, it, expect } from 'vitest';
import { buildAST } from '../src/index.js';
import type { StyleNode } from '../src/index.js';
import type { BladeConfig } from '../src/index.js';

// ─── Helpers ───

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 0, g: 0, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 255, b: 0 },
    blastColor: { r: 255, g: 0, b: 0 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 400,
    shimmer: 0,
    ledCount: 144,
    ...overrides,
  };
}

/** Recursively find all nodes matching a predicate. */
function findNodes(
  root: StyleNode,
  predicate: (n: StyleNode) => boolean,
): StyleNode[] {
  const results: StyleNode[] = [];
  if (predicate(root)) results.push(root);
  for (const child of root.args) {
    results.push(...findNodes(child, predicate));
  }
  return results;
}

/** Find the first node with a given name. */
function findByName(root: StyleNode, name: string): StyleNode | undefined {
  if (root.name === name) return root;
  for (const child of root.args) {
    const found = findByName(child, name);
    if (found) return found;
  }
  return undefined;
}

// ─── Tests ───

describe('buildAST', () => {
  describe('top-level structure', () => {
    it('wraps output in StylePtr', () => {
      const ast = buildAST(makeConfig());
      expect(ast.name).toBe('StylePtr');
      expect(ast.type).toBe('wrapper');
    });

    it('has Layers as the sole child of StylePtr', () => {
      const ast = buildAST(makeConfig());
      expect(ast.args).toHaveLength(1);
      expect(ast.args[0].name).toBe('Layers');
      expect(ast.args[0].type).toBe('template');
    });

    it('Layers contains base style + effect layers + InOutTrL', () => {
      const ast = buildAST(makeConfig());
      const layers = ast.args[0];
      // base + BlastL + SimpleClashL + 4x LockupTrL + InOutTrL = 8
      expect(layers.args.length).toBe(8);
    });
  });

  describe('effect layers', () => {
    it('includes BlastL layer', () => {
      const ast = buildAST(makeConfig());
      const blasts = findNodes(ast, (n) => n.name === 'BlastL');
      expect(blasts.length).toBeGreaterThanOrEqual(1);
    });

    it('includes SimpleClashL layer', () => {
      const ast = buildAST(makeConfig());
      const clashes = findNodes(ast, (n) => n.name === 'SimpleClashL');
      expect(clashes.length).toBeGreaterThanOrEqual(1);
    });

    it('includes four LockupTrL layers (normal, drag, lightning, melt)', () => {
      const ast = buildAST(makeConfig());
      const lockups = findNodes(ast, (n) => n.name === 'LockupTrL');
      expect(lockups).toHaveLength(4);
    });

    it('has SaberBase::LOCKUP_NORMAL, LOCKUP_DRAG, LOCKUP_LIGHTNING_BLOCK, LOCKUP_MELT identifiers', () => {
      const ast = buildAST(makeConfig());
      const rawNodes = findNodes(ast, (n) => n.type === 'raw');
      const rawNames = rawNodes.map((n) => n.name);
      expect(rawNames).toContain('SaberBase::LOCKUP_NORMAL');
      expect(rawNames).toContain('SaberBase::LOCKUP_DRAG');
      expect(rawNames).toContain('SaberBase::LOCKUP_LIGHTNING_BLOCK');
      expect(rawNames).toContain('SaberBase::LOCKUP_MELT');
    });

    it('includes InOutTrL layer as the last child of Layers', () => {
      const ast = buildAST(makeConfig());
      const layers = ast.args[0];
      const lastChild = layers.args[layers.args.length - 1];
      expect(lastChild.name).toBe('InOutTrL');
      expect(lastChild.type).toBe('wrapper');
    });
  });

  describe('color values carry through', () => {
    it('uses blastColor in BlastL', () => {
      const config = makeConfig({ blastColor: { r: 100, g: 50, b: 25 } });
      const ast = buildAST(config);
      const blast = findByName(ast, 'BlastL');
      expect(blast).toBeDefined();
      // BlastL's first arg should be an Rgb node
      const rgb = blast!.args[0];
      expect(rgb.name).toBe('Rgb');
      expect(rgb.args.map((a) => a.name)).toEqual(['100', '50', '25']);
    });

    it('uses clashColor in SimpleClashL', () => {
      const config = makeConfig({ clashColor: { r: 200, g: 100, b: 50 } });
      const ast = buildAST(config);
      const clash = findByName(ast, 'SimpleClashL');
      expect(clash).toBeDefined();
      const rgb = clash!.args[0];
      expect(rgb.name).toBe('Rgb');
      expect(rgb.args.map((a) => a.name)).toEqual(['200', '100', '50']);
    });

    it('uses lockupColor in first LockupTrL AudioFlickerL', () => {
      const config = makeConfig({ lockupColor: { r: 10, g: 20, b: 30 } });
      const ast = buildAST(config);
      const lockups = findNodes(ast, (n) => n.name === 'LockupTrL');
      // First lockup is the normal one
      const normalLockup = lockups[0];
      const flickerL = normalLockup.args[0];
      expect(flickerL.name).toBe('AudioFlickerL');
      const rgb = flickerL.args[0];
      expect(rgb.name).toBe('Rgb');
      expect(rgb.args.map((a) => a.name)).toEqual(['10', '20', '30']);
    });

    it('uses baseColor in the base style Rgb node', () => {
      const config = makeConfig({ baseColor: { r: 128, g: 0, b: 255 } });
      const ast = buildAST(config);
      const layers = ast.args[0];
      const baseStyle = layers.args[0];
      // For stable style, base is AudioFlicker whose first arg is Rgb
      const rgb = baseStyle.args[0];
      expect(rgb.name).toBe('Rgb');
      expect(rgb.args.map((a) => a.name)).toEqual(['128', '0', '255']);
    });
  });

  describe('style types produce valid AST', () => {
    const styles = [
      'stable',
      'unstable',
      'fire',
      'pulse',
      'rotoscope',
      'gradient',
      'photon',
      'plasma',
      'crystalShatter',
      'aurora',
      'cinder',
      'prism',
    ];

    for (const style of styles) {
      it(`produces a valid AST for style "${style}"`, () => {
        const ast = buildAST(makeConfig({ style }));
        expect(ast).toBeDefined();
        expect(ast.name).toBe('StylePtr');
        expect(ast.args[0].name).toBe('Layers');
        expect(ast.args[0].args.length).toBeGreaterThanOrEqual(2);
      });
    }
  });

  describe('style-specific base node', () => {
    it('stable produces AudioFlicker', () => {
      const ast = buildAST(makeConfig({ style: 'stable' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('AudioFlicker');
    });

    it('unstable produces StyleFire', () => {
      const ast = buildAST(makeConfig({ style: 'unstable' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('StyleFire');
    });

    it('fire produces StyleFire', () => {
      const ast = buildAST(makeConfig({ style: 'fire' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('StyleFire');
    });

    it('pulse produces Pulsing', () => {
      const ast = buildAST(makeConfig({ style: 'pulse' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Pulsing');
    });

    it('aurora produces Rainbow raw node', () => {
      const ast = buildAST(makeConfig({ style: 'aurora' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Rainbow');
      expect(baseStyle.type).toBe('raw');
    });

    it('prism produces Rainbow raw node', () => {
      const ast = buildAST(makeConfig({ style: 'prism' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Rainbow');
      expect(baseStyle.type).toBe('raw');
    });

    it('gradient produces Gradient', () => {
      const ast = buildAST(makeConfig({ style: 'gradient' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Gradient');
    });

    it('photon produces Stripes', () => {
      const ast = buildAST(makeConfig({ style: 'photon' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Stripes');
    });

    it('plasma produces StyleFire', () => {
      const ast = buildAST(makeConfig({ style: 'plasma' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('StyleFire');
    });

    it('crystalShatter produces Stripes', () => {
      const ast = buildAST(makeConfig({ style: 'crystalShatter' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Stripes');
    });

    it('cinder produces Mix (with SwingSpeed)', () => {
      const ast = buildAST(makeConfig({ style: 'cinder' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Mix');
      const swingSpeed = findByName(baseStyle, 'SwingSpeed');
      expect(swingSpeed).toBeDefined();
    });

    it('rotoscope produces Mix', () => {
      const ast = buildAST(makeConfig({ style: 'rotoscope' }));
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Mix');
    });
  });

  describe('ignition transitions', () => {
    it('standard ignition maps to TrWipeIn', () => {
      const ast = buildAST(makeConfig({ ignition: 'standard', ignitionMs: 500 }));
      const inOut = findByName(ast, 'InOutTrL');
      expect(inOut).toBeDefined();
      const ignitionTr = inOut!.args[0];
      expect(ignitionTr.name).toBe('TrWipeIn');
      expect(ignitionTr.args[0].name).toBe('500');
    });

    it('scroll ignition maps to TrWipe', () => {
      const ast = buildAST(makeConfig({ ignition: 'scroll', ignitionMs: 600 }));
      const inOut = findByName(ast, 'InOutTrL');
      const ignitionTr = inOut!.args[0];
      expect(ignitionTr.name).toBe('TrWipe');
      expect(ignitionTr.args[0].name).toBe('600');
    });

    it('spark ignition maps to TrWipeSparkTip', () => {
      const ast = buildAST(makeConfig({ ignition: 'spark' }));
      const inOut = findByName(ast, 'InOutTrL');
      const ignitionTr = inOut!.args[0];
      expect(ignitionTr.name).toBe('TrWipeSparkTip');
    });

    it('center ignition maps to TrCenterWipeIn', () => {
      const ast = buildAST(makeConfig({ ignition: 'center' }));
      const inOut = findByName(ast, 'InOutTrL');
      const ignitionTr = inOut!.args[0];
      expect(ignitionTr.name).toBe('TrCenterWipeIn');
    });

    it('wipe ignition maps to TrWipe', () => {
      const ast = buildAST(makeConfig({ ignition: 'wipe' }));
      const inOut = findByName(ast, 'InOutTrL');
      const ignitionTr = inOut!.args[0];
      expect(ignitionTr.name).toBe('TrWipe');
    });

    it('stutter ignition maps to TrConcat with multiple wipe segments', () => {
      const ast = buildAST(makeConfig({ ignition: 'stutter', ignitionMs: 600 }));
      const inOut = findByName(ast, 'InOutTrL');
      const ignitionTr = inOut!.args[0];
      expect(ignitionTr.name).toBe('TrConcat');
      expect(ignitionTr.args.length).toBe(3);
    });

    it('glitch ignition maps to TrConcat', () => {
      const ast = buildAST(makeConfig({ ignition: 'glitch', ignitionMs: 800 }));
      const inOut = findByName(ast, 'InOutTrL');
      const ignitionTr = inOut!.args[0];
      expect(ignitionTr.name).toBe('TrConcat');
      expect(ignitionTr.args.length).toBe(3);
    });

    it('unknown ignition falls back to TrWipeIn', () => {
      const ast = buildAST(makeConfig({ ignition: 'nonexistent' }));
      const inOut = findByName(ast, 'InOutTrL');
      const ignitionTr = inOut!.args[0];
      expect(ignitionTr.name).toBe('TrWipeIn');
    });
  });

  describe('retraction transitions', () => {
    it('standard retraction maps to TrWipeIn', () => {
      const ast = buildAST(makeConfig({ retraction: 'standard', retractionMs: 400 }));
      const inOut = findByName(ast, 'InOutTrL');
      const retractionTr = inOut!.args[1];
      expect(retractionTr.name).toBe('TrWipeIn');
      expect(retractionTr.args[0].name).toBe('400');
    });

    it('scroll retraction maps to TrWipe', () => {
      const ast = buildAST(makeConfig({ retraction: 'scroll' }));
      const inOut = findByName(ast, 'InOutTrL');
      const retractionTr = inOut!.args[1];
      expect(retractionTr.name).toBe('TrWipe');
    });

    it('fadeout retraction maps to TrFade', () => {
      const ast = buildAST(makeConfig({ retraction: 'fadeout' }));
      const inOut = findByName(ast, 'InOutTrL');
      const retractionTr = inOut!.args[1];
      expect(retractionTr.name).toBe('TrFade');
    });

    it('center retraction maps to TrCenterWipeIn', () => {
      const ast = buildAST(makeConfig({ retraction: 'center' }));
      const inOut = findByName(ast, 'InOutTrL');
      const retractionTr = inOut!.args[1];
      expect(retractionTr.name).toBe('TrCenterWipeIn');
    });

    it('shatter retraction maps to TrFade', () => {
      const ast = buildAST(makeConfig({ retraction: 'shatter' }));
      const inOut = findByName(ast, 'InOutTrL');
      const retractionTr = inOut!.args[1];
      expect(retractionTr.name).toBe('TrFade');
    });

    it('unknown retraction falls back to TrWipeIn', () => {
      const ast = buildAST(makeConfig({ retraction: 'nonexistent' }));
      const inOut = findByName(ast, 'InOutTrL');
      const retractionTr = inOut!.args[1];
      expect(retractionTr.name).toBe('TrWipeIn');
    });
  });

  describe('optional config fields', () => {
    it('uses custom dragColor when provided', () => {
      const config = makeConfig({ dragColor: { r: 1, g: 2, b: 3 } });
      const ast = buildAST(config);
      const lockups = findNodes(ast, (n) => n.name === 'LockupTrL');
      // Drag lockup is the second one
      const dragLockup = lockups[1];
      const flickerL = dragLockup.args[0];
      const rgb = flickerL.args[0];
      expect(rgb.args.map((a) => a.name)).toEqual(['1', '2', '3']);
    });

    it('uses default dragColor (255,150,0) when not provided', () => {
      const ast = buildAST(makeConfig());
      const lockups = findNodes(ast, (n) => n.name === 'LockupTrL');
      const dragLockup = lockups[1];
      const flickerL = dragLockup.args[0];
      const rgb = flickerL.args[0];
      expect(rgb.args.map((a) => a.name)).toEqual(['255', '150', '0']);
    });

    it('uses gradientEnd when style is gradient', () => {
      const config = makeConfig({
        style: 'gradient',
        gradientEnd: { r: 255, g: 0, b: 128 },
      });
      const ast = buildAST(config);
      const baseStyle = ast.args[0].args[0];
      expect(baseStyle.name).toBe('Gradient');
      const endRgb = baseStyle.args[1];
      expect(endRgb.name).toBe('Rgb');
      expect(endRgb.args.map((a) => a.name)).toEqual(['255', '0', '128']);
    });
  });

  describe('dual-mode ignition / retraction (Fett263)', () => {
    function findInOutTrL(ast: StyleNode): StyleNode {
      const matches = findNodes(ast, (n) => n.name === 'InOutTrL');
      expect(matches.length).toBeGreaterThan(0);
      return matches[0];
    }

    it('emits single-mode transitions when dualModeIgnition is not set', () => {
      const ast = buildAST(makeConfig());
      const inOut = findInOutTrL(ast);
      // args: [ignitionTr, retractionTr] — neither should be TrSelect.
      expect(inOut.args[0].name).not.toBe('TrSelect');
      expect(inOut.args[1].name).not.toBe('TrSelect');
    });

    it('wraps ignition in TrSelect<BladeAngle, down, up> when dual-mode is on', () => {
      const config = makeConfig({
        dualModeIgnition: true,
        ignition: 'standard',
        ignitionUp: 'spark',
        ignitionDown: 'stutter',
      });
      const ast = buildAST(config);
      const inOut = findInOutTrL(ast);
      const ignitionTr = inOut.args[0];
      expect(ignitionTr.name).toBe('TrSelect');
      expect(ignitionTr.args[0].name).toBe('BladeAngle');
      // down came first, then up.
      expect(ignitionTr.args[1].name).toBe('TrConcat'); // stutter
      expect(ignitionTr.args[2].name).toBe('TrWipeSparkTip'); // spark
    });

    it('wraps retraction in TrSelect when retractionUp/Down are set', () => {
      const config = makeConfig({
        dualModeIgnition: true,
        retraction: 'standard',
        retractionUp: 'fadeout',
        retractionDown: 'center',
      });
      const ast = buildAST(config);
      const inOut = findInOutTrL(ast);
      const retractionTr = inOut.args[1];
      expect(retractionTr.name).toBe('TrSelect');
      expect(retractionTr.args[0].name).toBe('BladeAngle');
      expect(retractionTr.args[1].name).toBe('TrCenterWipeIn'); // center (down)
      expect(retractionTr.args[2].name).toBe('TrFade'); // fadeout (up)
    });

    it('falls back to primary ignition when up/down aren\'t specified', () => {
      const config = makeConfig({
        dualModeIgnition: true,
        ignition: 'spark',
        // ignitionUp / ignitionDown intentionally omitted
      });
      const ast = buildAST(config);
      const inOut = findInOutTrL(ast);
      // Without up/down fields, the dual-mode branch shouldn't trigger —
      // it needs at least one of them to be set.
      expect(inOut.args[0].name).toBe('TrWipeSparkTip');
      expect(inOut.args[0].name).not.toBe('TrSelect');
    });
  });
});
