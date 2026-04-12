// ─── CodeEmitter Tests ───

import { describe, it, expect } from 'vitest';
import { buildAST, emitCode, generateStyleCode } from '../src/index.js';
import type { StyleNode, EmitOptions } from '../src/index.js';
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

function countChar(str: string, char: string): number {
  let count = 0;
  for (const c of str) {
    if (c === char) count++;
  }
  return count;
}

// ─── Tests ───

describe('emitCode', () => {
  describe('pretty output (default)', () => {
    it('produces multi-line output with indentation', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast);
      expect(code).toContain('\n');
      expect(code).toMatch(/^ {2}/m); // some lines indented by 2
    });

    it('starts with StylePtr<', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast);
      expect(code).toMatch(/^StylePtr</);
    });

    it('ends with >() for StylePtr', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast);
      expect(code.trimEnd()).toMatch(/>\(\)$/);
    });

    it('has balanced angle brackets', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast);
      const opens = countChar(code, '<');
      const closes = countChar(code, '>');
      expect(opens).toBe(closes);
    });

    it('contains Layers template', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast);
      expect(code).toContain('Layers<');
    });

    it('contains BlastL template', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast);
      expect(code).toContain('BlastL<');
    });

    it('contains SimpleClashL template', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast);
      expect(code).toContain('SimpleClashL<');
    });

    it('contains LockupTrL template', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast);
      expect(code).toContain('LockupTrL<');
    });

    it('contains InOutTrL template', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast);
      expect(code).toContain('InOutTrL<');
    });

    it('contains Rgb values with correct numbers', () => {
      const ast = buildAST(makeConfig({ baseColor: { r: 100, g: 200, b: 50 } }));
      const code = emitCode(ast);
      expect(code).toContain('Rgb<100,200,50>');
    });
  });

  describe('minified output', () => {
    it('produces single-line output', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast, { minified: true });
      expect(code).not.toContain('\n');
    });

    it('has no extra spaces', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast, { minified: true });
      // Should not have "< " or " >" patterns (space around brackets)
      expect(code).not.toMatch(/< /);
      expect(code).not.toMatch(/ >/);
    });

    it('has balanced angle brackets', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast, { minified: true });
      const opens = countChar(code, '<');
      const closes = countChar(code, '>');
      expect(opens).toBe(closes);
    });

    it('starts with StylePtr< and ends with >()', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast, { minified: true });
      expect(code).toMatch(/^StylePtr</);
      expect(code).toMatch(/>\(\)$/);
    });

    it('contains all expected template names', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast, { minified: true });
      expect(code).toContain('Layers<');
      expect(code).toContain('BlastL<');
      expect(code).toContain('SimpleClashL<');
      expect(code).toContain('LockupTrL<');
      expect(code).toContain('InOutTrL<');
    });
  });

  describe('comments option', () => {
    it('includes comments when enabled', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast, { comments: true });
      expect(code).toContain('//');
    });

    it('includes Layer Compositor comment for Layers', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast, { comments: true });
      expect(code).toContain('// Layer Compositor');
    });

    it('includes Blast Effect comment for BlastL', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast, { comments: true });
      expect(code).toContain('// Blast Effect');
    });

    it('includes lockup type comments', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast, { comments: true });
      expect(code).toContain('// Normal Lockup');
      expect(code).toContain('// Drag Lockup');
      expect(code).toContain('// Lightning Block Lockup');
      expect(code).toContain('// Melt Lockup');
    });

    it('includes Ignition / Retraction comment for InOutTrL', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast, { comments: true });
      expect(code).toContain('// Ignition / Retraction');
    });

    it('does not include comments when disabled (default)', () => {
      const ast = buildAST(makeConfig());
      const code = emitCode(ast);
      expect(code).not.toContain('//');
    });
  });

  describe('bracket balance across all styles', () => {
    const styles = [
      'stable', 'unstable', 'fire', 'pulse', 'rotoscope',
      'gradient', 'photon', 'plasma', 'crystalShatter',
      'aurora', 'cinder', 'prism',
    ];

    for (const style of styles) {
      it(`has balanced brackets for style "${style}" (pretty)`, () => {
        const ast = buildAST(makeConfig({ style }));
        const code = emitCode(ast);
        expect(countChar(code, '<')).toBe(countChar(code, '>'));
      });

      it(`has balanced brackets for style "${style}" (minified)`, () => {
        const ast = buildAST(makeConfig({ style }));
        const code = emitCode(ast, { minified: true });
        expect(countChar(code, '<')).toBe(countChar(code, '>'));
      });
    }
  });

  describe('node type handling', () => {
    it('handles raw nodes without angle brackets', () => {
      const rawNode: StyleNode = { type: 'raw', name: 'Rainbow', args: [] };
      const wrapper: StyleNode = {
        type: 'wrapper',
        name: 'StylePtr',
        args: [rawNode],
      };
      const code = emitCode(wrapper, { minified: true });
      expect(code).toBe('StylePtr<Rainbow>()');
    });

    it('handles integer nodes as bare values', () => {
      const intNode: StyleNode = { type: 'integer', name: '42', args: [] };
      const template: StyleNode = {
        type: 'template',
        name: 'SomeTemplate',
        args: [intNode],
      };
      const code = emitCode(template, { minified: true });
      expect(code).toBe('SomeTemplate<42>');
    });

    it('handles color nodes (Rgb)', () => {
      const rgb: StyleNode = {
        type: 'color',
        name: 'Rgb',
        args: [
          { type: 'integer', name: '255', args: [] },
          { type: 'integer', name: '0', args: [] },
          { type: 'integer', name: '128', args: [] },
        ],
      };
      const code = emitCode(rgb, { minified: true });
      expect(code).toBe('Rgb<255,0,128>');
    });

    it('handles function nodes (Int)', () => {
      const intTemplate: StyleNode = {
        type: 'function',
        name: 'Int',
        args: [{ type: 'integer', name: '16384', args: [] }],
      };
      const code = emitCode(intTemplate, { minified: true });
      expect(code).toBe('Int<16384>');
    });

    it('handles no-arg template nodes', () => {
      const noArg: StyleNode = { type: 'template', name: 'TrInstant', args: [] };
      const code = emitCode(noArg, { minified: true });
      expect(code).toBe('TrInstant');
    });

    it('handles deeply nested nodes', () => {
      const deep: StyleNode = {
        type: 'template',
        name: 'A',
        args: [{
          type: 'template',
          name: 'B',
          args: [{
            type: 'template',
            name: 'C',
            args: [{ type: 'integer', name: '1', args: [] }],
          }],
        }],
      };
      const code = emitCode(deep, { minified: true });
      expect(code).toBe('A<B<C<1>>>');
      expect(countChar(code, '<')).toBe(countChar(code, '>'));
    });
  });

  describe('generateStyleCode convenience', () => {
    it('produces the same output as buildAST + emitCode', () => {
      const config = makeConfig();
      const manual = emitCode(buildAST(config));
      const convenient = generateStyleCode(config);
      expect(convenient).toBe(manual);
    });

    it('passes options through to emitCode', () => {
      const config = makeConfig();
      const minified = generateStyleCode(config, { minified: true });
      expect(minified).not.toContain('\n');
    });
  });
});
