'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { useShouldShowMobileTabBar } from '@/hooks/useShouldShowMobileTabBar';

/**
 * MobileTabBar — route-level navigation for phone viewport.
 *
 * UX North Star alignment:
 *  - §5 house style: flat, calm, dark-by-default chrome. No shadcn
 *    pill, no colorful gradient — flat text labels with a thin
 *    accent indicator for the active tab.
 *  - §6: Inter chrome + JetBrains Mono for the icons/glyphs (which
 *    look cleaner in a geometric mono than in Inter). 44×44 minimum
 *    touch target per WCAG 2.5.5.
 *  - §3 anti-refs: not a Notion or ChatGPT-desktop chrome overlay —
 *    this is a native-app-register bottom nav, not a web-SaaS chrome.
 *
 * Visibility:
 *  - Rendered only at phone breakpoint (< 600px) via `phone:flex
 *    hidden` Tailwind classes. Tablet + desktop already have richer
 *    navigation surfaces (TabletShell + WorkbenchLayout header).
 *  - Hidden on `/m` (chrome-free mobile companion) and `/editor`
 *    (per docs/mobile-design.md §2.2 — the editor's MobileShell owns
 *    its own combined bottom bar). Both checks are owned by
 *    `useShouldShowMobileTabBar` so visibility rules stay in one
 *    place.
 */
function MobileTabBarInner() {
  const pathname = usePathname();
  const shouldShow = useShouldShowMobileTabBar();

  // /m and /editor (and sub-routes) are excluded by the hook. /editor
  // hosts MobileShell's own combined Back-to-Canvas + section bar.
  if (!shouldShow) return null;

  const TABS = [
    { href: '/m',       label: 'Saber',   icon: '✦', match: () => pathname === '/m' },
    { href: '/editor',  label: 'Editor',  icon: '⚒', match: () => pathname === '/editor' },
    { href: '/gallery', label: 'Gallery', icon: '◩', match: () => pathname === '/gallery' },
    { href: '/docs',    label: 'Docs',    icon: '?', match: () => pathname === '/docs' },
  ] as const;

  return (
    <nav
      className="phone:flex hidden fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-bg-deep/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Primary"
    >
      {/* Semantic route nav, NOT an ARIA tablist — the outer <nav> +
          aria-current="page" handle selection-aware a11y without the
          tablist's strict parent/child role constraints. Previously
          this used role="tablist" + role="tab" which failed axe rules
          aria-required-children / aria-required-parent (the <li> in
          between isn't a valid parent-of-tab). Switched to plain
          list markup with aria-current for the active state. */}
      <ul className="flex w-full">
        {TABS.map((tab) => {
          const active = tab.match();
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5 transition-colors ${
                  active
                    ? 'text-accent'
                    : 'text-text-muted hover:text-text-secondary active:text-text-primary'
                }`}
              >
                <span className="font-mono text-base leading-none" aria-hidden="true">{tab.icon}</span>
                <span className="font-sans text-[10px] tracking-wider uppercase leading-none">{tab.label}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-[2px] w-8 rounded-b bg-accent"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Suspense boundary required because `useSearchParams()` must be wrapped
 * for static export (Next 14 output: 'export').
 */
export function MobileTabBar() {
  return (
    <Suspense fallback={null}>
      <MobileTabBarInner />
    </Suspense>
  );
}
