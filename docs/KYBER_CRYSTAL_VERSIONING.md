# Kyber Crystal — Versioning & Stability

**Status:** Design-phase. Companion to `KYBER_CRYSTAL_VISUAL.md` and
`KYBER_CRYSTAL_NAMING.md`.

**One-line goal:** A crystal created today must still decode and
render correctly three years from now, through any number of app
updates, without the user's crystal silently shifting visual identity
under them.

---

## 1. Two separate stability contracts

The crystal is two artefacts in one: a **data payload** (the Kyber
Glyph encoding of the config) and a **visual rendering** (the
SVG/canvas drawing of the crystal). Each needs its own stability
guarantee.

### Contract A — Payload format stability

Covers: the bytes inside the Kyber Glyph that encode `BladeConfig`.

**Guarantee:** a glyph minted in KyberStation v0.11.0 must decode
correctly in KyberStation vX.Y.Z forever, as long as the field
additions rule is honoured.

### Contract B — Visual rendering stability

Covers: the SVG/canvas pixels produced when we render a crystal.

**Guarantee:** a crystal displayed as "Dawnlight" to a user today
looks recognisably the same in three years, even if we've evolved
the visual system in the meantime.

The two contracts are independent. Payload format can evolve without
breaking visual rendering, and vice versa.

---

## 2. Payload format versioning

Every Kyber Glyph payload starts with a **1-byte version marker** as
the first byte of the MessagePack-packed payload *before* zlib
compression:

```
[version:u8] [serialized config delta]
  ↓ MessagePack pack
  ↓ zlib DEFLATE
  ↓ base58 encode
  = kyber glyph
```

**Version 1** (initial ship) supports:
- All declared `BladeConfig` fields as of v0.11.0
- Ignores unknown fields during decode (forward compat)
- Omits default-valued fields during encode (payload minimization)

### Evolution rules

- **Add new fields:** bump to v2, but v1 decoders still work — they
  just ignore the new fields (MessagePack tolerates unknown keys).
- **Remove a field:** DO NOT remove fields. Deprecate in place. If a
  field is no longer meaningful, mark it deprecated in the types and
  ignore during render. Removing breaks round-trips.
- **Rename a field:** DO NOT rename. Add the new name, keep the old
  as an alias, mark the old deprecated.
- **Change a field's semantics:** treat as a new field with a new name.
  Old name keeps its old semantics forever.

### Multi-version decoder

```ts
// apps/web/lib/crystal/decoder.ts (sketch)
export function decodeGlyph(glyph: string): BladeConfig {
  const [prefix, coded] = glyph.split('.');
  const zipped = bs58.decode(coded);
  const packed = inflateRaw(zipped);
  const version = packed[0];                    // first byte is version
  const body = packed.slice(1);

  switch (version) {
    case 1: return decodeV1(unpack(body), prefix);
    case 2: return decodeV2(unpack(body), prefix);
    // … add cases as format evolves
    default:
      throw new KyberGlyphVersionError(
        `Unknown glyph version ${version}. Update KyberStation to decode this crystal.`
      );
  }
}
```

Each version has its own decoder function. Versions accumulate; we
never delete an older decoder.

### Cross-version compatibility

| Old glyph ← new app | New glyph ← old app |
|---|---|
| ✅ Always works. Version byte routes to the right decoder. | ✅ Works with graceful degradation. Unknown fields are ignored; known fields decode normally. The saber loads with reasonable defaults for anything the old app doesn't understand. |

This is the same approach git uses for object format versioning, and
it's survived well over two decades.

---

## 3. Visual system versioning

This is the harder problem. If we change *how* we map config to
crystal visuals in v2 of the system, same config → different crystal.
Users would lose their crystal's visual identity across app updates.

### The frozen-visual approach (chosen)

Every crystal carries a **visual-system version byte** as part of its
payload, separate from the payload-format version:

```
[payload_version:u8] [visual_version:u8] [serialized config delta]
```

**Visual Version 1** (initial ship) defines:
- Silhouette selection logic (which of the 5 Forms a config maps to)
- Expressive property mapping (config field → crystal visual feature)
- Colour algorithm (baseColor → crystal glow + tint + rim)
- Texture algorithm (style/shimmer → pearlescent flecks, cracks)
- Facet layout function (hash → facet count and positions)
- Animation timing table (which animations play when)

When a crystal is rendered, the app reads the visual-version byte and
routes to the matching renderer module. We keep every historical
renderer module in the codebase forever.

### Cost analysis

Each visual version adds ~100-200 LoC to the renderer. After 10
versions over 5 years, we're carrying ~2000 LoC of renderer code.
This is genuinely cheap — renderers are pure functions, testable in
isolation, no state, no side effects.

Compared to the cost of breaking users' visual identity across
updates: cheap.

### Re-attunement — the opt-in upgrade

Users CAN upgrade their crystal to the latest visual version, if they
want to. This is the "Re-attune your crystal" command:

```
┌────────────────────────────────────────────────────────┐
│ Re-attune this crystal?                                │
│                                                        │
│  Your crystal "Dawnlight" was attuned under Visual     │
│  System v1. Re-attuning will re-render it using        │
│  Visual System v3 — the latest.                        │
│                                                        │
│  Your configuration won't change. Only the crystal's   │
│  appearance will update.                               │
│                                                        │
│  Before:                  After:                       │
│  [v1 crystal preview]     [v3 crystal preview]         │
│                                                        │
│     [ Keep original ]     [ Re-attune ]                │
└────────────────────────────────────────────────────────┘
```

Re-attunement is destructive — the visual version byte updates. A
crystal re-attuned from v1 to v3 is now a v3 crystal. If we want to
be extra safe, we can store the original version byte as a secondary
"origin version" field so users can always see where their crystal
started (nostalgic feature, not required for Phase 1).

### Default: freeze

If the user takes no action, their crystal stays at its original
visual version forever. App updates do NOT silently re-render
anything. Visual identity is preserved.

---

## 4. Saber Card versioning

Saber Cards (the PNG/GIF artefacts) are *already frozen* — they're
raster files stored by the user. A card created in v0.11 is just a
PNG; it stays exactly what it was.

The importable glyph embedded in the card (via QR or tEXt chunk)
follows the payload and visual versioning rules above, so scanning an
old card works indefinitely.

The only versioning concern for cards is the **card template layout**
(where elements appear on the 1200×675 canvas, what fonts are used,
etc.). This also gets a version byte:

```ts
interface SaberCardTemplate {
  version: number;       // 1, 2, 3...
  layout: LayoutDef;
  typography: TypographyDef;
  chromeElements: ChromeElementDef[];
}
```

When we evolve the card template (say, adding a new status badge
field or changing the type hierarchy), we bump the template version.
Users re-export their cards with the new template if they want the
update; old cards stay exactly as-minted.

---

## 5. Vocabulary / naming versioning

The vocabulary dataset and generation patterns in
`KYBER_CRYSTAL_NAMING.md` are inputs to the *suggestion* generator,
not baked into any crystal. If we update the vocab later:

- A crystal named "Dawnlight" when v1 vocab shipped remains named
  "Dawnlight" forever — the name is stored in the payload verbatim.
- Users who've had their crystal for a year won't see new vocabulary
  until they click "Randomize" for new suggestions.
- No migration needed. Name is a string; the generator's job is done
  once a name is chosen.

The moderation filter is the only thing that evolves dynamically —
if a name that slipped through the v1 filter gets caught by the v2
filter, the user's existing public name stays (we don't retroactively
censor), but any new share of that crystal triggers a one-time
warning prompting them to update.

---

## 6. Forward-compatibility checklist (before shipping the format)

- [ ] Payload format v1 fully specified and tested
- [ ] Version byte position locked (first byte after zlib inflate)
- [ ] v1 decoder tolerates unknown fields without crashing
- [ ] v1 encoder omits default-valued fields
- [ ] Visual system v1 fully specified (all 5 Forms rendered,
      animation table implemented)
- [ ] Visual version byte locked at offset +1 from payload version byte
- [ ] Re-attunement command implemented in MyCrystal panel
- [ ] Migration test: generate v1 glyph → check v1 decoder → check
      v1 renderer → re-attune → check still decodes, still renders,
      visual version incremented
- [ ] Documentation in `docs/KYBER_GLYPH_FORMAT.md` (to be written at
      implementation time) specifying the byte layout normatively so
      third-party tools can decode

---

## 7. Public stability pledge

When we ship this, the release notes will include:

> **KyberStation's Kyber Crystal format is a long-term stability
> commitment.** A crystal minted in v0.11.0 will decode and render
> correctly in every future version of KyberStation. We may evolve
> the visual system over time, but the visual version byte ensures
> your crystal always looks the way it did the day you attuned it,
> unless you explicitly choose to re-attune.

This matters because the crystal IS the saber's identity for the
community. Breaking that identity across app updates would be a
betrayal of user trust.

---

## 8. Handoff notes

When implementation picks this up:

1. **Write the format doc first** — `docs/KYBER_GLYPH_FORMAT.md`
   with normative byte layout, version byte position, MessagePack
   schema, compression layer. Third-party tools (including future
   ProffieOS Workbench integration) need a spec to decode against.
2. **Keep the v1 encoder/decoder small and auditable.** Under 200
   LoC total. It's the foundation; it must be correct.
3. **Ship test fixtures with every payload version bump.** A
   `tests/fixtures/kyberGlyphs/v1/` directory with known-good
   encodings for a range of configs. Every future change must pass
   decoding these fixtures. This is the canary for format breakage.
4. **Don't optimise for payload size prematurely.** 50 bytes vs 80
   bytes is irrelevant at QR Version 3. Clarity of format > tight
   compression.
5. **Every visual version lives in its own module** —
   `apps/web/lib/crystal/renderers/v1.ts`, `v2.ts`, etc. The top-level
   renderer is a switch statement. Keeps old code uncontaminated by
   new ideas.
