import type { Preset } from '../../types.js';

/**
 * Lord of the Rings pop-culture presets.
 *
 * Fan tribute blades inspired by the named swords and rings of Middle-earth.
 * None of these are screen-accurate lightsaber appearances — they're
 * interpretations of sword/ring lore translated to Neopixel blade aesthetics.
 *
 * Notes on era/affiliation:
 * - `era` uses `'expanded-universe'` because the Preset type's `Era` union does
 *   not include a dedicated pop-culture value. The `continuity: 'pop-culture'`
 *   field is the authoritative source for gallery filtering.
 * - `affiliation` uses `'other'` for most entries; Elven/Mannish hero swords
 *   lean `'jedi'` (noble/light), Morgul/Nazgûl/Sauron artefacts lean `'sith'`
 *   (corrupt/dark), and ambiguous weapons (Gurthang, One Ring) use `'other'`.
 */
export const LOTR_PRESETS: Preset[] = [
  // ── Glamdring ───────────────────────────────────────────────────
  {
    id: 'pop-lotr-glamdring',
    name: 'Glamdring',
    character: 'Gandalf',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Gandalf\'s sword — "Foe-hammer" — forged in the ancient wars of Gondolin. Pale ice-blue blade that glows brighter near orcs. Stable at rest with a subtle pulse suggesting the Elvish enchantment still stirring in the steel.',
    hiltNotes: 'Elvish design with inscribed runes along the grip; ornate cruciform pommel.',
    config: {
      name: 'Glamdring',
      baseColor: { r: 180, g: 220, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 220, g: 240, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'pulse',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 320,
      retractionMs: 420,
      shimmer: 0.08,
      ledCount: 144,
      swingFxIntensity: 0.2,
      noiseLevel: 0.03,
    },
  },

  // ── Sting ───────────────────────────────────────────────────────
  {
    id: 'pop-lotr-sting',
    name: 'Sting',
    character: 'Bilbo / Frodo Baggins',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'A hobbit-scale Elvish shortblade found in the troll-hoard and carried from Hobbiton to Mount Doom. Crisper, cooler cyan than Glamdring — the smaller kyber burns sharper. Shorter blade (72 LEDs) reflects the hobbit scale.',
    hiltNotes: 'Small Elven-forged dagger, leaf-shaped blade, silver fittings.',
    config: {
      name: 'Sting',
      baseColor: { r: 150, g: 210, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 200, g: 230, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'pulse',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 220,
      retractionMs: 320,
      shimmer: 0.1,
      ledCount: 72,
      swingFxIntensity: 0.25,
      noiseLevel: 0.03,
    },
  },

  // ── Andúril ─────────────────────────────────────────────────────
  {
    id: 'pop-lotr-anduril',
    name: 'Andúril',
    character: 'Aragorn',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Flame of the West — Narsil reforged by the Elves of Rivendell for Isildur\'s heir. Silver-white core with warm flame-licked edges, the halo of a king\'s blade. Aurora style evokes the living light said to burn in its steel.',
    hiltNotes:
      'Reforged Númenórean longsword, Elvish runes along the fuller, gold-chased hilt and sun-ray pommel.',
    config: {
      name: 'Anduril',
      baseColor: { r: 240, g: 230, b: 200 },
      clashColor: { r: 255, g: 200, b: 120 },
      lockupColor: { r: 255, g: 220, b: 160 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'aurora',
      ignition: 'flash-fill',
      retraction: 'standard',
      ignitionMs: 500,
      retractionMs: 500,
      shimmer: 0.12,
      ledCount: 144,
      swingFxIntensity: 0.3,
      noiseLevel: 0.04,
    },
  },

  // ── Narsil (broken) ─────────────────────────────────────────────
  {
    id: 'pop-lotr-narsil-broken',
    name: 'Narsil (Broken)',
    character: 'Elendil / Isildur',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The Sword That Was Broken — Narsil as it lay in Rivendell after cutting the One Ring from Sauron\'s hand, its blade shattered into fragments. Dim silver with intermittent flicker; unstable style + elevated shimmer conveys a blade whose song is nearly gone. Reduced LED count (64) represents the broken length.',
    hiltNotes: 'Shattered remnant, handle + partial blade intact. Heirloom of Gondor.',
    config: {
      name: 'NarsilBroken',
      baseColor: { r: 180, g: 180, b: 190 },
      clashColor: { r: 220, g: 220, b: 230 },
      lockupColor: { r: 200, g: 200, b: 220 },
      blastColor: { r: 240, g: 240, b: 255 },
      style: 'unstable',
      ignition: 'stab',
      retraction: 'flickerOut',
      ignitionMs: 600,
      retractionMs: 800,
      shimmer: 0.45,
      ledCount: 64,
      swingFxIntensity: 0.15,
      noiseLevel: 0.12,
    },
  },

  // ── Orcrist ─────────────────────────────────────────────────────
  {
    id: 'pop-lotr-orcrist',
    name: 'Orcrist',
    character: 'Thorin Oakenshield',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The Goblin-cleaver, twin to Glamdring — forged in Gondolin, found in the troll-hoard, carried by the King Under the Mountain. Pale blue-green Elven blade, slightly cooler than Glamdring in its green undertone.',
    hiltNotes: 'Elven-forged longsword, curved guard, blue leather-wrapped grip.',
    config: {
      name: 'Orcrist',
      baseColor: { r: 160, g: 230, b: 220 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 200, g: 240, b: 230 },
      blastColor: { r: 240, g: 255, b: 250 },
      style: 'pulse',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 320,
      retractionMs: 420,
      shimmer: 0.08,
      ledCount: 144,
      swingFxIntensity: 0.2,
      noiseLevel: 0.03,
    },
  },

  // ── Gurthang ────────────────────────────────────────────────────
  {
    id: 'pop-lotr-gurthang',
    name: 'Gurthang',
    character: 'Túrin Turambar',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'other',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Iron of Death — Anglachel reforged for Túrin, a sentient sword of meteoric iron that spoke before its wielder\'s suicide. Jet-black body with a crimson edge-glow, approximated via the Darksaber near-black base with red clash/lockup colors. A cursed weapon rendered honestly on WS2812B: the "black" body is {r:5,g:5,b:5} per the Hardware Fidelity principle.',
    hiltNotes: 'Black meteoric-iron longsword, Eöl-forged. Edge catches what little light finds it.',
    config: {
      name: 'Gurthang',
      baseColor: { r: 5, g: 5, b: 5 },
      clashColor: { r: 255, g: 40, b: 20 },
      lockupColor: { r: 200, g: 30, b: 15 },
      blastColor: { r: 255, g: 80, b: 40 },
      style: 'darksaber',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 420,
      retractionMs: 500,
      shimmer: 0,
      ledCount: 144,
      swingFxIntensity: 0.25,
      noiseLevel: 0.05,
    },
  },

  // ── Morgul-blade ────────────────────────────────────────────────
  {
    id: 'pop-lotr-morgul-blade',
    name: 'Morgul-blade',
    character: 'Witch-king of Angmar',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The cursed dagger of the Nazgûl — its fragments work inward through the flesh toward the heart, drawing the wounded into the wraith-world. Sickly purple-green with aggressive unstable flicker and high shimmer. The broken-tip behavior is only suggested; full fragment-snapping is a post-launch engine feature.',
    hiltNotes:
      'Ringwraith dagger, jagged black blade, runes that weep pale fume. Breaks off in the wound.',
    config: {
      name: 'MorgulBlade',
      baseColor: { r: 120, g: 50, b: 180 },
      clashColor: { r: 180, g: 255, b: 100 },
      lockupColor: { r: 140, g: 200, b: 80 },
      blastColor: { r: 200, g: 255, b: 150 },
      style: 'unstable',
      ignition: 'crackle',
      retraction: 'dissolve',
      ignitionMs: 500,
      retractionMs: 700,
      shimmer: 0.55,
      ledCount: 72,
      swingFxIntensity: 0.35,
      noiseLevel: 0.18,
    },
  },

  // ── Herugrim ────────────────────────────────────────────────────
  {
    id: 'pop-lotr-herugrim',
    name: 'Herugrim',
    character: 'Théoden King',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The ancestral sword of the Kings of Rohan, drawn from its sheath when Théoden was freed from Saruman\'s spell. Warm Rohan gold-yellow, the color of sun on thatch and harvest stubble. Stable — a king\'s blade, not a storm\'s.',
    hiltNotes:
      'Rohirric longsword, knot-worked horsehead pommel, green-and-gold scabbard with bound runes.',
    config: {
      name: 'Herugrim',
      baseColor: { r: 255, g: 210, b: 100 },
      clashColor: { r: 255, g: 240, b: 180 },
      lockupColor: { r: 255, g: 220, b: 140 },
      blastColor: { r: 255, g: 255, b: 220 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 340,
      retractionMs: 440,
      shimmer: 0.05,
      ledCount: 144,
      swingFxIntensity: 0.2,
      noiseLevel: 0.02,
    },
  },

  // ── Narya (Ring of Fire) ────────────────────────────────────────
  {
    id: 'pop-lotr-narya',
    name: 'Narya (Ring of Fire)',
    character: 'Gandalf (bearer)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The Red Ring — one of the Three, given to Gandalf by Círdan at the Grey Havens. It inspires resistance against tyranny and weariness. Ember-red with a warm, slow pulse suggesting banked coals that never quite go cold.',
    hiltNotes:
      'Ring of power, gold band set with a red ruby. Worn rather than wielded — here interpreted as a blade carrying the ring\'s heart-fire.',
    config: {
      name: 'Narya',
      baseColor: { r: 255, g: 80, b: 30 },
      clashColor: { r: 255, g: 220, b: 120 },
      lockupColor: { r: 255, g: 140, b: 60 },
      blastColor: { r: 255, g: 200, b: 100 },
      style: 'fire',
      ignition: 'flash-fill',
      retraction: 'drain',
      ignitionMs: 420,
      retractionMs: 600,
      shimmer: 0.22,
      ledCount: 144,
      swingFxIntensity: 0.3,
      noiseLevel: 0.08,
    },
  },

  // ── One Ring (inscribed) ────────────────────────────────────────
  {
    id: 'pop-lotr-one-ring',
    name: 'One Ring (Inscribed)',
    character: 'Sauron',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Ash nazg durbatulûk — "One Ring to rule them all." The Black Speech inscription burns out in fire-runes when the Ring is cast into flame. Dark body with an inner crimson fire-glow, unstable rhythm representing the Ring\'s malice. Gradient base→fire approximates the inscription reveal.',
    hiltNotes:
      'A gold ring with no gem. Its fire is invisible in hand; heat renders the Elvish-script curse visible.',
    config: {
      name: 'OneRing',
      baseColor: { r: 20, g: 8, b: 5 },
      clashColor: { r: 255, g: 180, b: 40 },
      lockupColor: { r: 255, g: 60, b: 10 },
      blastColor: { r: 255, g: 140, b: 30 },
      style: 'gradient',
      ignition: 'crackle',
      retraction: 'drain',
      ignitionMs: 700,
      retractionMs: 900,
      shimmer: 0.3,
      ledCount: 144,
      swingFxIntensity: 0.15,
      noiseLevel: 0.14,
      gradientStops: [
        { position: 0, color: { r: 30, g: 10, b: 5 } },
        { position: 0.5, color: { r: 180, g: 40, b: 10 } },
        { position: 1, color: { r: 255, g: 120, b: 20 } },
      ],
    },
  },
];
