'use client';

// ─── IgnitionRetractionAB — Phase 3 mounting wrapper ───────────────────
//
// Owns the local Ignition / Retraction tab state and threads it into
// both Column A (which renders the tab buttons) and Column B (which
// reads it to drive the speed / easing / custom-curve UI). Mounted by
// MainContent inside MainContentABLayout when the active sidebar
// section is `ignition-retraction` AND useABLayout is true.

import { useState } from 'react';
import { MainContentABLayout } from '@/components/layout/MainContentABLayout';
import { IgnitionRetractionColumnA } from './IgnitionRetractionColumnA';
import { IgnitionRetractionColumnB } from './IgnitionRetractionColumnB';
import {
  DEFAULT_IGNITION_RETRACTION_TAB,
  type IgnitionRetractionTab,
} from './tabState';

export function IgnitionRetractionAB(): JSX.Element {
  const [activeTab, setActiveTab] = useState<IgnitionRetractionTab>(
    DEFAULT_IGNITION_RETRACTION_TAB,
  );

  return (
    <MainContentABLayout
      columnA={
        <IgnitionRetractionColumnA
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      }
      columnB={<IgnitionRetractionColumnB activeTab={activeTab} />}
      resizeLabel="Animation list width"
    />
  );
}
