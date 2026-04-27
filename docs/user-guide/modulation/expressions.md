# Expression Language Reference

> **BETA** — the expression editor (the `fx` button on every slider) ships post-v1.0 polish. The engine-side parser + evaluator are live today; this page describes the surface. The full grammar lives at [`packages/engine/src/modulation/grammar.peggy`](../../../packages/engine/src/modulation/grammar.peggy) for the syntax-curious.

---

Every modulation binding can be a simple wire (`swing → shimmer`) — or it can be a math expression that combines several modulators. Click the **`fx`** button next to any numeric slider to open the editor.

This page is the cheat sheet.

## Variables

The 11 modulator IDs are your variables. Reference them bare:

```
swing
angle
twist
sound
battery
time
clash
lockup
preon
ignition
retraction
```

Anything else is an unknown ID and evaluates to `0`. The editor underlines unknown IDs in yellow so you catch typos.

See [Modulators](./modulators.md) for the gesture each one represents and its value range.

## Operators

Standard arithmetic, with the precedence you'd expect:

| Operator | Meaning |
|---|---|
| `+` | Add |
| `-` | Subtract (or unary minus: `-swing`) |
| `*` | Multiply |
| `/` | Divide |
| `( )` | Grouping |

`swing * 2 + 0.1` and `(swing * 2) + 0.1` mean the same thing.

## Built-in functions

Ten functions ship in v1.0. No user-defined functions — those land in [v1.2 Routing Creative](../../MODULATION_ROUTING_ROADMAP.md).

| Function | Arity | Signature | Example |
|---|---|---|---|
| `min` | 2 | `min(a, b)` | `min(swing, sound)` — quieter wins |
| `max` | 2 | `max(a, b)` | `max(swing, sound)` — louder wins |
| `clamp` | 3 | `clamp(x, lo, hi)` | `clamp(swing * 2, 0, 1)` — amplify swing, cap at 1 |
| `lerp` | 3 | `lerp(a, b, t)` | `lerp(0.2, 1.0, clash)` — fade from 20% to 100% with clash |
| `sin` | 1 | `sin(x)` (radians) | `sin(time * 0.001)` — 1 Hz sine wave |
| `cos` | 1 | `cos(x)` (radians) | `cos(angle * 3.14)` — orient-dependent |
| `abs` | 1 | `abs(x)` | `abs(angle)` — care about magnitude, not direction |
| `floor` | 1 | `floor(x)` | `floor(time * 0.001)` — quantized seconds |
| `ceil` | 1 | `ceil(x)` | rarely useful in practice |
| `round` | 1 | `round(x)` | `round(swing * 4) / 4` — quantize to 5 steps |

Functions are case-sensitive. `Sin(time)` won't parse — use `sin(time)`.

## Five worked examples

These are the same five chips inside the expression editor's quick-pick row. Click one to drop it into the textarea, then tweak.

### 1. Breathing Blade

```
sin(time * 0.001) * 0.5 + 0.5
```

A 1 Hz sine wave, remapped from `-1..1` to `0..1`. Drives slow rhythmic pulses. Try wiring it to `shimmer` with combinator `replace`.

### 2. Heartbeat

```
abs(sin(time * 0.002))
```

`abs()` flips the negative half of the sine wave upward — you get two pulses per cycle, sharper than Breathing. At 2 Hz this reads as a slightly anxious heartbeat. Sith-coded.

### 3. Battery Dim

```
clamp(1 - battery, 0, 0.5)
```

When battery is full (`1.0`), this returns `0`. When battery hits `0.5`, this returns `0.5` — capped. Wire it to `shimmer` with `multiply` to fade the blade as the battery drains, but never below half-dim.

### 4. Swing Doubled

```
clamp(swing * 2, 0, 1)
```

Amplifies swing — small motions read bigger. Cap at 1.0 so you don't overflow the parameter. Useful when your swing range feels too subtle to drive a dramatic effect.

### 5. Loud OR Fast

```
max(sound, swing)
```

Whichever is louder right now drives the output. Pairs well with `replace` — single source of truth for "blade activity," whatever's causing it.

## Common patterns

A few moves that come up a lot:

- **Remap `-1..1` to `0..1`:** `(x + 1) * 0.5` (or `lerp(0, 1, (x + 1) * 0.5)` if you want explicit endpoints)
- **Invert a 0..1 signal:** `1 - x`
- **Threshold:** `clamp(x - 0.5, 0, 0.5) * 2` — value below 0.5 reads as 0, above ramps up to 1
- **Square wave at 2 Hz:** `floor(sin(time * 0.012) + 1)` — hacky, but works until [LFO shapes](../../MODULATION_ROUTING_ROADMAP.md) land in v1.2

## What you can't do (yet)

- **Conditionals (`if`, `?:`)** — coming in v1.2. For now, `lerp` + `clamp` covers most cases.
- **`config.*` references** — also v1.2. You can't yet write `lerp(baseColor.r, clashColor.r, clash)`.
- **User-defined functions (`def f(x) = ...`)** — v1.2.
- **Strings, booleans, arrays** — never. Everything is a number.
- **Bitwise ops (`&`, `|`, `^`, `~`, `<<`, `>>`)** — never. Wrong tool for the job.

For full grammar specifics, see the design doc at [`docs/MODULATION_ROUTING_V1.1.md`](../../MODULATION_ROUTING_V1.1.md) §4 or the actual peggy grammar at [`packages/engine/src/modulation/grammar.peggy`](../../../packages/engine/src/modulation/grammar.peggy).
