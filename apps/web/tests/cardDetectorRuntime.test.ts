// ─── detectRuntimePresetSupport tests ───
//
// Mocks the slice of FileSystemDirectoryHandle the detector needs:
// `getFileHandle(name)` returning a handle whose `.getFile().text()`
// resolves to a string, or rejecting with a DOMException-shaped error
// when the file doesn't exist.

import { describe, it, expect } from 'vitest';
import { detectRuntimePresetSupport } from '@/lib/cardDetector';

interface FakeFile {
  name: string;
  content: string;
}

function makeDirHandle(files: FakeFile[]): FileSystemDirectoryHandle {
  return {
    async getFileHandle(name: string): Promise<FileSystemFileHandle> {
      const f = files.find((x) => x.name === name);
      if (!f) throw new Error('NotFoundError');
      return {
        async getFile() {
          return {
            async text() {
              return f.content;
            },
          } as unknown as File;
        },
      } as unknown as FileSystemFileHandle;
    },
  } as unknown as FileSystemDirectoryHandle;
}

describe('detectRuntimePresetSupport', () => {
  it('returns { hasPresetsIni: false, installedLine: null } when file is absent', async () => {
    const dir = makeDirHandle([]);
    const result = await detectRuntimePresetSupport(dir);
    expect(result).toEqual({ hasPresetsIni: false, installedLine: null });
  });

  it('returns the first installed= line when present', async () => {
    const dir = makeDirHandle([
      {
        name: 'presets.ini',
        content:
          'installed=Apr 21 2026 08:44:54\nnew_preset\nfont=Graflex\nend\n',
      },
    ]);
    const result = await detectRuntimePresetSupport(dir);
    expect(result.hasPresetsIni).toBe(true);
    expect(result.installedLine).toBe('installed=Apr 21 2026 08:44:54');
  });

  it('skips leading comments + blank lines before installed=', async () => {
    const dir = makeDirHandle([
      {
        name: 'presets.ini',
        content: '\n# comment line\n\ninstalled=May 1 2026 12:00:00\nend\n',
      },
    ]);
    const result = await detectRuntimePresetSupport(dir);
    expect(result.installedLine).toBe('installed=May 1 2026 12:00:00');
  });

  it('reports hasPresetsIni: true but installedLine: null when file is malformed', async () => {
    const dir = makeDirHandle([
      {
        name: 'presets.ini',
        content: 'new_preset\nfont=Graflex\ninstalled=too_late\nend\n',
      },
    ]);
    const result = await detectRuntimePresetSupport(dir);
    expect(result.hasPresetsIni).toBe(true);
    expect(result.installedLine).toBeNull();
  });

  it('reports hasPresetsIni: true but installedLine: null when file is empty', async () => {
    const dir = makeDirHandle([{ name: 'presets.ini', content: '' }]);
    const result = await detectRuntimePresetSupport(dir);
    expect(result.hasPresetsIni).toBe(true);
    expect(result.installedLine).toBeNull();
  });
});
