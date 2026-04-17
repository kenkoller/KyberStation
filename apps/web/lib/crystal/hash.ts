// ─── Kyber Crystal — Deterministic Hash + PRNG ───
//
// hashConfig() folds the discriminating fields of a BladeConfig into a
// 32-bit integer. Same config in → same hash out, forever. This is the
// seed for geometry jitter, crack routing, and fleck placement so two
// sabers with the same config produce byte-identical crystals.
//
// The PRNG is mulberry32 — small, fast, and statistically well-behaved
// for the volumes we need (dozens of jitter samples per geometry).

import type { BladeConfig } from '@kyberstation/engine';

// ─── FNV-1a 32-bit string hash ───

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Fold the visual-discriminating fields of a BladeConfig into a single
 * 32-bit integer. Fields that don't change the crystal's appearance
 * (like `name` or sound-related fields) are intentionally excluded —
 * renaming a preset should not re-roll its crystal.
 */
export function hashConfig(config: BladeConfig): number {
  // Canonical serialisation — fields in fixed order, stable number formatting
  const parts: string[] = [
    rgbStr(config.baseColor),
    rgbStr(config.clashColor),
    rgbStr(config.lockupColor),
    rgbStr(config.blastColor),
    config.style ?? '',
    config.ignition ?? '',
    config.retraction ?? '',
    String(config.ignitionMs ?? 0),
    String(config.retractionMs ?? 0),
    numStr(config.shimmer),
    String(config.ledCount ?? 144),
    // Spatial effect positions — round to 3 decimals to avoid float noise
    numStr(config.lockupPosition),
    numStr(config.lockupRadius),
    numStr(config.blastPosition),
    numStr(config.blastRadius),
    numStr(config.dragPosition),
    numStr(config.dragRadius),
    numStr(config.meltPosition),
    numStr(config.meltRadius),
    numStr(config.stabPosition),
    numStr(config.stabRadius),
    config.preonEnabled ? '1' : '0',
  ];

  return fnv1a(parts.join('|'));
}

function rgbStr(c: { r: number; g: number; b: number } | undefined): string {
  if (!c) return '--';
  return `${c.r | 0},${c.g | 0},${c.b | 0}`;
}

function numStr(n: number | undefined): string {
  if (n == null) return '-';
  return n.toFixed(3);
}

// ─── mulberry32 PRNG ───
//
// Small, fast, stable. For a 32-bit seed, produces uniform floats in [0, 1).

export type Rng = () => number;

export function seedRng(seed: number): Rng {
  let s = seed >>> 0;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: range-mapped random, [min, max). */
export function rangeRng(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Deterministic choice from an array. */
export function pickRng<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}
