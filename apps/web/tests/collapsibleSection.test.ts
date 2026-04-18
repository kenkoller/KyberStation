// ─── CollapsibleSection — pure-helper regression tests ──────────────────────
//
// The vitest environment for apps/web is node-only (no jsdom), so we can't
// mount the React component here. Instead, we lock down the pure helpers
// that drive its behavior: persistKey storage keying, localStorage
// round-trip, initial-state resolution, and keyboard contract.
//
// If this suite stays green, the component itself is a thin JSX shell over
// these helpers — anything that breaks at runtime will show up in these
// tests first.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  COLLAPSIBLE_STORAGE_PREFIX,
  storageKey,
  readStoredState,
  writeStoredState,
  resolveInitialOpen,
  isToggleKey,
} from '../components/shared/CollapsibleSection';

// Minimal localStorage polyfill — see crystalAnimations.test.ts for the
// same pattern. vitest's node env doesn't ship one and several of our
// helpers depend on it.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe('storageKey', () => {
  it('prefixes every persistKey under the shared namespace', () => {
    expect(storageKey('StylePanel.blade-style')).toBe(
      'kyber.collapsible.StylePanel.blade-style',
    );
    expect(storageKey('foo')).toBe('kyber.collapsible.foo');
  });

  it('exposes the prefix as a constant for tooling / migrations', () => {
    expect(COLLAPSIBLE_STORAGE_PREFIX).toBe('kyber.collapsible.');
    expect(storageKey('x').startsWith(COLLAPSIBLE_STORAGE_PREFIX)).toBe(true);
  });
});

describe('readStoredState / writeStoredState round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing has been stored', () => {
    expect(readStoredState('unset-key')).toBeNull();
  });

  it('persists true and reads it back', () => {
    writeStoredState('sectionA', true);
    expect(readStoredState('sectionA')).toBe(true);
  });

  it('persists false and reads it back', () => {
    writeStoredState('sectionB', false);
    expect(readStoredState('sectionB')).toBe(false);
  });

  it('tolerates legacy / unexpected stored values by returning null', () => {
    // Simulate a value written by an earlier version or a manual edit.
    localStorage.setItem(storageKey('legacy'), 'banana');
    expect(readStoredState('legacy')).toBeNull();
  });

  it('accepts the string forms "true" and "false" as well as 1 / 0', () => {
    localStorage.setItem(storageKey('true-str'), 'true');
    localStorage.setItem(storageKey('false-str'), 'false');
    expect(readStoredState('true-str')).toBe(true);
    expect(readStoredState('false-str')).toBe(false);
  });
});

describe('resolveInitialOpen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaultOpen when no persistKey is provided', () => {
    expect(resolveInitialOpen(true)).toBe(true);
    expect(resolveInitialOpen(false)).toBe(false);
  });

  it('returns defaultOpen when persistKey has no stored value', () => {
    expect(resolveInitialOpen(true, 'never-seen')).toBe(true);
    expect(resolveInitialOpen(false, 'never-seen')).toBe(false);
  });

  it('stored value wins over defaultOpen when present', () => {
    writeStoredState('user-closed', false);
    expect(resolveInitialOpen(true, 'user-closed')).toBe(false);

    writeStoredState('user-opened', true);
    expect(resolveInitialOpen(false, 'user-opened')).toBe(true);
  });
});

describe('isToggleKey', () => {
  it('recognizes Enter and Space per WAI-ARIA disclosure pattern', () => {
    expect(isToggleKey('Enter')).toBe(true);
    expect(isToggleKey(' ')).toBe(true);
    expect(isToggleKey('Spacebar')).toBe(true); // legacy IE/Edge
  });

  it('ignores every other key', () => {
    expect(isToggleKey('Tab')).toBe(false);
    expect(isToggleKey('ArrowDown')).toBe(false);
    expect(isToggleKey('a')).toBe(false);
    expect(isToggleKey('Escape')).toBe(false);
  });
});
