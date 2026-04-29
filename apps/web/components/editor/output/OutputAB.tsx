'use client';

// ─── OutputAB — Sidebar A/B v2 Phase 4f wrapper ────────────────────────
//
// Owns the local `activeStep` state and threads it into both columns.
// Mounted by MainContent inside MainContentABLayout when the active
// sidebar section is `output` AND useABLayout is true.
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.9, the output surface is
// a multi-step pipeline rather than a list-of-things. Column A is a
// vertical stepper indicating which step the user is on; Column B
// mounts the active step's body (one of: <CodeOutput />,
// <ConfigSummary />, <OLEDPreview />, <CardWriter />, <FlashPanel />).
//
// Selection state is intentionally NOT persisted — it's a transient
// "where am I in the pipeline" cursor. Mirrors `RoutingAB` /
// `IgnitionRetractionAB` / `CombatEffectsAB` patterns.
//
// Default selection: first step in the canonical OUTPUT_STEPS array
// (currently `generate-code`). Switching is purely a Column A click /
// keyboard event; there's no auto-advance because the steps are not
// strictly sequential — users may want to flash without exporting,
// or preview the OLED multiple times.

import { useState } from 'react';
import { MainContentABLayout } from '@/components/layout/MainContentABLayout';
import { OutputColumnA } from './OutputColumnA';
import { OutputColumnB } from './OutputColumnB';
import { DEFAULT_OUTPUT_STEP, type OutputStepId } from './outputCatalog';

export function OutputAB(): JSX.Element {
  const [activeStep, setActiveStep] = useState<OutputStepId>(DEFAULT_OUTPUT_STEP);

  return (
    <MainContentABLayout
      columnA={
        <OutputColumnA activeStep={activeStep} onSelect={setActiveStep} />
      }
      columnB={<OutputColumnB activeStep={activeStep} />}
      resizeLabel="Pipeline step list width"
    />
  );
}
