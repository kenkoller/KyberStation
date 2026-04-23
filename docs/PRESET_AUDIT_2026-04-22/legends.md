# Legends Preset Audit — 2026-04-22

**Scope**: `packages/presets/src/characters/legends.ts` (29 presets from pre-2014 Expanded Universe / Legends continuity)
**Auditor**: automated preset review pass
**Source priority**: game source material (KOTOR / KOTOR II / SWTOR / Force Unleashed / Jedi Knight / Legacy) → Wookieepedia Legends → novels/comics → ProffieOS convention

---

## Summary

- **Total presets**: 29
- **Presets needing fixes (any severity)**: ~18
- **Major canon/color fixes needed**: 2 (Bastila Shan yellow → primary is double-bladed YELLOW as KOTOR default; Exar Kun double-bladed color)
- **Feature-leveraging opportunity presets**: ~6 (Starkiller Red, Sion, Nihilus, Traya, Vitiate, Bane)
- **Correctly authored**: ~11 (Meetra Surik, Nomi Sunrider, Ulic Qel-Droma, Jaina Solo, Kyle Katarn, Rahm Kota, Jacen/Caedus, Cade Skywalker, Visas Marr, Darth Talon, Mara Jade)

### Top 3 Issues

1. **Kyle Katarn is GREEN — but canonically BLUE first, then green.** Preset labels him "green" and uses green. The Jedi Knight / Dark Forces games feature Kyle most recognizably with a BLUE blade (Jedi Outcast / Jedi Academy especially); green is from later Legacy-era appearances. Recommend either **relabel-to-blue** as primary OR **add a blue variant** (`legends-kyle-katarn-blue`) as his canonical default.
2. **Style IDs over-reach for "detailed" tier presets — exotic styles applied where `stable` or `rotoscope` would be more screen-accurate.** Revan Purple uses `unstable`, Malak uses `fire`, Nihilus uses `automata`, Darth Bane uses `ember`, Krayt uses `cinder`, Vitiate uses `cinder`. None of these sabers are depicted as unstable/fire/automata in source material. This is a project-wide stylistic decision question — if the norm is "detailed tier = exotic engine style even if not screen-accurate," that should be documented; if "detailed = tuned config with accurate style," these should all drop to `stable` or `rotoscope`.
3. **Bastila Shan is a Jedi Sentinel with a canonical YELLOW double-bladed lightsaber** — preset correctly encodes yellow, but uses `photon` style with `evaporate` retraction and `center` ignition. Photon may be too "clean" for a worn KOTOR-era Jedi saber; recommend `stable` or `rotoscope` with slightly warmer clash. More importantly, Bastila's only canonical color is yellow — her blade is not switchable.

---

## Structural patterns

1. **Over-use of `dragColor` as a color-temperature compensator.** Many Sith presets encode `dragColor` values that are simply a darker baseColor — this isn't drag-specific tuning, it's redundant. Drag color in ProffieOS convention should represent the *hot spot at contact*, typically orange/white. See Revan-Purple `dragColor: {120, 0, 200}` (just a darker purple) vs. what drag should emit (orange/yellow trail).

2. **`ledCount: 100` on Maris Brood** — legitimate; tonfa hilts are shorter. Good.

3. **`style: 'cinder'` x 2 (Krayt, Vitiate) and `style: 'fire'` x 2 (Revan-Red, Malak)** — cluster of "Sith = fiery" stylistic choice. Fine as a creative direction but none of these characters are depicted with visibly unstable/flaming blades in source material. Revan-Red especially should be `stable` unless a "corrupted crystal" interpretation is explicitly documented.

4. **`noiseLevel` appears on many `stable`/`photon` configs where the style ignores it** — this is harmless but wasteful. `noiseLevel` is meaningful for `unstable`, `fire`, `ember`, `candle`, `shatter`. On `stable` and `photon` it's dead config.

5. **Style-specific extras are sometimes orphaned from their style.** Nihilus has `fireSize`, `sparkRate`, `heatSpread` on a `style: 'automata'` config — these fields belong to `fire`/`ember`/`cinder`. Either the style is wrong or the extras are dead config.

6. **Affiliation `sith` applied to Sith Lords regardless of redemption arc.** Visas Marr redeemed through the Exile; preset still tags her `sith`. Legitimate choice (she wielded red through most of her Sith career) but description should clarify.

7. **Dual wielders have no multi-blade encoding yet.** Starkiller (Red dual), Darth Krayt (dual), Darth Traya/Kreia (three telekinetic sabers) are all represented as single-blade approximations — correct given v0.15's not yet shipped.

---

## Per-Preset Audit

---

### 1. `legends-darth-revan-purple`

- **Name / Character**: correct.
- **Color**: Purple `{140, 0, 240}` — accurate. Revan's KOTOR light-side ending canonically wields purple; the purple variant is widely associated with the "Prodigal Knight" interpretation. ✅
- **Affiliation**: `neutral` — **correct and smart**. Revan straddles light/dark; this is the right call for the purple variant (the red variant is separately tagged `sith`).
- **Style**: `unstable` — **questionable**. Revan's saber is not depicted as unstable in KOTOR, KOTOR II cinematics, or Knights of the Old Republic comics. Recommend `stable` or `rotoscope`. Keep `unstable` only if project convention is "neutral/grey sabers get subtle instability" — but that's not documented.
- **Ignition**: `flash-fill`, 320ms — acceptable; not screen-accurate (KOTOR had standard ignition) but not wrong.
- **Retraction**: `dissolve`, 380ms — exotic, not screen-accurate. `standard` would be more fitting.
- **Shimmer**: 0.3 — too high for a stable saber. Reduce to ~0.08-0.12.
- **flicker: 0.5, noiseLevel: 0.12** — dead config if style drops to stable; leave if keeping unstable.
- **Suggested fix**: `style: stable`, `ignition: standard` or `scroll`, `retraction: standard`, shimmer 0.1.

### 2. `legends-darth-revan-red`

- **Color**: `{200, 0, 10}` deep red — accurate for Darth Revan, Sith Lord era. ✅
- **Style**: `fire` — **wrong**. Darth Revan's saber in the KOTOR cinematic intro and in SWTOR flashbacks is a stable red blade. No fire/unstable depiction in source material. Drop to `stable`.
- **Ignition**: `spark`, 300ms — acceptable.
- **Retraction**: `standard`, 350ms — ✅.
- **fireSize, sparkRate, heatSpread** — dead config once style becomes stable. Remove.
- **Suggested fix**: `style: stable` or `rotoscope`, drop fire-specific extras.

### 3. `legends-bastila-shan-yellow`

- **Color**: Yellow `{255, 220, 0}` — ✅ canonical. Bastila's saber is yellow throughout KOTOR (default, regardless of alignment outcome).
- **Name "(Yellow - Double-Bladed)"** — clear.
- **Hilt notes**: saberstaff — ✅ canonically double-bladed (Jedi Sentinel).
- **Style**: `photon` — slightly too clean/ethereal. Bastila's saber in KOTOR is a workmanlike Jedi blade; `stable` or `rotoscope` more appropriate.
- **Ignition**: `center` 300ms — **excellent choice** for a double-bladed saber (center ignition emerges from the middle emitter, visually matches saberstaff). Keep.
- **Retraction**: `evaporate` 350ms — exotic. `center` retraction (to match ignition) or `standard` more appropriate.
- **Suggested fix**: `style: stable`, `retraction: center`.

### 4. `legends-darth-nihilus-red`

- **Color**: `{180, 0, 0}` — ✅ accurate for Nihilus.
- **Style**: `automata` (cellular automaton) — **very questionable**. Nihilus is not depicted with a visibly cellular/glitchy blade. His saber in KOTOR II is a standard red blade; his *character* is void-like (Force-drain user) but that's not visible on his blade. `automata` is a creative stretch.
- **Ignition**: `pulse-wave` 200ms — exotic but thematically fits ("hunger pulse").
- **Retraction**: `spaghettify` 500ms — exotic; fits the "consuming" theme.
- **voidEffect: true** — non-standard field; not in the type registry. Dead config unless there's a custom handler.
- **fireSize, sparkRate, heatSpread** — dead config for `automata` style.
- **Feature-leveraging note**: Nihilus is a *strong* candidate for custom modulation — slow pulsing opacity to represent "hunger." If kept, tune `pulseMinBright: 0.2, pulseSpeed: 0.4` and use `style: pulse` not `automata`.
- **Suggested fix**: `style: pulse` with slow dark pulsing, retraction `spaghettify` OK for thematic fit.

### 5. `legends-darth-sion-red`

- **Color**: `{200, 10, 0}` harsh red — ✅ accurate.
- **Style**: `shatter` — **thematically brilliant**. Sion is literally held together by rage; his body is shattered. Shatter style on his blade is a justified creative interpretation of the Lord of Pain's fractured existence. Keep.
- **Ignition**: `fracture` 250ms — ✅ perfect thematic match.
- **Retraction**: `dissolve` 300ms — ✅ fits "falls apart" theme.
- **flicker: 0.8, shimmer: 0.32** — high but appropriate for shatter style.
- **No fixes needed.** This is an example of creative interpretation done right — style choice is motivated by character.

### 6. `legends-darth-malak-red`

- **Color**: `{235, 10, 10}` — ✅.
- **Style**: `fire` — **wrong**. Malak's saber in the KOTOR intro and final fight is a standard red blade. No fire depiction.
- **Ignition**: `scroll` 280ms — ✅.
- **Retraction**: `standard` 340ms — ✅.
- **fireSize, sparkRate, heatSpread** — dead once style drops. Remove.
- **Suggested fix**: `style: stable`.

### 7. `legends-meetra-surik-cyan`

- **Color**: Cyan `{0, 200, 240}` — acceptable default. Canonically the Exile's blade color is player-selectable in KOTOR II; cyan is a reasonable choice, though "green" is also canonical per Wookieepedia for the novel continuation. Label correctly notes color is configurable.
- **Style**: `stable` — ✅.
- **Ignition / Retraction**: `scroll` / `scroll`, 340/400ms — ✅ reasonable.
- **Shimmer**: 0.08 — ✅ appropriately low.
- **No fixes needed.** Clean preset.

### 8. `legends-starkiller-blue`

- **Color**: `{20, 70, 255}` cobalt — ✅ accurate (light-side Galen Marek's blade in Force Unleashed ending is blue).
- **Style**: `photon` — acceptable; Starkiller's saber in TFU is stable/bright. `stable` also fine. Keep.
- **Ignition**: `spark` 200ms — thematically fits (Starkiller is explosive/impulsive).
- **Retraction**: `standard` 280ms — ✅.
- **dragColor: {255, 180, 0}** — interesting choice (orange drag sparks on blue blade). Actually **correct drag convention** — drag should be orange/hot, not blade color. Good example for the file.
- **sparkSize: 0.7** — not a standard field. Dead config unless custom.
- **Suggested fix**: Remove `sparkSize` (not registered), otherwise preset is excellent.

### 9. `legends-starkiller-red`

- **Color**: `{255, 5, 5}` — ✅.
- **Style**: `unstable` — **correct and justified**. Per brief: Starkiller is explicitly the Legends exception to "all sabers are stable." Dark-side Starkiller's blade in TFU is visibly unstable (cracked crystal lore, dark-side corruption).
- **Ignition**: `glitch` 150ms — ✅ thematically strong (rapid, unstable).
- **Retraction**: `shatter` 250ms — ✅ matches unstable/cracked theme.
- **shimmer: 0.35, flicker: 0.7, noiseLevel: 0.18, swingFxIntensity: 0.6** — ✅ all tuned up appropriately for unstable.
- **Feature-leveraging opportunity**: Could add `BifurcateEffect` on clash (his dark-side saber throws sparks violently in TFU cutscenes). Also consider `CrackleIgnition` as an alternative — per brief, that's a specifically Starkiller-justified ignition.
- **No structural fixes needed.** This is the flagship example of justified exotic tuning.

### 10. `legends-mara-jade-purple`

- **Color**: `{180, 20, 220}` magenta-violet — ✅ reasonable. Mara Jade's saber is purple per Wookieepedia / Timothy Zahn Thrawn trilogy; the magenta tint is a valid interpretation.
- **Style**: `prism` — questionable. Mara Jade's saber in Legends illustrations/comics is a standard stable purple. `prism` (rotating faceted) is creative but not canonical.
- **Ignition**: `spark` 300ms — ✅.
- **Retraction**: `standard` 360ms — ✅.
- **facets: 6, rotationSpeed: 1.5** — prism-specific; dead config if style changes.
- **Suggested fix**: `style: stable` (primary) with `shimmer: 0.1`. Keep prism extras tuned in case alt variant wanted.

### 11. `legends-kyle-katarn-green`

- **Color**: green `{15, 200, 40}`.
- **Name label**: "Kyle Katarn (Green)".
- **MAJOR ISSUE**: Kyle Katarn's *most canonical* saber color across the Dark Forces / Jedi Knight games (Dark Forces II, Mysteries of the Sith, Jedi Outcast, Jedi Academy) is **BLUE**. Green appears in Legacy-era comics and some later fiction, but the primary KOTOR-adjacent fan recognition is blue (Rahn's saber was blue, then Kyle's own). Recommend either **relabel preset as blue and use blue RGB** OR **add a `legends-kyle-katarn-blue` variant as the primary canon** with green kept as an alt variant.
- **Style**: `photon` — decent; Kyle's saber in the games is stable-clean. `stable` also fine.
- **Ignition/Retraction**: `scroll`/`scroll` 320/380ms — ✅.
- **Suggested fix**: Add a blue variant; retain green as a secondary or rename "Kyle Katarn (Green - Legacy era)".

### 12. `legends-jaina-solo-purple`

- **Color**: `{150, 30, 255}` violet — ✅ (canonically violet per New Jedi Order / Legacy of the Force novels).
- **Style**: `stable` — ✅.
- **Ignition**: `spark` 280ms — slight over-tuning (Jaina is a skilled Jedi, not rash); `standard` would fit better. Minor.
- **Retraction**: `standard` 340ms — ✅.
- **Suggested fix (minor)**: `ignition: standard`.

### 13. `legends-darth-caedus-red`

- **Color**: `{220, 0, 15}` deep red — ✅ (Caedus wields red post-fall).
- **Style**: `stable` — ✅.
- **Ignition/Retraction**: `standard`/`standard` — ✅.
- **Note**: description correctly flags Jacen's blue-past. Consider adding `legends-jacen-solo-blue` as a pre-fall Jedi variant (would parallel Anakin/Vader split). **Feature opportunity**: variant pair.
- **No fixes needed** beyond consideration of a blue Jacen variant.

### 14. `legends-corran-horn-silver`

- **Color**: `{220, 225, 240}` silver-white — ✅ (canonically white/silver per X-Wing: Rogue Squadron and NJO novels; unique among Jedi).
- **Style**: `rotoscope` — ✅ good for a white blade.
- **Ignition/Retraction**: `scroll`/`scroll` — ✅.
- **dualPhase: true** — non-standard field. Dead config unless custom handler. Removable comment-only.
- **Hilt notes**: "dual-phase: standard and extended reach" — canonically true; speeder-bike-throttle hilt is correct lore. Good.
- **No structural fixes.** Preset is clean.

### 15. `legends-exar-kun-blue`

- **Color**: `{30, 80, 255}` blue — ⚠️ **canon-uncertain**. Exar Kun's blades in the Tales of the Jedi comics are depicted red (as Sith Lord) AND blue (pre-fall as Jedi). Once he becomes the Dark Lord leading the Great Sith War, his saberstaff is canonically **red/crimson**. Preset labels him "sith" + blue. This mismatch should be resolved: either (a) rename to "Exar Kun (Pre-Fall Blue)" with `affiliation: jedi`, or (b) add a `-red` variant as the proper Sith Exar Kun.
- **Style**: `plasma` — interesting choice; creative interpretation of a "volatile new Sith invention" is defensible.
- **Ignition/Retraction**: `center`/`center` 260/320ms — ✅ perfect for double-bladed.
- **dragColor: {100, 0, 200}** purple drag — non-standard; should be orange/white for drag convention.
- **frequency: 2.0, phaseSpeed: 1.5** — plasma-specific, valid.
- **Suggested fix**: Add Sith-era red variant (primary). Rename current to pre-fall blue. Or: switch to red and relabel.

### 16. `legends-nomi-sunrider-green`

- **Color**: `{0, 200, 30}` green — ✅ accurate (Tales of the Jedi: The Freedon Nadd Uprising and Dark Lords of the Sith).
- **Style**: `stable` — ✅.
- **Ignition/Retraction**: `standard`/`standard` 340/400ms — ✅.
- **Shimmer: 0.08** — ✅ low, appropriate.
- **No fixes needed.**

### 17. `legends-ulic-qel-droma-blue`

- **Color**: `{40, 100, 255}` blue — ✅ (Tales of the Jedi Jedi-era; he wielded red during Sith apprenticeship, blue as Jedi).
- **Style**: `stable` — ✅.
- **Ignition**: `standard` 320ms — ✅.
- **Retraction**: `fadeout` 420ms — ✅ (fits tragic character: fades out).
- **No fixes needed.** Consider adding `legends-ulic-qel-droma-red` (Sith-era variant) for completeness.

### 18. `legends-darth-bane-red`

- **Color**: `{200, 0, 0}` — ✅.
- **Style**: `ember` — **questionable**. Darth Bane's saber in the Drew Karpyshyn Bane trilogy novels and in the Clone Wars cameo (Mortis arc) is a standard red blade. Ember is not canonical. However: Bane wielded a *double-bladed saber briefly* plus had orbalisk-plated armor — a "burning from within" thematic read for ember is defensible but not strictly canon.
- **Ignition**: `fracture` 280ms — ✅ fits Bane's aggressive Rule of Two theme.
- **Retraction**: `drain` 350ms — ✅ fits Sith drain-of-life theme.
- **Feature-leveraging note**: Bane is the plausible candidate for "cracked crystal" interpretation in Legends texts (the saberstaff used by Rain Company Sith had cracked crystals per EU). If keeping exotic style, document reasoning in description.
- **Suggested fix**: Either add reasoning to description or drop to `style: stable` for canon-safety.

### 19. `legends-darth-plagueis-red`

- **Color**: `{170, 0, 10}` deep red — ✅ (per Darth Plagueis novel by James Luceno).
- **Style**: `pulse` — **creative stretch**. Plagueis's saber is not depicted as pulsing. However, the thematic tie-in (manipulator of midi-chlorians, life-giver/life-taker) makes a slow-pulse interpretation defensible.
- **Ignition**: `drip-up` 400ms — exotic; "rising from manipulated essence" theme works.
- **Retraction**: `drain` 500ms — ✅ fits theme.
- **pulseSpeed: 0.8, pulseMinBright: 0.3** — appropriate tuning for pulse style.
- **Verdict**: Keep as-is. The creative interpretation is thematically motivated. Consider description expansion to sell the interpretation.

### 20. `legends-darth-talon-red`

- **Color**: `{255, 15, 10}` vivid scarlet — ✅ (Legacy-era Twi'lek Sith; vivid red matches her depiction in Star Wars: Legacy comics).
- **Style**: `stable` — ✅.
- **Ignition**: `wipe` 240ms — ✅ (quick, clean).
- **Retraction**: `standard` 300ms — ✅.
- **No fixes needed.**

### 21. `legends-darth-krayt-red`

- **Color**: `{210, 5, 0}` — ✅.
- **Style**: `cinder` — **questionable**. Krayt's sabers in Legacy comics are standard red blades. No cinder/ember depiction. Coral-encrusted hilt is canon but that's hilt, not blade.
- **Ignition**: `fracture` 220ms — ✅ fits Krayt's corrupted-healing-from-Yuuzhan-Vong-disease theme.
- **Retraction**: `dissolve` 300ms — ✅.
- **Note**: Krayt canonically wields **two** lightsabers. Single-blade representation acknowledged; dual-wielding deferred to v0.15.
- **Suggested fix**: Drop to `style: stable` unless cinder is documented as "diseased Sith" thematic choice.

### 22. `legends-cade-skywalker-blue`

- **Color**: `{30, 90, 255}` — ✅ (Legacy-era Cade; blue blade per comic).
- **Style**: `unstable` — **questionable**. Cade's saber is not depicted as visibly unstable. However, his character arc (addicted to death sticks, refusing Jedi duty, reluctant user) has a "reluctant wielder" interpretation that unstable could represent. Thin justification.
- **Ignition**: `spark` 260ms — ✅.
- **Retraction**: `standard` 320ms — ✅.
- **shimmer: 0.3** — high for an unstable saber; OK if style kept.
- **Suggested fix**: Drop to `style: stable` for canon-safety, OR keep `unstable` with tighter description framing the "reluctant Jedi" interpretation.

### 23. `legends-maris-brood-red`

- **Color**: `{240, 10, 20}` — ✅.
- **Style**: `gradient` — interesting. Maris's tonfa sabers are not depicted with gradient coloring; standard red. Creative interpretation.
- **Ignition/Retraction**: `wipe`/`standard` 220/280ms — ✅.
- **`ledCount: 100`** — ✅ tonfa is shorter; correct technical choice.
- **gradientSpeed: 1.0** — gradient-specific. Valid.
- **Hilt notes**: tonfa-grip — ✅ canon (TFU).
- **Suggested fix**: `style: stable`; remove gradient extras OR keep and document.

### 24. `legends-rahm-kota-green`

- **Color**: `{10, 190, 35}` weathered green — ✅.
- **Style**: `stable` — ✅.
- **Ignition/Retraction**: `scroll`/`scroll` 360/420ms — ✅ (slightly slower ignition fits a veteran's deliberate style).
- **Shimmer**: 0.07 — ✅ low.
- **Hilt notes**: katana-inspired, wrapped grip — ✅ accurate to TFU design.
- **No fixes needed.**

### 25. `legends-proxy-prism`

- **Color**: `{100, 200, 255}` variable-blue — acceptable default.
- **Style**: `prism` — ✅ thematically perfect for a holographic impersonator droid.
- **Ignition**: `glitch` 180ms — ✅ holographic glitch.
- **Retraction**: `shatter` 250ms — ✅ holographic dissolve.
- **rainbow: true, colorShiftSpeed: 2.0, facets: 8, rotationSpeed: 2.5** — non-standard custom field `rainbow: true` is dead config; colorShiftSpeed also custom. Prism extras valid.
- **Verdict**: Creative preset; well-motivated choices. Keep. Consider removing `rainbow` (not handled by engine).

### 26. `legends-darth-traya-purple`

- **Color**: `{120, 40, 180}` muted purple — ✅ (Kreia's saber in KOTOR II is purple-ish).
- **Style**: `aurora` — creative. Justifiable as representation of Traya's telekinetic three-blade control.
- **Ignition**: `drip-up` 400ms — exotic; fits "slow reveal of a manipulator."
- **Retraction**: `unravel` 550ms — ✅ thematically perfect ("unraveling of the Force" is her core motif).
- **telekinetic: true** — non-standard field, dead config.
- **Note**: Traya canonically wields three sabers telekinetically. Single-blade representation; multi-blade deferred.
- **Suggested fix**: Remove `telekinetic` (no handler); otherwise preset is strong.

### 27. `legends-visas-marr-red`

- **Color**: `{200, 0, 15}` — ✅.
- **Style**: `stable` — ✅.
- **Ignition**: `scroll` 320ms — ✅.
- **Retraction**: `fadeout` 400ms — ✅ (fits Miraluka "fading sight" theme).
- **No fixes needed.** Clean preset. Consider adding redeemed-variant with Jedi crystal (green/blue) per hilt notes.

### 28. `legends-darth-vitiate-red`

- **Color**: `{180, 0, 0}` — ✅.
- **Style**: `cinder` — **questionable**. Vitiate/Valkorion's saber in SWTOR is a standard red blade (he rarely uses it — prefers Force manipulation). No cinder depiction.
- **Ignition**: `pulse-wave` 300ms — exotic.
- **Retraction**: `spaghettify` 600ms — exotic.
- **Feature-leveraging note**: Vitiate is a plausible "ancient-and-terrible" candidate for exotic tuning (1000+ years old, consumed worlds). Justification is stronger than for Krayt. Keep exotic framing but tighten description.
- **Suggested fix**: Keep `cinder` if description expanded to sell "ancient, consumed-worlds aura"; otherwise drop to `stable`.

### 29. `legends-jacen-solo-blue` (MISSING — Jacen-as-Jedi pre-fall)

**Recommendation**: Add this variant. Parallels the Anakin/Vader split already present in other preset files. Jacen Solo wielded a green or blue saber pre-fall per New Jedi Order / Legacy of the Force novels. Would complete the Jacen/Caedus arc.

---

## Cross-cutting recommendations

1. **Document the "detailed tier = exotic style" convention or abandon it.** Currently Revan Purple (`unstable`), Malak (`fire`), Nihilus (`automata`), Bane (`ember`), Krayt (`cinder`), Vitiate (`cinder`) all use exotic styles without clear canon justification. Either add descriptions explicitly selling the creative interpretation, or drop each to `stable`/`rotoscope` for canon-safety.

2. **Dead config audit**: Remove `voidEffect`, `telekinetic`, `rainbow`, `dualPhase`, `sparkSize` — none are registered engine fields. They're harmless (TypeScript permits `[key: string]: unknown`) but clutter the output.

3. **`dragColor` convention**: Most Sith presets use `dragColor` as a darker baseColor. ProffieOS drag convention is orange/white/hot. Starkiller-Blue's `dragColor: {255, 180, 0}` orange is the right pattern — propagate to others.

4. **Add missing Legends canon variants**: Kyle Katarn blue, Jacen Solo blue (pre-fall), Ulic Qel-Droma red (Sith-era), Visas Marr redeemed (green/blue), Exar Kun red (Sith-era).

5. **Feature-leveraging top targets** (ordered by strongest justification):
   - Starkiller-Red (already well-tuned; consider `BifurcateEffect` on clash).
   - Sion (shatter style + fracture ignition + dissolve retraction is already exemplary).
   - Traya/Kreia (aurora + unravel retraction is thematically perfect).
   - Plagueis (pulse justifies via midi-chlorian manipulation lore).
   - Vitiate (cinder justifies via "consumed worlds" if description updated).
   - Nihilus (pulse > automata; slow dark pulsing = "hunger").

6. **Affiliation sanity**: `neutral` for Revan-Purple is correct and sophisticated. Other grey characters (Kreia?) could benefit from the same treatment. Kreia is currently `sith` which is defensible (she's Darth Traya) but she's also the archetypal grey character in Legends.

---

## Sources

- Wookieepedia Legends articles (mental reference) for: Revan, Bastila Shan, Meetra Surik / Jedi Exile, Kyle Katarn, Mara Jade, Corran Horn, Exar Kun, Nomi Sunrider, Ulic Qel-Droma, Darth Bane, Darth Plagueis, Darth Sion, Darth Nihilus, Darth Traya, Darth Malak, Jaina Solo, Jacen Solo / Darth Caedus, Cade Skywalker, Darth Talon, Darth Krayt, Darth Malgus, Darth Vitiate, Maris Brood, Rahm Kota, PROXY, Visas Marr, Starkiller / Galen Marek.
- KOTOR, KOTOR II game references (color defaults, hilt designs).
- Force Unleashed I/II cinematics (Starkiller, Rahm Kota, Maris Brood, PROXY, Juno — not in preset file).
- Tales of the Jedi comics (Nomi Sunrider, Exar Kun, Ulic Qel-Droma era).
- Legacy of the Force novels (Jacen Solo fall, Jaina Solo arc).
- Legacy comics (Cade Skywalker, Darth Talon, Darth Krayt).
- Dark Forces / Jedi Knight games (Kyle Katarn).
- Thrawn trilogy (Mara Jade).
- Darth Bane trilogy by Drew Karpyshyn (Bane, Rule of Two).
- Darth Plagueis by James Luceno (Plagueis).
- SWTOR (Darth Malgus, Darth Vitiate/Valkorion, SIS era).

**Note**: Darth Malgus is mentioned in the brief but **not present** in the current `legends.ts` file. This is itself worth flagging — Malgus is a major SWTOR character and would be a strong addition.

---

*End of audit.*
