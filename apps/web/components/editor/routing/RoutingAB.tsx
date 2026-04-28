'use client';

// ─── RoutingAB — Sidebar A/B v2 Phase 4e wrapper ───────────────────────
//
// Owns the local "selected binding id" state and threads it into both
// columns. Mounted by MainContent inside MainContentABLayout when the
// active sidebar section is `routing` AND useABLayout is true.
//
// Selection state is intentionally NOT persisted: it's a transient
// "where am I looking right now" cursor, not a config value. Mirrors
// `IgnitionRetractionAB`'s tab-state shape and `CombatEffectsAB`'s
// selection shape.
//
// Default selection is `null` → Column B shows the AddBindingForm /
// empty-state hint. Clicking a binding row in Column A writes the id;
// clicking "+ New Binding" clears it back to null.

import { useState } from 'react';
import { MainContentABLayout } from '@/components/layout/MainContentABLayout';
import { RoutingColumnA } from './RoutingColumnA';
import { RoutingColumnB } from './RoutingColumnB';

export function RoutingAB(): JSX.Element {
  const [selectedBindingId, setSelectedBindingId] = useState<string | null>(null);

  return (
    <MainContentABLayout
      columnA={
        <RoutingColumnA
          selectedBindingId={selectedBindingId}
          onSelect={setSelectedBindingId}
        />
      }
      columnB={
        <RoutingColumnB
          selectedBindingId={selectedBindingId}
          onClearSelection={() => setSelectedBindingId(null)}
        />
      }
      resizeLabel="Binding list width"
    />
  );
}
