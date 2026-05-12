# New Blade Effects Roadmap

Implementation priority for new styles, effects, ignitions, and retractions.
All designed for 144-LED WS2812B strips at 60fps.

**Status: All Priority 1--4 items are fully implemented. Engine totals: 29 styles, 21 effects, 19 ignitions, 13 retractions (82 animation components).**

## Priority 1 (High Wow Factor, Moderate Difficulty) COMPLETE

### Shockwave (Effect)
Bright ring expands outward from clash point in both directions, dimming as it travels.
- On trigger, record impact position
- Expand ring at ~2 LEDs/frame, 3-4 LEDs wide
- Additively blend white, kill after exiting both ends

✅ **Implemented:** `packages/engine/src/effects/ShockwaveEffect.ts` — Two Gaussian wavefronts from impact point.

### Crackle (Ignition)
Random segments flicker on during ignition, like unstable power-up.
- Per-LED probability increases from 0% to 100% over duration
- Lit LEDs occasionally flicker off until 80% progress
- Result: chaotic, organic fill-in

✅ **Implemented:** `packages/engine/src/ignition/CrackleIgnition.ts` — Per-LED probability ramp with flicker.

### Gravity (Style)
Color pools toward whichever end points down, using accelerometer.
- Use bladeAngle to compute gravity center
- Gaussian distribution centered on gravity point (sigma ~30 LEDs)
- Smooth with exponential moving average

✅ **Implemented:** `packages/engine/src/styles/GravityStyle.ts` — Maps bladeAngle to gravity center with Gaussian distribution, EMA smoothing.

### Dissolve (Retraction)
Pixels randomly turn off like analog TV static dying.
- Random permutation of LED indices at trigger
- Turn off in order over duration
- 2-frame flicker before each LED dies

✅ **Implemented:** `packages/engine/src/ignition/DissolveRetraction.ts` — Fisher-Yates shuffle random turn-off order.

## Priority 2 (High Impact) COMPLETE

| Name | Type | Wow | Difficulty | Status |
|------|------|-----|------------|--------|
| DataStream | Style | 5/5 | Medium | ✅ `styles/DataStreamStyle.ts` |
| Scatter | Effect | 5/5 | Medium | ✅ `effects/ScatterEffect.ts` |
| Fragment | Effect | 5/5 | Medium | ✅ `effects/FragmentEffect.ts` |
| Fracture | Ignition | 5/5 | Hard | ✅ `ignition/FractureIgnition.ts` |
| FlickerOut | Retraction | 5/5 | Medium | ✅ `ignition/FlickerOutRetraction.ts` |
| Unravel | Retraction | 5/5 | Medium | ✅ `ignition/UnravelRetraction.ts` |

## Priority 3 (Solid Additions) COMPLETE

| Name | Type | Wow | Difficulty | Status |
|------|------|-----|------------|--------|
| Ember | Style | 4/5 | Medium | ✅ `styles/EmberStyle.ts` |
| Automata | Style | 4/5 | Medium | ✅ `styles/AutomataStyle.ts` |
| Helix | Style | 4/5 | Easy | ✅ `styles/HelixStyle.ts` |
| Candle | Style | 4/5 | Medium | ✅ `styles/CandleStyle.ts` |
| Shatter | Style | 4/5 | Medium | ✅ `styles/ShatterStyle.ts` |
| Neutron | Style | 4/5 | Easy | ✅ `styles/NeutronStyle.ts` |
| Ripple | Effect | 4/5 | Medium | ✅ `effects/RippleEffect.ts` |
| Freeze | Effect | 4/5 | Easy | ✅ `effects/FreezeEffect.ts` |
| Overcharge | Effect | 4/5 | Medium | ✅ `effects/OverchargeEffect.ts` |
| Bifurcate | Effect | 4/5 | Medium | ✅ `effects/BifurcateEffect.ts` |
| FlashFill | Ignition | 4/5 | Easy | ✅ `ignition/FlashFillIgnition.ts` |
| PulseWave | Ignition | 4/5 | Easy | ✅ `ignition/PulseWaveIgnition.ts` |
| DripUp | Ignition | 4/5 | Medium | ✅ `ignition/DripUpIgnition.ts` |
| Drain | Retraction | 4/5 | Medium | ✅ `ignition/DrainRetraction.ts` |
| Implode | Retraction | 4/5 | Easy | ✅ `ignition/ImplodeRetraction.ts` |

## Priority 4 (Nice to Have) COMPLETE

| Name | Type | Wow | Difficulty | Status |
|------|------|-----|------------|--------|
| Torrent | Style | 3/5 | Medium | ✅ `styles/TorrentStyle.ts` |
| Moire | Style | 3/5 | Easy | ✅ `styles/MoireStyle.ts` |
| Cascade | Style | 3/5 | Easy | ✅ `styles/CascadeStyle.ts` |
| Vortex | Style | 3/5 | Easy | ✅ `styles/VortexStyle.ts` |
| Invert | Effect | 3/5 | Easy | ✅ `effects/InvertEffect.ts` |
| GhostEcho | Effect | 3/5 | Medium | ✅ `effects/GhostEchoEffect.ts` |

## Implementation Notes

All algorithms are documented with per-LED math in the research output.
Files to create: one class per new behavior in the appropriate directory:
- `packages/engine/src/styles/` for new styles
- `packages/engine/src/effects/` for new effects
- `packages/engine/src/ignition/` for new ignitions
