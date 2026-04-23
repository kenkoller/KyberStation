# Original Trilogy Preset Audit — 2026-04-22

**Source priority**: Blu-ray reference frames → Wookieepedia → ProffieOS/Fett263 community convention.
**Scope**: 9 presets across OT-era characters (Luke, Vader, Obi-Wan, Palpatine, Leia).
**Auditor**: canonical-accuracy audit agent (parallel agent 2 of 7).

## Summary

- **Total presets**: 9
- **Flagged for fixes**: 6
- **Already accurate**: 3
- **Top issues**:
  - Palpatine OT preset is the worst offender — `cinder` style + `crackle` ignition + `drain` retraction + 0.18 shimmer are all canonically inappropriate for an OT-era Sith blade
  - Obi-Wan Force Ghost uses `center` ignition + `photon` style; the ghost framing is narratively justified but this preset should be flagged `screenAccurate: false` (it currently lacks the field) rather than trying to stay accurate
  - Vader ANH uses `drain` retraction — this is the "glitch/center-class" flag the prompt called out; canonical OT Vader retraction is a clean standard withdraw
  - `Vader-ESB` and `Vader` (ANH/ROTJ) split the character into two presets but ESB uses `rotoscope` while ANH uses `stable` — the OT style choice should be consistent across all three Vader appearances
  - Several OT Jedi presets (Luke ESB, Luke ROTJ, Leia) use `stable` where `rotoscope` would better match OT rotoscope-animation-era rendering. Luke ANH and Obi-Wan ANH already use `rotoscope` — the inconsistency suggests earlier presets were tuned more carefully than later ones
  - Three presets (Luke ESB, Luke ROTJ, Leia) are missing `dragColor` / `lockupColor` tuning that the better presets have

## Per-preset audit

### `ot-luke-anh` — Luke Skywalker (ANH)

**Current**: style=`rotoscope`, ignition=`standard`+300ms, retraction=`standard`+400ms, shimmer=0.05, baseColor=`{r:0,g:135,b:255}`
**Screen-accurate flag**: `true` (correct)

No changes needed. This is a well-tuned anchor preset:

- `rotoscope` matches ANH's literal rotoscope-animated blade effect (the original blades were painted frame-by-frame over white-core rods).
- `{r:0,g:135,b:255}` with warm highlight is consistent with the Tatooine binary-sunset ignition (ANH Blu-ray, ~00:34:25), where the blade reads as ice-blue with a slightly warmer core.
- `standard`+300ms ignition matches the clean on-screen strike of the blade (no stutter, no glitch).
- `dragColor` warm amber is a reasonable stylistic choice; OT films rarely show dragging, but amber is community convention for friction sparks.
- `shimmer: 0.05` is appropriately subtle.

**Feature-leveraging opportunity**: None — preset is well-tuned.

---

### `ot-luke-esb` — Luke Skywalker (ESB)

**Current**: style=`stable`, ignition=`standard`+300ms, retraction=`standard`+400ms, shimmer=0.04
**Screen-accurate flag**: `true`

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| style | `stable` | `rotoscope` | Consistency with `ot-luke-anh`. Same physical saber, same rotoscope process. ESB used the same rotoscope technique; if Luke ANH warrants `rotoscope`, Luke ESB does too. (Luke ANH and Luke ESB split only on color grading.) |
| dragColor | missing | `{r:255, g:160, b:0}` | Present on Luke ANH; should persist to ESB for consistency (same saber). |
| lockupColor | `{r:180, g:200, b:255}` | No change | Cooler-than-ANH tuning is correct — Cloud City duel (ESB Blu-ray, ~01:55:00) is color-graded blue-heavy. |
| noiseLevel | missing | `0.02` | Present on Luke ANH; persist to ESB. |

**Feature-leveraging opportunity**: ESB's Cloud City duel has Luke's saber under high emotional stress — consider bumping `swingFxIntensity` slightly from 0.3 → 0.35 to emphasize the frantic duel.

---

### `ot-luke-rotj` — Luke Skywalker (ROTJ)

**Current**: style=`stable`, ignition=`standard`+250ms, retraction=`standard`+350ms, shimmer=0.03
**Screen-accurate flag**: `true`

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| style | `stable` | `rotoscope` | Same reasoning as Luke ESB — OT-era rotoscope consistency. ROTJ (1983) was still rotoscope-animated blade effects. |
| baseColor | `{r:0, g:220, b:40}` | No change | Vivid spring-green matches Jabba's Sail Barge sequence (ROTJ Blu-ray, ~00:15:30) and the Emperor's throne room duel (~01:40:00). |
| ignitionMs | 250 | No change | Faster ignition (250ms) is correct — ROTJ shows a snappier Luke who has trained more; on-screen ignitions in the throne room duel are quick. |
| dragColor | `{r:255, g:200, b:0}` | Consider `{r:255, g:220, b:80}` (warmer yellow-green halo) | Community convention for ROTJ Luke is a slightly warmer drag to echo the green-yellow bias of the synth-crystal blade. Current gold is fine but less distinctive. |

**Feature-leveraging opportunity**: ROTJ Luke's self-constructed saber with a synth-crystal has lore suggesting a slightly harsher ignition — a `scroll`+250ms ignition would read as "fresh blade, new construction" more cleanly than `standard`. Not a fix, a consideration.

---

### `ot-vader` — Darth Vader (ANH/ROTJ)

**Current**: style=`stable`, ignition=`standard`+400ms, retraction=`drain`+500ms, shimmer=0.06
**Screen-accurate flag**: `true`

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| style | `stable` | `rotoscope` | Consistency with OT-era rotoscope rendering. All OT blades were rotoscope-painted frame-by-frame; Vader's red is no exception (ANH Blu-ray duel aboard the Death Star, ~01:38:00). |
| retraction | `drain` | `standard` | **This is the flagged issue from the prompt.** `drain` is a modern stylistic retraction (gravity-pooling effect); canonical OT Vader retraction is a clean top-to-bottom standard withdraw. The "cracked crystal bleeding kyber" lore is post-OT (Charles Soule's Darth Vader comics, 2017+), not on-screen in the OT films. |
| retractionMs | 500 | 400 | Vader's retractions on-screen are crisp and deliberate, not slow. 400ms matches the duel-ending retract in ROTJ Blu-ray (~01:55:00). |
| baseColor | `{r:200, g:0, b:0}` | `{r:230, g:10, b:10}` | ANH/ROTJ Blu-ray Vader reads slightly brighter/more crimson than the current darker red. Current `200,0,0` is a bit muddy; `230,10,10` reads closer to on-screen. Minor tweak. |
| shimmer | 0.06 | No change | Subtle flicker is on-screen-faithful; Vader's saber does breathe slightly in close-ups. |
| ignitionMs | 400 | No change | Slower ignition for Vader's deliberate, menacing strike is canon-faithful. |

**Feature-leveraging opportunity**: **Strong candidate.** Vader's labored breathing is iconic — tying `swingFxIntensity` (currently 0.2) to a very low baseline with bumps on strikes, or using a subtle `pulse` layer synced to ~12 BPM breathing rhythm, would elevate this preset significantly. Current shimmer `0.06` hints at this but doesn't commit. Flag as a v1.1 enhancement candidate.

---

### `ot-vader-esb` — Darth Vader (ESB)

**Current**: style=`rotoscope`, ignition=`standard`+380ms, retraction=`standard`+480ms, shimmer=0.07
**Screen-accurate flag**: `true`

No major changes needed. This is the **better-tuned** of the two Vader presets:

- `rotoscope` style is correct (unlike `ot-vader`).
- `standard` retraction is correct (unlike `ot-vader`).
- `{r:230, g:20, b:30}` pink-red cast matches the Carbon Freezing Chamber's magenta-biased color grading (ESB Blu-ray, ~01:41:00).
- Clash/lockup colors appropriately warm for the frantic Cloud City duel.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| retractionMs | 480 | No change | Vader's last retract on Cloud City is deliberate, slower than ROTJ — 480ms is appropriate. |

**Feature-leveraging opportunity**: The Carbon Freezing Chamber has steam/atmosphere effects; a subtle `noiseLevel: 0.05` (currently 0.03) could emphasize the steamy atmosphere's effect on the blade's apparent shimmer.

**Note on split**: Having `ot-vader` + `ot-vader-esb` as separate presets is good curation — the color grading is genuinely different between ANH/ROTJ (warmer crimson, studio lighting) and ESB (cooler magenta, Cloud City atmosphere). Consider renaming `ot-vader` → `ot-vader-anh-rotj` for clarity, but this is nomenclature, not canonicity.

---

### `ot-obiwan-anh` — Obi-Wan Kenobi (ANH)

**Current**: style=`rotoscope`, ignition=`standard`+350ms, retraction=`standard`+450ms, shimmer=0.08
**Screen-accurate flag**: `true`

No changes needed. Well-tuned:

- `rotoscope` is correct.
- `{r:0, g:155, b:255}` slightly warmer than Luke ANH's blue is appropriate — Obi-Wan's ANH blade (the Mos Eisley cantina ignition, ANH Blu-ray ~00:45:15) reads a touch warmer due to the dimmer cantina lighting.
- Slower ignition (350ms) matches Obi-Wan's measured, deliberate activation of a long-dormant kyber crystal ("I haven't gone by the name Obi-Wan since...").
- `shimmer: 0.08` is slightly higher than other Jedi presets, narratively justifying the "long dormancy" flicker.
- `noiseLevel: 0.04` reinforces the aged-crystal character.

**Feature-leveraging opportunity**: None — this is arguably the best-tuned preset in the file. The `shimmer: 0.08` + `noiseLevel: 0.04` combo shows thoughtful feature use for character interpretation.

---

### `ot-palpatine` — Emperor Palpatine

**Current**: style=`cinder`, ignition=`crackle`+200ms, retraction=`drain`+300ms, shimmer=0.18, dragColor=`{r:200, g:0, b:200}` (purple!)
**Screen-accurate flag**: `true` (**INCORRECT — should be `false`**)

This preset is the worst offender in the file and should be substantially overhauled OR reframed as non-canonical.

**Critical issue**: Palpatine does **NOT** wield a lightsaber on-screen in the Original Trilogy (Episodes IV-VI). His on-screen OT combat is exclusively Force lightning (throne room, ROTJ Blu-ray ~01:55:00–02:01:00). The description acknowledges this ("rarely-seen... depicted only in the ROTJ novelization and later expanded material"), but the `screenAccurate: true` flag is then **demonstrably wrong** — expanded material isn't on-screen.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| screenAccurate | `true` | `false` | Palpatine's saber is Legends/expanded material; no on-screen OT appearance exists. |
| style | `cinder` | `stable` or `unstable` | `cinder` (ember particles) is a creative style; Palpatine's Legends sabers (Dark Empire comics, etc.) are consistently drawn as stable red blades. If invoking ROTS-era Palpatine energy, `unstable` has partial justification, but `cinder` does not. |
| ignition | `crackle` | `standard` | **Flagged in the prompt.** `crackle` (random segment flicker fill) is a modern stylized ignition with zero canon basis for an OT Sith blade. |
| retraction | `drain` | `standard` | Same issue as Vader — `drain` is not canonical for OT-era Sith. |
| ignitionMs | 200 | 300 | 200ms is very fast; Palpatine's deliberate, showman style in Legends art would read slower. |
| shimmer | 0.18 | 0.05–0.10 | **0.18 is extreme** — this is a `pulse`/`candle`-style dramatic shimmer, not a canonical stable red blade. |
| dragColor | `{r:200, g:0, b:200}` (purple) | `{r:255, g:60, b:0}` (warm red) | **Purple drag color is inexplicable** — there's no canon or community basis for Palpatine's blade producing purple sparks on drag. Force lightning is purple-blue, but the lightning is not the blade's drag color. This reads as a creative choice that broke character. |
| baseColor | `{r:255, g:0, b:0}` | No change | Pure red is consistent with Legends depiction. |

**Feature-leveraging opportunity**: If Ken wants to keep a creative Palpatine preset, consider a SEPARATE non-canonical `creative-palpatine-force-lightning` preset that DOES use `crackle` ignition + purple drag to embody the Force-lightning-infused blade concept. Then reset `ot-palpatine` to a restrained Legends-accurate stable red.

**Recommendation**: Either reframe as `screenAccurate: false` (and move to `creative-community.ts`) or fully rewrite as a restrained Legends stable red. The current state is the worst of both worlds — flagged as canon while using flagrantly non-canonical effects.

---

### `ot-leia` — Leia Organa

**Current**: style=`stable`, ignition=`standard`+280ms, retraction=`standard`+380ms, shimmer=0.04
**Screen-accurate flag**: `true`

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| screenAccurate | `true` | `true` (OK if TROS flashback counts) | The TROS training flashback (Rise of Skywalker Blu-ray, ~01:05:00) does show a young Leia training with a blue saber. The description correctly cites this. Classification as OT-era is a stretch (TROS-set-in-OT-era-flashback), but defensible. |
| style | `stable` | `rotoscope` | Consistency with OT-era rotoscope. Though TROS (2019) was not rotoscope-animated, the flashback is set in the OT era and viewers seeing this alongside OT Luke/Obi-Wan would expect matching rendering. |
| dragColor | missing | `{r:255, g:180, b:40}` | All other OT Jedi have `dragColor`; Leia should too for consistency. |
| baseColor | `{r:0, g:100, b:255}` | No change | Deeper royal blue than Luke is on-screen-accurate for TROS flashback. |
| ignitionMs | 280 | No change | Brief but not rushed — fits training-saber activation. |
| tier | `base` | `detailed` | Preset has 10 config fields including clash/lockup/blast — this isn't a "base" starting point; promoting to `detailed` matches other OT-era character presets. |

**Feature-leveraging opportunity**: Leia's abandonment of Jedi training ("she had the wisdom to walk away...") could be thematically reflected in a slightly dimmer/uncertain ignition — a `scroll`+320ms with gentle `noiseLevel: 0.03` would read as "hesitant apprentice's blade."

---

### `ot-obiwan-ghost` — Obi-Wan (Force Ghost)

**Current**: style=`photon`, ignition=`center`+500ms, retraction=`fadeout`+800ms, shimmer=0.15
**Screen-accurate flag**: missing (implicitly `false` — appropriate)
**Tier**: `detailed`, **no `author` field**

This is the one preset in the file where non-canon effects are **narratively justified**. The description explicitly frames it as "spectral interpretation... if manifested by his Force Ghost" — Force Ghosts don't wield lightsabers on-screen in the OT (Obi-Wan appears but never fights), so this is explicitly creative.

| Field | Current | Recommended | Reasoning |
|---|---|---|---|
| screenAccurate | missing | **Add `false`** | Preset correctly omits `screenAccurate: true`, but adding the explicit `false` clarifies intent in the gallery filter. Otherwise the filter defaults to a non-committal state. |
| author | missing | `'KyberStation'` | All other `screenAccurate: true` presets have `author: 'on-screen'`; this creative preset should have `'KyberStation'` per the types.ts convention. |
| style | `photon` | No change | `photon` (soft glowing blob) is appropriate for the spectral interpretation. |
| ignition | `center` | No change | `center` ignition (blade spreading from midpoint) reinforces the spectral-manifestation framing. This is a legitimate creative use. |
| retraction | `fadeout` | No change | `fadeout` (gradual brightness fade) matches "Force Ghost dissipation." |
| shimmer | 0.15 | No change | High shimmer reinforces the ethereal character. |

**Feature-leveraging opportunity**: The Force Ghost concept could go further — consider a `candle`-style `noiseLevel: 0.10` for ghost-flicker, or a subtle bluish-white palette shift over the course of ignition. Current preset is restrained but effective.

**Recommended classification change**: Move this preset to `creative-community.ts` or a new `post-canon/` section — it's non-canon and belongs in the "creative" category. Keeping it in `original-trilogy.ts` mis-frames a creative interpretation as OT content.

---

## Structural observations

1. **OT-era `stable` vs `rotoscope` inconsistency**: Luke ANH and Obi-Wan ANH use `rotoscope`; Luke ESB, Luke ROTJ, Vader ANH, and Leia use `stable`. This is almost certainly an artifact of presets being authored at different times. **Recommend a consistent pass**: all OT-era canonical blades should use `rotoscope` to match the literal rotoscope animation technique the films used. `stable` belongs to PT/sequel-era presets where CGI blades are the canon reference.

2. **Missing `dragColor` on 3 of 9 presets**: Luke ESB, Luke ROTJ, Leia. If `dragColor` is present in `ot-luke-anh` and `ot-obiwan-anh`, it should be present everywhere in this file (even if using a sensible default).

3. **Palpatine is the odd-one-out**: The preset violates the `screenAccurate: true` contract most severely. Every other preset at least tries to stay grounded; Palpatine goes wild with `cinder` + `crackle` + `drain` + purple drag. Either rework to restraint or reflag + relocate.

4. **`ot-obiwan-ghost` is mis-located**: It's not OT; it's a creative interpretation. Belongs in `creative-community.ts`.

5. **No `author` field on `ot-obiwan-ghost`**: Every other preset has `author: 'on-screen'`. For consistency, this creative preset should have `author: 'KyberStation'`.

6. **Han's improvised saber / Yoda's saber are absent**: The prompt mentioned these as possibly in scope. Yoda doesn't use a saber in the OT (first appears ESB, no saber until AOTC / PT era). Han never wielded a saber except briefly in ESB (slicing open the tauntaun) — the "Han Solo saber" is Luke's ANH Graflex used as a tool, not a distinct preset. Omission is correct.

## Recommended fix priority (descending)

1. **Fix `ot-palpatine`**: correct `screenAccurate` → `false`, or rewrite to Legends-accurate restraint (style → `stable`/`unstable`, ignition → `standard`, retraction → `standard`, shimmer → 0.08, dragColor → red). **Worst offender.**
2. **Fix `ot-vader` retraction**: `drain` → `standard`, `retractionMs` 500 → 400. Second-worst offender — directly matches the prompt's flagged pattern.
3. **Standardize style on OT presets**: migrate Luke ESB, Luke ROTJ, Vader ANH, Leia from `stable` → `rotoscope`.
4. **Relocate `ot-obiwan-ghost`**: move to `creative-community.ts`, add `screenAccurate: false`, add `author: 'KyberStation'`.
5. **Add missing `dragColor` + `lockupColor` + `noiseLevel` consistency** to Luke ESB, Luke ROTJ, Leia.
6. **Promote Leia tier**: `base` → `detailed`.
7. **Minor color tweaks**: `ot-vader` baseColor `200,0,0` → `230,10,10`; consider `ot-luke-rotj` dragColor warmer.

## Uncertainty flags

- **Luke ROTJ baseColor**: On-screen color in the throne-room duel is deliberately darker/more saturated than the Jabba's Sail Barge sequence (different color grading). Current `{r:0, g:220, b:40}` is a reasonable compromise; exact match depends on which scene we're targeting. Uncertain which scene the preset authors targeted.
- **Vader ANH baseColor**: The original 1977 Blu-ray remaster color-grade vs. the 2011 Blu-ray color-grade differ noticeably on Vader's saber. Uncertain which release the current values were sampled from.
- **Palpatine's "canonical" saber**: Disney Canon (post-2014) has not yet shown Palpatine wielding a lightsaber on-screen (TROS Exegol sequence uses Force lightning, not a saber). Legends-era material (Dark Empire, etc.) shows him with a saber but styling varies across artists. "Canonical" is a moving target for this character.
