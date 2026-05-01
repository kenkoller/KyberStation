// ─── Gallery A/B shared types + filter helpers ─────────────────────────
//
// Single source of truth for the GalleryAB filter shape + the pure
// filtering function. Lives next to GalleryAB.tsx so the wrapper, both
// columns, and the contract test can import from one place without a
// circular dep through the column files.
//
// The filter shape extends what GalleryPage already had pre-A/B (era /
// faction / colorFamily / styleFamily / search / shuffleSeed) with one
// new dimension — `continuity` — to surface the `preset.continuity`
// metadata that the audit doc and CLAUDE.md call out as the
// authoritative filter for canon vs legends vs pop-culture.
//
// Filtering is pure: same inputs → same outputs, no Date, no Math.random
// (shuffle uses a deterministic LCG seeded by `shuffleSeed`).

import type { Preset } from '@kyberstation/presets';
import {
  classifyColorFamily,
  classifyStyleFamily,
  type ColorFamily,
  type StyleFamily,
} from '@/lib/galleryFilters';

export type EraFilter = Preset['era'] | 'all';
export type FactionFilter = Preset['affiliation'] | 'all';
export type ColorFilter = ColorFamily | 'all';
export type StyleFilter = StyleFamily | 'all';
export type ContinuityFilter =
  | 'all'
  | 'canon'
  | 'legends'
  | 'pop-culture'
  | 'mythology'
  | 'showcase'
  | 'creative';

/**
 * Set of continuity buckets considered "Star-Wars-themed" for the
 * Star-Wars-only toggle. Includes Disney canon + Legends EU + the
 * KyberStation creative-community originals (which are mostly
 * Star-Wars-themed). Excludes pop-culture tributes (LOTR / Marvel /
 * etc.), real-world mythology, and showcase tech demos.
 */
export const STAR_WARS_CONTINUITIES: ReadonlySet<ContinuityFilter> = new Set([
  'canon',
  'legends',
  'creative',
]);

export interface GalleryFilters {
  era: EraFilter;
  faction: FactionFilter;
  colorFamily: ColorFilter;
  styleFamily: StyleFilter;
  continuity: ContinuityFilter;
  /**
   * When true, hide all pop-culture / mythology / showcase entries from
   * the grid. The user is purist-mode: only Star Wars (canon + legends
   * + Star-Wars-themed creative variations) are shown.
   */
  starWarsOnly: boolean;
  search: string;
  /**
   * Deterministic shuffle seed; `null` means "default authoring order".
   * When non-null, the same value across renders produces the same
   * permutation — the user clicking Shuffle again rotates the seed.
   */
  shuffleSeed: number | null;
}

export const DEFAULT_FILTERS: GalleryFilters = {
  era: 'all',
  faction: 'all',
  colorFamily: 'all',
  styleFamily: 'all',
  continuity: 'all',
  starWarsOnly: false,
  search: '',
  shuffleSeed: null,
};

/**
 * Effective continuity for a preset. `preset.continuity` is optional;
 * undefined means canon by convention (per `Preset.continuity`'s docstring).
 */
export function presetContinuity(preset: Preset): ContinuityFilter {
  return preset.continuity ?? 'canon';
}

/** Pure filter — used by both the wrapper and tests. */
export function filterPresets(
  presets: readonly Preset[],
  filters: GalleryFilters,
): Preset[] {
  const search = filters.search.trim().toLowerCase();
  const base = presets.filter((p) => {
    if (filters.era !== 'all' && p.era !== filters.era) return false;
    if (filters.faction !== 'all' && p.affiliation !== filters.faction) {
      return false;
    }
    if (
      filters.colorFamily !== 'all' &&
      classifyColorFamily(p.config.baseColor) !== filters.colorFamily
    ) {
      return false;
    }
    if (
      filters.styleFamily !== 'all' &&
      classifyStyleFamily(p.config.style) !== filters.styleFamily
    ) {
      return false;
    }
    if (
      filters.continuity !== 'all' &&
      presetContinuity(p) !== filters.continuity
    ) {
      return false;
    }
    if (filters.starWarsOnly && !STAR_WARS_CONTINUITIES.has(presetContinuity(p))) {
      return false;
    }
    if (search) {
      const haystack = [p.name, p.character, p.description ?? '']
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  if (filters.shuffleSeed === null) return base;

  // Fisher–Yates with a seeded LCG — same seed produces the same order
  // across re-renders until the user clicks Shuffle again.
  const out = [...base];
  let seed = filters.shuffleSeed;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
