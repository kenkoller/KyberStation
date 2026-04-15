// ─── Validator Tests ───

import { describe, it, expect } from 'vitest';
import {
  buildAST,
  validateAST,
  isKnownTemplate,
  lookupTemplate,
  getAllTemplates,
} from '../src/index.js';
import type { StyleNode, ValidationResult } from '../src/index.js';
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
