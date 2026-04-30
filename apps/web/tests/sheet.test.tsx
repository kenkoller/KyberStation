// ─── <Sheet> primitive — SSR shape + variant tests ──────────────────
//
// Phase 4 PR #2 (2026-04-30). Locks down the contract for the bottom-
// sheet primitive that mobile A/B sections will mount into.
//
// Pattern: `renderToStaticMarkup` from react-dom/server, matching the
// rest of `apps/web/tests/`. The vitest env is node-only (no jsdom).
//
// Two layers under test:
//   1. The `<Sheet>` public wrapper enforces a `mounted` gate so SSR
//      output is empty (prevents hydration mismatches).
//   2. The exported `<SheetContent>` inner shell renders the dialog
//      markup directly. SSR-rendering it gives us a static HTML string
//      we can pattern-match against to assert the contract.
//
// Coverage:
//   1. resolveSheetSizing returns the documented size matrix.
//   2. <Sheet open={false}> renders nothing.
//   3. <Sheet open={true}> renders nothing on SSR (mount gate).
//   4. <SheetContent open={true}> renders role="dialog" + aria-modal.
//   5. Title appears in the header.
//   6. aria-labelledby resolves to the header title element id.
//   7. Custom ariaLabelledById is honored.
//   8. Footer slot renders the provided node.
//   9. size='full' surfaces a data-sheet-size="full" hook.
//  10. Reduced motion: the surface markup OMITS the `transition` style
//      declaration when prefers-reduced-motion: reduce.
//  11. Default rendering INCLUDES the `transition` style declaration
//      (drift sentinel paired with the reduced-motion case).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Sheet, SheetContent, resolveSheetSizing } from '../components/shared/Sheet';

// ─── matchMedia stub helpers ───────────────────────────────────────
//
// react-dom/server runs in node, where `window` is undefined by default.
// `prefersReducedMotion()` short-circuits on `typeof window ===
// 'undefined'`, so the default branch is `reduce: false`. To test the
// reduce branch we synthesize a tiny window stub with just the
// matchMedia method.

let originalWindow: unknown;

beforeEach(() => {
  originalWindow = (globalThis as { window?: unknown }).window;
});

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

function stubMatchMedia(reduceMotion: boolean) {
  (globalThis as unknown as { window: unknown }).window = {
    matchMedia: (query: string) => ({
      matches: reduceMotion && query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  };
}

// ─── 1. resolveSheetSizing — pure helper drift sentinel ────────────

describe('resolveSheetSizing', () => {
  it("'auto' caps at 85vh (no fixed height)", () => {
    const sizing = resolveSheetSizing('auto');
    expect(sizing.maxHeight).toBe('85vh');
    expect(sizing.height).toBeUndefined();
  });

  it("'half' renders fixed 50vh height", () => {
    const sizing = resolveSheetSizing('half');
    expect(sizing.height).toBe('50vh');
    expect(sizing.maxHeight).toBe('50vh');
  });

  it("'full' renders fixed 100vh height", () => {
    const sizing = resolveSheetSizing('full');
    expect(sizing.height).toBe('100vh');
    expect(sizing.maxHeight).toBe('100vh');
  });
});

// ─── 2-3. <Sheet> wrapper SSR null-render guards ────────────────────

describe('<Sheet> wrapper SSR behavior', () => {
  it('renders nothing when open=false', () => {
    const html = renderToStaticMarkup(
      createElement(Sheet, {
        open: false,
        onClose: () => {},
        title: 'Closed Sheet',
      }),
    );
    expect(html).toBe('');
  });

  it('renders nothing when open=true on SSR (mount gate prevents hydration mismatch)', () => {
    const html = renderToStaticMarkup(
      createElement(Sheet, {
        open: true,
        onClose: () => {},
        title: 'Open Sheet',
        children: createElement('p', {}, 'body'),
      }),
    );
    expect(html).toBe('');
  });
});

// ─── 4-9. <SheetContent> inner-shell DOM contract ───────────────────

describe('<SheetContent> dialog markup', () => {
  it('renders role="dialog" + aria-modal="true" when open', () => {
    const html = renderToStaticMarkup(
      createElement(SheetContent, {
        open: true,
        onClose: () => {},
        title: 'Test Sheet',
        children: createElement('p', {}, 'body'),
      }),
    );
    expect(html).toMatch(/role="dialog"/);
    expect(html).toMatch(/aria-modal="true"/);
  });

  it('renders the title in the header (h2)', () => {
    const html = renderToStaticMarkup(
      createElement(SheetContent, {
        open: true,
        onClose: () => {},
        title: 'Settings Sheet',
        children: 'body',
      }),
    );
    expect(html).toMatch(/<h2[^>]*>Settings Sheet<\/h2>/);
  });

  it('aria-labelledby resolves to the title element id', () => {
    const html = renderToStaticMarkup(
      createElement(SheetContent, {
        open: true,
        onClose: () => {},
        title: 'Linked Sheet',
        children: 'body',
      }),
    );
    // The dialog's aria-labelledby attribute must equal the h2 id —
    // assert by extracting both and matching them.
    const ariaMatch = html.match(/aria-labelledby="([^"]+)"/);
    expect(ariaMatch).toBeTruthy();
    const titleId = ariaMatch?.[1];
    expect(titleId).toBeTruthy();
    expect(html).toMatch(new RegExp(`id="${titleId}"[^>]*>Linked Sheet<`));
  });

  it('honors a custom ariaLabelledById prop', () => {
    const html = renderToStaticMarkup(
      createElement(SheetContent, {
        open: true,
        onClose: () => {},
        title: 'Custom Id Sheet',
        ariaLabelledById: 'parent-supplied-id',
        children: 'body',
      }),
    );
    expect(html).toMatch(/aria-labelledby="parent-supplied-id"/);
    // The h2 element should also carry this id (so screen readers
    // resolve it correctly).
    expect(html).toMatch(/id="parent-supplied-id"/);
  });

  it('renders the footer slot content when provided', () => {
    const html = renderToStaticMarkup(
      createElement(SheetContent, {
        open: true,
        onClose: () => {},
        title: 'Footer Sheet',
        children: createElement('p', {}, 'body'),
        footer: createElement('button', { type: 'button' }, 'Apply Changes'),
      }),
    );
    expect(html).toMatch(/<footer[^>]*>/);
    expect(html).toMatch(/Apply Changes/);
  });

  it("size='full' surfaces a data-sheet-size hook for CSS / DevTools", () => {
    const html = renderToStaticMarkup(
      createElement(SheetContent, {
        open: true,
        onClose: () => {},
        title: 'Full Sheet',
        size: 'full',
        children: 'body',
      }),
    );
    expect(html).toMatch(/data-sheet-size="full"/);
  });

  it("size='half' surfaces a data-sheet-size hook", () => {
    const html = renderToStaticMarkup(
      createElement(SheetContent, {
        open: true,
        onClose: () => {},
        title: 'Half Sheet',
        size: 'half',
        children: 'body',
      }),
    );
    expect(html).toMatch(/data-sheet-size="half"/);
  });
});

// ─── 10-11. Reduced-motion branch ───────────────────────────────────

describe('<SheetContent> reduced-motion gating', () => {
  it('omits the transition style when prefers-reduced-motion: reduce is set', () => {
    stubMatchMedia(true);
    const html = renderToStaticMarkup(
      createElement(SheetContent, {
        open: true,
        onClose: () => {},
        title: 'Calm Sheet',
        children: 'body',
      }),
    );
    // The reduce branch sets `transition: undefined` for both the
    // backdrop and the surface. React serializes `undefined` style
    // values as no-op, so the rendered style attribute should NOT
    // contain a `transition:` declaration.
    expect(html).not.toMatch(/transition:/);
  });

  it('includes the transition style when motion is allowed (drift sentinel)', () => {
    stubMatchMedia(false);
    const html = renderToStaticMarkup(
      createElement(SheetContent, {
        open: true,
        onClose: () => {},
        title: 'Animated Sheet',
        children: 'body',
      }),
    );
    expect(html).toMatch(/transition:/);
  });
});
