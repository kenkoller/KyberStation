# New Blade Effects Roadmap

Implementation priority for new styles, effects, ignitions, and retractions.
All designed for 144-LED WS2812B strips at 60fps.

## Priority 1 (High Wow Factor, Moderate Difficulty)

### Shockwave (Effect)
Bright ring expands outward from clash point in both directions, dimming as it travels.
- On trigger, record impact position
- Expand ring at ~2 LEDs/frame, 3-4 LEDs wide
- Additively blend white, kill after exiting both ends

### Crackle (Ignition)
Random segments flicker on during ignition, like unstable power-up.
- Per-LED probability increases from 0% to 100% over duration
- Lit LEDs occasionally flicker off until 80% progress
- Result: chaotic, organic fill-in

### Gravity (Style)
Color pools toward whichever end points down, using accelerometer.
- Use bladeAngle to compute gravity center
- Gaussian distribution centered on gravity point (sigma ~30 LEDs)
- Smooth with exponential moving average

### Dissolve (Retraction)
Pixels randomly turn off like analog TV static dying.
- Random permutation of LED indices at trigger
- Turn off in order over duration
- 2-frame flicker before each LED dies

## Priority 2 (High Impact)

| Name | Type | Wow | Difficulty |
|------|------|-----|------------|
| DataStream | Style | 5/5 | Medium |
| Scatter | Effect | 5/5 | Medium |
| Fragment | Effect | 5/5 | Medium |
| Fracture | Ignition | 5/5 | Hard |
| FlickerOut | Retraction | 5/5 | Medium |
| Unravel | Retraction | 5/5 | Medium |

## Priority 3 (Solid Additions)

| Name | Type | Wow | Difficulty |
|------|------|-----|------------|
| Ember | Style | 4/5 | Medium |
| Automata | Style | 4/5 | Medium |
| Helix | Style | 4/5 | Easy |
| Candle | Style | 4/5 | Medium |
| Shatter | Style | 4/5 | Medium |
| Neutron | Style | 4/5 | Easy |
| Ripple | Effect | 4/5 | Medium |
| Freeze | Effect | 4/5 | Easy |
| Overcharge | Effect | 4/5 | Medium |
| Bifurcate | Effect | 4/5 | Medium |
| FlashFill | Ignition | 4/5 | Easy |
| PulseWave | Ignition | 4/5 | Easy |
| DripUp | Ignition | 4/5 | Medium |
| Drain | Retraction | 4/5 | Medium |
| Implode | Retraction | 4/5 | Easy |

## Priority 4 (Nice to Have)

| Name | Type | Wow | Difficulty |
|------|------|-----|------------|
| Torrent | Style | 3/5 | Medium |
| Moire | Style | 3/5 | Easy |
| Cascade | Style | 3/5 | Easy |
| Vortex | Style | 3/5 | Easy |
| Invert | Effect | 3/5 | Easy |
| GhostEcho | Effect | 3/5 | Medium |

## Implementation Notes

All algorithms are documented with per-LED math in the research output.
Files to create: one class per new behavior in the appropriate directory:
- `packages/engine/src/styles/` for new styles
- `packages/engine/src/effects/` for new effects
- `packages/engine/src/ignition/` for new ignitions
