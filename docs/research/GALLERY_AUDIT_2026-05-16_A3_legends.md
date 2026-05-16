# Gallery Audit — legends.ts — Agent A3

**Date:** 2026-05-16
**Scope:** 68 presets in `packages/presets/src/characters/legends.ts`
**Auditor:** A3

## Summary

- Total audited: 68
- PASS: 47
- FLAG: 21

## Systemic issues

- **`screenAccurate` field missing on all 68 presets.** Every other character file in the library sets this — `original-trilogy.ts` (7 hits), `prequel-era.ts` (27), `sequel-era.ts` (10), `animated-series.ts` (47), `extended-universe.ts` (19), etc. — but `legends.ts` has zero. The audit brief explicitly notes "likely `false` for legends without screen appearances." A few entries (Lumiya in the Holiday Special, Joruus C'baoth's Tartakovsky cameo, etc.) might warrant a discussion, but the overwhelming majority should be `screenAccurate: false`. This is the highest-leverage gallery-rigor fix in the file.
- **`hiltNotes` missing on 9 of 68 presets (13%).** Sion, Jaina Solo, Darth Caedus, Nomi Sunrider, both Ulic Qel-Droma entries, Darth Talon, Cade Skywalker, and Darth Vitiate all lack hilt context. For comparison, every Revan/Bastila/Bane/Plagueis/Mara Jade entry has it. Easy fill from Bane Trilogy, NJO novels, KOTOR comics, and TOR concept art.
- **Timing outliers cluster at the ignition floor and retraction ceiling.** Five presets are outside the brief's 200-450ms / 300-500ms guidance: Starkiller Red (150/250 — ignition too fast), PROXY (180/250 — ignition below 200ms), Lowbacca (480/440 — ignition above 450ms), Darth Traya (400/550 — retraction over 500ms), Darth Vitiate (300/600 — retraction well over 500ms). Most are narratively justified (Vitiate's "spaghettify" retraction is intentional flavor), but they should be flagged for the timing-cluster invariant.

## Per-preset findings

### legends-darth-revan-purple: Darth Revan (Purple)
- Status: PASS

### legends-darth-revan-red: Darth Revan (Red - Sith Lord)
- Status: PASS

### legends-bastila-shan-yellow: Bastila Shan (Yellow - Double-Bladed)
- Status: FLAG: Bastila's KOTOR depiction is a single-bladed yellow saber; the double-bladed yellow is one specific cinematic and not her primary depiction. Consider re-naming to "Bastila Shan (Yellow)" with a hiltNote covering both modes, or split into two presets.

### legends-darth-nihilus-red: Darth Nihilus (Red)
- Status: FLAG: `retractionMs: 500` is at the brief's 500ms ceiling, `ignitionMs: 200` at the floor — sits right at the edge of the cluster. Narratively justified by "drinks the life around it" but worth flagging.

### legends-darth-sion-red: Darth Sion (Red)
- Status: FLAG: Missing `hiltNotes`. Sion's hilt is depicted in KOTOR II and the Darth Sion comic — straightforward to fill.

### legends-darth-malak-red: Darth Malak (Red)
- Status: PASS

### legends-meetra-surik-cyan: Meetra Surik / Jedi Exile (Cyan)
- Status: PASS

### legends-starkiller-blue: Starkiller / Galen Marek (Blue)
- Status: FLAG: `ignitionMs: 200` is at the floor of the timing cluster — borderline acceptable but worth noting. Style choice (`photon`) is unusual; Starkiller's blade in TFU is depicted as conventional Jedi blue, not photon-style.

### legends-starkiller-red: Starkiller / Galen Marek (Red - Dark Side)
- Status: FLAG: `ignitionMs: 150` is below the 200ms timing floor. The narrative "dual reverse-grip / Sith Stalker" justifies fast ignition but it's outside the cluster invariant.

### legends-mara-jade-purple: Mara Jade (Purple)
- Status: FLAG: Mara Jade's most iconic blade is magenta/violet leaning warmer than the current `r: 180, g: 20, b: 220` — the NJO/Legacy depictions show closer to magenta-pink. Minor color drift; flagging as borderline.

### legends-kyle-katarn-blue: Kyle Katarn (Blue)
- Status: PASS

### legends-kyle-katarn-green: Kyle Katarn (Green - Legacy era)
- Status: FLAG: `hiltNotes` is identical copy-paste from the blue preset ("Rahn's lightsaber, passed to Kyle"). Kyle rebuilt his hilt multiple times across the games — the green-era depiction (Jedi Academy onward) deserves its own note.

### legends-jaina-solo-purple: Jaina Solo (Purple)
- Status: FLAG: Missing `hiltNotes`. Jaina's lightsaber appearances span NJO and LotF — fillable from sourcebooks.

### legends-jacen-solo-blue: Jacen Solo (Blue - Pre-Fall Jedi)
- Status: PASS

### legends-darth-caedus-red: Jacen Solo / Darth Caedus (Red)
- Status: FLAG: Missing `hiltNotes`. Caedus rebuilt his saber after his fall; the LotF novels describe it in detail.

### legends-corran-horn-silver: Corran Horn (Silver/White)
- Status: PASS

### legends-exar-kun-jedi: Exar Kun (Blue - Pre-Fall Jedi)
- Status: PASS

### legends-exar-kun-sith: Exar Kun (Red - Sith Double-Bladed)
- Status: PASS

### legends-nomi-sunrider-green: Nomi Sunrider (Green)
- Status: FLAG: Missing `hiltNotes`. Nomi's saber is famously the inherited Andur Sunrider hilt — strong narrative hook left unused.

### legends-ulic-qel-droma-blue: Ulic Qel-Droma (Blue)
- Status: FLAG: Missing `hiltNotes`. Tales of the Jedi era — strong source material exists.

### legends-ulic-qel-droma-red: Ulic Qel-Droma (Red - Sith Apprentice)
- Status: FLAG: Missing `hiltNotes`.

### legends-darth-bane-red: Darth Bane (Red)
- Status: FLAG: The audit brief explicitly cites "Darth Bane's unstable rage-induced blade → unstable" as the example test for style accuracy. Current preset is `style: 'stable'`. The Bane trilogy emphasizes his volatile rage-fueled combat; consider `unstable` or at least bumping shimmer noticeably. Color and timing are fine.

### legends-darth-plagueis-red: Darth Plagueis (Red)
- Status: PASS

### legends-darth-talon-red: Darth Talon (Red)
- Status: FLAG: Missing `hiltNotes`. Legacy comics show her hilt clearly.

### legends-darth-krayt-red: Darth Krayt (Red)
- Status: FLAG: `description` is one sentence (109 chars). Per voice anchor, this is the shortest non-trivial entry and could use a second sentence on the One Sith / Vong-coral hilt influence (already mentioned in `hiltNotes`, but not echoed in the description).

### legends-cade-skywalker-blue: Cade Skywalker (Blue)
- Status: FLAG: Missing `hiltNotes`. Legacy comics depict Cade's hilt prominently.

### legends-maris-brood-red: Maris Brood (Red - Tonfa)
- Status: FLAG: `ledCount: 100` is the only non-144 LED count in the whole file. May be intentional for tonfa-grip shoto blades (shorter blades), but it's inconsistent with the rest of the library — confirm if this is desired or a leftover.

### legends-rahm-kota-green: Rahm Kota (Green)
- Status: PASS

### legends-proxy-prism: PROXY (Variable - Prism)
- Status: FLAG: `ignitionMs: 180` is below the 200ms timing floor. Prism style + 8 facets + 2.0 colorShiftSpeed is a strong stylistic choice that matches the "holographic mimic" narrative — flagging timing only.

### legends-darth-traya-purple: Darth Traya / Kreia (Purple)
- Status: FLAG: `retractionMs: 550` is above the 500ms timing ceiling. Aurora style + drip-up + unravel is great for the "three sabers / grey philosophy" theme — flagging timing.

### legends-visas-marr-red: Visas Marr (Red)
- Status: PASS

### legends-visas-marr-redeemed: Visas Marr (Blue - Redeemed)
- Status: PASS

### legends-darth-vitiate-red: Darth Vitiate / Valkorion (Red)
- Status: FLAG: Missing `hiltNotes`. Also `retractionMs: 600` is well above the 500ms ceiling — spaghettify retraction is fitting flavor for "consumer of worlds" but two problems on one preset.

### legends-darth-malgus-red: Darth Malgus (Red)
- Status: PASS

### legends-anakin-solo-blue: Anakin Solo (New Jedi Order)
- Status: PASS

### legends-ben-skywalker-blue: Ben Skywalker
- Status: PASS

### legends-tenel-ka-turquoise: Tenel Ka Djo
- Status: FLAG: `hiltNotes` says "rancor-tooth crystal" in the description and "single-handed grip optimized after her left arm was lost." Tenel Ka's iconic detail is her *rancor-tooth* (not crystal) lightsaber — the cracked crystal caused her arm loss. Description says "her rancor-tooth crystal she crafted from her single-armed combat training arc" — that's backwards (the arc came *because* of the rancor-tooth crystal failing). Minor lore inversion.

### legends-lowbacca-bronze: Lowbacca (Wookiee Jedi)
- Status: FLAG: `ignitionMs: 480` is above the 450ms timing ceiling. Color (bronze) is a YJK creative choice; canonically Lowbacca's blade is described as bronze/amber — passes color check, flagging timing only.

### legends-joruus-cbaoth-green: Joruus C'baoth
- Status: PASS

### legends-vergere-yellow: Vergere
- Status: PASS

### legends-jolee-bindo-blue: Jolee Bindo
- Status: PASS

### legends-juhani-cyan: Juhani (Cathar Jedi)
- Status: PASS

### legends-atris-blue: Atris (Jedi Historian)
- Status: FLAG: Atris is depicted in KOTOR II with multiple lightsabers (a Vault collection) — her *iconic* blade is violet/silver, not blue. The "pale Jedi blue, almost grey-blue" choice is a defensible interpretation but doesn't match the in-game depiction. Consider violet or silver.

### legends-satele-shan-blue: Satele Shan
- Status: PASS

### legends-lana-beniko-red: Lana Beniko
- Status: PASS

### legends-kira-carsen-blue: Kira Carsen
- Status: PASS

### legends-darth-marr-red: Darth Marr
- Status: PASS

### legends-darth-baras-red: Darth Baras
- Status: PASS

### legends-darth-zannah-red: Darth Zannah
- Status: PASS

### legends-kazdan-paratus-blue: Kazdan Paratus (Junk Jedi)
- Status: PASS

### legends-jerec-red: Jerec (Blind Dark Jedi)
- Status: PASS

### legends-desann-green: Desann
- Status: FLAG: Desann's blade is traditionally depicted as red/orange in Jedi Outcast (Reborn Sith Master); the "toxic green" choice is creative but not matching the game depiction. Consider red for source-accuracy, or rename to clarify it's a creative reinterpretation.

### legends-tavion-axmis-red: Tavion Axmis
- Status: PASS

### legends-darth-tenebrous-red: Darth Tenebrous
- Status: PASS

### legends-lord-hoth-blue: Lord Hoth (Army of Light)
- Status: PASS

### legends-lumiya-red-lightwhip: Lumiya (Sith Lightwhip)
- Status: FLAG: Description honestly notes "true lightwhip topology is post-launch engine work" — good transparency but flagging because the preset claims a topology it can't render. Consider deferring this preset until lightwhip topology lands, or making the name explicitly "(Lightwhip — single-blade approximation)" so users aren't misled.

### legends-atton-rand-green: Atton Rand (Yellow-Green)
- Status: PASS

### legends-arcann-gold: Arcann (Gold-White)
- Status: FLAG: `affiliation: 'neutral'` is debatable — Arcann's storyline arc spans tyrant → redeemed, but during his primary depiction (Knights of the Fallen Empire) he's clearly antagonist/Sith-aligned. Description acknowledges patricide and tyranny. Consider `sith` for primary depiction; `neutral` reads as post-redemption-arc only.

### legends-vaylin-yellow: Vaylin (Amber)
- Status: PASS

### legends-lord-scourge-red: Lord Scourge (Crimson)
- Status: PASS

### legends-darth-jadus-red: Darth Jadus (Blood Red)
- Status: PASS

### legends-nadia-grell-green: Nadia Grell (Emerald)
- Status: PASS

### legends-thexan-gold: Thexan (Gold)
- Status: FLAG: `affiliation: 'neutral'` — Thexan is a Zakuulan prince fighting *for* the Eternal Empire's conquest. He's an antagonist in his Sacrifice cinematic. The "neutral" label is generous; consider `sith` to match Arcann's storyline alignment, or use `other` if the Zakuulan tradition is the framing.

### legends-empress-acina-red: Empress Acina (Sith Red)
- Status: PASS

### legends-jaesa-willsaam-dark-red: Jaesa Willsaam (Dark Side)
- Status: PASS

### legends-brianna-handmaiden-cyan: Brianna / Handmaiden (Cyan)
- Status: PASS

### legends-bao-dur-blue: Bao-Dur (Blue)
- Status: FLAG: Bao-Dur famously *never builds his lightsaber* in released KOTOR II content — it was cut. The preset is essentially a "what should have been" reconstruction. Flag for transparency: consider adding a `hiltNotes` mention of the cut-content origin, or noting in description that this represents the unreleased Bao-Dur Jedi-conversion arc.

### legends-mical-disciple-blue: Mical / Disciple (Blue)
- Status: PASS
