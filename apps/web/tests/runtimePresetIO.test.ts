// ─── runtimePresetIO tests ───────────────────────────────────────────
//
// Pure helper tests for parsing the install_time line out of an
// existing presets.ini. The async FileSystemDirectoryHandle wrappers
// are thin shims and rely on the parser tested here.

import { describe, it, expect } from 'vitest';
import {
  parseInstallTime,
  parseInstallTimeFromBytes,
  extractFirmwarePayload,
  isFirmwareWrittenPresetFile,
  readExistingInstallTime,
  inspectRuntimePresetFiles,
  runtimePresetBackupName,
} from '@/lib/runtimePresetIO';
import {
  createMemoryDirectory,
  firmwareWrittenPresetFile,
} from './fixtures/runtimePresets/memoryDirectoryHandle';

const FACTORY_TEXT = 'installed=Feb 20 2025 15:39:20\nnew_preset\nfont=Graflex;common\nend\n';

describe('firmware-written preset files (SafeFileHeader2)', () => {
  it('recognizes the binary header and extracts the payload at byte 512', () => {
    const bytes = firmwareWrittenPresetFile(FACTORY_TEXT, 'Feb 20 2025 15:39:20', 3);
    expect(isFirmwareWrittenPresetFile(bytes)).toBe(true);
    const payload = extractFirmwarePayload(bytes)!;
    expect(new TextDecoder().decode(payload)).toBe(FACTORY_TEXT);
  });

  it('treats plain text as not firmware-written', () => {
    const bytes = new TextEncoder().encode(FACTORY_TEXT);
    expect(isFirmwareWrittenPresetFile(bytes)).toBe(false);
    expect(extractFirmwarePayload(bytes)).toBeNull();
  });

  it('rejects a header whose two records differ (ProffieOS treats it as invalid)', () => {
    const bytes = firmwareWrittenPresetFile(FACTORY_TEXT, 'Feb 20 2025 15:39:20', 3);
    bytes[16 + 8] = 7; // corrupt the second record's iteration
    expect(isFirmwareWrittenPresetFile(bytes)).toBe(false);
  });

  it('clamps a length field that runs past the end of the file', () => {
    const longText = `installed=X\n${'new_preset\n'.repeat(20)}end\n`; // > 88 bytes
    const bytes = firmwareWrittenPresetFile(longText, 'X', 1).subarray(0, 600);
    const payload = extractFirmwarePayload(bytes)!;
    expect(payload.length).toBe(600 - 512);
  });
});

describe('parseInstallTimeFromBytes', () => {
  it('reads install_time from a firmware-written file (the factory-card case)', () => {
    // Before this helper, CardWriter decoded the whole file as text; the
    // binary header made the first "line" garbage and the write fell back
    // to the placeholder, which ProffieOS rejects.
    const bytes = firmwareWrittenPresetFile(FACTORY_TEXT, 'Feb 20 2025 15:39:20', 3);
    expect(parseInstallTime(new TextDecoder().decode(bytes))).toBeNull();
    expect(parseInstallTimeFromBytes(bytes)).toBe('Feb 20 2025 15:39:20');
  });

  it('reads install_time from a plain-text file', () => {
    const bytes = new TextEncoder().encode('installed=Apr 21 2026 08:44:54\nend\n');
    expect(parseInstallTimeFromBytes(bytes)).toBe('Apr 21 2026 08:44:54');
  });

  it('preserves the __DATE__ double space for single-digit days', () => {
    const bytes = firmwareWrittenPresetFile(
      'installed=May  1 2026 09:05:07\nend\n',
      'May  1 2026 09:05:07',
      1,
    );
    expect(parseInstallTimeFromBytes(bytes)).toBe('May  1 2026 09:05:07');
  });
});

describe('readExistingInstallTime / inspectRuntimePresetFiles', () => {
  it('prefers presets.ini', async () => {
    const card = createMemoryDirectory({
      'presets.ini': 'installed=From Ini\nend\n',
      'presets.tmp': 'installed=From Tmp\nend\n',
    });
    expect(await readExistingInstallTime(card.handle)).toBe('From Ini');
  });

  it('falls back to presets.tmp when presets.ini is missing', async () => {
    const card = createMemoryDirectory({
      'presets.tmp': firmwareWrittenPresetFile('installed=From Tmp\nend\n', 'From Tmp', 4),
    });
    expect(await readExistingInstallTime(card.handle)).toBe('From Tmp');
  });

  it('falls back to presets.tmp when presets.ini is unparseable', async () => {
    const card = createMemoryDirectory({
      'presets.ini': 'garbage\n',
      'presets.tmp': 'installed=From Tmp\nend\n',
    });
    expect(await readExistingInstallTime(card.handle)).toBe('From Tmp');
  });

  it('returns null for a card with neither file', async () => {
    const card = createMemoryDirectory();
    expect(await readExistingInstallTime(card.handle)).toBeNull();
    const state = await inspectRuntimePresetFiles(card.handle);
    expect(state.ini.exists).toBe(false);
    expect(state.tmp.exists).toBe(false);
  });

  it('reports which files the saber wrote itself', async () => {
    const card = createMemoryDirectory({
      'presets.ini': 'installed=X\nend\n',
      'presets.tmp': firmwareWrittenPresetFile('installed=X\nend\n', 'X', 2),
    });
    const state = await inspectRuntimePresetFiles(card.handle);
    expect(state.ini).toMatchObject({ exists: true, firmwareWritten: false, installTime: 'X' });
    expect(state.tmp).toMatchObject({ exists: true, firmwareWritten: true, installTime: 'X' });
  });
});

describe('runtimePresetBackupName', () => {
  it('keeps the original extension so restoring is a rename', () => {
    expect(runtimePresetBackupName('presets.ini', 'S')).toBe('presets_backup_S.ini');
    expect(runtimePresetBackupName('presets.tmp', 'S')).toBe('presets_backup_S.tmp');
  });
});

describe('parseInstallTime', () => {
  it('extracts the value after installed=', () => {
    const input = 'installed=Apr 21 2026 08:44:54\nnew_preset\nfont=Graflex\n';
    expect(parseInstallTime(input)).toBe('Apr 21 2026 08:44:54');
  });

  it('tolerates CRLF line endings', () => {
    const input = 'installed=Apr 21 2026 08:44:54\r\nnew_preset\r\n';
    expect(parseInstallTime(input)).toBe('Apr 21 2026 08:44:54');
  });

  it('strips a leading BOM', () => {
    const input = '﻿installed=May 1 2026 12:00:00\nnew_preset\n';
    expect(parseInstallTime(input)).toBe('May 1 2026 12:00:00');
  });

  it('skips leading blank lines and # comments', () => {
    const input = '\n\n# this is a comment\ninstalled=May 14 2026 18:00:00\n';
    expect(parseInstallTime(input)).toBe('May 14 2026 18:00:00');
  });

  it('returns null for an empty string', () => {
    expect(parseInstallTime('')).toBeNull();
  });

  it('returns null when the first non-comment line is not installed=', () => {
    const input = 'new_preset\ninstalled=Too Late 2026\nend\n';
    expect(parseInstallTime(input)).toBeNull();
  });

  it('returns null when installed= value is empty', () => {
    expect(parseInstallTime('installed=\nnew_preset\n')).toBeNull();
  });

  it('returns null when installed= value is whitespace only', () => {
    expect(parseInstallTime('installed=   \nnew_preset\n')).toBeNull();
  });

  it('trims trailing whitespace from the install_time value', () => {
    expect(parseInstallTime('installed=Apr 21 2026 08:44:54   \nnew_preset\n')).toBe(
      'Apr 21 2026 08:44:54',
    );
  });
});
