import type { Preset } from '../types.js';

/**
 * Sequel Trilogy character presets (Episodes VII–IX).
 *
 * Color values are sampled from film reference frames and adjusted
 * for Neopixel LED rendering on WS2812B strips at full brightness.
 */
export const SEQUEL_ERA_PRESETS: Preset[] = [
  // ── Kylo Ren ────────────────────────────────────────────────────

  {
    id: 'st-kylo-ren',
    name: 'Kylo Ren',
    character: 'Kylo Ren',
    era: 'sequel',
    affiliation: 'sith',
    description:
      'Cracked kyber crystal producing an unstable, flickering blade with a slightly orange-red tint. The crossguard vents excess energy through lateral quillons.',
    hiltNotes:
      'Ancient cruciform design with crossguard quillons. Exposed wiring, raw metallic finish, cracked kyber crystal.',
    topologyNotes:
      'Crossguard topology — main blade plus two shorter lateral quillons. Quillons are typically 1/3 the length of the main blade.',
    config: {
      name: 'KyloRen',
      baseColor: { r: 255, g: 30, b: 0 },
      clashColor: { r: 255, g: 200, b: 100 },
      lockupColor: { r: 255, g: 130, b: 0 },
      blastColor: { r: 255, g: 220, b: 180 },
      style: 'unstable',
      ignition: 'stutter',
      retraction: 'standard',
      ignitionMs: 500,
      retractionMs: 400,
      shimmer: 0.4,
      ledCount: 144,
      unstableIntensity: 0.6,
      crossguard: true,
      quillonLength: 48,
    },
  },

  // ── Rey (Anakin's / Skywalker Saber) ────────────────────────────

  {
    id: 'st-rey-blue',
    name: 'Rey (Skywalker Saber)',
    character: 'Rey',
    era: 'sequel',
    affiliation: 'jedi',
    description:
      'Anakin\'s original Graflex, called to Rey on Takodana. Bright blue blade faithful to the cooler color grading of the sequel trilogy.',
    hiltNotes:
      'Graflex with repaired internals after being split on the Supremacy. Wrapped grip added by Rey.',
    config: {
      name: 'ReySkywalkerSaber',
      baseColor: { r: 0, g: 120, b: 255 },
      clashColor: { r: 190, g: 215, b: 255 },
      lockupColor: { r: 180, g: 200, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 350,
      shimmer: 0.04,
      ledCount: 144,
    },
  },

  // ── Rey (Yellow — Own Saber) ────────────────────────────────────

  {
    id: 'st-rey-yellow',
    name: 'Rey (Own Saber)',
    character: 'Rey',
    era: 'sequel',
    affiliation: 'jedi',
    description:
      'Rey\'s self-built saber revealed at the end of TROS. A warm gold-yellow blade — the color of the Jedi Sentinel tradition — symbolizing a new beginning.',
    hiltNotes:
      'Constructed from Rey\'s quarterstaff. Hinged switchblade-style activation mechanism with a rotating emitter.',
    config: {
      name: 'ReyYellow',
      baseColor: { r: 255, g: 200, b: 0 },
      clashColor: { r: 255, g: 240, b: 160 },
      lockupColor: { r: 255, g: 220, b: 80 },
      blastColor: { r: 255, g: 255, b: 220 },
      style: 'photon',
      ignition: 'wipe',
      retraction: 'fadeout',
      ignitionMs: 280,
      retractionMs: 350,
      shimmer: 0.05,
      ledCount: 144,
    },
  },

  // ── Luke Skywalker (TLJ) ───────────────────────────────────────

  {
    id: 'st-luke-tlj',
    name: 'Luke Skywalker (TLJ)',
    character: 'Luke Skywalker',
    era: 'sequel',
    affiliation: 'jedi',
    description:
      'The Last Jedi — Luke\'s green saber from the Crait Force projection and the flashback at Ben Solo\'s hut. Same ROTJ blade color, rendered with sequel-era lighting.',
    hiltNotes:
      'Same hilt as ROTJ. Shown only in flashback and Force projection — Luke did not physically carry the saber on Ahch-To.',
    config: {
      name: 'LukeTLJ',
      baseColor: { r: 0, g: 255, b: 0 },
      clashColor: { r: 180, g: 255, b: 180 },
      lockupColor: { r: 200, g: 255, b: 200 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'rotoscope',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 250,
      retractionMs: 350,
      shimmer: 0.03,
      ledCount: 144,
    },
  },

  // ── Leia Organa ─────────────────────────────────────────────────

  {
    id: 'st-leia',
    name: 'Leia Organa',
    character: 'Leia Organa',
    era: 'sequel',
    affiliation: 'jedi',
    description:
      'Leia\'s saber as wielded by Rey on Ajan Kloss and Exegol. A deep royal blue, slightly more saturated than the Skywalker saber.',
    hiltNotes:
      'Elegant rounded hilt, given to Rey after Leia sensed her own death at the end of her Jedi path.',
    config: {
      name: 'LeiaST',
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

  // ── Ben Solo (Redeemed) ─────────────────────────────────────────

  {
    id: 'st-ben-solo',
    name: 'Ben Solo (Redeemed)',
    character: 'Ben Solo',
    era: 'sequel',
    affiliation: 'jedi',
    description:
      'Ben Solo redeemed — wielding the Skywalker saber on Exegol after turning back to the light. Same blue blade as Rey\'s Skywalker saber, representing his return to the Jedi legacy.',
    hiltNotes:
      'Graflex (Skywalker saber), received from Rey via Force bond. Ben discards Kylo\'s crossguard into the ocean.',
    config: {
      name: 'BenSolo',
      baseColor: { r: 0, g: 120, b: 255 },
      clashColor: { r: 190, g: 215, b: 255 },
      lockupColor: { r: 180, g: 200, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 350,
      shimmer: 0.04,
      ledCount: 144,
    },
  },

  // ── Palpatine (TROS) ───────────────────────────────────────────

  {
    id: 'st-palpatine',
    name: 'Palpatine (TROS)',
    character: 'Palpatine',
    era: 'sequel',
    affiliation: 'sith',
    description:
      'The resurrected Emperor on Exegol. While Palpatine primarily uses Force lightning in TROS, his canonical saber is a deep blood-red blade befitting the Sith Eternal.',
    hiltNotes:
      'Electrum-plated Phrik hilt, same design as the prequel/OT era weapon. Rarely ignited by this point.',
    config: {
      name: 'PalpatineTROS',
      baseColor: { r: 255, g: 0, b: 0 },
      clashColor: { r: 255, g: 150, b: 50 },
      lockupColor: { r: 255, g: 80, b: 0 },
      blastColor: { r: 255, g: 180, b: 180 },
      style: 'cinder',
      ignition: 'glitch',
      retraction: 'fadeout',
      ignitionMs: 200,
      retractionMs: 300,
      shimmer: 0.22,
      ledCount: 144,
    },
  },
];
