// @vitest-environment jsdom
//
// ─── useShouldShowMobileTabBar — visibility hook drift sentinel ────
//
// Pins down the route table for the global MobileTabBar visibility:
//   - Editor (and sub-routes)  → hidden (in-editor bar takes over)
//   - /m chrome-free companion → hidden
//   - Everywhere else          → visible
//
// One source of truth — both `app/layout.tsx`'s mount and `MobileTabBar`
// itself read the hook, so a regression in this matrix would fan out
// to both call sites.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Hoisted mock state so we can flip pathname between tests.
const mockState = vi.hoisted(() => ({
  pathname: '/' as string | null,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockState.pathname,
}));

import { useShouldShowMobileTabBar } from '@/hooks/useShouldShowMobileTabBar';

describe('useShouldShowMobileTabBar', () => {
  beforeEach(() => {
    mockState.pathname = '/';
  });

  describe('returns true (show tab bar)', () => {
    const visibleRoutes = [
      '/',
      '/gallery',
      '/docs',
      '/features',
      '/showcase',
      '/changelog',
      '/community',
      '/faq',
    ];

    for (const route of visibleRoutes) {
      it(`shows on ${route}`, () => {
        mockState.pathname = route;
        const { result } = renderHook(() => useShouldShowMobileTabBar());
        expect(result.current).toBe(true);
      });
    }

    it('shows on a marketing sub-route', () => {
      mockState.pathname = '/features/modulation';
      const { result } = renderHook(() => useShouldShowMobileTabBar());
      expect(result.current).toBe(true);
    });

    it('returns true when pathname is null (defensive default — show)', () => {
      mockState.pathname = null;
      const { result } = renderHook(() => useShouldShowMobileTabBar());
      expect(result.current).toBe(true);
    });
  });

  describe('returns false (hide tab bar)', () => {
    it('hides on /editor', () => {
      mockState.pathname = '/editor';
      const { result } = renderHook(() => useShouldShowMobileTabBar());
      expect(result.current).toBe(false);
    });

    it('hides on /editor/ trailing slash', () => {
      mockState.pathname = '/editor/';
      const { result } = renderHook(() => useShouldShowMobileTabBar());
      expect(result.current).toBe(false);
    });

    it('hides on /editor sub-route', () => {
      mockState.pathname = '/editor/preset-detail';
      const { result } = renderHook(() => useShouldShowMobileTabBar());
      expect(result.current).toBe(false);
    });

    it('hides on /m', () => {
      mockState.pathname = '/m';
      const { result } = renderHook(() => useShouldShowMobileTabBar());
      expect(result.current).toBe(false);
    });

    it('hides on /m sub-route', () => {
      mockState.pathname = '/m/some-preset';
      const { result } = renderHook(() => useShouldShowMobileTabBar());
      expect(result.current).toBe(false);
    });
  });

  describe('boundary cases — paths that look like /editor or /m but are not', () => {
    it('shows on /editorial (not /editor)', () => {
      mockState.pathname = '/editorial';
      const { result } = renderHook(() => useShouldShowMobileTabBar());
      expect(result.current).toBe(true);
    });

    it('shows on /editor-archive (not /editor)', () => {
      mockState.pathname = '/editor-archive';
      const { result } = renderHook(() => useShouldShowMobileTabBar());
      expect(result.current).toBe(true);
    });

    it('shows on /motion (not /m)', () => {
      mockState.pathname = '/motion';
      const { result } = renderHook(() => useShouldShowMobileTabBar());
      expect(result.current).toBe(true);
    });

    it('shows on /memberships (not /m)', () => {
      mockState.pathname = '/memberships';
      const { result } = renderHook(() => useShouldShowMobileTabBar());
      expect(result.current).toBe(true);
    });
  });
});
