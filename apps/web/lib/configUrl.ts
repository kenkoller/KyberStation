// ─── Legacy share-URL decoder (DECODE-ONLY) ───────────────────────────
//
// This module used to emit `${origin}/editor#<base64>` share links via
// `encodeConfig` + `buildShareUrl`. Both encoder exports were removed
// when the app migrated to Kyber Glyph (`?s=<glyph>`) as the canonical
// emission format — see `apps/web/lib/sharePack/kyberGlyph.ts`.
//
// The DECODER stays for backward compatibility with old URLs already
// in the wild (Twitter shares, bookmarks, embedded links). New share
// emission MUST use `encodeGlyphFromConfig`. If you find yourself
// reaching for an `encodeConfig` here, you almost certainly want
// `encodeGlyphFromConfig` from the kyberGlyph module instead.

import type { BladeConfig, RGB } from '@kyberstation/engine';
import { validateBladeConfig } from './bladeConfigIO';

// Short key mapping mirror — encoder used these to compact JSON keys;
// decoder still needs the reverse map to expand legacy payloads.
const TO_SHORT: Record<string, string> = {
  name: 'n', baseColor: 'bc', clashColor: 'cc', lockupColor: 'lc',
  blastColor: 'xc', dragColor: 'dc', meltColor: 'mc', lightningColor: 'tc',
  style: 's', ignition: 'ig', retraction: 'rt',
  ignitionMs: 'im', retractionMs: 'rm', shimmer: 'sh', ledCount: 'le',
  edgeColor: 'ec', gradientEnd: 'ge',
};

const FROM_SHORT: Record<string, string> = Object.fromEntries(
  Object.entries(TO_SHORT).map(([k, v]) => [v, k])
);

function expandRGB(arr: [number, number, number]): RGB {
  return { r: arr[0], g: arr[1], b: arr[2] };
}

function isCompactRGB(val: unknown): val is [number, number, number] {
  return Array.isArray(val) && val.length === 3 && val.every((v) => typeof v === 'number');
}

// ─── Base64url decoding ───

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── Decompression ───

async function decompress(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(data as unknown as ArrayBuffer);
      writer.close();
      const chunks: Uint8Array[] = [];
      const reader = ds.readable.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
      const result = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    } catch {
      // If decompression fails, data might not be compressed — return as-is
      return data;
    }
  }
  return data;
}

// ─── Decode (legacy URLs only) ───
//
// Encoder removed 2026-05-01 — see file header. New emitters call
// `encodeGlyphFromConfig` from `apps/web/lib/sharePack/kyberGlyph.ts`.

export async function decodeConfig(hash: string): Promise<BladeConfig> {
  if (!hash || hash.length < 5) {
    throw new Error('Share link is too short to contain a valid configuration');
  }

  const compressed = fromBase64Url(hash);
  const decompressed = await decompress(compressed);

  // Guard against decompression bombs — a small compressed payload
  // could expand to an enormous string and cause OOM / DoS.
  const MAX_DECOMPRESSED_SIZE = 100_000; // 100 KB
  if (decompressed.length > MAX_DECOMPRESSED_SIZE) {
    throw new Error('Share link payload exceeds maximum allowed size');
  }

  const json = new TextDecoder().decode(decompressed);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid share link — could not decode configuration');
  }

  // Expand short keys and compact RGB arrays
  const expanded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    const longKey = FROM_SHORT[key] ?? key;
    expanded[longKey] = isCompactRGB(value) ? expandRGB(value) : value;
  }

  if (!validateBladeConfig(expanded)) {
    throw new Error('Invalid share link — configuration is malformed');
  }

  return expanded as BladeConfig;
}
