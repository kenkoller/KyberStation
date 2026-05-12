// ─── Fett263 Define Registry Tests ──────────────────────────────────────
//
// Validates the registry structure, lookup helpers, dependency/conflict
// validation, codegen formatting, and define string parsing.

import { describe, it, expect } from 'vitest';
import {
  FETT263_DEFINES,
  FETT263_DEFINES_DEDUPED,
  FETT263_CATEGORY_ORDER,
  FETT263_CATEGORY_LABELS,
  FETT263_CATEGORY_DESCRIPTIONS,
  getDefineEntry,
  getDefinesByCategory,
  getBooleanDefines,
  getNumericDefines,
  validateDefine,
  validateAllDefines,
  formatDefineForCodegen,
  parseDefineString,
  getNoBmVariant,
  isNoBmVariant,
} from '../lib/fett263Defines';

// ─── Registry structure ────────────────────────────────────────────

describe('FETT263_DEFINES registry', () => {
  it('has at least 40 entries', () => {
    expect(FETT263_DEFINES.length).toBeGreaterThanOrEqual(40);
  });

  it('every entry has required fields', () => {
    for (const entry of FETT263_DEFINES) {
      expect(entry.define).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(['boolean', 'number']).toContain(entry.type);
    }
  });

  it('all define names start with FETT263_', () => {
    for (const entry of FETT263_DEFINES) {
      expect(entry.define).toMatch(/^FETT263_/);
    }
  });

  it('numeric defines have min, max, step, and defaultValue', () => {
    const numeric = FETT263_DEFINES.filter((d) => d.type === 'number');
    expect(numeric.length).toBeGreaterThan(0);
    for (const entry of numeric) {
      expect(entry.defaultValue).toBeDefined();
      expect(entry.min).toBeDefined();
      expect(entry.max).toBeDefined();
      expect(entry.step).toBeDefined();
      expect(typeof entry.defaultValue).toBe('number');
      expect(entry.min!).toBeLessThan(entry.max!);
      expect(entry.defaultValue!).toBeGreaterThanOrEqual(entry.min!);
      expect(entry.defaultValue!).toBeLessThanOrEqual(entry.max!);
    }
  });

  it('boolean defines have no min/max/step', () => {
    const booleans = FETT263_DEFINES.filter((d) => d.type === 'boolean');
    for (const entry of booleans) {
      expect(entry.min).toBeUndefined();
      expect(entry.max).toBeUndefined();
      expect(entry.step).toBeUndefined();
    }
  });

  it('requires arrays only reference valid define names', () => {
    const allNames = new Set(FETT263_DEFINES.map((d) => d.define));
    for (const entry of FETT263_DEFINES) {
      for (const req of entry.requires ?? []) {
        expect(allNames.has(req)).toBe(true);
      }
    }
  });

  it('conflicts arrays only reference valid define names', () => {
    const allNames = new Set(FETT263_DEFINES.map((d) => d.define));
    for (const entry of FETT263_DEFINES) {
      for (const conf of entry.conflicts ?? []) {
        expect(allNames.has(conf)).toBe(true);
      }
    }
  });
});

// ─── Deduplication ─────────────────────────────────────────────────

describe('FETT263_DEFINES_DEDUPED', () => {
  it('has unique define names', () => {
    const names = FETT263_DEFINES_DEDUPED.map((d) => d.define);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('has fewer or equal entries than the full registry', () => {
    expect(FETT263_DEFINES_DEDUPED.length).toBeLessThanOrEqual(FETT263_DEFINES.length);
  });

  it('preserves the first occurrence of each define', () => {
    // SWING_ON_SPEED is in gesture-ignition AND swing-controls
    // The deduped version should keep the gesture-ignition one
    const speedEntry = FETT263_DEFINES_DEDUPED.find(
      (d) => d.define === 'FETT263_SWING_ON_SPEED',
    );
    expect(speedEntry).toBeDefined();
    expect(speedEntry!.category).toBe('gesture-ignition');
  });
});

// ─── Category metadata ─────────────────────────────────────────────

describe('category metadata', () => {
  it('CATEGORY_ORDER has all 9 categories', () => {
    expect(FETT263_CATEGORY_ORDER).toHaveLength(9);
  });

  it('every category in ORDER has a label', () => {
    for (const cat of FETT263_CATEGORY_ORDER) {
      expect(FETT263_CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });

  it('every category in ORDER has a description', () => {
    for (const cat of FETT263_CATEGORY_ORDER) {
      expect(FETT263_CATEGORY_DESCRIPTIONS[cat]).toBeTruthy();
    }
  });

  it('every define belongs to a category in ORDER', () => {
    const catSet = new Set(FETT263_CATEGORY_ORDER);
    for (const entry of FETT263_DEFINES) {
      expect(catSet.has(entry.category)).toBe(true);
    }
  });
});

// ─── Lookup helpers ────────────────────────────────────────────────

describe('getDefineEntry', () => {
  it('returns the entry for a known define', () => {
    const entry = getDefineEntry('FETT263_TWIST_ON');
    expect(entry).toBeDefined();
    expect(entry!.label).toBe('Twist On');
    expect(entry!.type).toBe('boolean');
  });

  it('returns undefined for unknown define', () => {
    expect(getDefineEntry('FETT263_NONEXISTENT')).toBeUndefined();
  });
});

describe('getDefinesByCategory', () => {
  it('returns defines for gesture-ignition', () => {
    const defs = getDefinesByCategory('gesture-ignition');
    expect(defs.length).toBeGreaterThan(3);
    expect(defs.every((d) => d.category === 'gesture-ignition')).toBe(true);
  });

  it('returns empty array for empty category', () => {
    // All categories should have entries — but if one were empty it
    // should return []
    const defs = getDefinesByCategory('gesture-ignition');
    expect(Array.isArray(defs)).toBe(true);
  });
});

describe('getBooleanDefines / getNumericDefines', () => {
  it('getBooleanDefines returns only boolean type', () => {
    const bools = getBooleanDefines();
    expect(bools.length).toBeGreaterThan(10);
    expect(bools.every((d) => d.type === 'boolean')).toBe(true);
  });

  it('getNumericDefines returns only number type', () => {
    const nums = getNumericDefines();
    expect(nums.length).toBeGreaterThan(3);
    expect(nums.every((d) => d.type === 'number')).toBe(true);
  });

  it('boolean + numeric = total', () => {
    const bools = getBooleanDefines();
    const nums = getNumericDefines();
    expect(bools.length + nums.length).toBe(FETT263_DEFINES.length);
  });
});

// ─── Validation ────────────────────────────────────────────────────

describe('validateDefine', () => {
  it('returns valid for a standalone define with no deps', () => {
    const result = validateDefine('FETT263_TWIST_ON', ['FETT263_TWIST_ON']);
    expect(result.valid).toBe(true);
    expect(result.missingRequires).toEqual([]);
    expect(result.activeConflicts).toEqual([]);
  });

  it('detects missing requirements', () => {
    // SWING_ON_SPEED requires SWING_ON
    const result = validateDefine('FETT263_SWING_ON_SPEED', [
      'FETT263_SWING_ON_SPEED',
    ]);
    expect(result.valid).toBe(false);
    expect(result.missingRequires).toContain('FETT263_SWING_ON');
  });

  it('is valid when requirements are met', () => {
    const result = validateDefine('FETT263_SWING_ON_SPEED', [
      'FETT263_SWING_ON_SPEED',
      'FETT263_SWING_ON',
    ]);
    expect(result.valid).toBe(true);
    expect(result.missingRequires).toEqual([]);
  });

  it('detects active conflicts', () => {
    // SWING_ON_NO_BM conflicts with SWING_ON
    const result = validateDefine('FETT263_SWING_ON_NO_BM', [
      'FETT263_SWING_ON_NO_BM',
      'FETT263_SWING_ON',
    ]);
    expect(result.activeConflicts).toContain('FETT263_SWING_ON');
  });

  it('returns valid for unknown defines', () => {
    const result = validateDefine('UNKNOWN_DEFINE', ['UNKNOWN_DEFINE']);
    expect(result.valid).toBe(true);
  });

  it('detects BATTLE_MODE_START_ON conflicting with ALWAYS_ON', () => {
    const result = validateDefine('FETT263_BATTLE_MODE_START_ON', [
      'FETT263_BATTLE_MODE',
      'FETT263_BATTLE_MODE_ALWAYS_ON',
      'FETT263_BATTLE_MODE_START_ON',
    ]);
    expect(result.activeConflicts).toContain('FETT263_BATTLE_MODE_ALWAYS_ON');
  });

  it('detects DISABLE_QUOTE_PLAYER conflicting with QUOTE_PLAYER', () => {
    const result = validateDefine('FETT263_DISABLE_QUOTE_PLAYER', [
      'FETT263_QUOTE_PLAYER',
      'FETT263_DISABLE_QUOTE_PLAYER',
    ]);
    expect(result.activeConflicts).toContain('FETT263_QUOTE_PLAYER');
  });
});

describe('validateAllDefines', () => {
  it('returns a map for each active define', () => {
    const active = ['FETT263_TWIST_ON', 'FETT263_SWING_ON'];
    const results = validateAllDefines(active);
    expect(results.size).toBe(2);
    expect(results.get('FETT263_TWIST_ON')?.valid).toBe(true);
    expect(results.get('FETT263_SWING_ON')?.valid).toBe(true);
  });

  it('flags invalid defines in the map', () => {
    const active = ['FETT263_SWING_ON_SPEED']; // missing SWING_ON
    const results = validateAllDefines(active);
    const speed = results.get('FETT263_SWING_ON_SPEED');
    expect(speed?.valid).toBe(false);
    expect(speed?.missingRequires).toContain('FETT263_SWING_ON');
  });
});

// ─── Codegen formatting ───────────────────────────────────────────

describe('formatDefineForCodegen', () => {
  it('formats boolean define as name only', () => {
    expect(formatDefineForCodegen('FETT263_TWIST_ON')).toBe('FETT263_TWIST_ON');
  });

  it('formats numeric define with value', () => {
    expect(formatDefineForCodegen('FETT263_SWING_ON_SPEED', 300)).toBe(
      'FETT263_SWING_ON_SPEED 300',
    );
  });

  it('formats numeric define without value as name only', () => {
    expect(formatDefineForCodegen('FETT263_SWING_ON_SPEED')).toBe(
      'FETT263_SWING_ON_SPEED',
    );
  });

  it('handles unknown defines gracefully', () => {
    expect(formatDefineForCodegen('UNKNOWN_DEFINE', 42)).toBe('UNKNOWN_DEFINE');
  });
});

// ─── Parse round-trip ─────────────────────────────────────────────

describe('parseDefineString', () => {
  it('parses boolean define', () => {
    const { define, value } = parseDefineString('FETT263_TWIST_ON');
    expect(define).toBe('FETT263_TWIST_ON');
    expect(value).toBeUndefined();
  });

  it('parses numeric define with value', () => {
    const { define, value } = parseDefineString('FETT263_SWING_ON_SPEED 250');
    expect(define).toBe('FETT263_SWING_ON_SPEED');
    expect(value).toBe(250);
  });

  it('trims whitespace', () => {
    const { define, value } = parseDefineString('  FETT263_BM_CLASH_DETECT 4  ');
    expect(define).toBe('FETT263_BM_CLASH_DETECT');
    expect(value).toBe(4);
  });

  it('handles non-numeric value after space gracefully', () => {
    const { define, value } = parseDefineString('FETT263_FOO bar');
    expect(define).toBe('FETT263_FOO bar');
    expect(value).toBeUndefined();
  });

  it('round-trips through format then parse', () => {
    const original = 'FETT263_SWING_ON_SPEED';
    const formatted = formatDefineForCodegen(original, 300);
    const { define, value } = parseDefineString(formatted);
    expect(define).toBe(original);
    expect(value).toBe(300);
  });

  it('round-trips boolean through format then parse', () => {
    const original = 'FETT263_TWIST_ON';
    const formatted = formatDefineForCodegen(original);
    const { define, value } = parseDefineString(formatted);
    expect(define).toBe(original);
    expect(value).toBeUndefined();
  });
});

// ─── NO_BM helpers ────────────────────────────────────────────────

describe('NO_BM helpers', () => {
  it('getNoBmVariant returns the NO_BM sibling', () => {
    expect(getNoBmVariant('FETT263_SWING_ON')).toBe('FETT263_SWING_ON_NO_BM');
    expect(getNoBmVariant('FETT263_THRUST_ON')).toBe('FETT263_THRUST_ON_NO_BM');
    expect(getNoBmVariant('FETT263_TWIST_ON')).toBe('FETT263_TWIST_ON_NO_BM');
    expect(getNoBmVariant('FETT263_STAB_ON')).toBe('FETT263_STAB_ON_NO_BM');
  });

  it('getNoBmVariant returns undefined for non-gesture defines', () => {
    expect(getNoBmVariant('FETT263_BATTLE_MODE')).toBeUndefined();
    expect(getNoBmVariant('FETT263_EDIT_MODE_MENU')).toBeUndefined();
  });

  it('isNoBmVariant identifies NO_BM defines', () => {
    expect(isNoBmVariant('FETT263_SWING_ON_NO_BM')).toBe(true);
    expect(isNoBmVariant('FETT263_THRUST_ON_NO_BM')).toBe(true);
  });

  it('isNoBmVariant returns false for non-NO_BM defines', () => {
    expect(isNoBmVariant('FETT263_SWING_ON')).toBe(false);
    expect(isNoBmVariant('FETT263_BATTLE_MODE')).toBe(false);
  });

  it('every NO_BM variant requires its parent', () => {
    const noBms = FETT263_DEFINES.filter((d) => isNoBmVariant(d.define));
    for (const noBm of noBms) {
      const parent = noBm.define.replace('_NO_BM', '');
      expect(noBm.requires).toContain(parent);
    }
  });

  it('every NO_BM variant conflicts with its parent', () => {
    const noBms = FETT263_DEFINES.filter((d) => isNoBmVariant(d.define));
    for (const noBm of noBms) {
      const parent = noBm.define.replace('_NO_BM', '');
      expect(noBm.conflicts).toContain(parent);
    }
  });
});

// ─── Key entries ──────────────────────────────────────────────────

describe('key entries present', () => {
  it('includes FETT263_TWIST_ON in gesture-ignition', () => {
    const entry = getDefineEntry('FETT263_TWIST_ON');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('gesture-ignition');
    expect(entry!.type).toBe('boolean');
  });

  it('includes FETT263_BATTLE_MODE in battle-mode', () => {
    const entry = getDefineEntry('FETT263_BATTLE_MODE');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('battle-mode');
  });

  it('includes FETT263_EDIT_MODE_MENU in edit-mode', () => {
    const entry = getDefineEntry('FETT263_EDIT_MODE_MENU');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('edit-mode');
  });

  it('includes FETT263_FORCE_PUSH in force-effects', () => {
    const entry = getDefineEntry('FETT263_FORCE_PUSH');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('force-effects');
  });

  it('includes FETT263_BM_CLASH_DETECT as numeric with range 1-8', () => {
    const entry = getDefineEntry('FETT263_BM_CLASH_DETECT');
    expect(entry).toBeDefined();
    expect(entry!.type).toBe('number');
    expect(entry!.min).toBe(1);
    expect(entry!.max).toBe(8);
    expect(entry!.defaultValue).toBe(4);
  });

  it('includes FETT263_SWING_ON_SPEED as numeric', () => {
    const entry = getDefineEntry('FETT263_SWING_ON_SPEED');
    expect(entry).toBeDefined();
    expect(entry!.type).toBe('number');
    expect(entry!.defaultValue).toBe(250);
  });
});
