import { describe, it, expect } from 'vitest';
import { evaluateTemplate, evaluateTemplateString } from '../src/evaluate.js';
import { EffectManager } from '../src/EffectSystem.js';
import type { BladeState, TemplateNode, Color } from '../src/types.js';
import { PROFFIE_MAX } from '../src/types.js';

function makeState(overrides: Partial<BladeState> = {}): BladeState {
  return {
    isOn: true,
    numLeds: 144,
    timeMs: 1000,
    deltaMsF: 16,
    swingSpeed: 0,
    bladeAngle: 16384,
    twistAngle: 16384,
    soundLevel: 0,
    batteryLevel: 24576,
    variation: 0,
    ...overrides,
  };
}

describe('evaluateTemplate', () => {
  describe('integer literals', () => {
    it('evaluates a positive integer node', () => {
      const node: TemplateNode = { name: '16384', args: [] };
      const tmpl = evaluateTemplate(node);
      expect(tmpl.getInteger(0)).toBe(16384);
    });

    it('evaluates a negative integer node', () => {
      const node: TemplateNode = { name: '-100', args: [] };
      const tmpl = evaluateTemplate(node);
      expect(tmpl.getInteger(0)).toBe(-100);
    });

    it('integer literal getColor returns grayscale', () => {
      const node: TemplateNode = { name: String(PROFFIE_MAX), args: [] };
      const tmpl = evaluateTemplate(node);
      const c = tmpl.getColor(0);
      expect(c).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('zero integer returns black', () => {
      const node: TemplateNode = { name: '0', args: [] };
      const tmpl = evaluateTemplate(node);
      const c = tmpl.getColor(0);
      expect(c).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('named colors', () => {
    it('evaluates Red', () => {
      const tmpl = evaluateTemplate({ name: 'Red', args: [] });
      const effects = new EffectManager();
      tmpl.run(makeState(), effects);
      const c = tmpl.getColor(0);
      expect(c.r).toBe(255);
      expect(c.g).toBe(0);
      expect(c.b).toBe(0);
    });

    it('evaluates White', () => {
      const tmpl = evaluateTemplate({ name: 'White', args: [] });
      tmpl.run(makeState(), new EffectManager());
      expect(tmpl.getColor(0)).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('evaluates Black', () => {
      const tmpl = evaluateTemplate({ name: 'Black', args: [] });
      tmpl.run(makeState(), new EffectManager());
      expect(tmpl.getColor(0)).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('unknown template', () => {
    it('throws for unregistered name', () => {
      expect(() => evaluateTemplate({ name: 'FooBarBaz', args: [] })).toThrow(
        'Unknown template: "FooBarBaz"'
      );
    });
  });

  describe('template instantiation', () => {
    it('evaluates Rgb<255,0,0> to red', () => {
      const tmpl = evaluateTemplate({
        name: 'Rgb',
        args: [
          { name: '255', args: [] },
          { name: '0', args: [] },
          { name: '0', args: [] },
        ],
      });
      tmpl.run(makeState(), new EffectManager());
      expect(tmpl.getColor(0)).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('evaluates Int<16384> to 16384', () => {
      const tmpl = evaluateTemplate({
        name: 'Int',
        args: [{ name: '16384', args: [] }],
      });
      tmpl.run(makeState(), new EffectManager());
      expect(tmpl.getInteger(0)).toBe(16384);
    });
  });
});

describe('evaluateTemplateString', () => {
  it('parses and evaluates a named color', () => {
    const tmpl = evaluateTemplateString('Red');
    tmpl.run(makeState(), new EffectManager());
    const c = tmpl.getColor(0);
    expect(c.r).toBe(255);
    expect(c.g).toBe(0);
    expect(c.b).toBe(0);
  });

  it('parses and evaluates Rgb<0,255,0>', () => {
    const tmpl = evaluateTemplateString('Rgb<0,255,0>');
    tmpl.run(makeState(), new EffectManager());
    expect(tmpl.getColor(0)).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('throws on empty string', () => {
    expect(() => evaluateTemplateString('')).toThrow('Failed to parse');
  });

  it('throws on unknown template name', () => {
    expect(() => evaluateTemplateString('UnknownStyle<Red>')).toThrow('Unknown template');
  });
});
