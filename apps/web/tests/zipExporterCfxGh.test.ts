// ─── CFX + GH export honesty contract (2026-05-03) ───
//
// Mirrors `zipExporterXenopixel.test.ts` for the other two non-Proffie
// boards whose exports are KyberStation's invented schemas (verified
// because `cardDetector.ts` looks for KyberStation's own markers like
// `[general]` / `profiles=` / `[board]` / `color_base=`, not real
// firmware-file fingerprints).
//
// Surfaces pinned:
//   1. Inline banner at top of generated config (first line of file).
//   2. `KYBERSTATION_README.txt` at ZIP root.
//   3. cardDetector recognition still works (existing markers preserved).

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  exportMultiPresetZip,
  exportPresetZip,
  CFX_DESIGN_REFERENCE_BANNER,
  CFX_README_TEXT,
  GH_DESIGN_REFERENCE_BANNER,
  GH_README_TEXT,
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

function makePreset(name: string, overrides: Partial<BladeConfig> = {}): ExportPreset {
  return { name, config: makeConfig(overrides) };
}

async function blobToBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

async function readZipFile(blob: Blob, path: string): Promise<string | null> {
  const zip = await JSZip.loadAsync(await blobToBuffer(blob));
  const entry = zip.file(path);
  if (!entry) return null;
  return entry.async('string');
}

async function listZipPaths(blob: Blob): Promise<string[]> {
  const zip = await JSZip.loadAsync(await blobToBuffer(blob));
  return Object.keys(zip.files).sort();
}

// ─── CFX ─────────────────────────────────────────────────────────────

describe('CFX export — design-reference disclaimer', () => {
  describe('config.txt inline banner', () => {
    it('top-level config.txt starts with the design-reference banner', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'cfx',
      });
      const content = await readZipFile(blob, 'config.txt');
      expect(content).not.toBeNull();
      expect(content!.startsWith(CFX_DESIGN_REFERENCE_BANNER)).toBe(true);
    });

    it('per-font config.txt also starts with the banner', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'cfx',
      });
      const content = await readZipFile(blob, 'font1/config.txt');
      expect(content).not.toBeNull();
      expect(content!.startsWith(CFX_DESIGN_REFERENCE_BANNER)).toBe(true);
    });

    it('banner includes the explicit "NOT flashable" phrasing', () => {
      expect(CFX_DESIGN_REFERENCE_BANNER).toContain('NOT flashable');
    });

    it('banner mentions Plecter Labs / Plecter Studio so users know the real-tool path', () => {
      expect(CFX_DESIGN_REFERENCE_BANNER).toContain('Plecter');
    });

    it('banner uses # comment style (INI convention for CFX)', () => {
      const lines = CFX_DESIGN_REFERENCE_BANNER.split('\n');
      for (const line of lines) {
        expect(line.startsWith('#')).toBe(true);
      }
    });

    it('preserves the existing `[general]` / `profiles=` / `[profile` markers cardDetector relies on', async () => {
      // cardDetector.ts:118-122 checks for these. Backward compat must hold.
      const blob = await exportMultiPresetZip({
        presets: [makePreset('A'), makePreset('B')],
        boardId: 'cfx',
      });
      const content = await readZipFile(blob, 'config.txt');
      expect(content).toContain('[general]');
      expect(content).toContain('profiles=');
      expect(content).toContain('[profile1]');
    });
  });

  describe('KYBERSTATION_README.txt at ZIP root', () => {
    it('is included in every CFX ZIP export', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'cfx',
      });
      const readme = await readZipFile(blob, 'KYBERSTATION_README.txt');
      expect(readme).toBe(CFX_README_TEXT);
    });

    it('explains why KyberStation can\'t write CFX firmware files directly', () => {
      expect(CFX_README_TEXT.toLowerCase()).toContain(
        'why kyberstation can\'t write cfx firmware files directly',
      );
    });

    it('points users at Plecter Studio as the real configuration tool', () => {
      expect(CFX_README_TEXT).toContain('Plecter Studio');
    });

    it('points users at Proffieboard V3 for full programmatic control', () => {
      expect(CFX_README_TEXT).toContain('Proffieboard V3');
    });

    it('is plain text — no markdown headers, no emoji', () => {
      expect(CFX_README_TEXT).not.toMatch(/^#\s/m);
      expect(CFX_README_TEXT).not.toMatch(/[🚨⚠️🔥✅❌]/u);
    });

    it('mentions hex colors so CFX users know base/clash/lockup are 6-digit hex', () => {
      expect(CFX_README_TEXT.toLowerCase()).toContain('hex');
    });
  });
});

// ─── Golden Harvest ──────────────────────────────────────────────────

describe('Golden Harvest export — design-reference disclaimer', () => {
  describe('config.ini inline banner', () => {
    it('config.ini starts with the design-reference banner', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'golden_harvest',
      });
      const content = await readZipFile(blob, 'config.ini');
      expect(content).not.toBeNull();
      expect(content!.startsWith(GH_DESIGN_REFERENCE_BANNER)).toBe(true);
    });

    it('banner includes the explicit "NOT flashable" phrasing', () => {
      expect(GH_DESIGN_REFERENCE_BANNER).toContain('NOT flashable');
    });

    it('banner uses ; comment style (INI convention for GH)', () => {
      const lines = GH_DESIGN_REFERENCE_BANNER.split('\n');
      for (const line of lines) {
        expect(line.startsWith(';')).toBe(true);
      }
    });

    it('preserves `[board]` and `color_base=` markers cardDetector relies on', async () => {
      // cardDetector.ts:140-143 checks for these.
      const blob = await exportPresetZip({
        preset: makePreset('Test', { baseColor: { r: 0, g: 140, b: 255 } }),
        boardId: 'golden_harvest',
      });
      const content = await readZipFile(blob, 'config.ini');
      expect(content).toContain('[board]');
      expect(content).toContain('color_base=0,140,255');
    });

    it('preserves `[profile1]` per-profile section so existing parsing works', async () => {
      const blob = await exportMultiPresetZip({
        presets: [makePreset('First'), makePreset('Second')],
        boardId: 'golden_harvest',
      });
      const content = await readZipFile(blob, 'config.ini');
      expect(content).toContain('[profile1]');
      expect(content).toContain('[profile2]');
    });
  });

  describe('KYBERSTATION_README.txt at ZIP root', () => {
    it('is included in every GH ZIP export', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'golden_harvest',
      });
      const readme = await readZipFile(blob, 'KYBERSTATION_README.txt');
      expect(readme).toBe(GH_README_TEXT);
    });

    it('explains why KyberStation can\'t write GH firmware files directly', () => {
      expect(GH_README_TEXT.toLowerCase()).toContain(
        'why kyberstation can\'t write gh firmware files directly',
      );
    });

    it('mentions vendor companion apps as the real configuration path', () => {
      expect(GH_README_TEXT.toLowerCase()).toContain('vendor');
      expect(GH_README_TEXT.toLowerCase()).toContain('companion app');
    });

    it('points users at Proffieboard V3 for full programmatic control', () => {
      expect(GH_README_TEXT).toContain('Proffieboard V3');
    });

    it('is plain text — no markdown headers, no emoji', () => {
      expect(GH_README_TEXT).not.toMatch(/^#\s/m);
      expect(GH_README_TEXT).not.toMatch(/[🚨⚠️🔥✅❌]/u);
    });
  });
});

// ─── Cross-board contract checks ─────────────────────────────────────

describe('All non-Proffie boards now ship a KYBERSTATION_README.txt', () => {
  it.each(['xenopixel', 'cfx', 'golden_harvest'] as const)(
    '%s ZIP root contains KYBERSTATION_README.txt',
    async (boardId) => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId,
      });
      const paths = await listZipPaths(blob);
      expect(paths).toContain('KYBERSTATION_README.txt');
    },
  );

  it('Proffie ZIP does NOT include the KYBERSTATION_README.txt (its config.h IS flashable)', async () => {
    const blob = await exportPresetZip({
      preset: makePreset('Test'),
      boardId: 'proffie',
    });
    const paths = await listZipPaths(blob);
    expect(paths).not.toContain('KYBERSTATION_README.txt');
    expect(paths).toContain('config.h');
  });
});
