# Next Session — Kyber Glyph v2 + Saber Card Renderer

**Purpose:** Paste the prompt below into a fresh Claude Code session to spin up the Kyber Glyph v2 encoder work in parallel with the modulation routing session and the UI overhaul session.

**Coordination:** three concurrent sessions on this branch:
1. **UX overhaul** — Ken's current session, touching various `apps/web/components/*` UI files
2. **Modulation routing** — background agents tonight in `packages/engine/src/modulation/*`, `packages/codegen/src/proffieOSEmitter/*`, `apps/web/lib/{parameterGroups,boardProfiles,propFileProfiles}.ts`
3. **Glyph v2** — this session, scoped to `apps/web/lib/sharePack/*` + new `apps/web/components/shared/SaberCard/*`

Sessions 1 and 3 do not overlap in files. Session 2 consumes types from `packages/engine/src/modulation/types.ts` which are already locked. Session 3 imports those same types for serialization.

---

## Paste this into a new Claude Code session

```
Spin up Kyber Glyph v2 + Saber Card hero renderer for KyberStation.

CONTEXT
-------
KyberStation is a web-based lightsaber style editor for Proffieboard V3.9
running ProffieOS 7.x. We're on branch `feat/ui-overhaul-v2`, shipping a
v1.0 launch on Friday 2026-04-24.

WHAT'S ALREADY THERE
--------------------
- Kyber Glyph v1 encoder at `apps/web/lib/sharePack/kyberGlyph.ts`
  Pipeline: MessagePack → delta-vs-CANONICAL_DEFAULT_CONFIG → raw-deflate → base58
  Version byte `1` prefix. Frozen forever per `docs/KYBER_CRYSTAL_VERSIONING.md`
  Contract A.
- Partial Saber Card work at `apps/web/lib/sharePack/cardSnapshot.ts`
  Currently just crystal accent in bottom-right + labelled placeholder for
  the hilt+blade hero.
- Modulation type contracts at `packages/engine/src/modulation/types.ts`
  (locked — use as-is, do not modify). Relevant: `ModulationPayload`,
  `SerializedBinding`, `SerializedExpression`, `ModulatorDescriptor`.
- v1 fixture glyphs at `apps/web/tests/fixtures/kyberGlyphs/v1/` (9 files).
- `<HiltRenderer>` primitive exists at `apps/web/components/shared/HiltRenderer.tsx`.
- Three.js Kyber Crystal exists at `apps/web/lib/crystal/`.

YOUR SCOPE
----------
1. Kyber Glyph v2 encoder/decoder:
   - Bump payload_version byte to `2`
   - Optional `modulation?: ModulationPayload` field on decoded payload
   - v1 glyphs stay decodable forever (version-byte routing)
   - v2 glyph with no modulation present should be ~byte-identical to v1
     after version-byte swap (tight encoder, no payload bloat)
   - Throw `KyberGlyphVersionError` on version bytes >= 3
   - New fixture directory `apps/web/tests/fixtures/kyberGlyphs/v2/`
     with at least 9 fixtures: 3 modulation-empty, 3 simple-single-binding,
     3 with 5+ bindings including expressions

2. Drift sentinel test (pending from CLAUDE.md decision #11):
   - `apps/web/tests/sharePack/canonicalDefaultDrift.test.ts`
   - Asserts `CANONICAL_DEFAULT_CONFIG` in kyberGlyph.ts matches
     `DEFAULT_CONFIG` in `apps/web/stores/bladeStore.ts` structurally.
     Drift fails CI.

3. Saber Card hero renderer:
   - `apps/web/components/shared/SaberCard/SaberCard.tsx`
   - `apps/web/components/shared/SaberCard/SaberCardRenderer.ts`
     (canvas-based, 1200×675 PNG output)
   - Composition:
     * Left third: hilt via <HiltRenderer> (vertical orientation)
     * Center: lit blade (uses engine pixel buffer → canvas strip + halo)
     * Right third: Kyber Crystal snapshot from existing renderer
     * Bottom: QR code of the glyph + preset name + Aurebesh tagline
     * Existing CrystalPanel/cardSnapshot code may be the right base
   - Exportable as PNG (for Discord OG, for social sharing)
   - Discord OG meta tags on `/share/[glyph]` route

4. Tests:
   - `apps/web/tests/sharePack/kyberGlyphV2.test.ts` (round-trip, version
     routing, drift sentinel)
   - `apps/web/tests/sharePack/saberCardRender.test.ts` (snapshot-testing
     the card output with fixed fixtures)

REFERENCE DOCS (READ IN ORDER)
------------------------------
- `CLAUDE.md` — project overview and architectural decisions
- `docs/MODULATION_ROUTING_V1.1.md` §5 (wire format spec)
- `docs/MODULATION_ROUTING_v1.1_IMPL_PLAN.md` (sprint context)
- `docs/KYBER_CRYSTAL_VERSIONING.md` (stability contract)
- `apps/web/lib/sharePack/kyberGlyph.ts` (v1 implementation you're extending)
- `apps/web/lib/sharePack/cardSnapshot.ts` (existing card stub you're replacing)

HARD CONSTRAINTS
----------------
- Do NOT edit files in `packages/engine/src/modulation/` — types are locked,
  modulation session owns those files.
- Do NOT edit files in `apps/web/components/editor/` — UX session owns those.
- Do NOT edit `apps/web/stores/*` — both other sessions may touch these.
- Do NOT commit — leave work uncommitted for review.
- Use existing dependencies (msgpackr, pako, base58, qrcode, three).
  Do NOT add new npm deps without approval.

SHIP TARGET
-----------
Friday 2026-04-24. Parallel with modulation session. If modulation session
is still in flight, build v2 encoder against the locked modulation types
without needing modulation runtime to be wired.

IF YOU HIT BLOCKERS
-------------------
- Modulation type imports feel unstable → types at `packages/engine/src/
  modulation/types.ts` are locked and safe to consume.
- CanonicalDefaultConfig doesn't match → extend v1 encoder to derive the
  canonical default from bladeStore's DEFAULT_CONFIG at build time, add
  the drift sentinel, and move on.
- Saber Card snapshot too expensive to run per-pixel → use an offscreen
  canvas with fixed blade geometry.

Begin by running `git status` and `git log --oneline -20` to see the
current state, then plan your waves and report back before executing.
```

---

## Success criteria

- `pnpm --filter web test` passes all new tests
- `pnpm typecheck` clean
- v1 fixtures still round-trip identically through the decoder
- v2 fixtures round-trip the `modulation` field losslessly
- Drift sentinel fails CI if someone edits `DEFAULT_CONFIG` without updating `CANONICAL_DEFAULT_CONFIG`
- Saber Card PNG renders hilt + blade + crystal + QR at 1200×675 with < 300ms snapshot time
- No commits (Ken reviews + commits the work after merging)

---

_Drop this session mid-morning Thursday if Wednesday evening wrap-up leaves Ken wanting more UI cycles instead._
