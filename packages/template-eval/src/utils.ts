// ─── Shared Math Utilities ───
// Pure functions used across template implementations.

import { PROFFIE_MAX } from './types.js';

/**
 * Seed-based pseudo-random number generator (xorshift32).
 * Deterministic: same seed produces same sequence.
 */
export function xorshift32(seed: number): () => number {
  let state = seed | 1; // Ensure non-zero
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296; // 0.0 - 1.0
  };
}

/**
 * Simple hash of two numbers to produce a deterministic "random" value.
 * Used for per-LED randomization that's consistent within a frame.
 */
export function hashPair(a: number, b: number): number {
  let h = (a * 2654435761) ^ (b * 2246822519);
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return (h >>> 0) / 4294967296;
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * SmoothStep interpolation (Hermite).
 */
export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * ProffieOS-style clamped division: Scale maps input from [min, max] range.
 * scale(input, min, max) = min + (input * (max - min)) / 32768
 */
export function scaleValue(input: number, min: number, max: number): number {
  return Math.round(min + ((input * (max - min)) / PROFFIE_MAX));
}

/**
 * Sine wave oscillator. Returns 0-32768 with configurable period.
 * Matches ProffieOS Sin<period_ms> behavior.
 */
export function sinWave(timeMs: number, periodMs: number): number {
  if (periodMs <= 0) return PROFFIE_MAX / 2;
  const phase = (timeMs % periodMs) / periodMs;
  const value = Math.sin(phase * 2 * Math.PI);
  // Map from [-1, 1] to [0, 32768]
  return Math.round((value + 1) * (PROFFIE_MAX / 2));
}

/**
 * Gaussian bump function centered at `center` with given `width`.
 * Both values in 0-32768 scale. Returns 0-32768.
 */
export function bump(position: number, center: number, width: number): number {
  if (width <= 0) return 0;
  const dist = position - center;
  const sigma = width / (2 * PROFFIE_MAX); // Normalize
  const normalDist = dist / PROFFIE_MAX;
  const value = Math.exp(-(normalDist * normalDist) / (2 * sigma * sigma));
  return Math.round(value * PROFFIE_MAX);
}

/**
 * Convert an LED position (0 to numLeds-1) to ProffieOS blade position (0-32768).
 */
export function ledToBladePos(led: number, numLeds: number): number {
  if (numLeds <= 1) return 0;
  return Math.round((led / (numLeds - 1)) * PROFFIE_MAX);
}
