import type { Preset } from '../../types.js';

/**
 * Harry Potter pop-culture presets.
 *
 * Wand-inspired lightsaber blades for the Wizarding World's most iconic
 * spellcasters. Each preset interprets a character's signature magic or
 * weapon as a Neopixel blade aesthetic — warm Patronus gold for Harry,
 * killing-curse green for Voldemort, blazing white for Lumos Maxima.
 *
 * Notes on era/affiliation:
 * - `era` uses `'expanded-universe'` because the Preset type's `Era` union
 *   does not include a dedicated pop-culture value. The `continuity:
 *   'pop-culture'` field is the authoritative source for gallery filtering.
 * - `affiliation` loosely maps: Dumbledore's Army / Order of the Phoenix
 *   lean `'jedi'` (light), Death Eaters lean `'sith'` (dark), ambiguous
 *   characters use `'neutral'` or `'other'`.
 */
export const HARRY_POTTER_PRESETS: Preset[] = [
  // -- Dumbledore (Elder Wand) -----------------------------------------
  {
    id: 'pop-harry-potter-dumbledore',
    name: 'Dumbledore (Elder Wand)',
    character: 'Albus Dumbledore',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The Elder Wand, the Deathstick, the Wand of Destiny — master of the Deathly Hallows. Warm white with a faint golden halo, evoking the ancient wisdom and restrained power of its greatest wielder. Stable style befitting the most powerful wizard of his age.',
    hiltNotes:
      'Elder wood with a thestral tail hair core. Distinctive knobbly surface with elder-berry clusters along its length.',
    config: {
      name: 'DumbledoreElderWand',
      baseColor: { r: 240, g: 235, b: 220 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 200, g: 195, b: 180 },
      blastColor: { r: 255, g: 250, b: 230 },
      dragColor: { r: 180, g: 160, b: 120 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 350,
      shimmer: 0.1,
      ledCount: 144,
      swingFxIntensity: 0.4,
    },
  },

  // -- Voldemort (Killing Curse) ---------------------------------------
  {
    id: 'pop-harry-potter-voldemort',
    name: 'Voldemort (Killing Curse)',
    character: 'Lord Voldemort',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Avada Kedavra — the sickly green bolt of the Unforgivable Curse, signature of the Dark Lord. High shimmer and unstable flicker convey the unnatural, soul-rending nature of the spell. Stutter ignition mimics the sudden violent flash of the curse.',
    hiltNotes:
      'Yew wood with a phoenix feather core. Bone-white, slender, with a hook-shaped handle — a wand designed to kill.',
    config: {
      name: 'VoldemortKillingCurse',
      baseColor: { r: 40, g: 200, b: 60 },
      clashColor: { r: 180, g: 255, b: 120 },
      lockupColor: { r: 80, g: 220, b: 100 },
      blastColor: { r: 160, g: 255, b: 140 },
      dragColor: { r: 30, g: 160, b: 40 },
      style: 'unstable',
      ignition: 'stutter',
      retraction: 'flickerOut',
      ignitionMs: 250,
      retractionMs: 400,
      shimmer: 0.45,
      ledCount: 144,
      swingFxIntensity: 0.6,
      noiseLevel: 0.15,
    },
  },

  // -- Harry Potter (Holly Wand) ---------------------------------------
  {
    id: 'pop-harry-potter-harry',
    name: "Harry's Holly Wand",
    character: 'Harry Potter',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Warm Patronus gold — the color of the stag that charges from the tip of Harry\'s wand. A pulse style with gentle shimmer suggests the steady, courageous heart of the Boy Who Lived. The warmth cuts through any Dementor\'s chill.',
    hiltNotes:
      'Holly wood with a phoenix feather core (twin to Voldemort\'s). 11 inches, supple.',
    config: {
      name: 'HarryHollyWand',
      baseColor: { r: 255, g: 210, b: 80 },
      clashColor: { r: 255, g: 255, b: 200 },
      lockupColor: { r: 255, g: 230, b: 120 },
      blastColor: { r: 255, g: 240, b: 160 },
      dragColor: { r: 200, g: 160, b: 40 },
      style: 'pulse',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 350,
      shimmer: 0.15,
      ledCount: 144,
      swingFxIntensity: 0.45,
    },
  },

  // -- Hermione Granger ------------------------------------------------
  {
    id: 'pop-harry-potter-hermione',
    name: "Hermione's Vine Wand",
    character: 'Hermione Granger',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Warm amber — the glow of a perfectly cast spell from the brightest witch of her age. Stable and precise with minimal shimmer, reflecting Hermione\'s disciplined technique. Scroll ignition evokes the unfurling of a well-studied incantation.',
    hiltNotes:
      'Vine wood with a dragon heartstring core. 10 and three-quarter inches, intricate vine carvings along the handle.',
    config: {
      name: 'HermioneVineWand',
      baseColor: { r: 255, g: 190, b: 90 },
      clashColor: { r: 255, g: 240, b: 180 },
      lockupColor: { r: 255, g: 210, b: 130 },
      blastColor: { r: 255, g: 230, b: 160 },
      dragColor: { r: 200, g: 140, b: 50 },
      style: 'stable',
      ignition: 'scroll',
      retraction: 'standard',
      ignitionMs: 280,
      retractionMs: 300,
      shimmer: 0.06,
      ledCount: 144,
      swingFxIntensity: 0.35,
    },
  },

  // -- Severus Snape ---------------------------------------------------
  {
    id: 'pop-harry-potter-snape',
    name: "Snape's Patronus",
    character: 'Severus Snape',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Dark teal with a silver shimmer — the color of Snape\'s doe Patronus, the hidden testament to a love that endured beyond death. Aurora style with elevated shimmer gives the blade an ethereal, ghostly quality. Always.',
    hiltNotes:
      'Unknown wood and core. Dark, unadorned wand reflecting its secretive master.',
    config: {
      name: 'SnapePatronus',
      baseColor: { r: 60, g: 140, b: 150 },
      clashColor: { r: 200, g: 230, b: 240 },
      lockupColor: { r: 120, g: 180, b: 190 },
      blastColor: { r: 180, g: 220, b: 230 },
      dragColor: { r: 40, g: 100, b: 110 },
      style: 'aurora',
      ignition: 'standard',
      retraction: 'dissolve',
      ignitionMs: 400,
      retractionMs: 500,
      shimmer: 0.3,
      ledCount: 144,
      swingFxIntensity: 0.3,
    },
  },

  // -- Bellatrix Lestrange ---------------------------------------------
  {
    id: 'pop-harry-potter-bellatrix',
    name: "Bellatrix's Cruciatus",
    character: 'Bellatrix Lestrange',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Dark crimson-purple — the color of madness and the Cruciatus Curse. Unstable flicker and aggressive swing FX capture Bellatrix\'s unhinged ferocity. Crackle ignition mirrors the unpredictable savagery of her spellwork.',
    hiltNotes:
      'Walnut wood with a dragon heartstring core. Curved, claw-like grip — as twisted as its mistress.',
    config: {
      name: 'BellatrixCruciatus',
      baseColor: { r: 160, g: 30, b: 80 },
      clashColor: { r: 255, g: 100, b: 140 },
      lockupColor: { r: 200, g: 60, b: 110 },
      blastColor: { r: 255, g: 140, b: 160 },
      dragColor: { r: 120, g: 20, b: 60 },
      style: 'unstable',
      ignition: 'crackle',
      retraction: 'flickerOut',
      ignitionMs: 280,
      retractionMs: 380,
      shimmer: 0.4,
      ledCount: 144,
      swingFxIntensity: 0.65,
      noiseLevel: 0.12,
    },
  },

  // -- Neville & Sword of Gryffindor ----------------------------------
  {
    id: 'pop-harry-potter-neville-gryffindor',
    name: 'Sword of Gryffindor',
    character: 'Neville Longbottom',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Ruby red — the color of the Gryffindor sword\'s pommel stone and the house it serves. Drawn from the Sorting Hat by a true Gryffindor in the hour of greatest need. Stable style with a flash-fill ignition evokes the blade materializing from nothing.',
    hiltNotes:
      'Goblin-forged silver sword with a ruby-set pommel. Imbibes only that which strengthens it. The name GODRIC GRYFFINDOR is engraved below the guard.',
    config: {
      name: 'SwordOfGryffindor',
      baseColor: { r: 192, g: 192, b: 192 },
      clashColor: { r: 200, g: 30, b: 40 },
      lockupColor: { r: 220, g: 80, b: 90 },
      blastColor: { r: 230, g: 220, b: 220 },
      dragColor: { r: 130, g: 130, b: 130 },
      style: 'stable',
      ignition: 'flash-fill',
      retraction: 'standard',
      ignitionMs: 350,
      retractionMs: 400,
      shimmer: 0.08,
      ledCount: 144,
      swingFxIntensity: 0.45,
    },
  },

  // -- Luna Lovegood ---------------------------------------------------
  {
    id: 'pop-harry-potter-luna',
    name: "Luna's Patronus",
    character: 'Luna Lovegood',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Soft lavender — the dreamy, otherworldly glow of Luna\'s hare Patronus. Gentle pulse style with a slow drift feels as serene and slightly surreal as Luna herself. The blade seems to exist half in this world and half somewhere lovelier.',
    hiltNotes:
      'Unknown wood and core. Luna\'s wand has a tulip-shaped tip, as unique as its owner.',
    config: {
      name: 'LunaPatronus',
      baseColor: { r: 180, g: 150, b: 220 },
      clashColor: { r: 230, g: 210, b: 255 },
      lockupColor: { r: 200, g: 175, b: 240 },
      blastColor: { r: 220, g: 200, b: 255 },
      dragColor: { r: 140, g: 110, b: 180 },
      style: 'pulse',
      ignition: 'standard',
      retraction: 'dissolve',
      ignitionMs: 450,
      retractionMs: 550,
      shimmer: 0.2,
      ledCount: 144,
      swingFxIntensity: 0.25,
    },
  },

  // -- Draco Malfoy ----------------------------------------------------
  {
    id: 'pop-harry-potter-draco',
    name: "Draco's Hawthorn Wand",
    character: 'Draco Malfoy',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Silver-green — Slytherin ambition tempered by doubt. A cold, calculating blade whose photon style flickers with the uncertainty of a boy caught between duty and conscience. The green is muted, not the vivid emerald of conviction.',
    hiltNotes:
      'Hawthorn wood with a unicorn hair core. 10 inches, reasonably springy. Elegant dark handle.',
    config: {
      name: 'DracoHawthornWand',
      baseColor: { r: 140, g: 180, b: 150 },
      clashColor: { r: 220, g: 240, b: 225 },
      lockupColor: { r: 170, g: 200, b: 175 },
      blastColor: { r: 200, g: 230, b: 210 },
      dragColor: { r: 100, g: 140, b: 110 },
      style: 'photon',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 350,
      shimmer: 0.18,
      ledCount: 144,
      swingFxIntensity: 0.35,
    },
  },

  // -- Lumos Maxima ----------------------------------------------------
  {
    id: 'pop-harry-potter-lumos-maxima',
    name: 'Lumos Maxima',
    character: 'Utility Spell',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'other',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Pure blazing white — the amplified light charm pushed to its maximum. Flash-fill ignition captures the sudden burst of illumination. High shimmer and strong swing FX make this the brightest blade in the collection, a torch against any darkness.',
    hiltNotes:
      'Any wand can cast Lumos Maxima. The spell is the star, not the instrument.',
    config: {
      name: 'LumosMaxima',
      baseColor: { r: 250, g: 250, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 230, g: 230, b: 240 },
      blastColor: { r: 255, g: 255, b: 255 },
      dragColor: { r: 200, g: 200, b: 210 },
      style: 'stable',
      ignition: 'flash-fill',
      retraction: 'dissolve',
      ignitionMs: 200,
      retractionMs: 300,
      shimmer: 0.35,
      ledCount: 144,
      swingFxIntensity: 0.5,
    },
  },
];
