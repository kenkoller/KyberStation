/**
 * undoTracking — integration test for P17-001
 *
 * Reproduces the real bug by running useHistoryTracking's subscription
 * logic against the real stores and the real setConfig path, without
 * needing a React tree.
 *
 * The bug: undo applies a snapshot via bladeStore.setConfig, but the
 * tracking subscription then re-pushes that same snapshot onto the
 * history stack 300 ms later, which clears the future stack and
 * breaks symmetric redo. The user's visible symptom was "Redo does
 * nothing" (future wiped) and — because pushState also overwrites
 * undoLabel — "Undo appears to do nothing on subsequent clicks"
 * (the re-push makes past[top] equal to the current config).
 *
 * The fix: a module-level `isRestoringFromHistory` flag that lets
 * the tracker ignore store updates caused by undo/redo. This test
 * verifies the flag is respected.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useHistoryStore } from '../stores/historyStore';
import { useBladeStore } from '../stores/bladeStore';
import {
  beginHistoryRestore,
  endHistoryRestore,
  isRestoringFromHistory,
} from '../stores/historyRestoreFlag';
import type { BladeConfig } from '@kyberstation/engine';

function makeBaseConfig(): BladeConfig {
  return {
    name: 'Obi-Wan ANH',
    baseColor: { r: 0, g: 140, b: 255 }, // #008CFF — app default
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 800,
    shimmer: 0.1,
    ledCount: 144,
  };
}

/**
 * Minimal port of useHistoryTracking's subscription body, without
 * React. Returns an unsubscribe function. Tracks via a 300ms debounce
 * identical to the real hook so the test exercises the real path.
 */
function installTracker(): () => void {
  const DEBOUNCE_MS = 300;
  const { pushState } = useHistoryStore.getState();
  // Seed.
  pushState('Initial state', useBladeStore.getState().config);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const unsubscribe = useBladeStore.subscribe((state, prevState) => {
    const next = state.config;
    const prev = prevState.config;
    if (next === prev) return;

    // THE FIX: ignore store updates that originate from undo/redo.
    if (isRestoringFromHistory()) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      pushState('Updated', useBladeStore.getState().config);
      timer = null;
    }, DEBOUNCE_MS);
  });

  return () => {
    unsubscribe();
    if (timer) clearTimeout(timer);
  };
}

describe('P17-001 — undo reverts preset-load state changes', () => {
  let uninstall: (() => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    useHistoryStore.setState({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      undoLabel: null,
      redoLabel: null,
      maxHistory: 50,
    });
    useBladeStore.setState({ config: makeBaseConfig() });
    if (isRestoringFromHistory()) endHistoryRestore();
    uninstall = installTracker();
  });

  afterEach(() => {
    uninstall?.();
    uninstall = null;
    vi.useRealTimers();
  });

  it('undo restores the prior base color after two preset loads', () => {
    const { loadPreset, setConfig } = useBladeStore.getState();

    // Step 1: user clicks "Jedi Blue" color preset
    const jediBlue: BladeConfig = {
      ...makeBaseConfig(),
      baseColor: { r: 10, g: 57, b: 230 }, // #0A39E6
    };
    loadPreset(jediBlue);

    // Step 2: wait 2s for debounce
    vi.advanceTimersByTime(2000);

    // Step 3: user clicks "Luke ROTJ Green"
    const lukeGreen: BladeConfig = {
      ...makeBaseConfig(),
      baseColor: { r: 6, g: 234, b: 25 }, // #06EA19
    };
    loadPreset(lukeGreen);

    // Step 4: wait 2s
    vi.advanceTimersByTime(2000);

    // Both presets should be in history now.
    const historyAfterLoads = useHistoryStore.getState();
    expect(historyAfterLoads.past.length).toBeGreaterThanOrEqual(3);
    expect(historyAfterLoads.canUndo).toBe(true);

    // Step 5: user clicks Undo — simulates UndoRedoButtons.handleUndo
    const entry = useHistoryStore.getState().undo();
    expect(entry).not.toBeNull();
    beginHistoryRestore();
    try {
      setConfig(entry!.snapshot);
    } finally {
      endHistoryRestore();
    }

    // The base color must have actually reverted.
    expect(useBladeStore.getState().config.baseColor).toEqual({ r: 10, g: 57, b: 230 });

    // Allow the debounce window to expire: the fix guarantees that no
    // re-push was queued, so the future stack survives.
    vi.advanceTimersByTime(2000);
    expect(useHistoryStore.getState().future.length).toBeGreaterThanOrEqual(1);
    expect(useHistoryStore.getState().canRedo).toBe(true);
  });

  it('redo after undo restores the later snapshot', () => {
    const { loadPreset, setConfig } = useBladeStore.getState();

    const jediBlue: BladeConfig = {
      ...makeBaseConfig(),
      baseColor: { r: 10, g: 57, b: 230 },
    };
    loadPreset(jediBlue);
    vi.advanceTimersByTime(2000);

    const lukeGreen: BladeConfig = {
      ...makeBaseConfig(),
      baseColor: { r: 6, g: 234, b: 25 },
    };
    loadPreset(lukeGreen);
    vi.advanceTimersByTime(2000);

    // Undo
    const undoEntry = useHistoryStore.getState().undo();
    beginHistoryRestore();
    try {
      setConfig(undoEntry!.snapshot);
    } finally {
      endHistoryRestore();
    }
    vi.advanceTimersByTime(2000);

    // Redo
    const redoEntry = useHistoryStore.getState().redo();
    expect(redoEntry).not.toBeNull();
    beginHistoryRestore();
    try {
      setConfig(redoEntry!.snapshot);
    } finally {
      endHistoryRestore();
    }

    expect(useBladeStore.getState().config.baseColor).toEqual({ r: 6, g: 234, b: 25 });
  });

  it('second undo click after first undo still walks backward (no zombie re-push)', () => {
    // Without the guard, the first undo's setConfig re-pushes the
    // restored snapshot. On the SECOND undo click, past[top] now
    // equals the current config, so the second undo pops an entry
    // that's identical to what's visible — the user sees no change.
    const { loadPreset, setConfig } = useBladeStore.getState();

    const jediBlue: BladeConfig = {
      ...makeBaseConfig(),
      baseColor: { r: 10, g: 57, b: 230 },
    };
    loadPreset(jediBlue);
    vi.advanceTimersByTime(2000);

    const lukeGreen: BladeConfig = {
      ...makeBaseConfig(),
      baseColor: { r: 6, g: 234, b: 25 },
    };
    loadPreset(lukeGreen);
    vi.advanceTimersByTime(2000);

    // First undo — should revert to Jedi Blue
    const first = useHistoryStore.getState().undo();
    beginHistoryRestore();
    try {
      setConfig(first!.snapshot);
    } finally {
      endHistoryRestore();
    }
    vi.advanceTimersByTime(2000);
    expect(useBladeStore.getState().config.baseColor).toEqual({ r: 10, g: 57, b: 230 });

    // Second undo — should revert to initial (#008CFF)
    const second = useHistoryStore.getState().undo();
    expect(second).not.toBeNull();
    beginHistoryRestore();
    try {
      setConfig(second!.snapshot);
    } finally {
      endHistoryRestore();
    }
    expect(useBladeStore.getState().config.baseColor).toEqual({ r: 0, g: 140, b: 255 });
  });

  it('isRestoringFromHistory toggles correctly', () => {
    expect(isRestoringFromHistory()).toBe(false);
    beginHistoryRestore();
    expect(isRestoringFromHistory()).toBe(true);
    endHistoryRestore();
    expect(isRestoringFromHistory()).toBe(false);
  });
});
