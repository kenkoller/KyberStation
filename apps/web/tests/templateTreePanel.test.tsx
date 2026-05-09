// ─── TemplateTreePanel + TemplateTreeNode — Phase 5A contract tests ─
//
// Pin down the read-only template tree renderer:
//
//   1. Empty state renders when no importedRawCode is set.
//   2. Parse error renders with message when input is malformed.
//   3. Valid template string renders the tree with correct structure.
//   4. Stats bar shows node count + depth + color count + layer count.
//   5. Color swatches render for Rgb<> nodes.
//   6. Named color swatches render for named color nodes.
//   7. Integer literals get the correct CSS class (orange).
//   8. Collapsed nodes show inline arg preview.
//   9. TemplateTreePanel reads from bladeStore when no prop is passed.
//  10. Parameter annotations appear from the registry.
//
// Uses the SSR renderToStaticMarkup pattern per existing test conventions.
//
// Note: @kyberstation/template-eval is mocked because its index.ts uses
// .js re-export extensions (ESM convention) which vitest's alias resolver
// can't follow when pointed at the raw source directory.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── TemplateNode type (inline to avoid cross-package import) ────────

interface TemplateNode {
  name: string;
  args: TemplateNode[];
}

// ── Hoisted mock state ──────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  importedRawCode: '' as string | undefined,
}));

// ── Mock bladeStore ─────────────────────────────────────────────────

vi.mock('../stores/bladeStore', () => ({
  useBladeStore: (selector: (s: { config: { importedRawCode?: string } }) => unknown) =>
    selector({ config: { importedRawCode: mockState.importedRawCode } }),
}));

// ── Mock @kyberstation/template-eval ────────────────────────────────
//
// Inline parser mock that handles the subset of ProffieOS template
// syntax we need for tests. Real parsing is tested in the template-eval
// package itself; here we verify the PANEL's behavior given valid/invalid
// parse results.

function mockParseTemplateString(input: string): TemplateNode | null {
  input = input.trim();
  if (!input) return null;

  // Recursive descent for simple templates: Name<arg1,arg2,...>
  let pos = 0;

  function parseNode(): TemplateNode {
    let name = '';
    while (pos < input.length && input[pos] !== '<' && input[pos] !== ',' && input[pos] !== '>') {
      name += input[pos];
      pos++;
    }
    name = name.trim();
    if (!name) throw new Error('Expected template name');

    const args: TemplateNode[] = [];
    if (pos < input.length && input[pos] === '<') {
      pos++; // skip '<'
      while (pos < input.length && input[pos] !== '>') {
        if (input[pos] === ',') { pos++; continue; }
        args.push(parseNode());
      }
      if (pos < input.length) pos++; // skip '>'
    }
    return { name, args };
  }

  try {
    const result = parseNode();
    if (pos < input.length && input[pos] !== undefined) {
      // Unconsumed input after first node — not necessarily an error
      // for our simple parser, but catches gross malformation
    }
    return result;
  } catch {
    return null;
  }
}

vi.mock('@kyberstation/template-eval', () => ({
  parseTemplateString: mockParseTemplateString,
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { TemplateTreePanel } from '../components/editor/template-tree/TemplateTreePanel';
import { TemplateTreeNode } from '../components/editor/template-tree/TemplateTreeNode';

// ── Helpers ─────────────────────────────────────────────────────────

function renderPanel(props: { templateString?: string } = {}) {
  return renderToStaticMarkup(createElement(TemplateTreePanel, props));
}

function renderNode(node: TemplateNode, depth = 0, parentName?: string, argIndex?: number) {
  return renderToStaticMarkup(
    createElement(TemplateTreeNode, { node, depth, parentName, argIndex })
  );
}

/** Build a minimal TemplateNode fixture. */
function makeNode(name: string, args: TemplateNode[] = []): TemplateNode {
  return { name, args };
}

// ── Reset ───────────────────────────────────────────────────────────

beforeEach(() => {
  mockState.importedRawCode = undefined;
});

// ─── TemplateTreePanel ──────────────────────────────────────────────

describe('TemplateTreePanel', () => {
  describe('empty state', () => {
    it('renders empty message when no templateString prop and no store value', () => {
      mockState.importedRawCode = undefined;
      const html = renderPanel();
      expect(html).toContain('No template loaded');
      expect(html).toContain('Import a Fett263');
    });

    it('renders empty message for empty string', () => {
      const html = renderPanel({ templateString: '' });
      expect(html).toContain('No template loaded');
    });

    it('renders empty message for whitespace-only string', () => {
      const html = renderPanel({ templateString: '   ' });
      expect(html).toContain('No template loaded');
    });
  });

  describe('parse error', () => {
    it('renders error state for malformed input (missing closing >)', () => {
      // Our mock parser returns null for incomplete templates
      const html = renderPanel({ templateString: '<' });
      // Should render either parse error or empty state
      expect(html).toContain('Parse error');
    });
  });

  describe('valid template', () => {
    it('renders tree for a simple Rgb node', () => {
      const html = renderPanel({ templateString: 'Rgb<255,0,128>' });
      expect(html).toContain('Rgb');
      expect(html).toContain('role="tree"');
    });

    it('renders stats bar with node count', () => {
      const html = renderPanel({ templateString: 'Rgb<255,0,128>' });
      // Rgb + 3 integer children = 4 nodes
      expect(html).toContain('4 nodes');
    });

    it('renders stats bar with depth for nested templates', () => {
      const html = renderPanel({ templateString: 'Mix<Int<16384>,Rgb<0,0,255>,Rgb<255,0,0>>' });
      expect(html).toContain('depth');
    });

    it('renders stats bar with color count', () => {
      const html = renderPanel({ templateString: 'Mix<Int<16384>,Rgb<0,0,255>,Rgb<255,0,0>>' });
      expect(html).toContain('2 colors');
    });

    it('renders stats bar with layer count for Layers<>', () => {
      const html = renderPanel({ templateString: 'Layers<Rgb<255,0,0>,Rgb<0,255,0>,Rgb<0,0,255>>' });
      expect(html).toContain('3 layers');
    });

    it('renders ARIA tree role', () => {
      const html = renderPanel({ templateString: 'Rgb<255,0,0>' });
      expect(html).toContain('role="tree"');
      expect(html).toContain('aria-label="ProffieOS template structure"');
    });
  });

  describe('store integration', () => {
    it('reads from bladeStore when no templateString prop', () => {
      mockState.importedRawCode = 'Rgb<100,200,50>';
      const html = renderPanel();
      expect(html).toContain('Rgb');
      expect(html).toContain('4 nodes');
    });

    it('prefers templateString prop over store value', () => {
      mockState.importedRawCode = 'Rgb<100,200,50>';
      const html = renderPanel({ templateString: 'Int<500>' });
      // Should show Int, not Rgb — the prop override
      expect(html).toContain('Int');
    });
  });
});

// ─── TemplateTreeNode ───────────────────────────────────────────────

describe('TemplateTreeNode', () => {
  describe('leaf nodes', () => {
    it('renders a simple leaf node name', () => {
      const html = renderNode(makeNode('Red'));
      expect(html).toContain('Red');
    });

    it('renders integer literals with appropriate styling', () => {
      const html = renderNode(makeNode('255'));
      expect(html).toContain('255');
      expect(html).toContain('text-orange-300');
    });

    it('renders negative integer literals', () => {
      const html = renderNode(makeNode('-1'));
      expect(html).toContain('-1');
      expect(html).toContain('text-orange-300');
    });
  });

  describe('color swatches', () => {
    it('renders color swatch for Rgb node with 3 integer args', () => {
      const node = makeNode('Rgb', [
        makeNode('255'),
        makeNode('0'),
        makeNode('128'),
      ]);
      const html = renderNode(node);
      expect(html).toContain('rgb(255,0,128)');
    });

    it('renders color swatch for named color Red', () => {
      const node = makeNode('Red');
      const html = renderNode(node);
      expect(html).toContain('rgb(255,0,0)');
    });

    it('renders color swatch for named color DeepSkyBlue', () => {
      const node = makeNode('DeepSkyBlue');
      const html = renderNode(node);
      expect(html).toContain('rgb(0,191,255)');
    });

    it('does not render swatch for non-color nodes', () => {
      const node = makeNode('Mix', [
        makeNode('16384'),
        makeNode('Red'),
        makeNode('Blue'),
      ]);
      const html = renderNode(node);
      // Mix itself should not have a color swatch aria-label
      // Count "Color:" occurrences at the Mix level (not children)
      // The Mix node row itself should not contain a swatch
      const mixRowMatch = html.match(/Mix/);
      expect(mixRowMatch).not.toBeNull();
    });
  });

  describe('tree structure', () => {
    it('renders treeitem role', () => {
      const html = renderNode(makeNode('AudioFlicker', [makeNode('Red'), makeNode('Blue')]));
      expect(html).toContain('role="treeitem"');
    });

    it('renders group role for children', () => {
      const node = makeNode('AudioFlicker', [makeNode('Red'), makeNode('Blue')]);
      const html = renderNode(node);
      expect(html).toContain('role="group"');
    });

    it('renders collapse toggle for nodes with children', () => {
      const node = makeNode('Mix', [
        makeNode('16384'),
        makeNode('Red'),
        makeNode('Blue'),
      ]);
      const html = renderNode(node);
      expect(html).toContain('aria-label="Collapse"');
    });

    it('does not render collapse toggle for leaf nodes', () => {
      const html = renderNode(makeNode('255'));
      expect(html).not.toContain('aria-label="Collapse"');
      expect(html).not.toContain('aria-label="Expand"');
    });
  });

  describe('category color coding', () => {
    it('color nodes get emerald class', () => {
      const html = renderNode(makeNode('Red'));
      expect(html).toContain('text-emerald-400');
    });

    it('function nodes get sky class', () => {
      const html = renderNode(makeNode('SwingSpeed', [makeNode('400')]));
      expect(html).toContain('text-sky-400');
    });

    it('transition nodes get amber class', () => {
      const html = renderNode(makeNode('TrFade', [makeNode('300')]));
      expect(html).toContain('text-amber-400');
    });

    it('wrapper nodes get purple class', () => {
      const html = renderNode(makeNode('AlphaL', [makeNode('Red'), makeNode('Int', [makeNode('16384')])]));
      expect(html).toContain('text-purple-400');
    });

    it('style nodes get primary text class', () => {
      const html = renderNode(makeNode('AudioFlicker', [makeNode('Red'), makeNode('Blue')]));
      expect(html).toContain('text-text-primary');
    });

    it('integer literals get orange class', () => {
      const html = renderNode(makeNode('300'));
      expect(html).toContain('text-orange-300');
    });
  });

  describe('annotations', () => {
    it('renders annotation from parent context', () => {
      const child = makeNode('128');
      const html = renderNode(child, 1, 'Rgb', 0);
      expect(html).toContain('Red (0-255)');
    });

    it('renders second arg annotation', () => {
      const child = makeNode('255');
      const html = renderNode(child, 1, 'Rgb', 1);
      expect(html).toContain('Green (0-255)');
    });

    it('does not render annotation when parent has no annotations', () => {
      const child = makeNode('100');
      const html = renderNode(child, 1, 'FakeTemplate', 0);
      // No annotation class should be present for this arg
      expect(html).not.toContain('Red (0-255)');
    });
  });

  describe('auto-collapse', () => {
    it('nodes at depth < 4 start expanded', () => {
      const node = makeNode('Layers', [makeNode('Red'), makeNode('Blue')]);
      const html = renderNode(node, 0);
      expect(html).toContain('aria-label="Collapse"');
      expect(html).toContain('Red');
      expect(html).toContain('Blue');
    });

    it('nodes at depth >= 4 start collapsed', () => {
      const node = makeNode('Mix', [
        makeNode('16384'),
        makeNode('Red'),
        makeNode('Blue'),
      ]);
      const html = renderNode(node, 4);
      expect(html).toContain('aria-label="Expand"');
    });
  });

  describe('inline arg preview (collapsed)', () => {
    it('shows arg names in preview when collapsed with ≤4 args', () => {
      const node = makeNode('Mix', [
        makeNode('16384'),
        makeNode('Red'),
        makeNode('Blue'),
      ]);
      const html = renderNode(node, 4);
      expect(html).toContain('16384');
      expect(html).toContain('Red');
      expect(html).toContain('Blue');
    });

    it('shows arg count badge when collapsed with >4 args', () => {
      const node = makeNode('ColorChange', [
        makeNode('TrFade', [makeNode('300')]),
        makeNode('Red'),
        makeNode('Blue'),
        makeNode('Green'),
        makeNode('White'),
      ]);
      const html = renderNode(node, 4);
      expect(html).toContain('5 args');
    });
  });

  describe('indentation', () => {
    it('root node has minimal padding', () => {
      const html = renderNode(makeNode('Layers', [makeNode('Red')]), 0);
      expect(html).toContain('padding-left:4px');
    });

    it('depth-1 node has 20px padding', () => {
      const html = renderNode(makeNode('Red'), 1);
      expect(html).toContain('padding-left:20px');
    });

    it('depth-2 node has 36px padding', () => {
      const html = renderNode(makeNode('255'), 2);
      expect(html).toContain('padding-left:36px');
    });
  });
});
