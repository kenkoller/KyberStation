'use client';
import { create } from 'zustand';

/**
 * Global audio mute state — shared across every `useAudioEngine` instance.
 *
 * Pre-fix, each call to `useAudioEngine()` owned its own `muted` useState +
 * masterGain, so toggling mute from the header only silenced the instance
 * the header read from. Other instances (preview buttons in AudioColumnB,
 * SmoothSwing tick in WorkbenchLayout, the AppShell tablet duplicate) stayed
 * muted forever — their masterGain.gain.value was set once at init from a
 * default-muted local ref and never updated.
 *
 * Lifting muted to a single source of truth means every `useAudioEngine`
 * instance subscribes here, runs a `useEffect` to push the value into its
 * own masterGain, and toggling once silences/unsilences all of them.
 *
 * The instance-per-hook AudioContext + FontPlayer + masterGain pattern is
 * deliberately unchanged here — that's a separate (larger) refactor. This
 * store solves only the user-visible mute bug.
 */
interface AudioMuteState {
  muted: boolean;
  setMuted: (m: boolean) => void;
  toggleMute: () => void;
}

export const useAudioMuteStore = create<AudioMuteState>((set, get) => ({
  // Default-muted matches the pre-fix behavior — Web Audio autoplay policy
  // means an AudioContext can't make sound until a user gesture anyway, and
  // shipping unmuted-by-default would be louder than users expect.
  muted: true,
  setMuted: (m) => set({ muted: m }),
  toggleMute: () => set({ muted: !get().muted }),
}));
