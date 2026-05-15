import { describe, it, expect } from 'vitest';
import {
  ALL_PROFILES,
  SABERS89_V3_9,
  STOCK_PROFFIEBOARD_V3,
  validateProfile,
} from '../src/index.js';

describe('every shipped profile passes validateProfile', () => {
  for (const profile of ALL_PROFILES) {
    it(`${profile.id}`, () => {
      expect(validateProfile(profile)).toEqual([]);
    });
  }
});

describe('STOCK_PROFFIEBOARD_V3', () => {
  it('targets the proffieboard-v3 BoardId', () => {
    expect(STOCK_PROFFIEBOARD_V3.boardId).toBe('proffieboard-v3');
  });

  it('is a single-blade configuration', () => {
    expect(STOCK_PROFFIEBOARD_V3.numBlades).toBe(1);
    expect(STOCK_PROFFIEBOARD_V3.blades).toHaveLength(1);
  });

  it('has a 144-LED main blade on bladePin with stock power pins', () => {
    const blade = STOCK_PROFFIEBOARD_V3.blades[0]!;
    expect(blade.role).toBe('main');
    expect(blade.ledCount).toBe(144);
    expect(blade.dataPin).toBe('bladePin');
    expect(blade.powerPins).toEqual(['bladePowerPin2', 'bladePowerPin3']);
  });

  it("matches KyberStation's current ConfigBuilder defaults", () => {
    // These values are the contract with apps/web/lib/zipExporter.ts line 72+.
    // If the stock profile drifts from those defaults, the Phase 2 wiring
    // will produce different output than today's hardcoded path.
    expect(STOCK_PROFFIEBOARD_V3.defaultVolume).toBe(2000);
    expect(STOCK_PROFFIEBOARD_V3.clashThresholdG).toBe(3.0);
    expect(STOCK_PROFFIEBOARD_V3.numButtons).toBe(2);
    expect(STOCK_PROFFIEBOARD_V3.propFile).toBe('saber_fett263_buttons.h');
    expect(STOCK_PROFFIEBOARD_V3.propDefines).toEqual([
      'FETT263_EDIT_MODE_MENU',
      'FETT263_MULTI_PHASE',
    ]);
  });

  it('is vendor-confirmed (Hubbe reference design)', () => {
    expect(STOCK_PROFFIEBOARD_V3.source).toBe('vendor-confirmed');
    expect(STOCK_PROFFIEBOARD_V3.vendor).toBe('hubbe');
  });
});

describe('SABERS89_V3_9', () => {
  it('targets the proffieboard-v3 BoardId', () => {
    expect(SABERS89_V3_9.boardId).toBe('proffieboard-v3');
  });

  it('is a dual-blade configuration (main + crystal)', () => {
    expect(SABERS89_V3_9.numBlades).toBe(2);
    expect(SABERS89_V3_9.blades).toHaveLength(2);
    expect(SABERS89_V3_9.blades[0]!.role).toBe('main');
    expect(SABERS89_V3_9.blades[1]!.role).toBe('crystal');
  });

  it('has a 128-LED main blade on bladePin with pins 2+3', () => {
    const main = SABERS89_V3_9.blades[0]!;
    expect(main.ledCount).toBe(128);
    expect(main.dataPin).toBe('bladePin');
    expect(main.powerPins).toEqual(['bladePowerPin2', 'bladePowerPin3']);
  });

  it('has a 30-LED crystal on blade2Pin with pins 4+5', () => {
    const crystal = SABERS89_V3_9.blades[1]!;
    expect(crystal.ledCount).toBe(30);
    expect(crystal.dataPin).toBe('blade2Pin');
    expect(crystal.powerPins).toEqual(['bladePowerPin4', 'bladePowerPin5']);
  });

  it('captures 89V3_allfont.h CONFIG_TOP values verbatim', () => {
    expect(SABERS89_V3_9.defaultVolume).toBe(1800);
    expect(SABERS89_V3_9.clashThresholdG).toBe(4.5);
    expect(SABERS89_V3_9.orientation).toBe('USB_TOWARDS_BLADE');
    expect(SABERS89_V3_9.enableSerial).toBe(true);
    expect(SABERS89_V3_9.propFile).toBe('saber_fett263_buttons.h');
  });

  it('captures the 14 Fett263 + diagnostic defines from 89V3_allfont.h', () => {
    expect(SABERS89_V3_9.propDefines).toEqual([
      'DISABLE_DIAGNOSTIC_COMMANDS',
      'FETT263_MULTI_PHASE',
      'FETT263_TWIST_ON_NO_BM',
      'FETT263_TWIST_ON',
      'FETT263_TWIST_OFF',
      'FETT263_STAB_ON_NO_BM',
      'FETT263_STAB_ON',
      'FETT263_SWING_ON_SPEED 500',
      'FETT263_SWING_ON_NO_BM',
      'FETT263_SWING_ON',
      'FETT263_SWING_OFF',
      'FETT263_THRUST_ON',
      'FETT263_THRUST_OFF',
      'FETT263_DISABLE_COPY_PRESET',
    ]);
  });

  it('uses MOTION_TIMEOUT=144000 (line 44 redefinition of 89V3_allfont.h)', () => {
    // 89V3_allfont.h defines MOTION_TIMEOUT twice in the same CONFIG_TOP
    // block: line 30 sets it to 60 * 3 * 1000 = 180000 ms, line 44
    // redefines it to 60 * 3 * 800 = 144000 ms. The C preprocessor
    // takes the latter. Pinning here so future contributors don't
    // "correct" the value back to 180000.
    expect(SABERS89_V3_9.motionTimeoutMs).toBe(144000);
  });

  it('is community-validated, not boot-confirmed by KyberStation', () => {
    expect(SABERS89_V3_9.source).toBe('community-validated');
    expect(SABERS89_V3_9.validatedBy).toEqual([]);
  });
});
