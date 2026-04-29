'use client';
import { create } from 'zustand';

/**
 * Global audio-analyser bus — published by `useAudioEngine` so the
 * AnalysisRail's audio-waveform layer can read live time-domain
 * samples without prop-drilling an AnalyserNode through the layout.
 *
 * Same broadcast pattern as `audioMuteStore` + `audioPlaybackStore`:
 * each `useAudioEngine` instance owns its own AudioContext, but only
 * one of them needs to publish its `AnalyserNode` here for the
 * waveform rail row to read it. The first instance to initialise
 * wins; subsequent instances with their own analyser nodes don't
 * overwrite — re-attaching mid-session would force the rail to
 * re-allocate the time-domain buffer for no user benefit.
 *
 * The analyser is inserted between the master gain and the
 * AudioContext destination as a TRANSPARENT tap — `AnalyserNode`
 * passes audio through unchanged, so adding it costs no audio
 * fidelity and respects mute (mute zeroes the master gain BEFORE
 * the analyser, so the analyser's input is silent when muted —
 * the waveform rail correctly shows a flat line).
 *
 * Exposes a `getTimeDomainData(buffer)` helper that copies the
 * latest frame into a caller-provided Float32Array. Caller owns
 * the buffer lifecycle so the rail can reuse the same buffer
 * across animation frames.
 */
interface AudioAnalyserState {
  /**
   * The currently-published AnalyserNode, or null if no
   * `useAudioEngine` instance has initialised its AudioContext yet.
   * (AudioContext creation is gated on a user gesture per the
   * Web Audio autoplay policy, so the first frames after page load
   * see `null` here.)
   */
  analyser: AnalyserNode | null;
  /**
   * Set the published analyser. Called once per `useAudioEngine`
   * instance, in `ensureInit()` immediately after the node is
   * inserted into the audio graph. Idempotent — passing the same
   * node twice is a no-op. First-published-wins: if a different
   * node is already published, the call is rejected so the rail
   * doesn't churn.
   */
  setAnalyser: (node: AnalyserNode | null) => void;
}

export const useAudioAnalyserStore = create<AudioAnalyserState>((set, get) => ({
  analyser: null,
  setAnalyser: (node) => {
    const current = get().analyser;
    // First-published-wins: don't overwrite an existing node with a
    // different one. Allow null to clear (used in cleanup paths).
    if (node !== null && current !== null && current !== node) {
      return;
    }
    if (current === node) return;
    set({ analyser: node });
  },
}));

/**
 * Copy the latest time-domain samples from the published analyser
 * into the caller's buffer. Returns true if the copy happened, false
 * if no analyser is published yet (the buffer is left untouched).
 *
 * The buffer should match `analyser.fftSize` (the analyser's output
 * size); callers can read `useAudioAnalyserStore.getState().analyser?.fftSize`
 * to size their buffer correctly. Defaults below pin a 1024-sample
 * window, which gives ~21ms of context at 48kHz — enough to read a
 * smooth waveform without quantising sub-cycle detail away.
 */
export function getTimeDomainData(buffer: Float32Array): boolean {
  const analyser = useAudioAnalyserStore.getState().analyser;
  if (!analyser) return false;
  // getFloatTimeDomainData writes [-1, 1] floats into the buffer.
  // Older Safari only supports getByteTimeDomainData; the latter
  // is unconditionally available, so we feature-detect once and
  // fall back if the float variant is missing.
  //
  // The cast to `Float32Array<ArrayBuffer>` is a TS-version
  // accommodation: lib.dom's signature pins the buffer type to a
  // narrow `ArrayBuffer`, but our caller may hand us a
  // `Float32Array<ArrayBufferLike>` if they sourced the buffer from
  // somewhere generic. Same memory layout either way — the cast
  // just satisfies the structural check.
  if (typeof analyser.getFloatTimeDomainData === 'function') {
    analyser.getFloatTimeDomainData(buffer as Float32Array<ArrayBuffer>);
  } else {
    // Fallback path: convert byte values [0, 255] (centred at 128)
    // back to the float [-1, 1] convention.
    const byteBuffer = new Uint8Array(buffer.length);
    analyser.getByteTimeDomainData(byteBuffer);
    for (let i = 0; i < byteBuffer.length; i++) {
      buffer[i] = (byteBuffer[i] - 128) / 128;
    }
  }
  return true;
}
