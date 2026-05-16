import type { Preset } from '../../types.js';

/**
 * Halo pop-culture presets.
 *
 * Iconic weapons and characters from the Halo universe reimagined as
 * lightsaber blades. The Covenant Energy Sword is the natural centerpiece
 * — a melee weapon that already reads as a plasma blade. Other entries
 * interpret signature visual motifs (Cortana's hologram, the Flood's
 * infection glow, Master Chief's gold visor) as Neopixel blade aesthetics.
 *
 * Notes on era/affiliation:
 * - `era` uses `'expanded-universe'` because the Preset type's `Era` union
 *   does not include a dedicated pop-culture value. The `continuity:
 *   'pop-culture'` field is the authoritative source for gallery filtering.
 * - `affiliation` loosely maps: UNSC / Spartan lean `'jedi'` (protagonist),
 *   Covenant / Flood lean `'sith'` (antagonist), Arbiter uses `'neutral'`.
 */
export const HALO_PRESETS: Preset[] = [
  // -- Energy Sword (Covenant) -----------------------------------------
  {
    id: 'pop-halo-energy-sword',
    name: 'Energy Sword',
    character: 'Covenant Elite',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'other',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The Type-1 Energy Sword — twin plasma blades projected from a Covenant hilt. Brilliant cyan-white with a hot core, the signature weapon of Sangheili warriors. Photon style captures the plasma containment shimmer. Flash-fill ignition mimics the instant activation snap.',
    hiltNotes:
      'Curved Covenant alloy grip with twin blade projectors. The blades form a tuning-fork shape when activated.',
    config: {
      name: 'EnergySword',
      baseColor: { r: 100, g: 200, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 160, g: 230, b: 255 },
      blastColor: { r: 200, g: 240, b: 255 },
      dragColor: { r: 60, g: 150, b: 220 },
      style: 'photon',
      ignition: 'flash-fill',
      retraction: 'dissolve',
      ignitionMs: 200,
      retractionMs: 250,
      shimmer: 0.25,
      ledCount: 144,
      swingFxIntensity: 0.55,
    },
  },

  // -- Prophets' Blade -------------------------------------------------
  {
    id: 'pop-halo-prophets-blade',
    name: "Prophets' Blade",
    character: 'Prophet of Truth',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The ceremonial energy blade of the Hierarchs — gold-orange plasma that radiates divine authority. Warmer and more ornate than the standard Energy Sword, befitting the Prophets\' theocratic opulence. Aurora style evokes the sacred flame of the Great Journey.',
    hiltNotes:
      'Ornate gold-plated Forerunner-styled hilt with ceremonial engravings. Carried by the highest ranks of the Covenant.',
    config: {
      name: 'ProphetsBlade',
      baseColor: { r: 255, g: 180, b: 40 },
      clashColor: { r: 255, g: 240, b: 180 },
      lockupColor: { r: 255, g: 200, b: 80 },
      blastColor: { r: 255, g: 230, b: 140 },
      dragColor: { r: 200, g: 130, b: 20 },
      style: 'aurora',
      ignition: 'flash-fill',
      retraction: 'standard',
      ignitionMs: 350,
      retractionMs: 400,
      shimmer: 0.2,
      ledCount: 144,
      swingFxIntensity: 0.45,
    },
  },

  // -- Gravity Hammer Glow (Brute) -------------------------------------
  {
    id: 'pop-halo-gravity-hammer',
    name: 'Gravity Hammer',
    character: 'Brute Chieftain',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The crimson energy glow of the Fist of Rukt and its successor gravity hammers. Deep red with violent flicker and high swing intensity — raw Jiralhanae brutality channeled through Forerunner technology. Fire style captures the barely-contained destructive force.',
    hiltNotes:
      'Massive two-handed haft with a heavy hammerhead housing the gravity drive. Covered in tribal Brute markings.',
    config: {
      name: 'GravityHammer',
      baseColor: { r: 200, g: 30, b: 20 },
      clashColor: { r: 255, g: 150, b: 100 },
      lockupColor: { r: 230, g: 80, b: 50 },
      blastColor: { r: 255, g: 180, b: 120 },
      dragColor: { r: 160, g: 20, b: 10 },
      style: 'fire',
      ignition: 'stutter',
      retraction: 'drain',
      ignitionMs: 400,
      retractionMs: 500,
      shimmer: 0.35,
      ledCount: 144,
      swingFxIntensity: 0.7,
      noiseLevel: 0.1,
    },
  },

  // -- Master Chief Visor ----------------------------------------------
  {
    id: 'pop-halo-master-chief',
    name: 'Master Chief Visor',
    character: 'Master Chief (John-117)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The gold-green glow of the MJOLNIR Mark VI visor — the last thing a Covenant soldier sees. Warm gold with an olive undertone, stable and unwavering like the Spartan who wears it. Minimal shimmer and controlled swing FX reflect military precision.',
    hiltNotes:
      'MJOLNIR Powered Assault Armor, Mark VI. Green titanium-A plating, gold polarized visor.',
    config: {
      name: 'MasterChiefVisor',
      baseColor: { r: 255, g: 215, b: 0 },
      clashColor: { r: 255, g: 250, b: 180 },
      lockupColor: { r: 255, g: 230, b: 120 },
      blastColor: { r: 255, g: 245, b: 160 },
      dragColor: { r: 200, g: 170, b: 0 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 250,
      retractionMs: 300,
      shimmer: 0.08,
      ledCount: 144,
      swingFxIntensity: 0.35,
    },
  },

  // -- Cortana (AI Hologram) -------------------------------------------
  {
    id: 'pop-halo-cortana',
    name: 'Cortana',
    character: 'Cortana (AI)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Blue-purple holographic shimmer — the visual signature of the UNSC\'s most advanced AI construct. Plasma style with high shimmer and a dissolve retraction captures the flickering, data-stream quality of Cortana\'s holographic form as it materializes and fades.',
    hiltNotes:
      'No physical weapon — Cortana is pure light and data. The blade represents her holographic projection.',
    config: {
      name: 'CortanaHologram',
      baseColor: { r: 100, g: 120, b: 240 },
      clashColor: { r: 200, g: 210, b: 255 },
      lockupColor: { r: 140, g: 160, b: 250 },
      blastColor: { r: 180, g: 200, b: 255 },
      dragColor: { r: 70, g: 90, b: 200 },
      style: 'plasma',
      ignition: 'scroll',
      retraction: 'dissolve',
      ignitionMs: 400,
      retractionMs: 450,
      shimmer: 0.4,
      ledCount: 144,
      swingFxIntensity: 0.3,
    },
  },

  // -- Arbiter ---------------------------------------------------------
  {
    id: 'pop-halo-arbiter',
    name: 'Arbiter',
    character: 'Thel \'Vadam (Arbiter)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Silver-teal — the ancient honor of the Arbiter\'s mantle, carrying both Covenant legacy and the resolve to forge a new path. Cooler and more restrained than the standard Energy Sword, the helix style evokes the dual nature of a warrior caught between two worlds.',
    hiltNotes:
      'Ancient Arbiter ceremonial armor with twin-blade Energy Sword. Scarred and battle-worn.',
    config: {
      name: 'ArbiterBlade',
      baseColor: { r: 140, g: 200, b: 200 },
      clashColor: { r: 220, g: 250, b: 250 },
      lockupColor: { r: 170, g: 220, b: 220 },
      blastColor: { r: 200, g: 240, b: 240 },
      dragColor: { r: 100, g: 160, b: 160 },
      style: 'helix',
      ignition: 'flash-fill',
      retraction: 'standard',
      ignitionMs: 250,
      retractionMs: 300,
      shimmer: 0.15,
      ledCount: 144,
      swingFxIntensity: 0.45,
    },
  },

  // -- Infection (Flood) -----------------------------------------------
  {
    id: 'pop-halo-flood-infection',
    name: 'Flood Infection',
    character: 'The Flood',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Sickly yellow-green — the bioluminescent glow of Flood biomass as it corrupts everything it touches. Cinder style with high shimmer and aggressive noise gives the blade an organic, decomposing quality. Crackle ignition spreads like spores taking root.',
    hiltNotes:
      'No weapon per se — the Flood IS the weapon. This blade represents the infection spreading through organic tissue.',
    config: {
      name: 'FloodInfection',
      baseColor: { r: 140, g: 180, b: 30 },
      clashColor: { r: 220, g: 255, b: 100 },
      lockupColor: { r: 170, g: 210, b: 60 },
      blastColor: { r: 200, g: 240, b: 80 },
      dragColor: { r: 100, g: 140, b: 15 },
      style: 'cinder',
      ignition: 'crackle',
      retraction: 'drain',
      ignitionMs: 500,
      retractionMs: 600,
      shimmer: 0.5,
      ledCount: 144,
      swingFxIntensity: 0.4,
      noiseLevel: 0.2,
    },
  },

  // -- UNSC Laser (Spartan Laser) --------------------------------------
  {
    id: 'pop-halo-unsc-laser',
    name: 'UNSC Spartan Laser',
    character: 'UNSC Forces',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Hot red-orange — the M6 Spartan Laser\'s devastating directed-energy beam. Military-grade intensity with a pulse-wave ignition that mimics the weapon\'s signature charge-up sequence before firing. The blade glows like a sustained beam at maximum power.',
    hiltNotes:
      'M6 G/GNR Spartan Laser. Shoulder-mounted, single-operator anti-vehicle weapon. Five shots per battery.',
    config: {
      name: 'UNSCSpartanLaser',
      baseColor: { r: 255, g: 80, b: 20 },
      clashColor: { r: 255, g: 220, b: 160 },
      lockupColor: { r: 255, g: 130, b: 60 },
      blastColor: { r: 255, g: 200, b: 120 },
      dragColor: { r: 200, g: 50, b: 10 },
      style: 'pulse',
      ignition: 'pulse-wave',
      retraction: 'flickerOut',
      ignitionMs: 500,
      retractionMs: 350,
      shimmer: 0.15,
      ledCount: 144,
      swingFxIntensity: 0.5,
    },
  },
];
