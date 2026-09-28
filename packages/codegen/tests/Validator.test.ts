// ─── Validator Tests ───

import { describe, it, expect } from 'vitest';
import {
  buildAST,
  emitCode,
  generateStyleCode,
  validateAST,
  validateStyleCode,
  isKnownTemplate,
  lookupTemplate,
  getAllTemplates,
} from '../src/index.js';
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

// ─── Tests ───

describe('validateAST', () => {
  describe('valid ASTs from buildAST', () => {
    const styles = [
      'stable', 'unstable', 'fire', 'pulse', 'rotoscope',
      'gradient', 'photon', 'plasma', 'crystalShatter',
      'aurora', 'cinder', 'prism',
    ];

    for (const style of styles) {
      it(`returns valid: true for style "${style}"`, () => {
        const ast = buildAST(makeConfig({ style }));
        const result = validateAST(ast);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    }
  });

  describe('known raw values pass', () => {
    it('validates Rainbow raw node', () => {
      const ast: StyleNode = {
        type: 'wrapper',
        name: 'StylePtr',
        args: [{ type: 'raw', name: 'Rainbow', args: [] }],
      };
      const result = validateAST(ast);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('validates White raw node', () => {
      const node: StyleNode = { type: 'raw', name: 'White', args: [] };
      const wrapper: StyleNode = { type: 'wrapper', name: 'StylePtr', args: [node] };
      const result = validateAST(wrapper);
      expect(result.valid).toBe(true);
    });

    it('validates lockup type raw values', () => {
      const lockupTypes = ['SaberBase::LOCKUP_NORMAL', 'SaberBase::LOCKUP_DRAG', 'SaberBase::LOCKUP_LIGHTNING_BLOCK', 'SaberBase::LOCKUP_MELT'];
      for (const lockup of lockupTypes) {
        const node: StyleNode = { type: 'raw', name: lockup, args: [] };
        const wrapper: StyleNode = { type: 'wrapper', name: 'StylePtr', args: [node] };
        const result = validateAST(wrapper);
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('validates TrInstant raw node', () => {
      const node: StyleNode = { type: 'raw', name: 'TrInstant', args: [] };
      const wrapper: StyleNode = { type: 'wrapper', name: 'StylePtr', args: [node] };
      const result = validateAST(wrapper);
      expect(result.valid).toBe(true);
    });

    it('validates numeric raw values as valid', () => {
      const node: StyleNode = { type: 'raw', name: '42', args: [] };
      const wrapper: StyleNode = { type: 'wrapper', name: 'StylePtr', args: [node] };
      const result = validateAST(wrapper);
      // Numeric raw values pass the regex check
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('unknown template names produce warnings', () => {
    it('warns on unknown raw value', () => {
      const node: StyleNode = { type: 'raw', name: 'CompletelyFakeValue', args: [] };
      const wrapper: StyleNode = { type: 'wrapper', name: 'StylePtr', args: [node] };
      const result = validateAST(wrapper);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('Unknown raw value');
      expect(result.warnings[0].message).toContain('CompletelyFakeValue');
    });

    it('warns on unknown template name with args', () => {
      const node: StyleNode = {
        type: 'template',
        name: 'TotallyMadeUpTemplate',
        args: [{ type: 'integer', name: '1', args: [] }],
      };
      const wrapper: StyleNode = { type: 'wrapper', name: 'StylePtr', args: [node] };
      const result = validateAST(wrapper);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.message.includes('Unknown template name'))).toBe(true);
    });
  });

  describe('missing required fields cause errors', () => {
    it('errors when node has empty name', () => {
      const node: StyleNode = { type: 'template', name: '', args: [] };
      const wrapper: StyleNode = { type: 'wrapper', name: 'StylePtr', args: [node] };
      const result = validateAST(wrapper);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('missing a name'))).toBe(true);
    });

    it('errors when node has empty type', () => {
      const node = { type: '', name: 'Test', args: [] } as unknown as StyleNode;
      const wrapper: StyleNode = { type: 'wrapper', name: 'StylePtr', args: [node] };
      const result = validateAST(wrapper);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('missing a type'))).toBe(true);
    });

    it('errors when integer node has non-numeric name', () => {
      const node: StyleNode = { type: 'integer', name: 'abc', args: [] };
      const wrapper: StyleNode = { type: 'wrapper', name: 'StylePtr', args: [node] };
      const result = validateAST(wrapper);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('non-numeric'))).toBe(true);
    });
  });

  describe('deep nested validation', () => {
    it('validates all nodes in a deeply nested tree', () => {
      const deep: StyleNode = {
        type: 'wrapper',
        name: 'StylePtr',
        args: [{
          type: 'template',
          name: 'Layers',
          args: [{
            type: 'color',
            name: 'AudioFlicker',
            args: [
              {
                type: 'color',
                name: 'Rgb',
                args: [
                  { type: 'integer', name: '255', args: [] },
                  { type: 'integer', name: '0', args: [] },
                  { type: 'integer', name: '0', args: [] },
                ],
              },
              { type: 'raw', name: 'White', args: [] },
            ],
          }],
        }],
      };
      const result = validateAST(deep);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('finds errors deep in the tree', () => {
      const deep: StyleNode = {
        type: 'wrapper',
        name: 'StylePtr',
        args: [{
          type: 'template',
          name: 'Layers',
          args: [{
            type: 'color',
            name: 'Rgb',
            args: [
              { type: 'integer', name: '255', args: [] },
              { type: 'integer', name: 'notanumber', args: [] },
              { type: 'integer', name: '0', args: [] },
            ],
          }],
        }],
      };
      const result = validateAST(deep);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('non-numeric'))).toBe(true);
    });

    it('reports correct path for nested errors', () => {
      const deep: StyleNode = {
        type: 'wrapper',
        name: 'StylePtr',
        args: [{
          type: 'template',
          name: 'Layers',
          args: [{
            type: 'integer',
            name: 'bad',
            args: [],
          }],
        }],
      };
      const result = validateAST(deep);
      expect(result.valid).toBe(false);
      const err = result.errors.find((e) => e.message.includes('non-numeric'));
      expect(err).toBeDefined();
      expect(err!.path).toContain('Layers');
    });

    it('finds warnings in deeply nested unknown raw values', () => {
      const deep: StyleNode = {
        type: 'wrapper',
        name: 'StylePtr',
        args: [{
          type: 'template',
          name: 'Layers',
          args: [{
            type: 'template',
            name: 'BlastL',
            args: [{ type: 'raw', name: 'UnknownColor', args: [] }],
          }],
        }],
      };
      const result = validateAST(deep);
      expect(result.warnings.some((w) => w.message.includes('UnknownColor'))).toBe(true);
    });
  });

  describe('bracket balance validation', () => {
    it('valid AST has balanced brackets', () => {
      const ast = buildAST(makeConfig());
      const result = validateAST(ast);
      const bracketError = result.errors.find((e) => e.message.includes('bracket'));
      expect(bracketError).toBeUndefined();
    });

    // Regression pin: the pre-2026-09 check counted brackets over the tree,
    // where every node contributes a matched pair, so it returned 0 for any
    // input and this AST was reported valid. The check now scans the code
    // emitCode() actually prints.
    it('reports unbalanced brackets in the code the tree emits', () => {
      const ast: StyleNode = {
        type: 'wrapper',
        name: 'StylePtr',
        args: [{ type: 'raw', name: 'Rgb<255,0,0', args: [] }],
      };
      expect(emitCode(ast)).toBe('StylePtr<Rgb<255,0,0>()');
      const result = validateAST(ast);
      expect(result.valid).toBe(false);
      const bracketError = result.errors.find((e) =>
        e.message.startsWith('Angle brackets are unbalanced'),
      );
      expect(bracketError).toBeDefined();
      expect(bracketError!.path).toMatch(/^emitted@1:\d+$/);
    });

    it('reports an excess closing bracket in the code the tree emits', () => {
      const ast: StyleNode = {
        type: 'wrapper',
        name: 'StylePtr',
        args: [{ type: 'raw', name: 'White>', args: [] }],
      };
      const result = validateAST(ast);
      expect(result.valid).toBe(false);
      expect(emitCode(ast)).toBe('StylePtr<White>>()');
      expect(
        result.errors.some((e) => e.message.includes("'>' at 1:16 has no matching '<'")),
      ).toBe(true);
    });

    it('reports a template name that prints a stray bracket', () => {
      const ast: StyleNode = {
        type: 'wrapper',
        name: 'StylePtr',
        args: [{ type: 'template', name: 'Layers<', args: [{ type: 'raw', name: 'White', args: [] }] }],
      };
      const result = validateAST(ast);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('is not a C++ identifier'))).toBe(true);
      expect(result.errors.some((e) => e.message.startsWith('Angle brackets are unbalanced'))).toBe(true);
    });
  });

  describe('node structure checks', () => {
    const wrap = (node: StyleNode): StyleNode => ({ type: 'wrapper', name: 'StylePtr', args: [node] });

    it('errors on an unknown node type', () => {
      const node = { type: 'bogus', name: 'Rgb', args: [] } as unknown as StyleNode;
      const result = validateAST(wrap(node));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Unknown node type "bogus"'))).toBe(true);
    });

    it('errors when a node has no args array, and when the emitter then throws', () => {
      const node = { type: 'color', name: 'Rgb', args: undefined } as unknown as StyleNode;
      const result = validateAST(wrap(node));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('has no args array'))).toBe(true);
      expect(result.errors.some((e) => e.message.startsWith('emitCode() threw'))).toBe(true);
    });

    it('errors when a raw node has children (the emitter would drop them)', () => {
      const node: StyleNode = {
        type: 'raw',
        name: 'White',
        args: [{ type: 'integer', name: '1', args: [] }],
      };
      const result = validateAST(wrap(node));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('has 1 child arg(s)'))).toBe(true);
    });

    it('errors when a raw value smuggles in template syntax', () => {
      const node: StyleNode = { type: 'raw', name: 'Rgb<255,0,0>', args: [] };
      const result = validateAST(wrap(node));
      // Balanced, so only the token check can catch it.
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('is not a C++ identifier or integer literal');
    });

    it('errors when a zero-arg name is not a valid token', () => {
      const node: StyleNode = { type: 'color', name: 'Deep Sky Blue', args: [] };
      const result = validateAST(wrap(node));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('is not a C++ identifier'))).toBe(true);
    });

    it('warns on an unknown zero-arg template name', () => {
      const node: StyleNode = { type: 'color', name: 'Rainbowz', args: [] };
      const result = validateAST(wrap(node));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('Unknown template name: "Rainbowz"'))).toBe(true);
    });

    it('accepts ProffieOS enum values the codegen emits without warnings', () => {
      for (const name of [
        'EFFECT_PREON',
        'EFFECT_LOCKUP_BEGIN',
        'EFFECT_USER1',
        'EFFECT_USER6',
        'SaberBase::LOCKUP_AUTOFIRE',
        'SaberBase::LOCKUP_LIGHTNING_BLOCK',
      ]) {
        const result = validateAST(wrap({ type: 'raw', name, args: [] }));
        expect(result.errors, name).toEqual([]);
        expect(result.warnings, name).toEqual([]);
      }
    });

    it('still warns on a misspelled enum value', () => {
      const result = validateAST(wrap({ type: 'raw', name: 'EFFECT_BLASTT', args: [] }));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('EFFECT_BLASTT'))).toBe(true);
    });
  });

  describe('ValidationResult structure', () => {
    it('returns valid: true with empty arrays for clean AST', () => {
      const ast = buildAST(makeConfig());
      const result = validateAST(ast);
      expect(result).toHaveProperty('valid', true);
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('error objects have path, message, and severity fields', () => {
      const node: StyleNode = { type: 'template', name: '', args: [] };
      const wrapper: StyleNode = { type: 'wrapper', name: 'StylePtr', args: [node] };
      const result = validateAST(wrapper);
      expect(result.errors.length).toBeGreaterThan(0);
      const err = result.errors[0];
      expect(err).toHaveProperty('path');
      expect(err).toHaveProperty('message');
      expect(err).toHaveProperty('severity');
      expect(err.severity).toBe('error');
    });

    it('warning objects have severity "warning"', () => {
      const node: StyleNode = { type: 'raw', name: 'FakeUnknownThing', args: [] };
      const wrapper: StyleNode = { type: 'wrapper', name: 'StylePtr', args: [node] };
      const result = validateAST(wrapper);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].severity).toBe('warning');
    });
  });
});

describe('validateStyleCode', () => {
  const messages = (code: string) => {
    const result = validateStyleCode(code);
    return [...result.errors, ...result.warnings].map((e) => e.message);
  };

  describe('accepts generated code', () => {
    it('accepts pretty-printed buildAST output', () => {
      const result = validateStyleCode(emitCode(buildAST(makeConfig())));
      expect(result).toEqual({ valid: true, errors: [], warnings: [] });
    });

    it('accepts minified output', () => {
      const code = emitCode(buildAST(makeConfig({ style: 'fire' })), { minified: true });
      expect(validateStyleCode(code)).toEqual({ valid: true, errors: [], warnings: [] });
    });

    it('ignores comments, including brackets inside them', () => {
      const code = '// base < tip > (not code)\n/* <<< */ StylePtr<Red>() // trailing )';
      expect(validateStyleCode(code)).toEqual({ valid: true, errors: [], warnings: [] });
    });

    it('accepts the import-preservation output (provenance header + raw code)', () => {
      const code = generateStyleCode(
        makeConfig({
          importedRawCode: 'StylePtr<Layers<Rgb<0,0,255>,BlastL<White>>>()',
          importedSource: 'test paste',
          importedAt: 0,
        }),
      );
      expect(code.startsWith('// Imported from test paste')).toBe(true);
      expect(validateStyleCode(code)).toEqual({ valid: true, errors: [], warnings: [] });
    });
  });

  describe('each check can fail', () => {
    it('rejects empty and comment-only input', () => {
      expect(messages('')).toEqual(['Style code is empty']);
      expect(messages('   \n\t')).toEqual(['Style code is empty']);
      expect(messages('// just a comment')).toEqual(['Style code is empty']);
    });

    it('rejects an unclosed angle bracket', () => {
      const result = validateStyleCode('StylePtr<Layers<Red>()');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe(
        "Angle brackets are unbalanced: '<' at 1:9 is never closed",
      );
      expect(result.errors[0].path).toBe('code@1:9');
    });

    it('rejects an excess closing angle bracket', () => {
      expect(messages('StylePtr<Red>>()')).toContain(
        "Angle brackets are unbalanced: '>' at 1:14 has no matching '<'",
      );
    });

    it('rejects unbalanced parentheses', () => {
      expect(messages('StylePtr<Red>(')).toContain(
        "Parentheses are unbalanced: '(' at 1:14 is never closed",
      );
    });

    it('rejects crossed delimiters', () => {
      expect(messages('StylePtr<Red(>)')).toContain(
        "Mismatched delimiters: '>' at 1:14 closes '(' opened at 1:13",
      );
    });

    it('reports positions as line:col on multi-line input', () => {
      const result = validateStyleCode('StylePtr<\n  Layers<\n    Red\n  >\n');
      expect(result.errors.map((e) => e.path)).toEqual(['code@1:9']);
    });

    it('rejects characters that are not part of a style expression', () => {
      expect(messages('StylePtr<Rgb<255,0,0>;>()')).toContain("Unexpected character ';' at 1:22");
      expect(messages('StylePtr<Rgb<255,0,0.5>>()')).toContain("Unexpected character '.' at 1:21");
    });

    it('rejects content after the style expression', () => {
      expect(messages('StylePtr<Red>() Rainbow')).toContain(
        "Unexpected content after the style expression at 1:17: 'Rainbow'",
      );
      expect(messages('StylePtr<Red>() StylePtr<Blue>()')).toContain(
        "Unexpected content after the style expression at 1:17: 'StylePtr'",
      );
    });

    it('surfaces parser errors', () => {
      const result = validateStyleCode('StylePtr<<Red>>()');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.startsWith('Parse error:'))).toBe(true);
    });

    it('runs the node checks over the parsed tree', () => {
      const result = validateStyleCode('StylePtr<Layers<Fooo<Red>,BlastL<White>>>()');
      expect(result.valid).toBe(true);
      expect(result.warnings.map((w) => w.message)).toEqual(['Unknown template name: "Fooo"']);
    });
  });
});

describe('template registry', () => {
  it('isKnownTemplate returns true for known templates', () => {
    expect(isKnownTemplate('Rgb')).toBe(true);
    expect(isKnownTemplate('StylePtr')).toBe(true);
    expect(isKnownTemplate('Layers')).toBe(true);
  });

  it('isKnownTemplate returns false for unknown templates', () => {
    expect(isKnownTemplate('CompletelyFakeTemplate')).toBe(false);
  });

  it('lookupTemplate returns a definition for known templates', () => {
    const def = lookupTemplate('Rgb');
    expect(def).toBeDefined();
    expect(def!.name).toBe('Rgb');
  });

  it('lookupTemplate returns undefined for unknown templates', () => {
    expect(lookupTemplate('NotReal')).toBeUndefined();
  });

  it('getAllTemplates returns a non-empty map', () => {
    const all = getAllTemplates();
    expect(all.size).toBeGreaterThan(0);
  });

  it('getAllTemplates includes core templates', () => {
    const all = getAllTemplates();
    expect(all.has('Rgb')).toBe(true);
    expect(all.has('Layers')).toBe(true);
    expect(all.has('StylePtr')).toBe(true);
    expect(all.has('InOutTrL')).toBe(true);
  });
});
