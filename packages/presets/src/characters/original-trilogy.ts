import type { Preset } from '../types.js';

/**
 * Original Trilogy character presets (Episodes IV-VI).
 *
 * Color values are sampled from film reference frames and adjusted
 * for Neopixel LED rendering on WS2812B strips at full brightness.
 */
export const ORIGINAL_TRILOGY_PRESETS: Preset[] = [
  // ── Luke Skywalker ──────────────────────────────────────────────

  {
    id: 'ot-luke-anh',
    name: 'Luke Skywalker (ANH)',
    character: 'Luke Skywalker',
    era: 'original-trilogy',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: true,
    author: 'on-screen',
    description:
      'A New Hope — the Graflex inherited from Anakin. Bright ice-blue blade with a slightly warmer white core, as seen on the original Tatooine ignition.',
    hiltNotes: 'Graflex 3-cell flash handle with thin-neck emitter, clamp card, and D-ring.',
    config: {
      name: 'LukeANH',
      baseColor: { r: 0, g: 135, b: 255 },
      clashColor: { r: 200, g: 220, b: 255 },
      lockupColor: { r: 200, g: 200, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      dragColor: { r: 255, g: 180, b: 0 },
      style: 'rotoscope',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 400,
      shimmer: 0.05,
      ledCount: 144,
      swingFxIntensity: 0.25,
      noiseLevel: 0.02,
    },
  },

  {
    id: 'ot-luke-esb',
    name: 'Luke Skywalker (ESB)',
    character: 'Luke Skywalker',
    era: 'original-trilogy',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: true,
    author: 'on-screen',
    description:
      'The Empire Strikes Back — same Graflex saber, but color-graded slightly cooler and more saturated in Cloud City scenes.',
    hiltNotes: 'Graflex, same hilt as ANH. Lost on Cloud City along with hand.',
    config: {
      name: 'LukeESB',
      baseColor: { r: 0, g: 120, b: 255 },
      clashColor: { r: 180, g: 210, b: 255 },
      lockupColor: { r: 180, g: 200, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      dragColor: { r: 255, g: 160, b: 0 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 400,
      shimmer: 0.04,
      ledCount: 144,
      swingFxIntensity: 0.3,
    },
  },

  {
    id: 'ot-luke-rotj',
    name: 'Luke Skywalker (ROTJ)',
    character: 'Luke Skywalker',
    era: 'original-trilogy',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: true,
    author: 'on-screen',
    description:
      'Return of the Jedi — Luke\'s self-constructed saber. Vivid green blade, the first green lightsaber shown on screen.',
    hiltNotes:
      'Custom hilt built by Luke on Tatooine. Thin black cylinder with ridged grip and single control box.',
    config: {
      name: 'LukeROTJ',
      baseColor: { r: 0, g: 220, b: 40 },
      clashColor: { r: 180, g: 255, b: 180 },
      lockupColor: { r: 200, g: 255, b: 200 },
      blastColor: { r: 255, g: 255, b: 255 },
      dragColor: { r: 255, g: 200, b: 0 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 250,
      retractionMs: 350,
      shimmer: 0.03,
      ledCount: 144,
      swingFxIntensity: 0.35,
      noiseLevel: 0.01,
    },
  },

  // ── Darth Vader ─────────────────────────────────────────────────

  {
    id: 'ot-vader',
    name: 'Darth Vader',
    character: 'Darth Vader',
    era: 'original-trilogy',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: true,
    author: 'on-screen',
    description:
      'Deep crimson blade with a menacing, slightly pulsing core. Slightly darker red than typical Sith blades, emphasizing the oppressive weight of the Empire.',
    hiltNotes:
      'MPP (Micro Precision Products) flash unit. Thick black body, shroud clamp, red activation switch.',
    config: {
      name: 'Vader',
      baseColor: { r: 200, g: 0, b: 0 },
      clashColor: { r: 255, g: 180, b: 80 },
      lockupColor: { r: 255, g: 100, b: 0 },
      blastColor: { r: 255, g: 200, b: 200 },
      dragColor: { r: 255, g: 80, b: 0 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'drain',
      ignitionMs: 400,
      retractionMs: 500,
      shimmer: 0.06,
      ledCount: 144,
      swingFxIntensity: 0.2,
      noiseLevel: 0.03,
    },
  },

  // ── Obi-Wan Kenobi ─────────────────────────────────────────────

  {
    id: 'ot-obiwan-anh',
    name: 'Obi-Wan Kenobi (ANH)',
    character: 'Obi-Wan Kenobi',
    era: 'original-trilogy',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: true,
    author: 'on-screen',
    description:
      'A New Hope — an aged Jedi\'s blade reignited after years in exile. Slightly warmer blue than Luke\'s, with a gentle flicker suggesting the kyber crystal\'s long dormancy.',
    hiltNotes:
      'Obi-Wan\'s ANH hilt: balance-pipe grenade body, booster-lever activation, black grip rings.',
    config: {
      name: 'ObiWanANH',
      baseColor: { r: 0, g: 155, b: 255 },
      clashColor: { r: 200, g: 225, b: 255 },
      lockupColor: { r: 180, g: 210, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      dragColor: { r: 255, g: 180, b: 0 },
      style: 'rotoscope',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 350,
      retractionMs: 450,
      shimmer: 0.08,
      ledCount: 144,
      swingFxIntensity: 0.2,
      noiseLevel: 0.04,
    },
  },

  // ── Emperor Palpatine ───────────────────────────────────────────

  {
    id: 'ot-palpatine',
    name: 'Emperor Palpatine',
    character: 'Palpatine',
    era: 'original-trilogy',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: true,
    author: 'on-screen',
    description:
      'The Emperor\'s rarely-seen blade — intensely saturated red. Depicted only in the ROTJ novelization and later expanded material for this era, but a canonical Sith weapon nonetheless.',
    hiltNotes:
      'Electrum-plated Phrik hilt with ornate carvings. One of two identical sabers carried in his sleeves.',
    config: {
      name: 'PalpatineOT',
      baseColor: { r: 255, g: 0, b: 0 },
      clashColor: { r: 255, g: 150, b: 50 },
      lockupColor: { r: 255, g: 80, b: 0 },
      blastColor: { r: 255, g: 180, b: 180 },
      dragColor: { r: 200, g: 0, b: 200 },
      style: 'cinder',
      ignition: 'crackle',
      retraction: 'drain',
      ignitionMs: 200,
      retractionMs: 300,
      shimmer: 0.18,
      ledCount: 144,
      noiseLevel: 0.06,
      swingFxIntensity: 0.3,
    },
  },

  // ── Leia Organa ─────────────────────────────────────────────────

  {
    id: 'ot-leia',
    name: 'Leia Organa',
    character: 'Leia Organa',
    era: 'original-trilogy',
    affiliation: 'jedi',
    tier: 'base',
    screenAccurate: true,
    author: 'on-screen',
    description:
      'Leia\'s saber as shown in the TROS flashback training scene set during the OT era. A rich royal blue blade, slightly deeper than Luke\'s.',
    hiltNotes:
      'Elegant rounded hilt with metallic finish, designed by Leia herself. Features a kyber crystal from Ilum.',
    config: {
      name: 'LeiaOT',
      baseColor: { r: 0, g: 100, b: 255 },
      clashColor: { r: 170, g: 200, b: 255 },
      lockupColor: { r: 160, g: 190, b: 255 },
      blastColor: { r: 220, g: 230, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 280,
      retractionMs: 380,
      shimmer: 0.04,
      ledCount: 144,
    },
  },

  // ── Darth Vader (ESB duel) ─────────────────────────────────────

  {
    id: 'ot-vader-esb',
    name: 'Darth Vader (ESB)',
    character: 'Darth Vader',
    era: 'original-trilogy',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: true,
    author: 'on-screen',
    description:
      'Vader\'s blade as seen in the Carbon Freezing Chamber on Cloud City. The pink-red color grading of the ESB duel gives the blade a distinctive warmer hue.',
    hiltNotes: 'Same MPP hilt as ANH. The ESB prop has a slightly different clamp configuration.',
    config: {
      name: 'VaderESB',
      baseColor: { r: 230, g: 20, b: 30 },
      clashColor: { r: 255, g: 200, b: 120 },
      lockupColor: { r: 255, g: 120, b: 40 },
      blastColor: { r: 255, g: 210, b: 200 },
      dragColor: { r: 255, g: 100, b: 0 },
      style: 'rotoscope',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 380,
      retractionMs: 480,
      shimmer: 0.07,
      ledCount: 144,
      swingFxIntensity: 0.25,
      noiseLevel: 0.03,
    },
  },

  // ── Obi-Wan Force Ghost ────────────────────────────────────────

  {
    id: 'ot-obiwan-ghost',
    name: 'Obi-Wan (Force Ghost)',
    character: 'Obi-Wan Kenobi',
    era: 'original-trilogy',
    affiliation: 'jedi',
    tier: 'detailed',
    description:
      'A spectral interpretation of Obi-Wan\'s blade as it might appear if manifested by his Force Ghost. Ethereal pale blue with a ghostly luminescence.',
    config: {
      name: 'ObiWanGhost',
      baseColor: { r: 120, g: 180, b: 255 },
      clashColor: { r: 220, g: 240, b: 255 },
      lockupColor: { r: 160, g: 200, b: 255 },
      blastColor: { r: 200, g: 225, b: 255 },
      style: 'photon',
      ignition: 'center',
      retraction: 'fadeout',
      ignitionMs: 500,
      retractionMs: 800,
      shimmer: 0.15,
      ledCount: 144,
      swingFxIntensity: 0.1,
      noiseLevel: 0.06,
    },
  },
];
