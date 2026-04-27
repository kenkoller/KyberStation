# Patterns from Film and Lore

> **BETA** — most of these patterns lean on the v1.1 expression editor. The wirings are honest reverse-engineering of how each canon saber reads on screen, not licensed reproductions. Use them as starting points and tune to taste.

---

Canon as curriculum. Each saber on this page has a distinct visual signature — a way it behaves on screen that distinguishes it from a generic saber-of-color-X. Recreating those signatures with modulation is a great way to internalize the patch language.

These aren't presets to load — they're patterns you build yourself. The starter [recipes](./recipes.md) are simpler; this is the next step up.

## Kylo Ren — unstable crackle

**The signature:** the broken kyber crystal in Kylo's saber makes the blade buzz, sputter, and throw off lateral sparks. It's barely contained.

**The wiring** (v1.1+):

| Source | Target | Combinator | Amount |
|---|---|---|---|
| `swing * 0.5 + sin(time * 0.05) * 0.5` | `shimmer` | `replace` | 100% |
| `clash` | `baseColor.r` | `add` | 30% |

The first binding combines a swing reactor with a fast (~8 Hz) wobble — this is the constant unstable crackle. The second nudges color hotter on every clash for the cross-guard quillon flare.

In v1.0, you can approximate the static crackle by setting `style: 'unstable'` on the engine side, then layering only `swing → shimmer · add`. You won't get the time-LFO wobble until expressions ship.

## Darth Maul — dueling flicker

**The signature:** Maul's saber is mostly stable until combat, then the saturation pulses with each parry. Aggressive, focused.

**The wiring** (v1.0):

| Source | Target | Combinator | Amount |
|---|---|---|---|
| `swing` | `colorSaturation` | `add` | 70% |
| `clash` | `shimmer` | `max` | 100% |

Pure swing-driven. The blade sits calm at rest and explodes with energy when you move it. Pair with `style: 'stable'` and a deep-red base color. The clash binding adds the sharp flicker on impact.

## Anakin (Mustafar) — burn-in

**The signature:** during the Mustafar duel, the blade reads as if it's been heat-soaked — a slow red bleed that pulses through the center. Anger barely held.

**The wiring** (v1.1+):

| Source | Target | Combinator | Amount |
|---|---|---|---|
| `sin(time * 0.0005) * 0.5 + 0.5` | `baseColor.r` | `add` | 25% |
| `swing` | `shimmer` | `add` | 50% |

The slow LFO (~0.08 Hz) pumps red into the blade every ~12 seconds. Subtle enough that you don't consciously notice it, but the blade feels *off* in a way that's hard to articulate. Combined with a mostly-blue base color you get the Episode III emotional read — Jedi blue, but something underneath is wrong.

In v1.0, drop the time LFO and you get the swing-reactive shimmer half — still good, just less iconic.

## Qui-Gon Jinn — calm blade

**The signature:** Qui-Gon's saber is the most "centered" lightsaber on screen. It barely reacts to anything — just a slow, patient breathing rhythm. Steady as the man.

**The wiring** (v1.1+):

| Source | Target | Combinator | Amount |
|---|---|---|---|
| `sin(time * 0.0005) * 0.15 + 0.85` | `shimmer` | `replace` | 100% |

That's it. One LFO, mapped to a tight range (0.7..1.0), so the blade *almost* doesn't move. The discipline of *not* wiring swing or sound is what makes this read as Qui-Gon and not somebody else. Resist the urge to add more.

In v1.0, you can fake it with `time → shimmer` clamped to a small range — but without `sin()`, the breathing rhythm won't be there.

## Ahsoka — white precision

**The signature:** Ahsoka's white sabers are the cleanest blades in canon. Sharp ignition, sharp retraction, sharp clashes. No mush. They feel surgical.

**The wiring** (v1.0):

| Source | Target | Combinator | Amount |
|---|---|---|---|
| `swing` | `shimmer` | `add` | 40% |
| `clash` | `shimmer` | `max` | 100% |

The base config carries the precision — short ignition (~150ms), short retraction, white base color, low static shimmer. The modulation layer is intentionally minimal: subtle swing reactivity plus a hard clash floor. The visual discipline is in the *parameter* values, not the wiring.

Aspirationally, in v1.1+, you could square the swing curve (`pow(swing, 2)` arrives in v1.2) so small motions read as nothing and only sharp cuts trigger the accent — but the v1.0 version is already 80% of the way there.

## Roll your own

The pattern across all five sabers above:

1. **Identify the signature** — what's the *one thing* this blade does that others don't?
2. **Pick the modulator(s)** that produce that thing — usually one or two, never five.
3. **Pick combinators** that compose without fighting — start with `add` and `max`, escalate to `replace` only when the static value should disappear.
4. **Resist adding more.** Distinct blades are usually sparse, not dense.

When you build something that reads as canon, please share it — see [Sharing](./sharing.md).
