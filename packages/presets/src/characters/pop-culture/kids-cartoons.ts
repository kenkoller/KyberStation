import type { Preset } from '../../types.js';

/**
 * Kids' cartoons pop-culture presets.
 *
 * Fan tribute blades inspired by Saturday-morning and streaming kids' animation.
 * None are screen-accurate lightsaber appearances — they're interpretations of
 * character color palettes and signature vibes translated to Neopixel blade
 * aesthetics.
 *
 * Notes on era/affiliation:
 * - `era` uses `'expanded-universe'` because the Preset type's `Era` union does
 *   not include a dedicated pop-culture value. The `continuity: 'pop-culture'`
 *   field is the authoritative source for gallery filtering.
 * - `affiliation` uses `'neutral'` or `'other'` — these are heroes from outside
 *   the Jedi/Sith axis, so the axis doesn't apply.
 */
export const KIDS_CARTOONS_PRESETS: Preset[] = [
  // ── Blossom (Powerpuff Girls) ──────────────────────────────────
  {
    id: 'pop-ppg-blossom',
    name: 'Blossom',
    character: 'Blossom (Powerpuff Girls)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Sugar, spice, and everything nice — plus a dash of Chemical X. The commander and leader of the Powerpuff Girls cuts through evil with confidence and a hair bow. Hot pink stable blade with a gentle aurora halo representing the trio\'s shared signature trail.',
    hiltNotes: 'Pink hair-bow-themed hilt with heart motifs and a red ribbon grip.',
    config: {
      name: 'Blossom',
      baseColor: { r: 255, g: 100, b: 150 },
      clashColor: { r: 255, g: 230, b: 240 },
      lockupColor: { r: 255, g: 180, b: 220 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'aurora',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 400,
      shimmer: 0.08,
      ledCount: 144,
      swingFxIntensity: 0.2,
      noiseLevel: 0.03,
    },
  },

  // ── Bubbles (Powerpuff Girls) ──────────────────────────────────
  {
    id: 'pop-ppg-bubbles',
    name: 'Bubbles',
    character: 'Bubbles (Powerpuff Girls)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The joy and the laughter — Bubbles\' sky-blue signature. Cheerful and bubbly in more than name: a bright, stable blue that reads as daylight-filled sky rather than ocean-deep, appropriate to the most trusting of the trio.',
    hiltNotes: 'Light-blue hilt with an octopus-plush-inspired pommel and pigtail side-detailing.',
    config: {
      name: 'Bubbles',
      baseColor: { r: 120, g: 200, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 180, g: 220, b: 255 },
      blastColor: { r: 240, g: 250, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 280,
      retractionMs: 380,
      shimmer: 0.05,
      ledCount: 144,
      swingFxIntensity: 0.2,
      noiseLevel: 0.02,
    },
  },

  // ── Buttercup (Powerpuff Girls) ────────────────────────────────
  {
    id: 'pop-ppg-buttercup',
    name: 'Buttercup',
    character: 'Buttercup (Powerpuff Girls)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The toughest fighter. Vibrant lime-green with an aggressive unstable flicker — elevated shimmer conveys the tomboy energy of the scrappiest sister. When she ignites, things get dented.',
    hiltNotes: 'Dark-green hilt with ribbed grip and an aggressive angular pommel.',
    config: {
      name: 'Buttercup',
      baseColor: { r: 80, g: 255, b: 60 },
      clashColor: { r: 200, g: 255, b: 180 },
      lockupColor: { r: 140, g: 255, b: 120 },
      blastColor: { r: 220, g: 255, b: 200 },
      style: 'unstable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 280,
      retractionMs: 360,
      shimmer: 0.25,
      ledCount: 144,
      swingFxIntensity: 0.35,
      noiseLevel: 0.08,
    },
  },

  // ── Hello Kitty ────────────────────────────────────────────────
  {
    id: 'pop-hellokitty',
    name: 'Hello Kitty',
    character: 'Hello Kitty',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Soft-pink and sweet. Sanrio\'s most beloved mouthless ambassador rendered as a stable blade with a bright white core bleed through the clash highlights — the friendship bow and white face translated to pixel form.',
    hiltNotes: 'White-and-pink hilt with a red bow at the emitter and a yellow-nose accent.',
    config: {
      name: 'HelloKitty',
      baseColor: { r: 255, g: 180, b: 200 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 220, b: 230 },
      blastColor: { r: 255, g: 250, b: 250 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 320,
      retractionMs: 420,
      shimmer: 0.05,
      ledCount: 144,
      swingFxIntensity: 0.18,
      noiseLevel: 0.02,
    },
  },

  // ── Steven Universe — Garnet ───────────────────────────────────
  {
    id: 'pop-su-garnet',
    name: 'Garnet',
    character: 'Garnet (Steven Universe)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'A fusion of Ruby and Sapphire — two gems made one. The blade uses a gradient from a red-violet base toward the crystalline deep purples of her gauntlets, a visual echo of the fusion she embodies. Gradient style approximates the gem-to-gem color blend across the blade length.',
    hiltNotes: 'Red-and-blue fusion hilt with a central garnet-cut gem window and black grip.',
    config: {
      name: 'Garnet',
      baseColor: { r: 200, g: 40, b: 80 },
      clashColor: { r: 255, g: 150, b: 200 },
      lockupColor: { r: 220, g: 80, b: 130 },
      blastColor: { r: 255, g: 200, b: 220 },
      style: 'gradient',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 360,
      retractionMs: 460,
      shimmer: 0.12,
      ledCount: 144,
      swingFxIntensity: 0.25,
      noiseLevel: 0.05,
      gradientStops: [
        { position: 0, color: { r: 120, g: 20, b: 100 } },
        { position: 0.5, color: { r: 200, g: 40, b: 80 } },
        { position: 1, color: { r: 255, g: 100, b: 140 } },
      ],
    },
  },

  // ── Adventure Time — Finn's Grass Sword ────────────────────────
  {
    id: 'pop-at-grass-sword',
    name: 'Grass Sword',
    character: 'Finn (Adventure Time)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'A living, sentient sword grown from a cursed grass patch and bound to Finn\'s arm. Emerald green with a slow organic pulse — the grass-sword breathes, so the blade does too. The pulse rhythm suggests chloroplasts doing their work.',
    hiltNotes:
      'Organic knotted grass-wrap hilt, green twine grip, no guard — the sword grew into being without formal smithing.',
    config: {
      name: 'GrassSword',
      baseColor: { r: 40, g: 200, b: 60 },
      clashColor: { r: 180, g: 255, b: 160 },
      lockupColor: { r: 100, g: 230, b: 120 },
      blastColor: { r: 220, g: 255, b: 200 },
      style: 'pulse',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 380,
      retractionMs: 500,
      shimmer: 0.08,
      ledCount: 144,
      swingFxIntensity: 0.22,
      noiseLevel: 0.04,
    },
  },

  // ── Ben 10 Omnitrix ────────────────────────────────────────────
  {
    id: 'pop-ben10-omnitrix',
    name: 'Omnitrix',
    character: 'Ben Tennyson (Ben 10)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The Omnitrix — alien-tech watch packing a galaxy of DNA. Bright radioactive green with an aggressive unstable crackle and elevated shimmer representing energy discharge between transformations. The blade always looks one tick away from becoming something else.',
    hiltNotes:
      'Green-and-black watchface hilt with a prominent hourglass indicator at the pommel, chrome accents.',
    config: {
      name: 'Omnitrix',
      baseColor: { r: 100, g: 255, b: 100 },
      clashColor: { r: 220, g: 255, b: 220 },
      lockupColor: { r: 160, g: 255, b: 160 },
      blastColor: { r: 240, g: 255, b: 240 },
      style: 'unstable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 340,
      retractionMs: 420,
      shimmer: 0.3,
      ledCount: 144,
      swingFxIntensity: 0.35,
      noiseLevel: 0.1,
    },
  },

  // ── Powerpuff Girls — Chemical X ───────────────────────────────
  {
    id: 'pop-ppg-chemical-x',
    name: 'Chemical X',
    character: 'Chemical X (Powerpuff Girls)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'other',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The accidental ingredient. Professor Utonium\'s sugar-spice-everything-nice formula knocked a jar of mystery substance into the mix and the Powerpuff Girls happened. This preset is the Chemical X itself — aurora style with a white-rainbow iridescence representing raw origin energy, the unfiltered source of the trio.',
    hiltNotes:
      'Laboratory beaker hilt in glass-and-chrome, with a black-X biohazard-style label near the pommel.',
    config: {
      name: 'ChemicalX',
      baseColor: { r: 240, g: 240, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 240, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'aurora',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 420,
      retractionMs: 540,
      shimmer: 0.18,
      ledCount: 144,
      swingFxIntensity: 0.3,
      noiseLevel: 0.06,
    },
  },
];
