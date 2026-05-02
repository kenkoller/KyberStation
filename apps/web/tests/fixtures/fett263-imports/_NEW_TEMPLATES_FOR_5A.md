# New templates discovered by Sprint 5B fixtures (input for Sprint 5A)

This document lists ProffieOS template names that appear in Sprint 5B's
new fixtures but are NOT YET registered in `packages/codegen/src/templates/`.
Sprint 5A's template-registry expansion should pick these up.

The Sprint 5B fixtures intentionally cover niche corners of the Fett263 OS6/OS7
generator output, so it's expected that some templates here aren't in the registry.
None of these are typos — every name is verified against the upstream ProffieOS
source at https://github.com/profezzorn/ProffieOS or in real saber configs.

## Templates likely missing from the registry

(Verified absent from `packages/codegen/src/templates/{colors,functions,layers,transitions,wrappers}.ts` as of Sprint 5B authoring.)

### Color/style templates
- **PulsingL** — Layer-form variant of `Pulsing`. Used in BC_DarkShadow stacked-pulse preon effects.
- **PulsingF** — Function-form pulsing scalar. Used for time-varying alpha modulation.

### Function templates
- **SmoothSoundLevel** — Smoothed sound-level function. Used in Cal Kestis preon "Overload".
- **VolumeLevel** — Current volume setting (0-32768). Used in EFFECT_VOLUME_LEVEL display styles.
- **Percentage** — Compute integer percentage of a function value: `Percentage<WavLen<>, 25>` = 25% of WavLen. Common in EFFECT_POSTOFF stage timings.

### Transition templates
- **BendTimePowX** — Companion to `BendTimePowInvX`. Used in KOTOR Revan IGNITION/RETRACTION wraps.
- **TrCenterWipeInSpark** — Center-wipe with spark effect. Used in Corran Horn EFFECT_FAST_ON.

### Effect tokens (parser auto-filtered, not strictly needed)
These are EFFECT_* enum tokens — the parser already filters them via the `EFFECT_` prefix
check in `Parser.ts:335`. Listed here for reference:
- EFFECT_FORCE
- EFFECT_QUOTE
- EFFECT_BOOT
- EFFECT_NEWFONT
- EFFECT_BATTERY_LEVEL
- EFFECT_POWERSAVE
- EFFECT_VOLUME_LEVEL
- EFFECT_FAST_ON
- EFFECT_POSTOFF
- EFFECT_ALT_SOUND
- EFFECT_SOUND_LOOP
- EFFECT_DRAG_BEGIN
- EFFECT_DRAG_END
- EFFECT_LOCKUP_BEGIN
- EFFECT_LOCKUP_END
- EFFECT_USER1, EFFECT_USER2, EFFECT_USER3, EFFECT_USER4
- EFFECT_PREON
- EFFECT_IGNITION
- EFFECT_RETRACTION
- EFFECT_BLAST
- EFFECT_CLASH
- EFFECT_STAB
- EFFECT_CHANGE
- EFFECT_ERROR_IN_FONT_DIRECTORY

## Fixtures that may exceed the per-fixture warning cap (5)

If a fixture below exceeds `PER_FIXTURE_WARNING_CAP=5` in
`packages/codegen/tests/fett263Fixtures.test.ts`, it's because it uses templates
from the list above that 5A hasn't registered yet. Once 5A's expansion lands,
these should drop back below the cap automatically.

Most-likely-to-trip fixtures:
- `cal-kestis-multi-phase-10-color-os7.txt` — uses `EffectPulseF`, `Sum`, `ModF`
- `effect-volume-level-pulsing-os6.txt` — uses `VolumeLevel` (~1 unknown)
- `effect-volume-level-stepped-stripes-os6.txt` — uses `VolumeLevel`, `LinearSectionF` x4
- `effect-fast-on-strobe-spark-os6.txt` — uses `TrCenterWipeInSpark` (~1 unknown)
- `revan-multi-phase-4-color-os7.txt` — uses `BendTimePowInvX`, `IgnitionTime`, `RetractionTime`
- `obi-wan-special-ability-rain-mode-os7.txt` — uses `BendTimePowInvX`, `EffectIncrementF`, `TrDoEffect`
- `effect-postoff-emitter-glow-decay-os6.txt` — uses `Percentage`, `WavLen`

## Notes for Sprint 5A

When you register the templates above, please:
1. Run `pnpm --filter @kyberstation/codegen test --run fett263Fixtures` to
   confirm the new fixtures pass the warning cap.
2. Update this file with `// REGISTERED` markers next to each template that's
   added, OR delete this file once all listed templates are registered.
3. The corpus should hit ≤ 25 total unknown-template warnings across all 60+
   fixtures with the registry gap closed.
