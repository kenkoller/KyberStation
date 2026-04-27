'use client';

// ─── MainContentABLayout — Sidebar A/B v2 wrapper (Phase 1) ───────────
//
// Generic wrapper for the new "list → details" pattern in the editor's
// MainContent area. When the active sidebar section provides a Column A
// list (e.g. 29 blade styles, 24 color presets, 19 ignitions, etc.),
// this component renders a 280px column-A list + a flex-1 column-B
// detail editor side-by-side, separated by a draggable resize handle.
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md`:
//   - Column A: 280px (resizable 220-400 via REGION_LIMITS.columnAWidth)
//   - Column B: flex-1 min-w-0 (fills remaining width)
//   - Below 1024px breakpoint, mobile fallback (Phase 3c) — for now
//     Phase 1 simply renders both stacked, A on top.
//
// Sections that don't provide a Column A list pass `columnA={null}` —
// the wrapper degrades to a single full-width Column B (no handle, no
// column-A region rendered). This matches the existing MainContent
// behavior so unmigrated sections render identically.
//
// Phase 1 ships this wrapper UN-CONSUMED. Phase 2 wraps `blade-style`
// (the largest payoff section) with the wrapper + a real Column A list.
// The `useABLayout` feature flag in uiStore gates the wrapper at the
// MainContent dispatch level so consumers don't need to branch.

import { type ReactNode } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { ResizeHandle } from '@/components/shared/ResizeHandle';
import { REGION_LIMITS } from '@/stores/uiStore';

export interface MainContentABLayoutProps {
  /**
   * Optional Column A list — typically a scrollable list of styles /
   * colors / ignitions / etc. with a search filter at top. Pass
   * `null` (or omit) for sections that don't have a list-of-things;
   * the wrapper will render full-width Column B.
   */
  columnA?: ReactNode | null;
  /**
   * Required Column B detail editor — renders the deep editor for
   * whichever Column A item is currently active.
   */
  columnB: ReactNode;
  /**
   * Optional descriptive label for the resize handle, surfaced to
   * screen readers. Defaults to "Column A width".
   */
  resizeLabel?: string;
}

/**
 * Shared wrapper. Reads `columnAWidth` from `uiStore` and writes via
 * `setColumnAWidth`. Single source of truth for the Column A / Column
 * B split — every A/B-migrated section consumes this rather than
 * implementing its own column math.
 */
export function MainContentABLayout({
  columnA,
  columnB,
  resizeLabel = 'Column A width',
}: MainContentABLayoutProps): JSX.Element {
  const columnAWidth = useUIStore((s) => s.columnAWidth);
  const setColumnAWidth = useUIStore((s) => s.setColumnAWidth);

  // Section opted out of A/B (single-panel pattern) — render Column B
  // at full width with no list, no handle. Same shape as legacy
  // MainContent for unmigrated sections.
  if (columnA == null) {
    return (
      <div data-mainab-layout="single" className="flex-1 min-w-0">
        {columnB}
      </div>
    );
  }

  const limits = REGION_LIMITS.columnAWidth;

  return (
    <div data-mainab-layout="split" className="flex flex-1 min-w-0 h-full">
      <aside
        data-mainab-column="a"
        aria-label="Section list"
        className="flex-shrink-0 overflow-hidden border-r border-border-subtle bg-bg-deep/40"
        style={{ width: columnAWidth }}
      >
        {columnA}
      </aside>
      <ResizeHandle
        orientation="horizontal"
        value={columnAWidth}
        min={limits.min}
        max={limits.max}
        defaultValue={limits.default}
        onChange={setColumnAWidth}
        ariaLabel={resizeLabel}
      />
      <section
        data-mainab-column="b"
        aria-label="Section detail"
        className="flex-1 min-w-0 overflow-hidden"
      >
        {columnB}
      </section>
    </div>
  );
}
