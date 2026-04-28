// ─── Contract test: SaberWizard hardware-step options ───
//
// The wizard's hardware step (added 2026-04-22) writes two persisted
// values: BladeConfig.ledCount and SaberProfile.boardType. This test
// guards the constants that drive those writes so a future LED-count
// edit doesn't quietly desync from inferBladeInches, and a future
// board-list edit doesn't smuggle in a storeValue that fails
// SaberProfile import validation or breaks CodeOutput's mapping.

import { describe, it, expect } from 'vitest';
import { BLADE_LENGTH_PRESETS } from '@kyberstation/engine';
import {
  BLADE_LENGTHS,
  BOARDS,
  type BoardOption,
} from '@/components/onboarding/SaberWizard';
import { inferBladeInches } from '@/lib/bladeRenderMetrics';

describe('SaberWizard BLADE_LENGTHS', () => {
  it('has 6 entries covering 20"–40"', () => {
    expect(BLADE_LENGTHS.map((b) => b.inches)).toEqual([20, 24, 28, 32, 36, 40]);
  });

  it('every entry has a positive ledCount and matching label', () => {
    for (const b of BLADE_LENGTHS) {
      expect(b.ledCount).toBeGreaterThan(0);
      expect(b.label).toBe(`${b.inches}"`);
    }
  });

  it('every ledCount reverse-maps to its inches via inferBladeInches', () => {
    // Mirrors the piecewise ladder in lib/bladeRenderMetrics.ts. If the
    // ladder shifts, the wizard would silently mis-render the chosen
    // length on the canvas.
    for (const b of BLADE_LENGTHS) {
      expect(inferBladeInches(b.ledCount)).toBe(b.inches);
    }
  });

  it('agrees with the canonical BLADE_LENGTH_PRESETS in the engine package', () => {
    // Post-lift drift sentinel: the wizard derives BLADE_LENGTHS from
    // `lib/bladeLengths.ts`, which in turn derives from the engine's
    // BLADE_LENGTH_PRESETS. If a future edit ever reintroduces an
    // inline drift here (e.g. flipping 36" back to strict-math 132),
    // this test fails immediately.
    for (const b of BLADE_LENGTHS) {
      const canonical = Object.values(BLADE_LENGTH_PRESETS).find(
        (p) => p.inches === b.inches,
      );
      expect(canonical).toBeDefined();
      expect(canonical?.ledCount).toBe(b.ledCount);
    }
  });
});

describe('SaberWizard BOARDS', () => {
  it('lists Proffie V3 first as the only verified board', () => {
    expect(BOARDS[0]?.id).toBe('proffie-v3');
    expect(BOARDS[0]?.compatibility).toBe('verified');
    // Per CLAUDE.md, V3 is the only board with end-to-end hardware
    // validation as of 2026-04-22. If a second board gets validated,
    // bump it to 'verified' and update this assertion.
    const verified = BOARDS.filter((b) => b.compatibility === 'verified');
    expect(verified.map((b) => b.id)).toEqual(['proffie-v3']);
  });

  it('Proffie V2 is flagged untested, not verified', () => {
    // V2 is code-supported but hardware-validation is pending per
    // CLAUDE.md "cross-board (V2, V3-OLED) sweeps still pending".
    const v2 = BOARDS.find((b) => b.id === 'proffie-v2');
    expect(v2?.compatibility).toBe('untested');
  });

  it('non-Proffie boards are reference-only', () => {
    // CFX / GH live in different firmware ecosystems entirely; the
    // generated ProffieOS config.h won't run on them.
    for (const id of ['cfx', 'gh-v4', 'gh-v3'] as const) {
      const b = BOARDS.find((board) => board.id === id);
      expect(b?.compatibility).toBe('reference');
    }
  });

  it('storeValue for Proffie V3 / V2 matches CodeOutput board-name keys', () => {
    // CodeOutput.tsx:67-68 maps these exact strings back to
    // proffieboard_v3 / proffieboard_v2 for config.h emission. If the
    // strings drift, generated code targets the wrong board.
    const v3 = BOARDS.find((b) => b.id === 'proffie-v3');
    const v2 = BOARDS.find((b) => b.id === 'proffie-v2');
    expect(v3?.storeValue).toBe('Proffie V3');
    expect(v2?.storeValue).toBe('Proffie V2');
  });

  it('every storeValue stays within saberProfileStore import limit (50 chars)', () => {
    // saberProfileStore.importProfile slices boardType to 50 chars; a
    // longer value here would silently truncate after a profile export
    // round-trip.
    for (const b of BOARDS) {
      expect(b.storeValue.length).toBeLessThanOrEqual(50);
    }
  });

  it('reference boards mention Proffie in their tagline', () => {
    const refOnly = BOARDS.filter((b) => b.compatibility === 'reference');
    expect(refOnly.length).toBeGreaterThan(0);
    for (const b of refOnly) {
      expect(b.tagline.toLowerCase()).toContain('proffie');
    }
  });

  it('every board id is unique', () => {
    const ids = BOARDS.map((b: BoardOption) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
