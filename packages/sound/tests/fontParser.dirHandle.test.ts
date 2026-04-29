/**
 * Regression tests for `scanDirectoryHandle` + `loadFontFromDirectoryHandle`.
 *
 * Background — both functions previously did:
 *   const entries = (handle as unknown as AsyncIterable<FileSystemHandle>);
 *   for await (const e of entries) { if (e.kind !== 'directory') ... }
 *
 * This is broken: the default async iterator on a real
 * `FileSystemDirectoryHandle` yields `[name, handle]` tuples (entries() shape),
 * not raw handles. So `entry.kind` was always `undefined` — every iteration
 * `continue`d — and the functions silently returned 0 results for every input.
 *
 * The fix: explicitly use `.values()` which yields handles directly.
 * These tests pin the correct behavior so the bug can't regress unnoticed.
 *
 * The mock here mirrors real FSA semantics:
 *   - `for await (const entry of handle)` → tuples (default iterator)
 *   - `for await (const entry of handle.values())` → handles
 *   - `for await (const entry of handle.entries())` → tuples
 */
import { describe, it, expect } from 'vitest';
import {
  scanDirectoryHandle,
  loadFontFromDirectoryHandle,
} from '../src/FontParser.js';

// ─── Mock infrastructure ──────────────────────────────────────────────────

interface MockTree {
  [name: string]: MockTree | { __file: true; size: number };
}

function makeFileHandle(name: string, size: number) {
  const handle = {
    kind: 'file' as const,
    name,
    async getFile() {
      return new File([new ArrayBuffer(size)], name);
    },
  };
  return handle;
}

function makeDirHandle(name: string, tree: MockTree): FileSystemDirectoryHandle {
  // Build the child handles eagerly (synchronously); the async iterators below
  // just yield from this array so behavior is deterministic for tests.
  const children: Array<readonly [string, unknown]> = Object.entries(tree).map(
    ([childName, childTree]) => {
      if ('__file' in childTree) {
        return [childName, makeFileHandle(childName, childTree.size)] as const;
      }
      return [childName, makeDirHandle(childName, childTree)] as const;
    },
  );

  const handle: FileSystemDirectoryHandle = {
    kind: 'directory',
    name,
    async getDirectoryHandle(childName: string) {
      const found = children.find(([n]) => n === childName);
      if (!found || (found[1] as { kind: string }).kind !== 'directory') {
        throw new Error(`Directory not found: ${childName}`);
      }
      return found[1] as FileSystemDirectoryHandle;
    },
    // ── Default async iterator: yields TUPLES (matches real FSA spec) ──
    [Symbol.asyncIterator]: async function* () {
      for (const entry of children) {
        yield entry;
      }
    },
    // ── .values() yields handles directly (the correct API for our use) ──
    values: async function* () {
      for (const [, h] of children) {
        yield h;
      }
    },
    // ── .entries() yields tuples (same as default iterator) ──
    entries: async function* () {
      for (const entry of children) {
        yield entry;
      }
    },
    keys: async function* () {
      for (const [n] of children) {
        yield n;
      }
    },
  } as unknown as FileSystemDirectoryHandle;

  return handle;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────

/** Flat-layout font (ProffieOS classic style — all wavs at top level). */
const FLAT_FONT: MockTree = {
  'hum01.wav': { __file: true, size: 100_000 },
  'clsh01.wav': { __file: true, size: 50_000 },
  'clsh02.wav': { __file: true, size: 50_000 },
  'blst01.wav': { __file: true, size: 30_000 },
  'in01.wav': { __file: true, size: 40_000 },
  'out01.wav': { __file: true, size: 40_000 },
  'swingl01.wav': { __file: true, size: 60_000 },
  'swingl02.wav': { __file: true, size: 60_000 },
  'swingh01.wav': { __file: true, size: 60_000 },
  'swingh02.wav': { __file: true, size: 60_000 },
  'smoothsw.ini': { __file: true, size: 200 },
};

/** Nested-layout font (modern Proffie / Kyberphonic / BK style). */
const NESTED_FONT: MockTree = {
  'hum.wav': { __file: true, size: 100_000 },
  'font.wav': { __file: true, size: 5_000 },
  'ccbegin.wav': { __file: true, size: 3_000 },
  clsh: {
    'clsh01.wav': { __file: true, size: 50_000 },
    'clsh02.wav': { __file: true, size: 50_000 },
    'clsh03.wav': { __file: true, size: 50_000 },
  },
  blst: {
    'blst01.wav': { __file: true, size: 30_000 },
    'blst02.wav': { __file: true, size: 30_000 },
  },
  in: { 'in01.wav': { __file: true, size: 40_000 } },
  out: { 'out01.wav': { __file: true, size: 40_000 } },
  swingl: {
    'swingl01.wav': { __file: true, size: 60_000 },
    'swingl02.wav': { __file: true, size: 60_000 },
  },
  swingh: {
    'swingh01.wav': { __file: true, size: 60_000 },
    'swingh02.wav': { __file: true, size: 60_000 },
  },
  // Modern Proffie / Kyberphonic transition + alert categories. Real fonts
  // ship these in same-named subfolders; one file each is enough to pin
  // the parser surfaces them in `result[0].categories`.
  bgndrag: { 'bgndrag01.wav': { __file: true, size: 30_000 } },
  enddrag: { 'enddrag01.wav': { __file: true, size: 30_000 } },
  bgnlock: { 'bgnlock01.wav': { __file: true, size: 30_000 } },
  endlock: { 'endlock01.wav': { __file: true, size: 30_000 } },
  bgnlb: { 'bgnlb01.wav': { __file: true, size: 30_000 } },
  endlb: { 'endlb01.wav': { __file: true, size: 30_000 } },
  bgnmelt: { 'bgnmelt01.wav': { __file: true, size: 30_000 } },
  endmelt: { 'endmelt01.wav': { __file: true, size: 30_000 } },
  lb: { 'lb01.wav': { __file: true, size: 30_000 } },
  lowbatt: { 'lowbatt01.wav': { __file: true, size: 20_000 } },
  color: { 'color01.wav': { __file: true, size: 20_000 } },
  ccchange: { 'ccchange.wav': { __file: true, size: 5_000 } },
  'smoothsw.ini': { __file: true, size: 200 },
};

/** Empty subfolder — should be skipped (fileCount === 0). */
const EMPTY_FOLDER: MockTree = {
  'README.txt': { __file: true, size: 100 },
};

// ─── Tests: scanDirectoryHandle ───────────────────────────────────────────

describe('scanDirectoryHandle', () => {
  it('discovers flat-layout fonts and counts top-level .wav files', async () => {
    const root = makeDirHandle('Library', { FlatFont: FLAT_FONT });
    const result = await scanDirectoryHandle(root);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('FlatFont');
    expect(result[0].fileCount).toBe(10); // 10 wavs, smoothsw.ini excluded
    expect(result[0].hasSmoothSwing).toBe(true);
    expect(result[0].smoothSwingPairCount).toBe(2);
  });

  it('discovers nested-layout fonts (modern Proffie / Kyberphonic style)', async () => {
    const root = makeDirHandle('Library', { NestedFont: NESTED_FONT });
    const result = await scanDirectoryHandle(root);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('NestedFont');
    // 3 top-level wavs (hum/font/ccbegin) + 3 clsh + 2 blst + 1 in + 1 out
    //   + 2 swingl + 2 swingh = 14 classic-category files.
    // Plus 12 modern-category subfolders × 1 file each = 12 more. Total 26.
    expect(result[0].fileCount).toBe(26);
    expect(result[0].hasSmoothSwing).toBe(true);
    expect(result[0].smoothSwingPairCount).toBe(2);
    expect(result[0].completeness).toBe('complete');
    // Modern Proffie / Kyberphonic categories surface in the manifest with
    // count = 1 each. Pins the bgn/end ordering against `lockup` / `lb` /
    // `drag` / `melt` short-circuit, and confirms `lowbatt` / `color` /
    // `ccchange` reach the manifest instead of dropping into warnings.
    expect(result[0].categories.bgndrag).toBe(1);
    expect(result[0].categories.enddrag).toBe(1);
    expect(result[0].categories.bgnlock).toBe(1);
    expect(result[0].categories.endlock).toBe(1);
    expect(result[0].categories.bgnlb).toBe(1);
    expect(result[0].categories.endlb).toBe(1);
    expect(result[0].categories.bgnmelt).toBe(1);
    expect(result[0].categories.endmelt).toBe(1);
    expect(result[0].categories.lb).toBe(1);
    expect(result[0].categories.lowbatt).toBe(1);
    expect(result[0].categories.color).toBe(1);
    expect(result[0].categories.ccchange).toBe(1);
    // Bare `lockup` / `drag` / `melt` should NOT have absorbed the bgn/end
    // siblings (regression sentinel for CATEGORY_PATTERNS ordering).
    expect(result[0].categories.lockup).toBeFalsy();
    expect(result[0].categories.drag).toBeFalsy();
    expect(result[0].categories.melt).toBeFalsy();
  });

  it('handles a mixed library (flat + nested + empty)', async () => {
    const root = makeDirHandle('Library', {
      FlatFont: FLAT_FONT,
      NestedFont: NESTED_FONT,
      EmptyFolder: EMPTY_FOLDER,
    });
    const result = await scanDirectoryHandle(root);
    // EmptyFolder has 0 wavs — excluded by `if (fileCount === 0) continue`
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name).sort()).toEqual(['FlatFont', 'NestedFont']);
  });

  it('returns empty array when library is empty', async () => {
    const root = makeDirHandle('Library', {});
    const result = await scanDirectoryHandle(root);
    expect(result).toEqual([]);
  });

  it('reports progress per discovered font', async () => {
    const root = makeDirHandle('Library', {
      FlatFont: FLAT_FONT,
      NestedFont: NESTED_FONT,
    });
    const progressCalls: Array<[number, string]> = [];
    await scanDirectoryHandle(root, (n, name) => {
      progressCalls.push([n, name]);
    });
    expect(progressCalls).toHaveLength(2);
    expect(progressCalls[0][0]).toBe(1);
    expect(progressCalls[1][0]).toBe(2);
  });

  it('regression: does NOT silently return 0 entries when iterator yields tuples', async () => {
    // The bug: code used `for await (const e of handle)` (default iterator,
    // yields tuples) but treated `e` as a handle. `e.kind` was undefined,
    // so every iteration `continue`d. Test fails loudly if that pattern
    // is reintroduced.
    const root = makeDirHandle('Library', { FlatFont: FLAT_FONT });
    const result = await scanDirectoryHandle(root);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── Tests: loadFontFromDirectoryHandle ───────────────────────────────────

describe('loadFontFromDirectoryHandle', () => {
  it('loads all .wav files from a flat-layout font', async () => {
    const root = makeDirHandle('Library', { FlatFont: FLAT_FONT });
    const files = await loadFontFromDirectoryHandle(root, 'FlatFont');
    expect(files.length).toBe(10);
    expect(files.every((f) => f.name.endsWith('.wav'))).toBe(true);
  });

  it('loads all .wav files from a nested-layout font (recursive)', async () => {
    const root = makeDirHandle('Library', { NestedFont: NESTED_FONT });
    const files = await loadFontFromDirectoryHandle(root, 'NestedFont');
    // 14 classic-category files + 12 modern-category subfolder files = 26.
    expect(files.length).toBe(26);
  });

  it('attaches webkitRelativePath that includes subfolder for nested wavs', async () => {
    const root = makeDirHandle('Library', { NestedFont: NESTED_FONT });
    const files = await loadFontFromDirectoryHandle(root, 'NestedFont');
    const clshFile = files.find((f) => f.name === 'clsh01.wav');
    expect(clshFile).toBeDefined();
    const path = (clshFile as File & { webkitRelativePath: string })
      .webkitRelativePath;
    // Path must start with the font name so parseFileList can categorize.
    expect(path.startsWith('NestedFont/')).toBe(true);
  });

  it('returns empty array for a non-font subfolder (no .wav files)', async () => {
    const root = makeDirHandle('Library', { EmptyFolder: EMPTY_FOLDER });
    const files = await loadFontFromDirectoryHandle(root, 'EmptyFolder');
    expect(files).toEqual([]);
  });

  it('skips macOS Finder resource-fork files (._*.wav)', async () => {
    const root = makeDirHandle('Library', {
      WeirdFont: {
        'hum01.wav': { __file: true, size: 100_000 },
        '._hum01.wav': { __file: true, size: 4_000 }, // macOS metadata sidecar
        'clsh01.wav': { __file: true, size: 50_000 },
        '._clsh01.wav': { __file: true, size: 4_000 },
      },
    });
    const files = await loadFontFromDirectoryHandle(root, 'WeirdFont');
    // The 2 real wavs should land; the 2 ._-prefixed sidecars should be excluded.
    expect(files.length).toBe(2);
    expect(files.every((f) => !f.name.startsWith('._'))).toBe(true);
  });

  it('regression: does NOT silently return 0 files when iterator yields tuples', async () => {
    const root = makeDirHandle('Library', { FlatFont: FLAT_FONT });
    const files = await loadFontFromDirectoryHandle(root, 'FlatFont');
    expect(files.length).toBeGreaterThan(0);
  });
});
