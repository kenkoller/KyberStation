# Hilt Part Authoring Spec — v1

**Purpose:** Every `HiltPart` in `apps/web/lib/hilts/parts/` conforms
to this spec so that any part composes cleanly with any other. This
is the contract Stage 2 artist agents follow.

**Version:** 1.0 (2026-04-17)
**Scope:** v0.11.2 modular hilt library foundation.

---

## 1. Coordinate system & units

- **Design-space units**: one SVG unit = `1/96"` of a real hilt. So a
  1.25" diameter (common Hollywood saber-prop size) = **30 units**.
- **Canvas**: each part authored in a rectangular viewBox sized to
  its own intrinsic dimensions. The composer stacks parts vertically;
  horizontal centering handled by the renderer.
- **Vertical axis**: top = low Y, bottom = high Y. The emitter always
  points **up** (toward Y=0) in a part's local frame.

### Standard part canvas sizes (height × width)

| Part type | Width | Typical height | viewBox |
|---|---|---|---|
| emitter | 48 | 40–60 | `0 0 48 Hh` |
| shroud | 48 | 30–60 | `0 0 48 Hh` |
| switch | 48 | 40–80 | `0 0 48 Hh` |
| grip | 48 | 80–160 | `0 0 48 Hh` |
| pommel | 48 | 30–50 | `0 0 48 Hh` |
| accent-ring | 48 | 4–10 | `0 0 48 Hh` |

Width is uniform at **48 units**. This gives each part a comfortable
drawing canvas around the connector diameters (widest connector is
36 units; 48 leaves room for flares, guards, wings).

Vertical height is variable — author sizes the part to its actual
silhouette. The composer respects it.

---

## 2. Interface diameter classes

Only matching classes mate without adapter parts. Rendered width of
the interface ring (in SVG units):

| Class | Real-world analog | SVG units | Use when |
|---|---|---|---|
| `narrow` | 1.0" | 24 | Compact/shoto builds, Yoda-style |
| `standard` | 1.25" | 30 | **Default** — most single hilts |
| `wide` | 1.5" | 36 | Crossguards, beefy sith designs |

### Horizontal centering
The connector centerline for every part sits at **`cx = 24`** (canvas
center). This is non-negotiable — the composer assumes centered
stacking.

### Vertical connector position
- `topConnector.cy` = `0` (top edge of canvas)
- `bottomConnector.cy` = part's `height` (bottom edge of canvas)

### When connectors don't mate
The composer's `strict` mode errors; `permissive` mode auto-scales
the smaller to match (small visual distortion accepted). Assemblies
shipped with KyberStation must use `strict` matching — inter-part
mismatch is an authoring bug, not a user concern.

---

## 3. Line weights & stroking

| Element | Stroke width | Fill |
|---|---|---|
| Body silhouette | `0` (fill only) | linear gradient (see §4) |
| Body outline | `1` (hairline, optional edge darkening) | none |
| Accent shape | `0` (fill only) | flat colour (see §4) |
| Detail lines | `1.5` | none |
| Micro-detail (screws, tiny rivets) | `1` | none |

All strokes use `stroke-linecap="round"` and `stroke-linejoin="round"`
unless a design specifically calls for sharp corners.

**Critical:** do NOT set line weights ≥2. The detail has to stay
readable at thumbnail size (48 × 48 px in the selector). Thicker
lines mush.

---

## 4. Colour palette (locked)

All colours are CSS values — the SVG inlines them directly. No
`currentColor` for body or accent; strokes may use `currentColor`
when theme-tinting is desired.

### Metal body gradient (all parts)
```xml
<linearGradient id="metal-body" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#3a3a3e"/>   <!-- lit top -->
  <stop offset="60%"  stop-color="#26262a"/>   <!-- midshadow -->
  <stop offset="100%" stop-color="#16161a"/>   <!-- deep shadow -->
</linearGradient>
```
Use `fill="url(#metal-body)"` on the bodyPath.

### Accent palette (optional — per part)
| Name | CSS | Use for |
|---|---|---|
| `brass` | `#b08a4a` | Graflex clamp, vintage fittings |
| `bronze` | `#8b6a3a` | Dooku-style warm accents |
| `copper` | `#9e5b32` | Weathered/aged warm |
| `chrome` | `#b8b8bc` | Polished silver accents |
| `leather-dark` | `#3a2a1e` | Wrap grips |
| `black-grip` | `#141418` | Rubberised grip sections |
| `sith-red` | `#5a1a1a` | Sith accent bands |

### Detail stroke colour
Default: `stroke="#e4e4e8"` (near-white, ~90% luminance). High enough
contrast against body gradient to read, soft enough to not scream.

If a part wants theme-tintable detail (rare), use `stroke="currentColor"`
and document it in the part file's header comment.

---

## 5. Shading direction

**Light from top-right (45°)**, consistent across every part. This
means:
- Gradient runs vertical (top bright, bottom dark) — handled by
  the `metal-body` gradient
- Detail lines indicating edges/ridges should use variable opacity:
  - Top/right edges of ridges: `opacity="0.95"`
  - Bottom/left edges of ridges: `opacity="0.65"`
- Screws, rivets, buttons: highlight dot at top-right of each

Keep it simple — we're aiming for "consistent blueprint feel", not
photoreal.

---

## 6. Part file structure

Each part is a single TypeScript module under
`apps/web/lib/hilts/parts/<type>/`.

```ts
// apps/web/lib/hilts/parts/emitters/graflex.ts
//
// Graflex-style emitter — Original art, MIT, KyberStation v0.11.2
// Inspired by the Graflex 3-cell flash reflector (public-domain
// photographic prop from the 1940s–60s used in Lucasfilm's
// original-trilogy lightsaber props).

import type { HiltPart } from '../../types';

export const graflexEmitter: HiltPart = {
  id: 'graflex-emitter',
  displayName: 'Graflex Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 52',
    width: 48,
    height: 52,
    bodyPath: 'M 12 0 L 36 0 L 38 6 L 38 46 L 40 52 L 8 52 L 10 46 L 10 6 Z',
    accentPath: 'M 10 18 L 38 18 L 38 34 L 10 34 Z',
    detailPath: 'M 14 4 L 34 4 M 14 8 L 34 8 M 14 40 L 34 40 M 14 46 L 34 46',
  },
  topConnector:    { diameter: 'standard', cx: 24, cy: 0  },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 52 },
  era: 'original',
  faction: 'jedi',
};
```

Every part file exports **one named const** of type `HiltPart`. The
export name is `camelCase(<id>)`.

### Required fields
- `id` — kebab-case, unique across all parts
- `displayName` — user-facing label
- `type` — one of the PartType values
- `svg.viewBox`, `svg.width`, `svg.height`, `svg.bodyPath`, `svg.detailPath`
- `topConnector`, `bottomConnector`

### Optional fields
- `svg.accentPath` — omit if no coloured accent
- `era`, `faction` — used for filtering in UI

### Forbidden
- `<script>`, `<foreignObject>`, external `<image>`/`<use>` refs,
  `javascript:` URIs, `on*` event attributes. (Even though parts
  ship in-repo and aren't user-authored, enforcing this keeps the
  eventual BYO-import story identical.)
- External font references (use raw path data for any glyph detail)
- Hardcoded theme colours inside detail paths — must route through
  the palette above

---

## 7. Registration

Each part is imported and registered in
`apps/web/lib/hilts/catalog.ts`:

```ts
// catalog.ts
import { graflexEmitter } from './parts/emitters/graflex';
import { mppEmitter } from './parts/emitters/mpp';
// … etc

export const PART_CATALOG: Record<string, HiltPart> = {
  [graflexEmitter.id]: graflexEmitter,
  [mppEmitter.id]: mppEmitter,
  // …
};

export function getPart(id: string): HiltPart | undefined {
  return PART_CATALOG[id];
}
```

Keep imports alphabetized within each type group. Merge conflicts
are trivial when three agents add parts to this file simultaneously
(each adds their own import lines and object entries; ordered merge
handles it).

---

## 8. Assembly authoring

`apps/web/lib/hilts/assemblies.ts`:

```ts
import type { HiltAssembly } from './types';

export const graflexAssembly: HiltAssembly = {
  id: 'graflex',
  displayName: 'Graflex',
  archetype: 'single-classic',
  era: 'original',
  faction: 'jedi',
  description:
    'Classic single-hilt design inspired by the Graflex flash-gun. '
    + 'Signature gold clamp and activation button.',
  parts: [
    { partId: 'graflex-emitter' },
    { partId: 'classic-choke' },
    { partId: 'graflex-switch' },
    { partId: 't-tracks-grip' },
    { partId: 'classic-pommel' },
  ],
};
```

Assembly ids are the public API for preset bindings — never rename
once shipped. Rename `displayName` freely.

---

## 9. Quality bar

A part is ready when:

1. **Renders cleanly at 96px width** (smaller than 2× because we
   thumbnail in selectors and may inline in tooltips).
2. **Connects visually at both ends** — when placed between two other
   parts via `composer.resolveAssembly()`, there is no visible seam,
   overhang, or colour gap.
3. **Reads as metal**, not as a line drawing — the filled body with
   gradient is the load-bearing element. Detail strokes are garnish.
4. **Composes with Graflex** — if you drop your part into the Graflex
   assembly in place of any compatible slot, it still looks like a
   coherent lightsaber. If not, it's either too stylistically distinct
   (rein it in) or its connector diameter was wrong (fix it).
5. **Passes typecheck + lint** — the part file must compile and lint
   clean.

---

## 10. Style reference

The **Graflex assembly** (built in Stage 1) is the canonical style
reference for every other part. Its five parts are checked into
`apps/web/lib/hilts/parts/` before Stage 2 starts. Agents mimic:

- Body gradient treatment (all via `url(#metal-body)`)
- Detail-line density — enough to feel mechanical, not so much as
  to look busy
- Accent usage — one restrained coloured region per part max (the
  Graflex gold clamp is the canonical example)
- How adjacent parts kiss at the connector (1–2 unit overlap is
  typical; composer handles the math)

**Side-by-side test:** any new part placed next to a Graflex part
should read as being from the same drafting hand. If an agent's
parts feel visibly different in weight, shading, or density — the
spec is being violated somewhere and we'll ask for a revision
before merging.

---

## 11. Gradient deduplication

Every part defines `<linearGradient id="metal-body">`. Naive render
would result in multiple `<defs>` with the same id — browsers pick
the last. This is actually fine for our use: all parts use the same
gradient, so the resolved stops are identical regardless of which
wins.

If this ever becomes a problem (e.g. variant gradients), the
composer will namespace gradient ids per-part. Not worth doing
preemptively.

---

## 12. Checklist (copy into PR description)

- [ ] Part viewBox width = 48
- [ ] Top connector `cx = 24`, `cy = 0`
- [ ] Bottom connector `cx = 24`, `cy = height`
- [ ] Body uses `url(#metal-body)` gradient fill
- [ ] Detail strokes use spec palette + widths
- [ ] Shading consistent with top-right light
- [ ] No forbidden SVG features
- [ ] Registered in `catalog.ts` with alphabetized imports
- [ ] Renders cleanly next to Graflex reference parts (manual QA)
- [ ] Typecheck + lint green

---

## Appendix A — Part naming conventions

- `id`: `{archetype-hint}-{type}` or `{descriptor}-{type}`
- Examples: `graflex-emitter`, `ribbed-grip`, `pointed-pommel`
- No character names in part ids — archetype descriptors only. Canon
  names live on **assemblies** and **presets**, not parts.
