'use client';

// ─── MySaberColumnB — Sidebar A/B v2 Phase 4c ───────────────────────────
//
// Column B: deep editor for the saber profile selected in Column A. Per
// `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.7 it shows ProfileHero +
// BladeSpecsBlock + ButtonMapBlock + EquippedStyleBlock +
// EquippedFontBlock + Card config CRUD — all of which already exist
// inside the legacy `SaberProfileManager` and are wired to the same
// `saberProfileStore` actions Column A uses to switch profiles.
//
// We mount `<SaberProfileManager />` whole rather than extracting its
// blocks: every helper component (ProfileHero, BladeSpecsBlock, etc.)
// is file-private, and the prompt explicitly authorises the "mount
// whole" path when sub-blocks aren't exported. This also keeps the
// off-flag fallback (legacy `MySaberPanel`, which itself is just a
// wrapper around `SaberProfileManager`) and the on-flag A/B path
// rendering byte-for-byte the same character-sheet UI — so flipping
// `useABLayout` doesn't change what a user sees inside the editor area
// itself; only the surrounding chrome (Column A list, header) changes.

import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { SaberProfileManager } from '../SaberProfileManager';

export function MySaberColumnB(): JSX.Element {
  // Pull the active profile name for the sticky header so users can see
  // which profile they're editing without scrolling. Falls back to the
  // generic "My Saber" label when no profile is selected (empty state
  // before the user clicks + New Profile in Column A).
  const profiles = useSaberProfileStore((s) => s.profiles);
  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;
  const headerLabel = activeProfile?.name ?? 'My Saber';

  return (
    <div className="flex flex-col h-full" data-testid="my-saber-column-b">
      {/* Sticky header — name of whichever profile is active. Mirrors
          the existing MainContent panel-header style for consistency. */}
      <header
        className="px-4 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0"
        data-testid="my-saber-column-b-header"
      >
        <div className="flex items-baseline gap-3">
          <h3 className="font-mono uppercase text-ui-sm tracking-[0.10em] text-text-primary truncate">
            {headerLabel}
          </h3>
          {activeProfile?.chassisType && (
            <span className="text-ui-xs text-text-muted truncate">
              {activeProfile.chassisType}
            </span>
          )}
        </div>
      </header>

      {/* Scrollable body. SaberProfileManager renders its own panel
          chrome (the `bg-bg-surface rounded-panel border …` blocks),
          plus the Card Preset composer, plus the empty-state when
          `profiles.length === 0`. Wrapping in `p-3` matches the
          legacy MySaberPanel's outer padding so the migration is
          visually transparent. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <SaberProfileManager />
      </div>
    </div>
  );
}
