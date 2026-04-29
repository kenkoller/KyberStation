'use client';
import { create } from 'zustand';

/**
 * Global audio playback bus — shared across every `useAudioEngine`
 * instance.
 *
 * This store complements `audioMuteStore`. Same root cause: each call
 * to `useAudioEngine()` owns its own AudioContext + FontPlayer +
 * SmoothSwingEngine refs, so per-instance state stays isolated unless
 * explicitly broadcast.
 *
 * Today this store carries one value: the current SmoothSwing crossfade
 * speed. Pre-fix, `updateSwing(speed)` reached only the local
 * smoothSwingRef of whichever instance the call site happened to read
 * (e.g. AppShell's `useAudioSync` calls AppShell's `audio.updateSwing`,
 * but the workbench-instance's SmoothSwingEngine — the one that
 * actually had `loadPairs` called — never got the update). Symptom:
 * dragging the Motion Sim swing slider produced visible blade motion
 * but zero audio change on a loaded SmoothSwing-v2 font.
 *
 * Lifting `swingSpeed` to a single source of truth means every
 * initialised instance subscribes once via Zustand's imperative
 * `subscribe()` (no React re-render — the listener calls
 * `smoothSwingRef.current?.update(speed)` directly). The
 * SmoothSwingEngine itself no-ops the call when `_isPlaying` is false,
 * so subscribing on every instance is safe even when only one
 * instance has actually called `start()` from `playIgnition()`.
 *
 * The instance-per-hook AudioContext + FontPlayer + masterGain pattern
 * is deliberately unchanged — that's a separate (larger) refactor.
 * This store solves only the user-visible "swing slider → no audio"
 * bug, alongside the hum-hot-swap useEffect added in the same fix.
 */
interface AudioPlaybackState {
  /**
   * Normalised swing speed (0-1) currently driving the SmoothSwing
   * crossfade. Below SmoothSwingEngine's SILENCE_THRESHOLD (~0.1)
   * both swing channels are silenced; above it the low/high pair
   * crossfades proportionally.
   */
  swingSpeed: number;
  setSwingSpeed: (speed: number) => void;
}

export const useAudioPlaybackStore = create<AudioPlaybackState>((set) => ({
  swingSpeed: 0,
  setSwingSpeed: (speed) => set({ swingSpeed: speed }),
}));
