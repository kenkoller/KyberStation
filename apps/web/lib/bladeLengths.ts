// ─── Blade Lengths — single source of truth for the web app ───
//
// Derives every blade-length consumer (HardwarePanel, BladeHardwarePanel,
// BladeCanvas, SaberWizard, bladeRenderMetrics) from the engine's canonical
// `BLADE_LENGTH_PRESETS` map in `packages/engine/src/types.ts`.
//
// Why this lift exists:
//   The same blade-length table was previously inlined in five places.
//   In two of them (HardwarePanel, BladeHardwarePanel) the 36" entry
//   claimed 144 LEDs — a documented drift from the engine's 132. PR #96
//   fixed engine drift but missed those inline arrays. This module
//   removes the duplication entirely so future drift is impossible.
//
// Drift sentinel: `apps/web/tests/bladeLengths.test.ts` asserts that
// `BLADE_LENGTHS` and `BLADE_LENGTH_PRESETS` agree shape-by-shape, and
// that `inferBladeInches` is the reverse mapping for every preset's
// `ledCount`.

import { BLADE_LENGTH_PRESETS } from '@kyberstation/engine';

/**
 * UI-friendly shape: id (preset key, e.g. '36"'), human label,
 * inches, and ledCount. Sorted by inches ascending so picker UIs
 * render shortest -> longest without re-sorting.
 */
export interface BladeLengthOption {
  id: string;
  label: string;
  inches: number;
  ledCount: number;
}

/**
 * Derived array of blade-length options, sorted by inches.
 * Generated once at module load from `BLADE_LENGTH_PRESETS`.
 *
 * Add a new entry to `BLADE_LENGTH_PRESETS` and it shows up here
 * automatically — no new inline arrays.
 */
export const BLADE_LENGTHS: readonly BladeLengthOption[] = Object.entries(
  BLADE_LENGTH_PRESETS,
)
  .map(([id, cfg]) => ({
    id,
    label: id,
    inches: cfg.inches,
    ledCount: cfg.ledCount,
  }))
  .sort((a, b) => a.inches - b.inches);

/**
 * Reverse map: ledCount -> inches.
 *
 * Buckets each LED-count to the largest preset whose ledCount it does
 * NOT exceed (piecewise ladder). Counts above the longest preset round
 * down to the longest preset's inches.
 *
 * Examples (with the canonical 73/88/103/117/132/147 ladder):
 *   inferBladeInches(73)   -> 20
 *   inferBladeInches(74)   -> 24
 *   inferBladeInches(132)  -> 36   (NOT 40 — this is the drift fix)
 *   inferBladeInches(133)  -> 40
 *   inferBladeInches(1000) -> 40   (clamped to longest preset)
 */
export function inferBladeInches(ledCount: number): number {
  // Walk presets ascending; first one whose ledCount >= input wins.
  for (const opt of BLADE_LENGTHS) {
    if (ledCount <= opt.ledCount) {
      return opt.inches;
    }
  }
  // Above the longest preset: clamp to longest.
  const longest = BLADE_LENGTHS[BLADE_LENGTHS.length - 1];
  return longest ? longest.inches : 40;
}

/**
 * Convenience: human label for a given inch value, falling back to
 * `${inches}"` if no exact preset matches.
 */
export function bladeLengthLabel(inches: number): string {
  const exact = BLADE_LENGTHS.find((b) => b.inches === inches);
  return exact ? exact.label : `${inches}"`;
}
