import type { Preset } from '../../types.js';

/**
 * Mythology presets.
 *
 * Named weapons from real-world mythology — public domain, drawn from
 * Arthurian legend, Celtic/Norse/Japanese/Greek sagas. Fan interpretations
 * translated to Neopixel blade aesthetics.
 *
 * Notes on era/affiliation:
 * - `era` uses `'expanded-universe'` because the Preset type's `Era` union
 *   does not include a dedicated mythology value. The
 *   `continuity: 'mythology'` field is the authoritative source for gallery
 *   filtering.
 * - `affiliation` leans `'jedi'` for hero-king blades (Excalibur, Gram),
 *   `'other'` for elemental/divine weapons (Trident, Kusanagi),
 *   and `'sith'` for cursed/death-bringing blades (Gáe Bolg).
 */
export const MYTHOLOGY_PRESETS: Preset[] = [
  // ── Excalibur ───────────────────────────────────────────────────
  {
    id: 'pop-myth-excalibur',
    name: 'Excalibur',
    character: 'King Arthur',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The sword in the stone, or the sword of the Lake — the blade of Arthur Pendragon. Golden-white with a kingly halo (aurora style). Bright, stable, ceremonial; the light of a rightful sovereign.',
    hiltNotes:
      'Gilded cruciform longsword, jewelled pommel. Scabbard said to prevent the wielder from bleeding.',
    config: {
      name: 'Excalibur',
      baseColor: { r: 255, g: 240, b: 180 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 240, b: 200 },
      blastColor: { r: 255, g: 255, b: 240 },
      style: 'aurora',
      ignition: 'flash-fill',
      retraction: 'standard',
      ignitionMs: 500,
      retractionMs: 500,
      shimmer: 0.12,
      ledCount: 144,
      swingFxIntensity: 0.25,
      noiseLevel: 0.03,
    },
  },

  // ── Kusanagi ────────────────────────────────────────────────────
  {
    id: 'pop-myth-kusanagi',
    name: 'Kusanagi-no-Tsurugi',
    character: 'Susanoo / Yamato Takeru',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'other',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The Grass-Cutter — drawn from the tail of the eight-headed serpent Yamata-no-Orochi, one of Japan\'s Three Imperial Regalia. Jade-green core with wind-silver streaks; the sword that once turned back a grass-fire by cutting the wind itself.',
    hiltNotes:
      'Japanese straight-sword (tsurugi), woven silk grip, iron tsuba. Kept at Atsuta Shrine.',
    config: {
      name: 'Kusanagi',
      baseColor: { r: 60, g: 220, b: 140 },
      clashColor: { r: 220, g: 255, b: 230 },
      lockupColor: { r: 140, g: 240, b: 200 },
      blastColor: { r: 200, g: 255, b: 220 },
      style: 'helix',
      ignition: 'wipe',
      retraction: 'unravel',
      ignitionMs: 400,
      retractionMs: 550,
      shimmer: 0.14,
      ledCount: 144,
      swingFxIntensity: 0.35,
      noiseLevel: 0.05,
    },
  },

  // ── Gáe Bolg ────────────────────────────────────────────────────
  {
    id: 'pop-myth-gae-bolg',
    name: 'Gáe Bolg',
    character: 'Cú Chulainn',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The Barbed Spear of Mortal Pain — the cursed weapon of Ulster, whose barbs open into thirty points inside the wound. Once thrown, it cannot miss, and it can only be withdrawn by cutting the body open. Crimson-red with aggressive unstable flicker; a weapon that carries its curse in every frame.',
    hiltNotes:
      'Celtic barbed spear, bone-and-bronze haft. Thrown from the foot; said to be made from the bone of a sea-monster.',
    config: {
      name: 'GaeBolg',
      baseColor: { r: 220, g: 20, b: 30 },
      clashColor: { r: 255, g: 120, b: 80 },
      lockupColor: { r: 255, g: 60, b: 40 },
      blastColor: { r: 255, g: 150, b: 120 },
      style: 'unstable',
      ignition: 'stab',
      retraction: 'shatter',
      ignitionMs: 280,
      retractionMs: 450,
      shimmer: 0.4,
      ledCount: 144,
      swingFxIntensity: 0.45,
      noiseLevel: 0.15,
    },
  },

  // ── Gram ────────────────────────────────────────────────────────
  {
    id: 'pop-myth-gram',
    name: 'Gram',
    character: 'Sigurd',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The dragon-slayer, reforged from the shards of Odin\'s sword by Regin for Sigurd, who used it to kill Fafnir. Steel-silver blade with a red-hot heart suggesting the anvil-fire and dragon\'s blood still within it.',
    hiltNotes:
      'Norse longsword, gold-wound grip, hilt of Odin\'s gift. Pommel said to have cracked an anvil when tested.',
    config: {
      name: 'Gram',
      baseColor: { r: 200, g: 210, b: 220 },
      clashColor: { r: 255, g: 120, b: 80 },
      lockupColor: { r: 255, g: 80, b: 60 },
      blastColor: { r: 255, g: 220, b: 200 },
      style: 'gradient',
      ignition: 'flash-fill',
      retraction: 'standard',
      ignitionMs: 380,
      retractionMs: 480,
      shimmer: 0.12,
      ledCount: 144,
      swingFxIntensity: 0.3,
      noiseLevel: 0.05,
      gradientStops: [
        { position: 0, color: { r: 255, g: 60, b: 40 } },
        { position: 0.4, color: { r: 220, g: 180, b: 160 } },
        { position: 1, color: { r: 220, g: 230, b: 240 } },
      ],
    },
  },

  // ── Joyeuse ─────────────────────────────────────────────────────
  {
    id: 'pop-myth-joyeuse',
    name: 'Joyeuse',
    character: 'Charlemagne',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      '"Joyful" — the sword of Charlemagne, which in the legend changed color thirty times a day so that no one could fix its hue. Royal blue-gold base with rotoscope shimmer to approximate the hue-drift. Animated hue-cycling is a visualizer-only suggestion; the real ProffieOS emission is a static base color with warm swing FX.',
    hiltNotes:
      'Frankish longsword, gilded cruciform hilt, pommel reputedly containing the Lance of Longinus.',
    config: {
      name: 'Joyeuse',
      baseColor: { r: 80, g: 120, b: 255 },
      clashColor: { r: 255, g: 220, b: 120 },
      lockupColor: { r: 180, g: 200, b: 255 },
      blastColor: { r: 255, g: 240, b: 200 },
      style: 'rotoscope',
      ignition: 'scroll',
      retraction: 'scroll',
      ignitionMs: 420,
      retractionMs: 520,
      shimmer: 0.2,
      ledCount: 144,
      swingFxIntensity: 0.4,
      noiseLevel: 0.06,
    },
  },

  // ── Caladbolg ───────────────────────────────────────────────────
  {
    id: 'pop-myth-caladbolg',
    name: 'Caladbolg',
    character: 'Fergus mac Róich',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The Rainbow-Sword of Fergus — said to have left a rainbow arc as it struck, and to cleave the tops from hills. Multi-stop gradient across the full hue wheel represents the rainbow trail; the blade itself reads as a shifting prism.',
    hiltNotes:
      'Celtic two-handed greatsword, spiral-wire grip. Used in battle to shear whole hilltops.',
    config: {
      name: 'Caladbolg',
      baseColor: { r: 120, g: 180, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 220, b: 180 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'gradient',
      ignition: 'wipe',
      retraction: 'unravel',
      ignitionMs: 600,
      retractionMs: 700,
      shimmer: 0.18,
      ledCount: 144,
      swingFxIntensity: 0.4,
      noiseLevel: 0.05,
      gradientStops: [
        { position: 0.0, color: { r: 255, g: 50, b: 50 } },
        { position: 0.17, color: { r: 255, g: 160, b: 40 } },
        { position: 0.34, color: { r: 255, g: 240, b: 60 } },
        { position: 0.5, color: { r: 60, g: 220, b: 80 } },
        { position: 0.67, color: { r: 60, g: 160, b: 255 } },
        { position: 0.84, color: { r: 140, g: 80, b: 255 } },
        { position: 1.0, color: { r: 220, g: 80, b: 220 } },
      ],
    },
  },

  // ── Perseus' Harpē ──────────────────────────────────────────────
  {
    id: 'pop-myth-harpe',
    name: 'Harpē',
    character: 'Perseus',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The sickle-sword of Perseus, given by Hermes and used to sever the head of Medusa. Adamantine-white with a cold, precise halo — the blade of a single mortal-severing stroke.',
    hiltNotes:
      'Greek harpē — straight-spined, curved hooked edge, bronze fittings. Forged of adamant.',
    config: {
      name: 'Harpe',
      baseColor: { r: 240, g: 245, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 220, g: 230, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'photon',
      ignition: 'center',
      retraction: 'fadeout',
      ignitionMs: 300,
      retractionMs: 500,
      shimmer: 0.06,
      ledCount: 144,
      swingFxIntensity: 0.25,
      noiseLevel: 0.02,
    },
  },

  // ── Trident of Poseidon ─────────────────────────────────────────
  {
    id: 'pop-myth-trident',
    name: 'Trident of Poseidon',
    character: 'Poseidon',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'other',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The three-pointed spear of the sea-god — forged by the Cyclopes alongside Zeus\'s thunderbolts and Hades\' helm. Sea-foam blue-green with a restless, storm-god rhythm. Pulse style suggests the tide\'s pulse; crackle ignition the breaking of a wave.',
    hiltNotes:
      'Bronze trident, three coral-tipped prongs, gold inlay along the haft. Strikes the earth to summon horses and storms.',
    config: {
      name: 'Trident',
      baseColor: { r: 60, g: 200, b: 210 },
      clashColor: { r: 220, g: 255, b: 255 },
      lockupColor: { r: 140, g: 230, b: 230 },
      blastColor: { r: 200, g: 255, b: 240 },
      style: 'pulse',
      ignition: 'crackle',
      retraction: 'drain',
      ignitionMs: 500,
      retractionMs: 700,
      shimmer: 0.25,
      ledCount: 144,
      swingFxIntensity: 0.45,
      noiseLevel: 0.1,
    },
  },

  // ── Mjölnir of Thor (Norse) — Lightning Helix ───────────────────
  {
    id: 'pop-myth-thor-mjolnir',
    name: "Thor's Hammer (Norse)",
    character: 'Thor (Norse mythology)',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "The Old Norse hammer Mjölnir as a blade of bound storm. Twin lightning-strands in electric blue spiral around the channel — the rumbling helix of Thor's chariot wheels passing through the heavens. Distinct from the MCU re-imagining: rougher, older, more thunder than light.",
    hiltNotes: 'Short oak haft wrapped in iron bands and runic inscriptions.',
    config: {
      name: 'ThorMjolnir',
      baseColor: { r: 100, g: 180, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 200, g: 230, b: 255 },
      blastColor: { r: 230, g: 245, b: 255 },
      style: 'helix',
      ignition: 'crackle',
      retraction: 'drain',
      ignitionMs: 280,
      retractionMs: 500,
      shimmer: 0.3,
      ledCount: 144,
      swingFxIntensity: 0.6,
      noiseLevel: 0.12,
    },
  },

  // ── Sword of Damocles — Suspended Gravity ───────────────────────
  {
    id: 'pop-myth-damocles',
    name: 'Sword of Damocles',
    character: 'Damocles (Sicilian legend)',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'other',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "The blade hung over Damocles' throne by a single horse-hair — symbol of every ruler's ever-present peril. Heavy gold-amber energy that pools downward, always threatening to fall. The weight of the crown, made luminous.",
    hiltNotes: 'Greek xiphos with gold-leaf grip and a single thread visibly suspending the emitter.',
    config: {
      name: 'Damocles',
      baseColor: { r: 240, g: 180, b: 30 },
      clashColor: { r: 255, g: 240, b: 180 },
      lockupColor: { r: 255, g: 200, b: 60 },
      blastColor: { r: 255, g: 230, b: 150 },
      style: 'gravity',
      ignition: 'standard',
      retraction: 'drain',
      ignitionMs: 700,
      retractionMs: 1100,
      shimmer: 0.14,
      ledCount: 144,
      swingFxIntensity: 0.5,
    },
  },

  // ── Ushnisha Vijaya — Wheel of Light ────────────────────────────
  {
    id: 'pop-myth-vajra',
    name: 'Vajra (Diamond Thunderbolt)',
    character: 'Indra (Hindu mythology)',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "The diamond-thunderbolt of Indra — both indestructible and irresistible. Pure white energy spinning in a tight vortex, the kind of brilliance that legend says blinded asuras and dispelled illusion. Calm at its core, lightning at its edges.",
    hiltNotes: 'Bronze ritual scepter with five-pronged ends and lotus-base pommel.',
    config: {
      name: 'Vajra',
      baseColor: { r: 240, g: 245, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 220, g: 230, b: 255 },
      blastColor: { r: 250, g: 250, b: 255 },
      style: 'vortex',
      ignition: 'flash-fill',
      retraction: 'unravel',
      ignitionMs: 350,
      retractionMs: 500,
      shimmer: 0.2,
      ledCount: 144,
      swingFxIntensity: 0.55,
    },
  },

  // ── Naginata of Tomoe Gozen — Tidal Edge ────────────────────────
  {
    id: 'pop-myth-tomoe-gozen',
    name: 'Tomoe Gozen (Tide-Edge Naginata)',
    character: 'Tomoe Gozen (Japanese legend)',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "The legendary onna-musha of the Genpei War, said to ride the river of battle as a current rides its banks. Her naginata is reimagined as a blade of moving water — pale jade with foam-white wave crests rolling along the polearm.",
    hiltNotes: 'Long lacquered shaft with a curved blade emitter and silk-tassel pommel.',
    config: {
      name: 'TomoeNaginata',
      baseColor: { r: 100, g: 220, b: 180 },
      clashColor: { r: 230, g: 255, b: 240 },
      lockupColor: { r: 160, g: 240, b: 200 },
      blastColor: { r: 220, g: 250, b: 230 },
      style: 'tidal',
      ignition: 'wipe',
      retraction: 'drain',
      ignitionMs: 400,
      retractionMs: 600,
      shimmer: 0.18,
      ledCount: 144,
      swingFxIntensity: 0.55,
    },
  },

  // ── Cú Chulainn's Geis-Stream — Neutron Trail ──────────────────
  {
    id: 'pop-myth-cu-chulainn-stream',
    name: "Cú Chulainn's Battle-Stream",
    character: 'Cú Chulainn (Irish mythology)',
    era: 'expanded-universe',
    continuity: 'mythology',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "When Cú Chulainn entered ríastrad, his battle-frenzy, his body twisted and his eyes burned. This is the blade that frenzy might wield: a single hot-orange particle of fury bouncing endlessly along the channel, leaving a smoldering trail. Different from his Gáe Bolg (also in this collection) — this is the warp-spasm given form.",
    hiltNotes: 'Iron sword hilt with twisted Celtic knotwork along the grip.',
    config: {
      name: 'CuChulainnStream',
      baseColor: { r: 255, g: 130, b: 30 },
      clashColor: { r: 255, g: 220, b: 150 },
      lockupColor: { r: 255, g: 160, b: 60 },
      blastColor: { r: 255, g: 200, b: 130 },
      style: 'neutron',
      ignition: 'crackle',
      retraction: 'fadeout',
      ignitionMs: 250,
      retractionMs: 400,
      shimmer: 0.22,
      ledCount: 144,
      swingFxIntensity: 0.65,
      noiseLevel: 0.1,
    },
  },
];
