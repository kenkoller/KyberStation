import type { Preset } from '../../types.js';

/**
 * Mighty Morphin Power Rangers pop-culture presets.
 *
 * Fan tribute blades inspired by the original MMPR core five (plus Green and
 * White Ranger — Tommy Oliver's two arcs). None of these are screen-accurate
 * lightsaber appearances — they're interpretations of each Ranger's color-coded
 * identity translated to Neopixel blade aesthetics, with Zord and weapon cues
 * in the hilt notes.
 *
 * Notes on era/affiliation:
 * - `era` uses `'expanded-universe'` because the Preset type's `Era` union does
 *   not include a dedicated pop-culture value. The `continuity: 'pop-culture'`
 *   field is the authoritative source for gallery filtering.
 * - `affiliation` uses `'neutral'` for the Rangers — they're heroes outside the
 *   Jedi/Sith axis, so the axis doesn't apply.
 * - Black Ranger uses the `darksaber` style per the Hardware Fidelity principle:
 *   a true-black blade is not achievable on WS2812B (each LED is either emitting
 *   or off), so the "black" body reads as `{r:30,g:30,b:40}` with brighter
 *   emitter + tip highlights — honest approximation of the Mastodon energy.
 */
export const POWER_RANGERS_PRESETS: Preset[] = [
  // ── Red Ranger (Jason / Tyrannosaurus) ─────────────────────────
  {
    id: 'pop-mmpr-red',
    name: 'Red Ranger',
    character: 'Jason Lee Scott (Red Ranger)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The leader. Jason\'s bold Tyrannosaurus-red — confidence, power, the one the others rally behind. Stable blade appropriate to a disciplined team captain; the red is pure and saturated, not sith-crimson.',
    hiltNotes:
      'Red diamond-pattern helmet motif near the emitter, gold banding, Power Sword cross-guard.',
    config: {
      name: 'RedRanger',
      baseColor: { r: 255, g: 30, b: 30 },
      clashColor: { r: 255, g: 200, b: 200 },
      lockupColor: { r: 255, g: 80, b: 80 },
      blastColor: { r: 255, g: 220, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 400,
      shimmer: 0.05,
      ledCount: 144,
      swingFxIntensity: 0.22,
      noiseLevel: 0.02,
    },
  },

  // ── Blue Ranger (Billy / Triceratops) ──────────────────────────
  {
    id: 'pop-mmpr-blue',
    name: 'Blue Ranger',
    character: 'Billy Cranston (Blue Ranger)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The genius. Billy\'s Triceratops-royal-blue — the thinker and the builder, whose intelligence is always the backup plan the villain didn\'t account for. Stable blade in a deep saturated blue that reads as cobalt, not sky.',
    hiltNotes:
      'Blue diamond-pattern helmet motif near the emitter, gold banding, Power Lance tail-end grip extension.',
    config: {
      name: 'BlueRanger',
      baseColor: { r: 30, g: 80, b: 255 },
      clashColor: { r: 180, g: 200, b: 255 },
      lockupColor: { r: 80, g: 140, b: 255 },
      blastColor: { r: 220, g: 230, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 400,
      shimmer: 0.05,
      ledCount: 144,
      swingFxIntensity: 0.22,
      noiseLevel: 0.02,
    },
  },

  // ── Yellow Ranger (Trini / Saber-Tooth) ────────────────────────
  {
    id: 'pop-mmpr-yellow',
    name: 'Yellow Ranger',
    character: 'Trini Kwan (Yellow Ranger)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The heart. Trini\'s Saber-Tooth Tiger yellow-gold — empathy and fierce loyalty in equal measure. Stable blade in a warm sun-gold with a subtle shimmer; bright enough to read as gold at full saturation rather than washed-out cream.',
    hiltNotes:
      'Yellow diamond-pattern helmet motif near the emitter, gold banding, paired Power Daggers housed in forearm sheaths (this is the dominant single-blade variant).',
    config: {
      name: 'YellowRanger',
      baseColor: { r: 255, g: 220, b: 0 },
      clashColor: { r: 255, g: 255, b: 200 },
      lockupColor: { r: 255, g: 240, b: 120 },
      blastColor: { r: 255, g: 250, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 400,
      shimmer: 0.06,
      ledCount: 144,
      swingFxIntensity: 0.22,
      noiseLevel: 0.02,
    },
  },

  // ── Pink Ranger (Kimberly / Pterodactyl) ───────────────────────
  {
    id: 'pop-mmpr-pink',
    name: 'Pink Ranger',
    character: 'Kimberly Hart (Pink Ranger)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The sharpshooter. Kimberly\'s Pterodactyl hot-pink — grace in the air, Power Bow in hand. Stable blade with a crisp saturated pink that reads as aerial and kinetic, not soft or decorative.',
    hiltNotes:
      'Pink diamond-pattern helmet motif near the emitter, gold banding, Power Bow-inspired curved crossguard.',
    config: {
      name: 'PinkRanger',
      baseColor: { r: 255, g: 100, b: 180 },
      clashColor: { r: 255, g: 220, b: 240 },
      lockupColor: { r: 255, g: 160, b: 210 },
      blastColor: { r: 255, g: 240, b: 250 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 400,
      shimmer: 0.05,
      ledCount: 144,
      swingFxIntensity: 0.22,
      noiseLevel: 0.02,
    },
  },

  // ── Black Ranger (Zack / Mastodon) ─────────────────────────────
  {
    id: 'pop-mmpr-black',
    name: 'Black Ranger',
    character: 'Zack Taylor (Black Ranger)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The hip-hop kido. Zack\'s Mastodon-black — dance-fight discipline, the Power Axe swung with rhythm. Rendered via `darksaber` style per the Hardware Fidelity principle: the WS2812B cannot produce a true-black body, so the "black" reads as a very-low-luminance {r:30,g:30,b:40} with brighter emitter + tip highlights. The subtle purple edge suggests the prehistoric Mastodon purple seen in Zord sequences.',
    hiltNotes:
      'Black diamond-pattern helmet motif near the emitter, gold banding, Power Axe twin-bladed head (mirrored on both sides of the hilt at the emitter).',
    config: {
      name: 'BlackRanger',
      baseColor: { r: 30, g: 30, b: 40 },
      clashColor: { r: 200, g: 180, b: 220 },
      lockupColor: { r: 80, g: 60, b: 100 },
      blastColor: { r: 220, g: 200, b: 240 },
      style: 'darksaber',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 340,
      retractionMs: 440,
      shimmer: 0.08,
      ledCount: 144,
      swingFxIntensity: 0.25,
      noiseLevel: 0.04,
    },
  },

  // ── Green Ranger (Tommy / Dragonzord) ──────────────────────────
  {
    id: 'pop-mmpr-green',
    name: 'Green Ranger',
    character: 'Tommy Oliver (Green Ranger)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The evil-turned-good. Tommy\'s Green Ranger arc — Rita\'s creation who became the team\'s brother-in-arms. Emerald with a musical pulse evoking the Dragon Dagger flute that summons the Dragonzord. Pulse style represents the rhythmic six-note call rather than continuous waves.',
    hiltNotes:
      'Green diamond-pattern helmet motif with gold shield overlay, Dragon Dagger flute-mouthpiece at the pommel.',
    config: {
      name: 'GreenRanger',
      baseColor: { r: 30, g: 255, b: 120 },
      clashColor: { r: 200, g: 255, b: 220 },
      lockupColor: { r: 100, g: 255, b: 160 },
      blastColor: { r: 220, g: 255, b: 230 },
      style: 'pulse',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 340,
      retractionMs: 440,
      shimmer: 0.1,
      ledCount: 144,
      swingFxIntensity: 0.26,
      noiseLevel: 0.04,
    },
  },

  // ── White Ranger (Tommy / Saba / White Tiger) ──────────────────
  {
    id: 'pop-mmpr-white',
    name: 'White Ranger',
    character: 'Tommy Oliver (White Ranger)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The ceremonial second chapter. Tommy\'s ascension to team leader with Saba, the sentient White Tiger talking sword. Brilliant white core with a silver-blue edge halo via aurora style — the White Tigerzord shine. A leader\'s blade, dignified and cool rather than warm-gold.',
    hiltNotes:
      'White-and-gold hilt, tiger-head pommel (Saba), chrome accents, gold-banded grip.',
    config: {
      name: 'WhiteRanger',
      baseColor: { r: 255, g: 255, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 230, g: 240, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'aurora',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 380,
      retractionMs: 500,
      shimmer: 0.12,
      ledCount: 144,
      swingFxIntensity: 0.28,
      noiseLevel: 0.05,
    },
  },
];
