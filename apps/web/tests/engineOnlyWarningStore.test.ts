import { describe, it, expect, beforeEach } from 'vitest';
import { useEngineOnlyWarningStore } from '@/stores/engineOnlyWarningStore';

const ENTRIES = [
  { presetName: 'Helix Test', styleId: 'helix' },
  { presetName: 'Vortex Test', styleId: 'vortex' },
];

beforeEach(() => {
  // Reset store between tests. Zustand stores share state across tests
  // in the same vitest worker, so explicit reset prevents bleed.
  useEngineOnlyWarningStore.setState({
    isOpen: false,
    entries: [],
    resolve: null,
  });
});

describe('engineOnlyWarningStore', () => {
  it('request() opens the modal with the given entries', () => {
    void useEngineOnlyWarningStore.getState().request(ENTRIES);
    const state = useEngineOnlyWarningStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.entries).toEqual(ENTRIES);
    expect(state.resolve).not.toBeNull();
  });

  it('confirm() resolves the Promise with true', async () => {
    const promise = useEngineOnlyWarningStore.getState().request(ENTRIES);
    useEngineOnlyWarningStore.getState().confirm();
    await expect(promise).resolves.toBe(true);
  });

  it('cancel() resolves the Promise with false', async () => {
    const promise = useEngineOnlyWarningStore.getState().request(ENTRIES);
    useEngineOnlyWarningStore.getState().cancel();
    await expect(promise).resolves.toBe(false);
  });

  it('confirm() closes the modal + clears state', () => {
    void useEngineOnlyWarningStore.getState().request(ENTRIES);
    useEngineOnlyWarningStore.getState().confirm();
    const state = useEngineOnlyWarningStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.entries).toEqual([]);
    expect(state.resolve).toBeNull();
  });

  it('cancel() closes the modal + clears state', () => {
    void useEngineOnlyWarningStore.getState().request(ENTRIES);
    useEngineOnlyWarningStore.getState().cancel();
    const state = useEngineOnlyWarningStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.entries).toEqual([]);
    expect(state.resolve).toBeNull();
  });

  it('a second concurrent request() cancels the first as false', async () => {
    const first = useEngineOnlyWarningStore.getState().request(ENTRIES);
    const otherEntries = [{ presetName: 'Other', styleId: 'ember' }];
    const second = useEngineOnlyWarningStore.getState().request(otherEntries);

    // First promise resolves to false (treated as cancel) when displaced.
    await expect(first).resolves.toBe(false);

    // Second is in-flight; modal shows the new entries.
    const state = useEngineOnlyWarningStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.entries).toEqual(otherEntries);

    // Finish the second one cleanly to avoid an unresolved Promise.
    useEngineOnlyWarningStore.getState().confirm();
    await expect(second).resolves.toBe(true);
  });

  it('handles confirm() with no in-flight request gracefully (no throw)', () => {
    // Defensive: clicking Continue when the store is somehow open
    // without a resolver should not crash. Should just clear state.
    useEngineOnlyWarningStore.setState({ isOpen: true, entries: ENTRIES, resolve: null });
    expect(() => useEngineOnlyWarningStore.getState().confirm()).not.toThrow();
    expect(useEngineOnlyWarningStore.getState().isOpen).toBe(false);
  });

  it('handles cancel() with no in-flight request gracefully (no throw)', () => {
    useEngineOnlyWarningStore.setState({ isOpen: true, entries: ENTRIES, resolve: null });
    expect(() => useEngineOnlyWarningStore.getState().cancel()).not.toThrow();
    expect(useEngineOnlyWarningStore.getState().isOpen).toBe(false);
  });
});
