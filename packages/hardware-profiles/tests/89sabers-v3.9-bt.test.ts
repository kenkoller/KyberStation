import { describe, it, expect } from 'vitest';
import type { CodegenPresetEntryLike } from '../src/index.js';
import {
  ALL_PROFILES,
  byId,
  byVendor,
  profileToConfigOptions,
  SABERS89_V3_9,
  SABERS89_V3_9_BT,
  validateProfile,
} from '../src/index.js';

const SAMPLE_PRESETS: CodegenPresetEntryLike[] = [
  {
    fontName: 'SmthJedi',
    styleCodes: ['StylePtr<Black>()'],
    presetName: 'Test',
  },
];

describe('SABERS89_V3_9_BT profile resolution', () => {
  it('resolves via byId("89sabers-v3.9-bt")', () => {
    expect(byId('89sabers-v3.9-bt')).toBe(SABERS89_V3_9_BT);
  });

  it('appears in ALL_PROFILES exactly once', () => {
    const matches = ALL_PROFILES.filter((p) => p.id === '89sabers-v3.9-bt');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toBe(SABERS89_V3_9_BT);
  });

  it('appears in byVendor("89sabers") alongside the non-BT V3.9 profile', () => {
    const sabers89 = byVendor('89sabers');
    expect(sabers89).toContain(SABERS89_V3_9);
    expect(sabers89).toContain(SABERS89_V3_9_BT);
    expect(sabers89).toHaveLength(2);
  });

  it('has a distinct id from the non-BT V3.9 profile', () => {
    expect(SABERS89_V3_9_BT.id).not.toBe(SABERS89_V3_9.id);
  });
});

describe('SABERS89_V3_9_BT profile shape', () => {
  it('passes validateProfile with zero errors', () => {
    expect(validateProfile(SABERS89_V3_9_BT)).toEqual([]);
  });

  it('targets the proffieboard-v3 BoardId', () => {
    expect(SABERS89_V3_9_BT.boardId).toBe('proffieboard-v3');
    expect(SABERS89_V3_9_BT.boardChip).toBe('STM32L452RE');
  });

  it('identifies as the BT-equipped V3.9 variant', () => {
    expect(SABERS89_V3_9_BT.vendor).toBe('89sabers');
    expect(SABERS89_V3_9_BT.model).toBe('V3.9-BT');
  });

  it('is a dual-blade configuration (main + crystal)', () => {
    expect(SABERS89_V3_9_BT.numBlades).toBe(2);
    expect(SABERS89_V3_9_BT.blades).toHaveLength(2);
    expect(SABERS89_V3_9_BT.blades[0]!.role).toBe('main');
    expect(SABERS89_V3_9_BT.blades[1]!.role).toBe('crystal');
  });

  it('has a 128-LED main blade on bladePin with pins 2+3', () => {
    const main = SABERS89_V3_9_BT.blades[0]!;
    expect(main.type).toBe('ws281x');
    expect(main.ledCount).toBe(128);
    expect(main.dataPin).toBe('bladePin');
    expect(main.colorOrder).toBe('Color8::GRB');
    expect(main.powerPins).toEqual(['bladePowerPin2', 'bladePowerPin3']);
  });

  it('has a 30-LED crystal on blade2Pin with pins 4+5', () => {
    const crystal = SABERS89_V3_9_BT.blades[1]!;
    expect(crystal.type).toBe('ws281x');
    expect(crystal.ledCount).toBe(30);
    expect(crystal.dataPin).toBe('blade2Pin');
    expect(crystal.colorOrder).toBe('Color8::GRB');
    expect(crystal.powerPins).toEqual(['bladePowerPin4', 'bladePowerPin5']);
  });

  it('shares physical chassis topology with the non-BT V3.9 profile', () => {
    // The BT variant has the same physical chassis as the non-BT V3.9 —
    // confirmed via 2026-05-14/15 bench sessions. The only differences are
    // the BT-related defines (enableSerial=true for the Feasycom module).
    expect(SABERS89_V3_9_BT.numBlades).toBe(SABERS89_V3_9.numBlades);
    expect(SABERS89_V3_9_BT.blades[0]!.ledCount).toBe(SABERS89_V3_9.blades[0]!.ledCount);
    expect(SABERS89_V3_9_BT.blades[1]!.ledCount).toBe(SABERS89_V3_9.blades[1]!.ledCount);
    expect(SABERS89_V3_9_BT.blades[0]!.dataPin).toBe(SABERS89_V3_9.blades[0]!.dataPin);
    expect(SABERS89_V3_9_BT.blades[1]!.dataPin).toBe(SABERS89_V3_9.blades[1]!.dataPin);
    expect(SABERS89_V3_9_BT.blades[0]!.powerPins).toEqual(SABERS89_V3_9.blades[0]!.powerPins);
    expect(SABERS89_V3_9_BT.blades[1]!.powerPins).toEqual(SABERS89_V3_9.blades[1]!.powerPins);
  });

  it('captures CONFIG_TOP values matching the non-BT V3.9 chassis baseline', () => {
    expect(SABERS89_V3_9_BT.defaultVolume).toBe(1800);
    expect(SABERS89_V3_9_BT.clashThresholdG).toBe(4.5);
    expect(SABERS89_V3_9_BT.orientation).toBe('USB_TOWARDS_BLADE');
    expect(SABERS89_V3_9_BT.propFile).toBe('saber_fett263_buttons.h');
    expect(SABERS89_V3_9_BT.numButtons).toBe(2);
  });

  it('enables serial for the on-board Feasycom FSC-BT909 BT module', () => {
    // The BT variant ships an external Feasycom BT module on UART3
    // (Serial3). Without ENABLE_SERIAL the module is inert. This is
    // the load-bearing difference vs the non-BT V3.9 profile, which
    // sets enableSerial=true as well — both 89sabers profiles ship the
    // BT-compatible serial menu out of the box.
    expect(SABERS89_V3_9_BT.enableSerial).toBe(true);
  });

  it('captures the 14 Fett263 + diagnostic defines from the V3.9 chassis baseline', () => {
    // Same gesture suite as the non-BT V3.9 (sourced from 89V3_allfont.h).
    // BT-specific defines (BLE_PASSWORD, BLE_NAME, BLE_SHORTNAME) are
    // explicitly NOT included — those belong at the Bluetooth-feature UI
    // level (post-launch v0.17+) rather than baked into the chassis
    // profile, to avoid PIN/identity collisions across users.
    expect(SABERS89_V3_9_BT.propDefines).toEqual([
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

  it('does NOT include BLE-specific defines in the chassis profile', () => {
    // Defended against accidental BLE inclusion: PIN/identity defines
    // belong at the per-saber Bluetooth-feature layer (post-launch v0.17+),
    // not the chassis profile. See profile docstring "Out of scope" note.
    const propDefinesText = SABERS89_V3_9_BT.propDefines.join('|');
    expect(propDefinesText).not.toMatch(/BLE_PASSWORD/);
    expect(propDefinesText).not.toMatch(/BLE_NAME/);
    expect(propDefinesText).not.toMatch(/BLE_SHORTNAME/);
  });

  it('uses MOTION_TIMEOUT=144000 (line 44 redefinition of 89V3_allfont.h)', () => {
    // Matches the non-BT V3.9 profile. The C preprocessor takes the
    // line-44 redefinition (60 * 3 * 800 = 144000 ms) over the line-30
    // value (180000 ms). Pinning so future contributors don't "correct"
    // it back to 180000.
    expect(SABERS89_V3_9_BT.motionTimeoutMs).toBe(144000);
  });

  it("is community-validated, NOT boot-confirmed by KyberStation", () => {
    // Honest provenance: emitted config.h matches the factory chassis
    // shape per the 2026-05-14 bench recap, but the 2026-05-14/15 V3.9-BT
    // bench attempts boot-looped. Cracking the residual delta requires
    // either ST-Link/SWD boot logs or the source of 89sabers-config.h
    // from 89sabers directly. Until then: provenance stays community-
    // validated and the recommended path for V3.9-BT users is runtime
    // presets (SD card, bench-validated 2026-05-16 — PR #325 + #331).
    expect(SABERS89_V3_9_BT.source).toBe('community-validated');
    expect(SABERS89_V3_9_BT.validatedBy).toEqual([]);
  });

  it('notes call out the runtime-presets path as the recommended workflow', () => {
    expect(SABERS89_V3_9_BT.notes).toMatch(/runtime[- ]presets/i);
    expect(SABERS89_V3_9_BT.notes).toMatch(/PR #325/);
    expect(SABERS89_V3_9_BT.notes).toMatch(/Feasycom/);
  });

  it('notes reference the FLASH_GUIDE recovery procedure', () => {
    expect(SABERS89_V3_9_BT.notes).toMatch(/FLASH_GUIDE\.md/);
  });
});

describe('profileToConfigOptions — 89sabers-v3.9-bt', () => {
  const options = profileToConfigOptions(SABERS89_V3_9_BT, SAMPLE_PRESETS);

  it('maps boardId to proffieboard_v3', () => {
    expect(options.boardType).toBe('proffieboard_v3');
  });

  it('produces a dual-blade bladeConfig with NUM_BLADES=2', () => {
    expect(options.numBlades).toBe(2);
    expect(options.bladeConfig).toHaveLength(2);
  });

  it('maps the 128-LED main blade on bladePin (pins 2+3)', () => {
    expect(options.bladeConfig[0]).toEqual({
      type: 'ws281x',
      ledCount: 128,
      pin: 'bladePin',
      colorOrder: 'Color8::GRB',
      powerPins: ['bladePowerPin2', 'bladePowerPin3'],
    });
  });

  it('maps the 30-LED crystal chamber on blade2Pin (pins 4+5)', () => {
    expect(options.bladeConfig[1]).toEqual({
      type: 'ws281x',
      ledCount: 30,
      pin: 'blade2Pin',
      colorOrder: 'Color8::GRB',
      powerPins: ['bladePowerPin4', 'bladePowerPin5'],
    });
  });

  it('derives maxLedsPerStrip from the largest blade (128 — main blade)', () => {
    expect(options.maxLedsPerStrip).toBe(128);
  });

  it('sets orientation to USB_TOWARDS_BLADE', () => {
    expect(options.orientation).toBe('USB_TOWARDS_BLADE');
  });

  it('enables serial — required for the Feasycom BT module to function', () => {
    expect(options.enableSerial).toBe(true);
  });

  it('captures MOTION_TIMEOUT=144000', () => {
    expect(options.motionTimeoutMs).toBe(144000);
  });

  it('forwards all 14 propDefines as fett263Defines', () => {
    expect(options.fett263Defines).toHaveLength(14);
    expect(options.fett263Defines).toContain('FETT263_MULTI_PHASE');
    expect(options.fett263Defines).toContain('FETT263_SWING_ON_SPEED 500');
    expect(options.fett263Defines).toContain('DISABLE_DIAGNOSTIC_COMMANDS');
  });

  it('does NOT introduce BLE-related defines via the codegen adapter', () => {
    const defines = (options.fett263Defines ?? []).join('|');
    expect(defines).not.toMatch(/BLE_PASSWORD/);
    expect(defines).not.toMatch(/BLE_NAME/);
  });

  it('uses VOLUME 1800 and CLASH_THRESHOLD_G 4.5', () => {
    expect(options.volume).toBe(1800);
    expect(options.clashThresholdG).toBe(4.5);
  });

  it('uses Fett263 prop file (same as non-BT V3.9 — factory firmware confirmed)', () => {
    expect(options.propFile).toBe('saber_fett263_buttons.h');
  });

  it('forwards the preset list unchanged', () => {
    expect(options.presets).toBe(SAMPLE_PRESETS);
  });

  it('uses 2-button config (V3.9-BT chassis is 2-button)', () => {
    expect(options.numButtons).toBe(2);
  });

  it('uses maxClashStrength 16 (stable default)', () => {
    expect(options.maxClashStrength).toBe(16);
  });
});
