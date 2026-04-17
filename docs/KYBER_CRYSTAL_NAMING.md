# Kyber Crystal — Naming System

**Status:** Design-phase. Companion to `KYBER_CRYSTAL_VISUAL.md`.

**One-line goal:** Let users name their crystal privately without
restriction, generate evocative Star Wars-native public names
automatically, filter truly hateful content from public sharing, and
still let someone shout out "Darth Malice" or "Dawnlight of Ilum" in
a Discord feed.

---

## 1. Two-tier naming — foundational architecture

Every crystal has **two name fields**, stored separately, with
different rules:

**`privateName`** — stored locally (IndexedDB) only. Never leaves the
user's device. Never embedded in share payloads. Never surfaced in
community artefacts. No moderation.

**`publicName`** — embedded in the Kyber Glyph payload and shown on
Saber Cards, Gallery, and every shared surface. Passes through the
moderation filter at share-time (not create-time).

The user's own UI always displays `privateName` if set; the public
label appears on anything leaving the device.

**Rationale:** users have a right to privately name their tools
whatever they want. The app has a responsibility not to be a pipeline
for hate speech. Two-tier threads this honestly — nothing is censored
that stays local; the public tier has a reasonable standard of care.

## 2. Generation patterns (15)

The auto-suggester produces name candidates via weighted random
selection across these patterns. Percentages sum to 100.

| # | Weight | Pattern | Example |
|---|---|---|---|
| 1 | 15% | `The {Adj} {Noun}` | "The Silent Edge" |
| 2 | 12% | `{ColourMood} {Noun}` | "Crimson Vow" |
| 3 | 10% | `{Planet} {Thing}` | "Ilum Shard" |
| 4 | 9%  | `{Concept} of {Concept}` | "Dawn of Bogan" |
| 5 | 8%  | `{Archetype}'s {Noun}` | "Sentinel's Flame" |
| 6 | 8%  | `{Title} {InventedName}` | "Darth Malice" |
| 7 | 7%  | `{Verb}-{Noun}` compound | "Ashfall", "Duskmend" |
| 8 | 6%  | `By {Concept}, the {Noun}` | "By Ashla, the Edge" |
| 9 | 6%  | `{Mando'a}-{Mando'a}` hyphenated | "Beskar-Vow", "Verda-Kad" |
| 10 | 5% | `{Oath} {Noun}` | "Oathbound Fang" |
| 11 | 4% | Lightsaber-form riff | "Vaapad Unbound", "Shii-Cho's Echo" |
| 12 | 4% | `{AncientCulture} {Relic}` | "Rakatan Shard", "Kwa Sentinel" |
| 13 | 3% | `{Colour} at {Place}` | "Ember at Malachor" |
| 14 | 2% | `The {Noun} That {Verb}s` | "The Blade That Sings" |
| 15 | 1% | `{Forged-by} Fang` | "Nightsister-Kissed Edge", "Outcast-Forged Vow" |

## 3. Config-aware word-pool biasing

The generator reads the current `bladeStore` state and biases which
vocabulary pools contribute words:

| Config state | Biased toward |
|---|---|
| `affiliation: jedi` | Light-side vocabulary (Ashla, Dawn, Serenity, Vigil, Kyber-Pure) |
| `affiliation: sith` | Dark-side vocabulary (Bogan, Wrath, Crimson, Bleed, Fury) |
| `affiliation: grey` | Neutral / Grey-Jedi vocabulary (Bendu, Balance, Edge, Between) |
| `style: unstable` | Volatile words (Restless, Broken, Untamed, Hungry) |
| `style: fire` | Warm words (Ember, Flame, Ashfire, Smoulder) |
| `style: crystal-shatter` | Fracture words (Shard, Cleave, Broken, Seven-Fold) |
| `baseColor.hue ∈ [210, 260]` (blue) | Cool words (Sky, Ice, Tide, Still, Dawn) |
| `baseColor.hue ∈ [0, 30] + [330, 360]` (red) | Hot words (Crimson, Wrath, Ember, Fury, Bleed) |
| `baseColor.hue ∈ [100, 150]` (green) | Verdant words (Vine, Grove, Wild, Living) |
| `baseColor.hue ∈ [50, 70]` (yellow) | Dawn words (Vigil, Gold, Dawn, Sentinel) |
| `baseColor.hue ∈ [270, 310]` (purple) | Dusk words (Twilight, Hollow, Violet, Dusk) |
| `dualModeIgnition: true` | Duality words (Twin, Paired, Echo, Mirror) |
| `ledCount > 144` | Grand words (Greatblade, Kingsguard) |
| `ledCount < 72` | Compact words (Shoto, Shard, Splinter, Edge) |

## 4. Vocabulary seed dataset

The seed ships ~500 words across these buckets. Full file:
`apps/web/lib/naming/starWarsVocab.ts`. Community PRs welcome via
`docs/VOCABULARY_CONTRIBUTING.md`.

### Force traditions (canon + Legends)

Je'daii, Potentium, Ashla, Bogan, Bendu, Dai Bendu, Aing-Tii, Baran Do,
Matukai, Kro Var, Zeison Sha, Jal Shey, Luka Sene, Theran Listeners,
Jensaarai, Altisian Jedi, Iron Knights, Gray Jedi, Sorcerers of Rhand,
Grumani Sufi

### Mandalorian / Mando'a

Mand'alor, Alor, Vod, Vode, Beskar, Beskar'gam, Haar'chak, Kad, Kad'au,
Jetii, Verda, Aliit, Manda, Vheh, Resol'nare, Mythosaur, Dha'Kad'au,
Tion'rak, Haat, Mando'ade, Supercommando, Jate, Jate'shya

### Clone Wars units

501st, 212th, 104th Wolfpack, Ghost Company, 7th Sky Corps, 41st Elite,
Coruscant Guard, Muunilinst 10, Delta Squad, Omega Squad, Domino Squad,
Clone Force 99, Bad Batch, Ghost Crew, Null ARCs, Arc Trooper

### Old Republic / KOTOR / SWTOR

Revan, Malak, Revanites, Knights of Zakuul, Eternal Empire, Exiled One,
Outlander, Tulak Hord, Naga Sadow, Marka Ragnos, Freedon Nadd, Exar Kun,
Ulic Qel-Droma, Nomi Sunrider, Odan-Urr, Arca Jeth, Jolee Bindo, Meetra
Surik, Bastila, Satele Shan, Barsen'thor, Wrath, Darth Vitiate, Darth
Marr, Jaesa Willsaam, Kira Carsen

### Sith Triumvirates and orders

Lords of the Sith Triumvirate, Nihilus, Sion, Traya, Emperor Vitiate,
Dark Council, Rule of Two, Rule of One, Brotherhood of Darkness, Sith
Eternal, Final Order

### Ancient species / cultures

Rakata, Gree, Kwa, Celestials, Killiks, Sharu, Columi, Taungs, Zhell,
Dai Nogas, Esh-kha, Infinite Empire, Massassi

### Dathomiri

Nightsister, Nightbrother, Ichor, Shyarn, Magick, Mother Talzin,
Merrin, Old Daka, Kycina, Winged Goddesses

### Lightsaber forms

Shii-Cho, Makashi, Soresu, Ataru, Djem So, Shien, Niman, Juyo, Vaapad,
Trakata, Jar'Kai, Dun Möch, Sokan, Tràkata, Tutaminis, Form Zero

### Weapon archetypes

Lightsaber, Saberstaff, Shoto, Crossguard, Lightwhip, Lightclub,
Dual-phase, Lightsaber-pike, Darksaber, Lightfoil, Light-dagger,
Lightbaton, Protosaber

### Galactic geography (deep cuts)

Tython, Ossus, Dantooine, Ilum, Jedha, Malachor V, Mortis, Korriban,
Moraband, Dromund Kaas, Ziost, Yavin 4, Dagobah, Tund, Lettow, Taris,
Bogano, Ahch-To, Kesh, Exegol, Nathema, Typhon, Bosthirda

### Mythic artefacts

Holocron, Wayfinder, Kaiburr Crystal, Great Crystal of Aantonaii,
Journal of the Whills, Tablets of Ashla, Mortis Dagger, Netherworld of
the Force, Rakatan Star Forge, Heart of the Guardian, Mantle of the
Force, Eye of the Force

### Titles and honorifics

Darth, Dark Lord, Sith Lord, Jedi Master, Jedi Knight, Sentinel,
Guardian, Consular, Grand Master, Battlemaster, Barsen'thor, Shadow,
Seeker, Watchman, Reclaimer, Lore-keeper, Sage, Wayseeker,
Kel Dor Baran Do Sage, Iron Knight

### Aurebesh syllable seeds (for invented names)

Aurek, Besh, Cresh, Dorn, Esk, Forn, Grek, Herf, Isk, Jenth, Krill,
Leth, Mern, Nern, Osk, Peth, Qek, Resh, Senth, Trill, Usk, Vev, Wesk,
Xesh, Yirt, Zerek

### Trope-specific

Rule of Two, Path of Light, Way of the Force, Code of the Jedi,
Way of Mandalore, Six Actions, Kyber Song, Living Force, Unifying
Force, Cosmic Force, Chosen One, The Fulcrum, The Grey, The Outlander

### Jedi archivist / apprentice ranks

Padawan, Initiate, Youngling, Aspirant, Apprentice, Acolyte, Inquisitor,
Sith Assassin, Sith Warrior, Sith Juggernaut, Sith Marauder, Dark Lord
Aspirant, Sith Pureblood, Sith Hand

### Nightsister spell-names

Chant of Resurrection, Spell of Dark Binding, Magick-Kissed,
Night-Blessed, Dathomiri Ichor-Marked, Seventh-Sister, Shadowbound,
Witch-Spoken

### Legend ritual names

Trial of the Flesh, Trial of Skill, Trial of Spirit, Trial through the
Force, Trial of Courage, Trial of Insight, Concordance of Fealty,
Sith Blooding

### Colour-mood pools

- **Blue** → Sky, Ice, Tide, Still, Deepwater, Reverent, Dawn-Pale
- **Red** → Crimson, Wrath, Ember, Fury, Bleed, Pyre, Ashen
- **Green** → Verdant, Wild, Vine, Grove, Living, Canopy, Mistlight
- **Yellow** → Dawn, Vigil, Gold, Sunlit, Sentinel-Flame, Vigilant
- **Purple** → Dusk, Twilight, Hollow, Violet-Hush, Between-Worlds
- **White** → Pure, Lost, Undone, Unbonded, First-Light, Crystal-Raw
- **Black** → Void, Shadowed, Abyssal, Mandalore-Forged

### Forged-by prefixes

Outcast-Forged, Nightsister-Kissed, Mand'alor-Blessed, Ilum-Born,
Temple-Pure, Wound-in-the-Force, Kyber-Singing, Exile-Tempered,
Fulcrum-Marked, Dawn-Born

### Ancient adjectives / verbs for compounds

Ash, Dusk, Dawn, Mourn, Sear, Mend, Echo, Rend, Wake, Vow, Kin, Oath,
Silent, Singing, Breathing, Wounding, Binding, Cleaving, Whispering,
Unraveling

### Evocative short nouns

Edge, Blade, Fang, Shard, Spark, Flame, Ember, Pyre, Beacon, Tide,
Veil, Wake, Echo, Chant, Rite, Vow, Bond, Oath, Whisper, Star, Dawn,
Dusk, Shadow

## 5. Moderation gate — public name filter

Runs at **share time**, not create time. User can type anything
privately; only flags when they mint a public artefact.

### Filter pipeline

1. **Normalise input** — lowercase, strip diacritics, collapse
   whitespace, Unicode-normalise to NFKD.
2. **Leet-speak normalization** — substitute `4→a`, `3→e`, `1→i/l`,
   `0→o`, `5→s`, `7→t`, `$→s`, `@→a` etc. to catch evasion attempts.
3. **Wordlist check** — shipped plain-text list of known slurs and
   hate-speech tokens, sourced from LDNOOBW / Shutterstock / community
   additions. Stored at `apps/web/lib/naming/publicNameBlocklist.txt`.
   Not version-controlled as runtime state — it's content policy.
4. **N-gram substring check** — if a known slur appears as a substring
   anywhere in the normalised input, block.
5. **Community-curated augmentation** — maintainers can add tokens via
   PR when the filter misses something.

On failure:

```
┌────────────────────────────────────────────────────────┐
│ ⚠  This name isn't available for public sharing.       │
│                                                        │
│ Your private name ("[private]") stays unchanged.       │
│ Please pick a different public name, or share          │
│ without a custom public name.                          │
│                                                        │
│ [ Pick different name ]  [ Share without name ]        │
└────────────────────────────────────────────────────────┘
```

No explanation of *why* the name was flagged — that invites
adversarial testing of the filter. Just a soft redirect.

### What the filter does NOT block

- Narrative darkness: "Youngling Killer", "Order 66", "Sith Slayer",
  "Deathbringer", "Wound-in-the-Force" — all allowed. Star Wars is
  a war story; dark lore is part of it.
- In-universe titles: "Darth [Anything]", "Dark Lord", "Emperor's
  Hand" — all allowed.
- Character references by fans: "Leia's Wrath", "Luke's Last
  Stand", "Baby Yoda's Edge" — allowed. We're not a licensed product;
  fan creativity is the whole point.
- Edgy-but-not-hateful: "Fury", "Bleed", "Ashfall" — allowed.

### What the filter DOES block

- Slurs (racial, ethnic, gender, sexuality, ability)
- Explicit hate-speech terms
- Sexual content explicit enough to make the artefact inappropriate
  for a general-audience share
- Known trolling/doxing patterns

Inevitably imperfect. We accept false positives (better than false
negatives) and accept that some edge cases will slip through. Human
moderation via community-gallery PR review catches the remainder.

## 6. Suggestion UI

The naming dialog, surfaced in the Wizard (final step) and accessible
from the "My Crystal" panel:

```
┌─────────────────────────────────────────────────┐
│  Name your kyber crystal                        │
│  ───────────────────────                        │
│                                                 │
│  Suggestions (biased to your config):           │
│    ◇ Dawnlight of Ilum              [use]      │
│    ◇ The Silent Vigil               [use]      │
│    ◇ Sentinel's Shard               [use]      │
│                                                 │
│  [ 🎲 Randomize ]    [ Type my own ]           │
│                                                 │
│  ─── Custom (public — appears on shares) ───    │
│  ┌──────────────────────────────────────┐      │
│  │                                      │      │
│  └──────────────────────────────────────┘      │
│  ❗ Runs through filter at share time            │
│                                                 │
│  ─── Private (only you see this) ────────────   │
│  ┌──────────────────────────────────────┐      │
│  │                                      │      │
│  └──────────────────────────────────────┘      │
│  No filter. Call it anything you like.          │
│                                                 │
│                          [ Cancel ] [ Set ]     │
└─────────────────────────────────────────────────┘
```

**Key UI principles:**

- Three suggestions shown by default. Randomize rolls three new ones.
- Public / private fields visible simultaneously — no hidden toggle.
- The ❗ inline hint makes the moderation gate explicit up-front,
  not a surprise at share time.
- Users can skip both fields entirely. Default behaviour: no name, just
  the glyph prefix (`JED.4X7QPN...`).
- Randomize button icon is always accessible (🎲 or the SVG equivalent).

## 7. Handoff notes

1. **Ship the vocabulary file as data, not code.** `starWarsVocab.ts`
   exports a plain object; the generator is pure logic over that data.
   Makes community contributions trivial (add to the JSON, PR merges).
2. **Make the filter blocklist a plain text file,** one token per
   line, shipped at `apps/web/lib/naming/publicNameBlocklist.txt`.
   Maintainers add tokens via PR. Don't over-engineer — simple is
   auditable.
3. **Don't AI-moderate.** OpenAI moderation API, Perspective API,
   Cloudflare AI — all require sending user names to third-party
   servers. Local wordlist is private, auditable, and good-enough.
4. **Test on a grab-bag of inputs** including: legitimate dark names
   ("Youngling Killer"), in-universe titles ("Darth Plagueis"),
   fictional character names ("Darth Leia"), obvious evasion
   ("n!gg3r"), mixed-case + unicode ("NɪᴄᴋᴇD"), and edge-case
   combinations. The generator pipeline should regen automatically
   if a suggestion fails moderation (never surface a blocked name
   as a suggestion).
5. **Named crystals appear on every Saber Card**. Template layout must
   accommodate a 20-character name gracefully; truncate with ellipsis
   beyond that. See `SHARE_PACK.md`.
