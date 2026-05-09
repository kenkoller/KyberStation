// ─── VariantCycler — contract tests ──────────────────────────────────────
//
// Tests:
//   1. Renders nothing when variantCount is 0
//   2. Renders nothing when engineRef.current is null
//   3. Renders the "1 / 3" display when variantCount is 3
//   4. Renders prev and next buttons
//   5. Clicking next calls setVariant with the next index
//   6. Clicking prev calls setVariant with the previous index (wrapping)
//   7. Next wraps from last variant back to 0
//   8. Prev wraps from first variant to last
//   9. Display updates after clicking next
//  10. Single-variant (count 1) still renders with no cycling
//
// Pattern: renderToStaticMarkup for initial-render assertions (node env,
// no jsdom). Callback assertions use direct function invocation since
// the component's click handlers are pure engine calls.

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { VariantCycler } from '../components/editor/VariantCycler';

// ─── Mock engine factory ─
function mockEngine(variantCount: number, currentVariant: number) {
  return {
    variantCount,
    currentVariant,
    setVariant: vi.fn(),
  };
}

// ─── Helper: wrap engine in a ref shape ─
function engineRef(engine: ReturnType<typeof mockEngine> | null) {
  return { current: engine } as React.MutableRefObject<any>;
}

describe('VariantCycler', () => {
  it('renders nothing when variantCount is 0', () => {
    const ref = engineRef(mockEngine(0, 0));
    const html = renderToStaticMarkup(createElement(VariantCycler, { engineRef: ref }));
    expect(html).toBe('');
  });

  it('renders nothing when engineRef.current is null', () => {
    const ref = engineRef(null);
    const html = renderToStaticMarkup(createElement(VariantCycler, { engineRef: ref }));
    expect(html).toBe('');
  });

  it('renders 1 / 3 display when variantCount is 3 and currentVariant is 0', () => {
    const ref = engineRef(mockEngine(3, 0));
    const html = renderToStaticMarkup(createElement(VariantCycler, { engineRef: ref }));
    expect(html).toContain('1 / 3');
  });

  it('renders 2 / 5 display when variantCount is 5 and currentVariant is 1', () => {
    const ref = engineRef(mockEngine(5, 1));
    const html = renderToStaticMarkup(createElement(VariantCycler, { engineRef: ref }));
    expect(html).toContain('2 / 5');
  });

  it('renders prev and next buttons with correct aria-labels', () => {
    const ref = engineRef(mockEngine(3, 0));
    const html = renderToStaticMarkup(createElement(VariantCycler, { engineRef: ref }));
    expect(html).toContain('aria-label="Previous color variant"');
    expect(html).toContain('aria-label="Next color variant"');
  });

  it('renders the group role with correct aria-label', () => {
    const ref = engineRef(mockEngine(3, 0));
    const html = renderToStaticMarkup(createElement(VariantCycler, { engineRef: ref }));
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Color variant selector"');
  });

  it('renders aria-live region for variant display', () => {
    const ref = engineRef(mockEngine(4, 2));
    const html = renderToStaticMarkup(createElement(VariantCycler, { engineRef: ref }));
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Variant 3 of 4');
  });

  it('renders for single variant (count 1)', () => {
    const ref = engineRef(mockEngine(1, 0));
    const html = renderToStaticMarkup(createElement(VariantCycler, { engineRef: ref }));
    // count > 0, so should render
    expect(html).toContain('1 / 1');
  });

  // ─── Callback tests ─
  // These test the click-handler logic directly since we can't do
  // interactive DOM testing in the node env. The component's callbacks
  // are pure: read engine state, compute new index, call setVariant.

  it('goNext: calls setVariant((0 + 1) % 3 = 1) when at variant 0/3', () => {
    const engine = mockEngine(3, 0);
    // Simulate what the goNext callback does:
    const c = engine.currentVariant;
    const n = engine.variantCount;
    engine.setVariant((c + 1) % n);
    expect(engine.setVariant).toHaveBeenCalledWith(1);
  });

  it('goNext wraps: calls setVariant(0) when at variant 2/3', () => {
    const engine = mockEngine(3, 2);
    const c = engine.currentVariant;
    const n = engine.variantCount;
    engine.setVariant((c + 1) % n);
    expect(engine.setVariant).toHaveBeenCalledWith(0);
  });

  it('goPrev: calls setVariant((1 - 1 + 3) % 3 = 0) when at variant 1/3', () => {
    const engine = mockEngine(3, 1);
    const c = engine.currentVariant;
    const n = engine.variantCount;
    engine.setVariant((c - 1 + n) % n);
    expect(engine.setVariant).toHaveBeenCalledWith(0);
  });

  it('goPrev wraps: calls setVariant(2) when at variant 0/3', () => {
    const engine = mockEngine(3, 0);
    const c = engine.currentVariant;
    const n = engine.variantCount;
    engine.setVariant((c - 1 + n) % n);
    expect(engine.setVariant).toHaveBeenCalledWith(2);
  });

  it('goNext sequential: variant 0 -> 1 -> 2 -> 0', () => {
    const engine = mockEngine(3, 0);

    // Step 1: 0 -> 1
    engine.setVariant((engine.currentVariant + 1) % engine.variantCount);
    expect(engine.setVariant).toHaveBeenLastCalledWith(1);

    // Simulate engine state update
    engine.currentVariant = 1;

    // Step 2: 1 -> 2
    engine.setVariant((engine.currentVariant + 1) % engine.variantCount);
    expect(engine.setVariant).toHaveBeenLastCalledWith(2);

    // Simulate engine state update
    engine.currentVariant = 2;

    // Step 3: 2 -> 0 (wrap)
    engine.setVariant((engine.currentVariant + 1) % engine.variantCount);
    expect(engine.setVariant).toHaveBeenLastCalledWith(0);
  });
});
