# Troubleshooting

> **BETA** — this page collects the named failure modes we've seen in v1.0. If you hit something that isn't on this list, please [open an issue](https://github.com/kenkoller/KyberStation/issues) so we can name it.

---

Modulation is a lot of moving parts. When something doesn't behave the way you expect, ninety percent of the time it's one of these.

## Quick lookup

| Symptom | Cause | Fix |
|---|---|---|
| Binding isn't doing anything (in editor) | Amount slider at 0% | Raise amount above 0. The wire stays connected at 0%, just contributes nothing. |
| Binding isn't doing anything (in editor) | Bypass toggle is on (dashed wire) | Click the bypass icon on the binding row to re-enable. Bypass is for A/B comparing — it's easy to leave on by accident. |
| Wire won't drop on a slider field | Target is an enum, not a number | Enums (`style`, `ignition`, `blendMode`, `scrollDirection`) can't be modulated — they're discrete choices. Use [button routing](../../MODULATION_ROUTING_ROADMAP.md) (v1.1+) to swap them on gestures. |
| Parameter pegs at maximum constantly | Modulator value is too large for the parameter range | Lower the amount, change combinator (try `multiply` instead of `add`), or wrap the source in `clamp()` once expressions ship. |
| Parameter never moves above static value | Combinator is `min` and modulator stays below the static value | Switch to `add` or `max`. `min` only takes effect when the modulator dips below the static — usually not what you want. |
| Values look wrong on flashed saber | v1.0 uses snapshot-at-export | When you click EXPORT, v1.0 captures each binding's *current value* and bakes it into the config. Live AST injection — where the blade evaluates expressions in real time on hardware — lands in [v1.1 Routing Core](../../MODULATION_ROUTING_ROADMAP.md). For v1.0, "flash and forget" patches work; live-reactive patches need v1.1. |
| Sharing a Kyber Glyph lost the modulation | Glyph v1 doesn't carry modulation; recipient is on an older KyberStation | Glyph v2 (with modulation) ships in v1.1. Today, modulation patches don't survive the share-link round trip. Send a screenshot of your binding list as a workaround until v1.1. |
| ROUTING tab missing entirely | Board doesn't support modulation | Check the StatusBar BOARD chip. Modulation is only enabled on Proffieboard V3.9 and Golden Harvest V3 in v1.0. CFX, Xenopixel, Verso, and other non-Proffie boards hide the tab. Proffie V2.2 support arrives in v1.1. Switch boards in the StatusBar or via the saber wizard. |
| Modulator plates are all flat at zero | You haven't moved your phone or made noise yet | Wave the device, speak into the mic, drag the motion-sim sliders. Plates only animate against a live signal — at rest they read zero. |
| Wired up everything but blade looks identical | The parameter you targeted is upstream of a `style` that ignores it | Some style implementations only read certain config fields. For example, `darksaber` style ignores most color modulation because the visual is hardcoded. Try modulating `shimmer` or `colorHueShiftSpeed` first — they affect every style. |
| Two bindings on same target, only one applies | The other binding is `replace` — it short-circuits | `replace` clears any earlier binding on the same target. Reorder bindings, or change the second one to `add` / `multiply`. See [Combinators](./combinators.md). |
| Expression editor shows red ✕ | Syntax error in your expression | Check the error message under the textarea. Common slips: forgetting a closing paren, using `Sin` instead of `sin`, referencing a parameter (`shimmer`) instead of a modulator. Modulator names are listed in [Modulators](./modulators.md). |
| Expression evaluates but value seems wrong | Math precedence trip | `swing + sound * 2` is `swing + (sound * 2)`, not `(swing + sound) * 2`. Use parens when in doubt. |
| Saber in fullscreen preview reacts but flashed saber doesn't | See "Values look wrong on flashed saber" above | Same root cause: snapshot-at-export. v1.1 fixes this. |

## Debugging checklist

When a patch isn't behaving, work the list:

1. **Is the binding bypassed?** Look for the dashed wire / bypass-on icon.
2. **Is the amount above 0?** Default is 60%; if you scrubbed it down to inspect, it might be at 0.
3. **Is the modulator actually moving?** Look at the modulator plate in LayerStack — if its viz is flat, no signal is reaching the binding.
4. **Is the combinator the right shape?** A `min` binding does nothing if the modulator stays above the static value — see [Combinators](./combinators.md) for a refresher.
5. **Is the target field actually numeric?** Enums get rejected; only number-typed parameters accept wires.
6. **Try `replace · 100%` first.** If the parameter doesn't move with that, the issue isn't the combinator — it's the source or the target.
7. **Wire `swing → shimmer · replace · 100%`** as a sanity check. If that works, your engine + UI loop is healthy and the problem is in your specific patch.

## Still stuck?

The [Modulation Routing roadmap](../../MODULATION_ROUTING_ROADMAP.md) has the canonical "is this even shipped yet?" reference. The [v1.1 design spec](../../MODULATION_ROUTING_V1.1.md) goes deep on engine-side semantics if you suspect a bug below the UI layer.

If you've worked the checklist and the patch still misbehaves, [open an issue](https://github.com/kenkoller/KyberStation/issues) — include your wiring (screenshot of the binding list is fine), your board, and what you expected vs. what you got. We're listening.
