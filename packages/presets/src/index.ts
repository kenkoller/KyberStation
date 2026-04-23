export type { Era, Affiliation, PresetTier, PresetMetadata, Preset, PresetConfig } from './types.js';

export { PREQUEL_ERA_PRESETS } from './characters/prequel-era.js';
export { ORIGINAL_TRILOGY_PRESETS } from './characters/original-trilogy.js';
export { SEQUEL_ERA_PRESETS } from './characters/sequel-era.js';
export { ANIMATED_SERIES_PRESETS } from './characters/animated-series.js';
export { EXTENDED_UNIVERSE_PRESETS } from './characters/extended-universe.js';
export { LEGENDS_PRESETS } from './characters/legends.js';
export { CREATIVE_COMMUNITY_PRESETS } from './characters/creative-community.js';

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
} from './recipes/modulation/index.js';

import type { Preset } from './types.js';
import { PREQUEL_ERA_PRESETS } from './characters/prequel-era.js';
import { ORIGINAL_TRILOGY_PRESETS } from './characters/original-trilogy.js';
import { SEQUEL_ERA_PRESETS } from './characters/sequel-era.js';
import { ANIMATED_SERIES_PRESETS } from './characters/animated-series.js';
import { EXTENDED_UNIVERSE_PRESETS } from './characters/extended-universe.js';
import { LEGENDS_PRESETS } from './characters/legends.js';
import { CREATIVE_COMMUNITY_PRESETS } from './characters/creative-community.js';

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
];
