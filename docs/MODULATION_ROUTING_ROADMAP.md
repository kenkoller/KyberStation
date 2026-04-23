# Modulation Routing — Public Roadmap

**Status:** Active. Community-facing version ladder for the Modulation Routing feature.
**Companion docs:** [design spec](MODULATION_ROUTING_V1.1.md) · [impl plan](MODULATION_ROUTING_v1.1_IMPL_PLAN.md) · [user guide outline](MODULATION_USER_GUIDE_OUTLINE.md).

---

## Positioning

Modulation Routing turns KyberStation from a "static blade picker" into a "blade instrument." Users wire live signals (swing / sound / angle / time / clash / etc.) to any parameter, compose with math expressions, save shareable wiring patterns, and drive hardware-accurate previews.

Think **Vital** for drag-to-route, **Bitwig** for modulator plates inside the layer stack, **TouchDesigner** for the expression escape hatch — wired into a ProffieOS-compatible blade style editor.

---

## Version ladder

### v1.0 — Routing Preview BETA · 2026-04-24

Ships as part of the v1.0 launch. Marked BETA in the ROUTING tab.

- Click-to-route interaction (click plate → click parameter)
- 5 core modulators: `swing`, `sound`, `angle`, `time`, `clash`
- Binding list in Inspector ROUTING tab (amount / combinator / bypass)
- LayerStack modulator plates with live preview
- ProffieOS V3.9 / Golden Harvest V3 flash via `Scale<>` + friends
- 5 pre-wired demo recipes in gallery
- Board Capability System: modulation hidden on non-Proffie boards
- "Your First Wire" quick-start doc

### v1.1 — Routing Core · ~2026-05-16 (launch +3 wk)

Fills out the v1.1 design spec in full.

- **All 11 built-in modulators** — adds twist, battery, lockup, preon, ignition, retraction
- **Math expression language** — 10 functions + arithmetic + Cmd-click to enter expression mode on any numeric field
- **True drag-to-route** — drag plate handle → drop on any numeric field
- **Hover wire highlighting** — hovering a parameter highlights every binding driving it; hovering a modulator highlights every parameter it drives
- **Kyber Glyph v2 sharing** — modulation round-trips through shared URLs
- **V2.2 modulation flash** — conservative profile with limited binding count
- **Button routing sub-tab** — aux / power / gesture events mapped to effects per prop file
- **Aux/gesture events as modulators** — `aux1.held`, `gesture.swing`, etc. as first-class plates
- **Full 10-recipe starter gallery**
- **Complete user guide**

### v1.2 — Routing Creative · ~2026-06-13 (launch +7 wk)

Expressive building blocks that unlock creative patches.

- **Modulator chains** — LFO rate driven by sound, frame-delay feedback allowed, cycle warning (not error)
- **Macro controls** — one master knob drives many parameters at different amounts
- **LFO shape library** — sine / triangle / saw / square / random / perlin / hand-drawn
- **Conditional expressions** — `if(battery < 0.3, 0.3, 1.0)` for failsafe patterns
- **`config.*` as expression variables** — `lerp(baseColor.r, clashColor.r, clash)` for crossfade patterns
- **Modulation snapshots / scenes** — save a whole binding configuration, recall with one click ("Combat mode" / "Display mode" / "Battery saver")
- **Sidechain / thresholds** — "sound drives shimmer but only above 0.5" via conditionals
- **Probability + weighted random + sample-and-hold** — controlled chaos
- **Blade-level user-defined functions** — `def breathe(hz) = sin(time * hz * 0.001) * 0.5 + 0.5` reusable across bindings
- **Response curves** — ease-in / ease-out / exponential per binding, not just linear

### v1.3 — Routing Advanced · ~2026-07-18 (launch +12 wk)

Heavy features that need new DSP or dedicated surfaces.

- **Audio envelope followers** — BPM detection + transient detection via `meyda` + `AudioWorklet`
- **Step sequencers** — 16-step patterns that loop, each step a value
- **`ModulationGraphPanel`** — dedicated dense-graph view (Arturia Pigments Mod Overview pattern) for when hover-highlight gets noisy
- **Community UDF library** — PR-based sharing of user-defined functions, no hosting required (same model as preset gallery)
- **Gesture recording** — "record me waving my saber for 10s, play it back as a modulator" — puppeteer mode for choreographed fights

### v2.0+ — Ambitious Beyond

Items that require significant architecture changes or external-system integration.

- **WebMIDI / WebHID external control** — drive bindings from Korg nanoKontrol, Stream Deck, gamepad, game controller
- **Community modulator plugins** — users author their own modulators in TypeScript, share via PR
- **Cross-blade modulation** — for staffs / crossguards, blade 2 responds to blade 1's activity
- **Timeline cues with scoped modulation** — "at 0:05 of hum track, do X; at 0:12, do Y"
- **Probabilistic state machines** — modulation patches that transition between states

---

## Deliberately out of scope forever

- **Bitwise operations** in expressions — wrong register for a blade-style tool
- **User-defined operators** — adds grammar complexity for little gain
- **Network-connected modulators** — stays offline-first
- **Modulation of enum fields** (`style`, `ignition`, `blendMode`, `scrollDirection`) — discrete choices, not numeric; discrete routing is the job of button routing, not modulation

---

## Proposing additions

Anything not in this doc is out-of-scope until proposed via GitHub issue with `enhancement` + `modulation` labels. Discussion in issue threads, adoption decisions by Ken.

Compatibility contracts:
- All v1.x schemas round-trip through Kyber Glyph v2 forever (per [`KYBER_CRYSTAL_VERSIONING.md`](KYBER_CRYSTAL_VERSIONING.md) Contract A)
- New built-in modulator IDs are purely additive — never rename or retype existing IDs
- Removing a feature is a major version bump; anything released in a v1.x stays usable forever

---

_Last updated 2026-04-22. Timeline slips get annotated inline._
