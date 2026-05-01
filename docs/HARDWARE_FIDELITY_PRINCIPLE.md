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

## Audit history

### 2026-04-29 — Layer blend modes tightened to `'normal'` only

The application engine previously implemented 5 layer blend modes (`normal /
add / multiply / screen / overlay`); the LayerStack UI surfaced 4 of them
via dropdown; ParameterBank surfaced 5 via a `blendMode` select. **None of
these except `'normal'` round-tripped to a ProffieOS template** — the
codegen emits `Mix<>` / `AlphaL<>` chains regardless of mode, and ProffieOS
has no native `Add` / `Multiply` / `Screen` / `Overlay` color-blend
primitives. Users setting `'multiply'` got a multiply-look in the visualizer
+ a regular-lerp-look on real hardware.

Tighten (PR landing 2026-04-29):
- `BlendMode` union narrowed to `'normal'` (single literal) in both
  `packages/engine/src/types.ts` and `apps/web/stores/layerStore.ts`.
- `applyBlendMode` in `BladeEngine.ts` collapses to alpha-over via lerp
  unconditionally.
- `LayerRow` blend-mode dropdown removed; `setBlendMode` action retired
  from `useLayerStore`.
- `ParameterBank` `blendMode` select removed.
- `BladeConfig.blendMode` field retired (was a dead field — never
  consumed by codegen, never read by the engine compositor).
- New `migrateBlendMode(value)` helper in `packages/engine/src/types.ts`
  is the single coerce-to-normal choke-point for legacy persisted state
  + glyph round-trip.
- 5 new tests in `packages/engine/tests/migrateBlendMode.test.ts` lock
  the migration contract (every input → `'normal'`).

The 4 dropped modes were a Hardware Fidelity violation that shipped before
this principle was written down. Going forward, any new layer-compositor
mode MUST have a corresponding ProffieOS template emission path before it
ships in the UI.

### 2026-05-01 — Darksaber preset audit + drift sentinel

Audit pass on every preset using `style: 'darksaber'`. The engine path
(`packages/engine/src/styles/DarkSaberStyle.ts`) hardcodes the body color
to `{r:5,g:5,b:5}` and the emitter+tip to white, ignores `time` and
`context.config.baseColor` entirely, and emits the canonical ProffieOS
template `Gradient<White, Rgb<5,5,5>, Rgb<5,5,5>, White>` directly via
the codegen — **never wrapped in AudioFlicker**. So the `baseColor` and
`shimmer` fields on a `darksaber`-style preset are dead: the slider has
no effect on hardware, and any color the user sets in `baseColor` is
discarded by the engine + codegen alike.

Five issue classes found:

1. **Vestigial `baseColor` values.** Pre Vizsla / Sabine Wren / Din
   Djarin used `{r:255,g:255,b:255}` (pure white); Black Ranger used
   `{r:30,g:30,b:40}` (slightly-brighter-than-canonical). All normalized
   to the canonical `{r:5,g:5,b:5}` so the field is consistent across the
   library and the gallery card swatch displays a sensible body color.

2. **Vestigial `shimmer` values.** All 8 canonical-darksaber presets had
   `shimmer` ranging from `0.08` to `0.35`. The engine and codegen ignore
   this for `darksaber` style. All normalized to `0` so the slider value
   matches its observable effect.

3. **Misleading description on Din Djarin.** Original text claimed
   "Crackling, unstable white-core blade" — but the engine renders the
   static gradient regardless. Rewritten to attribute Din\'s hesitation
   to the slow `stutter` ignition (which does run on hardware) rather
   than to blade instability the engine cannot deliver.

4. **Factually wrong description on Black Ranger.** Original text claimed
   the body would render at `{r:30,g:30,b:40}` — but the engine hardcodes
   `{r:5,g:5,b:5}`. Rewritten to honestly describe that the engine
   ignores `baseColor` for `darksaber` style and that Zack\'s Mastodon
   purple flavor is carried by the clash + lockup + blast effect layers
   composed on top.

5. **`creative-darksaber-deep` style mismatch.** Preset was named
   "Darksaber (Crackling)" with description claiming Mandalorian
   Darksaber traits — but it used `style: 'unstable'`, NOT
   `style: 'darksaber'`. On hardware the preset renders an unstable
   purple-blue flicker, not the canonical Darksaber visual. Renamed to
   "Crackling Black Blade" + character "Black Blade" + reworded
   description to clarify it\'s a creative variant, not a Darksaber.
   `style` kept as `'unstable'` since that\'s what delivers the
   "crackling" intent.

New drift sentinel at `packages/presets/tests/darksaberPresets.test.ts`
(8 cases) pins the contract going forward:
- Every `style: 'darksaber'` preset has `baseColor: {r:5,g:5,b:5}`
- Every `style: 'darksaber'` preset has `shimmer: 0`
- Every preset whose name contains "Darksaber" uses `style: 'darksaber'`
- Descriptions don\'t claim "unstable / crackling / flickering blade"
  effects the engine cannot deliver

### 2026-05-01 — Inquisitor preset cracked-kyber convention drift

Audit pass on every preset whose character is on the canonical Inquisitor
roster (Grand Inquisitor, Second Sister, Fifth Brother, Seventh Sister,
Reva Sevander / Third Sister, Trilla Suduri, Marrok). Per the 2026-04-23
preset-accuracy audit, all Inquisitors should share `style: 'unstable'`
to capture the cracked-kyber bleed lore. The 2026-05-01 audit found two
drift cases:

1. **Trilla Suduri** (Jedi: Fallen Order, in `extended-universe.ts`)
   shipped with `style: 'stable'`. The same character has a separate
   "Second Sister" preset in `animated-series.ts` that correctly uses
   `'unstable'`. Drift created a same-character-two-styles contradiction.
   Fixed: changed to `'unstable'` (preserves the original "controlled"
   character through a tighter shimmer value of 0.16, not by silencing
   the bleed entirely).

2. **Marrok** (Ahsoka Disney+ series) shipped with `style: 'fire'`.
   The fire engine style produces orange flame flicker — visually
   distinct from the cracked-kyber red the rest of the Inquisitor roster
   produces. Fixed: changed to `'unstable'`. The "smoldering" character
   the original style was reaching for is now carried by the high
   shimmer (0.25), slow stutter ignition, and fadeout retraction
   already configured. The death-revealing-Nightsister-magick is a
   one-time visual moment in the show, not the canonical baseline blade
   look — kept out of the engine config.

Also added: missing **Inquisitor Barriss Offee** preset
(`eu-inquisitor-barriss-red`) covering her post-fall Tales of the
Empire (2024) arc. Distinct from the existing prequel-era Padawan-blue
Barriss preset (which is correctly tagged `affiliation: 'jedi'`).

New drift sentinel at `packages/presets/tests/inquisitorPresets.test.ts`
(7 cases) pins the contract going forward via an explicit
`INQUISITOR_CHARACTERS` set:
- Every preset for a canonical Inquisitor character uses
  `style: 'unstable'`
- Every Inquisitor preset has `affiliation: 'sith'`
- Every Inquisitor preset has red-dominant base color (r > g and r > b)
- Roster completeness — there\'s at least one preset per canonical
  Inquisitor character

Adding a new Inquisitor character means adding it to
`INQUISITOR_CHARACTERS` in the test — that\'s the single source of
truth for the convention.

## When to update this doc

- A new style is added to the engine.
- A new preset requires a hardware approximation (add to the Worked Examples
  section).
- A new blade hardware target is added (non-Neopixel, different pixel
  density, different color space).
- The audit queue above gets worked through (mark verified or flag issues).
- A previously-shipped feature is revisited under this principle (add to
  the Audit history section).

## Related docs

- `packages/engine/src/styles/` — style implementations
- `packages/codegen/src/templates/` — ProffieOS template builders
- `docs/PROFFIE_REFERENCE.md` — ProffieOS template reference
- `docs/STYLE_AUTHORING.md` — how to add a new style
