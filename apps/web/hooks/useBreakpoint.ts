'use client';
import { useState, useEffect } from 'react';

export type Breakpoint = 'phone' | 'tablet' | 'desktop' | 'wide';

export function getBreakpoint(width: number): Breakpoint {
  if (width < 600) return 'phone';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'desktop';
  return 'wide';
}

/**
 * Read the current viewport breakpoint synchronously when we're on the client.
 * Falls back to `'desktop'` on the server (which also keeps SSR markup stable:
 * the desktop branch renders WorkbenchLayout, matching the most common client
 * viewport for this app). See P16-001: SSR → CSR hydration with `useEffect`
 * allowed a brief window where a stale or transiently-wrong innerWidth was
 * persisted as mobile state after a full-page navigation.
 */
export function readBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';
  return getBreakpoint(window.innerWidth);
}

export function useBreakpoint() {
  // Lazy initializer: read window.innerWidth synchronously on first CSR render
  // so the initial commit already reflects the real viewport, rather than
  // mounting with a default and only correcting inside a post-paint effect.
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(readBreakpoint);

  useEffect(() => {
    // Re-sync once after mount in case the lazy init ran before the viewport
    // was fully measured (e.g. hydration mid-navigation) and subscribe to
    // resize events.
    const check = () => setBreakpoint(getBreakpoint(window.innerWidth));
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'phone',
    isTablet: breakpoint === 'tablet',
    isWide: breakpoint === 'wide',
  };
}

/** Backward-compatible wrapper */
export function useIsMobile(breakpoint = 600) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}
