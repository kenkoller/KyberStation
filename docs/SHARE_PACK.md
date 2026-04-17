# Share Pack — Jedi Holocron Saber Card

**Status:** Planned (post-v0.11.0). This doc is the spec — implementation
lives in the session that picks it up.

**One-line goal:** When a user wants to show off a blade they designed,
they get a single click → a beautifully rendered "Saber Card" (still
image, animated GIF, or **Kyber Glyph** — a self-contained
text-or-QR code that fully encodes the config) that anyone can load
back into KyberStation with zero friction and zero backend.

---

## Why this deserves to be its own feature

Today's `ShareButton` copies a `?config=<base64>` URL to the clipboard.
That works, but the payload is ugly, the preview is generic, and it
looks nothing like Star Wars. The user asked for something "as in-universe
and Star-Wars-esque as possible" with a "fun and easy way for people to
share their designs."

The Share Pack is the answer: a standardised, templated artefact that
looks like a Jedi Archive data card (or Sith Holocron, theme permitting),
branded as KyberStation, with the blade's key visual + identity data
baked in and the full config recoverable.

## Anatomy of a Saber Card

**The blade on its hilt is the hero.** The Kyber Crystal is important
as the sharing mechanism (it carries the QR-backed config), but on the
card it's a secondary accent element — never stealing attention from
the lightsaber itself. The saber IS the artefact; the crystal is its
signature.

The card is a rectangular graphic at **1200 × 675** (Twitter / Discord OG
aspect, renders cleanly as a WhatsApp / iMessage thumbnail too). Layout:

```
┌──────────────────────────────────────────────────────────────┐
│  ◈ KYBERSTATION   ARCHIVE DATA CARD                          │ ← header band
│                                                              │
│                                                              │
│  ╔═════════════════════════════════════════════════════════╗ │
│  ║                                                         ║ │
│  ║    ▓▓▓▓▓╡══════════════════════════════════════════     ║ │ ← HERO: hilt + blade
│  ║    HILT                    BLADE RENDER                 ║ │    (70% of canvas)
│  ║                                                         ║ │
│  ╚═════════════════════════════════════════════════════════╝ │
│                                                              │
│  "Obi-Wan (Prequel)" — "Dawnlight"             ◆            │ ← preset + crystal name
│  Stable · Sky Blue · Standard ignition 300ms  ╱▓╲           │   crystal accent
│  JED.4X7QPN9MBK3F                            │▓▓▓│           │   (small, bottom-right)
│                                               ╲▓╱            │
│  github.com/kenkoller/KyberStation            ▼             │ ← footer + glyph
└──────────────────────────────────────────────────────────────┘
```

**Chrome (border / header / footer):**
- Dark deep-space backdrop with subtle radial gradient toward the blade
- Thin hairline border in a theme-aware accent colour (default:
  `--accent`)
- Header: KyberStation glyph + word-mark + "ARCHIVE DATA CARD"
  (monospace, aurebesh-ish font stack)
- Footer: repo URL (so someone who screenshots the card still has a
  route back to the app) + glyph prefix

**Hero area (saber — 70% of canvas):**
- The hilt silhouette from the curated hilt library (or user-designed
  hilt, if that feature ships)
- Full-length blade render emanating from the hilt's emitter, using the
  diffused neopixel path from `BladeCanvas`
- Slight subtle glow / bloom around the blade matching `baseColor`
- Background is deep-space dark; blade's own bloom carries the colour

**Label strip:**
- Preset name (if saved) + em-dash + crystal public name (if set)
  e.g. `"Obi-Wan (Prequel)" — "Dawnlight"`
- One-line spec: `<style> · <base-colour name> · <ignition> <ms>ms`
- Kyber Glyph (shortened view) as monospace accent text
- Affiliation badge (Jedi / Sith / Grey / Neutral) using the existing
  `factionStyles.ts` colour map

**Crystal accent (bottom-right, ~8% of canvas):**
- Small rendering of the saber's Kyber Crystal — see
  `KYBER_CRYSTAL_VISUAL.md` for the full spec
- The QR inside the crystal IS the functional share mechanism; even at
  this small size, printed at business-card scale it scans
- Never dominates — if in doubt, render it smaller
- For multi-blade sabers, the crystal accent shows the appropriate
  multi-crystal arrangement (paired for saberstaff, primary+quillons
  for crossguard — see "Multi-blade saber silhouettes" below)

## Blade-to-scale (the saber looks like the user built)

The card should visually represent the saber the user actually designed.
No default-size rendering that makes a shoto look identical to a combat
blade.

**Blade length logic:**

- `ledCount` correlates to physical blade length via strip spacing:
  - `ledCount / 4 ≈ inches` for 1/4-inch spacing (most common Neopixel)
  - `ledCount / 2 ≈ inches` for 1/2-inch spacing (diffused strip)
- Typical sizes:
  - 144 LEDs ≈ 36" full combat blade
  - 108 LEDs ≈ 27" standard blade
  - 72 LEDs ≈ 18" shoto
  - 36 LEDs ≈ 9" training blade / dagger
  - 200+ LEDs ≈ long combat saber

**Card rendering rules:**

- **Hilt width is fixed** (~180px on a 1200×675 canvas) regardless of
  configuration — keeps the visual anchor consistent
- **Blade length scales proportionally.** A 36" blade fills ~85% of the
  hero area width; a shoto fills ~40%; a dagger fills ~20% with generous
  negative space
- **Negative space is honest, not filled.** A shoto preset gets lots of
  blank hero area — that's the correct visual representation, and it
  makes the card visibly distinct from a full-length preset
- **Glow/bloom scale with blade length** — a shoto has a smaller bloom
  radius than a combat blade
- **Emitter flare stays proportional to the hilt**, not the blade

This matters because users who build shotos, daggers, or oversized
combat blades deserve to SEE their build reflected on the card. Blade-
to-scale means the artefact reads as *their* saber, not a generic
template.

## Multi-blade saber silhouettes

The card template accommodates single-blade and multi-emitter sabers
from day one. Workbench editing for multi-blade lands in v0.15; card
*rendering* is ready for it now so imported multi-blade configs look
right even before the workbench can edit them.

### Silhouette per saber type

**Single-blade (default):**
- Hilt at centre-bottom of hero area, blade extending upward/rightward
- Occupies the hero region as described above

**Dual-blade / saberstaff (Maul, Asajj Ventress, Pong Krell):**
- Hilt at horizontal centre, extending *both* directions
- Blade A extends left; Blade B extends right
- Each blade scales to its own `ledCount` (asymmetric blades supported:
  Blade A might be 108 LEDs, Blade B might be 72 LEDs for a non-symmetric
  build)
- Crystal accent shows *two* kyber crystals, paired side-by-side

**Crossguard (Kylo Ren-style):**
- Single primary hilt at centre-bottom
- Primary blade extends full-length from the top of the hilt
- Two short quillon blades extend laterally from the hilt midpoint
- Quillon blades use their own `BladeConfig` (typically a shorter,
  spikier configuration — Kylo's are unstable)
- Crystal accent shows primary crystal + two smaller accent crystals
  flanking it

**Darksaber:**
- Distinctive hilt silhouette (squared, Mandalorian-styled)
- Single short blade extending upward — always renders shorter than a
  standard blade to match the ~30" canon length
- Blade is *black* with a *white* edge-glow (inversion of normal
  neopixel render)
- Crystal accent uses the Form 4 Obsidian Bipyramid

**Unsupported-yet (shows read-only in v1 workbench):**
- Tri-blade emitters from a middle-grip (some Rebels Inquisitor
  configurations) — glyph format supports it, but card silhouette for
  this specific topology is TBD in v0.15+

### Import-time degradation

If a user on a single-blade-only workbench imports a multi-blade crystal
via scan:

1. Crystal decodes normally (glyph format supports multi-blade from v1)
2. Saber Card displays the correct multi-blade silhouette
3. Crystal Vault stores the complete multi-blade config
4. Workbench shows a read-only preview of all blades
5. Only Blade A is editable; other blades show a soft notice
   *"Multi-blade editing arrives in v0.15. Until then, Blade B preserves
   its scanned configuration."*

No data loss. No broken round-trip.

## Public Archive indicator

When a crystal's config has been contributed to the community gallery
(via the GitHub-PR flow documented in `COMMUNITY_GALLERY.md`), its Saber
Card surfaces a small badge in the header strip:

```
┌──────────────────────────────────────────────────────────────┐
│ ◈ KYBERSTATION   ARCHIVE DATA CARD   [ ✦ IN THE ARCHIVE ]   │ ← badge visible
│                                                              │   when contributed
│                                                              │
│  ... (rest of card) ...                                      │
```

**Detection is purely client-side:**

1. Card renderer hashes the current `saberConfig` payload
2. Compares the hash against the index file shipped in the preset bundle
   (`packages/presets/src/characters/community/_index.ts`)
3. If hash matches a gallery entry, renders the badge + gallery metadata

**Additional tags** surface below the base "IN THE ARCHIVE" badge if a
maintainer has tagged the gallery entry:

- `[ ★ FEATURED ]` — maintainer-highlighted
- `[ ⚜ LEGENDARY ]` — community favourite
- `[ ✎ RECENTLY ADDED ]` — new within the last 30 days

All tags are maintainer-curated via PR comments/labels in the community
gallery repo. Zero backend; zero moderation burden beyond normal PR
review.

**Contributor attribution** also appears in the card footer when a
preset is in the archive:

```
│  Contributed by @alice · Archived 2026-05-02                 │
│  github.com/kenkoller/KyberStation                           │
```

Gives credit where it's due and makes the GitHub-PR contribution model
visible to everyone who views a Saber Card of an archived preset.

## Four share formats (all planned, user chose all four)

### 1. Static PNG (default — fastest, smallest)

- 1200×675 PNG, ~80–120 kB
- Rendered client-side via `OffscreenCanvas` (fallback: regular canvas)
- Blade is a snapshot of `BladeCanvas` at the current tick
- File name: `<preset-slug>-<seed>.png`

Use case: "Here's my blade" in a Discord / reddit / forum post.

### 2. Animated GIF — hum loop (showcase)

- 1200×675, 24 fps, 3-second loop, dithered palette
- Blade in its resting idle state with natural flicker
- Target file size: **≤ 1.5 MB** (GIF is verbose — we'll aim for an
  early cap and negotiate down by dropping fps / reducing palette if
  needed)
- File name: `<preset-slug>-<seed>.gif`

Use case: Twitter / X, Discord, animated preview in chat.

### 3. Animated GIF — state cycle (showcase pro)

Same format as (2), but 6-second loop showing:
- 0.0–1.0s: ignition
- 1.0–2.5s: idle hum
- 2.5–3.0s: clash (or other user-picked effect)
- 3.0–4.5s: idle hum
- 4.5–5.0s: blast / lockup / force (user-picked)
- 5.0–6.0s: retraction → black

User picks which two effects to showcase (or we pick based on what the
blade has configured). Caps at ~2.5 MB.

Use case: Showing off a preset's effect work, not just its idle colour.

### 4. Kyber Glyph — full-encoding seed + QR dual form

**The seed and the QR code are the same artefact — one's a text
encoding of the config, one's the visual rendering of the same string.
Either one round-trips losslessly back into KyberStation.**

Rationale: a lookup-key-only seed is redundant if it needs an
accompanying PNG to decode. Making the seed carry the full config makes
it a real sharing primitive — you can paste it into a chat, scan it
from a screenshot, extract it from a QR code, or type it off a screen
at a con. One thing, not two.

#### Text form

- **3-char archetype prefix** + `.` + **~20–60 char base58 suffix**
- The suffix length is **variable** — typical blades encode in 20–35
  chars; maximum-complexity configs (all spatial effects engaged, custom
  colours for every slot, long Preon, dual-mode ignition) hit ~60–80
  chars
- Example (typical): `JED.4X7QPN9MBK3F0Z8A2YHL`
- Example (maximum): `SIT.4X7QPN9MBK3F0Z8A2YHL6WCV1NR5T9EQJUKOWXYMD`
- Prefix (`JED` / `SIT` / `GRY` / `CNO` / `SPC`) comes from the Saber
  Wizard archetype or `detectStyle` heuristics; it's *part of the
  encoding* (1 byte) so it doesn't cost extra length
- Encoding pipeline: `config` → delta against default → MessagePack →
  zlib DEFLATE → base58

#### Visual form (Kyber Glyph)

- Same string rendered as a **QR code** (Version 2 for typical configs,
  Version 3 for maximum — both scan reliably from a phone at
  business-card size)
- Ships as a 300×300 PNG or inline SVG
- Styled "in-universe": dark square glyphs on a deep-space backdrop,
  with a thin accent hairline border matching the blade's base colour —
  reads as an Imperial / Holocron data code rather than a supermarket
  barcode
- Appears in the Saber Card's header strip as an accent element (next
  to the archetype prefix), and on its own as a downloadable image for
  contexts where the full card is overkill

#### Why full encoding instead of lookup-key

- **Self-contained.** Paste the string anywhere and it works — no
  dependency on PNG metadata surviving Discord / Twitter re-encoding,
  no IndexedDB lookup layer, no server round-trip
- **Offline compatible.** The app can decode a seed even if it's the
  very first thing the user does after installing KyberStation
- **Future-proof.** Third-party tools (ProffieOS Workbench, Fett263's
  style library) could read Kyber Glyphs without needing to talk to
  KyberStation servers (we don't have any anyway)
- **In-universe.** A scannable glyph reads as Star Wars; a "look up
  this ID against our database" seed reads as web2

#### Example use cases

| Context | What the user shares |
|---|---|
| Discord / reddit post | PNG Saber Card (QR embedded in header) |
| Voice chat / con meetup | Types out the text form from memory or a screenshot |
| Phone camera scan | QR code rendered on someone else's screen |
| URL share | `kyberstation.app/editor?s=JED.4X7QPN9MBK3F0Z8A2YHL` |
| Bare chat paste | Text form, app auto-detects and offers "Load this blade?" |
| Printed business card | QR glyph + archetype prefix, scan to load |

#### Implementation sketch

```ts
// apps/web/lib/sharePack/kyberGlyph.ts
import { pack, unpack } from 'msgpackr';
import { deflateRaw, inflateRaw } from 'pako';
import bs58 from 'bs58';

const DEFAULT_CONFIG: BladeConfig = { /* canonical default */ };

export function encodeGlyph(config: BladeConfig): string {
  const prefix = archetypeOf(config);                   // "JED" | "SIT" | …
  const delta  = diff(config, DEFAULT_CONFIG);          // only changed fields
  const packed = pack(delta);                           // MessagePack
  const zipped = deflateRaw(packed, { level: 9 });     // zlib raw
  const coded  = bs58.encode(zipped);                   // base58
  return `${prefix}.${coded}`;
}

export function decodeGlyph(glyph: string): BladeConfig {
  const [prefix, coded] = glyph.split('.');
  const zipped = bs58.decode(coded);
  const packed = inflateRaw(zipped);
  const delta  = unpack(packed);
  return applyDelta(DEFAULT_CONFIG, delta, prefix);
}
```

Dependencies: `msgpackr` (~25 kB), `pako` (~45 kB), `bs58` (~4 kB),
`qrcode` (~55 kB for the canvas renderer). Total footprint ≈ 130 kB —
acceptable for a showcase feature.

#### Size sanity check

Measured on representative configs via the shipped v1 encoder
(`apps/web/lib/sharePack/kyberGlyph.ts`):

| Config | base58 body chars | QR version |
|---|---|---|
| Obi-Wan default | 18 | Version 1 |
| Typical custom (≈5 fields tweaked) | ~130 | Version 4 |
| Max-complexity (35+ fields, all spatial + dual-mode + preon + motion) | ~490 | Version 8 |

**Note:** these numbers replace earlier pre-implementation estimates
(which guessed max-complexity at ~112 chars / Version 3). The real v1
schema carries saber metadata (hilt model, prop file, sound/OLED refs,
public name, `extras` bag) in addition to the BladeConfig delta — the
overhead is cheap for typical blades (default encodes in 18 chars) but
compounds at the max. Everything still scans fine from a 3cm × 3cm
printed glyph through QR Version 8, but the graceful-overflow fallback
(item 4 in the ladder below) becomes load-bearing at a smaller
feature-complexity footprint than the original table implied.

#### What the glyph can and can't capture

**v1 glyph captures all of `BladeConfig`:**

- 9 colour slots (base, clash, blast, lockup, drag, melt, stab,
  lightning, preon)
- Style / ignition / retraction IDs
- All timing values (ignition/retraction/preon ms)
- All 10 spatial fields (lockup/blast/drag/melt/stab × position/radius)
- Dual-mode ignition + up/down variants, Preon enabled, shimmer,
  LED count

This covers ~95% of what the editor produces today.

**What's intentionally outside v1:**

| Field | Why not in v1 | Workaround |
|---|---|---|
| Style-specific param bag (`[key: string]: any`) | Schema varies per style | v2 glyph format can add this as a MessagePack blob |
| Multi-blade SaberProfile | Glyph = one blade | Future `.kybersaber` ZIP export |
| Sound font WAV files | Too large (MB-scale) | Glyph carries a font *reference*; user supplies files |
| OLED bitmap content | Too large | Bitmap reference only |
| Custom Bezier easing curves | Would bloat typical glyphs | v3 if we ever ship authoring |
| Arbitrary imported `Layers<>` trees beyond editor-generated shapes | Editor only emits patterns it understands | Parser warnings already surface this today |

**Graceful overflow ladder** (revised against measured v1 encoder output):

1. Default / near-default blade → glyph (~18–40 chars, QR Version 1–2)
2. Typical custom blade → glyph (~100–160 chars, QR Version 3–4)
3. Max-complexity standard config (all spatial, dual-mode, preon,
   motion reactivity) → glyph (~400–500 chars, QR Version 7–8)
4. v2/v3 schema additions (style params, custom easing, etc.) → glyph
   may hit ~600+ chars, QR Version 10+
5. Hard ceiling (QR capacity exceeded OR length > 700 chars) → fall
   back to `?config=<base64>` URL with a toast: *"This blade's too
   intricate for a glyph — here's a share link instead."* **This
   fallback path is not yet implemented in the encoder — detection and
   toast are a follow-up sprint.**
6. Genuine multi-blade saber → `.kybersaber` ZIP export (separate
   feature, not in Share Pack scope)

The fallback URL is always available, so no blade is ever un-shareable
— some just don't get the pretty glyph.

#### What about barcodes?

Considered and rejected: 1D barcodes max out at ~40 alphanumeric chars
before the bars get unreadably thin, and they look *less* Star Wars (too
supermarket-y) than a QR code. QR codes are already part of the Star
Wars design language — Rogue One and Andor use them explicitly as
Imperial data tags.

## Standardised template (important)

User called this out explicitly: **everybody's expectations should be on
the same page.** There is exactly one Saber Card template per app
version. Variations are:

- Theme preset (deep-space / Mustafar / Hoth / Endor — picks up
  background hue and accent)
- Affiliation badge (Jedi / Sith / Grey / None)
- Content variant (still / hum-GIF / state-cycle-GIF)

Users cannot freely reposition elements. Rationale: a consistent frame
means a shared Saber Card is instantly recognisable as "a KyberStation
card" in a feed of random lightsaber screenshots.

Future: advanced users may get a "Studio Card" option with layout
freedom — that's a separate feature request, not part of the initial
Share Pack.

## Technical sketch

**New files:**
```
apps/web/lib/sharePack/
├── card-renderer.ts         # Offscreen canvas → PNG / GIF frames
├── kyberGlyph.ts            # full-encoding seed (text ↔ config)
├── qr-renderer.ts           # glyph string → QR PNG / SVG
├── gif-encoder.ts           # omggif wrapper with palette + dithering
└── templates.ts             # THE ONE template layout (x/y/w/h/font tables)

apps/web/components/share/
├── ShareCardModal.tsx       # "Save Saber Card" modal with format picker
├── CardPreview.tsx          # live preview of the card being generated
└── GlyphDisplay.tsx         # styled glyph text + QR with copy button
```

**Dependencies to add:**
- `msgpackr` (~25 kB) — compact config serialisation
- `pako` (~45 kB) — zlib deflate/inflate for the glyph payload
- `bs58` (~4 kB) — base58 encoding
- `qrcode` (~55 kB) — QR generation for canvas / SVG
- `omggif` (~12 kB) — GIF encoder
- Total ≈ 140 kB gzipped. Acceptable.

**Reuse:**
- `BladeCanvas` rendering path → captured frame-by-frame to the offscreen
  canvas for the GIF variants
- `factionStyles.ts` → affiliation badge colours + glyph accent hairline
- `configUrl.ts` → deprecated in favour of `kyberGlyph.ts` (keep for
  backward-compat with existing share links for at least one release)
- `themeDefinitions.ts` → canvas theme → card background

**URL shape update:**
- Current: `/editor?config=<base64-json>` (verbose, unbranded)
- New:     `/editor?s=<glyph>` (short, self-describing)
- Both handlers stay in `useSharedConfig`; `?s=` takes precedence

## Implementation phases

**Phase 1 — Kyber Glyph (text + QR).** `kyberGlyph.ts` encode/decode,
QR renderer, `?s=<glyph>` URL handler, "Copy glyph / Copy QR" in the
existing ShareButton. Ships the self-contained-sharing promise
standalone, before any of the card rendering. **Start here.**

**Phase 2 — Still PNG card.** Card template, offscreen renderer, "Save
Saber Card" button. The glyph is embedded as a QR in the header strip,
so the card is self-contained by virtue of the QR alone — no tEXt-chunk
embedding needed. Optional PNG tEXt chunk as a *convenience* for
drag-drop into the app, but not load-bearing.

**Phase 3 — Hum GIF.** omggif integration, palette quantisation, 3s
loop at 24 fps, file-size guardrails.

**Phase 4 — State-cycle GIF.** User picks two effects, renderer
sequences them, 6s loop.

**Phase 5 — Polish.** Aurebesh option for the header text, hilt
silhouette rendering, theme-aware accent, Discord OG meta tags so the
card auto-unfurls when pasted.

Each phase is independently shippable and independently valuable.
Phase 1 alone delivers the "fun, easy, in-universe sharing" promise.

## Acceptance criteria

- [ ] Kyber Glyph text encodes the full config losslessly; round-trips
      via `encodeGlyph → decodeGlyph` match the source config exactly
- [ ] Glyph scans reliably as a QR code from a phone camera at a
      3cm × 3cm render
- [ ] `/editor?s=<glyph>` URL handler loads the blade on page mount
- [ ] One click in `/editor` produces a 1200×675 PNG Saber Card with
      the QR glyph embedded in the header strip
- [ ] The card visually reads as "Jedi Archive / Holocron" aesthetic,
      not generic
- [ ] Preset name, glyph prefix, and key blade spec are baked into
      the card
- [ ] Animated GIF variants stay under 2.5 MB for the state-cycle
      version and 1.5 MB for the hum version
- [ ] Glyph prefix is recognisable (`JED.` / `SIT.` / `GRY.` / `CNO.`
      / `SPC.`)
- [ ] There is exactly one template layout; theme / affiliation /
      content variants only
- [ ] No server round-trip required — entire pipeline is client-side
- [ ] Typical blades encode in ≤ 35 base58 chars; maximum-complexity
      configs in ≤ 80 chars

## Out of scope

- Custom layouts / free-form positioning ("Studio Card")
- Video / MP4 output (GIF covers the animated case; MP4 needs FFmpeg
  WASM which is ~20 MB)
- Printable / physical card export
- NFT or on-chain anything (no)
- Backend-stored shareable URLs (seed code + metadata embed covers this
  without infrastructure)

## Open questions

- **Aurebesh font licensing?** A few Aurebesh fonts are free-for-use,
  some aren't. Need a free-tier one before we ship.
- **GIF file-size at 24 fps?** The 1.5 MB budget assumes aggressive
  palette quantisation. If we can't hit it, fall back to 15 fps (still
  looks OK for a hum loop).
- **Glyph format versioning.** The encoding needs a 1-byte version
  prefix (inside the packed payload, not the string) so we can evolve
  the format without breaking old glyphs. v1 ships day one;
  `decodeGlyph` switches on the version byte.
- **Does the QR scan reliably through Discord / Twitter image
  re-compression?** Version 2–3 QR codes with error-correction level M
  should survive most re-encoding; need to verify on real uploads.

## Handoff notes

When this gets picked up:
1. Start with Phase 1 only. Resist scope creep.
2. The template layout is the highest-risk visual work — build it once
   in Figma or sketch-in-code first, iterate on the design before
   writing the renderer.
3. The PNG metadata embed is the highest-risk *technical* work — prove
   it round-trips through at least Discord, Twitter, and iMessage
   before committing to the approach.
4. Keep Share Pack self-contained. Its only coupling to the rest of the
   app should be: reads current `bladeStore` config, uses `BladeCanvas`
   renderer. No store writes. No global state.
