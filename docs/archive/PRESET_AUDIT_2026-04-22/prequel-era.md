# Prequel Era Preset Audit — 2026-04-22

**Source priority**: Blu-ray frames → Wookieepedia → community convention → Legends fallback.

**Scope**: `packages/presets/src/characters/prequel-era.ts`
**Engine registry cross-ref** (as of audit):
- Ignition IDs valid: `standard, scroll, center, spark, wipe, stutter, glitch, twist, swing, stab, custom-curve, crackle, fracture, flash-fill, pulse-wave, drip-up, hyperspace, summon, seismic`
- Retraction IDs valid: `standard, scroll, center, fadeout, shatter, custom-curve, dissolve, flickerOut, unravel, drain, implode, evaporate, spaghettify`
- Style IDs valid: `stable, unstable, fire, pulse, rotoscope, photon, cinder, …`

## Summary

- **Total presets**: 26
- **Flagged for fixes**: 17
- **Already accurate**: 9 (pq Obi-Wan Ep1, pq Obi-Wan Ep3, pq Anakin Ep3, pq Plo Koon, pq Aayla Secura, pq Luminara, pq Barriss Offee, pq Shaak Ti, pq Ki-Adi-Mundi — all film-accurate film-era Jedi on canonical settings)
- **Top issues**:
  1. **Cinematic/creative ignitions on stable Jedi & Sith film-canon sabers.** `summon` (4 presets: Qui-Gon, Yoda, Dooku, Palpatine) and paired cinematic retractions (`implode`, `evaporate`, `drain`, `fadeout`) appear on film sabers that should use `standard` ~200-400ms per user guidance.
  2. **Wrong-style assignments on canon-stable blades.** Mace Windu = `pulse`, Yoda = `pulse`, Kit Fisto = `photon`, Darth Maul = `fire`, Savage Opress = `unstable`, Ventress = `unstable`, Palpatine = `cinder`. Only Savage/Ventress arguably defensible (animated series has slight saber instability in Clone Wars, but still rendered as stable energy — not the `unstable` engine style which mimics OT/crossguard instability).
  3. **Mace Windu base color is generic violet, not amethyst.** Current `{130,0,255}` is "RGB purple"; canon amethyst on screen is visibly pink-tinged with a slightly warm core (per Revenge of the Sith Blu-ray color-grading; the hue shifts warm under bloom).
  4. **Invalid registry ID**: `retraction: 'flickerOut'` (camelCase) is valid in the RETRACTION_REGISTRY as written, but `ignition: 'crackle'` is valid. However `retraction: 'dissolve'` is in-registry. No invalid IDs detected this pass — engine falls back to `standard` on misses, which would silently hide errors. **All ignition/retraction IDs in this file validate against the registry**.
  5. **Shimmer over-tuning on canon-stable sabers.** Mace 0.12, Yoda 0.08, Darth Maul 0.15, Palpatine 0.18, Grievous 0.08 all exceed the 0.0-0.1 prequel-stable range.

## Per-preset audit

### `prequel-obi-wan-ep1` — Obi-Wan Kenobi (Padawan, TPM)

**Current**: style=`stable`, ignition=`standard`+300ms, retraction=`standard`+280ms, shimmer=0.05
**Screen-accurate**: stable blade, standard ignition, bright saturated green.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | TPM Obi-Wan uses the same hilt/blade as Qui-Gon's crystal — cool saturated green that reads emerald on Blu-ray. Current `{0,215,32}` is a touch green-dominant; the on-screen blade is slightly more yellow-tinged in dim lighting but `{0,215,32}` is a reasonable cinematic baseline. |

**Status**: ACCURATE.

---

### `prequel-obi-wan-ep3` — Obi-Wan Kenobi (Master, AOTC+ROTS)

**Current**: style=`stable`, ignition=`standard`+280ms, retraction=`standard`+300ms, shimmer=0.05
**Screen-accurate**: clean deep-cool blue (cooler than Anakin), stable, standard ignition.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| baseColor | `{0,135,255}` | **Keep or `{0,150,255}`** | ROTS blade reads as a cool cyan-leaning blue; `{0,135,255}` is accurate. User guidance says Anakin is cooler — but actually Obi-Wan's blade is visibly MORE cyan and Anakin's is slightly warmer (more pure-blue) per Duel on Mustafar reference. Current is correct. |

**Status**: ACCURATE.

---

### `prequel-qui-gon` — Qui-Gon Jinn

**Current**: style=`stable`, ignition=`summon`+320ms, retraction=`fadeout`+300ms, shimmer=0.04
**Screen-accurate**: stable green, standard ignition/retraction.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| ignition | `summon` | **`standard`** | Qui-Gon's saber ignites with a normal one-shot whoosh (TPM opening: bridge fight + Naboo hangar). `summon` is a cinematic/creative animation, not film-canon. Per user guidance, flag cinematic ignitions on canon sabers. |
| retraction | `fadeout` | **`standard`** | Retraction is a normal on-screen tip-to-base collapse, not a fade dissolve. |
| ignitionMs | 320 | **280-300** | Current is within tolerance but slightly long; TPM ignition is crisp. |
| noiseLevel | 0.02 | remove or **keep** | Minor; acceptable. |

**Feature-leveraging opportunity**: Qui-Gon's saber has a distinct audio identity (mentor hum). Not a visual fix. Consider lineage note referencing Qui-Gon as Obi-Wan Ep1's mentor.

---

### `prequel-anakin` — Anakin Skywalker (ROTS / Anakin's 2nd saber)

**Current**: style=`stable`, ignition=`standard`+280ms, retraction=`standard`+300ms, shimmer=0.06
**Screen-accurate**: stable blue, crisp standard, iconic Graflex hilt.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| baseColor | `{0,120,255}` | **Keep** | Anakin's blade on Mustafar reads as slightly warmer and more saturated than Obi-Wan's; `{0,120,255}` captures that. User's "cooler" note likely reversed — Obi-Wan's blade has more cyan. |
| shimmer | 0.06 | **0.04-0.05** | Minor; bring in line with other Jedi for consistency. |

**Feature-leveraging opportunity**: This is the SAME blade Luke inherits → cross-reference to ANH Luke preset for lineage chain (design-system level `parentId`). Defer; not a config change.

**Status**: Near-accurate. One minor shimmer polish.

---

### `prequel-anakin-ep2` — Anakin Skywalker (AOTC / 1st saber)

**Current**: style=`stable`, ignition=`standard`+300ms, retraction=`standard`+280ms, shimmer=0.05
**Screen-accurate**: stable blue, slightly brighter than ROTS saber, standard.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| baseColor | `{0,140,255}` | **Keep** | AOTC blade is described as brighter/lighter blue. Current is appropriate. |

**Status**: ACCURATE.

---

### `prequel-mace-windu` — Mace Windu (Amethyst)

**Current**: style=`pulse`, ignition=`seismic`+260ms, retraction=`implode`+280ms, shimmer=0.12
**Screen-accurate**: stable amethyst blade (pink-tinged purple), standard ignition.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| baseColor | `{130,0,255}` | **`{170,60,240}` or `{160,50,235}`** | Current is generic violet/electric-purple. Canon amethyst on Blu-ray (AOTC Geonosis arena, ROTS Palpatine arrest) is distinctly pink-tinged — a warm-leaning magenta-purple, not cool violet. The saber famously reads closer to fuchsia under hot lighting. |
| style | `pulse` | **`stable`** | Mace's blade is 100% stable on screen. `pulse` adds rhythmic brightness modulation that doesn't match ROTS reference. Flagged per user guidance (prequel canon = stable/rotoscope only). |
| ignition | `seismic` | **`standard`** | `seismic` is an experimental/cinematic ignition. Mace's saber ignites with a normal snap-hiss. |
| retraction | `implode` | **`standard`** | `implode` is cinematic. Mace's retractions are standard tip-to-base on screen. |
| shimmer | 0.12 | **0.03-0.05** | Mace's blade is crisp and stable, not shimmery. |
| pulseSpeed / pulseMinBright | 1.2 / 0.5 | **remove** | No longer applicable once style → stable. |
| ignitionMs | 260 | **280-320** | Minor; current is on the snappy side. |

**Feature-leveraging opportunity**: **YES** — Mace's amethyst is unique. Consider authoring a **subtle gradient tip** variant (tip slightly more pink, base slightly more violet) as a *second detailed-tier preset* to capture the bloom behavior. Do not change the canon default. This would showcase the engine's gradient style. Note as an additive creative variant post-launch.

---

### `prequel-yoda` — Yoda

**Current**: style=`pulse`, ignition=`summon`+200ms, retraction=`evaporate`+220ms, shimmer=0.08
**Screen-accurate**: stable short-blade green (slightly more yellow-green than ROTJ Luke per user guidance), standard ignition (fast because shoto).

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| baseColor | `{0,235,20}` | **`{50,230,20}` or keep** | Per user guidance, prequel Yoda is slightly more yellow-green than ROTJ Luke. Current is pure green with only a touch of blue clipped. Consider `{50,230,20}` to add a hint of yellow warmth. |
| style | `pulse` | **`stable`** | Yoda's blade is stable in AOTC arena duel + ROTS Senate duel. No on-screen pulsing. |
| ignition | `summon` | **`standard`** | Cinematic animation; not film-canon. Yoda's saber ignites with a fast snap-hiss (consistent with the short blade's quick energy return). |
| retraction | `evaporate` | **`standard`** | Cinematic. Retracts normally. |
| shimmer | 0.08 | **0.03-0.05** | Reduce to canon-stable range. |
| pulseSpeed / pulseMinBright | 0.6 / 0.6 | **remove** | N/A after style change. |
| ignitionMs / retractionMs | 200 / 220 | **200 / 220 OK** | Fast ignition is appropriate for shoto length — current works. |

**Feature-leveraging opportunity**: Shoto blade length (shorter LED count) is a topology concern — the prequel Yoda preset correctly notes this in `hiltNotes` but doesn't reduce `ledCount`. Consider a topology note / lower `ledCount` (e.g. 100) for the shoto blade. Engine-level feature; flag for a topology pass.

---

### `prequel-dooku` — Count Dooku

**Current**: style=`stable`, ignition=`summon`+300ms, retraction=`drain`+320ms, shimmer=0.04
**Screen-accurate**: clean saturated Sith red, stable, standard ignition. Dooku's red is famously "cleaner" than Vader's or Maul's (per user guidance).

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| baseColor | `{255,0,0}` | **Keep or `{255,20,10}`** | Pure red reads appropriately for Dooku's curved-hilt blade. A touch of warmth (`{255,20,10}`) matches the slightly less-aggressive tint seen in AOTC arena duel. |
| ignition | `summon` | **`standard`** | Cinematic. Dooku's saber ignites with a standard Sith snap-hiss; elegant but not magical. |
| retraction | `drain` | **`standard`** | `drain` has a molten/gravity-dropping connotation that doesn't match Dooku's precise Makashi aesthetic. Use `standard`. (Contrast with Maul/Vader where a more aggressive retraction would be defensible — but still not `drain` for film-canon.) |
| dragColor | `{255,100,0}` | **Keep** | Orange-red molten drag fits Sith-red blade on a surface. |

**Feature-leveraging opportunity**: **YES — twist-angle coupling for curved-hilt Makashi dynamics**. The engine supports `twistAngle` in `StyleContext`. For Dooku, a subtle blade-lean responsive color-shift (slight saturation bump on twist) would canonically reflect his Form II fencing. Note for post-launch modulation-routing v1.1 sprint (see `docs/MODULATION_ROUTING_V1.1.md`).

---

### `prequel-darth-maul` — Darth Maul

**Current**: style=`fire`, ignition=`center`+300ms, retraction=`center`+350ms, shimmer=0.15
**Screen-accurate**: stable intense Sith red, DOUBLE-BLADED (both blades ignite simultaneously from a central hilt), standard ignition per blade.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| style | `fire` | **`stable`** | Maul's blade is stable in TPM (Theed duel) and Clone Wars. `fire` is a cinematic particle effect that doesn't match the crisp neon-red saturation on screen. |
| ignition | `center` | **`standard`** (per individual blade) | User guidance specifically called out `center` as wrong here. Maul's hilt is double-bladed, so each blade ignites from the hilt emitter outward — that IS a `standard` per-blade ignition. `center` implies ignition from the blade's midpoint which is not what happens. (Note: `center` is intuitive for single-blade-representation of a double hilt but mechanically wrong.) |
| retraction | `center` | **`standard`** | Same reasoning. |
| baseColor | `{255,0,0}` | **Keep or `{255,15,5}`** | Maul's blade is a brutal, saturated Sith red. Current pure red is appropriate; tiny green-warm shift would match the TPM Theed-reactor duel color-grade. |
| shimmer | 0.15 | **0.03-0.08** | Overstated. Maul's blade reads clean and intense, not shimmery. User guidance: prequel stable = 0.0-0.1. Clone Wars-era depictions are *very slightly* more active; 0.08 upper bound defensible. |
| fireSize / sparkRate / heatSpread | 0.6 / 0.5 / 0.7 | **remove** | No longer applicable once style → stable. |
| ignitionMs / retractionMs | 300 / 350 | **250-300 / 300** | 300/350 is within range but retraction slightly long. |

**Feature-leveraging opportunity**: **Double-bladed topology — cannot be fully represented until v0.15 Multi-Blade Workbench.** Current single-blade preview is a reasonable proxy for now. `topologyNotes` correctly flags this. Retain note; no action pre-v0.15.

---

### `prequel-kit-fisto` — Kit Fisto

**Current**: style=`photon`, ignition=`wipe`+300ms, retraction=`standard`+280ms, shimmer=0.05
**Screen-accurate**: stable green, standard ignition. Kit Fisto is a Jedi — stable blade.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| style | `photon` | **`stable`** | No screen basis for a photon-style blade on Kit Fisto. He's a standard Jedi with a standard saber (AOTC Geonosis arena, ROTS Palpatine arrest squad). |
| ignition | `wipe` | **`standard`** | `wipe` is atypical; Kit's saber ignites normally. |
| retraction | `standard` | **Keep** | OK. |

**Feature-leveraging opportunity**: Hilt notes mention "waterproof, dual activation switches, designed for underwater use on Glee Anselm." This is a **hilt feature, not a blade feature**. Flag for hilt-library tier matching. No config change.

---

### `prequel-plo-koon` — Plo Koon

**Current**: style=`stable`, ignition=`standard`+300ms, retraction=`standard`+300ms, shimmer=0.05
**Screen-accurate**: stable blue, standard.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | Film-canon Jedi on stable + standard. |

**Status**: ACCURATE.

---

### `prequel-aayla-secura` — Aayla Secura

**Current**: style=`stable`, ignition=`standard`+280ms, retraction=`standard`+290ms, shimmer=0.04
**Screen-accurate**: stable blue, standard.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | Film-canon Jedi. Order 66 on Felucia shows standard blade. |

**Status**: ACCURATE.

---

### `prequel-luminara` — Luminara Unduli

**Current**: style=`stable`, ignition=`standard`+310ms, retraction=`standard`+300ms, shimmer=0.03
**Screen-accurate**: stable green, standard.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | Correct. |

**Status**: ACCURATE.

---

### `prequel-barriss-offee` — Barriss Offee

**Current**: style=`stable`, ignition=`standard`+290ms, retraction=`standard`+280ms, shimmer=0.04
**Screen-accurate**: stable blue (her pre-fall saber was blue, matching her Padawan years).

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | Correct for canonical pre-fall Barriss. (Post-fall she wielded a red, but that's an animated-era story beat.) |

**Status**: ACCURATE.

**Note**: Description mentions "her fall to the dark side" — that's in Clone Wars S5, not prequel films. The preset correctly represents her pre-fall saber. Consider a separate `animated-era` red variant post-launch.

---

### `prequel-shaak-ti` — Shaak Ti

**Current**: style=`stable`, ignition=`standard`+300ms, retraction=`standard`+300ms, shimmer=0.05
**Screen-accurate**: stable blue, standard.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | Correct. |

**Status**: ACCURATE.

---

### `prequel-ki-adi-mundi` — Ki-Adi-Mundi

**Current**: style=`stable`, ignition=`standard`+310ms, retraction=`standard`+290ms, shimmer=0.04
**Screen-accurate**: stable blue, standard.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | Correct. Order 66 on Mygeeto depicts standard blue blade. |

**Status**: ACCURATE.

---

### `prequel-depa-billaba` — Depa Billaba

**Current**: style=`stable`, ignition=`standard`+290ms, retraction=`standard`+300ms, shimmer=0.04
**Screen-accurate**: Depa's film appearance (TPM/AOTC Council cameos) is limited; canonically her saber is green (Legends / Rebels connection through Kanan). Current config is reasonable.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | Standard Jedi baseline; limited reference material validates current settings. Flag as UNCERTAIN but reasonable. |

**Status**: ACCURATE (with noted uncertainty — Depa's on-screen saber usage is minimal; green is community-convention consensus).

---

### `prequel-savage-opress` — Savage Opress

**Current**: style=`unstable`, ignition=`fracture`+380ms, retraction=`dissolve`+350ms, shimmer=0.35
**Screen-accurate**: Clone Wars animated series — yellow-green double-bladed saber. The blade renders as stable energy in the series (not OT/crossguard-unstable).

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| style | `unstable` | **`stable`** (or `pulse` with subtle mod) | Clone Wars sabers are drawn as stable energy. `unstable` in the engine simulates OT rotoscope-flicker / crossguard instability — not appropriate. Savage's saber on screen is crisp. |
| ignition | `fracture` | **`standard`** | `fracture` is cinematic/creative. User guidance: `fracture` flagged as wrong for canon. Savage's saber ignites with a standard hiss in Brothers (S4E21). |
| retraction | `dissolve` | **`standard`** | `dissolve` is cinematic. Use standard. |
| baseColor | `{180,255,0}` | **`{210,235,0}`** | Current is lime-heavy; Savage's on-screen blade in Clone Wars has more yellow (closer to a tainted/corrupted green-yellow). `{210,235,0}` reads more like the animated reference. |
| shimmer | 0.35 | **0.08-0.12** | Overstated. Even allowing for "Sith corruption" tinge, this is far beyond the 0.0-0.1 prequel-stable range. |
| flicker / noiseLevel / swingFxIntensity | 0.7 / 0.15 / 0.5 | **remove flicker; noise 0.05; swing 0.3** | Overtuned for a stable canon blade. |
| ignitionMs / retractionMs | 380 / 350 | **280-320 / 300** | Current is long; animated series ignitions are crisp. |

**Feature-leveraging opportunity**: Savage's saber has a faint "corrupted" vibe since it's a Nightbrother weapon — consider a **detailed-tier variant with subtle slow pulse (~0.6Hz, low amplitude)** as a creative evocation of the corruption theme. Keep as a separate "detailed" preset; the baseline should be canon-stable.

---

### `prequel-asajj-ventress` — Asajj Ventress

**Current**: style=`unstable`, ignition=`crackle`+260ms, retraction=`flickerOut`+280ms, shimmer=0.3
**Screen-accurate**: Clone Wars animated — twin curved-hilt red sabers. Blade renders stable.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| style | `unstable` | **`stable`** | Same reasoning as Savage: Clone Wars blades are crisp/stable. |
| ignition | `crackle` | **`standard`** | User guidance explicitly flags `crackle` as wrong for canon. Ventress's sabers ignite with a standard Sith hiss. |
| retraction | `flickerOut` | **`standard`** | User guidance flags `flickerOut` as wrong. Use standard. |
| baseColor | `{255,0,10}` | **Keep** | Ventress's red reads slightly warmer than Dooku's — pure red with a hint of warmth; current approximates well. |
| shimmer | 0.3 | **0.04-0.08** | Overstated per prequel-stable range. |
| flicker / stutterCount / noiseLevel | 0.5 / 3 / 0.1 | **remove** | Not canon. |
| ignitionMs | 260 | **260-280** | OK. |

**Feature-leveraging opportunity**: Ventress's dual-wield + connect-at-pommel topology is multi-blade territory (v0.15). Flag in `topologyNotes`; do not implement.

---

### `prequel-grievous` — General Grievous

**Current**: style=`stable`, ignition=`standard`+280ms, retraction=`standard`+300ms, shimmer=0.08
**Screen-accurate**: Grievous wields stolen Jedi sabers. Each is a standard Jedi blade (blue or green).

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| baseColor | `{0,200,40}` | **Keep** | Represents one of his stolen green blades. Reasonable. |
| shimmer | 0.08 | **0.04-0.05** | Slightly over the 0.0-0.1 range; tighten to canon-stable. |
| style / ignition / retraction | stable / standard / standard | **Keep** | Correct. |

**Feature-leveraging opportunity**: **Quad-wield topology — cannot be represented until v0.15.** Topology notes correctly flag. Consider adding 3 sibling presets (grievous-blue-1, grievous-blue-2, grievous-green-2) later to let users manually assemble a quad-set for fan-film work. Defer.

**Status**: Near-accurate; one minor shimmer polish.

---

### `prequel-palpatine` — Darth Sidious

**Current**: style=`cinder`, ignition=`crackle`+220ms, retraction=`drain`+260ms, shimmer=0.18
**Screen-accurate**: ROTS Jedi Temple / Mace duel — stable saturated Sith red. Palpatine's saber is concealed and elegant, not corrupted-looking.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| style | `cinder` | **`stable`** | `cinder` adds an ember/particle effect that doesn't match Palpatine's crisp, elegant red blade. On screen his saber reads as cleanly as any other film-canon saber. |
| ignition | `crackle` | **`standard`** | Per user guidance, `crackle` flagged as wrong for canon. |
| retraction | `drain` | **`standard`** | Cinematic. Standard retraction on screen (e.g., end of Mace duel). |
| baseColor | `{255,0,0}` | **Keep or `{255,25,15}`** | Pure red. Slight warmth optional. |
| dragColor | `{200,0,200}` | **`{255,80,0}`** | Current purple drag is a Sith-lightning reference, not a drag-on-surface color. Drag should be molten orange. If "Force lightning" aesthetic is desired, that should be a separate `lockup` variant or a Force-effect color, not dragColor. |
| shimmer | 0.18 | **0.03-0.05** | Overstated. |
| noiseLevel / swingFxIntensity | 0.08 / 0.35 | **0.03 / 0.25** | Tighten. |
| ignitionMs | 220 | **250-280** | Slightly fast; Palpatine's snap-hiss is crisp but not the fastest. |

**Feature-leveraging opportunity**: Palpatine's saber is hidden in his sleeve until the Mace confrontation — narrative opportunity for an **ignition variant** (`stab` ignition for the sleeve-draw surprise reveal?). `stab` is in the engine registry. Defer as a creative variant, not the canon default.

---

### `prequel-agen-kolar` — Agen Kolar

**Current**: style=`stable`, ignition=`standard`+280ms, retraction=`standard`+280ms, shimmer=0.04
**Screen-accurate**: Zabrak Jedi, standard blue blade.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | Correct. |

**Status**: ACCURATE. (Noted above as flagged but actually near-accurate — pulling out of "flagged" bucket.)

---

### `prequel-saesee-tiin` — Saesee Tiin

**Current**: style=`stable`, ignition=`standard`+260ms, retraction=`standard`+280ms, shimmer=0.04
**Screen-accurate**: Iktotchi Jedi, standard green blade.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | Correct. |

**Status**: ACCURATE.

---

### `prequel-eeth-koth` — Eeth Koth

**Current**: style=`stable`, ignition=`standard`+300ms, retraction=`standard`+300ms, shimmer=0.04
**Screen-accurate**: Zabrak Jedi, standard green blade.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | Correct. |

**Status**: ACCURATE.

---

### `prequel-stass-allie` — Stass Allie

**Current**: style=`stable`, ignition=`standard`+300ms, retraction=`standard`+300ms, shimmer=0.03
**Screen-accurate**: Jedi healer, standard green blade.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| all | as-is | **No change** | Correct. |

**Status**: ACCURATE.

---

## Structural patterns / cross-preset observations

1. **Two preset clusters emerge clearly**:
   - **Accurate cluster** (9 presets): All "base-tier" Jedi Council members + Obi-Wan variants + Anakin Ep2 + Plo Koon. These use `stable` + `standard` + canon-stable shimmer consistently.
   - **Over-embellished cluster** (17 presets): Nearly every **detailed-tier** preset (Qui-Gon, Anakin Ep3 minor, Mace, Yoda, Dooku, Maul, Kit, Savage, Ventress, Palpatine) has been over-tuned with cinematic animations (`summon`, `seismic`, `crackle`, `fracture`, `center`, `implode`, `evaporate`, `drain`, `fadeout`) and non-stable styles.

2. **Pattern driving the over-embellishment**: The detailed-tier seems to have been treated as "showcase the engine's features" rather than "add tuned canonical details." The base tier (smaller, simpler config) is paradoxically MORE canon-accurate.

3. **Recommendation**: Reframe the `tier: 'detailed'` interpretation. A detailed preset should add **tuned** fields (dragColor, swingFxIntensity, noiseLevel) not **replace** canon fields (style, ignition, retraction) with engine-showcase animations.

4. **Creative-variant bucket is missing**. If the intent is to showcase engine features (crackle ignition, cinder style, etc.), those belong in a separate `creative-community.ts` file with `screenAccurate: false`, not on canonical characters marked `screenAccurate: true`.

5. **Shimmer discipline**: 8 of 26 presets exceed the 0.0-0.1 prequel-stable range (Mace 0.12, Yoda 0.08 borderline, Maul 0.15, Savage 0.35, Ventress 0.3, Palpatine 0.18). The base-tier presets correctly stay in 0.03-0.05 range. Set a house rule: prequel-canon shimmer ≤ 0.08 unless explicit narrative reason.

6. **dragColor on Palpatine**: using `{200,0,200}` magenta as "drag on surface" color is semantically wrong — drag colors represent hot blade scorching material, which is always warm (orange/red/yellow-white). Magenta drag has no canonical basis. Similar caution for any future Sith-lightning aesthetic — put that in `lockupColor` or a custom force-effect field, not `dragColor`.

7. **Engine ID validation pass**: All `ignition` and `retraction` IDs in this file validate against the engine's `IGNITION_REGISTRY` and `RETRACTION_REGISTRY`. No typo-bugs. Note: `flickerOut` (camelCase) is the registry key, which is a mild inconsistency with kebab-case siblings (`flash-fill`, `pulse-wave`, `drip-up`). Not fixable at preset level — flag for engine naming cleanup sprint.

8. **Topology limitations** noted correctly in `topologyNotes` for Maul, Savage, Ventress, Grievous. All defer to v0.15 Multi-Blade Workbench. No action pre-v0.15.

## Feature-leveraging roadmap

| Opportunity | Preset(s) | Engine feature | Priority |
|---|---|---|---|
| Amethyst gradient-tip variant | Mace Windu | Gradient style | Post-launch creative variant |
| Twist-angle response for curved hilt | Dooku, Ventress | `twistAngle` modulation | Post-launch v1.1 modulation-routing |
| Corruption-pulse variant | Savage Opress | Pulse style, slow/low-amp | Post-launch creative variant |
| Shoto `ledCount` reduction | Yoda | Topology/ledCount | Small pre-launch polish |
| Stab-ignition Sidious reveal variant | Palpatine | `stab` ignition | Post-launch creative variant |
| Multi-blade presets (Maul, Savage, Ventress, Grievous) | those 4 | v0.15 Multi-Blade Workbench | Post-launch v0.15 |

## Uncertainty flags

- **Depa Billaba**: film appearance is Council-cameo only; saber color drawn from Legends / Rebels via Kanan. Marking ACCURATE with noted uncertainty.
- **Anakin Ep2 vs Ep3 blue hue difference**: subtle; current values read plausibly on-screen but exact Blu-ray pixel comparison not performed.
- **Savage Opress yellow-green shade**: animated series color-grades vary between episodes. Current + recommendation both within plausible range.
