# Recipes to Steal

> **BETA** — recipes marked **v1.0** ship with the public BETA today. Recipes marked **v1.1+** need the math-expression editor that arrives in [Routing Core](../../MODULATION_ROUTING_ROADMAP.md). The ones that say **v1.2+** need conditionals or modulator chains and arrive later still.

---

Wiring is the easy part. Knowing what to wire is where this page comes in. Each recipe below is a one-line patch you can build in under a minute. Steal freely.

Every recipe will eventually ship as a one-click [Kyber Glyph](./sharing.md) import. For today, follow the wiring column and rebuild it in the editor — same result, slower keystrokes.

## The ten

| # | Recipe | Wiring | What you'll feel |
|---|---|---|---|
| 1 | **Reactive Shimmer** *(v1.0)* | `swing → shimmer · add · 60%` | Hold still, blade is calm. Swing it, surface comes alive. The "hello world" patch. ([Glyph: TBD](./recipes/reactive-shimmer.glyph)) |
| 2 | **Sound-Reactive Music Saber** *(v1.0)* | `sound → baseColor.b · add · 70%` | Speak or play music near your phone — blade pushes blue with every syllable. Display-stand favorite. ([Glyph: TBD](./recipes/music-saber.glyph)) |
| 3 | **Tip-Bright-When-Up** *(v1.0)* | `angle → baseColor.r · add · 40%` | Point the blade at the ceiling, it glows hotter. Drop it to your hip, it cools. Directional reactivity. ([Glyph: TBD](./recipes/tip-bright.glyph)) |
| 4 | **Twist-Drives-Hue** *(v1.0)* | `twist → colorHueShiftSpeed · replace · 50%` | Rotate your wrist, hue drifts. Wrist control over color is unique to KyberStation. ([Glyph: TBD](./recipes/twist-hue.glyph)) |
| 5 | **Clash-Flash-White** *(v1.0)* | `clash → shimmer · max · 100%` | Strike something — clash latches a bright pulse, decays back. Dueling polish. ([Glyph: TBD](./recipes/clash-flash.glyph)) |
| 6 | **Breathing Blade** *(v1.1+)* | `sin(time * 0.001) * 0.5 + 0.5 → shimmer · replace · 100%` | Slow rhythmic pulse, no gestures needed. Idle ambience for display. ([Glyph: TBD](./recipes/breathing.glyph)) |
| 7 | **Heartbeat Pulse** *(v1.1+)* | `abs(sin(time * 0.002)) → shimmer · replace · 80%` | Sharper pulse than Breathing — feels organic, slightly anxious. Sith-coded. ([Glyph: TBD](./recipes/heartbeat.glyph)) |
| 8 | **Battery Saver** *(v1.1+)* | `clamp(1 - battery, 0, 0.5) → shimmer · multiply · 100%` | Blade automatically dims as the battery drains. Practical, not flashy. ([Glyph: TBD](./recipes/battery-saver.glyph)) |
| 9 | **Idle Hue Drift** *(v1.1+)* | `sin(time * 0.0003) * 0.5 + 0.5 → colorHueShiftSpeed · replace · 30%` | Slow hue drift when you're holding still. Pairs well with Reactive Shimmer. ([Glyph: TBD](./recipes/idle-drift.glyph)) |
| 10 | **Speed-Gated Accent** *(v1.2+)* | `if(swing > 0.5, 1, 0) → shimmer · max · 100%` | Below 0.5 swing, base behavior. Above, accent kicks in hard. Combat mode. Needs conditionals. ([Glyph: TBD](./recipes/speed-gated.glyph)) |

## How to read the wiring column

Each row is `source → target · combinator · amount`.

- **source** — the live signal driving the parameter. See [The 11 Modulators](./modulators.md).
- **target** — the blade parameter being driven. The dotted ones (`baseColor.b`, `motionSwingColorShift.r`) reach into nested config fields.
- **combinator** — how the modulation value combines with the static parameter. See [Combinator Cookbook](./combinators.md) for which to pick when.
- **amount** — wet/dry. 0% is bypassed, 100% is full takeover.

## Stack them

These recipes aren't exclusive. Try Reactive Shimmer + Breathing on the same blade and you get an idle pulse that intensifies when you swing. Two bindings on the same target apply in authoring order — pick combinators that compose well (`add` then `multiply` is usually right; two `replace` bindings means only the last one wins).

## Roll your own

Once a couple of these click, the next move is the [Modulators](./modulators.md) page to see all 11 sources, then [Expressions](./expressions.md) for the math escape hatch. By then you'll be wiring patches the recipe gallery doesn't cover yet.
