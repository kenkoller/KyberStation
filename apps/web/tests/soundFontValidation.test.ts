import { describe, it, expect } from 'vitest';
import {
  findMissingFontReferences,
  listAvailableFonts,
  type FontReference,
} from '@/lib/soundFontValidation';

describe('findMissingFontReferences', () => {
  const AVAILABLE = ['Anakin', 'Luke_ROTJ', 'Obi-Wan', 'Mace_V3'];

  it('returns empty when every preset has a matching folder', () => {
    const refs: FontReference[] = [
      { presetName: 'Anakin EP III', fontName: 'Anakin' },
      { presetName: 'Luke ROTJ', fontName: 'Luke_ROTJ' },
    ];
    expect(findMissingFontReferences(refs, AVAILABLE)).toEqual([]);
  });

  it('matches case-insensitively (mirroring ProffieOS firmware behavior)', () => {
    const refs: FontReference[] = [
      { presetName: 'Anakin', fontName: 'anakin' },
      { presetName: 'Obi-Wan', fontName: 'OBI-WAN' },
    ];
    expect(findMissingFontReferences(refs, AVAILABLE)).toEqual([]);
  });

  it('flags presets whose font folder is not on the card', () => {
    const refs: FontReference[] = [
      { presetName: 'Anakin', fontName: 'Anakin' },
      { presetName: 'Mace EP I', fontName: 'mace_v1' },
    ];
    const missing = findMissingFontReferences(refs, AVAILABLE);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({
      presetName: 'Mace EP I',
      fontName: 'mace_v1',
    });
  });

  it('suggests a closest match by 3-char prefix when available', () => {
    const refs: FontReference[] = [
      { presetName: 'Mace V1', fontName: 'mace_v1' },
    ];
    const missing = findMissingFontReferences(refs, AVAILABLE);
    expect(missing[0].closestMatch).toBe('Mace_V3');
  });

  it('omits closestMatch when no folder shares a 3-char prefix', () => {
    const refs: FontReference[] = [
      { presetName: 'Yoda', fontName: 'yoda' },
    ];
    const missing = findMissingFontReferences(refs, AVAILABLE);
    expect(missing[0].closestMatch).toBeUndefined();
  });

  it('skips presets with empty/whitespace fontName', () => {
    const refs: FontReference[] = [
      { presetName: 'Has Empty', fontName: '' },
      { presetName: 'Has Whitespace', fontName: '   ' },
    ];
    expect(findMissingFontReferences(refs, AVAILABLE)).toEqual([]);
  });

  it('treats every reference as missing when the card has no font folders', () => {
    const refs: FontReference[] = [
      { presetName: 'Anakin', fontName: 'Anakin' },
      { presetName: 'Mace', fontName: 'Mace_V3' },
    ];
    const missing = findMissingFontReferences(refs, []);
    expect(missing).toHaveLength(2);
    expect(missing.every((m) => m.closestMatch === undefined)).toBe(true);
  });
});

describe('listAvailableFonts', () => {
  function makeHandle(
    entries: Array<{ name: string; kind: 'file' | 'directory' }>,
  ): FileSystemDirectoryHandle {
    return {
      async *entries() {
        for (const e of entries) {
          yield [e.name, { kind: e.kind }];
        }
      },
    } as unknown as FileSystemDirectoryHandle;
  }

  it('returns only immediate child directories, sorted', async () => {
    const handle = makeHandle([
      { name: 'Anakin', kind: 'directory' },
      { name: 'Luke_ROTJ', kind: 'directory' },
      { name: 'config.ini', kind: 'file' },
      { name: 'Obi-Wan', kind: 'directory' },
    ]);
    const fonts = await listAvailableFonts(handle);
    expect(fonts).toEqual(['Anakin', 'Luke_ROTJ', 'Obi-Wan']);
  });

  it('skips macOS metadata directories (dot-prefixed)', async () => {
    const handle = makeHandle([
      { name: 'Anakin', kind: 'directory' },
      { name: '.Spotlight-V100', kind: 'directory' },
      { name: '.fseventsd', kind: 'directory' },
      { name: '.DS_Store', kind: 'file' },
    ]);
    expect(await listAvailableFonts(handle)).toEqual(['Anakin']);
  });

  it('returns empty for a card with only files at root', async () => {
    const handle = makeHandle([
      { name: 'config.ini', kind: 'file' },
      { name: 'presets.ini', kind: 'file' },
    ]);
    expect(await listAvailableFonts(handle)).toEqual([]);
  });
});
