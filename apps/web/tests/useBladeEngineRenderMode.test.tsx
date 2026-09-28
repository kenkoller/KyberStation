// @vitest-environment jsdom
//
// ─── useBladeEngine — render mode wiring through React ────────────────
//
// Mounts the real hook and drives the real board-profile event bus, so
// the effect ordering that caused the old race is exercised end to end:
// switching between two Proffie boards must leave the engine on the
// template-eval path with the generated preview template attached.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBladeEngine } from '@/hooks/useBladeEngine';
import { writeStoredBoardId } from '@/hooks/useBoardProfile';
import { useUIStore } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';

beforeEach(() => {
  window.localStorage.clear();
  // The hook starts a rAF tick loop; keep it inert so the test drives
  // the engine explicitly.
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  useUIStore.setState({ hardwarePreview: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function engineOf(result: { current: ReturnType<typeof useBladeEngine> }) {
  const engine = result.current.engineRef.current;
  if (!engine) throw new Error('engine not initialised');
  return engine;
}

describe('useBladeEngine render mode', () => {
  it('starts on template-eval with the generated preview template (HW preview on by default)', () => {
    const { result } = renderHook(() => useBladeEngine());
    const engine = engineOf(result);
    expect(engine.renderMode).toBe('template-eval');
    expect(engine.hasPreviewTemplate).toBe(true);
  });

  it('stays on template-eval when switching between two Proffie boards', () => {
    const { result } = renderHook(() => useBladeEngine());
    const engine = engineOf(result);

    act(() => writeStoredBoardId('proffie-v2.2'));
    expect(engine.renderMode).toBe('template-eval');
    expect(engine.hasPreviewTemplate).toBe(true);

    act(() => writeStoredBoardId('golden-harvest-v3'));
    expect(engine.renderMode).toBe('template-eval');
    expect(engine.hasPreviewTemplate).toBe(true);

    // And frames really come from the template interpreter.
    const config = useBladeStore.getState().config;
    engine.ignite(config);
    for (let i = 0; i < 40; i++) engine.update(16, config);
    expect(engine.lastRenderPath).toBe('template-eval');
  });

  it('switches to the Xenopixel renderer and back', () => {
    const { result } = renderHook(() => useBladeEngine());
    const engine = engineOf(result);

    act(() => writeStoredBoardId('xenopixel'));
    expect(engine.renderMode).toBe('xenopixel');
    expect(engine.hasPreviewTemplate).toBe(false);

    act(() => writeStoredBoardId('proffie-v3.9'));
    expect(engine.renderMode).toBe('template-eval');
    expect(engine.hasPreviewTemplate).toBe(true);
  });

  it('follows the Hardware Preview toggle', () => {
    const { result } = renderHook(() => useBladeEngine());
    const engine = engineOf(result);

    act(() => useUIStore.setState({ hardwarePreview: false }));
    expect(engine.renderMode).toBe('proffie');
    expect(engine.hasPreviewTemplate).toBe(false);

    act(() => useUIStore.setState({ hardwarePreview: true }));
    expect(engine.renderMode).toBe('template-eval');
    expect(engine.hasPreviewTemplate).toBe(true);
  });
});
