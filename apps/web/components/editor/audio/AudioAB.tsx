'use client';

// ─── AudioAB — Sidebar A/B v2 Phase 4d mounting wrapper ────────────────
//
// Mounted by MainContent inside MainContentABLayout when the active
// sidebar section is `audio` AND useABLayout is true.
//
// Unlike `IgnitionRetractionAB`, the audio surface has no transient
// "which item is selected but not yet committed" cursor — the
// audioFontStore's `fontName` slot doubles as the selection state and
// the loaded-into-the-engine state. Clicking a font in Column A loads
// it; both columns subscribe to `fontName` directly and re-render in
// sync. So this wrapper is a thin pass-through to MainContentABLayout
// rather than the prop-drilling shape ignition-retraction needs.
//
// The Column B sub-tab (events / mixer / presets / sequencer) is
// owned in `AudioColumnB`'s local state — it's a within-column view
// filter, not selection state shared across columns.

import { MainContentABLayout } from '@/components/layout/MainContentABLayout';
import { AudioColumnA } from './AudioColumnA';
import { AudioColumnB } from './AudioColumnB';

export function AudioAB(): JSX.Element {
  return (
    <MainContentABLayout
      columnA={<AudioColumnA />}
      columnB={<AudioColumnB />}
      resizeLabel="Font list width"
    />
  );
}
