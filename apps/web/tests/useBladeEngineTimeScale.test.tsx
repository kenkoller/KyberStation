// @vitest-environment jsdom
//
// ─── Time scale applies once ─────────────────────────────────────────
//
// The editor has two animation-speed controls: `uiStore.timeScale`
// (Settings speed buttons, PauseButton cycle) and `engine.timeScale`
// (canvas TimeScaleControl, `[` / `]`). The rAF tick used to pass
// `delta * uiStore.timeScale` into `engine.update()`, which multiplied by
// `engine.timeScale` again — 0.5× in both places ran at 0.25×. Now the
// engine's multiplier is the only one applied and the two controls are
// kept in sync.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { reconcileTimeScale, useBladeEngine } from '@/hooks/useBladeEngine';
import { useUIStore } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';

describe('reconcileTimeScale', () => {
  it('does nothing while both controls agree', () => {
    expect(reconcileTimeScale(1, 1, 1)).toEqual({ value: 1, update: null });
    expect(reconcileTimeScale(0.5, 0.5, 0.5)).toEqual({ value: 0.5, update: null });
  });

  it('a store change (Settings / PauseButton) is pushed to the engine', () => {
    expect(reconcileTimeScale(1, 0.5, 1)).toEqual({ value: 0.5, update: 'engine' });
  });

  it('an engine change (TimeScaleControl / [ ]) is pushed to the store', () => {
    expect(reconcileTimeScale(0.25, 1, 1)).toEqual({ value: 0.25, update: 'store' });
  });
});

describe('useBladeEngine tick', () => {
  const frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    frames.length = 0;
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(performance, 'now').mockReturnValue(0);
    useUIStore.setState({ timeScale: 1, animationPaused: false, hardwarePreview: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Run the next scheduled animation frame at timestamp `t` (ms). */
  function frame(t: number): void {
    const cb = frames.shift();
    if (!cb) throw new Error('no animation frame scheduled');
    act(() => cb(t));
  }

  it('applies uiStore.timeScale exactly once', () => {
    const { result } = renderHook(() => useBladeEngine());
    const engine = result.current.engineRef.current!;
    const config = useBladeStore.getState().config;

    act(() => useUIStore.getState().setTimeScale(0.5));
    frame(0); // reconcile: the engine adopts 0.5
    expect(engine.timeScale).toBe(0.5);

    engine.ignite(config);
    frame(100); // 100 ms of wall time at 0.5× = 50 ms simulated
    expect(engine.extendProgress).toBeCloseTo(50 / config.ignitionMs, 5);
  });

  it('a direct engine change (canvas control) is reflected in the store', () => {
    const { result } = renderHook(() => useBladeEngine());
    const engine = result.current.engineRef.current!;
    frame(0);
    engine.timeScale = 0.25;
    frame(16);
    expect(useUIStore.getState().timeScale).toBe(0.25);
  });

  it('does not advance the engine while paused', () => {
    const { result } = renderHook(() => useBladeEngine());
    const engine = result.current.engineRef.current!;
    const config = useBladeStore.getState().config;
    frame(0);
    engine.ignite(config);
    act(() => useUIStore.setState({ animationPaused: true }));
    frame(200);
    expect(engine.extendProgress).toBe(0);
  });
});
