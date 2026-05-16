// ─── ProffieOS Runtime preset export contract tests ────────────────
//
// Pins the SD-card-native export bundle:
//
//   1. presets.ini at ZIP root — the runtime preset file
//   2. KYBERSTATION_README.txt at ZIP root — user-facing explainer
//
// Importantly, this bundle MUST NOT contain font folders. The user's
// factory firmware already has the sound fonts on its SD card; emitting
// placeholder folders here would invite the user to overwrite real
// audio on extract.

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  exportMultiPresetZip,
  exportPresetZip,
  PROFFIE_RUNTIME_README_TEXT,
  PROFFIE_RUNTIME_INSTALL_TIME_PLACEHOLDER,
  type ExportPreset,
} from '@/lib/zipExporter';
import type { BladeConfig } from '@kyberstation/engine';

// ─── Fixture helpers ─────────────────────────────────────────────────

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 0, g: 140, b: 255 },
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
    ...overrides,
  };
}

function makePreset(
  name: string,
  fontName?: string,
  overrides: Partial<BladeConfig> = {},
): ExportPreset {
  return { name, fontName, config: makeConfig(overrides) };
}

async function readZipFile(blob: Blob, path: string): Promise<string | null> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const entry = zip.file(path);
  if (!entry) return null;
  return entry.async('string');
}

async function listZipPaths(blob: Blob): Promise<string[]> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return Object.keys(zip.files).sort();
}

describe('ProffieOS Runtime export (proffie_runtime)', () => {
  describe('ZIP structure', () => {
    it('emits exactly presets.ini and KYBERSTATION_README.txt — no font folders', async () => {
      const blob = await exportMultiPresetZip({
        presets: [
          makePreset('Graflex', 'Graflex'),
          makePreset('Vader', 'Vader'),
        ],
        boardId: 'proffie_runtime',
      });

      const paths = await listZipPaths(blob);
      expect(paths).toEqual(['KYBERSTATION_README.txt', 'presets.ini']);
    });

    it('embeds the pinned README at the ZIP root', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Graflex', 'Graflex'),
        boardId: 'proffie_runtime',
      });

      const readme = await readZipFile(blob, 'KYBERSTATION_README.txt');
      expect(readme).toBe(PROFFIE_RUNTIME_README_TEXT);
    });
  });

  describe('presets.ini content', () => {
    it('uses the install_time placeholder when no runtimeInstallTime is supplied', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Graflex', 'Graflex'),
        boardId: 'proffie_runtime',
      });

      const content = await readZipFile(blob, 'presets.ini');
      expect(content).not.toBeNull();
      expect(content!.split('\n')[0]).toBe(
        `installed=${PROFFIE_RUNTIME_INSTALL_TIME_PLACEHOLDER}`,
      );
    });

    it('substitutes the supplied runtimeInstallTime', async () => {
      const blob = await exportMultiPresetZip({
        presets: [makePreset('Graflex', 'Graflex')],
        boardId: 'proffie_runtime',
        runtimeInstallTime: 'Apr 21 2026 08:44:54',
      });

      const content = await readZipFile(blob, 'presets.ini');
      expect(content!.split('\n')[0]).toBe('installed=Apr 21 2026 08:44:54');
    });

    it('maps array index 1:1 to builtinPresetIndex', async () => {
      const blob = await exportMultiPresetZip({
        presets: [
          makePreset('A', 'a'),
          makePreset('B', 'b'),
          makePreset('C', 'c'),
        ],
        boardId: 'proffie_runtime',
      });

      const content = await readZipFile(blob, 'presets.ini');
      expect(content).toContain('style=builtin 0 1');
      expect(content).toContain('style=builtin 1 1');
      expect(content).toContain('style=builtin 2 1');
    });

    it('duplicates style= line per blade when runtimeNumBlades > 1', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Krosgaard', 'krosgaard'),
        boardId: 'proffie_runtime',
        runtimeNumBlades: 3,
      });

      const content = await readZipFile(blob, 'presets.ini');
      expect(content).toContain('style=builtin 0 1');
      expect(content).toContain('style=builtin 0 2');
      expect(content).toContain('style=builtin 0 3');
      expect(content).not.toContain('style=builtin 0 4');
    });

    it('falls back to `tracks/<fontName>.wav` when track is not provided', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Graflex', 'Graflex'),
        boardId: 'proffie_runtime',
      });

      const content = await readZipFile(blob, 'presets.ini');
      expect(content).toContain('track=tracks/Graflex.wav');
    });

    it('terminates with `end\\n`', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Graflex', 'Graflex'),
        boardId: 'proffie_runtime',
      });

      const content = await readZipFile(blob, 'presets.ini');
      expect(content!.endsWith('end\n')).toBe(true);
    });

    it('Phase C: emits `style=advanced R,G,B …` when runtimeUseAdvancedVerb is true', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Custom', 'custom', {
          baseColor: { r: 255, g: 0, b: 128 },
          clashColor: { r: 255, g: 255, b: 255 },
          lockupColor: { r: 255, g: 220, b: 80 },
          blastColor: { r: 255, g: 255, b: 255 },
          ignitionMs: 250,
          retractionMs: 700,
        }),
        boardId: 'proffie_runtime',
        runtimeUseAdvancedVerb: true,
        runtimeInstallTime: 'Apr 21 2026 08:44:54',
      });

      const content = await readZipFile(blob, 'presets.ini');
      // ProffieOS RgbArg parser expects 0-65535 per channel (styles/rgb_arg.h:41).
      // BladeConfig stores 0-255; emitter scales × 257. Magenta (255,0,128)
      // becomes (65535, 0, 32896). Empirically verified on 89sabers V3.9-BT
      // 2026-05-16: this scaling produces a bright magenta blade. Without it
      // (the previous 0-255 emission) the blade rendered at <1% brightness.
      expect(content).toContain('style=advanced 65535,0,32896 65535,0,32896 65535,0,32896 ');
      // Slot 9 (extensionMs=250) + Slot 10 (retractionMs=700) — raw ms preserved
      expect(content).toContain(' 250 700 ');
      // Slot 7 (lockupColor 255,220,80) → 16-bit (65535, 56540, 20560)
      expect(content).toContain('65535,56540,20560');
      // No builtin line should be emitted in Phase C
      expect(content).not.toContain('style=builtin');
    });

    it('Phase A default: builtin emitted when runtimeUseAdvancedVerb is omitted', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Stock', 'stock', { baseColor: { r: 255, g: 0, b: 128 } }),
        boardId: 'proffie_runtime',
        runtimeInstallTime: 'Apr 21 2026 08:44:54',
      });

      const content = await readZipFile(blob, 'presets.ini');
      expect(content).toContain('style=builtin 0 1');
      expect(content).not.toContain('style=advanced');
    });

    it('preserves preset order from the input array', async () => {
      const blob = await exportMultiPresetZip({
        presets: [
          makePreset('Three', 'three'),
          makePreset('One', 'one'),
          makePreset('Two', 'two'),
        ],
        boardId: 'proffie_runtime',
      });

      const content = await readZipFile(blob, 'presets.ini');
      const threeIdx = content!.indexOf('name=Three');
      const oneIdx = content!.indexOf('name=One');
      const twoIdx = content!.indexOf('name=Two');
      expect(threeIdx).toBeGreaterThanOrEqual(0);
      expect(oneIdx).toBeGreaterThan(threeIdx);
      expect(twoIdx).toBeGreaterThan(oneIdx);
    });
  });
});
