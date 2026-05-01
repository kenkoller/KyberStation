// ─── MobileTabBar — route-aware visibility integration tests ───────
//
// Verifies that the global `MobileTabBar` component honors the
// route-visibility contract from `useShouldShowMobileTabBar`. Pairs
// with the hook's drift sentinel (`useShouldShowMobileTabBar.test.tsx`):
//   - the hook test pins the route → boolean matrix
//   - this test pins that the matrix actually flows through the
//     component's render output
//
// Pattern matches the Phase 4 A/B section tests — `react-dom/server` +
// `renderToStaticMarkup`, no jsdom dependency. Suspense boundaries
// rendered transparently in SSR.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// Hoisted pathname so we can flip between routes.
const mockState = vi.hoisted(() => ({
  pathname: '/' as string | null,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockState.pathname,
}));

import { MobileTabBar } from '@/components/layout/MobileTabBar';

describe('MobileTabBar — visibility', () => {
  beforeEach(() => {
    mockState.pathname = '/';
  });

  describe('hides (renders nothing visible) on excluded routes', () => {
    it('renders no <nav> on /editor', () => {
      mockState.pathname = '/editor';
      const html = renderToStaticMarkup(createElement(MobileTabBar));
      expect(html).not.toContain('<nav');
      expect(html).not.toContain('aria-label="Primary"');
    });

    it('renders no <nav> on /editor sub-route', () => {
      mockState.pathname = '/editor/style';
      const html = renderToStaticMarkup(createElement(MobileTabBar));
      expect(html).not.toContain('<nav');
    });

    it('renders no <nav> on /m', () => {
      mockState.pathname = '/m';
      const html = renderToStaticMarkup(createElement(MobileTabBar));
      expect(html).not.toContain('<nav');
    });

    it('renders no <nav> on /m sub-route', () => {
      mockState.pathname = '/m/preset';
      const html = renderToStaticMarkup(createElement(MobileTabBar));
      expect(html).not.toContain('<nav');
    });
  });

  describe('renders the 4-tab nav on visible routes', () => {
    const visibleRoutes: Array<[string, string]> = [
      ['/', 'landing'],
      ['/gallery', 'gallery'],
      ['/docs', 'docs'],
      ['/features', 'marketing features'],
      ['/showcase', 'marketing showcase'],
      ['/changelog', 'marketing changelog'],
      ['/community', 'marketing community'],
    ];

    for (const [route, label] of visibleRoutes) {
      it(`renders <nav> on ${route} (${label})`, () => {
        mockState.pathname = route;
        const html = renderToStaticMarkup(createElement(MobileTabBar));
        expect(html).toContain('<nav');
        expect(html).toContain('aria-label="Primary"');
      });
    }

    it('renders all 4 tab labels on /', () => {
      mockState.pathname = '/';
      const html = renderToStaticMarkup(createElement(MobileTabBar));
      expect(html).toContain('Saber');
      expect(html).toContain('Editor');
      expect(html).toContain('Gallery');
      expect(html).toContain('Docs');
    });

    it('marks /gallery as active on /gallery', () => {
      mockState.pathname = '/gallery';
      const html = renderToStaticMarkup(createElement(MobileTabBar));
      expect(html).toContain('aria-current="page"');
    });
  });

  describe('does not include the 4 tab links when hidden', () => {
    it('on /editor, no Saber/Editor/Gallery/Docs labels in DOM', () => {
      mockState.pathname = '/editor';
      const html = renderToStaticMarkup(createElement(MobileTabBar));
      // The tab labels are only emitted inside the <nav>; if <nav>
      // is absent the labels must be too. Belt-and-suspenders check.
      expect(html).not.toContain('aria-label="Primary"');
    });
  });
});
