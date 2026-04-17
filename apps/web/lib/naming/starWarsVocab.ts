/**
 * Star Wars vocabulary seed dataset for Kyber Crystal naming.
 *
 * Powers the name-suggestion generator in the crystal naming UI. See:
 *   - docs/KYBER_CRYSTAL_NAMING.md — full naming system spec
 *   - docs/VOCABULARY_CONTRIBUTING.md — how to add to this dataset
 *
 * Organised by bucket so the generator can bias pools based on
 * config state (affiliation, style, colour hue, ledCount, etc.).
 *
 * Goal: dense Star Wars lore coverage that rewards super-fans
 * ("Barsen'thor's Vow at Ossus") while staying readable for casual
 * users. Draws from canon + Legends + expanded universe.
 *
 * This is v1 of the dataset. Community PRs welcome — add words,
 * don't rename existing ones (stored names reference them).
 */

export const VOCAB = {
  // ─── Force traditions ─────────────────────────────────────────────────────
  forceTraditions: [
    "Je'daii", 'Potentium', 'Ashla', 'Bogan', 'Bendu', 'Dai Bendu',
    'Aing-Tii', 'Baran Do', 'Matukai', 'Kro Var', 'Zeison Sha',
    'Jal Shey', 'Luka Sene', 'Theran Listener', 'Jensaarai',
    'Altisian Jedi', 'Iron Knight', 'Gray Jedi', 'Sorcerer of Rhand',
    'Grumani Sufi',
  ],

  // ─── Mandalorian / Mando'a ────────────────────────────────────────────────
  mandoa: [
    "Mand'alor", 'Alor', 'Vod', 'Vode', 'Beskar', "Beskar'gam",
    "Haar'chak", 'Kad', "Kad'au", 'Jetii', 'Verda', 'Aliit', 'Manda',
    'Vheh', "Resol'nare", 'Mythosaur', "Dha'Kad'au", "Tion'rak",
    'Haat', "Mando'ade", 'Supercommando', 'Jate', "Jate'shya",
    'Shereshoy',
  ],

  // ─── Clone Wars units ─────────────────────────────────────────────────────
  cloneUnits: [
    '501st', '212th', '104th Wolfpack', 'Ghost Company', '7th Sky Corps',
    '41st Elite', 'Coruscant Guard', 'Muunilinst 10', 'Delta Squad',
    'Omega Squad', 'Domino Squad', 'Clone Force 99', 'Bad Batch',
    'Ghost Crew', 'Null ARCs', 'ARC Trooper',
  ],

  // ─── Old Republic / KOTOR / SWTOR ─────────────────────────────────────────
  oldRepublic: [
    'Revan', 'Malak', 'Revanites', 'Knights of Zakuul', 'Eternal Empire',
    'Exiled One', 'Outlander', 'Tulak Hord', 'Naga Sadow', 'Marka Ragnos',
    'Freedon Nadd', 'Exar Kun', 'Ulic Qel-Droma', 'Nomi Sunrider',
    'Odan-Urr', 'Arca Jeth', 'Jolee Bindo', 'Meetra Surik', 'Bastila',
    'Satele Shan', "Barsen'thor", 'Wrath', 'Darth Vitiate', 'Darth Marr',
    'Jaesa Willsaam', 'Kira Carsen', 'Kyle Katarn', 'Jaden Korr',
  ],

  // ─── Sith Triumvirates / orders ──────────────────────────────────────────
  sithOrders: [
    'Sith Triumvirate', 'Nihilus', 'Sion', 'Traya', 'Emperor Vitiate',
    'Dark Council', 'Rule of Two', 'Rule of One', 'Brotherhood of Darkness',
    'Sith Eternal', 'Final Order', 'Sith Empire',
  ],

  // ─── Ancient species / cultures ───────────────────────────────────────────
  ancientCultures: [
    'Rakata', 'Gree', 'Kwa', 'Celestial', 'Killik', 'Sharu', 'Columi',
    'Taung', 'Zhell', 'Dai Nogas', 'Esh-kha', 'Infinite Empire',
    'Massassi',
  ],

  // ─── Dathomiri ───────────────────────────────────────────────────────────
  dathomiri: [
    'Nightsister', 'Nightbrother', 'Ichor', 'Shyarn', 'Magick',
    'Mother Talzin', 'Merrin', 'Old Daka', 'Kycina', 'Winged Goddess',
  ],

  // ─── Lightsaber forms ─────────────────────────────────────────────────────
  saberForms: [
    'Shii-Cho', 'Makashi', 'Soresu', 'Ataru', 'Djem So', 'Shien',
    'Niman', 'Juyo', 'Vaapad', 'Trakata', "Jar'Kai", 'Dun Möch',
    'Sokan', 'Tràkata', 'Tutaminis', 'Form Zero',
  ],

  // ─── Weapon archetypes ────────────────────────────────────────────────────
  weaponTypes: [
    'Lightsaber', 'Saberstaff', 'Shoto', 'Crossguard', 'Lightwhip',
    'Lightclub', 'Dual-phase', 'Lightsaber-pike', 'Darksaber',
    'Lightfoil', 'Light-dagger', 'Lightbaton', 'Protosaber',
  ],

  // ─── Galactic geography (deep cuts) ──────────────────────────────────────
  planets: [
    'Tython', 'Ossus', 'Dantooine', 'Ilum', 'Jedha', 'Malachor V',
    'Mortis', 'Korriban', 'Moraband', 'Dromund Kaas', 'Ziost', 'Yavin',
    'Dagobah', 'Tund', 'Lettow', 'Taris', 'Bogano', 'Ahch-To', 'Kesh',
    'Exegol', 'Nathema', 'Typhon', 'Bosthirda', 'Lehon',
  ],

  // ─── Mythic artefacts ─────────────────────────────────────────────────────
  artefacts: [
    'Holocron', 'Wayfinder', 'Kaiburr Crystal', 'Great Crystal of Aantonaii',
    'Journal of the Whills', 'Tablets of Ashla', 'Mortis Dagger',
    'Netherworld', 'Rakatan Star Forge', 'Heart of the Guardian',
    'Mantle of the Force', 'Eye of the Force', 'Codex of Tython',
  ],

  // ─── Titles and honorifics ────────────────────────────────────────────────
  titles: [
    'Darth', 'Dark Lord', 'Sith Lord', 'Jedi Master', 'Jedi Knight',
    'Sentinel', 'Guardian', 'Consular', 'Grand Master', 'Battlemaster',
    "Barsen'thor", 'Shadow', 'Seeker', 'Watchman', 'Reclaimer',
    'Lore-keeper', 'Sage', 'Wayseeker', 'Baran Do Sage', 'Iron Knight',
  ],

  // ─── Archetypes / roles ───────────────────────────────────────────────────
  archetypes: [
    'Sentinel', 'Guardian', 'Warden', 'Consular', 'Revenant', 'Shade',
    'Keeper', 'Outcast', 'Wayfinder', 'Padawan', 'Initiate', 'Aspirant',
    'Acolyte', 'Inquisitor', 'Sith Assassin', 'Sith Warrior',
    'Sith Juggernaut', 'Sith Marauder', 'Sith Pureblood', "Emperor's Hand",
  ],

  // ─── Aurebesh syllable seeds ──────────────────────────────────────────────
  aurebeshSyllables: [
    'Aurek', 'Besh', 'Cresh', 'Dorn', 'Esk', 'Forn', 'Grek', 'Herf',
    'Isk', 'Jenth', 'Krill', 'Leth', 'Mern', 'Nern', 'Osk', 'Peth',
    'Qek', 'Resh', 'Senth', 'Trill', 'Usk', 'Vev', 'Wesk', 'Xesh',
    'Yirt', 'Zerek',
  ],

  // ─── Force tropes / concepts ──────────────────────────────────────────────
  tropes: [
    'Rule of Two', 'Path of Light', 'Way of the Force', 'Code of the Jedi',
    'Way of Mandalore', 'Six Actions', 'Kyber Song', 'Living Force',
    'Unifying Force', 'Cosmic Force', 'Chosen One', 'The Fulcrum',
    'The Grey', 'The Outlander',
  ],

  // ─── Ritual / trial names ─────────────────────────────────────────────────
  rituals: [
    'Trial of the Flesh', 'Trial of Skill', 'Trial of Spirit',
    'Trial through the Force', 'Trial of Courage', 'Trial of Insight',
    'Concordance of Fealty', 'Sith Blooding', 'Initiate Trial',
    'Knighting Ceremony',
  ],

  // ─── Nightsister spells ───────────────────────────────────────────────────
  nightsisterSpells: [
    'Chant of Resurrection', 'Spell of Dark Binding', 'Magick-Kissed',
    'Night-Blessed', 'Ichor-Marked', 'Seventh-Sister', 'Shadowbound',
    'Witch-Spoken', 'Dathomiri-Touched',
  ],

  // ─── Colour-mood pools (hue-biased selection) ─────────────────────────────
  colourMoods: {
    blue:   ['Sky', 'Ice', 'Tide', 'Still', 'Deepwater', 'Reverent', 'Dawn-Pale'],
    red:    ['Crimson', 'Wrath', 'Ember', 'Fury', 'Bleed', 'Pyre', 'Ashen'],
    green:  ['Verdant', 'Wild', 'Vine', 'Grove', 'Living', 'Canopy', 'Mistlight'],
    yellow: ['Dawn', 'Vigil', 'Gold', 'Sunlit', 'Sentinel-Flame', 'Vigilant'],
    purple: ['Dusk', 'Twilight', 'Hollow', 'Violet-Hush', 'Between-Worlds'],
    white:  ['Pure', 'Lost', 'Undone', 'Unbonded', 'First-Light', 'Crystal-Raw'],
    black:  ['Void', 'Shadowed', 'Abyssal', 'Mandalore-Forged'],
    cyan:   ['Frostlight', 'Tideborn', 'Kamino-Glass', 'Ilum-Pure'],
    orange: ['Ember-Kissed', 'Mustafar-Lit', 'Sunset-Forged', 'Kestis-Warm'],
    magenta:['Nightsister-Pink', 'Dathomir-Bloom', 'Zeffo-Petal'],
  },

  // ─── "Forged-by" prefixes ─────────────────────────────────────────────────
  forgedBy: [
    'Outcast-Forged', 'Nightsister-Kissed', "Mand'alor-Blessed",
    'Ilum-Born', 'Temple-Pure', 'Wound-in-the-Force', 'Kyber-Singing',
    'Exile-Tempered', 'Fulcrum-Marked', 'Dawn-Born', 'Jedha-Tuned',
    'Ossus-Blessed', 'Tython-Attuned', 'Malachor-Scarred',
  ],

  // ─── Ancient adjectives for compounds ─────────────────────────────────────
  ancientAdjectives: [
    'Ash', 'Dusk', 'Dawn', 'Mourn', 'Sear', 'Mend', 'Echo', 'Rend',
    'Wake', 'Vow', 'Kin', 'Oath', 'Silent', 'Singing', 'Breathing',
    'Wounding', 'Binding', 'Cleaving', 'Whispering', 'Unraveling',
    'Deepwater', 'Farthest', 'Forgotten', 'Unbroken',
  ],

  // ─── Evocative short nouns ────────────────────────────────────────────────
  shortNouns: [
    'Edge', 'Blade', 'Fang', 'Shard', 'Spark', 'Flame', 'Ember', 'Pyre',
    'Beacon', 'Tide', 'Veil', 'Wake', 'Echo', 'Chant', 'Rite', 'Vow',
    'Bond', 'Oath', 'Whisper', 'Star', 'Dawn', 'Dusk', 'Shadow',
    'Bloom', 'Thorn', 'Briar', 'Thread', 'Song', 'Verse', 'Hymn',
  ],

  // ─── Adjectives (general, non-colour) ─────────────────────────────────────
  adjectives: [
    'Silent', 'Singing', 'Fallen', 'Risen', 'Ancient', 'Unbroken',
    'Hidden', 'Forgotten', 'First', 'Last', 'Endless', 'Forever',
    'Bound', 'Unbound', 'Sacred', 'Profane', 'Lonely', 'Waiting',
    'Restless', 'Steady', 'Tempered', 'Awakened',
  ],

  // ─── Invented names for use with "Darth X" / "Master X" patterns ─────────
  // Deliberately not drawn from canon to avoid trademark awkwardness in
  // auto-suggestions. User-typed names are unrestricted (see naming doc §5).
  inventedNames: [
    'Malice', 'Voss', 'Veyra', 'Kael', 'Talon', 'Morvain', 'Sarek',
    'Vessel', 'Thrawne', 'Kyrath', 'Seyn', 'Loras', 'Vehl', 'Dranath',
    'Kaen', 'Morvain', 'Ixia', 'Kaelis', 'Xethra', 'Ombros',
    'Selene', 'Vorek', 'Thalen', 'Kyrin', 'Ashor', 'Mirza',
  ],
} as const;

export type VocabBucket = keyof typeof VOCAB;

/** Total word count across all buckets (including nested colourMoods). */
export function vocabularyTotalCount(): number {
  let total = 0;
  for (const [key, value] of Object.entries(VOCAB)) {
    if (key === 'colourMoods') {
      const moods = value as Record<string, readonly string[]>;
      for (const pool of Object.values(moods)) {
        total += pool.length;
      }
    } else if (Array.isArray(value)) {
      total += (value as readonly string[]).length;
    }
  }
  return total;
}
