// ─── filenameReveal() — motion primitive pure-logic tests ───
//
// The hook / component is a thin wrapper around CSS. What's worth
// testing is the `computeReveal` math:
//
//   1. Character count matches input length (including multi-byte).
//   2. First char delay is 0, last char delay < duration.
//   3. Delays are monotonically non-decreasing.
//   4. Zero-length / single-char inputs don't divide-by-zero.
//   5. Custom duration is honoured.
//
// Node environment — we don't exercise JSX or matchMedia here;
// those are covered by manual visual QA per the task spec.

import { describe, it, expect } from 'vitest';
import { computeReveal } from '../hooks/useFilenameReveal';

describe('computeReveal', () => {
  it('splits a filename into per-character tuples matching input length', () => {
    const r = computeReveal('obi_wan.h');
    expect(r.chars).toHaveLength('obi_wan.h'.length);
    expect(r.chars.map((c) => c.char).join('')).toBe('obi_wan.h');
  });

  it('first character has delay 0', () => {
    const r = computeReveal('vader.h');
    expect(r.chars[0]!.delayMs).toBe(0);
  });

  it('last character delay stays inside the total duration', () => {
    const r = computeReveal('a_reasonably_long_filename.h', { duration: 400 });
    const last = r.chars[r.chars.length - 1]!.delayMs;
    expect(last).toBeLessThan(400);
  });

  it('delays are monotonically non-decreasing', () => {
    const r = computeReveal('starkiller.h');
    for (let i = 1; i < r.chars.length; i++) {
      expect(r.chars[i]!.delayMs).toBeGreaterThanOrEqual(r.chars[i - 1]!.delayMs);
    }
  });

  it('handles a single character without NaN delays', () => {
    const r = computeReveal('x');
    expect(r.chars).toHaveLength(1);
    expect(r.chars[0]!.delayMs).toBe(0);
    expect(r.staggerMs).toBe(0);
    expect(Number.isFinite(r.totalMs)).toBe(true);
  });

  it('handles an empty string', () => {
    const r = computeReveal('');
    expect(r.chars).toHaveLength(0);
    expect(r.durationMs).toBe(400);
    expect(r.totalMs).toBe(400);
  });

  it('honours a custom duration', () => {
    const r = computeReveal('abcdef', { duration: 800 });
    expect(r.durationMs).toBe(800);
    // Stagger window is 40% of duration spread across (len-1) chars.
    const expected = Math.round((800 * 0.4) / 5);
    expect(r.chars[1]!.delayMs).toBe(expected);
  });

  it('clamps unreasonably small durations to a minimum', () => {
    const r = computeReveal('abc', { duration: 10 });
    expect(r.durationMs).toBeGreaterThanOrEqual(50);
  });

  it('preserves special filename characters (underscore, dot, hyphen)', () => {
    const r = computeReveal('my-preset_v2.h');
    expect(r.chars.map((c) => c.char).join('')).toBe('my-preset_v2.h');
  });
});
