// ─── Xenopixel export honesty contract (2026-05-03) ───
//
// Pins the design-reference disclaimer surfaces shipped to clarify
// that KyberStation's Xenopixel export is NOT flashable firmware.
// Two surfaces:
//
//   1. JSON `_kyberstation_note` top-level field — carries the banner
//      text in-band so any tool inspecting the file sees the contract.
//   2. `KYBERSTATION_README.txt` at ZIP root — plain-text explainer
//      for non-technical users who pop open the ZIP in Finder/Explorer.
//
// Backward-compat: the JSON's `profiles[]` shape is unchanged so
// `cardDetector.ts` Xenopixel SD-card recognition keeps working.

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  exportMultiPresetZip,
  exportPresetZip,
  XENOPIXEL_DESIGN_REFERENCE_NOTE,
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
  // JSZip.loadAsync handles ArrayBuffer reliably across Node test envs;
  // raw Blob support is patchy depending on whether jsdom or node-fetch
  // ships a compatible Blob implementation.
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

describe('Xenopixel export — design-reference disclaimer', () => {
  describe('config.json shape', () => {
    it('emits a top-level `_kyberstation_note` field with the banner text', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Obi-Wan'),
        boardId: 'xenopixel',
      });
      const json = await readZipFile(blob, 'config.json');
      expect(json).not.toBeNull();
      const parsed = JSON.parse(json!);
      expect(parsed._kyberstation_note).toBe(XENOPIXEL_DESIGN_REFERENCE_NOTE);
    });

    it('emits `exportType: "design-reference"` so tools can detect the contract programmatically', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Obi-Wan'),
        boardId: 'xenopixel',
      });
      const parsed = JSON.parse((await readZipFile(blob, 'config.json'))!);
      expect(parsed.exportType).toBe('design-reference');
    });

    it('the banner text says "NOT flashable" so the contract is unambiguous', () => {
      // Pinned exact phrasing — the test fails if a future copy edit
      // accidentally softens "NOT" to "not always" or similar.
      expect(XENOPIXEL_DESIGN_REFERENCE_NOTE).toContain('NOT flashable');
    });

    it('the banner text mentions Xenopixel\'s preloaded-effects architecture', () => {
      expect(XENOPIXEL_DESIGN_REFERENCE_NOTE.toLowerCase()).toContain('preloaded effects');
    });

    it('the banner text points users at the README for full details', () => {
      expect(XENOPIXEL_DESIGN_REFERENCE_NOTE).toContain('KYBERSTATION_README.txt');
    });

    it('preserves the existing `profiles[]` shape so cardDetector still works', async () => {
      // cardDetector.ts reads `parsed.profiles` to enumerate Xenopixel
      // presets on a recognized SD card. The disclaimer fields are
      // additive — backward compat must hold.
      const blob = await exportMultiPresetZip({
        presets: [
          makePreset('Obi-Wan', { baseColor: { r: 0, g: 140, b: 255 } }),
          makePreset('Vader', { baseColor: { r: 255, g: 0, b: 0 } }),
        ],
        boardId: 'xenopixel',
      });
      const parsed = JSON.parse((await readZipFile(blob, 'config.json'))!);
      expect(Array.isArray(parsed.profiles)).toBe(true);
      expect(parsed.profiles.length).toBe(2);
      expect(parsed.profiles[0].name).toBe('Obi-Wan');
      expect(parsed.profiles[0].color.base).toEqual([0, 140, 255]);
      expect(parsed.profiles[1].name).toBe('Vader');
      expect(parsed.profiles[1].color.base).toEqual([255, 0, 0]);
    });

    it('preserves `generator: "KyberStation"` field so cardDetector\'s Xenopixel-marker check keeps matching', async () => {
      // cardDetector.ts:167 checks for any of `profiles` / `generator` /
      // `version` to flag a config.json as Xenopixel-style. We keep
      // `generator` in the schema so the detection path is unchanged.
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'xenopixel',
      });
      const parsed = JSON.parse((await readZipFile(blob, 'config.json'))!);
      expect(parsed.generator).toBe('KyberStation');
    });
  });

  describe('KYBERSTATION_README.txt at ZIP root', () => {
    it('is included in every Xenopixel ZIP export', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Obi-Wan'),
        boardId: 'xenopixel',
      });
      const readme = await readZipFile(blob, 'KYBERSTATION_README.txt');
      expect(readme).not.toBeNull();
      expect(readme!.length).toBeGreaterThan(100);
    });

    it('content matches the exported XENOPIXEL_README_TEXT constant', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'xenopixel',
      });
      const readme = await readZipFile(blob, 'KYBERSTATION_README.txt');
      expect(readme).toBe(XENOPIXEL_README_TEXT);
    });

    it('explains what\'s in the ZIP (config.json + font folders)', () => {
      expect(XENOPIXEL_README_TEXT).toContain('config.json');
      expect(XENOPIXEL_README_TEXT.toLowerCase()).toContain('font1');
    });

    it('explains why Xenopixel can\'t be flashed directly', () => {
      // The "why" section is the most likely place for community
      // misunderstanding — pin its presence so a future copy edit
      // can't accidentally remove the explanation.
      expect(XENOPIXEL_README_TEXT.toLowerCase()).toContain(
        'why kyberstation can\'t flash xenopixel directly',
      );
    });

    it('points users at Proffieboard V3 as the path for full programmatic control', () => {
      expect(XENOPIXEL_README_TEXT).toContain('Proffieboard V3');
    });

    it('includes a GitHub issues URL for feedback', () => {
      expect(XENOPIXEL_README_TEXT).toContain('github.com/kenkoller/KyberStation');
    });

    it('is plain text — no markdown headers, no emoji, no rich formatting', () => {
      // Notepad-friendly. Markdown `#` headers would render literally on
      // Windows + render incorrectly on macOS Quick Look text preview.
      expect(XENOPIXEL_README_TEXT).not.toMatch(/^#\s/m);
      expect(XENOPIXEL_README_TEXT).not.toMatch(/[🚨⚠️🔥✅❌]/u);
    });
  });

  describe('Multi-preset Xenopixel export', () => {
    it('still includes the README + JSON disclaimer on multi-preset exports', async () => {
      const blob = await exportMultiPresetZip({
        presets: [makePreset('A'), makePreset('B'), makePreset('C')],
        boardId: 'xenopixel',
      });
      const paths = await listZipPaths(blob);
      expect(paths).toContain('KYBERSTATION_README.txt');
      expect(paths).toContain('config.json');
    });

    it('lists profiles in submission order', async () => {
      const blob = await exportMultiPresetZip({
        presets: [
          makePreset('First'),
          makePreset('Second'),
          makePreset('Third'),
        ],
        boardId: 'xenopixel',
      });
      const parsed = JSON.parse((await readZipFile(blob, 'config.json'))!);
      expect(parsed.profiles.map((p: { name: string }) => p.name)).toEqual([
        'First',
        'Second',
        'Third',
      ]);
    });
  });

  describe('Other boards are unaffected', () => {
    it('Proffie ZIP does NOT include the Xenopixel README', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'proffie',
      });
      const paths = await listZipPaths(blob);
      expect(paths).not.toContain('KYBERSTATION_README.txt');
      expect(paths).toContain('config.h');
    });

    it('CFX ZIP does NOT include the Xenopixel README', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'cfx',
      });
      const paths = await listZipPaths(blob);
      expect(paths).not.toContain('KYBERSTATION_README.txt');
      expect(paths).toContain('config.txt');
    });

    it('Golden Harvest ZIP does NOT include the Xenopixel README', async () => {
      const blob = await exportPresetZip({
        preset: makePreset('Test'),
        boardId: 'golden_harvest',
      });
      const paths = await listZipPaths(blob);
      expect(paths).not.toContain('KYBERSTATION_README.txt');
      expect(paths).toContain('config.ini');
    });
  });
});
