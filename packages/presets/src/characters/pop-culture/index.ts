import type { Preset } from '../../types.js';

export { LOTR_PRESETS } from './lotr.js';
export { MYTHOLOGY_PRESETS } from './mythology.js';
export { MARVEL_PRESETS } from './marvel.js';
export { DC_PRESETS } from './dc.js';
export { ZELDA_PRESETS } from './zelda.js';
export { FINAL_FANTASY_PRESETS } from './final-fantasy.js';
export { ANIME_PRESETS } from './anime.js';
export { KIDS_CARTOONS_PRESETS } from './kids-cartoons.js';
export { POWER_RANGERS_PRESETS } from './power-rangers.js';
export { ADULT_ANIMATION_PRESETS } from './adult-animation.js';
export { MASCOT_PRESETS } from './mascots.js';

import { LOTR_PRESETS } from './lotr.js';
import { MYTHOLOGY_PRESETS } from './mythology.js';
import { MARVEL_PRESETS } from './marvel.js';
import { DC_PRESETS } from './dc.js';
import { ZELDA_PRESETS } from './zelda.js';
import { FINAL_FANTASY_PRESETS } from './final-fantasy.js';
import { ANIME_PRESETS } from './anime.js';
import { KIDS_CARTOONS_PRESETS } from './kids-cartoons.js';
import { POWER_RANGERS_PRESETS } from './power-rangers.js';
import { ADULT_ANIMATION_PRESETS } from './adult-animation.js';
import { MASCOT_PRESETS } from './mascots.js';

/**
 * All pop-culture presets combined into a single array.
 *
 * Pop-culture presets are fan tributes to non-Star-Wars IP (Marvel, LOTR,
 * DC, Zelda, Final Fantasy, anime, Power Rangers, cartoons, mascots) and
 * real-world mythology. Every entry has `continuity: 'pop-culture'` or
 * `continuity: 'mythology'` to enable gallery filtering.
 *
 * The `era` field uses `'expanded-universe'` as a fallback since the Era
 * union does not currently include a dedicated pop-culture value. The
 * `continuity` field is the authoritative source of truth for filtering.
 */
export const POP_CULTURE_PRESETS: Preset[] = [
  ...LOTR_PRESETS,
  ...MYTHOLOGY_PRESETS,
  ...MARVEL_PRESETS,
  ...DC_PRESETS,
  ...ZELDA_PRESETS,
  ...FINAL_FANTASY_PRESETS,
  ...ANIME_PRESETS,
  ...KIDS_CARTOONS_PRESETS,
  ...POWER_RANGERS_PRESETS,
  ...ADULT_ANIMATION_PRESETS,
  ...MASCOT_PRESETS,
];
