// ─── Template Transformations — unit tests ─────────────────────────
//
// Phase 6: AST-to-AST transformation tests for ProffieOS template editing.
// Tests for expandTemplate, layerizeTemplate, argifyTemplate, rotateTemplate,
// and their corresponding isXxx predicate functions.

import { describe, it, expect } from 'vitest';
import {
  expandTemplate,
  isExpandable,
  layerizeTemplate,
  isLayerizable,
  argifyTemplate,
  isArgifiable,
  rotateTemplate,
  isRotatable,
  getApplicableTransformations,
} from '../lib/templateTransformations';

// ─── TemplateNode helper ─

interface TemplateNode {
  name: string;
  args: TemplateNode[];
}

function n(name: string, ...args: TemplateNode[]): TemplateNode {
  return { name, args };
}

// ─── 1. Expand ─

describe('expandTemplate', () => {
  it('expands StyleNormalPtr with all 4 args', () => {
    const root = n('StyleNormalPtr',
      n('Red'), n('White'), n('300'), n('500'),
    );
    const result = expandTemplate(root);
    expect(result.name).toBe('InOutTrL');
    expect(result.args[0].name).toBe('Layers');
    expect(result.args[0].args[0].name).toBe('Red');
    expect(result.args[0].args[1].name).toBe('SimpleClashL');
    expect(result.args[0].args[1].args[0].name).toBe('White');
    expect(result.args[1].name).toBe('TrWipe');
    expect(result.args[1].args[0].name).toBe('300');
    expect(result.args[2].name).toBe('TrWipeIn');
    expect(result.args[2].args[0].name).toBe('500');
  });

  it('expands StyleNormalPtr with defaults when args are missing', () => {
    const root = n('StyleNormalPtr', n('Blue'));
    const result = expandTemplate(root);
    expect(result.name).toBe('InOutTrL');
    expect(result.args[0].args[0].name).toBe('Blue');
    // Default clash = White
    expect(result.args[0].args[1].args[0].name).toBe('White');
    // Default ignition = 300
    expect(result.args[1].args[0].name).toBe('300');
    // Default retraction = 500
    expect(result.args[2].args[0].name).toBe('500');
  });

  it('expands StylePtr single-arg', () => {
    const root = n('StylePtr', n('AudioFlicker', n('Red'), n('Blue')));
    const result = expandTemplate(root);
    expect(result.name).toBe('InOutTrL');
    expect(result.args[0].name).toBe('Layers');
    expect(result.args[0].args[0].name).toBe('AudioFlicker');
    expect(result.args[1].name).toBe('TrWipe');
    expect(result.args[1].args[0].name).toBe('300');
    expect(result.args[2].name).toBe('TrWipeIn');
    expect(result.args[2].args[0].name).toBe('500');
  });

  it('returns StylePtr unchanged when no args', () => {
    const root = n('StylePtr');
    const result = expandTemplate(root);
    expect(result.name).toBe('StylePtr');
    expect(result.args.length).toBe(0);
  });

  it('expands StyleFirePtr with defaults', () => {
    const root = n('StyleFirePtr', n('Blue'));
    const result = expandTemplate(root);
    expect(result.name).toBe('InOutTrL');
    expect(result.args[0].args[0].name).toBe('StyleFire');
    expect(result.args[0].args[0].args[0].name).toBe('Blue');
    // Default C2 = Red
    expect(result.args[0].args[0].args[1].name).toBe('Red');
  });

  it('expands StyleFirePtr with explicit args', () => {
    const root = n('StyleFirePtr', n('Green'), n('Yellow'), n('200'), n('400'));
    const result = expandTemplate(root);
    expect(result.args[0].args[0].args[0].name).toBe('Green');
    expect(result.args[0].args[0].args[1].name).toBe('Yellow');
    expect(result.args[1].args[0].name).toBe('200');
    expect(result.args[2].args[0].name).toBe('400');
  });

  it('expands StyleRainbowPtr with defaults', () => {
    const root = n('StyleRainbowPtr');
    const result = expandTemplate(root);
    expect(result.name).toBe('InOutTrL');
    expect(result.args[0].args[0].name).toBe('Rainbow');
    expect(result.args[1].args[0].name).toBe('300');
    expect(result.args[2].args[0].name).toBe('500');
  });

  it('expands StyleRainbowPtr with explicit timing', () => {
    const root = n('StyleRainbowPtr', n('150'), n('250'));
    const result = expandTemplate(root);
    expect(result.args[1].args[0].name).toBe('150');
    expect(result.args[2].args[0].name).toBe('250');
  });

  it('expands StyleStrobePtr with all args', () => {
    const root = n('StyleStrobePtr', n('Red'), n('Blue'), n('200'), n('400'));
    const result = expandTemplate(root);
    expect(result.name).toBe('InOutTrL');
    expect(result.args[0].name).toBe('Layers');
    // Strobe<Red, White, 15, 1>
    const strobe = result.args[0].args[0];
    expect(strobe.name).toBe('Strobe');
    expect(strobe.args[0].name).toBe('Red');
    expect(strobe.args[1].name).toBe('White');
    expect(strobe.args[2].name).toBe('15');
    expect(strobe.args[3].name).toBe('1');
    // SimpleClashL<Blue>
    expect(result.args[0].args[1].name).toBe('SimpleClashL');
    expect(result.args[0].args[1].args[0].name).toBe('Blue');
    expect(result.args[1].args[0].name).toBe('200');
    expect(result.args[2].args[0].name).toBe('400');
  });

  it('returns non-shorthand nodes unchanged', () => {
    const root = n('Layers', n('Red'), n('BlastL', n('White')));
    const result = expandTemplate(root);
    expect(result.name).toBe('Layers');
    expect(result.args.length).toBe(2);
  });

  it('recursively expands nested shorthands', () => {
    // Layers<StyleNormalPtr<Red, White, 300, 500>>
    const root = n('Layers', n('StyleNormalPtr', n('Red'), n('White'), n('300'), n('500')));
    const result = expandTemplate(root);
    expect(result.name).toBe('Layers');
    expect(result.args[0].name).toBe('InOutTrL');
  });

  it('does not mutate the original tree', () => {
    const root = n('StyleNormalPtr', n('Red'), n('White'), n('300'), n('500'));
    const originalName = root.name;
    expandTemplate(root);
    expect(root.name).toBe(originalName);
    expect(root.args.length).toBe(4);
  });
});

describe('isExpandable', () => {
  it('returns true for StyleNormalPtr', () => {
    expect(isExpandable(n('StyleNormalPtr', n('Red')))).toBe(true);
  });

  it('returns true for StylePtr', () => {
    expect(isExpandable(n('StylePtr', n('Red')))).toBe(true);
  });

  it('returns true for StyleFirePtr', () => {
    expect(isExpandable(n('StyleFirePtr', n('Red')))).toBe(true);
  });

  it('returns true for StyleRainbowPtr', () => {
    expect(isExpandable(n('StyleRainbowPtr'))).toBe(true);
  });

  it('returns true for StyleStrobePtr', () => {
    expect(isExpandable(n('StyleStrobePtr', n('Red')))).toBe(true);
  });

  it('returns false for already-expanded Layers', () => {
    expect(isExpandable(n('Layers', n('Red')))).toBe(false);
  });

  it('returns true when child is expandable', () => {
    const root = n('InOutTrL', n('StylePtr', n('Red')));
    expect(isExpandable(root)).toBe(true);
  });

  it('returns false for leaf nodes', () => {
    expect(isExpandable(n('Red'))).toBe(false);
  });
});

// ─── 2. Layerize ─

describe('layerizeTemplate', () => {
  it('returns Layers node unchanged', () => {
    const root = n('Layers', n('Red'), n('BlastL', n('White')));
    const result = layerizeTemplate(root);
    expect(result).toBe(root);
  });

  it('returns InOutTrL with Layers first arg unchanged', () => {
    const root = n('InOutTrL',
      n('Layers', n('Red')),
      n('TrWipe', n('300')),
      n('TrWipeIn', n('500')),
    );
    const result = layerizeTemplate(root);
    expect(result).toBe(root);
  });

  it('wraps InOutTrL with non-Layers first arg', () => {
    const root = n('InOutTrL',
      n('AudioFlicker', n('Red'), n('Blue')),
      n('TrWipe', n('300')),
      n('TrWipeIn', n('500')),
    );
    const result = layerizeTemplate(root);
    expect(result.name).toBe('InOutTrL');
    expect(result.args[0].name).toBe('Layers');
    expect(result.args[0].args[0].name).toBe('AudioFlicker');
    // Transition args preserved
    expect(result.args[1].name).toBe('TrWipe');
    expect(result.args[2].name).toBe('TrWipeIn');
  });

  it('wraps a plain style in Layers', () => {
    const root = n('AudioFlicker', n('Red'), n('Blue'));
    const result = layerizeTemplate(root);
    expect(result.name).toBe('Layers');
    expect(result.args.length).toBe(1);
    expect(result.args[0].name).toBe('AudioFlicker');
  });

  it('wraps a simple color in Layers', () => {
    const root = n('Red');
    const result = layerizeTemplate(root);
    expect(result.name).toBe('Layers');
    expect(result.args[0].name).toBe('Red');
  });

  it('does not mutate the original tree', () => {
    const root = n('AudioFlicker', n('Red'), n('Blue'));
    layerizeTemplate(root);
    expect(root.name).toBe('AudioFlicker');
  });
});

describe('isLayerizable', () => {
  it('returns false for Layers root', () => {
    expect(isLayerizable(n('Layers', n('Red')))).toBe(false);
  });

  it('returns false for InOutTrL with Layers first arg', () => {
    const root = n('InOutTrL', n('Layers', n('Red')), n('TrWipe', n('300')));
    expect(isLayerizable(root)).toBe(false);
  });

  it('returns true for plain style', () => {
    expect(isLayerizable(n('AudioFlicker', n('Red'), n('Blue')))).toBe(true);
  });

  it('returns true for InOutTrL with non-Layers first arg', () => {
    const root = n('InOutTrL', n('Red'), n('TrWipe', n('300')));
    expect(isLayerizable(root)).toBe(true);
  });

  it('returns true for bare color', () => {
    expect(isLayerizable(n('Red'))).toBe(true);
  });
});

// ─── 3. Argify ─

describe('argifyTemplate', () => {
  it('wraps bare integers in IntArg', () => {
    const root = n('TrWipe', n('300'));
    const { result, nextArgNum } = argifyTemplate(root);
    expect(result.args[0].name).toBe('IntArg');
    expect(result.args[0].args[0].name).toBe('1');
    expect(result.args[0].args[1].name).toBe('300');
    expect(nextArgNum).toBe(2);
  });

  it('wraps named colors in RgbArg', () => {
    const root = n('Layers', n('Red'));
    const { result, nextArgNum } = argifyTemplate(root);
    expect(result.args[0].name).toBe('RgbArg');
    expect(result.args[0].args[0].name).toBe('1');
    expect(result.args[0].args[1].name).toBe('Red');
    expect(nextArgNum).toBe(2);
  });

  it('wraps Rgb<r,g,b> in RgbArg', () => {
    const root = n('Layers', n('Rgb', n('255'), n('0'), n('128')));
    const { result, nextArgNum } = argifyTemplate(root);
    expect(result.args[0].name).toBe('RgbArg');
    expect(result.args[0].args[0].name).toBe('1');
    expect(result.args[0].args[1].name).toBe('Rgb');
    expect(result.args[0].args[1].args[0].name).toBe('255');
    expect(nextArgNum).toBe(2);
  });

  it('wraps Rgb16 in RgbArg', () => {
    const root = n('Layers', n('Rgb16', n('65535'), n('0'), n('32768')));
    const { result } = argifyTemplate(root);
    expect(result.args[0].name).toBe('RgbArg');
    expect(result.args[0].args[1].name).toBe('Rgb16');
  });

  it('numbers args sequentially', () => {
    const outerRoot = n('InOutTrL',
      n('Layers', n('Red')),
      n('TrWipe', n('300')),
      n('TrWipeIn', n('500')),
    );
    const { result, nextArgNum } = argifyTemplate(outerRoot);
    // Red → RgbArg<1, Red>
    expect(result.args[0].args[0].name).toBe('RgbArg');
    expect(result.args[0].args[0].args[0].name).toBe('1');
    // 300 → IntArg<2, 300>
    expect(result.args[1].args[0].name).toBe('IntArg');
    expect(result.args[1].args[0].args[0].name).toBe('2');
    // 500 → IntArg<3, 500>
    expect(result.args[2].args[0].name).toBe('IntArg');
    expect(result.args[2].args[0].args[0].name).toBe('3');
    expect(nextArgNum).toBe(4);
  });

  it('respects startArgNum', () => {
    const root = n('TrWipe', n('300'));
    const { result, nextArgNum } = argifyTemplate(root, 5);
    expect(result.args[0].args[0].name).toBe('5');
    expect(nextArgNum).toBe(6);
  });

  it('skips already-wrapped IntArg', () => {
    const root = n('TrWipe', n('IntArg', n('1'), n('300')));
    const { result, nextArgNum } = argifyTemplate(root);
    expect(result.args[0].name).toBe('IntArg');
    expect(result.args[0].args[0].name).toBe('1');
    expect(nextArgNum).toBe(1); // No new args assigned
  });

  it('skips already-wrapped RgbArg', () => {
    const root = n('Layers', n('RgbArg', n('1'), n('Red')));
    const { result, nextArgNum } = argifyTemplate(root);
    expect(result.args[0].name).toBe('RgbArg');
    expect(result.args[0].args[0].name).toBe('1');
    expect(nextArgNum).toBe(1);
  });

  it('handles negative integers', () => {
    const root = n('Scale', n('-100'));
    const { result } = argifyTemplate(root);
    expect(result.args[0].name).toBe('IntArg');
    expect(result.args[0].args[1].name).toBe('-100');
  });

  it('does not wrap non-integer non-color template names', () => {
    const root = n('Scale', n('SwingSpeed', n('400')));
    const { result } = argifyTemplate(root);
    expect(result.name).toBe('Scale');
    expect(result.args[0].name).toBe('SwingSpeed');
    // Inner 400 should be wrapped
    expect(result.args[0].args[0].name).toBe('IntArg');
    expect(result.args[0].args[0].args[1].name).toBe('400');
  });

  it('does not mutate original tree', () => {
    const root = n('TrWipe', n('300'));
    argifyTemplate(root);
    expect(root.args[0].name).toBe('300');
  });

  it('handles complex nested tree', () => {
    const root = n('InOutTrL',
      n('Layers',
        n('AudioFlicker', n('Red'), n('Rgb', n('128'), n('0'), n('255'))),
        n('SimpleClashL', n('White')),
      ),
      n('TrWipe', n('300')),
      n('TrWipeIn', n('500')),
    );
    const { result, nextArgNum } = argifyTemplate(root);
    // Red → RgbArg<1, Red>
    expect(result.args[0].args[0].args[0].name).toBe('RgbArg');
    expect(result.args[0].args[0].args[0].args[0].name).toBe('1');
    // Rgb<128,0,255> → RgbArg<2, Rgb<128,0,255>>
    expect(result.args[0].args[0].args[1].name).toBe('RgbArg');
    expect(result.args[0].args[0].args[1].args[0].name).toBe('2');
    // White → RgbArg<3, White>
    expect(result.args[0].args[1].args[0].name).toBe('RgbArg');
    expect(result.args[0].args[1].args[0].args[0].name).toBe('3');
    // 300 → IntArg<4, 300>
    expect(result.args[1].args[0].name).toBe('IntArg');
    expect(result.args[1].args[0].args[0].name).toBe('4');
    // 500 → IntArg<5, 500>
    expect(result.args[2].args[0].name).toBe('IntArg');
    expect(result.args[2].args[0].args[0].name).toBe('5');
    expect(nextArgNum).toBe(6);
  });
});

describe('isArgifiable', () => {
  it('returns true for bare integer', () => {
    expect(isArgifiable(n('300'))).toBe(true);
  });

  it('returns true for named color', () => {
    expect(isArgifiable(n('Red'))).toBe(true);
  });

  it('returns true for Rgb node', () => {
    expect(isArgifiable(n('Rgb', n('255'), n('0'), n('128')))).toBe(true);
  });

  it('returns false for IntArg', () => {
    expect(isArgifiable(n('IntArg', n('1'), n('300')))).toBe(false);
  });

  it('returns false for RgbArg', () => {
    expect(isArgifiable(n('RgbArg', n('1'), n('Red')))).toBe(false);
  });

  it('returns true when child is argifiable', () => {
    expect(isArgifiable(n('TrWipe', n('300')))).toBe(true);
  });

  it('returns false when fully argified', () => {
    const root = n('TrWipe', n('IntArg', n('1'), n('300')));
    expect(isArgifiable(root)).toBe(false);
  });

  it('returns true for template name that is not a color', () => {
    // 'Layers' is not a color and has no args to wrap
    expect(isArgifiable(n('Layers', n('Red')))).toBe(true);
  });
});

// ─── 4. Rotate ─

describe('rotateTemplate', () => {
  it('rotates ColorChange colors forward', () => {
    const root = n('ColorChange',
      n('TrInstant'),
      n('Red'), n('Green'), n('Blue'),
    );
    const result = rotateTemplate(root, 1);
    expect(result.args[0].name).toBe('TrInstant');
    expect(result.args[1].name).toBe('Green');
    expect(result.args[2].name).toBe('Blue');
    expect(result.args[3].name).toBe('Red');
  });

  it('rotates ColorChange colors backward', () => {
    const root = n('ColorChange',
      n('TrInstant'),
      n('Red'), n('Green'), n('Blue'),
    );
    const result = rotateTemplate(root, -1);
    expect(result.args[0].name).toBe('TrInstant');
    expect(result.args[1].name).toBe('Blue');
    expect(result.args[2].name).toBe('Red');
    expect(result.args[3].name).toBe('Green');
  });

  it('rotates ColorChangeLX the same way', () => {
    const root = n('ColorChangeLX',
      n('TrFade', n('300')),
      n('Cyan'), n('Magenta'), n('Yellow'),
    );
    const result = rotateTemplate(root, 1);
    expect(result.args[1].name).toBe('Magenta');
    expect(result.args[2].name).toBe('Yellow');
    expect(result.args[3].name).toBe('Cyan');
  });

  it('returns unchanged when fewer than 2 colors', () => {
    const root = n('ColorChange', n('TrInstant'), n('Red'));
    const result = rotateTemplate(root, 1);
    expect(result.args[1].name).toBe('Red');
  });

  it('returns unchanged when fewer than 3 args', () => {
    const root = n('ColorChange', n('TrInstant'));
    const result = rotateTemplate(root, 1);
    expect(result).toBe(root);
  });

  it('handles 2-color rotation', () => {
    const root = n('ColorChange', n('TrInstant'), n('Red'), n('Blue'));
    const forward = rotateTemplate(root, 1);
    expect(forward.args[1].name).toBe('Blue');
    expect(forward.args[2].name).toBe('Red');
    const backward = rotateTemplate(root, -1);
    expect(backward.args[1].name).toBe('Blue');
    expect(backward.args[2].name).toBe('Red');
  });

  it('finds ColorChange in children recursively', () => {
    const root = n('InOutTrL',
      n('Layers',
        n('ColorChange', n('TrInstant'), n('Red'), n('Green'), n('Blue')),
      ),
      n('TrWipe', n('300')),
    );
    const result = rotateTemplate(root, 1);
    const cc = result.args[0].args[0];
    expect(cc.args[1].name).toBe('Green');
    expect(cc.args[2].name).toBe('Blue');
    expect(cc.args[3].name).toBe('Red');
  });

  it('returns unchanged when no ColorChange present', () => {
    const root = n('Layers', n('Red'), n('BlastL', n('White')));
    const result = rotateTemplate(root, 1);
    expect(result.args[0].name).toBe('Red');
    expect(result.args[1].name).toBe('BlastL');
  });

  it('does not mutate the original tree', () => {
    const root = n('ColorChange', n('TrInstant'), n('Red'), n('Green'), n('Blue'));
    rotateTemplate(root, 1);
    expect(root.args[1].name).toBe('Red');
    expect(root.args[2].name).toBe('Green');
    expect(root.args[3].name).toBe('Blue');
  });

  it('rotates only the first ColorChange found', () => {
    const root = n('Layers',
      n('ColorChange', n('TrInstant'), n('Red'), n('Green')),
      n('ColorChange', n('TrInstant'), n('Cyan'), n('Magenta')),
    );
    const result = rotateTemplate(root, 1);
    // First one rotated
    expect(result.args[0].args[1].name).toBe('Green');
    expect(result.args[0].args[2].name).toBe('Red');
    // Second unchanged
    expect(result.args[1].args[1].name).toBe('Cyan');
    expect(result.args[1].args[2].name).toBe('Magenta');
  });

  it('full rotation cycle returns to original', () => {
    const root = n('ColorChange', n('TrInstant'), n('Red'), n('Green'), n('Blue'));
    let result = root;
    result = rotateTemplate(result, 1);
    result = rotateTemplate(result, 1);
    result = rotateTemplate(result, 1);
    expect(result.args[1].name).toBe('Red');
    expect(result.args[2].name).toBe('Green');
    expect(result.args[3].name).toBe('Blue');
  });
});

describe('isRotatable', () => {
  it('returns true for ColorChange with 3+ args', () => {
    const root = n('ColorChange', n('TrInstant'), n('Red'), n('Blue'));
    expect(isRotatable(root)).toBe(true);
  });

  it('returns true for ColorChangeLX with 3+ args', () => {
    const root = n('ColorChangeLX', n('TrFade', n('300')), n('Red'), n('Blue'));
    expect(isRotatable(root)).toBe(true);
  });

  it('returns false for ColorChange with < 3 args', () => {
    expect(isRotatable(n('ColorChange', n('TrInstant')))).toBe(false);
  });

  it('returns true when child contains ColorChange', () => {
    const root = n('Layers', n('ColorChange', n('TrInstant'), n('Red'), n('Blue')));
    expect(isRotatable(root)).toBe(true);
  });

  it('returns false when no ColorChange', () => {
    expect(isRotatable(n('Layers', n('Red')))).toBe(false);
  });
});

// ─── 5. getApplicableTransformations ─

describe('getApplicableTransformations', () => {
  it('detects all applicable for StyleNormalPtr with ColorChange', () => {
    const root = n('StyleNormalPtr',
      n('ColorChange', n('TrInstant'), n('Red'), n('Blue')),
      n('White'), n('300'), n('500'),
    );
    const t = getApplicableTransformations(root);
    expect(t.expand).toBe(true);
    expect(t.layerize).toBe(true);
    expect(t.argify).toBe(true);
    expect(t.rotate).toBe(true);
  });

  it('nothing applicable for fully-processed Layers', () => {
    const root = n('Layers',
      n('RgbArg', n('1'), n('Red')),
    );
    const t = getApplicableTransformations(root);
    expect(t.expand).toBe(false);
    expect(t.layerize).toBe(false);
    expect(t.argify).toBe(false);
    expect(t.rotate).toBe(false);
  });

  it('only argify for simple Layers with bare values', () => {
    const root = n('Layers',
      n('AudioFlicker', n('Red'), n('Blue')),
      n('SimpleClashL', n('White')),
    );
    const t = getApplicableTransformations(root);
    expect(t.expand).toBe(false);
    expect(t.layerize).toBe(false);
    expect(t.argify).toBe(true);
    expect(t.rotate).toBe(false);
  });
});

// ─── 6. Integration: compound transformations ─

describe('compound transformations', () => {
  it('expand → layerize pipeline', () => {
    // StylePtr<Red> should already produce Layers after expand
    const root = n('StylePtr', n('Red'));
    const expanded = expandTemplate(root);
    expect(expanded.name).toBe('InOutTrL');
    expect(expanded.args[0].name).toBe('Layers');
    // Already layerized by expand, so layerize is a no-op
    const layerized = layerizeTemplate(expanded);
    expect(layerized).toBe(expanded);
  });

  it('expand → argify pipeline', () => {
    const root = n('StyleNormalPtr', n('Red'), n('White'), n('300'), n('500'));
    const expanded = expandTemplate(root);
    const { result } = argifyTemplate(expanded);
    // Red → RgbArg<1,Red>
    expect(result.args[0].args[0].name).toBe('RgbArg');
    // White in SimpleClashL → RgbArg<2,White>
    expect(result.args[0].args[1].args[0].name).toBe('RgbArg');
    // 300 in TrWipe → IntArg<3,300>
    expect(result.args[1].args[0].name).toBe('IntArg');
    // 500 in TrWipeIn → IntArg<4,500>
    expect(result.args[2].args[0].name).toBe('IntArg');
  });

  it('layerize → argify pipeline', () => {
    const root = n('AudioFlicker', n('Red'), n('Rgb', n('0'), n('0'), n('255')));
    const layerized = layerizeTemplate(root);
    const { result, nextArgNum } = argifyTemplate(layerized);
    expect(result.name).toBe('Layers');
    expect(result.args[0].args[0].name).toBe('RgbArg'); // Red
    expect(result.args[0].args[1].name).toBe('RgbArg'); // Rgb<0,0,255>
    expect(nextArgNum).toBe(3);
  });

  it('full pipeline: expand → layerize → argify', () => {
    const root = n('StyleFirePtr', n('Blue'), n('Red'));
    let result = expandTemplate(root);
    result = layerizeTemplate(result);
    const { result: argified, nextArgNum } = argifyTemplate(result);
    // Should be InOutTrL<Layers<...>, ...> with all values wrapped
    expect(argified.name).toBe('InOutTrL');
    expect(argified.args[0].name).toBe('Layers');
    // All colors and integers should be wrapped
    expect(nextArgNum).toBeGreaterThan(1);
  });
});
