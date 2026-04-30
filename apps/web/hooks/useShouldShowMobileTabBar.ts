'use client';

import { usePathname } from 'next/navigation';

/**
 * Returns true if the global MobileTabBar should render.
 *
 * Background: per docs/mobile-design.md §2.2, the editor needs its
 * own combined bottom bar (section pill + Back-to-Canvas) and the
 * global MobileTabBar would visually overlap with it. Inside /editor
 * and any sub-route, this returns false; everywhere else it returns
 * true.
 *
 * The /m chrome-free mobile companion route also returns false
 * (matches the existing in-component check it had before this hook).
 *
 * Single source of truth — both `apps/web/app/layout.tsx`'s mount and
 * `MobileTabBar` itself can read from this hook so the visibility
 * rules can't drift.
 */
export function useShouldShowMobileTabBar(): boolean {
  const pathname = usePathname();
  // Hide on the editor (in-editor bottom bar takes over) and on /m
  // (chrome-free mobile companion). Show on all other routes.
  if (!pathname) return true;
  if (pathname === '/m' || pathname.startsWith('/m/')) return false;
  if (pathname === '/editor' || pathname.startsWith('/editor/')) return false;
  return true;
}
