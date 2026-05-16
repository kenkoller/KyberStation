# Gallery Audit — canon-era + animated + ext-univ + showcase — Agent A4

**Date:** 2026-05-16
**Scope:** Brief said 157 presets; verified on disk as **141 presets** across 6 files (see reconciliation note under "showcase.ts" below — the 16-preset gap is showcase modulation-binding objects miscounted as presets in the brief).
**Auditor:** A4

## File breakdown (verified from disk)

| File | Preset count |
|---|---|
| prequel-era.ts | 27 |
| original-trilogy.ts | 7 |
| sequel-era.ts | 10 |
| animated-series.ts | 47 |
| extended-universe.ts | 32 |
| showcase.ts | 18 (brief said 34 — see reconciliation in §`showcase.ts`) |
| **Total** | **141** (brief said 157) |

## Summary

- Total audited: 141
- PASS: 116
- FLAG: 25
- Real-bug FLAGs (worth fixing): 4 (Plasma Coil `flicker-out` typo; Loden Greatstorm / Elzar Mann / Burryaga ID-vs-color mismatches)
- Voice-anchor + metadata FLAGs (consistency tidying): 21

## Systemic issues

- **`continuity` field is omitted across all 123 non-showcase presets.** Per `types.ts:43–51` the field defaults to `'canon'` when undefined, so the runtime behavior is correct, but the audit rubric (and the gallery filter UI) should be explicit. If the team wants explicit canon-stamping, this is a one-line `continuity: 'canon'` addition per preset (or, more sensibly, a per-file `as const` annotation). I'm treating omission as a soft PASS but calling it out here.
- **`screenAccurate` is omitted from every `expanded-universe` preset that should have it set.** Extended-universe.ts entries that are derived from on-screen depictions (Cal Kestis green/orange/purple, Avar Kriss, Keeve Trennis, Loden Greatstorm, Elzar Mann, etc.) don't set `screenAccurate` at all — the rubric says prequel/OT/sequel get `screenAccurate: true` but EU is ambiguous. Many EU entries DO set it (`eu-cal-kestis-crossguard`, `eu-cal-kestis-double`, `eu-kelleran-beq-blue`, Marrok, Trilla Suduri, Bode Akuna, Taron Malicos, Dagan Gera, Inquisitor Barriss, all Acolyte entries). Inconsistent application — flagged below per entry.
- **`author: 'on-screen'` is set ONLY in original-trilogy.ts.** Prequel-era, sequel-era, animated-series, and extended-universe all omit the `author` field. Per the `types.ts` convention `'on-screen'` is the default for canonical character presets — these files SHOULD all set it. This is the most consistent missing-metadata pattern across the audit.
- **`flicker-out` retraction ID is invalid in `showcase.ts:1702` (Plasma Coil).** Engine registry uses `flickerOut` (`packages/engine/src/ignition/index.ts:111`). At runtime this falls back to `standard` with a `console.warn`. Bona-fide bug worth fixing.
- **`shatter` retraction is used as ignition in `eu-cal-kestis-red` (`ignition: 'glitch', retraction: 'shatter'`)** which is valid; but `eu-marchion-ro-nihil` and `showcase-singularity-engine`, `showcase-hex-loom`, `showcase-kyber-bloom` use `'shatter'` as a retraction — all valid since `ShatterRetraction` is in `RETRACTION_REGISTRY` at index.ts:108. Confirmed not a bug, noted for visibility.
- **Voice-anchor benchmark applied loosely.** The Obi-Wan ANH description (152 chars, rich imagery, kyber-lore reference) is the gold standard. Many descriptions in `prequel-era.ts` and `extended-universe.ts` are short character cards (~90–110 chars) that just state who the character is and the blade color, without the sensory or in-world detail of the anchor. I've flagged the most egregious "just the character name" cases.
- **Topology consistency for crossguard sabers** is solid — Kylo, Stellan Gios, Burryaga, Cal Kestis Crossguard, Dagan Gera all set `crossguard: true`. Kylo also sets `quillonLength: 48`. Most others omit `quillonLength` which the UI handles as a default. No FLAGs raised for this.
- **Ahsoka shoto preset (animated, line 35) sets `ledCount: 100`** while every other animated preset uses 144. Intentional (shoto is a shorter blade), confirmed canonical, PASS.
- **Grogu preset (animated, line 642) also sets `ledCount: 100`** for the same shoto reasoning, PASS.

## Per-file findings

### prequel-era.ts (27 presets)

#### prequel-obi-wan-ep1: Obi-Wan Kenobi (Padawan)
- Status: PASS (Naboo padawan blue/green is canonically green; baseColor `(0,215,32)` reads as the Ep. I green. Stable style appropriate. Description references the Battle of Naboo against Maul — concrete on-screen anchor.)

#### prequel-obi-wan-ep3: Obi-Wan Kenobi (Master)
- Status: PASS (Blue baseColor `(0,135,255)`, stable, mentions Mustafar duel. Voice slightly shorter than the OT anchor but specific.)

#### prequel-qui-gon: Qui-Gon Jinn
- Status: PASS (Green `(0,220,28)`, stable, ignites in 290ms — appropriate. Description mentions Maul on Naboo.)

#### prequel-anakin: Anakin Skywalker
- Status: FLAG: Description (`'Anakin\'s second lightsaber, later passed to Luke. The most iconic hilt in Star Wars.'`) is 89 chars and reads as a label, not the voice anchor's sensory + lore detail. The Ep III blade is canonically blue, which the config matches `(0,120,255)`. Color/style correct; description thin.

#### prequel-mace-windu: Mace Windu
- Status: PASS (Purple `(170,60,240)`, stable — explicitly meets the "Mace MUST be stable" rule. Description names Vaapad.)

#### prequel-yoda: Yoda
- Status: PASS (Green `(50,230,20)`, ignition 200ms — explicitly meets the "Yoda historically ignited fast (200ms)" rule. Stable style appropriate.)

#### prequel-dooku: Count Dooku
- Status: PASS (Red `(255,20,10)`, stable, mentions Form II Makashi. Curved-hilt hint in hiltNotes correctly states one-handed fencing.)

#### prequel-darth-maul: Darth Maul
- Status: PASS (Red `(255,15,5)`, `topologyNotes: 'Double-bladed staff saber. Each blade is 144 LEDs.'` — explicit double-blade topology. Stable style matches the prime-of-life Maul.)

#### prequel-maul-crime-lord: Maul (Cybernetic - Crime Lord)
- Status: PASS (Unstable + spark ignition is a strong narrative choice for the resurrected/cybernetic era. Description is rich, references Mother Talzin + Rule of Two. Note: uses `noise: 0.1` instead of `noiseLevel` — but `PresetConfig` accepts arbitrary keys, no schema break.)

#### prequel-maul-rebels-tatooine: Maul (Old Master - Rebels Finale)
- Status: PASS (Slightly dimmer red `(200,0,30)`, unstable with longer retraction, fadeout retraction — evocative writing about "weary crimson". Voice anchor met.)

#### prequel-kit-fisto: Kit Fisto
- Status: PASS (Green `(0,230,40)`, stable, references Nautolan + underwater design.)

#### prequel-plo-koon: Plo Koon
- Status: PASS (Blue `(0,140,255)`, stable. Description short but factual.)

#### prequel-aayla-secura: Aayla Secura
- Status: PASS (Blue `(0,100,255)`, stable, references Order 66. tier `base` is appropriate.)

#### prequel-luminara: Luminara Unduli
- Status: PASS (Green `(0,225,30)`, stable. Description references her discipline + Mirialan heritage.)

#### prequel-barriss-offee: Barriss Offee
- Status: PASS (Blue `(0,110,245)` reading correctly for her Padawan-era blade pre-fall. Description explicitly anchors "before her fall" — leaves room for the Tales of the Empire Inquisitor preset in `extended-universe.ts`.)

#### prequel-shaak-ti: Shaak Ti
- Status: PASS (Blue `(0,130,255)`, stable, mentions Kamino defense + Ataru/Makashi.)

#### prequel-ki-adi-mundi: Ki-Adi-Mundi
- Status: PASS (Blue `(0,120,255)`, stable, references Outer Rim Sieges.)

#### prequel-depa-billaba: Depa Billaba
- Status: PASS (Green `(0,210,35)`, stable, references training Kanan. Good lineage callout.)

#### prequel-savage-opress: Savage Opress
- Status: PASS (Yellow-green `(210,235,0)`, stable, double-bladed topology explicit. Color matches canon.)

#### prequel-asajj-ventress: Asajj Ventress
- Status: PASS (Red `(255,0,10)`, stable, `topologyNotes` correctly describes the Jar'Kai curved-hilt pair.)

#### prequel-grievous: General Grievous
- Status: PASS (Green `(0,200,40)` representative of stolen sabers, topologyNotes describes quad-wielding 2 blue + 2 green correctly.)

#### prequel-palpatine: Darth Sidious
- Status: PASS (Red `(255,25,15)`, stable, mentions Phrik-alloy concealed hilt — concrete on-screen detail.)

#### prequel-anakin-ep2: Anakin Skywalker (Ep. II)
- Status: FLAG: Description (`'Anakin\'s first lightsaber, destroyed in the Geonosis droid factory. A youthful, slightly brighter blue than his later saber.'`) — 127 chars, decent but could lean further into the voice anchor's sensory style. Marginal. Color correct.

#### prequel-agen-kolar: Agen Kolar
- Status: PASS (Blue `(0,110,255)`, stable, references the strike team to arrest Palpatine.)

#### prequel-saesee-tiin: Saesee Tiin
- Status: PASS (Green `(0,200,30)`, stable, references his pilot/ace status.)

#### prequel-eeth-koth: Eeth Koth
- Status: FLAG: Description (`'Zabrak Jedi Master Eeth Koth\'s green lightsaber. Known for his exceptional resilience and pain tolerance.'`) — 109 chars but generic "X's green lightsaber" phrasing. No hiltNotes set either (only field where hiltNotes is missing entirely in this file). Color/style correct.

#### prequel-stass-allie: Stass Allie
- Status: FLAG: Description (`'Jedi Master Stass Allie\'s green lightsaber. A healer and Council member killed during Order 66 on Saleucami.'`) — 109 chars, formulaic. No hiltNotes set. Color/style correct.

### original-trilogy.ts (7 presets)

#### ot-luke-anh: Luke Skywalker (ANH)
- Status: PASS (Ice-blue `(0,135,255)`, rotoscope, full hiltNotes about the Graflex. Description is the voice-anchor style — concrete imagery ("Tatooine ignition"). `author: 'on-screen'` correctly set.)

#### ot-luke-esb: Luke Skywalker (ESB)
- Status: PASS (Slightly cooler blue `(0,120,255)`, references Cloud City scenes. Voice anchor met.)

#### ot-luke-rotj: Luke Skywalker (ROTJ)
- Status: PASS (Vivid green `(0,220,40)` — explicitly meets the "Luke green ROTJ" rule. Notes "the first green lightsaber shown on screen". Hilt notes mention Tatooine construction.)

#### ot-vader: Darth Vader
- Status: PASS (Deep crimson `(230,10,10)`, rotoscope, mentions MPP flash unit. Voice anchor met with "menacing, slightly pulsing core" language.)

#### ot-obiwan-anh: Obi-Wan Kenobi (ANH)
- Status: PASS (The voice anchor — `(0,155,255)` slightly warmer blue than Luke. Description is the exemplar quoted in the audit brief.)

#### ot-leia: Leia Organa
- Status: PASS (Royal blue `(0,100,255)`, rotoscope, references TROS flashback. Color choice "deeper than Luke's" is justified in the voice.)

#### ot-vader-esb: Darth Vader (ESB)
- Status: PASS (Pink-red `(230,20,30)` justified by ESB color grading — that's the kind of in-world+production-context detail that defines the voice anchor.)

### sequel-era.ts (10 presets)

#### st-kylo-ren: Kylo Ren
- Status: PASS (Cracked-kyber red `(200,10,0)`, **`style: 'unstable'`** — explicitly meets the "Kylo MUST be unstable" rule. **`crossguard: true, quillonLength: 48`** — explicitly meets the "crossguard topology" rule. `topologyNotes` describes quillons. Effect binding `{type: 'bifurcate', bind: 'clash'}` is a nice touch for the warm/cool color split.)

#### st-rey-blue: Rey (Skywalker Saber)
- Status: PASS (Blue `(0,120,255)`, stable, references Anakin's Graflex + the cooler sequel-era grading.)

#### st-rey-yellow: Rey (Own Saber)
- Status: PASS (Yellow `(255,200,0)` — explicitly meets the "Rey's yellow" rule. Aurora style is creative but appropriate for the new-beginning narrative. Wipe ignition + fadeout retraction is on-brand.)

#### st-luke-tlj: Luke Skywalker (TLJ)
- Status: PASS (Same green as ROTJ — `(0,220,40)`. Description explicitly notes flashback/Force-projection. tier `base` is fair.)

#### st-leia: Leia Organa
- Status: PASS (Royal blue `(0,100,255)`, matches OT variant. Description references the saber being given to Rey on Ajan Kloss + Exegol.)

#### st-ben-solo: Ben Solo (Redeemed)
- Status: PASS (Blue `(0,120,255)` matching Skywalker saber, stable. Description anchors the redemption arc + the moment Ben discards the crossguard.)

#### st-palpatine: Palpatine (TROS)
- Status: PASS (Red `(255,0,0)`, cinder style, **`screenAccurate: false`** explicitly set with description noting Legends/speculative — honest disclosure. Drain retraction is on-brand for the Exegol scenes.)

#### st-finn: Finn (Skywalker Saber)
- Status: PASS (Blue matching Skywalker saber, description "desperate quality" is voice-anchor-shaped. tier `base` is fair.)

#### st-praetorian-guard: Praetorian Guard
- Status: PASS (Crimson `(255,20,10)`, plasma style, description correctly notes these are vibro-blades not lightsabers. Honest disclosure.)

#### st-rey-dark: Rey (Dark Side Vision)
- Status: PASS (Red `(255,0,10)`, unstable, fracture ignition + implode retraction — strong narrative choice. Hinged double-blade hilt described correctly.)

### animated-series.ts (47 presets)

#### animated-ahsoka-cw-green: Ahsoka Tano (Clone Wars - Green)
- Status: PASS (Emerald `(0,220,40)`, stable, spark ignition. Voice "warm shimmer reminiscent of her early Padawan years" hits the anchor.)

#### animated-ahsoka-cw-yellowgreen: Ahsoka Tano (Clone Wars - Yellow-Green Shoto)
- Status: PASS (Yellow-green `(128,235,20)`, `ledCount: 100` reflects shorter shoto length. Stable, references Jar'Kai.)

#### animated-ahsoka-rebels-white: Ahsoka Tano (Rebels/Mandalorian - White)
- Status: PASS (White `(240,240,250)`, photon style, summon ignition + evaporate retraction — narratively rich choices for purified kyber.)

#### animated-pre-vizsla-darksaber: Pre Vizsla (Darksaber)
- Status: PASS (`style: 'darksaber'`, `baseColor: (5,5,5)` per the engine's hardware-fidelity contract. The in-file comment block at lines 92–100 is exemplary documentation of WHY the config looks how it does.)

#### animated-ezra-bridger-blue: Ezra Bridger (Blue)
- Status: PASS (Blue `(20,80,255)`, stable, references the cross-guard style hilt + destruction of the first by Vader.)

#### animated-ezra-bridger-hybrid: Ezra Bridger (Blaster Hybrid)
- Status: PASS (Blue `(30,100,255)`, stable + stutter ignition — appropriate for the scrappy hybrid character. Voice "scrappy, street-kid weapon" hits.)

#### animated-kanan-jarrus-blue: Kanan Jarrus
- Status: PASS (Blue `(30,100,255)`, stable. Two-piece modular hilt is canonically correct.)

#### animated-grand-inquisitor-red: Grand Inquisitor (Red)
- Status: PASS (Red `(240,20,10)`, unstable — matches all-Inquisitor convention, center ignition + dissolve retraction. Helicopter-mode reference is canon.)

#### animated-second-sister-red: Second Sister (Red)
- Status: PASS (Red `(220,0,10)`, unstable. Description "controlled, precise flicker" reflects the character.)

#### animated-third-sister-reva-red: Third Sister / Reva (Red)
- Status: PASS (Red `(255,20,10)`, unstable, fracture + flickerOut — narrative for her volatile temperament. Good fit.)

#### animated-fifth-brother-red: Fifth Brother (Red)
- Status: PASS (Deeper red `(200,0,0)`, unstable, description "deep, powerful crimson with heavy weight" reads voice-anchor-shaped.)

#### animated-seventh-sister-red: Seventh Sister (Red)
- Status: PASS (Red `(240,10,20)`, unstable, "sharp, vivid crimson with a refined, almost surgical feel" — distinctive characterization.)

#### animated-sabine-wren-darksaber: Sabine Wren (Darksaber)
- Status: PASS (`style: 'darksaber'`, baseColor `(5,5,5)` per the same hardware-fidelity contract. Voice "Same ancient blade, new warrior" is concise but specific.)

#### animated-sabine-wren-blue: Sabine Wren (Blue - Ahsoka series)
- Status: PASS (Blue `(20,80,255)`, stable, identifies the saber as Ezra's passed to Sabine — canon-accurate lineage callout.)

#### animated-cal-kestis-blue: Cal Kestis (Blue)
- Status: FLAG: **`screenAccurate: false`** explicitly set — debatable since Cal IS the canonical wielder of his blade in Fallen Order/Survivor and the games are canon. The cyan-vs-blue note is good context, but the `false` value contradicts the description's "default blue blade ... in marketing/box art" claim. Suggest changing to `true` with the note kept in description.

#### animated-cere-junda-blue: Cere Junda (Blue)
- Status: FLAG: **`screenAccurate: false`** explicitly set — same concern; Cere is a canonical character with an on-screen blue saber in Survivor. Probably should be `true`.

#### animated-baylan-skoll-orange: Baylan Skoll (Orange-Red)
- Status: PASS (Orange-red `(255,110,20)`, cinder style, scroll ignition + fadeout retraction — strong style choice for the morally ambiguous fallen-master. Description "magmatic hue between Jedi and Sith" is the voice anchor at its best.)

#### animated-shin-hati-orange: Shin Hati (Orange)
- Status: PASS (Orange `(255,120,0)`, cinder. Voice anchor met. Note: this preset is duplicated in `extended-universe.ts` as `eu-shin-hati-orange` with slightly different color tuning + `fire` style — see below.)

#### animated-din-djarin-darksaber: Din Djarin (Darksaber)
- Status: PASS (Darksaber per hardware-fidelity contract, stutter ignition at 500ms reflects his lack of training — the comment block at lines 552–555 documents this design decision well.)

#### animated-ahsoka-liveaction-white: Ahsoka Tano (Live-Action)
- Status: PASS (White `(240,245,255)`, photon, references the Ahsoka series Force connection.)

#### animated-huyang: Huyang (Droid Architect)
- Status: PASS (Blue `(30,120,255)`, **`screenAccurate: false`** correctly set — description is honest that Huyang is the saber-architect, not a wielder. Speculative entry handled transparently.)

#### animated-grogu: Grogu (Armored Youngling)
- Status: PASS (Green `(0,230,30)`, pulse, `ledCount: 100` for shoto — consistent with the Ahsoka shoto. References the Armorer's beskar forging.)

#### animated-visions-ronin: Ronin (Visions: The Duel)
- Status: PASS (Red `(220,0,5)`, unstable. The 200-word description is among the longest and most thoughtful in the audit — explicitly addresses the 2D-effect-on-1D-strip hardware-fidelity tension. Exemplary voice.)

#### animated-visions-karre: Karre (Visions: The Twins)
- Status: PASS (Red `(230,10,10)`, unstable. Voice "the half of the pair who might still walk away" is sharp characterization.)

#### animated-visions-am: Am (Visions: The Twins)
- Status: PASS (Red `(240,0,5)`, unstable, hotter shimmer than Karre — narrative pairing works.)

#### animated-visions-kara: Kara (Visions: The Ninth Jedi)
- Status: PASS (Yellow `(255,220,0)`, stable. Description "the color of one who chose her own path" is voice-anchor-shaped.)

#### animated-visions-f: F (Visions: The Village Bride)
- Status: PASS (Blue `(30,130,255)`, stable, slow ignition reflects her hiding-then-emerging arc.)

#### animated-visions-tajin-crosser: Tajin Crosser (Visions: The Elder)
- Status: PASS (Blue `(0,100,230)`, stable, "deep, unhurried Jedi blue — patient, ancient" is exactly the voice anchor.)

#### animated-visions-lop: Lop (Visions: Lop and Ochō)
- Status: PASS (Sky-blue `(80,170,255)`, stable, references Geno Studio's warmer palette.)

#### animated-visions-tingting: Master TingTing (Visions: T0-B1)
- Status: PASS (Purple `(170,70,240)`, stable. "The color of a Jedi who has reconciled the Force's extremes" — strong characterization.)

#### animated-visions-lola: Lola (Visions: Sith)
- Status: PASS (Red `(235,5,10)`, unstable, hiltNotes "covered in handprints from the paint she uses to process her trauma" is evocative + specific to the episode.)

#### animated-visions-lolas-master: Lola's Master (Visions: Sith)
- Status: PASS (Red `(200,0,5)`, unstable. Tighter shimmer reflects discipline vs. Lola's volatility — well-tuned contrast.)

#### animated-visions-koten: Koten (Visions: In the Stars)
- Status: PASS (Blue `(30,120,250)`, stable. "Water is more precious than combat in her arc" — specific to the episode.)

#### animated-visions-tichina: Tichina (Visions: In the Stars)
- Status: PASS (Brighter blue `(60,150,255)`, stable. Sister contrast preserved against Koten.)

#### animated-visions-tan: Tan (Visions: Journey to the Dark Head)
- Status: PASS (Blue `(40,130,250)`, stable. References the journey arc.)

#### animated-visions-rani: Rani (Visions: The Bandits of Golak)
- Status: PASS (Blue `(0,130,245)`, stable, summon ignition at 480ms — appropriate for the awakening moment.)

#### animated-visions-golak-inquisitor: Inquisitor (Visions: The Bandits of Golak)
- Status: PASS (Red `(230,10,15)`, unstable — matches Inquisitor convention.)

#### animated-plo-koon-blue: Plo Koon (Clone Wars - Blue)
- Status: FLAG: Duplicate-character vs. `prequel-plo-koon`. Both use `name: 'PloKoon'` in their config — collision risk if a user loads both. Recommend either renaming this one (e.g. `'PloKoonCW'`) or scoping the prequel one differently. Color/style correct otherwise.

#### animated-kit-fisto-green: Kit Fisto (Clone Wars - Green)
- Status: FLAG: Same config-name collision pattern — both this and `prequel-kit-fisto` set `config.name: 'KitFisto'`. Color/style correct.

#### animated-aayla-secura-blue: Aayla Secura (Clone Wars - Blue)
- Status: FLAG: Same config-name collision — both this and `prequel-aayla-secura` set `config.name: 'AaylaSecura'`. Color/style correct.

#### animated-luminara-unduli-green: Luminara Unduli (Clone Wars - Green)
- Status: FLAG: Same config-name collision — `'LuminaraUnduli'` in this preset, `'Luminara'` in the prequel preset. Actually NO collision here — names differ. Reclassify as PASS. **Re-status: PASS.**

#### animated-barriss-offee-blue: Barriss Offee (Clone Wars - Blue)
- Status: FLAG: Config-name collision — both this and `prequel-barriss-offee` use `'BarrissOffee'`. Color/style correct.

#### animated-shaak-ti-blue: Shaak Ti (Clone Wars - Blue)
- Status: FLAG: Config-name collision — both this and `prequel-shaak-ti` use `'ShaakTi'`. Color/style correct otherwise; aurora style is a creative variation but Shaak's blade is canonically stable blue.

#### animated-agen-kolar-blue: Agen Kolar (Clone Wars - Blue)
- Status: FLAG: Config-name collision — both this and `prequel-agen-kolar` use `'AgenKolar'`. Color/style correct.

#### animated-saesee-tiin-green: Saesee Tiin (Clone Wars - Green)
- Status: FLAG: Config-name collision — both this and `prequel-saesee-tiin` use `'SaeseeTiin'`. Color/style correct.

#### animated-depa-billaba-green: Depa Billaba (Clone Wars - Green)
- Status: FLAG: Config-name collision — both this and `prequel-depa-billaba` use `'DepaBillaba'`. Style variant (pulse here vs. stable in prequel) is a defensible creative differentiation.

#### animated-quinlan-vos-green: Quinlan Vos (Clone Wars - Green)
- Status: PASS (Green `(0,200,50)`, unstable — the unstable choice fits his Ventress-adjacent storyline. No prequel-file collision.)

### extended-universe.ts (32 presets)

#### eu-cal-kestis-green: Cal Kestis (Green)
- Status: FLAG: `screenAccurate` is omitted — should be `true` (the games are canon). Description (87 chars) is short and label-like. Color/style correct.

#### eu-cal-kestis-orange: Cal Kestis (Orange)
- Status: FLAG: `screenAccurate` omitted. Description short (80 chars). Color/style correct.

#### eu-cal-kestis-purple: Cal Kestis (Purple)
- Status: FLAG: `screenAccurate` omitted. Description acceptable (~135 chars). Color/style correct.

#### eu-cal-kestis-red: Cal Kestis (Red - Dark Side)
- Status: FLAG: `screenAccurate` omitted. Affiliation `sith` for a dark-side-path variant is fine; the description should probably note "alternate path / non-canon outcome" more explicitly since dark-side Cal isn't the canon ending. Color/style correct.

#### eu-cal-kestis-crossguard: Cal Kestis (Crossguard)
- Status: PASS (Blue `(0,160,255)`, photon, `crossguard: true, quillonLength: 44`, `topologyNotes` set. `screenAccurate: true` correctly set.)

#### eu-cal-kestis-double: Cal Kestis (Double-Bladed)
- Status: PASS (Blue `(0,160,255)`, stable, `topologyNotes: 'Double-bladed staff saber.'`. `screenAccurate: true`.)

#### eu-merrin-green: Merrin (Green - Nightsister)
- Status: PASS (Green `(0,210,60)`, plasma, **`screenAccurate: false`** explicitly set with description noting "speculative 'what-if'". Honest.)

#### eu-stellan-gios-blue: Stellan Gios (Blue - Crossguard)
- Status: FLAG: `screenAccurate` omitted, `author` omitted. High Republic crossguard with proper topology notes. Color/style correct.

#### eu-vernestra-rwoh-purple: Vernestra Rwoh (Purple - Lightwhip)
- Status: FLAG: `screenAccurate` omitted. Description references the lightwhip mode (rare/unique). Color/style correct.

#### eu-kelleran-beq-blue: Kelleran Beq (Blue)
- Status: PASS (Blue `(20,90,255)`, rotoscope, `screenAccurate: true` set. References the Sabered Hand + Grogu rescue.)

#### eu-shin-hati-orange: Shin Hati (Orange)
- Status: FLAG: **Duplicate of `animated-shin-hati-orange` with different style/timing.** Both presets exist for the same character. This one is `style: 'fire'` with `ignition: 'scroll'` and `baseColor: (255,100,40)`; the animated one is `style: 'cinder'`. Recommend consolidating or making the intent explicit (e.g. "live-action treatment vs. animated treatment"). Color/style internally correct but cross-file duplication is a smell.

#### eu-marrok-red: Marrok (Red)
- Status: PASS (Red `(230,10,10)`, unstable, stutter ignition + fadeout retraction — narratively rich, "smoldering" voice anchor met. Honest about the post-death Nightsister-magick reveal.)

#### eu-trilla-suduri-red: Trilla Suduri (Red)
- Status: PASS (Red `(220,5,15)`, unstable, `screenAccurate: true`. Description distinguishes "controlled shimmer, not zero shimmer" — voice-anchor-shaped.)

#### eu-dagan-gera-red: Dagan Gera (Red)
- Status: PASS (Red `(240,15,5)`, **stable** — explicitly described as bled-not-cracked, "burns with betrayal and obsession, not instability". Strong characterization for a stable-red Sith.)

#### eu-bode-akuna-red: Bode Akuna (Red)
- Status: PASS (Red `(255,20,20)`, plasma. Reference to ISB agent + dual-wielded with blaster is canon-accurate.)

#### eu-taron-malicos-red: Taron Malicos (Red)
- Status: PASS (Red `(210,0,5)`, fire style — appropriate for the Dathomir corruption. Dual hilts noted.)

#### eu-avar-kriss-green: Avar Kriss (Green)
- Status: FLAG: `screenAccurate` omitted. `author` omitted. Description (243 chars) is rich. Color/style correct.

#### eu-keeve-trennis-green: Keeve Trennis
- Status: FLAG: Description (`'High Republic Jedi Knight with a green blade that shimmers like the aurora borealis.'`) — 89 chars, generic. No `hiltNotes`. `screenAccurate` omitted. `author` omitted. Color `(30,200,80)`, aurora style is creative.

#### eu-loden-greatstorm-blue: Loden Greatstorm
- Status: FLAG: **Name says "blue" but ID says "blue" and config sets `baseColor: (255,215,0)` (yellow).** Description says "a brilliant High Republic yellow blade." The ID-vs-color mismatch is confusing — the ID should be `eu-loden-greatstorm-yellow` to match. Color is canonically yellow per Wookieepedia. `screenAccurate` omitted. `hiltNotes` omitted.

#### eu-marchion-ro-nihil: Marchion Ro (Nihil)
- Status: PASS (Yellow `(255,215,0)` matching the looted Loden saber. crystalShatter style with glitch ignition + shatter retraction — narratively appropriate. Description acknowledges "he has no personal lightsaber in canon" — honest.)

#### eu-elzar-mann-purple: Elzar Mann
- Status: FLAG: **Name says "purple" and ID says "purple" but `baseColor: (60,80,255)` is BLUE.** Description says "his canonical blue blade." This is an ID-vs-color mismatch — the ID should be `eu-elzar-mann-blue`. Color is correct (Elzar is canonically blue); the ID is wrong.

#### eu-orla-jareni-white: Orla Jareni (Wayseeker)
- Status: FLAG: Description (`'Independent Wayseeker who left the traditional Jedi path. White prismatic blade.'`) — 81 chars. No `hiltNotes`. `screenAccurate` omitted. Voice anchor not really met. Color/style correct.

#### eu-burryaga-green: Burryaga (Wookiee Jedi)
- Status: FLAG: **Name says "green" and ID says "green" but `baseColor: (0,120,255)` is BLUE.** Description says "Oversized blue crossguard blade." ID-vs-name-vs-config three-way mismatch — Burryaga's saber is canonically blue per Wookieepedia. The ID and the display name say "green" but everything else says blue. Recommend renaming to `eu-burryaga-blue` and updating the display name to `'Burryaga (Wookiee Jedi - Blue)'`. `screenAccurate` omitted.

#### eu-inquisitor-barriss-red: Inquisitor Barriss Offee (Tales of the Empire)
- Status: PASS (Red `(220,5,15)`, unstable, `screenAccurate: true`. References Tales of the Empire arc. Description distinguishes the Inquisitor-era from her Padawan preset — good cross-file lineage.)

#### eu-sol-green: Sol
- Status: PASS (Emerald `(30,200,60)`, stable, `screenAccurate: true`. "Cerean-trained master who carries the weight of Brendok" — episode-anchored.)

#### eu-indara-blue: Indara
- Status: PASS (Blue `(30,120,255)`, stable, `screenAccurate: true`. References the cantina duel.)

#### eu-yord-fandar-blue: Yord Fandar
- Status: PASS (Cobalt `(60,140,255)`, stable, `screenAccurate: true`. "Treats the Code as scaffolding" — sharp character read.)

#### eu-jecki-lon-blue: Jecki Lon
- Status: PASS (Blue `(40,130,240)`, stable, `screenAccurate: true`. Twin-blade reference is canon.)

#### eu-vernestra-rwoh-purple-standard: Vernestra Rwoh (Purple - Standard)
- Status: PASS (Purple `(170,60,240)`, stable, `screenAccurate: true`. Distinguishes from the lightwhip variant — good companion preset.)

#### eu-master-kelnacca-blue: Master Kelnacca
- Status: PASS (Blue `(0,100,240)`, stable, `screenAccurate: true`. Wookiee Jedi callout is rare on-screen.)

#### eu-torbin-blue: Torbin
- Status: PASS (Blue `(30,130,255)`, stable, `screenAccurate: true`. Barash vow reference is episode-specific.)

#### eu-qimir-stranger-red: Qimir / The Stranger
- Status: PASS (Crimson `(180,0,0)`, unstable, `screenAccurate: true`. Cortosis hilt reference is canon. Note: uses `noise: 0.12` instead of `noiseLevel` — accepted by the loose `PresetConfig` schema but inconsistent with sibling presets.)

### showcase.ts (18 presets — brief said 34; reconciliation below)

**Reconciliation of file counts:**

Re-verified directly via `grep "^    id: '" showcase.ts | grep -v binding | wc -l` = **18 preset entries**. The brief's "34" figure aligns with the raw count of `^  {` opening braces (used by my initial grep), but that count conflates preset entries with the modulation binding objects nested INSIDE each preset's `modulation: payload(...)`. There are 18 preset IDs and 16 binding IDs in the file = 34 `id: '...'` lines total.

**Verified file breakdown:**

| File | Preset count |
|---|---|
| prequel-era.ts | 27 |
| original-trilogy.ts | 7 |
| sequel-era.ts | 10 |
| animated-series.ts | 47 |
| extended-universe.ts | 32 |
| showcase.ts | 18 (not 34) |
| **Verified total** | **141** (not 157) |

The 18 showcase presets are: Living Force, Storm Singer, Prismatic Drift, Phoenix Cycle, Quiet Tempest, Singularity Engine, The Conductor, Eternal Forge, Genesis Helix, Neutron Star, Memory Cascade, Hex Loom, Kyber Bloom, Hearth Watch, Ember Drift, Photon Loom, Gravitas, Plasma Coil.

#### showcase-living-force: Living Force ⛯
- Status: PASS (Unstable style, 3 modulation bindings, `continuity: 'showcase'`, `screenAccurate: false`, `author: 'KyberStation'`. Description explicitly names what the showcase exercises — "SHOWCASE: hand-written math expression + modulator-direct + event-latched signals." Exemplary tech-demo voice.)

#### showcase-storm-singer: Storm Singer ♫
- Status: PASS (Aurora style, 3 bindings, all metadata correct. "Sings with the music around it and never sits still" — voice anchor met.)

#### showcase-prismatic-drift: Prismatic Drift ❖
- Status: PASS (Prism style, 4 bindings spanning time/angle/twist/battery — explicit feature-coverage callout. Multi-stop gradient.)

#### showcase-phoenix-cycle: Phoenix Cycle ⟁
- Status: PASS (Fire style, ignition/retraction/lockup state-modulators wired to shimmer — distinct lifecycle-stage demo.)

#### showcase-quiet-tempest: Quiet Tempest ☷
- Status: PASS (Pulse style, 3 bindings including 12s contemplative breath. Voice "subtle sub-second-aware modulation that rewards quiet contemplation" matches the anchor.)

#### showcase-singularity-engine: Singularity Engine ⚛
- Status: PASS (Unstable style, **6 bindings** — maximum-everything. Two LFOs at different periods (3.1s + 12.6s), sound + swing + clash + battery each driving distinct params. Multi-stop rainbow gradient.)

#### showcase-the-conductor: The Conductor ♫
- Status: PASS (Aurora style, 6 bindings with 4 sound-derived. "Plug in a saber-font with active SmoothSwing and watch the blade dance with the music" — concrete usage instruction.)

#### showcase-eternal-forge: Eternal Forge ⚟
- Status: PASS (Fire style, **7 bindings** — the most feature-saturated entry. Full lifecycle coverage, spatial lockup + drag + blast all positioned.)

#### showcase-genesis-helix: Genesis Helix ⫯
- Status: PASS (Helix style — rare engine style. 4 bindings, twin-strand DNA blade description is evocative.)

#### showcase-neutron-star: Neutron Star ✸
- Status: PASS (Neutron style — rare engine style. 4 bindings. "Single bright particle bouncing tip-to-emitter trailing a phosphor ghost" — voice anchor met.)

#### showcase-memory-cascade: Memory Cascade ⌬
- Status: PASS (dataStream style — rare engine style. 4 bindings, "discrete packets of light travel emitter → tip in time with the sound font" — concrete + sensory.)

#### showcase-hex-loom: Hex Loom ⬢
- Status: PASS (Automata style — rare engine style. Rule 30 cellular automaton reference is technical + evocative. 4 bindings.)

#### showcase-kyber-bloom: Kyber Bloom ✦
- Status: PASS (crystalShatter style — rare engine style. 4 bindings, hexagonal-facet description matches the engine behavior.)

#### showcase-hearth-watch: Hearth Watch 🜂
- Status: PASS (Candle style — rare engine style. fbm flicker + battery awareness. "As the night wears on" — voice anchor met.)

#### showcase-ember-drift: Ember Drift 🜂
- Status: PASS (Ember style — rare engine style. 4 bindings, 4-stop fire gradient.)

#### showcase-photon-loom: Photon Loom ✺
- Status: PASS (Photon style. 4 bindings, colorHueShiftSpeed driven by motion. Sun-loom description is poetic.)

#### showcase-gravitas: Gravitas ⊥
- Status: PASS (Gravity style — rare engine style. "Point the hilt at the floor and the brightness collects in the emitter" — concrete physics + 25s magenta drift LFO.)

#### showcase-plasma-coil: Plasma Coil ⚯
- Status: **FLAG: `retraction: 'flicker-out'` is an INVALID engine ID** — the engine registry uses `flickerOut` (camelCase, see `packages/engine/src/ignition/index.ts:111`). At runtime this falls back to `standard` with a `console.warn`. **Real bug.** Suggest changing to `retraction: 'flickerOut'`.

---

## Cross-cutting recommendations (not in scope to fix, surfaced for follow-up)

1. **Fix `showcase-plasma-coil` retraction ID** — change `'flicker-out'` → `'flickerOut'`. One-line change, surfaces an actual silent runtime fallback today.
2. **Resolve Loden Greatstorm / Elzar Mann / Burryaga ID-vs-color mismatches** — three preset IDs name a color that contradicts the config baseColor. The colors are correct per canon; the IDs and display names need to flip to match.
3. **Resolve config-name collisions across prequel-era ↔ animated-series** — `PloKoon`, `KitFisto`, `AaylaSecura`, `BarrissOffee`, `ShaakTi`, `AgenKolar`, `SaeseeTiin`, `DepaBillaba` all collide. Suffix the animated variants with `CW` (e.g. `PloKoonCW`) or scope by era prefix. Today the gallery shows distinct entries, but if a user loads both into the same preset list the `name` field conflicts may surface.
4. **Backfill `author: 'on-screen'` across prequel-era, sequel-era, animated, and EU presets** — the field is the source of truth for the gallery's authorship line and is consistently set ONLY in original-trilogy.ts.
5. **Backfill `screenAccurate: true` across all EU presets derived from canon games/Disney+** — currently set on Acolyte entries, Trilla Suduri, Marrok, Dagan Gera, Bode Akuna, Taron Malicos, Inquisitor Barriss, Kelleran Beq, Cal Kestis Crossguard, Cal Kestis Double. Inconsistently set on the rest.
6. **Voice-anchor calibration** — for the ~6 presets flagged on description length (`prequel-anakin`, `prequel-eeth-koth`, `prequel-stass-allie`, `eu-cal-kestis-green`, `eu-cal-kestis-orange`, `eu-keeve-trennis-green`, `eu-orla-jareni-white`), apply the OT exemplar pattern: 1–2 sentences with one in-world detail + one sensory detail + one production-era anchor.
7. **Shin Hati duplication** — `animated-shin-hati-orange` vs. `eu-shin-hati-orange` are two presets for the same character with different style choices. Decide which is canon-correct and consolidate, or rename to make the intent explicit (e.g. `eu-shin-hati-orange-fire-treatment` vs. `animated-shin-hati-orange-cinder-treatment`).
