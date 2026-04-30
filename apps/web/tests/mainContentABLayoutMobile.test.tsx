// ─── MainContentABLayout — PR A2 mobile-stacked branch ────────────────
//
// Pins the mobile-fallback render shape: when `useBreakpoint().isMobile`
// is true, the component renders Column A above Column B vertically,
// each at full viewport width, with no ResizeHandle. Replaces the
// desktop split (280px Column A + 4px ResizeHandle + flex-1 Column B)
// which crammed Column B into ~95px on a 380px viewport.
//
// Per Ken's 2026-04-30 direction: "use our A/B column layout but stack
// them on top of each other so each column uses the full visual width
// of the phone."
//
// Pattern matches `audioAB.test.tsx` — `react-dom/server` + hoisted
// store mocks. The breakpoint hook is mocked so we can flip between
// mobile and desktop in the same test file.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Hoisted mock state ────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  isMobile: true,
  columnAWidth: 280,
}));

// ── Store + hook mocks ────────────────────────────────────────────────

vi.mock('@/stores/uiStore', () => {
  const REGION_LIMITS = {
    columnAWidth: { min: 220, max: 400, default: 280 },
  };
  const useUIStore = ((selector: (s: unknown) => unknown) =>
    selector({
      columnAWidth: mockState.columnAWidth,
      setColumnAWidth: (n: number) => {
        mockState.columnAWidth = n;
      },
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useUIStore, REGION_LIMITS };
});

vi.mock('@/hooks/useBreakpoint', () => ({
  useBreakpoint: () => ({
    breakpoint: mockState.isMobile ? 'phone' : 'desktop',
    isMobile: mockState.isMobile,
    isTablet: false,
    isWide: false,
  }),
}));

vi.mock('@/components/shared/ResizeHandle', () => ({
  ResizeHandle: () => createElement('div', { 'data-testid': 'mock-resize-handle' }),
}));

import { MainContentABLayout } from '@/components/layout/MainContentABLayout';

// ── Tests ─────────────────────────────────────────────────────────────

describe('MainContentABLayout — mobile branch (PR A2)', () => {
  beforeEach(() => {
    mockState.isMobile = true;
    mockState.columnAWidth = 280;
  });

  it('renders mobile-stacked layout when isMobile is true', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: createElement('div', { 'data-testid': 'col-a' }, 'A'),
        columnB: createElement('div', { 'data-testid': 'col-b' }, 'B'),
      }),
    );
    expect(html).toContain('data-mainab-layout="mobile-stacked"');
    expect(html).not.toContain('data-mainab-layout="split"');
  });

  it('mobile branch is a vertical flex container (flex-col)', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: createElement('div', { 'data-testid': 'col-a' }, 'A'),
        columnB: createElement('div', { 'data-testid': 'col-b' }, 'B'),
      }),
    );
    const m = html.match(/<div data-mainab-layout="mobile-stacked" class="([^"]*)"/);
    expect(m).toBeTruthy();
    expect(m![1]).toContain('flex-col');
  });

  it('mobile branch renders Column A before Column B in document order', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: createElement('div', { 'data-testid': 'col-a' }, 'A'),
        columnB: createElement('div', { 'data-testid': 'col-b' }, 'B'),
      }),
    );
    const aIdx = html.indexOf('data-testid="col-a"');
    const bIdx = html.indexOf('data-testid="col-b"');
    expect(aIdx).toBeGreaterThan(0);
    expect(bIdx).toBeGreaterThan(0);
    expect(aIdx).toBeLessThan(bIdx);
  });

  it('mobile Column A wrapper has max-h-[40vh] cap + internal scroll', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: createElement('div', { 'data-testid': 'col-a' }, 'A'),
        columnB: createElement('div', { 'data-testid': 'col-b' }, 'B'),
      }),
    );
    const m = html.match(/<aside data-mainab-column="a"[^>]*class="([^"]*)"/);
    expect(m).toBeTruthy();
    expect(m![1]).toContain('max-h-[40vh]');
    expect(m![1]).toContain('overflow-y-auto');
    // No fixed-width sidebar shape.
    expect(m![1]).not.toContain('flex-shrink-0');
  });

  it('mobile Column B wrapper fills remaining height', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: createElement('div', { 'data-testid': 'col-a' }, 'A'),
        columnB: createElement('div', { 'data-testid': 'col-b' }, 'B'),
      }),
    );
    const m = html.match(/<section data-mainab-column="b"[^>]*class="([^"]*)"/);
    expect(m).toBeTruthy();
    expect(m![1]).toContain('flex-1');
    expect(m![1]).toContain('min-h-0');
    expect(m![1]).toContain('overflow-y-auto');
  });

  it('mobile branch does NOT render a ResizeHandle', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: createElement('div', { 'data-testid': 'col-a' }, 'A'),
        columnB: createElement('div', { 'data-testid': 'col-b' }, 'B'),
      }),
    );
    expect(html).not.toContain('data-testid="mock-resize-handle"');
  });

  it('falls through to single-panel when columnA is null even on mobile', () => {
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: null,
        columnB: createElement('div', { 'data-testid': 'col-b' }, 'B'),
      }),
    );
    expect(html).toContain('data-mainab-layout="single"');
    expect(html).not.toContain('data-mainab-layout="mobile-stacked"');
    expect(html).not.toContain('data-mainab-layout="split"');
  });

  it('desktop branch unaffected when isMobile is false', () => {
    mockState.isMobile = false;
    const html = renderToStaticMarkup(
      createElement(MainContentABLayout, {
        columnA: createElement('div', { 'data-testid': 'col-a' }, 'A'),
        columnB: createElement('div', { 'data-testid': 'col-b' }, 'B'),
      }),
    );
    expect(html).toContain('data-mainab-layout="split"');
    expect(html).toContain('data-testid="mock-resize-handle"');
    expect(html).not.toContain('data-mainab-layout="mobile-stacked"');
  });
});
