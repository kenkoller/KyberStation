'use client';

// ─── CombatEffectsAB — Phase 4 mounting wrapper ────────────────────────
//
// Owns the local "selected effect / GENERAL row" state and threads it
// into both Column A (which renders the list) and Column B (which
// reads it to drive the deep-editor view). Mounted by MainContent
// inside MainContentABLayout when the active sidebar section is
// `combat-effects` AND useABLayout is true.
//
// Selection state is intentionally NOT persisted: it's a transient
// "where am I looking right now" filter, not a config value. Mirrors
// `IgnitionRetractionAB`'s tab-state shape for consistency.
//
// The `triggerEffect` / `releaseEffect` props are forwarded from
// WorkbenchLayout's `useBladeEngine()` instance via MainContent —
// Column B uses them for the per-effect Trigger button. Calling
// `useBladeEngine()` here directly would spawn a second engine
// (its `useRef` initializes a new BladeEngine per call) and double-tick.

import { useState } from 'react';
import { MainContentABLayout } from '@/components/layout/MainContentABLayout';
import { CombatEffectsColumnA } from './CombatEffectsColumnA';
import { CombatEffectsColumnB } from './CombatEffectsColumnB';
import {
  DEFAULT_COMBAT_EFFECT_ID,
  type CombatEffectRowId,
} from './effectCatalog';

export interface CombatEffectsABProps {
  triggerEffect?: (type: string) => void;
  releaseEffect?: (type: string) => void;
}

export function CombatEffectsAB({
  triggerEffect,
  releaseEffect,
}: CombatEffectsABProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<CombatEffectRowId>(
    DEFAULT_COMBAT_EFFECT_ID,
  );

  return (
    <MainContentABLayout
      columnA={
        <CombatEffectsColumnA selectedId={selectedId} onSelect={setSelectedId} />
      }
      columnB={
        <CombatEffectsColumnB
          selectedId={selectedId}
          triggerEffect={triggerEffect}
          releaseEffect={releaseEffect}
        />
      }
      resizeLabel="Effect list width"
    />
  );
}
