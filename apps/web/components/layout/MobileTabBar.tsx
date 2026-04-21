'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

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
 *  - Hidden on `/m` entirely — `/m` is the chrome-free mobile
 *    companion and a bottom bar would contradict its minimal intent.
 */
function MobileTabBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // /m is intentionally chrome-free — preset browser + Ignite + swipe.
  // Bottom nav would fight the minimalist mode per UX spec.
  if (pathname === '/m') return null;

  const TABS = [
    { href: '/m',                  label: 'Saber',   icon: '✦', match: () => pathname === '/m' },
    { href: '/editor',             label: 'Editor',  icon: '⚒', match: () => pathname === '/editor' && tabParam !== 'gallery' },
    { href: '/editor?tab=gallery', label: 'Gallery', icon: '◩', match: () => pathname === '/editor' && tabParam === 'gallery' },
    { href: '/docs',               label: 'Docs',    icon: '?', match: () => pathname === '/docs' },
  ] as const;

  return (
    <nav
      className="phone:flex hidden fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-bg-deep/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Primary"
    >
      <ul className="flex w-full" role="tablist">
        {TABS.map((tab) => {
          const active = tab.match();
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                role="tab"
                aria-current={active ? 'page' : undefined}
                aria-selected={active}
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
