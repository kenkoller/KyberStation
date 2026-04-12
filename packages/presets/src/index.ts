export type { Era, Affiliation, PresetMetadata, Preset, PresetConfig } from './types.js';

export { PREQUEL_ERA_PRESETS } from './characters/prequel-era.js';
export { ORIGINAL_TRILOGY_PRESETS } from './characters/original-trilogy.js';
export { SEQUEL_ERA_PRESETS } from './characters/sequel-era.js';
export { ANIMATED_SERIES_PRESETS } from './characters/animated-series.js';
export { EXTENDED_UNIVERSE_PRESETS } from './characters/extended-universe.js';
export { LEGENDS_PRESETS } from './characters/legends.js';
export { CREATIVE_COMMUNITY_PRESETS } from './characters/creative-community.js';

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
