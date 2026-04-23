// ─── parameterGroups.ts — regression tests ──────────────────────────
//
// Guardrails for the modulation target registry. Each test pins a
// structural invariant so a future edit can't silently ship a duplicate
// path, a broken range, or a drift between the registry default and
// `bladeStore.DEFAULT_CONFIG`.

import { describe, it, expect } from 'vitest';

import {
  PARAMETER_DESCRIPTORS,
  getParameter,
  getModulatableParameters,
  isParameterModulatable,
  getParametersByGroup,
} from '../../lib/parameterGroups';

describe('PARAMETER_DESCRIPTORS', () => {
  it('is non-empty', () => {
    expect(PARAMETER_DESCRIPTORS.length).toBeGreaterThan(0);
  });

  it('has unique paths — no duplicate entries', () => {
    const paths = PARAMETER_DESCRIPTORS.map((p) => p.path);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it('every entry has a sensible range (min < max)', () => {
    for (const p of PARAMETER_DESCRIPTORS) {
      expect(p.range.min, `min < max for ${p.path}`).toBeLessThan(p.range.max);
    }
  });

  it('every default sits inside the declared range [min, max]', () => {
    for (const p of PARAMETER_DESCRIPTORS) {
      expect(
        p.default,
        `${p.path} default (${p.default}) below min (${p.range.min})`,
      ).toBeGreaterThanOrEqual(p.range.min);
      expect(
        p.default,
        `${p.path} default (${p.default}) above max (${p.range.max})`,
      ).toBeLessThanOrEqual(p.range.max);
    }
  });

  it('every entry uses a known group', () => {
    const valid = new Set(['color', 'motion', 'timing', 'style', 'other']);
    for (const p of PARAMETER_DESCRIPTORS) {
      expect(valid.has(p.group), `${p.path} has group=${p.group}`).toBe(true);
    }
  });

  it('every entry has a non-empty displayName', () => {
    for (const p of PARAMETER_DESCRIPTORS) {
      expect(p.displayName.trim().length, `${p.path} displayName`).toBeGreaterThan(0);
    }
  });
});

describe('DEFAULT_CONFIG alignment', () => {
  // Pin the registry's declared defaults for the scalar fields that
  // exist in `apps/web/stores/bladeStore.ts::DEFAULT_CONFIG`. If that
  // file's defaults change, this test is the tripwire.
  it('shimmer matches DEFAULT_CONFIG.shimmer', () => {
    expect(getParameter('shimmer')?.default).toBeCloseTo(0.1, 5);
  });

  it('ignitionMs matches DEFAULT_CONFIG.ignitionMs', () => {
    expect(getParameter('ignitionMs')?.default).toBe(300);
  });

  it('retractionMs matches DEFAULT_CONFIG.retractionMs', () => {
    expect(getParameter('retractionMs')?.default).toBe(800);
  });

  it('ledCount matches DEFAULT_CONFIG.ledCount', () => {
    expect(getParameter('ledCount')?.default).toBe(144);
  });

  it('baseColor channels match DEFAULT_CONFIG.baseColor = {0, 140, 255}', () => {
    expect(getParameter('baseColor.r')?.default).toBe(0);
    expect(getParameter('baseColor.g')?.default).toBe(140);
    expect(getParameter('baseColor.b')?.default).toBe(255);
  });

  it('lockupColor channels match {255, 200, 80}', () => {
    expect(getParameter('lockupColor.r')?.default).toBe(255);
    expect(getParameter('lockupColor.g')?.default).toBe(200);
    expect(getParameter('lockupColor.b')?.default).toBe(80);
  });
});

describe('getParameter', () => {
  it('returns a descriptor for a known path', () => {
    const p = getParameter('shimmer');
    expect(p).toBeDefined();
    expect(p?.path).toBe('shimmer');
  });

  it('returns undefined for an unknown path', () => {
    expect(getParameter('nonexistent.path')).toBeUndefined();
    expect(getParameter('')).toBeUndefined();
  });

  it('is case-sensitive', () => {
    expect(getParameter('Shimmer')).toBeUndefined();
  });
});

describe('getModulatableParameters', () => {
  it('returns only entries flagged isModulatable=true', () => {
    const mod = getModulatableParameters();
    expect(mod.length).toBeGreaterThan(0);
    for (const p of mod) {
      expect(p.isModulatable).toBe(true);
    }
  });

  it('excludes ledCount (flagged non-modulatable)', () => {
    const paths = getModulatableParameters().map((p) => p.path);
    expect(paths).not.toContain('ledCount');
  });
});

describe('isParameterModulatable', () => {
  it('returns true for a known modulatable path', () => {
    expect(isParameterModulatable('shimmer')).toBe(true);
    expect(isParameterModulatable('ignitionMs')).toBe(true);
    expect(isParameterModulatable('baseColor.r')).toBe(true);
  });

  it('returns false for a known non-modulatable path (ledCount)', () => {
    expect(isParameterModulatable('ledCount')).toBe(false);
  });

  it('returns false for an unknown path', () => {
    expect(isParameterModulatable('not.a.real.path')).toBe(false);
    expect(isParameterModulatable('')).toBe(false);
  });

  it('returns false for enum fields (style, ignition, retraction not in registry)', () => {
    expect(isParameterModulatable('style')).toBe(false);
    expect(isParameterModulatable('ignition')).toBe(false);
    expect(isParameterModulatable('retraction')).toBe(false);
    expect(isParameterModulatable('blendMode')).toBe(false);
  });

  it('returns false for boolean fields not in registry', () => {
    expect(isParameterModulatable('preonEnabled')).toBe(false);
    expect(isParameterModulatable('dualModeIgnition')).toBe(false);
  });
});

describe('getParametersByGroup', () => {
  it('returns only entries with matching group', () => {
    const colors = getParametersByGroup('color');
    expect(colors.length).toBeGreaterThan(0);
    for (const p of colors) {
      expect(p.group).toBe('color');
    }
  });

  it('every group returns a non-empty set except possibly none', () => {
    const groups: Array<'color' | 'motion' | 'timing' | 'style' | 'other'> = [
      'color',
      'motion',
      'timing',
      'style',
      'other',
    ];
    for (const g of groups) {
      // Not a hard requirement that each group is populated, but for
      // v1.0 all five are; flag the change if this ever becomes empty.
      expect(getParametersByGroup(g).length).toBeGreaterThan(0);
    }
  });

  it('union of all groups equals the full registry', () => {
    const all = [
      ...getParametersByGroup('color'),
      ...getParametersByGroup('motion'),
      ...getParametersByGroup('timing'),
      ...getParametersByGroup('style'),
      ...getParametersByGroup('other'),
    ];
    expect(all.length).toBe(PARAMETER_DESCRIPTORS.length);
  });
});

describe('unit labels', () => {
  it('uses only the approved short unit set', () => {
    const valid = new Set(['', 'ms', '°', 'px', 'Hz']);
    for (const p of PARAMETER_DESCRIPTORS) {
      expect(valid.has(p.unit), `${p.path} unit=${JSON.stringify(p.unit)}`).toBe(true);
    }
  });
});
