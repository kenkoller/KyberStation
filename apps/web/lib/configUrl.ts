import type { BladeConfig, RGB } from '@kyberstation/engine';
import { validateBladeConfig } from './bladeConfigIO';

// Short key mapping for compact URL encoding
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

// RGB ↔ compact array
function compactRGB(rgb: RGB): [number, number, number] {
  return [rgb.r, rgb.g, rgb.b];
}

function expandRGB(arr: [number, number, number]): RGB {
  return { r: arr[0], g: arr[1], b: arr[2] };
}

function isRGBObject(val: unknown): val is RGB {
  return typeof val === 'object' && val !== null && 'r' in val && 'g' in val && 'b' in val;
}

function isCompactRGB(val: unknown): val is [number, number, number] {
  return Array.isArray(val) && val.length === 3 && val.every((v) => typeof v === 'number');
}

// ─── Base64url encoding ───

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── Compression ───

async function compress(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(data as unknown as ArrayBuffer);
    writer.close();
    const chunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();
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
  }
  // Fallback: no compression
  return data;
}

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

// ─── Encode / Decode ───

export async function encodeConfig(config: BladeConfig): Promise<string> {
  // Build compact representation
  const compact: Record<string, unknown> = {};
  for (const [longKey, value] of Object.entries(config)) {
    if (value === undefined) continue;
    const shortKey = TO_SHORT[longKey] ?? longKey;
    compact[shortKey] = isRGBObject(value) ? compactRGB(value) : value;
  }

  const json = JSON.stringify(compact);
  const encoded = new TextEncoder().encode(json);
  const compressed = await compress(encoded);
  return toBase64Url(compressed);
}

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

export function buildShareUrl(encoded: string): string {
  return `${window.location.origin}/editor#${encoded}`;
}
