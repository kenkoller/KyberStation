# Fett263 OS7 Style Library — Template Inventory & Gap Analysis

**Created:** 2026-05-02
**Author:** Claude (research session)
**Time-box:** ~30 min
**Purpose:** Inform expansion of `packages/codegen/src/templates/*.ts` so the
KyberStation parser can ingest typical Fett263 OS7 Style Library output without
choking. Today our registry knows ~46 templates; Fett263's library and the
broader ProffieOS 7.x dialect routinely emit 80+.

## Sources

Primary authority is `pod.hubbe.net` (Fredrik Hübinette's official ProffieOS
documentation site) — every template listed below was cross-referenced against
its documentation index `pod.hubbe.net/all_pages.html`. Fett263's OS7 Style
Library produces standard ProffieOS C++ templates; the library is essentially a
parameterised generator over the same template set, plus a few wrapper macros.
Three additional sources informed frequency estimates: the ProffieOS Style
Editor (Fredrik), the Fett263 OS7 Library home page, and the Fett263 Phase 3
Q&A thread on `crucible.hubbe.net` (which contains many code paste examples
from real users).

| Source | URL |
|---|---|
| ProffieOS docs index | https://pod.hubbe.net/all_pages.html |
| Single-page docs | https://pod.hubbe.net/POD.html |
| Style category page | https://pod.hubbe.net/config/styles/ |
| ColorChange/Select | https://pod.hubbe.net/config/color-change.html |
| Blade EFFECTs page | https://pod.hubbe.net/config/styles/blade-effects.html |
| TrConcat docs | https://pod.hubbe.net/config/transitions/TrConcat.html |
| Fett263 OS7 Library | https://www.fett263.com/fett263-proffieOS7-style-library.html |
| Fett263 OS7 intro | https://www.fett263.com/proffieOS7-intro.html |
| Fett263 Phase 3 thread | https://crucible.hubbe.net/t/proffieos7-style-library-phase-3-early-access-q-a/5006 |
| Style Editor (Fredrik) | https://fredrik.hubbe.net/lightsaber/style_editor.html |
| Fett263 buttons prop | https://github.com/profezzorn/ProffieOS/blob/master/props/saber_fett263_buttons.h |

---

## Section 1 — Top ~80 templates ranked by Fett263 emission frequency

Frequency is a qualitative estimate based on (a) what the OS7 Library lets users
toggle, (b) what Fett263 Q&A code-pastes show in real configs, and (c) which
templates are mandatory to express Fett263's standard layer sandwich
(`StylePtr<Layers<base, InOutTrL<>, LockupTrL<>, ResponsiveBlastL<>,
SimpleClashL<>, ResponsiveLightningBlockL<>, ResponsiveStabL<>,
ResponsiveDragL<>, ResponsiveMeltL<>, TransitionEffectL<>...>>`).

| # | Template | Category | argTypes | Description | Frequency |
|---:|---|---|---|---|---|
| 1 | `StylePtr` | wrapper | `[COLOR]` | Outermost wrapper around the style tree | common |
| 2 | `Layers` | layer | `[COLOR, COLOR, ...]` (variadic) | Main compositor: base color + N overlay layers | common |
| 3 | `Rgb` | color | `[INTEGER, INTEGER, INTEGER]` | Solid RGB color (0-255 per channel) | common |
| 4 | `RgbArg` | color | `[INTEGER, COLOR]` | Argument-switchable RGB (Edit Mode index + default) | common |
| 5 | `InOutTrL` | layer/wrapper | `[TRANSITION, TRANSITION]` | Ignition/retraction transition layer | common |
| 6 | `TrFade` | transition | `[INTEGER]` | Fade transition over N ms | common |
| 7 | `TrWipe` | transition | `[INTEGER]` | Wipe hilt→tip over N ms | common |
| 8 | `TrWipeIn` | transition | `[INTEGER]` | Wipe tip→hilt over N ms | common |
| 9 | `TrInstant` | transition | `[]` | Instant transition (no animation) | common |
| 10 | `TrConcat` | transition | `[TRANSITION, ...]` (variadic; intermediate COLORs allowed) | Concatenate any number of transitions | common |
| 11 | `TransitionEffectL` | layer | `[TRANSITION, EFFECT]` (current OS7 form) | Effect-triggered transition layer; older `[COLOR, TR, TR, EFFECT]` form also seen | common |
| 12 | `LockupTrL` | layer | `[COLOR, TRANSITION, TRANSITION, LOCKUP_TYPE]` | Lockup with begin/end transitions + lockup-type enum | common |
| 13 | `ResponsiveLockupL` | layer | `[COLOR, TRANSITION, TRANSITION, INT, INT, INT]` | Spatial lockup (TOP/BOTTOM/SIZE in 0..32768) | common |
| 14 | `ResponsiveClashL` | layer | `[COLOR, TRANSITION, TRANSITION, INT, INT]` | Spatial clash flash | common |
| 15 | `ResponsiveBlastL` | layer | `[COLOR, INT, INT, INT, EFFECT]` | Spatial blast at impact location | common |
| 16 | `ResponsiveBlastFadeL` | layer | `[COLOR, INT, INT, INT, EFFECT]` | Blast that fades after impact | common |
| 17 | `ResponsiveBlastWaveL` | layer | `[COLOR, INT, INT, INT, INT, EFFECT]` | Blast that propagates as a wave | common |
| 18 | `ResponsiveStabL` | layer | `[COLOR, TRANSITION, TRANSITION, INT, INT]` | Stab effect at tip | common |
| 19 | `ResponsiveDragL` | layer | `[COLOR, TRANSITION, TRANSITION, INT, INT]` | Drag effect at tip with sparks | common |
| 20 | `ResponsiveMeltL` | layer | `[COLOR, TRANSITION, TRANSITION, INT, INT]` | Spatial melt at tip | common |
| 21 | `ResponsiveLightningBlockL` | layer | `[COLOR, TRANSITION, TRANSITION]` | Force-Lightning block lockup | common |
| 22 | `SimpleClashL` | layer | `[COLOR, INT]` | Whole-blade clash flash | common |
| 23 | `BlastL` | layer | `[COLOR]` | Plain blast layer (legacy/simple form) | common |
| 24 | `AlphaL` | layer | `[COLOR, FUNCTION]` | Alpha-masked layer; FUNCTION is the opacity mask | common |
| 25 | `AudioFlicker` | color | `[COLOR, COLOR]` | Audio-driven flicker between two colors | common |
| 26 | `AudioFlickerL` | layer | `[COLOR]` | Audio-flicker as overlay layer | common |
| 27 | `BrownNoiseFlicker` | color | `[COLOR, COLOR, INTEGER]` | Brown-noise driven flicker (depth) | common |
| 28 | `RandomFlicker` | color | `[COLOR, COLOR]` | Random uncorrelated flicker | common |
| 29 | `RandomPerLEDFlicker` | color | `[COLOR, COLOR]` | Per-LED random flicker (gritty look) | common |
| 30 | `HumpFlicker` | color | `[COLOR, COLOR, INTEGER]` | Smooth hump-shaped flicker | common |
| 31 | `Mix` | color | `[FUNCTION, COLOR, COLOR]` | Mix two colors by function output (0..32768) | common |
| 32 | `Gradient` | color | `[COLOR, COLOR, ...]` (variadic) | Gradient along blade between N colors | common |
| 33 | `Stripes` | color | `[INTEGER, INTEGER, COLOR, COLOR, ...]` (variadic) | Moving stripe pattern | common |
| 34 | `Pulsing` | color | `[COLOR, COLOR, INTEGER]` | Pulse between two colors with period | common |
| 35 | `Rainbow` | color | `[]` | Full rainbow cycle along blade | common |
| 36 | `RotateColorsX` | color | `[FUNCTION, COLOR]` | Rotate hue of color by function output | common |
| 37 | `Int` | function | `[INTEGER]` | Constant integer wrapper | common |
| 38 | `Scale` | function | `[FUNCTION, INTEGER, INTEGER]` | Scale function output to min..max | common |
| 39 | `Sin` | function | `[INTEGER]` | Sine wave with period parameter | common |
| 40 | `Bump` | function | `[FUNCTION, INTEGER]` | Gaussian bump at position with width | common |
| 41 | `SmoothStep` | function | `[INTEGER, INTEGER]` | Smooth step from low to high threshold | common |
| 42 | `SwingSpeed` | function | `[INTEGER]` | Swing speed with threshold parameter | common |
| 43 | `BladeAngle` | function | `[]` | Blade angle relative to gravity | common |
| 44 | `TwistAngle` | function | `[]` | Twist angle of hilt | common |
| 45 | `BatteryLevel` | function | `[]` | Battery voltage level | common |
| 46 | `IntArg` | function | `[INTEGER, INTEGER]` | Edit-Mode integer arg (index + default) | common |
| 47 | `IncrementModuloF` | function | `[INTEGER, INTEGER]` | Counter with modulo wrap and trigger | common |
| 48 | `EFFECT_*` enums | effect-id-enum | n/a | EFFECT_CLASH, EFFECT_BLAST, EFFECT_FORCE, EFFECT_PREON, EFFECT_STAB, EFFECT_DRAG_BEGIN/END, EFFECT_LOCKUP_BEGIN/END, EFFECT_IGNITION, EFFECT_RETRACTION, EFFECT_NEWFONT, EFFECT_LOW_BATTERY, EFFECT_INTERACTIVE_BLAST/PREON, EFFECT_USER1..8, EFFECT_QUOTE, EFFECT_NEXT_QUOTE, EFFECT_FAST_ON/OFF, EFFECT_SECONDARY_IGNITION/RETRACTION, EFFECT_OFF_CLASH, EFFECT_BEGIN/END_BATTLE_MODE, EFFECT_BEGIN/END_AUTO_BLAST, EFFECT_TRACK, EFFECT_POSTOFF, EFFECT_BOOT, plus 13+ blaster + 10+ mini-game variants | common |
| 49 | `SaberBase::LOCKUP_*` enums | effect-id-enum | n/a | LOCKUP_NORMAL, LOCKUP_DRAG, LOCKUP_LIGHTNING_BLOCK, LOCKUP_MELT, LOCKUP_AUTOFIRE, LOCKUP_NONE, LOCKUP_ARMED | common |
| 50 | `TrSelect` | transition | `[FUNCTION, TRANSITION, ...]` (variadic) | Select between N transitions by function | common |
| 51 | `TrFadeX` | transition | `[FUNCTION]` | Fade with duration from function (vs constant ms) | common |
| 52 | `TrWipeX` | transition | `[FUNCTION]` | Wipe with duration from function | common |
| 53 | `TrWipeInX` | transition | `[FUNCTION]` | Wipe-in with duration from function | common |
| 54 | `TrDelay` | transition | `[INTEGER]` | Delay (hold) for N ms | common |
| 55 | `TrDelayX` | transition | `[FUNCTION]` | Delay with duration from function | common |
| 56 | `TrSmoothFade` | transition | `[INTEGER]` | Smooth (ease-in/out) fade | common |
| 57 | `TrSmoothFadeX` | transition | `[FUNCTION]` | Smooth fade with duration from function | common |
| 58 | `TrJoin` | transition | `[TRANSITION, TRANSITION]` | Run two transitions in parallel | common |
| 59 | `TrJoinR` | transition | `[TRANSITION, TRANSITION]` | TrJoin reversed for retraction phase | common |
| 60 | `TrLoop` | transition | `[TRANSITION]` | Loop a transition continuously | common |
| 61 | `TrLoopNX` | transition | `[FUNCTION, TRANSITION]` | Loop N times where N comes from function | common |
| 62 | `TrLoopUntil` | transition | `[FUNCTION, TRANSITION, TRANSITION]` | Loop until function condition | common |
| 63 | `TrColorCycle` | transition | `[INTEGER, INTEGER, INTEGER]` | Hue cycle transition | common |
| 64 | `TrWaveX` | transition | `[COLOR, FUNCTION, FUNCTION, FUNCTION, FUNCTION]` | Wave-shaped transition with function-driven params | common |
| 65 | `TrSparkX` | transition | `[COLOR, FUNCTION, FUNCTION, FUNCTION]` | Spark transition with function-driven params | common |
| 66 | `TrWipeSparkTip` | transition | `[COLOR, INTEGER]` | Wipe with spark at tip | common |
| 67 | `TrWipeInSparkTip` | transition | `[COLOR, INTEGER]` | WipeIn with spark at tip | common |
| 68 | `TrCenterWipeIn` | transition | `[INTEGER]` | Wipe outward from center | common |
| 69 | `TrCenterWipeX` | transition | `[FUNCTION]` | Center wipe with duration from function | common |
| 70 | `TrCenterWipeInX` | transition | `[FUNCTION]` | Center wipe-in with duration from function | common |
| 71 | `TrBlinkX` | transition | `[FUNCTION, FUNCTION, COLOR]` | Blink transition | sometimes |
| 72 | `TrBoingX` | transition | `[FUNCTION, INTEGER]` | "Boing" overshoot transition | sometimes |
| 73 | `TrExtendX` | transition | `[FUNCTION, TRANSITION]` | Extend transition duration | sometimes |
| 74 | `TrDoEffectX` | transition | `[FUNCTION, EFFECT, INTEGER]` | Trigger an effect mid-transition | sometimes |
| 75 | `TrDoEffectAlwaysX` | transition | `[FUNCTION, EFFECT, INTEGER]` | Always trigger effect (overrides cooldown) | sometimes |
| 76 | `TrRandom` | transition | `[TRANSITION, ...]` (variadic) | Pick a random transition from list | sometimes |
| 77 | `TrSequence` | transition | `[TRANSITION, ...]` (variadic) | Cycle transitions in order | sometimes |
| 78 | `EffectSequence` | layer | `[FUNCTION, COLOR, ...]` (variadic; head is selector function then N alpha layers) | Sequence-of-AlphaLs cycler; load-bearing for OS7 Power Save and OS7 looping FX | common |
| 79 | `TransitionLoop` | layer | `[COLOR, TRANSITION]` | Looping transition layer | sometimes |
| 80 | `TransitionPulseL` | layer | `[COLOR, TRANSITION, FUNCTION]` | Pulsing transition layer | sometimes |
| 81 | `ColorChange` | color | `[TRANSITION, COLOR, COLOR, ...]` (variadic) | OS Color Change wheel/list | common |
| 82 | `ColorSelect` | color | `[FUNCTION, TRANSITION, COLOR, ...]` (variadic) | Select color by function (Variation/AltF/etc.) | common |
| 83 | `ColorCycle` | color | `[COLOR, INT, INT, COLOR, INT, INT, INT]` | Cycle a color along the blade | sometimes |
| 84 | `Sparkle` | color | `[COLOR, COLOR, INT, INT]` | Glittering speckle effect | sometimes |
| 85 | `Blinking` | color | `[COLOR, COLOR, INT, INT]` | Blink at fixed period | sometimes |
| 86 | `RandomBlink` | color | `[INT, COLOR, COLOR]` | Random blink between colors | sometimes |
| 87 | `Cylon` | color | `[COLOR, INT, INT]` | Cylon scanner sweep | rare |
| 88 | `HardStripes` | color | `[INT, INT, COLOR, COLOR, ...]` | Hard-edged stripes | sometimes |
| 89 | `PixelateX` | color | `[FUNCTION, COLOR, COLOR]` | Pixelated mosaic between two colors | rare |
| 90 | `Strobe` | color | `[COLOR, COLOR, INT, INT]` | Strobe between two colors | sometimes |
| 91 | `StyleFire` | color | `[COLOR, COLOR, INT, INT]` | Fire-style effect | common |
| 92 | `Remap` | layer | `[FUNCTION, COLOR]` | Remap blade positions through a function | rare |
| 93 | `Sequence` | color | variadic | Step through frames in sequence | rare |
| 94 | `RgbCycle` | color | `[]` | Full RGB cycle | rare |
| 95 | `Rgb16` | color | `[INT, INT, INT]` | 16-bit per-channel RGB (HDR) | rare |
| 96 | `ByteOrderStyle` | wrapper | `[INT, COLOR]` | Force a byte order on a color | rare |
| 97 | `OnSpark` | layer | `[COLOR]` | Spark on ignition | sometimes |
| 98 | `LocalizedClash` | layer | `[COLOR, INT, INT]` | Localized clash flash | sometimes |
| 99 | `Lockup` | layer | `[COLOR, COLOR]` | Plain lockup (legacy non-Tr form) | rare (legacy) |
| 100 | `LockupTr` | layer | `[COLOR, TRANSITION, TRANSITION]` | Lockup with transitions, no type enum (legacy) | rare (legacy) |
| 101 | `Blast` | layer | `[COLOR, INT, INT]` | Plain blast (legacy form) | rare (legacy) |
| 102 | `BlastFadeout` | layer | `[COLOR, INT]` | Blast that fades, no responsive logic | rare (legacy) |
| 103 | `OriginalBlast` | layer | `[COLOR]` | Original (very early) blast layer | rare (legacy) |
| 104 | `SimpleClash` | layer | `[COLOR, INT]` | Whole-blade clash, non-L variant | rare (legacy) |
| 105 | `IgnitionDelay` | wrapper | `[INTEGER]` | Delay ignition by N ms | sometimes |
| 106 | `RetractionDelay` | wrapper | `[INTEGER]` | Delay retraction by N ms | sometimes |
| 107 | `InOutHelper` | wrapper | `[COLOR, INT, INT]` | Older in/out helper (pre-OS6 tutorials) | rare (legacy) |
| 108 | `InOutHelperX` | wrapper | `[COLOR, FUNCTION]` | Function-parameterised in/out helper | rare (legacy) |
| 109 | `InOutSparkTip` | wrapper | `[COLOR, INT, INT, COLOR]` | In/out with tip spark at ignition | sometimes |
| 110 | `InOutTr` | wrapper | `[COLOR, TRANSITION, TRANSITION]` | Plain in/out transition (predecessor of InOutTrL) | rare (legacy) |
| 111 | `LengthFinder` | wrapper | `[COLOR]` | Diagnostic helper (counts pixels) | rare |
| 112 | `DisplayStyle` | wrapper | `[COLOR]` | Display-only style helper | rare |
| 113 | `DimBlade` | wrapper | `[COLOR, INT]` | Dim blade by % | sometimes |
| 114 | `SubBlade` / `SubBladeReverse` / `SubBladeWithStride` | wrapper | n/a (used in BladePIN definitions, not styles) | Multi-blade SubBlade declarations | sometimes |
| 115 | `ClashImpactFX` | function | `[FUNCTION, FUNCTION]` | Clash impact magnitude as a function | sometimes |
| 116 | `Variation` | function | `[]` | Color Change variation index (for ColorSelect) | common |
| 117 | `NoisySoundLevel` | function | `[]` | Audio level (noisy/unsmoothed) | common |
| 118 | `SlowNoise` | function | `[INTEGER]` | Slow random noise function | sometimes |
| 119 | `SmoothStep` already listed | | | | |
| 120 | `LinearSectionF` | function | `[INT, INT, INT, INT]` | Linear ramp between two thresholds | sometimes |
| 121 | `SliceF` | function | `[FUNCTION, INTEGER, INTEGER]` | Slice a function range | sometimes |
| 122 | `ModF` | function | `[FUNCTION, INTEGER]` | Modulo a function output | sometimes |
| 123 | `ClampF` | function | `[FUNCTION, INTEGER, INTEGER]` | Clamp function output to [lo,hi] | sometimes |
| 124 | `HoldPeakF` | function | `[FUNCTION, INTEGER, INTEGER]` | Sample-and-hold peak detector | sometimes |
| 125 | `ThresholdPulseF` | function | `[FUNCTION, INTEGER, INTEGER]` | Pulse on threshold cross | sometimes |
| 126 | `LockupPulseF` | function | `[FUNCTION]` | Pulse pattern for lockup | sometimes |
| 127 | `HumpFlickerFX` | function | `[FUNCTION]` | HumpFlicker as a function (vs color) | sometimes |
| 128 | `RandomPerLEDF` | function | `[]` | Per-LED random function (used in Mix sources) | sometimes |
| 129 | `SparkleF` | function | `[FUNCTION, FUNCTION, FUNCTION]` | Sparkle as a function | sometimes |
| 130 | `StrobeF` | function | `[FUNCTION, FUNCTION, FUNCTION]` | Strobe as a function | sometimes |
| 131 | `InOutFunc` | function | `[INT, INT]` | In/out helper as a function (mask 0..32768) | common |
| 132 | `Ifon` | function | `[INT, INT]` | "If blade is on" branch (returns A on, B off) | sometimes |
| 133 | `Trigger` | function | `[EFFECT, INT, INT, INT]` | Trigger function for TransitionEffectL etc. | common |
| 134 | `EffectPosition` | function | `[EFFECT]` (or `[]`) | Last effect's blade position (for Bump centers) | common |
| 135 | `TimeSinceEffect` | function | `[EFFECT]` | Ms since last instance of EFFECT | common |
| 136 | `EffectIncrement` | function | `[EFFECT, INT, INT]` | Counter that increments on EFFECT | sometimes |
| 137 | `ChangeSlowly` | function | `[FUNCTION, INTEGER]` | Smooth a function with rate-limit | sometimes |
| 138 | `ColorChangeL` | layer | `[FUNCTION, COLOR, COLOR, ...]` | Layer-form ColorChange (rarer) | rare |
| 139 | `ColorSequence` | color | variadic | Sequence of colors (some authors use it) | rare |
| 140 | Named color literals | color | `[]` | `Black`, `White`, `Red`, `Green`, `Blue`, `Yellow`, `Cyan`, `Magenta`, `Orange`, `DeepSkyBlue`, `DodgerBlue` etc. | common |

Total documented: **~140 named templates and enums** (some named-color literals
treated as a single line item). Direct ProffieOS-side template entries: **~110**.

---

## Section 2 — Gap analysis (what we DON'T have today)

KyberStation registry baseline (`packages/codegen/src/templates/*.ts`):

- **colors.ts** — 12 templates: `Rgb`, `RgbArg`, `Mix`, `Gradient`,
  `AudioFlicker`, `StyleFire`, `Pulsing`, `Stripes`, `HumpFlicker`, `Rainbow`,
  `FireConfig`, `RotateColorsX` + 11 named colors.
- **layers.ts** — 11 templates: `Layers`, `BlastL`, `SimpleClashL`,
  `ResponsiveClashL`, `LockupTrL`, `ResponsiveLockupL`, `AudioFlickerL`,
  `AlphaL`, `ResponsiveLightningBlockL`, `TransitionEffectL`, `InOutTrL`.
- **transitions.ts** — 11 templates: `TrInstant`, `TrFade`, `TrWipe`,
  `TrWipeIn`, `TrCenterWipeIn`, `TrSmoothFade`, `TrDelay`, `TrConcat`,
  `TrWipeSparkTip`, `TrSelect`, plus the implicit one already shared.
- **functions.ts** — 12 templates: `Int`, `Scale`, `SwingSpeed`, `Sin`,
  `Bump`, `SmoothStep`, `NoisySoundLevel`, `BatteryLevel`, `BladeAngle`,
  `TwistAngle`, `IntArg`, `IncrementModuloF`.
- **wrappers.ts** — 2: `StylePtr`, `InOutTrL` (duplicate of layers).

**Total: 46 unique templates registered + 11 named colors.**

### Gap by category

#### COLORS — missing (high priority)

- `BrownNoiseFlicker` — Fett263 default flicker for many "stable" presets
- `RandomFlicker`
- `RandomPerLEDFlicker` — gritty look used heavily in Fire/Shock styles
- `ColorChange` — Color Change wheel (mandatory if user toggles Color Change in OS7 Library)
- `ColorSelect` — variant selector for AltF/Variation
- `ColorCycle`
- `Sparkle`
- `Blinking`
- `RandomBlink`
- `HardStripes`
- `Strobe`
- `Cylon` (rare)
- `Rgb16` (rare)
- `RgbCycle` (rare)
- `PixelateX` (rare)
- `ColorSequence` (rare)

Plus expanded named-color set (a few dozen more like `Crimson`,
`PaleGreen`, `Violet`, `MossGreen` — ProffieOS source defines them).

#### LAYERS — missing (high priority)

- `ResponsiveBlastL` — ⚠️ **Fett263 Library default for Blast.** Probably
  the single highest-impact missing template
- `ResponsiveBlastFadeL`
- `ResponsiveBlastWaveL`
- `ResponsiveStabL`
- `ResponsiveDragL`
- `ResponsiveMeltL`
- `EffectSequence` — load-bearing for OS7 Power Save and looping FX
- `TransitionPulseL`
- `TransitionLoop`
- `OnSpark`
- `LocalizedClash`
- `ColorChangeL`
- `Remap` (rare)

Legacy/non-`L` variants we can probably skip but should at least no-op:
- `Blast`, `BlastFadeout`, `OriginalBlast`, `SimpleClash`, `Lockup`, `LockupTr`
- `InOutTr`, `InOutHelper`, `InOutHelperX`, `InOutSparkTip`

#### TRANSITIONS — missing (high priority)

- `TrJoin`, `TrJoinR` — used by OS7 for parallel transition phases
- `TrLoop`, `TrLoopNX`, `TrLoopUntil` — looping transitions are an OS7 feature
- `TrColorCycle`
- `TrFadeX`, `TrWipeX`, `TrWipeInX`, `TrDelayX`, `TrSmoothFadeX`,
  `TrCenterWipeX`, `TrCenterWipeInX` — function-parameterised siblings of
  the constant-ms forms we already have. Common in Fett263 because the
  library lets users wire SwingSpeed/SoundLevel into transition durations
- `TrWaveX`, `TrSparkX`
- `TrWipeInSparkTip`
- `TrRandom`, `TrSequence`
- `TrBlinkX`, `TrBoingX`, `TrExtendX` (sometimes)
- `TrDoEffectX`, `TrDoEffectAlwaysX` (sometimes)

#### FUNCTIONS — missing (high priority)

- `Trigger` — required by `TransitionEffectL` in OS7 form
- `EffectPosition` — feeds `Bump<>` for spatial blast/clash
- `TimeSinceEffect`
- `EffectIncrement`
- `Variation` — ColorChange's color-wheel index
- `Ifon` — branches on blade-on state
- `InOutFunc` — used as opacity mask for in/out
- `ClashImpactFX`
- `ChangeSlowly`
- `LinearSectionF`, `SliceF`, `ModF`, `ClampF`, `HoldPeakF`,
  `ThresholdPulseF`, `LockupPulseF`
- `SlowNoise`
- `RandomPerLEDF`
- `HumpFlickerFX`, `SparkleF`, `StrobeF`

#### WRAPPERS / UTILITY — missing

- `IgnitionDelay`, `RetractionDelay` (sometimes used)
- `DimBlade` (sometimes)
- `LengthFinder`, `DisplayStyle`, `ByteOrderStyle` (rare)

#### EFFECT-ID-ENUM — missing entirely

We currently have `EFFECT` as a generic argType but no documented set of
valid identifiers. The Fett263 library emits 30+ distinct `EFFECT_*` values
across its layer EFFECT slots. Our parser should know they are valid leaf
tokens and not require angle brackets. Same for the `SaberBase::LOCKUP_*`
enum — the lexer change in CLAUDE.md decision #4 makes this lexable;
recognition still has to land in the registry/validator.

### Numeric summary

| Category | Registered | Identified | Missing |
|---|---:|---:|---:|
| Colors | 12 (+ 11 named) | ~30 (+ many named) | ~18 |
| Layers | 11 | ~28 | ~17 |
| Transitions | 11 | ~28 | ~17 |
| Functions | 12 | ~32 | ~20 |
| Wrappers | 2 | ~10 | ~8 |
| Effect/Lockup enums | 0 | ~80+ | ~80+ |
| **Total templates** | **46** | **~110** | **~64** (excluding enums) |

---

## Section 3 — Recommended priority cuts

### Top 30 — covers ~90% of Fett263 OS7 emissions out of the box

If we can only ship a small batch, prioritise the templates whose absence
would cause an immediate parse failure on a stock Fett263 OS7 Library
preset:

1. `ResponsiveBlastL`
2. `ResponsiveBlastFadeL`
3. `ResponsiveStabL`
4. `ResponsiveDragL`
5. `ResponsiveMeltL`
6. `BrownNoiseFlicker`
7. `RandomPerLEDFlicker`
8. `RandomFlicker`
9. `ColorChange`
10. `ColorSelect`
11. `EffectSequence`
12. `Trigger`
13. `EffectPosition`
14. `TimeSinceEffect`
15. `Variation`
16. `Ifon`
17. `InOutFunc`
18. `TrJoin`
19. `TrJoinR`
20. `TrLoop`
21. `TrLoopNX`
22. `TrColorCycle`
23. `TrFadeX`
24. `TrWipeX`
25. `TrWipeInX`
26. `TrDelayX`
27. `OnSpark`
28. EFFECT_* enum recognition (one-shot — register all ~50 valid identifiers)
29. SaberBase::LOCKUP_* enum recognition (one-shot — ~7 values)
30. `LocalizedClash`

### Top 60 — clears the long-tail OS7 emission surface

Add to top 30:

31. `ResponsiveBlastWaveL`
32. `TransitionPulseL`
33. `TransitionLoop`
34. `Sparkle`
35. `Blinking`
36. `Strobe`
37. `RandomBlink`
38. `HardStripes`
39. `ColorCycle`
40. `IgnitionDelay`
41. `RetractionDelay`
42. `DimBlade`
43. `TrSmoothFadeX`
44. `TrCenterWipeX`
45. `TrCenterWipeInX`
46. `TrWaveX`
47. `TrSparkX`
48. `TrWipeInSparkTip`
49. `TrLoopUntil`
50. `TrRandom`
51. `TrSequence`
52. `ChangeSlowly`
53. `LinearSectionF`
54. `SliceF`
55. `ModF`
56. `ClampF`
57. `HoldPeakF`
58. `ThresholdPulseF`
59. `SlowNoise`
60. `RandomPerLEDF`

### Top 80 — full coverage including legacy and rare

Add to top 60:

61. `EffectIncrement`
62. `ClashImpactFX`
63. `LockupPulseF`
64. `HumpFlickerFX`
65. `SparkleF`
66. `StrobeF`
67. `ColorSequence`
68. `ColorChangeL`
69. `Cylon`
70. `Rgb16`
71. `RgbCycle`
72. `PixelateX`
73. `ByteOrderStyle`
74. `Remap`
75. `LengthFinder`
76. `DisplayStyle`
77. `Sequence`
78. `TrBlinkX`
79. `TrBoingX`
80. `TrExtendX`

Plus legacy non-`L` forms (`Blast`, `Lockup`, `LockupTr`, `BlastFadeout`,
`OriginalBlast`, `SimpleClash`, `InOutTr`, `InOutHelper`, `InOutHelperX`,
`InOutSparkTip`) registered as parse-only no-ops so older configs
(pre-OS6 hand-written, Fredrik Style Editor exports) at least don't error.

Plus expanded named-color literals (~30 more from ProffieOS's
`color.h`).

---

## Section 4 — Fett263-specific patterns needing ConfigReconstructor changes

These are not just template additions — they need parser-side
recognition for the round-trip to be lossless.

### 4.1 The OS7 layer sandwich

Every Fett263 OS7 preset emits **the same outer `Layers<>` shape** with the
same set of effect overlays in the same order. Our `ConfigReconstructor`
should treat this as a recognized macro shape:

```
StylePtr<Layers<
  <BASE_COLOR_OR_FLICKER>,                    // base color
  ResponsiveLightningBlockL<...>,              // force lightning block
  ResponsiveStabL<...>,                        // stab
  ResponsiveBlastL<...>,                       // blast
  ResponsiveClashL<...>,                       // clash
  LockupTrL<..., SaberBase::LOCKUP_NORMAL>,    // lockup
  LockupTrL<..., SaberBase::LOCKUP_DRAG>,      // drag
  ResponsiveLockupL<..., SaberBase::LOCKUP_LIGHTNING_BLOCK>, // lightning block
  ResponsiveMeltL<...>,                        // melt
  TransitionEffectL<TrConcat<...>, EFFECT_USER1>, // OS7 user FX 1
  TransitionEffectL<TrConcat<...>, EFFECT_USER2>, // OS7 user FX 2
  ...
  TransitionEffectL<TrConcat<...>, EFFECT_PREON>, // preon
  InOutTrL<TrWipe<300>, TrWipeIn<500>>          // ignition/retraction
>>
```

Implication: `ConfigReconstructor` should pattern-match this layer order
and map each slot to its semantic role (`bladeBase`, `clashLayer`,
`blastLayer`, `lockupLayer`, etc.) rather than treating every layer as a
generic "layer N." Fett263's OS7 Library is essentially a UI over THIS
exact tree shape.

### 4.2 `EffectSequence` for Power Save / looping FX

Per the docs ("To use Power Save requires AlphaL based EffectSequence in
style"), `EffectSequence` is the pattern for any preset where the user
toggled Power Save mode. Shape:

```
EffectSequence<EffectIncrement<EFFECT_USER1, ...>,
  AlphaL<COLOR_A, FUNCTION_A>,
  AlphaL<COLOR_B, FUNCTION_B>,
  ...
>
```

Reconstructor implication: when we see `EffectSequence` we should expose
each child `AlphaL` as a separately-editable "FX step" in the UI, and the
selector function as the cycle source. Not just a generic layer.

### 4.3 `TransitionEffectL` two argument forms

OS7 (current): `TransitionEffectL<TRANSITION, EFFECT>` — typically
`TransitionEffectL<TrConcat<TrInstant, COLOR, TrFade<400>>, EFFECT_CLASH>`.

Pre-OS7 (Fredrik Style Editor): `TransitionEffectL<COLOR, TR_IN, TR_OUT,
EFFECT>` — the form our registry currently knows.

Both forms appear in the wild. Our parser should handle both — branch on
arg-count and disambiguate the first arg by node type (`TRANSITION` node
vs `COLOR` node). The current registry single signature would reject
the OS7 form.

### 4.4 `TrConcat` intermediate-color positions

Per the official `TrConcat` doc: optional intermediate `COLOR` nodes can
appear between transition arguments to control the color the
intermediate state lands on:

```
TrConcat<TrInstant, Red, TrWipeIn<700>, White, TrFade<700>>
```

Our parser registers `TrConcat` with `argTypes: ['TRANSITION',
'TRANSITION']` — which is wrong on three counts: variadic arity,
intermediate-color positions, and even arity assumption. Fix: register
as variadic with a custom validator that allows the
`TR (COLOR? TR)*` shape.

### 4.5 `TrSelect` is variadic

We register `TrSelect` as `[FUNCTION, TRANSITION, TRANSITION]` (3-way) but
the canonical signature accepts N transitions selected by a function
returning 0..N-1. Fett263 commonly uses 2- and 3-way; our restriction
will reject 4+.

### 4.6 Function-parameterised X transitions are first-class in Fett263

Anywhere the OS7 Library lets the user wire SwingSpeed → ignition
duration, it emits `TrFadeX<Scale<SwingSpeed<...>, Int<200>, Int<800>>>`
not `TrFade<400>`. The X-suffixed transition siblings are not "rare" —
they are the default once a user picks anything but a constant duration.
Top-30 has them.

### 4.7 `Trigger` function syntax

Several OS7 layers use `Trigger<EFFECT_USER1, Int<200>, Int<2000>,
Int<200>>` as a function input — mid-effect ramp/sustain/decay timing.
Our function registry doesn't have it, which would break any
`TransitionPulseL<Trigger<...>>` shape.

### 4.8 EFFECT and LOCKUP_TYPE leaf tokens

These appear bare in the source, no angle brackets:

```
LockupTrL<..., SaberBase::LOCKUP_NORMAL>
TransitionEffectL<..., EFFECT_CLASH>
```

The lexer change in CLAUDE.md decision #4 (consume `::`) lets the parser
read them, but the validator should also recognize them as valid
identifier leaves of the right kind. Suggestion: add a string set to the
validator (`KNOWN_EFFECT_IDS`, `KNOWN_LOCKUP_TYPES`) keyed by the
documented `EFFECT_*` and `LOCKUP_*` lists. Unknown values become
warnings, not errors.

### 4.9 `RotateColorsX<Variation, COLOR>` is the Color Change adjuster

When a user enables Color Change in the OS7 Library, the BASE color is
typically wrapped in `RotateColorsX<Variation, ORIGINAL_COLOR>`. Our
registry knows `RotateColorsX` but not `Variation`. Without `Variation`
the parser will fall through to "unknown function" and likely drop the
Color Change adjust on round-trip.

### 4.10 ColorChange vs ColorSelect distinction

`ColorChange<TRANSITION, COLORS...>` is the user-facing wheel (12-step
ratchet with sound feedback). `ColorSelect<FUNCTION, TRANSITION,
COLORS...>` is the function-driven select (Variation, AltF, etc.). The
two emit similar code but mean different things. The reconstructor
should map them to different UI surfaces — ColorChange to the Color
Change setup panel, ColorSelect to the variation/alt-color editor.

---

## Sources

- [ProffieOS Documentation index (all_pages.html)](https://pod.hubbe.net/all_pages.html)
- [ProffieOS Single-page docs (POD.html)](https://pod.hubbe.net/POD.html)
- [ProffieOS Blade Style category](https://pod.hubbe.net/config/styles/)
- [ProffieOS ColorChange/Select docs](https://pod.hubbe.net/config/color-change.html)
- [ProffieOS Blade EFFECTs](https://pod.hubbe.net/config/styles/blade-effects.html)
- [ProffieOS TrConcat docs](https://pod.hubbe.net/config/transitions/TrConcat.html)
- [Fett263 OS7 Style Library](https://www.fett263.com/fett263-proffieOS7-style-library.html)
- [Introduction to ProffieOS7 (Fett263)](https://www.fett263.com/proffieOS7-intro.html)
- [Fett263 Phase 3 Q&A thread](https://crucible.hubbe.net/t/proffieos7-style-library-phase-3-early-access-q-a/5006)
- [ProffieOS Style Editor (Fredrik)](https://fredrik.hubbe.net/lightsaber/style_editor.html)
- [ProffieOS source: profezzorn/ProffieOS](https://github.com/profezzorn/ProffieOS)
- [Fett263 buttons prop file](https://github.com/profezzorn/ProffieOS/blob/master/props/saber_fett263_buttons.h)
