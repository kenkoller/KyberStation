# Hardware Fidelity Principle

**Established: 2026-04-23**

## The principle

The KyberStation visualizer simulates what a real lightsaber blade actually does on
real Proffieboard hardware — not what we wish it could do. If an effect cannot
be produced on the target hardware (Neopixel WS2812B strip in a diffused
polycarbonate blade), we either:

1. **Fake it honestly** — approximate the effect using what the hardware *can*
   do, and document the compromise in the preset's description and here.
2. **Don't ship it** — park the effect as a post-launch engine feature once
   hardware support exists.

We do NOT invent visualizer-only effects that misrepresent the real blade.
That path leads to users flashing a preset to their real saber and being
disappointed because the app promised something the hardware can't deliver.

## Hardware realities (WS2812B Neopixel blade)

The canonical KyberStation target is a WS2812B Neopixel blade driven by a
Proffieboard V3.9 running ProffieOS 7.x. The physical realities are:

- **1D LED strip.** A linear array of LEDs running along one edge of a clear
  polycarbonate blade tube. There are no "edge" LEDs. No 2D pixel grid. Every
  effect must be expressible as a function of position along the strip + time.
- **Pixel density**: 144 LEDs/meter is the common standard (about 3.66 LEDs
  per inch). 60/m and 30/m also exist but are rare. A 32" blade typically has
  ~117 LEDs; a 36" blade ~132.
- **Color space**: 8-bit-per-channel RGB (24-bit color). No HDR. No alpha —
  each LED either emits or doesn't.
- **Diffusion**: the clear polycarbonate blade tube blurs LED boundaries. What
  the eye sees is a soft, continuous glow — not a visible row of dots — as
  long as the LEDs are close enough (144/m is dense enough; 60/m shows
  discrete dots).
- **No true black.** An LED is either on (any color) or off. "Black" segments
  of a blade render as LEDs that are very dimly lit or fully off. Very-dim
  reads as "off" to the eye. This is why the Darksaber approximation uses
  `{r:5,g:5,b:5}` for the "black" body rather than `{r:0,g:0,b:0}`.
- **Brightness is power-limited**, not effect-limited. The Proffieboard has a
  typical peak draw of ~3A at full-white full-blade. Styles that use
  sustained white saturation draw more power and heat the board more than
  styles that use dim or colored output.
- **Refresh rate**: the blade updates at ~33-60 Hz depending on strip length
  and ProffieOS scheduling. Effects that assume per-frame state cannot run
  faster than this; sub-frame interpolation is the ProffieOS template's job,
  not the blade's.

## What this means for effect design

Before adding a new style to `packages/engine/src/styles/`, answer three
questions:

1. **Can it be expressed as a function of LED position (0..1 along the strip)
   + time?** If yes, proceed. If no (e.g., the effect requires 2D
   coordinates or a pixel grid), it cannot run on real hardware — stop.

2. **Does a ProffieOS template (or composition of templates) exist that
   produces the same effect on real hardware?** `packages/codegen` must emit
   valid ProffieOS C++. If the codegen can't emit an equivalent template,
   the style is visualizer-only and violates this principle.

3. **If the effect must be approximated, what corners are we cutting?**
   Document the compromise explicitly in:
   - The style's class comment
   - The preset's `description` (user-facing)
   - A note in this doc if the approximation is non-obvious

## Darksaber: a worked example

**The canonical visual** (from Clone Wars / Rebels / Mandalorian): a flat
black triangular blade with a bright white outline around its silhouette.
The outline is the defining visual trait.

**The hardware reality**: a 1D LED strip cannot produce a 2D outline. There
are no LEDs on the "edges" of the blade — the LEDs ARE the blade (diffused
through polycarbonate). The closest physically-achievable approximation is:

- Bright white at the emitter (first ~5% of LEDs) — simulates the hilt-end
  outline.
- Near-black (`{r:5,g:5,b:5}`) across the body.
- Bright white at the tip (last ~5% of LEDs) — simulates the tip outline.

This produces a blade that reads as: "glowing points at emitter and tip, very
dim body in between." It's not a 2D outline, but it's the honest
representation of what your real saber will do when it plays this preset.

**ProffieOS template** (reference — the canonical shape in Fett263-style
libraries):

```cpp
StylePtr<InOutTrL<
  TrInstant,
  TrInstant,
  Gradient<White, Black, Black, White>
>>()
```

The `Gradient<White, Black, Black, White>` template interpolates between 4
color stops across the blade: white at position 0 (emitter), black at
position 1/3, black at position 2/3, white at position 1 (tip). That's the
Darksaber on real hardware.

**What we DON'T do**: add a render-pipeline hack in `BladeCanvas.tsx` that
fakes a bright outline around the dark body in the visualizer. That would
show the user a look their real saber cannot produce — a bait-and-switch.

## Audit queue (styles to verify against this principle)

The following styles are in the engine but their codegen emission has not
been verified. A post-launch audit should confirm each can emit equivalent
ProffieOS templates:

- `automata` (Rule 30 cellular automaton)
- `helix` (double helix sine waves)
- `aurora` (color halo)
- `prism` (multi-facet refraction)
- `gravity` (accelerometer-driven pooling)
- `crystalShatter`
- `dataStream` (traveling packets)
- `nebula`
- `neutron` (bouncing particle)
- `candle` (fbm flicker)

Each of these is a legitimate engine style, but may require custom ProffieOS
code or may only be faithfully representable via approximation. If codegen
for one of these fails or produces a visually-different result than the
visualizer, the style needs a principled fix: either enrich the codegen, or
dial back the visualizer to match.

## Edge cases

- **Crystal Chamber effects** (in-hilt LED bleed). Some sabers have a
  separate LED or LED array inside the hilt illuminating the visible kyber
  crystal through an acrylic window. These are physically separate from the
  blade strip. Engine styles targeting the blade can also drive the crystal
  chamber as a secondary output — but the two must be designed in concert,
  not assumed to share state. Styles that use the crystal chamber should
  declare it explicitly.
- **Tri-cree / in-hilt LED** hilts (non-Neopixel). A different hardware
  target entirely. The visualizer may render a blade, but the codegen must
  emit different ProffieOS macros. KyberStation's primary target is
  Neopixel; tri-cree is out of scope for v0.x.
- **Multi-blade sabers** (saberstaffs, Crossguards, Grievous quad, Exar Kun
  double, Maul's double). The editor handles single-blade at launch.
  Multi-blade support is planned v0.15+. Until then, multi-blade presets
  represent one blade; the description should note the real hilt has more.

## When to update this doc

- A new style is added to the engine.
- A new preset requires a hardware approximation (add to the Worked Examples
  section).
- A new blade hardware target is added (non-Neopixel, different pixel
  density, different color space).
- The audit queue above gets worked through (mark verified or flag issues).

## Related docs

- `packages/engine/src/styles/` — style implementations
- `packages/codegen/src/templates/` — ProffieOS template builders
- `docs/PROFFIE_REFERENCE.md` — ProffieOS template reference
- `docs/STYLE_AUTHORING.md` — how to add a new style
