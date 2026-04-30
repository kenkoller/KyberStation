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
 * Vendor-reality captions for blade-length pickers across the app
 * (SaberWizard, HardwarePanel, BladeHardwarePanel).
 *
 * Captions reflect what real-world Neopixel saber vendors (Saberbay,
 * KR Sabers, 89sabers, Vader's Vault, Korbanth, etc.) actually sell:
 *
 *   - 20" — Shoto / Yoda — uncommon shoto-class blade for kid sabers,
 *           Yoda builds, or short combat blades.
 *   - 24" — Combat — short combat-style blade. Sold by most vendors.
 *   - 28" — Uncommon — unusual length. Most vendors jump from 24" to 32"
 *           directly. Listed for custom builds.
 *   - 32" — Medium — common medium combat blade. Sold by most vendors.
 *   - 36" — Standard — the de-facto standard Neopixel blade length and
 *           the most widely-sold option. One full WS2812B 1m strip
 *           ships at 144 LEDs/m, which is exactly this entry's count.
 *           Use this length unless you have a specific reason not to.
 *   - 40" — Extra Long — duelist / display preference. Sold by some
 *           vendors as an extra-long option.
 */
export const BLADE_LENGTH_CAPTIONS: Record<number, string> = {
  20: 'Shoto / Yoda (20")',
  24: 'Combat (24")',
  28: 'Uncommon (28")',
  32: 'Medium (32")',
  36: 'Standard (36")',
  40: 'Extra Long (40")',
};

/**
 * Vendor-reality boolean: is this blade length commonly sold by major
 * Neopixel saber vendors? `true` for 24"/32"/36"/40"; `false` for 20"
 * and 28" which exist but are niche. Used by the LED-count override
 * warning + (if a future picker wants) to mark uncommon entries.
 */
export const COMMON_BLADE_INCHES: ReadonlySet<number> = new Set([24, 32, 36, 40]);

/**
 * Derived array of blade-length options, sorted by inches.
 * Generated once at module load from `BLADE_LENGTH_PRESETS`.
 *
 * Add a new entry to `BLADE_LENGTH_PRESETS` and it shows up here
 * automatically — no new inline arrays. Labels come from
 * `BLADE_LENGTH_CAPTIONS` (vendor-reality captions); falls back
 * to the bare `id` (e.g. `'36"'`) if no caption is registered.
 */
export const BLADE_LENGTHS: readonly BladeLengthOption[] = Object.entries(
  BLADE_LENGTH_PRESETS,
)
  .map(([id, cfg]) => ({
    id,
    label: BLADE_LENGTH_CAPTIONS[cfg.inches] ?? id,
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

/**
 * Look up the canonical LED count for a given blade-inches value
 * by exact match. Returns `undefined` when the inches value isn't
 * in the canonical preset set (e.g. an unusual user input).
 *
 * Callers that need the LED-override divergence warning use this
 * to check `config.ledCount !== canonicalLedCountForInches(inferred)`.
 */
export function canonicalLedCountForInches(inches: number): number | undefined {
  return BLADE_LENGTHS.find((b) => b.inches === inches)?.ledCount;
}
