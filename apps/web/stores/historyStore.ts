import { create } from 'zustand';
import type { BladeConfig } from '@bladeforge/engine';

export interface HistoryEntry {
  timestamp: number;
  /** Human-readable description, e.g. "Changed base color", "Applied Fire style" */
  label: string;
  /** Deep-cloned blade config snapshot */
  snapshot: BladeConfig;
}

export interface HistoryStore {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxHistory: number;

  // Derived state (computed, not stored as reactive fields — use selectors)
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;

  /**
   * Push a new snapshot onto the history stack.
   * Clears the future (redo) stack — standard linear undo behavior.
   * Drops the oldest entry when maxHistory is exceeded.
   */
  pushState(label: string, snapshot: BladeConfig): void;

  /**
   * Undo: moves current top-of-past to future and returns the entry
   * that should be restored (the one below it, i.e. the new top of past).
   * Returns null if there is nothing to undo.
   */
  undo(): HistoryEntry | null;

  /**
   * Redo: pops from future, pushes onto past, returns the entry to restore.
   * Returns null if there is nothing to redo.
   */
  redo(): HistoryEntry | null;

  /** Wipe both stacks (e.g. on full project reset) */
  clearHistory(): void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,

  // ── Derived state ─────────────────────────────────────────────────────────
  // These are kept as store fields so Zustand subscribers can react to them.
  // They are updated synchronously inside every mutating action.
  canUndo: false,
  canRedo: false,
  undoLabel: null,
  redoLabel: null,

  // ── Actions ───────────────────────────────────────────────────────────────

  pushState(label, snapshot) {
    set((state) => {
      const entry: HistoryEntry = {
        timestamp: Date.now(),
        label,
        snapshot: structuredClone(snapshot) as BladeConfig,
      };

      // Drop oldest entries when limit is exceeded (keep maxHistory - 1 to
      // make room for the new entry).
      const trimmed = state.past.slice(-(state.maxHistory - 1));
      const past = [...trimmed, entry];

      return {
        past,
        // Clear redo stack — new action invalidates forward history
        future: [],
        canUndo: past.length > 1,
        canRedo: false,
        // The entry that would be undone is the one we just pushed (top of past)
        undoLabel: past.length > 1 ? past[past.length - 1].label : null,
        redoLabel: null,
      };
    });
  },

  undo() {
    const state = get();
    if (state.past.length <= 1) return null;

    // The last entry in past is the current state — pop it off.
    const current = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);
    const target = newPast[newPast.length - 1]; // entry to restore

    set({
      past: newPast,
      future: [current, ...state.future],
      canUndo: newPast.length > 1,
      canRedo: true,
      undoLabel: newPast.length > 1 ? newPast[newPast.length - 1].label : null,
      redoLabel: current.label,
    });

    return target;
  },

  redo() {
    const state = get();
    if (state.future.length === 0) return null;

    const [next, ...remaining] = state.future;
    const newPast = [...state.past, next];

    set({
      past: newPast,
      future: remaining,
      canUndo: newPast.length > 1,
      canRedo: remaining.length > 0,
      undoLabel: next.label,
      redoLabel: remaining.length > 0 ? remaining[0].label : null,
    });

    return next;
  },

  clearHistory() {
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      undoLabel: null,
      redoLabel: null,
    });
  },
}));
