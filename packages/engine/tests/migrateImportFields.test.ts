// ─── migrateImportFields contract tests ──────────────────────────────
//
// Pins the import-preservation field shape: persisted state without
// these fields round-trips as "native" (= empty object); persisted
// state with them survives a load. Garbage inputs (wrong types,
// negative numbers, empty strings) are dropped silently rather than
// throwing — these fields are best-effort metadata, not load-bearing.

import { describe, it, expect } from 'vitest';
import { migrateImportFields } from '../src/types';

describe('migrateImportFields', () => {
  it('returns empty object for null / undefined / non-object input', () => {
    expect(migrateImportFields(undefined)).toEqual({});
    expect(migrateImportFields(null)).toEqual({});
    expect(migrateImportFields('a string')).toEqual({});
    expect(migrateImportFields(42)).toEqual({});
    expect(migrateImportFields(true)).toEqual({});
  });

  it('returns empty object when none of the import fields are present', () => {
    expect(migrateImportFields({})).toEqual({});
    expect(migrateImportFields({ name: 'Obi-Wan', baseColor: { r: 0, g: 0, b: 255 } })).toEqual({});
  });

  it('preserves valid importedRawCode strings', () => {
    expect(
      migrateImportFields({ importedRawCode: 'StylePtr<Blue>()' })
    ).toEqual({ importedRawCode: 'StylePtr<Blue>()' });
  });

  it('preserves multi-line raw code with embedded angle brackets and newlines', () => {
    const code = `StylePtr<Layers<
  Stripes<3000, 1500, Rgb<0,140,255>, Rgb<255,255,255>>,
  ResponsiveLockupL<White, TrInstant, TrFade<300>>
>>()`;
    expect(migrateImportFields({ importedRawCode: code })).toEqual({ importedRawCode: code });
  });

  it('drops empty / whitespace-only importedRawCode', () => {
    expect(migrateImportFields({ importedRawCode: '' })).toEqual({});
  });

  it('drops non-string importedRawCode', () => {
    expect(migrateImportFields({ importedRawCode: 42 })).toEqual({});
    expect(migrateImportFields({ importedRawCode: null })).toEqual({});
    expect(migrateImportFields({ importedRawCode: { code: 'x' } })).toEqual({});
  });

  it('preserves valid importedAt timestamps', () => {
    expect(migrateImportFields({ importedAt: 1714694400000 })).toEqual({
      importedAt: 1714694400000,
    });
    // 0 is a valid finite number — Unix epoch
    expect(migrateImportFields({ importedAt: 0 })).toEqual({ importedAt: 0 });
  });

  it('drops non-finite importedAt (NaN, Infinity, string)', () => {
    expect(migrateImportFields({ importedAt: NaN })).toEqual({});
    expect(migrateImportFields({ importedAt: Infinity })).toEqual({});
    expect(migrateImportFields({ importedAt: -Infinity })).toEqual({});
    expect(migrateImportFields({ importedAt: '1714694400000' })).toEqual({});
  });

  it('preserves valid importedSource label', () => {
    expect(migrateImportFields({ importedSource: 'Fett263 OS7 Style Library' })).toEqual({
      importedSource: 'Fett263 OS7 Style Library',
    });
  });

  it('drops empty importedSource', () => {
    expect(migrateImportFields({ importedSource: '' })).toEqual({});
  });

  it('drops non-string importedSource', () => {
    expect(migrateImportFields({ importedSource: 42 })).toEqual({});
    expect(migrateImportFields({ importedSource: null })).toEqual({});
  });

  it('returns all three fields when all are present and valid', () => {
    const input = {
      importedRawCode: 'StylePtr<Blue>()',
      importedAt: 1714694400000,
      importedSource: 'Pasted from Discord',
    };
    expect(migrateImportFields(input)).toEqual(input);
  });

  it('preserves only the valid fields when some are garbage', () => {
    expect(
      migrateImportFields({
        importedRawCode: 'StylePtr<Red>()',
        importedAt: 'not-a-number',
        importedSource: 42,
        somethingElse: 'ignored',
      })
    ).toEqual({ importedRawCode: 'StylePtr<Red>()' });
  });

  it('result is a fresh object — not the same reference as input', () => {
    const input = { importedRawCode: 'X', importedAt: 1, importedSource: 'src' };
    const result = migrateImportFields(input);
    expect(result).not.toBe(input);
    expect(result).toEqual(input);
  });
});
