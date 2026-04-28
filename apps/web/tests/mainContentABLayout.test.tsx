// ─── MainContentABLayout — Sidebar A/B v2 Phase 1 wrapper tests ───────
//
// Pin down the wrapper's contract:
//   1. Renders Column B at full width when columnA is null/omitted
//      (single-panel fallback for unmigrated sections).
//   2. Renders both columns side-by-side when columnA is provided.
//   3. Reads columnAWidth from uiStore + applies it to the column-A
//      aside's inline style.
//   4. ResizeHandle is mounted between A and B with the correct
//      min/max/default from REGION_LIMITS.
//   5. Width clamping: setColumnAWidth respects REGION_LIMITS bounds.
//   6. useABLayout flag default state — false until the migration
//      lifts it.
//
// Pattern matches the existing apps/web/tests using
// `react-dom/server`'s renderToStaticMarkup (no jsdom dependency).

import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { useUIStore, REGION_LIMITS } from '../stores/uiStore';
import { MainContentABLayout } from '../components/layout/MainContentABLayout';

function resetStore() {
  useUIStore.setState({
    columnAWidth: REGION_LIMITS.columnAWidth.default,
    useABLayout: false,
  });
}

describe('MainContentABLayout — Phase 1 wrapper', () => {
  beforeEach(resetStore);

  it('renders single-panel fallback when columnA is null', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: null,
        columnB: createElement('div', { 'data-testid': 'b' }, 'editor'),
      }),
    );
    expect(html).toContain('data-mainab-layout="single"');
    expect(html).not.toContain('data-mainab-column="a"');
    expect(html).toContain('editor');
  });

  it('renders both columns side-by-side when columnA is provided', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: createElement('ul', null, 'list'),
        columnB: createElement('div', null, 'editor'),
      }),
    );
    expect(html).toContain('data-mainab-layout="split"');
    expect(html).toContain('data-mainab-column="a"');
    expect(html).toContain('data-mainab-column="b"');
    expect(html).toContain('list');
    expect(html).toContain('editor');
  });

  it('emits a width style on the Column A aside (matches store default)', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: createElement('ul', null, 'list'),
        columnB: createElement('div', null, 'editor'),
      }),
    );
    // Default columnAWidth is REGION_LIMITS.columnAWidth.default (280).
    // We verify the wrapper threads SOME width value through to the
    // aside's inline style — the actual setColumnAWidth clamping is
    // covered by the dedicated store test below.
    const expected = REGION_LIMITS.columnAWidth.default;
    expect(html).toMatch(new RegExp(`width:\\s*${expected}px`));
  });

  it('uses the resizeLabel prop on the handle', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: createElement('ul', null, 'list'),
        columnB: createElement('div', null, 'editor'),
        resizeLabel: 'Style list width',
      }),
    );
    expect(html).toContain('Style list width');
  });

  it('falls back to a default resizeLabel when not provided', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: createElement('ul', null, 'list'),
        columnB: createElement('div', null, 'editor'),
      }),
    );
    expect(html).toContain('Column A width');
  });
});

describe('uiStore — Sidebar A/B Phase 1 fields', () => {
  beforeEach(resetStore);

  it('exposes columnAWidth + setColumnAWidth', () => {
    const state = useUIStore.getState();
    expect(typeof state.columnAWidth).toBe('number');
    expect(typeof state.setColumnAWidth).toBe('function');
  });

  it('exposes useABLayout + setUseABLayout (resetStore forces false)', () => {
    // Phase 2 flipped the on-disk default to true (so fresh visitors
    // see the A/B layout immediately). The `resetStore` helper above
    // still explicitly sets the field to false at the start of every
    // test in this file so legacy assertions about the wrapper's
    // single-panel fallback continue to hold.
    const state = useUIStore.getState();
    expect(state.useABLayout).toBe(false);
    expect(typeof state.setUseABLayout).toBe('function');
  });

  it('REGION_LIMITS.columnAWidth has the expected min/max/default', () => {
    expect(REGION_LIMITS.columnAWidth).toEqual({ min: 220, max: 400, default: 280 });
  });

  it('setColumnAWidth clamps below the min', () => {
    useUIStore.getState().setColumnAWidth(100);
    expect(useUIStore.getState().columnAWidth).toBe(REGION_LIMITS.columnAWidth.min);
  });

  it('setColumnAWidth clamps above the max', () => {
    useUIStore.getState().setColumnAWidth(900);
    expect(useUIStore.getState().columnAWidth).toBe(REGION_LIMITS.columnAWidth.max);
  });

  it('setColumnAWidth accepts an in-range value verbatim', () => {
    useUIStore.getState().setColumnAWidth(320);
    expect(useUIStore.getState().columnAWidth).toBe(320);
  });

  it('setUseABLayout toggles the flag', () => {
    useUIStore.getState().setUseABLayout(true);
    expect(useUIStore.getState().useABLayout).toBe(true);
    useUIStore.getState().setUseABLayout(false);
    expect(useUIStore.getState().useABLayout).toBe(false);
  });
});
