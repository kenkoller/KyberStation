/**
 * Deterministic pseudo-random noise functions.
 * Ported from the working prototype's noise implementation.
 */

/** Simple 1D hash-based noise. Returns 0-1. */
export function noise(x: number, seed: number = 1): number {
  return Math.sin(x * 12.9898 + seed * 78.233) * 0.5 + 0.5;
}

/** 2D hash for Perlin-style noise. */
function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Smooth interpolation (hermite). */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** 2D value noise. Returns 0-1. */
export function noise2d(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const sx = smoothstep(fx);
  const sy = smoothstep(fy);

  const n00 = hash2d(ix, iy);
  const n10 = hash2d(ix + 1, iy);
  const n01 = hash2d(ix, iy + 1);
  const n11 = hash2d(ix + 1, iy + 1);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;

  return nx0 + (nx1 - nx0) * sy;
}

/** Fractal Brownian Motion — layered noise for fire/plasma effects. */
export function fbm(x: number, y: number, octaves: number = 2): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2d(x * frequency, y * frequency);
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / total;
}
