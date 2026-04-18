import { describe, it, expect } from 'vitest';
import type { Preset } from '../src/types.js';
import {
  ALL_PRESETS,
  PREQUEL_ERA_PRESETS,
  ORIGINAL_TRILOGY_PRESETS,
} from '../src/index.js';

/**
 * Tests for the Preset lineage / authorship metadata added in the
 * "VCV-style author & lineage surface" sprint (NEXT_SESSIONS.md §14).
 *
 * Guarantees:
 *   1. The extended `Preset` type accepts the new optional fields.
 *   2. The backfill pass tagged every canonical on-screen preset in
 *      prequel-era.ts + original-trilogy.ts with `author: 'on-screen'`.
 *   3. Preset library loads without error after the type extension
 *      (regression check for the 200+ preset library).
 *   4. `parentId` references, when set, resolve to an existing preset in
 *      `ALL_PRESETS` (lineage graph integrity).
 */

describe('Preset lineage metadata', () => {
  it('accepts the new optional fields on the Preset type', () => {
    const sample: Preset = {
      id: 'test-sample',
      name: 'Test Sample',
      character: 'Test',
      era: 'prequel',
      affiliation: 'jedi',
      tier: 'base',
      // New fields — compile-time validation that the type accepts them
      author: 'test-author',
      version: '1.0',
      parentId: 'prequel-obi-wan-ep3',
      createdAt: 1_700_000_000_000,
      config: {
        name: 'TestSample',
        baseColor: { r: 0, g: 200, b: 50 },
        clashColor: { r: 255, g: 255, b: 255 },
        lockupColor: { r: 255, g: 200, b: 0 },
        blastColor: { r: 255, g: 255, b: 255 },
        style: 'stable',
        ignition: 'standard',
        retraction: 'standard',
        ignitionMs: 300,
        retractionMs: 300,
        shimmer: 0.05,
        ledCount: 144,
      },
    };
    expect(sample.author).toBe('test-author');
    expect(sample.version).toBe('1.0');
    expect(sample.parentId).toBe('prequel-obi-wan-ep3');
    expect(sample.createdAt).toBe(1_700_000_000_000);
  });

  it('tolerates presets without any lineage metadata (backward compatible)', () => {
    const legacyShape: Preset = {
      id: 'legacy',
      name: 'Legacy',
      character: 'Legacy',
      era: 'original-trilogy',
      affiliation: 'neutral',
      tier: 'base',
      config: {
        baseColor: { r: 0, g: 0, b: 0 },
        clashColor: { r: 0, g: 0, b: 0 },
        lockupColor: { r: 0, g: 0, b: 0 },
        blastColor: { r: 0, g: 0, b: 0 },
        style: 'stable',
        ignition: 'standard',
        retraction: 'standard',
        ignitionMs: 0,
        retractionMs: 0,
        shimmer: 0,
        ledCount: 144,
      },
    };
    expect(legacyShape.author).toBeUndefined();
    expect(legacyShape.version).toBeUndefined();
    expect(legacyShape.parentId).toBeUndefined();
    expect(legacyShape.createdAt).toBeUndefined();
  });
});

describe('Author backfill — prequel-era.ts', () => {
  it('tags every screen-accurate preset with author: "on-screen"', () => {
    const screenAccurate = PREQUEL_ERA_PRESETS.filter(
      (p) => p.screenAccurate === true,
    );
    expect(screenAccurate.length).toBeGreaterThan(0);
    for (const preset of screenAccurate) {
      expect(
        preset.author,
        `Expected ${preset.id} to carry author="on-screen"`,
      ).toBe('on-screen');
    }
  });

  it('covers the key prequel characters', () => {
    const ids = new Set(PREQUEL_ERA_PRESETS.map((p) => p.id));
    expect(ids.has('prequel-obi-wan-ep3')).toBe(true);
    expect(ids.has('prequel-anakin')).toBe(true);
    expect(ids.has('prequel-mace-windu')).toBe(true);
    expect(ids.has('prequel-yoda')).toBe(true);
  });
});

describe('Author backfill — original-trilogy.ts', () => {
  it('tags every screen-accurate preset with author: "on-screen"', () => {
    const screenAccurate = ORIGINAL_TRILOGY_PRESETS.filter(
      (p) => p.screenAccurate === true,
    );
    expect(screenAccurate.length).toBeGreaterThan(0);
    for (const preset of screenAccurate) {
      expect(
        preset.author,
        `Expected ${preset.id} to carry author="on-screen"`,
      ).toBe('on-screen');
    }
  });

  it('leaves non-screen-accurate presets without a forced author', () => {
    // 'ot-obiwan-ghost' is a speculative Force Ghost interpretation —
    // intentionally NOT tagged screenAccurate, so it should NOT be
    // force-tagged author="on-screen".
    const ghost = ORIGINAL_TRILOGY_PRESETS.find(
      (p) => p.id === 'ot-obiwan-ghost',
    );
    expect(ghost).toBeDefined();
    expect(ghost?.screenAccurate).not.toBe(true);
    expect(ghost?.author).toBeUndefined();
  });
});

describe('Library integrity after type extension', () => {
  it('loads ALL_PRESETS without error (200+ presets)', () => {
    expect(ALL_PRESETS.length).toBeGreaterThan(0);
    // Every preset carries the minimum required metadata
    for (const preset of ALL_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.character).toBeTruthy();
      expect(preset.era).toBeTruthy();
      expect(preset.affiliation).toBeTruthy();
      expect(preset.tier).toBeTruthy();
      expect(preset.config).toBeTruthy();
    }
  });

  it('keeps preset ids unique across the full library', () => {
    const ids = ALL_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves every parentId to an existing preset (lineage graph integrity)', () => {
    const byId = new Map(ALL_PRESETS.map((p) => [p.id, p]));
    for (const preset of ALL_PRESETS) {
      if (preset.parentId) {
        expect(
          byId.has(preset.parentId),
          `parentId "${preset.parentId}" on ${preset.id} does not resolve to an existing preset`,
        ).toBe(true);
        // Lineage cannot be self-referential
        expect(preset.parentId).not.toBe(preset.id);
      }
    }
  });
});
