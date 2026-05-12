# Extended Universe Preset Audit — 2026-04-22

## Scope

File: `packages/presets/src/characters/extended-universe.ts`
Preset count: **24**
Header comment: none — the file opens directly with `EXTENDED_UNIVERSE_PRESETS`. Era value `'expanded-universe'` is the declared scope.

Based on content inspection, this file hosts characters from:
- **Jedi: Fallen Order / Jedi: Survivor** (video games): Cal Kestis variants (4), Merrin, Trilla Suduri (Second Sister), Dagan Gera, Bode Akuna, Taron Malicos
- **Ahsoka Disney+ series**: Shin Hati, Marrok
- **The High Republic** (novels/comics): Stellan Gios, Vernestra Rwoh, Avar Kriss, Keeve Trennis, Loden Greatstorm, Marchion Ro, Elzar Mann, Orla Jareni, Burryaga
- **The Mandalorian** (Disney+): Kelleran Beq

All entries have `era: 'expanded-universe'`. Confusingly this is really a "cross-media / non-OT-PT-ST canon" bucket rather than pre-Disney "Legends" EU. This is a meta-level content-organization concern but not actionable at the preset level.

## Summary

- **24 presets**, spanning 19 unique characters (Cal Kestis has 5 variants; others have 1 each).
- **14 presets need attention** — 3 canon-breaking issues, 7 moderate (stylistic license), and 4 minor polish notes.
- Canon accuracy is strong for main characters; less so for deep-cut High Republic (Marchion Ro), Inquisitor (Trilla), and stylized ones (Merrin).

## Top 3 Issues

1. **Loden Greatstorm is miscolored blue** — his canonical saber is **yellow-bladed** (Wookieepedia: `starwars.fandom.com/wiki/Loden_Greatstorm's_lightsaber`). The preset has him as `(40, 120, 255)` blue. Likely the most jarring canon error in the file.
2. **Marchion Ro's "saber" identity is confused** — he has no personal lightsaber; in canon he carries Loden Greatstorm's looted **yellow** saber as a trophy. The preset gives him a red `crystalShatter` blade as "the Eye of the Nihil." Either drop the preset, recolor to yellow (with ominous stylization), or re-label it "Marchion Ro's Trophy Blade" and note the origin.
3. **`glitch` / `shatter` / `unstable` overuse on non-cracked-kyber Inquisitor-adjacent characters** — per audit instructions, these are strictly for canonically cracked-kyber characters. Affected:
   - **Dagan Gera** — `ignition: 'glitch'` + `retraction: 'shatter'` + `style: 'unstable'`. Dagan's blade is **bled** (yellow → red), not cracked; by canon it should be stable red. The Inquisitor-style instability is not supported.
   - **Trilla Suduri** — currently `style: 'stable'` (correct!) but **double-bladed spinning Inquisitor saber is undeniably her signature**; topology / rotation not represented. Her crystal is bled, not confirmed cracked in canon.
   - **Cal Kestis (Red — Dark Side)** — speculative what-if preset; `unstable`+`glitch`+`shatter` is stylistically justified since it's non-canonical by definition.

## Structural Patterns

- **Affiliation inconsistency**: Merrin is `neutral` but Shin Hati is also `neutral` — Shin is explicitly dark-side-leaning (served as Baylan's apprentice, killed at the end of Ahsoka by Ahsoka herself); `sith` or at least darker-aligned metadata would reflect canon better. Merrin as `neutral` is correct.
- **Stable style monotony**: Many High Republic Jedi use `style: 'stable'` which is canon-appropriate (non-cracked crystals), but the file often pairs them with `ignition: 'standard'` + `retraction: 'standard'`, leaving the preset library flat. Opportunities for feature-leveraging (scroll ignition for contemplative characters, aurora for HR ceremonials) are underused.
- **Uniform 144 `ledCount`** — good default, no issues.
- **`dragColor` is frequently set on dark-side presets** but missing on `(255, 200, 0)` yellow-orange for some Jedi who should also have it (sparks against walls are universal). Opportunity but not a bug.
- **Topology fields** (`crossguard`, `lightwhipMode`, `magickGlow`) are nicely used where canonically appropriate; good pattern.
- **`screenAccurate: true` flag is inconsistent** — applied to `cal-kestis-crossguard`, `cal-kestis-double`, `merrin-green`, `kelleran-beq-blue`, `shin-hati-orange`, `marrok-red`, `trilla-suduri-red`, `dagan-gera-red`, `bode-akuna-red`, `taron-malicos-red`. NOT set on Stellan Gios, Vernestra, Avar Kriss, Keeve Trennis, Loden Greatstorm, Marchion Ro, Elzar Mann, Orla Jareni, Burryaga — but these come from published novels/comics with art, so "screen" is a misnomer for the whole file; consider renaming the property semantics or being consistent that published canon art counts.

## Per-Preset Audit

### Cal Kestis Variants (5)

#### `eu-cal-kestis-green` — Cal Kestis (Green)
- **Canon**: Blue is canon default for both Fallen Order and Survivor; green is a player-selectable customization via kyber swap. Flag `screenAccurate: false` or unset (currently unset — correct).
- **Colors**: Reasonable green tuning.
- **Feature notes**: `ignition: 'spark'` + `shimmer: 0.1` are generic-Jedi; fine. Could use `twist` or `swing` ignition as feature hook since Cal's in-game ignition animation is signature.

#### `eu-cal-kestis-orange` — Cal Kestis (Orange)
- **Canon**: Rare player-selectable color. Correctly unset on `screenAccurate`.
- **Colors**: Orange tuning is clean.
- **Feature notes**: Same as above; fine as a base tier.

#### `eu-cal-kestis-purple` — Cal Kestis (Purple)
- **Canon**: Another player-selectable color. Correctly unset on `screenAccurate`.
- **Note**: Description says "straddling the line between light and dark" — no canon support for this framing since in Fallen Order/Survivor purple carries no such lore weight; it's just a selectable crystal.
- **Severity**: Minor — rewrite description.

#### `eu-cal-kestis-red` — Cal Kestis (Red — Dark Side)
- **Canon**: Non-canonical what-if.
- **Affiliation**: `sith` — fits the what-if framing.
- **Style+ignition**: `unstable`+`glitch`+`shatter`+`flicker: 0.6`+`noiseLevel: 0.15` — acceptable for a speculative corrupted-Cal preset.
- **Note**: Keep but maybe label as "what-if" or "alternate path" more explicitly in name so users don't misread as canon.

#### `eu-cal-kestis-crossguard` — Cal Kestis (Crossguard)
- **Canon**: From Jedi: Survivor, unlocked via a tomb on Jedha (high-republic origin is canon). Blue is correct default. Citation: `starwars.fandom.com/wiki/Cal_Kestis'_second_lightsaber`.
- **Topology**: `crossguard: true` + `quillonLength: 44` — great, correctly modeled.
- **Style**: `photon` is an interesting choice (vs. `stable`); probably fine since crossguard vent-bloom gives the saber a shimmering quality.
- **Feature notes**: `sparkSize: 0.6` helps sell the vent-discharge aesthetic. Nice use of the feature set.

#### `eu-cal-kestis-double` — Cal Kestis (Double-Bladed)
- **Canon**: Double-bladed "Dual Stance" from Survivor, blue default is canon. Citation: `dualsabers.com/blogs/news/does-cal-kestis-have-a-double-bladed-lightsaber`.
- **Topology**: `topologyNotes` says "Double-bladed staff saber" but no config field represents this (since doubles are a v0.15 multi-blade feature per CLAUDE.md).
- **Ignition/retraction**: `center` for both is appropriate for a staff.
- **Severity**: Acceptable — v0.15 multi-blade will properly handle this.

### Jedi: Fallen Order / Survivor — Other Characters

#### `eu-merrin-green` — Merrin (Green — Nightsister)
- **Canon issue**: Merrin does **not** wield a lightsaber in canon; she uses Nightsister magick. Green represents her magick aura, not a saber blade. `screenAccurate: true` is **incorrect**.
- **Creative license**: As a "what-if Merrin got a saber" interpretation the preset is fine, but the `screenAccurate: true` flag is wrong.
- **Severity**: Moderate — flip `screenAccurate` to `false`, adjust description.
- **Style**: `plasma` with `drip-up`+`unravel`+`magickGlow: true` is a nice feature-leveraging choice.

#### `eu-trilla-suduri-red` — Trilla Suduri (Red)
- **Canon**: Inquisitor spinning double-bladed saber in Fallen Order.
- **Topology missing**: Critical — no `doubleBlade: true` or spinning-disc representation, even though the description calls this out. `ignition: 'center'`/`retraction: 'center'` partly compensates but doesn't represent the signature rotating-disc mechanic.
- **Style**: Currently `stable`; per audit instructions Inquisitor cracked-crystal justification could support `unstable` but it's a judgment call since Trilla's crystal bleeding is canon, cracking is more ambiguous.
- **Severity**: Moderate — note as a v0.15 multi-blade deferral and consider raising shimmer slightly or using `crystalShatter` with reduced intensity.

#### `eu-dagan-gera-red` — Dagan Gera (Red)
- **Canon**: His saber was originally **yellow** (High Republic Jedi Knight), then bled red. Hilt design is *split-saber-capable* (single/crossguard modes). Source: `starwars.fandom.com/wiki/Dagan_Gera's_lightsaber`.
- **Style**: `unstable`+`glitch`+`shatter`+`flicker: 0.7` — **too much**. Dagan's crystal is bled, not cracked. No Inquisitor-style instability canon support. The "bleeding" per canon produced a stable red blade, not an unstable one.
- **Severity**: Moderate — reduce to `style: 'fire'` or `stable` with elevated `shimmer` (0.2); drop `glitch`+`shatter`.
- **Topology**: Crossguard mode not represented via `crossguard: true` field — add.

#### `eu-bode-akuna-red` — Bode Akuna (Red)
- **Canon note**: Bode's red saber is actually one half of **Dagan Gera's split saber** retrieved after Dagan's death. Interesting metadata — could `parentId` point to `eu-dagan-gera-red` for a lineage story? (optional.)
- **Style**: `plasma`+`stutter`+`fadeout` is fine.
- **Severity**: Minor — metadata opportunity, no canon error.

#### `eu-taron-malicos-red` — Taron Malicos (Red)
- **Canon**: Dual red lightsabers (Magus-model hilts), Dathomir. Source: `starwars.fandom.com/wiki/Taron_Malicos's_lightsabers`.
- **Style**: `fire`+`stutter` with elevated `shimmer: 0.28` — fits Dathomir's dark aesthetic.
- **Topology missing**: Dual-wielder, no `dualWield: true` or twin-saber flag. Same v0.15 deferral pattern as Asajj Ventress / Cal double.
- **Severity**: Minor — v0.15 note.

### Ahsoka Disney+ Characters

#### `eu-shin-hati-orange` — Shin Hati (Orange)
- **Canon**: Blade described by Dave Filoni as intentionally "orange-red" fluctuating, symbolic of her moral ambiguity. Source: `sabercouncil.com/blogs/saber-lore/why-are-baylan-skoll-and-shin-hati-s-lightsabers-orange`.
- **Colors**: `(255, 120, 0)` is more "true orange" than the red-orange canon. Consider shifting slightly toward red (e.g., `(255, 100, 40)`) with `clashColor` having more red bias.
- **Style**: `fire` — good creative feature-leveraging for the "smoldering ember" Filoni vibe. `fireSize: 0.5`, `sparkRate: 0.6`, `heatSpread: 0.4` nice tuning.
- **Affiliation**: `neutral` — debatable. Shin is dark-side-coded even if not fully Sith. Consider `sith` or `other`.
- **Severity**: Minor polish.

#### `eu-marrok-red` — Marrok (Red)
- **Canon**: Inquisitor-style. Post-death: green Nightsister magick released, implying inquisitor-possessed undead. Source: `starwars.fandom.com/wiki/Marrok`.
- **Topology missing**: Marrok's saber had crescent/single/double-blade modes (from `starwars.fandom.com/wiki/Marrok's_lightsaber`). Not represented.
- **Style**: `fire`+`stutter`+`fadeout` with `shimmer: 0.25` — OK but the Inquisitor double-blade spin is his signature; `doubleBlade` v0.15 deferral.
- **Feature opportunity**: Consider `style: 'unstable'` with low flicker (he's an Inquisitor-styled mysterious undead; cracked kyber canonically fits Inquisitors).
- **Severity**: Minor to moderate.

### The Mandalorian

#### `eu-kelleran-beq-blue` — Kelleran Beq (Blue)
- **Canon**: Dual-wielded blue + green sabers in Mandalorian Ch. 20. Only one is represented. Source: `starwars.fandom.com/wiki/Kelleran_Beq's_lightsaber`.
- **Style**: `rotoscope` — creative choice for "The Sabered Hand" / swift-motion, accepted.
- **Severity**: Minor — could add a second preset for the green one (dual-wield pair).

### The High Republic (Novels/Comics)

#### `eu-stellan-gios-blue` — Stellan Gios (Blue — Crossguard)
- **Canon**: Blue blade, folding crossguard, stable kyber (**explicitly non-crackling, unlike Kylo's** — source: `neosabers.com/blogs/news/stellan-gios-lightsaber-a-symbol-of-leadership-in-the-high-republic`).
- **Colors**: Good tuning.
- **Topology**: `crossguard: true` ✓.
- **Style**: `photon` is a lovely choice for the "elegant refined HR Jedi" aesthetic.
- **Feature notes**: `scroll`/`scroll` ignition fits the HR "ceremonial" era flavor.
- **Severity**: None. Good.

#### `eu-vernestra-rwoh-purple` — Vernestra Rwoh (Purple — Lightwhip)
- **Canon**: Purple-bladed with convertible lightwhip mode (twist ring activates whip). Source: `starwars.fandom.com/wiki/Vernestra_Rwoh's_purple-bladed_lightsaber`.
- **Feature**: `lightwhipMode: true` ✓ — great field usage.
- **Style**: `pulse` with `scroll`/`scroll` ignition — fits.
- **Feature opportunity**: `ignition: 'twist'` would be extra-canonical (engine supports `twist`).
- **Severity**: Polish opportunity.

#### `eu-avar-kriss-green` — Avar Kriss (Green)
- **Canon**: Green single-blade. Hero of Hetzal. Source: `starwars.fandom.com/wiki/Avar_Kriss`.
- **`hiltNotes` says** "convertible to a lightwhip configuration" — **this is wrong**. Avar Kriss doesn't use a lightwhip; that's Vernestra. Likely a stray copy-paste.
- **Severity**: Moderate — fix the hiltNotes string.
- **Style**: Clean `stable`+`standard`, appropriate for the "unifying beacon" character.

#### `eu-keeve-trennis-green` — Keeve Trennis
- **Canon**: Split saber (two green blades that combine). Source: `starwars.fandom.com/wiki/Keeve_Trennis'_lightsaber`. Not represented.
- **Style**: `aurora`+`scroll`/`scroll`+`shimmer: 0.08` is a beautiful match for the described "aurora borealis" shimmer.
- **Feature**: `waveCount: 3`, `driftSpeed: 0.5` — proper `aurora` feature usage.
- **Severity**: Minor — topology note for split-saber (v0.15 deferral).

#### `eu-loden-greatstorm-blue` — Loden Greatstorm
- **MAJOR CANON ISSUE**: Canonically **yellow**-bladed. Source: `starwars.fandom.com/wiki/Loden_Greatstorm's_lightsaber`.
- **Severity**: High — this is the clearest canon error in the file.
- **Fix**: Recolor to yellow (e.g., `(255, 215, 30)` baseColor), update name accordingly.
- Also relevant: `eu-marchion-ro-nihil` should then reference this saber since Marchion canonically wields Loden's yellow saber as trophy.

#### `eu-marchion-ro-nihil` — Marchion Ro (Nihil)
- **Canon issue**: Marchion Ro has no personal lightsaber. He wields Loden Greatstorm's looted **yellow** saber.
- **Style**: `crystalShatter`+`glitch`+`shatter` — the shattered/corrupted framing is thematic for the Nihil leader but the weapon canon doesn't support a red blade.
- **Affiliation**: `sith` is misleading — the Nihil aren't Sith; the Evereni are a separate dark-side lineage. Consider `other` or a new affiliation.
- **Severity**: High — consider: rename to "Marchion Ro's Trophy Blade," recolor yellow, keep the crackle/shatter styling as "the corrupted aura of his Evereni touch on Loden's blade."

#### `eu-elzar-mann-purple` — Elzar Mann
- **Canon issue**: Elzar Mann canonically uses a **blue** blade (Guardian-aligned Form V, source: `theorysabers.com/blogs/article/elzar-mann-lightsaber-explored`). The preset gives him a blue-purple `(80, 60, 220)`. Not straight-up wrong but leaning more purple than canon; not a major issue since it's close to blue.
- **Severity**: Minor — shift closer to true blue (e.g., `(60, 80, 255)`).
- **Style**: `plasma` with "plasma arcs" is great feature-leveraging for "unorthodox emotional intensity" canon framing.

#### `eu-orla-jareni-white` — Orla Jareni (Wayseeker)
- **Canon**: White-bladed hinged double-bladed saber. Source: `starwars.fandom.com/wiki/Orla_Jareni`.
- **Topology missing**: Hinged-fold double-bladed is her signature, not represented (v0.15 deferral).
- **Style**: `prism` with `facets: 5`+`rotationSpeed: 1.0` — beautiful feature-leveraging of prismatic white. Excellent choice.
- **Severity**: Minor — topology deferral only.

#### `eu-burryaga-green` — Burryaga (Wookiee Jedi)
- **Canon issue**: Burryaga's saber is canonically **blue**-bladed (crossguard design), not green. Source: `starwars.fandom.com/wiki/Burryaga's_lightsaber`.
- **Severity**: High — recolor blue.
- **Topology missing**: Crossguard design not represented (`crossguard: true` needed).
- **Slow ignition**: `ignitionMs: 600` tuning for "oversized blade" is a nice touch.

## Summary by Issue Severity

### High-severity canon errors (3)
1. `eu-loden-greatstorm-blue` — should be yellow.
2. `eu-marchion-ro-nihil` — should be yellow (Loden's looted saber) or recontextualized.
3. `eu-burryaga-green` — should be blue.

### Moderate-severity issues (7)
- `eu-dagan-gera-red` — drop `unstable`+`glitch`+`shatter`, add crossguard topology.
- `eu-merrin-green` — flip `screenAccurate` to false (Merrin doesn't canonically wield a saber).
- `eu-avar-kriss-green` — fix copy-paste `hiltNotes` about lightwhip (that's Vernestra).
- `eu-trilla-suduri-red` — note double-bladed spinning-disc deferral.
- `eu-marrok-red` — note multi-mode saber deferral, consider `unstable` style given Inquisitor-style cracked-crystal canon.
- `eu-shin-hati-orange` — color shift toward red-orange, affiliation reconsider.
- `eu-cal-kestis-purple` — description copy about "line between light and dark" not canon-supported.

### Minor polish (4)
- `eu-kelleran-beq-blue` — consider adding a companion green preset (dual-wield).
- `eu-vernestra-rwoh-purple` — consider `twist` ignition for canon accuracy.
- `eu-elzar-mann-purple` — color shift closer to true blue.
- `eu-taron-malicos-red` — dual-wield topology note (v0.15 deferral).

### Clean presets (10)
- `eu-cal-kestis-green`, `eu-cal-kestis-orange`, `eu-cal-kestis-red`, `eu-cal-kestis-crossguard`, `eu-cal-kestis-double`, `eu-bode-akuna-red`, `eu-stellan-gios-blue`, `eu-keeve-trennis-green`, `eu-orla-jareni-white` all pass canon + reasonable feature-leveraging.

## Feature-Leveraging Opportunities

- **Inquisitor spinning double-bladed sabers** (`trilla`, `marrok`) — v0.15 multi-blade deferral, plus consider `FractureIgnition` (fits Inquisitor cracked-kyber fracture animation).
- **Cal Kestis split/double** — v0.15 multi-blade deferral.
- **Asajj Ventress twin-saberstaff join mechanic** — NOT currently in this file, but if added it's a v0.15 note.
- **Qimir (The Acolyte) crystal-sheath saber** — NOT currently in this file; could be added since The Acolyte characters belong to this "expanded-universe" bucket per convention of the file. Unique visual: only ignites when drawn from crystal slot.
- **Lightwhip mode** (`lightwhipMode: true`) is already used for Vernestra — good.
- **`magickGlow`** (Merrin) — good speculative feature.

## Recommended Next Steps

1. Apply the 3 high-severity color fixes (Loden, Marchion, Burryaga).
2. Re-write 3 stylistic moderate items (Dagan's instability removal; Avar hiltNotes; Cal Purple description).
3. Flip `screenAccurate` on Merrin to false.
4. Consider a pass that marks v0.15 multi-blade deferrals via `topologyNotes` so they're audit-trail-visible.
5. Decide affiliation taxonomy for `Shin Hati` / `Marrok` / Nihil (consider adding `nihil` affiliation or keep `sith` as umbrella).

## Sources (selected)

- [Cal Kestis' second lightsaber (Wookieepedia)](https://starwars.fandom.com/wiki/Cal_Kestis'_second_lightsaber)
- [Loden Greatstorm's lightsaber (Wookieepedia)](https://starwars.fandom.com/wiki/Loden_Greatstorm's_lightsaber)
- [Burryaga's lightsaber (Wookieepedia)](https://starwars.fandom.com/wiki/Burryaga's_lightsaber)
- [Marchion Ro (Wookieepedia)](https://starwars.fandom.com/wiki/Marchion_Ro)
- [Dagan Gera's lightsaber (Wookieepedia)](https://starwars.fandom.com/wiki/Dagan_Gera's_lightsaber)
- [Orla Jareni's lightsaber (Wookieepedia)](https://starwars.fandom.com/wiki/Orla_Jareni)
- [Vernestra Rwoh's purple-bladed lightsaber (Wookieepedia)](https://starwars.fandom.com/wiki/Vernestra_Rwoh%27s_purple-bladed_lightsaber)
- [Stellan Gios's lightsaber (Wookieepedia)](https://starwars.fandom.com/wiki/Stellan_Gios's_lightsaber)
- [Keeve Trennis' lightsaber (Wookieepedia)](https://starwars.fandom.com/wiki/Keeve_Trennis'_lightsaber)
- [Avar Kriss (Wookieepedia)](https://starwars.fandom.com/wiki/Avar_Kriss)
- [Why are Baylan Skoll and Shin Hati's lightsabers orange? (Saber Council)](https://sabercouncil.com/blogs/saber-lore/why-are-baylan-skoll-and-shin-hati-s-lightsabers-orange)
- [Marrok's lightsaber (Wookieepedia)](https://starwars.fandom.com/wiki/Marrok's_lightsaber)
- [Taron Malicos's lightsabers (Wookieepedia)](https://starwars.fandom.com/wiki/Taron_Malicos's_lightsabers)
- [Kelleran Beq's lightsaber (Wookieepedia)](https://starwars.fandom.com/wiki/Kelleran_Beq's_lightsaber)
- [Elzar Mann's Lightsaber (Theory Sabers)](https://www.theorysabers.com/blogs/article/elzar-mann-lightsaber-explored)
- [Merrin (Wookieepedia)](https://starwars.fandom.com/wiki/Merrin)
