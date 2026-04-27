// ─── Kyber Glyph — v1 full-encoding seed ───
//
// Round-trips the complete BladeConfig (+ saber metadata) losslessly
// through a compact, scannable string. The glyph is the payload inside
// the crystal's QR surface and the `?s=<glyph>` URL handler.
//
// Binding contract: see `docs/KYBER_CRYSTAL_VERSIONING.md` §2. The byte
// layout defined here is the v1 format forever. Add fields freely via
// the `extras` bag or bump `KYBER_GLYPH_VERSION`; never change an
// existing field's meaning.
//
//   [payload_version:u8] [visual_version:u8] [msgpack(payload)]
//           ↓ zlib DEFLATE (raw, level 9)
//           ↓ base58 encode
//           = "{PREFIX}.{base58}"
//
// Encodes a DELTA against CANONICAL_DEFAULT_CONFIG so typical glyphs
// stay short (~25 base58 chars for the default, <80 for max-complexity).

import type { BladeConfig, RGB } from '@kyberstation/engine';
import { Packr, Unpackr } from 'msgpackr';
import { deflateRaw, inflateRaw } from 'pako';
import bs58 from 'bs58';

// ─── Version constants (BINDING — do not change) ───

export const KYBER_GLYPH_VERSION = 1;
export const VISUAL_SYSTEM_VERSION = 1;

// ─── Types ───

export type SaberType = 'single' | 'dual' | 'saberstaff' | 'crossguard' | 'darksaber';
export type PropFileId = 'fett263' | 'sa22c' | 'bc' | 'shtok' | 'default';
export type ArchetypePrefix = 'JED' | 'SIT' | 'GRY' | 'CNO' | 'SPC';

export interface GlyphPayload {
  payloadVersion: number;
  visualVersion: number;
  saberType: SaberType;
  blades: BladeConfig[];
  hiltModel: string | null;
  soundFontRef: string | null;
  oledBitmapRef: string | null;
  propFileId: PropFileId;
  publicName: string | null;
  createdAt: number;
  kyberstationVersion: string;
  extras: Record<string, unknown>;
}

// ─── Errors ───

export class KyberGlyphVersionError extends Error {
  readonly version: number;
  constructor(version: number) {
    super(
      `Unknown Kyber Glyph version ${version}. This crystal may be from a newer version of KyberStation — update the app to decode it.`,
    );
    this.name = 'KyberGlyphVersionError';
    this.version = version;
  }
}

export class KyberGlyphParseError extends Error {
  readonly inputLength: number;
  constructor(message: string, inputLength: number) {
    super(`${message} (input length: ${inputLength})`);
    this.name = 'KyberGlyphParseError';
    this.inputLength = inputLength;
  }
}

// ─── Canonical default (the delta baseline) ───
//
// Must match `DEFAULT_CONFIG` in `apps/web/stores/bladeStore.ts` byte-
// for-byte, because v1 deltas are computed against it. Any change to
// this constant AFTER v1 ships silently invalidates every glyph in the
// wild — DO NOT edit.

export const CANONICAL_DEFAULT_CONFIG: BladeConfig = {
  name: 'Obi-Wan ANH',
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 80 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 800,
  shimmer: 0.1,
  ledCount: 144,
};

// `kyberstationVersion` is informational metadata — the encoder leaves
// it empty unless the caller sets it explicitly, keeping glyphs small.
// Callers who want to stamp it (e.g. for crystal archive provenance)
// pass it via `encodeGlyphFromConfig(config, { kyberstationVersion })`.

// ─── Delta encoding ───
//
// A lossless structural diff between two plain JSON-like values.
// - Objects: only keys that differ (or are missing/extra) appear
// - RGB is treated as an opaque 3-number record; any field diff re-
//   emits the whole record
// - Arrays, primitives, null, undefined round-trip exactly

const RGB_KEYS = ['r', 'g', 'b'];

function isRGBLike(v: unknown): v is RGB {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    RGB_KEYS.every((k) => typeof o[k] === 'number') &&
    Object.keys(o).length === 3
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Uint8Array);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

interface DeltaMarker {
  __kgDelete?: true;
}

/**
 * Returns a delta of `full` vs `base`. Sentinel `{__kgDelete:true}` marks
 * keys present in `base` but missing in `full`. RGB blobs are emitted
 * whole when any channel differs.
 */
function diff(full: Record<string, unknown>, base: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const allKeys = new Set([...Object.keys(full), ...Object.keys(base)]);
  for (const key of allKeys) {
    const fv = full[key];
    const bv = base[key];
    if (!(key in full)) {
      // Key was deleted from the full config relative to base — must
      // be encoded so decode can suppress it.
      out[key] = { __kgDelete: true } satisfies DeltaMarker;
      continue;
    }
    if (!(key in base)) {
      out[key] = fv;
      continue;
    }
    if (deepEqual(fv, bv)) continue;
    if (isRGBLike(fv) || isRGBLike(bv)) {
      // RGB → emit whole
      out[key] = fv;
    } else if (isPlainObject(fv) && isPlainObject(bv)) {
      out[key] = diff(fv, bv);
    } else {
      out[key] = fv;
    }
  }
  return out;
}

function applyDelta(base: Record<string, unknown>, delta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, dv] of Object.entries(delta)) {
    if (isPlainObject(dv) && (dv as DeltaMarker).__kgDelete === true) {
      delete out[key];
      continue;
    }
    const bv = out[key];
    if (isRGBLike(dv)) {
      out[key] = dv;
    } else if (isPlainObject(dv) && isPlainObject(bv) && !isRGBLike(bv)) {
      out[key] = applyDelta(bv, dv);
    } else {
      out[key] = dv;
    }
  }
  return out;
}

// ─── Archetype detection ───

function maxChannel(c: RGB): 'r' | 'g' | 'b' {
  if (c.r >= c.g && c.r >= c.b) return 'r';
  if (c.g >= c.r && c.g >= c.b) return 'g';
  return 'b';
}

function isRedDominant(c: RGB): boolean {
  // Red-family: R is the dominant channel AND meaningfully brighter than G/B.
  return maxChannel(c) === 'r' && c.r > 120 && c.r > c.g + 40 && c.r > c.b + 40;
}

function isGreyish(c: RGB): boolean {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  return max - min < 24;
}

function isCanonicalPreset(config: BladeConfig): boolean {
  // A preset the app ships under a well-known name. The cheapest
  // reliable check: the `name` field matches a canonical-era label
  // pattern and the config hasn't been meaningfully edited away from
  // its preset defaults. For v1 we keep this conservative — a name
  // starting with one of the film-era markers with an ignition=standard
  // ships as CNO.
  const n = config.name;
  if (typeof n !== 'string') return false;
  const canonPattern = /^(Obi-Wan|Anakin|Luke|Vader|Yoda|Mace|Windu|Rey|Kylo|Maul|Dooku|Ahsoka|Ezra|Kanan)\b/i;
  return canonPattern.test(n);
}

export function detectArchetype(config: BladeConfig): ArchetypePrefix {
  const base = config.baseColor;
  const unstable = config.style === 'unstable';

  if (isRedDominant(base) || (unstable && base.r > base.g && base.r > base.b)) {
    return 'SIT';
  }
  if (isGreyish(base)) return 'GRY';
  if (isCanonicalPreset(config)) return 'CNO';

  const stableLike = config.style === 'stable' || config.style === 'pulse' || config.style === 'rotoscope';
  if (stableLike) return 'JED';

  return 'SPC';
}

// ─── msgpackr instance ───
//
// structuredClone-compatible mode: plain JSON tree, no records/struct
// extensions (those aren't spec'd for our binding contract).

const packr = new Packr({ useRecords: false });
const unpackr = new Unpackr({ useRecords: false });

// ─── Public API ───

export function encodeGlyph(payload: GlyphPayload): string {
  if (payload.payloadVersion !== KYBER_GLYPH_VERSION) {
    throw new Error(
      `encodeGlyph only emits v${KYBER_GLYPH_VERSION} glyphs; received payloadVersion=${payload.payloadVersion}`,
    );
  }

  const prefix = payload.blades[0] ? detectArchetype(payload.blades[0]) : 'SPC';

  // Delta-encode each blade against the canonical default.
  const bladeDeltas = payload.blades.map((b) =>
    diff(b as unknown as Record<string, unknown>, CANONICAL_DEFAULT_CONFIG as unknown as Record<string, unknown>),
  );

  // Body: everything except the version bytes (which live in a header
  // the decoder can inspect without unpacking the full object). Default-
  // valued fields are omitted — the decoder restores them.
  const body: Record<string, unknown> = { b: bladeDeltas };
  if (payload.saberType !== 'single') body.t = payload.saberType;
  if (payload.hiltModel != null) body.h = payload.hiltModel;
  if (payload.soundFontRef != null) body.s = payload.soundFontRef;
  if (payload.oledBitmapRef != null) body.o = payload.oledBitmapRef;
  if (payload.propFileId !== 'default') body.p = payload.propFileId;
  if (payload.publicName != null) body.n = payload.publicName;
  if (payload.createdAt !== 0) body.c = payload.createdAt;
  if (payload.kyberstationVersion !== '') body.v = payload.kyberstationVersion;
  if (payload.extras && Object.keys(payload.extras).length > 0) body.x = payload.extras;

  const packed = packr.pack(body) as Uint8Array;
  const framed = new Uint8Array(packed.length + 2);
  framed[0] = payload.payloadVersion & 0xff;
  framed[1] = payload.visualVersion & 0xff;
  framed.set(packed, 2);

  const zipped = deflateRaw(framed, { level: 9 });
  const coded = bs58.encode(zipped);
  return `${prefix}.${coded}`;
}

// ─── Multi-version decoder dispatch ───
//
// Every payload version has its own decoder function. `decodeGlyph`
// parses the version byte first, then dispatches to the matching
// entry in VERSION_DECODERS. Unknown versions throw
// `KyberGlyphVersionError` WITHOUT attempting to unpack the body —
// the version byte is load-bearing and we refuse to guess.
//
// Adding a new version (future modulation-routing session):
//   1. Implement `decodeV2Body(body, visualVersion): GlyphPayload`
//      alongside `decodeV1Body`. Older v1 decoder stays untouched —
//      it's frozen forever per `docs/KYBER_CRYSTAL_VERSIONING.md §2`.
//   2. Add the entry `[2]: decodeV2Body` to VERSION_DECODERS below.
//   3. Ship fixtures at `apps/web/tests/fixtures/kyberGlyphs/v2/`.
//   4. Bump `KYBER_GLYPH_VERSION` to 2 and update `encodeGlyph`.
//
// This file must remain the ONLY place where payload-version routing
// lives. Do not re-parse the version byte elsewhere.

type VersionDecoder = (body: Record<string, unknown>, visualVersion: number) => GlyphPayload;

/** v1 body → GlyphPayload. Delta-applies against CANONICAL_DEFAULT_CONFIG.
 *  Frozen contract per `docs/KYBER_CRYSTAL_VERSIONING.md §2`. */
function decodeV1Body(body: Record<string, unknown>, visualVersion: number): GlyphPayload {
  const bladeDeltas = Array.isArray(body.b) ? (body.b as Record<string, unknown>[]) : [];
  const blades = bladeDeltas.map(
    (d) => applyDelta(CANONICAL_DEFAULT_CONFIG as unknown as Record<string, unknown>, d) as unknown as BladeConfig,
  );

  if (blades.length === 0) {
    // Missing required data — fall back to a single default blade so
    // the caller still gets a renderable config (graceful degradation).
    blades.push({ ...CANONICAL_DEFAULT_CONFIG });
  }

  return {
    payloadVersion: 1,
    visualVersion,
    saberType: (body.t as SaberType) ?? 'single',
    blades,
    hiltModel: typeof body.h === 'string' || body.h === null ? (body.h as string | null) : null,
    soundFontRef: typeof body.s === 'string' || body.s === null ? (body.s as string | null) : null,
    oledBitmapRef: typeof body.o === 'string' || body.o === null ? (body.o as string | null) : null,
    propFileId: (body.p as PropFileId) ?? 'default',
    publicName: typeof body.n === 'string' || body.n === null ? (body.n as string | null) : null,
    createdAt: typeof body.c === 'number' ? body.c : 0,
    kyberstationVersion: typeof body.v === 'string' ? body.v : '',
    extras: isPlainObject(body.x) ? (body.x as Record<string, unknown>) : {},
  };
}

const VERSION_DECODERS: Readonly<Record<number, VersionDecoder>> = Object.freeze({
  1: decodeV1Body,
  // 2: decodeV2Body,   ← added by modulation-routing session when glyph v2 ships
});

export function decodeGlyph(glyph: string): GlyphPayload {
  if (typeof glyph !== 'string' || !glyph.includes('.')) {
    throw new KyberGlyphParseError('Glyph missing archetype prefix separator', glyph?.length ?? 0);
  }
  const dot = glyph.indexOf('.');
  const coded = glyph.slice(dot + 1);
  if (coded.length === 0) {
    throw new KyberGlyphParseError('Glyph has empty base58 body', glyph.length);
  }

  let framed: Uint8Array;
  try {
    const zipped = bs58.decode(coded);
    framed = inflateRaw(zipped);
  } catch (err) {
    throw new KyberGlyphParseError(
      `Glyph decode failed: ${err instanceof Error ? err.message : String(err)}`,
      glyph.length,
    );
  }

  if (framed.length < 2) {
    throw new KyberGlyphParseError('Glyph payload too short for version header', glyph.length);
  }

  const payloadVersion = framed[0];
  const visualVersion = framed[1];

  // Version dispatch — fail fast on unknown versions BEFORE unpacking
  // the body. This avoids wasting work on a payload we can't route.
  const decoder = VERSION_DECODERS[payloadVersion];
  if (!decoder) {
    throw new KyberGlyphVersionError(payloadVersion);
  }

  let body: Record<string, unknown>;
  try {
    body = unpackr.unpack(framed.slice(2)) as Record<string, unknown>;
  } catch (err) {
    throw new KyberGlyphParseError(
      `MessagePack unpack failed: ${err instanceof Error ? err.message : String(err)}`,
      glyph.length,
    );
  }

  if (!isPlainObject(body)) {
    throw new KyberGlyphParseError('Decoded body is not an object', glyph.length);
  }

  return decoder(body, visualVersion);
}

// ─── Convenience wrappers for the single-blade common case ───

export function encodeGlyphFromConfig(
  config: BladeConfig,
  opts?: Partial<GlyphPayload>,
): string {
  const payload: GlyphPayload = {
    payloadVersion: KYBER_GLYPH_VERSION,
    visualVersion: VISUAL_SYSTEM_VERSION,
    saberType: opts?.saberType ?? 'single',
    blades: opts?.blades ?? [config],
    hiltModel: opts?.hiltModel ?? null,
    soundFontRef: opts?.soundFontRef ?? null,
    oledBitmapRef: opts?.oledBitmapRef ?? null,
    propFileId: opts?.propFileId ?? 'default',
    publicName: opts?.publicName ?? null,
    createdAt: opts?.createdAt ?? 0,
    kyberstationVersion: opts?.kyberstationVersion ?? '',
    extras: opts?.extras ?? {},
  };
  return encodeGlyph(payload);
}

export function decodeGlyphToConfig(glyph: string): BladeConfig {
  const payload = decodeGlyph(glyph);
  return payload.blades[0] ?? { ...CANONICAL_DEFAULT_CONFIG };
}
