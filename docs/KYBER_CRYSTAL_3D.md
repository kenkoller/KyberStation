# Kyber Crystal — Three.js Rendering Architecture

**Status:** Implementation spec. Companion to `KYBER_CRYSTAL_VISUAL.md`
(aesthetic / lore spec), `KYBER_CRYSTAL_VERSIONING.md` (payload + visual
system versioning), `KYBER_CRYSTAL_NAMING.md` (two-tier naming), and
`SHARE_PACK.md` (Saber Card consumer).

**One-line goal:** Render every saber's Kyber Crystal as a photoreal-
stylised, facet-rich, lit 3D object that reads as Star Wars at a glance,
reacts to live config edits at 60fps, and carries a scannable QR payload
without compromising either the art or the scan.

---

## 1. Why Three.js (Option C commitment)

During the crystal-renderer design brainstorm the user stress-tested
three directions:

| Option | Core | Ruled out because |
|---|---|---|
| A — Pre-rendered PNG atlas | Ship ~30 curated crystal PNGs, pick by config | Static — can't morph as the user edits; can't carry personality |
| B — Hand-authored SVG | Procedural SVG per config | Previous mockups called out as "looks like a minimal children's line drawing in MS Paint." SVG can't carry the depth / refraction / rim light we need |
| **C — Three.js** (chosen) | Live WebGL scene per crystal, real materials, real light | Heavier, but the only option that delivers the photoreal-stylised target AND unlocks the stretch-goal camera-zoom reveal into the hilt's Crystal Chamber LED segment |

**Commitment:** Production renderer is Three.js. The SVG mockups in
`KYBER_CRYSTAL_VISUAL.md` §5 are retained only as *conceptual* sketches
— they document the visual targets (form, palette, motif) but they are
NOT a spec for the renderer output. The renderer's bar is: read as
photography-of-a-prop, not as a diagram.

## 2. Reference catalogue — what "landing" looks like

Before committing to geometry + material numbers, anchor the visual
targets against Star Wars canon. The references below are the decision
surface — every material parameter, every facet-count default, every
animation curve should be justifiable by pointing at one of these.

### Natural crystal (Form 1 — Jedi)

- **Clone Wars S6E10 "The Gathering"** — Ilum crystal cave. Children's
  crystal trials sequence. The raw, un-attuned crystals are the
  definitive "what a kyber looks like in the wild" reference —
  hexagonal-ish but irregular, inner luminance without obvious light
  source, pearlescent rather than saturated.
- **Clone Wars S6E11 "A Test of Strength"** — same arc; Ahsoka's
  journey into the Gathering. Hero shots of a recently-bonded crystal
  showing hue emerging from pearl.
- **Ahsoka (series, 2023), Ep 4 "Fallen Jedi"** — white/pearlescent
  crystal close-ups from the WBW arc. Reference for **bonded-white**
  state (not naturally white — un-attuned pearl that resists tinting).

**Takeaway for the renderer:** Form 1 should read as an object that
could plausibly have been lifted out of Ilum cave footage and placed
in front of a product-shot lightbox. Interior glow sourced by an
internal point light — NOT an emissive surface. Facet count ~30-60,
tapered top, asymmetric at the millimetre scale.

### Bled crystal (Form 2 — Sith)

- **Obi-Wan Kenobi (series, 2022) Ep 6** — Vader's damaged mask shot
  where the cracked red crystal is visible through the helmet fissure.
  Crimson is *not* the base colour — it's the wound glowing through a
  cracked surface.
- **Star Wars: Visions (various)** — stylised Sith hero poses. The
  bled look reads as a crystal that's been *fractured and re-healed*,
  not a crystal that was ever naturally red.
- **The Acolyte Ep 6 "Teach / Corrupt"** — Qimir's crystal-bleeding
  sequence. Red fluid/pattern seeping through the facets is the
  on-screen reference for the bleed animation (see §7).

**Takeaway:** Bled is Form 1 geometry + crimson volumetric glow + red
*veins* routed through fractures on the surface. The veins are not
painted — they're geometry-accurate channels where cracks propagate,
lit from inside.

### Cracked crystal (Form 3 — Kylo / unstable)

- **Force Awakens / Last Jedi / Rise of Skywalker** — Kylo's
  crossguard blade close-ups. The crystal itself is never shown on
  screen, but the blade instability (sparking crossguard vents) is
  the lore reference for *why* the crystal is cracked.
- **Ahsoka (2023) flashback** — Vader's crystal memory in the WBW
  arc. Brief but diagnostic: a *broken* crystal visible in silhouette.

**Takeaway:** Cracked crystal shows a diagonal fracture with exposed
raw energy (bright white-hot seam) where the halves meet. The halves
are geometrically the same as Form 1/2 but separated by a gap;
light leaks through the gap outward toward the emitter.

### Obsidian bipyramid (Form 4 — Darksaber)

- **The Mandalorian S1E8 "Redemption"** — Moff Gideon reveal, first
  live-action darksaber close-up. Hilt + blade.
- **The Mandalorian S2, Book of Boba Fett, Ahsoka (series)** — every
  subsequent darksaber shot.
- **Rebels S3E11 "Trials of the Darksaber"** — Sabine Wren's
  reforging arc. Long exposition on the physical darksaber form,
  including the crystal itself shown in a flashback.

**Takeaway:** Two stacked square pyramids (total ~22 edges). Body is
black obsidian — not "dark grey," black enough that the silhouette
reads as negative space against the scene background. Modules on the
QR inside use **inverted polarity** (white on black, not black on
white) — this is a canon-accurate stylistic inversion, not an
afterthought.

### Paired / Shoto (Form 5 — dual-blade)

- **Asajj Ventress (Clone Wars)** — curved dual lightsabers; her
  crystal pair shown in EU lore as "twin" crystals (linked).
- **Ahsoka Tano (Clone Wars / Rebels / Ahsoka)** — twin white
  crystals; her crystal-purification arc in Rebels S3.
- **Darth Maul (Phantom Menace / Clone Wars)** — double-bladed
  saberstaff. The crystal pair is implied rather than shown, but
  geometry is consistent with Form 5.

**Takeaway:** Two Form-1 prisms side-by-side, joined at the base by
a shared saddle of geometry. Asymmetric independence: each prism gets
its own micro-variation (facet count, twist) via
`hash(config, 'blade-N')` so the pair reads as two individuals, not
one mirrored across the midline.

### Lighting / studio references

- **Rogue One** — Imperial data cards. Deep-space black backdrop,
  thin hairline chrome, cold-edge specular. The Saber Card's
  chromework takes direct cues from this.
- **Andor** — Imperial holotags. Aurebesh labels, monospace type
  aesthetic, rim-lit props.

These are the lighting mood board for the crystal *in the UI*.
Crystal renders under a single key light (cool white, 45° from
above-camera), a weaker warm back-light for rim definition, and a
very dim fill. The crystal's own internal point light carries the
hue — never the scene lights.

## 3. Module layout

```
apps/web/lib/crystal/
├── index.ts                    # Public barrel exports
├── types.ts                    # CrystalConfig, CrystalForm, RenderOptions, AnimationTrigger
├── hash.ts                     # hashConfig(config) → 32-bit int, seedRng(hash) → rng()
├── materials.ts                # Crystal PBR material factory (MeshPhysicalMaterial-based)
├── geometry.ts                 # 5 Form builders → Three.js BufferGeometry
├── lighting.ts                 # Scene-lighting preset (key / rim / fill / internal)
├── animations.ts               # 13-trigger animation controller
├── renderer.ts                 # CrystalRenderer class — scene driver
├── qrSurface.ts                # QR matrix → decal texture, scan-safe overlay
├── reactComponent.tsx          # <KyberCrystal config={...} /> R3F wrapper
└── tests/
    ├── hash.test.ts
    ├── geometry.test.ts        # determinism across forms
    ├── materials.test.ts       # color binding, uniform updates
    ├── animations.test.ts      # trigger → state transitions
    └── qrSurface.test.ts       # QR matrix integrity
```

The top-level `index.ts` is the only module outside `lib/crystal/`
should import from. Everything else is internal.

## 4. Material system

### Base material: `MeshPhysicalMaterial`

Three.js's `MeshPhysicalMaterial` gives us:
- **Transmission** (`transmission: 0.0 – 1.0`) — physically-accurate
  refraction. At ~0.6 the crystal reads as translucent quartz.
- **Thickness + attenuation** — simulates light absorption as it
  passes through volume. Crystal body gets `thickness ≈ 0.6`,
  attenuation colour matches the base colour so the "deeper" parts of
  the crystal appear more saturated.
- **Clearcoat** (`clearcoat: 0.4`, `clearcoatRoughness: 0.1`) — the
  glassy top layer that gives polished specular highlights.
- **Sheen** (`sheen: 0.3`, `sheenColor: off-white`) — adds the
  pearlescent fleck character on the surface.
- **IOR** (`ior: 1.55`) — quartz/glass-like index of refraction.

### Parameter table — canonical defaults

| Parameter | Value | Justification |
|---|---|---|
| `color` | `config.baseColor` (sRGB) | Base tint |
| `transmission` | 0.6 | Enough to read translucent; not so high that the silhouette disappears |
| `ior` | 1.55 | Quartz-like refraction |
| `roughness` | 0.15 | Low — polished gem feel |
| `metalness` | 0.0 | Dielectric |
| `thickness` | 0.6 | Mid-body volume absorption |
| `attenuationColor` | `config.baseColor` | Deeper path = more saturated |
| `attenuationDistance` | 1.2 | Measured in scene units; body is ~1.0 long |
| `clearcoat` | 0.4 | Gives the specular glass layer |
| `clearcoatRoughness` | 0.1 | Sharp speculars |
| `sheen` | 0.3 | Pearlescent signal |
| `sheenColor` | `#fff0d8` (warm off-white) | Subtle iridescence |
| `iridescence` | 0.35 | Low-amplitude thin-film rainbow on oblique viewing |
| `iridescenceIOR` | 1.8 | |
| `iridescenceThicknessRange` | [100, 800] | Wavelength-range in nm |
| `envMapIntensity` | 1.2 | |

### Internal glow — the "attuned hue"

A single `THREE.PointLight` placed at the crystal's geometric centre,
parented to the crystal group. Colour = `config.baseColor`. Intensity
~1.2. This is the ONLY source of the crystal's colour on the render —
the PBR material is physically-dialectric, so the hue reads as light
passing through the body.

This matters for the Bleed animation: the external colour doesn't
crossfade — the internal light crossfades, and the body picks it up
naturally. The material is a passive conduit.

### Subsurface scattering approximation

True SSS is too heavy for a UI widget. We fake it with a single trick:
a second inner mesh (80% scale, same geometry) with a softer `MeshBasicMaterial`
tinted `baseColor` at ~40% opacity. Additive blend. This inner mesh
catches the point light without casting hard shadows, producing the
characteristic "glowing from within" look at very low cost.

### Rim lighting

Two hair-thin directional lights:
- Key-rim: 135° above-camera, cool white, intensity 0.8
- Fill-rim: opposite side, warm white, intensity 0.3

Rim contribution is primarily through the `MeshPhysicalMaterial`'s
specular response at grazing angles — no custom shader needed.

### Veining (Form 2, Form 3)

Red veins (bled) and energy seams (cracked) are NOT painted on a
texture. They are thin additional mesh strips, following procedurally-
generated paths across the crystal surface, with their own
`MeshBasicMaterial` (additive blend, `color: config.bleedColor ?? '#ff3020'`,
`toneMapped: false`). This keeps veins crisp against any body colour
and means they can be animated independently.

### Pearlescent flecks (shimmer)

`InstancedMesh` of ~40 tiny quad particles scattered on the surface
using a deterministic Poisson-disc-like sampling seeded from
`hash(config)`. Each fleck is a billboard with an additive
`#ffffff` material at `shimmer`-driven opacity. This is
`config.shimmer` from BladeConfig.

## 5. Geometry system

### Hex prism foundation (Forms 1-3, 5)

Forms 1 (Natural), 2 (Bled), 3 (Cracked), and 5 (Paired — two
instances) all share a **hex prism builder** with differentiating
parameters. The builder takes:

```ts
interface HexPrismParams {
  height: number;          // 1.6 by default
  radius: number;          // 0.4 default
  tipTaper: number;        // 0-1, how much the top pinches (0.85 default)
  baseTaper: number;       // 0-1, bottom pinching (1.0 = no taper)
  facetJitter: number;     // 0-0.1, per-vertex offset
  segments: number;        // cross-section subdivisions — 6 for strict hex,
                           // 12 for micro-faceted, defaults to 8 (approximate)
  crackCount: number;      // Form 2: veins. Form 3: fracture seams.
  twistDeg: number;        // Form 2: asymmetric twist about Y axis
  seed: number;            // hash(config) for determinism
}
```

Generates a `THREE.BufferGeometry` with:
- `position` — vertices with per-vertex jitter so no two crystals look identical
- `normal` — computed per face for flat-shaded facet highlights
- `uv` — mapped so the QR surface decal lands on the front face
- `color` (optional) — per-vertex bleed factor for Form 2, used by the
  shader-chunk extension to modulate attenuation colour

Facet-flat shading is intentional. A smooth-shaded crystal reads as
plastic. Flat shading reads as faceted gem.

### Form-specific deltas

- **Form 1 Natural** — `crackCount=0, twistDeg=0, facetJitter=0.02`
- **Form 2 Bled** — `crackCount=4, twistDeg=12, facetJitter=0.03`.
  Cracks rendered as the vein mesh strips (see §4). Twist applied to
  top half only (bottom anchored).
- **Form 3 Cracked** — Built as two halves (upper + lower), separated
  by a 0.08-unit gap. `crackCount=6` (radiating from the gap centre).
  Energy-seam mesh (additive white-hot quad) bridges the gap.
- **Form 5 Paired** — Two Form 1 prisms at `radius * 0.65`, centred
  ±`radius * 0.7` apart on X axis, joined at the base by a low saddle
  geometry.

### Obsidian bipyramid (Form 4)

Completely separate builder. Two square-base pyramids (4 sides each)
stacked apex-to-apex at the mid-plane. Material overrides:
`color: #0c0c0f`, `transmission: 0.0`, `sheen: 0.6`, `sheenColor: #d0d8e8`.
The QR surface on Form 4 uses inverted polarity (white modules on
black).

### Determinism via hash seeding

`hash(config)` produces a 32-bit integer from the stringified config's
discriminating fields. This seeds a small PRNG (mulberry32) used by
the facet jitter, crack routing, and fleck placement. Result: same
config → byte-identical geometry. This is verified in
`tests/geometry.test.ts`.

## 6. Lighting

Scene lighting is fixed-preset — we do not expose lighting controls
to the user. Rationale: lighting is part of the visual identity, and
a crystal that looks one way today should look the same way tomorrow.

```ts
export const CRYSTAL_LIGHTING = {
  ambient:     { color: '#222834', intensity: 0.15 },
  key:         { color: '#f4f8ff', intensity: 1.1,  position: [ 2.0, 3.0,  2.0] },
  keyRim:      { color: '#b8d0ff', intensity: 0.8,  position: [-1.5, 2.5, -1.5] },
  fillRim:     { color: '#ffcfa0', intensity: 0.3,  position: [ 1.2,-1.0, -2.0] },
  // Internal point light — colour = baseColor, updated per-frame
  internal:    { intensity: 1.2, decay: 2.0 },
} as const;
```

Tone mapping: `THREE.ACESFilmicToneMapping`, exposure 1.15. This is
the same tone mapping pipeline `BladeCanvas3D.tsx` uses — consistency
across the 3D views.

## 7. Animation pipeline

### Architecture

A single `CrystalAnimationController` owns all animation state.
Animation triggers enter as method calls; the controller composes them
into per-frame uniform updates via a small fixed-timestep queue.

```ts
class CrystalAnimationController {
  trigger(kind: AnimationTrigger, params?: Record<string, unknown>): void;
  tick(deltaMs: number): AnimationState;
  get isBlocking(): boolean;  // true during bleed/heal (once-per-transition)
}
```

`AnimationState` is consumed each frame by the renderer to update:
- point-light intensity (pulse, clash flare, lockup-bright)
- point-light colour (bleed / heal crossfade)
- vein-mesh opacity (bleed propagate, heal retract)
- fleck opacity (preset-saved sparkle, first-discovery bloom)
- halo mesh presence (preon enabled)
- slight scale / tilt (hover, clash)

### The 13 triggers — lookup table

| # | Trigger | Source of truth | Duration | Blocking? | Notes |
|---|---|---|---|---|---|
| 1 | Idle pulse | `bladeStore.isOn` + SmoothSwing | ∞ | No | 0.9–1.1 intensity sine at 0.6 Hz |
| 2 | Hover tilt | pointer position in CrystalPanel | — | No | ±5° tilt toward cursor |
| 3 | Clash flare | `bladeStore.effectLog` "clash" | 200 ms | No | Intensity spike 1.0 → 3.5 → 1.0 |
| 4 | Preset saved | `userPresetStore.create` | 500 ms | No | Fleck bloom + slight bloom |
| 5 | Preset loaded | `bladeStore.loadPreset` | 300 ms | No | Un-tune → re-tune via pearl pass |
| 6 | First discovery | Wizard completion, once EVER (localStorage flag) | 2000 ms | Yes | Pearlescent emergence → colour bond |
| 7 | Attune (scan) | Kyber Glyph decoded from external source | 2000 ms | Yes | Dim → tint to scanned identity |
| 8 | **Bleed** | `baseColor` → red transition (detectStateChange) | 1500 ms | Yes | Point-light colour crossfade + veins propagate |
| 9 | **Heal** | `baseColor` red → non-red transition | 1500 ms | Yes | Bleed reversed |
| 10 | Unstable breathe | `style === 'unstable'` | ∞ | No | Crack geometry 1 Hz sinusoidal opacity |
| 11 | Preon halo | `preonEnabled && isOn` | ∞ | No | Outer mesh aura at baseColor × 0.4 |
| 12 | SmoothSwing sync | `audioFontStore.envelope` | ∞ | No | Internal intensity tracks audio RMS |
| 13 | Lockup bright | `bladeStore.effectLog` "lockup" | lockup duration | No | Intensity pinned at 2.2 |

**Once-per-transition discipline:** Bleed and Heal, plus first
discovery, must play exactly once per qualifying transition. Guarded
by state flags on the controller + `localStorage` for first-discovery.

### Reduced-motion

All continuous animations honour `prefers-reduced-motion: reduce`:
- Idle pulse → static
- Unstable breathe → static (crack geometry still present, just not animated)
- Preon halo → static presence
- SmoothSwing sync → disabled
- Hover tilt → disabled

Transition-triggered animations (bleed, heal, first-discovery,
attune) still play — these are one-shot narrative moments; a user
requesting reduced motion has NOT asked to lose story beats, only to
lose ambient motion. This is the same policy `BladeCanvas.tsx` uses.

## 8. Scan-safe QR integration

**The QR payload and the aesthetic decoration are orthogonal.** The
crystal decoration is the mount; the QR is the mounted object.

### Rendering strategy

QR matrix is generated by the real `qrcode` npm package (v1.5.x).
Output is a `boolean[][]` module matrix, ~21×21 for typical payloads
(QR Version 2-3). This is rasterised to a `CanvasTexture` at 512×512
(adequate for ~24 px per module — well above the scan threshold).

The texture is mapped onto a front-facing planar quad that sits just
inside the crystal body. Depth-offset 0.001 ensures it shows through
the refractive material without z-fighting. The quad occupies the
middle ~60% of the body height and ~75% of the body width.

### Scan-survivability contract

These properties are INVARIANT — any visual tweak must preserve them
or the scan breaks:

1. **Finder patterns rectangular.** The 3 big 7×7 corner squares stay
   square, stay dark, stay high-contrast. No hex-facet overlay, no
   colour tint that reduces contrast below 4.5:1.
2. **Data modules square.** Decorative hex-facet overlay applies only
   to the crystal body AROUND the QR, never on modules themselves.
3. **Quiet zone preserved.** 4-module-wide quiet zone on all sides.
   Crystal body colour in the quiet zone matches the "light" module
   colour, not the body's average tint.
4. **Module contrast ≥ 4.5:1.** Verified by luminance check in
   `qrSurface.test.ts`. Dark modules clamp below L* 20; light modules
   clamp above L* 80.
5. **Background luminance gradient ≤ 10%.** No heavy radial gradient
   inside the QR region that could bleed into module values.

### Polarity inversion (Form 4 darksaber)

Darksaber inverts: white modules on near-black body. This is the one
exception to the "always dark modules on light background" canonical
QR polarity — most decoders handle it fine (ISO 18004 explicitly
allows reverse polarity) but we test every phone camera path in
`tests/qrSurface.test.ts` fixtures.

### Render-to-test pipeline

Development workflow:
1. `pnpm dev` → edit config in the editor
2. Crystal re-renders live
3. Screenshot the crystal region at 300×300
4. Open screenshot in phone camera
5. Verify scan decodes back to `/editor?s=<glyph>` URL
6. If the scan fails, the aesthetic tweak regresses — revert

This is manual, but it's the only honest validation. A CI-only QR
decode test would miss the camera-stack noise that's the whole point.

## 9. Performance budget

### Frame targets

- **Desktop (Apple M1 / integrated GPU / mid-tier laptop)**: 60 fps
  sustained at 300×400 px crystal render. Budget: 6ms / frame.
- **Tablet / mobile (iPhone 12-class)**: 30 fps acceptable, 60 fps
  preferred at 200×300 px.
- **Low-end / battery-saver**: falls back to a static render (single
  frame snapshot, no animation). Triggered by `prefers-reduced-motion`
  or by the existing `performanceTier.ts` low-tier signal.

### Vertex budget

| Form | Vertex count | Face count |
|---|---|---|
| Form 1 Natural | ~200 | ~100 |
| Form 2 Bled | ~260 (+veins) | ~140 |
| Form 3 Cracked | ~360 (+seams) | ~190 |
| Form 4 Obsidian | ~80 | ~40 |
| Form 5 Paired | ~400 (2×Form 1 + saddle) | ~210 |

All forms well under a 1K-vertex budget — negligible GPU cost.

### Draw call budget

Per crystal:
- Body: 1 draw
- Inner glow mesh: 1 draw
- Veins / seams (Form 2/3): 1 draw
- Flecks InstancedMesh: 1 draw (single instanced draw regardless of count)
- Halo (Preon): 1 draw (when active)
- QR plane: 1 draw
- Total: 5-6 draws per crystal

Multiple crystals on screen (Crystal Vault panel) stay under 60 draws
for ~10 crystals. Well within browser budget.

### Bundle-size budget

Session target: **≤ 120 kB gzipped** across all new code + deps.

| Dep | Gzip cost |
|---|---|
| `qrcode` | ~12 kB |
| `msgpackr` | ~18 kB |
| `pako` | ~16 kB |
| `bs58` | ~1 kB |
| `@react-three/fiber` | already in bundle |
| `three` | already in bundle |
| `apps/web/lib/crystal/*` | ~15 kB budget |
| `apps/web/components/editor/CrystalPanel.tsx` | ~4 kB budget |
| `apps/web/lib/sharePack/cardSnapshot.ts` | ~4 kB budget |
| **Total** | **~70 kB** (~40% headroom on budget) |

Monitored by the `pnpm build` output in the PR.

## 10. React integration

### The `<KyberCrystal>` component

```tsx
// apps/web/lib/crystal/reactComponent.tsx
import { Canvas } from '@react-three/fiber';

interface KyberCrystalProps {
  config?: BladeConfig;          // defaults to useBladeStore().config
  size?: number;                 // px, default 300
  interactive?: boolean;         // enable hover tilt, default true
  showLabel?: boolean;           // glyph prefix overlay, default false
  onReady?: (api: CrystalHandle) => void;
  className?: string;
}

export interface CrystalHandle {
  triggerAnimation: (kind: AnimationTrigger) => void;
  snapshot: (size?: number) => Promise<Blob>;    // PNG Blob for card export
  dispose: () => void;
}
```

Internally wraps R3F `<Canvas>` + `<Scene>` and exposes the handle via
`useImperativeHandle` so parent components can invoke animations.

### The `CrystalPanel` workbench panel

Dockable panel in `ColumnGrid`. Subscribes to `useBladeStore()` and
forwards to `<KyberCrystal>`. Keeps a ref to the `CrystalHandle` for:
- "Randomize name" button — no animation, just UI
- "Re-attune" button — triggers `attune` animation and bumps visual version
- "Share as card" button — calls `snapshot()` → PNG → `sharePack/cardSnapshot.ts`
- Copy glyph button — calls `encodeGlyph(config)` and copies to clipboard

### SSR safety

Three.js is client-only. The component uses the same pattern as
`BladeCanvas3DWrapper.tsx`:
```tsx
'use client';
const KyberCrystal = dynamic(() => import('./reactComponent'), { ssr: false });
```

## 11. Data flow

```
bladeStore (Zustand)
  └─ baseColor, style, shimmer, ledCount, etc.
       │
       ├─▶ useCrystalAccent() → CSS var --crystal-accent
       │
       └─▶ <KyberCrystal config>
              └─ CrystalRenderer.applyConfig(config)
                    ├─ geometry.rebuild(hashConfig, form)    (rebuilds only if hash changes)
                    ├─ materials.setBaseColor(config.baseColor)  (cheap per-frame)
                    ├─ materials.setShimmer(config.shimmer)
                    └─ animations.notifyConfigChange(prev, next)
                          └─ detects red transition → triggers bleed
                          └─ detects unred transition → triggers heal
```

Geometry rebuild is gated on `hash(config)` — most edits don't
regenerate geometry, only updates material uniforms.

## 12. Testing strategy

### Determinism (`geometry.test.ts`)

For each Form, generate geometry from 50 random configs. For each
config, generate twice. Vertex arrays must be byte-identical across
runs.

### Material binding (`materials.test.ts`)

- `setBaseColor({r,g,b})` must update `material.color` via THREE.Color
- `setShimmer(0.0)` → fleck opacity = 0
- `setShimmer(1.0)` → fleck opacity = 1
- `setBleed(0.5)` → vein mesh opacity = 0.5

### Animation transitions (`animations.test.ts`)

- Fire `trigger('bleed')` → `isBlocking` true for 1500 ms
- Fire `trigger('bleed')` twice back-to-back → second is dropped (already blocking)
- Config change from blue to red → controller auto-triggers bleed
- Config change from red to blue → controller auto-triggers heal
- First-discovery plays once → localStorage flag set → plays no more

### QR integrity (`qrSurface.test.ts`)

- Generate QR for known config, verify `QR` output decodes back via
  the same `qrcode` library (round-trip)
- Contrast check: dark modules L* < 20, light modules L* > 80
- Finder patterns present in expected positions for QR Version 2

Vitest runs all suites; no tests hit the GPU (they test data, not
rasterisation).

## 13. Stretch goals (v0.12.x+, not v0.12.0)

- **Camera-zoom reveal in Fullscreen preview** — in Fullscreen, if the
  active topology is `ACCENT_TOPOLOGY`, camera dollies from the blade
  into the hilt's Crystal Chamber LED segment (LEDs 132-139) and the
  crystal fills the frame. Stretch target — the Crystal Chamber LED
  layout gives us the world-space anchor for free. Implementation is
  a separate `HiltCameraChoreographer` in `FullscreenPreview.tsx`.
- **Re-attunement** — surface the visual-system re-attune flow from
  `KYBER_CRYSTAL_VERSIONING.md` §3 in the Crystal Panel.
- **Crystal Vault** — persistent collection of saved / scanned crystals.
  Separate panel; each crystal is a small `<KyberCrystal>` instance.
- **Favicon replacement** — once a user has attuned a saber, replace
  the default KyberStation favicon with a 32×32 snapshot of their
  crystal. Pipeline already exists via `snapshot()` on the handle.

## 14. Handoff + review checklist

Before the PR lands:

- [ ] All 5 Forms render recognisably distinct in isolation
- [ ] `config.baseColor` change updates the crystal glow within one frame
- [ ] Red transition triggers bleed animation exactly once
- [ ] Un-red transition triggers heal animation exactly once
- [ ] First-discovery animation plays exactly once, ever (localStorage-gated)
- [ ] QR scannable from phone camera at 300 px render
- [ ] Scan reliability verified on ≥2 phones (iOS Camera, Android Google Lens)
- [ ] Bundle-size diff `≤ 120 kB gz`
- [ ] `pnpm -w typecheck && pnpm -w lint && pnpm -w test` all pass
- [ ] `prefers-reduced-motion` honoured on ambient animations; narrative
      animations still play
- [ ] Reference stills catalogued in this doc are reachable from the PR
      description (links to canon episodes / frames)

## 15. Decision log

Locked-in decisions from the design brainstorm; these should not be
re-litigated mid-implementation without a user check-in:

| # | Decision | Rationale |
|---|---|---|
| 1 | Three.js (Option C) | Only option that delivers photoreal-stylised crystal + camera-zoom stretch goal |
| 2 | `MeshPhysicalMaterial` not custom shader | Free refraction + transmission + sheen + iridescence, all in the three.js feature set |
| 3 | Point-light interior glow (not emissive) | Light-pass-through is the aesthetic target; emissive surface loses the translucent feel |
| 4 | Flat-shaded facets (no smoothing) | Faceted gem read; smooth shading reads as plastic |
| 5 | QR matrix is a planar decal, not surface-painted | Scan-safety — decoders need flat rectangular modules, not UV-warped |
| 6 | `hash(config)` → mulberry32 seed for determinism | Same config → byte-identical crystal, forever. Required for visual version stability |
| 7 | Animation controller owns state, not materials | Materials are stateless; animation state centralised is easier to debug and test |
| 8 | Reference-catalogue-first | Don't write numeric material params before naming the canonical still that justifies them |
| 9 | Bled colour is a light change, not a body-colour swap | Matches canon (crimson is the wound bleeding through) and makes the bleed animation pipeline simple |
| 10 | Five Forms is enough | Four of them cover >95% of sabers; Paired covers staffs/twins; we can add Form 6+ later without breaking the visual version contract |
