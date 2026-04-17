// ─── StatusSignal glyph-vocabulary regression tests ───
//
// The component itself is a trivial JSX wrapper — what we really care
// about is that the glyph vocabulary stays stable. If someone swaps ✓
// for ✔ or ◉ for ◎ they'll look similar at-a-glance but may render
// inconsistently across fonts. Pinning the codepoints here catches
// that accidentally.

import { describe, it, expect } from 'vitest';
import {
  statusGlyph,
  eraGlyph,
  factionGlyph,
  LEGENDS_GLYPH,
} from '../components/shared/StatusSignal';

describe('statusGlyph', () => {
  it('returns pinned codepoints for each status variant', () => {
    expect(statusGlyph('idle')).toBe('\u25CF');     // ●
    expect(statusGlyph('active')).toBe('\u25C9');   // ◉
    expect(statusGlyph('success')).toBe('\u2713');  // ✓
    expect(statusGlyph('warning')).toBe('\u25B2');  // ▲
    expect(statusGlyph('alert')).toBe('\u26A0');    // ⚠
    expect(statusGlyph('error')).toBe('\u2715');    // ✕
  });

  it('every variant returns a single-character glyph', () => {
    const variants = ['idle', 'active', 'success', 'warning', 'alert', 'error'] as const;
    for (const v of variants) {
      const g = statusGlyph(v);
      // Some glyphs are 2 UTF-16 code units (astral); check array length too.
      expect(g.length).toBeGreaterThanOrEqual(1);
      expect(g.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('eraGlyph', () => {
  it('returns pinned codepoints for each era', () => {
    expect(eraGlyph('prequel')).toBe('\u25C7');            // ◇
    expect(eraGlyph('original-trilogy')).toBe('\u25C6');   // ◆
    expect(eraGlyph('sequel')).toBe('\u25B2');             // ▲
    expect(eraGlyph('animated')).toBe('\u25EF');           // ◯
    expect(eraGlyph('expanded-universe')).toBe('\u2726');  // ✦
  });

  it('prequel and OT glyphs share a shape family (◇ vs ◆)', () => {
    // Hollow vs filled diamond — visually related, readable pair.
    expect(eraGlyph('prequel')).not.toBe(eraGlyph('original-trilogy'));
  });
});

describe('factionGlyph', () => {
  it('returns pinned codepoints for each affiliation', () => {
    expect(factionGlyph('jedi')).toBe('\u2609');    // ☉
    expect(factionGlyph('sith')).toBe('\u2726');    // ✦
    expect(factionGlyph('neutral')).toBe('\u00B7'); // ·
    expect(factionGlyph('other')).toBe('\u25D0');   // ◐
  });

  it('jedi and sith have distinct glyphs even when tint overlap is high', () => {
    expect(factionGlyph('jedi')).not.toBe(factionGlyph('sith'));
  });
});

describe('LEGENDS_GLYPH', () => {
  it('is pinned to ✧ (U+2727)', () => {
    expect(LEGENDS_GLYPH).toBe('\u2727');
  });
});
