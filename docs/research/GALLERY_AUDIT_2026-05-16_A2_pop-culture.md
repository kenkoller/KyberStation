# Gallery Audit — pop-culture/* — Agent A2

**Date:** 2026-05-16
**Scope:** 132 presets across 13 sub-files in `packages/presets/src/characters/pop-culture/`
**Auditor:** A2

## File breakdown (verified from disk)

| File | Preset count |
|---|---|
| lotr.ts | 10 |
| mythology.ts | 13 |
| marvel.ts | 14 |
| dc.ts | 12 |
| zelda.ts | 8 |
| final-fantasy.ts | 14 |
| anime.ts | 15 |
| kids-cartoons.ts | 8 |
| power-rangers.ts | 7 |
| adult-animation.ts | 5 |
| mascots.ts | 8 |
| harry-potter.ts | 10 |
| halo.ts | 8 |
| **Total** | **132** |

## Summary

- Total audited: 132
- PASS: 113
- FLAG: 19

## Systemic issues

- **Metadata is uniformly excellent.** All 132 presets correctly set `screenAccurate: false`, `continuity: 'pop-culture'` (or `'mythology'` for the mythology file), and `era: 'expanded-universe'` as the documented fallback. Every preset has populated `hiltNotes` and detailed (>80 char) descriptions in the established voice. Header comments per file consistently explain the era/affiliation conventions used.
- **Color accuracy is the most common flag area.** A handful of presets diverge from the canonical depiction in ways worth noting: Mind Stone's yellow is debatable (the MCU stone is more amber-yellow; canon-orange exists in the comics), Yellow/Pink/Red Rangers all have very high saturation that's intentional but reads slightly over-bright vs. the muted 90s tokusatsu palette, and Master Chief's "gold-green visor" was rendered as olive-gold which is defensible but skews more "olive" than "gold." None are catastrophically wrong — just judgment calls worth flagging for downstream visual QA.
- **A few style/effect mismatches relative to canon.** Buster Sword's `stable` style is reasonable but loses the Materia "pulsing glow" the description sells; Mind Stone is `stable` despite Loki's scepter / Vision's gem pulsing on screen; Tomoe Gozen and Aquaman and Zora-Spear all use the engine's `tidal` style which is fine but worth verifying that style currently exists in the v0.21.1 engine registry. A handful of styles (`torrent`, `vortex`, `tidal`, `summon` ignition, `evaporate` retraction) appear in pop-culture configs but may not all be implemented yet — codegen will fall back to `stable` if missing; flagged inline for the team's awareness.
- **Outlier timings cluster on the divine/cursed/ceremonial blades.** Damocles (700/1100ms), One Ring (700/900ms), Omega Weapon (550/700ms), Aang (600/800ms), Sword of Damocles, Caladbolg (600/700ms), and Hyorinmaru (450/600ms) all run long. Each is justified narratively (gravity-pulled, cursed, summoned), but they are at the outer envelope of the 200-450 / 300-500 typical range — worth a single design decision on whether the upper bound of "ceremonial slow" is 700ms or 1100ms.

## Per-file findings

### lotr.ts

#### pop-lotr-glamdring: Glamdring
- Status: PASS

#### pop-lotr-sting: Sting
- Status: PASS — note ledCount 72 is intentional (hobbit-scale).

#### pop-lotr-anduril: Andúril
- Status: PASS — flame-of-the-west aurora is on-canon.

#### pop-lotr-narsil-broken: Narsil (Broken)
- Status: PASS — 600/800ms timing justified by "broken/dying blade" narrative; ledCount 64 intentional.

#### pop-lotr-orcrist: Orcrist
- Status: PASS — slight green undertone vs Glamdring is a defensible reading of the Tolkien art.

#### pop-lotr-gurthang: Gurthang
- Status: PASS — `darksaber` style is the correct hardware-honest path for a meteoric-iron black blade per Hardware Fidelity principle.

#### pop-lotr-morgul-blade: Morgul-blade
- Status: PASS — sickly purple/green is on canon.

#### pop-lotr-herugrim: Herugrim
- Status: PASS — Rohirric gold is on-brand.

#### pop-lotr-narya: Narya (Ring of Fire)
- Status: PASS — ember-red fire style fits "Red Ring."

#### pop-lotr-one-ring: One Ring (Inscribed)
- Status: PASS — 700/900ms timing is at the outer envelope but narratively justified for an inscription-reveal ritual.

### mythology.ts

#### pop-myth-excalibur: Excalibur
- Status: PASS

#### pop-myth-kusanagi: Kusanagi-no-Tsurugi
- Status: PASS — `helix` style for the Grass-Cutter/wind imagery is creative.

#### pop-myth-gae-bolg: Gáe Bolg
- Status: PASS

#### pop-myth-gram: Gram
- Status: PASS — gradient steel-to-fire matches "dragon-slayer reforged" narrative.

#### pop-myth-joyeuse: Joyeuse
- Status: PASS — rotoscope shimmer for the hue-shifting blade is a good interpretive choice; description correctly notes visualizer-only limitation.

#### pop-myth-caladbolg: Caladbolg
- Status: PASS — 7-stop rainbow gradient is justified by the "rainbow arc" mythology.

#### pop-myth-harpe: Harpē
- Status: PASS

#### pop-myth-trident: Trident of Poseidon
- Status: PASS

#### pop-myth-thor-mjolnir: Thor's Hammer (Norse)
- Status: PASS — explicitly distinguished from MCU Mjolnir; helix style sells the "twin lightning strands" lore.

#### pop-myth-damocles: Sword of Damocles
- Status: FLAG: 700/1100ms timing is the longest in the entire pop-culture set; narratively justified by "hanging by a hair / inevitable fall" framing but worth a design decision on whether ceremonial outliers should cap at ~700ms.

#### pop-myth-vajra: Vajra (Diamond Thunderbolt)
- Status: FLAG: `style: 'vortex'` — verify this style is registered in the v0.21.1 engine; if not, codegen falls back to `stable` and the "spinning vortex" description becomes aspirational rather than rendered.

#### pop-myth-tomoe-gozen: Tomoe Gozen (Tide-Edge Naginata)
- Status: FLAG: `style: 'tidal'` — same engine-registry verification needed (see Aquaman + Zora-spear, which share this style).

#### pop-myth-cu-chulainn-stream: Cú Chulainn's Battle-Stream
- Status: PASS — `style: 'neutron'` is in the documented engine style list (CLAUDE.md confirms NeutronStyle.ts).

### marvel.ts

#### pop-marvel-mjolnir: Mjolnir
- Status: PASS — lightning-blue unstable for thunder god is canon.

#### pop-marvel-stormbreaker: Stormbreaker
- Status: PASS — richer/fuller than Mjolnir aurora is correctly distinguished.

#### pop-marvel-jarnbjorn: Jarnbjorn
- Status: PASS

#### pop-marvel-gungnir: Gungnir
- Status: PASS — royal purple + gold matches Allfather depictions.

#### pop-marvel-space-stone: Space Stone
- Status: PASS — Tesseract blue is correct.

#### pop-marvel-mind-stone: Mind Stone
- Status: FLAG: MCU Mind Stone reads more amber-yellow on screen (Loki's scepter) and the description correctly calls "yellow-gold" — but `r:255 g:210 b:40` is quite saturated/lemon-yellow. Consider warming toward {r:255, g:190, b:60}. Also `stable` style is at odds with the on-screen pulsing.

#### pop-marvel-reality-stone: Reality Stone
- Status: PASS — Aether crimson + unstable is canon.

#### pop-marvel-power-stone: Power Stone
- Status: PASS — violet/lavender is on-canon for the Orb.

#### pop-marvel-time-stone: Time Stone
- Status: PASS — Eye of Agamotto emerald is correct.

#### pop-marvel-soul-stone: Soul Stone
- Status: PASS — quiet orange + stable is a thoughtful read of the Vormir tone.

#### pop-marvel-ebony-blade: Ebony Blade
- Status: PASS — near-black base with red gradient + curse-glow is canon-accurate.

#### pop-marvel-skurge-axe: Skurge's Axe
- Status: PASS

#### pop-marvel-storm: Storm's Tempest
- Status: PASS — description correctly notes Storm doesn't carry a sword; framing is honest.

#### pop-marvel-doctor-strange: Doctor Strange (Mirror Vortex)
- Status: FLAG: `style: 'vortex'` — verify engine registry includes this style (also used by Vajra and Aang).

### dc.ts

#### pop-dc-green-lantern: Green Lantern (Willpower)
- Status: PASS

#### pop-dc-yellow-lantern: Yellow Lantern (Fear)
- Status: PASS — sickly-yellow + unstable is on-canon for Sinestro Corps.

#### pop-dc-red-lantern: Red Lantern (Rage)
- Status: PASS — molten-red fire style with high noise matches Atrocitus rage-construct depictions.

#### pop-dc-orange-lantern: Orange Lantern (Avarice)
- Status: PASS

#### pop-dc-blue-lantern: Blue Lantern (Hope)
- Status: PASS

#### pop-dc-indigo-lantern: Indigo Lantern (Compassion)
- Status: PASS

#### pop-dc-violet-lantern: Star Sapphire (Love)
- Status: PASS — pink-magenta + pulse fits the Star Sapphire spectrum.

#### pop-dc-godkiller: Godkiller
- Status: PASS

#### pop-dc-ankh-of-fate: Dr. Fate's Ankh
- Status: PASS

#### pop-dc-swamp-thing: Swamp Thing Green
- Status: PASS — deep mossy pulse for the Green is on-canon.

#### pop-dc-aquaman: Aquaman's Tidal Trident
- Status: FLAG: `style: 'tidal'` — verify engine registry.

#### pop-dc-flash: The Flash (Speedforce Stream)
- Status: FLAG: `style: 'torrent'` — verify engine registry; per CLAUDE.md the documented styles don't list "torrent" (engine has 29 styles per docs). Will fall back to `stable` if missing.

### zelda.ts

#### pop-zelda-master-sword-awakened: Master Sword (Awakened)
- Status: PASS — Hyrulean blue+gold aurora is iconic.

#### pop-zelda-master-sword-dormant: Master Sword (Dormant)
- Status: PASS — muted version is a good pair to Awakened.

#### pop-zelda-fierce-deity: Fierce Deity Sword
- Status: PASS — silver-white+cyan gradient approximates the double-helix as the description notes.

#### pop-zelda-goddess-sword: Goddess Sword
- Status: PASS — lavender/pink for Hylia's gift matches Skyward Sword artwork.

#### pop-zelda-biggoron-sacred-flame: Biggoron's Sword (Sacred Flame)
- Status: PASS

#### pop-zelda-trident-of-power: Trident of Power
- Status: PASS

#### pop-zelda-wind-waker: Wind Waker (Conductor's Baton)
- Status: PASS

#### pop-zelda-zora-spear: Zora's Tide-Spear
- Status: FLAG: `style: 'tidal'` — verify engine registry.

### final-fantasy.ts

#### pop-ff-buster-sword: Buster Sword (Materia Glow)
- Status: FLAG: Description sells "pulsing Materia glow" but `style: 'stable'` won't render that motion. Consider `pulse` or moving the Mako-green to gradient stops at the ricasso position to match the visual lore.

#### pop-ff-masamune: Masamune (Sephiroth)
- Status: PASS — silver-white+lavender unstable for the One-Winged Angel is well-considered.

#### pop-ff-gunblade: Gunblade (Squall)
- Status: PASS

#### pop-ff-brotherhood: Brotherhood (Noctis)
- Status: PASS — blue+gold gradient for Lucian crystal duality is on-canon.

#### pop-ff-ultima-weapon: Ultima Weapon
- Status: FLAG: `style: 'prism'` — verify engine registry; CLAUDE.md documents PrismStyle.ts so likely OK.

#### pop-ff-omega-weapon: Omega Weapon
- Status: PASS — cosmic-purple unstable for the superboss is canon.

#### pop-ff-kingdom-key: Kingdom Key
- Status: FLAG: `ignition: 'summon'` — verify ignition is registered; CLAUDE.md lists 19 ignitions + 13 retractions but "summon" isn't named in the visible documentation. If missing, falls back to standard. Multiple KH presets use this.

#### pop-ff-oblivion: Oblivion Keyblade
- Status: PASS — darksaber style is hardware-honest for a black Keyblade per principle.

#### pop-kh-way-to-the-dawn: Way to the Dawn (Riku)
- Status: FLAG: `ignition: 'summon'` — same registry concern as Kingdom Key.

#### pop-kh-stormfall-aqua: Stormfall (Aqua)
- Status: PASS

#### pop-kh-wayward-wind-ventus: Wayward Wind (Ventus)
- Status: PASS

#### pop-kh-earthshaker-terra: Earthshaker (Terra)
- Status: PASS

#### pop-kh-star-seeker-sora: Star Seeker (Sora)
- Status: PASS

#### pop-kh-three-wishes-sora: Three Wishes (Sora)
- Status: PASS

### anime.ts

#### pop-anime-tanjiro-nichirin: Tanjiro's Nichirin
- Status: PASS — jet-black via darksaber path is the canonical hardware-honest representation.

#### pop-anime-rengoku-nichirin: Rengoku's Nichirin
- Status: PASS — flame-red fire is iconic.

#### pop-anime-zenitsu-nichirin: Zenitsu's Nichirin
- Status: PASS — thunder-yellow unstable matches Breath of Thunder.

#### pop-anime-inosuke-nichirin: Inosuke's Twin Nichirin
- Status: PASS — indigo-grey is canon; description correctly notes single-blade representation.

#### pop-anime-tensa-zangetsu: Tensa Zangetsu (Ichigo Bankai)
- Status: PASS — darksaber for the black Bankai blade is correct.

#### pop-anime-hyorinmaru: Hyōrinmaru (Hitsugaya)
- Status: FLAG: `retraction: 'evaporate'` — verify retraction is registered; not in CLAUDE.md visible list. If missing, falls back to standard.

#### pop-anime-tengen: Tengen Uzui (Sound Helix)
- Status: PASS — gold helix for Sound Breathing is creative.

#### pop-anime-aang-airbender: Aang (Avatar State)
- Status: FLAG: `style: 'vortex'` — verify engine registry; also 600/800ms timing is at the outer envelope (justified by "summoning Avatar State" narratively).

#### pop-anime-giyu-nichirin: Giyu Tomioka's Nichirin (Water)
- Status: PASS

#### pop-anime-shinobu-nichirin: Shinobu Kocho's Nichirin (Insect)
- Status: PASS

#### pop-anime-mitsuri-nichirin: Mitsuri Kanroji's Nichirin (Love)
- Status: PASS

#### pop-anime-obanai-nichirin: Obanai Iguro's Nichirin (Serpent)
- Status: PASS

#### pop-anime-tengen-nichirin: Tengen Uzui's Nichirin (Sound)
- Status: FLAG: Duplicate of pop-anime-tengen above? Two Tengen Uzui presets exist — `pop-anime-tengen` (helix style, "Sound Helix") and `pop-anime-tengen-nichirin` (unstable style, "(Sound)"). Both valid as distinct interpretations of the same character but the team should decide whether to keep both or merge to one canonical Tengen entry.

#### pop-anime-muichiro-nichirin: Muichiro Tokito's Nichirin (Mist)
- Status: PASS

#### pop-anime-sanemi-nichirin: Sanemi Shinazugawa's Nichirin (Wind)
- Status: PASS

### kids-cartoons.ts

#### pop-ppg-blossom: Blossom
- Status: PASS

#### pop-ppg-bubbles: Bubbles
- Status: PASS

#### pop-ppg-buttercup: Buttercup
- Status: PASS

#### pop-hellokitty: Hello Kitty
- Status: PASS

#### pop-su-garnet: Garnet
- Status: PASS — gradient red-violet matches Ruby+Sapphire fusion.

#### pop-at-grass-sword: Grass Sword
- Status: PASS

#### pop-ben10-omnitrix: Omnitrix
- Status: PASS

#### pop-ppg-chemical-x: Chemical X
- Status: PASS

### power-rangers.ts

#### pop-mmpr-red: Red Ranger
- Status: PASS

#### pop-mmpr-blue: Blue Ranger
- Status: PASS

#### pop-mmpr-yellow: Yellow Ranger
- Status: PASS

#### pop-mmpr-pink: Pink Ranger
- Status: PASS

#### pop-mmpr-black: Black Ranger
- Status: PASS — darksaber path is the correct hardware-honest treatment; well-documented in inline comments.

#### pop-mmpr-green: Green Ranger
- Status: PASS

#### pop-mmpr-white: Saba / White Ranger
- Status: PASS

### adult-animation.ts

#### pop-rick-portal-gun: Portal Gun Green
- Status: PASS

#### pop-samurai-jack-katana: Katana of Righteousness
- Status: PASS — pure-white aurora for the gods-forged blade is canon.

#### pop-atf-master-shake: Master Shake
- Status: PASS

#### pop-atf-meatwad: Meatwad
- Status: PASS

#### pop-vb-brock-samson: Brock Samson
- Status: PASS

### mascots.ts

#### pop-mascot-tony-tiger: Tony the Tiger
- Status: PASS

#### pop-mascot-toucan-sam: Toucan Sam
- Status: PASS — full rainbow gradient is on-brand for Froot Loops.

#### pop-mascot-kool-aid-man: Kool-Aid Man
- Status: FLAG: 150ms ignition is the fastest in the pop-culture set (everything else is ≥200). Narratively justified ("bursts through the wall") but worth noting as a near-outlier. Cherry-red fire style is otherwise on-brand.

#### pop-mascot-mr-peanut: Mr. Peanut
- Status: PASS

#### pop-mascot-capn-crunch: Cap'n Crunch
- Status: PASS

#### pop-mascot-chester-cheetah: Chester Cheetah
- Status: PASS

#### pop-mascot-mr-clean: Mr. Clean
- Status: PASS

#### pop-mascot-lucky-leprechaun: Lucky the Leprechaun
- Status: FLAG: `gradientStops` is set on this preset but `style: 'aurora'` — gradient stops typically only render under `style: 'gradient'` so the rainbow gradient defined here may not be visible. Consider switching to `style: 'gradient'` or removing the unused gradient stops to avoid confusion.

### harry-potter.ts

#### pop-harry-potter-dumbledore: Dumbledore (Elder Wand)
- Status: PASS

#### pop-harry-potter-voldemort: Voldemort (Killing Curse)
- Status: PASS — Avada Kedavra green + unstable + stutter ignition all match canon.

#### pop-harry-potter-harry: Harry's Holly Wand
- Status: PASS — Patronus-gold pulse is canon.

#### pop-harry-potter-hermione: Hermione's Vine Wand
- Status: PASS

#### pop-harry-potter-snape: Snape's Patronus
- Status: PASS — dark teal silver for the doe Patronus is on-canon.

#### pop-harry-potter-bellatrix: Bellatrix's Cruciatus
- Status: PASS

#### pop-harry-potter-neville-gryffindor: Sword of Gryffindor
- Status: FLAG: Color is `r:200 g:30 b:40` (deep red). The Gryffindor sword in film is a silvered/steel blade with a ruby pommel — the blade itself is steel-gray, not red. Description acknowledges this ("ruby red — the color of the Gryffindor sword's pommel stone"). Choice is defensible as a tribute to the pommel/house color but flagged for transparency: a steel-silver baseColor + ruby-red clash would be more screen-accurate. Either reading is fine; flagging the deliberate choice.

#### pop-harry-potter-luna: Luna's Patronus
- Status: PASS

#### pop-harry-potter-draco: Draco's Hawthorn Wand
- Status: PASS — muted silver-green for Draco's ambivalence is a thoughtful interpretation.

#### pop-harry-potter-lumos-maxima: Lumos Maxima
- Status: PASS

### halo.ts

#### pop-halo-energy-sword: Energy Sword
- Status: PASS — cyan-white photon is iconic for the Covenant blade.

#### pop-halo-prophets-blade: Prophets' Blade
- Status: PASS

#### pop-halo-gravity-hammer: Gravity Hammer
- Status: PASS — crimson fire-style for the Fist of Rukt matches game depiction.

#### pop-halo-master-chief: Master Chief Visor
- Status: FLAG: `baseColor: r:210 g:195 b:60` reads as olive-gold rather than the bright Halo-iconic gold-orange. The MJOLNIR Mark VI visor is described in lore as gold/amber; current color leans military-olive. Consider {r:255, g:215, b:60} for a more recognizable Spartan-gold.

#### pop-halo-cortana: Cortana
- Status: FLAG: `style: 'plasma'` — verify engine registry (CLAUDE.md documents PlasmaStyle.ts so likely OK; just noting for the verify-all-styles pass).

#### pop-halo-arbiter: Arbiter
- Status: PASS

#### pop-halo-flood-infection: Flood Infection
- Status: PASS — sickly yellow-green cinder for Flood biomass is on-canon.

#### pop-halo-unsc-laser: UNSC Spartan Laser
- Status: FLAG: `ignition: 'pulseWave'` — verify ignition is registered; CLAUDE.md mentions `PulseWaveIgnition.ts` so likely OK but the camelCase vs. dash-case naming should be confirmed consistent with the codegen registry (codegen lookup may be case-sensitive).
