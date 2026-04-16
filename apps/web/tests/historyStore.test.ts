import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore, type HistoryEntry } from '../stores/historyStore';
import type { BladeConfig } from '@kyberstation/engine';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConfig(label = 'default'): BladeConfig {
  return {
    name: label,
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0.1,
    ledCount: 144,
  };
}

function resetStore() {
  useHistoryStore.setState({
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,
    undoLabel: null,
    redoLabel: null,
    maxHistory: 50,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('historyStore — initial state', () => {
  beforeEach(resetStore);

  it('starts with empty past and future', () => {
    const state = useHistoryStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
  });

  it('canUndo is false with empty history', () => {
    expect(useHistoryStore.getState().canUndo).toBe(false);
  });

  it('canRedo is false with empty history', () => {
    expect(useHistoryStore.getState().canRedo).toBe(false);
  });

  it('undoLabel and redoLabel are null initially', () => {
    const state = useHistoryStore.getState();
    expect(state.undoLabel).toBeNull();
    expect(state.redoLabel).toBeNull();
  });
});

describe('historyStore — pushState', () => {
  beforeEach(resetStore);

  it('adds the first entry to past', () => {
    useHistoryStore.getState().pushState('Initial', makeConfig('initial'));
    expect(useHistoryStore.getState().past).toHaveLength(1);
  });

  it('canUndo is false with only one entry (nothing to go back to)', () => {
    useHistoryStore.getState().pushState('Initial', makeConfig());
    expect(useHistoryStore.getState().canUndo).toBe(false);
  });

  it('canUndo becomes true after two pushes', () => {
    useHistoryStore.getState().pushState('State 1', makeConfig('s1'));
    useHistoryStore.getState().pushState('State 2', makeConfig('s2'));
    expect(useHistoryStore.getState().canUndo).toBe(true);
  });

  it('undoLabel reflects the label of the most recent push', () => {
    useHistoryStore.getState().pushState('First', makeConfig());
    useHistoryStore.getState().pushState('Second', makeConfig());
    expect(useHistoryStore.getState().undoLabel).toBe('Second');
  });

  it('pushState clears the future (redo) stack', () => {
    // Build up past and redo stack
    useHistoryStore.getState().pushState('A', makeConfig('a'));
    useHistoryStore.getState().pushState('B', makeConfig('b'));
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().future).toHaveLength(1);

    // New push must wipe the future
    useHistoryStore.getState().pushState('C', makeConfig('c'));
    expect(useHistoryStore.getState().future).toHaveLength(0);
    expect(useHistoryStore.getState().canRedo).toBe(false);
    expect(useHistoryStore.getState().redoLabel).toBeNull();
  });

  it('stores a deep clone of the snapshot', () => {
    const config = makeConfig('original');
    useHistoryStore.getState().pushState('Test', config);

    // Mutate the original object
    config.baseColor.r = 99;

    // The stored snapshot should be unaffected
    const stored = useHistoryStore.getState().past[0];
    expect(stored.snapshot.baseColor.r).toBe(0);
  });

  it('stores a timestamp on each entry', () => {
    const before = Date.now();
    useHistoryStore.getState().pushState('Timed', makeConfig());
    const after = Date.now();
    const entry = useHistoryStore.getState().past[0];
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('historyStore — maxHistory limit', () => {
  beforeEach(() => {
    resetStore();
    // Lower the limit for easy testing
    useHistoryStore.setState({ maxHistory: 5 });
  });

  it('does not exceed maxHistory entries in past', () => {
    for (let i = 0; i < 10; i++) {
      useHistoryStore.getState().pushState(`State ${i}`, makeConfig(`s${i}`));
    }
    expect(useHistoryStore.getState().past).toHaveLength(5);
  });

  it('drops the oldest entries first', () => {
    for (let i = 0; i < 6; i++) {
      useHistoryStore.getState().pushState(`State ${i}`, makeConfig(`s${i}`));
    }
    // With maxHistory=5, the first entry pushed (State 0) should be gone;
    // the last entry should be State 5.
    const { past } = useHistoryStore.getState();
    expect(past[past.length - 1].label).toBe('State 5');
    // Oldest surviving entry should be State 1 (State 0 was evicted)
    expect(past[0].label).toBe('State 1');
  });
});

describe('historyStore — undo', () => {
  beforeEach(resetStore);

  it('returns null when there is nothing to undo', () => {
    expect(useHistoryStore.getState().undo()).toBeNull();
  });

  it('returns null when only one entry exists (cannot go further back)', () => {
    useHistoryStore.getState().pushState('Only', makeConfig());
    expect(useHistoryStore.getState().undo()).toBeNull();
  });

  it('returns the entry that should be restored', () => {
    useHistoryStore.getState().pushState('First', makeConfig('first'));
    useHistoryStore.getState().pushState('Second', makeConfig('second'));

    const result = useHistoryStore.getState().undo();
    // Should return the first entry (the one we're reverting to)
    expect(result).not.toBeNull();
    expect((result as HistoryEntry).label).toBe('First');
    expect((result as HistoryEntry).snapshot.name).toBe('first');
  });

  it('moves the undone entry from past to future', () => {
    useHistoryStore.getState().pushState('A', makeConfig('a'));
    useHistoryStore.getState().pushState('B', makeConfig('b'));
    useHistoryStore.getState().undo();

    const state = useHistoryStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.future).toHaveLength(1);
    expect(state.future[0].label).toBe('B');
  });

  it('updates canUndo after undo', () => {
    useHistoryStore.getState().pushState('A', makeConfig());
    useHistoryStore.getState().pushState('B', makeConfig());
    useHistoryStore.getState().undo();
    // past now has only 1 entry — cannot undo further
    expect(useHistoryStore.getState().canUndo).toBe(false);
  });

  it('sets canRedo to true after undo', () => {
    useHistoryStore.getState().pushState('A', makeConfig());
    useHistoryStore.getState().pushState('B', makeConfig());
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().canRedo).toBe(true);
  });

  it('sets redoLabel to the undone entry label', () => {
    useHistoryStore.getState().pushState('A', makeConfig());
    useHistoryStore.getState().pushState('B', makeConfig());
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().redoLabel).toBe('B');
  });

  it('multiple undos walk back through history', () => {
    useHistoryStore.getState().pushState('A', makeConfig('a'));
    useHistoryStore.getState().pushState('B', makeConfig('b'));
    useHistoryStore.getState().pushState('C', makeConfig('c'));

    const r1 = useHistoryStore.getState().undo();
    expect((r1 as HistoryEntry).label).toBe('B');

    const r2 = useHistoryStore.getState().undo();
    expect((r2 as HistoryEntry).label).toBe('A');

    // Cannot undo further
    const r3 = useHistoryStore.getState().undo();
    expect(r3).toBeNull();
  });
});

describe('historyStore — redo', () => {
  beforeEach(resetStore);

  it('returns null when there is nothing to redo', () => {
    expect(useHistoryStore.getState().redo()).toBeNull();
  });

  it('returns the entry to restore', () => {
    useHistoryStore.getState().pushState('A', makeConfig('a'));
    useHistoryStore.getState().pushState('B', makeConfig('b'));
    useHistoryStore.getState().undo();

    const result = useHistoryStore.getState().redo();
    expect(result).not.toBeNull();
    expect((result as HistoryEntry).label).toBe('B');
  });

  it('moves entry from future back to past', () => {
    useHistoryStore.getState().pushState('A', makeConfig());
    useHistoryStore.getState().pushState('B', makeConfig());
    useHistoryStore.getState().undo();
    useHistoryStore.getState().redo();

    const state = useHistoryStore.getState();
    expect(state.past).toHaveLength(2);
    expect(state.future).toHaveLength(0);
  });

  it('sets canRedo to false after redoing the last future entry', () => {
    useHistoryStore.getState().pushState('A', makeConfig());
    useHistoryStore.getState().pushState('B', makeConfig());
    useHistoryStore.getState().undo();
    useHistoryStore.getState().redo();
    expect(useHistoryStore.getState().canRedo).toBe(false);
  });

  it('sets canUndo to true after redo', () => {
    useHistoryStore.getState().pushState('A', makeConfig());
    useHistoryStore.getState().pushState('B', makeConfig());
    useHistoryStore.getState().undo();
    useHistoryStore.getState().redo();
    expect(useHistoryStore.getState().canUndo).toBe(true);
  });

  it('multiple redos walk forward through history', () => {
    useHistoryStore.getState().pushState('A', makeConfig('a'));
    useHistoryStore.getState().pushState('B', makeConfig('b'));
    useHistoryStore.getState().pushState('C', makeConfig('c'));
    useHistoryStore.getState().undo();
    useHistoryStore.getState().undo();

    const r1 = useHistoryStore.getState().redo();
    expect((r1 as HistoryEntry).label).toBe('B');

    const r2 = useHistoryStore.getState().redo();
    expect((r2 as HistoryEntry).label).toBe('C');

    // Nothing left to redo
    expect(useHistoryStore.getState().redo()).toBeNull();
  });
});

describe('historyStore — undo/redo round-trip', () => {
  beforeEach(resetStore);

  it('undo then redo restores original past length', () => {
    useHistoryStore.getState().pushState('A', makeConfig());
    useHistoryStore.getState().pushState('B', makeConfig());
    const originalLength = useHistoryStore.getState().past.length;

    useHistoryStore.getState().undo();
    useHistoryStore.getState().redo();

    expect(useHistoryStore.getState().past).toHaveLength(originalLength);
  });

  it('undoLabel and redoLabel are in sync after back-and-forth', () => {
    useHistoryStore.getState().pushState('Alpha', makeConfig());
    useHistoryStore.getState().pushState('Beta', makeConfig());
    useHistoryStore.getState().pushState('Gamma', makeConfig());

    useHistoryStore.getState().undo(); // undo Gamma; past = [Alpha, Beta]
    expect(useHistoryStore.getState().undoLabel).toBe('Beta');
    expect(useHistoryStore.getState().redoLabel).toBe('Gamma');

    useHistoryStore.getState().redo(); // redo Gamma; past = [Alpha, Beta, Gamma]
    expect(useHistoryStore.getState().undoLabel).toBe('Gamma');
    expect(useHistoryStore.getState().redoLabel).toBeNull();
  });
});

describe('historyStore — clearHistory', () => {
  beforeEach(resetStore);

  it('wipes both past and future', () => {
    useHistoryStore.getState().pushState('A', makeConfig());
    useHistoryStore.getState().pushState('B', makeConfig());
    useHistoryStore.getState().undo();
    useHistoryStore.getState().clearHistory();

    const state = useHistoryStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
  });

  it('resets all derived flags and labels', () => {
    useHistoryStore.getState().pushState('A', makeConfig());
    useHistoryStore.getState().pushState('B', makeConfig());
    useHistoryStore.getState().clearHistory();

    const state = useHistoryStore.getState();
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
    expect(state.undoLabel).toBeNull();
    expect(state.redoLabel).toBeNull();
  });
});
