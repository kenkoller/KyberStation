// ─── Xenopixel SD card export contract tests ───────────────────────
//
// Pins the Xenopixel V3 SD card config export format:
//
//   1. set/config.ini — global saber settings (motion, volume, etc.)
//   2. N/fontconfig.ini — per-font blade color + effect + ignition
//   3. KYBERSTATION_README.txt — user-facing explainer at ZIP root
//
// These tests verify the real INI-based SD card structure that
// Xenopixel V3 boards expect, not a design-reference JSON.

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  exportMultiPresetZip,
  exportPresetZip,
  XENOPIXEL_SD_CARD_NOTE,
  XENOPIXEL_README_TEXT,
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

describe('Xenopixel SD card export', () => {
  describe('SD card structure', () => {
    it('produces set/config.ini for global settings', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Obi-Wan'),
        boardId: 'xenopixel',
      });
      const configIni = await readZipFile(blob, 'set/config.ini');
      expect(configIni).not.toBeNull();
      expect(configIni!.length).toBeGreaterThan(0);
    });

    it('produces numbered font folders with fontconfig.ini', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Obi-Wan'),
        boardId: 'xenopixel',
      });
      const fontConfig = await readZipFile(blob, '1/fontconfig.ini');
      expect(fontConfig).not.toBeNull();
      expect(fontConfig!).toContain('font1=');
    });

    it('includes KYBERSTATION_README.txt at ZIP root', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Obi-Wan'),
        boardId: 'xenopixel',
      });
      const readme = await readZipFile(blob, 'KYBERSTATION_README.txt');
      expect(readme).not.toBeNull();
      expect(readme!.length).toBeGreaterThan(100);
    });
  });

  describe('fontconfig.ini content', () => {
    it('encodes base color as RGB tuple', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Blue Saber', { baseColor: { r: 0, g: 140, b: 255 } }),
        boardId: 'xenopixel',
      });
      const fontConfig = await readZipFile(blob, '1/fontconfig.ini');
      expect(fontConfig).not.toBeNull();
      // font1=(R,G,B),... format
      expect(fontConfig!).toContain('(0,140,255)');
    });

    it('maps blade effect IDs for Xenopixel-compatible styles', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Fire Saber', { style: 'fire' }),
        boardId: 'xenopixel',
      });
      const fontConfig = await readZipFile(blob, '1/fontconfig.ini');
      expect(fontConfig).not.toBeNull();
      // fire → effect 0 on Xenopixel
      expect(fontConfig!).toMatch(/font1=\(\d+,\d+,\d+\),0/);
    });
  });

  describe('SD card note and README', () => {
    it('SD card note describes the export as real config files', () => {
      expect(XENOPIXEL_SD_CARD_NOTE).toContain('SD card');
    });

    it('README content matches the exported constant', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'xenopixel',
      });
      const readme = await readZipFile(blob, 'KYBERSTATION_README.txt');
      expect(readme).toBe(XENOPIXEL_README_TEXT);
    });

    it('README explains what\'s in the ZIP (config.ini + font folders)', () => {
      expect(XENOPIXEL_README_TEXT).toContain('config.ini');
      expect(XENOPIXEL_README_TEXT.toLowerCase()).toContain('font');
    });

    it('README includes install instructions', () => {
      expect(XENOPIXEL_README_TEXT).toContain('HOW TO INSTALL');
    });

    it('README includes a GitHub URL for feedback', () => {
      expect(XENOPIXEL_README_TEXT).toContain('github.com/kenkoller/KyberStation');
    });

    it('README is plain text — no markdown headers, no emoji', () => {
      expect(XENOPIXEL_README_TEXT).not.toMatch(/^#\s/m);
      expect(XENOPIXEL_README_TEXT).not.toMatch(/[🚨⚠️🔥✅❌]/u);
    });
  });

  describe('Multi-preset Xenopixel export', () => {
    it('creates numbered folders for each preset', async () => {
      const blob = await exportMultiPresetZip({
        presets: [makePreset('A'), makePreset('B'), makePreset('C')],
        boardId: 'xenopixel',
      });
      const paths = await listZipPaths(blob);
      expect(paths).toContain('KYBERSTATION_README.txt');
      expect(paths.some(p => p.startsWith('set/'))).toBe(true);

      // Each preset gets its own numbered folder
      const font1 = await readZipFile(blob, '1/fontconfig.ini');
      const font2 = await readZipFile(blob, '2/fontconfig.ini');
      const font3 = await readZipFile(blob, '3/fontconfig.ini');
      expect(font1).not.toBeNull();
      expect(font2).not.toBeNull();
      expect(font3).not.toBeNull();
    });

    it('assigns sequential font numbers to each preset', async () => {
      const blob = await exportMultiPresetZip({
        presets: [
          makePreset('First'),
          makePreset('Second'),
          makePreset('Third'),
        ],
        boardId: 'xenopixel',
      });

      const font1 = await readZipFile(blob, '1/fontconfig.ini');
      const font2 = await readZipFile(blob, '2/fontconfig.ini');
      const font3 = await readZipFile(blob, '3/fontconfig.ini');

      expect(font1!).toContain('font1=');
      expect(font2!).toContain('font2=');
      expect(font3!).toContain('font3=');
    });
  });

  describe('Other boards have their own README content (not the Xenopixel one)', () => {
    it('Proffie ZIP does NOT include any KYBERSTATION_README.txt (its config.h IS flashable)', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'proffie',
      });
      const paths = await listZipPaths(blob);
      expect(paths).not.toContain('KYBERSTATION_README.txt');
      expect(paths).toContain('config.h');
    });

    it('CFX README is NOT the Xenopixel README content', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'cfx',
      });
      const readme = await readZipFile(blob, 'KYBERSTATION_README.txt');
      expect(readme).not.toBeNull();
      expect(readme).toContain('CFX');
      expect(readme).not.toBe(XENOPIXEL_README_TEXT);
    });

    it('GH README is NOT the Xenopixel README content', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'golden_harvest',
      });
      const readme = await readZipFile(blob, 'KYBERSTATION_README.txt');
      expect(readme).not.toBeNull();
      expect(readme!.toLowerCase()).toContain('golden harvest');
      expect(readme).not.toBe(XENOPIXEL_README_TEXT);
    });
  });
});
