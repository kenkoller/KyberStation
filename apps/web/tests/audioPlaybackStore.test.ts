// ─── audioPlaybackStore — multi-instance swing-bus contract ─────────────────
//
// Pre-fix (2026-04-28), each `useAudioEngine()` consumer had its own
// `smoothSwingRef`, and `updateSwing(speed)` wrote only to the local
// ref. The Motion-Sim swing slider lives in `AppShell.useAudioSync`,
// which calls AppShell's `audio.updateSwing` — but the SmoothSwing
// pairs were typically loaded by the AudioColumnB instance (whichever
// instance ran `loadFont`). Result: dragging the swing slider produced
// visible blade modulation but ZERO audio change on a loaded
// SmoothSwing-v2 font.
//
// Fix: swing speed lives in this Zustand store. Every `useAudioEngine`
// instance subscribes once via `subscribe()` (imperative — no React
// re-render) and pushes the value into its own `smoothSwingRef`.
// SmoothSwingEngine.update() is a no-op when `_isPlaying` is false,
// so subscribing on every instance is safe.
//
// This file pins the store's contract + its multi-consumer behaviour.
// The hook-side wiring sentinels live in
// `apps/web/hooks/__tests__/useAudioEngine.swingHum.test.ts`.

import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioPlaybackStore } from '../stores/audioPlaybackStore';

beforeEach(() => {
  useAudioPlaybackStore.getState().setSwingSpeed(0);
});

describe('audioPlaybackStore — store contract', () => {
  it('starts at swingSpeed: 0', () => {
    // Reset in beforeEach already runs, but assert the initial-state shape too.
    const fresh = useAudioPlaybackStore.getState();
    expect(fresh.swingSpeed).toBe(0);
    expect(typeof fresh.setSwingSpeed).toBe('function');
  });

  it('setSwingSpeed updates the value', () => {
    useAudioPlaybackStore.getState().setSwingSpeed(0.42);
    expect(useAudioPlaybackStore.getState().swingSpeed).toBe(0.42);
  });

  it('setSwingSpeed accepts the SmoothSwingEngine clamp range (0-1) and beyond', () => {
    // The engine clamps internally; the store stores whatever it's given.
    // Document this invariant — callers should pass normalised values, but
    // the store doesn't enforce.
    useAudioPlaybackStore.getState().setSwingSpeed(0);
    expect(useAudioPlaybackStore.getState().swingSpeed).toBe(0);
    useAudioPlaybackStore.getState().setSwingSpeed(1);
    expect(useAudioPlaybackStore.getState().swingSpeed).toBe(1);
    useAudioPlaybackStore.getState().setSwingSpeed(2.5);
    expect(useAudioPlaybackStore.getState().swingSpeed).toBe(2.5);
    useAudioPlaybackStore.getState().setSwingSpeed(-0.1);
    expect(useAudioPlaybackStore.getState().swingSpeed).toBe(-0.1);
  });
});

describe('audioPlaybackStore — multi-instance subscriber fanout (the bug fix sentinel)', () => {
  it('a single setSwingSpeed call notifies every subscribe() listener', () => {
    // Each useAudioEngine instance registers one subscribe() listener
    // inside its useEffect. The fix relies on Zustand fanning every
    // store change to every listener.
    const seen: number[][] = [[], [], [], [], [], []];
    const unsubs = seen.map((bucket) =>
      useAudioPlaybackStore.subscribe(() => {
        bucket.push(useAudioPlaybackStore.getState().swingSpeed);
      }),
    );

    useAudioPlaybackStore.getState().setSwingSpeed(0.5);

    for (const bucket of seen) {
      expect(bucket).toEqual([0.5]);
    }

    unsubs.forEach((u) => u());
  });

  it('listeners unregister cleanly via the returned unsubscribe', () => {
    const calls: number[] = [];
    const unsub = useAudioPlaybackStore.subscribe(() => {
      calls.push(useAudioPlaybackStore.getState().swingSpeed);
    });

    useAudioPlaybackStore.getState().setSwingSpeed(0.3);
    unsub();
    useAudioPlaybackStore.getState().setSwingSpeed(0.7);

    // Only the first call should have reached the listener.
    expect(calls).toEqual([0.3]);
  });

  it('rapid frame-rate updates (60fps simulation) all reach subscribers', () => {
    // useAudioSync calls audio.updateSwing on every animation frame.
    // After the fix, that becomes a setSwingSpeed call — which fires
    // 60+ times per second when the blade is moving. Sanity-check that
    // every call propagates.
    const received: number[] = [];
    const unsub = useAudioPlaybackStore.subscribe(() => {
      received.push(useAudioPlaybackStore.getState().swingSpeed);
    });

    const sequence = Array.from({ length: 60 }, (_, i) => i / 60);
    for (const v of sequence) {
      useAudioPlaybackStore.getState().setSwingSpeed(v);
    }

    expect(received).toEqual(sequence);
    unsub();
  });
});
