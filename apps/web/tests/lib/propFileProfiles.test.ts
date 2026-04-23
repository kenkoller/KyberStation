// ─── propFileProfiles.ts — regression tests ──────────────────────────
//
// Pins the 4 Friday v1.0 prop file profiles and the invariant that
// Fett263 is the most capable — ROUTING tab and Button Routing sub-tab
// (v1.1) both gate on this assumption.

import { describe, it, expect } from 'vitest';

import {
  PROP_FILE_PROFILES,
  DEFAULT_PROP_FILE_ID,
  getPropFileProfile,
  getPropFilesForBoard,
} from '../../lib/propFileProfiles';

describe('PROP_FILE_PROFILES registry', () => {
  it('has exactly 4 profiles', () => {
    expect(PROP_FILE_PROFILES.length).toBe(4);
  });

  it('includes all expected prop file IDs', () => {
    const ids = PROP_FILE_PROFILES.map((p) => p.id);
    expect(ids).toContain('fett263');
    expect(ids).toContain('sa22c');
    expect(ids).toContain('bc-button-controls');
    expect(ids).toContain('default-fett');
  });

  it('has unique IDs', () => {
    const ids = PROP_FILE_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('default prop file is Fett263', () => {
    expect(DEFAULT_PROP_FILE_ID).toBe('fett263');
    expect(getPropFileProfile(DEFAULT_PROP_FILE_ID)).toBeDefined();
  });

  it('every profile has at least one compatible board', () => {
    for (const p of PROP_FILE_PROFILES) {
      expect(
        p.compatibleBoards.length,
        `${p.id} has zero compatible boards`,
      ).toBeGreaterThan(0);
    }
  });

  it('every profile has at least one button event', () => {
    for (const p of PROP_FILE_PROFILES) {
      expect(
        p.buttonEvents.length,
        `${p.id} has zero button events`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('Fett263 is the most capable prop file', () => {
  const fett = getPropFileProfile('fett263')!;

  it('has the broadest button event vocabulary', () => {
    for (const other of PROP_FILE_PROFILES) {
      if (other.id === 'fett263') continue;
      expect(
        fett.buttonEvents.length,
        `Fett263 should have >= buttons than ${other.id}`,
      ).toBeGreaterThanOrEqual(other.buttonEvents.length);
    }
  });

  it('has the broadest gesture event vocabulary', () => {
    for (const other of PROP_FILE_PROFILES) {
      if (other.id === 'fett263') continue;
      expect(
        fett.gestureEvents.length,
        `Fett263 should have >= gestures than ${other.id}`,
      ).toBeGreaterThanOrEqual(other.gestureEvents.length);
    }
  });

  it('supports all orthogonal feature dimensions', () => {
    expect(fett.supportsColorChange).toBe(true);
    expect(fett.supportsMultiBlast).toBe(true);
    expect(fett.supportsForceEffects).toBe(true);
  });

  it('supports the full 7-button event vocabulary', () => {
    expect(fett.buttonEvents).toContain('click');
    expect(fett.buttonEvents).toContain('long-press');
    expect(fett.buttonEvents).toContain('hold');
    expect(fett.buttonEvents).toContain('double-click');
    expect(fett.buttonEvents).toContain('triple-click');
    expect(fett.buttonEvents).toContain('click-and-hold');
    expect(fett.buttonEvents).toContain('held-plus-other-click');
  });

  it('is compatible with the full Proffie board family', () => {
    expect(fett.compatibleBoards).toContain('proffie-v2.2');
    expect(fett.compatibleBoards).toContain('proffie-v3.9');
    expect(fett.compatibleBoards).toContain('golden-harvest-v3');
  });
});

describe('Default (Fett) is the narrowest prop file', () => {
  const dflt = getPropFileProfile('default-fett')!;

  it('has no force effects + no multi-blast + no color change', () => {
    expect(dflt.supportsColorChange).toBe(false);
    expect(dflt.supportsMultiBlast).toBe(false);
    expect(dflt.supportsForceEffects).toBe(false);
  });

  it('has a narrower button vocab than Fett263', () => {
    const fett = getPropFileProfile('fett263')!;
    expect(dflt.buttonEvents.length).toBeLessThan(fett.buttonEvents.length);
  });

  it('has a narrower gesture vocab than Fett263', () => {
    const fett = getPropFileProfile('fett263')!;
    expect(dflt.gestureEvents.length).toBeLessThan(fett.gestureEvents.length);
  });
});

describe('getPropFileProfile', () => {
  it('returns the profile for a known ID', () => {
    expect(getPropFileProfile('fett263')?.id).toBe('fett263');
  });

  it('returns undefined for an unknown ID', () => {
    expect(getPropFileProfile('not-a-prop')).toBeUndefined();
    expect(getPropFileProfile('')).toBeUndefined();
  });
});

describe('getPropFilesForBoard', () => {
  it('returns all 4 props for Proffie V3.9', () => {
    const v39Props = getPropFilesForBoard('proffie-v3.9').map((p) => p.id);
    expect(v39Props).toContain('fett263');
    expect(v39Props).toContain('sa22c');
    expect(v39Props).toContain('bc-button-controls');
    expect(v39Props).toContain('default-fett');
  });

  it('returns no prop files for a preview-only board (CFX / Xenopixel / Verso)', () => {
    expect(getPropFilesForBoard('cfx')).toEqual([]);
    expect(getPropFilesForBoard('xenopixel')).toEqual([]);
    expect(getPropFilesForBoard('verso')).toEqual([]);
  });

  it('V2.2 gets Fett263 + BC + Default but not SA22C (V3-only)', () => {
    const v22Props = getPropFilesForBoard('proffie-v2.2').map((p) => p.id);
    expect(v22Props).toContain('fett263');
    expect(v22Props).toContain('bc-button-controls');
    expect(v22Props).toContain('default-fett');
    expect(v22Props).not.toContain('sa22c');
  });
});

describe('button-event ordering — canonical vocabulary', () => {
  it('uses only the approved ButtonEvent union values', () => {
    const valid = new Set([
      'click',
      'long-press',
      'hold',
      'double-click',
      'triple-click',
      'click-and-hold',
      'held-plus-other-click',
    ]);
    for (const p of PROP_FILE_PROFILES) {
      for (const e of p.buttonEvents) {
        expect(valid.has(e), `${p.id} button event ${e}`).toBe(true);
      }
    }
  });

  it('uses only the approved GestureEvent union values', () => {
    const valid = new Set(['swing', 'stab', 'thrust', 'twist', 'shake']);
    for (const p of PROP_FILE_PROFILES) {
      for (const e of p.gestureEvents) {
        expect(valid.has(e), `${p.id} gesture event ${e}`).toBe(true);
      }
    }
  });
});
