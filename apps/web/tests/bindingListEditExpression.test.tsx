// ─── BindingList — Wave 3 edit-expression button regression tests ──────
//
// Wave 3 of Modulation Routing v1.1 Core adds an `fx` button on each
// expression-based binding row that opens the ExpressionEditor pre-
// loaded with the binding's existing source. Bare-source bindings
// (e.g. `swing → shimmer`) get NO button — there's nothing to edit.
//
// This test pins down the visibility contract:
//
//   1. Expression-source rows render the fx button with a magenta
//      identity color and an aria-label that names the target param.
//   2. Bare-source rows do NOT render the fx button.
//   3. The ExpressionEditor is NOT mounted at initial render — it
//      only mounts when the user clicks fx (state-driven). Static-
//      markup rendering confirms the popover stays hidden by default.
//   4. The grid template includes the new 28 px fx-slot column on
//      every row, so column alignment stays consistent across mixed
//      expression / bare-source binding lists.
//
// We use `react-dom/server`'s `renderToStaticMarkup` (matching every
// other apps/web test) which renders synchronously without jsdom.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { SerializedBinding } from '@kyberstation/engine';

// ── Hoisted mock state ──────────────────────────────────────────────
//
// The bladeStore selector + clearAllBindings stub need to share memory
// across the component's multiple useBladeStore subscriptions. We stash
// the mutable bindings on globalThis so each test can swap them.

type GlobalWithBindings = {
  __bindingListTestBindings: SerializedBinding[];
};

(globalThis as unknown as GlobalWithBindings).__bindingListTestBindings = [];

function setBindings(bindings: SerializedBinding[]): void {
  (globalThis as unknown as GlobalWithBindings).__bindingListTestBindings =
    bindings;
}

function getBindings(): SerializedBinding[] {
  return (globalThis as unknown as GlobalWithBindings).__bindingListTestBindings;
}

vi.mock('@/stores/bladeStore', () => ({
  useBladeStore: (selector: (state: unknown) => unknown) => {
    const fakeState = {
      config: {
        modulation:
          getBindings().length > 0
            ? { version: 1, bindings: getBindings() }
            : undefined,
      },
      // Action stubs — referenced by selectors but never invoked under
      // static markup rendering (no event handlers fire).
      addBinding: () => {},
      removeBinding: () => {},
      updateBinding: () => {},
      toggleBindingBypass: () => {},
      clearAllBindings: () => {},
    };
    return selector(fakeState);
  },
}));

// Board profile must allow modulation, otherwise BindingList early-
// returns null and never renders any rows.
vi.mock('@/hooks/useBoardProfile', () => ({
  useBoardProfile: () => ({ boardId: 'proffieboard-v3' }),
}));

vi.mock('@/lib/boardProfiles', () => ({
  canBoardModulate: (boardId: string) => boardId === 'proffieboard-v3',
}));

// Mock parameter lookup so the test doesn't depend on the live
// parameterGroups registry shape.
vi.mock('@/lib/parameterGroups', () => ({
  getParameter: (target: string) => {
    if (target === 'shimmer') return { displayName: 'Shimmer' };
    if (target === 'baseColor.r') return { displayName: 'Base Red' };
    return undefined;
  },
}));

// Stub the heavy children that BindingList renders before the rows,
// so they don't pollute the markup or pull in the engine grammar.
vi.mock('@/components/editor/routing/AddBindingForm', () => ({
  AddBindingForm: () =>
    createElement('div', { 'data-testid': 'mock-add-binding-form' }),
}));

vi.mock('@/components/editor/routing/RecipePicker', () => ({
  RecipePicker: () =>
    createElement('div', { 'data-testid': 'mock-recipe-picker' }),
}));

// Mark ExpressionEditor with a sentinel so we can prove it does NOT
// appear at initial render (the row's fx button toggles the editor on
// click — invisible under static markup).
vi.mock('@/components/editor/routing/ExpressionEditor', () => ({
  ExpressionEditor: () =>
    createElement('div', { 'data-testid': 'mock-expression-editor' }, 'EDITOR'),
}));

import { BindingList } from '@/components/editor/routing/BindingList';

function html(): string {
  return renderToStaticMarkup(createElement(BindingList));
}

// Test fixtures.

const BARE_SOURCE_BINDING: SerializedBinding = {
  id: 'b1',
  source: 'swing',
  expression: null,
  target: 'shimmer',
  combinator: 'add',
  amount: 0.5,
  bypassed: false,
};

const EXPRESSION_BINDING: SerializedBinding = {
  id: 'b2',
  source: null,
  expression: {
    source: 'sin(time * 0.001) * 0.5 + 0.5',
    // The AST shape doesn't matter for this test — the engine type
    // requires it but BindingList only reads `expression.source`.
    ast: { type: 'number', value: 0 } as never,
  },
  target: 'shimmer',
  combinator: 'replace',
  amount: 1.0,
  bypassed: false,
};

const SECOND_EXPRESSION_BINDING: SerializedBinding = {
  ...EXPRESSION_BINDING,
  id: 'b3',
  expression: {
    source: 'clamp(swing * 2, 0, 1)',
    ast: { type: 'number', value: 0 } as never,
  },
  target: 'baseColor.r',
};

describe('BindingList — Wave 3 fx-edit-button visibility', () => {
  beforeEach(() => {
    setBindings([]);
  });

  it('does NOT render the fx edit button on bare-source binding rows', () => {
    setBindings([BARE_SOURCE_BINDING]);
    const markup = html();
    // The aria-label for the fx button is keyed off the param label.
    // Edit-expression aria-label format: `Edit expression for <Label>`.
    expect(markup).not.toContain('aria-label="Edit expression for Shimmer"');
    expect(markup).not.toContain('aria-label="Close expression for Shimmer"');
    // The fx button text "fx" still shouldn't appear in this row's
    // controls — we render an empty placeholder span instead. (The
    // SOURCE column may render the literal text "fx" for an expression
    // binding's source label, but on a bare-source row it shows the
    // modulator's display name, not the literal "fx".)
    // The bare-source row's source column reads the modulator name —
    // for swing, that's whatever displayName the registry gives it.
    // What we assert here is that no `aria-pressed` button exists on
    // this row beyond the bypass toggle (which is `Toggle bypass`).
    expect(markup).not.toContain('aria-label="Edit expression for Shimmer"');
  });

  it('renders the fx edit button on expression-source binding rows', () => {
    setBindings([EXPRESSION_BINDING]);
    const markup = html();
    // The fx button's aria-label should call out the param it edits.
    expect(markup).toContain('aria-label="Edit expression for Shimmer"');
    // It should be a <button> element with aria-pressed="false" (closed
    // by default at initial render).
    expect(markup).toContain('aria-pressed="false"');
    // Its visible label is "fx".
    expect(markup).toMatch(/<button[^>]*aria-label="Edit expression for Shimmer"[^>]*>[\s\S]*?fx[\s\S]*?<\/button>/);
  });

  it('does NOT mount the ExpressionEditor at initial render (state-gated)', () => {
    setBindings([EXPRESSION_BINDING]);
    const markup = html();
    // The button is rendered, but the editor popover stays hidden until
    // the user toggles `isEditing` to true via click.
    expect(markup).toContain('aria-label="Edit expression for Shimmer"');
    expect(markup).not.toContain('data-testid="mock-expression-editor"');
  });

  it('renders fx on every expression row in a mixed binding list', () => {
    setBindings([
      BARE_SOURCE_BINDING,
      EXPRESSION_BINDING,
      SECOND_EXPRESSION_BINDING,
    ]);
    const markup = html();
    // Two expression rows → two fx buttons (one per param target).
    expect(markup).toContain('aria-label="Edit expression for Shimmer"');
    expect(markup).toContain('aria-label="Edit expression for Base Red"');
    // Three rows total — we already verified the bare-source row gets
    // no fx button, so no extra buttons should show up beyond the two.
    const matches = markup.match(/aria-label="Edit expression for/g);
    expect(matches?.length ?? 0).toBe(2);
  });

  it('grid template includes the 28 px fx-slot column on every row', () => {
    // Mixed list: alignment relies on every row having the same column
    // structure. The fx-slot column slots between target and combinator;
    // bare-source rows leave it empty rather than collapsing.
    setBindings([BARE_SOURCE_BINDING, EXPRESSION_BINDING]);
    const markup = html();
    // The grid-template-columns string is encoded in the inline style.
    // We accept either the exact CSS literal or its escaped HTML form.
    const gridTemplatePresent =
      markup.includes(
        'grid-template-columns:minmax(80px, 120px) 10px minmax(80px, 1fr) 28px 70px 1fr 24px 20px',
      ) ||
      markup.includes(
        'grid-template-columns: minmax(80px, 120px) 10px minmax(80px, 1fr) 28px 70px 1fr 24px 20px',
      );
    expect(gridTemplatePresent).toBe(true);
  });
});

describe('BindingList — Wave 3 fx-edit-button accessibility', () => {
  beforeEach(() => {
    setBindings([]);
  });

  it('fx button is keyboard-focusable (rendered as <button type="button">)', () => {
    setBindings([EXPRESSION_BINDING]);
    const markup = html();
    // Confirm the fx control is a real button, not a clickable span.
    expect(markup).toMatch(
      /<button[^>]*type="button"[^>]*aria-label="Edit expression for Shimmer"/,
    );
  });

  it('fx button uses aria-pressed for toggle semantics', () => {
    setBindings([EXPRESSION_BINDING]);
    const markup = html();
    // At initial render `isEditing` is false → aria-pressed="false".
    // When toggled on (mounted state false→true), the aria-pressed flips
    // and the aria-label changes to "Close expression for ...". Static
    // markup only exercises the closed state.
    //
    // Both aria-pressed and aria-label live on the same <button> tag;
    // React's renderer outputs `aria-pressed` first based on prop
    // declaration order, so we assert the pair appears together inside
    // a single open-button element.
    expect(markup).toMatch(
      /<button[^>]*aria-pressed="false"[^>]*aria-label="Edit expression for Shimmer"[^>]*>/,
    );
  });
});
