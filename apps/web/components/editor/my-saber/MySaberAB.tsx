'use client';

// ─── MySaberAB — Sidebar A/B v2 Phase 4c ────────────────────────────────
//
// Wrapper that mounts a list-of-profiles in Column A and the selected
// profile's character-sheet hero in Column B, replacing the legacy
// single-panel `MySaberPanel` when `useABLayout` is on AND the active
// section is `my-saber`.
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.7, Column A is the saved
// Saber Profile list (each row: mini blade preview + name + chassis +
// LED count, with a "+ New Profile" button at the top); Column B is the
// existing `SaberProfileManager` character sheet for whichever profile
// is active.
//
// Why mount the legacy `SaberProfileManager` whole into Column B
// (vs. extracting its blocks into bespoke files for Column B):
//
//   1. Every block the spec calls for (ProfileHero, BladeSpecsBlock,
//      ButtonMapBlock, EquippedStyleBlock, EquippedFontBlock, card
//      composer + CRUD) is already correctly implemented and bound
//      to the existing store actions inside `SaberProfileManager`.
//      The blocks are file-private — extracting them would either
//      force an export refactor on the legacy component (risk: ripples
//      through the off-flag fallback) or duplicate ~1100 lines of
//      tested logic into the A/B section.
//   2. The Phase 4c prompt explicitly authorises the "mount whole"
//      path when sub-blocks aren't exported.
//   3. Column A becomes the canonical list-and-select surface; the
//      embedded ProfileTabStrip inside SaberProfileManager is now
//      redundant when there are 0 or 1 profiles, but harmless when
//      there's >1 — it stays as a secondary shortcut while Column A
//      is the primary affordance. Removing the strip here would mean
//      modifying the legacy component, which is out-of-scope for this
//      phase.
//
// State source of truth: `useSaberProfileStore` provides the profile
// list and the active profile id. Column A reads + writes via
// switchProfile / createProfile. Column B reads the same store in
// `SaberProfileManager` as it always has — flipping `activeProfileId`
// from Column A automatically rerenders the character sheet in B.

import { MainContentABLayout } from '@/components/layout/MainContentABLayout';
import { MySaberColumnA } from './MySaberColumnA';
import { MySaberColumnB } from './MySaberColumnB';

export function MySaberAB(): JSX.Element {
  return (
    <MainContentABLayout
      columnA={<MySaberColumnA />}
      columnB={<MySaberColumnB />}
      resizeLabel="Profile list width"
    />
  );
}
