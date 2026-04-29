'use client';

// ─── GalleryAB — Sidebar A/B v2 Phase 4 (gallery) ──────────────────────
//
// Wrapper for the /gallery route's A/B layout. Owns:
//   1. The full filter state (era / faction / colorFamily / styleFamily /
//      continuity / search / shuffleSeed) — single source of truth, both
//      columns derive from it.
//   2. The currently-selected preset id. Defaults to the first preset in
//      the filtered list so Column B never lands on the empty state on
//      cold mount; falls back to the first if a filter change drops the
//      previously-selected preset out of the list.
//
// Reuses `MainContentABLayout` from the editor — purely visual chrome,
// nothing MainContent-specific. Sharing keeps the resize-handle width
// state consistent with the editor's column-A width so users get the
// same column ergonomics across surfaces.

import { useEffect, useMemo, useState } from 'react';
import { ALL_PRESETS } from '@kyberstation/presets';
import { MainContentABLayout } from '@/components/layout/MainContentABLayout';
import { GalleryColumnA } from './GalleryColumnA';
import { GalleryColumnB } from './GalleryColumnB';
import {
  DEFAULT_FILTERS,
  filterPresets,
  type GalleryFilters,
} from './galleryAB.types';

export function GalleryAB(): JSX.Element {
  const [filters, setFilters] = useState<GalleryFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterPresets(ALL_PRESETS, filters),
    [filters],
  );

  // Auto-select-first behavior — keeps Column B's hero detail populated
  // unless the filter set is empty. If the user's current selection is
  // still in the filtered set, we preserve it; otherwise we snap to the
  // first row so the next filter narrowing reads as "your view shifted"
  // rather than "your view emptied."
  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (
      selectedId === null ||
      !filtered.some((p) => p.id === selectedId)
    ) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selectedPreset =
    selectedId === null
      ? null
      : (filtered.find((p) => p.id === selectedId) ?? null);

  return (
    <MainContentABLayout
      columnA={
        <GalleryColumnA
          filters={filters}
          onFiltersChange={setFilters}
          filtered={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      }
      columnB={<GalleryColumnB preset={selectedPreset} />}
      resizeLabel="Preset list width"
    />
  );
}
