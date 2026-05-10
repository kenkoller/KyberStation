// ─── Template Serializer — unit tests ─────────────────────────────────
//
// Phase 5D: serialization + immutable AST update + color conversion.
// Pure functions, no React rendering needed.

import { describe, it, expect } from 'vitest';
import {
  templateNodeToString,
  updateNodeAtPath,
  rgbToHex,
  hexToRgb,
} from '../lib/templateSerializer';

// ─── TemplateNode helper ─

interface TemplateNode {
  name: string;
  args: TemplateNode[];
}

function makeNode(name: string, args: TemplateNode[] = []): TemplateNode {
  return { name, args };
}

// ─── templateNodeToString ─

describe('templateNodeToString', () => {
  it('serializes a leaf node (integer literal)', () => {
    expect(templateNodeToString(makeNode('255'))).toBe('255');
  });

  it('serializes a negative integer literal', () => {
    expect(templateNodeToString(makeNode('-1'))).toBe('-1');
  });

  it('serializes a named color leaf', () => {
    expect(templateNodeToString(makeNode('Red'))).toBe('Red');
  });

  it('serializes a simple Rgb node', () => {
    const node = makeNode('Rgb', [makeNode('255'), makeNode('0'), makeNode('128')]);
    expect(templateNodeToString(node)).toBe('Rgb<255,0,128>');
  });

  it('serializes a nested template', () => {
    const node = makeNode('Mix', [
      makeNode('Int', [makeNode('16384')]),
      makeNode('Rgb', [makeNode('0'), makeNode('0'), makeNode('255')]),
      makeNode('Rgb', [makeNode('255'), makeNode('0'), makeNode('0')]),
    ]);
    expect(templateNodeToString(node)).toBe(
      'Mix<Int<16384>,Rgb<0,0,255>,Rgb<255,0,0>>',
    );
  });

  it('serializes a deeply nested template', () => {
    const node = makeNode('Layers', [
      makeNode('AudioFlicker', [makeNode('Red'), makeNode('Blue')]),
      makeNode('AlphaL', [
        makeNode('White'),
        makeNode('Scale', [
          makeNode('SwingSpeed', [makeNode('400')]),
          makeNode('Int', [makeNode('0')]),
          makeNode('Int', [makeNode('32768')]),
        ]),
      ]),
    ]);
    expect(templateNodeToString(node)).toBe(
      'Layers<AudioFlicker<Red,Blue>,AlphaL<White,Scale<SwingSpeed<400>,Int<0>,Int<32768>>>>',
    );
  });

  it('serializes a single-arg node', () => {
    expect(templateNodeToString(makeNode('TrFade', [makeNode('300')]))).toBe(
      'TrFade<300>',
    );
  });

  it('handles empty args array as leaf', () => {
    expect(templateNodeToString(makeNode('Rainbow'))).toBe('Rainbow');
  });
});

// ─── updateNodeAtPath ─

describe('updateNodeAtPath', () => {
  it('updates the root node with empty path', () => {
    const root = makeNode('255');
    const result = updateNodeAtPath(root, [], () => makeNode('128'));
    expect(result.name).toBe('128');
  });

  it('updates a direct child', () => {
    const root = makeNode('Rgb', [makeNode('255'), makeNode('0'), makeNode('128')]);
    const result = updateNodeAtPath(root, [1], () => makeNode('200'));
    expect(templateNodeToString(result)).toBe('Rgb<255,200,128>');
  });

  it('updates a deeply nested child', () => {
    const root = makeNode('Mix', [
      makeNode('Int', [makeNode('16384')]),
      makeNode('Rgb', [makeNode('0'), makeNode('0'), makeNode('255')]),
      makeNode('Red'),
    ]);
    // Change the Blue (255) in Rgb to 128: path = [1, 2]
    const result = updateNodeAtPath(root, [1, 2], () => makeNode('128'));
    expect(templateNodeToString(result)).toBe('Mix<Int<16384>,Rgb<0,0,128>,Red>');
  });

  it('preserves structural sharing — unchanged siblings are same reference', () => {
    const child0 = makeNode('255');
    const child2 = makeNode('128');
    const root = makeNode('Rgb', [child0, makeNode('0'), child2]);

    const result = updateNodeAtPath(root, [1], () => makeNode('200'));
    expect(result.args[0]).toBe(child0); // same reference
    expect(result.args[2]).toBe(child2); // same reference
    expect(result.args[1].name).toBe('200'); // new node
  });

  it('does not mutate the original tree', () => {
    const root = makeNode('Rgb', [makeNode('255'), makeNode('0'), makeNode('128')]);
    const rootCopy = JSON.parse(JSON.stringify(root));
    updateNodeAtPath(root, [1], () => makeNode('200'));
    expect(root).toEqual(rootCopy); // original unchanged
  });

  it('returns root unchanged for out-of-bounds path', () => {
    const root = makeNode('Rgb', [makeNode('255'), makeNode('0'), makeNode('128')]);
    const result = updateNodeAtPath(root, [5], () => makeNode('200'));
    expect(result).toBe(root); // same reference — no-op
  });

  it('returns root unchanged for negative index', () => {
    const root = makeNode('Rgb', [makeNode('255'), makeNode('0'), makeNode('128')]);
    const result = updateNodeAtPath(root, [-1], () => makeNode('200'));
    expect(result).toBe(root);
  });

  it('replaces an entire subtree', () => {
    const root = makeNode('Mix', [
      makeNode('Int', [makeNode('16384')]),
      makeNode('Red'),
      makeNode('Blue'),
    ]);
    // Replace Red with a full Rgb node
    const result = updateNodeAtPath(root, [1], () =>
      makeNode('Rgb', [makeNode('255'), makeNode('128'), makeNode('0')]),
    );
    expect(templateNodeToString(result)).toBe('Mix<Int<16384>,Rgb<255,128,0>,Blue>');
  });

  it('is idempotent — applying same value produces equal result', () => {
    const root = makeNode('Rgb', [makeNode('255'), makeNode('0'), makeNode('128')]);
    const result1 = updateNodeAtPath(root, [1], () => makeNode('200'));
    const result2 = updateNodeAtPath(root, [1], () => makeNode('200'));
    expect(templateNodeToString(result1)).toBe(templateNodeToString(result2));
  });
});

// ─── rgbToHex ─

describe('rgbToHex', () => {
  it('converts pure red', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
  });

  it('converts pure green', () => {
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
  });

  it('converts pure blue', () => {
    expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
  });

  it('converts white', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });

  it('converts black', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });

  it('converts a mixed color', () => {
    expect(rgbToHex(128, 64, 32)).toBe('#804020');
  });

  it('clamps values above 255', () => {
    expect(rgbToHex(300, 0, 0)).toBe('#ff0000');
  });

  it('clamps negative values to 0', () => {
    expect(rgbToHex(-10, 0, 0)).toBe('#000000');
  });

  it('pads single-digit hex values', () => {
    expect(rgbToHex(1, 2, 3)).toBe('#010203');
  });
});

// ─── hexToRgb ─

describe('hexToRgb', () => {
  it('parses a valid hex color', () => {
    expect(hexToRgb('#ff0080')).toEqual({ r: 255, g: 0, b: 128 });
  });

  it('parses black', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('parses white', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('is case-insensitive', () => {
    expect(hexToRgb('#FF0080')).toEqual({ r: 255, g: 0, b: 128 });
  });

  it('returns null for invalid hex', () => {
    expect(hexToRgb('not-a-color')).toBeNull();
  });

  it('returns null for 3-digit hex', () => {
    expect(hexToRgb('#f00')).toBeNull();
  });

  it('returns null for missing #', () => {
    expect(hexToRgb('ff0080')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(hexToRgb('')).toBeNull();
  });

  it('round-trips with rgbToHex', () => {
    const original = { r: 128, g: 64, b: 32 };
    const hex = rgbToHex(original.r, original.g, original.b);
    expect(hexToRgb(hex)).toEqual(original);
  });
});

// ─── Round-trip: parse → edit → serialize ─

describe('parse → edit → serialize round-trip', () => {
  // We simulate the round-trip by manually building the AST
  // (real parseTemplateString is mocked in component tests)

  it('edits an integer and re-serializes', () => {
    const root = makeNode('Mix', [
      makeNode('Int', [makeNode('16384')]),
      makeNode('Red'),
      makeNode('Blue'),
    ]);
    // Change Int's value from 16384 to 8000
    const edited = updateNodeAtPath(root, [0, 0], () => makeNode('8000'));
    expect(templateNodeToString(edited)).toBe('Mix<Int<8000>,Red,Blue>');
  });

  it('edits an Rgb color and re-serializes', () => {
    const root = makeNode('Layers', [
      makeNode('Rgb', [makeNode('255'), makeNode('0'), makeNode('0')]),
      makeNode('AlphaL', [makeNode('White'), makeNode('Int', [makeNode('16384')])]),
    ]);
    // Replace the Rgb node at path [0] with a new color
    const edited = updateNodeAtPath(root, [0], () =>
      makeNode('Rgb', [makeNode('0'), makeNode('128'), makeNode('255')]),
    );
    expect(templateNodeToString(edited)).toBe(
      'Layers<Rgb<0,128,255>,AlphaL<White,Int<16384>>>',
    );
  });

  it('preserves the rest of the tree when editing a leaf', () => {
    const root = makeNode('Scale', [
      makeNode('SwingSpeed', [makeNode('400')]),
      makeNode('Int', [makeNode('0')]),
      makeNode('Int', [makeNode('32768')]),
    ]);
    // Edit the SwingSpeed threshold from 400 to 600
    const edited = updateNodeAtPath(root, [0, 0], () => makeNode('600'));
    expect(templateNodeToString(edited)).toBe(
      'Scale<SwingSpeed<600>,Int<0>,Int<32768>>',
    );
  });
});
