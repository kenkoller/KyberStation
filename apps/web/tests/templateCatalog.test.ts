// ─── Template Catalog Tests ───
// Phase 7D: Verify catalog structure, search, and examples.

import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_CATALOG,
  TEMPLATE_EXAMPLES,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getAllCatalogEntries,
  searchCatalog,
} from '../lib/templateCatalog';
// Types available but not directly consumed in test assertions
// import type { TemplateCatalogCategory, TemplateCatalogEntry } from '../lib/templateCatalog';

// ─── Catalog structure ───

describe('TEMPLATE_CATALOG', () => {
  it('has entries for every category in CATEGORY_ORDER', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(TEMPLATE_CATALOG[cat]).toBeDefined();
      expect(Array.isArray(TEMPLATE_CATALOG[cat])).toBe(true);
      expect(TEMPLATE_CATALOG[cat].length).toBeGreaterThan(0);
    }
  });

  it('has labels for every category', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });

  it('has at least 100 total entries', () => {
    const all = getAllCatalogEntries();
    expect(all.length).toBeGreaterThanOrEqual(100);
  });

  it('every entry has required fields', () => {
    const all = getAllCatalogEntries();
    for (const entry of all) {
      expect(entry.name).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.signature).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(Array.isArray(entry.defaultArgs)).toBe(true);
    }
  });

  it('entry names are unique within categories', () => {
    for (const cat of CATEGORY_ORDER) {
      const entries = TEMPLATE_CATALOG[cat];
      const names = entries.map((e) => e.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    }
  });

  it('entry categories match their placement', () => {
    for (const cat of CATEGORY_ORDER) {
      for (const entry of TEMPLATE_CATALOG[cat]) {
        expect(entry.category).toBe(cat);
      }
    }
  });

  it('CATEGORY_ORDER has exactly 6 categories', () => {
    expect(CATEGORY_ORDER.length).toBe(6);
  });
});

// ─── Key entries present ───

describe('key catalog entries', () => {
  const all = getAllCatalogEntries();
  const byName = (name: string) => all.find((e) => e.name === name);

  it('includes Rgb in colors', () => {
    const entry = byName('Rgb');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('colors');
    expect(entry!.defaultArgs).toEqual(['255', '0', '0']);
  });

  it('includes Layers in styles', () => {
    const entry = byName('Layers');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('styles');
  });

  it('includes Int in functions', () => {
    const entry = byName('Int');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('functions');
  });

  it('includes TrFade in transitions', () => {
    const entry = byName('TrFade');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('transitions');
  });

  it('includes SimpleClashL in effects', () => {
    const entry = byName('SimpleClashL');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('effects');
  });

  it('includes InOutTrL in wrappers', () => {
    const entry = byName('InOutTrL');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('wrappers');
  });

  it('includes SwingSpeed in functions', () => {
    const entry = byName('SwingSpeed');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('functions');
  });

  it('includes AudioFlicker in styles', () => {
    const entry = byName('AudioFlicker');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('styles');
  });
});

// ─── Search ───

describe('searchCatalog', () => {
  it('returns all entries for empty query', () => {
    const all = getAllCatalogEntries();
    const results = searchCatalog('');
    expect(results.length).toBe(all.length);
  });

  it('finds Rgb by name', () => {
    const results = searchCatalog('Rgb');
    expect(results.some((e) => e.name === 'Rgb')).toBe(true);
  });

  it('finds entries by description keyword', () => {
    const results = searchCatalog('swing');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((e) => e.name === 'SwingSpeed')).toBe(true);
  });

  it('is case-insensitive', () => {
    const upper = searchCatalog('RGB');
    const lower = searchCatalog('rgb');
    expect(upper.length).toBe(lower.length);
  });

  it('returns empty array for no-match query', () => {
    const results = searchCatalog('xyznonexistent');
    expect(results.length).toBe(0);
  });

  it('partial match works', () => {
    const results = searchCatalog('Tr');
    // Should match many transitions + other entries with Tr in name
    expect(results.length).toBeGreaterThan(5);
  });
});

// ─── Examples ───

describe('TEMPLATE_EXAMPLES', () => {
  it('has at least 10 examples', () => {
    expect(TEMPLATE_EXAMPLES.length).toBeGreaterThanOrEqual(10);
  });

  it('every example has required fields', () => {
    for (const example of TEMPLATE_EXAMPLES) {
      expect(example.name).toBeTruthy();
      expect(example.description).toBeTruthy();
      expect(example.templateString).toBeTruthy();
    }
  });

  it('example names are unique', () => {
    const names = TEMPLATE_EXAMPLES.map((e) => e.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('example template strings contain angle brackets', () => {
    for (const example of TEMPLATE_EXAMPLES) {
      expect(example.templateString).toContain('<');
      expect(example.templateString).toContain('>');
    }
  });

  it('includes a Basic Solid example', () => {
    const basic = TEMPLATE_EXAMPLES.find((e) => e.name === 'Basic Solid');
    expect(basic).toBeDefined();
  });

  it('includes a Full Style example', () => {
    const full = TEMPLATE_EXAMPLES.find((e) => e.name === 'Full Style');
    expect(full).toBeDefined();
  });
});

// ─── Category content sanity ───

describe('category content', () => {
  it('colors category has Rgb constructor', () => {
    const colors = TEMPLATE_CATALOG.colors;
    expect(colors.some((e) => e.name === 'Rgb')).toBe(true);
  });

  it('functions category has numeric/sensor functions', () => {
    const funcs = TEMPLATE_CATALOG.functions;
    const hasInt = funcs.some((e) => e.name === 'Int');
    const hasScale = funcs.some((e) => e.name === 'Scale');
    expect(hasInt).toBe(true);
    expect(hasScale).toBe(true);
  });

  it('transitions all start with Tr', () => {
    const trans = TEMPLATE_CATALOG.transitions;
    for (const entry of trans) {
      expect(entry.name.startsWith('Tr')).toBe(true);
    }
  });

  it('wrappers include ignition/retraction patterns', () => {
    const wrappers = TEMPLATE_CATALOG.wrappers;
    const hasInOutTrL = wrappers.some((e) => e.name === 'InOutTrL');
    expect(hasInOutTrL).toBe(true);
  });
});

// ─── getAllCatalogEntries ───

describe('getAllCatalogEntries', () => {
  it('returns a flat array of all entries', () => {
    const all = getAllCatalogEntries();
    let manualCount = 0;
    for (const cat of CATEGORY_ORDER) {
      manualCount += TEMPLATE_CATALOG[cat].length;
    }
    expect(all.length).toBe(manualCount);
  });

  it('preserves category order', () => {
    const all = getAllCatalogEntries();
    // First entry should be from 'colors'
    expect(all[0].category).toBe('colors');
    // Last entry should be from 'wrappers'
    expect(all[all.length - 1].category).toBe('wrappers');
  });
});
