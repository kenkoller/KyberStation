# Runtime preset coverage — gallery vs. ProffieOS 7.12 runtime verbs

**Date:** 2026-09-24 · **Scope:** the `proffie_runtime` export in custom-styles mode ("Use my colors and blade style", historically "Phase C") · **Mapper:** [`packages/codegen/src/emitters/runtimeVerbs.ts`](../../packages/codegen/src/emitters/runtimeVerbs.ts)

## Method

`mapBladeConfigToRuntimeStyle()` was run over all 455 presets in `ALL_PRESETS` (`@kyberstation/presets`). Every preset gets one of the eight verbs in ProffieOS 7.12 `styles/style_parser.h` `named_styles[]`, plus a fidelity label:

- **faithful**: the same kind of blade the KyberStation style describes (solid, gradient, crackle, flame, moving rainbow). Small differences in the animation are possible.
- **approximate**: the style's colors with a related-but-different animation, or a static stand-in for a moving one.
- **colors-only**: no runtime verb can animate the style. The preset becomes a solid `advanced` blade with the base color, the effect colors and the timing. It needs a firmware flash to look right.

Two things downgrade a faithful mapping to approximate: modulation bindings (they can't run from the SD card) and imported raw ProffieOS code. Every emitted string passes a TypeScript port of `IsValidStyleString()`. The tallies come from `packages/codegen/tests/runtimeVerbCoverage.test.ts`. Reprint them with `KS_PRINT_RUNTIME_COVERAGE=1 pnpm --filter @kyberstation/codegen exec vitest run tests/runtimeVerbCoverage.test.ts`.

## Results

**360 of 455 presets (79.1%) get their blade style to the saber in some form:** 246 faithful and 114 approximate. The other 95 (20.9%) arrive as colors only.

A baseline caveat: before this change, custom-styles mode sent every preset as a solid `advanced` blade. That was already correct for the 152 `stable` presets, although nothing labeled it. So the verb mapping newly adds 94 faithful presets (60 unstable, 14 gradients that used to be flattened to one color, 11 fire and 9 prism) and moves 114 more to approximate. 199 presets now get something other than a flat blade. The earlier estimate of "~300 approximately faithful" was low; the real figure is 360.

| Fidelity | Presets | Share |
|---|---:|---:|
| faithful | 246 | 54.1% |
| approximate | 114 | 25.1% |
| colors-only | 95 | 20.9% |
| **total** | **455** | |

| Verb | Presets | faithful | approximate | colors-only |
|---|---:|---:|---:|---:|
| `advanced` | 285 | 166 | 24 | 95 |
| `unstable` | 62 | 60 | 2 | 0 |
| `cycle` | 58 | 0 | 58 | 0 |
| `fire` | 40 | 11 | 29 | 0 |
| `rainbow` | 10 | 9 | 1 | 0 |

No gallery preset maps to `strobe` or `standard`. `strobe` is only used for `sithFlicker` and `tempoLock`, and no gallery preset uses those styles yet. `standard` has a builder but is never chosen, because `advanced` covers everything it does.

| Gallery section (`continuity`) | Presets | faithful | approximate | colors-only |
|---|---:|---:|---:|---:|
| canon | 123 | 90 | 26 | 7 |
| pop-culture | 122 | 72 | 40 | 10 |
| creative | 111 | 22 | 27 | 62 |
| legends | 68 | 61 | 5 | 2 |
| showcase | 18 | 0 | 11 | 7 |
| mythology | 13 | 1 | 5 | 7 |

Character presets land well: 94% of canon and 97% of legends are faithful or approximate. The creative section is mostly colors-only, because it is where the exotic styles live. All 18 showcase presets carry modulation bindings, so none of them is rated faithful.

**Top colors-only styles** (each needs a firmware flash to look right): photon 15, helix 12, vortex 10, tidal 9, crystalShatter 7, torrent 7, gravity 7, dataStream 6, automata 5, neutron 5, and shatter / mirage / cascade / moire 3 each. Most of these are `Stripes<>`, swing-reactive or angle-reactive templates, and no 7.12 runtime verb can express those.

| Style | Presets | Verb | Fidelity |
|---|---:|---|---|
| stable | 152 | advanced | faithful 152 |
| unstable | 62 | unstable | faithful 60, approximate 2 |
| pulse | 28 | cycle | approximate 28 |
| aurora | 27 | cycle | approximate 27 |
| gradient | 18 | advanced | faithful 14, approximate 4 |
| rotoscope | 12 | advanced | approximate 12 |
| plasma / cinder / ember / candle | 11 / 6 / 5 / 5 | fire | approximate |
| fire | 13 | fire | faithful 11, approximate 2 |
| prism | 10 | rainbow | faithful 9, approximate 1 |
| darksaber | 8 | advanced | approximate 8 |
| nebula | 3 | cycle | approximate 3 |

## Mapping decisions worth knowing

- **Unstable colors** (for the `unstable` verb's warm / warmer / hot / sparks slots):
  - warm = base × 150/255 (the ratio between ProffieOS's own `Rgb<150,0,0>` and `Red` defaults)
  - warmer = base
  - hot = `Mix<Int<10000>, base, White>` (the compile+flash codegen's unstable hot color)
  - sparks = base 60% toward white (the engine's peak crackle spike)

  The verb's clash and blast are fixed white and its lockup is a fixed yellow/red flicker, so those three effect colors don't transfer.
- **Pulse / aurora / nebula → `cycle`.** Despite its name, `cycle` is a ColorCycle spin-up around `AudioFlicker<>`, so its brightness follows the saber's sound. It never pulses on a clock, and its ignition is a fixed spin-up of about 1 s. Every label for these presets says "audio-reactive".
- **Aurora tint.** The engine's Aurora centers its hue band on `baseColor.r`, which looks like a quirk: it greys out blue presets. The runtime tint uses the base color's own hue + 50° instead. The compile+flash codegen (and so Hardware Preview) currently renders Aurora as a full `Rainbow`. The runtime path deliberately keeps the preset's color identity instead, so "Shaak Ti blue" stays blue.
- **Gradient stops.** The runtime path uses `gradientStops` (sampled at hilt / middle / tip). The compile+flash codegen ignores `gradientStops` and emits `Gradient<base, gradientEnd ?? brighten(base, 0.4)>`. That gap belongs to the codegen lane.
- **`tipColor` is not used.** Neither the engine nor the codegen renders it. Emitting it would put a tip on the saber that the editor never showed.
- **Fire family.** Plasma, cinder, ember and candle use the `fire` verb with the same color pairs the compile+flash `StyleFire<>` templates use. The fire verb has no timing slots and no clash / blast / lockup colors.
- **Strobe timing.** ProffieOS `StrobeF` holds the flash for `flashMs`, then the standby color for `1000/freq` ms (integer division). The mapper solves for both so the real period matches the requested rate or BPM.

## Related findings from this lane

- **Factory SD cards start with a binary header.** The firmware writes `presets.ini` / `presets.tmp` with a 512-byte `SafeFileHeader2` before the text (confirmed on the 89sabers factory card). "Write to Card" used to decode the whole file as text, so it failed to find `install_time` on a factory card and wrote a placeholder, which ProffieOS rejects. Fixed in `apps/web/lib/runtimePresetIO.ts`.
- **Shimmer never reaches the saber.** `config.shimmer` is never read by `ASTBuilder`. The compile+flash deliverability row now says so instead of claiming the value is emitted as AudioFlicker intensity.
