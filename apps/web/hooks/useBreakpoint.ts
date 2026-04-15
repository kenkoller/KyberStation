'use client';
import { useState, useEffect } from 'react';

export type Breakpoint = 'phone' | 'tablet' | 'desktop' | 'wide';

function getBreakpoint(width: number): Breakpoint {
  if (width < 600) return 'phone';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'desktop';
  return 'wide';
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}
