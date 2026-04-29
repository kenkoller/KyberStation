// ─── migrateBlendMode contract tests ──────────────────────────────────
//
// Pins the Hardware Fidelity tighten contract from
// `docs/HARDWARE_FIDELITY_PRINCIPLE.md`: every legacy / unknown / null
// blend-mode value coerces to `'normal'` (the only literal that
// round-trips to a ProffieOS template). The migration helper is the
// single choke-point for blend-mode reads on persisted state +
// network payloads — keeps the policy in one place + grep-able.

import { describe, it, expect } from 'vitest';
import { migrateBlendMode } from '../src/types';

describe('migrateBlendMode', () => {
  it('coerces every legacy non-normal value to normal', () => {
    expect(migrateBlendMode('add')).toBe('normal');
    expect(migrateBlendMode('multiply')).toBe('normal');
    expect(migrateBlendMode('screen')).toBe('normal');
    expect(migrateBlendMode('overlay')).toBe('normal');
  });

  it('passes the canonical normal value through unchanged', () => {
    expect(migrateBlendMode('normal')).toBe('normal');
  });

  it('coerces unknown / future / garbage strings to normal', () => {
    expect(migrateBlendMode('unknown-mode')).toBe('normal');
    expect(migrateBlendMode('Add')).toBe('normal'); // case-mismatch
    expect(migrateBlendMode('')).toBe('normal');
    expect(migrateBlendMode('luminosity')).toBe('normal'); // photoshop mode
  });

  it('coerces non-string inputs (undefined, null, number, object) to normal', () => {
    expect(migrateBlendMode(undefined)).toBe('normal');
    expect(migrateBlendMode(null)).toBe('normal');
    expect(migrateBlendMode(0)).toBe('normal');
    expect(migrateBlendMode(42)).toBe('normal');
    expect(migrateBlendMode({})).toBe('normal');
    expect(migrateBlendMode([])).toBe('normal');
  });

  it('result is always exactly the string "normal" (drift sentinel)', () => {
    // If a future change ever adds a second valid mode, this test
    // forces the maintainer to update the assertion intentionally.
    const inputs = ['add', 'multiply', 'screen', 'overlay', 'normal', '', undefined];
    for (const input of inputs) {
      const result = migrateBlendMode(input);
      expect(result).toBe('normal');
      expect(typeof result).toBe('string');
      expect(result.length).toBe(6);
    }
  });
});
