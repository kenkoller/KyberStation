# Combinator Cookbook

> **BETA** — all 5 combinators ship in v1.0. The math behavior described here is the same now and forever.

---

When you wire a modulator to a parameter, you also pick **how** the modulator's value combines with the static value sitting in the slider. That choice — the **combinator** — is what most people get wrong on their first patch.

This page builds the intuition.

## The five combinators

For every example below, assume the parameter is `shimmer`, sitting at a static value of `0.3`. The modulator is `swing`, currently reading `0.6`. The amount is `50%` (so the wet contribution is `0.6 × 0.5 = 0.3`).

| Combinator | Formula | Result | When you'd pick it |
|---|---|---|---|
| **Replace** | `wet` | `0.3` | When the modulator should fully take over the parameter. The static slider becomes a fallback that disappears the moment the wire connects. |
| **Add** | `static + wet` | `0.6` | When you want the modulator to *contribute on top of* the static value. Most common pick for shimmer / brightness / accent reactivity. |
| **Multiply** | `static × wet` | `0.09` | When you want the modulator to *gate* the static value. Multiply by 0 silences. Multiply by 1 leaves it unchanged. Good for fade-with-battery patches. |
| **Min** | `min(static, wet)` | `0.3` | When the modulator should act as a **ceiling** — never let the parameter rise above the modulator's reading. Niche but powerful for safety-clamp patterns. |
| **Max** | `max(static, wet)` | `0.3` | When the modulator should act as a **floor** — never let the parameter drop below the modulator's reading. The right pick for clash-flash, where you want a guaranteed minimum brightness during the strike. |

## Picking by feel

Forget the math for a second. These are the questions to ask:

- **"I want the slider to still mean something."** → Add or Multiply. The static value stays in the loop.
- **"I want the modulator to fully drive this."** → Replace. The slider becomes a documentation thing.
- **"I want a guaranteed minimum / maximum during strikes."** → Max for floor, Min for ceiling.
- **"I want to fade everything out when X happens."** → Multiply with the inverse of X (e.g. `1 - battery → shimmer · multiply`).

## Stacking combinators

Two bindings on the same target apply in **authoring order** — top to bottom in the binding list. Combinators stack:

```
Starting:  shimmer = 0.3
Binding 1: swing → shimmer · add · 50%      → (swing 0.6 × 0.5 = 0.3)  → 0.3 + 0.3 = 0.6
Binding 2: sound → shimmer · multiply · 50% → (sound 0.4 × 0.5 = 0.2)  → 0.6 × 0.2 = 0.12
```

A `Replace` binding **clears the accumulator** — anything wired before it gets dropped. So:

```
Starting:    shimmer = 0.3
Binding 1:   swing  → shimmer · add · 50%      → 0.6
Binding 2:   sound  → shimmer · replace · 100% → sound's value, 0.4
```

The swing binding is functionally dead. The UI flags this so you don't ship a confused patch.

## When in doubt

Start with **Add** at 50%. Listen to the result. If the parameter never rises high enough, push toward Replace at 100%. If it pegs at maximum, switch to Multiply or drop the amount.

The combinator is a creative choice, not a correctness one. Read [Recipes](./recipes.md) for what each pick *feels* like in practice.
