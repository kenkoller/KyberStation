'use client';

// ─── MobileStatusBarStrip — Phase 4.2 (2026-04-30) ───────────────────────────
//
// Thin wrapper around the existing <StatusBar /> that activates its
// `scroll` mode. Per "Claude Design Mobile handoff/HANDOFF.md" §"Q3
// StatusBar":
//   - 36px tall (--statusbar-h token)
//   - Scrollable horizontal strip — every segment present, no
//     wide-only hiding
//   - Right-edge mask-image fade so the scroll affordance is visible
//   - Pinned at bottom of mobile shell, above iOS home-indicator gesture
//     area (caller adds env(safe-area-inset-bottom) padding)
//
// Single source of truth: the same StatusBar component drives both
// desktop (`mode="default"`) and mobile (`mode="scroll"`). Segment data
// computation is shared — no drift risk between the two surfaces.

import { StatusBar } from '@/components/layout/StatusBar';

export function MobileStatusBarStrip() {
  return <StatusBar mode="scroll" />;
}
