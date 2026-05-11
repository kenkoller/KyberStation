// ─── Template Layer Operations — unit tests ──────────────────────────
//
// Phase 5C: layer manipulation within Layers<> nodes.
// Tests for moveChildAtPath, insertChildAtPath, removeChildAtPath,
// duplicateChildAtPath, and getNodeAtPath.

import { describe, it, expect } from 'vitest';
import {
  templateNodeToString,
  getNodeAtPath,
  moveChildAtPath,
  insertChildAtPath,
  removeChildAtPath,
  duplicateChildAtPath,
} from '../lib/templateSerializer';

// ─── TemplateNode helper ─

interface TemplateNode {
  name: string;
  args: TemplateNode[];
}

function makeNode(name: string, args: TemplateNode[] = []): TemplateNode {
  return { name, args };
}

/** Build a typical Layers<> tree for testing */
function makeLayers3(): TemplateNode {
  return makeNode('Layers', [
    makeNode('Rgb', [makeNode('255'), makeNode('0'), makeNode('0')]),        // [0] red base
    makeNode('AlphaL', [makeNode('White'), makeNode('Int', [makeNode('16384')])]), // [1] alpha layer
    makeNode('BlastL', [makeNode('Blue')]),                                   // [2] blast layer
  ]);
}

// ─── getNodeAtPath ─

describe('getNodeAtPath', () => {
  it('returns root with empty path', () => {
    const root = makeLayers3();
    expect(getNodeAtPath(root, [])).toBe(root);
  });

  it('returns a direct child', () => {
    const root = makeLayers3();
    const child = getNodeAtPath(root, [1]);
    expect(child?.name).toBe('AlphaL');
  });

  it('returns a deeply nested child', () => {
    const root = makeLayers3();
    // path [1, 1, 0] → AlphaL → Int → "16384"
    const leaf = getNodeAtPath(root, [1, 1, 0]);
    expect(leaf?.name).toBe('16384');
  });

  it('returns null for out-of-bounds index', () => {
    const root = makeLayers3();
    expect(getNodeAtPath(root, [5])).toBeNull();
  });

  it('returns null for negative index', () => {
    const root = makeLayers3();
    expect(getNodeAtPath(root, [-1])).toBeNull();
  });

  it('returns null for invalid deep path', () => {
    const root = makeLayers3();
    expect(getNodeAtPath(root, [0, 0, 0, 0, 0])).toBeNull();
  });
});

// ─── moveChildAtPath ─

describe('moveChildAtPath', () => {
  it('moves a child from position 0 to position 2', () => {
    const root = makeLayers3();
    const result = moveChildAtPath(root, [], 0, 2);
    expect(templateNodeToString(result)).toBe(
      'Layers<AlphaL<White,Int<16384>>,BlastL<Blue>,Rgb<255,0,0>>',
    );
  });

  it('moves a child from position 2 to position 0', () => {
    const root = makeLayers3();
    const result = moveChildAtPath(root, [], 2, 0);
    expect(templateNodeToString(result)).toBe(
      'Layers<BlastL<Blue>,Rgb<255,0,0>,AlphaL<White,Int<16384>>>',
    );
  });

  it('moves adjacent children (swap 0 and 1)', () => {
    const root = makeLayers3();
    const result = moveChildAtPath(root, [], 0, 1);
    expect(templateNodeToString(result)).toBe(
      'Layers<AlphaL<White,Int<16384>>,Rgb<255,0,0>,BlastL<Blue>>',
    );
  });

  it('returns root unchanged when from === to', () => {
    const root = makeLayers3();
    const result = moveChildAtPath(root, [], 1, 1);
    expect(result).toBe(root);
  });

  it('returns root unchanged for out-of-bounds from', () => {
    const root = makeLayers3();
    const result = moveChildAtPath(root, [], 5, 0);
    expect(templateNodeToString(result)).toBe(templateNodeToString(root));
  });

  it('returns root unchanged for out-of-bounds to', () => {
    const root = makeLayers3();
    const result = moveChildAtPath(root, [], 0, 5);
    expect(templateNodeToString(result)).toBe(templateNodeToString(root));
  });

  it('returns root unchanged for negative from', () => {
    const root = makeLayers3();
    const result = moveChildAtPath(root, [], -1, 0);
    expect(templateNodeToString(result)).toBe(templateNodeToString(root));
  });

  it('moves within a nested Layers node', () => {
    // Root wraps a nested Layers: InOutTrL<Layers<A,B,C>, ...>
    const nested = makeNode('InOutTrL', [
      makeNode('Layers', [
        makeNode('Red'),
        makeNode('Green'),
        makeNode('Blue'),
      ]),
      makeNode('TrWipe', [makeNode('300')]),
    ]);
    // Move child at [0] (the Layers node's children), from index 2 to 0
    const result = moveChildAtPath(nested, [0], 2, 0);
    expect(templateNodeToString(result)).toBe(
      'InOutTrL<Layers<Blue,Red,Green>,TrWipe<300>>',
    );
  });

  it('does not mutate the original tree', () => {
    const root = makeLayers3();
    const original = templateNodeToString(root);
    moveChildAtPath(root, [], 0, 2);
    expect(templateNodeToString(root)).toBe(original);
  });
});

// ─── insertChildAtPath ─

describe('insertChildAtPath', () => {
  it('inserts at the beginning (position 0)', () => {
    const root = makeLayers3();
    const newChild = makeNode('Green');
    const result = insertChildAtPath(root, [], 0, newChild);
    expect(result.args.length).toBe(4);
    expect(result.args[0].name).toBe('Green');
    expect(result.args[1].name).toBe('Rgb');
  });

  it('inserts at the end', () => {
    const root = makeLayers3();
    const newChild = makeNode('SimpleClashL', [makeNode('White')]);
    const result = insertChildAtPath(root, [], 3, newChild);
    expect(result.args.length).toBe(4);
    expect(result.args[3].name).toBe('SimpleClashL');
  });

  it('inserts in the middle', () => {
    const root = makeLayers3();
    const newChild = makeNode('LockupTrL', [makeNode('White')]);
    const result = insertChildAtPath(root, [], 1, newChild);
    expect(result.args.length).toBe(4);
    expect(result.args[1].name).toBe('LockupTrL');
    expect(result.args[2].name).toBe('AlphaL'); // shifted right
  });

  it('clamps negative insertAt to 0', () => {
    const root = makeLayers3();
    const newChild = makeNode('Yellow');
    const result = insertChildAtPath(root, [], -5, newChild);
    expect(result.args[0].name).toBe('Yellow');
  });

  it('clamps insertAt beyond length to end', () => {
    const root = makeLayers3();
    const newChild = makeNode('Cyan');
    const result = insertChildAtPath(root, [], 100, newChild);
    expect(result.args[result.args.length - 1].name).toBe('Cyan');
  });

  it('inserts into a nested Layers node', () => {
    const nested = makeNode('InOutTrL', [
      makeNode('Layers', [makeNode('Red'), makeNode('Blue')]),
      makeNode('TrFade', [makeNode('300')]),
    ]);
    const newChild = makeNode('AlphaL', [makeNode('White'), makeNode('Int', [makeNode('0')])]);
    const result = insertChildAtPath(nested, [0], 1, newChild);
    const inner = getNodeAtPath(result, [0]);
    expect(inner?.args.length).toBe(3);
    expect(inner?.args[1].name).toBe('AlphaL');
  });

  it('does not mutate the original tree', () => {
    const root = makeLayers3();
    const original = templateNodeToString(root);
    insertChildAtPath(root, [], 0, makeNode('Green'));
    expect(templateNodeToString(root)).toBe(original);
  });

  it('produces correct serialized output', () => {
    const root = makeNode('Layers', [makeNode('Red'), makeNode('Blue')]);
    const result = insertChildAtPath(root, [], 1, makeNode('Green'));
    expect(templateNodeToString(result)).toBe('Layers<Red,Green,Blue>');
  });
});

// ─── removeChildAtPath ─

describe('removeChildAtPath', () => {
  it('removes a child by index', () => {
    const root = makeLayers3();
    const result = removeChildAtPath(root, [], 1);
    expect(result.args.length).toBe(2);
    expect(result.args[0].name).toBe('Rgb');
    expect(result.args[1].name).toBe('BlastL');
  });

  it('removes the first child', () => {
    const root = makeLayers3();
    const result = removeChildAtPath(root, [], 0);
    expect(result.args.length).toBe(2);
    expect(result.args[0].name).toBe('AlphaL');
  });

  it('removes the last child', () => {
    const root = makeLayers3();
    const result = removeChildAtPath(root, [], 2);
    expect(result.args.length).toBe(2);
    expect(result.args[1].name).toBe('AlphaL');
  });

  it('does NOT remove the last child of a Layers node (must keep at least 1)', () => {
    const root = makeNode('Layers', [makeNode('Red')]);
    const result = removeChildAtPath(root, [], 0);
    // Should return unchanged — Layers must have at least 1 child
    expect(result.args.length).toBe(1);
    expect(result.args[0].name).toBe('Red');
  });

  it('returns root unchanged for out-of-bounds index', () => {
    const root = makeLayers3();
    const result = removeChildAtPath(root, [], 5);
    expect(templateNodeToString(result)).toBe(templateNodeToString(root));
  });

  it('returns root unchanged for negative index', () => {
    const root = makeLayers3();
    const result = removeChildAtPath(root, [], -1);
    expect(templateNodeToString(result)).toBe(templateNodeToString(root));
  });

  it('removes from a nested parent', () => {
    const nested = makeNode('InOutTrL', [
      makeNode('Layers', [makeNode('Red'), makeNode('Green'), makeNode('Blue')]),
      makeNode('TrFade', [makeNode('300')]),
    ]);
    const result = removeChildAtPath(nested, [0], 1);
    const inner = getNodeAtPath(result, [0]);
    expect(inner?.args.length).toBe(2);
    expect(inner?.args[0].name).toBe('Red');
    expect(inner?.args[1].name).toBe('Blue');
  });

  it('allows removal from non-Layers parents down to zero children', () => {
    // Non-Layers parents don't have the "must keep at least 1" constraint
    const root = makeNode('Mix', [makeNode('Red')]);
    const result = removeChildAtPath(root, [], 0);
    expect(result.args.length).toBe(0);
  });

  it('does not mutate the original tree', () => {
    const root = makeLayers3();
    const original = templateNodeToString(root);
    removeChildAtPath(root, [], 1);
    expect(templateNodeToString(root)).toBe(original);
  });

  it('produces correct serialized output', () => {
    const root = makeLayers3();
    const result = removeChildAtPath(root, [], 1);
    expect(templateNodeToString(result)).toBe(
      'Layers<Rgb<255,0,0>,BlastL<Blue>>',
    );
  });
});

// ─── duplicateChildAtPath ─

describe('duplicateChildAtPath', () => {
  it('duplicates a child, inserting copy after original', () => {
    const root = makeLayers3();
    const result = duplicateChildAtPath(root, [], 0);
    expect(result.args.length).toBe(4);
    expect(templateNodeToString(result.args[0])).toBe('Rgb<255,0,0>');
    expect(templateNodeToString(result.args[1])).toBe('Rgb<255,0,0>');
  });

  it('duplicates the last child', () => {
    const root = makeLayers3();
    const result = duplicateChildAtPath(root, [], 2);
    expect(result.args.length).toBe(4);
    expect(result.args[3].name).toBe('BlastL');
  });

  it('deep-clones the duplicated child (no shared references)', () => {
    const root = makeLayers3();
    const result = duplicateChildAtPath(root, [], 1);
    // Modify the clone
    result.args[2].name = 'MODIFIED';
    // Original at [1] should be unchanged
    expect(result.args[1].name).toBe('AlphaL');
  });

  it('returns root unchanged for out-of-bounds index', () => {
    const root = makeLayers3();
    const result = duplicateChildAtPath(root, [], 5);
    expect(templateNodeToString(result)).toBe(templateNodeToString(root));
  });

  it('returns root unchanged for negative index', () => {
    const root = makeLayers3();
    const result = duplicateChildAtPath(root, [], -1);
    expect(templateNodeToString(result)).toBe(templateNodeToString(root));
  });

  it('duplicates within a nested parent', () => {
    const nested = makeNode('InOutTrL', [
      makeNode('Layers', [makeNode('Red'), makeNode('Blue')]),
      makeNode('TrFade', [makeNode('300')]),
    ]);
    const result = duplicateChildAtPath(nested, [0], 0);
    const inner = getNodeAtPath(result, [0]);
    expect(inner?.args.length).toBe(3);
    expect(inner?.args[0].name).toBe('Red');
    expect(inner?.args[1].name).toBe('Red');
    expect(inner?.args[2].name).toBe('Blue');
  });

  it('does not mutate the original tree', () => {
    const root = makeLayers3();
    const original = templateNodeToString(root);
    duplicateChildAtPath(root, [], 1);
    expect(templateNodeToString(root)).toBe(original);
  });

  it('produces correct serialized output', () => {
    const root = makeNode('Layers', [makeNode('Red'), makeNode('Blue')]);
    const result = duplicateChildAtPath(root, [], 0);
    expect(templateNodeToString(result)).toBe('Layers<Red,Red,Blue>');
  });
});

// ─── Integration: compound operations ─

describe('compound layer operations', () => {
  it('move + remove: reorder then delete', () => {
    const root = makeLayers3();
    // Move BlastL to position 0, then remove the old position-1 (now AlphaL)
    let result = moveChildAtPath(root, [], 2, 0);
    result = removeChildAtPath(result, [], 2);
    expect(templateNodeToString(result)).toBe(
      'Layers<BlastL<Blue>,Rgb<255,0,0>>',
    );
  });

  it('insert + duplicate: add layer then duplicate it', () => {
    const root = makeNode('Layers', [makeNode('Red')]);
    const newLayer = makeNode('AlphaL', [makeNode('White'), makeNode('Int', [makeNode('0')])]);
    let result = insertChildAtPath(root, [], 1, newLayer);
    result = duplicateChildAtPath(result, [], 1);
    expect(result.args.length).toBe(3);
    expect(templateNodeToString(result)).toBe(
      'Layers<Red,AlphaL<White,Int<0>>,AlphaL<White,Int<0>>>',
    );
  });

  it('full editing workflow: insert, move, edit, serialize', () => {
    const root = makeNode('Layers', [
      makeNode('AudioFlicker', [makeNode('Red'), makeNode('Blue')]),
    ]);
    // Insert a new AlphaL layer
    let result = insertChildAtPath(root, [], 1, makeNode('AlphaL', [
      makeNode('White'),
      makeNode('Int', [makeNode('0')]),
    ]));
    // Duplicate the base layer
    result = duplicateChildAtPath(result, [], 0);
    // Move the duplicate to the end
    result = moveChildAtPath(result, [], 1, 2);
    expect(templateNodeToString(result)).toBe(
      'Layers<AudioFlicker<Red,Blue>,AlphaL<White,Int<0>>,AudioFlicker<Red,Blue>>',
    );
  });
});
