// ─── PerformanceBar — pure helper regression tests ──
//
// The component itself is a subscriber-heavy React shell, so node-only
// vitest focuses on the pure helpers that back the shift-light rail:
//
//   meanLuminance   — RMS proxy: mean of (R+G+B)/765 across the buffer
//   smoothRms       — exponential moving average for the rail
//   shiftLedColor   — bucket an LED at index / count into off/ok/warn/error
//
// If these are right, the rail's visible behavior ("flash red on
// clash, pulse green at idle") is a thin wiring concern in
// PerformanceBar.

import { describe, it, expect } from 'vitest';
import {
  meanLuminance,
  smoothRms,
  shiftLedColor,
} from '../lib/shiftLight';

// ─── meanLuminance ───────────────────────────────────────────────────────────

describe('meanLuminance', () => {
  it('returns 0 for a null / empty buffer', () => {
    expect(meanLuminance(null, 144)).toBe(0);
    expect(meanLuminance(new Uint8Array(0), 144)).toBe(0);
    expect(meanLuminance(new Uint8Array(3), 0)).toBe(0);
  });

  it('returns 1 for a fully-white buffer (R=G=B=255 across all LEDs)', () => {
    const buf = new Uint8Array(144 * 3).fill(255);
    expect(meanLuminance(buf, 144)).toBe(1);
  });

  it('returns 0 for a fully-black buffer (all zeros)', () => {
    const buf = new Uint8Array(144 * 3);
    expect(meanLuminance(buf, 144)).toBe(0);
  });

  it('returns ≈0.5 for a uniformly mid-gray buffer', () => {
    const buf = new Uint8Array(32 * 3).fill(128);
    // (128 + 128 + 128) / 765 ≈ 0.502
    expect(meanLuminance(buf, 32)).toBeCloseTo(384 / 765, 6);
  });

  it('sums channels per-LED before averaging (not per-byte)', () => {
    // A single red LED among 3 → (255 + 0 + 0)/765 / 3 ≈ 0.1111...
    const buf = new Uint8Array([255, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(meanLuminance(buf, 3)).toBeCloseTo(255 / (3 * 765), 6);
  });

  it('only reads ledCount * 3 bytes even when buffer is larger', () => {
    // 5 LEDs of white followed by 5 LEDs of black, but we only want 5.
    const buf = new Uint8Array(10 * 3);
    for (let i = 0; i < 5 * 3; i++) buf[i] = 255;
    expect(meanLuminance(buf, 5)).toBe(1);
  });

  it('only reads floor(buffer.length / 3) LEDs when ledCount exceeds the buffer', () => {
    // Buffer holds 2 LEDs' worth of data; ledCount claims 5 → only read 2.
    const buf = new Uint8Array([255, 255, 255, 128, 128, 128]);
    // (765 + 384) / (2 * 765) = 0.7509...
    expect(meanLuminance(buf, 5)).toBeCloseTo(1149 / 1530, 6);
  });
});

// ─── smoothRms ───────────────────────────────────────────────────────────────

describe('smoothRms', () => {
  it('returns the current value when alpha = 1 (no smoothing)', () => {
    expect(smoothRms(0.2, 0.8, 1)).toBe(0.8);
  });

  it('returns the previous value when alpha = 0 (full freeze)', () => {
    expect(smoothRms(0.2, 0.8, 0)).toBe(0.2);
  });

  it('produces a weighted average at alpha = 0.5', () => {
    expect(smoothRms(0.2, 0.8, 0.5)).toBeCloseTo(0.5, 10);
  });

  it('clamps alpha into [0, 1]', () => {
    expect(smoothRms(0.2, 0.8, -0.5)).toBe(0.2);
    expect(smoothRms(0.2, 0.8, 1.5)).toBe(0.8);
  });

  it('converges toward the target through repeated application', () => {
    let rms = 0;
    for (let i = 0; i < 50; i++) {
      rms = smoothRms(rms, 0.9, 0.25);
    }
    expect(rms).toBeCloseTo(0.9, 3);
  });
});

// ─── shiftLedColor ───────────────────────────────────────────────────────────

describe('shiftLedColor', () => {
  it('returns "off" for every LED when rms = 0', () => {
    for (let i = 0; i < 32; i++) {
      expect(shiftLedColor(i, 32, 0)).toBe('off');
    }
  });

  it('green band covers LEDs whose position is below 0.5', () => {
    // At rms = 0.6, LEDs whose pos < 0.6 are lit. Positions < 0.5 → green.
    expect(shiftLedColor(0, 32, 0.6)).toBe('ok');
    expect(shiftLedColor(10, 32, 0.6)).toBe('ok');
  });

  it('amber band covers LEDs whose position is in [0.5, 0.75)', () => {
    // Index 17 of 32 → pos 17/31 ≈ 0.548 → amber when lit (rms > 0.548).
    expect(shiftLedColor(17, 32, 0.8)).toBe('warn');
  });

  it('red band covers LEDs whose position is ≥ 0.75', () => {
    // Index 28 of 32 → pos 28/31 ≈ 0.903 → red when lit (rms > 0.903).
    expect(shiftLedColor(28, 32, 0.95)).toBe('error');
  });

  it('handles a single-LED rail without division-by-zero', () => {
    expect(shiftLedColor(0, 1, 0.5)).toBe('ok');
    expect(shiftLedColor(0, 1, 0)).toBe('off');
  });

  it('full-scale rms lights every LED up to its bucket', () => {
    const colors = Array.from({ length: 32 }, (_, i) =>
      shiftLedColor(i, 32, 1.01),
    );
    expect(colors.every((c) => c !== 'off')).toBe(true);
    expect(colors.includes('ok')).toBe(true);
    expect(colors.includes('warn')).toBe(true);
    expect(colors.includes('error')).toBe(true);
  });
});
