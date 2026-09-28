// ─── Shared harness for preset render tests ──────────────────────────
//
// Deterministic helpers used by the preset differential gate
// (`presetRenderParity.test.ts`) and the template-eval golden hashes
// (`bladeEngineGoldenHash.test.ts`). Not a test file itself.
//
// Determinism: the motion simulator's sound level and several template
// styles (StyleFire's heat map, …) draw from Math.random, so every run
// installs a seeded generator and reseeds it at known points.

import { vi } from 'vitest';
import type { Preset } from '@kyberstation/presets';
import {
  DEFAULT_TOPOLOGY,
  type BladeConfig,
  type BladeTopology,
} from '@kyberstation/engine';

/** mulberry32 — small, fast, well-distributed 32-bit PRNG. */
export class SeededRandom {
  private state = 1;

  seed(value: number): void {
    this.state = value >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/** Route Math.random through a SeededRandom until `restore()` is called. */
export function installSeededRandom(): { rng: SeededRandom; restore: () => void } {
  const rng = new SeededRandom();
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => rng.next());
  return { rng, restore: () => spy.mockRestore() };
}

/**
 * Single-blade topology sized to `ledCount` — what the editor's
 * `bladeStore.loadPreset` builds when a preset's LED count differs from
 * the default 132-LED topology.
 */
export function singleBladeTopology(ledCount: number): BladeTopology {
  const main = DEFAULT_TOPOLOGY.segments[0]!;
  return {
    ...DEFAULT_TOPOLOGY,
    totalLEDs: ledCount,
    segments: [{ ...main, endLED: ledCount - 1 }],
  };
}

/** The BladeConfig the editor renders for a gallery preset. */
export function presetBladeConfig(preset: Preset): BladeConfig {
  return { ...preset.config } as BladeConfig;
}

export interface BladeStats {
  /** Number of LEDs. */
  count: number;
  /** Sum of all channels over all LEDs. */
  brightness: number;
  /** LEDs whose brightest channel is ≥ 16 (visibly on). */
  lit: number;
  /** LEDs with every channel ≥ 245 (pure white). */
  white: number;
  /** Mean colour over all LEDs. */
  mean: [number, number, number];
}

export function bladeStats(px: Uint8Array): BladeStats {
  let brightness = 0;
  let lit = 0;
  let white = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < px.length; i += 3) {
    const pr = px[i]!;
    const pg = px[i + 1]!;
    const pb = px[i + 2]!;
    brightness += pr + pg + pb;
    r += pr;
    g += pg;
    b += pb;
    if (Math.max(pr, pg, pb) >= 16) lit++;
    if (Math.min(pr, pg, pb) >= 245) white++;
  }
  const count = px.length / 3;
  return { count, brightness, lit, white, mean: [r / count, g / count, b / count] };
}

/** Hue (degrees), saturation (0-1) and value (0-255) of an RGB triple. */
export function toHsv([r, g, b]: readonly [number, number, number]): { h: number; s: number; v: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

/** Smallest angle between two hues, in degrees. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
