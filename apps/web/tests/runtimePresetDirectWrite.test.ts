// ─── "Write to Card" direct-write path for proffie_runtime ───────────
//
// Exercises the same helpers CardWriter's handleWriteToCard() runs, against
// an in-memory FileSystemDirectoryHandle standing in for the SD card:
//
//   inspectRuntimePresetFiles → backupRuntimePresetFiles →
//   exportMultiPresetZip → writeZipEntriesToDirectory →
//   verifyRuntimePresetFiles
//
// The card starts in the state that caused the 2026-05-17 silent-reversion
// bug: firmware-written (binary-header) presets.ini AND presets.tmp, like
// the 89sabers factory SD card.

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  exportMultiPresetZip,
  writeZipEntriesToDirectory,
  type ExportPreset,
} from '@/lib/zipExporter';
import {
  inspectRuntimePresetFiles,
  backupRuntimePresetFiles,
  verifyRuntimePresetFiles,
} from '@/lib/runtimePresetIO';
import type { BladeConfig } from '@kyberstation/engine';
import {
  createMemoryDirectory,
  firmwareWrittenPresetFile,
} from './fixtures/runtimePresets/memoryDirectoryHandle';

const INSTALL_TIME = 'Apr 21 2026 08:44:54';

const FACTORY_TEXT = [
  `installed=${INSTALL_TIME}`,
  'new_preset',
  'font=Graflex;common',
  'track=tracks/Graflex.wav',
  'style=builtin 0 1',
  'name=Graflex',
  'variation=0',
  'end',
  '',
].join('\n');

function makePreset(name: string, fontName: string): ExportPreset {
  const config: BladeConfig = {
    baseColor: { r: 255, g: 0, b: 128 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 220, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 800,
    shimmer: 0,
    ledCount: 144,
  };
  return { name, fontName, config };
}

async function writeRuntimeDeck(dirHandle: FileSystemDirectoryHandle, installTime?: string) {
  const blob = await exportMultiPresetZip({
    boardId: 'proffie_runtime',
    presets: [makePreset('Magenta', 'Graflex'), makePreset('Second', 'Vader')],
    runtimeInstallTime: installTime,
    runtimeNumBlades: 1,
    runtimeUseAdvancedVerb: true,
  });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const expected = await zip.file('presets.ini')!.async('string');
  const result = await writeZipEntriesToDirectory(zip, dirHandle);
  return { expected, result };
}

describe('proffie_runtime direct write — factory card with saber-written files', () => {
  it('discovers install_time through the firmware binary header', async () => {
    const card = createMemoryDirectory({
      'presets.ini': firmwareWrittenPresetFile(FACTORY_TEXT, INSTALL_TIME, 3),
      'presets.tmp': firmwareWrittenPresetFile(FACTORY_TEXT, INSTALL_TIME, 2),
    });
    const state = await inspectRuntimePresetFiles(card.handle);
    expect(state.installTime).toBe(INSTALL_TIME);
    expect(state.ini.firmwareWritten).toBe(true);
    expect(state.tmp.firmwareWritten).toBe(true);
  });

  it('writes BOTH presets.ini and presets.tmp, byte-identical', async () => {
    const card = createMemoryDirectory({
      'presets.ini': firmwareWrittenPresetFile(FACTORY_TEXT, INSTALL_TIME, 3),
      'presets.tmp': firmwareWrittenPresetFile(FACTORY_TEXT, INSTALL_TIME, 2),
    });
    const { expected, result } = await writeRuntimeDeck(card.handle, INSTALL_TIME);

    expect(result.skipped).toEqual([]);
    expect(result.written).toContain('presets.ini');
    expect(result.written).toContain('presets.tmp');

    const ini = card.files.get('presets.ini')!;
    const tmp = card.files.get('presets.tmp')!;
    expect(Array.from(tmp)).toEqual(Array.from(ini));
    expect(new TextDecoder().decode(ini)).toBe(expected);
    expect(expected.startsWith(`installed=${INSTALL_TIME}\n`)).toBe(true);
  });

  it('leaves no firmware-written preset file behind (nothing can outrank presets.ini)', async () => {
    const card = createMemoryDirectory({
      'presets.ini': firmwareWrittenPresetFile(FACTORY_TEXT, INSTALL_TIME, 3),
      'presets.tmp': firmwareWrittenPresetFile(FACTORY_TEXT, INSTALL_TIME, 9),
    });
    await writeRuntimeDeck(card.handle, INSTALL_TIME);
    const state = await inspectRuntimePresetFiles(card.handle);
    expect(state.ini.firmwareWritten).toBe(false);
    expect(state.tmp.firmwareWritten).toBe(false);
    // Both files fully replaced — no leftover 256 KiB zero padding.
    expect(card.files.get('presets.tmp')!.length).toBeLessThan(4096);
  });

  it('verifyRuntimePresetFiles confirms both files after the write', async () => {
    const card = createMemoryDirectory({
      'presets.tmp': firmwareWrittenPresetFile(FACTORY_TEXT, INSTALL_TIME, 2),
    });
    const { expected } = await writeRuntimeDeck(card.handle, INSTALL_TIME);
    expect(await verifyRuntimePresetFiles(card.handle, expected)).toEqual({
      'presets.ini': true,
      'presets.tmp': true,
    });
  });

  it('verifyRuntimePresetFiles flags a stale presets.tmp', async () => {
    const card = createMemoryDirectory({
      'presets.ini': 'installed=X\nend\n',
      'presets.tmp': firmwareWrittenPresetFile(FACTORY_TEXT, INSTALL_TIME, 2),
    });
    expect(await verifyRuntimePresetFiles(card.handle, 'installed=X\nend\n')).toEqual({
      'presets.ini': true,
      'presets.tmp': false,
    });
  });

  it('backs up both saber-written files byte-for-byte before the write', async () => {
    const factoryIni = firmwareWrittenPresetFile(FACTORY_TEXT, INSTALL_TIME, 3);
    const factoryTmp = firmwareWrittenPresetFile(FACTORY_TEXT, INSTALL_TIME, 2);
    const card = createMemoryDirectory({
      'presets.ini': factoryIni,
      'presets.tmp': factoryTmp,
    });
    const backups = await backupRuntimePresetFiles(card.handle, '2026-09-24T12-00-00-000Z');
    await writeRuntimeDeck(card.handle, INSTALL_TIME);

    expect(backups.map((b) => [b.from, b.to])).toEqual([
      ['presets.ini', 'presets_backup_2026-09-24T12-00-00-000Z.ini'],
      ['presets.tmp', 'presets_backup_2026-09-24T12-00-00-000Z.tmp'],
    ]);
    expect(Array.from(card.files.get('presets_backup_2026-09-24T12-00-00-000Z.ini')!)).toEqual(
      Array.from(factoryIni),
    );
    expect(Array.from(card.files.get('presets_backup_2026-09-24T12-00-00-000Z.tmp')!)).toEqual(
      Array.from(factoryTmp),
    );
  });

  it('backup is a no-op on a card with no preset files', async () => {
    const card = createMemoryDirectory();
    expect(await backupRuntimePresetFiles(card.handle, 'stamp')).toEqual([]);
    expect(card.files.size).toBe(0);
  });
});

describe('writeZipEntriesToDirectory — generic behavior', () => {
  it('creates sub-folders and writes nested files', async () => {
    const zip = new JSZip();
    zip.file('config.h', '// cfg\n');
    zip.folder('font1')!.file('.kyberstation', 'placeholder\n');
    const loaded = await JSZip.loadAsync(await zip.generateAsync({ type: 'uint8array' }));
    const card = createMemoryDirectory();

    const result = await writeZipEntriesToDirectory(loaded, card.handle);

    expect(result.written.sort()).toEqual(['config.h', 'font1/.kyberstation']);
    expect(new TextDecoder().decode(card.files.get('config.h')!)).toBe('// cfg\n');
    const font1 = card.dirs.get('font1')!;
    expect(new TextDecoder().decode(font1.files.get('.kyberstation')!)).toBe('placeholder\n');
  });

  it('refuses unsafe entry names', async () => {
    const zip = new JSZip();
    zip.file('ok.txt', 'fine');
    zip.file('bad name.txt', 'nope');
    const loaded = await JSZip.loadAsync(await zip.generateAsync({ type: 'uint8array' }));
    const card = createMemoryDirectory();

    const result = await writeZipEntriesToDirectory(loaded, card.handle);

    expect(result.written).toEqual(['ok.txt']);
    expect(result.skipped).toEqual([{ path: 'bad name.txt', reason: 'invalid name' }]);
    expect(card.files.has('bad name.txt')).toBe(false);
  });

  it('reports progress for every entry', async () => {
    const zip = new JSZip();
    zip.file('a.txt', 'a');
    zip.file('b.txt', 'b');
    const loaded = await JSZip.loadAsync(await zip.generateAsync({ type: 'uint8array' }));
    const calls: Array<[number, number]> = [];
    await writeZipEntriesToDirectory(loaded, createMemoryDirectory().handle, (d, t) => {
      calls.push([d, t]);
    });
    expect(calls).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});
