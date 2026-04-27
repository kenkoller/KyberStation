# The 11 Modulators

> **BETA** — v1.0 surfaces 5 modulators in the UI: `swing`, `angle`, `sound`, `time`, `clash`. The other 6 (`twist`, `battery`, `lockup`, `preon`, `ignition`, `retraction`) are scaffolded in the engine and arrive in the [v1.1 Routing Core](../../MODULATION_ROUTING_ROADMAP.md). Source of truth: [`packages/engine/src/modulation/registry.ts`](../../../packages/engine/src/modulation/registry.ts).

---

A modulator is just a live signal — a number, between 0 and 1 (or sometimes -1 and 1), updating dozens of times per second. The whole modulation system is a way of plugging those signals into your blade's parameters.

Here are the 11 KyberStation ships with.

## Motion modulators

| ID | What produces it | Range | Smoothing | Common targets |
|---|---|---|---|---|
| **`swing`** *(v1.0)* | Phone shake, mouse shake in the editor's motion sim | `0..1` | 0.35 (slow response) | `shimmer`, `colorHueShiftSpeed`, accent-color channels |
| **`angle`** *(v1.0)* | Tilt your phone up/down, drag the angle slider in motion sim | `-1..1` (down to up) | 0.20 | `baseColor.r`, `baseColor.b`, brightness fields |
| **`twist`** *(v1.1+)* | Wrist rotation around the blade's long axis | `-1..1` | 0.20 | `colorHueShiftSpeed`, accent positions |

These are your gesture-reactive primitives. Swing is the everyday workhorse — it's what makes a blade feel "alive" without you having to design anything fancy. Angle and twist are the ones that surprise people.

## Audio modulators

| ID | What produces it | Range | Smoothing | Common targets |
|---|---|---|---|---|
| **`sound`** *(v1.0)* | Speak / sing into the mic, or play music nearby | `0..1` (RMS envelope) | 0.50 (slowest of the bunch) | `baseColor.b`, `shimmer`, `motionSwingColorShift.*` |

One of the more dramatic patches you can build. Wire `sound → baseColor.b` and your saber turns into a music visualizer.

## Power modulators

| ID | What produces it | Range | Smoothing | Common targets |
|---|---|---|---|---|
| **`battery`** *(v1.1+)* | Battery state of charge | `0..1` | 0 (no smoothing — direct read) | `shimmer · multiply`, brightness fields |

The patch nobody asks for but everyone wants once they see it: `clamp(1 - battery, 0, 0.5) → brightness · multiply` automatically dims your saber as it drains. Saves runtime, looks intentional.

## Time modulator

| ID | What produces it | Range | Smoothing | Common targets |
|---|---|---|---|---|
| **`time`** *(v1.0)* | A clock, in milliseconds since the editor started ticking | `0..2³² ms` | 0 | Almost always wrapped in `sin(time * 0.001)` or similar |

`time` on its own isn't useful — it just counts up forever. Wrap it in `sin()` or `cos()` and you get an LFO (low-frequency oscillator) — that's what powers the Breathing Blade and Heartbeat Pulse [recipes](./recipes.md).

A useful conversion: `time * 0.001` ticks at roughly 1 Hz. `time * 0.002` is 2 Hz. Multiply by 0.0005 for slow drifts.

## Combat modulators

| ID | What produces it | Range | Smoothing | Common targets |
|---|---|---|---|---|
| **`clash`** *(v1.0)* | Striking the saber against something (or pressing the CLASH button) | `0..1`, latched at impact, decays over ~250ms | 0 (decay-only) | `shimmer · max`, color channels |
| **`lockup`** *(v1.1+)* | Holding the lockup button (or sustained-impact gesture) | `0` or `1` | 0 | Often paired with `replace` for during-lockup overrides |

Clash is special — it doesn't ramp up smoothly. It snaps to 1.0 at impact and exponentially decays. Wire it with `max` combinator so you get a guaranteed bright pulse on every strike.

## Lifecycle modulators

| ID | What produces it | Range | Smoothing | Common targets |
|---|---|---|---|---|
| **`preon`** *(v1.1+)* | Pre-ignition priming progress | `0..1` | 0 | Color channels for the pre-ignition glow |
| **`ignition`** *(v1.1+)* | Blade-extending progress | `0..1` | 0 | `shimmer`, brightness during the wipe |
| **`retraction`** *(v1.1+)* | Blade-retracting progress | `0..1` | 0 | Color shift on retract |

These four (`clash` plus the three lifecycle modulators) are the "event" modulators — they don't run continuously like swing or sound, they trigger and decay. Treat them as accents, not steady-state drivers.

## Smoothing — what does it actually do?

Every modulator carries a default smoothing coefficient. Higher = the value lags behind the raw input. This matters because raw motion data is jumpy — a phone accelerometer sees micro-vibrations you don't, and unsmoothed values would make the blade twitch unpleasantly.

You can't override smoothing in the UI today. The defaults are well-tuned. (Per-binding smoothing override is queued for v1.2 per the [roadmap](../../MODULATION_ROUTING_ROADMAP.md).)

## What's not a modulator

- **Enums** like `style`, `ignition`, `blendMode` aren't modulators — they're discrete choices, not numbers. Modulating them doesn't make sense. Use [button routing](../../MODULATION_ROUTING_ROADMAP.md) (v1.1+) to swap them on gesture events.
- **Aux/gesture button events** (`aux1.held`, `gesture.swing`) become first-class modulators in v1.1. Today they only flow through the prop file's button map.

Up next: [Combinators](./combinators.md) for picking how a modulator combines with the static value, or [Expressions](./expressions.md) for combining multiple modulators with math.
