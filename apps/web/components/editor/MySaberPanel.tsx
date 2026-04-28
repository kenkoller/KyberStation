'use client';

// ─── MySaberPanel — Sidebar IA reorganization (2026-04-27) ──────────────────
//
// Phase 1 wrapper that promotes `SaberProfileManager` out of its previous
// home as a default-collapsed accordion at the bottom of OutputPanel into
// its own first-class sidebar section under the new SETUP group.
//
// This is a relocation, not a rewrite. The audit recommends a future
// expansion that absorbs hardware fields (blade length, board, LED count,
// brightness) directly into the profile object so capture happens in one
// place — see docs/SIDEBAR_IA_AUDIT_2026-04-27.md §7. For tonight, we only
// move the existing manager so it stops being buried.

import { SaberProfileManager } from './SaberProfileManager';

export function MySaberPanel() {
  return (
    <div className="p-4 overflow-y-auto h-full">
      <SaberProfileManager />
    </div>
  );
}
