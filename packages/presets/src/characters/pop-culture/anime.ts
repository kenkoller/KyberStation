import type { Preset } from '../../types.js';

/**
 * Anime — pop-culture tribute presets.
 *
 * Demon Slayer Nichirin blades + Bleach Zanpakutō reimagined as lightsabers.
 * `era: 'expanded-universe'` is the structural fallback since the preset `Era`
 * union is Star-Wars-scoped — `continuity: 'pop-culture'` is the canonical
 * filter.
 *
 * Nichirin blades in Kimetsu no Yaiba change color in response to the
 * wielder's Breathing Style. Rengoku's flame-red, Zenitsu's lightning-yellow,
 * Inosuke's indigo-grey, and Tanjiro's iconic jet-black are represented as
 * distinct presets here.
 */
export const ANIME_PRESETS: Preset[] = [
  // ── Demon Slayer Nichirin blades ─────────────────────────────────

  {
    id: 'pop-anime-tanjiro-nichirin',
    name: "Tanjiro's Nichirin",
    character: 'Kamado Tanjiro',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "The rare jet-black Nichirin — the mark of a Breathing Style practitioner whose path is unknown. Very dark body with a red spiritual edge. Darksaber approximation is the honest hardware representation: dim body, bright emitter/tip accents.",
    hiltNotes:
      'Plain katana tsuka with white-and-black braid; square iron tsuba. The color is the whole story.',
    config: {
      name: 'TanjiroNichirin',
      baseColor: { r: 5, g: 5, b: 5 },
      clashColor: { r: 255, g: 80, b: 40 },
      lockupColor: { r: 220, g: 60, b: 30 },
      blastColor: { r: 255, g: 140, b: 80 },
      dragColor: { r: 180, g: 40, b: 20 },
      style: 'darksaber',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 350,
      retractionMs: 450,
      shimmer: 0,
      ledCount: 144,
      swingFxIntensity: 0.4,
      noiseLevel: 0.05,
    },
  },

  {
    id: 'pop-anime-rengoku-nichirin',
    name: "Rengoku's Nichirin",
    character: 'Rengoku Kyojuro',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "The Flame Hashira's blade. Bright flame-red and orange, alive with Breath of Flame energy. High fire intensity — set your heart ablaze.",
    hiltNotes:
      'Flame-patterned tsuba, red-and-white tsuka braid. Worn openly, carried proudly.',
    config: {
      name: 'RengokuNichirin',
      baseColor: { r: 255, g: 100, b: 20 },
      clashColor: { r: 255, g: 240, b: 120 },
      lockupColor: { r: 255, g: 160, b: 40 },
      blastColor: { r: 255, g: 220, b: 100 },
      dragColor: { r: 255, g: 80, b: 0 },
      style: 'fire',
      ignition: 'crackle',
      retraction: 'drain',
      ignitionMs: 300,
      retractionMs: 450,
      shimmer: 0.25,
      ledCount: 144,
      swingFxIntensity: 0.55,
      noiseLevel: 0.1,
      fireSize: 0.8,
    },
  },

  {
    id: 'pop-anime-zenitsu-nichirin',
    name: "Zenitsu's Nichirin",
    character: 'Agatsuma Zenitsu',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "The thunder-yellow Nichirin of a one-trick Breath of Thunder prodigy. High shimmer and unstable core read as Thunderclap and Flash crackling down the blade — fast enough to be mistaken for lightning.",
    hiltNotes:
      'Lightning-etched blade, plain yellow braid on the tsuka. Looks ordinary sheathed; terrifying drawn.',
    config: {
      name: 'ZenitsuNichirin',
      baseColor: { r: 255, g: 230, b: 40 },
      clashColor: { r: 255, g: 255, b: 200 },
      lockupColor: { r: 255, g: 240, b: 120 },
      blastColor: { r: 255, g: 255, b: 220 },
      dragColor: { r: 255, g: 200, b: 0 },
      style: 'unstable',
      ignition: 'spark',
      retraction: 'flickerOut',
      ignitionMs: 200,
      retractionMs: 350,
      shimmer: 0.4,
      ledCount: 144,
      swingFxIntensity: 0.6,
      noiseLevel: 0.12,
    },
  },

  {
    id: 'pop-anime-inosuke-nichirin',
    name: "Inosuke's Twin Nichirin",
    character: 'Hashibira Inosuke',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "Beast-Breathing dual blades chipped along the edges for extra bite. Indigo-grey with a wild, feral presence. Single-blade representation on Neopixel hardware — the real Inosuke carries two.",
    hiltNotes:
      "Twin chipped Nichirin blades, no ornamentation. Grip wrapped in tanned boar hide. Koshirae? Who needs one.",
    config: {
      name: 'InosukeNichirin',
      baseColor: { r: 100, g: 110, b: 150 },
      clashColor: { r: 180, g: 190, b: 220 },
      lockupColor: { r: 140, g: 150, b: 190 },
      blastColor: { r: 200, g: 210, b: 230 },
      dragColor: { r: 80, g: 90, b: 130 },
      style: 'stable',
      ignition: 'stab',
      retraction: 'standard',
      ignitionMs: 250,
      retractionMs: 400,
      shimmer: 0.12,
      ledCount: 144,
      swingFxIntensity: 0.55,
      noiseLevel: 0.08,
    },
  },

  // ── Bleach Zanpakutō ──────────────────────────────────────────────

  {
    id: 'pop-anime-tensa-zangetsu',
    name: 'Tensa Zangetsu (Ichigo Bankai)',
    character: 'Kurosaki Ichigo',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "Ichigo's Bankai-compressed daitō. Jet-black blade with red spiritual pressure bleeding through the edge. Darksaber approximation for the black core; the red clash IS the Getsuga Tenshō.",
    hiltNotes:
      'Slim black daitō with a four-pointed black tsuba and a chain trailing from the pommel. Compressed from the massive cleaver shikai.',
    config: {
      name: 'TensaZangetsu',
      baseColor: { r: 5, g: 5, b: 5 },
      clashColor: { r: 255, g: 50, b: 30 },
      lockupColor: { r: 200, g: 40, b: 20 },
      blastColor: { r: 255, g: 100, b: 60 },
      dragColor: { r: 160, g: 30, b: 10 },
      style: 'darksaber',
      ignition: 'swing',
      retraction: 'dissolve',
      ignitionMs: 400,
      retractionMs: 500,
      shimmer: 0,
      ledCount: 144,
      swingFxIntensity: 0.5,
      noiseLevel: 0.06,
    },
  },

  {
    id: 'pop-anime-hyorinmaru',
    name: 'Hyōrinmaru (Hitsugaya)',
    character: 'Hitsugaya Toshiro',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "The most powerful ice-type Zanpakutō in Soul Society. Pale ice-blue with crystalline frost scattering across the blade. Aurora halo for the Heavenly Guardian aura — cold enough to freeze the sky.",
    hiltNotes:
      'Teal-wrapped tsuka with a four-pointed star tsuba; chain and crescent-moon charm trailing from the pommel.',
    config: {
      name: 'Hyorinmaru',
      baseColor: { r: 150, g: 220, b: 255 },
      clashColor: { r: 230, g: 250, b: 255 },
      lockupColor: { r: 200, g: 240, b: 255 },
      blastColor: { r: 240, g: 252, b: 255 },
      dragColor: { r: 120, g: 200, b: 240 },
      style: 'aurora',
      ignition: 'summon',
      retraction: 'evaporate',
      ignitionMs: 450,
      retractionMs: 600,
      shimmer: 0.22,
      ledCount: 144,
      swingFxIntensity: 0.35,
      noiseLevel: 0.05,
    },
  },

  // ── Tengen Uzui — Sound Helix ───────────────────────────────────
  {
    id: 'pop-anime-tengen',
    name: 'Tengen Uzui (Sound Helix)',
    character: 'Tengen Uzui (Demon Slayer)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "The Sound Hashira's twin Nichirin blades reimagined as a unified helix — counter-rotating golden strands that beat against each other like a percussive flourish. Flamboyant, festive, fast.",
    hiltNotes: 'Twin gold-trimmed katana hilts joined at the pommel by a chain, bell tassels.',
    config: {
      name: 'TengenSoundHelix',
      baseColor: { r: 255, g: 200, b: 50 },
      clashColor: { r: 255, g: 240, b: 180 },
      lockupColor: { r: 255, g: 215, b: 80 },
      blastColor: { r: 255, g: 235, b: 160 },
      style: 'helix',
      ignition: 'spark',
      retraction: 'unravel',
      ignitionMs: 320,
      retractionMs: 450,
      shimmer: 0.24,
      ledCount: 144,
      swingFxIntensity: 0.6,
    },
  },

  // ── Avatar Aang — Air Vortex ────────────────────────────────────
  {
    id: 'pop-anime-aang-airbender',
    name: 'Aang (Avatar State)',
    character: 'Aang (Avatar: The Last Airbender)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "The last airbender's bending given blade-form. A spiraling vortex of pale blue-white wind energy, intensifying in the Avatar State. Gentle while still — a hurricane when swung.",
    hiltNotes: 'Lightweight bone hilt with a stylized arrow-tattoo motif and four-elements ring.',
    config: {
      name: 'AangAirVortex',
      baseColor: { r: 200, g: 235, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 220, g: 245, b: 255 },
      blastColor: { r: 240, g: 250, b: 255 },
      style: 'vortex',
      ignition: 'summon',
      retraction: 'unravel',
      ignitionMs: 600,
      retractionMs: 800,
      shimmer: 0.16,
      ledCount: 144,
      swingFxIntensity: 0.65,
    },
  },
];
