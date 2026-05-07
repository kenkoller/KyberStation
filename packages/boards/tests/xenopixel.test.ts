import { describe, it, expect } from 'vitest';
import {
  XENO_FIRMWARE_FEATURES,
  getXenoFirmwareFeatures,
} from '../src/profiles/xenopixel.js';
import type { XenoFirmwareVersion, XenoFirmwareFeatures } from '../src/types.js';

// ─── Boolean flag keys on XenoFirmwareFeatures (excluding version + label) ───

const BOOLEAN_FLAG_KEYS: (keyof XenoFirmwareFeatures)[] = [
  'perFolderFontConfig',
  'motorCrystalChamber',
  'btMode',
  'meltEffect',
  'lightningBlock',
  'knockPoke',
  'configurableInOutTime',
  'customFunction',
];

// ─── XENO_FIRMWARE_FEATURES constant ───

describe('XENO_FIRMWARE_FEATURES', () => {
  it('has exactly 5 entries', () => {
    expect(XENO_FIRMWARE_FEATURES).toHaveLength(5);
  });

  it('contains versions V1.0, V1.2, V1.2.5, V1.3.1, V1.4.0 in order', () => {
    const versions = XENO_FIRMWARE_FEATURES.map(f => f.version);
    expect(versions).toEqual(['1.0', '1.2', '1.2.5', '1.3.1', '1.4.0']);
  });

  it('each entry has a unique version string', () => {
    const versions = XENO_FIRMWARE_FEATURES.map(f => f.version);
    const unique = new Set(versions);
    expect(unique.size).toBe(versions.length);
  });

  it('V1.0 has all boolean flags false', () => {
    const v1 = XENO_FIRMWARE_FEATURES.find(f => f.version === '1.0')!;
    for (const key of BOOLEAN_FLAG_KEYS) {
      expect(v1[key], `V1.0.${key}`).toBe(false);
    }
  });

  it('V1.4.0 has all boolean flags true', () => {
    const v14 = XENO_FIRMWARE_FEATURES.find(f => f.version === '1.4.0')!;
    for (const key of BOOLEAN_FLAG_KEYS) {
      expect(v14[key], `V1.4.0.${key}`).toBe(true);
    }
  });

  it('features are cumulative: once a flag becomes true it stays true', () => {
    for (let i = 1; i < XENO_FIRMWARE_FEATURES.length; i++) {
      const prev = XENO_FIRMWARE_FEATURES[i - 1];
      const curr = XENO_FIRMWARE_FEATURES[i];
      for (const key of BOOLEAN_FLAG_KEYS) {
        if (prev[key] === true) {
          expect(curr[key], `${curr.version}.${key} should stay true (was true in ${prev.version})`).toBe(true);
        }
      }
    }
  });
});

// ─── getXenoFirmwareFeatures() ───

describe('getXenoFirmwareFeatures', () => {
  const KNOWN_VERSIONS: XenoFirmwareVersion[] = ['1.0', '1.2', '1.2.5', '1.3.1', '1.4.0'];

  it.each(KNOWN_VERSIONS)('returns correct entry for version %s', (version) => {
    const result = getXenoFirmwareFeatures(version);
    expect(result.version).toBe(version);
  });

  it('falls back to V1.0 for unknown version string', () => {
    const result = getXenoFirmwareFeatures('99.99' as XenoFirmwareVersion);
    expect(result.version).toBe('1.0');
    // V1.0 base has all flags false
    for (const key of BOOLEAN_FLAG_KEYS) {
      expect(result[key]).toBe(false);
    }
  });

  it('V1.2 has motorCrystalChamber and btMode true', () => {
    const v12 = getXenoFirmwareFeatures('1.2');
    expect(v12.motorCrystalChamber).toBe(true);
    expect(v12.btMode).toBe(true);
  });

  it('V1.2.5 has perFolderFontConfig true', () => {
    const v125 = getXenoFirmwareFeatures('1.2.5');
    expect(v125.perFolderFontConfig).toBe(true);
  });

  it('V1.3.1 has meltEffect, lightningBlock, and knockPoke true', () => {
    const v131 = getXenoFirmwareFeatures('1.3.1');
    expect(v131.meltEffect).toBe(true);
    expect(v131.lightningBlock).toBe(true);
    expect(v131.knockPoke).toBe(true);
  });

  it('V1.4.0 has configurableInOutTime and customFunction true', () => {
    const v14 = getXenoFirmwareFeatures('1.4.0');
    expect(v14.configurableInOutTime).toBe(true);
    expect(v14.customFunction).toBe(true);
  });
});

// ─── Cumulative flag verification (walk-order) ───

describe('cumulative flag verification', () => {
  it('once a flag becomes true it remains true in all subsequent versions', () => {
    for (const key of BOOLEAN_FLAG_KEYS) {
      let seenTrue = false;
      for (const entry of XENO_FIRMWARE_FEATURES) {
        if (entry[key] === true) {
          seenTrue = true;
        }
        if (seenTrue) {
          expect(
            entry[key],
            `${key} flipped back to false at version ${entry.version}`
          ).toBe(true);
        }
      }
    }
  });
});
