import { describe, it, expect, beforeEach } from 'vitest';
import { useSoundFontWarningStore } from '@/stores/soundFontWarningStore';

const MISSING = [
  { presetName: 'Mace Windu', fontName: 'mace_v2' },
  { presetName: 'Yoda', fontName: 'yoda_alt' },
];

const AVAILABLE = ['anakin', 'luke', 'obi-wan'];

beforeEach(() => {
  useSoundFontWarningStore.setState({
    isOpen: false,
    missing: [],
    available: [],
    resolve: null,
  });
});

describe('soundFontWarningStore', () => {
  it('request() opens the modal with the given missing + available lists', () => {
    void useSoundFontWarningStore.getState().request(MISSING, AVAILABLE);
    const state = useSoundFontWarningStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.missing).toEqual(MISSING);
    expect(state.available).toEqual(AVAILABLE);
    expect(state.resolve).not.toBeNull();
  });

  it('confirm() resolves the Promise with true', async () => {
    const promise = useSoundFontWarningStore.getState().request(MISSING, AVAILABLE);
    useSoundFontWarningStore.getState().confirm();
    await expect(promise).resolves.toBe(true);
  });

  it('cancel() resolves the Promise with false', async () => {
    const promise = useSoundFontWarningStore.getState().request(MISSING, AVAILABLE);
    useSoundFontWarningStore.getState().cancel();
    await expect(promise).resolves.toBe(false);
  });

  it('confirm() closes the modal + clears state', () => {
    void useSoundFontWarningStore.getState().request(MISSING, AVAILABLE);
    useSoundFontWarningStore.getState().confirm();
    const state = useSoundFontWarningStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.missing).toEqual([]);
    expect(state.available).toEqual([]);
    expect(state.resolve).toBeNull();
  });

  it('cancel() closes the modal + clears state', () => {
    void useSoundFontWarningStore.getState().request(MISSING, AVAILABLE);
    useSoundFontWarningStore.getState().cancel();
    const state = useSoundFontWarningStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.missing).toEqual([]);
    expect(state.available).toEqual([]);
    expect(state.resolve).toBeNull();
  });

  it('a second concurrent request() cancels the first as false', async () => {
    const first = useSoundFontWarningStore.getState().request(MISSING, AVAILABLE);
    const other = [{ presetName: 'Other', fontName: 'other_font' }];
    const second = useSoundFontWarningStore.getState().request(other, ['x', 'y']);

    await expect(first).resolves.toBe(false);

    const state = useSoundFontWarningStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.missing).toEqual(other);
    expect(state.available).toEqual(['x', 'y']);

    useSoundFontWarningStore.getState().confirm();
    await expect(second).resolves.toBe(true);
  });

  it('handles confirm() with no resolver gracefully (no throw)', () => {
    useSoundFontWarningStore.setState({
      isOpen: true,
      missing: MISSING,
      available: AVAILABLE,
      resolve: null,
    });
    expect(() => useSoundFontWarningStore.getState().confirm()).not.toThrow();
    expect(useSoundFontWarningStore.getState().isOpen).toBe(false);
  });

  it('handles cancel() with no resolver gracefully (no throw)', () => {
    useSoundFontWarningStore.setState({
      isOpen: true,
      missing: MISSING,
      available: AVAILABLE,
      resolve: null,
    });
    expect(() => useSoundFontWarningStore.getState().cancel()).not.toThrow();
    expect(useSoundFontWarningStore.getState().isOpen).toBe(false);
  });
});
