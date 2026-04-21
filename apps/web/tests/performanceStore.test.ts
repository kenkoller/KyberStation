// ─── Wave 5 — PerformanceBar store regression tests ──
//
// The vitest env for apps/web is node-only (no jsdom), matching the
// rest of apps/web/tests. These tests exercise everything that drives
// the PerformanceBar without rendering the component itself:
//
//   1. `performanceStore` — page switching, macro value clamping,
//      localStorage round-trip, reset-defaults.
//   2. `scaleMacroValue` — scaling from normalized [0, 1] into the
//      binding's real range (plus integer rounding).
//   3. Visibility toggle through `setVisible`.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  usePerformanceStore,
  DEFAULT_BINDINGS,
  PAGE_IDS,
  MACRO_SLOTS,
  clamp01,
  scaleMacroValue,
  type PageId,
} from '../stores/performanceStore';

// ─── Fake localStorage shim ──────────────────────────────────────────────────
//
// Node has no `localStorage`. The store's loader/saver catches the
// reference error silently, so for a true round-trip test we install a
// minimal in-memory shim on `globalThis`. We restore it afterward so
// the shim doesn't leak across files.

interface MaybeStorage {
  localStorage?: Storage;
}

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

function installLocalStorage(): MemoryStorage {
  const g = globalThis as unknown as MaybeStorage;
  const mem = new MemoryStorage();
  g.localStorage = mem;
  return mem;
}

function uninstallLocalStorage(): void {
  const g = globalThis as unknown as MaybeStorage;
  g.localStorage = undefined;
}

// ─── Helper — reset store to canonical defaults before each test ─────────────

function resetStore() {
  usePerformanceStore.setState({
    currentPage: 'A',
    macroValues: {
      A: new Array(MACRO_SLOTS).fill(0.5),
      B: new Array(MACRO_SLOTS).fill(0.5),
      C: new Array(MACRO_SLOTS).fill(0.5),
      D: new Array(MACRO_SLOTS).fill(0.5),
    },
    macroAssignments: {
      A: DEFAULT_BINDINGS.A.map((b) => ({ ...b })),
      B: DEFAULT_BINDINGS.B.map((b) => ({ ...b })),
      C: DEFAULT_BINDINGS.C.map((b) => ({ ...b })),
      D: DEFAULT_BINDINGS.D.map((b) => ({ ...b })),
    },
    visible: true,
  });
}

// ─── clamp01 (pure) ──────────────────────────────────────────────────────────

describe('clamp01', () => {
  it('returns the value untouched when already in-range', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });

  it('clamps values above 1 to 1 and below 0 to 0', () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(-0.2)).toBe(0);
  });

  it('maps NaN to 0 instead of propagating', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

// ─── scaleMacroValue (pure) ──────────────────────────────────────────────────

describe('scaleMacroValue', () => {
  it('maps 0 → min and 1 → max for a float binding', () => {
    const binding = { target: 'shimmer', min: 0, max: 1, label: 'SHIMMER' };
    expect(scaleMacroValue(binding, 0)).toBe(0);
    expect(scaleMacroValue(binding, 1)).toBe(1);
    expect(scaleMacroValue(binding, 0.5)).toBe(0.5);
  });

  it('interpolates linearly into the binding range', () => {
    const binding = { target: 'ignitionMs', min: 100, max: 2000, label: 'IGNITE' };
    // mid-point 0.5 → 100 + 0.5 * 1900 = 1050
    expect(scaleMacroValue(binding, 0.5)).toBe(1050);
  });

  it('rounds when the binding declares integer: true', () => {
    const binding = {
      target: 'ignitionMs',
      min: 100,
      max: 2000,
      label: 'IGNITE',
      integer: true,
    };
    // 0.333 → 100 + 0.333 * 1900 = 732.7 → 733
    expect(scaleMacroValue(binding, 0.333)).toBe(733);
  });

  it('clamps out-of-range inputs before scaling', () => {
    const binding = { target: 'shimmer', min: 0, max: 1, label: 'SHIMMER' };
    expect(scaleMacroValue(binding, 1.5)).toBe(1);
    expect(scaleMacroValue(binding, -0.3)).toBe(0);
  });
});

// ─── setPage ─────────────────────────────────────────────────────────────────

describe('performanceStore — setPage', () => {
  beforeEach(resetStore);

  it('defaults to page A', () => {
    expect(usePerformanceStore.getState().currentPage).toBe('A');
  });

  it('switches to the requested page', () => {
    usePerformanceStore.getState().setPage('C');
    expect(usePerformanceStore.getState().currentPage).toBe('C');
  });

  it('preserves per-page macro values across switches', () => {
    const store = usePerformanceStore.getState();
    store.setMacroValue('A', 0, 0.9);
    store.setMacroValue('B', 0, 0.1);

    store.setPage('B');
    // Switching to B surfaces B's value, not A's.
    expect(usePerformanceStore.getState().macroValues.B[0]).toBe(0.1);

    store.setPage('A');
    expect(usePerformanceStore.getState().macroValues.A[0]).toBe(0.9);
  });

  it('all four page ids are routable', () => {
    for (const id of PAGE_IDS) {
      usePerformanceStore.getState().setPage(id as PageId);
      expect(usePerformanceStore.getState().currentPage).toBe(id);
    }
  });
});

// ─── setMacroValue — clamping + slot guard ───────────────────────────────────

describe('performanceStore — setMacroValue', () => {
  beforeEach(resetStore);

  it('writes the clamped value into the correct page/slot', () => {
    usePerformanceStore.getState().setMacroValue('A', 3, 0.7);
    expect(usePerformanceStore.getState().macroValues.A[3]).toBe(0.7);
  });

  it('clamps values above 1 to 1', () => {
    usePerformanceStore.getState().setMacroValue('A', 0, 1.5);
    expect(usePerformanceStore.getState().macroValues.A[0]).toBe(1);
  });

  it('clamps values below 0 to 0', () => {
    usePerformanceStore.getState().setMacroValue('A', 0, -0.2);
    expect(usePerformanceStore.getState().macroValues.A[0]).toBe(0);
  });

  it('ignores slot indices outside [0, MACRO_SLOTS)', () => {
    const before = usePerformanceStore.getState().macroValues.A.slice();
    usePerformanceStore.getState().setMacroValue('A', -1, 0.9);
    usePerformanceStore.getState().setMacroValue('A', MACRO_SLOTS, 0.9);
    usePerformanceStore.getState().setMacroValue('A', 999, 0.9);
    expect(usePerformanceStore.getState().macroValues.A).toEqual(before);
  });

  it('only mutates the target page — other pages stay untouched', () => {
    usePerformanceStore.getState().setMacroValue('A', 0, 0.9);
    expect(usePerformanceStore.getState().macroValues.B[0]).toBe(0.5);
    expect(usePerformanceStore.getState().macroValues.C[0]).toBe(0.5);
    expect(usePerformanceStore.getState().macroValues.D[0]).toBe(0.5);
  });

  it('maps NaN to 0 via clamp01', () => {
    usePerformanceStore.getState().setMacroValue('A', 0, Number.NaN);
    expect(usePerformanceStore.getState().macroValues.A[0]).toBe(0);
  });
});

// ─── setVisible ──────────────────────────────────────────────────────────────

describe('performanceStore — setVisible', () => {
  beforeEach(resetStore);

  it('defaults to visible = true', () => {
    expect(usePerformanceStore.getState().visible).toBe(true);
  });

  it('toggles the visibility flag', () => {
    usePerformanceStore.getState().setVisible(false);
    expect(usePerformanceStore.getState().visible).toBe(false);

    usePerformanceStore.getState().setVisible(true);
    expect(usePerformanceStore.getState().visible).toBe(true);
  });
});

// ─── resetDefaults ───────────────────────────────────────────────────────────

describe('performanceStore — resetDefaults', () => {
  beforeEach(resetStore);

  it('restores macro values to the centered defaults', () => {
    const store = usePerformanceStore.getState();
    store.setMacroValue('A', 0, 0.9);
    store.setMacroValue('B', 4, 0.1);

    store.resetDefaults();

    const s = usePerformanceStore.getState();
    for (const id of PAGE_IDS) {
      expect(s.macroValues[id]).toEqual(new Array(MACRO_SLOTS).fill(0.5));
    }
  });

  it('restores currentPage to A', () => {
    usePerformanceStore.getState().setPage('D');
    usePerformanceStore.getState().resetDefaults();
    expect(usePerformanceStore.getState().currentPage).toBe('A');
  });

  it('restores visibility to true', () => {
    usePerformanceStore.getState().setVisible(false);
    usePerformanceStore.getState().resetDefaults();
    expect(usePerformanceStore.getState().visible).toBe(true);
  });

  it('restores bindings — every page has MACRO_SLOTS entries', () => {
    usePerformanceStore.getState().resetDefaults();
    const s = usePerformanceStore.getState();
    for (const id of PAGE_IDS) {
      expect(s.macroAssignments[id]).toHaveLength(MACRO_SLOTS);
    }
  });
});

// ─── DEFAULT_BINDINGS shape ──────────────────────────────────────────────────

describe('DEFAULT_BINDINGS', () => {
  it('has exactly MACRO_SLOTS bindings per page', () => {
    for (const id of PAGE_IDS) {
      expect(DEFAULT_BINDINGS[id]).toHaveLength(MACRO_SLOTS);
    }
  });

  it('every binding has a non-empty label and a valid min < max range', () => {
    for (const id of PAGE_IDS) {
      for (const b of DEFAULT_BINDINGS[id]) {
        expect(b.label.length).toBeGreaterThan(0);
        expect(b.max).toBeGreaterThanOrEqual(b.min);
      }
    }
  });

  it('every default binding is wired (no placeholder slots in v1.0)', () => {
    // All 32 default slots (4 pages × 8 slots) map to real BladeConfig
    // fields after the Page D clash-location / blast-count fill. If a
    // future slot is added without a real field, flag it `unwired: true`
    // and update this assertion.
    const unwired = Object.values(DEFAULT_BINDINGS)
      .flat()
      .filter((b) => b.unwired === true);
    expect(unwired.length).toBe(0);
  });
});

// ─── localStorage round-trip ─────────────────────────────────────────────────
//
// Because the store reads from localStorage at module-load time (we
// can't rehydrate without re-importing), the round-trip test uses the
// store's `setMacroValue` + `setPage` to push a known state into the
// shim, then reads the JSON payload back and asserts the expected keys
// are present. This is the pattern layoutStore's own tests use.

describe('performanceStore — localStorage persistence', () => {
  let mem: MemoryStorage;

  beforeEach(() => {
    mem = installLocalStorage();
    resetStore();
  });

  afterEach(() => {
    uninstallLocalStorage();
    vi.restoreAllMocks();
  });

  it('persists currentPage, macroValues, and visible on write', () => {
    usePerformanceStore.getState().setPage('C');
    usePerformanceStore.getState().setMacroValue('C', 2, 0.75);
    usePerformanceStore.getState().setVisible(false);

    const raw = mem.getItem('kyberstation-performance');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);

    expect(parsed.currentPage).toBe('C');
    expect(parsed.macroValues.C[2]).toBe(0.75);
    expect(parsed.visible).toBe(false);
  });

  it('does not throw when localStorage.setItem fails (quota)', () => {
    const spy = vi.spyOn(mem, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    // Should be silently swallowed by the store's try/catch.
    expect(() => {
      usePerformanceStore.getState().setMacroValue('A', 0, 0.4);
    }).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});
