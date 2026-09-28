// ─── ProffieOS runtime presets — wire-format fixtures ────────────────
//
// Mirrors the Kyber Glyph fixture pattern (tests/fixtures/kyberGlyphs/v1):
// each fixture pins the exact presets.ini text a proffie_runtime export
// produces, and the bundle MUST carry presets.tmp as a byte-identical copy.
//
// Why presets.tmp matters: ProffieOS 7.12 CurrentPreset::OpenPresets2()
// (common/current_preset.h) loads any firmware-written file (valid
// SafeFileHeader) BEFORE a plain-text presets.ini. A stale saber-written
// presets.tmp therefore silently overrides a freshly copied presets.ini.
// Two identical plain-text files leave only TryPlain(presets.ini).

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { exportMultiPresetZip, type ExportPreset } from '@/lib/zipExporter';
import { isValidRuntimeStyleString } from '@kyberstation/codegen';
import type { BladeConfig } from '@kyberstation/engine';
import v1Fixtures from './fixtures/runtimePresets/v1/fixtures.json';

interface RuntimeFixture {
  name: string;
  input: {
    runtimeInstallTime: string | null;
    runtimeNumBlades: number;
    runtimeUseAdvancedVerb: boolean;
    presets: Array<{ name: string; fontName: string; config: unknown }>;
  };
  zipFiles: string[];
  presetsIni: string;
}

const fixtures = v1Fixtures.fixtures as RuntimeFixture[];

async function exportFixture(f: RuntimeFixture): Promise<JSZip> {
  const blob = await exportMultiPresetZip({
    boardId: 'proffie_runtime',
    presets: f.input.presets.map(
      (p): ExportPreset => ({
        name: p.name,
        fontName: p.fontName,
        config: p.config as BladeConfig,
      }),
    ),
    runtimeInstallTime: f.input.runtimeInstallTime ?? undefined,
    runtimeNumBlades: f.input.runtimeNumBlades as 1 | 2 | 3 | 4,
    runtimeUseAdvancedVerb: f.input.runtimeUseAdvancedVerb,
  });
  return JSZip.loadAsync(await blob.arrayBuffer());
}

describe('runtime preset wire format — v1 fixtures', () => {
  it('ships at least one fixture per delivery mode', () => {
    expect(fixtures.some((f) => !f.input.runtimeUseAdvancedVerb)).toBe(true);
    expect(fixtures.some((f) => f.input.runtimeUseAdvancedVerb)).toBe(true);
  });

  for (const fixture of fixtures) {
    it(`fixture "${fixture.name}" contains exactly the pinned files`, async () => {
      const zip = await exportFixture(fixture);
      expect(Object.keys(zip.files).sort()).toEqual([...fixture.zipFiles].sort());
    });

    it(`fixture "${fixture.name}" emits the exact pinned presets.ini`, async () => {
      const zip = await exportFixture(fixture);
      expect(await zip.file('presets.ini')!.async('string')).toBe(fixture.presetsIni);
    });

    it(`fixture "${fixture.name}" emits presets.tmp byte-identical to presets.ini`, async () => {
      const zip = await exportFixture(fixture);
      const ini = await zip.file('presets.ini')!.async('uint8array');
      const tmp = await zip.file('presets.tmp')!.async('uint8array');
      expect(tmp.length).toBe(ini.length);
      expect(Array.from(tmp)).toEqual(Array.from(ini));
    });

    it(`fixture "${fixture.name}" only emits style strings that pass IsValidStyleString`, async () => {
      const zip = await exportFixture(fixture);
      const styles = (await zip.file('presets.ini')!.async('string'))
        .split('\n')
        .filter((l) => l.startsWith('style='))
        .map((l) => l.slice('style='.length));
      expect(styles.length).toBeGreaterThan(0);
      for (const s of styles) expect(isValidRuntimeStyleString(s)).toBe(true);
    });

    it(`fixture "${fixture.name}" is plain text a firmware header can't be mistaken for`, async () => {
      // OpenPresets2() only prefers files starting with the SafeFileHeader
      // magic 0xFF1E5AFE (little-endian FE 5A 1E FF). Ours must start with
      // "installed=" so TryPlain() — not TryValidator() — picks them up.
      const zip = await exportFixture(fixture);
      const tmp = await zip.file('presets.tmp')!.async('string');
      expect(tmp.startsWith('installed=')).toBe(true);
      expect(tmp.endsWith('end\n')).toBe(true);
    });
  }
});
