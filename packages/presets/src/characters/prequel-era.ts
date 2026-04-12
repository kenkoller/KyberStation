import type { Preset } from '../types.js';

export const PREQUEL_ERA_PRESETS: Preset[] = [
  // ─── Obi-Wan Kenobi (Episode I) ───
  {
    id: 'prequel-obi-wan-ep1',
    name: 'Obi-Wan Kenobi (Padawan)',
    character: 'Obi-Wan Kenobi',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'Obi-Wan\'s first lightsaber as a Padawan, wielded during the Battle of Naboo against Darth Maul.',
    hiltNotes: 'Slim cylindrical hilt with ridged grip section and thin neck.',
    config: {
      name: 'ObiWanEp1',
      baseColor: { r: 0, g: 215, b: 32 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 255, g: 255, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 280,
      shimmer: 0.05,
      ledCount: 132,
    },
  },

  // ─── Obi-Wan Kenobi (Episodes II-III) ───
  {
    id: 'prequel-obi-wan-ep3',
    name: 'Obi-Wan Kenobi (Master)',
    character: 'Obi-Wan Kenobi',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'Obi-Wan\'s third lightsaber, used throughout the Clone Wars and the duel on Mustafar.',
    hiltNotes:
      'Classic Obi-Wan hilt with tapered pommel and black grip ridges. Inspired the ANH hilt.',
    config: {
      name: 'ObiWanEp3',
      baseColor: { r: 0, g: 135, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 255, g: 255, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 280,
      retractionMs: 300,
      shimmer: 0.05,
      ledCount: 132,
    },
  },

  // ─── Qui-Gon Jinn ───
  {
    id: 'prequel-qui-gon',
    name: 'Qui-Gon Jinn',
    character: 'Qui-Gon Jinn',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'The maverick Jedi Master\'s lightsaber, used in the fateful duel against Darth Maul on Naboo.',
    hiltNotes: 'Simple, utilitarian hilt with ribbed grip and flat pommel.',
    config: {
      name: 'QuiGon',
      baseColor: { r: 0, g: 220, b: 28 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 255, g: 255, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 320,
      retractionMs: 300,
      shimmer: 0.04,
      ledCount: 132,
    },
  },

  // ─── Anakin Skywalker ───
  {
    id: 'prequel-anakin',
    name: 'Anakin Skywalker',
    character: 'Anakin Skywalker',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'Anakin\'s second lightsaber, later passed to Luke. The most iconic hilt in Star Wars.',
    hiltNotes:
      'Graflex-style hilt with black grips, red activation button, and D-ring pommel.',
    config: {
      name: 'AnakinEp3',
      baseColor: { r: 0, g: 120, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 255, g: 255, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 280,
      retractionMs: 300,
      shimmer: 0.06,
      ledCount: 132,
    },
  },

  // ─── Mace Windu ───
  {
    id: 'prequel-mace-windu',
    name: 'Mace Windu',
    character: 'Mace Windu',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'The only purple lightsaber of the Jedi Order, reflecting Windu\'s unique Vaapad fighting style.',
    hiltNotes:
      'Electrum-finished hilt signifying Windu\'s rank on the Jedi Council. Gold accents.',
    config: {
      name: 'MaceWindu',
      baseColor: { r: 130, g: 0, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 200, g: 150, b: 255 },
      style: 'unstable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 260,
      retractionMs: 280,
      shimmer: 0.25,
      ledCount: 132,
    },
  },

  // ─── Yoda ───
  {
    id: 'prequel-yoda',
    name: 'Yoda',
    character: 'Yoda',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'Grand Master Yoda\'s short-bladed lightsaber, sized for his diminutive form but devastating in combat.',
    hiltNotes: 'Compact shoto-length hilt with rounded pommel and simple design.',
    config: {
      name: 'Yoda',
      baseColor: { r: 0, g: 235, b: 20 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 200, g: 255, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 250,
      retractionMs: 260,
      shimmer: 0.03,
      ledCount: 132,
    },
  },

  // ─── Count Dooku ───
  {
    id: 'prequel-dooku',
    name: 'Count Dooku',
    character: 'Count Dooku',
    era: 'prequel',
    affiliation: 'sith',
    description:
      'The elegant curved-hilt lightsaber of the Sith Lord and former Jedi, optimized for Form II Makashi.',
    hiltNotes:
      'Distinctive curved hilt designed for precise one-handed fencing. Silver and black finish.',
    config: {
      name: 'Dooku',
      baseColor: { r: 255, g: 0, b: 0 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 255, g: 128, b: 128 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 320,
      shimmer: 0.04,
      ledCount: 132,
    },
  },

  // ─── Darth Maul ───
  {
    id: 'prequel-darth-maul',
    name: 'Darth Maul',
    character: 'Darth Maul',
    era: 'prequel',
    affiliation: 'sith',
    description:
      'Darth Maul\'s iconic double-bladed lightsaber, a weapon of terror and acrobatic combat.',
    hiltNotes: 'Long staff hilt with emitters on both ends. Can be split into two single sabers.',
    topologyNotes: 'Double-bladed staff saber. Each blade is 132 LEDs.',
    config: {
      name: 'DarthMaul',
      baseColor: { r: 255, g: 0, b: 0 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 255, g: 100, b: 100 },
      style: 'stable',
      ignition: 'scroll',
      retraction: 'scroll',
      ignitionMs: 350,
      retractionMs: 380,
      shimmer: 0.08,
      ledCount: 132,
    },
  },

  // ─── Kit Fisto ───
  {
    id: 'prequel-kit-fisto',
    name: 'Kit Fisto',
    character: 'Kit Fisto',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'The Nautolan Jedi Master\'s lightsaber, designed to function underwater on his homeworld.',
    hiltNotes: 'Hilt with dual activation switches and waterproof design.',
    config: {
      name: 'KitFisto',
      baseColor: { r: 0, g: 230, b: 40 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 200, g: 255, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 280,
      shimmer: 0.05,
      ledCount: 132,
    },
  },

  // ─── Plo Koon ───
  {
    id: 'prequel-plo-koon',
    name: 'Plo Koon',
    character: 'Plo Koon',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'Jedi Master Plo Koon\'s lightsaber, wielded by the Kel Dor pilot and Council member.',
    hiltNotes: 'Gauntlet-style hilt adapted for his clawed Kel Dor hands.',
    config: {
      name: 'PloKoon',
      baseColor: { r: 0, g: 140, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 200, g: 220, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 300,
      shimmer: 0.05,
      ledCount: 132,
    },
  },

  // ─── Aayla Secura ───
  {
    id: 'prequel-aayla-secura',
    name: 'Aayla Secura',
    character: 'Aayla Secura',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'Twi\'lek Jedi Knight Aayla Secura\'s lightsaber, carried through the Clone Wars until Order 66.',
    hiltNotes: 'Slim cylindrical hilt with tapered emitter and blue accents.',
    config: {
      name: 'AaylaSecura',
      baseColor: { r: 0, g: 100, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 200, g: 220, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 280,
      retractionMs: 290,
      shimmer: 0.04,
      ledCount: 132,
    },
  },

  // ─── Luminara Unduli ───
  {
    id: 'prequel-luminara',
    name: 'Luminara Unduli',
    character: 'Luminara Unduli',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'Mirialan Jedi Master Luminara Unduli\'s lightsaber, reflecting her disciplined and graceful combat style.',
    hiltNotes: 'Ornate hilt with stepped emitter and decorative grip patterns.',
    config: {
      name: 'Luminara',
      baseColor: { r: 0, g: 225, b: 30 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 200, g: 255, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 310,
      retractionMs: 300,
      shimmer: 0.03,
      ledCount: 132,
    },
  },

  // ─── Barriss Offee ───
  {
    id: 'prequel-barriss-offee',
    name: 'Barriss Offee',
    character: 'Barriss Offee',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'Padawan Barriss Offee\'s lightsaber, wielded before her fall to the dark side and betrayal of the Jedi.',
    hiltNotes: 'Slender hilt similar in design to her master Luminara\'s.',
    config: {
      name: 'BarrissOffee',
      baseColor: { r: 0, g: 110, b: 245 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 200, g: 220, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 290,
      retractionMs: 280,
      shimmer: 0.04,
      ledCount: 132,
    },
  },

  // ─── Shaak Ti ───
  {
    id: 'prequel-shaak-ti',
    name: 'Shaak Ti',
    character: 'Shaak Ti',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'Togruta Jedi Master Shaak Ti\'s lightsaber, carried during the defense of Kamino and beyond.',
    hiltNotes: 'Curved-neck hilt with flared emitter, designed for her Ataru and Makashi techniques.',
    config: {
      name: 'ShaakTi',
      baseColor: { r: 0, g: 130, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 200, g: 220, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 300,
      shimmer: 0.05,
      ledCount: 132,
    },
  },

  // ─── Ki-Adi-Mundi ───
  {
    id: 'prequel-ki-adi-mundi',
    name: 'Ki-Adi-Mundi',
    character: 'Ki-Adi-Mundi',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'Cerean Jedi Master Ki-Adi-Mundi\'s lightsaber, carried from Geonosis through the Outer Rim Sieges.',
    hiltNotes: 'Long hilt with stepped emitter and ribbed grip section.',
    config: {
      name: 'KiAdiMundi',
      baseColor: { r: 0, g: 120, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 200, g: 220, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 310,
      retractionMs: 290,
      shimmer: 0.04,
      ledCount: 132,
    },
  },

  // ─── Depa Billaba ───
  {
    id: 'prequel-depa-billaba',
    name: 'Depa Billaba',
    character: 'Depa Billaba',
    era: 'prequel',
    affiliation: 'jedi',
    description:
      'Jedi Master Depa Billaba\'s lightsaber, later passed to her Padawan Caleb Dume (Kanan Jarrus).',
    hiltNotes: 'Elegant hilt with gold accents, reflecting her position on the Jedi Council.',
    config: {
      name: 'DepaBillaba',
      baseColor: { r: 0, g: 210, b: 35 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 200, g: 255, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 290,
      retractionMs: 300,
      shimmer: 0.04,
      ledCount: 132,
    },
  },

  // ─── Savage Opress ───
  {
    id: 'prequel-savage-opress',
    name: 'Savage Opress',
    character: 'Savage Opress',
    era: 'prequel',
    affiliation: 'sith',
    description:
      'The Nightbrother warrior\'s double-bladed lightsaber with a distinctive yellow-green blade.',
    hiltNotes: 'Heavy double-bladed hilt with a brutalist, primitive design.',
    topologyNotes: 'Double-bladed staff saber.',
    config: {
      name: 'SavageOpress',
      baseColor: { r: 180, g: 255, b: 0 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 220, g: 255, b: 150 },
      style: 'unstable',
      ignition: 'spark',
      retraction: 'standard',
      ignitionMs: 380,
      retractionMs: 350,
      shimmer: 0.15,
      ledCount: 132,
    },
  },

  // ─── Asajj Ventress ───
  {
    id: 'prequel-asajj-ventress',
    name: 'Asajj Ventress',
    character: 'Asajj Ventress',
    era: 'prequel',
    affiliation: 'sith',
    description:
      'Ventress\'s paired curved-hilt lightsabers that can connect at the pommels to form a double-blade.',
    hiltNotes:
      'Dual curved hilts that clip together at the pommel. Designed for Jar\'Kai dual-wielding.',
    topologyNotes: 'Dual wielded curved hilts, connectable into a staff configuration.',
    config: {
      name: 'Ventress',
      baseColor: { r: 255, g: 0, b: 10 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 255, g: 100, b: 100 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 260,
      retractionMs: 280,
      shimmer: 0.08,
      ledCount: 132,
    },
  },

  // ─── General Grievous ───
  {
    id: 'prequel-grievous',
    name: 'General Grievous',
    character: 'General Grievous',
    era: 'prequel',
    affiliation: 'other',
    description:
      'Trophies stolen from defeated Jedi. Grievous wields up to four sabers simultaneously — blue and green blades collected from his victims.',
    hiltNotes:
      'Various stolen Jedi hilts. Most commonly depicted with Anakin-style and generic Jedi hilts.',
    topologyNotes: 'Quad-wielded stolen Jedi lightsabers (2 blue, 2 green).',
    config: {
      name: 'Grievous',
      baseColor: { r: 0, g: 200, b: 40 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 200, g: 255, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 280,
      retractionMs: 300,
      shimmer: 0.06,
      ledCount: 132,
    },
  },

  // ─── Palpatine / Darth Sidious ───
  {
    id: 'prequel-palpatine',
    name: 'Darth Sidious',
    character: 'Palpatine / Darth Sidious',
    era: 'prequel',
    affiliation: 'sith',
    description:
      'The Sith Lord\'s concealed lightsaber, an elegant Phrik-alloy weapon hidden within the Supreme Chancellor\'s robes.',
    hiltNotes:
      'Compact electrum-finished hilt with ornate aurodium inlays. Designed to be concealed in his sleeve.',
    config: {
      name: 'Sidious',
      baseColor: { r: 255, g: 0, b: 0 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 200, b: 0 },
      blastColor: { r: 255, g: 100, b: 100 },
      style: 'stable',
      ignition: 'spark',
      retraction: 'standard',
      ignitionMs: 250,
      retractionMs: 260,
      shimmer: 0.10,
      ledCount: 132,
    },
  },
];
