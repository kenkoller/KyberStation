export type { Era, Affiliation, PresetTier, PresetMetadata, Preset, PresetConfig } from './types.js';

export { PREQUEL_ERA_PRESETS } from './characters/prequel-era.js';
export { ORIGINAL_TRILOGY_PRESETS } from './characters/original-trilogy.js';
export { SEQUEL_ERA_PRESETS } from './characters/sequel-era.js';
export { ANIMATED_SERIES_PRESETS } from './characters/animated-series.js';
export { EXTENDED_UNIVERSE_PRESETS } from './characters/extended-universe.js';
export { LEGENDS_PRESETS } from './characters/legends.js';
export { CREATIVE_COMMUNITY_PRESETS } from './characters/creative-community.js';
export { SHOWCASE_PRESETS } from './characters/showcase.js';
export { POP_CULTURE_PRESETS } from './characters/pop-culture/index.js';
export {
  LOTR_PRESETS,
  MYTHOLOGY_PRESETS,
  MARVEL_PRESETS,
  DC_PRESETS,
  ZELDA_PRESETS,
  FINAL_FANTASY_PRESETS,
  ANIME_PRESETS,
  KIDS_CARTOONS_PRESETS,
  POWER_RANGERS_PRESETS,
  ADULT_ANIMATION_PRESETS,
  MASCOT_PRESETS,
} from './characters/pop-culture/index.js';

export type { CardTemplate, CardTemplateEntry } from './templates/card-templates.js';
export {
  CARD_TEMPLATES,
  ORIGINAL_TRILOGY_ESSENTIALS,
  PREQUEL_COLLECTION,
  DARK_SIDE_PACK,
  DUELING_MINIMALIST,
} from './templates/card-templates.js';

// ─── Modulation Routing Recipes (v1.0 Preview) ───────────────────────
// Five starter recipes that seed the Gallery's Routing BETA section.
// See `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md` §3.1.
export type {
  ModulationRecipe,
  SerializedBinding as RecipeSerializedBinding,
  RecipeModulatorId,
  RecipeBindingCombinator,
} from './recipes/modulation/index.js';
export {
  MODULATION_RECIPES,
  REACTIVE_SHIMMER_RECIPE,
  SOUND_REACTIVE_MUSIC_RECIPE,
  ANGLE_REACTIVE_TIP_RECIPE,
  CLASH_FLASH_WHITE_RECIPE,
  TWIST_DRIVES_HUE_RECIPE,
  BREATHING_BLADE_RECIPE,
} from './recipes/modulation/index.js';

import type { Preset } from './types.js';
import { PREQUEL_ERA_PRESETS } from './characters/prequel-era.js';
import { ORIGINAL_TRILOGY_PRESETS } from './characters/original-trilogy.js';
import { SEQUEL_ERA_PRESETS } from './characters/sequel-era.js';
import { ANIMATED_SERIES_PRESETS } from './characters/animated-series.js';
import { EXTENDED_UNIVERSE_PRESETS } from './characters/extended-universe.js';
import { LEGENDS_PRESETS } from './characters/legends.js';
import { CREATIVE_COMMUNITY_PRESETS } from './characters/creative-community.js';
import { SHOWCASE_PRESETS } from './characters/showcase.js';
import { POP_CULTURE_PRESETS } from './characters/pop-culture/index.js';

/**
 * All character presets combined into a single array.
 */
export const ALL_PRESETS: Preset[] = [
  ...PREQUEL_ERA_PRESETS,
  ...ORIGINAL_TRILOGY_PRESETS,
  ...SEQUEL_ERA_PRESETS,
  ...ANIMATED_SERIES_PRESETS,
  ...EXTENDED_UNIVERSE_PRESETS,
  ...LEGENDS_PRESETS,
  ...CREATIVE_COMMUNITY_PRESETS,
  ...SHOWCASE_PRESETS,
  ...POP_CULTURE_PRESETS,
];

// ─── Canonical-preset detection ───────────────────────────────────────
//
// A preset is "canonical" when it's drawn from on-screen film/show
// reference: `screenAccurate === true` AND `(continuity ?? 'canon') ===
// 'canon'`. Pop-culture, legends, mythology, and creative-community
// presets are NOT canon by this definition (they may be on-screen in
// their own universe, but we use 'canon' as Star-Wars-canon-only here).
//
// Used by the Kyber Glyph encoder to assign the `CNO` archetype prefix
// to canon-config glyphs (cleaner sharing than name-based regex).

/**
 * Build a name match key by lowercasing + stripping every non-alphanumeric
 * character. Used to fuzz-match BladeConfig.name (which often comes through
 * as `'ObiWanANH'` from the engine) against preset.name (`'Obi-Wan Kenobi
 * (ANH)'`) or preset.config.name (`'ObiWanANH'`).
 */
function normalizePresetNameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Pre-compute normalized keys for every canon preset so detection is
// O(1) per call rather than O(n*string-ops).
const CANON_PRESET_KEYS = (() => {
  const keys = new Set<string>();
  for (const preset of ALL_PRESETS) {
    if (preset.screenAccurate !== true) continue;
    if ((preset.continuity ?? 'canon') !== 'canon') continue;
    // Match by either the outer preset.name or the inner config.name.
    keys.add(normalizePresetNameKey(preset.name));
    if (typeof preset.config.name === 'string') {
      keys.add(normalizePresetNameKey(preset.config.name));
    }
  }
  return keys;
})();

/**
 * Returns true when `config` looks like one of the app's shipped canon
 * presets — `screenAccurate === true` AND continuity is canon. The
 * BladeConfig only carries identifying metadata via its `name` field, so
 * detection is name-based: normalizes the config's `name` and checks it
 * against the pre-computed canon name set.
 *
 * Edge cases:
 *   - Empty / missing `name` → returns false.
 *   - The 89 pop-culture presets shipped in v0.15.0 (LOTR, Marvel, etc.)
 *     correctly return false because their `continuity` is not 'canon'.
 *   - User-edited configs whose name still matches (e.g. 'Obi-Wan ANH'
 *     with a custom color) still return true — this is intentional, the
 *     archetype prefix is a sharing hint, not a fingerprint.
 */
export function isCanonicalPresetConfig(config: { name?: string }): boolean {
  if (typeof config.name !== 'string' || config.name.length === 0) return false;
  const key = normalizePresetNameKey(config.name);
  if (key.length === 0) return false;
  return CANON_PRESET_KEYS.has(key);
}
