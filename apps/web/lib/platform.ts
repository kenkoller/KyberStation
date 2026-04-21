'use client';
import { useEffect, useState } from 'react';

/**
 * SSR-safe macOS detection. Returns `false` during SSR and on non-Mac
 * clients; flips to `true` on client mount when `navigator.platform`
 * matches Mac / iPhone / iPad.
 *
 * The initial-render false keeps SSR and first client render aligned, so
 * Ctrl+K appears momentarily on a Mac before correcting to ⌘K once the
 * effect runs. For platform-sensitive kbd chips that's the right trade —
 * no hydration mismatch, and the flip is imperceptible in practice.
 */
export function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    }
  }, []);
  return isMac;
}

/**
 * Returns the modifier-key symbol + separator for the current platform.
 * Mac uses bare `⌘K`; other platforms use `Ctrl+K`.
 */
export function useMetaKey(): { symbol: string; sep: string } {
  const isMac = useIsMac();
  return isMac ? { symbol: '⌘', sep: '' } : { symbol: 'Ctrl', sep: '+' };
}

/**
 * Convenience: format a modifier chord for the current platform.
 * Examples: `useKbd('K')` → `⌘K` on Mac, `Ctrl+K` on Windows / Linux.
 */
export function useKbd(key: string): string {
  const { symbol, sep } = useMetaKey();
  return `${symbol}${sep}${key}`;
}
