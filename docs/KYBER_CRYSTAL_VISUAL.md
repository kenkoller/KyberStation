# Kyber Crystal — Visual Design Spec

**Status:** Design-phase for aesthetics; implementation in progress.
Companion docs: `KYBER_CRYSTAL_3D.md` (Three.js rendering architecture
— the production renderer), `KYBER_CRYSTAL_NAMING.md`,
`KYBER_CRYSTAL_VERSIONING.md`, `SHARE_PACK.md`.

> **Renderer commitment:** The SVG mockups in §5 of this document are
> **placeholder concept art only.** The production renderer uses
> Three.js per `KYBER_CRYSTAL_3D.md`. The SVGs document target palette,
> silhouette, and motif — NOT the actual render output. Do not use
> them as a spec.

**One-line goal:** Give every saber a visually unique, lore-faithful,
scannable kyber crystal that morphs as the user edits their config,
bleeds when they turn red, heals when they come back, and doubles as
the sharing mechanism (QR-backed, self-contained payload).

---

## 1. Hero / secondary hierarchy

**The lightsaber (blade on hilt) is the hero of every shared artefact.**
The crystal is a secondary visual element — important for sharing (it
carries the data), present as an accent on cards and panels, but never
competing with the blade itself for attention.

On a 1200×675 Saber Card: blade-on-hilt occupies ~70% of the canvas;
crystal appears as a small accent in a bottom-corner badge (~8% of the
canvas).

## 2. Expressive design system — config → visual mapping

Every config field that meaningfully changes the crystal's appearance
is mapped below. Fields not listed don't affect the crystal's visual
form (they still round-trip via the payload, but the crystal doesn't
render them).

| Config field | Crystal visual feature |
|---|---|
| `baseColor` (RGB) | Interior glow colour — the attuned hue |
| `baseColor` hue sector | Crystal "personality" baseline (cool = Jedi-natural, warm = Sith-bled, off-hue = Grey) |
| `baseColor → red transition` | Triggers **bleed animation** (one-shot) |
| `red → non-red transition` | Triggers **heal animation** (bleed reversed) |
| `clashColor` | Secondary crack-highlight colour (visible during clash flare) |
| `style: unstable` | Hairline fractures across surface, subtle flicker |
| `style: fire` | Warm inner turbulence, ember flecks |
| `style: stable` | Clean facets, steady glow |
| `style: rotoscope` / `gradient` | Banded interior gradient |
| `style: crystal-shatter` | Visible internal cracks with light leaking through |
| `preonEnabled` | Outer halo / aura (breath-before-ignition visual) |
| `shimmer` (0-1) | Pearlescent flecks density on surface |
| `ledCount` | Overall crystal size: <72 small, 72-144 standard, >144 large |
| `ignition` type | Facet pattern at the base (where energy exits toward the emitter) |
| `dualModeIgnition` | Two-axis symmetry in base facet pattern |
| `lockupPosition / blastPosition` spatial | Brighter glow band at that position along the crystal's long axis |
| `retraction` type | Tip pattern (the top of the crystal) |
| `ignitionEasing` / `retractionEasing` | Subtle animation curve of the idle pulse |
| Saber type (single / dual / crossguard / darksaber) | Silhouette — see §4 |
| Bled state (detected: baseColor is red + Sith-like palette) | Red veins, cracks, unstable interior |
| hash(config) deterministic | Specific facet count + arrangement proportions |

## 3. Design principles

1. **Scannability is non-negotiable.** Every visual decision is
   subordinate to "the QR inside the crystal still decodes from a phone
   camera at business-card size." We test every aesthetic choice
   against a real decoder.
2. **Silhouette ≠ module shape.** The crystal silhouette (the outer
   shape) is aesthetic; the internal QR modules stay square-ish and
   high-contrast. We do NOT replace QR modules with hexagonal facets —
   that breaks scanning. Hex facets appear as decorative overlay on the
   non-functional parts of the crystal.
3. **Finder patterns stay rectangular and dark.** The three big corner
   squares of any QR are mandatory for scanning. We preserve them.
4. **Colour contrast above 4.5:1 inside the QR area.** Dark modules
   stay near-black in luminance even when they're heavily tinted;
   "light" modules stay near-white-with-tint.
5. **The crystal frames the QR; it doesn't replace it.** Think of the
   crystal as a decorative mount around a functional QR core.

## 4. Crystal silhouettes (5 base forms)

Each form covers a range of sabers. The specific proportions of each
rendered crystal come from `hash(config)` so two blades with the same
config get the same crystal.

### Form 1 — Jedi / Natural (most common)

Irregular hexagonal prism, rough-cut. Slightly tapered at the top. Used
for: most Jedi blades, stable-style, non-red colours.

### Form 2 — Sith / Bled

Same hexagonal prism as Form 1 but with visible red veins, hairline
cracks, and a slight asymmetric twist. Used for: red blades, detected
Sith affiliation, bled state.

### Form 3 — Unstable / Cracked

Hexagonal prism with a visible fracture running diagonally, exposed
raw energy at the break. Used for: unstable style, Kylo-style
crossguard variants.

### Form 4 — Darksaber / Obsidian Bipyramid

Completely different form: elongated double-pyramid, black with white
or faint-colour modules. Used for: darksaber preset, black `baseColor`
with specific flag.

### Form 5 — Paired / Shoto

Two smaller hexagonal prisms side-by-side, connected at the base. Used
for: dual-blade saber configs, saberstaffs, Ahsoka-style twin blades.
Crossguard sabers get a Form 1/3 primary with two small accent
crystals flanking the base.

## 5. SVG mockups

These are hand-authored conceptual mockups. They simulate what the
eventual renderer should produce. Real output will come from
`scripts/render-crystal.mjs` once we implement the generator against
this spec. Open each SVG file in `docs/samples/` in a browser to view
standalone; they're also embedded inline in this doc.

### 5.1 Obi-Wan (Prequel) — Form 1 Jedi / Natural, blue

Stable style, sky blue `baseColor`, standard ignition, no spatial
effects. The reference "typical Jedi crystal."

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400" role="img" aria-label="Kyber crystal, Obi-Wan blue, stable">
  <defs>
    <radialGradient id="obiGlow" cx="50%" cy="55%" r="50%">
      <stop offset="0%" stop-color="#a8d8ff" stop-opacity="1"/>
      <stop offset="40%" stop-color="#5ab6ff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#1a4d80" stop-opacity="0.6"/>
    </radialGradient>
    <linearGradient id="obiFacet" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#cfe9ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#3a88cc" stop-opacity="0.3"/>
    </linearGradient>
  </defs>

  <!-- Deep-space backdrop -->
  <rect width="300" height="400" fill="#0a0f1a"/>

  <!-- Outer pearlescent rim (subtle halo) -->
  <polygon points="150,30 235,110 235,310 150,380 65,310 65,110"
           fill="none" stroke="#8ab8ff" stroke-width="0.5" stroke-opacity="0.3"/>

  <!-- Crystal body: hexagonal prism silhouette -->
  <polygon points="150,40 225,115 225,305 150,370 75,305 75,115"
           fill="url(#obiGlow)" stroke="#82c8ff" stroke-width="1.2" stroke-opacity="0.85"/>

  <!-- Interior facet lines (structural only, not QR data) -->
  <line x1="150" y1="40" x2="150" y2="370" stroke="#b8dcff" stroke-width="0.4" stroke-opacity="0.4"/>
  <line x1="75" y1="115" x2="225" y2="305" stroke="#b8dcff" stroke-width="0.3" stroke-opacity="0.3"/>
  <line x1="225" y1="115" x2="75" y2="305" stroke="#b8dcff" stroke-width="0.3" stroke-opacity="0.3"/>

  <!-- QR region (functional scannable area) — simplified 21×21 grid as representative -->
  <g transform="translate(100, 155)">
    <rect width="100" height="100" fill="#0a1628" fill-opacity="0.4"/>
    <!-- Top-left finder pattern (7×7) -->
    <rect x="3" y="3" width="21" height="21" fill="#0a1628"/>
    <rect x="6" y="6" width="15" height="15" fill="#cfe9ff"/>
    <rect x="9" y="9" width="9" height="9" fill="#0a1628"/>
    <!-- Top-right finder pattern -->
    <rect x="76" y="3" width="21" height="21" fill="#0a1628"/>
    <rect x="79" y="6" width="15" height="15" fill="#cfe9ff"/>
    <rect x="82" y="9" width="9" height="9" fill="#0a1628"/>
    <!-- Bottom-left finder pattern -->
    <rect x="3" y="76" width="21" height="21" fill="#0a1628"/>
    <rect x="6" y="79" width="15" height="15" fill="#cfe9ff"/>
    <rect x="9" y="82" width="9" height="9" fill="#0a1628"/>
    <!-- Representative data modules (actual implementation generates from real QR) -->
    <g fill="#0a1628">
      <rect x="30" y="10" width="3" height="3"/><rect x="36" y="10" width="3" height="3"/>
      <rect x="45" y="10" width="3" height="3"/><rect x="51" y="10" width="3" height="3"/>
      <rect x="60" y="10" width="3" height="3"/><rect x="66" y="10" width="3" height="3"/>
      <rect x="30" y="30" width="3" height="3"/><rect x="39" y="30" width="3" height="3"/>
      <rect x="48" y="30" width="3" height="3"/><rect x="57" y="30" width="3" height="3"/>
      <rect x="66" y="30" width="3" height="3"/><rect x="75" y="30" width="3" height="3"/>
      <rect x="33" y="45" width="3" height="3"/><rect x="42" y="45" width="3" height="3"/>
      <rect x="54" y="45" width="3" height="3"/><rect x="63" y="45" width="3" height="3"/>
      <rect x="30" y="60" width="3" height="3"/><rect x="36" y="60" width="3" height="3"/>
      <rect x="45" y="60" width="3" height="3"/><rect x="54" y="60" width="3" height="3"/>
      <rect x="60" y="60" width="3" height="3"/><rect x="69" y="60" width="3" height="3"/>
      <rect x="33" y="75" width="3" height="3"/><rect x="42" y="75" width="3" height="3"/>
      <rect x="51" y="75" width="3" height="3"/><rect x="60" y="75" width="3" height="3"/>
      <rect x="69" y="75" width="3" height="3"/>
    </g>
  </g>

  <!-- Top pearlescent shimmer -->
  <ellipse cx="150" cy="90" rx="35" ry="8" fill="#e8f5ff" fill-opacity="0.25"/>

  <!-- Bottom energy outflow (toward emitter) -->
  <polygon points="150,370 135,385 150,378 165,385" fill="#a8d8ff" fill-opacity="0.7"/>

  <!-- Label strip -->
  <text x="150" y="395" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#8ab8ff" fill-opacity="0.7">JED.4X7QPN9MBK3F</text>
</svg>
```

### 5.2 Sith Vader — Form 2 Bled, crimson

Bled crystal, deep red with visible veins and fissures. Unstable inner
turbulence. Subtle crack-glow highlights the cracks.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400" role="img" aria-label="Kyber crystal, Vader bled, crimson">
  <defs>
    <radialGradient id="vdrGlow" cx="50%" cy="55%" r="50%">
      <stop offset="0%" stop-color="#ffb0a0" stop-opacity="1"/>
      <stop offset="30%" stop-color="#ff3018" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#4a0000" stop-opacity="0.7"/>
    </radialGradient>
  </defs>

  <rect width="300" height="400" fill="#0a0408"/>

  <!-- Crystal body — slightly asymmetric (bled twist) -->
  <polygon points="150,40 228,115 222,305 152,370 72,305 78,115"
           fill="url(#vdrGlow)" stroke="#ff4020" stroke-width="1.5" stroke-opacity="0.9"/>

  <!-- Visible cracks / bleed veins -->
  <path d="M 150,50 Q 140,120 165,180 T 148,250 Q 155,290 140,340"
        stroke="#ff6040" stroke-width="1.5" fill="none" stroke-opacity="0.8"/>
  <path d="M 85,130 Q 110,150 130,170 Q 120,200 140,225"
        stroke="#8a0000" stroke-width="1" fill="none" stroke-opacity="0.7"/>
  <path d="M 220,130 Q 195,155 175,175 Q 190,210 165,240"
        stroke="#8a0000" stroke-width="1" fill="none" stroke-opacity="0.7"/>
  <path d="M 100,260 Q 130,275 155,280"
        stroke="#ff5030" stroke-width="0.8" fill="none" stroke-opacity="0.85"/>

  <!-- Asymmetric facet line -->
  <line x1="150" y1="40" x2="152" y2="370" stroke="#ff8060" stroke-width="0.4" stroke-opacity="0.4"/>

  <!-- QR region — red-tinted finder patterns -->
  <g transform="translate(100, 155)">
    <rect width="100" height="100" fill="#1a0000" fill-opacity="0.55"/>
    <!-- Finder patterns (must stay dark + square for scanning) -->
    <rect x="3" y="3" width="21" height="21" fill="#1a0000"/>
    <rect x="6" y="6" width="15" height="15" fill="#ffb0a0"/>
    <rect x="9" y="9" width="9" height="9" fill="#1a0000"/>
    <rect x="76" y="3" width="21" height="21" fill="#1a0000"/>
    <rect x="79" y="6" width="15" height="15" fill="#ffb0a0"/>
    <rect x="82" y="9" width="9" height="9" fill="#1a0000"/>
    <rect x="3" y="76" width="21" height="21" fill="#1a0000"/>
    <rect x="6" y="79" width="15" height="15" fill="#ffb0a0"/>
    <rect x="9" y="82" width="9" height="9" fill="#1a0000"/>
    <!-- Data modules -->
    <g fill="#1a0000">
      <rect x="30" y="9" width="3" height="3"/><rect x="39" y="9" width="3" height="3"/>
      <rect x="48" y="9" width="3" height="3"/><rect x="57" y="9" width="3" height="3"/>
      <rect x="66" y="9" width="3" height="3"/>
      <rect x="33" y="30" width="3" height="3"/><rect x="42" y="30" width="3" height="3"/>
      <rect x="51" y="30" width="3" height="3"/><rect x="60" y="30" width="3" height="3"/>
      <rect x="69" y="30" width="3" height="3"/>
      <rect x="30" y="45" width="3" height="3"/><rect x="45" y="45" width="3" height="3"/>
      <rect x="60" y="45" width="3" height="3"/><rect x="72" y="45" width="3" height="3"/>
      <rect x="33" y="60" width="3" height="3"/><rect x="48" y="60" width="3" height="3"/>
      <rect x="54" y="60" width="3" height="3"/><rect x="63" y="60" width="3" height="3"/>
      <rect x="36" y="75" width="3" height="3"/><rect x="42" y="75" width="3" height="3"/>
      <rect x="51" y="75" width="3" height="3"/><rect x="66" y="75" width="3" height="3"/>
    </g>
  </g>

  <!-- Cracked tip -->
  <polygon points="150,40 155,55 150,45 145,55" fill="#ff3018" fill-opacity="0.9"/>

  <text x="150" y="395" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#ff6040" fill-opacity="0.7">SIT.4MX7QPN9MBK3</text>
</svg>
```

### 5.3 Rey Skywalker — Form 1 Natural, yellow (newly-attuned)

Sentinel yellow, clean stable, slight pearlescent shimmer (newly
bonded). Subtle Form 1 Natural with warmer cast.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400" role="img" aria-label="Kyber crystal, Rey yellow, sentinel">
  <defs>
    <radialGradient id="reyGlow" cx="50%" cy="55%" r="50%">
      <stop offset="0%" stop-color="#fff6b8" stop-opacity="1"/>
      <stop offset="40%" stop-color="#ffd230" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#805010" stop-opacity="0.6"/>
    </radialGradient>
  </defs>

  <rect width="300" height="400" fill="#0f0a04"/>

  <polygon points="150,40 225,115 225,305 150,370 75,305 75,115"
           fill="url(#reyGlow)" stroke="#ffd648" stroke-width="1.2" stroke-opacity="0.85"/>

  <!-- Pearlescent shimmer flecks (newly-attuned crystal) -->
  <circle cx="115" cy="140" r="2" fill="#fff9e0" fill-opacity="0.9"/>
  <circle cx="180" cy="170" r="1.5" fill="#fff9e0" fill-opacity="0.8"/>
  <circle cx="135" cy="220" r="2.2" fill="#fff9e0" fill-opacity="0.9"/>
  <circle cx="190" cy="260" r="1.8" fill="#fff9e0" fill-opacity="0.85"/>
  <circle cx="120" cy="290" r="1.5" fill="#fff9e0" fill-opacity="0.8"/>

  <!-- Structural facet lines -->
  <line x1="150" y1="40" x2="150" y2="370" stroke="#ffe890" stroke-width="0.4" stroke-opacity="0.4"/>
  <line x1="75" y1="115" x2="225" y2="305" stroke="#ffe890" stroke-width="0.3" stroke-opacity="0.3"/>
  <line x1="225" y1="115" x2="75" y2="305" stroke="#ffe890" stroke-width="0.3" stroke-opacity="0.3"/>

  <!-- QR region -->
  <g transform="translate(100, 155)">
    <rect width="100" height="100" fill="#1f1608" fill-opacity="0.45"/>
    <rect x="3" y="3" width="21" height="21" fill="#1f1608"/>
    <rect x="6" y="6" width="15" height="15" fill="#fff6b8"/>
    <rect x="9" y="9" width="9" height="9" fill="#1f1608"/>
    <rect x="76" y="3" width="21" height="21" fill="#1f1608"/>
    <rect x="79" y="6" width="15" height="15" fill="#fff6b8"/>
    <rect x="82" y="9" width="9" height="9" fill="#1f1608"/>
    <rect x="3" y="76" width="21" height="21" fill="#1f1608"/>
    <rect x="6" y="79" width="15" height="15" fill="#fff6b8"/>
    <rect x="9" y="82" width="9" height="9" fill="#1f1608"/>
    <g fill="#1f1608">
      <rect x="30" y="12" width="3" height="3"/><rect x="39" y="12" width="3" height="3"/>
      <rect x="51" y="12" width="3" height="3"/><rect x="60" y="12" width="3" height="3"/>
      <rect x="33" y="27" width="3" height="3"/><rect x="45" y="27" width="3" height="3"/>
      <rect x="57" y="27" width="3" height="3"/><rect x="69" y="27" width="3" height="3"/>
      <rect x="30" y="45" width="3" height="3"/><rect x="42" y="45" width="3" height="3"/>
      <rect x="54" y="45" width="3" height="3"/><rect x="63" y="45" width="3" height="3"/>
      <rect x="36" y="60" width="3" height="3"/><rect x="48" y="60" width="3" height="3"/>
      <rect x="60" y="60" width="3" height="3"/><rect x="75" y="60" width="3" height="3"/>
      <rect x="30" y="75" width="3" height="3"/><rect x="45" y="75" width="3" height="3"/>
      <rect x="54" y="75" width="3" height="3"/><rect x="66" y="75" width="3" height="3"/>
    </g>
  </g>

  <!-- Strong top shimmer (newly-attuned) -->
  <ellipse cx="150" cy="85" rx="40" ry="10" fill="#fffbe0" fill-opacity="0.35"/>

  <polygon points="150,370 135,385 150,378 165,385" fill="#ffd648" fill-opacity="0.75"/>

  <text x="150" y="395" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#ffd648" fill-opacity="0.7">GRY.8K3QPNXW2V9R</text>
</svg>
```

### 5.4 Kylo Ren — Form 3 Unstable, crossguard variant

Cracked crystal with diagonal fracture and exposed raw energy. Red with
visible instability. Sparking break point.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400" role="img" aria-label="Kyber crystal, Kylo Ren, cracked unstable">
  <defs>
    <radialGradient id="kyloGlow" cx="50%" cy="55%" r="50%">
      <stop offset="0%" stop-color="#ff8860" stop-opacity="1"/>
      <stop offset="30%" stop-color="#ff2010" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#400808" stop-opacity="0.7"/>
    </radialGradient>
    <filter id="kyloFlicker">
      <feGaussianBlur stdDeviation="0.5"/>
    </filter>
  </defs>

  <rect width="300" height="400" fill="#0a0408"/>

  <!-- Upper crystal half (above fracture) -->
  <polygon points="150,40 225,115 225,190 165,215 75,200 75,115"
           fill="url(#kyloGlow)" stroke="#ff3020" stroke-width="1.5" stroke-opacity="0.9"/>

  <!-- Exposed energy at fracture -->
  <polygon points="75,200 225,190 210,225 90,230"
           fill="#ff6040" fill-opacity="0.8" filter="url(#kyloFlicker)"/>
  <line x1="80" y1="215" x2="220" y2="207" stroke="#ffaa40" stroke-width="1.2" stroke-opacity="0.9"/>

  <!-- Lower crystal half (below fracture) -->
  <polygon points="75,215 225,208 225,305 150,370 75,305"
           fill="url(#kyloGlow)" stroke="#ff3020" stroke-width="1.5" stroke-opacity="0.9"/>

  <!-- Cracks radiating from fracture -->
  <path d="M 90,215 L 110,160 L 125,195" stroke="#ffaa40" stroke-width="1" fill="none" stroke-opacity="0.85"/>
  <path d="M 215,212 L 195,255 L 175,220" stroke="#ffaa40" stroke-width="1" fill="none" stroke-opacity="0.85"/>
  <path d="M 148,225 L 148,285 L 140,320" stroke="#ff8050" stroke-width="0.8" fill="none" stroke-opacity="0.75"/>

  <!-- Energy sparks at fracture edges -->
  <circle cx="82" cy="218" r="2" fill="#ffcc80" fill-opacity="0.9"/>
  <circle cx="218" cy="210" r="2" fill="#ffcc80" fill-opacity="0.9"/>
  <circle cx="150" cy="220" r="2.5" fill="#ffee90" fill-opacity="0.95"/>

  <!-- QR region — offset slightly below fracture -->
  <g transform="translate(100, 240)">
    <rect width="100" height="100" fill="#1a0404" fill-opacity="0.6"/>
    <rect x="3" y="3" width="21" height="21" fill="#1a0404"/>
    <rect x="6" y="6" width="15" height="15" fill="#ff8860"/>
    <rect x="9" y="9" width="9" height="9" fill="#1a0404"/>
    <rect x="76" y="3" width="21" height="21" fill="#1a0404"/>
    <rect x="79" y="6" width="15" height="15" fill="#ff8860"/>
    <rect x="82" y="9" width="9" height="9" fill="#1a0404"/>
    <rect x="3" y="76" width="21" height="21" fill="#1a0404"/>
    <rect x="6" y="79" width="15" height="15" fill="#ff8860"/>
    <rect x="9" y="82" width="9" height="9" fill="#1a0404"/>
    <g fill="#1a0404">
      <rect x="30" y="12" width="3" height="3"/><rect x="42" y="12" width="3" height="3"/>
      <rect x="54" y="12" width="3" height="3"/><rect x="66" y="12" width="3" height="3"/>
      <rect x="33" y="30" width="3" height="3"/><rect x="51" y="30" width="3" height="3"/>
      <rect x="63" y="30" width="3" height="3"/><rect x="72" y="30" width="3" height="3"/>
      <rect x="30" y="45" width="3" height="3"/><rect x="39" y="45" width="3" height="3"/>
      <rect x="48" y="45" width="3" height="3"/><rect x="60" y="45" width="3" height="3"/>
      <rect x="72" y="45" width="3" height="3"/>
      <rect x="33" y="60" width="3" height="3"/><rect x="45" y="60" width="3" height="3"/>
      <rect x="57" y="60" width="3" height="3"/><rect x="69" y="60" width="3" height="3"/>
      <rect x="30" y="75" width="3" height="3"/><rect x="42" y="75" width="3" height="3"/>
      <rect x="54" y="75" width="3" height="3"/><rect x="63" y="75" width="3" height="3"/>
    </g>
  </g>

  <!-- Crossguard accent crystals (two small ones flanking) -->
  <polygon points="60,250 50,260 55,280 68,275" fill="url(#kyloGlow)" fill-opacity="0.85"/>
  <polygon points="240,250 250,260 245,280 232,275" fill="url(#kyloGlow)" fill-opacity="0.85"/>

  <text x="150" y="395" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#ff6040" fill-opacity="0.7">SIT.UNS7TBLXK3QR</text>
</svg>
```

### 5.5 Darksaber — Form 4 Obsidian Bipyramid, black

Completely different form. Elongated double-pyramid, black body, white
modules for contrast. Mandalorian-era serif label.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400" role="img" aria-label="Kyber crystal, Darksaber, black obsidian">
  <defs>
    <linearGradient id="darkGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a2a2a"/>
      <stop offset="50%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </linearGradient>
  </defs>

  <rect width="300" height="400" fill="#060607"/>

  <!-- Upper pyramid -->
  <polygon points="150,30 205,100 150,200 95,100"
           fill="url(#darkGrad)" stroke="#9098a8" stroke-width="1.3" stroke-opacity="0.8"/>

  <!-- Lower pyramid -->
  <polygon points="150,200 205,290 150,380 95,290"
           fill="url(#darkGrad)" stroke="#9098a8" stroke-width="1.3" stroke-opacity="0.8"/>

  <!-- White crystalline highlights along edges -->
  <line x1="150" y1="30" x2="150" y2="380" stroke="#d0d8e8" stroke-width="0.5" stroke-opacity="0.4"/>
  <line x1="95" y1="100" x2="205" y2="100" stroke="#b0b8c8" stroke-width="0.3" stroke-opacity="0.3"/>
  <line x1="95" y1="290" x2="205" y2="290" stroke="#b0b8c8" stroke-width="0.3" stroke-opacity="0.3"/>

  <!-- QR region — black on near-black contrasted with white modules -->
  <g transform="translate(100, 155)">
    <rect width="100" height="100" fill="#0a0a0c" fill-opacity="0.85"/>
    <!-- Finder patterns — white on black for darksaber inversion -->
    <rect x="3" y="3" width="21" height="21" fill="#d8dce4"/>
    <rect x="6" y="6" width="15" height="15" fill="#0a0a0c"/>
    <rect x="9" y="9" width="9" height="9" fill="#d8dce4"/>
    <rect x="76" y="3" width="21" height="21" fill="#d8dce4"/>
    <rect x="79" y="6" width="15" height="15" fill="#0a0a0c"/>
    <rect x="82" y="9" width="9" height="9" fill="#d8dce4"/>
    <rect x="3" y="76" width="21" height="21" fill="#d8dce4"/>
    <rect x="6" y="79" width="15" height="15" fill="#0a0a0c"/>
    <rect x="9" y="82" width="9" height="9" fill="#d8dce4"/>
    <!-- Data modules in white -->
    <g fill="#d8dce4">
      <rect x="30" y="9" width="3" height="3"/><rect x="42" y="9" width="3" height="3"/>
      <rect x="54" y="9" width="3" height="3"/><rect x="63" y="9" width="3" height="3"/>
      <rect x="33" y="27" width="3" height="3"/><rect x="45" y="27" width="3" height="3"/>
      <rect x="57" y="27" width="3" height="3"/><rect x="69" y="27" width="3" height="3"/>
      <rect x="30" y="45" width="3" height="3"/><rect x="42" y="45" width="3" height="3"/>
      <rect x="54" y="45" width="3" height="3"/><rect x="66" y="45" width="3" height="3"/>
      <rect x="75" y="45" width="3" height="3"/>
      <rect x="33" y="60" width="3" height="3"/><rect x="45" y="60" width="3" height="3"/>
      <rect x="60" y="60" width="3" height="3"/><rect x="72" y="60" width="3" height="3"/>
      <rect x="30" y="75" width="3" height="3"/><rect x="39" y="75" width="3" height="3"/>
      <rect x="51" y="75" width="3" height="3"/><rect x="63" y="75" width="3" height="3"/>
    </g>
  </g>

  <!-- Faint specular highlight -->
  <polygon points="130,80 145,100 135,140" fill="#4a4a52" fill-opacity="0.6"/>

  <text x="150" y="395" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#9098a8" fill-opacity="0.75">DRK.0BSIDIAN.PKA</text>
</svg>
```

## 6. Polish register

Animations and effects that bring the crystal to life. All respect
`prefers-reduced-motion`. All are optional-additive — the crystal
renders correctly without them.

| Trigger | Animation | Duration |
|---|---|---|
| Idle (in UI) | Gentle internal glow pulse matching blade SmoothSwing hum | continuous |
| Hover | Subtle 3D parallax tilt toward cursor (±5deg) | on hover |
| Clash preview | White-hot flare, then settle | 200ms |
| Preset saved | Sparkle + faint bloom | 500ms |
| Preset loaded | Un-tunes to pearlescent → re-tints to new config | 300ms |
| First Wizard completion | Pearlescent emergence → colour bond (the discovery moment) | 2000ms, plays ONCE ever |
| Scanning another crystal (attune) | Pearlescent dim → take on scanned config's identity | 2000ms |
| Base colour → red transition | **Bleed**: darken, fissures appear, red seeps outward | 1500ms, once per red transition |
| Red → non-red transition | **Heal**: bleed animation in reverse, fissures close, new colour floods | 1500ms, once per heal transition |
| Unstable style enabled | Hairline fracture "breathes" (1hz slow flicker) | continuous |
| Preon enabled | Outer halo / aura visible, breath-before-ignition pulse | continuous |
| SmoothSwing playing audio | Internal glow ripples in sync with audio envelope | continuous |
| Blade clash in preview | Crystal flares harder than idle pulse | 200ms |
| Blade lockup in preview | Crystal fixes bright at lockup position | for duration of lockup |

## 7. Rendering placement in the app

From your spec:

1. **Saber Card** — small accent in bottom-right of the card (secondary
   to the hero blade render). See `SHARE_PACK.md` for card template.
2. **"My Crystal" dockable Workbench panel** — expandable/minimizable
   sidebar showing the current config's live crystal. Docks like any
   other panel in `ColumnGrid`.
3. **Crystal Vault panel** — persistent collection of crystals the user
   has scanned or saved, alongside their own. Separate from `PresetGallery`;
   this is the social / remix layer.
4. **Hilt emitter integration** — for sabers using the
   `ACCENT_TOPOLOGY` preset (which has the "Crystal Chamber" segment at
   LEDs 132-139), the on-screen crystal UI element renders IN SYNC with
   those LEDs. The crystal in the app is a direct visualisation of the
   crystal in the user's hilt. Stretch goal: camera-zoom reveal of this
   in Fullscreen preview.
5. **Favicon / tab icon** — once a user has a saber, replace the
   default KyberStation favicon with a tiny rendering of their crystal.
   Small touch, big ownership signal.

## 8. QR scan validation plan

Before committing the final visual system, we validate every crystal
form scans reliably:

1. Generate a real QR for a sample config via `qrcode` npm library
2. Render as crystal SVG with all decorative overlays
3. Open SVG in browser at 300×400px render
4. Scan from a phone camera using the default Camera app (iOS) and
   Google Lens (Android)
5. Confirm:
   - Scans within 2 seconds of steady aim
   - Decodes to the correct URL (`kyberstation.app/editor?s=<glyph>`)
   - Works at printed business-card size (3cm × 3cm physical render)
   - Survives one JPEG re-compression pass (simulating chat platforms)

If ANY form fails any test, we pivot the decorative overlay (never the
functional QR core) until it passes. Functional QR region is sacred.

## 9. Implementation phases

**Phase 1 — Generator core.** `scripts/render-crystal.mjs` produces
real QR-backed SVGs for each of the 5 forms from a sample config.
Validates scan survivability. Lands in `apps/web/lib/crystal/renderer.ts`.

**Phase 2 — Live in-app rendering.** `<KyberCrystal config={...} />`
React component. Integrates with `useCrystalAccent` (already exists,
publishes `--crystal-accent`). Subscribes to `bladeStore` for live
tuning.

**Phase 3 — Animation layer.** Bleed, heal, attune, first-discovery,
polish register. `prefers-reduced-motion` respects. Uses existing
animation primitives from the engine.

**Phase 4 — Placement rollout.** My Crystal panel in ColumnGrid,
Crystal Vault panel, Saber Card accent, favicon replacement. Each a
separate PR within the Share Pack sprint.

**Phase 5 — Hilt emitter sync.** Stretch goal. Renders crystal inside
the ACCENT_TOPOLOGY Crystal Chamber segment in Fullscreen preview.
Camera-zoom animation optional.

## 10. Handoff notes

When Share Pack's crystal implementation session picks this up:

1. **Ship Phase 1 alone first.** Get a scannable crystal into the
   codebase before any UI work. That de-risks the single biggest
   assumption (aesthetic overlay survives scanning).
2. **Test on real phones, not emulators.** QR decoding varies by
   camera app, phone model, ambient light. Test at least iOS + Android
   before locking the visual system.
3. **Don't pretty-fy the QR module shapes.** Tempting to make them
   hexagons for aesthetic consistency. It breaks scanners. Keep them
   rectangular — let the surrounding crystal silhouette carry the
   aesthetic load.
4. **Version the visual system.** See `KYBER_CRYSTAL_VERSIONING.md`.
   Every crystal carries its visual-system version so we can evolve
   the art without invalidating existing crystals.
5. **The Crystal Chamber LED segment is a gift.** Don't just render
   the crystal *beside* the hilt in Fullscreen — render it *inside*
   the hilt, in sync with the physical LED positions of the
   `ACCENT_TOPOLOGY` preset. That's the feature nobody else has.
