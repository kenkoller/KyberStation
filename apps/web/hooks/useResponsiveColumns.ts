'use client';

import { useState, useEffect, useRef } from 'react';
import { useLayoutStore } from '@/stores/layoutStore';

// ─── Breakpoint thresholds (mirror tailwind.config.ts) ───────────────────────
// wide:    ≥ 1440px → 4 columns
// desktop: ≥ 1200px → 3 columns  (intermediate, not a named TW screen)
// tablet:  ≥ 1024px → 2 columns
// below:    < 1024px → 1 column

const BREAKPOINTS = [
  { minWidth: 1440, columns: 4 },
  { minWidth: 1200, columns: 3 },
  { minWidth: 1024, columns: 2 },
  { minWidth: 0,    columns: 1 },
] as const;

type ColumnCount = 1 | 2 | 3 | 4;

/** Derive column count from a raw pixel width. */
function widthToColumns(width: number): ColumnCount {
  for (const bp of BREAKPOINTS) {
    if (width >= bp.minWidth) return bp.columns as ColumnCount;
  }
  return 1;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useResponsiveColumns
 *
 * Monitors viewport width and drives the layout store's `columnCount` to
 * reflect the current breakpoint:
 *
 *   ≥ 1440px  →  4 columns  (wide)
 *   ≥ 1200px  →  3 columns  (mid-desktop)
 *   ≥ 1024px  →  2 columns  (desktop)
 *   < 1024px  →  1 column   (tablet / phone)
 *
 * Uses `window.matchMedia` listeners at each boundary (fires only on
 * crossings — no polling), with a 100 ms debounce guard to prevent
 * layout thrashing during rapid resize.
 *
 * SSR-safe: returns 4 while `window` is undefined.
 *
 * @returns The current responsive column count.
 */
export function useResponsiveColumns(): ColumnCount {
  const setColumnCount = useLayoutStore((s) => s.setColumnCount);

  // SSR default: 4 columns (wide desktop assumed for server render)
  const [columns, setColumns] = useState<ColumnCount>(() => {
    if (typeof window === 'undefined') return 4;
    return widthToColumns(window.innerWidth);
  });

  // Stable ref so the MediaQueryList callbacks always see the latest setter
  // without needing to be recreated.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    /** Apply a new column count, debounced at 100 ms. */
    function apply(width: number) {
      const next = widthToColumns(width);
      if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setColumns(next);
        setColumnCount(next);
        debounceTimer.current = null;
      }, 100);
    }

    // Create a MediaQueryList for each boundary and listen to changes.
    // Each MQL fires only when its condition flips, so we derive the column
    // count from the actual window width at that moment (widthToColumns).
    const queries = BREAKPOINTS.filter((bp) => bp.minWidth > 0).map((bp) => {
      const mql = window.matchMedia(`(min-width: ${bp.minWidth}px)`);
      const handler = () => apply(window.innerWidth);
      mql.addEventListener('change', handler);
      return { mql, handler };
    });

    // Sync immediately on mount in case window size changed between SSR and hydration.
    apply(window.innerWidth);

    return () => {
      // Remove all MQL listeners
      for (const { mql, handler } of queries) {
        mql.removeEventListener('change', handler);
      }
      // Cancel any pending debounce
      if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    };
  }, [setColumnCount]);

  return columns;
}
