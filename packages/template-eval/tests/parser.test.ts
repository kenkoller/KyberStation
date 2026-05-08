import { describe, it, expect } from 'vitest';
import { parseTemplateString } from '../src/parser.js';

describe('parseTemplateString', () => {
  describe('bare identifiers', () => {
    it('parses a named color', () => {
      expect(parseTemplateString('Red')).toEqual({ name: 'Red', args: [] });
    });

    it('parses with surrounding whitespace', () => {
      expect(parseTemplateString('  Blue  ')).toEqual({ name: 'Blue', args: [] });
    });
  });

  describe('integer literals', () => {
    it('parses a positive integer', () => {
      expect(parseTemplateString('32768')).toEqual({ name: '32768', args: [] });
    });

    it('parses a negative integer', () => {
      expect(parseTemplateString('-100')).toEqual({ name: '-100', args: [] });
    });

    it('parses zero', () => {
      expect(parseTemplateString('0')).toEqual({ name: '0', args: [] });
    });
  });

  describe('template calls', () => {
    it('parses Rgb with three integer args', () => {
      const node = parseTemplateString('Rgb<255,0,128>');
      expect(node).toEqual({
        name: 'Rgb',
        args: [
          { name: '255', args: [] },
          { name: '0', args: [] },
          { name: '128', args: [] },
        ],
      });
    });

    it('parses single-arg template', () => {
      expect(parseTemplateString('Int<16384>')).toEqual({
        name: 'Int',
        args: [{ name: '16384', args: [] }],
      });
    });

    it('handles whitespace inside angle brackets', () => {
      const node = parseTemplateString('Rgb< 255 , 0 , 128 >');
      expect(node!.name).toBe('Rgb');
      expect(node!.args).toHaveLength(3);
    });
  });

  describe('nested templates', () => {
    it('parses Layers with two color args', () => {
      const node = parseTemplateString('Layers<Red, Blue>');
      expect(node).toEqual({
        name: 'Layers',
        args: [
          { name: 'Red', args: [] },
          { name: 'Blue', args: [] },
        ],
      });
    });

    it('parses deeply nested templates', () => {
      const node = parseTemplateString('Layers<Red, AudioFlicker<Blue, White>>');
      expect(node!.name).toBe('Layers');
      expect(node!.args).toHaveLength(2);
      expect(node!.args[0]).toEqual({ name: 'Red', args: [] });
      expect(node!.args[1]).toEqual({
        name: 'AudioFlicker',
        args: [
          { name: 'Blue', args: [] },
          { name: 'White', args: [] },
        ],
      });
    });

    it('parses triple-nested templates', () => {
      const node = parseTemplateString(
        'Layers<Mix<Int<16384>, Red, Blue>, AudioFlicker<Green, White>>'
      );
      expect(node!.name).toBe('Layers');
      expect(node!.args).toHaveLength(2);
      expect(node!.args[0].name).toBe('Mix');
      expect(node!.args[0].args[0]).toEqual({ name: 'Int', args: [{ name: '16384', args: [] }] });
    });
  });

  describe('StylePtr wrapper', () => {
    it('strips StylePtr<...>() wrapper', () => {
      const node = parseTemplateString('StylePtr<Layers<Red, Blue>>()');
      expect(node!.name).toBe('Layers');
      expect(node!.args).toHaveLength(2);
    });

    it('strips StylePtr with whitespace', () => {
      const node = parseTemplateString('StylePtr< Red >()');
      expect(node!.name).toBe('Red');
    });
  });

  describe('scoped names', () => {
    it('parses SaberBase:: scoped identifiers', () => {
      const node = parseTemplateString(
        'LockupTrL<White, TrInstant, TrFade<300>, SaberBase::LOCKUP_NORMAL>'
      );
      expect(node!.name).toBe('LockupTrL');
      expect(node!.args[3]).toEqual({ name: 'SaberBase::LOCKUP_NORMAL', args: [] });
    });
  });

  describe('comments', () => {
    it('skips line comments', () => {
      const node = parseTemplateString('Red // this is red');
      expect(node).toEqual({ name: 'Red', args: [] });
    });

    it('skips block comments', () => {
      const node = parseTemplateString('Rgb<255 /* red */, 0, 0>');
      expect(node!.name).toBe('Rgb');
      expect(node!.args).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('returns null for empty input', () => {
      expect(parseTemplateString('')).toBeNull();
    });

    it('returns null for only whitespace', () => {
      expect(parseTemplateString('   ')).toBeNull();
    });

    it('handles a real-world complex style', () => {
      const input = `Layers<
        Mix<Scale<SwingSpeed<400>, Int<0>, Int<32768>>,
          Rgb<0,140,255>,
          Rgb<255,40,40>>,
        InOutTrL<TrWipe<300>, TrWipeIn<500>>
      >`;
      const node = parseTemplateString(input);
      expect(node!.name).toBe('Layers');
      expect(node!.args).toHaveLength(2);
      expect(node!.args[0].name).toBe('Mix');
      expect(node!.args[1].name).toBe('InOutTrL');
    });
  });
});
