// ─── boardProfiles.ts — regression tests ──────────────────────────
//
// Pins the Board Capability System invariants: all 6 boards present,
// helper functions behave correctly, CFX / Xenopixel / Verso are
// unambiguously preview-only, and the engine's built-in modulator /
// function ID lists stay in sync with the mirror in `boardProfiles.ts`.

import { describe, it, expect } from 'vitest';
import type { BuiltInModulatorId, BuiltInFnId } from '@kyberstation/engine';

import {
  BOARD_PROFILES,
  DEFAULT_BOARD_ID,
  getBoardProfile,
  canBoardModulate,
  isParameterModulatableOnBoard,
} from '../../lib/boardProfiles';

describe('BOARD_PROFILES registry', () => {
  it('has exactly 6 profiles', () => {
    expect(BOARD_PROFILES.length).toBe(6);
  });

  it('includes all expected board IDs', () => {
    const ids = BOARD_PROFILES.map((b) => b.id);
    expect(ids).toContain('proffie-v3.9');
    expect(ids).toContain('proffie-v2.2');
    expect(ids).toContain('golden-harvest-v3');
    expect(ids).toContain('cfx');
    expect(ids).toContain('xenopixel');
    expect(ids).toContain('verso');
  });

  it('has unique IDs', () => {
    const ids = BOARD_PROFILES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('default board is Proffieboard V3.9', () => {
    expect(DEFAULT_BOARD_ID).toBe('proffie-v3.9');
    expect(getBoardProfile(DEFAULT_BOARD_ID)).toBeDefined();
  });
});

describe('Proffieboard V3.9 — full-support baseline', () => {
  const profile = getBoardProfile('proffie-v3.9')!;

  it('is full-support status', () => {
    expect(profile.status).toBe('full-support');
  });

  it('supports modulation', () => {
    expect(profile.supportsModulation).toBe(true);
  });

  it('exposes all 11 built-in modulators', () => {
    expect(profile.supportedModulators.length).toBe(11);
    // Drift-sentinel: compile-time assignment enforces that every value in
    // `supportedModulators` satisfies the engine's `BuiltInModulatorId`
    // union. If the engine adds or renames a modulator ID, this line
    // fails typecheck (per CLAUDE.md decision #1).
    const _modulatorIdentityCheck: BuiltInModulatorId[] = [...profile.supportedModulators];
    expect(_modulatorIdentityCheck.length).toBe(profile.supportedModulators.length);
  });

  it('exposes all 10 built-in functions', () => {
    expect(profile.supportedFunctions.length).toBe(10);
    // Drift-sentinel: same pattern as above for `BuiltInFnId`.
    const _fnIdentityCheck: BuiltInFnId[] = [...profile.supportedFunctions];
    expect(_fnIdentityCheck.length).toBe(profile.supportedFunctions.length);
  });

  it('excludes chains / step-seq / envelope (v1.1+ features)', () => {
    expect(profile.supportsModulatorChains).toBe(false);
    expect(profile.supportsStepSequencer).toBe(false);
    expect(profile.supportsEnvelopeFollower).toBe(false);
  });

  it('has 512 KiB flash', () => {
    expect(profile.flashSize).toBe(512 * 1024);
  });

  it('declares hardware features (OLED 128x32, accent LEDs, 3 buttons, kill switch)', () => {
    expect(profile.hasOledDisplay).toBe(true);
    expect(profile.oledResolution).toEqual([128, 32]);
    expect(profile.hasAccentLed).toBe(true);
    expect(profile.hasCrystalChamberLed).toBe(true);
    expect(profile.buttonCount).toBe(3);
    expect(profile.hasKillSwitch).toBe(true);
  });

  it('supports the expected style IDs', () => {
    expect(profile.supportedStyles).toContain('stable');
    expect(profile.supportedStyles).toContain('unstable');
    expect(profile.supportedStyles).toContain('fire');
    expect(profile.supportedStyles).toContain('pulse');
  });

  it('supports standard effects (clash/lockup/blast/stab)', () => {
    expect(profile.supportedEffects).toContain('clash');
    expect(profile.supportedEffects).toContain('lockup');
    expect(profile.supportedEffects).toContain('blast');
    expect(profile.supportedEffects).toContain('stab');
  });

  it('supports V1 and V2 SmoothSwing', () => {
    expect(profile.supportedSmoothSwing).toContain('V1');
    expect(profile.supportedSmoothSwing).toContain('V2');
  });
});

describe('Proffieboard V2.2 — conservative profile', () => {
  const profile = getBoardProfile('proffie-v2.2')!;

  it('is partial-support status', () => {
    expect(profile.status).toBe('partial-support');
  });

  it('has modulation DISABLED for v1.0', () => {
    expect(profile.supportsModulation).toBe(false);
    expect(profile.supportedModulators).toEqual([]);
    expect(profile.supportedFunctions).toEqual([]);
  });

  it('still lists style + effect support (mirrors V3 ProffieOS)', () => {
    expect(profile.supportedStyles.length).toBeGreaterThan(0);
    expect(profile.supportedEffects.length).toBeGreaterThan(0);
  });

  it('has a conservative maxLedCount lower than V3.9', () => {
    const v39 = getBoardProfile('proffie-v3.9')!;
    expect(profile.maxLedCount).toBeLessThan(v39.maxLedCount);
  });
});

describe('Golden Harvest V3 — mirrors V3.9', () => {
  const ghv3 = getBoardProfile('golden-harvest-v3')!;
  const v39 = getBoardProfile('proffie-v3.9')!;

  it('is full-support like V3.9', () => {
    expect(ghv3.status).toBe('full-support');
  });

  it('supports modulation like V3.9', () => {
    expect(ghv3.supportsModulation).toBe(true);
    expect(ghv3.supportedModulators.length).toBe(v39.supportedModulators.length);
    expect(ghv3.supportedFunctions.length).toBe(v39.supportedFunctions.length);
  });

  it('shares style / effect / ignition feature coverage with V3.9', () => {
    expect([...ghv3.supportedStyles].sort()).toEqual([...v39.supportedStyles].sort());
    expect([...ghv3.supportedEffects].sort()).toEqual([...v39.supportedEffects].sort());
  });
});

describe('CFX / Xenopixel / Verso — preview-only', () => {
  const previewIds = ['cfx', 'xenopixel', 'verso'];

  it.each(previewIds)('%s is preview-only status', (id) => {
    const profile = getBoardProfile(id);
    expect(profile).toBeDefined();
    expect(profile!.status).toBe('preview-only');
  });

  it.each(previewIds)('%s has modulation disabled', (id) => {
    const profile = getBoardProfile(id)!;
    expect(profile.supportsModulation).toBe(false);
    expect(profile.supportedModulators).toEqual([]);
    expect(profile.supportedFunctions).toEqual([]);
  });

  it.each(previewIds)('%s exposes no flash-path features (empty style/effect arrays)', (id) => {
    const profile = getBoardProfile(id)!;
    expect(profile.supportedStyles).toEqual([]);
    expect(profile.supportedEffects).toEqual([]);
    expect(profile.supportedIgnitions).toEqual([]);
    expect(profile.supportedRetractions).toEqual([]);
    expect(profile.supportedSmoothSwing).toEqual([]);
    expect(profile.supportedPropFiles).toEqual([]);
  });

  it.each(previewIds)('%s has zero template emission budget', (id) => {
    const profile = getBoardProfile(id)!;
    expect(profile.maxLayerStackDepth).toBe(0);
    expect(profile.maxGradientStops).toBe(0);
    expect(profile.maxTemplateNesting).toBe(0);
  });
});

describe('getBoardProfile', () => {
  it('returns the profile for a known ID', () => {
    expect(getBoardProfile('proffie-v3.9')?.id).toBe('proffie-v3.9');
  });

  it('returns undefined for an unknown ID', () => {
    expect(getBoardProfile('not-a-board')).toBeUndefined();
    expect(getBoardProfile('')).toBeUndefined();
  });
});

describe('canBoardModulate', () => {
  it('returns true for Proffie V3.9 + Golden Harvest V3', () => {
    expect(canBoardModulate('proffie-v3.9')).toBe(true);
    expect(canBoardModulate('golden-harvest-v3')).toBe(true);
  });

  it('returns false for V2.2 + all preview-only boards', () => {
    expect(canBoardModulate('proffie-v2.2')).toBe(false);
    expect(canBoardModulate('cfx')).toBe(false);
    expect(canBoardModulate('xenopixel')).toBe(false);
    expect(canBoardModulate('verso')).toBe(false);
  });

  it('returns false for an unknown board', () => {
    expect(canBoardModulate('not-a-board')).toBe(false);
  });
});

describe('isParameterModulatableOnBoard', () => {
  it('returns true for a modulatable parameter on a modulation-capable board', () => {
    expect(isParameterModulatableOnBoard('proffie-v3.9', 'shimmer')).toBe(true);
    expect(isParameterModulatableOnBoard('proffie-v3.9', 'ignitionMs')).toBe(true);
    expect(isParameterModulatableOnBoard('golden-harvest-v3', 'baseColor.r')).toBe(true);
  });

  it('returns false on V2.2 even for a modulatable param (modulation disabled)', () => {
    expect(isParameterModulatableOnBoard('proffie-v2.2', 'shimmer')).toBe(false);
  });

  it('returns false on every preview-only board', () => {
    expect(isParameterModulatableOnBoard('cfx', 'shimmer')).toBe(false);
    expect(isParameterModulatableOnBoard('xenopixel', 'shimmer')).toBe(false);
    expect(isParameterModulatableOnBoard('verso', 'shimmer')).toBe(false);
  });

  it('returns false for an unknown parameter path on a modulation-capable board', () => {
    expect(isParameterModulatableOnBoard('proffie-v3.9', 'not.a.param')).toBe(false);
  });

  it('returns false for a known non-modulatable parameter (ledCount)', () => {
    expect(isParameterModulatableOnBoard('proffie-v3.9', 'ledCount')).toBe(false);
  });
});

describe('binding-cap warnings (V3.9 + GHv3 only)', () => {
  it('V3.9 declares soft / hard warning thresholds', () => {
    const profile = getBoardProfile('proffie-v3.9')!;
    expect(profile.softBindingWarningAt).toBeGreaterThan(0);
    expect(profile.hardBindingWarningAt).toBeGreaterThan(profile.softBindingWarningAt!);
  });

  it('soft < hard < maxBindings for modulation-capable boards', () => {
    for (const id of ['proffie-v3.9', 'golden-harvest-v3']) {
      const profile = getBoardProfile(id)!;
      expect(profile.softBindingWarningAt!).toBeLessThan(profile.hardBindingWarningAt!);
      expect(profile.hardBindingWarningAt!).toBeLessThanOrEqual(profile.maxBindings!);
    }
  });
});

// Engine mirror drift-sentinel lives inline above: the `exposes all 11
// built-in modulators` / `exposes all 10 built-in functions` blocks
// import `BuiltInModulatorId` + `BuiltInFnId` directly from
// `@kyberstation/engine` (top-level barrel exports them as of the
// modulation re-exports block in `packages/engine/src/index.ts`) and
// spread the profile's arrays into typed-union arrays. If the engine
// adds / renames an ID, those lines fail typecheck.
